import argparse
import asyncio
import json
import subprocess
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "assets" / "audio" / "audio-pack-manifest.json"


async def generate_item(item: dict, output_dir: Path, voice: str, semaphore: asyncio.Semaphore) -> tuple[str, bool, str]:
    item_id = item["id"]
    target = output_dir / f"{item_id}.mp3"
    if target.exists() and target.stat().st_size > 1_000:
        return item_id, False, "cached"
    text = str(item.get("speechText") or item["japanese"]).strip()
    async with semaphore:
        last_error = ""
        for attempt in range(3):
            temporary = target.with_suffix(".tmp.mp3")
            try:
                temporary.unlink(missing_ok=True)
                communicate = edge_tts.Communicate(text, voice, rate="-12%", volume="+0%", pitch="+0Hz")
                await communicate.save(str(temporary))
                if temporary.stat().st_size <= 1_000:
                    raise RuntimeError("fichier audio vide ou trop court")
                temporary.replace(target)
                return item_id, True, "generated"
            except Exception as error:
                temporary.unlink(missing_ok=True)
                last_error = str(error)
                await asyncio.sleep(1.5 * (attempt + 1))
        return item_id, False, last_error


async def main() -> None:
    parser = argparse.ArgumentParser(description="Generate the embedded Japanese N5 audio pack.")
    parser.add_argument("--concurrency", type=int, default=6)
    parser.add_argument("--limit", type=int, default=0)
    args = parser.parse_args()
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    items = manifest.get("items", [])
    if args.limit > 0:
        items = items[: args.limit]
    output_dir = ROOT / manifest.get("outputDir", "assets/audio/n5_core")
    output_dir.mkdir(parents=True, exist_ok=True)
    voice = manifest.get("voice", "ja-JP-NanamiNeural")
    semaphore = asyncio.Semaphore(max(1, args.concurrency))
    tasks = [generate_item(item, output_dir, voice, semaphore) for item in items]
    generated = cached = failed = 0
    for index, task in enumerate(asyncio.as_completed(tasks), start=1):
        item_id, created, status = await task
        if created:
            generated += 1
        elif status == "cached":
            cached += 1
        else:
            failed += 1
            print(f"FAILED {item_id}: {status}")
        if index % 25 == 0 or index == len(tasks):
            print(f"Audio {index}/{len(tasks)} - generated={generated}, cached={cached}, failed={failed}")
    if failed:
        raise SystemExit(f"Audio generation incomplete: {failed} files failed")
    subprocess.run(["node", "scripts/sync-audio-registry.mjs"], cwd=ROOT, check=True)


if __name__ == "__main__":
    asyncio.run(main())

import hashlib
import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "assets" / "audio" / "audio-pack-manifest.json"
DB_PATH = ROOT / "assets" / "database" / "jlpt_n5_mobile.db"


def stable_id(prefix: str, *values: str) -> str:
    digest = hashlib.sha1("|".join(values).encode("utf-8")).hexdigest()[:14]
    return f"{prefix}-{digest}"


def first_reading(value: str | None) -> str:
    if not value:
        return ""
    normalized = value.replace("、", ",").replace("/", ",").replace(";", ",")
    return next((part.strip() for part in normalized.split(",") if part.strip()), "")


def main() -> None:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    core_items = [item for item in manifest.get("items", []) if item.get("category") == "core" or not item.get("category")]
    for item in core_items:
        item["category"] = "core"

    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    generated: list[dict] = []

    for row in connection.execute(
        "SELECT id, character FROM canonical_kana WHERE COALESCE(needs_review, 0) = 0 ORDER BY script, id"
    ):
        character = (row["character"] or "").strip()
        if character:
            generated.append({
                "id": stable_id("kana", str(row["id"]), character),
                "category": "kana",
                "japanese": character,
                "speechText": character,
            })

    for row in connection.execute(
        "SELECT id, character, n5_readings, onyomi, kunyomi FROM canonical_kanji WHERE jlpt_level = 'N5' ORDER BY id"
    ):
        character = (row["character"] or "").strip()
        reading = first_reading(row["n5_readings"]) or first_reading(row["onyomi"]) or first_reading(row["kunyomi"])
        if character:
            generated.append({
                "id": stable_id("kanji", str(row["id"]), character),
                "category": "kanji",
                "japanese": character,
                "speechText": reading or character,
                "aliases": [reading] if reading and reading != character else [],
            })

    for row in connection.execute(
        """
        SELECT id, japanese, kana
        FROM canonical_vocabulary
        WHERE COALESCE(importance, 3) >= 5
        ORDER BY id
        """
    ):
        japanese = (row["japanese"] or "").strip()
        kana = (row["kana"] or "").strip()
        if japanese:
            generated.append({
                "id": stable_id("vocab", str(row["id"]), japanese, kana),
                "category": "vocabulary",
                "japanese": japanese,
                "speechText": kana or japanese,
                "aliases": [kana] if kana and kana != japanese else [],
            })
    connection.close()

    items: list[dict] = []
    seen_ids: set[str] = set()
    seen_audio: dict[tuple[str, str], dict] = {}
    for item in [*core_items, *generated]:
        item_id = str(item.get("id", "")).strip()
        japanese = str(item.get("japanese", "")).strip()
        speech_text = str(item.get("speechText") or japanese).strip()
        if not item_id or not japanese or item_id in seen_ids:
            continue
        audio_key = (japanese, speech_text)
        if audio_key in seen_audio:
            existing = seen_audio[audio_key]
            aliases = set(existing.get("aliases", []))
            aliases.update(item.get("aliases", []))
            existing["aliases"] = sorted(alias for alias in aliases if alias and alias != existing["japanese"])
            continue
        seen_ids.add(item_id)
        normalized = {
            "id": item_id,
            "category": item.get("category", "core"),
            "japanese": japanese,
        }
        if speech_text != japanese:
            normalized["speechText"] = speech_text
        aliases = sorted({str(alias).strip() for alias in item.get("aliases", []) if str(alias).strip() and str(alias).strip() != japanese})
        if aliases:
            normalized["aliases"] = aliases
        items.append(normalized)
        seen_audio[audio_key] = normalized

    output = {
        "version": 2,
        "kind": "embedded_japanese_mp3_with_tts_fallback",
        "voice": "ja-JP-NanamiNeural",
        "outputDir": "assets/audio/n5_core",
        "format": "mp3",
        "items": items,
    }
    MANIFEST_PATH.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    counts: dict[str, int] = {}
    for item in items:
        counts[item["category"]] = counts.get(item["category"], 0) + 1
    print(json.dumps({"total": len(items), "categories": counts}, ensure_ascii=False))


if __name__ == "__main__":
    main()

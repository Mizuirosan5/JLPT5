import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'assets/audio/audio-pack-manifest.json');
const audioDir = path.join(root, 'assets/audio/n5_core');
const registryPath = path.join(root, 'data/audioAssetRegistry.ts');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const lines = ['export const AUDIO_ASSET_REGISTRY: Record<string, number> = {'];
let linked = 0;
const seenIds = new Set();

for (const item of manifest.items ?? []) {
  if (!item?.id) continue;
  if (seenIds.has(item.id)) {
    console.warn(`Duplicate audio id skipped: ${item.id}`);
    continue;
  }
  seenIds.add(item.id);
  const fileName = `${item.id}.wav`;
  if (!fs.existsSync(path.join(audioDir, fileName))) continue;
  lines.push(`  '${item.id}': require('../assets/audio/n5_core/${fileName}'),`);
  linked++;
}

lines.push('};');
fs.writeFileSync(registryPath, `${lines.join('\n')}\n`, 'utf8');

console.log(`Audio registry synced: ${linked}/${manifest.items?.length ?? 0} embedded files linked.`);

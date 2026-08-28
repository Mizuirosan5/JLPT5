import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'assets/audio/audio-pack-manifest.json');
const audioDir = path.join(root, 'assets/audio/n5_core');
const registryPath = path.join(root, 'data/audioAssetRegistry.ts');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const format = manifest.format || 'mp3';
const lines = ['export const AUDIO_ASSET_REGISTRY: Record<string, number> = {'];
const textEntries = [];
let linked = 0;
const seenIds = new Set();

for (const item of manifest.items ?? []) {
  if (!item?.id) continue;
  if (seenIds.has(item.id)) {
    console.warn(`Duplicate audio id skipped: ${item.id}`);
    continue;
  }
  seenIds.add(item.id);
  const fileName = `${item.id}.${format}`;
  if (!fs.existsSync(path.join(audioDir, fileName))) continue;
  lines.push(`  '${item.id}': require('../assets/audio/n5_core/${fileName}'),`);
  for (const text of [item.japanese, ...(item.aliases ?? [])]) {
    if (text) textEntries.push([text, item.id]);
  }
  linked++;
}

lines.push('};');
lines.push('');
lines.push('export const AUDIO_TEXT_ASSET_IDS: Record<string, string> = {');
for (const [value, id] of new Map(textEntries).entries()) {
  lines.push(`  ${JSON.stringify(value)}: '${id}',`);
}
lines.push('};');
fs.writeFileSync(registryPath, `${lines.join('\n')}\n`, 'utf8');

console.log(`Audio registry synced: ${linked}/${manifest.items?.length ?? 0} embedded files linked.`);

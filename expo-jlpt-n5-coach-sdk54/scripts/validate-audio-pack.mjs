import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'assets/audio/audio-pack-manifest.json');
const audioDir = path.join(root, 'assets/audio/n5_core');
const registryPath = path.join(root, 'data/audioAssetRegistry.ts');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const registry = fs.existsSync(registryPath) ? fs.readFileSync(registryPath, 'utf8') : '';
const items = manifest.items ?? [];
const present = [];
const missing = [];
const unlinked = [];

for (const item of items) {
  const fileName = `${item.id}.wav`;
  const exists = fs.existsSync(path.join(audioDir, fileName));
  if (exists) present.push(item.id);
  else missing.push(item.id);
  if (exists && !registry.includes(`'${item.id}'`)) unlinked.push(item.id);
}

console.log(`Audio manifest: ${items.length} expected WAV files.`);
console.log(`Audio files present: ${present.length}/${items.length}.`);
console.log(`Audio files missing: ${missing.length}.`);
if (unlinked.length > 0) console.log(`Audio files not linked in registry: ${unlinked.length}. Run npm run audio:sync.`);
if (missing.length > 0) console.log(`First missing files: ${missing.slice(0, 8).map((id) => `${id}.wav`).join(', ')}`);

if (unlinked.length > 0) process.exitCode = 1;

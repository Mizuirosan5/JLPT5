import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'assets/audio/audio-pack-manifest.json');
const audioDir = path.join(root, 'assets/audio/n5_core');
const registryPath = path.join(root, 'data/audioAssetRegistry.ts');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const registry = fs.existsSync(registryPath) ? fs.readFileSync(registryPath, 'utf8') : '';
const items = manifest.items ?? [];
const format = manifest.format || 'mp3';
const strict = process.argv.includes('--strict');
const present = [];
const missing = [];
const unlinked = [];
const invalid = [];
const duplicated = [];
const seenIds = new Set();

for (const item of items) {
  if (!item?.id || !item?.japanese) invalid.push(item?.id ?? '(missing id)');
  if (seenIds.has(item.id)) duplicated.push(item.id);
  seenIds.add(item.id);
}

const extraFiles = fs.existsSync(audioDir)
  ? fs.readdirSync(audioDir)
      .filter((name) => name.endsWith(`.${format}`))
      .filter((name) => !seenIds.has(name.replace(new RegExp(`\\.${format}$`), '')))
  : [];

for (const item of items) {
  const fileName = `${item.id}.${format}`;
  const exists = fs.existsSync(path.join(audioDir, fileName));
  if (exists && fs.statSync(path.join(audioDir, fileName)).size > 1_000) present.push(item.id);
  else missing.push(item.id);
  if (exists && !registry.includes(`'${item.id}'`)) unlinked.push(item.id);
}

console.log(`Audio manifest: ${items.length} expected ${format.toUpperCase()} files.`);
console.log(`Audio files present: ${present.length}/${items.length}.`);
console.log(`Audio files missing: ${missing.length}.`);
if (invalid.length > 0) console.log(`Invalid manifest items: ${invalid.join(', ')}`);
if (duplicated.length > 0) console.log(`Duplicate manifest ids: ${Array.from(new Set(duplicated)).join(', ')}`);
if (extraFiles.length > 0) console.log(`Extra ${format.toUpperCase()} files not in manifest: ${extraFiles.slice(0, 8).join(', ')}`);
if (unlinked.length > 0) console.log(`Audio files not linked in registry: ${unlinked.length}. Run npm run audio:sync.`);
if (missing.length > 0) console.log(`First missing files: ${missing.slice(0, 8).map((id) => `${id}.${format}`).join(', ')}`);
if (strict && missing.length > 0) console.log(`Strict mode: missing ${format.toUpperCase()} files are blocking.`);

if (invalid.length > 0 || duplicated.length > 0 || extraFiles.length > 0 || unlinked.length > 0 || (strict && missing.length > 0)) {
  process.exitCode = 1;
}

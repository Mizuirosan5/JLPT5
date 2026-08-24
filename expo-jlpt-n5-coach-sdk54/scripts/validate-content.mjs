import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourceRoots = ['App.tsx', 'components', 'data', 'services'];
const failures = [];
const files = [];

function walk(target) {
  const full = path.join(root, target);
  const stat = fs.statSync(full);
  if (stat.isFile()) {
    if (/\.(ts|tsx|json)$/.test(full)) files.push(full);
    return;
  }
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    const next = path.join(target, entry.name);
    if (entry.isDirectory()) walk(next);
    else if (/\.(ts|tsx|json)$/.test(entry.name)) files.push(path.join(root, next));
  }
}

for (const target of sourceRoots) walk(target);

const brokenPatterns = [
  { label: 'caractere de remplacement Unicode', pattern: /\uFFFD/ },
  { label: 'mojibake UTF-8', pattern: /(?:Ã[\u0080-\u00BF]|Â[\u0080-\u00BF]|â(?:€|€™|€œ|€œ))/ },
];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  for (const { label, pattern } of brokenPatterns) {
    if (pattern.test(content)) failures.push(`${path.relative(root, file)}: ${label}`);
  }
}

const audioManifest = JSON.parse(fs.readFileSync(path.join(root, 'assets/audio/audio-pack-manifest.json'), 'utf8'));
const audioItems = audioManifest.items ?? [];
const audioIds = audioItems.map((item) => item.id);
if (new Set(audioIds).size !== audioIds.length) failures.push('assets/audio/audio-pack-manifest.json: identifiants audio dupliques');
if (audioItems.some((item) => !item.id || !item.japanese)) failures.push('assets/audio/audio-pack-manifest.json: champ obligatoire vide');

if (failures.length) {
  throw new Error(`Controle contenu en echec:\n- ${failures.join('\n- ')}`);
}

console.log(`Content check passed: ${files.length} source files, ${audioIds.length} audio declarations.`);

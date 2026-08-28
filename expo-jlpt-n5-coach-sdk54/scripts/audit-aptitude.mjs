import fs from 'node:fs';

const source = fs.readFileSync('components/LearningPathScreen.tsx', 'utf8');
const questionBlocks = Array.from(source.matchAll(/\{\s*id:\s*'(apt-[^']+)'[\s\S]*?level:\s*([123]),[\s\S]*?domain:\s*'([^']+)'[\s\S]*?choices:\s*\[([\s\S]*?)\],[\s\S]*?answer:\s*'([^']+)'[\s\S]*?\},/g));
const failures = [];
if (questionBlocks.length !== 30) failures.push(`30 questions attendues, ${questionBlocks.length} trouvées`);
const ids = questionBlocks.map((match) => match[1]);
if (new Set(ids).size !== ids.length) failures.push('identifiants de questions dupliqués');
for (const level of ['1', '2', '3']) {
  const count = questionBlocks.filter((match) => match[2] === level).length;
  if (count !== 10) failures.push(`niveau ${level}: 10 questions attendues, ${count} trouvées`);
}
const expectedDomains = ['kana', 'orthographe', 'vocabulaire', 'kanji', 'grammaire', 'comprehension'];
for (const domain of expectedDomains) {
  const count = questionBlocks.filter((match) => match[3] === domain).length;
  if (count < 3) failures.push(`${domain}: couverture insuffisante (${count})`);
}
if (/quelle\s+(?:r[eè]gle|diagnostic)|correspond\s+.*r[eè]gle/iu.test(source.slice(source.indexOf('const APTITUDE_QUESTIONS'), source.indexOf('const LEAGUE_TIERS')))) {
  failures.push('question abstraite sur le nom d une règle détectée');
}
if (questionBlocks.some((match) => !match[4].includes(','))) failures.push('question sans distracteurs suffisants');
if (failures.length) throw new Error(`Audit aptitude en échec:\n- ${failures.join('\n- ')}`);
console.log(`Aptitude audit passed: ${questionBlocks.length} questions, 3 niveaux, ${expectedDomains.length} domaines.`);

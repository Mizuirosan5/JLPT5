import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { VocabularyItem } from '../models';
import { getVocabularyCurriculumPlacement } from '../services/curriculum';

type VocabularyVisual = { kind: string; pictogram: string; colors: [string, string] };

function loadVisualClassifier(): (item: VocabularyItem) => VocabularyVisual {
  const source = readFileSync(resolve('components/VocabularyScreen.tsx'), 'utf8');
  const marker = 'export function getVocabularyVisual';
  const start = source.indexOf(marker);
  if (start < 0) throw new Error('getVocabularyVisual is missing from VocabularyScreen.tsx');

  const declarationEnd = source.indexOf('\n', start);
  const bodyStart = source.lastIndexOf('{', declarationEnd);
  let depth = 0;
  let bodyEnd = -1;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) {
      bodyEnd = index;
      break;
    }
  }
  if (bodyStart < 0 || bodyEnd < 0) throw new Error('Unable to parse getVocabularyVisual');

  const body = source.slice(bodyStart + 1, bodyEnd).replace('(value: string)', '(value)');
  const getVocabularyThemeLabel = (item: VocabularyItem) => item.theme || item.category || 'Vocabulaire general';
  return new Function('getVocabularyThemeLabel', `return function getVocabularyVisual(item) {${body}}`)(
    getVocabularyThemeLabel
  ) as (item: VocabularyItem) => VocabularyVisual;
}

const python = `
import sqlite3,json
c=sqlite3.connect('assets/database/jlpt_n5_mobile.db');c.row_factory=sqlite3.Row
print(json.dumps([dict(x) for x in c.execute("select id,japanese,kana,kanji,romaji,meaning_fr,part_of_speech,theme,jlpt_level,importance,'' category from canonical_vocabulary")],ensure_ascii=False))
`;
const rows = JSON.parse(execFileSync('python', ['-X', 'utf8', '-c', python], { encoding: 'utf8' })) as VocabularyItem[];
const guided = rows.filter((item) => getVocabularyCurriculumPlacement(item).track === 'guided');
const getVocabularyVisual = loadVisualClassifier();
const generic = guided.filter((item) => {
  const visual = getVocabularyVisual(item);
  return visual.kind === 'word';
});

const genericRatio = generic.length / Math.max(1, guided.length);
console.log(JSON.stringify({
  guided: guided.length,
  semantic: guided.length - generic.length,
  generic: generic.length,
  genericRatio: Number(genericRatio.toFixed(3)),
  items: generic.map((item) => ({ japanese: item.japanese, kana: item.kana, meaning: item.meaning_fr, theme: item.theme })),
}, null, 2));

if (genericRatio > 0.12) {
  throw new Error(`Too many guided vocabulary cards still use a generic visual: ${generic.length}/${guided.length}`);
}

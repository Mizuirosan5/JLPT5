import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import type { VocabularyItem } from '../models';
import { CORE_N5_FUNCTION_VOCABULARY } from '../data/n5CoreVocabulary';
import { VOCABULARY_BROWSE_THEMES, getVocabularyBrowseTheme } from '../services/vocabularyThemes';
import { curateVocabularyLearningItems } from '../services/vocabulary';
import { isJlptN5ExamVocabularyItem } from '../services/vocabularyLearning';

const python = `
import sqlite3,json
c=sqlite3.connect('assets/database/jlpt_n5_mobile.db');c.row_factory=sqlite3.Row
print(json.dumps([dict(x) for x in c.execute("select id,japanese,kana,kanji,romaji,meaning_fr,part_of_speech,theme,jlpt_level,importance,'' category from canonical_vocabulary where jlpt_level='N5'")],ensure_ascii=False))
`;
const rows = JSON.parse(execFileSync('python', ['-X', 'utf8', '-c', python], { encoding: 'utf8' })) as VocabularyItem[];
const examRows = curateVocabularyLearningItems(rows.filter(isJlptN5ExamVocabularyItem));
const allRows = curateVocabularyLearningItems(rows);
const themeCounts = new Map(VOCABULARY_BROWSE_THEMES.map((theme) => [theme.id, 0]));
examRows.forEach((entry) => {
  const theme = getVocabularyBrowseTheme(entry);
  themeCounts.set(theme.id, (themeCounts.get(theme.id) ?? 0) + 1);
});

const missingCore = CORE_N5_FUNCTION_VOCABULARY.filter((expected) => !rows.some((entry) =>
  entry.japanese === expected.japanese
  && entry.kana === expected.kana
  && entry.romaji === expected.romaji
  && entry.meaning_fr === expected.meaningFr
));
assert.deepEqual(missingCore, [], `Entrées fonctionnelles N5 absentes ou incorrectes: ${missingCore.map((item) => item.romaji).join(', ')}`);

const emptyThemes = VOCABULARY_BROWSE_THEMES.filter((theme) => (themeCounts.get(theme.id) ?? 0) === 0);
assert.deepEqual(emptyThemes, [], `Thèmes de vocabulaire vides: ${emptyThemes.map((theme) => theme.label).join(', ')}`);

const minimumCoverage: Record<string, number> = {
  numbers: 10,
  time: 20,
  'function-words': 63,
  people: 10,
  food: 10,
  home: 5,
  school: 5,
  travel: 10,
  descriptions: 10,
  actions: 20,
  leisure: 5,
};
for (const [themeId, minimum] of Object.entries(minimumCoverage)) {
  assert.ok((themeCounts.get(themeId) ?? 0) >= minimum, `${themeId}: couverture insuffisante (${themeCounts.get(themeId) ?? 0}/${minimum})`);
}

assert.ok(examRows.length >= 600 && examRows.length <= 900, `Corpus examen N5 incohérent: ${examRows.length}`);
assert.ok(allRows.length > examRows.length, 'Tout vocabulaire doit contenir davantage de mots que JLPT N5');
assert.ok(examRows.every(isJlptN5ExamVocabularyItem), 'Le corpus JLPT N5 contient une entrée de référence');

console.log(JSON.stringify({
  catalogVocabulary: allRows.length,
  jlptN5Vocabulary: examRows.length,
  coreFunctionWords: CORE_N5_FUNCTION_VOCABULARY.length,
  themes: VOCABULARY_BROWSE_THEMES.map((theme) => ({
    id: theme.id,
    label: theme.label,
    count: themeCounts.get(theme.id) ?? 0,
  })),
}, null, 2));

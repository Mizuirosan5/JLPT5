import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import type { VocabularyItem } from '../models';
import { CORE_N5_FUNCTION_VOCABULARY } from '../data/n5CoreVocabulary';
import { VOCABULARY_BROWSE_THEMES, getVocabularyBrowseTheme } from '../services/vocabularyThemes';

const python = `
import sqlite3,json
c=sqlite3.connect('assets/database/jlpt_n5_mobile.db');c.row_factory=sqlite3.Row
print(json.dumps([dict(x) for x in c.execute("select id,japanese,kana,kanji,romaji,meaning_fr,part_of_speech,theme,jlpt_level,importance,'' category from canonical_vocabulary where jlpt_level='N5'")],ensure_ascii=False))
`;
const rows = JSON.parse(execFileSync('python', ['-X', 'utf8', '-c', python], { encoding: 'utf8' })) as VocabularyItem[];
const themeCounts = new Map(VOCABULARY_BROWSE_THEMES.map((theme) => [theme.id, 0]));
rows.forEach((entry) => {
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
  numbers: 40,
  time: 40,
  'function-words': 63,
  people: 30,
  food: 30,
  home: 20,
  school: 20,
  travel: 30,
  descriptions: 30,
  actions: 30,
  leisure: 10,
};
for (const [themeId, minimum] of Object.entries(minimumCoverage)) {
  assert.ok((themeCounts.get(themeId) ?? 0) >= minimum, `${themeId}: couverture insuffisante (${themeCounts.get(themeId) ?? 0}/${minimum})`);
}

console.log(JSON.stringify({
  vocabulary: rows.length,
  coreFunctionWords: CORE_N5_FUNCTION_VOCABULARY.length,
  themes: VOCABULARY_BROWSE_THEMES.map((theme) => ({
    id: theme.id,
    label: theme.label,
    count: themeCounts.get(theme.id) ?? 0,
  })),
}, null, 2));

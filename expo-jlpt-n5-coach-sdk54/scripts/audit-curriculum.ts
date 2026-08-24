import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { CURRICULUM_CODES, CURRICULUM_UNITS, GRAMMAR_ORDERS_BY_LEVEL, KANJI_BY_LEVEL, type CurriculumCode } from '../data/curriculum';
import { ALL_GRAMMAR_LESSONS } from '../services/grammarCourse';
import { getGrammarCurriculumCode, getKanaCurriculumCode, getKanjiCurriculumCode, getVocabularyCurriculumPlacement } from '../services/curriculum';
import type { KanaCard, KanjiItem, VocabularyItem } from '../models';
import { KANJI_READING_CARDS } from '../data/kanjiReadingCards';

const python = `
import sqlite3,json
c=sqlite3.connect('assets/database/jlpt_n5_mobile.db');c.row_factory=sqlite3.Row
tables={}
tables['kana']=[dict(x) for x in c.execute('select id,character,script from canonical_kana where needs_review=0')]
tables['kanji']=[dict(x) for x in c.execute("select id,character,meaning_fr,onyomi,kunyomi,n5_readings,stroke_count,jlpt_level from canonical_kanji where jlpt_level='N5'")]
tables['vocabulary']=[dict(x) for x in c.execute("select id,japanese,kana,kanji,romaji,meaning_fr,part_of_speech,theme,jlpt_level,importance,'' category from canonical_vocabulary")]
print(json.dumps(tables,ensure_ascii=False))
`;
const raw = execFileSync('python', ['-X', 'utf8', '-c', python], { encoding: 'utf8' });
const data = JSON.parse(raw) as { kana: KanaCard[]; kanji: KanjiItem[]; vocabulary: VocabularyItem[] };

assert.equal(CURRICULUM_UNITS.length, 30, 'Le curriculum doit contenir exactement 30 sous-niveaux.');
assert.deepEqual(CURRICULUM_UNITS.map((unit) => unit.code), [...CURRICULUM_CODES]);
const grammarOrders = Object.values(GRAMMAR_ORDERS_BY_LEVEL).flat();
assert.equal(grammarOrders.length, new Set(grammarOrders).size, 'Une leçon de grammaire ne peut appartenir à deux niveaux.');
const guidedGrammar = ALL_GRAMMAR_LESSONS.filter((lesson) => getGrammarCurriculumCode(lesson));
assert.ok(guidedGrammar.length >= 110, `Cours de grammaire guidé trop petit: ${guidedGrammar.length}.`);

const declaredKanji = Object.values(KANJI_BY_LEVEL).join('');
assert.equal(declaredKanji.length, 80, 'Le parcours doit classer les 80 kanji N5.');
assert.equal(new Set(declaredKanji).size, 80, 'Chaque kanji N5 doit être classé une seule fois.');
const unmappedKanji = data.kanji.filter((item) => !getKanjiCurriculumCode(item));
assert.equal(unmappedKanji.length, 0, `Kanji non classés: ${unmappedKanji.map((item) => item.character).join('')}`);
assert.equal(Object.keys(KANJI_READING_CARDS).length, 80, 'Les 80 cartes kanji doivent avoir leurs lectures détaillées.');
assert.deepEqual(new Set(Object.keys(KANJI_READING_CARDS)), new Set(Array.from(declaredKanji)));
for (const [character, card] of Object.entries(KANJI_READING_CARDS)) {
  assert.ok(card.readings.length >= 1 && card.readings.length <= 3, `${character}: nombre de groupes de lectures invalide.`);
  card.readings.forEach((reading) => {
    assert.ok(reading.kana && reading.romaji, `${character}: lecture kana ou romaji manquante.`);
    assert.ok(
      reading.examples.some((example) => example.word && example.kana && example.romaji && example.meaningFr),
      `${character}: exemple traduit manquant.`,
    );
  });
}

const guidedVocabulary = data.vocabulary.filter((item) => getVocabularyCurriculumPlacement(item).track === 'guided');
assert.ok(guidedVocabulary.length >= 350, `Socle lexical guidé trop petit: ${guidedVocabulary.length}.`);
assert.ok(guidedVocabulary.length <= 900, `Socle lexical guidé irréaliste pour le N5: ${guidedVocabulary.length}.`);
const mappedKana = data.kana.filter((item) => getKanaCurriculumCode(item));
assert.ok(mappedKana.length >= 200, `Inventaire kana classé incomplet: ${mappedKana.length}.`);

const counts = new Map<CurriculumCode, number>(CURRICULUM_CODES.map((code) => [code, 0]));
for (const item of data.kana) {
  const code = getKanaCurriculumCode(item);
  if (code) counts.set(code, (counts.get(code) ?? 0) + 1);
}
for (const item of data.kanji) {
  const code = getKanjiCurriculumCode(item);
  if (code) counts.set(code, (counts.get(code) ?? 0) + 1);
}
for (const item of guidedVocabulary) {
  const code = getVocabularyCurriculumPlacement(item).code;
  counts.set(code, (counts.get(code) ?? 0) + 1);
}
for (const lesson of guidedGrammar) {
  const code = getGrammarCurriculumCode(lesson);
  if (code) counts.set(code, (counts.get(code) ?? 0) + 1);
}
const emptyLevels = CURRICULUM_CODES.filter((code) => (counts.get(code) ?? 0) === 0);
assert.equal(emptyLevels.length, 0, `Niveaux sans contenu: ${emptyLevels.join(', ')}`);
const impossibleLevels = CURRICULUM_UNITS.filter((unit) => unit.targetItems > (counts.get(unit.code) ?? 0));
assert.equal(impossibleLevels.length, 0, `Seuils impossibles: ${impossibleLevels.map((unit) => unit.code).join(', ')}`);
console.log(JSON.stringify({ units: 30, grammar: guidedGrammar.length, kanji: data.kanji.length, vocabulary: guidedVocabulary.length, kana: mappedKana.length, counts: Object.fromEntries(counts) }, null, 2));

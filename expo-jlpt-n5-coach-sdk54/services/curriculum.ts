import type { SQLiteDatabase } from 'expo-sqlite';
import type { GrammarLesson, KanaCard, KanjiItem, VocabularyExample, VocabularyItem } from '../models';
import {
  CURRICULUM_CODES,
  CURRICULUM_UNITS,
  GRAMMAR_ORDERS_BY_LEVEL,
  KANJI_BY_LEVEL,
  type CurriculumCode,
  type CurriculumUnit,
} from '../data/curriculum';

export type CurriculumTrack = 'guided' | 'reference';
export type CurriculumPlacement = { code: CurriculumCode; track: CurriculumTrack; reason: string };
export type CurriculumProfile = {
  currentCode: CurriculumCode;
  unit: CurriculumUnit;
  completedUnits: number;
  progress: number;
  attempts: number;
  accuracy: number;
  masteredItems: number;
};

export type CurriculumQuestionRow = {
  question_id: string;
  item_type?: string | null;
  item_id?: string | null;
  skill_id: string;
  prompt_ja?: string | null;
};

type CurriculumCatalog = {
  kanaById: Map<string, CurriculumCode>;
  kanaByCharacter: Map<string, CurriculumCode>;
  vocabularyById: Map<string, CurriculumPlacement>;
  kanjiById: Map<string, CurriculumCode>;
  kanjiByCharacter: Map<string, CurriculumCode>;
};
const curriculumCatalogCache = new WeakMap<SQLiteDatabase, Promise<CurriculumCatalog>>();

const codeIndex = new Map(CURRICULUM_CODES.map((code, index) => [code, index]));
const grammarCodeByOrder = new Map<number, CurriculumCode>();
const kanjiCodeByCharacter = new Map<string, CurriculumCode>();

Object.entries(GRAMMAR_ORDERS_BY_LEVEL).forEach(([code, orders]) => {
  orders.forEach((order) => grammarCodeByOrder.set(order, code as CurriculumCode));
});
Object.entries(KANJI_BY_LEVEL).forEach(([code, characters]) => {
  Array.from(characters ?? '').forEach((character) => kanjiCodeByCharacter.set(character, code as CurriculumCode));
});

const HIRAGANA_LEVELS: Array<[CurriculumCode, string]> = [
  ['1A', 'あいうえお'],
  ['1B', 'かきくけこさしすせそたちつてと'],
  ['1C', 'なにぬねのはひふへほまみむめもやゆよ'],
  ['2A', 'らりるれろわをん'],
  ['2B', 'がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ'],
  ['2C', 'ぁぃぅぇぉゃゅょっゔ'],
];
const KATAKANA_LEVELS: Array<[CurriculumCode, string]> = [
  ['3A', 'アイウエオカキクケコサシスセソタチツテト'],
  ['3B', 'ナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'],
  ['3C', 'ァィゥェォャュョッガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポヴヵヶ'],
];
const kanaCodeByCharacter = new Map<string, CurriculumCode>();
[...HIRAGANA_LEVELS, ...KATAKANA_LEVELS].forEach(([code, characters]) => {
  Array.from(characters).forEach((character) => kanaCodeByCharacter.set(character, code));
});

export function getCurriculumIndex(code: CurriculumCode): number {
  return codeIndex.get(code) ?? 0;
}

export function isCurriculumAccessible(itemCode: CurriculumCode, currentCode: CurriculumCode): boolean {
  return getCurriculumIndex(itemCode) <= getCurriculumIndex(currentCode);
}

export function getGrammarCurriculumCode(lesson: Pick<GrammarLesson, 'order'>): CurriculumCode | null {
  const baseCode = grammarCodeByOrder.get(lesson.order);
  if (!baseCode) return null;
  if (!('examples' in lesson)) return baseCode;
  const readableExamples = (lesson as GrammarLesson).examples
    .map((example) => getKanaRequirement(example.kana))
    .filter(Boolean) as CurriculumCode[];
  if (!readableExamples.length) return null;
  const firstReadableCode = readableExamples.reduce((earliest, code) =>
    getCurriculumIndex(code) < getCurriculumIndex(earliest) ? code : earliest
  );
  return laterCode(baseCode, firstReadableCode);
}

export function getKanjiCurriculumCode(item: Pick<KanjiItem, 'character'>): CurriculumCode | null {
  return kanjiCodeByCharacter.get(item.character) ?? null;
}

export function getKanaCurriculumCode(item: Pick<KanaCard, 'character' | 'script'>): CurriculumCode | null {
  const characters = Array.from(item.character).filter((character) => character !== 'ー');
  if (!characters.length) return null;
  const codes = characters.map((character) => kanaCodeByCharacter.get(character)).filter(Boolean) as CurriculumCode[];
  if (codes.length !== characters.length) return null;
  return codes.reduce((latest, code) => laterCode(latest, code), codes[0]);
}

export function getVocabularyCurriculumPlacement(
  item: VocabularyExample & { theme?: string | null; category?: string; importance?: number | null },
): CurriculumPlacement {
  const searchable = normalizeText(`${item.theme ?? ''} ${item.category ?? ''} ${item.meaning_fr} ${item.japanese}`);
  const topicCode = getVocabularyTopicCode(searchable, item.importance, item.kana || item.japanese);
  const kanaRequirement = getKanaRequirement(item.kana || item.japanese);
  const kanjiRequirement = getKanjiRequirement(item.kanji || item.japanese);
  const dependencyCode = [topicCode, kanaRequirement, kanjiRequirement]
    .filter(Boolean)
    .reduce<CurriculumCode>((latest, code) => laterCode(latest, code as CurriculumCode), topicCode);
  const hasUnsupportedWriting = kanaRequirement === null || kanjiRequirement === null;
  const isCore = (item.importance ?? 3) >= 4 && !hasUnsupportedWriting;
  return {
    code: hasUnsupportedWriting ? '10C' : dependencyCode,
    track: isCore ? 'guided' : 'reference',
    reason: hasUnsupportedWriting
      ? 'Écriture hors du socle guidé N5.'
      : isCore
        ? `Thème et prérequis d'écriture acquis au niveau ${dependencyCode}.`
        : 'Entrée complémentaire conservée dans la bibliothèque de référence.',
  };
}

export function getJapaneseTextCurriculumCode(value: string): CurriculumCode | null {
  const kana = getKanaRequirement(value);
  const kanji = getKanjiRequirement(value);
  if (!kana || !kanji) return null;
  return laterCode(kana, kanji);
}

export function filterGrammarForCurriculum(lessons: GrammarLesson[], currentCode: CurriculumCode): GrammarLesson[] {
  return lessons.flatMap((lesson) => {
    const code = getGrammarCurriculumCode(lesson);
    if (!code || !isCurriculumAccessible(code, currentCode)) return [];
    const examples = lesson.examples
      .filter((example) => {
        const kanaCode = getKanaRequirement(example.kana);
        return kanaCode ? isCurriculumAccessible(kanaCode, currentCode) : false;
      })
      .map((example) => {
        const kanjiCode = getKanjiRequirement(example.kanji);
        return kanjiCode && isCurriculumAccessible(kanjiCode, currentCode)
          ? example
          : { ...example, kanji: example.kana };
      });
    return examples.length ? [{ ...lesson, examples }] : [];
  });
}

export function filterKanaForCurriculum<T extends Pick<KanaCard, 'character' | 'script'>>(
  items: T[],
  currentCode: CurriculumCode,
): T[] {
  return items.filter((item) => {
    const code = getKanaCurriculumCode(item);
    return code ? isCurriculumAccessible(code, currentCode) : false;
  });
}

export function filterKanjiForCurriculum<T extends Pick<KanjiItem, 'character'>>(
  items: T[],
  currentCode: CurriculumCode,
): T[] {
  return items.filter((item) => {
    const code = getKanjiCurriculumCode(item);
    return code ? isCurriculumAccessible(code, currentCode) : false;
  });
}

export function filterVocabularyForCurriculum<
  T extends VocabularyExample & { theme?: string | null; category?: string; importance?: number | null },
>(
  items: T[],
  currentCode: CurriculumCode,
  includeReference = false,
): T[] {
  return items.filter((item) => {
    const placement = getVocabularyCurriculumPlacement(item);
    return (includeReference || placement.track === 'guided') && isCurriculumAccessible(placement.code, currentCode);
  });
}

export async function loadCurriculumProfile(db: SQLiteDatabase): Promise<CurriculumProfile> {
  const stored = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM app_user_learning_preferences WHERE key = 'curriculum_current_code'`,
  );
  let currentCode = isCurriculumCode(stored?.value) ? stored.value : await getPlacementCode(db);
  let evidence = await loadUnitEvidence(db, currentCode);
  const unit = getCurriculumUnit(currentCode);
  if (hasPassedUnit(unit, evidence) && currentCode !== '10C') {
    currentCode = CURRICULUM_CODES[getCurriculumIndex(currentCode) + 1];
    await saveCurriculumCode(db, currentCode);
    evidence = await loadUnitEvidence(db, currentCode);
  } else if (!stored) {
    await saveCurriculumCode(db, currentCode);
  }
  const activeUnit = getCurriculumUnit(currentCode);
  const exposureProgress = Math.min(100, Math.round((evidence.masteredItems / activeUnit.targetItems) * 100));
  const attemptProgress = Math.min(100, Math.round((evidence.attempts / activeUnit.minimumAttempts) * 100));
  return {
    currentCode,
    unit: activeUnit,
    completedUnits: getCurriculumIndex(currentCode),
    progress: Math.round(exposureProgress * 0.65 + attemptProgress * 0.35),
    attempts: evidence.attempts,
    accuracy: evidence.accuracy,
    masteredItems: evidence.masteredItems,
  };
}

export async function loadCurriculumCatalog(db: SQLiteDatabase): Promise<CurriculumCatalog> {
  const cached = curriculumCatalogCache.get(db);
  if (cached) return cached;
  const request = buildCurriculumCatalog(db).catch((error) => {
    curriculumCatalogCache.delete(db);
    throw error;
  });
  curriculumCatalogCache.set(db, request);
  return request;
}

async function buildCurriculumCatalog(db: SQLiteDatabase): Promise<CurriculumCatalog> {
  const [kana, vocabulary, kanji] = await Promise.all([
    db.getAllAsync<Pick<KanaCard, 'id' | 'character' | 'script'>>(`SELECT id, character, script FROM canonical_kana`),
    db.getAllAsync<VocabularyItem>(`
      SELECT id, japanese, kana, kanji, romaji, meaning_fr, part_of_speech, theme,
             importance, COALESCE(jlpt_level, 'N5') AS jlpt_level, '' AS category
      FROM canonical_vocabulary
    `),
    db.getAllAsync<KanjiItem>(`
      SELECT id, character, meaning_fr, onyomi, kunyomi, n5_readings, stroke_count, jlpt_level
      FROM canonical_kanji
    `),
  ]);
  const kanaById = new Map<string, CurriculumCode>();
  const kanaByCharacter = new Map<string, CurriculumCode>();
  kana.forEach((item) => {
    const code = getKanaCurriculumCode(item as Pick<KanaCard, 'character' | 'script'>);
    if (code) {
      kanaById.set(item.id, code);
      kanaByCharacter.set(item.character, code);
    }
  });
  const vocabularyById = new Map(vocabulary.map((item) => [item.id, getVocabularyCurriculumPlacement(item)]));
  const kanjiById = new Map<string, CurriculumCode>();
  const kanjiByCharacterMap = new Map<string, CurriculumCode>();
  kanji.forEach((item) => {
    const code = getKanjiCurriculumCode(item);
    if (code) {
      kanjiById.set(item.id, code);
      kanjiByCharacterMap.set(item.character, code);
    }
  });
  return { kanaById, kanaByCharacter, vocabularyById, kanjiById, kanjiByCharacter: kanjiByCharacterMap };
}

export function getQuestionCurriculumCode(
  question: CurriculumQuestionRow,
  catalog: CurriculumCatalog,
): CurriculumCode | null {
  if (question.skill_id === 'grammar') return null;
  if (question.skill_id === 'kana') {
    return (question.item_id ? catalog.kanaById.get(question.item_id) : undefined)
      ?? (question.prompt_ja ? catalog.kanaByCharacter.get(question.prompt_ja) : undefined)
      ?? null;
  }
  if (question.skill_id === 'vocabulary' && question.item_id) {
    const placement = catalog.vocabularyById.get(question.item_id);
    return placement?.track === 'guided' ? placement.code : null;
  }
  if (question.skill_id === 'kanji') {
    return (question.item_id ? catalog.kanjiById.get(question.item_id) : undefined)
      ?? (question.prompt_ja ? catalog.kanjiByCharacter.get(question.prompt_ja) : undefined)
      ?? null;
  }
  return null;
}

export function filterQuestionsForCurriculum<T extends CurriculumQuestionRow>(
  questions: T[],
  catalog: CurriculumCatalog,
  currentCode: CurriculumCode,
): T[] {
  return questions.filter((question) => {
    const code = getQuestionCurriculumCode(question, catalog);
    return code ? isCurriculumAccessible(code, currentCode) : false;
  });
}

function getCurriculumUnit(code: CurriculumCode): CurriculumUnit {
  return CURRICULUM_UNITS[getCurriculumIndex(code)] ?? CURRICULUM_UNITS[0];
}

function laterCode(a: CurriculumCode, b: CurriculumCode): CurriculumCode {
  return getCurriculumIndex(a) >= getCurriculumIndex(b) ? a : b;
}

function getKanaRequirement(value: string | null | undefined): CurriculumCode | null {
  const kana = Array.from(value ?? '').filter((character) => /[\u3040-\u30ff]/u.test(character) && character !== 'ー');
  if (!kana.length) return '1A';
  const codes = kana.map((character) => kanaCodeByCharacter.get(character));
  if (codes.some((code) => !code)) return null;
  return (codes as CurriculumCode[]).reduce((latest, code) => laterCode(latest, code), '1A');
}

function getKanjiRequirement(value: string | null | undefined): CurriculumCode | null {
  const kanji = Array.from(value ?? '').filter((character) => /[\u3400-\u4dbf\u4e00-\u9fff]/u.test(character));
  if (!kanji.length) return '1A';
  const codes = kanji.map((character) => kanjiCodeByCharacter.get(character));
  if (codes.some((code) => !code)) return null;
  return (codes as CurriculumCode[]).reduce((latest, code) => laterCode(latest, code), '1A');
}

function getVocabularyTopicCode(
  text: string,
  importance: number | null | undefined,
  reading: string,
): CurriculumCode {
  if (/(salutation|formule|bonjour|merci|pardon)/.test(text)) return '1A';
  if (/(nombre|compteur|chiffre)/.test(text)) return '4A';
  if (/(temps|calendrier|date|heure|saison)/.test(text)) return '4B';
  if (/(ecole|etude|education|savoir)/.test(text)) return '4C';
  if (/(lieu|direction|deplacement|transport|voyage)/.test(text)) return '5A';
  if (/(maison|quotidien|objet)/.test(text)) return '5B';
  if (/(famille|personne|nourriture|boisson)/.test(text)) return '5C';
  if (/(couleur|description|adjectif|etat)/.test(text)) return '6A';
  if (/(action|verbe)/.test(text)) return '6B';
  if (/(nature|meteo|animal)/.test(text)) return '7A';
  if (/(corps|sante)/.test(text)) return '7B';
  if (/(argent|achat|magasin)/.test(text)) return '7C';
  if (/(emotion|expression|interjection)/.test(text)) return '8A';
  if (/(technologie)/.test(text)) return '9C';

  // Le corpus general n'a pas toujours de theme exploitable. Sa priorite
  // editoriale et la longueur de lecture servent alors de progression stable.
  const readingLength = Array.from(reading).filter((character) => /[\u3040-\u30ff]/u.test(character)).length;
  if ((importance ?? 3) >= 5) {
    if (readingLength <= 2) return '3C';
    if (readingLength === 3) return '4C';
    if (readingLength === 4) return '5A';
    return '6A';
  }
  if ((importance ?? 3) >= 4) {
    if (readingLength <= 2) return '6A';
    if (readingLength <= 4) return '7A';
    return '8A';
  }
  return '8B';
}

function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function isCurriculumCode(value: string | undefined): value is CurriculumCode {
  return !!value && (CURRICULUM_CODES as readonly string[]).includes(value);
}

async function getPlacementCode(db: SQLiteDatabase): Promise<CurriculumCode> {
  const result = await db.getFirstAsync<{ score: number }>(
    `SELECT score FROM app_aptitude_result ORDER BY created_at DESC LIMIT 1`,
  );
  return getCurriculumPlacementFromScore(result?.score ?? 0);
}

export function getCurriculumPlacementFromScore(score: number): CurriculumCode {
  if (score >= 85) return '9A';
  if (score >= 70) return '7A';
  if (score >= 55) return '5A';
  if (score >= 40) return '3A';
  return '1A';
}

export async function applyDiagnosticCurriculumPlacement(db: SQLiteDatabase, score: number): Promise<CurriculumCode> {
  const code = getCurriculumPlacementFromScore(score);
  await saveCurriculumCode(db, code);
  return code;
}

async function saveCurriculumCode(db: SQLiteDatabase, code: CurriculumCode): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO app_user_learning_preferences (key, value, updated_at)
     VALUES ('curriculum_current_code', ?, datetime('now'))`,
    code,
  );
}

async function loadUnitEvidence(db: SQLiteDatabase, code: CurriculumCode) {
  const catalog = await loadCurriculumCatalog(db);
  const rows = await db.getAllAsync<CurriculumQuestionRow & { attempts: number; correct: number }>(`
    WITH recent AS (
      SELECT q.question_id, q.item_type, q.item_id, q.skill_id, q.prompt_ja, a.is_correct,
             ROW_NUMBER() OVER (PARTITION BY q.question_id ORDER BY a.answered_at DESC) AS attempt_rank
      FROM app_question_attempt_local a
      INNER JOIN app_question_bank q ON q.question_id = a.question_id
    )
    SELECT question_id, item_type, item_id, skill_id, prompt_ja,
           COUNT(*) AS attempts, SUM(is_correct) AS correct
    FROM recent
    WHERE attempt_rank <= 5
    GROUP BY question_id, item_type, item_id, skill_id, prompt_ja
  `);
  const matching = rows.filter((row) => getQuestionCurriculumCode(row, catalog) === code);
  const grammar = await db.getAllAsync<{ lesson_id: string; completed: number; exercise_attempts: number; exercise_correct: number }>(`
    SELECT lesson_id, completed, exercise_attempts, exercise_correct FROM app_grammar_lesson_state
  `);
  const grammarById = new Map(grammar.map((row) => [row.lesson_id, row]));
  const grammarLessons = await import('./grammarCourse').then((module) => module.ALL_GRAMMAR_LESSONS);
  const matchingGrammar = grammarLessons
    .filter((lesson) => getGrammarCurriculumCode(lesson) === code)
    .map((lesson) => grammarById.get(lesson.id))
    .filter(Boolean) as Array<{ completed: number; exercise_attempts: number; exercise_correct: number }>;
  const attempts = matching.reduce((sum, row) => sum + row.attempts, 0)
    + matchingGrammar.reduce((sum, row) => sum + row.exercise_attempts, 0);
  const correct = matching.reduce((sum, row) => sum + row.correct, 0)
    + matchingGrammar.reduce((sum, row) => sum + row.exercise_correct, 0);
  const masteredItems = matching.filter((row) => row.attempts >= 2 && row.correct / row.attempts >= 0.8).length
    + matchingGrammar.filter((row) => row.completed === 1 || (row.exercise_attempts >= 2 && row.exercise_correct / row.exercise_attempts >= 0.8)).length;
  return { attempts, accuracy: attempts > 0 ? Math.round((correct / attempts) * 100) : 0, masteredItems };
}

function hasPassedUnit(unit: CurriculumUnit, evidence: { attempts: number; accuracy: number; masteredItems: number }): boolean {
  return evidence.attempts >= unit.minimumAttempts
    && evidence.accuracy >= unit.minimumAccuracy
    && evidence.masteredItems >= unit.targetItems;
}

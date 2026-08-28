import type { SQLiteDatabase } from 'expo-sqlite';
import type { LearningPreferences } from '../models';
import type { SrsItemType } from './srs';
import { buildQuickSessionQuestions, type QuickSessionQuestion } from './quickSession';
import { loadCurriculumProfile } from './curriculum';

export type LearningLotSource = 'guided' | 'theme' | 'review';
export type LearningLotPhase = 'intro' | 'learn' | 'recap' | 'quiz' | 'summary';
export type LearningLotItem = {
  itemType: SrsItemType;
  itemId: string;
  main: string;
  reading: string;
  meaning: string;
  attribute: string;
  question: QuickSessionQuestion;
};
export type LearningLotAnswer = { questionId: string; selected: string; correct: boolean };
export type LearningLotSnapshot = {
  id: string;
  source: LearningLotSource;
  curriculumCode: string;
  title: string;
  objective: string;
  items: LearningLotItem[];
  itemRefs: Array<{ itemType: SrsItemType; itemId: string }>;
  phase: LearningLotPhase;
  currentIndex: number;
  answers: LearningLotAnswer[];
  startedAt: string;
};

export async function buildGuidedLearningLot(db: SQLiteDatabase, preferences: LearningPreferences, now = new Date()): Promise<LearningLotSnapshot> {
  const [profile, quickQuestions] = await Promise.all([loadCurriculumProfile(db), buildQuickSessionQuestions(db, preferences)]);
  const selected = [...quickQuestions].sort((a, b) => a.question.question_id.localeCompare(b.question.question_id)).slice(0, 6);
  const items = await Promise.all(selected.map((question) => enrichLearningLotItem(db, question)));
  const day = now.toISOString().slice(0, 10);
  return {
    id: `guided:${profile.currentCode}:${day}`,
    source: 'guided',
    curriculumCode: profile.currentCode,
    title: profile.unit.title,
    objective: profile.unit.canDo,
    items,
    itemRefs: items.map((item) => ({ itemType: item.itemType, itemId: item.itemId })),
    phase: 'intro',
    currentIndex: 0,
    answers: [],
    startedAt: now.toISOString(),
  };
}

async function enrichLearningLotItem(db: SQLiteDatabase, wrapper: QuickSessionQuestion): Promise<LearningLotItem> {
  const question = wrapper.question;
  const itemId = question.item_id || question.question_id;
  if (question.skill_id === 'kana') {
    const row = await db.getFirstAsync<{ character: string; romaji: string }>('SELECT character, romaji FROM canonical_kana WHERE id = ?', itemId);
    return { itemType: 'kana', itemId, main: row?.character || question.correct_answer, reading: row?.romaji || extractQuotedReading(question.prompt_fr), meaning: 'Signe phonétique japonais', attribute: 'Kana', question: wrapper };
  }
  if (question.skill_id === 'vocabulary') {
    const row = await db.getFirstAsync<{ japanese: string; kana: string | null; meaning_fr: string; part_of_speech: string | null }>('SELECT japanese, kana, meaning_fr, part_of_speech FROM canonical_vocabulary WHERE id = ?', itemId);
    return { itemType: 'vocabulary', itemId, main: row?.japanese || question.prompt_ja || question.correct_answer, reading: row?.kana || '', meaning: row?.meaning_fr || question.prompt_fr, attribute: row?.part_of_speech || 'Vocabulaire N5', question: wrapper };
  }
  if (question.skill_id === 'kanji') {
    const row = await db.getFirstAsync<{ character: string; n5_readings: string | null; meaning_fr: string }>('SELECT character, n5_readings, meaning_fr FROM canonical_kanji WHERE id = ?', itemId);
    return { itemType: 'kanji', itemId, main: row?.character || question.prompt_ja || question.correct_answer, reading: row?.n5_readings || '', meaning: row?.meaning_fr || question.prompt_fr, attribute: 'Kanji N5', question: wrapper };
  }
  return { itemType: 'skill', itemId, main: question.prompt_ja || question.correct_answer, reading: '', meaning: question.prompt_fr, attribute: question.skill_id, question: wrapper };
}

function extractQuotedReading(value: string): string {
  return value.match(/[«"]([^»"]+)[»"]/u)?.[1] ?? '';
}

export function updateLearningLot(snapshot: LearningLotSnapshot, patch: Partial<Pick<LearningLotSnapshot, 'phase' | 'currentIndex' | 'answers'>>): LearningLotSnapshot {
  return { ...snapshot, ...patch };
}

export function getLearningLotScore(snapshot: LearningLotSnapshot) {
  const correct = snapshot.answers.filter((answer) => answer.correct).length;
  return { correct, total: snapshot.answers.length, rate: snapshot.answers.length ? Math.round(correct * 100 / snapshot.answers.length) : 0 };
}

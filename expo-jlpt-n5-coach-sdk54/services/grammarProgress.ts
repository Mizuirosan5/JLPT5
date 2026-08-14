import { SQLiteDatabase } from 'expo-sqlite';
import type { GrammarLesson, GrammarLessonStatus, GrammarProgressSummary, MasteryDomainStats } from '../models';
import { recordSrsReviewForQuestionAttempt } from './srs';

type GrammarMenuResolver = (lesson: GrammarLesson) => string;

export function buildGrammarMasteryDomain(summary: GrammarProgressSummary): MasteryDomainStats {
  const known = Math.max(0, summary.opened - summary.completed);
  const review =
    summary.exerciseAttempts > 0 && summary.exerciseRate < 70
      ? Math.min(known, Math.max(1, Math.round(summary.exerciseAttempts / 5)))
      : 0;
  return {
    id: 'grammar',
    label: 'Grammaire',
    total: summary.total,
    mastered: summary.completed,
    known: Math.max(0, known - review),
    review,
    unseen: Math.max(0, summary.total - summary.opened),
    attempted: summary.exerciseAttempts,
    correct: summary.exerciseCorrect,
    rate: summary.exerciseRate,
  };
}

export async function loadGrammarProgressSummary(
  db: SQLiteDatabase,
  lessons: GrammarLesson[],
  getGrammarMainMenu: GrammarMenuResolver
): Promise<GrammarProgressSummary> {
  const rows = await db.getAllAsync<{
    lesson_id: string;
    opened_count: number;
    completed: number;
    exercise_attempts: number;
    exercise_correct: number;
  }>(`
    SELECT lesson_id, opened_count, completed, exercise_attempts, exercise_correct
    FROM app_grammar_lesson_state
  `);
  const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  const validRows = rows.filter((row) => lessonById.has(row.lesson_id));
  const opened = validRows.filter((row) => row.opened_count > 0).length;
  const completed = validRows.filter((row) => row.completed === 1).length;
  const exerciseAttempts = validRows.reduce((sum, row) => sum + row.exercise_attempts, 0);
  const exerciseCorrect = validRows.reduce((sum, row) => sum + row.exercise_correct, 0);
  const menusOpened = new Set(
    validRows
      .filter((row) => row.opened_count > 0)
      .map((row) => getGrammarMainMenu(lessonById.get(row.lesson_id)!))
  ).size;
  return {
    total: lessons.length,
    opened,
    completed,
    exerciseAttempts,
    exerciseCorrect,
    exerciseRate: exerciseAttempts > 0 ? Math.round((exerciseCorrect / exerciseAttempts) * 100) : 0,
    menusOpened,
  };
}

export async function loadGrammarLessonStatusById(
  db: SQLiteDatabase,
  lessons: GrammarLesson[]
): Promise<Record<string, GrammarLessonStatus>> {
  const rows = await db.getAllAsync<{ lesson_id: string; completed: number }>(`
    SELECT lesson_id, completed
    FROM app_grammar_lesson_state
  `);
  const validIds = new Set(lessons.map((lesson) => lesson.id));
  return rows.reduce<Record<string, GrammarLessonStatus>>((acc, row) => {
    if (!validIds.has(row.lesson_id)) return acc;
    acc[row.lesson_id] = numberToGrammarLessonStatus(row.completed);
    return acc;
  }, {});
}

export async function markGrammarLessonOpened(db: SQLiteDatabase, lessonId: string): Promise<void> {
  await db.runAsync(
    `
    INSERT INTO app_grammar_lesson_state (
      lesson_id, opened_count, completed, exercise_attempts, exercise_correct, updated_at
    ) VALUES (?, 1, 0, 0, 0, datetime('now'))
    ON CONFLICT(lesson_id) DO UPDATE SET
      opened_count = opened_count + 1,
      updated_at = datetime('now')
    `,
    lessonId
  );
}

export async function setGrammarLessonStatus(
  db: SQLiteDatabase,
  lessonId: string,
  status: GrammarLessonStatus
): Promise<void> {
  const value = grammarLessonStatusToNumber(status);
  await db.runAsync(
    `
    INSERT INTO app_grammar_lesson_state (
      lesson_id, opened_count, completed, exercise_attempts, exercise_correct, updated_at
    ) VALUES (?, 1, ?, 0, 0, datetime('now'))
    ON CONFLICT(lesson_id) DO UPDATE SET
      completed = ?,
      opened_count = MAX(opened_count, 1),
      updated_at = datetime('now')
    `,
    lessonId,
    value,
    value
  );
}

export function formatGrammarLessonStatus(status: GrammarLessonStatus): string {
  if (status === 'understood') return 'Comprise';
  if (status === 'not_understood') return 'Non comprise';
  return 'Neutre';
}

export async function recordGrammarExerciseAttempt(
  db: SQLiteDatabase,
  lesson: GrammarLesson,
  selectedAnswer: string,
  correctAnswer: string,
  isCorrect: boolean,
  sourceMode: 'grammar_lesson' | 'grammar_quiz' | 'grammar_matching',
  getGrammarMainMenu: GrammarMenuResolver
): Promise<void> {
  await db.runAsync(
    `
    INSERT INTO app_grammar_lesson_state (
      lesson_id, opened_count, completed, exercise_attempts, exercise_correct, updated_at
    ) VALUES (?, 1, 0, 1, ?, datetime('now'))
    ON CONFLICT(lesson_id) DO UPDATE SET
      opened_count = MAX(opened_count, 1),
      exercise_attempts = exercise_attempts + 1,
      exercise_correct = exercise_correct + ?,
      updated_at = datetime('now')
    `,
    lesson.id,
    isCorrect ? 1 : 0,
    isCorrect ? 1 : 0
  );
  await db.runAsync(
    `
    INSERT INTO app_question_attempt_local (
      id, question_id, source_mode, selected_answer, correct_answer,
      is_correct, skill_id, answered_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `,
    `${Date.now()}-${Math.random()}`,
    `${sourceMode}:${lesson.id}:${Date.now()}`,
    sourceMode,
    selectedAnswer,
    correctAnswer,
    isCorrect ? 1 : 0,
    `grammar:${getGrammarMainMenu(lesson)}`
  );
  await recordSrsReviewForQuestionAttempt(db, {
    questionId: `${sourceMode}:${lesson.id}`,
    itemId: lesson.id,
    itemType: 'grammar',
    skillId: `grammar:${getGrammarMainMenu(lesson)}`,
    sourceMode,
    isCorrect,
  });
}

function grammarLessonStatusToNumber(status: GrammarLessonStatus): number {
  if (status === 'understood') return 1;
  if (status === 'not_understood') return -1;
  return 0;
}

function numberToGrammarLessonStatus(value: number): GrammarLessonStatus {
  if (value === 1) return 'understood';
  if (value === -1) return 'not_understood';
  return 'neutral';
}

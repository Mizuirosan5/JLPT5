import type { SQLiteDatabase } from 'expo-sqlite';
import type { SrsOverview } from '../models';

export type SrsItemType = 'kana' | 'vocabulary' | 'kanji' | 'grammar' | 'skill';
export type SrsStatus = 'new' | 'fragile' | 'known' | 'solid' | 'mastered';

export type SrsItemState = {
  item_id: string;
  item_type: SrsItemType;
  status: SrsStatus;
  ease: number;
  interval_days: number;
  due_at: string;
  last_reviewed_at: string | null;
  attempts: number;
  correct: number;
  wrong_streak: number;
  correct_streak: number;
  updated_at: string;
};

export type SrsReviewInput = {
  itemId?: string;
  itemType?: SrsItemType;
  skillId: string;
  questionId: string;
  sourceMode: string;
  isCorrect: boolean;
};

export type SrsManualReviewInput = {
  itemId: string;
  itemType: SrsItemType;
};

const STATUS_ORDER: SrsStatus[] = ['new', 'fragile', 'known', 'solid', 'mastered'];

export async function recordSrsReviewForQuestionAttempt(db: SQLiteDatabase, input: SrsReviewInput): Promise<void> {
  const itemType = input.itemType ?? inferSrsItemType(input.skillId, input.sourceMode);
  const itemId = input.itemId ?? inferSrsItemId(input.skillId, input.questionId, itemType);
  if (!itemId) return;

  const existing = await db.getFirstAsync<SrsItemState>(
    `
    SELECT item_id, item_type, status, ease, interval_days, due_at, last_reviewed_at,
           attempts, correct, wrong_streak, correct_streak, updated_at
    FROM app_srs_item_state
    WHERE item_id = ? AND item_type = ?
    `,
    itemId,
    itemType
  );
  const next = buildNextSrsState(existing, input.isCorrect);
  await db.runAsync(
    `
    INSERT INTO app_srs_item_state (
      item_id, item_type, status, ease, interval_days, due_at, last_reviewed_at,
      attempts, correct, wrong_streak, correct_streak, updated_at
    ) VALUES (?, ?, ?, ?, ?, datetime('now', ?), datetime('now'), ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(item_id, item_type) DO UPDATE SET
      status = excluded.status,
      ease = excluded.ease,
      interval_days = excluded.interval_days,
      due_at = excluded.due_at,
      last_reviewed_at = excluded.last_reviewed_at,
      attempts = excluded.attempts,
      correct = excluded.correct,
      wrong_streak = excluded.wrong_streak,
      correct_streak = excluded.correct_streak,
      updated_at = excluded.updated_at
    `,
    itemId,
    itemType,
    next.status,
    next.ease,
    next.intervalDays,
    `+${next.intervalDays} days`,
    next.attempts,
    next.correct,
    next.wrongStreak,
    next.correctStreak
  );
}

export async function loadSrsOverview(db: SQLiteDatabase): Promise<SrsOverview> {
  const row = await db.getFirstAsync<{
    dueToday: number;
    fragile: number;
    known: number;
    solid: number;
    mastered: number;
    total: number;
    nextDueAt: string | null;
  }>(`
    SELECT
      SUM(CASE WHEN due_at <= datetime('now') THEN 1 ELSE 0 END) AS dueToday,
      SUM(CASE WHEN status IN ('new', 'fragile') THEN 1 ELSE 0 END) AS fragile,
      SUM(CASE WHEN status = 'known' THEN 1 ELSE 0 END) AS known,
      SUM(CASE WHEN status = 'solid' THEN 1 ELSE 0 END) AS solid,
      SUM(CASE WHEN status = 'mastered' THEN 1 ELSE 0 END) AS mastered,
      COUNT(*) AS total,
      MIN(CASE WHEN due_at > datetime('now') THEN due_at ELSE NULL END) AS nextDueAt
    FROM app_srs_item_state
  `);
  return {
    dueToday: row?.dueToday ?? 0,
    fragile: row?.fragile ?? 0,
    known: row?.known ?? 0,
    solid: row?.solid ?? 0,
    mastered: row?.mastered ?? 0,
    total: row?.total ?? 0,
    nextDueAt: row?.nextDueAt ?? null,
  };
}

export async function markSrsItemForReview(db: SQLiteDatabase, input: SrsManualReviewInput): Promise<void> {
  const existing = await db.getFirstAsync<SrsItemState>(
    `
    SELECT item_id, item_type, status, ease, interval_days, due_at, last_reviewed_at,
           attempts, correct, wrong_streak, correct_streak, updated_at
    FROM app_srs_item_state
    WHERE item_id = ? AND item_type = ?
    `,
    input.itemId,
    input.itemType
  );
  await db.runAsync(
    `
    INSERT INTO app_srs_item_state (
      item_id, item_type, status, ease, interval_days, due_at, last_reviewed_at,
      attempts, correct, wrong_streak, correct_streak, updated_at
    ) VALUES (?, ?, 'fragile', ?, 0, datetime('now'), ?, ?, ?, 1, 0, datetime('now'))
    ON CONFLICT(item_id, item_type) DO UPDATE SET
      status = 'fragile',
      interval_days = 0,
      due_at = datetime('now'),
      wrong_streak = MAX(wrong_streak, 1),
      updated_at = datetime('now')
    `,
    input.itemId,
    input.itemType,
    existing?.ease ?? 2.5,
    existing?.last_reviewed_at ?? null,
    existing?.attempts ?? 0,
    existing?.correct ?? 0
  );
}

function buildNextSrsState(existing: SrsItemState | null, isCorrect: boolean) {
  const currentStatus = existing?.status ?? 'new';
  const currentEase = existing?.ease ?? 2.5;
  const currentInterval = existing?.interval_days ?? 0;
  const attempts = (existing?.attempts ?? 0) + 1;
  const correct = (existing?.correct ?? 0) + (isCorrect ? 1 : 0);
  const correctStreak = isCorrect ? (existing?.correct_streak ?? 0) + 1 : 0;
  const wrongStreak = isCorrect ? 0 : (existing?.wrong_streak ?? 0) + 1;
  const ease = Math.max(1.3, Math.min(3.2, currentEase + (isCorrect ? 0.08 : -0.22)));
  const status = isCorrect ? promoteStatus(currentStatus, correctStreak) : demoteStatus(currentStatus, wrongStreak);
  const intervalDays = isCorrect ? getNextIntervalDays(status, currentInterval, ease) : wrongStreak >= 2 ? 0 : 1;
  return { status, ease, intervalDays, attempts, correct, correctStreak, wrongStreak };
}

function promoteStatus(status: SrsStatus, correctStreak: number): SrsStatus {
  const index = STATUS_ORDER.indexOf(status);
  const step = correctStreak >= 2 ? 1 : 0;
  return STATUS_ORDER[Math.min(STATUS_ORDER.length - 1, Math.max(2, index + step))];
}

function demoteStatus(status: SrsStatus, wrongStreak: number): SrsStatus {
  if (wrongStreak >= 2) return 'fragile';
  if (status === 'mastered' || status === 'solid') return 'known';
  return 'fragile';
}

function getNextIntervalDays(status: SrsStatus, currentInterval: number, ease: number): number {
  if (status === 'known') return Math.max(1, currentInterval || 1);
  if (status === 'solid') return Math.max(3, Math.round(Math.max(2, currentInterval) * ease));
  if (status === 'mastered') return Math.min(45, Math.max(7, Math.round(Math.max(4, currentInterval) * ease)));
  return 1;
}

function inferSrsItemType(skillId: string, sourceMode: string): SrsItemType {
  const value = `${skillId}:${sourceMode}`.toLowerCase();
  if (value.includes('kana') || value.includes('hiragana') || value.includes('katakana')) return 'kana';
  if (value.includes('vocab')) return 'vocabulary';
  if (value.includes('kanji')) return 'kanji';
  if (value.includes('grammar') || value.includes('particle')) return 'grammar';
  return 'skill';
}

function inferSrsItemId(skillId: string, questionId: string, itemType: SrsItemType): string {
  if (itemType === 'skill') return skillId || questionId;
  return skillId || questionId;
}

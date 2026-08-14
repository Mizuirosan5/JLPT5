import type { SQLiteDatabase } from 'expo-sqlite';
import { IMMERSION_TEXTS, type ImmersionText } from '../data/immersionTexts';

export type ImmersionProgress = {
  content_id: string;
  opened_count: number;
  completed: number;
  correct_count: number;
  total_count: number;
  updated_at: string;
};

export function loadImmersionTexts(): ImmersionText[] {
  return IMMERSION_TEXTS;
}

export async function loadImmersionProgress(db: SQLiteDatabase): Promise<Record<string, ImmersionProgress>> {
  const rows = await db.getAllAsync<ImmersionProgress>(`
    SELECT content_id, opened_count, completed, correct_count, total_count, updated_at
    FROM app_content_progress
    WHERE content_type = 'immersion'
  `);
  return rows.reduce<Record<string, ImmersionProgress>>((acc, row) => {
    acc[row.content_id] = row;
    return acc;
  }, {});
}

export async function recordImmersionOpened(db: SQLiteDatabase, contentId: string) {
  await db.runAsync(
    `
    INSERT INTO app_content_progress (
      content_id, content_type, opened_count, completed, correct_count, total_count, updated_at
    ) VALUES (?, 'immersion', 1, 0, 0, 0, datetime('now'))
    ON CONFLICT(content_id, content_type) DO UPDATE SET
      opened_count = opened_count + 1,
      updated_at = datetime('now')
    `,
    contentId
  );
}

export async function recordImmersionResult(
  db: SQLiteDatabase,
  contentId: string,
  correctCount: number,
  totalCount: number,
) {
  await db.runAsync(
    `
    INSERT INTO app_content_progress (
      content_id, content_type, opened_count, completed, correct_count, total_count, updated_at
    ) VALUES (?, 'immersion', 1, ?, ?, ?, datetime('now'))
    ON CONFLICT(content_id, content_type) DO UPDATE SET
      completed = excluded.completed,
      correct_count = excluded.correct_count,
      total_count = excluded.total_count,
      updated_at = datetime('now')
    `,
    contentId,
    correctCount >= totalCount ? 1 : 0,
    correctCount,
    totalCount
  );
}

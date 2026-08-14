import type { SQLiteDatabase } from 'expo-sqlite';
import { STORY_LESSONS, type StoryLesson } from '../data/storyLessons';
import type { ImmersionProgress } from './immersion';

export function loadStoryLessons(): StoryLesson[] {
  return STORY_LESSONS;
}

export async function loadStoryProgress(db: SQLiteDatabase): Promise<Record<string, ImmersionProgress>> {
  const rows = await db.getAllAsync<ImmersionProgress>(`
    SELECT content_id, opened_count, completed, correct_count, total_count, updated_at
    FROM app_content_progress
    WHERE content_type = 'story'
  `);
  return rows.reduce<Record<string, ImmersionProgress>>((acc, row) => {
    acc[row.content_id] = row;
    return acc;
  }, {});
}

export async function recordStoryOpened(db: SQLiteDatabase, contentId: string) {
  await db.runAsync(
    `
    INSERT INTO app_content_progress (
      content_id, content_type, opened_count, completed, correct_count, total_count, updated_at
    ) VALUES (?, 'story', 1, 0, 0, 0, datetime('now'))
    ON CONFLICT(content_id, content_type) DO UPDATE SET
      opened_count = opened_count + 1,
      updated_at = datetime('now')
    `,
    contentId
  );
}

export async function recordStoryResult(db: SQLiteDatabase, contentId: string, correctCount: number, totalCount: number) {
  await db.runAsync(
    `
    INSERT INTO app_content_progress (
      content_id, content_type, opened_count, completed, correct_count, total_count, updated_at
    ) VALUES (?, 'story', 1, ?, ?, ?, datetime('now'))
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

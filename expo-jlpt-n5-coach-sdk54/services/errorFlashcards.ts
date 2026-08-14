import type { SQLiteDatabase } from 'expo-sqlite';
import type { SrsItemType } from './srs';
import { markSrsItemForReview } from './srs';

export type ErrorFlashcard = {
  id: string;
  source_question_id: string;
  source_mode: string;
  item_type: SrsItemType;
  prompt: string;
  japanese: string | null;
  translation: string | null;
  expected_answer: string;
  selected_answer: string | null;
  explanation: string | null;
  archived: number;
  created_at: string;
  updated_at: string;
};

export type SaveErrorFlashcardInput = {
  sourceQuestionId: string;
  sourceMode: string;
  itemType?: SrsItemType;
  prompt: string;
  japanese?: string | null;
  translation?: string | null;
  expectedAnswer: string;
  selectedAnswer?: string | null;
  explanation?: string | null;
};

export async function saveErrorFlashcard(db: SQLiteDatabase, input: SaveErrorFlashcardInput): Promise<string> {
  const itemType = input.itemType ?? inferErrorFlashcardType(input);
  const id = `${input.sourceMode}-${input.sourceQuestionId}-${stableIdPart(input.expectedAnswer)}`;
  await db.runAsync(
    `
    INSERT INTO app_error_flashcard (
      id, source_question_id, source_mode, item_type, prompt, japanese,
      translation, expected_answer, selected_answer, explanation, archived,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))
    ON CONFLICT(source_question_id, expected_answer) DO UPDATE SET
      source_mode = excluded.source_mode,
      item_type = excluded.item_type,
      prompt = excluded.prompt,
      japanese = excluded.japanese,
      translation = excluded.translation,
      selected_answer = excluded.selected_answer,
      explanation = excluded.explanation,
      archived = 0,
      updated_at = datetime('now')
    `,
    id,
    input.sourceQuestionId,
    input.sourceMode,
    itemType,
    input.prompt,
    input.japanese ?? null,
    input.translation ?? null,
    input.expectedAnswer,
    input.selectedAnswer ?? null,
    input.explanation ?? null
  );
  await markSrsItemForReview(db, { itemId: id, itemType });
  return id;
}

export async function loadErrorFlashcards(db: SQLiteDatabase, includeArchived = false): Promise<ErrorFlashcard[]> {
  return db.getAllAsync<ErrorFlashcard>(
    `
    SELECT id, source_question_id, source_mode, item_type, prompt, japanese,
           translation, expected_answer, selected_answer, explanation, archived,
           created_at, updated_at
    FROM app_error_flashcard
    WHERE archived = ? OR ? = 1
    ORDER BY updated_at DESC
    `,
    0,
    includeArchived ? 1 : 0
  );
}

export async function archiveErrorFlashcard(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(
    `
    UPDATE app_error_flashcard
    SET archived = 1, updated_at = datetime('now')
    WHERE id = ?
    `,
    id
  );
}

export async function restoreErrorFlashcard(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(
    `
    UPDATE app_error_flashcard
    SET archived = 0, updated_at = datetime('now')
    WHERE id = ?
    `,
    id
  );
}

function inferErrorFlashcardType(input: SaveErrorFlashcardInput): SrsItemType {
  const value = `${input.sourceMode} ${input.prompt} ${input.japanese ?? ''} ${input.expectedAnswer}`.toLowerCase();
  if (value.includes('kana') || value.includes('hiragana') || value.includes('katakana')) return 'kana';
  if (value.includes('kanji')) return 'kanji';
  if (value.includes('grammar') || value.includes('grammaire') || value.includes('particule')) return 'grammar';
  if (/[\u4E00-\u9FFF]/.test(input.expectedAnswer)) return 'vocabulary';
  return 'skill';
}

function stableIdPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9fff]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'answer';
}

import type { SQLiteDatabase } from 'expo-sqlite';
import { recordSrsReviewForQuestionAttempt, type SrsItemType } from './srs';

export async function recordPracticeAttempt(
  db: SQLiteDatabase,
  input: { tool: string; itemId: string; selected: string; expected: string; isCorrect: boolean }
): Promise<void> {
  await db.runAsync(
    `
    INSERT INTO app_question_attempt_local (
      id, question_id, source_mode, selected_answer, correct_answer,
      is_correct, skill_id, answered_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `,
    `${Date.now()}-${Math.random()}`,
    `practice:${input.tool}:${input.itemId}`,
    `practice_${input.tool}`,
    input.selected,
    input.expected,
    input.isCorrect ? 1 : 0,
    `practice:${input.tool}`
  );
  const itemType = getPracticeSrsItemType(input.tool);
  await recordSrsReviewForQuestionAttempt(db, {
    itemId: input.itemId,
    itemType,
    skillId: `practice:${input.tool}`,
    questionId: `practice:${input.tool}:${input.itemId}`,
    sourceMode: `practice_${input.tool}`,
    isCorrect: input.isCorrect,
  });
}

function getPracticeSrsItemType(tool: string): SrsItemType {
  if (tool === 'conjugation') return 'conjugation';
  if (tool === 'kana_sprint') return 'kana';
  if (tool === 'sentences') return 'grammar';
  if (tool === 'phrase_kit') return 'vocabulary';
  return 'skill';
}

export function toJapaneseNumber(value: number): string {
  if (!Number.isInteger(value) || value < 0 || value > 9999) throw new Error('Number practice supports integers from 0 to 9999.');
  if (value === 0) return 'れい';
  const digits = ['', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう'];
  let remaining = value;
  let result = '';
  const thousands = Math.floor(remaining / 1000);
  if (thousands > 0) result += thousands === 1 ? 'せん' : thousands === 3 ? 'さんぜん' : thousands === 8 ? 'はっせん' : `${digits[thousands]}せん`;
  remaining %= 1000;
  const hundreds = Math.floor(remaining / 100);
  if (hundreds > 0) result += hundreds === 1 ? 'ひゃく' : hundreds === 3 ? 'さんびゃく' : hundreds === 6 ? 'ろっぴゃく' : hundreds === 8 ? 'はっぴゃく' : `${digits[hundreds]}ひゃく`;
  remaining %= 100;
  const tens = Math.floor(remaining / 10);
  if (tens > 0) result += `${tens === 1 ? '' : digits[tens]}じゅう`;
  remaining %= 10;
  if (remaining > 0) result += digits[remaining];
  return result;
}

export type JapaneseQuantityKind = 'number' | 'price' | 'hour' | 'people' | 'generic';

export function toJapaneseQuantity(value: number, kind: JapaneseQuantityKind): string {
  if (kind === 'number') return toJapaneseNumber(value);
  if (kind === 'price') return `${toJapaneseNumber(value)}えん`;
  if (kind === 'hour') {
    const irregular: Record<number, string> = { 4: 'よじ', 7: 'しちじ', 9: 'くじ' };
    return irregular[value] ?? `${toJapaneseNumber(value)}じ`;
  }
  if (kind === 'people') {
    if (value === 1) return 'ひとり';
    if (value === 2) return 'ふたり';
    if (value === 4) return 'よにん';
    return `${toJapaneseNumber(value)}にん`;
  }
  const generic: Record<number, string> = {
    1: 'ひとつ', 2: 'ふたつ', 3: 'みっつ', 4: 'よっつ', 5: 'いつつ',
    6: 'むっつ', 7: 'ななつ', 8: 'やっつ', 9: 'ここのつ', 10: 'とお',
  };
  return generic[value] ?? `${toJapaneseNumber(value)}つ`;
}

import type { SQLiteDatabase } from 'expo-sqlite';
import type { SrsItemType, SrsStatus } from './srs';
import { recordSrsReviewForQuestionAttempt } from './srs';
import { shuffle } from './random';
import { getWritingSystem, keepChoicesInWritingSystem } from './text';

export type SrsQueueSection = 'urgent' | 'today' | 'soon';

export type SrsQueueItem = {
  itemId: string;
  itemType: SrsItemType;
  status: SrsStatus;
  dueAt: string;
  attempts: number;
  correct: number;
  wrongStreak: number;
  correctStreak: number;
  riskScore: number;
  reviewReason: string;
  section: SrsQueueSection;
  questionId: string;
  skillId: string;
  promptFr: string;
  promptJa: string | null;
  correctAnswer: string;
  explanationFr: string;
  choices: string[];
};

type SrsQueueRow = {
  item_id: string;
  item_type: SrsItemType;
  status: SrsStatus;
  due_at: string;
  last_reviewed_at: string | null;
  ease: number;
  attempts: number;
  correct: number;
  wrong_streak: number;
  correct_streak: number;
  question_id: string | null;
  skill_id: string | null;
  prompt_fr: string | null;
  prompt_ja: string | null;
  correct_answer: string | null;
  explanation_fr: string | null;
};

export async function loadDueSrsItems(db: SQLiteDatabase, limit = 30): Promise<SrsQueueItem[]> {
  await ensureSrsQueueTables(db);

  const rows = await db.getAllAsync<SrsQueueRow>(
    `
    SELECT
      s.item_id,
      s.item_type,
      s.status,
      s.due_at,
      s.last_reviewed_at,
      s.ease,
      s.attempts,
      s.correct,
      s.wrong_streak,
      s.correct_streak,
      q.question_id,
      q.skill_id,
      q.prompt_fr,
      q.prompt_ja,
      q.correct_answer,
      q.explanation_fr
    FROM app_srs_item_state s
    LEFT JOIN app_question_bank q ON q.question_id = s.item_id OR q.skill_id = s.item_id
    WHERE s.due_at <= datetime('now', '+3 days')
    ORDER BY
      CASE WHEN s.due_at <= datetime('now') THEN 0 ELSE 1 END,
      CASE s.status
        WHEN 'fragile' THEN 0
        WHEN 'new' THEN 1
        WHEN 'known' THEN 2
        WHEN 'solid' THEN 3
        ELSE 4
      END,
      s.due_at ASC
    LIMIT ?
    `,
    limit
  );

  const items: SrsQueueItem[] = [];
  for (const row of rows) {
    if (!row.question_id || !row.skill_id || !row.prompt_fr || !row.correct_answer) continue;
    items.push({
      itemId: row.item_id,
      itemType: row.item_type,
      status: row.status,
      dueAt: row.due_at,
      attempts: row.attempts,
      correct: row.correct,
      wrongStreak: row.wrong_streak,
      correctStreak: row.correct_streak,
      riskScore: calculateSrsRiskScore(row),
      reviewReason: getSrsReviewReason(row),
      section: getSrsQueueSection(row),
      questionId: row.question_id,
      skillId: row.skill_id,
      promptFr: row.prompt_fr,
      promptJa: row.prompt_ja,
      correctAnswer: row.correct_answer,
      explanationFr: row.explanation_fr ?? 'Revois cette notion : elle revient dans ta file de memoire.',
      choices: await buildReviewChoices(db, row.question_id, row.skill_id, row.correct_answer),
    });
  }
  const errorRows = await db.getAllAsync<
    SrsQueueRow & {
      prompt: string;
      japanese: string | null;
      translation: string | null;
      expected_answer: string;
      selected_answer: string | null;
      explanation: string | null;
    }
  >(
    `
    SELECT
      s.item_id,
      s.item_type,
      s.status,
      s.due_at,
      s.last_reviewed_at,
      s.ease,
      s.attempts,
      s.correct,
      s.wrong_streak,
      s.correct_streak,
      e.id AS question_id,
      e.item_type AS skill_id,
      e.prompt AS prompt_fr,
      e.japanese AS prompt_ja,
      e.expected_answer AS correct_answer,
      e.explanation AS explanation_fr,
      e.prompt,
      e.japanese,
      e.translation,
      e.expected_answer,
      e.selected_answer,
      e.explanation
    FROM app_srs_item_state s
    JOIN app_error_flashcard e ON e.id = s.item_id
    WHERE e.archived = 0
      AND s.due_at <= datetime('now', '+3 days')
    ORDER BY
      CASE WHEN s.due_at <= datetime('now') THEN 0 ELSE 1 END,
      s.due_at ASC
    LIMIT ?
    `,
    limit
  );

  for (const row of errorRows) {
    if (!row.question_id || !row.skill_id || !row.prompt_fr || !row.correct_answer) continue;
    items.push({
      itemId: row.item_id,
      itemType: row.item_type,
      status: row.status,
      dueAt: row.due_at,
      attempts: row.attempts,
      correct: row.correct,
      wrongStreak: row.wrong_streak,
      correctStreak: row.correct_streak,
      riskScore: calculateSrsRiskScore(row),
      reviewReason: getSrsReviewReason(row),
      section: getSrsQueueSection(row),
      questionId: row.question_id,
      skillId: row.skill_id,
      promptFr: row.prompt_fr,
      promptJa: row.prompt_ja,
      correctAnswer: row.correct_answer,
      explanationFr: row.explanation_fr ?? 'Cette carte vient d une erreur enregistree.',
      choices: buildErrorFlashcardChoices(row.correct_answer, row.selected_answer),
    });
  }

  return items
    .sort((a, b) => getSectionRank(a.section) - getSectionRank(b.section) || b.riskScore - a.riskScore || a.dueAt.localeCompare(b.dueAt))
    .slice(0, limit);
}

export async function buildSrsReviewSession(db: SQLiteDatabase, limit = 10): Promise<SrsQueueItem[]> {
  return loadDueSrsItems(db, limit);
}

export async function recordSrsReview(
  db: SQLiteDatabase,
  item: SrsQueueItem,
  selectedAnswer: string,
  isCorrect: boolean
): Promise<void> {
  await db.runAsync(
    `
    INSERT INTO app_question_attempt_local (
      id, question_id, source_mode, selected_answer, correct_answer,
      is_correct, skill_id, answered_at
    ) VALUES (?, ?, 'srs_review', ?, ?, ?, ?, datetime('now'))
    `,
    `${Date.now()}-${Math.random()}`,
    item.questionId,
    selectedAnswer,
    item.correctAnswer,
    isCorrect ? 1 : 0,
    item.skillId
  );
  await recordSrsReviewForQuestionAttempt(db, {
    itemId: item.itemId,
    itemType: item.itemType,
    questionId: item.questionId,
    skillId: item.skillId,
    sourceMode: 'srs_review',
    isCorrect,
  });
}

export async function markSrsQueueItemKnown(db: SQLiteDatabase, item: SrsQueueItem): Promise<void> {
  const nextInterval = Math.max(7, Math.min(45, item.status === 'mastered' ? item.attempts + 14 : item.attempts + 7));
  await db.runAsync(
    `
    UPDATE app_srs_item_state
    SET
      status = CASE WHEN status IN ('solid', 'mastered') THEN 'mastered' ELSE 'solid' END,
      ease = MIN(3.2, ease + 0.12),
      interval_days = ?,
      due_at = datetime('now', ?),
      last_reviewed_at = datetime('now'),
      attempts = attempts + 1,
      correct = correct + 1,
      wrong_streak = 0,
      correct_streak = correct_streak + 1,
      updated_at = datetime('now')
    WHERE item_id = ? AND item_type = ?
    `,
    nextInterval,
    `+${nextInterval} days`,
    item.itemId,
    item.itemType
  );
}

export async function postponeSrsQueueItem(db: SQLiteDatabase, item: SrsQueueItem, days = 1): Promise<void> {
  const interval = Math.max(1, Math.min(3, days));
  await db.runAsync(
    `
    UPDATE app_srs_item_state
    SET
      due_at = datetime('now', ?),
      updated_at = datetime('now')
    WHERE item_id = ? AND item_type = ?
    `,
    `+${interval} days`,
    item.itemId,
    item.itemType
  );
}

function getSrsQueueSection(row: SrsQueueRow): SrsQueueSection {
  const dueTime = parseSrsDate(row.due_at).getTime();
  const now = Date.now();
  if (dueTime <= now && (row.status === 'fragile' || row.status === 'new' || row.wrong_streak > 0)) return 'urgent';
  if (dueTime <= now) return 'today';
  return 'soon';
}

function calculateSrsRiskScore(row: SrsQueueRow): number {
  const dueTime = parseSrsDate(row.due_at).getTime();
  const now = Date.now();
  const overdueDays = Math.max(0, Math.floor((now - dueTime) / 86_400_000));
  const statusWeight: Record<SrsStatus, number> = {
    new: 22,
    fragile: 34,
    known: 16,
    solid: 7,
    mastered: 2,
  };
  const accuracy = row.attempts > 0 ? row.correct / row.attempts : 0;
  const accuracyPenalty = Math.round((1 - accuracy) * 20);
  const easePenalty = Math.max(0, Math.round((2.5 - row.ease) * 12));
  return Math.max(
    0,
    statusWeight[row.status] +
      overdueDays * 18 +
      row.wrong_streak * 28 +
      accuracyPenalty +
      easePenalty -
      row.correct_streak * 7
  );
}

function getSrsReviewReason(row: SrsQueueRow): string {
  if (row.wrong_streak >= 2) return 'Revient car plusieurs erreurs se suivent.';
  if (row.wrong_streak === 1) return 'Revient car une erreur recente a fragilise cette notion.';
  if (row.attempts === 0 || row.status === 'new') return 'Revient car cette notion n a jamais ete consolidee.';
  if (row.status === 'fragile') return 'Revient car la memoire est encore fragile.';
  if (getSrsQueueSection(row) === 'soon') return 'Revient bientot pour eviter l oubli.';
  return 'Revient aujourd hui selon son intervalle de revision.';
}

function parseSrsDate(value: string): Date {
  return new Date(`${value.replace(' ', 'T')}Z`);
}

async function buildReviewChoices(
  db: SQLiteDatabase,
  questionId: string,
  skillId: string,
  correctAnswer: string
): Promise<string[]> {
  const distractors = await db.getAllAsync<{ choice_text: string }>(
    `
    SELECT choice_text
    FROM app_generated_choice
    WHERE question_id = ?
      AND is_correct = 0
    ORDER BY sort_order
    LIMIT 12
    `,
    questionId
  );
  const fallback =
    distractors.length >= 3
      ? []
      : await db.getAllAsync<{ choice_text: string }>(
          `
          SELECT correct_answer AS choice_text
          FROM app_question_bank
          WHERE skill_id = ?
            AND question_id != ?
            AND correct_answer IS NOT NULL
            AND correct_answer != ''
          ORDER BY question_id
          LIMIT 12
          `,
          skillId,
          questionId
        );
  return shuffle(keepChoicesInWritingSystem(correctAnswer, [correctAnswer, ...distractors.map((choice) => choice.choice_text), ...fallback.map((choice) => choice.choice_text)]))
    .filter((choice, index, all) => all.indexOf(choice) === index)
    .slice(0, 4);
}

function buildErrorFlashcardChoices(correctAnswer: string, selectedAnswer: string | null): string[] {
  const neutralChoices = getWritingSystem(correctAnswer) === 'japanese'
    ? ['わかりません', 'もう一度']
    : ['Je ne sais pas', 'À revoir demain'];
  const base = [correctAnswer, selectedAnswer, ...neutralChoices].filter(
    (choice): choice is string => Boolean(choice?.trim())
  );
  return shuffle(keepChoicesInWritingSystem(correctAnswer, base.filter((choice, index, all) => all.indexOf(choice) === index))).slice(0, 4);
}

function getSectionRank(section: SrsQueueSection): number {
  if (section === 'urgent') return 0;
  if (section === 'today') return 1;
  return 2;
}

async function ensureSrsQueueTables(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS app_srs_item_state (
      item_id TEXT NOT NULL,
      item_type TEXT NOT NULL,
      status TEXT NOT NULL,
      ease REAL NOT NULL DEFAULT 2.5,
      interval_days INTEGER NOT NULL DEFAULT 0,
      due_at TEXT NOT NULL,
      last_reviewed_at TEXT,
      attempts INTEGER NOT NULL DEFAULT 0,
      correct INTEGER NOT NULL DEFAULT 0,
      wrong_streak INTEGER NOT NULL DEFAULT 0,
      correct_streak INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (item_id, item_type)
    );

    CREATE TABLE IF NOT EXISTS app_error_flashcard (
      id TEXT PRIMARY KEY,
      source_question_id TEXT NOT NULL,
      source_mode TEXT NOT NULL,
      item_type TEXT NOT NULL,
      prompt TEXT NOT NULL,
      japanese TEXT,
      translation TEXT,
      expected_answer TEXT NOT NULL,
      selected_answer TEXT,
      explanation TEXT,
      archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(source_question_id, expected_answer)
    );
  `);

  await ensureColumn(db, 'app_srs_item_state', 'item_id', "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, 'app_srs_item_state', 'item_type', "TEXT NOT NULL DEFAULT 'vocabulary'");
  await ensureColumn(db, 'app_srs_item_state', 'status', "TEXT NOT NULL DEFAULT 'new'");
  await ensureColumn(db, 'app_srs_item_state', 'ease', 'REAL NOT NULL DEFAULT 2.5');
  await ensureColumn(db, 'app_srs_item_state', 'interval_days', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn(db, 'app_srs_item_state', 'due_at', "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, 'app_srs_item_state', 'last_reviewed_at', 'TEXT');
  await ensureColumn(db, 'app_srs_item_state', 'attempts', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn(db, 'app_srs_item_state', 'correct', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn(db, 'app_srs_item_state', 'wrong_streak', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn(db, 'app_srs_item_state', 'correct_streak', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn(db, 'app_srs_item_state', 'updated_at', "TEXT NOT NULL DEFAULT ''");

  await ensureColumn(db, 'app_error_flashcard', 'source_question_id', "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, 'app_error_flashcard', 'source_mode', "TEXT NOT NULL DEFAULT 'unknown'");
  await ensureColumn(db, 'app_error_flashcard', 'item_type', "TEXT NOT NULL DEFAULT 'vocabulary'");
  await ensureColumn(db, 'app_error_flashcard', 'prompt', "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, 'app_error_flashcard', 'japanese', 'TEXT');
  await ensureColumn(db, 'app_error_flashcard', 'translation', 'TEXT');
  await ensureColumn(db, 'app_error_flashcard', 'expected_answer', "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, 'app_error_flashcard', 'selected_answer', 'TEXT');
  await ensureColumn(db, 'app_error_flashcard', 'explanation', 'TEXT');
  await ensureColumn(db, 'app_error_flashcard', 'archived', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn(db, 'app_error_flashcard', 'created_at', "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, 'app_error_flashcard', 'updated_at', "TEXT NOT NULL DEFAULT ''");
}

async function ensureColumn(db: SQLiteDatabase, tableName: string, columnName: string, definition: string): Promise<void> {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${tableName})`);
  if (columns.some((column) => column.name === columnName)) return;
  await db.execAsync(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
}

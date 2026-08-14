import type { SQLiteDatabase } from 'expo-sqlite';
import type { SrsItemType, SrsStatus } from './srs';
import { recordSrsReviewForQuestionAttempt } from './srs';

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
  const rows = await db.getAllAsync<SrsQueueRow>(
    `
    SELECT
      s.item_id,
      s.item_type,
      s.status,
      s.due_at,
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
    LEFT JOIN app_question_bank q ON q.question_id = (
      SELECT qb.question_id
      FROM app_question_bank qb
      WHERE qb.question_id = s.item_id OR qb.skill_id = s.item_id
      ORDER BY CASE WHEN qb.question_id = s.item_id THEN 0 ELSE 1 END, RANDOM()
      LIMIT 1
    )
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
    .sort((a, b) => getSectionRank(a.section) - getSectionRank(b.section) || a.dueAt.localeCompare(b.dueAt))
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

function getSrsQueueSection(row: SrsQueueRow): SrsQueueSection {
  const dueTime = new Date(`${row.due_at.replace(' ', 'T')}Z`).getTime();
  const now = Date.now();
  if (dueTime <= now && (row.status === 'fragile' || row.status === 'new' || row.wrong_streak > 0)) return 'urgent';
  if (dueTime <= now) return 'today';
  return 'soon';
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
    ORDER BY RANDOM()
    LIMIT 3
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
          ORDER BY RANDOM()
          LIMIT ?
          `,
          skillId,
          questionId,
          3 - distractors.length
        );
  return shuffle([correctAnswer, ...distractors.map((choice) => choice.choice_text), ...fallback.map((choice) => choice.choice_text)])
    .filter((choice, index, all) => all.indexOf(choice) === index)
    .slice(0, 4);
}

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function buildErrorFlashcardChoices(correctAnswer: string, selectedAnswer: string | null): string[] {
  const base = [correctAnswer, selectedAnswer, 'Je ne sais pas', 'A revoir demain'].filter(
    (choice): choice is string => Boolean(choice?.trim())
  );
  return shuffle(base.filter((choice, index, all) => all.indexOf(choice) === index)).slice(0, 4);
}

function getSectionRank(section: SrsQueueSection): number {
  if (section === 'urgent') return 0;
  if (section === 'today') return 1;
  return 2;
}

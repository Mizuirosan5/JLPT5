import type { SQLiteDatabase } from 'expo-sqlite';
import type { LearningPreferences, QuizChoice, QuizQuestion } from '../models';
import { shuffle } from './random';

export type QuickSessionQuestion = {
  question: QuizQuestion;
  choices: string[];
};

export type QuickSessionResult = {
  correct: number;
  total: number;
  xp: number;
};

function getQuickQuestionLimit(preferences: LearningPreferences): number {
  if (preferences.preferredSessionLength === 20) return 14;
  if (preferences.preferredSessionLength === 10) return 10;
  return 8;
}

function getDifficultyClause(preferences: LearningPreferences): string {
  if (preferences.quizDifficulty === 'soft') {
    return `
      ORDER BY
        CASE WHEN a.local_attempts IS NULL THEN 35 ELSE 0 END DESC,
        p.final_priority DESC,
        random()
    `;
  }
  if (preferences.quizDifficulty === 'hard') {
    return `
      ORDER BY
        CASE
          WHEN a.local_attempts IS NOT NULL AND (a.local_correct * 1.0 / a.local_attempts) < 0.75 THEN 55
          WHEN q.prompt_ja IS NOT NULL AND q.prompt_ja != '' THEN 25
          ELSE 0
        END DESC,
        p.final_priority DESC,
        random()
    `;
  }
  return `
    ORDER BY
      CASE
        WHEN a.local_attempts IS NULL THEN 30
        WHEN a.local_correct = 0 THEN 45
        WHEN (a.local_correct * 1.0 / a.local_attempts) < 0.75 THEN 35
        ELSE 0
      END DESC,
      p.final_priority DESC,
      random()
  `;
}

async function loadChoicesForQuestion(db: SQLiteDatabase, question: QuizQuestion): Promise<string[]> {
  const generatedChoices = await db.getAllAsync<QuizChoice>(
    `
    SELECT id, choice_text, is_correct
    FROM app_generated_choice
    WHERE question_id = ?
    ORDER BY sort_order
    `,
    question.question_id
  );
  if (generatedChoices.length > 0) {
    return generatedChoices.map((choice) => choice.choice_text);
  }

  const distractors = await db.getAllAsync<{ choice_text: string }>(
    `
    SELECT correct_answer AS choice_text
    FROM app_question_bank
    WHERE question_id != ?
      AND skill_id = ?
      AND correct_answer IS NOT NULL
      AND correct_answer != ''
    ORDER BY random()
    LIMIT 3
    `,
    question.question_id,
    question.skill_id
  );
  return shuffle([question.correct_answer, ...distractors.map((choice) => choice.choice_text)]).slice(0, 4);
}

export async function buildQuickSessionQuestions(
  db: SQLiteDatabase,
  preferences: LearningPreferences
): Promise<QuickSessionQuestion[]> {
  const limit = getQuickQuestionLimit(preferences);
  const rows = await db.getAllAsync<QuizQuestion>(
    `
    SELECT q.question_id, q.question_origin, q.skill_id, q.question_type,
           q.prompt_fr, q.prompt_ja, q.correct_answer, q.explanation_fr
    FROM app_question_bank q
    JOIN app_adaptive_question_priority p ON p.question_id = q.question_id
    LEFT JOIN (
      SELECT question_id,
             COUNT(*) AS local_attempts,
             SUM(is_correct) AS local_correct,
             MAX(answered_at) AS last_answered_at
      FROM app_question_attempt_local
      GROUP BY question_id
    ) a ON a.question_id = q.question_id
    ${getDifficultyClause(preferences)}
    LIMIT ?
    `,
    limit
  );

  const withChoices = await Promise.all(
    rows.map(async (question) => ({
      question,
      choices: await loadChoicesForQuestion(db, question),
    }))
  );

  return withChoices.filter((item) => item.choices.length >= 2);
}

export function calculateQuickSessionResult(correct: number, total: number): QuickSessionResult {
  const completionBonus = total > 0 ? 50 : 0;
  const accuracyBonus = total > 0 && correct === total ? 90 : correct >= Math.ceil(total * 0.75) ? 45 : 0;
  return {
    correct,
    total,
    xp: completionBonus + correct * 18 + accuracyBonus,
  };
}

export async function claimQuickSessionReward(db: SQLiteDatabase, result: QuickSessionResult): Promise<void> {
  if (result.total <= 0 || result.xp <= 0) return;
  const day = new Date().toISOString().slice(0, 10);
  await db.runAsync(
    `
    INSERT INTO app_daily_reward_claim (
      day, goal_id, reward_xp, badge_code, claimed_at
    ) VALUES (?, ?, ?, 'QUICK', datetime('now'))
    `,
    day,
    `quick-session-${Date.now()}`,
    result.xp
  );
}

import type { SQLiteDatabase } from 'expo-sqlite';
import type { LearningPreferences, QuizChoice, QuizQuestion } from '../models';
import { shuffle } from './random';

export type QuickSessionQuestion = {
  question: QuizQuestion;
  choices: string[];
  helper?: string;
  stage: QuickLearnerStage;
};

export type QuickLearnerStage = 'discovery' | 'hiragana' | 'kana' | 'consolidation';

export type QuickLearnerProfile = {
  totalAttempts: number;
  kanaSeen: number;
  kanaMastered: number;
};

export type QuickSessionResult = {
  correct: number;
  total: number;
  xp: number;
};

export function getQuickQuestionLimit(preferences: LearningPreferences): number {
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
        q.question_id
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
        q.question_id
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
      q.question_id
  `;
}

export function uniqueChoices(choices: string[]): string[] {
  const seen = new Set<string>();
  return choices.filter((choice) => {
    const normalized = choice.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

export function getQuickLearnerStage(profile: QuickLearnerProfile): QuickLearnerStage {
  if (profile.totalAttempts < 5 && profile.kanaSeen === 0 && profile.kanaMastered === 0) return 'discovery';
  if (profile.totalAttempts < 40 && profile.kanaMastered < 10) return 'hiragana';
  if (profile.totalAttempts < 100 && profile.kanaMastered < 30) return 'kana';
  return 'consolidation';
}

export function keepHomogeneousChoices(correctAnswer: string, choices: string[]): string[] {
  const expectedFamily = getAnswerFamily(correctAnswer);
  return uniqueChoices(choices).filter((choice) => getAnswerFamily(choice) === expectedFamily);
}

function getAnswerFamily(value: string): 'japanese' | 'latin' | 'numeric' {
  if (/[\u3040-\u30ff\u3400-\u9fff]/u.test(value)) return 'japanese';
  if (/^[\d\s.,%+-]+$/u.test(value.trim())) return 'numeric';
  return 'latin';
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
    const homogeneous = keepHomogeneousChoices(question.correct_answer, generatedChoices.map((choice) => choice.choice_text));
    if (homogeneous.includes(question.correct_answer) && homogeneous.length >= 2) return homogeneous.slice(0, 4);
  }

  const distractors = await db.getAllAsync<{ choice_text: string }>(
    `
    SELECT correct_answer AS choice_text
    FROM app_question_bank
    WHERE question_id != ?
      AND skill_id = ?
      AND question_type = ?
      AND correct_answer IS NOT NULL
      AND correct_answer != ''
    ORDER BY question_id
    LIMIT 12
    `,
    question.question_id,
    question.skill_id,
    question.question_type
  );
  return shuffle(keepHomogeneousChoices(question.correct_answer, [question.correct_answer, ...distractors.map((choice) => choice.choice_text)])).slice(0, 4);
}

export async function buildQuickSessionQuestions(
  db: SQLiteDatabase,
  preferences: LearningPreferences
): Promise<QuickSessionQuestion[]> {
  const profileRow = await db.getFirstAsync<{ totalAttempts: number; kanaSeen: number; kanaMastered: number }>(`
    SELECT
      (SELECT COUNT(*) FROM app_question_attempt_local) AS totalAttempts,
      (SELECT COUNT(*) FROM app_kana_card_state WHERE seen_count > 0) AS kanaSeen,
      (SELECT COUNT(*) FROM app_kana_card_state WHERE mastered = 1) AS kanaMastered
  `);
  const profile: QuickLearnerProfile = {
    totalAttempts: profileRow?.totalAttempts ?? 0,
    kanaSeen: profileRow?.kanaSeen ?? 0,
    kanaMastered: profileRow?.kanaMastered ?? 0,
  };
  const stage = getQuickLearnerStage(profile);
  const limit = stage === 'discovery' ? 5 : getQuickQuestionLimit(preferences);
  const rows = await loadQuestionsForStage(db, preferences, stage, limit);
  const selectedRows = stage === 'consolidation' ? shuffle(rows).slice(0, limit) : rows.slice(0, limit);
  const withChoices = await Promise.all(
    selectedRows.map(async (question) => ({
      question,
      choices: stage === 'discovery' ? buildDiscoveryChoices(question.correct_answer) : await loadChoicesForQuestion(db, question),
      helper: buildQuestionHelper(question, stage),
      stage,
    }))
  );

  return withChoices.filter((item) => item.choices.length >= 2);
}

async function loadQuestionsForStage(
  db: SQLiteDatabase,
  preferences: LearningPreferences,
  stage: QuickLearnerStage,
  limit: number
): Promise<QuizQuestion[]> {
  if (stage === 'discovery') {
    const vowels = await db.getAllAsync<QuizQuestion>(
      `
      SELECT q.question_id, q.question_origin, q.skill_id, q.question_type,
             q.prompt_fr, q.prompt_ja, q.correct_answer, q.explanation_fr
      FROM app_question_bank q
      WHERE q.question_type = 'kana_to_romaji' AND q.prompt_ja IN ('あ', 'い', 'う', 'え', 'お')
      ORDER BY instr('あいうえお', q.prompt_ja)
      `
    );
    return vowels.map((question) => ({ ...question, prompt_fr: 'Quel son correspond à ce signe ?' }));
  }

  const stageFilter = stage === 'hiragana'
    ? `q.question_type = 'kana_to_romaji' AND k.script = 'hiragana'`
    : stage === 'kana'
      ? `q.question_type = 'kana_to_romaji'`
      : `(q.question_type = 'kana_to_romaji' OR q.question_type = 'vocabulary_japanese_to_french' OR q.question_type = 'kanji_to_french')`;
  return db.getAllAsync<QuizQuestion>(
    `
    SELECT q.question_id, q.question_origin, q.skill_id, q.question_type,
           q.prompt_fr, q.prompt_ja, q.correct_answer, q.explanation_fr
    FROM app_question_bank q
    JOIN app_adaptive_question_priority p ON p.question_id = q.question_id
    LEFT JOIN canonical_kana k ON k.character = q.prompt_ja
    LEFT JOIN (
      SELECT question_id,
             COUNT(*) AS local_attempts,
             SUM(is_correct) AS local_correct,
             MAX(answered_at) AS last_answered_at
      FROM app_question_attempt_local
      GROUP BY question_id
    ) a ON a.question_id = q.question_id
    WHERE q.question_origin != 'exam'
      AND ${stageFilter}
    ${getDifficultyClause(preferences)}
    LIMIT ?
    `,
    limit * 3
  );
}

function buildQuestionHelper(question: QuizQuestion, stage: QuickLearnerStage): string | undefined {
  if (stage === 'discovery') return `Découverte : ${question.prompt_ja} se lit « ${question.correct_answer} ». Choisis cette lecture pour la mémoriser.`;
  if (stage === 'hiragana') return 'Débutant : observe le signe, puis choisis uniquement parmi des lectures en romaji.';
  if (stage === 'kana') return 'Les réponses utilisent toutes le même format. Prends le temps de reconnaître le signe.';
  return undefined;
}

function buildDiscoveryChoices(correctAnswer: string): string[] {
  const vowels = ['a', 'i', 'u', 'e', 'o'];
  const correctIndex = vowels.indexOf(correctAnswer);
  if (correctIndex < 0) return [correctAnswer];
  return [correctAnswer, ...vowels.filter((value) => value !== correctAnswer).slice(correctIndex % 2, correctIndex % 2 + 3)];
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

export async function claimQuickSessionReward(db: SQLiteDatabase, result: QuickSessionResult, sessionId: string): Promise<void> {
  if (result.total <= 0 || result.xp <= 0) return;
  const day = new Date().toISOString().slice(0, 10);
  await db.runAsync(
    `
    INSERT OR IGNORE INTO app_daily_reward_claim (
      day, goal_id, reward_xp, badge_code, claimed_at
    ) VALUES (?, ?, ?, 'QUICK', datetime('now'))
    `,
    day,
    `quick-session-${sessionId}`,
    result.xp
  );
}

import { SQLiteDatabase } from 'expo-sqlite';
import type {
  DailyProgress,
  DailyGoalDay,
  DailyGoalMetrics,
  DashboardStats,
  GrammarProgressSummary,
  MasteryDomainStats,
  QuizDashboardSummary,
  QuizModeProgress,
  QuizScoreTrend,
  RewardSummary,
  RewardToast,
  SkillProgress,
} from '../models';
import {
  addDays,
  addMonths,
  buildDateRange,
  buildQuests,
  formatDateKey,
  getMonthStart,
  getWeekStart,
  isQuestComplete,
  type GoalDefinition,
} from './goals';
import { buildGrammarMasteryDomain } from './grammarProgress';

export type DashboardOverviewData = {
  stats: DashboardStats;
  weakSkills: SkillProgress[];
  masteredSkills: SkillProgress[];
  dailyProgress: DailyProgress[];
};

export type DashboardQuizData = {
  summary: QuizDashboardSummary;
  dailyProgress: DailyProgress[];
  modeProgress: QuizModeProgress[];
  scoreTrend: QuizScoreTrend[];
  weakSkills: SkillProgress[];
};

export type DashboardGoalDefinitions = {
  daily: GoalDefinition[];
  weekly: GoalDefinition[];
  monthly: GoalDefinition[];
  yearly: GoalDefinition[];
};

export type DashboardGoalData = {
  today: DailyGoalMetrics;
  weekly: DailyGoalMetrics;
  monthly: DailyGoalMetrics;
  yearly: DailyGoalMetrics;
  rewardSummary: RewardSummary;
  earnedBadgeCodes: string[];
  goalCalendar: DailyGoalDay[];
  rewardToast: RewardToast | null;
};

export async function ensureDailyGoalPlan(
  db: SQLiteDatabase,
  dailyDefinitions: GoalDefinition[],
  goalPlanDays: number
) {
  const existing = await db.getFirstAsync<{ days: number }>(
    `
    SELECT COUNT(DISTINCT day) AS days
    FROM app_daily_goal_plan
    WHERE day >= date('now')
    `
  );
  if ((existing?.days ?? 0) >= 365) return;

  const start = new Date();
  start.setDate(start.getDate() - 364);
  const days = buildDateRange(goalPlanDays, start);
  for (const day of days) {
    for (const goal of dailyDefinitions) {
      await db.runAsync(
        `
        INSERT OR IGNORE INTO app_daily_goal_plan (
          day, goal_id, title, description, target, reward_xp, badge_code, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `,
        day,
        goal.id,
        goal.title,
        goal.description,
        goal.target,
        goal.rewardXp,
        goal.badgeCode
      );
    }
  }
}

export async function loadDashboardOverviewData(
  db: SQLiteDatabase,
  grammarTotal: number
): Promise<DashboardOverviewData> {
  const base = await db.getFirstAsync<{
    questions: number;
    vocabulary: number;
    grammar: number;
    kanji: number;
    kana: number;
    audio: number;
  }>(`
    SELECT
      (SELECT COUNT(*) FROM app_question_bank) AS questions,
      (SELECT COUNT(*) FROM canonical_vocabulary) AS vocabulary,
      (SELECT COUNT(*) FROM canonical_grammar) AS grammar,
      (SELECT COUNT(*) FROM canonical_kanji) AS kanji,
      (SELECT COUNT(*) FROM canonical_kana) AS kana,
      (SELECT COUNT(*) FROM app_audio_asset) AS audio
  `);

  const attempts = await db.getFirstAsync<{
    attempts: number;
    todayAttempts: number;
    correct: number | null;
    todayCorrect: number | null;
  }>(`
    SELECT
      COUNT(*) AS attempts,
      SUM(CASE WHEN date(answered_at) = date('now') THEN 1 ELSE 0 END) AS todayAttempts,
      SUM(CASE WHEN date(answered_at) = date('now') THEN is_correct ELSE 0 END) AS todayCorrect,
      SUM(is_correct) AS correct
    FROM app_question_attempt_local
  `);

  const total = attempts?.attempts ?? 0;
  const correct = attempts?.correct ?? 0;
  const todayAttempts = attempts?.todayAttempts ?? 0;
  const todayCorrect = attempts?.todayCorrect ?? 0;
  const stats: DashboardStats = {
    questions: base?.questions ?? 0,
    vocabulary: base?.vocabulary ?? 0,
    grammar: grammarTotal,
    kanji: base?.kanji ?? 0,
    kana: base?.kana ?? 0,
    audio: base?.audio ?? 0,
    attempts: total,
    todayAttempts,
    todayCorrect,
    correctRate: total > 0 ? Math.round((correct / total) * 100) : 0,
  };

  const weakSkills = await db.getAllAsync<SkillProgress>(`
    SELECT skill_id,
           COUNT(*) AS attempts,
           SUM(is_correct) AS correct,
           ROUND(SUM(is_correct) * 100.0 / COUNT(*)) AS rate
    FROM app_question_attempt_local
    GROUP BY skill_id
    HAVING attempts >= 2
    ORDER BY rate ASC, attempts DESC
    LIMIT 5
  `);

  const masteredSkills = await db.getAllAsync<SkillProgress>(`
    SELECT skill_id,
           COUNT(*) AS attempts,
           SUM(is_correct) AS correct,
           ROUND(SUM(is_correct) * 100.0 / COUNT(*)) AS rate
    FROM app_question_attempt_local
    GROUP BY skill_id
    HAVING attempts >= 2
    ORDER BY rate DESC, attempts DESC
    LIMIT 5
  `);

  const dailyProgress = await db.getAllAsync<DailyProgress>(`
    SELECT date(answered_at) AS day,
           COUNT(*) AS attempts,
           SUM(is_correct) AS correct,
           ROUND(SUM(is_correct) * 100.0 / COUNT(*)) AS rate
    FROM app_question_attempt_local
    GROUP BY date(answered_at)
    ORDER BY day DESC
    LIMIT 14
  `);

  return {
    stats,
    weakSkills,
    masteredSkills,
    dailyProgress: dailyProgress.reverse(),
  };
}

export async function loadDashboardQuizData(db: SQLiteDatabase): Promise<DashboardQuizData> {
  const quizAttempts = await db.getFirstAsync<{
    attempts: number;
    todayAttempts: number;
    correct: number | null;
    kanaArcadeAttempts: number;
    adaptiveAttempts: number;
    examAttempts: number;
  }>(`
    SELECT
      COUNT(*) AS attempts,
      SUM(CASE WHEN date(answered_at) = date('now') THEN 1 ELSE 0 END) AS todayAttempts,
      SUM(is_correct) AS correct,
      SUM(CASE WHEN source_mode = 'kana_arcade' THEN 1 ELSE 0 END) AS kanaArcadeAttempts,
      SUM(CASE WHEN source_mode IN ('adaptive_quiz', 'grammar_quiz', 'grammar_lesson') THEN 1 ELSE 0 END) AS adaptiveAttempts,
      SUM(CASE WHEN source_mode = 'exam_mode' THEN 1 ELSE 0 END) AS examAttempts
    FROM app_question_attempt_local
    WHERE source_mode IN ('kana_arcade', 'adaptive_quiz', 'exam_mode', 'grammar_quiz', 'grammar_lesson')
  `);
  const arcadeScoreStats = await db.getFirstAsync<{
    bestScore: number | null;
    bestScoreTime: number | null;
    bestStreak: number | null;
    averageScore: number | null;
    averageTime: number | null;
  }>(`
    SELECT
      MAX(score) AS bestScore,
      (SELECT elapsed_ms FROM app_kana_arcade_score ORDER BY score DESC, elapsed_ms ASC LIMIT 1) AS bestScoreTime,
      MAX(best_streak) AS bestStreak,
      ROUND(AVG(score)) AS averageScore,
      ROUND(AVG(elapsed_ms)) AS averageTime
    FROM app_kana_arcade_score
  `);
  const quizTotal = quizAttempts?.attempts ?? 0;
  const quizCorrect = quizAttempts?.correct ?? 0;
  const summary: QuizDashboardSummary = {
    attempts: quizTotal,
    correct: quizCorrect,
    rate: quizTotal > 0 ? Math.round((quizCorrect / quizTotal) * 100) : 0,
    todayAttempts: quizAttempts?.todayAttempts ?? 0,
    kanaArcadeAttempts: quizAttempts?.kanaArcadeAttempts ?? 0,
    adaptiveAttempts: quizAttempts?.adaptiveAttempts ?? 0,
    examAttempts: quizAttempts?.examAttempts ?? 0,
    bestScore: arcadeScoreStats?.bestScore ?? 0,
    bestScoreTime: arcadeScoreStats?.bestScoreTime ?? 0,
    bestStreak: arcadeScoreStats?.bestStreak ?? 0,
    averageScore: arcadeScoreStats?.averageScore ?? 0,
    averageTime: arcadeScoreStats?.averageTime ?? 0,
  };

  const dailyProgress = await db.getAllAsync<DailyProgress>(`
    SELECT date(answered_at) AS day,
           COUNT(*) AS attempts,
           SUM(is_correct) AS correct,
           ROUND(SUM(is_correct) * 100.0 / COUNT(*)) AS rate
    FROM app_question_attempt_local
    WHERE source_mode IN ('kana_arcade', 'adaptive_quiz', 'exam_mode', 'grammar_quiz', 'grammar_lesson')
    GROUP BY date(answered_at)
    ORDER BY day DESC
    LIMIT 14
  `);

  const modeProgress = await db.getAllAsync<QuizModeProgress>(`
    SELECT source_mode,
           COUNT(*) AS attempts,
           SUM(is_correct) AS correct,
           ROUND(SUM(is_correct) * 100.0 / COUNT(*)) AS rate
    FROM app_question_attempt_local
    WHERE source_mode IN ('kana_arcade', 'adaptive_quiz', 'exam_mode', 'grammar_quiz', 'grammar_lesson')
    GROUP BY source_mode
    ORDER BY attempts DESC
  `);

  const scoreTrend = await db.getAllAsync<QuizScoreTrend>(`
    SELECT '#' || ROW_NUMBER() OVER (ORDER BY created_at ASC) AS label,
           score,
           ROUND(correct_count * 100.0 / total_count) AS rate,
           elapsed_ms,
           created_at
    FROM app_kana_arcade_score
    ORDER BY created_at DESC
    LIMIT 10
  `);

  const weakSkills = await db.getAllAsync<SkillProgress>(`
    SELECT skill_id,
           COUNT(*) AS attempts,
           SUM(is_correct) AS correct,
           ROUND(SUM(is_correct) * 100.0 / COUNT(*)) AS rate
    FROM app_question_attempt_local
    WHERE source_mode IN ('kana_arcade', 'adaptive_quiz', 'exam_mode', 'grammar_quiz', 'grammar_lesson')
    GROUP BY skill_id
    HAVING attempts >= 2
    ORDER BY rate ASC, attempts DESC
    LIMIT 6
  `);

  return {
    summary,
    dailyProgress: dailyProgress.reverse(),
    modeProgress,
    scoreTrend: scoreTrend.reverse(),
    weakSkills,
  };
}

export async function loadDashboardMasteryDomains(
  db: SQLiteDatabase,
  grammarProgress: GrammarProgressSummary
): Promise<MasteryDomainStats[]> {
  const kanaMastery = await db.getAllAsync<MasteryDomainStats>(`
    SELECT
      k.script AS id,
      CASE WHEN k.script = 'hiragana' THEN 'Hiragana' ELSE 'Katakana' END AS label,
      COUNT(*) AS total,
      SUM(CASE WHEN COALESCE(s.mastered, 0) = 1 THEN 1 ELSE 0 END) AS mastered,
      SUM(CASE
        WHEN COALESCE(s.mastered, 0) = 0
         AND COALESCE(s.review, 0) = 0
         AND COALESCE(s.seen_count, 0) > 0 THEN 1 ELSE 0 END) AS known,
      SUM(CASE WHEN COALESCE(s.review, 0) = 1 THEN 1 ELSE 0 END) AS review,
      SUM(CASE WHEN COALESCE(s.seen_count, 0) = 0 THEN 1 ELSE 0 END) AS unseen,
      SUM(CASE WHEN COALESCE(s.seen_count, 0) > 0 THEN 1 ELSE 0 END) AS attempted,
      SUM(COALESCE(s.correct_count, 0)) AS correct,
      CASE
        WHEN SUM(COALESCE(s.seen_count, 0)) > 0
        THEN ROUND(SUM(COALESCE(s.correct_count, 0)) * 100.0 / SUM(COALESCE(s.seen_count, 0)))
        ELSE 0
      END AS rate
    FROM canonical_kana k
    LEFT JOIN app_kana_card_state s ON s.kana_id = k.id
    WHERE k.script IN ('hiragana', 'katakana')
    GROUP BY k.script
    ORDER BY CASE WHEN k.script = 'hiragana' THEN 0 ELSE 1 END
  `);
  const contentMastery = await db.getAllAsync<MasteryDomainStats>(`
    WITH content AS (
      SELECT 'vocabulary' AS id, 'Vocabulaire' AS label, id AS item_id FROM canonical_vocabulary
      UNION ALL
      SELECT 'grammar' AS id, 'Grammaire' AS label, id AS item_id FROM canonical_grammar
      UNION ALL
      SELECT 'kanji' AS id, 'Kanji' AS label, id AS item_id FROM canonical_kanji
    ),
    item_attempts AS (
      SELECT
        q.item_type AS id,
        q.item_id,
        COUNT(a.id) AS attempts,
        SUM(a.is_correct) AS correct,
        ROUND(SUM(a.is_correct) * 100.0 / COUNT(a.id)) AS rate
      FROM app_question_attempt_local a
      INNER JOIN app_question_bank q ON q.question_id = a.question_id
      WHERE q.item_type IN ('vocabulary', 'grammar', 'kanji')
      GROUP BY q.item_type, q.item_id
    )
    SELECT
      c.id,
      c.label,
      COUNT(*) AS total,
      SUM(CASE WHEN COALESCE(i.attempts, 0) >= 2 AND COALESCE(i.rate, 0) >= 90 THEN 1 ELSE 0 END) AS mastered,
      SUM(CASE WHEN COALESCE(i.attempts, 0) >= 2 AND COALESCE(i.rate, 0) >= 70 AND COALESCE(i.rate, 0) < 90 THEN 1 ELSE 0 END) AS known,
      SUM(CASE WHEN COALESCE(i.attempts, 0) > 0 AND COALESCE(i.rate, 0) < 70 THEN 1 ELSE 0 END) AS review,
      SUM(CASE WHEN COALESCE(i.attempts, 0) = 0 THEN 1 ELSE 0 END) AS unseen,
      SUM(COALESCE(i.attempts, 0)) AS attempted,
      SUM(COALESCE(i.correct, 0)) AS correct,
      CASE
        WHEN SUM(COALESCE(i.attempts, 0)) > 0
        THEN ROUND(SUM(COALESCE(i.correct, 0)) * 100.0 / SUM(COALESCE(i.attempts, 0)))
        ELSE 0
      END AS rate
    FROM content c
    LEFT JOIN item_attempts i ON i.id = c.id AND i.item_id = c.item_id
    GROUP BY c.id, c.label
    ORDER BY CASE c.id
      WHEN 'vocabulary' THEN 0
      WHEN 'grammar' THEN 1
      WHEN 'kanji' THEN 2
      ELSE 3
    END
  `);
  const grammarMastery = buildGrammarMasteryDomain(grammarProgress);
  const adjustedContentMastery = contentMastery.map((domain) =>
    domain.id === 'grammar' ? grammarMastery : domain
  );
  return [...kanaMastery, ...adjustedContentMastery];
}

export async function loadDashboardGoalData(
  db: SQLiteDatabase,
  definitions: DashboardGoalDefinitions,
  calendarHistoryDays: number,
  todayAttempts: number,
  todayCorrect: number
): Promise<DashboardGoalData> {
  const loadGoalMetrics = async (periodStart: Date, periodEnd: Date): Promise<DailyGoalMetrics> => {
    const startKey = formatDateKey(periodStart);
    const endKey = formatDateKey(periodEnd);
    const row = await db.getFirstAsync<{
      attempts: number;
      correct: number | null;
      quizAttempts: number;
      grammarActivities: number;
      activeDays: number;
    }>(
      `
      SELECT
        (SELECT COUNT(*)
         FROM app_question_attempt_local
         WHERE date(answered_at) >= ? AND date(answered_at) < ?) AS attempts,
        (SELECT SUM(is_correct)
         FROM app_question_attempt_local
         WHERE date(answered_at) >= ? AND date(answered_at) < ?) AS correct,
        (
          (SELECT COUNT(*)
           FROM app_kana_arcade_score
           WHERE date(created_at) >= ? AND date(created_at) < ?)
          +
          (SELECT CAST(COUNT(*) / 10 AS INTEGER)
           FROM app_question_attempt_local
           WHERE date(answered_at) >= ? AND date(answered_at) < ?
             AND source_mode IN ('adaptive_quiz', 'exam_mode', 'grammar_quiz'))
        ) AS quizAttempts,
        (SELECT COUNT(*)
         FROM app_question_attempt_local
         WHERE date(answered_at) >= ? AND date(answered_at) < ?
           AND source_mode = 'grammar_lesson') AS grammarActivities,
        (
          SELECT COUNT(DISTINCT day)
          FROM (
            SELECT date(answered_at) AS day
            FROM app_question_attempt_local
            WHERE date(answered_at) >= ? AND date(answered_at) < ?
            UNION
            SELECT date(created_at) AS day
            FROM app_kana_arcade_score
            WHERE date(created_at) >= ? AND date(created_at) < ?
          )
        ) AS activeDays
      `,
      startKey,
      endKey,
      startKey,
      endKey,
      startKey,
      endKey,
      startKey,
      endKey,
      startKey,
      endKey,
      startKey,
      endKey,
      startKey,
      endKey
    );
    const periodAttempts = row?.attempts ?? 0;
    const periodCorrect = row?.correct ?? 0;
    return {
      day: startKey,
      attempts: periodAttempts,
      correct: periodCorrect,
      rate: periodAttempts > 0 ? Math.round((periodCorrect / periodAttempts) * 100) : 0,
      quizAttempts: row?.quizAttempts ?? 0,
      grammarActivities: row?.grammarActivities ?? 0,
      activeDays: row?.activeDays ?? 0,
    };
  };

  const now = new Date();
  const todayKey = formatDateKey(now);
  const weekStart = getWeekStart(now);
  const monthStart = getMonthStart(now);
  const yearStart = addDays(now, -(calendarHistoryDays - 1));
  const today: DailyGoalMetrics = {
    day: todayKey,
    attempts: todayAttempts,
    correct: todayCorrect,
    rate: todayAttempts > 0 ? Math.round((todayCorrect / todayAttempts) * 100) : 0,
    quizAttempts: 0,
    grammarActivities: 0,
  };

  const todayQuizAttempts = await db.getFirstAsync<{ quizAttempts: number; grammarActivities: number }>(
    `
    SELECT
      (
        (SELECT COUNT(*)
         FROM app_kana_arcade_score
         WHERE date(created_at) = ?)
        +
        (SELECT CAST(COUNT(*) / 10 AS INTEGER)
         FROM app_question_attempt_local
         WHERE date(answered_at) = ?
           AND source_mode IN ('adaptive_quiz', 'exam_mode', 'grammar_quiz'))
      ) AS quizAttempts,
      (SELECT COUNT(*)
       FROM app_question_attempt_local
       WHERE date(answered_at) = ?
         AND source_mode = 'grammar_lesson') AS grammarActivities
    `,
    todayKey,
    todayKey,
    todayKey
  );
  today.quizAttempts = todayQuizAttempts?.quizAttempts ?? 0;
  today.grammarActivities = todayQuizAttempts?.grammarActivities ?? 0;

  const weekly = await loadGoalMetrics(weekStart, addDays(weekStart, 7));
  const monthly = await loadGoalMetrics(monthStart, addMonths(monthStart, 1));
  const yearly = await loadGoalMetrics(yearStart, addDays(now, 1));

  const questGroups = [
    { key: todayKey, quests: buildQuests(today, definitions.daily) },
    { key: `${weekly.day}:week`, quests: buildQuests(weekly, definitions.weekly) },
    { key: `${monthly.day}:month`, quests: buildQuests(monthly, definitions.monthly) },
    { key: `${yearly.day}:year`, quests: buildQuests(yearly, definitions.yearly) },
  ];

  for (const group of questGroups) {
    for (const quest of group.quests) {
      if (!isQuestComplete(quest)) {
        await db.runAsync(
          `
          DELETE FROM app_daily_reward_claim
          WHERE day = ? AND goal_id = ?
          `,
          group.key,
          quest.id
        );
      }
    }
  }

  const newlyCompleted = questGroups.flatMap((group) =>
    group.quests.filter(isQuestComplete).map((quest) => ({ key: group.key, quest }))
  );
  let rewardToast: RewardToast | null = null;
  for (const { key, quest } of newlyCompleted) {
    const existingClaim = await db.getFirstAsync<{ goal_id: string }>(
      `
      SELECT goal_id
      FROM app_daily_reward_claim
      WHERE day = ? AND goal_id = ?
      `,
      key,
      quest.id
    );
    if (!existingClaim) {
      await db.runAsync(
        `
        INSERT INTO app_daily_reward_claim (
          day, goal_id, reward_xp, badge_code, claimed_at
        ) VALUES (?, ?, ?, ?, datetime('now'))
        `,
        key,
        quest.id,
        quest.rewardXp,
        quest.badgeCode
      );
      rewardToast = { title: quest.title, xp: quest.rewardXp, badgeCode: quest.badgeCode };
    }
  }

  const rewards = await db.getFirstAsync<RewardSummary>(
    `
    SELECT COALESCE(SUM(reward_xp), 0) AS xp,
           COUNT(DISTINCT badge_code) AS badges
    FROM app_daily_reward_claim
    `
  );
  const badgeRows = await db.getAllAsync<{ badge_code: string }>(
    `
    SELECT DISTINCT badge_code
    FROM app_daily_reward_claim
    ORDER BY badge_code
    `
  );

  const calendarRows = await db.getAllAsync<DailyGoalMetrics>(
    `
    SELECT p.day,
           COALESCE(a.attempts, 0) AS attempts,
           COALESCE(a.correct, 0) AS correct,
           CASE
             WHEN COALESCE(a.attempts, 0) > 0
             THEN ROUND(COALESCE(a.correct, 0) * 100.0 / a.attempts)
             ELSE 0
           END AS rate,
           COALESCE(a.quizAttempts, 0) AS quizAttempts,
           COALESCE(a.grammarActivities, 0) AS grammarActivities
    FROM (
      SELECT day
      FROM (
        SELECT DISTINCT day
        FROM app_daily_goal_plan
        WHERE day <= date('now')
        ORDER BY day DESC
        LIMIT ${calendarHistoryDays}
      )
      ORDER BY day ASC
    ) p
    LEFT JOIN (
      SELECT day,
             SUM(attempts) AS attempts,
             SUM(correct) AS correct,
             SUM(quizAttempts) AS quizAttempts,
             SUM(grammarActivities) AS grammarActivities
      FROM (
        SELECT date(answered_at) AS day,
               COUNT(*) AS attempts,
               SUM(is_correct) AS correct,
               CAST(SUM(CASE WHEN source_mode IN ('adaptive_quiz', 'exam_mode', 'grammar_quiz') THEN 1 ELSE 0 END) / 10 AS INTEGER) AS quizAttempts,
               SUM(CASE WHEN source_mode = 'grammar_lesson' THEN 1 ELSE 0 END) AS grammarActivities
        FROM app_question_attempt_local
        GROUP BY date(answered_at)
        UNION ALL
        SELECT date(created_at) AS day,
               0 AS attempts,
               0 AS correct,
               COUNT(*) AS quizAttempts,
               0 AS grammarActivities
        FROM app_kana_arcade_score
        GROUP BY date(created_at)
      )
      GROUP BY day
    ) a ON a.day = p.day
    ORDER BY p.day ASC
    `
  );
  const goalCalendar = calendarRows.map((day) => {
    const quests = buildQuests(day, definitions.daily);
    return {
      ...day,
      completed: quests.filter(isQuestComplete).length,
      total: quests.length,
    };
  });

  return {
    today,
    weekly,
    monthly,
    yearly,
    rewardSummary: { xp: rewards?.xp ?? 0, badges: rewards?.badges ?? 0 },
    earnedBadgeCodes: badgeRows.map((row) => row.badge_code),
    goalCalendar,
    rewardToast,
  };
}

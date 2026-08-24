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
  LearningPlanMode,
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
import { loadLearningPreferences } from './preferences';

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
  todayDefinitions: GoalDefinition[];
  tomorrowDefinitions: GoalDefinition[];
  weekly: DailyGoalMetrics;
  monthly: DailyGoalMetrics;
  yearly: DailyGoalMetrics;
  rewardSummary: RewardSummary;
  earnedBadgeCodes: string[];
  goalCalendar: DailyGoalDay[];
  rewardToast: RewardToast | null;
};

type AttendanceBonus = {
  id: string;
  claimDay: string;
  title: string;
  rewardXp: number;
  badgeCode: string;
  unlocked: boolean;
};

const ATTENDANCE_BONUSES = [
  { id: 'attendance-day-1', title: 'Jour travaillé', rewardXp: 60, badgeCode: 'ASSIDUITE-1', streakTarget: 1, repeat: 'daily' },
  { id: 'attendance-streak-3', title: 'Série 3 jours', rewardXp: 260, badgeCode: 'ASSIDUITE-3', streakTarget: 3, repeat: 'once' },
  { id: 'attendance-streak-7', title: 'Série 7 jours', rewardXp: 780, badgeCode: 'ASSIDUITE-7', streakTarget: 7, repeat: 'once' },
] as const;

const DAILY_GOAL_MATERIALIZATION_DAYS = 186;

export async function ensureDailyGoalPlan(
  db: SQLiteDatabase,
  dailyDefinitions: GoalDefinition[],
  goalPlanDays: number
) {
  const profile = await loadDailyGoalProfile(db);
  const now = new Date();
  const todayKey = formatDateKey(now);
  const tomorrowKey = formatDateKey(addDays(now, 1));
  const days = buildDateRange(Math.min(goalPlanDays, DAILY_GOAL_MATERIALIZATION_DAYS), now);
  const existingRows = await db.getAllAsync<{ day: string; count: number }>(
    `
    SELECT day, COUNT(*) AS count
    FROM app_daily_goal_plan
    WHERE day >= ?
    GROUP BY day
    `,
    todayKey
  );
  const plannedGoalCountByDay = new Map(existingRows.map((row) => [row.day, row.count]));

  await db.withTransactionAsync(async () => {
    for (const [dayIndex, day] of days.entries()) {
      const shouldRefreshNearTerm = day === todayKey || day === tomorrowKey;
      const existingCount = plannedGoalCountByDay.get(day) ?? 0;
      if (!shouldRefreshNearTerm && existingCount >= 3) continue;
      if (shouldRefreshNearTerm && existingCount > 0) {
        await db.runAsync(
          `DELETE FROM app_daily_goal_plan WHERE day = ? AND goal_id LIKE 'daily-%'`,
          day
        );
      }
      const goals = buildAdaptiveDailyGoals(day, dayIndex, profile);
      for (const goal of goals) {
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
  });
}

type DailyGoalProfile = {
  level: number;
  accuracy: number;
  totalAttempts: number;
  activeDays: number;
  weakDomain: string;
  learningPlanMode: LearningPlanMode;
};

async function loadDailyGoalProfile(db: SQLiteDatabase): Promise<DailyGoalProfile> {
  const preferences = await loadLearningPreferences(db);
  const stats = await db.getFirstAsync<{
    attempts: number;
    correct: number | null;
    activeDays: number;
  }>(`
    SELECT
      (SELECT COUNT(*) FROM app_question_attempt_local) AS attempts,
      (SELECT SUM(is_correct) FROM app_question_attempt_local) AS correct,
      (
        SELECT COUNT(DISTINCT day)
        FROM (
          SELECT date(answered_at) AS day FROM app_question_attempt_local
          UNION
          SELECT date(created_at) AS day FROM app_kana_arcade_score
        )
      ) AS activeDays
  `);
  const weakSkill = await db.getFirstAsync<{ skill_id: string }>(`
    SELECT skill_id
    FROM app_question_attempt_local
    GROUP BY skill_id
    HAVING COUNT(*) >= 2
    ORDER BY ROUND(SUM(is_correct) * 100.0 / COUNT(*)) ASC, COUNT(*) DESC
    LIMIT 1
  `);
  const totalAttempts = stats?.attempts ?? 0;
  const correct = stats?.correct ?? 0;
  const accuracy = totalAttempts > 0 ? Math.round((correct / totalAttempts) * 100) : 0;
  const activeDays = stats?.activeDays ?? 0;
  const level = Math.max(1, Math.min(250, Math.floor(totalAttempts / 35) + Math.floor(activeDays / 5) + Math.floor(accuracy / 25) + 1));
  return {
    level,
    accuracy,
    totalAttempts,
    activeDays,
    weakDomain: inferWeakDomain(weakSkill?.skill_id),
    learningPlanMode: preferences.learningPlanMode,
  };
}

function inferWeakDomain(skillId?: string): string {
  const value = (skillId ?? '').toLowerCase();
  if (value.includes('grammar') || value.includes('particle')) return 'grammaire';
  if (value.includes('kanji')) return 'kanji';
  if (value.includes('vocab')) return 'vocabulaire';
  if (value.includes('kana') || value.includes('hiragana') || value.includes('katakana')) return 'kana';
  if (value.includes('comprehension')) return 'comprehension';
  return 'kana';
}

async function calculateAttendanceStreak(db: SQLiteDatabase, todayKey: string): Promise<number> {
  const activeRows = await db.getAllAsync<{ day: string }>(
    `
    SELECT day
    FROM (
      SELECT date(answered_at) AS day
      FROM app_question_attempt_local
      WHERE date(answered_at) <= ?
      UNION
      SELECT date(created_at) AS day
      FROM app_kana_arcade_score
      WHERE date(created_at) <= ?
    )
    ORDER BY day DESC
    LIMIT 370
    `,
    todayKey,
    todayKey
  );
  const activeDays = new Set(activeRows.map((row) => row.day));
  const cursor = new Date(`${todayKey}T12:00:00`);
  let streak = 0;

  for (let index = 0; index < 370; index += 1) {
    const key = formatDateKey(cursor);
    if (!activeDays.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function buildAttendanceBonuses(todayKey: string, streakDays: number): AttendanceBonus[] {
  return ATTENDANCE_BONUSES.map((bonus) => ({
    id: bonus.id,
    claimDay: bonus.repeat === 'daily' ? todayKey : `milestone:${bonus.id}`,
    title: bonus.title,
    rewardXp: bonus.rewardXp,
    badgeCode: bonus.badgeCode,
    unlocked: streakDays >= bonus.streakTarget,
  }));
}

function buildAdaptiveDailyGoals(day: string, dayIndex: number, profile: DailyGoalProfile): GoalDefinition[] {
  const difficulty = Math.max(1, Math.min(5, Math.floor((profile.level - 1) / 12) + 1));
  const wave = dayIndex % 7;
  const longWave = dayIndex % 30;
  const domain = pickDailyDomain(profile.weakDomain, profile.learningPlanMode, dayIndex);
  const questionTarget = 10 + difficulty * 4 + (wave % 3) * 2 + Math.floor(dayIndex / 30);
  const precisionTarget = Math.min(94, 68 + difficulty * 4 + (profile.accuracy >= 80 ? 4 : 0) + (longWave % 4));
  const minimumPrecisionAnswers = 8 + difficulty * 2;
  const sessionTarget = difficulty >= 5 ? 3 : difficulty >= 3 ? 2 : 1;
  const rewardBase = 90 + difficulty * 35;
  const dayCode = day.replace(/-/g, '');
  const questionVariants = [
    ['Mission ciblage', `Répondre à ${questionTarget} questions, avec priorité ${domain}.`, 'focus'],
    ['Révision active', `Faire ${questionTarget} réponses pour consolider les acquis fragiles.`, 'review'],
    ['Endurance N5', `Tenir ${questionTarget} questions sans casser le rythme.`, 'endurance'],
    ['Exploration mixte', `Explorer ${questionTarget} questions sur plusieurs familles N5.`, 'question'],
  ];
  const precisionVariants = [
    ['Précision propre', `Atteindre ${precisionTarget}% avec au moins ${minimumPrecisionAnswers} réponses.`, 'precision'],
    ['Zéro hasard', `Viser ${precisionTarget}% : lis avant de répondre, surtout en ${domain}.`, 'precision'],
    ['Contrôle qualité', `Garder ${precisionTarget}% de réussite minimum aujourd’hui.`, 'precision'],
  ];
  const sessionVariants = [
    ['Session guidée', `Terminer ${sessionTarget} session guidée adaptée au niveau pédagogique actuel.`, 'session'],
    [`Atelier ${domain}`, `Finir ${sessionTarget} activité quiz/grammaire orientée ${domain}.`, 'quiz'],
    ['Bloc application', `Valider ${sessionTarget} entraînement complet après la révision.`, 'grammar'],
  ];
  const question = questionVariants[dayIndex % questionVariants.length];
  const precision = precisionVariants[(dayIndex + difficulty) % precisionVariants.length];
  const session = sessionVariants[(dayIndex + wave) % sessionVariants.length];
  return [
    {
      id: `daily-${question[2]}-${dayCode}`,
      title: question[0],
      description: question[1],
      target: questionTarget,
      rewardXp: rewardBase,
      badgeCode: 'XP',
      unit: 'questions',
      period: 'daily',
    },
    {
      id: `daily-${precision[2]}-${dayCode}`,
      title: precision[0],
      description: precision[1],
      target: precisionTarget,
      rewardXp: rewardBase + 40,
      badgeCode: 'XP',
      unit: '%',
      period: 'daily',
    },
    {
      id: `daily-${session[2]}-${dayCode}`,
      title: session[0],
      description: session[1],
      target: sessionTarget,
      rewardXp: rewardBase + 80,
      badgeCode: 'XP',
      unit: 'activité',
      period: 'daily',
    },
  ];
}

function pickDailyDomain(weakDomain: string, learningPlanMode: LearningPlanMode, dayIndex: number): string {
  const rotations: Record<LearningPlanMode, string[]> = {
    balanced: [weakDomain, 'kana', 'vocabulaire', 'grammaire', 'kanji', 'compréhension', 'JLPT mixte'],
    kana_first: ['kana', 'orthographe kana', weakDomain, 'kana', 'vocabulaire', 'kana', 'compréhension'],
    grammar_intensive: ['grammaire', weakDomain, 'particules', 'phrases N5', 'grammaire', 'compréhension', 'vocabulaire'],
    exam_revision: ['JLPT mixte', 'compréhension', weakDomain, 'kanji', 'grammaire', 'vocabulaire', 'test blanc'],
  };
  const rotation = rotations[learningPlanMode];
  return rotation[dayIndex % rotation.length] ?? weakDomain;
}

async function loadPlannedDailyDefinitions(db: SQLiteDatabase, day: string, fallback: GoalDefinition[]): Promise<GoalDefinition[]> {
  const rows = await db.getAllAsync<{
    goal_id: string;
    title: string;
    description: string;
    target: number;
    reward_xp: number;
    badge_code: string;
  }>(
    `
    SELECT goal_id, title, description, target, reward_xp, badge_code
    FROM app_daily_goal_plan
    WHERE day = ?
    ORDER BY created_at ASC, goal_id ASC
    LIMIT 3
    `,
    day
  );
  if (rows.length === 0) return fallback;
  return rows.map((row) => ({
    id: row.goal_id,
    title: row.title,
    description: row.description
      .replace(/session quiz ou grammaire adaptée au niveau \d+/i, 'session guidée adaptée au niveau pédagogique actuel')
      .replace(/niveau \d+/gi, 'niveau pédagogique actuel'),
    target: row.target,
    rewardXp: row.reward_xp,
    badgeCode: row.badge_code,
    unit: inferDailyGoalUnit(row.goal_id),
    period: 'daily',
  }));
}

function inferDailyGoalUnit(goalId: string): string {
  if (goalId.includes('precision')) return '%';
  if (goalId.includes('session') || goalId.includes('quiz') || goalId.includes('grammar')) return 'activite';
  return 'questions';
}

export async function loadDashboardOverviewData(
  db: SQLiteDatabase,
  grammarTotal: number
): Promise<DashboardOverviewData> {
  const [base, attempts, weakSkills, masteredSkills, dailyProgress] = await Promise.all([
    db.getFirstAsync<{
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
    `),
    db.getFirstAsync<{
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
    `),
    db.getAllAsync<SkillProgress>(`
      SELECT skill_id,
             COUNT(*) AS attempts,
             SUM(is_correct) AS correct,
             ROUND(SUM(is_correct) * 100.0 / COUNT(*)) AS rate
      FROM app_question_attempt_local
      GROUP BY skill_id
      HAVING attempts >= 2
      ORDER BY rate ASC, attempts DESC
      LIMIT 5
    `),
    db.getAllAsync<SkillProgress>(`
      SELECT skill_id,
             COUNT(*) AS attempts,
             SUM(is_correct) AS correct,
             ROUND(SUM(is_correct) * 100.0 / COUNT(*)) AS rate
      FROM app_question_attempt_local
      GROUP BY skill_id
      HAVING attempts >= 2
      ORDER BY rate DESC, attempts DESC
      LIMIT 5
    `),
    db.getAllAsync<DailyProgress>(`
      SELECT day,
             SUM(attempts) AS attempts,
             SUM(correct) AS correct,
             CASE
               WHEN SUM(attempts) > 0 THEN ROUND(SUM(correct) * 100.0 / SUM(attempts))
               ELSE 0
             END AS rate
      FROM (
        SELECT date(answered_at) AS day,
               COUNT(*) AS attempts,
               SUM(is_correct) AS correct
        FROM app_question_attempt_local
        GROUP BY date(answered_at)
        UNION ALL
        SELECT date(created_at) AS day,
               COUNT(*) AS attempts,
               COUNT(*) AS correct
        FROM app_kana_arcade_score
        GROUP BY date(created_at)
      )
      GROUP BY day
      ORDER BY day DESC
      LIMIT 14
    `),
  ]);

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

  return {
    stats,
    weakSkills,
    masteredSkills,
    dailyProgress: dailyProgress.reverse(),
  };
}

export async function loadDashboardQuizData(db: SQLiteDatabase): Promise<DashboardQuizData> {
  const [quizAttempts, arcadeScoreStats, dailyProgress, modeProgress, scoreTrend, weakSkills] = await Promise.all([
    db.getFirstAsync<{
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
    `),
    db.getFirstAsync<{
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
    `),
    db.getAllAsync<DailyProgress>(`
      SELECT date(answered_at) AS day,
             COUNT(*) AS attempts,
             SUM(is_correct) AS correct,
             ROUND(SUM(is_correct) * 100.0 / COUNT(*)) AS rate
      FROM app_question_attempt_local
      WHERE source_mode IN ('kana_arcade', 'adaptive_quiz', 'exam_mode', 'grammar_quiz', 'grammar_lesson')
      GROUP BY date(answered_at)
      ORDER BY day DESC
      LIMIT 14
    `),
    db.getAllAsync<QuizModeProgress>(`
      SELECT source_mode,
             COUNT(*) AS attempts,
             SUM(is_correct) AS correct,
             ROUND(SUM(is_correct) * 100.0 / COUNT(*)) AS rate
      FROM app_question_attempt_local
      WHERE source_mode IN ('kana_arcade', 'adaptive_quiz', 'exam_mode', 'grammar_quiz', 'grammar_lesson')
      GROUP BY source_mode
      ORDER BY attempts DESC
    `),
    db.getAllAsync<QuizScoreTrend>(`
      SELECT '#' || ROW_NUMBER() OVER (ORDER BY created_at ASC) AS label,
             score,
             ROUND(correct_count * 100.0 / total_count) AS rate,
             elapsed_ms,
             created_at
      FROM app_kana_arcade_score
      ORDER BY created_at DESC
      LIMIT 10
    `),
    db.getAllAsync<SkillProgress>(`
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
    `),
  ]);
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
  const [kanaMastery, contentMastery] = await Promise.all([
    db.getAllAsync<MasteryDomainStats>(`
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
  `),
    db.getAllAsync<MasteryDomainStats>(`
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
  `),
  ]);
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
  const todayDefinitions = await loadPlannedDailyDefinitions(db, todayKey, definitions.daily);
  const tomorrowKey = formatDateKey(addDays(now, 1));
  const tomorrowDefinitions = await loadPlannedDailyDefinitions(db, tomorrowKey, definitions.daily);
  const attendanceStreak = await calculateAttendanceStreak(db, todayKey);

  const weekly = await loadGoalMetrics(weekStart, addDays(weekStart, 7));
  const monthly = await loadGoalMetrics(monthStart, addMonths(monthStart, 1));
  const yearly = await loadGoalMetrics(yearStart, addDays(now, 1));

  const questGroups = [
    { key: todayKey, quests: buildQuests(today, todayDefinitions) },
    { key: `${weekly.day}:week`, quests: buildQuests(weekly, definitions.weekly) },
    { key: `${monthly.day}:month`, quests: buildQuests(monthly, definitions.monthly) },
    { key: `${yearly.day}:year`, quests: buildQuests(yearly, definitions.yearly) },
  ];
  const attendanceBonuses = buildAttendanceBonuses(todayKey, attendanceStreak);

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
    const claim = await db.runAsync(
        `
        INSERT OR IGNORE INTO app_daily_reward_claim (
          day, goal_id, reward_xp, badge_code, claimed_at
        ) VALUES (?, ?, ?, ?, datetime('now'))
        `,
        key,
        quest.id,
        quest.rewardXp,
        quest.badgeCode
      );
    if (claim.changes > 0) {
      rewardToast = { title: quest.title, xp: quest.rewardXp, badgeCode: quest.badgeCode };
    }
  }
  for (const bonus of attendanceBonuses) {
    if (!bonus.unlocked) continue;
    const claim = await db.runAsync(
        `
        INSERT OR IGNORE INTO app_daily_reward_claim (
          day, goal_id, reward_xp, badge_code, claimed_at
        ) VALUES (?, ?, ?, ?, datetime('now'))
        `,
        bonus.claimDay,
        bonus.id,
        bonus.rewardXp,
        bonus.badgeCode
      );
    if (claim.changes > 0) {
      rewardToast = { title: bonus.title, xp: bonus.rewardXp, badgeCode: bonus.badgeCode };
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
  const firstCalendarDay = calendarRows[0]?.day ?? todayKey;
  const plannedRows = await db.getAllAsync<{
    day: string;
    goal_id: string;
    title: string;
    description: string;
    target: number;
    reward_xp: number;
    badge_code: string;
  }>(
    `
    SELECT day, goal_id, title, description, target, reward_xp, badge_code
    FROM app_daily_goal_plan
    WHERE day >= ? AND day <= ?
    ORDER BY day ASC, created_at ASC, goal_id ASC
    `,
    firstCalendarDay,
    todayKey
  );
  const plannedDefinitionsByDay = plannedRows.reduce<Record<string, GoalDefinition[]>>((acc, row) => {
    acc[row.day] = acc[row.day] ?? [];
    if (acc[row.day].length < 3) {
      acc[row.day].push({
        id: row.goal_id,
        title: row.title,
        description: row.description,
        target: row.target,
        rewardXp: row.reward_xp,
        badgeCode: row.badge_code,
        unit: inferDailyGoalUnit(row.goal_id),
        period: 'daily',
      });
    }
    return acc;
  }, {});
  const goalCalendar = calendarRows.map((day) => {
    const dayDefinitions = plannedDefinitionsByDay[day.day] ?? definitions.daily;
    const quests = buildQuests(day, dayDefinitions);
    return {
      ...day,
      completed: quests.filter(isQuestComplete).length,
      total: quests.length,
    };
  });

  return {
    today,
    todayDefinitions,
    tomorrowDefinitions,
    weekly,
    monthly,
    yearly,
    rewardSummary: { xp: rewards?.xp ?? 0, badges: rewards?.badges ?? 0 },
    earnedBadgeCodes: badgeRows.map((row) => row.badge_code),
    goalCalendar,
    rewardToast,
  };
}

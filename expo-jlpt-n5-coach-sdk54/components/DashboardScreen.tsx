import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { styles } from '../appStyles';
import { buildBadgeViews } from '../services/badges';
import {
  ensureDailyGoalPlan,
  loadDashboardGoalData,
  loadDashboardMasteryDomains,
  loadDashboardOverviewData,
  loadDashboardQuizData,
} from '../services/dashboardData';
import {
  CALENDAR_HISTORY_DAYS,
  GOAL_PLAN_DAYS,
  calculateStudyStreak,
  emptyStats,
  formatChartDateTime,
  formatQuizModeLabel,
  formatSkillLabel,
  getLevelProgressFromXp,
} from '../services/progress';
import {
  addDays,
  formatDateKey,
  getMonthStart,
  getWeekStart,
} from '../services/goals';
import {
  BADGE_DEFINITIONS,
  DAILY_GOAL_DEFINITIONS,
  MONTHLY_GOAL_DEFINITIONS,
  WEEKLY_GOAL_DEFINITIONS,
  YEARLY_GOAL_DEFINITIONS,
  buildDailyQuests,
} from '../data/goalDefinitions';
import {
  ALL_GRAMMAR_LESSONS,
  emptyGrammarProgressSummary,
  getGrammarMainMenu,
} from '../services/grammarCourse';
import { loadGrammarProgressSummary } from '../services/grammarProgress';
import { formatElapsedTime } from '../services/time';
import type {
  DailyGoalDay,
  DailyGoalMetrics,
  DailyProgress,
  DashboardStats,
  DashboardTab,
  GrammarProgressSummary,
  MasteryDomainStats,
  QuizDashboardSummary,
  QuizModeProgress,
  QuizScoreTrend,
  RewardSummary,
  RewardToast,
  SkillProgress,
} from '../models';
import { RubricButton } from './shellUi';
import {
  BadgeCollection,
  CoachPremiumPanel,
  DailyGoalCalendar,
  EmptyText,
  LoadingView,
  MasteryDomainCard,
  Metric,
  ProgressRow,
  Section,
  StatsLineChart,
} from './sharedUi';

export function DashboardScreen() {
  const db = useSQLiteContext();
  const [loading, setLoading] = useState(true);
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('quiz');
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [weakSkills, setWeakSkills] = useState<SkillProgress[]>([]);
  const [masteredSkills, setMasteredSkills] = useState<SkillProgress[]>([]);
  const [dailyProgress, setDailyProgress] = useState<DailyProgress[]>([]);
  const [quizSummary, setQuizSummary] = useState<QuizDashboardSummary>({
    attempts: 0,
    correct: 0,
    rate: 0,
    todayAttempts: 0,
    kanaArcadeAttempts: 0,
    adaptiveAttempts: 0,
    examAttempts: 0,
    bestScore: 0,
    bestScoreTime: 0,
    bestStreak: 0,
    averageScore: 0,
    averageTime: 0,
  });
  const [quizDailyProgress, setQuizDailyProgress] = useState<DailyProgress[]>([]);
  const [quizModeProgress, setQuizModeProgress] = useState<QuizModeProgress[]>([]);
  const [quizScoreTrend, setQuizScoreTrend] = useState<QuizScoreTrend[]>([]);
  const [quizWeakSkills, setQuizWeakSkills] = useState<SkillProgress[]>([]);
  const [masteryDomains, setMasteryDomains] = useState<MasteryDomainStats[]>([]);
  const [grammarLessonSummary, setGrammarLessonSummary] = useState<GrammarProgressSummary>(emptyGrammarProgressSummary);
  const [todayGoalMetrics, setTodayGoalMetrics] = useState<DailyGoalMetrics>({
    day: formatDateKey(new Date()),
    attempts: 0,
    correct: 0,
    rate: 0,
    quizAttempts: 0,
    grammarActivities: 0,
  });
  const [weeklyGoalMetrics, setWeeklyGoalMetrics] = useState<DailyGoalMetrics>({
    day: formatDateKey(getWeekStart()),
    attempts: 0,
    correct: 0,
    rate: 0,
    quizAttempts: 0,
    grammarActivities: 0,
  });
  const [monthlyGoalMetrics, setMonthlyGoalMetrics] = useState<DailyGoalMetrics>({
    day: formatDateKey(getMonthStart()),
    attempts: 0,
    correct: 0,
    rate: 0,
    quizAttempts: 0,
    grammarActivities: 0,
  });
  const [yearlyGoalMetrics, setYearlyGoalMetrics] = useState<DailyGoalMetrics>({
    day: formatDateKey(addDays(new Date(), -(CALENDAR_HISTORY_DAYS - 1))),
    attempts: 0,
    correct: 0,
    rate: 0,
    quizAttempts: 0,
    grammarActivities: 0,
    activeDays: 0,
  });
  const [goalCalendar, setGoalCalendar] = useState<DailyGoalDay[]>([]);
  const [rewardSummary, setRewardSummary] = useState<RewardSummary>({ xp: 0, badges: 0 });
  const [earnedBadgeCodes, setEarnedBadgeCodes] = useState<string[]>([]);
  const [rewardToast, setRewardToast] = useState<RewardToast | null>(null);
  const rewardAnim = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await ensureDailyGoalPlan(db, DAILY_GOAL_DEFINITIONS, GOAL_PLAN_DAYS);
      const grammarProgress = await loadGrammarProgressSummary(db, ALL_GRAMMAR_LESSONS, getGrammarMainMenu);
      setGrammarLessonSummary(grammarProgress);
      const overview = await loadDashboardOverviewData(db, grammarProgress.total);
      const todayAttempts = overview.stats.todayAttempts;
      const todayCorrect = overview.stats.todayCorrect;
      setStats(overview.stats);
      setWeakSkills(overview.weakSkills);
      setMasteredSkills(overview.masteredSkills);
      setDailyProgress(overview.dailyProgress);

      const quizData = await loadDashboardQuizData(db);
      setQuizSummary(quizData.summary);
      setQuizDailyProgress(quizData.dailyProgress);
      setQuizModeProgress(quizData.modeProgress);
      setQuizScoreTrend(quizData.scoreTrend);
      setQuizWeakSkills(quizData.weakSkills);

      setMasteryDomains(await loadDashboardMasteryDomains(db, grammarProgress));

      const goalData = await loadDashboardGoalData(
        db,
        {
          daily: DAILY_GOAL_DEFINITIONS,
          weekly: WEEKLY_GOAL_DEFINITIONS,
          monthly: MONTHLY_GOAL_DEFINITIONS,
          yearly: YEARLY_GOAL_DEFINITIONS,
        },
        CALENDAR_HISTORY_DAYS,
        todayAttempts,
        todayCorrect
      );
      setTodayGoalMetrics(goalData.today);
      setWeeklyGoalMetrics(goalData.weekly);
      setMonthlyGoalMetrics(goalData.monthly);
      setYearlyGoalMetrics(goalData.yearly);
      setRewardSummary(goalData.rewardSummary);
      setEarnedBadgeCodes(goalData.earnedBadgeCodes);
      setGoalCalendar(goalData.goalCalendar);
      if (goalData.rewardToast) setRewardToast(goalData.rewardToast);
    } catch (error) {
      console.error('Unable to load dashboard stats', error);
      setStats(emptyStats);
      setWeakSkills([]);
      setMasteredSkills([]);
      setDailyProgress([]);
      setQuizDailyProgress([]);
      setQuizModeProgress([]);
      setQuizScoreTrend([]);
      setQuizWeakSkills([]);
      setMasteryDomains([]);
      setGrammarLessonSummary(emptyGrammarProgressSummary);
      setGoalCalendar([]);
      setRewardSummary({ xp: 0, badges: 0 });
      setEarnedBadgeCodes([]);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!rewardToast) return;
    rewardAnim.setValue(0);
    Animated.sequence([
      Animated.timing(rewardAnim, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.timing(rewardAnim, {
        toValue: 0,
        duration: 520,
        delay: 1800,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setRewardToast(null);
    });
  }, [rewardAnim, rewardToast]);

  const masteryTotal = masteryDomains.reduce(
    (acc, domain) => ({
      total: acc.total + domain.total,
      mastered: acc.mastered + domain.mastered,
      known: acc.known + domain.known,
      review: acc.review + domain.review,
      unseen: acc.unseen + domain.unseen,
    }),
    { total: 0, mastered: 0, known: 0, review: 0, unseen: 0 }
  );
  const masteryRate =
    masteryTotal.total > 0 ? Math.round((masteryTotal.mastered / masteryTotal.total) * 100) : 0;
  const remainingToMaster = Math.max(0, masteryTotal.total - masteryTotal.mastered);
  const streakDays = calculateStudyStreak(dailyProgress);
  const xpTotal =
    stats.correctRate * 3 +
    stats.attempts * 10 +
    masteryTotal.mastered * 25 +
    masteryTotal.known * 8 +
    quizSummary.bestScore +
    rewardSummary.xp;
  const levelProgress = getLevelProgressFromXp(xpTotal);
  const { level, xpCurrentLevel, xpRequiredForLevel, xpToNextLevel } = levelProgress;
  const examReadiness = Math.min(100, Math.round(masteryRate * 0.55 + quizSummary.rate * 0.35 + Math.min(streakDays, 10)));
  const recommendedDomain =
    masteryDomains
      .slice()
      .sort((a, b) => b.review - a.review || b.unseen - a.unseen || b.total - b.mastered - (a.total - a.mastered))[0] ??
    null;
  const coachQuests = buildDailyQuests(todayGoalMetrics);
  const badgeViews = buildBadgeViews({
    stats,
    quizSummary,
    masteryDomains,
    grammarLessons: grammarLessonSummary,
    goalCalendar,
    earnedBadgeCodes,
    streakDays,
    level,
  });
  const unlockedBadgeCount = badgeViews.filter((badge) => badge.unlocked).length;

  if (loading) {
    return <LoadingView />;
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.statsRubrics}>
        <RubricButton label="Résumé" active={dashboardTab === 'overview'} onPress={() => setDashboardTab('overview')} />
        <RubricButton label="Quiz" active={dashboardTab === 'quiz'} onPress={() => setDashboardTab('quiz')} />
        <RubricButton label="Maîtrise" active={dashboardTab === 'mastery'} onPress={() => setDashboardTab('mastery')} />
        <RubricButton label="Progression" active={dashboardTab === 'progress'} onPress={() => setDashboardTab('progress')} />
        <RubricButton label="À travailler" active={dashboardTab === 'focus'} onPress={() => setDashboardTab('focus')} />
      </View>

      {dashboardTab === 'overview' && (
        <>
          {rewardToast && (
            <Animated.View
              style={[
                styles.rewardToast,
                {
                  opacity: rewardAnim,
                  transform: [
                    {
                      translateY: rewardAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-12, 0],
                      }),
                    },
                    {
                      scale: rewardAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.96, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.rewardToastBadge}>{rewardToast.badgeCode}</Text>
              <View style={styles.rewardToastCopy}>
                <Text style={styles.rewardToastTitle}>Récompense gagnée</Text>
                <Text style={styles.rewardToastText}>{rewardToast.title} · +{rewardToast.xp} XP</Text>
              </View>
            </Animated.View>
          )}

          <CoachPremiumPanel
            examReadiness={examReadiness}
            level={level}
            xpCurrentLevel={xpCurrentLevel}
            xpRequiredForLevel={xpRequiredForLevel}
            xpToNextLevel={xpToNextLevel}
            streakDays={streakDays}
            quests={coachQuests}
            goalCalendar={goalCalendar}
            recommendedDomain={recommendedDomain}
            rewardSummary={{ ...rewardSummary, badges: unlockedBadgeCount }}
          />

          <Section title="Calendrier des badges journaliers">
            <DailyGoalCalendar days={goalCalendar} />
          </Section>

          <Section title="Collection de badges">
            <BadgeCollection badges={badgeViews} />
          </Section>

          <Section title="Vue générale">
            <View style={styles.statsGrid}>
              <Metric label="Questions" value={stats.questions} />
              <Metric label="Vocabulaire" value={stats.vocabulary} />
              <Metric label="Grammaire" value={stats.grammar} />
              <Metric label="Kanji" value={stats.kanji} />
              <Metric label="Kana" value={stats.kana} />
              <Metric label="Audio" value={stats.audio} />
            </View>
          </Section>

          <Section title="Progression globale">
            <View style={styles.statsGrid}>
              <Metric label="Réponses" value={stats.attempts} />
              <Metric label="Aujourd'hui" value={stats.todayAttempts} />
              <Metric label="Réussite" value={`${stats.correctRate}%`} />
            </View>
          </Section>
        </>
      )}

      {dashboardTab === 'quiz' && (
        <>
          <Section title="Performance Quiz">
            <View style={styles.quizStatsHero}>
              <View>
                <Text style={styles.quizStatsKicker}>Performance globale</Text>
                <Text style={styles.quizStatsScore}>{quizSummary.rate}%</Text>
                <Text style={styles.quizStatsMeta}>
                  {quizSummary.correct}/{quizSummary.attempts} réponses justes · {quizSummary.todayAttempts} aujourd'hui
                </Text>
              </View>
              <View style={styles.quizStatsBadge}>
                <Text style={styles.quizStatsBadgeValue}>{quizSummary.bestScore}</Text>
                <Text style={styles.quizStatsBadgeLabel}>meilleur score</Text>
              </View>
            </View>
            <View style={styles.statsGrid}>
              <Metric label="Quiz Kana" value={quizSummary.kanaArcadeAttempts} />
              <Metric label="Quiz JLPT" value={quizSummary.adaptiveAttempts} />
              <Metric label="Mode examen" value={quizSummary.examAttempts} />
              <Metric label="Score moyen" value={quizSummary.averageScore || '-'} />
              <Metric label="Meilleur temps" value={quizSummary.bestScoreTime ? formatElapsedTime(quizSummary.bestScoreTime) : '-'} />
              <Metric label="Série max" value={quizSummary.bestStreak} />
            </View>
          </Section>

          <Section title="Courbe de réussite quiz">
            {quizDailyProgress.length === 0 ? (
              <EmptyText text="Les courbes quiz apparaîtront après quelques réponses." />
            ) : (
              <StatsLineChart
                points={quizDailyProgress.map((day) => ({ label: day.day.slice(5), detail: day.day, value: day.rate }))}
                suffix="%"
                maxValue={100}
                color="#186B63"
                xAxisLabel="Date"
                yAxisLabel="Réussite"
              />
            )}
          </Section>

          <Section title="Courbe des scores Kana">
            {quizScoreTrend.length === 0 ? (
              <EmptyText text="Termine un Quiz Kana pour voir l'évolution des scores." />
            ) : (
              <StatsLineChart
                points={quizScoreTrend.map((item) => ({
                  label: item.label,
                  detail: formatChartDateTime(item.created_at),
                  value: item.score,
                }))}
                suffix=" pts"
                color="#B45A46"
                xAxisLabel="Session"
                yAxisLabel="Score"
              />
            )}
          </Section>

          <Section title="Répartition par mode">
            {quizModeProgress.length === 0 ? (
              <EmptyText text="Les modes de quiz apparaîtront après tes prochaines sessions." />
            ) : (
              quizModeProgress.map((mode) => (
                <ProgressRow
                  key={mode.source_mode}
                  label={formatQuizModeLabel(mode.source_mode)}
                  detail={`${mode.correct}/${mode.attempts} réponses justes`}
                  rate={mode.rate}
                />
              ))
            )}
          </Section>
        </>
      )}

      {dashboardTab === 'mastery' && (
        <>
          <Section title="Tableau de maîtrise JLPT N5">
            <View style={styles.masteryHero}>
              <View>
                <Text style={styles.quizStatsKicker}>Maîtrise globale</Text>
                <Text style={styles.quizStatsScore}>{masteryRate}%</Text>
                <Text style={styles.quizStatsMeta}>
                  {masteryTotal.mastered}/{masteryTotal.total} éléments maîtrisés · {remainingToMaster} à maîtriser
                </Text>
              </View>
              <View style={styles.masteryRing}>
                <Text style={styles.masteryRingValue}>{remainingToMaster}</Text>
                <Text style={styles.masteryRingLabel}>restants</Text>
              </View>
            </View>
            <View style={styles.statsGrid}>
              <Metric label="Maîtrisés" value={masteryTotal.mastered} />
              <Metric label="Connus" value={masteryTotal.known} />
              <Metric label="À revoir" value={masteryTotal.review} />
              <Metric label="Jamais vus" value={masteryTotal.unseen} />
            </View>
          </Section>

          <Section title="Maîtrise par domaine">
            {masteryDomains.length === 0 ? (
              <EmptyText text="Les statistiques de maîtrise apparaîtront avec ton apprentissage." />
            ) : (
              masteryDomains.map((domain) => <MasteryDomainCard key={domain.id} domain={domain} />)
            )}
          </Section>

          <Section title="Ce qui reste à maîtriser">
            {masteryDomains.length === 0 ? (
              <EmptyText text="Aucune donnée de maîtrise disponible pour le moment." />
            ) : (
              masteryDomains
                .slice()
                .sort((a, b) => b.total - b.mastered - (a.total - a.mastered))
                .map((domain) => (
                  <ProgressRow
                    key={`remaining-${domain.id}`}
                    label={domain.label}
                    detail={`${Math.max(0, domain.total - domain.mastered)} éléments encore à maîtriser · ${domain.review} à revoir`}
                    rate={domain.total > 0 ? Math.round((domain.mastered / domain.total) * 100) : 0}
                  />
                ))
            )}
          </Section>
        </>
      )}

      {dashboardTab === 'progress' && (
        <>
          <Section title="Courbe générale">
            {dailyProgress.length === 0 ? (
              <EmptyText text="Réponds à quelques questions pour voir ton évolution." />
            ) : (
              <StatsLineChart
                points={dailyProgress.map((day) => ({ label: day.day.slice(5), detail: day.day, value: day.rate }))}
                suffix="%"
                maxValue={100}
                color="#186B63"
                xAxisLabel="Date"
                yAxisLabel="Réussite"
              />
            )}
          </Section>

          <Section title="Détail jour par jour">
            {dailyProgress.length === 0 ? (
              <EmptyText text="Réponds à quelques questions pour voir ton évolution." />
            ) : (
              dailyProgress.map((day) => (
                <ProgressRow
                  key={day.day}
                  label={day.day}
                  detail={`${day.correct}/${day.attempts} réponses justes`}
                  rate={day.rate}
                />
              ))
            )}
          </Section>
        </>
      )}

      {dashboardTab === 'focus' && (
        <>
          <Section title="Points faibles quiz">
            {quizWeakSkills.length === 0 ? (
              <EmptyText text="Les points faibles quiz apparaîtront après quelques réponses." />
            ) : (
              quizWeakSkills.map((skill) => (
                <ProgressRow
                  key={skill.skill_id}
                  label={formatSkillLabel(skill.skill_id)}
                  detail={`${skill.correct}/${skill.attempts} réponses justes`}
                  rate={skill.rate}
                />
              ))
            )}
          </Section>

          <Section title="À renforcer">
            {weakSkills.length === 0 ? (
              <EmptyText text="Les points faibles apparaîtront après quelques réponses." />
            ) : (
              weakSkills.map((skill) => (
                <ProgressRow
                  key={skill.skill_id}
                  label={formatSkillLabel(skill.skill_id)}
                  detail={`${skill.correct}/${skill.attempts} réponses justes`}
                  rate={skill.rate}
                />
              ))
            )}
          </Section>

          <Section title="Mieux maîtrisé">
            {masteredSkills.length === 0 ? (
              <EmptyText text="Les maîtrises apparaîtront avec ton historique." />
            ) : (
              masteredSkills.map((skill) => (
                <ProgressRow
                  key={skill.skill_id}
                  label={formatSkillLabel(skill.skill_id)}
                  detail={`${skill.correct}/${skill.attempts} réponses justes`}
                  rate={skill.rate}
                />
              ))
            )}
          </Section>
        </>
      )}
    </ScrollView>
  );
}

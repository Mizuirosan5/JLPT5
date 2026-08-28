import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
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
  buildQuests,
  formatDateKey,
  getMonthStart,
  getWeekStart,
  type GoalDefinition,
} from '../services/goals';
import {
  BADGE_DEFINITIONS,
  DAILY_GOAL_DEFINITIONS,
  MONTHLY_GOAL_DEFINITIONS,
  WEEKLY_GOAL_DEFINITIONS,
  YEARLY_GOAL_DEFINITIONS,
} from '../data/goalDefinitions';
import {
  ALL_GRAMMAR_LESSONS,
  emptyGrammarProgressSummary,
  getGrammarMainMenu,
} from '../services/grammarCourse';
import { loadGrammarProgressSummary } from '../services/grammarProgress';
import { formatElapsedTime } from '../services/time';
import { loadSrsOverview } from '../services/srs';
import { buildLocalLeagueStatus, saveLocalLeagueSeason } from '../services/localLeague';
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
  Screen,
  SkillProgress,
  SrsOverview,
} from '../models';
import { RubricButton } from './shellUi';
import { useReducedMotion } from '../services/useReducedMotion';
import {
  BadgeCollection,
  CoachPremiumPanel,
  EmptyText,
  LoadingView,
  MasteryDomainCard,
  Metric,
  ProgressRow,
  Section,
  StatsLineChart,
} from './sharedUi';

export function DashboardScreen({ onNavigate }: { onNavigate?: (screen: Screen) => void }) {
  const db = useSQLiteContext();
  const reducedMotion = useReducedMotion();
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
  const [todayGoalDefinitions, setTodayGoalDefinitions] = useState<GoalDefinition[]>(DAILY_GOAL_DEFINITIONS);
  const [tomorrowGoalDefinitions, setTomorrowGoalDefinitions] = useState<GoalDefinition[]>([]);
  const [rewardSummary, setRewardSummary] = useState<RewardSummary>({ xp: 0, badges: 0 });
  const [earnedBadgeCodes, setEarnedBadgeCodes] = useState<string[]>([]);
  const [rewardToast, setRewardToast] = useState<RewardToast | null>(null);
  const [srsOverview, setSrsOverview] = useState<SrsOverview>({
    dueToday: 0,
    fragile: 0,
    known: 0,
    solid: 0,
    mastered: 0,
    total: 0,
    nextDueAt: null,
  });
  const rewardAnim = useRef(new Animated.Value(0)).current;
  const leagueAnim = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const grammarProgress = await loadGrammarProgressSummary(db, ALL_GRAMMAR_LESSONS, getGrammarMainMenu);
      setGrammarLessonSummary(grammarProgress);
      const [overview, quizData] = await Promise.all([
        loadDashboardOverviewData(db, grammarProgress.total),
        loadDashboardQuizData(db),
      ]);
      const todayAttempts = overview.stats.todayAttempts;
      const todayCorrect = overview.stats.todayCorrect;
      setStats(overview.stats);
      setWeakSkills(overview.weakSkills);
      setMasteredSkills(overview.masteredSkills);
      setDailyProgress(overview.dailyProgress);
      setQuizSummary(quizData.summary);
      setQuizDailyProgress(quizData.dailyProgress);
      setQuizModeProgress(quizData.modeProgress);
      setQuizScoreTrend(quizData.scoreTrend);
      setQuizWeakSkills(quizData.weakSkills);
      setLoading(false);

      try {
        const [masteryData, goalData, srsData] = await Promise.all([
          loadDashboardMasteryDomains(db, grammarProgress),
          (async () => {
            await ensureDailyGoalPlan(db, DAILY_GOAL_DEFINITIONS, GOAL_PLAN_DAYS);
            return loadDashboardGoalData(
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
          })(),
          loadSrsOverview(db),
        ]);

        setMasteryDomains(masteryData);
        setTodayGoalMetrics(goalData.today);
        setWeeklyGoalMetrics(goalData.weekly);
        setMonthlyGoalMetrics(goalData.monthly);
        setYearlyGoalMetrics(goalData.yearly);
        setTodayGoalDefinitions(goalData.todayDefinitions);
        setTomorrowGoalDefinitions(goalData.tomorrowDefinitions);
        setRewardSummary(goalData.rewardSummary);
        setEarnedBadgeCodes(goalData.earnedBadgeCodes);
        setGoalCalendar(goalData.goalCalendar);
        setSrsOverview(srsData);
        if (goalData.rewardToast) setRewardToast(goalData.rewardToast);
      } catch (secondaryError) {
        console.warn('Unable to load secondary dashboard blocks', secondaryError);
      }
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
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!rewardToast) return;
    rewardAnim.setValue(0);
    if (reducedMotion) {
      rewardAnim.setValue(1);
      const timer = setTimeout(() => setRewardToast(null), getRewardCelebrationDuration(rewardToast));
      return () => clearTimeout(timer);
    }
    Animated.sequence([
      Animated.timing(rewardAnim, {
        toValue: 1,
        duration: 520,
        useNativeDriver: true,
      }),
      Animated.timing(rewardAnim, {
        toValue: 0,
        duration: 620,
        delay: getRewardCelebrationDuration(rewardToast),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setRewardToast(null);
    });
  }, [reducedMotion, rewardAnim, rewardToast]);

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
  const localLeague = buildLocalLeagueStatus({
    activeDays: streakDays,
    level,
    weeklyAttempts: weeklyGoalMetrics.attempts,
    xpCurrentLevel,
    xpRequiredForLevel,
  });
  const examReadiness = Math.min(100, Math.round(masteryRate * 0.55 + quizSummary.rate * 0.35 + Math.min(streakDays, 10)));
  const recommendedDomain =
    masteryDomains
      .slice()
      .sort((a, b) => b.review - a.review || b.unseen - a.unseen || b.total - b.mastered - (a.total - a.mastered))[0] ??
    null;
  const coachQuests = buildQuests(todayGoalMetrics, todayGoalDefinitions);
  const tomorrowQuests = buildQuests(
    { day: formatDateKey(addDays(new Date(), 1)), attempts: 0, correct: 0, rate: 0, quizAttempts: 0, grammarActivities: 0 },
    tomorrowGoalDefinitions
  );
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

  useEffect(() => {
    if (loading) return;
    saveLocalLeagueSeason(db, localLeague, xpTotal, streakDays).catch((error) => {
      console.error('Unable to save local league season', error);
    });
  }, [db, loading, localLeague, streakDays, xpTotal]);

  useEffect(() => {
    if (!localLeague.promoted || reducedMotion) {
      leagueAnim.setValue(0);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(leagueAnim, { toValue: 1, duration: 720, useNativeDriver: true }),
        Animated.timing(leagueAnim, { toValue: 0, duration: 720, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [leagueAnim, localLeague.promoted, reducedMotion]);

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
          <RewardCelebrationOverlay reward={rewardToast} anim={rewardAnim} reducedMotion={reducedMotion} onClose={() => setRewardToast(null)} />

          <CoachPremiumPanel
            examReadiness={examReadiness}
            level={level}
            xpCurrentLevel={xpCurrentLevel}
            xpRequiredForLevel={xpRequiredForLevel}
            xpToNextLevel={xpToNextLevel}
            streakDays={streakDays}
            quests={coachQuests}
            nextQuests={tomorrowQuests}
            srsOverview={srsOverview}
            onOpenReview={() => onNavigate?.('review')}
            goalCalendar={goalCalendar}
            recommendedDomain={recommendedDomain}
            rewardSummary={{ ...rewardSummary, badges: unlockedBadgeCount }}
          />

          <Pressable onPress={() => onNavigate?.('quick')} style={styles.dailyTrackingCard}>
            <View style={styles.dailyTrackingHeader}>
              <View>
                <Text style={styles.dailyTrackingKicker}>Session rapide</Text>
                <Text style={styles.dailyTrackingTitle}>5 minutes pour aujourd’hui</Text>
              </View>
              <Text style={styles.dailyTrackingBadge}>GO</Text>
            </View>
            <Text style={styles.dailyTrackingMeta}>
              Mélange intelligent entre révisions SRS, point faible et nouvelle notion adaptée au niveau actuel.
            </Text>
          </Pressable>

          <View style={styles.dailyTrackingCard}>
            <View style={styles.dailyTrackingHeader}>
              <View>
                <Text style={styles.dailyTrackingKicker}>Ligue locale</Text>
                <Text style={styles.dailyTrackingTitle}>{localLeague.current.name}</Text>
              </View>
              <Animated.Text
                style={[
                  styles.dailyTrackingBadge,
                  localLeague.promoted && {
                    transform: [{ scale: leagueAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }],
                    opacity: leagueAnim.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] }),
                  },
                ]}
              >
                {localLeague.current.symbol}
              </Animated.Text>
            </View>
            <View style={styles.pathProgressTrack}>
              <View style={[styles.pathProgressFill, { width: `${localLeague.progress}%` }]} />
            </View>
            <View style={styles.dailyTrackingStats}>
              <View style={styles.dailyTrackingStat}>
                <Text style={styles.dailyTrackingValue}>{localLeague.weeklyPoints}</Text>
                <Text style={styles.dailyTrackingLabel}>points</Text>
              </View>
              <View style={styles.dailyTrackingStat}>
                <Text style={styles.dailyTrackingValue}>{localLeague.promotionTarget}</Text>
                <Text style={styles.dailyTrackingLabel}>promotion</Text>
              </View>
              <View style={styles.dailyTrackingStat}>
                <Text style={styles.dailyTrackingValue}>{localLeague.maintenanceTarget}</Text>
                <Text style={styles.dailyTrackingLabel}>maintien</Text>
              </View>
            </View>
            <Text style={styles.dailyTrackingHint}>
              {localLeague.promoted ? 'Promotion débloquée cette semaine. ' : ''}
              {localLeague.statusLabel} · {localLeague.statusDetail}
            </Text>
          </View>

          <Pressable onPress={() => onNavigate?.('review')} style={styles.dailyTrackingCard}>
            <View style={styles.dailyTrackingHeader}>
              <View>
                <Text style={styles.dailyTrackingKicker}>A revoir aujourd’hui</Text>
                <Text style={styles.dailyTrackingTitle}>{srsOverview.dueToday} revision{srsOverview.dueToday > 1 ? 's' : ''} due{srsOverview.dueToday > 1 ? 's' : ''}</Text>
              </View>
              <Text style={styles.dailyTrackingBadge}>SRS</Text>
            </View>
            <View style={styles.dailyTrackingStats}>
              <View style={styles.dailyTrackingStat}>
                <Text style={styles.dailyTrackingValue}>{srsOverview.fragile}</Text>
                <Text style={styles.dailyTrackingLabel}>fragiles</Text>
              </View>
              <View style={styles.dailyTrackingStat}>
                <Text style={styles.dailyTrackingValue}>{srsOverview.known}</Text>
                <Text style={styles.dailyTrackingLabel}>connus</Text>
              </View>
              <View style={styles.dailyTrackingStat}>
                <Text style={styles.dailyTrackingValue}>{srsOverview.mastered}</Text>
                <Text style={styles.dailyTrackingLabel}>maîtrisés</Text>
              </View>
            </View>
            <Text style={styles.dailyTrackingMeta}>Ouvrir la file de revision et lancer une session courte de 10 items.</Text>
          </Pressable>

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
                  {quizSummary.correct}/{quizSummary.attempts} réponses justes · {quizSummary.todayAttempts} aujourd’hui
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
                color="#152B3A"
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
                color="#152B3A"
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

function getRewardCelebrationKind(reward: RewardToast | null): 'daily' | 'streak' | 'epic' | 'badge' {
  if (!reward) return 'daily';
  if (reward.badgeCode.includes('ASSIDUITE-7') || reward.xp >= 700) return 'epic';
  if (reward.badgeCode.includes('ASSIDUITE-3') || reward.xp >= 250) return 'streak';
  if (!reward.badgeCode.includes('XP') && !reward.badgeCode.includes('ASSIDUITE-1')) return 'badge';
  return 'daily';
}

function getRewardCelebrationDuration(reward: RewardToast | null): number {
  const kind = getRewardCelebrationKind(reward);
  if (kind === 'epic') return 3200;
  if (kind === 'streak' || kind === 'badge') return 2500;
  return 1600;
}

function getRewardCelebrationCopy(reward: RewardToast): { kicker: string; title: string; subtitle: string; symbol: string } {
  const kind = getRewardCelebrationKind(reward);
  if (kind === 'epic') {
    return {
      kicker: 'Palier majeur',
      title: '7 jours de suite',
      subtitle: 'La routine est installée. Bonus de continuite débloqué.',
      symbol: '連七',
    };
  }
  if (kind === 'streak') {
    return {
      kicker: 'Série validée',
      title: '3 jours de suite',
      subtitle: 'Tu construis une vraie habitude de travail.',
      symbol: '連三',
    };
  }
  if (kind === 'badge') {
    return {
      kicker: 'Badge obtenu',
      title: reward.title,
      subtitle: 'Nouvelle récompense ajoutée à ta progression.',
      symbol: '賞',
    };
  }
  return {
    kicker: 'Jour travaille',
    title: 'Assiduité validee',
    subtitle: 'Une journee active de plus dans ton parcours N5.',
    symbol: '日',
  };
}

function RewardCelebrationOverlay({
  reward,
  anim,
  reducedMotion,
  onClose,
}: {
  reward: RewardToast | null;
  anim: Animated.Value;
  reducedMotion: boolean;
  onClose: () => void;
}) {
  if (!reward) return null;
  const kind = getRewardCelebrationKind(reward);
  const copy = getRewardCelebrationCopy(reward);
  const isEpic = kind === 'epic';
  const particleCount = isEpic ? 18 : kind === 'daily' ? 8 : 12;
  const particles = Array.from({ length: particleCount }, (_, index) => index);

  return (
    <Animated.View
      style={[
        styles.rewardCelebrationLayer,
        {
          opacity: anim,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.rewardCelebrationBackdrop,
          {
            opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0, isEpic ? 0.78 : 0.58] }),
          },
        ]}
      />
      <Pressable style={styles.rewardCelebrationTapCatcher} onPress={onClose}>
        <Animated.View
          style={[
            styles.rewardCelebrationCard,
            isEpic && styles.rewardCelebrationCardEpic,
            {
              transform: [
                {
                  translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [42, 0] }),
                },
                {
                  scale: anim.interpolate({ inputRange: [0, 0.55, 1], outputRange: [0.78, 1.06, 1] }),
                },
              ],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.rewardCelebrationHalo,
              isEpic && styles.rewardCelebrationHaloEpic,
              {
                opacity: anim.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, 1, 0.72] }),
                transform: [
                  { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1.45] }) },
                  {
                    rotate: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['-16deg', '18deg'],
                    }),
                  },
                ],
              },
            ]}
          />
          {!reducedMotion && particles.map((particle) => (
            <Animated.View
              key={particle}
              style={[
                styles.rewardCelebrationParticle,
                particle % 3 === 0 && styles.rewardCelebrationParticleRed,
                particle % 3 === 1 && styles.rewardCelebrationParticleTeal,
                {
                  left: `${8 + ((particle * 19) % 84)}%`,
                  top: `${8 + ((particle * 31) % 72)}%`,
                  opacity: anim.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 1, 0] }),
                  transform: [
                    {
                      translateY: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [24, -28 - (particle % 5) * 8],
                      }),
                    },
                    {
                      translateX: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, particle % 2 === 0 ? 20 + particle : -20 - particle],
                      }),
                    },
                    {
                      rotate: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', `${120 + particle * 17}deg`],
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
          <Animated.View
            style={[
              styles.rewardCelebrationMedal,
              isEpic && styles.rewardCelebrationMedalEpic,
              {
                transform: [
                  { scale: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 1.18, 1] }) },
                  {
                    rotate: anim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: ['-10deg', '8deg', '0deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={[styles.rewardCelebrationMedalText, isEpic && styles.rewardCelebrationMedalTextEpic]}>
              {copy.symbol}
            </Text>
          </Animated.View>
          <Text style={styles.rewardCelebrationKicker}>{copy.kicker}</Text>
          <Text style={[styles.rewardCelebrationTitle, isEpic && styles.rewardCelebrationTitleEpic]}>{copy.title}</Text>
          <Text style={styles.rewardCelebrationSubtitle}>{copy.subtitle}</Text>
          <Animated.View
            style={[
              styles.rewardCelebrationXpPill,
              {
                transform: [{ scale: anim.interpolate({ inputRange: [0, 0.65, 1], outputRange: [0.85, 1.08, 1] }) }],
              },
            ]}
          >
            <Text style={styles.rewardCelebrationXp}>+{reward.xp} XP</Text>
          </Animated.View>
          <Text style={styles.rewardCelebrationHint}>Touchez pour fermer</Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

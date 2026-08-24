import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { styles } from '../appStyles';
import { DAILY_GOAL_DEFINITIONS, MONTHLY_GOAL_DEFINITIONS, WEEKLY_GOAL_DEFINITIONS, YEARLY_GOAL_DEFINITIONS } from '../data/goalDefinitions';
import type { CoachQuest, DailyGoalMetrics, DashboardStats, MasteryDomainStats, QuizDashboardSummary, Screen, SrsOverview } from '../models';
import { ensureDailyGoalPlan, loadDashboardGoalData, loadDashboardMasteryDomains, loadDashboardOverviewData, loadDashboardQuizData } from '../services/dashboardData';
import { ALL_GRAMMAR_LESSONS, getGrammarMainMenu } from '../services/grammarCourse';
import { loadGrammarProgressSummary } from '../services/grammarProgress';
import { buildQuests, formatDateKey, isQuestComplete } from '../services/goals';
import { calculateStudyStreak, emptyStats, formatSkillLabel, getLevelProgressFromXp } from '../services/progress';
import { loadSrsOverview } from '../services/srs';
import { DailyQuestCard, LoadingView, Section } from './sharedUi';

const EMPTY_SRS: SrsOverview = { dueToday: 0, fragile: 0, known: 0, solid: 0, mastered: 0, total: 0, nextDueAt: null };
const EMPTY_QUIZ: QuizDashboardSummary = { attempts: 0, correct: 0, rate: 0, todayAttempts: 0, kanaArcadeAttempts: 0, adaptiveAttempts: 0, examAttempts: 0, bestScore: 0, bestScoreTime: 0, bestStreak: 0, averageScore: 0, averageTime: 0 };
const EMPTY_GOALS: DailyGoalMetrics = { day: formatDateKey(new Date()), attempts: 0, correct: 0, rate: 0, quizAttempts: 0, grammarActivities: 0 };

export function TodayScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const db = useSQLiteContext();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [quizSummary, setQuizSummary] = useState<QuizDashboardSummary>(EMPTY_QUIZ);
  const [masteryDomains, setMasteryDomains] = useState<MasteryDomainStats[]>([]);
  const [dailyProgress, setDailyProgress] = useState<Array<{ day: string; attempts: number; correct: number; rate: number }>>([]);
  const [goalMetrics, setGoalMetrics] = useState<DailyGoalMetrics>(EMPTY_GOALS);
  const [goalDefinitions, setGoalDefinitions] = useState(DAILY_GOAL_DEFINITIONS);
  const [rewardXp, setRewardXp] = useState(0);
  const [srs, setSrs] = useState<SrsOverview>(EMPTY_SRS);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const grammar = await loadGrammarProgressSummary(db, ALL_GRAMMAR_LESSONS, getGrammarMainMenu);
      const [overview, quiz, mastery, srsData] = await Promise.all([
        loadDashboardOverviewData(db, grammar.total),
        loadDashboardQuizData(db),
        loadDashboardMasteryDomains(db, grammar),
        loadSrsOverview(db),
      ]);
      await ensureDailyGoalPlan(db, DAILY_GOAL_DEFINITIONS, 2);
      const goals = await loadDashboardGoalData(
        db,
        { daily: DAILY_GOAL_DEFINITIONS, weekly: WEEKLY_GOAL_DEFINITIONS, monthly: MONTHLY_GOAL_DEFINITIONS, yearly: YEARLY_GOAL_DEFINITIONS },
        14,
        overview.stats.todayAttempts,
        overview.stats.todayCorrect
      );
      setStats(overview.stats);
      setQuizSummary(quiz.summary);
      setMasteryDomains(mastery);
      setDailyProgress(overview.dailyProgress);
      setGoalMetrics(goals.today);
      setGoalDefinitions(goals.todayDefinitions);
      setRewardXp(goals.rewardSummary.xp);
      setSrs(srsData);
    } catch (error) {
      console.error('Unable to load today screen', error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => { load(); }, [load]);

  const quests = useMemo<CoachQuest[]>(() => buildQuests(goalMetrics, goalDefinitions), [goalDefinitions, goalMetrics]);
  const completedGoals = quests.filter(isQuestComplete).length;
  const streakDays = calculateStudyStreak(dailyProgress);
  const mastery = masteryDomains.reduce((sum, domain) => sum + domain.mastered, 0);
  const known = masteryDomains.reduce((sum, domain) => sum + domain.known, 0);
  const level = getLevelProgressFromXp(stats.correctRate * 3 + stats.attempts * 10 + mastery * 25 + known * 8 + quizSummary.bestScore + rewardXp).level;
  const priority = masteryDomains.slice().sort((a, b) => b.review - a.review || b.unseen - a.unseen || (b.total - b.mastered) - (a.total - a.mastered))[0] ?? null;
  const weakSkill = priority?.label ?? 'fondamentaux N5';
  const todayLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  if (loading) return <LoadingView />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.todayHero}>
        <View style={styles.todayHeroHeader}>
          <View style={styles.todayHeroCopy}>
            <Text style={styles.todayKicker}>{todayLabel}</Text>
            <Text style={styles.todayTitle}>Aujourd’hui</Text>
            <Text style={styles.todaySubtitle}>Une session courte, guidée par tes révisions et ta progression réelle.</Text>
          </View>
          <View style={styles.todayMark}><Text style={styles.todayMarkText}>今</Text></View>
        </View>
        <View style={styles.todayRecommendation}>
          <Text style={styles.todayRecommendationLabel}>Priorité recommandée</Text>
          <Text style={styles.todayRecommendationTitle}>{srs.dueToday > 0 ? `${srs.dueToday} révisions à consolider` : `Renforcer : ${weakSkill}`}</Text>
          <Text style={styles.todayRecommendationMeta}>Environ 5 min · contenu adapté · progression enregistrée hors ligne</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Commencer ma session" onPress={() => onNavigate('quick')} style={({ pressed }) => [styles.todayPrimaryAction, pressed && styles.controlPressed]}>
          <Text style={styles.todayPrimaryActionIcon}>始</Text>
          <View style={styles.todayPrimaryActionCopy}>
            <Text style={styles.todayPrimaryActionText}>Commencer ma session</Text>
            <Text style={styles.todayPrimaryActionMeta}>Révisions, point faible et nouvelle notion</Text>
          </View>
          <Text style={styles.todayPrimaryActionArrow}>›</Text>
        </Pressable>
      </View>

      {loadError && (
        <Pressable accessibilityRole="button" onPress={load} style={styles.todayNotice}>
          <Text style={styles.todayNoticeText}>Certaines données n’ont pas pu être chargées. Toucher pour réessayer.</Text>
        </Pressable>
      )}

      <View style={styles.todayPulseRow}>
        <View style={styles.todayPulseItem}><Text style={styles.todayPulseValue}>{streakDays} j</Text><Text style={styles.todayPulseLabel}>assiduité</Text></View>
        <View style={styles.todayPulseDivider} />
        <View style={styles.todayPulseItem}><Text style={styles.todayPulseValue}>Niv. {level}</Text><Text style={styles.todayPulseLabel}>progression</Text></View>
        <View style={styles.todayPulseDivider} />
        <View style={styles.todayPulseItem}><Text style={styles.todayPulseValue}>{completedGoals}/3</Text><Text style={styles.todayPulseLabel}>objectifs</Text></View>
      </View>

      <Section title="À faire aujourd’hui">
        <Pressable accessibilityRole="button" onPress={() => onNavigate('review')} style={({ pressed }) => [styles.todaySrsRow, pressed && styles.controlPressed]}>
          <View style={styles.todaySrsSymbol}><Text style={styles.todaySrsSymbolText}>復</Text></View>
          <View style={styles.todaySrsCopy}>
            <Text style={styles.todaySrsTitle}>Révisions mémoire</Text>
            <Text style={styles.todaySrsMeta}>{srs.dueToday > 0 ? `${srs.dueToday} dues · ${srs.fragile} notions fragiles` : 'Aucune révision urgente · mémoire à jour'}</Text>
          </View>
          <Text style={styles.todayRowArrow}>›</Text>
        </Pressable>
        <View style={styles.todayQuestList}>
          {quests.slice(0, 3).map((quest) => <DailyQuestCard key={quest.id} quest={quest} />)}
        </View>
      </Section>

      <Section title="Cap d’apprentissage">
        <View style={styles.todayFocusBand}>
          <View style={styles.todayFocusTop}>
            <Text style={styles.todayFocusKicker}>Point prioritaire</Text>
            <Text style={styles.todayFocusRate}>{priority ? `${priority.rate}%` : 'N5'}</Text>
          </View>
          <Text style={styles.todayFocusTitle}>{weakSkill}</Text>
          <Text style={styles.todayFocusText}>{priority ? `${priority.review} à revoir · ${priority.unseen} encore à découvrir` : 'Commence une première session pour obtenir une recommandation précise.'}</Text>
          <View style={styles.todayFocusActions}>
            <Pressable accessibilityRole="button" onPress={() => onNavigate(getDomainScreen(priority?.id))} style={({ pressed }) => [styles.todaySecondaryAction, pressed && styles.controlPressed]}><Text style={styles.todaySecondaryActionText}>Travailler ce point</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => onNavigate('path')} style={({ pressed }) => [styles.todayTextAction, pressed && styles.controlPressed]}><Text style={styles.todayTextActionText}>Voir le parcours</Text></Pressable>
          </View>
        </View>
      </Section>

      <Pressable accessibilityRole="button" onPress={() => onNavigate('dashboard')} style={({ pressed }) => [styles.todayStatsLink, pressed && styles.controlPressed]}>
        <Text style={styles.todayStatsLinkIcon}>数</Text><Text style={styles.todayStatsLinkText}>Consulter toutes les statistiques</Text><Text style={styles.todayRowArrow}>›</Text>
      </Pressable>
    </ScrollView>
  );
}

function getDomainScreen(domainId?: string): Screen {
  if (domainId?.includes('kana')) return 'kana';
  if (domainId?.includes('kanji')) return 'kanjiDetail';
  if (domainId?.includes('grammar')) return 'grammar';
  if (domainId?.includes('vocab')) return 'vocabulary';
  return 'quick';
}

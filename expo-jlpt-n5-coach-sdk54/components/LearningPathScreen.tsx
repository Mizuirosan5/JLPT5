import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { styles } from '../appStyles';
import {
  ALL_GRAMMAR_LESSONS,
  getGrammarMainMenu,
} from '../services/grammarCourse';
import {
  buildGrammarMasteryDomain,
  loadGrammarProgressSummary,
} from '../services/grammarProgress';
import { buildLearningPathStages } from '../services/learningPath';
import { formatPathStatus } from '../services/progress';
import type { LearningPathStage, MasteryDomainStats, Screen } from '../models';
import { LoadingView, Metric, Section } from './sharedUi';

export function LearningPathScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const db = useSQLiteContext();
  const [loading, setLoading] = useState(true);
  const [stages, setStages] = useState<LearningPathStage[]>([]);
  const [summary, setSummary] = useState({
    readiness: 0,
    mastered: 0,
    total: 0,
    activeStage: 'Démarrage',
    todayAttempts: 0,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const grammarProgress = await loadGrammarProgressSummary(db, ALL_GRAMMAR_LESSONS, getGrammarMainMenu);
      const kanaRows = await db.getAllAsync<MasteryDomainStats>(`
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
          AND instr(k.character, '?') = 0
        GROUP BY k.script
      `);

      const combinedKana = await db.getFirstAsync<MasteryDomainStats>(`
        SELECT
          'combined' AS id,
          'Sons combinés' AS label,
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
        WHERE instr(k.character, '?') = 0
          AND length(k.character) > 1
      `);

      const contentRows = await db.getAllAsync<MasteryDomainStats>(`
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
      `);

      const activity = await db.getFirstAsync<{
        attempts: number;
        todayAttempts: number;
        quizAttempts: number;
        examAttempts: number;
        bestScore: number | null;
      }>(`
        SELECT
          COUNT(*) AS attempts,
          SUM(CASE WHEN date(answered_at) = date('now') THEN 1 ELSE 0 END) AS todayAttempts,
          SUM(CASE WHEN source_mode IN ('kana_arcade', 'adaptive_quiz', 'grammar_quiz', 'grammar_lesson') THEN 1 ELSE 0 END) AS quizAttempts,
          SUM(CASE WHEN source_mode = 'exam_mode' THEN 1 ELSE 0 END) AS examAttempts,
          (SELECT MAX(score) FROM app_kana_arcade_score) AS bestScore
        FROM app_question_attempt_local
      `);

      const adjustedContentRows = contentRows.map((domain) =>
        domain.id === 'grammar' ? buildGrammarMasteryDomain(grammarProgress) : domain
      );
      const allDomains = [
        ...kanaRows,
        ...(combinedKana ? [combinedKana] : []),
        ...adjustedContentRows,
      ];
      const nextStages = buildLearningPathStages(allDomains, {
        attempts: activity?.attempts ?? 0,
        quizAttempts: activity?.quizAttempts ?? 0,
        examAttempts: activity?.examAttempts ?? 0,
        bestScore: activity?.bestScore ?? 0,
      });
      const active = nextStages.find((stage) => stage.status === 'active') ?? nextStages[nextStages.length - 1];
      const mastered = allDomains.reduce((total, domain) => total + domain.mastered, 0);
      const total = allDomains.reduce((sum, domain) => sum + domain.total, 0);
      const routeProgress =
        nextStages.length > 0
          ? Math.round(
              (nextStages.reduce((sum, stage) => sum + stage.progress, 0) / (nextStages.length * 100)) * 100
            )
          : 0;

      setStages(nextStages);
      setSummary({
        readiness: routeProgress,
        mastered,
        total,
        activeStage: active?.title ?? 'Parcours JLPT',
        todayAttempts: activity?.todayAttempts ?? 0,
      });
    } catch (error) {
      console.error('Unable to load learning path', error);
      setStages([]);
      setSummary({ readiness: 0, mastered: 0, total: 0, activeStage: 'Démarrage', todayAttempts: 0 });
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <LoadingView />;
  }

  const activeStage = stages.find((stage) => stage.status === 'active') ?? stages.find((stage) => stage.status !== 'locked');
  const doneCount = stages.filter((stage) => stage.status === 'done').length;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.pathHero}>
        <View style={styles.pathHeroInk}>
          <Text style={styles.pathHeroKicker}>Parcours guidé</Text>
          <Text style={styles.pathHeroTitle}>Route JLPT N5</Text>
          <Text style={styles.pathHeroSubtitle}>
            Une progression par étapes, avec priorité donnée à ce qui débloque le plus vite la réussite.
          </Text>
        </View>
        <View style={styles.pathHeroBadge}>
          <Text style={styles.pathHeroBadgeValue}>{summary.readiness}%</Text>
          <Text style={styles.pathHeroBadgeText}>route</Text>
        </View>
      </View>

      <View style={styles.pathSummaryGrid}>
        <Metric label="Étapes finies" value={`${doneCount}/${stages.length}`} />
        <Metric label="Maîtrisés" value={`${summary.mastered}/${summary.total}`} />
        <Metric label="Aujourd'hui" value={summary.todayAttempts} />
      </View>

      {activeStage && (
        <View style={styles.pathNextCard}>
          <Text style={styles.pathNextLabel}>Prochaine mission</Text>
          <Text style={styles.pathNextTitle}>{activeStage.title}</Text>
          <Text style={styles.pathNextText}>{activeStage.subtitle}</Text>
          <View style={styles.pathProgressTrack}>
            <View style={[styles.pathProgressFill, { width: `${activeStage.progress}%` }]} />
          </View>
          <View style={styles.pathNextFooter}>
            <Text style={styles.pathReward}>{activeStage.reward}</Text>
            <Pressable style={styles.pathActionButton} onPress={() => onNavigate(activeStage.screen)}>
              <Text style={styles.pathActionText}>{activeStage.actionLabel}</Text>
            </Pressable>
          </View>
        </View>
      )}

      <Section title="Carte de progression">
        <View style={styles.pathTimeline}>
          {stages.map((stage, index) => (
            <Pressable
              key={stage.id}
              style={[
                styles.pathStageCard,
                stage.status === 'done' && styles.pathStageDone,
                stage.status === 'active' && styles.pathStageActive,
                stage.status === 'locked' && styles.pathStageLocked,
              ]}
              onPress={() => {
                if (stage.status !== 'locked') onNavigate(stage.screen);
              }}
            >
              <View style={styles.pathStageRail}>
                <View
                  style={[
                    styles.pathStageDot,
                    stage.status === 'done' && styles.pathStageDotDone,
                    stage.status === 'active' && styles.pathStageDotActive,
                  ]}
                >
                  <Text style={styles.pathStageDotText}>{stage.status === 'done' ? '✓' : index + 1}</Text>
                </View>
                {index < stages.length - 1 && <View style={styles.pathStageLine} />}
              </View>
              <View style={styles.pathStageBody}>
                <View style={styles.pathStageTopRow}>
                  <Text style={styles.pathStageTitle}>{stage.title}</Text>
                  <Text style={[styles.pathStageStatus, getPathStatusStyle(stage.status)]}>
                    {formatPathStatus(stage.status)}
                  </Text>
                </View>
                <Text style={styles.pathStageSubtitle}>{stage.subtitle}</Text>
                <View style={styles.pathStageMetaRow}>
                  <Text style={styles.pathStageFocus}>{stage.focus}</Text>
                  <Text style={styles.pathStageCount}>{stage.done}/{stage.total}</Text>
                </View>
                <View style={styles.pathProgressTrack}>
                  <View style={[styles.pathProgressFill, { width: `${stage.progress}%` }]} />
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </Section>
    </ScrollView>
  );
}

function getPathStatusStyle(status: LearningPathStage['status']) {
  if (status === 'done') return styles.pathStageStatus_done;
  if (status === 'active') return styles.pathStageStatus_active;
  return styles.pathStageStatus_locked;
}

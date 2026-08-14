import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { styles } from '../appStyles';
import type { Screen } from '../models';
import { loadLatestAptitudeResult, type AptitudeResultSnapshot } from '../services/aptitudeTest';
import { LoadingView, Section } from './sharedUi';

export function AptitudeReportScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const db = useSQLiteContext();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<AptitudeResultSnapshot | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setResult(await loadLatestAptitudeResult(db));
    } catch (error) {
      console.error('Unable to load aptitude result', error);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingView />;

  if (!result) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.aptitudeIntroCard}>
          <Text style={styles.pathModuleDetailTitle}>Aucun rapport disponible</Text>
          <Text style={styles.pathModuleDetailText}>
            Passe le diagnostic initial pour obtenir un rapport avec forces, faiblesses, modules recommandes et plan de travail.
          </Text>
          <Pressable style={styles.pathActionButton} onPress={() => onNavigate('aptitudeTest')}>
            <Text style={styles.pathActionText}>Lancer le diagnostic</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  const report = result.report;
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.aptitudeReportCard}>
        <View style={styles.aptitudeReportHeader}>
          <View>
            <Text style={styles.pathNextLabel}>Dernier rapport</Text>
            <Text style={styles.pathModuleDetailTitle}>{report.globalLabel}</Text>
            <Text style={styles.pathDetailSubStepText}>{formatReportDate(result.createdAt)}</Text>
          </View>
          <View style={styles.pathEvaluationCodeBox}>
            <Text style={styles.pathEvaluationCode}>{report.score}%</Text>
            <Text style={styles.pathEvaluationCodeLabel}>score</Text>
          </View>
        </View>
        <Text style={styles.pathModuleDetailText}>{report.summary}</Text>
        <View style={styles.aptitudeInsightGrid}>
          <View style={styles.aptitudeInsightCard}>
            <Text style={styles.pathNextLabel}>Niveau estime</Text>
            <Text style={styles.aptitudeInsightValue}>{report.estimatedLevel}</Text>
            <Text style={styles.pathDetailSubStepText}>{report.levelAdvice}</Text>
          </View>
          <View style={styles.aptitudeInsightCard}>
            <Text style={styles.pathNextLabel}>Priorite</Text>
            <Text style={styles.aptitudeInsightValue}>{formatDomain(result.weakestDomain)}</Text>
            <Text style={styles.pathDetailSubStepText}>{report.difficultyAdvice}</Text>
          </View>
        </View>
      </View>

      <Section title="Scores par domaine">
        <View style={styles.aptitudeDomainGrid}>
          {report.domainRows.map((row) => (
            <View key={row.domain} style={styles.aptitudeDomainCard}>
              <View style={styles.pathStageMetaRow}>
                <Text style={styles.pathStageFocus}>{formatDomain(row.domain)}</Text>
                <Text style={styles.pathStageCount}>{row.correct}/{row.total}</Text>
              </View>
              <View style={styles.pathProgressTrack}>
                <View style={[styles.pathProgressFill, { width: `${row.rate}%` }]} />
              </View>
              <Text style={styles.pathDetailSubStepText}>{row.comment}</Text>
            </View>
          ))}
        </View>
      </Section>

      <ReportList title="Forces detectees" items={report.strengths} />
      <ReportList title="Axes d apprentissage" items={report.priorities} />
      <ReportList title="Modules recommandes" items={report.recommendedModules} />
      <ReportList title="Plan 7 jours" items={report.sevenDayPlan} />
      <ReportList title="Plan 30 jours" items={report.thirtyDayPlan} />

      <Pressable style={styles.pathActionButton} onPress={() => onNavigate(domainToScreen(result.weakestDomain))}>
        <Text style={styles.pathActionText}>Ouvrir le module prioritaire</Text>
      </Pressable>
      <Pressable style={styles.secondaryFullButton} onPress={() => onNavigate('aptitudeTest')}>
        <Text style={styles.secondaryFullButtonText}>Repasser le diagnostic</Text>
      </Pressable>
    </ScrollView>
  );
}

function ReportList({ title, items }: { title: string; items: string[] }) {
  return (
    <Section title={title}>
      <View style={styles.pathRequirementList}>
        {items.map((item, index) => (
          <View key={`${title}-${item}`} style={styles.pathRequirementItem}>
            <Text style={styles.pathRequirementIndex}>{index + 1}</Text>
            <Text style={styles.pathRequirementText}>{item}</Text>
          </View>
        ))}
      </View>
    </Section>
  );
}

function formatDomain(domain: string) {
  if (domain === 'kana') return 'Kana';
  if (domain === 'orthographe') return 'Orthographe kana';
  if (domain === 'vocabulaire') return 'Vocabulaire';
  if (domain === 'kanji') return 'Kanji';
  if (domain === 'grammaire') return 'Grammaire';
  if (domain === 'comprehension') return 'Comprehension';
  return 'Diagnostic';
}

function domainToScreen(domain: string): Screen {
  if (domain === 'kana' || domain === 'orthographe') return 'kana';
  if (domain === 'vocabulaire' || domain === 'kanji') return 'vocabulary';
  if (domain === 'grammaire' || domain === 'comprehension') return 'grammar';
  return 'path';
}

function formatReportDate(value: string) {
  if (!value) return 'Rapport local sauvegarde';
  return `Sauvegarde locale : ${value.replace('T', ' ')}`;
}

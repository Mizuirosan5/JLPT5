import { Pressable, Text, View } from 'react-native';
import { styles } from '../appStyles';

export function DomainProgressHeader({
  label,
  mastered,
  total,
  review,
  attempts,
  recommendation,
  actionLabel = 'Continuer',
  onContinue,
}: {
  label: string;
  mastered: number;
  total: number;
  review: number;
  attempts: number;
  recommendation: string;
  actionLabel?: string;
  onContinue?: () => void;
}) {
  const progress = total > 0 ? Math.min(100, Math.round((mastered / total) * 100)) : 0;
  return (
    <View style={styles.domainProgressHeader}>
      <View style={styles.domainProgressTop}>
        <View style={styles.domainProgressCopy}>
          <Text style={styles.domainProgressKicker}>{label}</Text>
          <Text style={styles.domainProgressTitle}>{mastered}/{total} maîtrisés</Text>
          <Text style={styles.domainProgressMeta}>
            {review} à revoir · {attempts < 3 ? 'Données insuffisantes' : `${attempts} essais enregistrés`}
          </Text>
        </View>
        <Text style={styles.domainProgressRate}>{progress}%</Text>
      </View>
      <View style={styles.domainProgressTrack}><View style={[styles.domainProgressFill, { width: `${progress}%` }]} /></View>
      <View style={styles.domainProgressActionRow}>
        <Text style={styles.domainProgressRecommendation}>{recommendation}</Text>
        {!!onContinue && <Pressable accessibilityRole="button" onPress={onContinue} style={styles.domainProgressButton}><Text style={styles.domainProgressButtonText}>{actionLabel}</Text></Pressable>}
      </View>
    </View>
  );
}

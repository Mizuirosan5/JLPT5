import { useCallback } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { styles } from '../appStyles';
import type { Screen } from '../models';
import { AptitudeTestPanel } from './LearningPathScreen';
import { Section } from './sharedUi';

export function AptitudeTestScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const db = useSQLiteContext();
  const handleFinished = useCallback(() => {
    onNavigate('aptitudeReport');
  }, [onNavigate]);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.pathHero}>
        <View style={styles.pathHeroInk}>
          <Text style={styles.pathHeroKicker}>Diagnostic</Text>
          <Text style={styles.pathHeroTitle}>Test d aptitude N5</Text>
          <Text style={styles.pathHeroSubtitle}>
            Un test unique en trois niveaux pour mesurer kana, vocabulaire, kanji, grammaire et comprehension.
          </Text>
        </View>
        <View style={styles.pathHeroBadge}>
          <Text style={styles.pathHeroBadgeValue}>30</Text>
          <Text style={styles.pathHeroBadgeText}>questions</Text>
        </View>
      </View>

      <Section title="Test initial">
        <AptitudeTestPanel db={db} onFinished={handleFinished} />
      </Section>
    </ScrollView>
  );
}

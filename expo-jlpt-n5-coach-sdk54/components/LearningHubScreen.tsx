import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { styles } from '../appStyles';
import type { Screen } from '../models';
import { loadCurriculumProfile, type CurriculumProfile } from '../services/curriculum';
import { loadSrsOverview } from '../services/srs';
import type { SrsOverview } from '../models';
import { LoadingView } from './sharedUi';

const THEMES: Array<{ screen: Screen; icon: string; title: string; description: string }> = [
  { screen: 'kana', icon: '仮', title: 'Kana', description: 'Hiragana, katakana, sons voisés et combinés.' },
  { screen: 'kanjiDetail', icon: '字', title: 'Kanji', description: '80 kanji N5, lectures, composants et radicaux.' },
  { screen: 'vocabulary', icon: '語', title: 'Vocabulaire', description: 'Mots illustrés, exemples et révisions.' },
  { screen: 'grammar', icon: '文', title: 'Grammaire', description: 'Points précis, exemples et exercices.' },
  { screen: 'immersion', icon: '読', title: 'Lecture', description: 'Textes courts et compréhension N5.' },
  { screen: 'stories', icon: '会', title: 'Dialogues', description: 'Situations concrètes et conversations courtes.' },
];

export function LearningHubScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const db = useSQLiteContext();
  const [profile, setProfile] = useState<CurriculumProfile | null>(null);
  const [srs, setSrs] = useState<SrsOverview | null>(null);

  useEffect(() => {
    Promise.all([loadCurriculumProfile(db), loadSrsOverview(db)])
      .then(([nextProfile, nextSrs]) => { setProfile(nextProfile); setSrs(nextSrs); })
      .catch((error) => console.error('Unable to load learning hub', error));
  }, [db]);

  if (!profile || !srs) return <LoadingView />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.learningHubHero}>
        <Text style={styles.grammarKicker}>学習 · APPRENDRE</Text>
        <Text style={styles.grammarTitle}>Comment veux-tu avancer ?</Text>
        <Text style={styles.grammarSubtitle}>Suis la progression idéale ou ouvre directement le thème dont tu as besoin.</Text>
      </View>

      <View style={styles.learningChoiceGrid}>
        <View style={[styles.learningChoicePanel, styles.learningChoicePanelPrimary]}>
          <View style={styles.learningChoiceTopRow}>
            <Text style={styles.learningChoiceIconPrimary}>道</Text>
            <View style={styles.learningChoiceLevel}>
              <Text style={styles.learningChoiceLevelValue}>{profile.currentCode}</Text>
              <Text style={styles.learningChoiceLevelLabel}>niveau actuel</Text>
            </View>
          </View>
          <Text style={styles.learningChoiceTitlePrimary}>Parcours conseillé</Text>
          <Text style={styles.learningChoiceSubtitlePrimary}>{profile.unit.title}</Text>
          <Text style={styles.learningChoiceTextPrimary}>{profile.unit.canDo}</Text>
          <View style={styles.learningChoiceProgressTrack}>
            <View style={[styles.learningChoiceProgressFill, { width: `${profile.progress}%` }]} />
          </View>
          <Text style={styles.learningChoiceMetaPrimary}>{profile.progress}% · environ 5 minutes</Text>
          <Pressable accessibilityRole="button" onPress={() => onNavigate(srs.dueToday > 0 ? 'review' : 'lesson')} style={styles.learningChoicePrimaryButton}>
            <Text style={styles.learningChoicePrimaryButtonText}>{srs.dueToday > 0 ? `Reprendre mes ${srs.dueToday} révisions` : 'Continuer maintenant'}</Text>
            <Text style={styles.learningChoicePrimaryArrow}>›</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => onNavigate('path')} style={styles.learningChoiceTextButton}>
            <Text style={styles.learningChoiceTextButtonLabel}>Voir toute la roadmap</Text>
          </Pressable>
        </View>

        <View style={styles.learningChoicePanel}>
          <Text style={styles.learningChoiceIcon}>選</Text>
          <Text style={styles.learningChoiceTitle}>Choisir un thème</Text>
          <Text style={styles.learningChoiceText}>Tout le contenu reste accessible. Une exploration libre alimente tes statistiques sans changer artificiellement ton niveau.</Text>
          <View style={styles.learningThemeGrid}>
            {THEMES.map((theme) => (
              <Pressable accessibilityRole="button" key={theme.screen} onPress={() => onNavigate(theme.screen)} style={({ pressed }) => [styles.learningThemeButton, pressed && styles.controlPressed]}>
                <Text style={styles.learningThemeIcon}>{theme.icon}</Text>
                <View style={styles.learningThemeCopy}>
                  <Text style={styles.learningThemeTitle}>{theme.title}</Text>
                  <Text style={styles.learningThemeDescription}>{theme.description}</Text>
                </View>
                <Text style={styles.learningThemeArrow}>›</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

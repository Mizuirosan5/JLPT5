import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { styles } from '../appStyles';
import type { LearningPlanMode, LearningPreferences, QuizDifficultyPreference } from '../models';
import {
  DEFAULT_LEARNING_PREFERENCES,
  loadLearningPreferences,
  saveLearningPreference,
} from '../services/preferences';
import { SegmentButton } from './formControls';
import { LoadingView, Section } from './sharedUi';

const PLAN_OPTIONS: Array<{ value: LearningPlanMode; label: string; detail: string }> = [
  { value: 'balanced', label: 'Equilibre', detail: 'Kana, vocabulaire, grammaire et quiz avances ensemble.' },
  { value: 'kana_first', label: 'Kana d abord', detail: 'Priorite aux bases de lecture avant le reste.' },
  { value: 'grammar_intensive', label: 'Grammaire', detail: 'Plus de phrases, particules et formes N5.' },
  { value: 'exam_revision', label: 'Revision JLPT', detail: 'Plus de quiz mixtes et de formats examen.' },
];

const DIFFICULTY_OPTIONS: Array<{ value: QuizDifficultyPreference; label: string; detail: string }> = [
  { value: 'soft', label: 'Doux', detail: 'Plus de QCM et d aides visibles.' },
  { value: 'normal', label: 'Normal', detail: 'Equilibre entre aide, rappel et difficulte.' },
  { value: 'hard', label: 'Difficile', detail: 'Moins d aide, plus de production.' },
];

export function LearningPreferencesScreen() {
  const db = useSQLiteContext();
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<keyof LearningPreferences | null>(null);
  const [preferences, setPreferences] = useState<LearningPreferences>(DEFAULT_LEARNING_PREFERENCES);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPreferences(await loadLearningPreferences(db));
    } catch (error) {
      console.error('Unable to load learning preferences', error);
      setPreferences(DEFAULT_LEARNING_PREFERENCES);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    load();
  }, [load]);

  async function updatePreference<K extends keyof LearningPreferences>(key: K, value: LearningPreferences[K]) {
    setPreferences((current) => ({ ...current, [key]: value }));
    setSavingKey(key);
    try {
      await saveLearningPreference(db, key, value);
    } catch (error) {
      console.error('Unable to save learning preference', error);
      await load();
    } finally {
      setSavingKey(null);
    }
  }

  if (loading) return <LoadingView />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.preferencesHero}>
        <Text style={styles.preferencesKicker}>Reglages locaux</Text>
        <Text style={styles.preferencesTitle}>Preferences pedagogiques</Text>
        <Text style={styles.preferencesText}>
          Ces reglages restent sur ce telephone et servent a adapter les sessions sans internet.
        </Text>
      </View>

      <Section title="Affichage">
        <PreferenceSwitch
          label="Afficher le romaji"
          detail="Utile au debut. A masquer quand la lecture kana devient solide."
          active={preferences.showRomaji}
          disabled={savingKey === 'showRomaji'}
          onPress={() => updatePreference('showRomaji', !preferences.showRomaji)}
        />
        <PreferenceSwitch
          label="Traduction immediate"
          detail="Affiche plus vite le sens francais dans les corrections et revisions."
          active={preferences.showTranslationFirst}
          disabled={savingKey === 'showTranslationFirst'}
          onPress={() => updatePreference('showTranslationFirst', !preferences.showTranslationFirst)}
        />
        <PreferenceSwitch
          label="Reponses en japonais"
          detail="Force davantage la production japonaise quand les bases sont solides."
          active={preferences.japaneseAnswerMode}
          disabled={savingKey === 'japaneseAnswerMode'}
          onPress={() => updatePreference('japaneseAnswerMode', !preferences.japaneseAnswerMode)}
        />
        <PreferenceSwitch
          label="Audio local"
          detail="Utilise la voix japonaise du telephone si elle est disponible, sans service internet."
          active={preferences.audioEnabled}
          disabled={savingKey === 'audioEnabled'}
          onPress={() => updatePreference('audioEnabled', !preferences.audioEnabled)}
        />
      </Section>

      <Section title="Difficulte">
        <View style={styles.preferenceSegmentRow}>
          {DIFFICULTY_OPTIONS.map((option) => (
            <SegmentButton
              key={option.value}
              label={option.label}
              active={preferences.quizDifficulty === option.value}
              onPress={() => updatePreference('quizDifficulty', option.value)}
            />
          ))}
        </View>
        <Text style={styles.preferenceHelpText}>
          {DIFFICULTY_OPTIONS.find((option) => option.value === preferences.quizDifficulty)?.detail}
        </Text>
      </Section>

      <Section title="Session rapide">
        <View style={styles.preferenceSegmentRow}>
          {[5, 10, 20].map((size) => (
            <SegmentButton
              key={size}
              label={`${size} min`}
              active={preferences.preferredSessionLength === size}
              onPress={() => updatePreference('preferredSessionLength', size as 5 | 10 | 20)}
            />
          ))}
        </View>
        <Text style={styles.preferenceHelpText}>
          Le mode 5 minutes utilise cette duree pour choisir une session courte ou plus dense.
        </Text>
      </Section>

      <Section title="Parcours">
        {PLAN_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => updatePreference('learningPlanMode', option.value)}
            style={[styles.preferenceOptionCard, preferences.learningPlanMode === option.value && styles.preferenceOptionCardActive]}
          >
            <View style={styles.preferenceOptionBody}>
              <Text style={[styles.preferenceOptionTitle, preferences.learningPlanMode === option.value && styles.preferenceOptionTitleActive]}>
                {option.label}
              </Text>
              <Text style={[styles.preferenceOptionText, preferences.learningPlanMode === option.value && styles.preferenceOptionTextActive]}>
                {option.detail}
              </Text>
            </View>
            <Text style={[styles.preferenceOptionCheck, preferences.learningPlanMode === option.value && styles.preferenceOptionCheckActive]}>
              {preferences.learningPlanMode === option.value ? 'OK' : ''}
            </Text>
          </Pressable>
        ))}
      </Section>
    </ScrollView>
  );
}

function PreferenceSwitch({
  active,
  detail,
  disabled,
  label,
  onPress,
}: {
  active: boolean;
  detail: string;
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.preferenceSwitchCard, disabled && styles.preferenceDisabled]}>
      <View style={styles.preferenceOptionBody}>
        <Text style={styles.preferenceOptionTitle}>{label}</Text>
        <Text style={styles.preferenceOptionText}>{detail}</Text>
      </View>
      <View style={[styles.preferenceToggle, active && styles.preferenceToggleActive]}>
        <View style={[styles.preferenceToggleKnob, active && styles.preferenceToggleKnobActive]} />
      </View>
    </Pressable>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { styles } from '../appStyles';
import type { LearningPlanMode, LearningPreferences, QuizDifficultyPreference } from '../models';
import {
  DEFAULT_LEARNING_PREFERENCES,
  loadLearningPreferences,
  resetLearningPreferences,
  saveLearningPreference,
} from '../services/preferences';
import {
  createLocalBackupSnapshot,
  deleteAllUserData,
  restoreLatestLocalBackupSnapshot,
  type LocalBackupSummary,
} from '../services/localBackup';
import { loadRecentTechnicalLogs, recordTechnicalLog, type TechnicalLogEntry } from '../services/technicalLog';
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
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupSummary, setBackupSummary] = useState<LocalBackupSummary | null>(null);
  const [backupMessage, setBackupMessage] = useState('');
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [technicalLogs, setTechnicalLogs] = useState<TechnicalLogEntry[]>([]);

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

  async function createBackup() {
    setBackupBusy(true);
    setBackupMessage('');
    try {
      const summary = await createLocalBackupSnapshot(db);
      setBackupSummary(summary);
      setBackupMessage(`Point de restauration cree : ${summary.totalRows} lignes utilisateur.`);
    } catch (error) {
      console.error('Unable to create local backup', error);
      await recordTechnicalLog(db, 'error', 'preferences.backup', 'Unable to create local backup', error);
      setBackupMessage('Sauvegarde impossible pour le moment.');
    } finally {
      setBackupBusy(false);
    }
  }

  async function restoreBackup() {
    setBackupBusy(true);
    setBackupMessage('');
    try {
      const summary = await restoreLatestLocalBackupSnapshot(db);
      setBackupSummary(summary);
      setBackupMessage(summary ? `Restauration terminee : ${summary.totalRows} lignes relues.` : 'Aucun point de restauration local disponible.');
      await load();
    } catch (error) {
      console.error('Unable to restore local backup', error);
      await recordTechnicalLog(db, 'error', 'preferences.restore', 'Unable to restore local backup', error);
      setBackupMessage('Restauration refusee : sauvegarde absente, invalide ou trop recente.');
    } finally {
      setBackupBusy(false);
    }
  }

  async function deleteUserData() {
    if (!deleteArmed) {
      setDeleteArmed(true);
      setBackupMessage('Confirme une deuxieme fois pour supprimer la progression locale.');
      return;
    }
    setBackupBusy(true);
    try {
      const summary = await deleteAllUserData(db);
      setBackupSummary(summary);
      setBackupMessage(`Donnees supprimees : ${summary.totalRows} lignes utilisateur effacees.`);
      setDeleteArmed(false);
      await load();
    } catch (error) {
      console.error('Unable to delete user data', error);
      await recordTechnicalLog(db, 'error', 'preferences.deleteUserData', 'Unable to delete user data', error);
      setBackupMessage('Suppression impossible pour le moment.');
    } finally {
      setBackupBusy(false);
    }
  }

  async function refreshTechnicalLogs() {
    try {
      setTechnicalLogs(await loadRecentTechnicalLogs(db, 6));
    } catch (error) {
      console.error('Unable to load technical logs', error);
    }
  }

  async function resetPreferences() {
    setLoading(true);
    try {
      setPreferences(await resetLearningPreferences(db));
      setBackupMessage('Preferences pedagogiques remises aux valeurs par defaut.');
    } catch (error) {
      await recordTechnicalLog(db, 'error', 'preferences.reset', 'Unable to reset preferences', error);
      setBackupMessage('Reinitialisation impossible pour le moment.');
    } finally {
      setLoading(false);
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

      <Section title="Donnees locales">
        <View style={styles.preferenceBackupGrid}>
          <Pressable disabled={backupBusy} onPress={createBackup} style={[styles.secondaryButton, backupBusy && styles.primaryButtonDisabled]}>
            <Text style={styles.secondaryButtonText}>Sauvegarder</Text>
          </Pressable>
          <Pressable disabled={backupBusy} onPress={restoreBackup} style={[styles.secondaryButton, backupBusy && styles.primaryButtonDisabled]}>
            <Text style={styles.secondaryButtonText}>Restaurer</Text>
          </Pressable>
        </View>
        <Pressable
          disabled={backupBusy}
          onPress={deleteUserData}
          style={[styles.preferenceDangerButton, backupBusy && styles.primaryButtonDisabled, deleteArmed && styles.preferenceDangerButtonArmed]}
        >
          <Text style={[styles.preferenceDangerButtonText, deleteArmed && styles.preferenceDangerButtonTextArmed]}>
            {deleteArmed ? 'Confirmer la suppression' : 'Supprimer mes donnees'}
          </Text>
        </Pressable>
        {!!backupMessage && <Text style={styles.preferenceHelpText}>{backupMessage}</Text>}
        {!!backupSummary && (
          <Text style={styles.preferenceHelpText}>
            Derniere operation : {backupSummary.totalRows} lignes, {Object.keys(backupSummary.tableCounts).length} tables utilisateur.
          </Text>
        )}
        <Pressable onPress={resetPreferences} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Reinitialiser les preferences</Text>
        </Pressable>
      </Section>

      <Section title="Diagnostic technique">
        <Pressable onPress={refreshTechnicalLogs} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Afficher le journal local</Text>
        </Pressable>
        {technicalLogs.length ? (
          technicalLogs.map((entry) => (
            <View key={entry.id} style={styles.preferenceLogRow}>
              <Text style={styles.preferenceLogTitle}>
                {entry.level.toUpperCase()} · {entry.scope}
              </Text>
              <Text style={styles.preferenceOptionText}>{entry.message}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.preferenceHelpText}>Aucune erreur technique locale recente.</Text>
        )}
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
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="switch"
      accessibilityState={{ checked: active, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.preferenceSwitchCard, disabled && styles.preferenceDisabled]}
    >
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

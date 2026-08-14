import type { SQLiteDatabase } from 'expo-sqlite';
import type { LearningPlanMode, LearningPreferences, QuizDifficultyPreference } from '../models';

type PreferenceRow = {
  key: string;
  value: string;
};

export const DEFAULT_LEARNING_PREFERENCES: LearningPreferences = {
  showRomaji: true,
  showTranslationFirst: true,
  quizDifficulty: 'normal',
  preferredSessionLength: 5,
  japaneseAnswerMode: false,
  learningPlanMode: 'balanced',
  audioEnabled: true,
};

const BOOLEAN_KEYS = new Set<keyof LearningPreferences>([
  'showRomaji',
  'showTranslationFirst',
  'japaneseAnswerMode',
  'audioEnabled',
]);

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

function parseSessionLength(value: string | undefined): 5 | 10 | 20 {
  if (value === '10') return 10;
  if (value === '20') return 20;
  return 5;
}

function parseQuizDifficulty(value: string | undefined): QuizDifficultyPreference {
  if (value === 'soft' || value === 'hard') return value;
  return 'normal';
}

function parseLearningPlanMode(value: string | undefined): LearningPlanMode {
  if (value === 'kana_first' || value === 'grammar_intensive' || value === 'exam_revision') return value;
  return 'balanced';
}

function serializePreferenceValue<K extends keyof LearningPreferences>(key: K, value: LearningPreferences[K]): string {
  if (BOOLEAN_KEYS.has(key)) return value ? 'true' : 'false';
  return String(value);
}

function getPreferenceStorageKey(key: keyof LearningPreferences): string {
  return key === 'audioEnabled' ? 'audio_enabled' : key;
}

export async function loadLearningPreferences(db: SQLiteDatabase): Promise<LearningPreferences> {
  const rows = await db.getAllAsync<PreferenceRow>(
    `
    SELECT key, value
    FROM app_user_learning_preferences
    `
  );
  const values = new Map(rows.map((row) => [row.key, row.value]));

  return {
    showRomaji: parseBoolean(values.get('showRomaji'), DEFAULT_LEARNING_PREFERENCES.showRomaji),
    showTranslationFirst: parseBoolean(values.get('showTranslationFirst'), DEFAULT_LEARNING_PREFERENCES.showTranslationFirst),
    quizDifficulty: parseQuizDifficulty(values.get('quizDifficulty')),
    preferredSessionLength: parseSessionLength(values.get('preferredSessionLength')),
    japaneseAnswerMode: parseBoolean(values.get('japaneseAnswerMode'), DEFAULT_LEARNING_PREFERENCES.japaneseAnswerMode),
    learningPlanMode: parseLearningPlanMode(values.get('learningPlanMode')),
    audioEnabled: parseBoolean(values.get('audio_enabled') ?? values.get('audioEnabled'), DEFAULT_LEARNING_PREFERENCES.audioEnabled),
  };
}

export async function saveLearningPreference<K extends keyof LearningPreferences>(
  db: SQLiteDatabase,
  key: K,
  value: LearningPreferences[K]
): Promise<void> {
  await db.runAsync(
    `
    INSERT INTO app_user_learning_preferences (
      key, value, updated_at
    ) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = datetime('now')
    `,
    getPreferenceStorageKey(key),
    serializePreferenceValue(key, value)
  );
}

export async function saveLearningPreferences(db: SQLiteDatabase, preferences: LearningPreferences): Promise<void> {
  await Promise.all(
    (Object.keys(preferences) as Array<keyof LearningPreferences>).map((key) =>
      saveLearningPreference(db, key, preferences[key])
    )
  );
}

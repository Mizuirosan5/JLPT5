import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { DEFAULT_LEARNING_PREFERENCES, loadLearningPreferences, resetLearningPreferences, saveLearningPreference } from '../../services/preferences';
import { loadSession, saveSession } from '../../services/sessionPersistence';

describe('persistance des preferences', () => {
  it('charge les valeurs stockees et applique des valeurs par defaut sures', async () => {
    const db = {
      getAllAsync: mock.fn(async () => [
        { key: 'showRomaji', value: 'false' },
        { key: 'preferredSessionLength', value: '20' },
        { key: 'quizDifficulty', value: 'hard' },
      ]),
    };
    const result = await loadLearningPreferences(db as never);
    assert.equal(result.showRomaji, false);
    assert.equal(result.preferredSessionLength, 20);
    assert.equal(result.quizDifficulty, 'hard');
    assert.equal(result.audioEnabled, DEFAULT_LEARNING_PREFERENCES.audioEnabled);
  });

  it('utilise la cle historique compatible pour l audio', async () => {
    const runAsync = mock.fn(async (..._args: unknown[]) => undefined);
    await saveLearningPreference({ runAsync } as never, 'audioEnabled', false);
    assert.equal(runAsync.mock.calls.length, 1);
    assert.match(String(runAsync.mock.calls[0].arguments[0]), /app_user_learning_preferences/);
    assert.deepEqual(runAsync.mock.calls[0].arguments.slice(1), ['audio_enabled', 'false']);
  });

  it('reinitialise toutes les preferences dans une transaction', async () => {
    const runAsync = mock.fn(async (..._args: unknown[]) => undefined);
    const db = {
      runAsync,
      withTransactionAsync: async (callback: () => Promise<void>) => callback(),
    };
    const reset = await resetLearningPreferences(db as never);
    assert.deepEqual(reset, DEFAULT_LEARNING_PREFERENCES);
    assert.match(String(runAsync.mock.calls[0].arguments[0]), /DELETE FROM app_user_learning_preferences/);
    assert.equal(runAsync.mock.calls.length, Object.keys(DEFAULT_LEARNING_PREFERENCES).length + 1);
  });
});

describe('reprise de session', () => {
  it('serialise puis recharge une session valide', async () => {
    let stored = '';
    const db = {
      runAsync: mock.fn(async (_sql: string, _key: string, payload: string) => { stored = payload; }),
      getFirstAsync: mock.fn(async () => ({ payload_json: stored })),
    };
    await saveSession(db as never, 'exam:2018', { index: 12, correct: 9 });
    const restored = await loadSession<{ index: number; correct: number }>(db as never, 'exam:2018');
    assert.deepEqual(restored, { index: 12, correct: 9 });
  });

  it('supprime une session corrompue au lieu de planter', async () => {
    const runAsync = mock.fn(async (..._args: unknown[]) => undefined);
    const db = {
      runAsync,
      getFirstAsync: mock.fn(async () => ({ payload_json: '{invalide' })),
    };
    assert.equal(await loadSession(db as never, 'quiz:global'), null);
    assert.equal(runAsync.mock.calls.length, 1);
  });
});

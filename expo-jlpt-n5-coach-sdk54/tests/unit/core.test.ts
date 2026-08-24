import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import type { LearningPreferences, MasteryDomainStats } from '../../models';
import { buildDateRange, formatDateKey, getGoalProgress } from '../../services/goals';
import { buildLearningPathStages } from '../../services/learningPath';
import { getLevelProgressFromXp, masteryProgress } from '../../services/progress';
import { getQuickLearnerStage, getQuickQuestionLimit, keepHomogeneousChoices, uniqueChoices } from '../../services/quickSession';
import { shuffle } from '../../services/random';
import { buildNextSrsState, inferSrsItemType } from '../../services/srs';
import { hasJapaneseText, normalizeAnswer } from '../../services/text';
import { normalizeAptitudeReport } from '../../services/aptitudeTest';
import { assertMigrationCounts, getCommonMigrationColumns } from '../../services/databaseMigration';

const preferences: LearningPreferences = {
  showRomaji: true,
  showTranslationFirst: true,
  quizDifficulty: 'normal',
  preferredSessionLength: 5,
  japaneseAnswerMode: false,
  learningPlanMode: 'balanced',
  audioEnabled: true,
};

describe('moteurs metier critiques', () => {
  it('melange sans modifier la source', () => {
    const source = [1, 2, 3, 4];
    const random = mock.method(Math, 'random', () => 0.25);
    const result = shuffle(source);
    assert.deepEqual(source, [1, 2, 3, 4]);
    assert.equal(result.length, 4);
    assert.deepEqual(new Set(result), new Set(source));
    random.mock.restore();
  });

  it('supprime les distracteurs vides et dupliques', () => {
    assert.deepEqual(uniqueChoices(['Chat', ' chat ', '', 'Chien', 'CHIEN']), ['Chat', 'Chien']);
  });

  it('adapte la longueur de session', () => {
    assert.equal(getQuickQuestionLimit(preferences), 8);
    assert.equal(getQuickQuestionLimit({ ...preferences, preferredSessionLength: 10 }), 10);
    assert.equal(getQuickQuestionLimit({ ...preferences, preferredSessionLength: 20 }), 14);
  });

  it('protege le parcours debutant et homogeneise les choix', () => {
    assert.equal(getQuickLearnerStage({ totalAttempts: 0, kanaSeen: 0, kanaMastered: 0 }), 'discovery');
    assert.equal(getQuickLearnerStage({ totalAttempts: 12, kanaSeen: 5, kanaMastered: 2 }), 'hiragana');
    assert.equal(getQuickLearnerStage({ totalAttempts: 55, kanaSeen: 20, kanaMastered: 12 }), 'kana');
    assert.equal(getQuickLearnerStage({ totalAttempts: 120, kanaSeen: 46, kanaMastered: 35 }), 'consolidation');
    assert.deepEqual(keepHomogeneousChoices('学校', ['です', 'ga imasu', 'あります', 'bonjour']), ['です', 'あります']);
    assert.deepEqual(keepHomogeneousChoices('ga imasu', ['です', 'ga imasu', 'arimasu']), ['ga imasu', 'arimasu']);
  });

  it('normalise les reponses sans perdre le japonais', () => {
    assert.equal(normalizeAnswer('  Bon Jour '), 'bonjour');
    assert.equal(normalizeAnswer('日 本'), '日本');
    assert.equal(hasJapaneseText('今日は'), true);
    assert.equal(hasJapaneseText('bonjour'), false);
  });

  it('produit 730 jours uniques et consecutifs', () => {
    const days = buildDateRange(730, new Date(2026, 0, 1, 12));
    assert.equal(days.length, 730);
    assert.equal(new Set(days).size, 730);
    assert.equal(days[0], '2026-01-01');
    assert.equal(days.at(-1), '2027-12-31');
    assert.equal(formatDateKey(new Date(2026, 8, 7)), '2026-09-07');
  });

  it('ne valide la precision qu apres un volume minimal', () => {
    const low = { day: '2026-08-24', attempts: 9, correct: 9, quizAttempts: 0, rate: 100 };
    const ready = { day: '2026-08-24', attempts: 10, correct: 8, quizAttempts: 0, rate: 80 };
    assert.equal(getGoalProgress('daily-precision', low), 0);
    assert.equal(getGoalProgress('daily-precision', ready), 80);
  });

  it('fait evoluer le SRS et borne la facilite', () => {
    const first = buildNextSrsState(null, true);
    assert.equal(first.status, 'known');
    assert.equal(first.intervalDays, 1);
    const failed = buildNextSrsState(
      {
        item_id: '日', item_type: 'kanji', status: 'mastered', ease: 1.35, interval_days: 30,
        due_at: '', last_reviewed_at: null, attempts: 5, correct: 5, wrong_streak: 1,
        correct_streak: 0, updated_at: '',
      },
      false
    );
    assert.equal(failed.status, 'fragile');
    assert.equal(failed.ease, 1.3);
    assert.equal(failed.intervalDays, 0);
    assert.equal(inferSrsItemType('grammar-particle', 'quiz'), 'grammar');
  });

  it('calcule une progression et un parcours depuis les donnees reelles', () => {
    const domain: MasteryDomainStats = {
      id: 'hiragana', label: 'Hiragana', total: 10, mastered: 5, known: 2,
      review: 1, unseen: 2, attempted: 8, correct: 6, rate: 75,
    };
    assert.equal(masteryProgress(domain), 63);
    const stages = buildLearningPathStages([domain], { attempts: 30, quizAttempts: 0, examAttempts: 0, bestScore: 0 });
    assert.equal(stages[0]!.status, 'done');
    assert.equal(stages[1]!.status, 'active');
    assert.equal(stages[1]!.subSteps?.length, 3);
  });

  it('borne les niveaux et l XP restante', () => {
    assert.equal(getLevelProgressFromXp(0).level, 1);
    const advanced = getLevelProgressFromXp(1_000_000_000);
    assert.equal(advanced.level, 250);
    assert.equal(advanced.xpToNextLevel, 0);
  });

  it('repare un ancien rapport partiel sans planter', () => {
    const report = normalizeAptitudeReport(
      { strengths: ['Kana'], score: 42 },
      {
        score: 40,
        level3_rate: 20,
        estimated_level: 'Débutant',
        global_label: 'Bases fragiles',
        weakest_domain: 'grammar',
        recommended_module: 'Grammaire 1A',
      }
    );
    assert.equal(report.score, 42);
    assert.deepEqual(report.strengths, ['Kana']);
    assert.deepEqual(report.recommendedModules, ['Grammaire 1A']);
    assert.deepEqual(report.domainRows, []);
  });

  it('copie seulement les colonnes communes et refuse une perte de lignes', () => {
    assert.deepEqual(
      getCommonMigrationColumns(new Set(['id', 'value', 'updated_at']), new Set(['id', 'value', 'legacy_only'])),
      ['id', 'value']
    );
    assert.doesNotThrow(() => assertMigrationCounts('preferences', 2, 3, 4));
    assert.throws(() => assertMigrationCounts('preferences', 2, 3, 2), /count mismatch/);
  });
});

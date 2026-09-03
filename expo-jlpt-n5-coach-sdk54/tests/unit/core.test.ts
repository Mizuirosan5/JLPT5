import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import type { LearningPreferences, MasteryDomainStats, VocabularyItem } from '../../models';
import { buildDateRange, formatDateKey, getGoalProgress } from '../../services/goals';
import { buildCurriculumLearningPathStages, buildLearningPathStages } from '../../services/learningPath';
import { getLevelProgressFromXp, masteryProgress } from '../../services/progress';
import { getQuickLearnerStage, getQuickQuestionLimit, keepHomogeneousChoices, uniqueChoices } from '../../services/quickSession';
import { shuffle, shuffleChoices } from '../../services/random';
import { buildNextSrsState, inferSrsItemType } from '../../services/srs';
import { hasJapaneseText, normalizeAnswer } from '../../services/text';
import { normalizeAptitudeReport } from '../../services/aptitudeTest';
import { assertMigrationCounts, getCommonMigrationColumns } from '../../services/databaseMigration';
import { filterGrammarForCurriculum, filterKanaForCurriculum, filterKanjiForCurriculum, getKanaCurriculumCode, getKanjiCurriculumCode, getVocabularyCurriculumPlacement, isCurriculumAccessible } from '../../services/curriculum';
import { ALL_GRAMMAR_LESSONS, getGrammarMainMenu } from '../../services/grammarCourse';
import { curateVocabularyLearningItems, sanitizeRomaji } from '../../services/vocabulary';
import { buildKanaExercise, buildKanaQuiz, getCombinedKanaExplanation } from '../../services/kanaQuizFactory';
import { toJapaneseNumber, toJapaneseQuantity } from '../../services/practice';
import { buildMasteryView, deriveMasteryStatus, summarizeMastery } from '../../services/mastery';
import { chooseNextLearningAction } from '../../services/nextLearningAction';
import { getKanjiForRadical, getPrimaryRadical, validateKanjiRadicalCoverage } from '../../data/kanjiRadicals';
import { getVocabularyLearningMeta } from '../../services/vocabularyLearning';
import { buildGrammarQuizQuestions } from '../../services/grammarQuizFactory';
import { buildGlobalQuizQuestions } from '../../services/globalQuizFactory';
import { analyzeWritingText } from '../../services/writingJournal';
import { buildAdaptiveDailyGoals, type DailyGoalProfile } from '../../services/dashboardData';
import { getJapaneseSpeechText } from '../../services/audioText';
import { calculateAptitudeMetrics } from '../../services/aptitudeAssessment';
import { N5_KANJI_LEARNING_ORDER, getKanjiLearningPosition, sortByKanjiLearningOrder } from '../../data/kanjiLearningOrder';
import { VOCABULARY_BROWSE_THEMES, getVocabularyBrowseSubtheme, getVocabularyBrowseTheme, getVocabularyMnemonic } from '../../services/vocabularyThemes';
import { CORE_N5_FUNCTION_GROUPS, CORE_N5_FUNCTION_VOCABULARY } from '../../data/n5CoreVocabulary';

const preferences: LearningPreferences = {
  showRomaji: true,
  showTranslationFirst: true,
  quizDifficulty: 'normal',
  preferredSessionLength: 5,
  japaneseAnswerMode: false,
  learningPlanMode: 'balanced',
  audioEnabled: true,
};

function vocabularyItem(overrides: Partial<VocabularyItem>): VocabularyItem {
  return {
    id: 'test-vocabulary',
    japanese: 'ことば',
    kana: 'ことば',
    kanji: null,
    romaji: 'kotoba',
    meaning_fr: 'mot',
    category: 'Vocabulaire général',
    ...overrides,
  };
}

describe('moteurs metier critiques', () => {
  it('ordonne et numerote les 80 kanji selon une progression pedagogique stable', () => {
    assert.equal(N5_KANJI_LEARNING_ORDER.length, 80);
    assert.equal(new Set(N5_KANJI_LEARNING_ORDER).size, 80);
    assert.deepEqual(N5_KANJI_LEARNING_ORDER.slice(0, 14), ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '百', '千', '万', '円']);
    assert.equal(getKanjiLearningPosition('一'), 1);
    assert.equal(getKanjiLearningPosition('白'), 80);
    assert.deepEqual(sortByKanjiLearningOrder(['学', '三', '一'], (item) => item), ['一', '三', '学']);
  });

  it('classe les mots dans des menus stables et fournit une mnemonique pour chacun', () => {
    assert.equal(new Set(VOCABULARY_BROWSE_THEMES.map((theme) => theme.id)).size, VOCABULARY_BROWSE_THEMES.length);
    assert.deepEqual(VOCABULARY_BROWSE_THEMES.map((theme) => theme.order), [...VOCABULARY_BROWSE_THEMES.map((_, index) => index + 1)]);
    const numberWord = vocabularyItem({ japanese: '三', kana: 'さん', kanji: '三', meaning_fr: 'trois', theme: 'Nombres' });
    const foodWord = vocabularyItem({ japanese: 'りんご', kana: 'りんご', meaning_fr: 'pomme', theme: 'Nourriture et boissons' });
    assert.equal(getVocabularyBrowseTheme(numberWord).id, 'numbers');
    assert.equal(getVocabularyBrowseTheme(foodWord).id, 'food');
    assert.match(getVocabularyMnemonic(numberWord), /trois traits/u);
    assert.match(getVocabularyMnemonic(foodWord), /りんご/u);
  });

  it('decoupe les grands themes de vocabulaire en sous-themes pedagogiques', () => {
    const counter = vocabularyItem({ japanese: '三人', kana: 'さんにん', kanji: '三人', meaning_fr: 'trois personnes, compteur de personnes' });
    const clock = vocabularyItem({ japanese: '九時', kana: 'くじ', kanji: '九時', meaning_fr: 'neuf heures' });
    assert.equal(getVocabularyBrowseSubtheme(counter, 'numbers').id, 'counters');
    assert.equal(getVocabularyBrowseSubtheme(clock, 'time').id, 'clock');
  });

  it('couvre les pronoms, demonstratifs et interrogatifs essentiels du N5', () => {
    assert.equal(CORE_N5_FUNCTION_VOCABULARY.length, 63);
    assert.equal(CORE_N5_FUNCTION_GROUPS.size, 6);
    const byRomaji = new Map(CORE_N5_FUNCTION_VOCABULARY.map((item) => [item.romaji, item]));
    for (const required of ['watashi', 'watashitachi', 'kore', 'doko', 'nannin', 'nanyoubi']) {
      assert.ok(byRomaji.has(required), `${required} doit rester dans le socle N5`);
    }
    assert.ok(CORE_N5_FUNCTION_VOCABULARY.every((item) => !/[\u3040-\u30ff\u3400-\u9fff]/u.test(item.romaji)));
    const question = vocabularyItem({ ...byRomaji.get('doko'), meaning_fr: 'où ?', theme: 'Mots essentiels : questions' });
    assert.equal(getVocabularyBrowseTheme(question).id, 'function-words');
    assert.equal(getVocabularyBrowseSubtheme(question, 'function-words').id, 'question-words');
  });

  it('separe les particules des formes verbales dans la bibliotheque de grammaire', () => {
    const particleTitles = ALL_GRAMMAR_LESSONS.filter((lesson) => getGrammarMainMenu(lesson) === 'Particules').map((lesson) => lesson.title);
    assert.ok(particleTitles.includes('は : annoncer le sujet'));
    assert.ok(!particleTitles.includes('ませんでした : passé négatif'));
    assert.ok(!particleTitles.includes('できる / 食べられる'));
  });

  it('borne la lecture vocale locale a une phrase courte', () => {
    assert.equal(getJapaneseSpeechText(`これは本です。${'次の長い文章'.repeat(12)}`), 'これは本です。');
    assert.equal(getJapaneseSpeechText('あ'.repeat(100)).length, 64);
  });

  it('ne place pas la bonne reponse en premiere position dans un QCM', () => {
    for (let index = 0; index < 100; index += 1) {
      const choices = shuffleChoices(['correct', 'a', 'b', 'c'], 'correct');
      assert.notEqual(choices[0], 'correct');
      assert.equal(new Set(choices).size, 4);
    }
  });

  it('corrige localement les erreurs N5 frequentes du journal', () => {
    const vocabulary = [
      { id: 'school', japanese: '学校', kana: 'がっこう', kanji: '学校', romaji: 'gakkou', meaning_fr: 'école', category: 'École' },
      { id: 'go', japanese: '行きます', kana: 'いきます', kanji: '行きます', romaji: 'ikimasu', meaning_fr: 'aller', category: 'Verbes' },
    ];
    const analysis = analyzeWritingText('学校を行きます', vocabulary);
    assert.equal(analysis.assessment, 'needs_review');
    assert.equal(analysis.correctedText, '学校に行きます。');
    assert.ok(analysis.detectedWords.includes('学校'));
    assert.ok(analysis.suggestions.some((item) => item.includes('destination')));
  });

  it('explique la fusion des kana combines sans reveler une regle approximative', () => {
    const card = {
      id: 'hiragana-sha', script: 'hiragana' as const, character: '\u3057\u3083', romaji: 'sha',
      row_name: 'combinaisons', favorite: 0, review: 0, mastered: 0, seen_count: 0,
      correct_count: 0, mnemonic_note: null, examples: [],
    };
    const explanation = getCombinedKanaExplanation(card);
    assert.ok(explanation?.includes('\u3057 (shi) + \u3083 (ya) = \u3057\u3083 (sha)'));
  });

  it('propose des distracteurs de meme structure pour un kana combine', () => {
    const makeKana = (id: string, character: string, romaji: string) => ({
      id, script: 'hiragana' as const, character, romaji, row_name: 'combinaisons', favorite: 0,
      review: 0, mastered: 0, seen_count: 0, correct_count: 0, mnemonic_note: null, examples: [],
    });
    const prompt = makeKana('kyu', '\u304d\u3085', 'kyu');
    const cards = [
      prompt,
      makeKana('shu', '\u3057\u3085', 'shu'),
      makeKana('nyu', '\u306b\u3085', 'nyu'),
      makeKana('gyu', '\u304e\u3085', 'gyu'),
      makeKana('ri', '\u308a', 'ri'),
      makeKana('no', '\u306e', 'no'),
    ];
    const exercise = buildKanaExercise(cards, prompt, 'kana_to_romaji', 'multiple_choice');
    assert.ok(exercise);
    assert.equal(exercise.choices.length, 4);
    assert.ok(exercise.choices.every((choice) => choice.length === 3));
  });

  it('respecte la taille choisie meme avec un petit corpus kana de niveau', () => {
    const cards = ['a', 'i', 'u', 'e', 'o'].map((romaji, index) => ({
      id: `kana-${romaji}`,
      script: 'hiragana' as const,
      character: ['あ', 'い', 'う', 'え', 'お'][index],
      romaji,
      row_name: 'voyelles',
      favorite: 0,
      review: 0,
      mastered: 0,
      seen_count: 0,
      correct_count: 0,
      mnemonic_note: null,
      examples: [],
    }));
    const questions = buildKanaQuiz(cards, 10, 'kana_to_romaji', 'multiple_choice');
    assert.equal(questions.length, 10);
    questions.slice(1).forEach((question, index) => {
      assert.notEqual(question.prompt.id, questions[index].prompt.id);
    });
  });

  it('ne genere plus de question abstraite sur le nom d une regle', () => {
    const questions = buildGrammarQuizQuestions(20, 'arcade', ALL_GRAMMAR_LESSONS.slice(0, 20));
    assert.ok(questions.length > 0);
    assert.ok(questions.every((question) => ['blank_choice', 'translation_qcm', 'blank_input', 'keyword_input', 'dialogue_response_qcm'].includes(question.kind)));
    assert.equal(questions.some((question) => /quelle r[eè]gle|correspond.*r[eè]gle/i.test(question.prompt)), false);
  });

  it('ne demande jamais la lecture kana d un mot deja affiche dans le meme kana', () => {
    const vocabulary = [
      { id: 'see', japanese: 'みる', kana: 'みる', kanji: null, romaji: 'miru', meaning_fr: 'voir', usage: 'verbe' },
      { id: 'listen', japanese: 'きく', kana: 'きく', kanji: null, romaji: 'kiku', meaning_fr: 'écouter', usage: 'verbe' },
      { id: 'drink', japanese: 'のむ', kana: 'のむ', kanji: null, romaji: 'nomu', meaning_fr: 'boire', usage: 'verbe' },
      { id: 'read', japanese: 'よむ', kana: 'よむ', kanji: null, romaji: 'yomu', meaning_fr: 'lire', usage: 'verbe' },
    ];
    const questions = buildGlobalQuizQuestions(20, 'blank_qcm', [], vocabulary, [], 'vocabulary');
    assert.equal(
      questions.some((question) => question.format === 'vocabulary_reading' && question.display === question.correctAnswer),
      false,
    );
    questions.filter((question) => question.format === 'vocabulary_japanese').forEach((question) => {
      assert.equal(question.choices.some((choice) => /[a-z]/i.test(choice)), false);
    });
  });

  it('retire tout caractere japonais des champs romaji', () => {
    assert.equal(sanitizeRomaji('\u3057\u305f shita / \u3055\u3052\u308b sageru'), 'shita / sageru');
    assert.equal(/[\u3040-\u30ff\u3400-\u9fff]/u.test(sanitizeRomaji('\u9752\u3044 aoi')), false);
  });

  it('priorise les revisions, puis les erreurs, puis le parcours', () => {
    const base = { currentCode: '2A', unitTitle: 'Hiragana solides', progress: 42 };
    assert.equal(chooseNextLearningAction({ ...base, dueToday: 3, activeErrors: 2 }).screen, 'review');
    assert.equal(chooseNextLearningAction({ ...base, dueToday: 0, activeErrors: 2 }).screen, 'errors');
    const curriculum = chooseNextLearningAction({ ...base, dueToday: 0, activeErrors: 0 });
    assert.equal(curriculum.screen, 'lesson');
    assert.equal(curriculum.level, '2A');
  });

  it('indexe les radicaux des 80 kanji N5 sans trou', () => {
    const characters = Array.from('一七万三上下中九二五人今休何先入八六円出分前北十千午半南友右名四国土外大天女子学小山川左年後日時書月木本来東校母毎気水火父生男白百聞行西見話語読車金長間雨電食高');
    assert.equal(characters.length, 80);
    assert.deepEqual(validateKanjiRadicalCoverage(characters), []);
    assert.equal(getPrimaryRadical('休')?.symbol, '人');
    assert.deepEqual(getKanjiForRadical('言', characters), ['話', '語', '読']);
  });

  it('enrichit un mot enseigne avec nature, attribut et exemple traduit', () => {
    const adjective = getVocabularyLearningMeta({ id: 'blue', japanese: '青い', kana: 'あおい', kanji: '青い', romaji: 'aoi', meaning_fr: 'bleu', category: 'Descriptions', importance: 5 });
    assert.equal(adjective.partOfSpeech, 'adjectif en い');
    assert.equal(adjective.attributes[0]?.id, 'i-adjective');
    assert.equal(adjective.example?.french, 'J’ai vu une voiture bleue.');
  });

  it('calcule un statut de maitrise commun depuis des preuves SRS', () => {
    const base = {
      item_id: 'kana-a', item_type: 'kana' as const, status: 'known' as const,
      interval_days: 2, due_at: '2099-01-01T00:00:00.000Z', last_reviewed_at: '2026-01-01',
      attempts: 3, correct: 3, wrong_streak: 0, correct_streak: 1,
    };
    const now = new Date('2026-08-26T12:00:00.000Z');
    assert.equal(deriveMasteryStatus(null, now), 'new');
    assert.equal(deriveMasteryStatus({ ...base, attempts: 2, correct: 2 }, now), 'learning');
    assert.equal(deriveMasteryStatus(base, now), 'known');
    assert.equal(deriveMasteryStatus({ ...base, wrong_streak: 1 }, now), 'review');
    assert.equal(deriveMasteryStatus({ ...base, status: 'solid', attempts: 5, correct: 5, correct_streak: 2, interval_days: 7 }, now), 'mastered');
  });

  it('masque la precision avant trois essais et resume les statuts', () => {
    const now = new Date('2026-08-26T12:00:00.000Z');
    const learning = buildMasteryView(
      { itemId: 'word-1', itemType: 'vocabulary' },
      { item_id: 'word-1', item_type: 'vocabulary', status: 'known', interval_days: 1, due_at: '2099-01-01', last_reviewed_at: null, attempts: 2, correct: 2, wrong_streak: 0, correct_streak: 1 },
      now,
    );
    const fresh = buildMasteryView({ itemId: 'word-2', itemType: 'vocabulary' }, null, now);
    assert.equal(learning.accuracy, null);
    assert.deepEqual(summarizeMastery([learning, fresh]), { total: 2, new: 1, learning: 1, known: 0, review: 0, mastered: 0, due: 0 });
  });
  it('produit les nombres japonais N5 sans service externe', () => {
    assert.equal(toJapaneseNumber(0), 'れい');
    assert.equal(toJapaneseNumber(10), 'じゅう');
    assert.equal(toJapaneseNumber(24), 'にじゅうよん');
    assert.equal(toJapaneseNumber(305), 'さんびゃくご');
  });

  it('gere les compteurs et heures irreguliers du niveau N5', () => {
    assert.equal(toJapaneseQuantity(1, 'people'), 'ひとり');
    assert.equal(toJapaneseQuantity(2, 'people'), 'ふたり');
    assert.equal(toJapaneseQuantity(4, 'hour'), 'よじ');
    assert.equal(toJapaneseQuantity(7, 'hour'), 'しちじ');
    assert.equal(toJapaneseQuantity(8, 'generic'), 'やっつ');
    assert.equal(toJapaneseQuantity(500, 'price'), 'ごひゃくえん');
  });

  it('regroupe les variantes lexicales sans confondre nom et adjectif', () => {
    const makeItem = (id: string, japanese: string, kana: string, meaning: string) => ({
      id, japanese, kana, kanji: /[\u4E00-\u9FFF]/u.test(japanese) ? japanese : null,
      romaji: null, meaning_fr: meaning, category: 'Verbes', jlpt_level: 'N5',
    });
    const curated = curateVocabularyLearningItems([
      makeItem('polite', '会います', 'あいます', 'rencontrer'),
      makeItem('kana', 'あう', 'あう', 'rencontrer, voir une personne'),
      makeItem('dictionary', '会う', 'あう', 'rencontrer'),
      makeItem('blue-noun', '青', 'あお', 'le bleu'),
      makeItem('blue-adjective', '青い', 'あおい', 'bleu'),
    ]);

    assert.equal(curated.filter((item) => item.meaning_fr.includes('rencontrer')).length, 1);
    assert.equal(curated.find((item) => item.meaning_fr.includes('rencontrer'))?.japanese, '会う');
    assert.equal(curated.find((item) => item.japanese === '会う')?.meaning_fr, 'rencontrer ; voir quelqu’un');
    assert.equal(curated.filter((item) => item.japanese.startsWith('青')).length, 2);
  });

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

  it('genere trois objectifs quotidiens varies et adaptes pendant six mois', () => {
    const beginner: DailyGoalProfile = {
      level: 1,
      accuracy: 45,
      totalAttempts: 0,
      activeDays: 0,
      weakDomain: 'kana',
      learningPlanMode: 'kana_first',
    };
    const advanced: DailyGoalProfile = {
      ...beginner,
      level: 60,
      accuracy: 86,
      totalAttempts: 1200,
      activeDays: 80,
      weakDomain: 'grammaire',
      learningPlanMode: 'grammar_intensive',
    };
    const days = buildDateRange(186, new Date(2026, 0, 1, 12));
    const beginnerPlans = days.map((day, index) => buildAdaptiveDailyGoals(day, index, beginner));
    const advancedPlans = days.map((day, index) => buildAdaptiveDailyGoals(day, index, advanced));

    assert.ok(beginnerPlans.every((plan) => plan.length === 3 && new Set(plan.map((goal) => goal.id)).size === 3));
    assert.equal(new Set(beginnerPlans.flat().map((goal) => goal.id)).size, 186 * 3);
    assert.ok(new Set(beginnerPlans.map((plan) => plan.map((goal) => goal.title).join('|'))).size >= 40);
    assert.ok(advancedPlans.every((plan, index) => plan[0]!.target > beginnerPlans[index]![0]!.target));
    assert.ok(advancedPlans.every((plan, index) => plan[1]!.target >= beginnerPlans[index]![1]!.target));
  });

  it('respecte le volume minimal propre a un objectif de precision adaptatif', () => {
    const metrics = { day: '2026-08-28', attempts: 11, correct: 11, quizAttempts: 0, rate: 100 };
    assert.equal(getGoalProgress('daily-precision-m12-20260828', metrics), 0);
    assert.equal(getGoalProgress('daily-precision-m10-20260828', metrics), 100);
  });

  it('pondere davantage le niveau difficile du diagnostic', () => {
    const questions = [
      { id: 'easy', level: 1 as const, domain: 'kana', answer: 'a' },
      { id: 'medium', level: 2 as const, domain: 'kana', answer: 'b' },
      { id: 'hard', level: 3 as const, domain: 'grammaire', answer: 'c' },
    ];
    const weakHard = calculateAptitudeMetrics(questions, { easy: 'a', medium: 'b', hard: 'x' });
    const strongHard = calculateAptitudeMetrics(questions, { easy: 'x', medium: 'b', hard: 'c' });
    assert.equal(weakHard.rawScore, strongHard.rawScore);
    assert.ok(strongHard.weightedScore > weakHard.weightedScore);
    assert.deepEqual(strongHard.levelRows.map((row) => row.rate), [0, 100, 100]);
    assert.equal(strongHard.domainRows.length, 2);
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

  it('écarte strictement les contenus futurs des sessions sans bloquer les bibliothèques', () => {
    assert.equal(isCurriculumAccessible('1A', '1A'), true);
    assert.equal(isCurriculumAccessible('4A', '3C'), false);
    assert.equal(getKanaCurriculumCode({ character: 'あ', script: 'hiragana' }), '1A');
    assert.equal(getKanaCurriculumCode({ character: 'きゃ', script: 'hiragana' }), '2C');
    assert.equal(getKanjiCurriculumCode({ character: '一' }), '4A');
    assert.equal(getKanjiCurriculumCode({ character: '学' }), '6B');
    assert.deepEqual(
      filterKanaForCurriculum([
        { character: 'あ', script: 'hiragana' },
        { character: 'きゃ', script: 'hiragana' },
      ], '1A').map((item) => item.character),
      ['あ'],
    );
    assert.deepEqual(
      filterKanjiForCurriculum([{ character: '一' }, { character: '日' }], '4A').map((item) => item.character),
      ['一'],
    );
  });

  it('ecarte du parcours guide le lexique hors socle ou insuffisamment valide', () => {
    const core = getVocabularyCurriculumPlacement({ id: 'core', japanese: 'ありがとう', kana: 'ありがとう', kanji: null, romaji: 'arigatou', meaning_fr: 'merci', theme: 'salutations_formules', importance: 5 });
    const reference = getVocabularyCurriculumPlacement({ id: 'ref', japanese: '抽象', kana: 'ちゅうしょう', kanji: '抽象', romaji: 'chuushou', meaning_fr: 'abstraction', theme: 'general', importance: 3 });
    assert.equal(core.track, 'guided');
    assert.equal(reference.track, 'reference');
  });

  it('construit trente vrais sous-niveaux et masque la grammaire avancee', () => {
    const beginnerLessons = filterGrammarForCurriculum(ALL_GRAMMAR_LESSONS, '2A');
    assert.ok(beginnerLessons.length >= 1);
    assert.equal(beginnerLessons.some((lesson) => lesson.title.includes('Passif')), false);
    const stages = buildCurriculumLearningPathStages({ currentCode: '1B', unit: { code: '1B', title: 'Premiers mots', canDo: 'Lire.', focus: ['kana'], targetItems: 12, minimumAttempts: 12, minimumAccuracy: 80 }, completedUnits: 1, progress: 40, attempts: 5, accuracy: 80, masteredItems: 4 });
    assert.equal(stages.length, 10);
    assert.equal(stages.flatMap((stage) => stage.subSteps ?? []).length, 30);
    assert.equal(stages[0]?.subSteps?.[1]?.status, 'active');
    assert.equal(stages[1]?.status, 'locked');
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

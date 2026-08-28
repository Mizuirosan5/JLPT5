import { GLOBAL_QUIZ_MODES } from '../models';
import type {
  GlobalMatchingPair,
  GlobalMatchingSession,
  GlobalQuizDomain,
  GlobalQuizFormat,
  GlobalQuizMode,
  GlobalQuizQuestion,
  GlobalQuizSession,
  KanaCard,
  KanjiItem,
  KnowledgeQuizScope,
  LearningPreferences,
  WordLookupEntry,
} from '../models';
import { ALL_GRAMMAR_LESSONS } from './grammarCourse';
import { buildExerciseChoices, buildWordOrderDisplay, getExerciseFormat, getExerciseInstruction } from './exerciseFactory';
import { GRAMMAR_KEY_TOKENS, buildGrammarWhy, getGrammarKeyword } from './grammarPedagogy';
import { maskGrammarKeyword } from './grammarQuizFactory';
import { getKanjiComponentDetail } from './kanjiComponents';
import { shuffle } from './random';
import { filterGrammarForCurriculum } from './curriculum';
import type { CurriculumCode } from '../data/curriculum';
import { KANJI_READING_CARDS } from '../data/kanjiReadingCards';

export type KanjiAnswerTarget = 'french' | 'japanese' | 'components';
type GlobalQuizBuildOptions = Pick<LearningPreferences, 'japaneseAnswerMode' | 'quizDifficulty'> & { curriculumCode: CurriculumCode };

export function getGlobalDomainLabel(domain: GlobalQuizDomain): string {
  if (domain === 'kana') return 'Kana';
  if (domain === 'vocabulary') return 'Vocabulaire';
  if (domain === 'grammar') return 'Grammaire';
  return 'Kanji';
}

function getPreferredJapaneseWord(item: WordLookupEntry): string {
  return item.kanji || item.japanese;
}

function getKanjiJapaneseReading(item: KanjiItem): string {
  const source = item.kunyomi || item.n5_readings || item.onyomi || '';
  return source
    .split(/[、,;；/]/)
    .map((part) => part.trim())
    .filter(Boolean)[0] || item.character;
}

function pickCycleItem<T>(items: T[], index: number): T {
  return items[index % items.length];
}

function getGlobalFormatLabel(format: GlobalQuizFormat): string {
  if (format === 'kana_reading') return 'Lecture kana';
  if (format === 'kana_recognition') return 'Reconnaissance kana';
  if (format === 'vocabulary_meaning') return 'Sens du mot';
  if (format === 'vocabulary_reading') return 'Lecture du mot';
  if (format === 'vocabulary_japanese') return 'Production japonaise';
  if (format === 'kanji_meaning') return 'Sens du kanji';
  if (format === 'kanji_reading') return 'Lecture du kanji';
  if (format === 'kanji_japanese_word') return 'Kanji vers japonais';
  if (format === 'kanji_components') return 'Composants du kanji';
  if (format === 'grammar_blank') return 'Forme manquante';
  if (format === 'grammar_rule') return 'Regle grammaticale';
  if (format === 'grammar_translation') return 'Comprehension';
  return 'Situation';
}

function getMeasuredSkill(format: GlobalQuizFormat): string {
  if (format === 'kana_reading') return 'Lire un kana et produire son romaji.';
  if (format === 'kana_recognition') return 'Reconnaître le signe correspondant à un son.';
  if (format === 'vocabulary_meaning') return 'Comprendre un mot japonais en contexte court.';
  if (format === 'vocabulary_reading') return 'Retrouver la lecture d un mot affiche en japonais.';
  if (format === 'vocabulary_japanese') return 'Produire le mot japonais depuis le français.';
  if (format === 'kanji_meaning') return 'Associer un kanji à son sens principal.';
  if (format === 'kanji_reading') return 'Retrouver une lecture N5 utile du kanji.';
  if (format === 'kanji_japanese_word') return 'Repondre en japonais a partir du kanji.';
  if (format === 'kanji_components') return 'Identifier les composants visuels qui aident a memoriser le kanji.';
  if (format === 'grammar_blank') return 'Choisir la particule ou forme manquante.';
  if (format === 'grammar_rule') return 'Identifier la règle adaptée à une intention.';
  if (format === 'grammar_translation') return 'Comprendre le sens global de la phrase.';
  return 'Choisir la réponse naturelle selon la situation.';
}

function withFormat(
  question: Omit<GlobalQuizQuestion, 'formatLabel' | 'measuredSkill' | 'exerciseFormat'>,
  mode: GlobalQuizMode = 'blank_qcm',
): GlobalQuizQuestion {
  const exerciseFormat = getExerciseFormat(mode, question.format);
  return {
    ...question,
    exerciseFormat,
    formatLabel: getGlobalFormatLabel(question.format),
    measuredSkill: `${getMeasuredSkill(question.format)} ${getExerciseInstruction(exerciseFormat)}`,
  };
}

export function getKnowledgeQuizModeCopy(mode: GlobalQuizMode, scope: KnowledgeQuizScope | GlobalQuizDomain) {
  const base = GLOBAL_QUIZ_MODES.find((item) => item.id === mode) ?? GLOBAL_QUIZ_MODES[0];
  if (scope === 'all') return base;
  const domain = getGlobalDomainLabel(scope);
  if (mode === 'blank_qcm') return { ...base, title: `QCM ${domain}`, subtitle: `Quatre choix portant uniquement sur ${domain}.` };
  if (mode === 'matching') return { ...base, title: `Associations ${domain}`, subtitle: `Relie cinq éléments de ${domain} à leur correspondance.` };
  if (mode === 'question_answer') return { ...base, title: `Question inversée ${domain}`, subtitle: `Pars du sens ou de la lecture pour retrouver la réponse en ${domain}.` };
  if (mode === 'arcade') return { ...base, title: `Défi ${domain}`, subtitle: `Score, séries et combo sur le domaine ${domain}.` };
  return { ...base, title: `Réponse directe ${domain}`, subtitle: `Écris directement la réponse attendue en ${domain}.` };
}

export function buildGlobalQuizQuestions(
  size: 10 | 20,
  mode: Exclude<GlobalQuizMode, 'matching'>,
  kanaCards: KanaCard[],
  vocabulary: WordLookupEntry[],
  kanjiItems: KanjiItem[],
  scope: KnowledgeQuizScope = 'all',
  kanjiAnswerTarget: KanjiAnswerTarget = 'french',
  options: Partial<GlobalQuizBuildOptions> = {}
): GlobalQuizQuestion[] {
  const kanaPool = shuffle(kanaCards).slice(0, Math.max(size, 20));
  const vocabularyPool = shuffle(
    vocabulary.filter((item, index, list) =>
      Boolean(item.japanese && item.meaning_fr) && list.findIndex((candidate) => candidate.japanese === item.japanese) === index
    )
  ).slice(0, Math.max(size, 20));
  const grammarPool = shuffle(
    options.curriculumCode ? filterGrammarForCurriculum(ALL_GRAMMAR_LESSONS, options.curriculumCode) : ALL_GRAMMAR_LESSONS,
  ).slice(0, Math.max(size, 20));
  const kanjiPool = shuffle(kanjiItems).slice(0, Math.max(size, 20));
  const availableDomains: GlobalQuizDomain[] = [
    ...(kanaPool.length ? ['kana' as const] : []),
    ...(vocabularyPool.length ? ['vocabulary' as const] : []),
    ...(grammarPool.length ? ['grammar' as const] : []),
    ...(kanjiPool.length ? ['kanji' as const] : []),
  ];
  const domains: GlobalQuizDomain[] = scope === 'all' ? availableDomains : availableDomains.filter((domain) => domain === scope);
  if (!domains.length) return [];

  return Array.from({ length: size }, (_, index) => {
    const domain = domains[index % domains.length];
    const reverse = mode === 'question_answer';
    const direct = mode === 'direct_input';
    if (domain === 'kana') {
      const item = kanaPool[index % kanaPool.length];
      const answer = item.character;
      const alternatives = kanaPool.map((candidate) => candidate.character);
      return withFormat({
        id: `global-kana-${index}-${item.id}`,
        domain,
        format: 'kana_recognition',
        prompt: 'Quel kana correspond à ce son ?',
        display: item.romaji,
        correctAnswer: answer,
        choices: buildExerciseChoices({ correctAnswer: answer, alternatives, direct }),
        explanation: `${item.character} se lit ${item.romaji}.`,
      }, mode);
    }
    if (domain === 'vocabulary') {
      const item = vocabularyPool[index % vocabularyPool.length];
      const japaneseWord = getPreferredJapaneseWord(item);
      const formatCycle: GlobalQuizFormat[] = options.japaneseAnswerMode
        ? ['vocabulary_japanese', 'vocabulary_reading']
        : direct
        ? ['vocabulary_reading', 'vocabulary_japanese']
        : reverse
          ? ['vocabulary_japanese', 'vocabulary_reading']
          : ['vocabulary_meaning', 'vocabulary_reading', 'vocabulary_japanese'];
      const directAnswer = item.kana || item.japanese;
      let format = pickCycleItem(formatCycle, index);
      if (format === 'vocabulary_reading' && japaneseWord === directAnswer) {
        format = 'vocabulary_japanese';
      }
      const answer =
        format === 'vocabulary_meaning'
          ? item.meaning_fr
          : format === 'vocabulary_japanese'
            ? japaneseWord
            : directAnswer;
      const alternatives = vocabularyPool.map((candidate) =>
        format === 'vocabulary_meaning'
          ? candidate.meaning_fr
          : format === 'vocabulary_japanese'
            ? getPreferredJapaneseWord(candidate)
            : candidate.kana || candidate.japanese
      );
      return withFormat({
        id: `global-vocabulary-${index}-${item.id}`,
        domain,
        format,
        prompt:
          format === 'vocabulary_meaning'
            ? 'Que signifie ce mot ?'
            : format === 'vocabulary_japanese'
              ? 'Quel mot japonais correspond ?'
              : 'Quelle est la lecture de ce mot ?',
        display: format === 'vocabulary_japanese' ? item.meaning_fr : japaneseWord,
        correctAnswer: answer,
        choices: buildExerciseChoices({ correctAnswer: answer, alternatives, direct }),
        explanation: `${item.japanese}${item.romaji ? ` (${item.romaji})` : ''} signifie « ${item.meaning_fr} ».` ,
      }, mode);
    }
    if (domain === 'grammar') {
      const lesson = grammarPool[index % grammarPool.length];
      const example = lesson.examples[index % lesson.examples.length] ?? lesson.examples[0];
      const keyword = getGrammarKeyword(lesson, example);
      const formatCycle: GlobalQuizFormat[] = options.quizDifficulty === 'hard'
        ? ['grammar_blank', 'grammar_translation']
        : direct
        ? ['grammar_blank']
        : reverse
          ? ['grammar_translation', 'grammar_blank']
          : ['grammar_blank', 'grammar_translation'];
      const format = pickCycleItem(formatCycle, index);
      const answer =
        format === 'grammar_translation'
          ? example.fr
          : keyword;
      const alternatives = format === 'grammar_translation'
          ? grammarPool.map((candidate) => candidate.examples[0]?.fr ?? '')
          : GRAMMAR_KEY_TOKENS;
      return withFormat({
        id: `global-grammar-${index}-${lesson.id}`,
        domain,
        format,
        prompt:
          format === 'grammar_translation'
            ? 'Choisis la bonne traduction française.'
            : 'Complète la phrase avec la forme grammaticale correcte.',
        display:
          format === 'grammar_blank'
              ? maskGrammarKeyword(example.kanji || example.kana, keyword)
              : format === 'grammar_translation'
                ? buildWordOrderDisplay(example.kanji || example.kana)
              : example.kanji || example.kana,
        correctAnswer: answer,
        choices: buildExerciseChoices({ correctAnswer: answer, alternatives, direct }),
        explanation: `${lesson.title} : ${buildGrammarWhy(lesson)}`,
      }, mode);
    }
    const item = kanjiPool[index % kanjiPool.length];
    const japaneseAnswer = getKanjiJapaneseReading(item);
    const detail = getKanjiComponentDetail(item.character);
    const componentAnswer = detail?.components.join(' + ') || item.meaning_fr;
    const formatCycle: GlobalQuizFormat[] =
      kanjiAnswerTarget === 'components'
        ? ['kanji_components']
        : kanjiAnswerTarget === 'japanese' || options.japaneseAnswerMode
          ? ['kanji_reading', 'kanji_japanese_word']
          : ['kanji_meaning', 'kanji_reading'];
    const format = pickCycleItem(formatCycle, index);
    const answer =
      format === 'kanji_meaning'
        ? item.meaning_fr
        : format === 'kanji_components'
          ? componentAnswer
          : japaneseAnswer;
    const alternatives = kanjiPool.map((candidate) =>
      format === 'kanji_meaning'
        ? candidate.meaning_fr
        : format === 'kanji_components'
          ? getKanjiComponentDetail(candidate.character)?.components.join(' + ') || candidate.meaning_fr
          : getKanjiJapaneseReading(candidate)
    );
    return withFormat({
      id: `global-kanji-${index}-${item.id}`,
      domain,
      format,
      prompt:
        format === 'kanji_meaning'
          ? 'Quel est le sens principal de ce kanji ?'
          : format === 'kanji_components'
            ? 'Quels composants aident a retenir ce kanji ?'
            : format === 'kanji_japanese_word'
              ? 'Reponds en japonais : quelle lecture utile correspond ?'
              : 'Quelle lecture japonaise correspond a ce kanji ?',
      display: item.character,
      correctAnswer: answer,
      choices: buildExerciseChoices({ correctAnswer: answer, alternatives, direct }),
      explanation:
        format === 'kanji_components'
          ? `${item.character} : ${detail?.mnemonicFr ?? `Associe ce kanji a ${item.meaning_fr}.`}`
          : `${item.character} signifie « ${item.meaning_fr} ». Lecture utile : ${KANJI_READING_CARDS[item.character]?.readings[0]?.kana || item.n5_readings || item.onyomi || item.kunyomi || 'à réviser'}${KANJI_READING_CARDS[item.character]?.readings[0]?.romaji ? ` (${KANJI_READING_CARDS[item.character].readings[0].romaji})` : ''}.`,
      srsItemId: item.id,
      srsItemType: 'kanji',
    }, mode);
  });
}

export function createGlobalQuizSession(questions: GlobalQuizQuestion[]): GlobalQuizSession {
  return {
    questions,
    currentIndex: 0,
    selected: null,
    correctCount: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    mistakes: [],
    finished: questions.length === 0,
  };
}

export function buildGlobalMatchingSession(
  kanaCards: KanaCard[],
  vocabulary: WordLookupEntry[],
  kanjiItems: KanjiItem[],
  scope: KnowledgeQuizScope = 'all',
  curriculumCode: CurriculumCode = '10C',
): GlobalMatchingSession {
  const kanaPool = shuffle(kanaCards);
  const vocabularyPool = shuffle(vocabulary.filter((item) => item.japanese && item.meaning_fr));
  const grammarPool = shuffle(filterGrammarForCurriculum(ALL_GRAMMAR_LESSONS, curriculumCode));
  const kanjiPool = shuffle(kanjiItems);
  const rounds = Array.from({ length: 3 }, (_, roundIndex) => {
    const allPairs: GlobalMatchingPair[] = shuffle([
      ...(kanaPool.length ? Array.from({ length: 5 }, (_, index) => {
        const item = kanaPool[(roundIndex * 5 + index) % kanaPool.length];
        return { id: `global-match-${roundIndex}-kana-${index}`, domain: 'kana' as const, left: item.character, right: item.romaji };
      }) : []),
      ...(vocabularyPool.length ? Array.from({ length: 5 }, (_, index) => {
        const item = vocabularyPool[(roundIndex * 5 + index) % vocabularyPool.length];
        return { id: `global-match-${roundIndex}-vocab-${index}`, domain: 'vocabulary' as const, left: getPreferredJapaneseWord(item), right: item.meaning_fr };
      }) : []),
      ...(grammarPool.length ? Array.from({ length: 5 }, (_, index) => {
        const lesson = grammarPool[(roundIndex * 5 + index) % grammarPool.length];
        const example = lesson.examples[index % lesson.examples.length] ?? lesson.examples[0];
        return { id: `global-match-${roundIndex}-grammar-${index}`, domain: 'grammar' as const, left: example.kanji || example.kana, right: example.fr };
      }) : []),
      ...(kanjiPool.length ? Array.from({ length: 5 }, (_, index) => {
        const item = kanjiPool[(roundIndex * 5 + index) % kanjiPool.length];
        return { id: `global-match-${roundIndex}-kanji-${index}`, domain: 'kanji' as const, left: item.character, right: item.meaning_fr };
      }) : []),
    ]);
    const pairs = (scope === 'all' ? allPairs : allPairs.filter((pair) => pair.domain === scope)).slice(0, 5);
    return { pairs, rightOrder: shuffle(pairs.map((pair) => pair.id)) };
  });
  return {
    rounds,
    currentRound: 0,
    selectedLeftId: null,
    selectedRightId: null,
    matchedIds: [],
    errors: 0,
    score: 0,
    finished: false,
    locked: false,
  };
}

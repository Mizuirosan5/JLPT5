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

export type KanjiAnswerTarget = 'french' | 'japanese' | 'components';
type GlobalQuizBuildOptions = Pick<LearningPreferences, 'japaneseAnswerMode' | 'quizDifficulty'>;

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
    .split(/[ã€,;ï¼›/]/)
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
  if (format === 'kana_recognition') return 'Reconnaitre le signe correspondant a un son.';
  if (format === 'vocabulary_meaning') return 'Comprendre un mot japonais en contexte court.';
  if (format === 'vocabulary_reading') return 'Retrouver la lecture d un mot affiche en japonais.';
  if (format === 'vocabulary_japanese') return 'Produire le mot japonais depuis le francais.';
  if (format === 'kanji_meaning') return 'Associer un kanji a son sens principal.';
  if (format === 'kanji_reading') return 'Retrouver une lecture N5 utile du kanji.';
  if (format === 'kanji_japanese_word') return 'Repondre en japonais a partir du kanji.';
  if (format === 'kanji_components') return 'Identifier les composants visuels qui aident a memoriser le kanji.';
  if (format === 'grammar_blank') return 'Choisir la particule ou forme manquante.';
  if (format === 'grammar_rule') return 'Identifier la regle adaptee a une intention.';
  if (format === 'grammar_translation') return 'Comprendre le sens global de la phrase.';
  return 'Choisir la reponse naturelle selon la situation.';
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

export function getKnowledgeQuizModeCopy(mode: GlobalQuizMode, scope: KnowledgeQuizScope) {
  const base = GLOBAL_QUIZ_MODES.find((item) => item.id === mode) ?? GLOBAL_QUIZ_MODES[0];
  if (scope === 'all') return base;
  const domain = getGlobalDomainLabel(scope);
  if (mode === 'blank_qcm') return { ...base, title: `QCM ${domain}`, subtitle: `Quatre choix portant uniquement sur ${domain}.` };
  if (mode === 'matching') return { ...base, title: `Associations ${domain}`, subtitle: `Relie cinq Ã©lÃ©ments de ${domain} Ã  leur correspondance.` };
  if (mode === 'question_answer') return { ...base, title: `Question inversÃ©e ${domain}`, subtitle: `Pars du sens ou de la lecture pour retrouver la rÃ©ponse en ${domain}.` };
  if (mode === 'arcade') return { ...base, title: `DÃ©fi ${domain}`, subtitle: `Score, sÃ©ries et combo sur le domaine ${domain}.` };
  return { ...base, title: `RÃ©ponse directe ${domain}`, subtitle: `Ã‰cris directement la rÃ©ponse attendue en ${domain}.` };
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
  const grammarPool = shuffle(ALL_GRAMMAR_LESSONS).slice(0, Math.max(size, 20));
  const kanjiPool = shuffle(kanjiItems).slice(0, Math.max(size, 20));
  const domains: GlobalQuizDomain[] = scope === 'all' ? ['kana', 'vocabulary', 'grammar', 'kanji'] : [scope];

  return Array.from({ length: size }, (_, index) => {
    const domain = domains[index % domains.length];
    const reverse = mode === 'question_answer';
    const direct = mode === 'direct_input';
    if (domain === 'kana') {
      const item = kanaPool[index % kanaPool.length];
      const answer = reverse ? item.character : item.romaji;
      const alternatives = kanaPool.map((candidate) => (reverse ? candidate.character : candidate.romaji));
      return withFormat({
        id: `global-kana-${index}-${item.id}`,
        domain,
        format: reverse ? 'kana_recognition' : 'kana_reading',
        prompt: reverse ? 'Quel kana correspond Ã  ce romaji ?' : 'Quelle est la lecture en romaji ?',
        display: reverse ? item.romaji : item.character,
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
      const format = pickCycleItem(formatCycle, index);
      const directAnswer = item.romaji || item.kana || item.meaning_fr;
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
            : candidate.romaji || candidate.kana || candidate.meaning_fr
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
        explanation: `${item.japanese}${item.romaji ? ` (${item.romaji})` : ''} signifie Â« ${item.meaning_fr} Â».` ,
      }, mode);
    }
    if (domain === 'grammar') {
      const lesson = grammarPool[index % grammarPool.length];
      const example = lesson.examples[index % lesson.examples.length] ?? lesson.examples[0];
      const keyword = getGrammarKeyword(lesson, example);
      const formatCycle: GlobalQuizFormat[] = options.quizDifficulty === 'hard'
        ? ['grammar_blank', 'grammar_rule', 'grammar_situation']
        : direct
        ? ['grammar_blank']
        : reverse
          ? ['grammar_rule', 'grammar_situation']
          : ['grammar_blank', 'grammar_translation', 'grammar_rule', 'grammar_situation'];
      const format = pickCycleItem(formatCycle, index);
      const answer =
        format === 'grammar_translation'
          ? example.fr
          : format === 'grammar_rule' || format === 'grammar_situation'
            ? lesson.title
            : keyword;
      const alternatives = reverse
        ? grammarPool.map((candidate) => candidate.title)
        : format === 'grammar_translation'
          ? grammarPool.map((candidate) => candidate.examples[0]?.fr ?? '')
          : format === 'grammar_rule' || format === 'grammar_situation'
            ? grammarPool.map((candidate) => candidate.title)
        : GRAMMAR_KEY_TOKENS;
      return withFormat({
        id: `global-grammar-${index}-${lesson.id}`,
        domain,
        format,
        prompt:
          format === 'grammar_translation'
            ? 'Choisis la bonne traduction francaise.'
            : format === 'grammar_rule'
              ? 'Quelle regle correspond a cette phrase ?'
              : format === 'grammar_situation'
                ? 'Quelle regle repond a cette intention ?'
                : 'Complete la phrase avec la forme grammaticale correcte.',
        display:
          format === 'grammar_situation'
            ? lesson.goal
            : format === 'grammar_blank'
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
          : `${item.character} signifie Â« ${item.meaning_fr} Â». Lectures : ${item.n5_readings || item.onyomi || item.kunyomi || 'Ã  rÃ©viser'}.`,
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
  scope: KnowledgeQuizScope = 'all'
): GlobalMatchingSession {
  const kanaPool = shuffle(kanaCards);
  const vocabularyPool = shuffle(vocabulary.filter((item) => item.japanese && item.meaning_fr));
  const grammarPool = shuffle(ALL_GRAMMAR_LESSONS);
  const kanjiPool = shuffle(kanjiItems);
  const rounds = Array.from({ length: 3 }, (_, roundIndex) => {
    const kana = kanaPool[roundIndex % kanaPool.length];
    const word = vocabularyPool[roundIndex % vocabularyPool.length];
    const grammar = grammarPool[roundIndex % grammarPool.length];
    const example = grammar.examples[roundIndex % grammar.examples.length] ?? grammar.examples[0];
    const kanji = kanjiPool[roundIndex % kanjiPool.length];
    const extraWord = vocabularyPool[(roundIndex + 3) % vocabularyPool.length];
    const allPairs: GlobalMatchingPair[] = [
      ...Array.from({ length: 5 }, (_, index) => {
        const item = kanaPool[(roundIndex * 5 + index) % kanaPool.length];
        return { id: `global-match-${roundIndex}-kana-${index}`, domain: 'kana' as const, left: item.character, right: item.romaji };
      }),
      ...Array.from({ length: 5 }, (_, index) => {
        const item = vocabularyPool[(roundIndex * 5 + index) % vocabularyPool.length];
        return { id: `global-match-${roundIndex}-vocab-${index}`, domain: 'vocabulary' as const, left: getPreferredJapaneseWord(item), right: item.meaning_fr };
      }),
      ...Array.from({ length: 5 }, (_, index) => {
        const item = kanjiPool[(roundIndex * 5 + index) % kanjiPool.length];
        return { id: `global-match-${roundIndex}-kanji-${index}`, domain: 'kanji' as const, left: item.character, right: item.meaning_fr };
      }),
    ];
    const mixedPairs: GlobalMatchingPair[] = [
      { id: `global-match-${roundIndex}-kana`, domain: 'kana', left: kana.character, right: kana.romaji },
      { id: `global-match-${roundIndex}-vocab`, domain: 'vocabulary', left: getPreferredJapaneseWord(word), right: word.meaning_fr },
      { id: `global-match-${roundIndex}-grammar`, domain: 'grammar', left: example.kanji || example.kana, right: example.fr },
      { id: `global-match-${roundIndex}-kanji`, domain: 'kanji', left: kanji.character, right: kanji.meaning_fr },
      { id: `global-match-${roundIndex}-extra`, domain: 'vocabulary', left: getPreferredJapaneseWord(extraWord), right: extraWord.meaning_fr },
    ];
    const pairs = scope === 'all' ? mixedPairs : allPairs.filter((pair) => pair.domain === scope).slice(0, 5);
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

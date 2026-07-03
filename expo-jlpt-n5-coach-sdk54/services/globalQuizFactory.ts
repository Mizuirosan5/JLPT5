import { GLOBAL_QUIZ_MODES } from '../models';
import type {
  GlobalMatchingPair,
  GlobalMatchingSession,
  GlobalQuizDomain,
  GlobalQuizMode,
  GlobalQuizQuestion,
  GlobalQuizSession,
  KanaCard,
  KanjiItem,
  KnowledgeQuizScope,
  WordLookupEntry,
} from '../models';
import { ALL_GRAMMAR_LESSONS } from './grammarCourse';
import { GRAMMAR_KEY_TOKENS, buildGrammarWhy, getGrammarKeyword } from './grammarPedagogy';
import { maskGrammarKeyword, uniqueChoices } from './grammarQuizFactory';
import { shuffle } from './random';

export function getGlobalDomainLabel(domain: GlobalQuizDomain): string {
  if (domain === 'kana') return 'Kana';
  if (domain === 'vocabulary') return 'Vocabulaire';
  if (domain === 'grammar') return 'Grammaire';
  return 'Kanji';
}

export function getKnowledgeQuizModeCopy(mode: GlobalQuizMode, scope: KnowledgeQuizScope) {
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
  scope: KnowledgeQuizScope = 'all'
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
      return {
        id: `global-kana-${index}-${item.id}`,
        domain,
        prompt: reverse ? 'Quel kana correspond à ce romaji ?' : 'Quelle est la lecture en romaji ?',
        display: reverse ? item.romaji : item.character,
        correctAnswer: answer,
        choices: direct ? [] : uniqueChoices([answer, ...shuffle(alternatives)], alternatives),
        explanation: `${item.character} se lit ${item.romaji}.`,
      };
    }
    if (domain === 'vocabulary') {
      const item = vocabularyPool[index % vocabularyPool.length];
      const directAnswer = item.romaji || item.kana || item.meaning_fr;
      const answer = direct ? directAnswer : reverse ? item.japanese : item.meaning_fr;
      const alternatives = vocabularyPool.map((candidate) =>
        direct ? candidate.romaji || candidate.kana || candidate.meaning_fr : reverse ? candidate.japanese : candidate.meaning_fr
      );
      return {
        id: `global-vocabulary-${index}-${item.id}`,
        domain,
        prompt: direct ? 'Écris la lecture en romaji.' : reverse ? 'Quel mot japonais correspond ?' : 'Que signifie ce mot ?',
        display: direct || !reverse ? item.japanese : item.meaning_fr,
        correctAnswer: answer,
        choices: direct ? [] : uniqueChoices([answer, ...shuffle(alternatives)], alternatives),
        explanation: `${item.japanese}${item.romaji ? ` (${item.romaji})` : ''} signifie « ${item.meaning_fr} ».` ,
      };
    }
    if (domain === 'grammar') {
      const lesson = grammarPool[index % grammarPool.length];
      const example = lesson.examples[index % lesson.examples.length] ?? lesson.examples[0];
      const keyword = getGrammarKeyword(lesson, example);
      const answer = reverse ? lesson.title : keyword;
      const alternatives = reverse
        ? grammarPool.map((candidate) => candidate.title)
        : GRAMMAR_KEY_TOKENS;
      return {
        id: `global-grammar-${index}-${lesson.id}`,
        domain,
        prompt: reverse ? 'Quelle règle répond à cette intention ?' : 'Complète la phrase avec la forme grammaticale correcte.',
        display: reverse ? lesson.goal : maskGrammarKeyword(example.kanji || example.kana, keyword),
        correctAnswer: answer,
        choices: direct ? [] : uniqueChoices([answer, ...shuffle(alternatives)], alternatives),
        explanation: `${lesson.title} : ${buildGrammarWhy(lesson)}`,
      };
    }
    const item = kanjiPool[index % kanjiPool.length];
    const answer = reverse ? item.character : item.meaning_fr;
    const alternatives = kanjiPool.map((candidate) => (reverse ? candidate.character : candidate.meaning_fr));
    return {
      id: `global-kanji-${index}-${item.id}`,
      domain,
      prompt: reverse ? 'Quel kanji correspond à ce sens ?' : 'Quel est le sens principal de ce kanji ?',
      display: reverse ? item.meaning_fr : item.character,
      correctAnswer: answer,
      choices: direct ? [] : uniqueChoices([answer, ...shuffle(alternatives)], alternatives),
      explanation: `${item.character} signifie « ${item.meaning_fr} ». Lectures : ${item.n5_readings || item.onyomi || item.kunyomi || 'à réviser'}.`,
    };
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
        return { id: `global-match-${roundIndex}-vocab-${index}`, domain: 'vocabulary' as const, left: item.japanese, right: item.meaning_fr };
      }),
      ...Array.from({ length: 5 }, (_, index) => {
        const item = kanjiPool[(roundIndex * 5 + index) % kanjiPool.length];
        return { id: `global-match-${roundIndex}-kanji-${index}`, domain: 'kanji' as const, left: item.character, right: item.meaning_fr };
      }),
    ];
    const mixedPairs: GlobalMatchingPair[] = [
      { id: `global-match-${roundIndex}-kana`, domain: 'kana', left: kana.character, right: kana.romaji },
      { id: `global-match-${roundIndex}-vocab`, domain: 'vocabulary', left: word.japanese, right: word.meaning_fr },
      { id: `global-match-${roundIndex}-grammar`, domain: 'grammar', left: example.kanji || example.kana, right: example.fr },
      { id: `global-match-${roundIndex}-kanji`, domain: 'kanji', left: kanji.character, right: kanji.meaning_fr },
      { id: `global-match-${roundIndex}-extra`, domain: 'vocabulary', left: extraWord.japanese, right: extraWord.meaning_fr },
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

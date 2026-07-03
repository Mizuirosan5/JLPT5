import type {
  KanaCard,
  KanaExercise,
  KanaExerciseDirection,
  KanaQuizAnswerMode,
  KanaQuizSession,
  KanaQuizSize,
} from '../models';
import { buildAdaptiveKanaQuizPool } from './kanaArcade';
import { shuffle } from './random';

const KANA_CONFUSION_GROUPS = [
  ['シ', 'ツ', 'ソ', 'ン'],
  ['さ', 'ち'],
  ['わ', 'ね', 'れ'],
  ['め', 'ぬ'],
  ['ク', 'ケ'],
  ['ア', 'マ'],
  ['フ', 'ワ'],
  ['ラ', 'ヲ'],
  ['き', 'さ'],
  ['は', 'ほ'],
];

export function buildKanaQuiz(
  cards: KanaCard[],
  size: KanaQuizSize,
  direction: KanaExerciseDirection,
  answerMode: KanaQuizAnswerMode
): KanaExercise[] {
  if (cards.length < 4) return [];
  return buildAdaptiveKanaQuizPool(cards, Math.min(size, cards.length))
    .map((prompt) => buildKanaExercise(cards, prompt, direction, answerMode))
    .filter((exercise): exercise is KanaExercise => exercise !== null);
}

export function buildConfusionKanaQuiz(
  cards: KanaCard[],
  size: KanaQuizSize,
  answerMode: KanaQuizAnswerMode
): KanaExercise[] {
  if (cards.length < 4) return [];
  const byCharacter = new Map(cards.map((card) => [card.character, card]));
  const exercises: KanaExercise[] = [];
  shuffle(KANA_CONFUSION_GROUPS).forEach((group) => {
    const groupCards = group.map((character) => byCharacter.get(character)).filter((card): card is KanaCard => !!card);
    if (groupCards.length < 2) return;
    groupCards.forEach((prompt) => {
      if (exercises.length >= size) return;
      const choices = shuffle(groupCards.map((card) => card.character));
      exercises.push({
        prompt,
        choices,
        direction: 'romaji_to_kana',
        answerMode,
      });
    });
  });
  if (exercises.length >= Math.min(size, cards.length)) return shuffle(exercises).slice(0, size);
  return buildKanaQuiz(cards, size, 'romaji_to_kana', answerMode);
}

export function buildMatchingRounds(cards: KanaCard[], roundCount: number, roundSize: number): KanaCard[][] {
  if (cards.length < roundSize) return [];
  const targetSize = roundCount * roundSize;
  const adaptivePool = buildAdaptiveKanaQuizPool(cards, Math.min(targetSize, cards.length));
  const pool = [...adaptivePool];
  while (pool.length < targetSize) {
    shuffle(cards).forEach((card) => {
      if (pool.length < targetSize) pool.push(card);
    });
  }
  return Array.from({ length: roundCount }, (_, roundIndex) =>
    pool.slice(roundIndex * roundSize, roundIndex * roundSize + roundSize)
  );
}

export function getMatchingTotalCount(session: KanaQuizSession): number {
  if (session.matchingRounds?.length) {
    return session.matchingRounds.reduce((total, round) => total + round.length, 0);
  }
  return session.matchingCards?.length ?? 0;
}

export function buildKanaExercise(
  cards: KanaCard[],
  prompt: KanaCard,
  direction: KanaExerciseDirection,
  answerMode: KanaQuizAnswerMode
): KanaExercise | null {
  if (cards.length < 4) return null;
  const answerKey = direction === 'kana_to_romaji' ? 'romaji' : 'character';
  const correctAnswer = prompt[answerKey];
  if (answerMode === 'direct_input') {
    return {
      prompt,
      direction,
      answerMode,
      choices: [],
    };
  }
  const distractors = shuffle(cards.filter((card) => card.id !== prompt.id))
    .map((card) => card[answerKey])
    .filter((value, index, values) => value !== correctAnswer && values.indexOf(value) === index)
    .slice(0, 3);
  if (distractors.length < 3) return null;
  return {
    prompt,
    direction,
    answerMode,
    choices: shuffle([correctAnswer, ...distractors]),
  };
}

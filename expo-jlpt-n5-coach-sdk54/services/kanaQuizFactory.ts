import type {
  KanaCard,
  KanaExercise,
  KanaExerciseDirection,
  KanaQuizAnswerMode,
  KanaQuizSession,
  KanaQuizSize,
} from '../models';
import { buildAdaptiveKanaQuizPool } from './kanaArcade';
import { shuffle, shuffleChoices } from './random';

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
  const prompts = buildAdaptiveKanaQuizPool(cards, Math.min(size, cards.length));
  while (prompts.length < size) {
    const previousId = prompts.at(-1)?.id;
    const nextBatch = shuffle(cards).sort((left, right) => {
      if (left.id === previousId) return 1;
      if (right.id === previousId) return -1;
      return 0;
    });
    for (const card of nextBatch) {
      if (prompts.length >= size) break;
      prompts.push(card);
    }
  }
  return prompts
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
  const promptIsCombined = [...prompt.character].length > 1;
  const promptRomajiLength = [...prompt.romaji].length;
  const distractors = shuffle(cards.filter((card) => card.id !== prompt.id))
    .sort((left, right) => {
      const leftPenalty =
        Number(([...left.character].length > 1) !== promptIsCombined) * 10 +
        Math.abs([...left.romaji].length - promptRomajiLength);
      const rightPenalty =
        Number(([...right.character].length > 1) !== promptIsCombined) * 10 +
        Math.abs([...right.romaji].length - promptRomajiLength);
      return leftPenalty - rightPenalty;
    })
    .map((card) => card[answerKey])
    .filter((value, index, values) => value !== correctAnswer && values.indexOf(value) === index)
    .slice(0, 3);
  if (distractors.length < 3) return null;
  return {
    prompt,
    direction,
    answerMode,
    choices: shuffleChoices([correctAnswer, ...distractors], correctAnswer),
  };
}

const BASE_KANA_ROMAJI: Record<string, string> = {
  き: 'ki', ぎ: 'gi', し: 'shi', じ: 'ji', ち: 'chi', に: 'ni', ひ: 'hi', び: 'bi', ぴ: 'pi', み: 'mi', り: 'ri',
  キ: 'ki', ギ: 'gi', シ: 'shi', ジ: 'ji', チ: 'chi', ニ: 'ni', ヒ: 'hi', ビ: 'bi', ピ: 'pi', ミ: 'mi', リ: 'ri',
};

const SMALL_KANA_ROMAJI: Record<string, string> = {
  ゃ: 'ya', ゅ: 'yu', ょ: 'yo', ャ: 'ya', ュ: 'yu', ョ: 'yo',
};

export function getCombinedKanaExplanation(card: KanaCard): string | null {
  const characters = [...card.character];
  if (characters.length !== 2) return null;
  const [base, small] = characters;
  const baseRomaji = BASE_KANA_ROMAJI[base];
  const smallRomaji = SMALL_KANA_ROMAJI[small];
  if (!baseRomaji || !smallRomaji) return null;
  return `${base} (${baseRomaji}) + ${small} (${smallRomaji}) = ${card.character} (${card.romaji}). Le petit ${small} fusionne avec le kana précédent.`;
}

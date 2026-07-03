import type { KanaArcadeQuestion, KanaCard, KanaQuizSize } from '../models';
import { getKanaPriority } from './kanaProgress';
import { shuffle } from './random';

export function buildAdaptiveKanaQuizPool(cards: KanaCard[], size: number): KanaCard[] {
  const weak = shuffle(cards.filter((card) => getKanaPriority(card) <= 2));
  const learning = shuffle(cards.filter((card) => getKanaPriority(card) === 3));
  const mastered = shuffle(cards.filter((card) => getKanaPriority(card) >= 4));
  const selected = new Map<string, KanaCard>();
  const take = (pool: KanaCard[], count: number) => {
    pool.forEach((card) => {
      if (selected.size < size && selected.size < count) selected.set(card.id, card);
    });
  };

  take(weak, Math.ceil(size * 0.6));
  take([...selected.values(), ...learning], Math.ceil(size * 0.85));
  take([...selected.values(), ...mastered], size);
  shuffle(cards).forEach((card) => {
    if (selected.size < size) selected.set(card.id, card);
  });

  return shuffle([...selected.values()]);
}

export function buildKanaArcadeQuestions(cards: KanaCard[], size: KanaQuizSize): KanaArcadeQuestion[] {
  const usableCards = cards.filter((card) => card.character && card.romaji && !card.character.includes('?'));
  if (usableCards.length < 4) return [];
  return buildAdaptiveKanaQuizPool(usableCards, Math.min(size, usableCards.length))
    .map((prompt) => {
      const distractors = shuffle(usableCards.filter((card) => card.id !== prompt.id))
        .map((card) => card.romaji)
        .filter((value, index, values) => value !== prompt.romaji && values.indexOf(value) === index)
        .slice(0, 3);
      if (distractors.length < 3) return null;
      return {
        prompt,
        choices: shuffle([prompt.romaji, ...distractors]),
      };
    })
    .filter((question): question is KanaArcadeQuestion => question !== null);
}

export function getKanaArcadeMultiplier(streak: number): number {
  if (streak >= 12) return 5;
  if (streak >= 10) return 4;
  if (streak >= 8) return 3;
  if (streak >= 5) return 2;
  if (streak >= 3) return 1.5;
  return 1;
}

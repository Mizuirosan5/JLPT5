import type { KanaCard } from '../models';

export type KanaMasteryStatus = 'unseen' | 'weak' | 'known' | 'mastered';

export function getKanaMasteryStatus(card: KanaCard): KanaMasteryStatus {
  if (card.mastered === 1) return 'mastered';
  if (card.seen_count === 0) return 'unseen';
  if (card.review === 1 || card.correct_count / Math.max(1, card.seen_count) < 0.75) return 'weak';
  return 'known';
}

export function getKanaPriority(card: KanaCard): number {
  const successRate = card.seen_count > 0 ? card.correct_count / card.seen_count : 0;
  if (card.review === 1) return 0;
  if (card.seen_count === 0) return 1;
  if (successRate < 0.75) return 2;
  if (card.mastered !== 1) return 3;
  return 4;
}

export function buildSmartKanaDeck(cards: KanaCard[]): KanaCard[] {
  return [...cards]
    .sort((a, b) => getKanaPriority(a) - getKanaPriority(b) || a.seen_count - b.seen_count)
    .slice(0, Math.min(20, cards.length));
}

export function buildDailyKanaDeck(cards: KanaCard[]): KanaCard[] {
  const weak = cards.filter((card) => getKanaPriority(card) <= 2).slice(0, 10);
  const newCards = cards.filter((card) => card.seen_count === 0).slice(0, 5);
  const maintenance = cards.filter((card) => card.mastered === 1).slice(0, 5);
  const byId = new Map<string, KanaCard>();
  [...weak, ...newCards, ...maintenance].forEach((card) => byId.set(card.id, card));
  return [...byId.values()].slice(0, 20);
}

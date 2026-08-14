import type { KanjiItem, VocabularyItem } from '../models';
import { KANJI_COMPONENT_DETAILS, type KanjiComponentDetail } from '../data/kanjiComponents';

export type KanjiDetail = KanjiComponentDetail & {
  item: KanjiItem;
  relatedWords: VocabularyItem[];
};

export function getKanjiComponentDetail(character: string): KanjiComponentDetail | null {
  return KANJI_COMPONENT_DETAILS.find((detail) => detail.character === character) ?? null;
}

export function buildKanjiDetail(
  kanji: KanjiItem,
  vocabularyItems: VocabularyItem[],
): KanjiDetail {
  const fallback: KanjiComponentDetail = {
    character: kanji.character,
    components: ['forme globale'],
    mnemonicFr: `Associe ${kanji.character} a son sens principal : ${kanji.meaning_fr}.`,
    confusions: [],
  };
  const detail = getKanjiComponentDetail(kanji.character) ?? fallback;
  return {
    ...detail,
    item: kanji,
    relatedWords: vocabularyItems
      .filter((item) => `${item.kanji ?? ''}${item.japanese ?? ''}`.includes(kanji.character))
      .slice(0, 5),
  };
}

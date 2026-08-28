export type VocabularyAntonymPair = {
  id: string;
  left: { japanese: string; kana: string; romaji: string; french: string };
  right: { japanese: string; kana: string; romaji: string; french: string };
};

export const VOCABULARY_ANTONYM_PAIRS: VocabularyAntonymPair[] = [
  { id: 'hot-cold', left: { japanese: '暑い', kana: 'あつい', romaji: 'atsui', french: 'chaud (temps)' }, right: { japanese: '寒い', kana: 'さむい', romaji: 'samui', french: 'froid (temps)' } },
  { id: 'expensive-cheap', left: { japanese: '高い', kana: 'たかい', romaji: 'takai', french: 'cher' }, right: { japanese: '安い', kana: 'やすい', romaji: 'yasui', french: 'bon marché' } },
  { id: 'big-small', left: { japanese: '大きい', kana: 'おおきい', romaji: 'ookii', french: 'grand' }, right: { japanese: '小さい', kana: 'ちいさい', romaji: 'chiisai', french: 'petit' } },
  { id: 'new-old', left: { japanese: '新しい', kana: 'あたらしい', romaji: 'atarashii', french: 'nouveau' }, right: { japanese: '古い', kana: 'ふるい', romaji: 'furui', french: 'ancien' } },
  { id: 'long-short', left: { japanese: '長い', kana: 'ながい', romaji: 'nagai', french: 'long' }, right: { japanese: '短い', kana: 'みじかい', romaji: 'mijikai', french: 'court' } },
  { id: 'fast-slow', left: { japanese: '速い', kana: 'はやい', romaji: 'hayai', french: 'rapide' }, right: { japanese: '遅い', kana: 'おそい', romaji: 'osoi', french: 'lent' } },
  { id: 'early-late', left: { japanese: '早い', kana: 'はやい', romaji: 'hayai', french: 'tôt' }, right: { japanese: '遅い', kana: 'おそい', romaji: 'osoi', french: 'tard' } },
  { id: 'many-few', left: { japanese: '多い', kana: 'おおい', romaji: 'ooi', french: 'nombreux' }, right: { japanese: '少ない', kana: 'すくない', romaji: 'sukunai', french: 'peu nombreux' } },
  { id: 'near-far', left: { japanese: '近い', kana: 'ちかい', romaji: 'chikai', french: 'proche' }, right: { japanese: '遠い', kana: 'とおい', romaji: 'tooi', french: 'loin' } },
  { id: 'inside-outside', left: { japanese: '中', kana: 'なか', romaji: 'naka', french: 'intérieur' }, right: { japanese: '外', kana: 'そと', romaji: 'soto', french: 'extérieur' } },
  { id: 'above-below', left: { japanese: '上', kana: 'うえ', romaji: 'ue', french: 'dessus' }, right: { japanese: '下', kana: 'した', romaji: 'shita', french: 'dessous' } },
  { id: 'right-left', left: { japanese: '右', kana: 'みぎ', romaji: 'migi', french: 'droite' }, right: { japanese: '左', kana: 'ひだり', romaji: 'hidari', french: 'gauche' } },
  { id: 'enter-exit', left: { japanese: '入る', kana: 'はいる', romaji: 'hairu', french: 'entrer' }, right: { japanese: '出る', kana: 'でる', romaji: 'deru', french: 'sortir' } },
  { id: 'open-close', left: { japanese: '開ける', kana: 'あける', romaji: 'akeru', french: 'ouvrir' }, right: { japanese: '閉める', kana: 'しめる', romaji: 'shimeru', french: 'fermer' } },
  { id: 'start-finish', left: { japanese: '始まる', kana: 'はじまる', romaji: 'hajimaru', french: 'commencer' }, right: { japanese: '終わる', kana: 'おわる', romaji: 'owaru', french: 'finir' } },
];

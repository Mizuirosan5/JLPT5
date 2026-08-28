export type RadicalEntry = {
  symbol: string;
  variants: string[];
  nameJa: string;
  meaningFr: string;
  position: string;
};

const RADICALS: RadicalEntry[] = [
  { symbol: '一', variants: [], nameJa: 'いち', meaningFr: 'un, trait horizontal', position: 'forme entière ou base' },
  { symbol: '丨', variants: [], nameJa: 'ぼう', meaningFr: 'trait vertical', position: 'axe central' },
  { symbol: '乙', variants: [], nameJa: 'おつ', meaningFr: 'courbe, second', position: 'forme entière' },
  { symbol: '二', variants: [], nameJa: 'に', meaningFr: 'deux', position: 'forme entière' },
  { symbol: '人', variants: ['亻'], nameJa: 'ひと・にんべん', meaningFr: 'personne', position: 'forme entière ou côté gauche' },
  { symbol: '儿', variants: [], nameJa: 'ひとあし', meaningFr: 'jambes humaines', position: 'partie basse' },
  { symbol: '入', variants: [], nameJa: 'いる', meaningFr: 'entrer', position: 'forme entière' },
  { symbol: '八', variants: ['ハ'], nameJa: 'はち・はちがしら', meaningFr: 'huit, séparation', position: 'forme entière ou partie haute' },
  { symbol: '冂', variants: [], nameJa: 'けいがまえ', meaningFr: 'cadre ouvert', position: 'encadrement extérieur' },
  { symbol: '凵', variants: [], nameJa: 'うけばこ', meaningFr: 'boîte ouverte', position: 'encadrement bas' },
  { symbol: '刀', variants: ['刂'], nameJa: 'かたな・りっとう', meaningFr: 'couteau', position: 'forme entière ou côté droit' },
  { symbol: '匕', variants: [], nameJa: 'さじ', meaningFr: 'cuillère, personne assise', position: 'côté droit' },
  { symbol: '十', variants: [], nameJa: 'じゅう', meaningFr: 'dix', position: 'forme entière ou partie haute' },
  { symbol: '又', variants: [], nameJa: 'また', meaningFr: 'main droite, encore', position: 'forme entière ou partie basse' },
  { symbol: '口', variants: [], nameJa: 'くち・くちへん', meaningFr: 'bouche, ouverture', position: 'forme entière ou côté gauche' },
  { symbol: '囗', variants: [], nameJa: 'くにがまえ', meaningFr: 'enceinte, territoire', position: 'encadrement extérieur' },
  { symbol: '土', variants: [], nameJa: 'つち', meaningFr: 'terre, sol', position: 'forme entière' },
  { symbol: '夕', variants: [], nameJa: 'ゆうべ', meaningFr: 'soir', position: 'partie haute' },
  { symbol: '大', variants: [], nameJa: 'だい', meaningFr: 'grand', position: 'forme entière' },
  { symbol: '女', variants: [], nameJa: 'おんな・おんなへん', meaningFr: 'femme', position: 'forme entière ou côté gauche' },
  { symbol: '子', variants: [], nameJa: 'こ', meaningFr: 'enfant', position: 'forme entière ou partie basse' },
  { symbol: '小', variants: ['⺌'], nameJa: 'しょう・しょうがしら', meaningFr: 'petit', position: 'forme entière ou partie haute' },
  { symbol: '山', variants: [], nameJa: 'やま', meaningFr: 'montagne', position: 'forme entière' },
  { symbol: '巛', variants: ['川'], nameJa: 'まがりかわ', meaningFr: 'rivière, courant', position: 'forme entière' },
  { symbol: '工', variants: [], nameJa: 'たくみ', meaningFr: 'travail, artisan', position: 'partie basse' },
  { symbol: '干', variants: [], nameJa: 'ほす', meaningFr: 'sécher', position: 'forme entière' },
  { symbol: '彳', variants: [], nameJa: 'ぎょうにんべん', meaningFr: 'pas, déplacement', position: 'côté gauche' },
  { symbol: '日', variants: [], nameJa: 'ひ・ひへん', meaningFr: 'soleil, jour', position: 'forme entière ou côté gauche' },
  { symbol: '曰', variants: [], nameJa: 'ひらび', meaningFr: 'dire, jour aplati', position: 'partie basse' },
  { symbol: '月', variants: [], nameJa: 'つき', meaningFr: 'lune, mois', position: 'forme entière' },
  { symbol: '木', variants: [], nameJa: 'き・きへん', meaningFr: 'arbre, bois', position: 'forme entière ou côté gauche' },
  { symbol: '毋', variants: ['母'], nameJa: 'なかれ', meaningFr: 'mère, ne pas', position: 'forme entière' },
  { symbol: '气', variants: [], nameJa: 'きがまえ', meaningFr: 'air, vapeur', position: 'encadrement haut' },
  { symbol: '水', variants: ['氵'], nameJa: 'みず・さんずい', meaningFr: 'eau', position: 'forme entière ou côté gauche' },
  { symbol: '火', variants: ['灬'], nameJa: 'ひ・れっか', meaningFr: 'feu', position: 'forme entière ou partie basse' },
  { symbol: '父', variants: [], nameJa: 'ちち', meaningFr: 'père', position: 'forme entière' },
  { symbol: '生', variants: [], nameJa: 'うまれる', meaningFr: 'naître, vie', position: 'forme entière' },
  { symbol: '田', variants: [], nameJa: 'た', meaningFr: 'rizière, champ', position: 'partie haute' },
  { symbol: '白', variants: [], nameJa: 'しろ', meaningFr: 'blanc', position: 'forme entière' },
  { symbol: '耳', variants: [], nameJa: 'みみ', meaningFr: 'oreille', position: 'partie intérieure' },
  { symbol: '行', variants: [], nameJa: 'ぎょう', meaningFr: 'aller, chemin', position: 'forme entière' },
  { symbol: '襾', variants: ['西'], nameJa: 'にし', meaningFr: 'ouest, couvrir', position: 'forme entière' },
  { symbol: '見', variants: [], nameJa: 'みる', meaningFr: 'voir', position: 'forme entière' },
  { symbol: '言', variants: ['訁'], nameJa: 'ことば・ごんべん', meaningFr: 'parole, langage', position: 'forme entière ou côté gauche' },
  { symbol: '車', variants: [], nameJa: 'くるま', meaningFr: 'véhicule, roue', position: 'forme entière' },
  { symbol: '金', variants: [], nameJa: 'かね', meaningFr: 'métal, or', position: 'forme entière' },
  { symbol: '長', variants: [], nameJa: 'ながい', meaningFr: 'long', position: 'forme entière' },
  { symbol: '門', variants: [], nameJa: 'もんがまえ', meaningFr: 'porte', position: 'encadrement extérieur' },
  { symbol: '雨', variants: [], nameJa: 'あめ・あめかんむり', meaningFr: 'pluie', position: 'forme entière ou partie haute' },
  { symbol: '食', variants: ['飠'], nameJa: 'しょく', meaningFr: 'manger, nourriture', position: 'forme entière' },
  { symbol: '高', variants: [], nameJa: 'たかい', meaningFr: 'haut, élevé', position: 'forme entière' },
];

const PRIMARY_RADICAL: Record<string, string> = {
  一: '一', 七: '一', 万: '一', 三: '一', 上: '一', 下: '一', 中: '丨', 九: '乙', 二: '二', 五: '二',
  人: '人', 今: '人', 休: '人', 何: '人', 先: '儿', 入: '入', 八: '八', 六: '八', 円: '冂', 出: '凵',
  分: '刀', 前: '刀', 北: '匕', 十: '十', 千: '十', 午: '十', 半: '十', 南: '十', 友: '又', 右: '口',
  名: '口', 四: '囗', 国: '囗', 土: '土', 外: '夕', 大: '大', 天: '大', 女: '女', 子: '子', 学: '子',
  小: '小', 山: '山', 川: '巛', 左: '工', 年: '干', 後: '彳', 日: '日', 時: '日', 書: '曰', 月: '月',
  木: '木', 本: '木', 来: '木', 東: '木', 校: '木', 母: '毋', 毎: '毋', 気: '气', 水: '水', 火: '火',
  父: '父', 生: '生', 男: '田', 白: '白', 百: '白', 聞: '耳', 行: '行', 西: '襾', 見: '見', 話: '言',
  語: '言', 読: '言', 車: '車', 金: '金', 長: '長', 間: '門', 雨: '雨', 電: '雨', 食: '食', 高: '高',
};

export const KANJI_THEORY = [
  { title: 'Du dessin au système', text: 'Les kanji viennent d’une longue évolution graphique. Certains évoquent directement une idée; d’autres combinent un élément de sens et un indice de son.' },
  { title: 'Caractère, lecture et mot', text: 'Un kanji n’est pas un mot prononcé toujours pareil. Sa lecture dépend du mot dans lequel il apparaît. Apprends donc les lectures avec du vocabulaire concret.' },
  { title: 'Lectures on et kun', text: 'Les lectures on viennent historiquement du chinois; les lectures kun sont japonaises. Les mots composés utilisent souvent on, sans que ce soit une règle absolue.' },
  { title: 'Okurigana', text: 'Les kana qui suivent un kanji indiquent souvent la terminaison variable: 食べる, 食べます. Ils aident à identifier la lecture et la fonction grammaticale.' },
  { title: 'Radicaux et composants', text: 'Le radical est la clé de classement principale. Les autres composants aident à analyser et mémoriser la forme, mais ne sont pas forcément des radicaux.' },
  { title: 'Méthode N5', text: 'Travaille un kanji avec son sens, deux ou trois mots utiles, une phrase simple et une distinction visuelle. La répétition espacée consolide ensuite le rappel.' },
];

const RADICAL_BY_SYMBOL = new Map(RADICALS.map((entry) => [entry.symbol, entry]));

export function getPrimaryRadical(character: string): RadicalEntry | null {
  return RADICAL_BY_SYMBOL.get(PRIMARY_RADICAL[character]) ?? null;
}

export function getKanjiForRadical(symbol: string, characters: string[]): string[] {
  return characters.filter((character) => PRIMARY_RADICAL[character] === symbol);
}

export function validateKanjiRadicalCoverage(characters: string[]): string[] {
  return characters.filter((character) => !PRIMARY_RADICAL[character] || !RADICAL_BY_SYMBOL.has(PRIMARY_RADICAL[character]));
}

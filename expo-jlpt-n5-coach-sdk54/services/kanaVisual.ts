import type { KanaCard, KanaTab, VocabularyExample } from '../models';
import { HIRAGANA_STANDARD, KATAKANA_STANDARD } from '../data/kanaTables';
import { normalizeAnswer } from './text';

const ROMAJI_OVERRIDES: Record<string, string> = {
  っ: 'petit tsu',
  ッ: 'petit tsu',
  ー: 'voyelle longue',
  ヽ: 'répétition',
  ヾ: 'répétition voisée',
  'あ-い-う + voyelle du même son': 'voyelle longue',
  'え + い ouえ': 'voyelle longue',
  'お + う': 'voyelle longue',
  ĀĒĪŌŪ: 'voyelle longue',
};

export const PREFERRED_N5_EXAMPLES: Record<string, string> = {
  あ: 'あめ',
  い: 'いえ',
  う: 'うさぎ',
  え: 'えんぴつ',
  お: 'おかね',
  か: 'かぎ',
  き: 'き',
  く: 'くつ',
  け: 'けいかん',
  こ: 'こども',
  さ: 'さかな',
  し: 'しごと',
  す: 'すし',
  せ: 'せっけん',
  そ: 'そら',
  た: 'たまご',
  ち: 'ちず',
  つ: 'つくえ',
  て: 'て',
  と: 'とけい',
  な: 'なまえ',
  に: 'にく',
  ぬ: 'ぬぐ',
  ね: 'ねこ',
  の: 'のむ',
  は: 'はな',
  ひ: 'ひこうき',
  ふ: 'ふね',
  へ: 'へや',
  ほ: 'ほん',
  ま: 'まど',
  み: 'みみ',
  む: 'むら',
  め: 'めがね',
  も: 'もん',
  や: 'やま',
  ゆ: 'ゆき',
  よ: 'よる',
  ら: 'らいげつ',
  り: 'りょうり',
  る: 'ある',
  れ: 'れいぞうこ',
  ろ: 'ろく',
  わ: 'わたし',
  を: '電話をかけました',
  ん: 'えん',
};

const PREFERRED_N5_ROMAJI: Record<string, string> = {
  あめ: 'ame',
  いえ: 'ie',
  うさぎ: 'usagi',
  えんぴつ: 'enpitsu',
  おかね: 'okane',
  かぎ: 'kagi',
  き: 'ki',
  くつ: 'kutsu',
  けいかん: 'keikan',
  こども: 'kodomo',
  さかな: 'sakana',
  しごと: 'shigoto',
  すし: 'sushi',
  せっけん: 'sekken',
  そら: 'sora',
  たまご: 'tamago',
  ちず: 'chizu',
  つくえ: 'tsukue',
  て: 'te',
  とけい: 'tokei',
  なまえ: 'namae',
  にく: 'niku',
  ぬぐ: 'nugu',
  ねこ: 'neko',
  のむ: 'nomu',
  はな: 'hana',
  ひこうき: 'hikouki',
  ふね: 'fune',
  へや: 'heya',
  ほん: 'hon',
  まど: 'mado',
  みみ: 'mimi',
  むら: 'mura',
  めがね: 'megane',
  もん: 'mon',
  やま: 'yama',
  ゆき: 'yuki',
  よる: 'yoru',
  らいげつ: 'raigetsu',
  りょうり: 'ryouri',
  ある: 'aru',
  れいぞうこ: 'reizouko',
  ろく: 'roku',
  わたし: 'watashi',
  電話をかけました: 'denwa wo suru',
  えん: 'en',
};

// OpenMoji illustrations are CC BY-SA 4.0; keep attribution in the app credits before release.
const OPENMOJI_BASE_URI = 'https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/color/618x618';

function openMoji(code: string): string {
  return `${OPENMOJI_BASE_URI}/${code}.png`;
}

const N5_EXAMPLE_ILLUSTRATIONS: Record<string, { uri: string; fallback: string }> = {
  ame: { uri: openMoji('2614'), fallback: '☔' },
  ah: { uri: openMoji('1F4AC'), fallback: '💬' },
  ie: { uri: openMoji('1F3E0'), fallback: '🏠' },
  iu: { uri: openMoji('1F5E3'), fallback: '🗣️' },
  ue: { uri: openMoji('2B06'), fallback: '⬆️' },
  e: { uri: openMoji('1F5BC'), fallback: '🖼️' },
  enpitsu: { uri: openMoji('270F'), fallback: '✏️' },
  o: { uri: openMoji('1F647'), fallback: '🙇' },
  okane: { uri: openMoji('1F4B4'), fallback: '💴' },
  ookii: { uri: openMoji('1F418'), fallback: '🐘' },
  kau: { uri: openMoji('1F6CD'), fallback: '🛍️' },
  kagi: { uri: openMoji('1F511'), fallback: '🔑' },
  ki: { uri: openMoji('1F333'), fallback: '🌳' },
  kutsu: { uri: openMoji('1F45F'), fallback: '👟' },
  kuru: { uri: openMoji('1F6B6'), fallback: '🚶' },
  keikan: { uri: openMoji('1F46E'), fallback: '👮' },
  kesa: { uri: openMoji('1F305'), fallback: '🌅' },
  kodomo: { uri: openMoji('1F9D2'), fallback: '🧒' },
  koe: { uri: openMoji('1F5E3'), fallback: '🗣️' },
  saa: { uri: openMoji('1F4A1'), fallback: '💡' },
  sakana: { uri: openMoji('1F41F'), fallback: '🐟' },
  shigoto: { uri: openMoji('1F4BC'), fallback: '💼' },
  shi: { uri: openMoji('0034-FE0F-20E3'), fallback: '4️⃣' },
  sushi: { uri: openMoji('1F363'), fallback: '🍣' },
  suu: { uri: openMoji('1FAC1'), fallback: '🫁' },
  suki: { uri: openMoji('2764'), fallback: '❤' },
  sei: { uri: openMoji('1F4CF'), fallback: '📏' },
  sekken: { uri: openMoji('1F9FC'), fallback: '🧼' },
  sou: { uri: openMoji('2705'), fallback: '✅' },
  sora: { uri: openMoji('1F324'), fallback: '🌤️' },
  tatsu: { uri: openMoji('1F9CD'), fallback: '🧍' },
  tamago: { uri: openMoji('1F95A'), fallback: '🥚' },
  chizu: { uri: openMoji('1F5FA'), fallback: '🗺️' },
  tsugi: { uri: openMoji('23ED'), fallback: '⏭️' },
  tsukue: { uri: openMoji('1FA91'), fallback: '🪑' },
  te: { uri: openMoji('270B'), fallback: '✋' },
  to: { uri: openMoji('1F6AA'), fallback: '🚪' },
  tokei: { uri: openMoji('23F0'), fallback: '⏰' },
  namae: { uri: openMoji('1F3F7'), fallback: '🏷️' },
  niku: { uri: openMoji('1F969'), fallback: '🥩' },
  naka: { uri: openMoji('1F3E0'), fallback: '🏠' },
  nishi: { uri: openMoji('1F9ED'), fallback: '🧭' },
  nugu: { uri: openMoji('1F455'), fallback: '👕' },
  neko: { uri: openMoji('1F431'), fallback: '🐱' },
  neru: { uri: openMoji('1F6CF'), fallback: '🛏️' },
  nomu: { uri: openMoji('1F964'), fallback: '🥤' },
  hana: { uri: openMoji('1F33C'), fallback: '🌼' },
  ha: { uri: openMoji('1F9B7'), fallback: '🦷' },
  hikouki: { uri: openMoji('2708'), fallback: '✈️' },
  hiku: { uri: openMoji('1FAA2'), fallback: '🪢' },
  fune: { uri: openMoji('26F5'), fallback: '⛵' },
  fuku: { uri: openMoji('1F32C'), fallback: '🌬️' },
  heya: { uri: openMoji('1F6CB'), fallback: '🛋️' },
  heta: { uri: openMoji('274C'), fallback: '❌' },
  hon: { uri: openMoji('1F4D8'), fallback: '📘' },
  hou: { uri: openMoji('2696'), fallback: '⚖️' },
  mado: { uri: openMoji('1FA9F'), fallback: '🪟' },
  mata: { uri: openMoji('1F501'), fallback: '🔁' },
  migi: { uri: openMoji('27A1'), fallback: '➡️' },
  muika: { uri: openMoji('1F4C5'), fallback: '📅' },
  mimi: { uri: openMoji('1F442'), fallback: '👂' },
  mura: { uri: openMoji('1F3D8'), fallback: '🏘️' },
  me: { uri: openMoji('1F441'), fallback: '👁️' },
  megane: { uri: openMoji('1F453'), fallback: '👓' },
  mon: { uri: openMoji('1F6AA'), fallback: '🚪' },
  mou: { uri: openMoji('1F501'), fallback: '🔁' },
  yama: { uri: openMoji('26F0'), fallback: '⛰️' },
  yuki: { uri: openMoji('2744'), fallback: '❄️' },
  yoko: { uri: openMoji('2194'), fallback: '↔️' },
  yoru: { uri: openMoji('1F303'), fallback: '🌃' },
  raigetsu: { uri: openMoji('1F4C5'), fallback: '📅' },
  rippa: { uri: openMoji('2728'), fallback: '✨' },
  ryouri: { uri: openMoji('1F373'), fallback: '🍳' },
  aru: { uri: openMoji('1F4CD'), fallback: '📍' },
  rei: { uri: openMoji('0030-FE0F-20E3'), fallback: '0️⃣' },
  reizouko: { uri: openMoji('1F9CA'), fallback: '🧊' },
  roku: { uri: openMoji('0036-FE0F-20E3'), fallback: '6️⃣' },
  rokugatsu: { uri: openMoji('1F5D3'), fallback: '🗓️' },
  wakaru: { uri: openMoji('1F9E0'), fallback: '🧠' },
  watashi: { uri: openMoji('1F9D1'), fallback: '🧑' },
  denwawosuru: { uri: openMoji('260E'), fallback: '☎️' },
  en: { uri: openMoji('1F4B4'), fallback: '💴' },
  usagi: { uri: openMoji('1F407'), fallback: '🐇' },
};

export type KanaExamplePreset = {
  kana: string;
  romaji: string;
  meaning_fr: string;
  illustrationKey: string;
};

const COMBINED_KANA_EXAMPLES: Record<string, KanaExamplePreset> = {
  kya: { kana: 'キャベツ', romaji: 'kyabetsu', meaning_fr: 'chou', illustrationKey: 'cabbage' },
  kyu: { kana: 'きゅうり', romaji: 'kyuuri', meaning_fr: 'concombre', illustrationKey: 'cucumber' },
  kyo: { kana: 'きょう', romaji: 'kyou', meaning_fr: "aujourd'hui", illustrationKey: 'today' },
  gya: { kana: 'ギャグ', romaji: 'gyagu', meaning_fr: 'blague', illustrationKey: 'joke' },
  gyu: { kana: 'ぎゅうにゅう', romaji: 'gyuunyuu', meaning_fr: 'lait', illustrationKey: 'milk' },
  gyo: { kana: 'ぎょうざ', romaji: 'gyouza', meaning_fr: 'gyoza', illustrationKey: 'dumpling' },
  she: { kana: 'シェフ', romaji: 'shefu', meaning_fr: 'chef', illustrationKey: 'chef' },
  sha: { kana: 'しゃしん', romaji: 'shashin', meaning_fr: 'photo', illustrationKey: 'photo' },
  shu: { kana: 'しゅくだい', romaji: 'shukudai', meaning_fr: 'devoirs', illustrationKey: 'homework' },
  sho: { kana: 'しょうがっこう', romaji: 'shougakkou', meaning_fr: 'école primaire', illustrationKey: 'school' },
  je: { kana: 'ジェラート', romaji: 'jeraato', meaning_fr: 'glace', illustrationKey: 'icecream' },
  ja: { kana: 'じゃがいも', romaji: 'jagaimo', meaning_fr: 'pomme de terre', illustrationKey: 'potato' },
  ju: { kana: 'ジュース', romaji: 'juusu', meaning_fr: 'jus', illustrationKey: 'juice' },
  jo: { kana: 'じょうず', romaji: 'jouzu', meaning_fr: 'habile', illustrationKey: 'star' },
  che: { kana: 'チェス', romaji: 'chesu', meaning_fr: 'échecs', illustrationKey: 'chess' },
  cha: { kana: 'おちゃ', romaji: 'ocha', meaning_fr: 'thé', illustrationKey: 'tea' },
  chu: { kana: 'ちゅうしゃ', romaji: 'chuusha', meaning_fr: 'injection', illustrationKey: 'syringe' },
  cho: { kana: 'ちょう', romaji: 'chou', meaning_fr: 'papillon', illustrationKey: 'butterfly' },
  nya: { kana: 'にゃんこ', romaji: 'nyanko', meaning_fr: 'chat', illustrationKey: 'cat' },
  nyu: { kana: 'ニュース', romaji: 'nyuusu', meaning_fr: 'nouvelles', illustrationKey: 'news' },
  nyo: { kana: 'にょきにょき', romaji: 'nyokinyoki', meaning_fr: 'qui pousse', illustrationKey: 'sprout' },
  hya: { kana: 'ひゃく', romaji: 'hyaku', meaning_fr: 'cent', illustrationKey: 'hundred' },
  hyu: { kana: 'ヒュー', romaji: 'hyuu', meaning_fr: 'sifflement', illustrationKey: 'wind' },
  hyo: { kana: 'ひょう', romaji: 'hyou', meaning_fr: 'tableau', illustrationKey: 'chart' },
  bya: { kana: 'びゃくや', romaji: 'byakuya', meaning_fr: 'nuit blanche', illustrationKey: 'night' },
  byu: { kana: 'ビュー', romaji: 'byuu', meaning_fr: 'vue', illustrationKey: 'view' },
  byo: { kana: 'びょういん', romaji: 'byouin', meaning_fr: 'hôpital', illustrationKey: 'hospital' },
  pya: { kana: 'ピャノ', romaji: 'pyano', meaning_fr: 'piano', illustrationKey: 'piano' },
  pyu: { kana: 'ピュア', romaji: 'pyua', meaning_fr: 'pur', illustrationKey: 'sparkles' },
  pyo: { kana: 'ぴょん', romaji: 'pyon', meaning_fr: 'bond', illustrationKey: 'jump' },
  mya: { kana: 'みゃく', romaji: 'myaku', meaning_fr: 'pouls', illustrationKey: 'heartbeat' },
  myu: { kana: 'ミュージック', romaji: 'myuujikku', meaning_fr: 'musique', illustrationKey: 'music' },
  myo: { kana: 'みょうじ', romaji: 'myouji', meaning_fr: 'nom de famille', illustrationKey: 'label' },
  rya: { kana: 'りゃく', romaji: 'ryaku', meaning_fr: 'abréviation', illustrationKey: 'memo' },
  ryu: { kana: 'りゅう', romaji: 'ryuu', meaning_fr: 'dragon', illustrationKey: 'dragon' },
  ryo: { kana: 'りょうり', romaji: 'ryouri', meaning_fr: 'cuisine', illustrationKey: 'cooking' },
  wi: { kana: 'ウィンドウ', romaji: 'windou', meaning_fr: 'fenêtre', illustrationKey: 'window' },
  we: { kana: 'ウェブ', romaji: 'webu', meaning_fr: 'web', illustrationKey: 'web' },
  kā: { kana: 'カー', romaji: 'kaa', meaning_fr: 'voiture', illustrationKey: 'car' },
  kī: { kana: 'キー', romaji: 'kii', meaning_fr: 'clé', illustrationKey: 'key' },
  kū: { kana: 'クール', romaji: 'kuuru', meaning_fr: 'cool', illustrationKey: 'cool' },
  kē: { kana: 'ケーキ', romaji: 'keeki', meaning_fr: 'gâteau', illustrationKey: 'cake' },
  kō: { kana: 'コーヒー', romaji: 'koohii', meaning_fr: 'café', illustrationKey: 'coffee' },
};

const COMBINED_KANA_ILLUSTRATIONS: Record<string, { uri: string; fallback: string }> = {
  cabbage: { uri: openMoji('1F96C'), fallback: '🥬' },
  cucumber: { uri: openMoji('1F952'), fallback: '🥒' },
  today: { uri: openMoji('1F4C5'), fallback: '📅' },
  joke: { uri: openMoji('1F602'), fallback: '😂' },
  milk: { uri: openMoji('1F95B'), fallback: '🥛' },
  dumpling: { uri: openMoji('1F95F'), fallback: '🥟' },
  chef: { uri: openMoji('1F9D1-200D-1F373'), fallback: '🧑‍🍳' },
  photo: { uri: openMoji('1F5BC'), fallback: '🖼️' },
  homework: { uri: openMoji('1F4D6'), fallback: '📖' },
  school: { uri: openMoji('1F3EB'), fallback: '🏫' },
  icecream: { uri: openMoji('1F368'), fallback: '🍨' },
  potato: { uri: openMoji('1F954'), fallback: '🥔' },
  juice: { uri: openMoji('1F9C3'), fallback: '🧃' },
  star: { uri: openMoji('2B50'), fallback: '⭐' },
  chess: { uri: openMoji('265F'), fallback: '♟️' },
  tea: { uri: openMoji('1F375'), fallback: '🍵' },
  syringe: { uri: openMoji('1F489'), fallback: '💉' },
  butterfly: { uri: openMoji('1F98B'), fallback: '🦋' },
  cat: { uri: openMoji('1F431'), fallback: '🐱' },
  news: { uri: openMoji('1F4F0'), fallback: '📰' },
  sprout: { uri: openMoji('1F331'), fallback: '🌱' },
  hundred: { uri: openMoji('1F4AF'), fallback: '💯' },
  wind: { uri: openMoji('1F32C'), fallback: '🌬️' },
  chart: { uri: openMoji('1F4CA'), fallback: '📊' },
  night: { uri: openMoji('1F303'), fallback: '🌃' },
  view: { uri: openMoji('1F441'), fallback: '👁️' },
  hospital: { uri: openMoji('1F3E5'), fallback: '🏥' },
  piano: { uri: openMoji('1F3B9'), fallback: '🎹' },
  sparkles: { uri: openMoji('2728'), fallback: '✨' },
  jump: { uri: openMoji('1F998'), fallback: '🦘' },
  heartbeat: { uri: openMoji('1FAC0'), fallback: '🫀' },
  music: { uri: openMoji('1F3B5'), fallback: '🎵' },
  label: { uri: openMoji('1F3F7'), fallback: '🏷️' },
  memo: { uri: openMoji('1F4DD'), fallback: '📝' },
  dragon: { uri: openMoji('1F409'), fallback: '🐉' },
  cooking: { uri: openMoji('1F373'), fallback: '🍳' },
  window: { uri: openMoji('1FA9F'), fallback: '🪟' },
  web: { uri: openMoji('1F310'), fallback: '🌐' },
  car: { uri: openMoji('1F697'), fallback: '🚗' },
  key: { uri: openMoji('1F511'), fallback: '🔑' },
  cool: { uri: openMoji('1F60E'), fallback: '😎' },
  cake: { uri: openMoji('1F370'), fallback: '🍰' },
  coffee: { uri: openMoji('2615'), fallback: '☕' },
};

export const HIRAGANA_BY_KATAKANA = new Map<string, string>();
HIRAGANA_STANDARD.forEach((row, rowIndex) => {
  row.forEach((hiragana, cellIndex) => {
    const katakana = KATAKANA_STANDARD[rowIndex]?.[cellIndex];
    if (hiragana && katakana) HIRAGANA_BY_KATAKANA.set(katakana, hiragana);
  });
});

const KATAKANA_BY_HIRAGANA = new Map<string, string>();
HIRAGANA_BY_KATAKANA.forEach((hiragana, katakana) => {
  KATAKANA_BY_HIRAGANA.set(hiragana, katakana);
});

const ILLUSTRATED_MNEMONICS: Record<
  string,
  {
    background: string;
    accent: string;
    wordKana: string;
    wordRomaji: string;
    meaning: string;
    art: string;
    illustrationUri?: string;
    illustrationFallback: string;
  }
> = {
  あ: {
    background: '#E5C856',
    accent: '#C96D58',
    wordKana: 'あめ',
    wordRomaji: 'ame',
    meaning: 'pluie',
    art: 'umbrella',
    illustrationUri: openMoji('2614'),
    illustrationFallback: '☔',
  },
  い: {
    background: '#C96555',
    accent: '#2F3A3A',
    wordKana: 'いのち',
    wordRomaji: 'inochi',
    meaning: 'vie',
    art: 'life',
    illustrationUri: openMoji('1F331'),
    illustrationFallback: '🌱',
  },
  う: {
    background: '#6F9AD2',
    accent: '#E8EEF3',
    wordKana: 'うさぎ',
    wordRomaji: 'usagi',
    meaning: 'lapin',
    art: 'rabbit',
    illustrationUri: openMoji('1F407'),
    illustrationFallback: '🐇',
  },
  え: {
    background: '#AED98C',
    accent: '#5A8AC4',
    wordKana: 'えいえん',
    wordRomaji: 'eien',
    meaning: 'éternité',
    art: 'eternity',
    illustrationUri: openMoji('267E'),
    illustrationFallback: '∞',
  },
  お: {
    background: '#D0A76D',
    accent: '#3F4A4A',
    wordKana: 'おおきい',
    wordRomaji: 'ookii',
    meaning: 'gros',
    art: 'big',
    illustrationUri: openMoji('1F418'),
    illustrationFallback: '🐘',
  },
  か: {
    background: '#E4CA59',
    accent: '#B55D50',
    wordKana: 'かめ',
    wordRomaji: 'kame',
    meaning: 'tortue',
    art: 'turtle',
    illustrationUri: openMoji('1F422'),
    illustrationFallback: '🐢',
  },
  き: {
    background: '#4B4C49',
    accent: '#D7B846',
    wordKana: 'きん',
    wordRomaji: 'kin',
    meaning: 'or',
    art: 'gold',
    illustrationUri: openMoji('1FA99'),
    illustrationFallback: '🪙',
  },
  く: {
    background: '#719DD0',
    accent: '#2F3A3A',
    wordKana: 'くつ',
    wordRomaji: 'kutsu',
    meaning: 'chaussure',
    art: 'shoe',
    illustrationUri: openMoji('1F45F'),
    illustrationFallback: '👟',
  },
  け: {
    background: '#AFD98E',
    accent: '#C98552',
    wordKana: 'けん',
    wordRomaji: 'ken',
    meaning: 'épée',
    art: 'sword',
    illustrationUri: openMoji('2694'),
    illustrationFallback: '⚔️',
  },
  ま: {
    background: '#F2B63F',
    accent: '#8F6B3C',
    wordKana: 'ま',
    wordRomaji: 'ma',
    meaning: 'un mât',
    art: 'mast',
    illustrationUri: openMoji('26F5'),
    illustrationFallback: '⛵',
  },
};

export function getKanaVisual(card: KanaCard, index: number) {
  const palette = [
    ['#AFD98E', '#C98552'],
    ['#719DD0', '#2F3A3A'],
    ['#E4CA59', '#B55D50'],
    ['#C96555', '#2F3A3A'],
    ['#D0A76D', '#3F4A4A'],
    ['#4B4C49', '#D7B846'],
  ];
  const baseCharacter = HIRAGANA_BY_KATAKANA.get(card.character) ?? card.character;
  const mnemonic = ILLUSTRATED_MNEMONICS[baseCharacter];
  const example = card.examples[0];
  const illustration = getVocabularyIllustration(example, card.romaji);
  const wordRomaji = getVocabularyRomaji(example, card.romaji);
  const [background, accent] = palette[index % palette.length];
  return {
    background: mnemonic?.background ?? background,
    accent: mnemonic?.accent ?? accent,
    wordKana: example?.kana ?? example?.japanese ?? card.character,
    wordRomaji,
    meaning: example?.meaning_fr ?? 'son japonais',
    art: mnemonic?.art ?? 'abstract',
    illustrationUri: illustration.uri,
    illustrationFallback: illustration.fallback,
  };
}

export function buildKanaSpeechText(card: KanaCard): string {
  const visual = getKanaVisual(card, 0);
  return `${card.character}。${visual.wordKana}。`;
}

export function buildKanaMnemonicSentence(
  card: KanaCard,
  visual: ReturnType<typeof getKanaVisual> = getKanaVisual(card, 0)
): string {
  const label = isCombinedKanaFallbackExample(card) ? 'repère' : 'N5';
  return `${card.character} comme ${visual.wordRomaji} : vois ${visual.meaning} dans la forme du kana (${label}).`;
}

export function getCombinedKanaExamplePreset(romaji: string): KanaExamplePreset | undefined {
  return COMBINED_KANA_EXAMPLES[romaji] ?? COMBINED_KANA_EXAMPLES[normalizeAnswer(romaji)];
}

export function buildCombinedKanaVocabularyExample(character: string, preset: KanaExamplePreset): VocabularyExample {
  return {
    id: `combined-${character}-${preset.romaji}`,
    japanese: preset.kana,
    kana: preset.kana,
    kanji: null,
    romaji: preset.romaji,
    meaning_fr: preset.meaning_fr,
  };
}

export function isCombinedKanaFallbackExample(card: KanaCard): boolean {
  return card.examples[0]?.id.startsWith('combined-') ?? false;
}

function getVocabularyIllustration(example?: VocabularyExample, fallbackRomaji = '') {
  const key = normalizeIllustrationKey(getVocabularyRomaji(example, fallbackRomaji));
  const combinedPreset =
    COMBINED_KANA_EXAMPLES[key] ??
    Object.values(COMBINED_KANA_EXAMPLES).find((preset) => normalizeIllustrationKey(preset.romaji) === key);
  if (combinedPreset) return COMBINED_KANA_ILLUSTRATIONS[combinedPreset.illustrationKey];
  if (key && N5_EXAMPLE_ILLUSTRATIONS[key]) return N5_EXAMPLE_ILLUSTRATIONS[key];

  const kanaKey = normalizeIllustrationKey(example?.kana ?? example?.japanese ?? '');
  if (kanaKey === 'denwawosuru') return N5_EXAMPLE_ILLUSTRATIONS.denwawosuru;

  return { uri: openMoji('1F4D8'), fallback: '📘' };
}

function getVocabularyRomaji(example?: VocabularyExample, fallbackRomaji = ''): string {
  const kana = example?.kana ?? example?.japanese ?? '';
  return PREFERRED_N5_ROMAJI[kana] ?? example?.romaji ?? fallbackRomaji;
}

function normalizeIllustrationKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function capitalizeKanaLabel(value: string): string {
  return value.length > 0 ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}

export function formatVocabularyExample(example: VocabularyExample): string {
  const reading = example.romaji || example.kana || '';
  return reading
    ? `${example.japanese} · ${reading} · ${example.meaning_fr}`
    : `${example.japanese} · ${example.meaning_fr}`;
}

export function normalizeKanaRomaji(character: string, romaji: string): string {
  return ROMAJI_OVERRIDES[character] ?? ROMAJI_OVERRIDES[romaji] ?? romaji;
}

export function sortKanaCards(cards: KanaCard[], tab: KanaTab): KanaCard[] {
  if (tab === 'combined') {
    return [...cards].sort((a, b) => a.script.localeCompare(b.script) || a.romaji.localeCompare(b.romaji));
  }
  const standard = tab === 'hiragana' ? HIRAGANA_STANDARD : KATAKANA_STANDARD;
  const order = new Map<string, number>();
  standard.flat().forEach((character, index) => {
    if (character) order.set(character, index);
  });
  return [...cards].sort((a, b) => {
    const aOrder = order.get(a.character) ?? 999;
    const bOrder = order.get(b.character) ?? 999;
    return aOrder - bOrder || a.romaji.localeCompare(b.romaji);
  });
}

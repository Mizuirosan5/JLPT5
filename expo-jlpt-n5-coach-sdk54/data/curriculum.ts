export const CURRICULUM_CODES = [
  '1A', '1B', '1C', '2A', '2B', '2C', '3A', '3B', '3C', '4A',
  '4B', '4C', '5A', '5B', '5C', '6A', '6B', '6C', '7A', '7B',
  '7C', '8A', '8B', '8C', '9A', '9B', '9C', '10A', '10B', '10C',
] as const;

export type CurriculumCode = (typeof CURRICULUM_CODES)[number];
export type CurriculumDomain = 'kana' | 'vocabulary' | 'grammar' | 'kanji' | 'communication';

export type CurriculumUnit = {
  code: CurriculumCode;
  title: string;
  canDo: string;
  focus: CurriculumDomain[];
  targetItems: number;
  minimumAttempts: number;
  minimumAccuracy: number;
};

const unit = (
  code: CurriculumCode,
  title: string,
  canDo: string,
  focus: CurriculumDomain[],
  targetItems: number,
  minimumAttempts = 12,
  minimumAccuracy = 80,
): CurriculumUnit => ({ code, title, canDo, focus, targetItems, minimumAttempts, minimumAccuracy });

export const CURRICULUM_UNITS: CurriculumUnit[] = [
  unit('1A', 'Premiers sons', 'Reconnaître et prononcer les cinq voyelles hiragana.', ['kana'], 5, 10, 80),
  unit('1B', 'Lignes K, S et T', 'Lire les lignes K, S et T et distinguer leurs syllabes proches.', ['kana'], 12),
  unit('1C', 'Hiragana usuels', 'Lire les lignes N, H, M et Y et enchaîner plusieurs kana connus.', ['kana'], 14),
  unit('2A', 'Hiragana complets', 'Lire tous les hiragana de base dans de courtes séquences contrôlées.', ['kana', 'grammar'], 15),
  unit('2B', 'Sons voisés', 'Reconnaître les sons voisés et exprimer une action polie au présent.', ['kana', 'grammar'], 16),
  unit('2C', 'Sons combinés', 'Lire les petits kana et les sons combinés dans un mot entièrement déchiffrable.', ['kana', 'grammar'], 18),
  unit('3A', 'Katakana essentiels', 'Lire les premières lignes katakana et identifier sujet, objet et lieu dans une phrase.', ['kana', 'grammar'], 18),
  unit('3B', 'Katakana complets', 'Lire tous les katakana simples et reconnaître une action passée.', ['kana', 'grammar'], 18),
  unit('3C', 'Lecture sans romaji', 'Lire les sons katakana complexes et décrire simplement une personne ou un objet.', ['kana', 'vocabulary', 'grammar'], 20),
  unit('4A', 'Nombres utiles', 'Compter, demander une quantité et reconnaître les premiers kanji numériques.', ['vocabulary', 'grammar', 'kanji'], 18),
  unit('4B', 'Date et heure', 'Dire une heure, un jour ou une date et lire les kanji correspondants.', ['vocabulary', 'grammar', 'kanji'], 18),
  unit('4C', 'Consignes simples', 'Comprendre une demande polie, une permission ou une interdiction très courante.', ['grammar', 'kanji', 'communication'], 16),
  unit('5A', 'Repères quotidiens', 'Situer une action dans le temps et l’espace et comprendre la fréquence.', ['vocabulary', 'grammar', 'kanji'], 20),
  unit('5B', 'Routine et préférences', 'Parler de ses habitudes, dire ce que l’on aime et ce que l’on veut faire.', ['vocabulary', 'grammar', 'kanji'], 20),
  unit('5C', 'Vie quotidienne', 'Parler de la famille, des repas et donner une raison simple.', ['vocabulary', 'grammar', 'kanji', 'communication'], 20),
  unit('6A', 'Décrire et relier', 'Décrire avec précision et relier deux idées simples.', ['vocabulary', 'grammar', 'kanji'], 22),
  unit('6B', 'Listes et actions', 'Énumérer des objets ou actions et lire le vocabulaire scolaire essentiel.', ['vocabulary', 'grammar', 'kanji'], 22),
  unit('6C', 'Proposer et se déplacer', 'Proposer une activité et comprendre les déplacements usuels.', ['vocabulary', 'grammar', 'kanji', 'communication'], 12),
  unit('7A', 'Chronologie', 'Raconter des actions dans l’ordre et comprendre la météo ou les transports.', ['vocabulary', 'grammar', 'kanji'], 16),
  unit('7B', 'Comparer', 'Comparer deux éléments, exprimer un conseil et parler du corps ou de la santé.', ['vocabulary', 'grammar'], 12),
  unit('7C', 'Questions précises', 'Choisir le bon mot interrogatif et demander une information précise.', ['vocabulary', 'grammar', 'communication'], 6),
  unit('8A', 'Nuancer', 'Exprimer quantité, fréquence, durée et manière sans traduire mot à mot.', ['vocabulary', 'grammar'], 12),
  unit('8B', 'Formes courtes', 'Reconnaître les formes verbales courtes nécessaires à la lecture N5.', ['vocabulary', 'grammar'], 6),
  unit('8C', 'Capacité et obligation', 'Dire ce que l’on peut faire ou ce que l’on doit faire.', ['grammar', 'communication'], 2),
  unit('9A', 'Expérience', 'Parler d’une expérience et donner des exemples d’activités.', ['vocabulary', 'grammar'], 3),
  unit('9B', 'Limites et changement', 'Comprendre une échéance, un changement d’état et les indéfinis courants.', ['grammar', 'communication'], 3),
  unit('9C', 'Opinion simple', 'Rapporter une parole ou exprimer une opinion courte.', ['grammar', 'communication'], 7),
  unit('10A', 'Phrase enrichie', 'Comprendre un nom précisé par une courte proposition et les échanges simples.', ['grammar', 'communication'], 3),
  unit('10B', 'Lecture naturelle', 'Lire des formes neutres et conversationnelles dans un texte N5.', ['grammar', 'communication'], 6),
  unit('10C', 'Maîtrise N5', 'Mobiliser kana, vocabulaire, kanji et grammaire dans une tâche N5 complète.', ['kana', 'vocabulary', 'grammar', 'kanji', 'communication'], 1, 24, 85),
];

export const GRAMMAR_ORDERS_BY_LEVEL: Record<CurriculumCode, readonly number[]> = {
  '1A': [100, 101, 102],
  '1B': [],
  '1C': [],
  '2A': [37, 38, 40],
  '2B': [41, 105],
  '2C': [1, 2, 3, 4, 5, 13, 14, 42, 43, 67, 68, 147],
  '3A': [6, 15, 16, 51, 52, 111, 138, 139, 140],
  '3B': [7, 8, 17, 18, 50, 63],
  '3C': [9, 10, 11, 12, 19, 20, 21, 39, 65, 103, 142, 143],
  '4A': [45, 47, 128, 129],
  '4B': [48, 49, 107, 108],
  '4C': [22, 59, 71, 72, 104],
  '5A': [23, 69, 76, 114, 134],
  '5B': [24, 25, 70],
  '5C': [26, 78, 115, 132],
  '6A': [27, 77, 79],
  '6B': [28, 29],
  '6C': [30, 31, 58],
  '7A': [32, 33, 110, 135, 144],
  '7B': [34, 35, 36, 116, 145],
  '7C': [44, 126, 127],
  '8A': [46, 66, 109, 121, 136],
  '8B': [53, 54, 55, 56, 137, 141],
  '8C': [73, 74],
  '9A': [75, 130, 146],
  '9B': [112, 131, 133],
  '9C': [82, 85, 118],
  '10A': [64, 83, 84],
  '10B': [86, 87, 88, 92, 93, 94, 119],
  '10C': [95],
};

export const KANJI_BY_LEVEL: Partial<Record<CurriculumCode, string>> = {
  '4A': '一二三四五六七八',
  '4B': '九十百千万円分半',
  '4C': '日月火水木金土年',
  '5A': '時午今毎前後上下',
  '5B': '中左右東西南北外',
  '5C': '人男女子父母友先',
  '6A': '大小高名国間長白',
  '6B': '学校本書語話読聞',
  '6C': '行来入出休見何生',
  '7A': '山川雨天気電車食',
};

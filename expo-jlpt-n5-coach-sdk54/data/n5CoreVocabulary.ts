export type CoreN5VocabularyItem = {
  id: string;
  japanese: string;
  kana: string;
  kanji: string | null;
  romaji: string;
  meaningFr: string;
  partOfSpeech: string;
  group: 'pronouns' | 'demonstratives' | 'questions' | 'position' | 'frequency' | 'connectors';
};

const item = (
  id: string,
  japanese: string,
  kana: string,
  romaji: string,
  meaningFr: string,
  partOfSpeech: string,
  group: CoreN5VocabularyItem['group'],
): CoreN5VocabularyItem => ({
  id: `n5-core-${id}`,
  japanese,
  kana,
  kanji: /[\u3400-\u4dbf\u4e00-\u9fff]/u.test(japanese) ? japanese : null,
  romaji,
  meaningFr,
  partOfSpeech,
  group,
});

export const CORE_N5_FUNCTION_VOCABULARY: CoreN5VocabularyItem[] = [
  item('watashi', '私', 'わたし', 'watashi', 'je, moi', 'pronom personnel', 'pronouns'),
  item('boku', '僕', 'ぼく', 'boku', 'je, moi (usage masculin familier)', 'pronom personnel', 'pronouns'),
  item('anata', 'あなた', 'あなた', 'anata', 'tu, vous', 'pronom personnel', 'pronouns'),
  item('kare', '彼', 'かれ', 'kare', 'il, lui', 'pronom personnel', 'pronouns'),
  item('kanojo', '彼女', 'かのじょ', 'kanojo', 'elle ; petite amie selon le contexte', 'pronom personnel', 'pronouns'),
  item('watashitachi', '私たち', 'わたしたち', 'watashitachi', 'nous', 'pronom personnel', 'pronouns'),
  item('anatatachi', 'あなたたち', 'あなたたち', 'anatatachi', 'vous (plusieurs personnes)', 'pronom personnel', 'pronouns'),
  item('minna', 'みんな', 'みんな', 'minna', 'tout le monde, tous', 'pronom', 'pronouns'),

  item('kore', 'これ', 'これ', 'kore', 'ceci, cette chose-ci', 'pronom démonstratif', 'demonstratives'),
  item('sore', 'それ', 'それ', 'sore', 'cela, cette chose près de toi', 'pronom démonstratif', 'demonstratives'),
  item('are', 'あれ', 'あれ', 'are', 'cela là-bas', 'pronom démonstratif', 'demonstratives'),
  item('kono', 'この', 'この', 'kono', 'ce, cette… près de moi', 'déterminant démonstratif', 'demonstratives'),
  item('sono', 'その', 'その', 'sono', 'ce, cette… près de toi', 'déterminant démonstratif', 'demonstratives'),
  item('ano', 'あの', 'あの', 'ano', 'ce, cette… là-bas', 'déterminant démonstratif', 'demonstratives'),
  item('koko', 'ここ', 'ここ', 'koko', 'ici', 'pronom de lieu', 'demonstratives'),
  item('soko', 'そこ', 'そこ', 'soko', 'là, près de toi', 'pronom de lieu', 'demonstratives'),
  item('asoko', 'あそこ', 'あそこ', 'asoko', 'là-bas', 'pronom de lieu', 'demonstratives'),
  item('kochira', 'こちら', 'こちら', 'kochira', 'ici, par ici ; cette personne (poli)', 'pronom démonstratif poli', 'demonstratives'),
  item('sochira', 'そちら', 'そちら', 'sochira', 'là, par là ; cette personne (poli)', 'pronom démonstratif poli', 'demonstratives'),
  item('achira', 'あちら', 'あちら', 'achira', 'là-bas, par là-bas (poli)', 'pronom démonstratif poli', 'demonstratives'),

  item('dare', '誰', 'だれ', 'dare', 'qui ?', 'mot interrogatif', 'questions'),
  item('donata', 'どなた', 'どなた', 'donata', 'qui ? (poli)', 'mot interrogatif', 'questions'),
  item('nani', '何', 'なに・なん', 'nani / nan', 'quoi, que ?', 'mot interrogatif', 'questions'),
  item('doko', 'どこ', 'どこ', 'doko', 'où ?', 'mot interrogatif', 'questions'),
  item('itsu', 'いつ', 'いつ', 'itsu', 'quand ?', 'mot interrogatif', 'questions'),
  item('dou', 'どう', 'どう', 'dou', 'comment ? de quelle manière ?', 'mot interrogatif', 'questions'),
  item('doushite', 'どうして', 'どうして', 'doushite', 'pourquoi ?', 'mot interrogatif', 'questions'),
  item('naze', 'なぜ', 'なぜ', 'naze', 'pourquoi ?', 'mot interrogatif', 'questions'),
  item('dore', 'どれ', 'どれ', 'dore', 'lequel parmi plusieurs ?', 'mot interrogatif', 'questions'),
  item('dono', 'どの', 'どの', 'dono', 'quel, quelle… ?', 'déterminant interrogatif', 'questions'),
  item('dochira', 'どちら', 'どちら', 'dochira', 'lequel des deux ? où ? (poli)', 'mot interrogatif', 'questions'),
  item('docchi', 'どっち', 'どっち', 'docchi', 'lequel des deux ? (familier)', 'mot interrogatif', 'questions'),
  item('donna', 'どんな', 'どんな', 'donna', 'quel genre de… ?', 'déterminant interrogatif', 'questions'),
  item('ikura', 'いくら', 'いくら', 'ikura', 'combien ? quel prix ?', 'mot interrogatif', 'questions'),
  item('ikutsu', 'いくつ', 'いくつ', 'ikutsu', 'combien ? quel âge ?', 'mot interrogatif', 'questions'),
  item('nanji', '何時', 'なんじ', 'nanji', 'quelle heure ?', 'expression interrogative', 'questions'),
  item('nansai', '何歳', 'なんさい', 'nansai', 'quel âge ?', 'expression interrogative', 'questions'),
  item('nannin', '何人', 'なんにん', 'nannin', 'combien de personnes ?', 'expression interrogative', 'questions'),
  item('nanyoubi', '何曜日', 'なんようび', 'nanyoubi', 'quel jour de la semaine ?', 'expression interrogative', 'questions'),

  item('ue', '上', 'うえ', 'ue', 'dessus, au-dessus', 'nom de position', 'position'),
  item('shita', '下', 'した', 'shita', 'dessous, en dessous', 'nom de position', 'position'),
  item('naka', '中', 'なか', 'naka', 'intérieur, dedans', 'nom de position', 'position'),
  item('mae', '前', 'まえ', 'mae', 'devant, avant', 'nom de position', 'position'),
  item('ushiro', '後ろ', 'うしろ', 'ushiro', 'derrière', 'nom de position', 'position'),
  item('migi', '右', 'みぎ', 'migi', 'droite', 'nom de position', 'position'),
  item('hidari', '左', 'ひだり', 'hidari', 'gauche', 'nom de position', 'position'),
  item('tonari', '隣', 'となり', 'tonari', 'à côté, voisin', 'nom de position', 'position'),
  item('chikaku', '近く', 'ちかく', 'chikaku', 'près, à proximité', 'nom de position', 'position'),
  item('aida', '間', 'あいだ', 'aida', 'entre, intervalle', 'nom de position', 'position'),
  item('soto', '外', 'そと', 'soto', 'extérieur, dehors', 'nom de position', 'position'),

  item('itsumo', 'いつも', 'いつも', 'itsumo', 'toujours', 'adverbe de fréquence', 'frequency'),
  item('yoku', 'よく', 'よく', 'yoku', 'souvent ; bien', 'adverbe', 'frequency'),
  item('tokidoki', '時々', 'ときどき', 'tokidoki', 'parfois, de temps en temps', 'adverbe de fréquence', 'frequency'),
  item('amari', 'あまり', 'あまり', 'amari', 'pas beaucoup, pas souvent (avec négation)', 'adverbe', 'frequency'),
  item('zenzen', '全然', 'ぜんぜん', 'zenzen', 'pas du tout (avec négation)', 'adverbe', 'frequency'),
  item('mou', 'もう', 'もう', 'mou', 'déjà ; encore selon le contexte', 'adverbe', 'frequency'),
  item('mada', 'まだ', 'まだ', 'mada', 'encore, pas encore', 'adverbe', 'frequency'),
  item('sugu', 'すぐ', 'すぐ', 'sugu', 'tout de suite, bientôt', 'adverbe', 'frequency'),
  item('isshoni', '一緒に', 'いっしょに', 'issho ni', 'ensemble', 'adverbe', 'frequency'),

  item('soshite', 'そして', 'そして', 'soshite', 'et, puis', 'connecteur', 'connectors'),
  item('sorekara', 'それから', 'それから', 'sorekara', 'ensuite, après cela', 'connecteur', 'connectors'),
  item('demo', 'でも', 'でも', 'demo', 'mais, cependant', 'connecteur', 'connectors'),
  item('dakara', 'だから', 'だから', 'dakara', 'donc, c’est pourquoi', 'connecteur', 'connectors'),
];

export const CORE_N5_FUNCTION_GROUPS = new Set(CORE_N5_FUNCTION_VOCABULARY.map((entry) => entry.group));

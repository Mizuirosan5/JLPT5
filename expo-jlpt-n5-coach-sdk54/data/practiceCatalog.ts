export type PracticeToolId = 'radicals' | 'conjugation' | 'sentences' | 'numbers' | 'kana_sprint' | 'reference' | 'kits';

export type RadicalPracticeItem = {
  radical: string;
  name: string;
  meaning: string;
  kanji: string[];
};

export const RADICAL_PRACTICE_ITEMS: RadicalPracticeItem[] = [
  { radical: '人', name: 'ひと', meaning: 'personne', kanji: ['人', '休', '体'] },
  { radical: '口', name: 'くち', meaning: 'bouche, ouverture', kanji: ['口', '名'] },
  { radical: '日', name: 'ひ', meaning: 'soleil, jour', kanji: ['日', '時', '明'] },
  { radical: '月', name: 'つき', meaning: 'lune, mois', kanji: ['月', '朝'] },
  { radical: '木', name: 'き', meaning: 'arbre, bois', kanji: ['木', '本', '休', '東'] },
  { radical: '水', name: 'みず', meaning: 'eau', kanji: ['水', '川'] },
  { radical: '火', name: 'ひ', meaning: 'feu', kanji: ['火'] },
  { radical: '山', name: 'やま', meaning: 'montagne', kanji: ['山'] },
  { radical: '女', name: 'おんな', meaning: 'femme', kanji: ['女', '母'] },
  { radical: '子', name: 'こ', meaning: 'enfant', kanji: ['子', '学'] },
  { radical: '言', name: 'ことば', meaning: 'parole', kanji: ['言', '語'] },
  { radical: '食', name: 'しょく', meaning: 'manger, nourriture', kanji: ['食', '飲'] },
];

export type ConjugationFormId = 'polite' | 'negative' | 'past' | 'te';
export type ConjugationPracticeItem = {
  dictionary: string;
  reading: string;
  meaning: string;
  group: 'godan' | 'ichidan' | 'irregular';
  forms: Record<ConjugationFormId, string>;
};

export const CONJUGATION_PRACTICE_ITEMS: ConjugationPracticeItem[] = [
  { dictionary: '食べる', reading: 'たべる', meaning: 'manger', group: 'ichidan', forms: { polite: '食べます', negative: '食べない', past: '食べた', te: '食べて' } },
  { dictionary: '見る', reading: 'みる', meaning: 'voir', group: 'ichidan', forms: { polite: '見ます', negative: '見ない', past: '見た', te: '見て' } },
  { dictionary: '行く', reading: 'いく', meaning: 'aller', group: 'godan', forms: { polite: '行きます', negative: '行かない', past: '行った', te: '行って' } },
  { dictionary: '飲む', reading: 'のむ', meaning: 'boire', group: 'godan', forms: { polite: '飲みます', negative: '飲まない', past: '飲んだ', te: '飲んで' } },
  { dictionary: '話す', reading: 'はなす', meaning: 'parler', group: 'godan', forms: { polite: '話します', negative: '話さない', past: '話した', te: '話して' } },
  { dictionary: '読む', reading: 'よむ', meaning: 'lire', group: 'godan', forms: { polite: '読みます', negative: '読まない', past: '読んだ', te: '読んで' } },
  { dictionary: '書く', reading: 'かく', meaning: 'ecrire', group: 'godan', forms: { polite: '書きます', negative: '書かない', past: '書いた', te: '書いて' } },
  { dictionary: '会う', reading: 'あう', meaning: 'rencontrer', group: 'godan', forms: { polite: '会います', negative: '会わない', past: '会った', te: '会って' } },
  { dictionary: 'する', reading: 'する', meaning: 'faire', group: 'irregular', forms: { polite: 'します', negative: 'しない', past: 'した', te: 'して' } },
  { dictionary: '来る', reading: 'くる', meaning: 'venir', group: 'irregular', forms: { polite: '来ます', negative: '来ない', past: '来た', te: '来て' } },
];

export const CONJUGATION_FORM_LABELS: Record<ConjugationFormId, string> = {
  polite: 'forme polie en ます',
  negative: 'forme negative',
  past: 'forme passee',
  te: 'forme en て',
};

export type SentencePracticeItem = {
  id: string;
  french: string;
  blocks: string[];
  answer: string[];
  reading: string;
  explanation: string;
};

export const SENTENCE_PRACTICE_ITEMS: SentencePracticeItem[] = [
  { id: 's1', french: 'Je mange du pain.', blocks: ['パンを', '食べます', '私は'], answer: ['私は', 'パンを', '食べます'], reading: 'わたしは パンを たべます', explanation: 'は pose le theme « moi » ; を marque le pain comme objet direct de 食べます.' },
  { id: 's2', french: 'Je vais a l’ecole.', blocks: ['学校へ', '行きます', '私は'], answer: ['私は', '学校へ', '行きます'], reading: 'わたしは がっこうへ いきます', explanation: 'へ indique la direction vers l’ecole. Le verbe de deplacement termine la phrase.' },
  { id: 's3', french: 'Il y a un chat dans la maison.', blocks: ['猫が', '家に', 'います'], answer: ['家に', '猫が', 'います'], reading: 'いえに ねこが います', explanation: 'に marque le lieu d’existence, が la chose presente et います s’emploie pour un etre vivant.' },
  { id: 's4', french: 'Je lis un livre a la bibliotheque.', blocks: ['本を', '図書館で', '読みます', '私は'], answer: ['私は', '図書館で', '本を', '読みます'], reading: 'わたしは としょかんで ほんを よみます', explanation: 'で marque le lieu ou se deroule l’action ; を marque le livre lu.' },
  { id: 's5', french: 'Je rencontre un ami demain.', blocks: ['友だちに', '明日', '会います', '私は'], answer: ['私は', '明日', '友だちに', '会います'], reading: 'わたしは あした ともだちに あいます', explanation: '明日 place le moment ; に marque ici la personne rencontree ; 会います termine la phrase.' },
];

export type GrammarReferenceSheet = {
  id: string;
  title: string;
  decision: string;
  examples: Array<{ japanese: string; reading: string; french: string }>;
  warning: string;
  quiz: { prompt: string; choices: string[]; answer: string; explanation: string };
};

export const GRAMMAR_REFERENCE_SHEETS: GrammarReferenceSheet[] = [
  { id: 'wa-ga', title: 'は ou が', decision: 'は installe le thème. が identifie ou met en avant le sujet grammatical.', examples: [{ japanese: '私は学生です。', reading: 'わたしは がくせいです', french: 'Je suis étudiant.' }, { japanese: '猫がいます。', reading: 'ねこが います', french: 'Il y a un chat.' }], warning: 'は se prononce わ lorsqu’il est employé comme particule.', quiz: { prompt: 'Complète : 猫＿います。', choices: ['は', 'が', 'を'], answer: 'が', explanation: 'が identifie ce qui existe avec います.' } },
  { id: 'ni-de-he', title: 'に, で ou へ', decision: 'に vise un point précis, で le lieu de l’action, へ une direction générale.', examples: [{ japanese: '学校に行きます。', reading: 'がっこうに いきます', french: 'Je vais à l’école.' }, { japanese: '学校で勉強します。', reading: 'がっこうで べんきょうします', french: 'J’étudie à l’école.' }], warning: 'へ se prononce え lorsqu’il est employé comme particule.', quiz: { prompt: 'Complète : 図書館＿読みます。', choices: ['に', 'で', 'へ'], answer: 'で', explanation: 'で marque le lieu où la lecture a lieu.' } },
  { id: 'aru-iru', title: 'ある ou いる', decision: 'いる pour les personnes et animaux ; ある pour les objets et les choses.', examples: [{ japanese: '犬がいます。', reading: 'いぬが います', french: 'Il y a un chien.' }, { japanese: '本があります。', reading: 'ほんが あります', french: 'Il y a un livre.' }], warning: 'Le lieu d’existence est normalement marqué par に.', quiz: { prompt: 'Quel verbe pour un professeur présent ?', choices: ['あります', 'います', 'でする'], answer: 'います', explanation: 'Un professeur est une personne : on utilise います.' } },
  { id: 'i-na', title: 'Adjectifs い / な', decision: 'Un adjectif en い se place directement devant le nom. Un adjectif en な ajoute な devant le nom.', examples: [{ japanese: '大きい家', reading: 'おおきい いえ', french: 'une grande maison' }, { japanese: '静かな町', reading: 'しずかな まち', french: 'une ville calme' }], warning: 'きれい est un adjectif en な bien qu’il se termine par le son い.', quiz: { prompt: 'Choisis la forme correcte.', choices: ['きれい町', 'きれいな町', 'きれいい町'], answer: 'きれいな町', explanation: 'きれい est un adjectif en な.' } },
  { id: 'presentation', title: 'Se présenter', decision: 'Donne ton nom, ton origine puis termine poliment par よろしくお願いします。', examples: [{ japanese: 'ミナです。フランス人です。', reading: 'ミナです。フランスじんです。', french: 'Je suis Mina. Je suis française.' }, { japanese: 'よろしくお願いします。', reading: 'よろしく おねがいします。', french: 'Enchanté / je compte sur vous.' }], warning: 'Avec son propre nom, わたしは peut être omis si le contexte est clair.', quiz: { prompt: 'Quelle formule termine une présentation ?', choices: ['いただきます', 'よろしくお願いします', 'いってきます'], answer: 'よろしくお願いします', explanation: 'Cette formule clôt une première présentation polie.' } },
  { id: 'restaurant', title: 'Au restaurant', decision: 'Utilise ください pour commander et いくらですか pour demander le prix.', examples: [{ japanese: '水をください。', reading: 'みずを ください。', french: 'De l’eau, s’il vous plaît.' }, { japanese: 'これはいくらですか。', reading: 'これは いくらですか。', french: 'Combien cela coûte-t-il ?' }], warning: 'ください suit directement le nom de ce que tu demandes.', quiz: { prompt: 'Comment demander du thé ?', choices: ['お茶をください', 'お茶がいます', 'お茶へ行きます'], answer: 'お茶をください', explanation: 'Nom + をください permet de commander poliment.' } },
  { id: 'shopping', title: 'Faire des achats', decision: 'Désigne l’objet avec これ／それ et précise une préférence avec の ou がいいです。', examples: [{ japanese: 'この青いシャツを見せてください。', reading: 'この あおい シャツを みせてください。', french: 'Montrez-moi cette chemise bleue.' }, { japanese: 'もう少し安いのがありますか。', reading: 'もうすこし やすいのが ありますか。', french: 'En avez-vous une un peu moins chère ?' }], warning: 'この doit toujours être suivi d’un nom ; これ s’emploie seul.', quiz: { prompt: 'Choisis « cette chaussure-ci ».', choices: ['この靴', 'これ靴', 'そのこれ'], answer: 'この靴', explanation: 'この précède le nom 靴.' } },
  { id: 'transport', title: 'Se déplacer', decision: 'Demande la destination avec どこ et le moyen avec どうやって.', examples: [{ japanese: '駅はどこですか。', reading: 'えきは どこですか。', french: 'Où est la gare ?' }, { japanese: '東京まで電車で行きます。', reading: 'とうきょうまで でんしゃで いきます。', french: 'Je vais jusqu’à Tokyo en train.' }], warning: 'で marque ici le moyen de transport, tandis que まで marque la limite.', quiz: { prompt: 'Quelle particule marque le moyen ?', choices: ['で', 'を', 'が'], answer: 'で', explanation: '電車で signifie « en train ».' } },
  { id: 'emergency', title: 'Urgence', decision: 'Commence par une demande courte et explicite : 助けてください ou 病院はどこですか。', examples: [{ japanese: '助けてください。', reading: 'たすけて ください。', french: 'Aidez-moi, s’il vous plaît.' }, { japanese: '病院はどこですか。', reading: 'びょういんは どこですか。', french: 'Où est l’hôpital ?' }], warning: 'En urgence, une phrase courte et claire est préférable à une formulation complexe.', quiz: { prompt: 'Quelle phrase demande de l’aide ?', choices: ['助けてください', '待ってください', '見てください'], answer: '助けてください', explanation: '助ける signifie « aider / secourir ».' } },
  { id: 'travel', title: 'À l’hôtel', decision: 'Présente ta réservation avec 予約 et vérifie les services avec ありますか。', examples: [{ japanese: '予約があります。', reading: 'よやくが あります。', french: 'J’ai une réservation.' }, { japanese: '朝ご飯は何時ですか。', reading: 'あさごはんは なんじですか。', french: 'À quelle heure est le petit-déjeuner ?' }], warning: 'Pour donner un nom de réservation : 名前は～です。', quiz: { prompt: 'Comment dire « J’ai une réservation » ?', choices: ['予約があります', '予約がいます', '予約を行きます'], answer: '予約があります', explanation: 'Une réservation est une chose : on utilise あります.' } },
];

export const BASIC_KANA_SPRINT = [
  ['あ', 'a'], ['い', 'i'], ['う', 'u'], ['え', 'e'], ['お', 'o'],
  ['か', 'ka'], ['き', 'ki'], ['く', 'ku'], ['け', 'ke'], ['こ', 'ko'],
  ['さ', 'sa'], ['し', 'shi'], ['す', 'su'], ['せ', 'se'], ['そ', 'so'],
  ['た', 'ta'], ['ち', 'chi'], ['つ', 'tsu'], ['て', 'te'], ['と', 'to'],
] as const;

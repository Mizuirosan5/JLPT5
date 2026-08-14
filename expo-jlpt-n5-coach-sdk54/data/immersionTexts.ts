export type ImmersionQuestion = {
  prompt: string;
  choices: string[];
  answer: string;
  explanation: string;
};

export type ImmersionText = {
  id: string;
  title: string;
  level: 'N5';
  theme: string;
  japanese: string;
  kana: string;
  translationFr: string;
  questions: ImmersionQuestion[];
};

export const IMMERSION_TEXTS: ImmersionText[] = [
  {
    id: 'immersion-morning',
    title: 'Le matin',
    level: 'N5',
    theme: 'Routine',
    japanese: '朝、私は水を飲みます。それから学校へ行きます。',
    kana: 'あさ、わたしはみずをのみます。それからがっこうへいきます。',
    translationFr: 'Le matin, je bois de l eau. Ensuite, je vais a l ecole.',
    questions: [
      { prompt: 'Que boit la personne ?', choices: ['de l eau', 'du the', 'du lait'], answer: 'de l eau', explanation: '水 signifie eau.' },
      { prompt: 'Ou va la personne ?', choices: ['a l ecole', 'a la gare', 'a la maison'], answer: 'a l ecole', explanation: '学校へ行きます signifie aller a l ecole.' },
    ],
  },
  {
    id: 'immersion-friend',
    title: 'Avec un ami',
    level: 'N5',
    theme: 'Vie quotidienne',
    japanese: '日曜日、友だちと映画を見ました。映画は少し長いですが、おもしろかったです。',
    kana: 'にちようび、ともだちとえいがをみました。えいがはすこしながいですが、おもしろかったです。',
    translationFr: 'Dimanche, j ai regarde un film avec un ami. Le film etait un peu long, mais interessant.',
    questions: [
      { prompt: 'Quand se passe la phrase ?', choices: ['dimanche', 'lundi', 'vendredi'], answer: 'dimanche', explanation: '日曜日 signifie dimanche.' },
      { prompt: 'Comment etait le film ?', choices: ['un peu long mais interessant', 'court et ennuyeux', 'cher et nouveau'], answer: 'un peu long mais interessant', explanation: 'ですが marque une opposition douce.' },
    ],
  },
  {
    id: 'immersion-shop',
    title: 'Au magasin',
    level: 'N5',
    theme: 'Achats',
    japanese: 'この店で新しい本を買います。本は五百円です。',
    kana: 'このみせであたらしいほんをかいます。ほんはごひゃくえんです。',
    translationFr: 'Dans ce magasin, j achete un nouveau livre. Le livre coute 500 yens.',
    questions: [
      { prompt: 'Qu est-ce que la personne achete ?', choices: ['un livre', 'un billet', 'un poisson'], answer: 'un livre', explanation: '本 signifie livre.' },
      { prompt: 'Combien coute le livre ?', choices: ['500 yens', '100 yens', '1000 yens'], answer: '500 yens', explanation: '五百円 signifie 500 yens.' },
    ],
  },
  {
    id: 'immersion-weather',
    title: 'La pluie',
    level: 'N5',
    theme: 'Meteo',
    japanese: '今日は雨です。私は外へ行きません。家で日本語を勉強します。',
    kana: 'きょうはあめです。わたしはそとへいきません。いえでにほんごをべんきょうします。',
    translationFr: 'Aujourd hui, il pleut. Je ne vais pas dehors. J etudie le japonais a la maison.',
    questions: [
      { prompt: 'Quel temps fait-il ?', choices: ['il pleut', 'il neige', 'il fait chaud'], answer: 'il pleut', explanation: '雨 signifie pluie.' },
      { prompt: 'Ou la personne etudie-t-elle ?', choices: ['a la maison', 'a l ecole', 'dehors'], answer: 'a la maison', explanation: '家で indique le lieu de l action.' },
    ],
  },
  {
    id: 'immersion-station',
    title: 'A la gare',
    level: 'N5',
    theme: 'Transport',
    japanese: '駅で電車を待ちます。電車は八時に来ます。',
    kana: 'えきででんしゃをまちます。でんしゃははちじにきます。',
    translationFr: 'J attends le train a la gare. Le train arrive a huit heures.',
    questions: [
      { prompt: 'Qu attend la personne ?', choices: ['le train', 'un ami', 'un taxi'], answer: 'le train', explanation: '電車 signifie train.' },
      { prompt: 'A quelle heure arrive-t-il ?', choices: ['huit heures', 'sept heures', 'neuf heures'], answer: 'huit heures', explanation: '八時 signifie huit heures.' },
    ],
  },
  {
    id: 'immersion-library',
    title: 'A la bibliotheque',
    level: 'N5',
    theme: 'Etude',
    japanese: '図書館で日本語の本を読みます。本は少しむずかしいですが、とてもおもしろいです。',
    kana: 'としょかんでにほんごのほんをよみます。ほんはすこしむずかしいですが、とてもおもしろいです。',
    translationFr: 'A la bibliotheque, je lis un livre de japonais. Le livre est un peu difficile, mais tres interessant.',
    questions: [
      { prompt: 'Ou la personne lit-elle ?', choices: ['a la bibliotheque', 'au magasin', 'a la gare'], answer: 'a la bibliotheque', explanation: '図書館で indique le lieu de l action.' },
      { prompt: 'Comment est le livre ?', choices: ['un peu difficile mais interessant', 'facile et court', 'cher et ancien'], answer: 'un peu difficile mais interessant', explanation: 'むずかしいですが introduit une opposition.' },
    ],
  },
  {
    id: 'immersion-family-dinner',
    title: 'Repas en famille',
    level: 'N5',
    theme: 'Famille',
    japanese: '夜、家族とご飯を食べます。父はお茶を飲みます。母は魚が好きです。',
    kana: 'よる、かぞくとごはんをたべます。ちちはおちゃをのみます。はははさかながすきです。',
    translationFr: 'Le soir, je mange avec ma famille. Mon pere boit du the. Ma mere aime le poisson.',
    questions: [
      { prompt: 'Avec qui la personne mange-t-elle ?', choices: ['sa famille', 'son professeur', 'un etudiant'], answer: 'sa famille', explanation: '家族と signifie avec la famille.' },
      { prompt: 'Qu aime la mere ?', choices: ['le poisson', 'le pain', 'le train'], answer: 'le poisson', explanation: '魚が好きです signifie aimer le poisson.' },
    ],
  },
  {
    id: 'immersion-room',
    title: 'Dans la chambre',
    level: 'N5',
    theme: 'Maison',
    japanese: '私の部屋に机といすがあります。机の上に新しいペンがあります。',
    kana: 'わたしのへやにつくえといすがあります。つくえのうえにあたらしいペンがあります。',
    translationFr: 'Dans ma chambre, il y a un bureau et une chaise. Sur le bureau, il y a un nouveau stylo.',
    questions: [
      { prompt: 'Qu y a-t-il dans la chambre ?', choices: ['un bureau et une chaise', 'une voiture et un train', 'un poisson et de l eau'], answer: 'un bureau et une chaise', explanation: '机といす signifie bureau et chaise.' },
      { prompt: 'Ou est le stylo ?', choices: ['sur le bureau', 'sous la chaise', 'dans le sac'], answer: 'sur le bureau', explanation: '机の上に signifie sur le bureau.' },
    ],
  },
  {
    id: 'immersion-school-test',
    title: 'Le petit test',
    level: 'N5',
    theme: 'Ecole',
    japanese: '今日は学校で小さいテストがあります。私は朝、漢字と文法を勉強しました。',
    kana: 'きょうはがっこうでちいさいテストがあります。わたしはあさ、かんじとぶんぽうをべんきょうしました。',
    translationFr: 'Aujourd hui, il y a un petit test a l ecole. Le matin, j ai etudie les kanji et la grammaire.',
    questions: [
      { prompt: 'Qu y a-t-il a l ecole ?', choices: ['un petit test', 'un film', 'un repas'], answer: 'un petit test', explanation: '小さいテストがあります signifie il y a un petit test.' },
      { prompt: 'Qu a etudie la personne ?', choices: ['kanji et grammaire', 'train et gare', 'poisson et the'], answer: 'kanji et grammaire', explanation: '漢字と文法 indique kanji et grammaire.' },
    ],
  },
  {
    id: 'immersion-weekend-review',
    title: 'Revision du week-end',
    level: 'N5',
    theme: 'Revision',
    japanese: '土曜日に家で復習します。十の言葉を書きます。それから、短い文を読みます。',
    kana: 'どようびにいえでふくしゅうします。じゅうのことばをかきます。それから、みじかいぶんをよみます。',
    translationFr: 'Samedi, je revise a la maison. J ecris dix mots. Ensuite, je lis des phrases courtes.',
    questions: [
      { prompt: 'Quand la personne revise-t-elle ?', choices: ['samedi', 'mercredi', 'lundi'], answer: 'samedi', explanation: '土曜日 signifie samedi.' },
      { prompt: 'Combien de mots ecrit-elle ?', choices: ['dix', 'cinq', 'cent'], answer: 'dix', explanation: '十の言葉 signifie dix mots.' },
    ],
  },
];

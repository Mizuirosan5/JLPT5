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
];

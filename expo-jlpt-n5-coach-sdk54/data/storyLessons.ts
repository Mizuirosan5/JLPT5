export type StoryDialogueLine = {
  speaker: string;
  japanese: string;
  kana: string;
  translationFr: string;
};

export type StoryQuestion = {
  prompt: string;
  choices: string[];
  answer: string;
  explanation: string;
};

export type StoryLesson = {
  id: string;
  title: string;
  level: 'N5';
  theme: string;
  goal: string;
  lines: StoryDialogueLine[];
  questions: StoryQuestion[];
};

export const STORY_LESSONS: StoryLesson[] = [
  {
    id: 'story-greeting-school',
    title: 'Rencontre a l ecole',
    level: 'N5',
    theme: 'Salutations',
    goal: 'Comprendre une presentation simple.',
    lines: [
      { speaker: 'Aki', japanese: 'おはようございます。私はあきです。', kana: 'おはようございます。わたしはあきです。', translationFr: 'Bonjour. Je suis Aki.' },
      { speaker: 'Paul', japanese: 'はじめまして。ポールです。フランス人です。', kana: 'はじめまして。ポールです。フランスじんです。', translationFr: 'Enchante. Je suis Paul. Je suis francais.' },
      { speaker: 'Aki', japanese: 'よろしくお願いします。', kana: 'よろしくおねがいします。', translationFr: 'Ravie de faire ta connaissance.' },
    ],
    questions: [
      { prompt: 'Qui est francais ?', choices: ['Paul', 'Aki', 'Le professeur'], answer: 'Paul', explanation: 'ポールです。フランス人です indique que Paul est francais.' },
      { prompt: 'Ou se passe la scene ?', choices: ['a l ecole', 'a la gare', 'au magasin'], answer: 'a l ecole', explanation: 'Le titre et le contexte indiquent une rencontre a l ecole.' },
    ],
  },
  {
    id: 'story-at-station',
    title: 'A la gare',
    level: 'N5',
    theme: 'Transport',
    goal: 'Suivre une indication d heure et de train.',
    lines: [
      { speaker: 'Mika', japanese: '電車は何時に来ますか。', kana: 'でんしゃはなんじにきますか。', translationFr: 'A quelle heure vient le train ?' },
      { speaker: 'Taro', japanese: '八時半に来ます。', kana: 'はちじはんにきます。', translationFr: 'Il vient a huit heures et demie.' },
      { speaker: 'Mika', japanese: 'ありがとうございます。駅で待ちます。', kana: 'ありがとうございます。えきでまちます。', translationFr: 'Merci. J attends a la gare.' },
    ],
    questions: [
      { prompt: 'Quand arrive le train ?', choices: ['huit heures et demie', 'sept heures', 'midi'], answer: 'huit heures et demie', explanation: '八時半 signifie huit heures et demie.' },
      { prompt: 'Ou Mika attend-elle ?', choices: ['a la gare', 'a la maison', 'a l ecole'], answer: 'a la gare', explanation: '駅で待ちます signifie attendre a la gare.' },
    ],
  },
  {
    id: 'story-small-shop',
    title: 'Dans un petit magasin',
    level: 'N5',
    theme: 'Achats',
    goal: 'Comprendre prix, objet et formule polie.',
    lines: [
      { speaker: 'Client', japanese: 'この本はいくらですか。', kana: 'このほんはいくらですか。', translationFr: 'Combien coute ce livre ?' },
      { speaker: 'Vendeur', japanese: '五百円です。新しい本です。', kana: 'ごひゃくえんです。あたらしいほんです。', translationFr: 'C est 500 yens. C est un nouveau livre.' },
      { speaker: 'Client', japanese: 'じゃ、これをください。', kana: 'じゃ、これをください。', translationFr: 'Alors, je prends celui-ci.' },
    ],
    questions: [
      { prompt: 'Que veut acheter le client ?', choices: ['un livre', 'un stylo', 'du poisson'], answer: 'un livre', explanation: 'この本 designe ce livre.' },
      { prompt: 'Quel est le prix ?', choices: ['500 yens', '1000 yens', '50 yens'], answer: '500 yens', explanation: '五百円 signifie 500 yens.' },
    ],
  },
  {
    id: 'story-family-evening',
    title: 'Le soir en famille',
    level: 'N5',
    theme: 'Famille',
    goal: 'Identifier les membres de la famille et les gouts.',
    lines: [
      { speaker: 'Enfant', japanese: '母は魚が好きですか。', kana: 'はははさかながすきですか。', translationFr: 'Maman aime-t-elle le poisson ?' },
      { speaker: 'Pere', japanese: 'はい、好きです。父は肉が好きです。', kana: 'はい、すきです。ちちはにくがすきです。', translationFr: 'Oui, elle aime ca. Papa aime la viande.' },
      { speaker: 'Enfant', japanese: '今日は家でご飯を食べます。', kana: 'きょうはいえでごはんをたべます。', translationFr: 'Aujourd hui, nous mangeons a la maison.' },
    ],
    questions: [
      { prompt: 'Que prefere la mere ?', choices: ['le poisson', 'la viande', 'le the'], answer: 'le poisson', explanation: '魚が好きです signifie aimer le poisson.' },
      { prompt: 'Ou mangent-ils ?', choices: ['a la maison', 'a l ecole', 'dans le train'], answer: 'a la maison', explanation: '家でご飯を食べます signifie manger a la maison.' },
    ],
  },
  {
    id: 'story-weather-plan',
    title: 'Plan quand il pleut',
    level: 'N5',
    theme: 'Meteo',
    goal: 'Comprendre un changement de programme simple.',
    lines: [
      { speaker: 'Nina', japanese: '今日は雨ですね。', kana: 'きょうはあめですね。', translationFr: 'Il pleut aujourd hui, n est-ce pas ?' },
      { speaker: 'Ken', japanese: 'はい。外に行きません。家で勉強します。', kana: 'はい。そとにいきません。いえでべんきょうします。', translationFr: 'Oui. Je ne vais pas dehors. J etudie a la maison.' },
      { speaker: 'Nina', japanese: '私は日本語の文を読みます。', kana: 'わたしはにほんごのぶんをよみます。', translationFr: 'Je lis des phrases japonaises.' },
    ],
    questions: [
      { prompt: 'Quel temps fait-il ?', choices: ['il pleut', 'il neige', 'il fait chaud'], answer: 'il pleut', explanation: '雨 signifie pluie.' },
      { prompt: 'Que fait Ken ?', choices: ['il etudie a la maison', 'il va dehors', 'il achete un livre'], answer: 'il etudie a la maison', explanation: '家で勉強します signifie etudier a la maison.' },
    ],
  },
  {
    id: 'story-class-test',
    title: 'Avant le test',
    level: 'N5',
    theme: 'Ecole',
    goal: 'Comprendre revision, matiere et horaire.',
    lines: [
      { speaker: 'Professeur', japanese: '明日、小さいテストがあります。', kana: 'あした、ちいさいテストがあります。', translationFr: 'Demain, il y aura un petit test.' },
      { speaker: 'Etudiant', japanese: '何を勉強しますか。', kana: 'なにをべんきょうしますか。', translationFr: 'Qu est-ce qu on etudie ?' },
      { speaker: 'Professeur', japanese: '漢字と文法を復習してください。', kana: 'かんじとぶんぽうをふくしゅうしてください。', translationFr: 'Revisez les kanji et la grammaire, s il vous plait.' },
    ],
    questions: [
      { prompt: 'Quand est le test ?', choices: ['demain', 'aujourd hui', 'dimanche'], answer: 'demain', explanation: '明日 signifie demain.' },
      { prompt: 'Que faut-il reviser ?', choices: ['kanji et grammaire', 'poisson et eau', 'gare et train'], answer: 'kanji et grammaire', explanation: '漢字と文法 indique kanji et grammaire.' },
    ],
  },
  {
    id: 'story-cafe-tea',
    title: 'Au cafe',
    level: 'N5',
    theme: 'Nourriture',
    goal: 'Commander une boisson simplement.',
    lines: [
      { speaker: 'Serveur', japanese: '何を飲みますか。', kana: 'なにをのみますか。', translationFr: 'Que buvez-vous ?' },
      { speaker: 'Client', japanese: 'お茶をください。水もお願いします。', kana: 'おちゃをください。みずもおねがいします。', translationFr: 'Du the, s il vous plait. De l eau aussi.' },
      { speaker: 'Serveur', japanese: 'はい、どうぞ。', kana: 'はい、どうぞ。', translationFr: 'Oui, tenez.' },
    ],
    questions: [
      { prompt: 'Que commande le client ?', choices: ['du the et de l eau', 'du poisson', 'un livre'], answer: 'du the et de l eau', explanation: 'お茶 et 水 indiquent the et eau.' },
      { prompt: 'Quelle formule est polie ?', choices: ['ください', '駅', '雨'], answer: 'ください', explanation: 'ください sert a demander poliment.' },
    ],
  },
  {
    id: 'story-room-object',
    title: 'Objet perdu',
    level: 'N5',
    theme: 'Maison',
    goal: 'Situer un objet avec 上 et 下.',
    lines: [
      { speaker: 'Yui', japanese: '私のペンはどこですか。', kana: 'わたしのペンはどこですか。', translationFr: 'Ou est mon stylo ?' },
      { speaker: 'Mina', japanese: '机の上にありません。いすの下にあります。', kana: 'つくえのうえにありません。いすのしたにあります。', translationFr: 'Il n est pas sur le bureau. Il est sous la chaise.' },
      { speaker: 'Yui', japanese: 'あ、ありました。ありがとうございます。', kana: 'あ、ありました。ありがとうございます。', translationFr: 'Ah, je l ai trouve. Merci.' },
    ],
    questions: [
      { prompt: 'Ou est le stylo ?', choices: ['sous la chaise', 'sur le bureau', 'dans le sac'], answer: 'sous la chaise', explanation: 'いすの下にあります signifie etre sous la chaise.' },
      { prompt: 'Quel mot signifie sur ?', choices: ['上', '下', '中'], answer: '上', explanation: '上 se lit うえ et signifie sur / dessus.' },
    ],
  },
  {
    id: 'story-weekend-study',
    title: 'Revision du samedi',
    level: 'N5',
    theme: 'Routine',
    goal: 'Comprendre une sequence d actions.',
    lines: [
      { speaker: 'Sora', japanese: '土曜日に何をしますか。', kana: 'どようびになにをしますか。', translationFr: 'Que fais-tu samedi ?' },
      { speaker: 'Emi', japanese: '午前、言葉を書きます。午後、短い文を読みます。', kana: 'ごぜん、ことばをかきます。ごご、みじかいぶんをよみます。', translationFr: 'Le matin, j ecris des mots. L apres-midi, je lis des phrases courtes.' },
      { speaker: 'Sora', japanese: 'いいですね。私も勉強します。', kana: 'いいですね。わたしもべんきょうします。', translationFr: 'C est bien. Moi aussi, j etudie.' },
    ],
    questions: [
      { prompt: 'Quand Emi ecrit-elle des mots ?', choices: ['le matin', 'le soir', 'dimanche'], answer: 'le matin', explanation: '午前 signifie le matin.' },
      { prompt: 'Que lit-elle l apres-midi ?', choices: ['des phrases courtes', 'un journal', 'un menu'], answer: 'des phrases courtes', explanation: '短い文 signifie phrases courtes.' },
    ],
  },
  {
    id: 'story-doctor-rest',
    title: 'Se reposer',
    level: 'N5',
    theme: 'Sante',
    goal: 'Comprendre un conseil simple.',
    lines: [
      { speaker: 'Docteur', japanese: '今日はあまり元気ではありませんね。', kana: 'きょうはあまりげんきではありませんね。', translationFr: 'Aujourd hui, vous n avez pas beaucoup d energie.' },
      { speaker: 'Patient', japanese: 'はい。少し休みたいです。', kana: 'はい。すこしやすみたいです。', translationFr: 'Oui. Je veux me reposer un peu.' },
      { speaker: 'Docteur', japanese: '水を飲んで、家で休んでください。', kana: 'みずをのんで、いえでやすんでください。', translationFr: 'Buvez de l eau et reposez-vous a la maison.' },
    ],
    questions: [
      { prompt: 'Que veut faire le patient ?', choices: ['se reposer', 'aller a l ecole', 'acheter un livre'], answer: 'se reposer', explanation: '休みたいです signifie vouloir se reposer.' },
      { prompt: 'Que conseille le docteur ?', choices: ['boire de l eau et se reposer', 'prendre le train', 'manger du poisson'], answer: 'boire de l eau et se reposer', explanation: '水を飲んで、家で休んでください donne ce conseil.' },
    ],
  },
];

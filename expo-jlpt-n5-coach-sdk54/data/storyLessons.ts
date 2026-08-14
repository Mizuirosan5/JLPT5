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
  {
    id: 'story-restaurant-lunch',
    title: 'Dejeuner au restaurant',
    level: 'N5',
    theme: 'Restaurant',
    goal: 'Commander un repas simple.',
    lines: [
      { speaker: 'Serveur', japanese: 'いらっしゃいませ。何を食べますか。', kana: 'いらっしゃいませ。なにをたべますか。', translationFr: 'Bienvenue. Que voulez-vous manger ?' },
      { speaker: 'Client', japanese: '魚とご飯をください。', kana: 'さかなとごはんをください。', translationFr: 'Du poisson et du riz, s il vous plait.' },
      { speaker: 'Serveur', japanese: 'はい。お茶もどうぞ。', kana: 'はい。おちゃもどうぞ。', translationFr: 'Oui. Voici aussi du the.' },
    ],
    questions: [
      { prompt: 'Que commande le client ?', choices: ['du poisson et du riz', 'un train', 'un livre'], answer: 'du poisson et du riz', explanation: '魚とご飯 indique poisson et riz.' },
      { prompt: 'Que donne aussi le serveur ?', choices: ['du the', 'un stylo', 'un billet'], answer: 'du the', explanation: 'お茶もどうぞ signifie voici aussi du the.' },
    ],
  },
  {
    id: 'story-library-card',
    title: 'Carte de bibliotheque',
    level: 'N5',
    theme: 'Bibliotheque',
    goal: 'Demander un livre et comprendre une duree.',
    lines: [
      { speaker: 'Etudiant', japanese: '日本語の本を借りたいです。', kana: 'にほんごのほんをかりたいです。', translationFr: 'Je voudrais emprunter un livre de japonais.' },
      { speaker: 'Employe', japanese: 'この本は一週間借りることができます。', kana: 'このほんはいっしゅうかんかりることができます。', translationFr: 'Vous pouvez emprunter ce livre pendant une semaine.' },
      { speaker: 'Etudiant', japanese: 'ありがとうございます。今日から読みます。', kana: 'ありがとうございます。きょうからよみます。', translationFr: 'Merci. Je vais le lire a partir d aujourd hui.' },
    ],
    questions: [
      { prompt: 'Que veut emprunter l etudiant ?', choices: ['un livre de japonais', 'un telephone', 'un velo'], answer: 'un livre de japonais', explanation: '日本語の本 signifie livre de japonais.' },
      { prompt: 'Combien de temps peut-il garder le livre ?', choices: ['une semaine', 'un jour', 'un mois'], answer: 'une semaine', explanation: '一週間 signifie une semaine.' },
    ],
  },
  {
    id: 'story-post-office',
    title: 'A la poste',
    level: 'N5',
    theme: 'Poste',
    goal: 'Comprendre un envoi simple.',
    lines: [
      { speaker: 'Client', japanese: 'この手紙をフランスへ出したいです。', kana: 'このてがみをフランスへだしたいです。', translationFr: 'Je voudrais envoyer cette lettre en France.' },
      { speaker: 'Employe', japanese: 'はい。切手は百円です。', kana: 'はい。きってはひゃくえんです。', translationFr: 'Oui. Le timbre coute 100 yens.' },
      { speaker: 'Client', japanese: 'じゃ、一つください。', kana: 'じゃ、ひとつください。', translationFr: 'Alors, un s il vous plait.' },
    ],
    questions: [
      { prompt: 'Que veut envoyer le client ?', choices: ['une lettre', 'un livre', 'du poisson'], answer: 'une lettre', explanation: '手紙 signifie lettre.' },
      { prompt: 'Combien coute le timbre ?', choices: ['100 yens', '500 yens', '10 yens'], answer: '100 yens', explanation: '百円 signifie 100 yens.' },
    ],
  },
  {
    id: 'story-phone-call',
    title: 'Appel a un ami',
    level: 'N5',
    theme: 'Telephone',
    goal: 'Comprendre une invitation courte.',
    lines: [
      { speaker: 'Leo', japanese: 'もしもし、今ひまですか。', kana: 'もしもし、いまひまですか。', translationFr: 'Allo, tu es libre maintenant ?' },
      { speaker: 'Hana', japanese: 'はい、ひまです。何をしますか。', kana: 'はい、ひまです。なにをしますか。', translationFr: 'Oui, je suis libre. Que fait-on ?' },
      { speaker: 'Leo', japanese: '公園で少し話しましょう。', kana: 'こうえんですこしはなしましょう。', translationFr: 'Parlons un peu au parc.' },
    ],
    questions: [
      { prompt: 'Ou Leo propose-t-il d aller ?', choices: ['au parc', 'a la poste', 'a la gare'], answer: 'au parc', explanation: '公園で indique au parc.' },
      { prompt: 'Hana est-elle libre ?', choices: ['oui', 'non', 'on ne sait pas'], answer: 'oui', explanation: 'ひまです signifie etre libre.' },
    ],
  },
  {
    id: 'story-morning-routine',
    title: 'Routine du matin',
    level: 'N5',
    theme: 'Routine',
    goal: 'Suivre une routine quotidienne.',
    lines: [
      { speaker: 'Mere', japanese: '何時に起きますか。', kana: 'なんじにおきますか。', translationFr: 'A quelle heure te leves-tu ?' },
      { speaker: 'Enfant', japanese: '七時に起きます。それから朝ご飯を食べます。', kana: 'しちじにおきます。それからあさごはんをたべます。', translationFr: 'Je me leve a sept heures. Ensuite je prends le petit-dejeuner.' },
      { speaker: 'Mere', japanese: '学校へ行く前に水を飲んでください。', kana: 'がっこうへいくまえにみずをのんでください。', translationFr: 'Bois de l eau avant d aller a l ecole.' },
    ],
    questions: [
      { prompt: 'A quelle heure l enfant se leve-t-il ?', choices: ['sept heures', 'huit heures', 'six heures'], answer: 'sept heures', explanation: '七時 signifie sept heures.' },
      { prompt: 'Que fait-il ensuite ?', choices: ['il mange le petit-dejeuner', 'il dort', 'il achete un livre'], answer: 'il mange le petit-dejeuner', explanation: '朝ご飯を食べます signifie prendre le petit-dejeuner.' },
    ],
  },
  {
    id: 'story-evening-homework',
    title: 'Devoirs du soir',
    level: 'N5',
    theme: 'Ecole',
    goal: 'Comprendre les devoirs a faire.',
    lines: [
      { speaker: 'Professeur', japanese: '今日の宿題は漢字を十書くことです。', kana: 'きょうのしゅくだいはかんじをじゅうかくことです。', translationFr: 'Le devoir d aujourd hui est d ecrire dix kanji.' },
      { speaker: 'Etudiant', japanese: '文も読みますか。', kana: 'ぶんもよみますか。', translationFr: 'Est-ce qu on lit aussi des phrases ?' },
      { speaker: 'Professeur', japanese: 'はい、短い文を三つ読んでください。', kana: 'はい、みじかいぶんをみっつよんでください。', translationFr: 'Oui, lisez trois phrases courtes.' },
    ],
    questions: [
      { prompt: 'Combien de kanji faut-il ecrire ?', choices: ['dix', 'trois', 'cent'], answer: 'dix', explanation: '十 signifie dix.' },
      { prompt: 'Combien de phrases faut-il lire ?', choices: ['trois', 'sept', 'une'], answer: 'trois', explanation: '三つ signifie trois choses.' },
    ],
  },
  {
    id: 'story-train-ticket',
    title: 'Acheter un billet',
    level: 'N5',
    theme: 'Transport',
    goal: 'Acheter un billet de train.',
    lines: [
      { speaker: 'Client', japanese: '東京までの切符はいくらですか。', kana: 'とうきょうまでのきっぷはいくらですか。', translationFr: 'Combien coute un billet jusqu a Tokyo ?' },
      { speaker: 'Employe', japanese: '二千円です。電車は九時に出ます。', kana: 'にせんえんです。でんしゃはくじにでます。', translationFr: 'C est 2000 yens. Le train part a neuf heures.' },
      { speaker: 'Client', japanese: '一枚ください。', kana: 'いちまいください。', translationFr: 'Un billet, s il vous plait.' },
    ],
    questions: [
      { prompt: 'Ou va le client ?', choices: ['Tokyo', 'Kyoto', 'France'], answer: 'Tokyo', explanation: '東京まで signifie jusqu a Tokyo.' },
      { prompt: 'A quelle heure part le train ?', choices: ['neuf heures', 'huit heures', 'midi'], answer: 'neuf heures', explanation: '九時に出ます signifie partir a neuf heures.' },
    ],
  },
  {
    id: 'story-asking-direction',
    title: 'Demander son chemin',
    level: 'N5',
    theme: 'Ville',
    goal: 'Comprendre gauche, droite et proximite.',
    lines: [
      { speaker: 'Touriste', japanese: '駅はどこですか。', kana: 'えきはどこですか。', translationFr: 'Ou est la gare ?' },
      { speaker: 'Passant', japanese: 'この道をまっすぐ行って、右です。', kana: 'このみちをまっすぐいって、みぎです。', translationFr: 'Allez tout droit sur cette route, puis c est a droite.' },
      { speaker: 'Touriste', japanese: '近いですか。', kana: 'ちかいですか。', translationFr: 'Est-ce proche ?' },
    ],
    questions: [
      { prompt: 'Que cherche le touriste ?', choices: ['la gare', 'la bibliotheque', 'une ecole'], answer: 'la gare', explanation: '駅 signifie gare.' },
      { prompt: 'De quel cote faut-il tourner ?', choices: ['a droite', 'a gauche', 'en bas'], answer: 'a droite', explanation: '右 signifie droite.' },
    ],
  },
  {
    id: 'story-clothes-shop',
    title: 'Acheter un vetement',
    level: 'N5',
    theme: 'Achats',
    goal: 'Parler de couleur et de prix.',
    lines: [
      { speaker: 'Client', japanese: 'この白いシャツはいくらですか。', kana: 'このしろいシャツはいくらですか。', translationFr: 'Combien coute cette chemise blanche ?' },
      { speaker: 'Vendeur', japanese: '千円です。新しいシャツです。', kana: 'せんえんです。あたらしいシャツです。', translationFr: 'Elle coute 1000 yens. C est une nouvelle chemise.' },
      { speaker: 'Client', japanese: '少し高いですね。', kana: 'すこしたかいですね。', translationFr: 'C est un peu cher.' },
    ],
    questions: [
      { prompt: 'Quelle est la couleur de la chemise ?', choices: ['blanche', 'rouge', 'noire'], answer: 'blanche', explanation: '白い signifie blanc.' },
      { prompt: 'Que pense le client du prix ?', choices: ['un peu cher', 'tres bon marche', 'gratuit'], answer: 'un peu cher', explanation: '少し高い signifie un peu cher.' },
    ],
  },
  {
    id: 'story-birthday',
    title: 'Anniversaire',
    level: 'N5',
    theme: 'Temps',
    goal: 'Comprendre date et cadeau.',
    lines: [
      { speaker: 'Yuki', japanese: '誕生日はいつですか。', kana: 'たんじょうびはいつですか。', translationFr: 'Quand est ton anniversaire ?' },
      { speaker: 'Noa', japanese: '六月十日です。新しい本がほしいです。', kana: 'ろくがつとおかです。あたらしいほんがほしいです。', translationFr: 'C est le 10 juin. Je veux un nouveau livre.' },
      { speaker: 'Yuki', japanese: 'いいですね。本を買います。', kana: 'いいですね。ほんをかいます。', translationFr: 'Tres bien. J acheterai un livre.' },
    ],
    questions: [
      { prompt: 'Quand est l anniversaire ?', choices: ['le 10 juin', 'le 1er janvier', 'le samedi'], answer: 'le 10 juin', explanation: '六月十日 signifie le 10 juin.' },
      { prompt: 'Que veut Noa ?', choices: ['un nouveau livre', 'du the', 'un billet'], answer: 'un nouveau livre', explanation: '新しい本がほしいです signifie vouloir un nouveau livre.' },
    ],
  },
  {
    id: 'story-clean-room',
    title: 'Ranger la chambre',
    level: 'N5',
    theme: 'Maison',
    goal: 'Comprendre les objets de la chambre.',
    lines: [
      { speaker: 'Mere', japanese: '部屋を掃除してください。', kana: 'へやをそうじしてください。', translationFr: 'Range/nettoie ta chambre, s il te plait.' },
      { speaker: 'Enfant', japanese: '本は机の上に置きます。', kana: 'ほんはつくえのうえにおきます。', translationFr: 'Je mets les livres sur le bureau.' },
      { speaker: 'Mere', japanese: 'いすの下も見てください。', kana: 'いすのしたもみてください。', translationFr: 'Regarde aussi sous la chaise.' },
    ],
    questions: [
      { prompt: 'Ou l enfant met-il les livres ?', choices: ['sur le bureau', 'dans le train', 'a la poste'], answer: 'sur le bureau', explanation: '机の上 signifie sur le bureau.' },
      { prompt: 'Ou faut-il regarder aussi ?', choices: ['sous la chaise', 'dans l eau', 'au restaurant'], answer: 'sous la chaise', explanation: 'いすの下 signifie sous la chaise.' },
    ],
  },
  {
    id: 'story-pet-fish',
    title: 'Le poisson de la classe',
    level: 'N5',
    theme: 'Animaux',
    goal: 'Comprendre soin et nourriture.',
    lines: [
      { speaker: 'Professeur', japanese: 'この魚に水をあげてください。', kana: 'このさかなにみずをあげてください。', translationFr: 'Donnez de l eau a ce poisson, s il vous plait.' },
      { speaker: 'Etudiant', japanese: '食べ物もあげますか。', kana: 'たべものもあげますか。', translationFr: 'Est-ce que je donne aussi de la nourriture ?' },
      { speaker: 'Professeur', japanese: 'はい、少しだけです。', kana: 'はい、すこしだけです。', translationFr: 'Oui, seulement un peu.' },
    ],
    questions: [
      { prompt: 'A quel animal donnent-ils de l eau ?', choices: ['un poisson', 'un chien', 'un chat'], answer: 'un poisson', explanation: '魚 signifie poisson.' },
      { prompt: 'Combien de nourriture faut-il donner ?', choices: ['un peu', 'beaucoup', 'rien'], answer: 'un peu', explanation: '少しだけ signifie seulement un peu.' },
    ],
  },
  {
    id: 'story-meeting-time',
    title: 'Rendez-vous',
    level: 'N5',
    theme: 'Temps',
    goal: 'Fixer une heure de rendez-vous.',
    lines: [
      { speaker: 'Ami A', japanese: '明日、何時に会いますか。', kana: 'あした、なんじにあいますか。', translationFr: 'Demain, a quelle heure se voit-on ?' },
      { speaker: 'Ami B', japanese: '午後三時に駅で会いましょう。', kana: 'ごごさんじにえきであいましょう。', translationFr: 'Voyons-nous a la gare a trois heures de l apres-midi.' },
      { speaker: 'Ami A', japanese: 'わかりました。', kana: 'わかりました。', translationFr: 'Compris.' },
    ],
    questions: [
      { prompt: 'Quand se voient-ils ?', choices: ['demain', 'aujourd hui', 'hier'], answer: 'demain', explanation: '明日 signifie demain.' },
      { prompt: 'A quelle heure ?', choices: ['15h', '9h', 'midi'], answer: '15h', explanation: '午後三時 signifie trois heures de l apres-midi.' },
    ],
  },
  {
    id: 'story-museum-weekend',
    title: 'Au musee',
    level: 'N5',
    theme: 'Sortie',
    goal: 'Comprendre une sortie culturelle.',
    lines: [
      { speaker: 'Guide', japanese: 'この美術館は日曜日も開いています。', kana: 'このびじゅつかんはにちようびもあいています。', translationFr: 'Ce musee est ouvert aussi le dimanche.' },
      { speaker: 'Visiteur', japanese: '写真を撮ってもいいですか。', kana: 'しゃしんをとってもいいですか。', translationFr: 'Puis-je prendre des photos ?' },
      { speaker: 'Guide', japanese: 'ここではだめです。', kana: 'ここではだめです。', translationFr: 'Ici, ce n est pas permis.' },
    ],
    questions: [
      { prompt: 'Quand le musee est-il aussi ouvert ?', choices: ['dimanche', 'lundi soir', 'hier'], answer: 'dimanche', explanation: '日曜日 signifie dimanche.' },
      { prompt: 'Les photos sont-elles autorisees ici ?', choices: ['non', 'oui', 'seulement le matin'], answer: 'non', explanation: 'だめです signifie que ce n est pas autorise.' },
    ],
  },
  {
    id: 'story-park-picnic',
    title: 'Pique-nique au parc',
    level: 'N5',
    theme: 'Sortie',
    goal: 'Comprendre une activite de week-end.',
    lines: [
      { speaker: 'Ren', japanese: '日曜日に公園へ行きませんか。', kana: 'にちようびにこうえんへいきませんか。', translationFr: 'Tu ne voudrais pas aller au parc dimanche ?' },
      { speaker: 'Aya', japanese: 'いいですね。お弁当を持って行きます。', kana: 'いいですね。おべんとうをもっていきます。', translationFr: 'Bonne idee. J apporterai un bentô.' },
      { speaker: 'Ren', japanese: '私は水を持って行きます。', kana: 'わたしはみずをもっていきます。', translationFr: 'Moi, j apporterai de l eau.' },
    ],
    questions: [
      { prompt: 'Ou vont-ils dimanche ?', choices: ['au parc', 'a la gare', 'a l ecole'], answer: 'au parc', explanation: '公園へ行きます signifie aller au parc.' },
      { prompt: 'Que porte Aya ?', choices: ['un bento', 'un ordinateur', 'un velo'], answer: 'un bento', explanation: 'お弁当を持って行きます signifie apporter un bento.' },
    ],
  },
  {
    id: 'story-hotel-checkin',
    title: 'A l hotel',
    level: 'N5',
    theme: 'Voyage',
    goal: 'Comprendre une reservation simple.',
    lines: [
      { speaker: 'Client', japanese: 'すみません、部屋はありますか。', kana: 'すみません、へやはありますか。', translationFr: 'Excusez-moi, avez-vous une chambre ?' },
      { speaker: 'Reception', japanese: 'はい。一人の部屋があります。', kana: 'はい。ひとりのへやがあります。', translationFr: 'Oui. Nous avons une chambre pour une personne.' },
      { speaker: 'Client', japanese: '一晩いくらですか。', kana: 'ひとばんいくらですか。', translationFr: 'Combien coute une nuit ?' },
    ],
    questions: [
      { prompt: 'Que cherche le client ?', choices: ['une chambre', 'un livre', 'un train'], answer: 'une chambre', explanation: '部屋 signifie chambre.' },
      { prompt: 'Pour combien de personnes est la chambre ?', choices: ['une personne', 'deux personnes', 'une famille'], answer: 'une personne', explanation: '一人 signifie une personne.' },
    ],
  },
  {
    id: 'story-airport-bag',
    title: 'Le sac a l aeroport',
    level: 'N5',
    theme: 'Voyage',
    goal: 'Identifier possession et couleur.',
    lines: [
      { speaker: 'Employe', japanese: 'この黒いかばんはあなたのですか。', kana: 'このくろいかばんはあなたのですか。', translationFr: 'Ce sac noir est-il a vous ?' },
      { speaker: 'Voyageur', japanese: 'いいえ、私のかばんは白いです。', kana: 'いいえ、わたしのかばんはしろいです。', translationFr: 'Non, mon sac est blanc.' },
      { speaker: 'Employe', japanese: 'では、あちらを見てください。', kana: 'では、あちらをみてください。', translationFr: 'Alors, regardez la-bas, s il vous plait.' },
    ],
    questions: [
      { prompt: 'De quelle couleur est le sac du voyageur ?', choices: ['blanc', 'noir', 'rouge'], answer: 'blanc', explanation: '白い signifie blanc.' },
      { prompt: 'Le sac noir est-il a lui ?', choices: ['non', 'oui', 'on ne sait pas'], answer: 'non', explanation: 'いいえ indique une reponse negative.' },
    ],
  },
  {
    id: 'story-market-fruit',
    title: 'Au marche',
    level: 'N5',
    theme: 'Achats',
    goal: 'Acheter de la nourriture avec quantite.',
    lines: [
      { speaker: 'Client', japanese: 'りんごを三つください。', kana: 'りんごをみっつください。', translationFr: 'Trois pommes, s il vous plait.' },
      { speaker: 'Vendeur', japanese: 'はい。ほかに何か。', kana: 'はい。ほかになにか。', translationFr: 'Oui. Autre chose ?' },
      { speaker: 'Client', japanese: '水も一本ください。', kana: 'みずもいっぽんください。', translationFr: 'Une bouteille d eau aussi, s il vous plait.' },
    ],
    questions: [
      { prompt: 'Combien de pommes veut le client ?', choices: ['trois', 'une', 'sept'], answer: 'trois', explanation: '三つ signifie trois objets.' },
      { prompt: 'Que demande-t-il aussi ?', choices: ['de l eau', 'un livre', 'un billet'], answer: 'de l eau', explanation: '水も signifie de l eau aussi.' },
    ],
  },
  {
    id: 'story-bank-money',
    title: 'A la banque',
    level: 'N5',
    theme: 'Ville',
    goal: 'Comprendre une demande administrative simple.',
    lines: [
      { speaker: 'Client', japanese: 'お金を出したいです。', kana: 'おかねをだしたいです。', translationFr: 'Je voudrais retirer de l argent.' },
      { speaker: 'Employe', japanese: 'この紙に名前を書いてください。', kana: 'このかみになまえをかいてください。', translationFr: 'Ecrivez votre nom sur ce papier, s il vous plait.' },
      { speaker: 'Client', japanese: 'はい、わかりました。', kana: 'はい、わかりました。', translationFr: 'Oui, compris.' },
    ],
    questions: [
      { prompt: 'Que veut faire le client ?', choices: ['retirer de l argent', 'acheter du riz', 'lire un livre'], answer: 'retirer de l argent', explanation: 'お金を出したいです indique retirer/sortir de l argent.' },
      { prompt: 'Que doit-il ecrire ?', choices: ['son nom', 'son age', 'un kanji seulement'], answer: 'son nom', explanation: '名前を書いてください signifie ecrivez votre nom.' },
    ],
  },
  {
    id: 'story-weekday-calendar',
    title: 'Choisir un jour',
    level: 'N5',
    theme: 'Calendrier',
    goal: 'Comprendre les jours de la semaine.',
    lines: [
      { speaker: 'Ami A', japanese: '月曜日は忙しいですか。', kana: 'げつようびはいそがしいですか。', translationFr: 'Es-tu occupe lundi ?' },
      { speaker: 'Ami B', japanese: 'はい。でも水曜日はひまです。', kana: 'はい。でもすいようびはひまです。', translationFr: 'Oui. Mais mercredi, je suis libre.' },
      { speaker: 'Ami A', japanese: 'では、水曜日に会いましょう。', kana: 'では、すいようびにあいましょう。', translationFr: 'Alors, voyons-nous mercredi.' },
    ],
    questions: [
      { prompt: 'Quel jour est libre ?', choices: ['mercredi', 'lundi', 'dimanche'], answer: 'mercredi', explanation: '水曜日はひまです signifie libre mercredi.' },
      { prompt: 'Lundi est-il occupe ?', choices: ['oui', 'non', 'on ne sait pas'], answer: 'oui', explanation: '忙しいですか puis はい confirme que lundi est occupe.' },
    ],
  },
  {
    id: 'story-photo-family',
    title: 'Photo de famille',
    level: 'N5',
    theme: 'Famille',
    goal: 'Identifier les personnes.',
    lines: [
      { speaker: 'Hugo', japanese: 'これは私の家族の写真です。', kana: 'これはわたしのかぞくのしゃしんです。', translationFr: 'Ceci est une photo de ma famille.' },
      { speaker: 'Mia', japanese: 'この人はだれですか。', kana: 'このひとはだれですか。', translationFr: 'Qui est cette personne ?' },
      { speaker: 'Hugo', japanese: '兄です。大学生です。', kana: 'あにです。だいがくせいです。', translationFr: 'C est mon grand frere. Il est etudiant a l universite.' },
    ],
    questions: [
      { prompt: 'Qui est sur la photo ?', choices: ['le grand frere', 'le professeur', 'le medecin'], answer: 'le grand frere', explanation: '兄 signifie grand frere.' },
      { prompt: 'Que fait-il ?', choices: ['il est etudiant', 'il vend des livres', 'il conduit un train'], answer: 'il est etudiant', explanation: '大学生 signifie etudiant a l universite.' },
    ],
  },
  {
    id: 'story-new-neighbor',
    title: 'Nouveau voisin',
    level: 'N5',
    theme: 'Presentation',
    goal: 'Comprendre une presentation polie.',
    lines: [
      { speaker: 'Voisin', japanese: 'はじめまして。山田です。', kana: 'はじめまして。やまだです。', translationFr: 'Enchante. Je suis Yamada.' },
      { speaker: 'Moi', japanese: 'こちらこそ。私は田中です。', kana: 'こちらこそ。わたしはたなかです。', translationFr: 'Enchante egalement. Je suis Tanaka.' },
      { speaker: 'Voisin', japanese: 'どうぞよろしくお願いします。', kana: 'どうぞよろしくおねがいします。', translationFr: 'Ravi de vous connaitre.' },
    ],
    questions: [
      { prompt: 'Comment s appelle le voisin ?', choices: ['Yamada', 'Tanaka', 'Paul'], answer: 'Yamada', explanation: '山田です indique Yamada.' },
      { prompt: 'La situation est-elle formelle ?', choices: ['oui', 'non', 'on ne sait pas'], answer: 'oui', explanation: 'はじめまして et よろしくお願いします sont des formules polies.' },
    ],
  },
  {
    id: 'story-sports-club',
    title: 'Club de sport',
    level: 'N5',
    theme: 'Loisirs',
    goal: 'Parler d activite et de frequence.',
    lines: [
      { speaker: 'Coach', japanese: '毎週、何曜日に来ますか。', kana: 'まいしゅう、なんようびにきますか。', translationFr: 'Chaque semaine, quel jour venez-vous ?' },
      { speaker: 'Eleve', japanese: '火曜日と木曜日に来ます。', kana: 'かようびともくようびにきます。', translationFr: 'Je viens mardi et jeudi.' },
      { speaker: 'Coach', japanese: 'いいですね。水も持って来てください。', kana: 'いいですね。みずももってきてください。', translationFr: 'Tres bien. Apportez aussi de l eau.' },
    ],
    questions: [
      { prompt: 'Quels jours vient l eleve ?', choices: ['mardi et jeudi', 'lundi et dimanche', 'mercredi seulement'], answer: 'mardi et jeudi', explanation: '火曜日と木曜日 signifie mardi et jeudi.' },
      { prompt: 'Que doit-il apporter ?', choices: ['de l eau', 'un livre', 'un poisson'], answer: 'de l eau', explanation: '水も持って来てください signifie apportez aussi de l eau.' },
    ],
  },
  {
    id: 'story-lost-wallet',
    title: 'Portefeuille perdu',
    level: 'N5',
    theme: 'Probleme',
    goal: 'Expliquer un objet perdu.',
    lines: [
      { speaker: 'Client', japanese: 'すみません。財布がありません。', kana: 'すみません。さいふがありません。', translationFr: 'Excusez-moi. Mon portefeuille n est pas la.' },
      { speaker: 'Employe', japanese: 'どこで見ましたか。', kana: 'どこでみましたか。', translationFr: 'Ou l avez-vous vu ?' },
      { speaker: 'Client', japanese: '駅の前で見ました。', kana: 'えきのまえでみました。', translationFr: 'Je l ai vu devant la gare.' },
    ],
    questions: [
      { prompt: 'Quel objet manque ?', choices: ['un portefeuille', 'un livre', 'un sac blanc'], answer: 'un portefeuille', explanation: '財布 signifie portefeuille.' },
      { prompt: 'Ou l objet a-t-il ete vu ?', choices: ['devant la gare', 'dans la chambre', 'au restaurant'], answer: 'devant la gare', explanation: '駅の前 signifie devant la gare.' },
    ],
  },
  {
    id: 'story-library-silence',
    title: 'Silence a la bibliotheque',
    level: 'N5',
    theme: 'Regles',
    goal: 'Comprendre une consigne.',
    lines: [
      { speaker: 'Employe', japanese: 'ここで大きい声で話さないでください。', kana: 'ここでおおきいこえではなさないでください。', translationFr: 'Ne parlez pas fort ici, s il vous plait.' },
      { speaker: 'Etudiant', japanese: 'すみません。静かに読みます。', kana: 'すみません。しずかによみます。', translationFr: 'Pardon. Je vais lire calmement.' },
      { speaker: 'Employe', japanese: 'ありがとうございます。', kana: 'ありがとうございます。', translationFr: 'Merci.' },
    ],
    questions: [
      { prompt: 'Que demande l employe ?', choices: ['ne pas parler fort', 'acheter un livre', 'sortir dehors'], answer: 'ne pas parler fort', explanation: '話さないでください signifie ne parlez pas.' },
      { prompt: 'Que va faire l etudiant ?', choices: ['lire calmement', 'courir', 'manger'], answer: 'lire calmement', explanation: '静かに読みます signifie lire calmement.' },
    ],
  },
  {
    id: 'story-school-club',
    title: 'Club apres l ecole',
    level: 'N5',
    theme: 'Ecole',
    goal: 'Comprendre une activite apres les cours.',
    lines: [
      { speaker: 'Ami', japanese: '学校の後で何をしますか。', kana: 'がっこうのあとでなにをしますか。', translationFr: 'Que fais-tu apres l ecole ?' },
      { speaker: 'Moi', japanese: '日本語クラブへ行きます。', kana: 'にほんごクラブへいきます。', translationFr: 'Je vais au club de japonais.' },
      { speaker: 'Ami', japanese: '私も行きたいです。', kana: 'わたしもいきたいです。', translationFr: 'Moi aussi, je veux y aller.' },
    ],
    questions: [
      { prompt: 'Ou va la personne apres l ecole ?', choices: ['au club de japonais', 'a la banque', 'a l aeroport'], answer: 'au club de japonais', explanation: '日本語クラブへ行きます signifie aller au club de japonais.' },
      { prompt: 'L ami veut-il venir ?', choices: ['oui', 'non', 'il ne peut pas'], answer: 'oui', explanation: '私も行きたいです signifie moi aussi je veux y aller.' },
    ],
  },
  {
    id: 'story-ill-friend',
    title: 'Ami malade',
    level: 'N5',
    theme: 'Sante',
    goal: 'Comprendre symptome et conseil.',
    lines: [
      { speaker: 'Ami A', japanese: '顔が赤いですね。大丈夫ですか。', kana: 'かおがあかいですね。だいじょうぶですか。', translationFr: 'Ton visage est rouge. Ca va ?' },
      { speaker: 'Ami B', japanese: '少し寒いです。家へ帰ります。', kana: 'すこしさむいです。いえへかえります。', translationFr: 'J ai un peu froid. Je rentre a la maison.' },
      { speaker: 'Ami A', japanese: '水を飲んで、休んでください。', kana: 'みずをのんで、やすんでください。', translationFr: 'Bois de l eau et repose-toi.' },
    ],
    questions: [
      { prompt: 'Comment se sent l ami B ?', choices: ['il a un peu froid', 'il a faim', 'il est tres heureux'], answer: 'il a un peu froid', explanation: '少し寒いです signifie avoir un peu froid.' },
      { prompt: 'Ou va-t-il ?', choices: ['a la maison', 'au parc', 'a la poste'], answer: 'a la maison', explanation: '家へ帰ります signifie rentrer a la maison.' },
    ],
  },
  {
    id: 'story-cooking-dinner',
    title: 'Preparer le diner',
    level: 'N5',
    theme: 'Cuisine',
    goal: 'Comprendre preparation et aliments.',
    lines: [
      { speaker: 'Pere', japanese: '今日は何を作りますか。', kana: 'きょうはなにをつくりますか。', translationFr: 'Que prepares-tu aujourd hui ?' },
      { speaker: 'Mere', japanese: '肉と野菜を作ります。', kana: 'にくとやさいをつくります。', translationFr: 'Je prepare de la viande et des legumes.' },
      { speaker: 'Enfant', japanese: 'ご飯も食べたいです。', kana: 'ごはんもたべたいです。', translationFr: 'Je veux aussi manger du riz.' },
    ],
    questions: [
      { prompt: 'Que prepare la mere ?', choices: ['viande et legumes', 'un billet', 'un livre'], answer: 'viande et legumes', explanation: '肉と野菜 signifie viande et legumes.' },
      { prompt: 'Que veut aussi l enfant ?', choices: ['du riz', 'du the seulement', 'un stylo'], answer: 'du riz', explanation: 'ご飯も食べたいです signifie vouloir aussi manger du riz.' },
    ],
  },
  {
    id: 'story-reading-news',
    title: 'Lire les nouvelles',
    level: 'N5',
    theme: 'Lecture',
    goal: 'Comprendre lecture et support.',
    lines: [
      { speaker: 'Ami', japanese: '毎朝、何を読みますか。', kana: 'まいあさ、なにをよみますか。', translationFr: 'Chaque matin, que lis-tu ?' },
      { speaker: 'Moi', japanese: '新聞を少し読みます。難しい言葉があります。', kana: 'しんぶんをすこしよみます。むずかしいことばがあります。', translationFr: 'Je lis un peu le journal. Il y a des mots difficiles.' },
      { speaker: 'Ami', japanese: '日本語の勉強になりますね。', kana: 'にほんごのべんきょうになりますね。', translationFr: 'Ca sert a etudier le japonais.' },
    ],
    questions: [
      { prompt: 'Que lit la personne chaque matin ?', choices: ['le journal', 'un menu', 'une lettre'], answer: 'le journal', explanation: '新聞 signifie journal.' },
      { prompt: 'Qu y a-t-il dans le journal ?', choices: ['des mots difficiles', 'des trains', 'des poissons'], answer: 'des mots difficiles', explanation: '難しい言葉 signifie mots difficiles.' },
    ],
  },
  {
    id: 'story-open-window',
    title: 'Ouvrir la fenetre',
    level: 'N5',
    theme: 'Classe',
    goal: 'Comprendre une demande en classe.',
    lines: [
      { speaker: 'Professeur', japanese: '暑いですね。窓を開けてください。', kana: 'あついですね。まどをあけてください。', translationFr: 'Il fait chaud. Ouvrez la fenetre, s il vous plait.' },
      { speaker: 'Etudiant', japanese: 'はい、開けます。', kana: 'はい、あけます。', translationFr: 'Oui, je l ouvre.' },
      { speaker: 'Professeur', japanese: 'ありがとうございます。', kana: 'ありがとうございます。', translationFr: 'Merci.' },
    ],
    questions: [
      { prompt: 'Quel temps fait-il dans la classe ?', choices: ['il fait chaud', 'il fait froid', 'il pleut'], answer: 'il fait chaud', explanation: '暑い signifie chaud.' },
      { prompt: 'Que faut-il ouvrir ?', choices: ['la fenetre', 'la porte de la gare', 'un livre'], answer: 'la fenetre', explanation: '窓 signifie fenetre.' },
    ],
  },
  {
    id: 'story-borrow-pen',
    title: 'Emprunter un stylo',
    level: 'N5',
    theme: 'Classe',
    goal: 'Demander un objet poliment.',
    lines: [
      { speaker: 'Etudiant A', japanese: 'すみません、ペンを借りてもいいですか。', kana: 'すみません、ペンをかりてもいいですか。', translationFr: 'Excuse-moi, puis-je emprunter un stylo ?' },
      { speaker: 'Etudiant B', japanese: 'はい、どうぞ。このペンは新しいです。', kana: 'はい、どうぞ。このペンはあたらしいです。', translationFr: 'Oui, tiens. Ce stylo est nouveau.' },
      { speaker: 'Etudiant A', japanese: 'ありがとうございます。あとで返します。', kana: 'ありがとうございます。あとでかえします。', translationFr: 'Merci. Je le rendrai plus tard.' },
    ],
    questions: [
      { prompt: 'Que veut emprunter l etudiant A ?', choices: ['un stylo', 'un sac', 'un billet'], answer: 'un stylo', explanation: 'ペンを借りてもいいですか demande a emprunter un stylo.' },
      { prompt: 'Quand va-t-il le rendre ?', choices: ['plus tard', 'demain seulement', 'jamais'], answer: 'plus tard', explanation: 'あとで返します signifie je rends plus tard.' },
    ],
  },
  {
    id: 'story-at-bookstore',
    title: 'Librairie',
    level: 'N5',
    theme: 'Achats',
    goal: 'Trouver un livre par theme.',
    lines: [
      { speaker: 'Client', japanese: '漢字の本はありますか。', kana: 'かんじのほんはありますか。', translationFr: 'Avez-vous un livre de kanji ?' },
      { speaker: 'Vendeur', japanese: 'はい、あちらにあります。', kana: 'はい、あちらにあります。', translationFr: 'Oui, il est la-bas.' },
      { speaker: 'Client', japanese: 'この本を買います。', kana: 'このほんをかいます。', translationFr: 'J achete ce livre.' },
    ],
    questions: [
      { prompt: 'Quel livre cherche le client ?', choices: ['un livre de kanji', 'un livre de cuisine', 'un journal francais'], answer: 'un livre de kanji', explanation: '漢字の本 signifie livre de kanji.' },
      { prompt: 'Le client achete-t-il le livre ?', choices: ['oui', 'non', 'il emprunte seulement'], answer: 'oui', explanation: '買います signifie acheter.' },
    ],
  },
  {
    id: 'story-late-train',
    title: 'Train en retard',
    level: 'N5',
    theme: 'Transport',
    goal: 'Comprendre un retard simple.',
    lines: [
      { speaker: 'Mina', japanese: '電車はまだ来ませんね。', kana: 'でんしゃはまだきませんね。', translationFr: 'Le train ne vient toujours pas.' },
      { speaker: 'Ren', japanese: 'はい、十分遅いです。', kana: 'はい、じゅっぷんおそいです。', translationFr: 'Oui, il a dix minutes de retard.' },
      { speaker: 'Mina', japanese: 'では、ここで待ちましょう。', kana: 'では、ここでまちましょう。', translationFr: 'Alors, attendons ici.' },
    ],
    questions: [
      { prompt: 'Qu est-ce qui est en retard ?', choices: ['le train', 'le professeur', 'le magasin'], answer: 'le train', explanation: '電車 indique le train.' },
      { prompt: 'De combien est le retard ?', choices: ['dix minutes', 'une heure', 'trois jours'], answer: 'dix minutes', explanation: '十分遅いです signifie dix minutes de retard.' },
    ],
  },
  {
    id: 'story-festival-night',
    title: 'Soir de fete',
    level: 'N5',
    theme: 'Sortie',
    goal: 'Comprendre une invitation en soiree.',
    lines: [
      { speaker: 'Ami A', japanese: '今夜、祭りへ行きますか。', kana: 'こんや、まつりへいきますか。', translationFr: 'Ce soir, vas-tu au festival ?' },
      { speaker: 'Ami B', japanese: 'はい。七時に友だちと行きます。', kana: 'はい。しちじにともだちといきます。', translationFr: 'Oui. J y vais a sept heures avec un ami.' },
      { speaker: 'Ami A', japanese: '私も行きたいです。', kana: 'わたしもいきたいです。', translationFr: 'Moi aussi je veux y aller.' },
    ],
    questions: [
      { prompt: 'Quand vont-ils au festival ?', choices: ['ce soir', 'demain matin', 'lundi midi'], answer: 'ce soir', explanation: '今夜 signifie ce soir.' },
      { prompt: 'A quelle heure ?', choices: ['sept heures', 'trois heures', 'neuf heures'], answer: 'sept heures', explanation: '七時 signifie sept heures.' },
    ],
  },
  {
    id: 'story-study-plan',
    title: 'Plan d etude',
    level: 'N5',
    theme: 'Revision',
    goal: 'Comprendre une organisation de travail.',
    lines: [
      { speaker: 'Coach', japanese: '今日は何を勉強しましたか。', kana: 'きょうはなにをべんきょうしましたか。', translationFr: 'Qu as-tu etudie aujourd hui ?' },
      { speaker: 'Eleve', japanese: 'かなを十と、言葉を五つ勉強しました。', kana: 'かなをじゅうと、ことばをいつつべんきょうしました。', translationFr: 'J ai etudie dix kana et cinq mots.' },
      { speaker: 'Coach', japanese: '明日は文法をしましょう。', kana: 'あしたはぶんぽうをしましょう。', translationFr: 'Demain, faisons de la grammaire.' },
    ],
    questions: [
      { prompt: 'Combien de kana ont ete etudies ?', choices: ['dix', 'cinq', 'trois'], answer: 'dix', explanation: 'かなを十 signifie dix kana.' },
      { prompt: 'Que fera l eleve demain ?', choices: ['de la grammaire', 'du sport', 'des courses'], answer: 'de la grammaire', explanation: '文法をしましょう propose de faire de la grammaire.' },
    ],
  },
  {
    id: 'story-teacher-question',
    title: 'Question au professeur',
    level: 'N5',
    theme: 'Classe',
    goal: 'Demander de repeter.',
    lines: [
      { speaker: 'Etudiant', japanese: '先生、もう一度お願いします。', kana: 'せんせい、もういちどおねがいします。', translationFr: 'Professeur, encore une fois s il vous plait.' },
      { speaker: 'Professeur', japanese: 'はい。ゆっくり言います。', kana: 'はい。ゆっくりいいます。', translationFr: 'Oui. Je vais le dire lentement.' },
      { speaker: 'Etudiant', japanese: 'ありがとうございます。わかりました。', kana: 'ありがとうございます。わかりました。', translationFr: 'Merci. J ai compris.' },
    ],
    questions: [
      { prompt: 'Que demande l etudiant ?', choices: ['repeter', 'sortir', 'acheter'], answer: 'repeter', explanation: 'もう一度お願いします signifie encore une fois, s il vous plait.' },
      { prompt: 'Comment le professeur va-t-il parler ?', choices: ['lentement', 'tres fort', 'en francais'], answer: 'lentement', explanation: 'ゆっくり signifie lentement.' },
    ],
  },
  {
    id: 'story-cinema-plan',
    title: 'Aller au cinema',
    level: 'N5',
    theme: 'Loisirs',
    goal: 'Comprendre une proposition de sortie.',
    lines: [
      { speaker: 'Ami A', japanese: '新しい映画を見ませんか。', kana: 'あたらしいえいがをみませんか。', translationFr: 'Tu ne veux pas voir un nouveau film ?' },
      { speaker: 'Ami B', japanese: 'いいですね。何時に始まりますか。', kana: 'いいですね。なんじにはじまりますか。', translationFr: 'Bonne idee. A quelle heure ca commence ?' },
      { speaker: 'Ami A', japanese: '六時に始まります。', kana: 'ろくじにはじまります。', translationFr: 'Ca commence a six heures.' },
    ],
    questions: [
      { prompt: 'Que vont-ils voir ?', choices: ['un nouveau film', 'un match', 'un test'], answer: 'un nouveau film', explanation: '新しい映画 signifie nouveau film.' },
      { prompt: 'A quelle heure ca commence ?', choices: ['six heures', 'huit heures', 'midi'], answer: 'six heures', explanation: '六時に始まります signifie commencer a six heures.' },
    ],
  },
  {
    id: 'story-gift-choice',
    title: 'Choisir un cadeau',
    level: 'N5',
    theme: 'Achats',
    goal: 'Comparer deux idees simples.',
    lines: [
      { speaker: 'Ami A', japanese: '母に何を買いますか。', kana: 'ははになにをかいますか。', translationFr: 'Qu achetes-tu pour ta mere ?' },
      { speaker: 'Ami B', japanese: '花か本を買いたいです。', kana: 'はなかほんをかいたいです。', translationFr: 'Je veux acheter des fleurs ou un livre.' },
      { speaker: 'Ami A', japanese: '本はいいと思います。', kana: 'ほんはいいとおもいます。', translationFr: 'Je pense qu un livre est bien.' },
    ],
    questions: [
      { prompt: 'Pour qui est le cadeau ?', choices: ['la mere', 'le professeur', 'un voisin'], answer: 'la mere', explanation: '母に signifie pour la mere.' },
      { prompt: 'Quelle idee est conseillee ?', choices: ['un livre', 'un train', 'de l eau'], answer: 'un livre', explanation: '本はいいと思います signifie je pense qu un livre est bien.' },
    ],
  },
  {
    id: 'story-pet-shop',
    title: 'Animalerie',
    level: 'N5',
    theme: 'Animaux',
    goal: 'Comprendre gout et animal.',
    lines: [
      { speaker: 'Client', japanese: 'この猫は小さいですね。', kana: 'このねこはちいさいですね。', translationFr: 'Ce chat est petit.' },
      { speaker: 'Vendeur', japanese: 'はい。とても元気です。', kana: 'はい。とてもげんきです。', translationFr: 'Oui. Il est tres energique.' },
      { speaker: 'Client', japanese: 'かわいいです。見てもいいですか。', kana: 'かわいいです。みてもいいですか。', translationFr: 'Il est mignon. Puis-je le regarder ?' },
    ],
    questions: [
      { prompt: 'Quel animal regarde le client ?', choices: ['un chat', 'un poisson', 'un chien'], answer: 'un chat', explanation: '猫 signifie chat.' },
      { prompt: 'Comment est l animal ?', choices: ['petit et energique', 'grand et vieux', 'cher et blanc'], answer: 'petit et energique', explanation: '小さい et 元気 indiquent petit et energique.' },
    ],
  },
  {
    id: 'story-washing-clothes',
    title: 'Lessive',
    level: 'N5',
    theme: 'Maison',
    goal: 'Comprendre une tache domestique.',
    lines: [
      { speaker: 'Mere', japanese: '白い服を洗ってください。', kana: 'しろいふくをあらってください。', translationFr: 'Lave les vetements blancs, s il te plait.' },
      { speaker: 'Enfant', japanese: 'この赤い服も洗いますか。', kana: 'このあかいふくもあらいますか。', translationFr: 'Je lave aussi ce vetement rouge ?' },
      { speaker: 'Mere', japanese: 'いいえ、それは後で洗います。', kana: 'いいえ、それはあとであらいます。', translationFr: 'Non, celui-la, on le lavera plus tard.' },
    ],
    questions: [
      { prompt: 'Quels vetements faut-il laver maintenant ?', choices: ['les blancs', 'les rouges', 'les noirs'], answer: 'les blancs', explanation: '白い服 signifie vetements blancs.' },
      { prompt: 'Quand laver le vetement rouge ?', choices: ['plus tard', 'maintenant', 'demain matin seulement'], answer: 'plus tard', explanation: '後で signifie plus tard.' },
    ],
  },
  {
    id: 'story-quiet-train',
    title: 'Dans le train',
    level: 'N5',
    theme: 'Transport',
    goal: 'Comprendre une consigne sociale.',
    lines: [
      { speaker: 'Passager', japanese: 'すみません。ここで電話をしてもいいですか。', kana: 'すみません。ここででんわをしてもいいですか。', translationFr: 'Excusez-moi. Puis-je telephoner ici ?' },
      { speaker: 'Employe', japanese: '電車の中では静かにしてください。', kana: 'でんしゃのなかではしずかにしてください。', translationFr: 'Dans le train, restez calme/silencieux.' },
      { speaker: 'Passager', japanese: 'わかりました。', kana: 'わかりました。', translationFr: 'Compris.' },
    ],
    questions: [
      { prompt: 'Ou sont-ils ?', choices: ['dans le train', 'a la banque', 'a la maison'], answer: 'dans le train', explanation: '電車の中 signifie dans le train.' },
      { prompt: 'Que demande l employe ?', choices: ['etre silencieux', 'manger', 'courir'], answer: 'etre silencieux', explanation: '静かにしてください demande de rester calme.' },
    ],
  },
  {
    id: 'story-school-lunch',
    title: 'Repas a l ecole',
    level: 'N5',
    theme: 'Ecole',
    goal: 'Comprendre menu et preference.',
    lines: [
      { speaker: 'Eleve A', japanese: '今日の昼ご飯は何ですか。', kana: 'きょうのひるごはんはなんですか。', translationFr: 'Quel est le dejeuner aujourd hui ?' },
      { speaker: 'Eleve B', japanese: 'ご飯と魚です。牛乳もあります。', kana: 'ごはんとさかなです。ぎゅうにゅうもあります。', translationFr: 'Du riz et du poisson. Il y a aussi du lait.' },
      { speaker: 'Eleve A', japanese: '魚は好きです。', kana: 'さかなはすきです。', translationFr: 'J aime le poisson.' },
    ],
    questions: [
      { prompt: 'Quel est le dejeuner ?', choices: ['riz et poisson', 'pain et the', 'viande seulement'], answer: 'riz et poisson', explanation: 'ご飯と魚 signifie riz et poisson.' },
      { prompt: 'Y a-t-il aussi du lait ?', choices: ['oui', 'non', 'on ne sait pas'], answer: 'oui', explanation: '牛乳もあります signifie il y a aussi du lait.' },
    ],
  },
  {
    id: 'story-temple-visit',
    title: 'Visite au temple',
    level: 'N5',
    theme: 'Culture',
    goal: 'Comprendre lieu, age et description.',
    lines: [
      { speaker: 'Guide', japanese: 'この寺はとても古いです。', kana: 'このてらはとてもふるいです。', translationFr: 'Ce temple est tres ancien.' },
      { speaker: 'Visiteur', japanese: '写真を撮りたいです。', kana: 'しゃしんをとりたいです。', translationFr: 'Je voudrais prendre une photo.' },
      { speaker: 'Guide', japanese: '外で撮ってください。', kana: 'そとでとってください。', translationFr: 'Prenez-la dehors, s il vous plait.' },
    ],
    questions: [
      { prompt: 'Comment est le temple ?', choices: ['tres ancien', 'nouveau', 'petit seulement'], answer: 'tres ancien', explanation: 'とても古い signifie tres ancien.' },
      { prompt: 'Ou faut-il prendre la photo ?', choices: ['dehors', 'dans le train', 'sous la chaise'], answer: 'dehors', explanation: '外で signifie dehors.' },
    ],
  },
  {
    id: 'story-daily-goal',
    title: 'Objectif du jour',
    level: 'N5',
    theme: 'Revision',
    goal: 'Comprendre un objectif d apprentissage.',
    lines: [
      { speaker: 'Coach', japanese: '今日の目標は三つあります。', kana: 'きょうのもくひょうはみっつあります。', translationFr: 'Il y a trois objectifs aujourd hui.' },
      { speaker: 'Eleve', japanese: 'かな、言葉、文法ですね。', kana: 'かな、ことば、ぶんぽうですね。', translationFr: 'Kana, vocabulaire et grammaire, c est ca.' },
      { speaker: 'Coach', japanese: 'はい。少しずつ続けましょう。', kana: 'はい。すこしずつつづけましょう。', translationFr: 'Oui. Continuons petit a petit.' },
    ],
    questions: [
      { prompt: 'Combien y a-t-il d objectifs ?', choices: ['trois', 'dix', 'un'], answer: 'trois', explanation: '三つあります signifie il y en a trois.' },
      { prompt: 'Quels domaines sont cites ?', choices: ['kana, vocabulaire, grammaire', 'sport, cinema, train', 'eau, poisson, viande'], answer: 'kana, vocabulaire, grammaire', explanation: 'かな、言葉、文法 liste les trois domaines.' },
    ],
  },
];

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
  difficulty: 1 | 2 | 3;
  estimatedMinutes: number;
  theme: string;
  japanese: string;
  kana: string;
  romaji: string;
  translationFr: string;
  grammarPoints: Array<{ pattern: string; explanation: string }>;
  questions: ImmersionQuestion[];
};

export const IMMERSION_TEXTS: ImmersionText[] = [
  {
    id: 'immersion-morning', title: 'Le matin', level: 'N5', difficulty: 1, estimatedMinutes: 2, theme: 'Routine',
    japanese: '朝、私は水を飲みます。それから学校へ行きます。',
    kana: 'あさ、わたしはみずをのみます。それからがっこうへいきます。',
    romaji: 'Asa, watashi wa mizu o nomimasu. Sorekara gakkou e ikimasu.',
    translationFr: "Le matin, je bois de l'eau. Ensuite, je vais à l'école.",
    grammarPoints: [
      { pattern: 'を', explanation: "Marque le complément direct de l'action." },
      { pattern: 'へ', explanation: "Indique la direction d'un déplacement." },
    ],
    questions: [
      { prompt: 'Que boit la personne ?', choices: ["de l'eau", 'du thé', 'du lait'], answer: "de l'eau", explanation: '水 signifie « eau ».' },
      { prompt: 'Où va la personne ?', choices: ["à l'école", 'à la gare', 'à la maison'], answer: "à l'école", explanation: '学校へ行きます signifie « aller à l’école ».' },
    ],
  },
  {
    id: 'immersion-shop', title: 'Au magasin', level: 'N5', difficulty: 1, estimatedMinutes: 2, theme: 'Achats',
    japanese: 'この店で新しい本を買います。本は五百円です。',
    kana: 'このみせであたらしいほんをかいます。ほんはごひゃくえんです。',
    romaji: 'Kono mise de atarashii hon o kaimasu. Hon wa gohyaku en desu.',
    translationFr: "Dans ce magasin, j'achète un nouveau livre. Le livre coûte 500 yens.",
    grammarPoints: [
      { pattern: 'この + nom', explanation: "Désigne quelque chose proche de la personne qui parle." },
      { pattern: 'で', explanation: "Indique ici le lieu où l'action se déroule." },
    ],
    questions: [
      { prompt: "Qu'achète la personne ?", choices: ['un livre', 'un billet', 'un poisson'], answer: 'un livre', explanation: '本 signifie « livre ».' },
      { prompt: 'Combien coûte le livre ?', choices: ['500 yens', '100 yens', '1 000 yens'], answer: '500 yens', explanation: '五百円 signifie « 500 yens ».' },
    ],
  },
  {
    id: 'immersion-station', title: 'À la gare', level: 'N5', difficulty: 1, estimatedMinutes: 2, theme: 'Transport',
    japanese: '駅で電車を待ちます。電車は八時に来ます。',
    kana: 'えきででんしゃをまちます。でんしゃははちじにきます。',
    romaji: 'Eki de densha o machimasu. Densha wa hachi-ji ni kimasu.',
    translationFr: "J'attends le train à la gare. Le train arrive à huit heures.",
    grammarPoints: [
      { pattern: 'に + heure', explanation: "Indique l'heure précise d'une action." },
      { pattern: 'を待ちます', explanation: "待ちます se construit avec を pour ce que l'on attend." },
    ],
    questions: [
      { prompt: "Qu'attend la personne ?", choices: ['le train', 'un ami', 'un taxi'], answer: 'le train', explanation: '電車 signifie « train ».' },
      { prompt: 'À quelle heure arrive-t-il ?', choices: ['huit heures', 'sept heures', 'neuf heures'], answer: 'huit heures', explanation: '八時 signifie « huit heures ».' },
    ],
  },
  {
    id: 'immersion-weather', title: 'La pluie', level: 'N5', difficulty: 1, estimatedMinutes: 3, theme: 'Météo',
    japanese: '今日は雨です。私は外へ行きません。家で日本語を勉強します。',
    kana: 'きょうはあめです。わたしはそとへいきません。いえでにほんごをべんきょうします。',
    romaji: 'Kyou wa ame desu. Watashi wa soto e ikimasen. Ie de nihongo o benkyou shimasu.',
    translationFr: "Aujourd'hui, il pleut. Je ne vais pas dehors. J'étudie le japonais à la maison.",
    grammarPoints: [
      { pattern: 'ません', explanation: "Forme polie négative d'un verbe." },
      { pattern: 'lieu + で', explanation: "Marque le lieu où l'on accomplit une action." },
    ],
    questions: [
      { prompt: 'Quel temps fait-il ?', choices: ['il pleut', 'il neige', 'il fait chaud'], answer: 'il pleut', explanation: '雨 signifie « pluie ».' },
      { prompt: 'Où la personne étudie-t-elle ?', choices: ['à la maison', "à l'école", 'dehors'], answer: 'à la maison', explanation: "家で indique le lieu de l'action." },
    ],
  },
  {
    id: 'immersion-room', title: 'Dans la chambre', level: 'N5', difficulty: 2, estimatedMinutes: 3, theme: 'Maison',
    japanese: '私の部屋に机と椅子があります。机の上に新しいペンがあります。',
    kana: 'わたしのへやにつくえといすがあります。つくえのうえにあたらしいペンがあります。',
    romaji: 'Watashi no heya ni tsukue to isu ga arimasu. Tsukue no ue ni atarashii pen ga arimasu.',
    translationFr: "Dans ma chambre, il y a un bureau et une chaise. Sur le bureau, il y a un nouveau stylo.",
    grammarPoints: [
      { pattern: 'に～があります', explanation: "Indique l'existence d'un objet dans un lieu." },
      { pattern: 'A の上', explanation: "Signifie « au-dessus de A » ou « sur A » selon le contexte." },
    ],
    questions: [
      { prompt: "Qu'y a-t-il dans la chambre ?", choices: ['un bureau et une chaise', 'une voiture et un train', "un poisson et de l'eau"], answer: 'un bureau et une chaise', explanation: '机と椅子 signifie « un bureau et une chaise ».' },
      { prompt: 'Où est le stylo ?', choices: ['sur le bureau', 'sous la chaise', 'dans le sac'], answer: 'sur le bureau', explanation: '机の上に signifie « sur le bureau ».' },
    ],
  },
  {
    id: 'immersion-friend', title: 'Avec un ami', level: 'N5', difficulty: 2, estimatedMinutes: 3, theme: 'Vie quotidienne',
    japanese: '日曜日、友達と映画を見ました。映画は少し長いですが、おもしろかったです。',
    kana: 'にちようび、ともだちとえいがをみました。えいがはすこしながいですが、おもしろかったです。',
    romaji: 'Nichiyoubi, tomodachi to eiga o mimashita. Eiga wa sukoshi nagai desu ga, omoshirokatta desu.',
    translationFr: "Dimanche, j'ai regardé un film avec un ami. Le film était un peu long, mais intéressant.",
    grammarPoints: [
      { pattern: 'ました', explanation: "Forme polie affirmative du passé." },
      { pattern: 'ですが', explanation: "Relie deux idées avec une opposition douce : « mais »" },
    ],
    questions: [
      { prompt: 'Quand se passe la scène ?', choices: ['dimanche', 'lundi', 'vendredi'], answer: 'dimanche', explanation: '日曜日 signifie « dimanche ».' },
      { prompt: 'Comment était le film ?', choices: ['un peu long mais intéressant', 'court et ennuyeux', 'cher et nouveau'], answer: 'un peu long mais intéressant', explanation: 'ですが marque ici une opposition douce.' },
    ],
  },
  {
    id: 'immersion-family-dinner', title: 'Repas en famille', level: 'N5', difficulty: 2, estimatedMinutes: 3, theme: 'Famille',
    japanese: '夜、家族とご飯を食べます。父はお茶を飲みます。母は魚が好きです。',
    kana: 'よる、かぞくとごはんをたべます。ちちはおちゃをのみます。はははさかながすきです。',
    romaji: 'Yoru, kazoku to gohan o tabemasu. Chichi wa ocha o nomimasu. Haha wa sakana ga suki desu.',
    translationFr: 'Le soir, je mange avec ma famille. Mon père boit du thé. Ma mère aime le poisson.',
    grammarPoints: [
      { pattern: 'personne + と', explanation: "Indique la personne avec laquelle on fait l'action." },
      { pattern: '～が好きです', explanation: "Construction courante pour exprimer ce que l'on aime." },
    ],
    questions: [
      { prompt: 'Avec qui la personne mange-t-elle ?', choices: ['sa famille', 'son professeur', 'un étudiant'], answer: 'sa famille', explanation: '家族と signifie « avec la famille ».' },
      { prompt: "Qu'aime la mère ?", choices: ['le poisson', 'le pain', 'le train'], answer: 'le poisson', explanation: '魚が好きです signifie « aimer le poisson ».' },
    ],
  },
  {
    id: 'immersion-library', title: 'À la bibliothèque', level: 'N5', difficulty: 2, estimatedMinutes: 4, theme: 'Étude',
    japanese: '図書館で日本語の本を読みます。本は少し難しいですが、とてもおもしろいです。',
    kana: 'としょかんでにほんごのほんをよみます。ほんはすこしむずかしいですが、とてもおもしろいです。',
    romaji: 'Toshokan de nihongo no hon o yomimasu. Hon wa sukoshi muzukashii desu ga, totemo omoshiroi desu.',
    translationFr: 'À la bibliothèque, je lis un livre de japonais. Le livre est un peu difficile, mais très intéressant.',
    grammarPoints: [
      { pattern: 'nom + の + nom', explanation: "Relie deux noms ; ici, « un livre de japonais »" },
      { pattern: 'とても', explanation: "Adverbe qui renforce un adjectif : « très »" },
    ],
    questions: [
      { prompt: 'Où la personne lit-elle ?', choices: ['à la bibliothèque', 'au magasin', 'à la gare'], answer: 'à la bibliothèque', explanation: "図書館で indique le lieu de l'action." },
      { prompt: 'Comment est le livre ?', choices: ['un peu difficile mais intéressant', 'facile et court', 'cher et ancien'], answer: 'un peu difficile mais intéressant', explanation: '難しいですが introduit une opposition.' },
    ],
  },
  {
    id: 'immersion-school-test', title: 'Le petit test', level: 'N5', difficulty: 3, estimatedMinutes: 4, theme: 'École',
    japanese: '今日は学校で小さいテストがあります。私は朝、漢字と文法を勉強しました。',
    kana: 'きょうはがっこうでちいさいテストがあります。わたしはあさ、かんじとぶんぽうをべんきょうしました。',
    romaji: 'Kyou wa gakkou de chiisai tesuto ga arimasu. Watashi wa asa, kanji to bunpou o benkyou shimashita.',
    translationFr: "Aujourd'hui, il y a un petit test à l'école. Le matin, j'ai étudié les kanji et la grammaire.",
    grammarPoints: [
      { pattern: 'があります', explanation: "Exprime ici qu'un événement prévu a lieu." },
      { pattern: 'しました', explanation: "Passé poli de します : « a fait »" },
    ],
    questions: [
      { prompt: "Qu'y a-t-il à l'école ?", choices: ['un petit test', 'un film', 'un repas'], answer: 'un petit test', explanation: '小さいテストがあります signifie « il y a un petit test ».' },
      { prompt: "Qu'a étudié la personne ?", choices: ['les kanji et la grammaire', 'le train et la gare', 'le poisson et le thé'], answer: 'les kanji et la grammaire', explanation: '漢字と文法 signifie « les kanji et la grammaire ».' },
    ],
  },
  {
    id: 'immersion-weekend-review', title: 'Révision du week-end', level: 'N5', difficulty: 3, estimatedMinutes: 4, theme: 'Révision',
    japanese: '土曜日に家で復習します。十の言葉を書きます。それから、短い文を読みます。',
    kana: 'どようびにいえでふくしゅうします。じゅうのことばをかきます。それから、みじかいぶんをよみます。',
    romaji: 'Doyoubi ni ie de fukushuu shimasu. Juu no kotoba o kakimasu. Sorekara, mijikai bun o yomimasu.',
    translationFr: "Samedi, je révise à la maison. J'écris dix mots. Ensuite, je lis des phrases courtes.",
    grammarPoints: [
      { pattern: 'jour + に', explanation: "Indique le jour où l'action se déroule." },
      { pattern: 'それから', explanation: "Connecteur chronologique : « ensuite »" },
    ],
    questions: [
      { prompt: 'Quand la personne révise-t-elle ?', choices: ['samedi', 'mercredi', 'lundi'], answer: 'samedi', explanation: '土曜日 signifie « samedi ».' },
      { prompt: 'Combien de mots écrit-elle ?', choices: ['dix', 'cinq', 'cent'], answer: 'dix', explanation: '十の言葉 signifie « dix mots ».' },
    ],
  },
  {
    id: 'immersion-breakfast', title: 'Le petit-déjeuner', level: 'N5', difficulty: 1, estimatedMinutes: 2, theme: 'Repas',
    japanese: '毎朝、パンと卵を食べます。コーヒーは飲みません。',
    kana: 'まいあさ、ぱんとたまごをたべます。こーひーはのみません。',
    romaji: 'Maiasa, pan to tamago o tabemasu. Koohii wa nomimasen.',
    translationFr: 'Chaque matin, je mange du pain et un œuf. Je ne bois pas de café.',
    grammarPoints: [{ pattern: 'A と B', explanation: 'と relie ici une liste complète.' }, { pattern: 'ません', explanation: 'Forme polie négative du verbe.' }],
    questions: [
      { prompt: 'Que mange la personne ?', choices: ['du pain et un œuf', 'du riz et du poisson', 'une pomme'], answer: 'du pain et un œuf', explanation: 'パンと卵 désigne le pain et l’œuf.' },
      { prompt: 'Que ne boit-elle pas ?', choices: ['du café', 'de l’eau', 'du thé'], answer: 'du café', explanation: 'コーヒーは飲みません signifie qu’elle ne boit pas de café.' },
    ],
  },
  {
    id: 'immersion-library-beginner', title: 'À la bibliothèque (débutant)', level: 'N5', difficulty: 1, estimatedMinutes: 2, theme: 'Étude',
    japanese: '図書館で日本語の本を読みます。図書館は静かです。',
    kana: 'としょかんでにほんごのほんをよみます。としょかんはしずかです。',
    romaji: 'Toshokan de nihongo no hon o yomimasu. Toshokan wa shizuka desu.',
    translationFr: 'Je lis un livre japonais à la bibliothèque. La bibliothèque est calme.',
    grammarPoints: [{ pattern: 'lieu + で', explanation: 'で indique le lieu de l’action.' }, { pattern: 'nom + の + nom', explanation: 'の relie et précise deux noms.' }],
    questions: [
      { prompt: 'Que lit la personne ?', choices: ['un livre japonais', 'un journal français', 'une lettre'], answer: 'un livre japonais', explanation: '日本語の本 signifie un livre en japonais.' },
      { prompt: 'Comment est la bibliothèque ?', choices: ['calme', 'bruyante', 'petite'], answer: 'calme', explanation: '静か signifie calme.' },
    ],
  },
  {
    id: 'immersion-friend-meeting', title: 'Rendez-vous avec un ami', level: 'N5', difficulty: 2, estimatedMinutes: 3, theme: 'Rencontre',
    japanese: '三時に駅で友達に会います。いっしょに映画を見ます。',
    kana: 'さんじにえきでともだちにあいます。いっしょにえいがをみます。',
    romaji: 'Sanji ni eki de tomodachi ni aimasu. Issho ni eiga o mimasu.',
    translationFr: 'À trois heures, je rencontre un ami à la gare. Nous regardons un film ensemble.',
    grammarPoints: [{ pattern: 'heure + に', explanation: 'に indique un moment précis.' }, { pattern: 'personne + に会う', explanation: 'La personne rencontrée est marquée par に.' }],
    questions: [
      { prompt: 'À quelle heure est le rendez-vous ?', choices: ['à trois heures', 'à deux heures', 'à cinq heures'], answer: 'à trois heures', explanation: '三時 signifie trois heures.' },
      { prompt: 'Que font les amis ?', choices: ['ils regardent un film', 'ils prennent le train', 'ils étudient'], answer: 'ils regardent un film', explanation: '映画を見ます signifie regarder un film.' },
    ],
  },
  {
    id: 'immersion-lost-item', title: 'Un objet perdu', level: 'N5', difficulty: 2, estimatedMinutes: 3, theme: 'Objets',
    japanese: 'かばんの中に鍵がありません。机の上を見ます。鍵は本の下にあります。',
    kana: 'かばんのなかにかぎがありません。つくえのうえをみます。かぎはほんのしたにあります。',
    romaji: 'Kaban no naka ni kagi ga arimasen. Tsukue no ue o mimasu. Kagi wa hon no shita ni arimasu.',
    translationFr: 'Il n’y a pas de clé dans le sac. Je regarde sur le bureau. La clé est sous le livre.',
    grammarPoints: [{ pattern: 'ありません', explanation: 'Négation polie de あります.' }, { pattern: 'lieu + にあります', explanation: 'Indique où se trouve un objet.' }],
    questions: [
      { prompt: 'Que cherche la personne ?', choices: ['une clé', 'un livre', 'un sac'], answer: 'une clé', explanation: '鍵 signifie clé.' },
      { prompt: 'Où est la clé ?', choices: ['sous le livre', 'dans le sac', 'sur le bureau'], answer: 'sous le livre', explanation: '本の下にあります signifie qu’elle est sous le livre.' },
    ],
  },
  {
    id: 'immersion-day-off', title: 'Un jour de repos', level: 'N5', difficulty: 2, estimatedMinutes: 3, theme: 'Loisirs',
    japanese: '日曜日は仕事をしません。朝は遅く起きて、午後は公園を散歩します。',
    kana: 'にちようびはしごとをしません。あさはおそくおきて、ごごはこうえんをさんぽします。',
    romaji: 'Nichiyoubi wa shigoto o shimasen. Asa wa osoku okite, gogo wa kouen o sanpo shimasu.',
    translationFr: 'Le dimanche, je ne travaille pas. Je me lève tard le matin et je me promène au parc l’après-midi.',
    grammarPoints: [{ pattern: 'forme en て', explanation: 'Relie deux actions dans leur ordre.' }, { pattern: 'を散歩します', explanation: 'を peut marquer l’espace parcouru.' }],
    questions: [
      { prompt: 'Quel jour la personne ne travaille-t-elle pas ?', choices: ['dimanche', 'samedi', 'lundi'], answer: 'dimanche', explanation: '日曜日 signifie dimanche.' },
      { prompt: 'Que fait-elle l’après-midi ?', choices: ['elle se promène au parc', 'elle travaille', 'elle va à l’école'], answer: 'elle se promène au parc', explanation: '公園を散歩します signifie se promener au parc.' },
    ],
  },
  {
    id: 'immersion-travel-plan', title: 'Projet de voyage', level: 'N5', difficulty: 3, estimatedMinutes: 4, theme: 'Voyage',
    japanese: '来月、家族と京都へ行きたいです。新幹線で行って、古いお寺を見ます。',
    kana: 'らいげつ、かぞくときょうとへいきたいです。しんかんせんでいって、ふるいおてらをみます。',
    romaji: 'Raigetsu, kazoku to Kyouto e ikitai desu. Shinkansen de itte, furui otera o mimasu.',
    translationFr: 'Le mois prochain, je veux aller à Kyoto avec ma famille. Nous irons en Shinkansen et visiterons un vieux temple.',
    grammarPoints: [{ pattern: 'base en ます + たい', explanation: 'Exprime ce que le locuteur veut faire.' }, { pattern: 'moyen + で', explanation: 'で indique ici le moyen de transport.' }],
    questions: [
      { prompt: 'Avec qui la personne veut-elle voyager ?', choices: ['avec sa famille', 'seule', 'avec son professeur'], answer: 'avec sa famille', explanation: '家族と signifie avec la famille.' },
      { prompt: 'Quel transport utilisera-t-elle ?', choices: ['le Shinkansen', 'le bus', 'l’avion'], answer: 'le Shinkansen', explanation: '新幹線で indique le moyen de transport.' },
    ],
  },
];

export type PhraseKitLine = { id: string; japanese: string; kana: string; french: string };
export type PhraseKit = {
  id: string;
  title: string;
  icon: string;
  objective: string;
  contextNote: string;
  phrases: PhraseKitLine[];
  dialogue: Array<{ speaker: string; phraseId: string }>;
  constructionPhraseId: string;
};

type PhraseTuple = [japanese: string, kana: string, french: string];

function kit(
  id: string,
  title: string,
  icon: string,
  objective: string,
  contextNote: string,
  phrases: PhraseTuple[],
  dialogue: Array<[speaker: string, phraseIndex: number]>,
  constructionIndex = 4
): PhraseKit {
  const lines = phrases.map(([japanese, kana, french], index) => ({ id: `${id}-${index + 1}`, japanese, kana, french }));
  return {
    id, title, icon, objective, contextNote, phrases: lines,
    dialogue: dialogue.map(([speaker, index]) => ({ speaker, phraseId: lines[index].id })),
    constructionPhraseId: lines[constructionIndex].id,
  };
}

export const PHRASE_KITS: PhraseKit[] = [
  kit('greetings', 'Salutations', '礼', 'Saluer et prendre congé dans une situation simple.', 'おはよう est familier ; おはようございます convient dans un contexte poli.', [
    ['おはようございます。', 'おはようございます。', 'Bonjour (le matin).'], ['こんにちは。', 'こんにちは。', 'Bonjour.'],
    ['こんばんは。', 'こんばんは。', 'Bonsoir.'], ['ありがとうございます。', 'ありがとうございます。', 'Merci beaucoup.'],
    ['すみません。', 'すみません。', 'Excusez-moi.'], ['はじめまして。', 'はじめまして。', 'Enchanté.'],
    ['よろしくお願いします。', 'よろしくおねがいします。', 'Je compte sur vous / enchanté.'], ['また明日。', 'またあした。', 'À demain.'],
  ], [['A', 0], ['B', 0], ['A', 7], ['B', 3]], 6),
  kit('introduction', 'Se présenter', '名', 'Dire son nom, son origine, sa profession et ses goûts.', 'Lors d’une première rencontre, terminez par よろしくお願いします。', [
    ['私はミナです。', 'わたしはミナです。', 'Je m’appelle Mina.'], ['フランス人です。', 'フランスじんです。', 'Je suis française.'],
    ['学生です。', 'がくせいです。', 'Je suis étudiante.'], ['日本語を勉強しています。', 'にほんごをべんきょうしています。', 'J’étudie le japonais.'],
    ['音楽が好きです。', 'おんがくがすきです。', 'J’aime la musique.'], ['二十五歳です。', 'にじゅうごさいです。', 'J’ai vingt-cinq ans.'],
    ['パリから来ました。', 'パリからきました。', 'Je viens de Paris.'], ['よろしくお願いします。', 'よろしくおねがいします。', 'Enchanté / je compte sur vous.'],
  ], [['Mina', 0], ['Mina', 1], ['Mina', 3], ['Mina', 7]], 4),
  kit('family', 'Famille', '家', 'Présenter les membres de sa famille et dire où ils vivent.', 'Pour parler de sa propre famille, はは et ちち sont les formes usuelles.', [
    ['家族は四人です。', 'かぞくはよにんです。', 'Nous sommes quatre dans ma famille.'], ['父は会社員です。', 'ちちはかいしゃいんです。', 'Mon père est employé.'],
    ['母は先生です。', 'はははせんせいです。', 'Ma mère est professeure.'], ['兄が一人います。', 'あにがひとりいます。', 'J’ai un grand frère.'],
    ['妹は学生です。', 'いもうとはがくせいです。', 'Ma petite sœur est étudiante.'], ['家族はリヨンに住んでいます。', 'かぞくはリヨンにすんでいます。', 'Ma famille habite à Lyon.'],
    ['これは家族の写真です。', 'これはかぞくのしゃしんです。', 'Voici une photo de ma famille.'], ['ご家族は何人ですか。', 'ごかぞくはなんにんですか。', 'Combien êtes-vous dans votre famille ?'],
  ], [['A', 7], ['B', 0], ['B', 6], ['A', 2]], 6),
  kit('restaurant', 'Restaurant', '食', 'Entrer, commander, demander un complément et payer.', 'Nom + をください permet de demander poliment une chose.', [
    ['二人です。', 'ふたりです。', 'Nous sommes deux.'], ['メニューをお願いします。', 'メニューをおねがいします。', 'Le menu, s’il vous plaît.'],
    ['水をください。', 'みずをください。', 'De l’eau, s’il vous plaît.'], ['これを一つください。', 'これをひとつください。', 'Un de ceci, s’il vous plaît.'],
    ['魚を食べます。', 'さかなをたべます。', 'Je prends du poisson.'], ['お茶もお願いします。', 'おちゃもおねがいします。', 'Du thé aussi, s’il vous plaît.'],
    ['おいしいです。', 'おいしいです。', 'C’est délicieux.'], ['お会計をお願いします。', 'おかいけいをおねがいします。', 'L’addition, s’il vous plaît.'],
  ], [['店員', 1], ['客', 2], ['客', 4], ['客', 7]], 3),
  kit('shopping', 'Faire des achats', '買', 'Demander un prix, une taille, une couleur et acheter.', 'この précède un nom ; これ s’emploie seul.', [
    ['これはいくらですか。', 'これはいくらですか。', 'Combien cela coûte-t-il ?'], ['このシャツを見せてください。', 'このシャツをみせてください。', 'Montrez-moi cette chemise.'],
    ['青いのがありますか。', 'あおいのがありますか。', 'En avez-vous un bleu ?'], ['大きいサイズがありますか。', 'おおきいサイズがありますか。', 'Avez-vous une grande taille ?'],
    ['これをください。', 'これをください。', 'Je prends ceci.'], ['カードで払います。', 'カードではらいます。', 'Je paie par carte.'],
    ['もう少し安いのがありますか。', 'もうすこしやすいのがありますか。', 'En avez-vous un peu moins cher ?'], ['袋をお願いします。', 'ふくろをおねがいします。', 'Un sac, s’il vous plaît.'],
  ], [['客', 0], ['店員', 2], ['客', 4], ['客', 5]], 4),
  kit('directions', 'Demander son chemin', '道', 'Demander où se trouve un lieu et comprendre une direction.', 'まっすぐ signifie tout droit ; 右 et 左 indiquent la direction.', [
    ['駅はどこですか。', 'えきはどこですか。', 'Où est la gare ?'], ['ここから近いですか。', 'ここからちかいですか。', 'Est-ce près d’ici ?'],
    ['まっすぐ行ってください。', 'まっすぐいってください。', 'Allez tout droit.'], ['右に曲がってください。', 'みぎにまがってください。', 'Tournez à droite.'],
    ['左に曲がってください。', 'ひだりにまがってください。', 'Tournez à gauche.'], ['銀行の隣です。', 'ぎんこうのとなりです。', 'C’est à côté de la banque.'],
    ['歩いて十分です。', 'あるいてじゅっぷんです。', 'C’est à dix minutes à pied.'], ['ありがとうございます。', 'ありがとうございます。', 'Merci beaucoup.'],
  ], [['A', 0], ['B', 2], ['B', 3], ['A', 7]], 2),
  kit('transport', 'Transports', '電', 'Acheter un billet et demander une ligne, un quai ou une heure.', 'で marque le moyen de transport ; まで la destination finale.', [
    ['東京まで一枚ください。', 'とうきょうまでいちまいください。', 'Un billet pour Tokyo, s’il vous plaît.'], ['いくらですか。', 'いくらですか。', 'Combien cela coûte-t-il ?'],
    ['何番線ですか。', 'なんばんせんですか。', 'Quel est le numéro du quai ?'], ['この電車は京都へ行きますか。', 'このでんしゃはきょうとへいきますか。', 'Ce train va-t-il à Kyoto ?'],
    ['次の電車は何時ですか。', 'つぎのでんしゃはなんじですか。', 'À quelle heure est le prochain train ?'], ['八時半に出ます。', 'はちじはんにでます。', 'Il part à huit heures et demie.'],
    ['大阪で乗り換えます。', 'おおさかでのりかえます。', 'Je change à Osaka.'], ['駅で待ちます。', 'えきでまちます。', 'J’attends à la gare.'],
  ], [['客', 0], ['駅員', 1], ['客', 2], ['駅員', 5]], 4),
  kit('hotel', 'Hôtel et voyage', '宿', 'Se présenter à l’hôtel, vérifier une réservation et les horaires.', '予約があります est la formule simple pour annoncer une réservation.', [
    ['予約があります。', 'よやくがあります。', 'J’ai une réservation.'], ['名前はミナです。', 'なまえはミナです。', 'Le nom est Mina.'],
    ['パスポートです。', 'パスポートです。', 'Voici mon passeport.'], ['部屋は何階ですか。', 'へやはなんがいですか。', 'À quel étage est la chambre ?'],
    ['朝ご飯は何時ですか。', 'あさごはんはなんじですか。', 'À quelle heure est le petit-déjeuner ?'], ['七時から十時までです。', 'しちじからじゅうじまでです。', 'C’est de sept à dix heures.'],
    ['ここに名前を書いてください。', 'ここになまえをかいてください。', 'Écrivez votre nom ici.'], ['ありがとうございます。', 'ありがとうございます。', 'Merci beaucoup.'],
  ], [['客', 0], ['係', 1], ['係', 6], ['客', 4], ['係', 5]], 4),
  kit('conversation', 'Conversation courte', '会', 'Échanger quelques phrases sur sa journée et ses goûts.', 'Les réponses courtes naturelles évitent de répéter tout le sujet.', [
    ['元気ですか。', 'げんきですか。', 'Comment allez-vous ?'], ['はい、元気です。', 'はい、げんきです。', 'Oui, je vais bien.'],
    ['今日は何をしますか。', 'きょうはなにをしますか。', 'Que faites-vous aujourd’hui ?'], ['友達に会います。', 'ともだちにあいます。', 'Je rencontre un ami.'],
    ['映画が好きですか。', 'えいががすきですか。', 'Aimez-vous les films ?'], ['はい、好きです。', 'はい、すきです。', 'Oui, j’aime ça.'],
    ['どんな映画が好きですか。', 'どんなえいががすきですか。', 'Quel genre de films aimez-vous ?'], ['日本の映画が好きです。', 'にほんのえいががすきです。', 'J’aime les films japonais.'],
  ], [['A', 0], ['B', 1], ['A', 2], ['B', 3], ['A', 4], ['B', 5]], 3),
  kit('emergency', 'Urgence simple', '助', 'Demander de l’aide, signaler une douleur et trouver un service.', 'En urgence, privilégiez une phrase courte, directe et polie.', [
    ['助けてください。', 'たすけてください。', 'Aidez-moi, s’il vous plaît.'], ['病院はどこですか。', 'びょういんはどこですか。', 'Où est l’hôpital ?'],
    ['頭が痛いです。', 'あたまがいたいです。', 'J’ai mal à la tête.'], ['気分が悪いです。', 'きぶんがわるいです。', 'Je ne me sens pas bien.'],
    ['日本語がよく分かりません。', 'にほんごがよくわかりません。', 'Je ne comprends pas bien le japonais.'], ['ゆっくり話してください。', 'ゆっくりはなしてください。', 'Parlez lentement, s’il vous plaît.'],
    ['警察を呼んでください。', 'けいさつをよんでください。', 'Appelez la police, s’il vous plaît.'], ['大丈夫です。', 'だいじょうぶです。', 'Ça va / tout va bien.'],
  ], [['A', 0], ['B', 7], ['A', 2], ['A', 5]], 4),
  kit('school-work', 'École et travail', '学', 'Comprendre des consignes simples et parler de son activité.', 'ください ajoute une demande polie à la forme en て.', [
    ['日本語を勉強します。', 'にほんごをべんきょうします。', 'J’étudie le japonais.'], ['会社で働いています。', 'かいしゃではたらいています。', 'Je travaille dans une entreprise.'],
    ['本を開いてください。', 'ほんをひらいてください。', 'Ouvrez le livre, s’il vous plaît.'], ['ここに書いてください。', 'ここにかいてください。', 'Écrivez ici, s’il vous plaît.'],
    ['もう一度お願いします。', 'もういちどおねがいします。', 'Encore une fois, s’il vous plaît.'], ['質問があります。', 'しつもんがあります。', 'J’ai une question.'],
    ['休みは土曜日です。', 'やすみはどようびです。', 'Mon jour de repos est samedi.'], ['九時から働きます。', 'くじからはたらきます。', 'Je travaille à partir de neuf heures.'],
  ], [['先生', 2], ['学生', 4], ['学生', 5], ['先生', 3]], 3),
  kit('appointment', 'Date, heure et rendez-vous', '時', 'Fixer une date, demander l’heure et confirmer un rendez-vous.', 'Une heure précise est généralement suivie de に.', [
    ['今日は何曜日ですか。', 'きょうはなんようびですか。', 'Quel jour sommes-nous ?'], ['木曜日です。', 'もくようびです。', 'Nous sommes jeudi.'],
    ['今、何時ですか。', 'いまなんじですか。', 'Quelle heure est-il ?'], ['三時半です。', 'さんじはんです。', 'Il est trois heures et demie.'],
    ['明日、会いませんか。', 'あしたあいませんか。', 'On se voit demain ?'], ['十時はどうですか。', 'じゅうじはどうですか。', 'Que pensez-vous de dix heures ?'],
    ['十時に駅で会いましょう。', 'じゅうじにえきであいましょう。', 'Retrouvons-nous à la gare à dix heures.'], ['分かりました。', 'わかりました。', 'D’accord / compris.'],
  ], [['A', 4], ['B', 5], ['A', 6], ['B', 7]], 6),
];

export function getPhraseKit(id: string): PhraseKit | undefined {
  return PHRASE_KITS.find((item) => item.id === id);
}

export const PHRASE_KIT_CONSTRUCTIONS: Record<string, string[]> = {
  greetings: ['よろしく', 'お願いします'],
  introduction: ['音楽が', '好きです'],
  family: ['これは', '家族の写真です'],
  restaurant: ['これを', '一つ', 'ください'],
  shopping: ['これを', 'ください'],
  directions: ['まっすぐ', '行って', 'ください'],
  transport: ['次の電車は', '何時ですか'],
  hotel: ['朝ご飯は', '何時ですか'],
  conversation: ['友達に', '会います'],
  emergency: ['日本語が', 'よく', '分かりません'],
  'school-work': ['ここに', '書いて', 'ください'],
  appointment: ['十時に', '駅で', '会いましょう'],
};

export type WritingPrompt = {
  id: string;
  title: string;
  promptFr: string;
  helper: string;
  exampleJa: string;
};

export const WRITING_PROMPTS: WritingPrompt[] = [
  { id: 'self-intro', title: 'Se presenter', promptFr: 'Ecris deux phrases pour te presenter.', helper: 'Nom, pays, niveau ou metier.', exampleJa: 'わたしは がくせい です。フランスじん です。' },
  { id: 'today', title: 'Aujourd hui', promptFr: 'Decris ta journee en deux phrases simples.', helper: 'Utilise きょう, です, ます.', exampleJa: 'きょうは いい てんき です。わたしは べんきょうします。' },
  { id: 'family', title: 'Famille', promptFr: 'Presente une personne de ta famille.', helper: 'Pere, mere, frere, soeur, age.', exampleJa: 'ははは やさしい です。まいにち はたらきます。' },
  { id: 'food', title: 'Manger', promptFr: 'Dis ce que tu aimes manger et boire.', helper: 'Utilise がすきです.', exampleJa: 'わたしは ごはん が すきです。みず を のみます。' },
  { id: 'school', title: 'Ecole', promptFr: 'Explique ce que tu etudies.', helper: 'Utilise を avec un objet.', exampleJa: 'にほんご を べんきょうします。ほん を よみます。' },
  { id: 'place', title: 'Lieu', promptFr: 'Dis ou tu vas et avec qui.', helper: 'Utilise に ou へ pour la destination.', exampleJa: 'ともだち と がっこう に いきます。' },
  { id: 'time', title: 'Heure', promptFr: 'Ecris une phrase avec une heure.', helper: 'Utilise に pour un moment precis.', exampleJa: 'しちじ に おきます。はちじ に いきます。' },
  { id: 'weekend', title: 'Week-end', promptFr: 'Raconte ce que tu fais le week-end.', helper: 'Utilise どようび ou にちようび.', exampleJa: 'にちようび に えいが を みます。' },
  { id: 'weather', title: 'Meteo', promptFr: 'Decris le temps et ton action.', helper: 'いいてんき, あめ, あつい, さむい.', exampleJa: 'きょうは あめ です。うちで ほん を よみます。' },
  { id: 'shopping', title: 'Magasin', promptFr: 'Dis ce que tu achetes.', helper: 'Utilise で pour le lieu de l action.', exampleJa: 'みせ で パン を かいます。' },
  { id: 'transport', title: 'Transport', promptFr: 'Explique comment tu te deplaces.', helper: 'Utilise で pour le moyen.', exampleJa: 'でんしゃ で がっこう に いきます。' },
  { id: 'friend', title: 'Ami', promptFr: 'Parle d un ami et d une activite.', helper: 'Utilise と pour accompagner.', exampleJa: 'ともだち と こうえん に いきます。' },
  { id: 'object', title: 'Objet', promptFr: 'Decris un objet que tu as.', helper: 'Utilise があります.', exampleJa: 'あたらしい ほん が あります。' },
  { id: 'past', title: 'Hier', promptFr: 'Ecris une phrase au passe.', helper: 'Utilise でした ou ました.', exampleJa: 'きのう にほんご を べんきょうしました。' },
  { id: 'negative', title: 'Negatif', promptFr: 'Ecris une phrase negative.', helper: 'Utilise ではありません ou ません.', exampleJa: 'きょうは がっこう に いきません。' },
  { id: 'question', title: 'Question', promptFr: 'Pose une question simple.', helper: 'Termine avec か.', exampleJa: 'これは あなたの ほん ですか。' },
  { id: 'adjective', title: 'Adjectif', promptFr: 'Utilise un adjectif pour decrire quelque chose.', helper: 'おおきい, ちいさい, あたらしい.', exampleJa: 'この くるま は あたらしい です。' },
  { id: 'want', title: 'Vouloir', promptFr: 'Dis ce que tu veux faire.', helper: 'Utilise たいです.', exampleJa: 'にほん に いきたいです。' },
  { id: 'place-exists', title: 'Il y a', promptFr: 'Dis ce qu il y a dans une piece ou un lieu.', helper: 'Utilise あります ou います.', exampleJa: 'へや に つくえ が あります。' },
  { id: 'routine', title: 'Routine', promptFr: 'Ecris deux actions de ta routine.', helper: 'Verbes en ます.', exampleJa: 'あさ ごはん を たべます。よる ねます。' },
  { id: 'country', title: 'Pays', promptFr: 'Parle d un pays ou d une ville.', helper: 'Utilise は et です.', exampleJa: 'にほん は きれいな くに です。' },
  { id: 'like-dislike', title: 'Aimer ou non', promptFr: 'Dis ce que tu aimes et ce que tu n aimes pas.', helper: 'Utilise がすきです / がすきではありません.', exampleJa: 'おちゃ が すきです。コーヒー が すきではありません。' },
  { id: 'reading', title: 'Lecture', promptFr: 'Ecris ce que tu lis.', helper: 'Utilise を よみます.', exampleJa: 'まいにち にほんご の ほん を よみます。' },
  { id: 'kanji-use', title: 'Kanji', promptFr: 'Ecris une phrase avec un kanji N5 que tu connais.', helper: 'Exemples : 日, 月, 人, 山, 水.', exampleJa: '日ようび に 山 へ いきます。' },
];

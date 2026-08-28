import type {
  GrammarExerciseKind,
  GrammarLesson,
  GrammarLessonExample,
  GrammarQuizQuestion,
  GrammarQuizSession,
} from '../models';
import { humanizeGrammarPattern } from './grammarCourse';
import { normalizeAnswer } from './text';

export const GRAMMAR_KEY_TOKENS = [
  'ではありませんでした',
  'ませんでした',
  'ではありません',
  'どうして',
  'どのくらい',
  '何曜日',
  '誰か',
  '何か',
  'どこか',
  '誰も',
  '何も',
  '何時',
  '何歳',
  '何人',
  '何本',
  'までに',
  'てから',
  'くなかった',
  'くない',
  'いつも',
  '時々',
  'あまり',
  '全然',
  'いくら',
  'いくつ',
  'どう',
  'なぜ',
  'だれ',
  '誰',
  'なに',
  '何',
  'どこ',
  'いつ',
  'どれ',
  'どの',
  'どちら',
  'ぐらい',
  'ごろ',
  'もう',
  'まだ',
  'すぐ',
  '一番',
  'ほうが',
  'たり',
  'ました',
  'ません',
  'ます',
  'から',
  'まで',
  'より',
  'は',
  'が',
  'を',
  'に',
  'で',
  'へ',
  'の',
  'も',
  'と',
  'や',
  'か',
  'です',
  'ない',
  'たい',
  'て',
  'た',
  'な',
  'い',
  'ね',
  'よ',
];

export function getGrammarKeyword(lesson: GrammarLesson, example?: GrammarLessonExample): string {
  const ruleText = `${lesson.title} ${lesson.pattern} ${lesson.formula}`;
  const sentenceText = `${example?.kana ?? ''} ${example?.kanji ?? ''}`;
  return (
    GRAMMAR_KEY_TOKENS.find((token) => ruleText.includes(token) && sentenceText.includes(token)) ??
    GRAMMAR_KEY_TOKENS.find((token) => ruleText.includes(token)) ??
    GRAMMAR_KEY_TOKENS.find((token) => sentenceText.includes(token)) ??
    lesson.pattern.split(/\s+/)[0] ??
    lesson.title
  );
}

export function buildGrammarUseCase(lesson: GrammarLesson): string {
  const base = `Cette règle sert à ${lesson.goal.charAt(0).toLowerCase()}${lesson.goal.slice(1)}`;
  if (lesson.folder.includes('Fondations')) {
    return `${base} Elle te donne la charpente de la phrase japonaise : qui, quoi, où, quand, puis l’information importante à la fin.`;
  }
  if (lesson.folder.includes('Verbes')) {
    return `${base} Elle permet de parler d’actions réelles : ce que tu fais, ne fais pas, as fait, veux faire ou demandes à quelqu’un de faire.`;
  }
  if (lesson.folder.includes('Temps')) {
    return `${base} Elle rend la phrase concrète : heure, date, quantité, fréquence ou durée. C’est très utile dans les questions JLPT.`;
  }
  if (lesson.folder.includes('Connecteurs')) {
    return `${base} Elle relie deux idées pour éviter les phrases isolées et comprendre la logique d’un petit texte.`;
  }
  if (lesson.folder.includes('Conversation')) {
    return `${base} Elle t’aide à comprendre le ton : poli, neutre, oral, écrit ou honorifique.`;
  }
  return `${base} Elle transforme une phrase simple en phrase utilisable dans une situation quotidienne.`;
}

export function humanizeGrammarFormula(lesson: GrammarLesson): string {
  return lesson.formula
    .replace(/\bA\b/g, '[première idée]')
    .replace(/\bB\b/g, '[deuxième idée]')
    .replace(/Sujet/g, '[personne ou chose dont on parle]')
    .replace(/Objet/g, '[chose touchée par l’action]')
    .replace(/Lieu/g, '[lieu]')
    .replace(/Temps/g, '[moment]')
    .replace(/Destination/g, '[direction ou arrivée]')
    .replace(/Nom/g, '[nom]')
    .replace(/Verbe/g, '[verbe]')
    .replace(/Phrase/g, '[phrase]');
}

export function explainGrammarSlots(lesson: GrammarLesson): string {
  const simple = humanizeGrammarPattern(lesson);
  if (simple.includes('[ce dont on parle]')) {
    return 'La première case sert à dire “on parle de quoi ?”. La deuxième case donne l’information. は est l’étiquette qui relie les deux.';
  }
  if (simple.includes('[chose touchée par l’action]')) {
    return 'La première case est la chose que l’action touche. Si je bois de l’eau, “eau” va dans cette case. Puis を annonce que l’action arrive.';
  }
  if (simple.includes('[moment / destination / cible]')) {
    return 'La première case pointe un endroit précis, une heure précise ou une personne cible. に fonctionne comme une punaise que tu plantes dans la phrase.';
  }
  if (simple.includes('[lieu de l’action / moyen]')) {
    return 'La première case dit le décor ou l’outil. で répond souvent à “où ça se passe ?” ou “avec quoi ?”.';
  }
  if (simple.includes('forme て')) {
    return 'La forme て est une main qui attrape une autre expression. Elle permet de demander, autoriser, interdire ou montrer une action en cours.';
  }
  if (simple.includes('forme た')) {
    return 'La forme た dit qu’une action est terminée. Ensuite, on peut l’utiliser pour dire “après avoir fait” ou “avoir déjà fait”.';
  }
  return `Lis la règle comme des cases à remplir : ${simple}. Tu ne mémorises pas des lettres, tu remplis des rôles.`;
}

export function buildGrammarWhy(lesson: GrammarLesson): string {
  const text = `${lesson.title} ${lesson.pattern} ${lesson.formula}`;
  if (/誰|何|どこ|いつ|どう|なぜ|いくら|いくつ|どのくらい/.test(text)) {
    return 'Le japonais garde la structure de la phrase normale. Le mot interrogatif remplace seulement l’information inconnue, et la particule qui le suit conserve son rôle dans la phrase.';
  }
  if (text.includes('から') && text.includes('まで')) {
    return 'から fixe l’origine et まで fixe la limite. Ils fonctionnent comme deux bornes : on sait précisément où ou quand la période commence et où ou quand elle se termine.';
  }
  if (text.includes('までに')) {
    return 'まで donne la limite. に transforme cette limite en point d’échéance : l’action doit être achevée avant d’atteindre ce moment.';
  }
  if (/いつも|時々|あまり|全然|fréquence/i.test(text)) {
    return 'L’adverbe indique à quelle fréquence l’action se produit. あまり et 全然 sont associés à la négation au niveau N5 parce qu’ils expriment une fréquence faible ou nulle.';
  }
  if (/godan|ichidan|irréguli|conjugaison|ます \/ ません/i.test(text)) {
    return 'La terminaison du verbe porte le temps, la négation et le niveau de politesse. Identifier le groupe permet de changer cette terminaison sans modifier le sens lexical du verbe.';
  }
  if (/adjectif|高い|静か/.test(text)) {
    return 'Les adjectifs en い portent directement leur conjugaison. Les adjectifs en な et les noms utilisent la copule. Cette différence explique pourquoi leurs négations et leurs passés ne se construisent pas pareil.';
  }
  if (/より|ほうが|一番|comparaison/i.test(text)) {
    return 'より pose la référence de comparaison, ほうが désigne le côté qui possède davantage la qualité, et 一番 sélectionne le degré le plus élevé dans un groupe.';
  }
  if (lesson.pattern.includes('は') || lesson.title.includes('は')) {
    return 'Le japonais aime d’abord annoncer le thème, puis dire quelque chose à propos de ce thème. は fonctionne comme une étiquette : “concernant ceci...”.';
  }
  if (lesson.pattern.includes('が') || lesson.title.includes('が')) {
    return 'が sert à pointer précisément l’élément qui fait l’action ou qui porte l’information nouvelle. C’est le projecteur grammatical.';
  }
  if (lesson.pattern.includes('を') || lesson.title.includes('を')) {
    return 'を indique l’objet touché par l’action. Si tu manges, bois, lis ou achètes quelque chose, を marque souvent cette chose.';
  }
  if (lesson.pattern.includes('で')) {
    return 'で encadre l’action : il peut dire où elle se passe ou avec quel moyen elle se fait. Le contexte donne le sens.';
  }
  if (lesson.pattern.includes('に')) {
    return 'に marque souvent un point précis : moment précis, destination, emplacement d’existence ou cible de l’action.';
  }
  if (lesson.pattern.includes('て')) {
    return 'La forme て est une forme de connexion. Elle colle le verbe à une autre idée : demande, permission, interdiction, action en cours.';
  }
  if (lesson.pattern.includes('ない')) {
    return 'La forme ない est la base négative courte. Beaucoup de structures japonaises utilisent cette base pour construire une interdiction, un conseil ou une obligation.';
  }
  if (lesson.pattern.includes('た')) {
    return 'La forme た vient du passé court, mais elle sert aussi à construire des idées comme “après avoir fait” ou “avoir déjà fait”.';
  }
  if (lesson.folder === 'Connecteurs') {
    return 'Le japonais relie les idées avec des marqueurs courts. Ces marqueurs disent si la deuxième phrase ajoute, oppose, explique ou résulte de la première.';
  }
  return `La logique centrale est : ${lesson.formula}. Une fois cette forme reconnue, tu peux remplacer les mots autour sans changer la structure.`;
}

export function buildGrammarSteps(lesson: GrammarLesson): string[] {
  const simplePattern = humanizeGrammarPattern(lesson);
  const firstExample = lesson.examples[0];
  const keyword = getGrammarKeyword(lesson, firstExample);
  return [
    `Décide d’abord ce que tu veux exprimer : ${lesson.goal.charAt(0).toLowerCase()}${lesson.goal.slice(1)}`,
    `Construis la phrase avec ce moule : ${simplePattern}.`,
    `Repère l’élément clé “${keyword}” et place-le exactement à l’endroit montré par le moule.`,
    firstExample
      ? `Teste le résultat avec ce modèle : ${firstExample.kanji || firstExample.kana} — ${firstExample.fr}`
      : `Vérifie enfin le piège principal : ${lesson.trap}`,
  ];
}

export function buildGrammarSituation(lesson: GrammarLesson): string {
  const first = lesson.examples[0];
  if (!first) return 'Imagine une conversation simple : tu dois choisir cette règle pour dire clairement ton intention.';
  const text = `${lesson.title} ${lesson.pattern} ${lesson.formula}`;
  if (text.includes('から') && text.includes('まで')) {
    return `Tu demandes les horaires d’une école ou tu décris un trajet. Le départ reçoit から et la limite reçoit まで : “${first.kanji}” signifie « ${first.fr} ».`;
  }
  if (text.includes('までに')) {
    return `Un professeur fixe une heure limite pour rendre un devoir. Tu utilises までに parce que l’action doit être terminée avant l’échéance : “${first.kanji}” — « ${first.fr} ».`;
  }
  if (/誰|何|どこ|いつ|どう|なぜ|いくら|いくつ|どのくらい/.test(text)) {
    return `Tu as une information précise à demander dans un magasin, une gare ou une conversation. Remplace seulement l’information inconnue par le bon mot interrogatif : “${first.kanji}” — « ${first.fr} ».`;
  }
  if (/いつも|時々|あまり|全然|fréquence/i.test(text)) {
    return `Un ami te demande quelles sont tes habitudes. Choisis l’adverbe selon la fréquence réelle, puis vérifie si le verbe doit être négatif : “${first.kanji}” — « ${first.fr} ».`;
  }
  if (/もう|まだ|すぐ|後で/.test(text)) {
    return `Quelqu’un te demande si une action est déjà terminée ou quand tu vas la faire. Utilise le marqueur temporel avant l’action : “${first.kanji}” — « ${first.fr} ».`;
  }
  if (/godan|ichidan|irréguli|conjugaison|forme て|ます \/ ません/i.test(text)) {
    return `Tu racontes ce que tu fais aujourd’hui, ce que tu n’as pas fait hier ou ce que tu demandes à quelqu’un. Choisis d’abord le groupe du verbe, puis sa terminaison : “${first.kanji}” — « ${first.fr} ».`;
  }
  if (/adjectif|高い|静か/.test(text)) {
    return `Tu décris un objet, un lieu ou une journée. Identifie si l’adjectif finit en い ou s’il utilise な, puis applique la bonne négation ou le bon passé : “${first.kanji}” — « ${first.fr} ».`;
  }
  if (/より|ほうが|一番|comparaison/i.test(text)) {
    return `Tu compares deux moyens de transport ou deux aliments. La référence va avec より et l’élément choisi avec ほうが : “${first.kanji}” — « ${first.fr} ».`;
  }
  if (/前に|後で|てから/.test(text)) {
    return `Tu expliques l’ordre de ta journée. Place l’action antérieure avec 前に, 後で ou てから selon le point de vue : “${first.kanji}” — « ${first.fr} ».`;
  }
  return `Tu dois produire cette intention dans une conversation quotidienne : « ${lesson.goal} » Utilise le modèle “${first.kanji || first.kana}”, qui signifie « ${first.fr} », puis remplace seulement les mots nécessaires.`;
}

export function buildGrammarMnemonic(lesson: GrammarLesson): string {
  const text = `${lesson.title} ${lesson.pattern} ${lesson.formula}`;
  if (text.includes('から') && text.includes('まで')) {
    return 'Imagine une course : から est la ligne de départ, まで est la ligne d’arrivée. La phrase avance toujours du départ vers la limite.';
  }
  if (text.includes('までに')) {
    return 'Le に de までに est une punaise sur l’heure limite : l’action doit être finie quand tu atteins cette punaise.';
  }
  if (/誰|何|どこ|いつ|どう|なぜ|いくら|いくつ|どのくらい/.test(text)) {
    return 'Le mot interrogatif est une case vide portant une étiquette : 誰 = personne, 何 = chose, どこ = lieu, いつ = moment, どう = manière.';
  }
  if (/いつも|時々|あまり|全然|fréquence/i.test(text)) {
    return 'Visualise une jauge : いつも est pleine, よく presque pleine, 時々 au milieu, あまり presque vide et 全然 vide. Les deux dernières vont avec la négation.';
  }
  if (/もう|まだ/.test(text)) {
    return 'もう franchit la ligne : c’est déjà fait. まだ reste avant la ligne : ce n’est pas encore fait.';
  }
  if (/ぐらい|ごろ/.test(text)) {
    return 'ごろ entoure un point sur l’horloge ; ぐらい entoure une quantité ou une durée approximative.';
  }
  if (/godan|groupe 1/i.test(text)) {
    return 'Le groupe 1 change de marche : son dernier kana se déplace pour construire ます, ない, て ou た. Pense à un escalier de sons.';
  }
  if (/ichidan|groupe 2/i.test(text)) {
    return 'Le groupe 2 est le groupe “coupe る” : retire る, puis accroche directement ます, ない, て ou た.';
  }
  if (/する \/ 来る|irréguli/i.test(text)) {
    return 'Deux verbes rebelles à connaître par cœur : する devient し…, et 来る alterne くる, き… et こ… selon la forme.';
  }
  if (/ます \/ ません \/ ました/.test(text)) {
    return 'Pense à un tableau de quatre cases : maintenant positif ます, maintenant négatif ません, passé positif ました, passé négatif ませんでした.';
  }
  if (/高い|adjectifs en い/i.test(text)) {
    return 'L’adjectif en い travaille tout seul : remplace son い par くない pour nier et par かった pour parler du passé.';
  }
  if (/静か|adjectifs en な/i.test(text)) {
    return 'L’adjectif en な a besoin d’un assistant : な devant un nom, puis です・ではありません・でした en fin de phrase.';
  }
  if (/前に|後で|てから/.test(text)) {
    return 'Dessine une ligne du temps : 前に regarde à gauche, 後で regarde à droite, てから pose d’abord une action puis fait avancer la suivante.';
  }
  if (/より|ほうが|一番/.test(text)) {
    return 'Imagine une balance : より reste du côté de la référence, ほうが montre le côté qui gagne, 一番 monte sur la première marche.';
  }
  if (/たり/.test(text)) {
    return 'たり est un panier d’exemples : tu y poses quelques actions possibles, sans dire que la liste est complète ni ordonnée.';
  }
  if (lesson.pattern.includes('は') || lesson.title.includes('は')) {
    return 'は = “wa, on parle de...” : le mot avant は devient le sujet de conversation.';
  }
  if (lesson.pattern.includes('が') || lesson.title.includes('が')) {
    return 'が = le projecteur : il éclaire précisément qui ou quoi fait l’action.';
  }
  if (lesson.pattern.includes('を') || lesson.title.includes('を')) {
    return 'を = objet touché : boire l’eau, lire le livre, acheter le pain.';
  }
  if (lesson.pattern.includes('で')) {
    return 'で = décor ou outil : où l’action se passe, ou avec quoi elle se fait.';
  }
  if (lesson.pattern.includes('に')) {
    return 'に = punaise sur une carte ou une horloge : point précis dans l’espace ou le temps.';
  }
  if (lesson.pattern.includes('て')) {
    return 'て = crochet : il accroche le verbe à une suite, comme “fais et puis...”.';
  }
  if (lesson.pattern.includes('たい')) {
    return 'たい ressemble à “j’ai envie de...” : accroche-le au radical du verbe.';
  }
  if (lesson.folder === 'Connecteurs') {
    return 'Connecteur = panneau de route : il annonce si l’idée continue, tourne, explique ou conclut.';
  }
  return `Mémo : garde en tête le moule “${lesson.formula}”, puis change seulement les mots.`;
}

export function buildGrammarExampleAnalysis(lesson: GrammarLesson, example: GrammarLessonExample): string {
  return `Structure utilisée : ${humanizeGrammarPattern(lesson)}. Dans “${example.romaji}”, chaque morceau remplit une case de cette règle.`;
}

export function buildGrammarExampleBreakdown(lesson: GrammarLesson, example: GrammarLessonExample): string {
  const pattern = humanizeGrammarPattern(lesson);
  if (pattern.includes('は')) {
    const parts = example.kanji.split('は');
    if (parts.length >= 2) return `Avant は : “${parts[0]}” = ce dont on parle. Après は : “${parts.slice(1).join('は')}” = l’information donnée.`;
  }
  if (pattern.includes('を')) {
    const parts = example.kanji.split('を');
    if (parts.length >= 2) return `Avant を : “${parts[0]}” = la chose touchée par l’action. Après を : “${parts.slice(1).join('を')}” = l’action.`;
  }
  if (pattern.includes('に')) {
    const parts = example.kanji.split('に');
    if (parts.length >= 2) return `Avant に : “${parts[0]}” = le point précis. Après に : “${parts.slice(1).join('に')}” = ce qui se passe.`;
  }
  if (pattern.includes('で')) {
    const parts = example.kanji.split('で');
    if (parts.length >= 2) return `Avant で : “${parts[0]}” = le lieu ou le moyen. Après で : “${parts.slice(1).join('で')}” = l’action.`;
  }
  if (pattern.includes('が')) {
    const parts = example.kanji.split('が');
    if (parts.length >= 2) return `Avant が : “${parts[0]}” = ce qu’on pointe précisément. Après が : “${parts.slice(1).join('が')}” = l’information sur cet élément.`;
  }
  return `Lis cette phrase avec les cases suivantes : ${pattern}. Essaie de retrouver quelle partie de la phrase remplit chaque case.`;
}

export function buildGrammarPracticePrompt(lesson: GrammarLesson): string {
  const first = lesson.examples[0];
  if (!first) return `Crée une phrase avec la formule : ${lesson.formula}.`;
  return `À toi : reprends la structure “${first.romaji}” et remplace une seule case. Change par exemple [lieu], [moment], [objet] ou [personne], puis vérifie que la règle reste : ${humanizeGrammarPattern(lesson)}.`;
}

export function getGrammarExerciseInstruction(kind: GrammarExerciseKind): string {
  if (kind === 'blank_choice') return 'Choisis l’élément qui complète correctement la phrase.';
  if (kind === 'blank_input') return 'Tape exactement l’élément manquant.';
  if (kind === 'translation_qcm') return 'Lis la phrase japonaise puis choisis le sens français.';
  if (kind === 'keyword_input') return 'Retrouve le marqueur clé de la règle.';
  if (kind === 'dialogue_response_qcm') return 'Choisis la réponse naturelle dans cette situation.';
  return 'Choisis la réponse qui convient dans la phrase.';
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getGrammarAnswerAliases(answer: string): string[] {
  const aliases: Record<string, string[]> = {
    は: ['wa', 'ha'],
    へ: ['e', 'he'],
    を: ['o', 'wo'],
    が: ['ga'],
    に: ['ni'],
    で: ['de'],
    の: ['no'],
    も: ['mo'],
    と: ['to'],
    や: ['ya'],
    か: ['ka'],
    から: ['kara'],
    まで: ['made'],
    より: ['yori'],
    て: ['te'],
    た: ['ta'],
    ない: ['nai'],
    たい: ['tai'],
    です: ['desu'],
    ます: ['masu'],
    ません: ['masen'],
    ね: ['ne'],
    よ: ['yo'],
  };
  return [answer, ...(aliases[answer] ?? [])].filter(Boolean);
}

export function hideGrammarAnswerInHint(text: string | undefined, answer: string, fallback: string): string {
  if (!text) return '';
  if (normalizeAnswer(text) === normalizeAnswer(answer)) return fallback;
  let next = text;
  getGrammarAnswerAliases(answer).forEach((alias) => {
    if (!alias) return;
    const pattern = /^[a-z]+$/i.test(alias)
      ? new RegExp(`\\b${escapeRegExp(alias)}\\b`, 'gi')
      : new RegExp(escapeRegExp(alias), 'g');
    next = next.replace(pattern, '___');
  });
  return normalizeAnswer(next).includes(normalizeAnswer(answer)) ? fallback : next;
}

export function buildGrammarQuickReminder(question: GrammarQuizQuestion): string {
  if (question.kind === 'dialogue_response_qcm') {
    return `Rappel : en situation quotidienne, on ne traduit pas mot à mot. On mémorise la paire complète : ${question.japanese ?? ''} → ${question.correctAnswer}.`;
  }
  if (question.kind === 'blank_choice' || question.kind === 'blank_input' || question.kind === 'keyword_input') {
    return `Rappel : l’élément clé ici est “${question.correctAnswer}”. ${explainGrammarSlots(question.lesson)}`;
  }
  if (question.kind === 'translation_qcm') {
    return `Rappel : lis d’abord la structure, puis le vocabulaire. Ici la règle visée est : ${humanizeGrammarPattern(question.lesson)}.`;
  }
  return `Rappel : ${humanizeGrammarPattern(question.lesson)}. ${question.lesson.trap}`;
}

export function buildGrammarContrastWhy(question: GrammarQuizQuestion): string {
  const lessonText = `${question.lesson.title} ${question.lesson.pattern} ${question.lesson.formula} ${question.japanese ?? ''}`;
  const answer = question.correctAnswer;
  const parts: string[] = [];
  const add = (text: string) => {
    if (parts.length < 5) parts.push(text);
  };
  const finish = () => parts.slice(0, 5).join(' ');

  if (question.kind === 'dialogue_response_qcm') {
    return [
      `C’est une formule sociale fixe.`,
      `L’indice est la situation : ${question.prompt.replace('Quelle est la meilleure réponse ? ', '')}`,
      `On ne traduit pas mot à mot.`,
      `On choisit la réponse naturelle : ${answer}.`,
    ].join(' ');
  }

  if (lessonText.includes('は') || answer === 'は') {
    add(`は pose le thème : “à propos de cela”.`);
    add(`Ici, on présente ou décrit quelque chose.`);
    add(`が serait plus fort pour identifier le sujet précis.`);
  }
  if (lessonText.includes('が') || answer === 'が') {
    add(`が marque l’élément qui porte l’état ou la réponse.`);
    add(`Ici, on identifie ce qui est aimé, compris, présent ou concerné.`);
    add(`は serait plutôt le thème général.`);
  }
  if (lessonText.includes('を') || answer === 'を') {
    add(`を marque l’objet direct.`);
    add(`Le mot avant を reçoit l’action du verbe.`);
    add(`で serait le lieu ou le moyen.`);
    add(`に serait plutôt une destination, une heure ou un point précis.`);
  }
  if (lessonText.includes('に') || answer === 'に') {
    add(`に marque un point précis.`);
    add(`Cela peut être une heure, une destination, une personne cible ou un lieu d’existence.`);
    add(`で serait le lieu où une action se déroule.`);
  }
  if (lessonText.includes('で') || answer === 'で') {
    add(`で marque le lieu de l’action.`);
    add(`Il peut aussi marquer le moyen utilisé.`);
    add(`に serait plutôt un point d’arrivée ou d’existence.`);
  }
  if (lessonText.includes('へ') || answer === 'へ') {
    add(`へ marque la direction.`);
    add(`On regarde vers où le mouvement va.`);
    add(`で ne convient pas car ce n’est pas le lieu de l’action.`);
  }
  if (lessonText.includes('の') || answer === 'の') {
    add(`の relie deux noms.`);
    add(`Il indique possession, appartenance ou précision.`);
    add(`は et が ne relient pas deux noms.`);
  }
  if (lessonText.includes('と') || answer === 'と') {
    add(`と signifie souvent “avec”.`);
    add(`Il sert aussi à faire une liste complète.`);
    add(`や donne une liste ouverte : “entre autres”.`);
  }
  if (lessonText.includes('から') || answer === 'から') {
    add(`から marque le départ, l’origine ou la cause.`);
    add(`C’est “depuis”, “à partir de” ou “parce que”.`);
    add(`まで marque plutôt la limite finale.`);
  }
  if (lessonText.includes('まで') || answer === 'まで') {
    add(`まで marque la limite finale.`);
    add(`C’est “jusqu’à”.`);
    add(`から marque plutôt le point de départ.`);
  }
  if (lessonText.includes('より') || answer === 'より') {
    add(`より sert à comparer.`);
    add(`Il marque le point de référence : “que”.`);
    add(`から n’exprime pas cette comparaison.`);
  }
  if (lessonText.includes('か') || answer === 'か') {
    add(`か transforme la phrase en question.`);
    add(`Il peut aussi marquer un choix.`);
    add(`ね cherche plutôt l’accord de l’autre.`);
  }
  if (lessonText.includes('てください') || answer === 'て') {
    add(`La forme en て connecte l’action à une autre idée.`);
    add(`Ici, elle sert à faire une demande ou une construction.`);
    add(`La forme dictionnaire ne ferait pas ce lien.`);
  }
  if (lessonText.includes('てもいい') || question.prompt.includes('permission')) {
    add(`てもいいですか demande une permission.`);
    add(`C’est “Puis-je... ?”.`);
    add(`てください demanderait à l’autre de faire l’action.`);
  }
  if (lessonText.includes('てはいけません') || question.japanese?.includes('いけません')) {
    add(`てはいけません exprime une interdiction.`);
    add(`C’est “il ne faut pas”.`);
    add(`てもいいです autorise, donc c’est l’inverse.`);
  }
  if (lessonText.includes('たい') || answer === 'たい') {
    add(`たい exprime l’envie de faire une action.`);
    add(`ます dit seulement que l’action se fait.`);
    add(`Ici, il y a une idée de désir.`);
  }
  if (lessonText.includes('ない') || answer === 'ない') {
    add(`ない sert à nier en forme simple.`);
    add(`ません est la négation polie.`);
    add(`Ici, la structure demande la forme simple.`);
  }
  if (lessonText.includes('た') || answer === 'た') {
    add(`た marque une action passée ou accomplie.`);
    add(`て sert plutôt à connecter.`);
    add(`Ici, l’action est vue comme terminée.`);
  }
  if (lessonText.includes('です') || answer === 'です') {
    add(`です termine poliment une phrase avec nom ou adjectif.`);
    add(`ます s’utilise avec un verbe.`);
    add(`Ici, on ne conjugue pas une action.`);
  }
  if (lessonText.includes('ます') || answer === 'ます') {
    add(`ます rend le verbe poli.`);
    add(`です ne conjugue pas les verbes d’action.`);
    add(`Ici, le mot principal est un verbe.`);
  }

  if (parts.length === 0) {
    return [
      `On applique cette règle car l’intention est : ${question.lesson.goal}`,
      `L’indice principal est la structure de la phrase.`,
      `Une autre règle changerait le sens.`,
      `La forme attendue est : ${humanizeGrammarPattern(question.lesson)}.`,
    ].join(' ');
  }

  return finish();
}

function getGrammarCorrectionSentence(question: GrammarQuizQuestion): string {
  const example = question.lesson.examples.find(
    (item) => item.kana === question.japanese || item.kanji === question.japanese || item.fr === question.french
  ) ?? question.lesson.examples[0];
  return (example?.kanji || example?.kana || question.japanese || '').replace(/___/g, question.correctAnswer);
}

function compactJapanesePhrase(value: string): string {
  return value.replace(/[。、！？,.!?「」『』（）()：:・…]/g, '').trim();
}

function findParticleContext(sentence: string, particle: string): { before: string; after: string } | null {
  const index = sentence.indexOf(particle);
  if (index <= 0) return null;
  const beforeRaw = compactJapanesePhrase(sentence.slice(0, index));
  const afterRaw = compactJapanesePhrase(sentence.slice(index + particle.length));
  const before = beforeRaw.slice(Math.max(0, beforeRaw.length - 8));
  const after = afterRaw.slice(0, 10);
  return { before, after };
}

function buildSimpleRoleAnalysis(question: GrammarQuizQuestion): string {
  const sentence = getGrammarCorrectionSentence(question);
  const roles: string[] = [];
  const addParticleRole = (particle: string, label: string, role: string) => {
    const context = findParticleContext(sentence, particle);
    if (!context) return;
    roles.push(`${context.before} ${label} : ${role}`);
  };

  addParticleRole('は', 'は', 'thème. C’est ce dont la phrase parle.');
  addParticleRole('が', 'が', 'sujet précis. C’est l’élément qui existe, agit, ou porte l’état.');
  addParticleRole('を', 'を', 'objet. C’est la chose touchée par l’action.');
  addParticleRole('で', 'で', 'lieu ou moyen. C’est là où l’action se passe, ou avec quoi elle se fait.');
  addParticleRole('に', 'に', 'point précis. C’est une heure, une destination, une cible, ou un lieu d’existence.');
  addParticleRole('へ', 'へ', 'direction. C’est l’endroit vers lequel on va.');
  addParticleRole('の', 'の', 'lien entre deux noms. Cela précise ou indique l’appartenance.');
  addParticleRole('と', 'と', 'accompagnement ou liste complète.');
  addParticleRole('から', 'から', 'origine, départ ou cause.');
  addParticleRole('まで', 'まで', 'limite finale, “jusqu’à”.');

  if (sentence.includes('です')) roles.push('です : termine poliment une phrase avec un nom ou un adjectif.');
  if (sentence.includes('ます')) roles.push('ます : rend le verbe poli.');
  if (sentence.includes('ください')) roles.push('ください : transforme l’action en demande polie.');
  if (sentence.includes('てもいい')) roles.push('てもいい : indique une permission.');
  if (sentence.includes('てはいけません')) roles.push('てはいけません : indique une interdiction.');

  return roles.slice(0, 4).join(' ');
}

function buildCaseSpecificGrammarWhy(question: GrammarQuizQuestion): string {
  const sentence = getGrammarCorrectionSentence(question);
  const answer = question.correctAnswer;
  const lessonText = `${question.lesson.title} ${question.lesson.pattern} ${question.lesson.formula} ${sentence}`;
  const uses = (token: string) => lessonText.includes(token) || answer === token;
  const contextFor = (particle: string) => findParticleContext(sentence, particle);

  if (question.kind === 'dialogue_response_qcm') {
    return `La phrase demande une réponse naturelle, pas une traduction mot à mot. La situation dit quoi répondre. Ici, “${answer}” est la formule attendue.`;
  }

  if (uses('で')) {
    const context = contextFor('で');
    const place = context?.before ?? 'ce mot';
    return `${place} est le lieu où l’action se passe. On utilise で pour le lieu d’une action. On n’utilise pas に ici, car に marque plutôt une destination, une heure précise ou un lieu d’existence.`;
  }
  if (uses('に')) {
    const context = contextFor('に');
    const target = context?.before ?? 'ce mot';
    return `${target} est un point précis. On utilise に pour viser une heure, une destination, une cible ou un lieu d’existence. On n’utilise pas で ici, car で décrit le lieu où l’on fait une action.`;
  }
  if (uses('へ')) {
    const context = contextFor('へ');
    const destination = context?.before ?? 'ce mot';
    return `${destination} est la direction du mouvement. On utilise へ avec aller, venir ou rentrer. On n’utilise pas で, car ce n’est pas le lieu où l’action se déroule.`;
  }
  if (uses('を')) {
    const context = contextFor('を');
    const object = context?.before ?? 'ce mot';
    return `${object} est la chose touchée par le verbe. On utilise を pour l’objet direct. On n’utilise pas で, car ce n’est pas un lieu ou un moyen.`;
  }
  if (uses('は')) {
    const context = contextFor('は');
    const topic = context?.before ?? 'ce mot';
    return `${topic} est le thème. On utilise は pour dire “à propos de ça”. On n’utilise pas が ici si on ne cherche pas à identifier un sujet nouveau ou précis.`;
  }
  if (uses('が')) {
    const context = contextFor('が');
    const subject = context?.before ?? 'ce mot';
    return `${subject} est l’élément précis de la phrase. On utilise が pour pointer le sujet ou la chose concernée. は serait plus général : il annoncerait seulement le thème.`;
  }
  if (uses('の')) {
    const context = contextFor('の');
    const first = context?.before ?? 'le premier nom';
    return `${first} précise le nom qui vient après. On utilise の pour relier deux noms. は ou が ne peuvent pas faire ce lien entre deux noms.`;
  }
  if (uses('と')) {
    const context = contextFor('と');
    const companion = context?.before ?? 'ce mot';
    return `${companion} est l’élément associé. と signifie souvent “avec” ou fait une liste complète. や serait une liste ouverte, comme “entre autres”.`;
  }
  if (uses('か')) {
    return `La phrase pose une question. か se met à la fin pour demander. ね demanderait plutôt confirmation, pas une vraie réponse.`;
  }
  if (uses('です')) {
    return `La phrase donne une information avec un nom ou un adjectif. です rend cette phrase polie. ます ne convient pas, car ます s’attache aux verbes d’action.`;
  }
  if (uses('ます')) {
    return `Le mot principal est un verbe. ます rend ce verbe poli. です ne convient pas, car です ne conjugue pas une action.`;
  }
  if (uses('てください')) {
    return `La phrase demande à quelqu’un de faire l’action. La forme て relie le verbe à ください. La forme dictionnaire seule ne ferait pas une demande polie.`;
  }
  if (uses('てもいい')) {
    return `La phrase demande ou donne une permission. てもいい signifie “on peut faire”. てはいけません serait l’inverse : “il ne faut pas”.`;
  }
  if (uses('てはいけません')) {
    return `La phrase interdit une action. てはいけません signifie “il ne faut pas”. てもいい ne convient pas, car cela autorise.`;
  }
  if (uses('たい')) {
    return `La phrase exprime une envie. たい s’attache au verbe pour dire “vouloir faire”. ます dirait seulement que l’action se fait.`;
  }
  if (uses('ない')) {
    return `La phrase est négative. ない sert de base négative simple. ません serait la négation polie, mais certaines structures demandent ない.`;
  }
  if (uses('た')) {
    return `L’action est vue comme terminée. た marque le passé ou l’accompli. て servirait plutôt à connecter avec une autre idée.`;
  }

  return `Ici, on applique cette règle parce que l’intention est : ${question.lesson.goal} La phrase suit le modèle : ${humanizeGrammarPattern(question.lesson)}.`;
}

export function buildGrammarCorrectionDetails(question: GrammarQuizQuestion): Array<{ title: string; text: string }> {
  const example = question.lesson.examples.find(
    (item) => item.kana === question.japanese || item.kanji === question.japanese || item.fr === question.french
  ) ?? question.lesson.examples[0];
  const translation = question.french ?? example?.fr ?? question.lesson.goal;
  const sentence = getGrammarCorrectionSentence(question);
  const roleAnalysis = buildSimpleRoleAnalysis(question);
  const appliedWhy = buildCaseSpecificGrammarWhy(question);
  return [
    {
      title: 'Traduction',
      text: translation,
    },
    {
      title: 'Phrase analysée',
      text: sentence,
    },
    {
      title: 'Rôle des mots',
      text: roleAnalysis || 'Regarde le mot avant la particule : c’est lui qui donne le rôle dans la phrase.',
    },
    {
      title: 'Pourquoi cette règle ici',
      text: appliedWhy,
    },
    {
      title: 'Erreur à éviter',
      text: question.lesson.trap,
    },
    {
      title: 'À retenir',
      text: buildGrammarMnemonic(question.lesson),
    },
  ];
}

export function getGrammarStreakMultiplier(streak: number): number {
  if (streak >= 10) return 5;
  if (streak >= 7) return 4;
  if (streak >= 5) return 3;
  if (streak >= 3) return 2;
  return 1;
}

export function createGrammarSession(questions: GrammarQuizQuestion[]): GrammarQuizSession {
  return {
    questions,
    currentIndex: 0,
    selected: null,
    correctCount: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    lives: 3,
    mistakes: [],
    finished: false,
  };
}

export function isGrammarAnswerCorrect(answer: string, correctAnswer: string): boolean {
  const expected = normalizeAnswer(correctAnswer);
  const submitted = normalizeAnswer(answer);
  const acceptedRomaji: Record<string, string[]> = {
    は: ['ha', 'wa'],
    へ: ['he', 'e'],
    を: ['wo', 'o'],
    が: ['ga'],
    に: ['ni'],
    で: ['de'],
    の: ['no'],
    も: ['mo'],
    と: ['to'],
    や: ['ya'],
    か: ['ka'],
    から: ['kara'],
    まで: ['made'],
    より: ['yori'],
    て: ['te'],
    た: ['ta'],
    ない: ['nai'],
    たい: ['tai'],
    です: ['desu'],
    ます: ['masu'],
    ません: ['masen'],
    ね: ['ne'],
    よ: ['yo'],
  };
  return submitted === expected || (acceptedRomaji[correctAnswer] ?? []).includes(submitted);
}

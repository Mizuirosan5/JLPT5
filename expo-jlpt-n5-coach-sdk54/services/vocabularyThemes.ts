import type { VocabularyItem } from '../models';
import { CORE_N5_FUNCTION_VOCABULARY } from '../data/n5CoreVocabulary';

export type VocabularyBrowseTheme = {
  id: string;
  label: string;
  icon: string;
  description: string;
  order: number;
};

export type VocabularyBrowseSubtheme = {
  id: string;
  label: string;
  description: string;
  order: number;
};

export const VOCABULARY_BROWSE_THEMES: VocabularyBrowseTheme[] = [
  { id: 'numbers', label: 'Nombres et compteurs', icon: '数', description: 'Compter, donner un prix, une heure ou une quantité.', order: 1 },
  { id: 'time', label: 'Temps et calendrier', icon: '時', description: 'Jours, mois, dates, heures et fréquence.', order: 2 },
  { id: 'function-words', label: 'Pronoms et questions', icon: '問', description: 'Se désigner, montrer, situer et demander une information.', order: 3 },
  { id: 'people', label: 'Personnes et famille', icon: '人', description: 'Famille, relations, métiers, pays et langues.', order: 4 },
  { id: 'food', label: 'Nourriture et boissons', icon: '食', description: 'Repas, aliments, boissons et restaurant.', order: 5 },
  { id: 'home', label: 'Maison et quotidien', icon: '家', description: 'Maison, routine et objets de tous les jours.', order: 6 },
  { id: 'school', label: 'École et étude', icon: '学', description: 'Classe, apprentissage, langue et matériel scolaire.', order: 7 },
  { id: 'travel', label: 'Lieux et déplacements', icon: '道', description: 'Villes, directions, transports et trajets.', order: 8 },
  { id: 'body', label: 'Corps et santé', icon: '体', description: 'Parties du corps, état physique et soins courants.', order: 9 },
  { id: 'nature', label: 'Nature et météo', icon: '天', description: 'Météo, saisons, animaux et environnement.', order: 10 },
  { id: 'shopping', label: 'Achats et argent', icon: '買', description: 'Magasins, prix, argent et achats simples.', order: 11 },
  { id: 'descriptions', label: 'Descriptions et émotions', icon: '色', description: 'Couleurs, tailles, qualités, goûts et sentiments.', order: 12 },
  { id: 'actions', label: 'Actions et verbes', icon: '動', description: 'Actions essentielles et activités du quotidien.', order: 13 },
  { id: 'leisure', label: 'Loisirs et culture', icon: '楽', description: 'Sports, musique, sorties, fêtes et centres d’intérêt.', order: 14 },
  { id: 'expressions', label: 'Expressions utiles', icon: '話', description: 'Salutations, réponses et formules de conversation.', order: 15 },
  { id: 'objects', label: 'Objets et technologie', icon: '物', description: 'Objets, vêtements, outils et appareils courants.', order: 16 },
  { id: 'general', label: 'Vocabulaire général', icon: '語', description: 'Autres mots indispensables du niveau N5.', order: 17 },
];

const THEMES_BY_ID = new Map(VOCABULARY_BROWSE_THEMES.map((theme) => [theme.id, theme]));
const CORE_FUNCTION_WORDS = new Set(
  CORE_N5_FUNCTION_VOCABULARY.flatMap((entry) => [entry.japanese, entry.kana]),
);

export function getVocabularyBrowseTheme(item: VocabularyItem): VocabularyBrowseTheme {
  const content = normalize(`${item.meaning_fr} ${item.japanese} ${item.kana ?? ''} ${item.kanji ?? ''}`);
  const source = normalize(`${item.theme ?? ''} ${item.category ?? ''} ${item.part_of_speech ?? ''}`);
  const reading = (item.kana || item.japanese || '').normalize('NFKC');

  if (CORE_FUNCTION_WORDS.has(item.japanese) || CORE_FUNCTION_WORDS.has(item.kana || '') || matches(source, /mots essentiels/)) return theme('function-words');
  if (matches(content, /nourriture|boisson|repas|petit dejeuner|dejeuner|diner|manger|boire|restaurant|aliment|riz|pain|viande|poisson|fruit|legume|pomme|orange|banane|oeuf|sel|sucre|the|cafe|lait|jus/)) return theme('food');
  if (matches(content, /famille|personne|pere|mere|frere|soeur|parent|enfant|ami|homme|femme|adulte|metier|monsieur|madame|pays|nationalite|langue|france|japon|chine|coree/)) return theme('people');
  if (matches(content, /corps|sante|maladie|douleur|medecin|hopital|tete|visage|main|pied|jambe|oeil|oreille|douche|bain/)) return theme('body');
  if (matches(content, /heure|jour|mois|annee|semaine|matin|soir|midi|minuit|minute|date|calendrier|hier|demain|aujourd|saison|janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre/)) return theme('time');
  if (matches(content, /compteur|quantite|ordinal|chiffre|combien|\bfois\b|\bzero\b|\bun\b|\bdeux\b|\btrois\b|\bquatre\b|\bcinq\b|\bsix\b|\bsept\b|\bhuit\b|\bneuf\b|\bdix\b|\bcent\b|\bmille\b/)) return theme('numbers');
  if (matches(content, /ecole|etude|etudier|education|classe|cours|professeur|enseignant|etudiant|eleve|livre|cahier|crayon|dictionnaire|kanji|hiragana|katakana|langue/)) return theme('school');
  if (matches(content, /lieu|direction|gare|train|voiture|velo|taxi|metro|route|chemin|voyage|ville|pays|parc|cinema|gauche|droite|nord|sud|est|ouest/)) return theme('travel');
  if (matches(content, /nature|meteo|pluie|neige|vent|ciel|montagne|riviere|mer|animal|plante|arbre|fleur/)) return theme('nature');
  if (matches(content, /argent|achat|magasin|prix|acheter|vendre|couter|yen/)) return theme('shopping');
  if (matches(content, /maison|menage|lessive|quotidien|routine|chambre|cuisine|toilettes|salle|porte|fenetre|jardin/)) return theme('home');
  if (matches(content, /couleur|rouge|bleu|blanc|noir|marron|adjectif|emotion|sentiment|grand|petit|chaud|froid|beau|joli|bon|mauvais|rapide|lent|fort|faible|leger|lourd|epais|fin|calme/)) return theme('descriptions');
  if (matches(content, /loisir|sport|football|tennis|natation|musique|cinema|film|photo|lecture|manga|jeu|fete|festival|concert|danse|voyage|promenade/)) return theme('leisure');
  if (matches(content, /objet|technologie|vetement|jupe|pull|chaussure|pantalon|outil|appareil|ordinateur|telephone|montre|horloge|cle|ticket|timbre|savon|carte|guitare/)) return theme('objects');
  if (matches(content, /bonjour|bonsoir|merci|pardon|excuse|bien sur|qui\b|quoi|quand|comment|quel|ou\b|ici|ceci|cela|ce genre|et puis|ensuite/)) return theme('expressions');
  if (/ます(?:た|ん(?:でした)?)?$/u.test(reading) || matches(source, /\bverbe\b|verbes actions/) || matches(content, /^(se |s'|etre |avoir |aller|venir|entrer|sortir|faire|prendre|donner|montrer|finir|ecrire|lire|ecouter|chanter|jouer|habiter|arriver|quitter|ouvrir|fermer|aimer)/)) return theme('actions');

  if (matches(source, /salutation|formule|expression|interjection|grammaire/)) return theme('expressions');
  if (matches(source, /objet|technologie|vetement/)) return theme('objects');
  if (matches(source, /adjectif|etat|emotion|couleur|description/)) return theme('descriptions');
  if (matches(source, /verbe|action/)) return theme('actions');
  return theme('general');
}

export function getVocabularyBrowseSubtheme(item: VocabularyItem, themeId: string): VocabularyBrowseSubtheme {
  const content = normalize(`${item.meaning_fr} ${item.japanese} ${item.kana ?? ''} ${item.kanji ?? ''}`);
  const source = normalize(`${item.theme ?? ''} ${item.category ?? ''} ${item.part_of_speech ?? ''}`);
  const text = `${content} ${source}`;

  switch (themeId) {
    case 'function-words':
      if (matches(text, /pronoms|pronom personnel/)) return subtheme('pronouns', 'Pronoms personnels', 'Dire je, tu, il, elle ou nous sans surutiliser les pronoms.', 1);
      if (matches(text, /demonstratif/)) return subtheme('demonstratives', 'Séries こ・そ・あ・ど', 'Montrer une chose, une personne ou un lieu selon la distance.', 2);
      if (matches(text, /questions|interrogatif/)) return subtheme('question-words', 'Mots interrogatifs', 'Demander qui, quoi, où, quand, comment ou combien.', 3);
      if (matches(text, /position/)) return subtheme('position', 'Position et repères', 'Situer précisément une chose dans l’espace.', 4);
      return subtheme('linking-words', 'Fréquence et liaison', 'Nuancer la fréquence et relier des idées simples.', 5);
    case 'numbers':
      if (matches(text, /compteur|fois|quantite|ordinal|age|etage|personne|objet long|objet plat/)) return subtheme('counters', 'Compteurs et quantités', 'Choisir le bon compteur selon ce que l’on compte.', 2);
      if (matches(text, /prix|argent|yen|couter|combien/)) return subtheme('prices', 'Prix et mesures', 'Donner un prix, une mesure ou une quantité.', 3);
      return subtheme('numbers', 'Nombres essentiels', 'Lire, reconnaître et employer les nombres.', 1);
    case 'time':
      if (matches(text, /heure|minute|midi|minuit|matin|soir/)) return subtheme('clock', 'Heures et moments', 'Dire l’heure et situer un moment de la journée.', 1);
      if (matches(text, /jour|semaine|mois|annee|date|janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre/)) return subtheme('calendar', 'Jours et calendrier', 'Parler des jours, des mois et des dates.', 2);
      return subtheme('frequency', 'Durée et fréquence', 'Exprimer avant, après, souvent ou pendant.', 3);
    case 'people':
      if (matches(text, /famille|pere|mere|frere|soeur|parent|enfant/)) return subtheme('family', 'Famille', 'Nommer les proches et les liens familiaux.', 1);
      if (matches(text, /metier|professeur|enseignant|medecin|etudiant|eleve/)) return subtheme('roles', 'Métiers et rôles', 'Présenter une activité ou un rôle social.', 2);
      if (matches(text, /pays|nationalite|langue|france|japon|chine|coree/)) return subtheme('countries-languages', 'Pays et langues', 'Dire son origine, sa nationalité et les langues parlées.', 3);
      return subtheme('relations', 'Personnes et relations', 'Parler des autres et des relations courantes.', 4);
    case 'food':
      if (matches(text, /boisson|boire|eau|the|cafe|lait|jus/)) return subtheme('drinks', 'Boissons', 'Commander et reconnaître les boissons courantes.', 2);
      if (matches(text, /restaurant|repas|petit dejeuner|dejeuner|diner/)) return subtheme('meals', 'Repas et restaurant', 'Manger, commander et parler d’un repas.', 3);
      return subtheme('food', 'Aliments', 'Reconnaître les aliments essentiels du quotidien.', 1);
    case 'home':
      if (matches(text, /chambre|cuisine|toilettes|salle|jardin|porte|fenetre/)) return subtheme('rooms', 'Pièces et espaces', 'Se repérer dans la maison.', 1);
      if (matches(text, /menage|lessive|routine|douche|bain/)) return subtheme('routine', 'Vie quotidienne', 'Décrire les gestes et habitudes à la maison.', 3);
      return subtheme('home-objects', 'Objets de la maison', 'Nommer les objets que l’on utilise chaque jour.', 2);
    case 'school':
      if (matches(text, /professeur|enseignant|etudiant|eleve|classe/)) return subtheme('school-people', 'Personnes et classe', 'Parler des personnes et des lieux d’étude.', 1);
      if (matches(text, /langue|kanji|hiragana|katakana|etudier|apprendre/)) return subtheme('learning', 'Langue et apprentissage', 'Dire ce que l’on apprend et comment on étudie.', 3);
      return subtheme('school-tools', 'Matériel scolaire', 'Reconnaître les objets utiles pour étudier.', 2);
    case 'travel':
      if (matches(text, /train|voiture|velo|taxi|metro|gare|transport/)) return subtheme('transport', 'Transports', 'Choisir et nommer les moyens de transport.', 1);
      if (matches(text, /gauche|droite|nord|sud|est|ouest|direction|chemin|route/)) return subtheme('directions', 'Directions et repères', 'Comprendre un itinéraire simple.', 2);
      return subtheme('places', 'Lieux et destinations', 'Nommer les lieux utiles et les destinations.', 3);
    case 'body':
      if (matches(text, /maladie|douleur|medecin|hopital|sante|soin/)) return subtheme('health', 'Santé et soins', 'Exprimer un état et comprendre les soins courants.', 2);
      return subtheme('body', 'Le corps', 'Nommer les principales parties du corps.', 1);
    case 'nature':
      if (matches(text, /pluie|neige|vent|ciel|meteo|saison/)) return subtheme('weather', 'Météo et saisons', 'Décrire le temps et les saisons.', 1);
      if (matches(text, /animal|poisson|oiseau|chien|chat/)) return subtheme('animals', 'Animaux', 'Reconnaître les animaux les plus courants.', 2);
      return subtheme('landscape', 'Paysages et plantes', 'Parler du monde naturel qui nous entoure.', 3);
    case 'shopping':
      if (matches(text, /argent|prix|yen|couter|cher|bon marche/)) return subtheme('money', 'Prix et argent', 'Comprendre et annoncer un prix.', 1);
      return subtheme('shopping', 'Magasins et achats', 'Demander, choisir, acheter ou vendre.', 2);
    case 'descriptions':
      if (matches(text, /couleur|rouge|bleu|blanc|noir|marron/)) return subtheme('colors', 'Couleurs', 'Décrire simplement la couleur d’une chose.', 1);
      if (matches(text, /emotion|sentiment|heureux|triste|peur|calme/)) return subtheme('feelings', 'Émotions et états', 'Exprimer une sensation ou un état.', 3);
      return subtheme('qualities', 'Qualités et apparence', 'Décrire la taille, l’aspect et les qualités.', 2);
    case 'actions':
      if (matches(text, /aller|venir|entrer|sortir|arriver|quitter|marcher|courir/)) return subtheme('movement', 'Mouvement', 'Décrire un déplacement ou un changement de lieu.', 1);
      if (matches(text, /parler|dire|demander|repondre|ecouter|lire|ecrire|montrer/)) return subtheme('communication', 'Communication', 'Comprendre et produire des actions de communication.', 2);
      return subtheme('daily-actions', 'Actions quotidiennes', 'Employer les verbes essentiels de tous les jours.', 3);
    case 'leisure':
      if (matches(text, /sport|football|tennis|natation|courir/)) return subtheme('sports', 'Sports', 'Parler des sports pratiqués ou regardés.', 1);
      if (matches(text, /musique|concert|chanter|danse/)) return subtheme('music', 'Musique et arts', 'Parler de musique, d’art et de pratiques créatives.', 2);
      if (matches(text, /fete|festival|evenement/)) return subtheme('events', 'Fêtes et événements', 'Comprendre et décrire une sortie ou une fête.', 4);
      return subtheme('hobbies', 'Loisirs et sorties', 'Présenter ses goûts et ses activités pendant le temps libre.', 3);
    case 'expressions':
      if (matches(text, /bonjour|bonsoir|merci|pardon|excuse|salut/)) return subtheme('greetings', 'Saluer et remercier', 'Utiliser les formules sociales essentielles.', 1);
      if (matches(text, /qui\b|quoi|quand|comment|quel|combien|pourquoi/)) return subtheme('question-words', 'Mots interrogatifs', 'Poser une question simple et précise.', 2);
      return subtheme('conversation', 'Conversation courante', 'Réagir et enchaîner dans un échange bref.', 3);
    case 'objects':
      if (matches(text, /vetement|jupe|pull|chaussure|pantalon/)) return subtheme('clothes', 'Vêtements', 'Nommer les vêtements du quotidien.', 1);
      if (matches(text, /ordinateur|telephone|appareil|technologie|electricite/)) return subtheme('technology', 'Appareils et technologie', 'Reconnaître les appareils les plus utiles.', 2);
      return subtheme('objects', 'Objets courants', 'Nommer les objets rencontrés chaque jour.', 3);
    default:
      if (matches(source, /verbe|action/)) return subtheme('extra-verbs', 'Verbes complémentaires', 'Élargir progressivement les actions que l’on sait exprimer.', 1);
      if (matches(source, /adjectif|etat|emotion/)) return subtheme('extra-descriptions', 'États et descriptions', 'Nuancer une description simple.', 2);
      if (matches(source, /grammaire|expression|interjection/) || matches(text, /adverbe|liaison|particule/)) return subtheme('tool-words', 'Mots outils', 'Relier, préciser et nuancer une phrase.', 3);
      if (!/[\u4E00-\u9FFF]/u.test(item.kanji || item.japanese || '')) return subtheme('kana-words', 'Mots usuels en kana', 'Mémoriser les mots généralement écrits en kana.', 4);
      return subtheme('kanji-words', 'Mots usuels avec kanji', 'Reconnaître les mots fréquents écrits avec des kanji.', 5);
  }
}

const KANJI_MEMORY_HINTS: Record<string, string> = {
  一: 'un trait', 二: 'deux traits', 三: 'trois traits', 人: 'une personne', 日: 'le soleil ou le jour',
  月: 'la lune ou le mois', 火: 'le feu', 水: 'l’eau', 木: 'un arbre', 金: 'l’or ou l’argent', 土: 'la terre',
  山: 'une montagne', 川: 'une rivière', 田: 'un champ', 口: 'une bouche', 目: 'un œil', 耳: 'une oreille',
  手: 'une main', 足: 'un pied', 上: 'le haut', 下: 'le bas', 中: 'le milieu', 大: 'grand', 小: 'petit',
  本: 'l’origine ou un livre', 学: 'apprendre', 校: 'l’école', 先: 'avant', 生: 'la vie ou naître',
  友: 'un ami', 父: 'le père', 母: 'la mère', 子: 'un enfant', 女: 'une femme', 男: 'un homme',
  食: 'manger', 飲: 'boire', 見: 'voir', 聞: 'écouter', 話: 'parler', 読: 'lire', 書: 'écrire',
  行: 'aller', 来: 'venir', 入: 'entrer', 出: 'sortir', 休: 'se reposer', 買: 'acheter',
  車: 'un véhicule', 電: 'l’électricité', 駅: 'une gare', 道: 'un chemin', 時: 'le temps ou l’heure',
  年: 'une année', 今: 'maintenant', 前: 'avant ou devant', 後: 'après ou derrière',
  東: 'l’est', 西: 'l’ouest', 南: 'le sud', 北: 'le nord', 白: 'blanc', 赤: 'rouge', 青: 'bleu',
};

export function getVocabularyMnemonic(item: VocabularyItem): string {
  const written = (item.kanji || item.japanese || item.kana || '').trim();
  const reading = (item.kana || item.japanese || '').trim();
  const meaning = item.meaning_fr.split(/[;,]/u)[0].trim().toLowerCase();
  const concepts = Array.from(written)
    .map((character) => KANJI_MEMORY_HINTS[character])
    .filter((concept): concept is string => !!concept)
    .filter((concept, index, list) => list.indexOf(concept) === index)
    .slice(0, 3);

  if (concepts.length) {
    return `Image mentale : ${concepts.join(' + ')}. Relie cette scène à « ${meaning} » et prononce ${reading}.`;
  }
  return `Image mentale : vois « ${meaning} » dans l’illustration, puis colle-lui le son japonais ${reading}.`;
}

function theme(id: string): VocabularyBrowseTheme {
  return THEMES_BY_ID.get(id) ?? VOCABULARY_BROWSE_THEMES[VOCABULARY_BROWSE_THEMES.length - 1];
}

function subtheme(id: string, label: string, description: string, order: number): VocabularyBrowseSubtheme {
  return { id, label, description, order };
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function matches(value: string, pattern: RegExp): boolean {
  return pattern.test(value);
}

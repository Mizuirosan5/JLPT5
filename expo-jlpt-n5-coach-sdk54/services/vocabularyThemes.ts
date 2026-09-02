import type { VocabularyItem } from '../models';

export type VocabularyBrowseTheme = {
  id: string;
  label: string;
  icon: string;
  description: string;
  order: number;
};

export const VOCABULARY_BROWSE_THEMES: VocabularyBrowseTheme[] = [
  { id: 'numbers', label: 'Nombres et compteurs', icon: '数', description: 'Compter, donner un prix, une heure ou une quantité.', order: 1 },
  { id: 'time', label: 'Temps et calendrier', icon: '時', description: 'Jours, mois, dates, heures et fréquence.', order: 2 },
  { id: 'people', label: 'Personnes et famille', icon: '人', description: 'Famille, relations, métiers et présentation.', order: 3 },
  { id: 'food', label: 'Nourriture et boissons', icon: '食', description: 'Repas, aliments, boissons et restaurant.', order: 4 },
  { id: 'home', label: 'Maison et quotidien', icon: '家', description: 'Maison, routine et objets de tous les jours.', order: 5 },
  { id: 'school', label: 'École et étude', icon: '学', description: 'Classe, apprentissage, langue et matériel scolaire.', order: 6 },
  { id: 'travel', label: 'Lieux et déplacements', icon: '道', description: 'Villes, directions, transports et trajets.', order: 7 },
  { id: 'body', label: 'Corps et santé', icon: '体', description: 'Parties du corps, état physique et soins courants.', order: 8 },
  { id: 'nature', label: 'Nature et météo', icon: '天', description: 'Météo, saisons, animaux et environnement.', order: 9 },
  { id: 'shopping', label: 'Achats et argent', icon: '買', description: 'Magasins, prix, argent et achats simples.', order: 10 },
  { id: 'descriptions', label: 'Descriptions et émotions', icon: '色', description: 'Couleurs, tailles, qualités, goûts et sentiments.', order: 11 },
  { id: 'actions', label: 'Actions et verbes', icon: '動', description: 'Actions essentielles et activités du quotidien.', order: 12 },
  { id: 'expressions', label: 'Expressions utiles', icon: '話', description: 'Salutations, réponses et formules de conversation.', order: 13 },
  { id: 'objects', label: 'Objets et technologie', icon: '物', description: 'Objets, vêtements, outils et appareils courants.', order: 14 },
  { id: 'general', label: 'Vocabulaire général', icon: '語', description: 'Autres mots indispensables du niveau N5.', order: 15 },
];

const THEMES_BY_ID = new Map(VOCABULARY_BROWSE_THEMES.map((theme) => [theme.id, theme]));

export function getVocabularyBrowseTheme(item: VocabularyItem): VocabularyBrowseTheme {
  const content = normalize(`${item.meaning_fr} ${item.japanese} ${item.kana ?? ''} ${item.kanji ?? ''}`);
  const source = normalize(`${item.theme ?? ''} ${item.category ?? ''} ${item.part_of_speech ?? ''}`);
  const reading = (item.kana || item.japanese || '').normalize('NFKC');

  if (matches(content, /nourriture|boisson|repas|petit dejeuner|dejeuner|diner|manger|boire|restaurant|aliment|riz|pain|viande|poisson|fruit|legume|pomme|orange|banane|oeuf|sel|sucre|the|cafe|lait|jus/)) return theme('food');
  if (matches(content, /famille|personne|pere|mere|frere|soeur|parent|enfant|ami|homme|femme|adulte|metier|monsieur|madame/)) return theme('people');
  if (matches(content, /corps|sante|maladie|douleur|medecin|hopital|tete|visage|main|pied|jambe|oeil|oreille|douche|bain/)) return theme('body');
  if (matches(content, /heure|jour|mois|annee|semaine|matin|soir|midi|minuit|minute|date|calendrier|hier|demain|aujourd|saison|janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre/)) return theme('time');
  if (matches(content, /compteur|quantite|ordinal|chiffre|combien|\bfois\b|\bzero\b|\bun\b|\bdeux\b|\btrois\b|\bquatre\b|\bcinq\b|\bsix\b|\bsept\b|\bhuit\b|\bneuf\b|\bdix\b|\bcent\b|\bmille\b/)) return theme('numbers');
  if (matches(content, /ecole|etude|etudier|education|classe|cours|professeur|enseignant|etudiant|eleve|livre|cahier|crayon|dictionnaire|kanji|hiragana|katakana|langue/)) return theme('school');
  if (matches(content, /lieu|direction|gare|train|voiture|velo|taxi|metro|route|chemin|voyage|ville|pays|parc|cinema|gauche|droite|nord|sud|est|ouest/)) return theme('travel');
  if (matches(content, /nature|meteo|pluie|neige|vent|ciel|montagne|riviere|mer|animal|plante|arbre|fleur/)) return theme('nature');
  if (matches(content, /argent|achat|magasin|prix|acheter|vendre|couter|yen/)) return theme('shopping');
  if (matches(content, /maison|menage|lessive|quotidien|routine|chambre|cuisine|toilettes|salle|porte|fenetre|jardin/)) return theme('home');
  if (matches(content, /couleur|rouge|bleu|blanc|noir|marron|adjectif|emotion|sentiment|grand|petit|chaud|froid|beau|joli|bon|mauvais|rapide|lent|fort|faible|leger|lourd|epais|fin|calme/)) return theme('descriptions');
  if (matches(content, /objet|technologie|vetement|jupe|pull|chaussure|pantalon|outil|appareil|ordinateur|telephone|montre|horloge|cle|ticket|timbre|savon|carte|guitare/)) return theme('objects');
  if (matches(content, /bonjour|bonsoir|merci|pardon|excuse|bien sur|qui\b|quoi|quand|comment|quel|ou\b|ici|ceci|cela|ce genre|et puis|ensuite/)) return theme('expressions');
  if (/ます(?:た|ん(?:でした)?)?$/u.test(reading) || matches(source, /\bverbe\b|verbes actions/) || matches(content, /^(se |s'|etre |avoir |aller|venir|entrer|sortir|faire|prendre|donner|montrer|finir|ecrire|lire|ecouter|chanter|jouer|habiter|arriver|quitter|ouvrir|fermer|aimer)/)) return theme('actions');

  if (matches(source, /salutation|formule|expression|interjection|grammaire/)) return theme('expressions');
  if (matches(source, /objet|technologie|vetement/)) return theme('objects');
  if (matches(source, /adjectif|etat|emotion|couleur|description/)) return theme('descriptions');
  if (matches(source, /verbe|action/)) return theme('actions');
  return theme('general');
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

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function matches(value: string, pattern: RegExp): boolean {
  return pattern.test(value);
}

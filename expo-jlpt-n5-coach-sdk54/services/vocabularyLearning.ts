import type { VocabularyItem } from '../models';
import { CURATED_VOCABULARY_EXAMPLES, type CuratedVocabularyExample } from '../data/vocabularyLearningExamples';

export type VocabularyAttribute = { id: string; label: string; explanation: string };
export type VocabularyLearningMeta = {
  partOfSpeech: string;
  dictionaryForm: string;
  attributes: VocabularyAttribute[];
  example: CuratedVocabularyExample | null;
};

export function normalizeVocabularyKey(value: string): string {
  return value.normalize('NFKC').trim().replace(/[・\s]/gu, '').replace(/ます$/u, 'る');
}

export function getVocabularyLearningMeta(item: VocabularyItem): VocabularyLearningMeta {
  const reading = normalizeVocabularyKey(item.kana || item.japanese);
  const meaning = item.meaning_fr.toLowerCase();
  const isIAdjective = /い$/u.test(reading) && !/(きれい|ゆうめい|きらい)$/u.test(reading) && !/dire|aller|venir/u.test(meaning);
  const isNaAdjective = /(きれい|しずか|げんき|ゆうめい|すき|きらい)$/u.test(reading);
  const isVerb = /(する|くる|[うくぐすつぬぶむる])$/u.test(reading) && !isIAdjective;
  const partOfSpeech = item.part_of_speech?.trim() || (isIAdjective ? 'adjectif en い' : isNaAdjective ? 'adjectif en な' : isVerb ? 'verbe' : 'nom ou expression');
  const attributes: VocabularyAttribute[] = [];
  if (isIAdjective) attributes.push({ id: 'i-adjective', label: 'Adjectif en い', explanation: 'Se place directement devant un nom et se conjugue: 高い本, 高くない本.' });
  if (isNaAdjective) attributes.push({ id: 'na-adjective', label: 'Adjectif en な', explanation: 'Prend な devant un nom: きれいな町. Devant です, le な disparaît.' });
  if (isVerb) attributes.push({ id: 'verb', label: 'Forme dictionnaire', explanation: `La forme de référence est ${reading}. Les formes en ます sont polies.` });
  if (/personne|personnes|compteur|décompte/u.test(meaning)) attributes.push({ id: 'counter', label: 'Compteur', explanation: 'Ce mot ou suffixe sert à compter une catégorie précise. Certaines lectures changent selon le nombre.' });
  if (!attributes.length) attributes.push({ id: 'noun', label: 'Mot repère', explanation: 'Apprends ce mot dans une phrase courte avec sa particule naturelle.' });
  const example = CURATED_VOCABULARY_EXAMPLES[reading] ?? buildSafeN5VocabularyExample(item, { isIAdjective, isNaAdjective, isVerb });
  return {
    partOfSpeech,
    dictionaryForm: reading,
    attributes,
    example: example.usage ? example : { ...example, usage: buildDefaultUsage(partOfSpeech, reading) },
  };
}

export function isCuratedVocabularyLearningItem(item: Pick<VocabularyItem, 'kana' | 'japanese'>): boolean {
  return !!CURATED_VOCABULARY_EXAMPLES[normalizeVocabularyKey(item.kana || item.japanese)];
}

/** Keep the exam deck aligned with the guided syllabus, not the larger dictionary. */
export function isJlptN5ExamVocabularyItem(
  item: Pick<VocabularyItem, 'jlpt_level' | 'importance' | 'kana' | 'japanese'>,
): boolean {
  return (item.jlpt_level ?? 'N5') === 'N5'
    && ((item.importance ?? 3) >= 5 || isCuratedVocabularyLearningItem(item));
}

export function auditTaughtVocabulary(items: VocabularyItem[]) {
  const taught = items.filter(isJlptN5ExamVocabularyItem);
  const withoutExample = taught.filter((item) => !getVocabularyLearningMeta(item).example);
  const corrupted = taught.filter((item) => {
    const text = `${item.japanese}${item.kana}${item.meaning_fr}${item.theme ?? ''}`;
    return (item.theme ?? '').includes('?') || Array.from(text).some((character) => character.charCodeAt(0) === 0xfffd);
  });
  return { taught: taught.length, withExample: taught.length - withoutExample.length, withoutExample, corrupted };
}

function buildSafeN5VocabularyExample(
  item: VocabularyItem,
  grammar: { isIAdjective: boolean; isNaAdjective: boolean; isVerb: boolean },
): CuratedVocabularyExample {
  const japanese = (item.kanji || item.japanese || item.kana || '語').trim();
  const kana = (item.kana || item.japanese || 'ことば').trim();
  const meaning = cleanFrenchMeaning(item.meaning_fr);
  const searchable = `${item.part_of_speech ?? ''} ${item.theme ?? ''} ${item.meaning_fr}`.toLowerCase();

  if (/compteur|décompte|suffixe numérique|mois|heures?|personnes?|objets?/u.test(searchable) && /^[~〜～]?[\p{Script=Han}ぁ-んァ-ヶ]+$/u.test(japanese)) {
    const suffix = japanese.replace(/^[~〜～]+/u, '');
    const kanaSuffix = kana.replace(/^[~〜～]+/u, '');
    return {
      japanese: `三${suffix}あります。`,
      kana: `さん${kanaSuffix}あります。`,
      french: `Il y en a trois (${meaning}).`,
      usage: 'Le nombre se place devant le compteur. La prononciation peut changer selon le compteur.',
      generated: true,
    };
  }

  if (grammar.isVerb) {
    return {
      japanese: `休みの日に、${japanese}ことがあります。`,
      kana: `やすみのひに、${kana}ことがあります。`,
      french: `Pendant mon temps libre, il m’arrive de ${meaning}.`,
      usage: 'La forme dictionnaire devant ことがあります exprime une action qui arrive parfois.',
      generated: true,
    };
  }

  if (grammar.isIAdjective) {
    return {
      japanese: `この物は${japanese}です。`,
      kana: `このものは${kana}です。`,
      french: `Cet objet est ${meaning}.`,
      usage: 'Un adjectif en い peut terminer directement une phrase avant です.',
      generated: true,
    };
  }

  if (grammar.isNaAdjective) {
    return {
      japanese: `この場所は${japanese}です。`,
      kana: `このばしょは${kana}です。`,
      french: `Cet endroit est ${meaning}.`,
      usage: 'Devant です, un adjectif en な ne prend pas な.',
      generated: true,
    };
  }

  if (/salutation|expression|interjection|bonjour|merci|pardon|excuse/u.test(searchable)) {
    return {
      japanese: `${japanese}。`,
      kana: `${kana}。`,
      french: sentenceCase(meaning),
      usage: 'Expression autonome à mémoriser avec son contexte et son niveau de politesse.',
      generated: true,
    };
  }

  return {
    japanese: `これは${japanese}です。`,
    kana: `これは${kana}です。`,
    french: `C’est ${withFrenchArticle(meaning)}.`,
    usage: 'これは…です permet d’identifier simplement une chose ou une notion au niveau N5.',
    generated: true,
  };
}

function cleanFrenchMeaning(value: string): string {
  return value
    .split(/[;/]/u)[0]
    .replace(/^se\s+/u, '')
    .replace(/^être\s+/u, '')
    .replace(/[.?!]+$/u, '')
    .trim()
    .toLowerCase();
}

function withFrenchArticle(value: string): string {
  if (/^(un|une|le|la|les|des|du|de l’|de l')\s/u.test(value)) return value;
  if (/^[aeiouyàâäéèêëîïôöùûüœh]/u.test(value)) return `l’${value}`;
  return `le/la ${value}`;
}

function sentenceCase(value: string): string {
  if (!value) return '';
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}.`;
}

function buildDefaultUsage(partOfSpeech: string, reading: string): string {
  if (/verbe/u.test(partOfSpeech)) return `${reading} est présenté dans une phrase d'action simple à réutiliser avec un sujet, un lieu ou un objet.`;
  if (/adjectif/u.test(partOfSpeech)) return `${reading} sert à décrire une personne, une chose ou une situation dans une phrase courte.`;
  return `${reading} est à mémoriser avec cette phrase courte et sa particule naturelle.`;
}

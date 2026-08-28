import type { SQLiteDatabase } from 'expo-sqlite';
import type { VocabularyItem } from '../models';
import { WRITING_PROMPTS, type WritingPrompt } from '../data/writingPrompts';

export type WritingJournalEntry = {
  id: string;
  prompt_id: string;
  prompt_title: string;
  prompt_fr: string;
  user_text: string;
  detected_words_json: string;
  suggestions_json: string;
  created_at: string;
  updated_at: string;
};

export type WritingAnalysis = {
  detectedWords: string[];
  unknownTokens: string[];
  suggestions: string[];
  assessment: 'likely_correct' | 'needs_review';
  assessmentDetail: string;
  correctedText: string;
};

const PARTICLES = ['は', 'が', 'を', 'に', 'へ', 'で', 'と', 'も', 'の', 'か'];

export function getDailyWritingPrompt(date = new Date()): WritingPrompt {
  const daySeed = Math.floor(date.getTime() / 86400000);
  return WRITING_PROMPTS[daySeed % WRITING_PROMPTS.length];
}

export function analyzeWritingText(text: string, vocabulary: VocabularyItem[]): WritingAnalysis {
  const normalized = text.trim();
  const detectedItems = detectVocabularyItems(normalized, vocabulary).slice(0, 20);
  const detectedWords = detectedItems.map((item) => item.kanji || item.japanese || item.kana || '');
  const knownValues = unique(
    detectedItems.flatMap((item) => [item.japanese, item.kana, item.kanji].filter(Boolean) as string[])
  ).sort((left, right) => right.length - left.length);
  let remaining = normalized;
  knownValues.forEach((value) => { remaining = remaining.split(value).join(' '); });
  remaining = remaining
    .replace(/[はがをにへでともへもかの]/gu, ' ')
    .replace(/(です|でした|ではありません|ます|ました|ません|ませんでした|たい|ない|ある|いる)/gu, ' ')
    .replace(/[\s。、！？!?・]/gu, ' ');
  const unknownTokens = (remaining.match(/[\u3040-\u30ff\u4e00-\u9fffー]{2,}/gu) ?? []).slice(0, 6);
  const correction = applyLocalWritingCorrections(normalized);
  const suggestions = buildWritingSuggestions(normalized, unknownTokens, correction.issues);
  const hasJapanese = /[\u3040-\u30ff\u4e00-\u9fff]/u.test(normalized);
  const hasLatinText = /[a-z]/i.test(normalized);
  const hasPredicate = /(です|でした|ではありません|ます|ました|ません|ませんでした|たいです|ないです|ある|いる)[。.!?？]?$/u.test(normalized);
  const malformedParticles = /[はがをにへでともかの]{2,}/u.test(normalized);
  const assessment = hasJapanese && !hasLatinText && hasPredicate && !malformedParticles && correction.issues.length === 0 && unknownTokens.length <= 2
    ? 'likely_correct'
    : 'needs_review';
  const assessmentDetail = assessment === 'likely_correct'
    ? 'La phrase possède une fin verbale ou nominale cohérente pour le N5. La vérification locale ne détecte pas d’anomalie évidente.'
    : !hasJapanese
      ? 'Écris la phrase en japonais pour lancer la vérification.'
      : hasLatinText
        ? 'Le texte contient encore des lettres latines. Remplace-les par du japonais avant la validation.'
      : correction.issues.length
        ? correction.issues.join(' ')
      : malformedParticles
        ? 'Deux particules semblent se suivre. Vérifie la fonction de chacune.'
        : !hasPredicate
          ? 'La phrase semble incomplète : ajoute un prédicat, par exemple です ou un verbe.'
          : 'La structure est plausible, mais certains groupes ne sont pas encore reconnus par le dictionnaire local.';
  const correctedText = correction.text && !/[。.!?？]$/u.test(correction.text) ? `${correction.text}。` : correction.text;
  return { detectedWords: unique(detectedWords), unknownTokens: unique(unknownTokens), suggestions, assessment, assessmentDetail, correctedText };
}

export async function saveWritingJournalEntry(
  db: SQLiteDatabase,
  prompt: WritingPrompt,
  text: string,
  analysis: WritingAnalysis
): Promise<void> {
  const id = `${Date.now()}-${Math.random()}`;
  await db.runAsync(
    `
    INSERT INTO app_writing_journal_entry (
      id, prompt_id, prompt_title, prompt_fr, user_text,
      detected_words_json, suggestions_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `,
    id,
    prompt.id,
    prompt.title,
    prompt.promptFr,
    text.trim(),
    JSON.stringify(analysis.detectedWords),
    JSON.stringify(analysis.suggestions)
  );
}

export async function loadWritingJournalEntries(db: SQLiteDatabase): Promise<WritingJournalEntry[]> {
  return db.getAllAsync<WritingJournalEntry>(`
    SELECT id, prompt_id, prompt_title, prompt_fr, user_text, detected_words_json, suggestions_json, created_at, updated_at
    FROM app_writing_journal_entry
    ORDER BY created_at DESC
    LIMIT 20
  `);
}

function buildWritingSuggestions(text: string, unknownTokens: string[], grammarIssues: string[] = []): string[] {
  const suggestions: string[] = [...grammarIssues];
  if (text.length < 8) suggestions.push('Ajoute une deuxieme information : lieu, temps ou objet.');
  if (!PARTICLES.some((particle) => text.includes(particle))) suggestions.push('Ajoute une particule simple : は, が, を, に ou で.');
  if (!/[。.!?？]$/.test(text)) suggestions.push('Termine la phrase avec 。 pour prendre l habitude japonaise.');
  if (unknownTokens.length) suggestions.push(`Verifie ces mots non reconnus localement : ${unknownTokens.join(', ')}.`);
  if (!/(です|ます|ました|ません)/.test(text)) suggestions.push('Pour N5, essaie une fin polie en です ou ます.');
  if (!suggestions.length) suggestions.push('Phrase claire pour un niveau N5 : continue avec une variante au passe ou au negatif.');
  return suggestions.slice(0, 4);
}

function detectVocabularyItems(text: string, vocabulary: VocabularyItem[]): VocabularyItem[] {
  const candidates = vocabulary
    .flatMap((item) => [item.kanji, item.japanese, item.kana]
      .filter((value): value is string => Boolean(value && (value.length >= 2 || /[\u4e00-\u9fff]/u.test(value))))
      .map((value) => ({ item, value })))
    .sort((left, right) => right.value.length - left.value.length);
  const detected: VocabularyItem[] = [];
  let index = 0;
  while (index < text.length) {
    const match = candidates.find((candidate) => text.startsWith(candidate.value, index));
    if (!match) {
      index += 1;
      continue;
    }
    if (!detected.some((item) => item.id === match.item.id)) detected.push(match.item);
    index += match.value.length;
  }
  return detected;
}

function applyLocalWritingCorrections(text: string): { text: string; issues: string[] } {
  let corrected = text.replace(/\s+/g, ' ').trim();
  const issues: string[] = [];
  const rules: Array<{ pattern: RegExp; replacement: string; message: string }> = [
    {
      pattern: /を(います|あります)/u,
      replacement: 'が$1',
      message: 'Avec います ou あります, la chose qui existe est normalement marquée par が, pas を.',
    },
    {
      pattern: /を(行きます|いきます|来ます|きます|帰ります|かえります)/u,
      replacement: 'に$1',
      message: 'Une destination prend に (ou へ) avec un verbe de déplacement.',
    },
    {
      pattern: /に(勉強します|べんきょうします|食べます|たべます|読みます|よみます|見ます|みます|働きます|はたらきます)/u,
      replacement: 'で$1',
      message: 'Le lieu où une action se déroule prend で, pas に.',
    },
    {
      pattern: /(猫|犬|人|先生|学生)があります/u,
      replacement: '$1がいます',
      message: 'Pour une personne ou un animal présent, emploie います plutôt que あります.',
    },
  ];
  rules.forEach((rule) => {
    if (!rule.pattern.test(corrected)) return;
    corrected = corrected.replace(rule.pattern, rule.replacement);
    issues.push(rule.message);
  });
  if (/[はがをにへでともかの]{2,}/u.test(corrected)) {
    issues.push('Deux particules se suivent sans structure reconnue; vérifie celle qui porte la fonction voulue.');
  }
  return { text: corrected, issues: unique(issues) };
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

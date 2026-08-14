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
};

const PARTICLES = ['は', 'が', 'を', 'に', 'へ', 'で', 'と', 'も', 'の', 'か'];

export function getDailyWritingPrompt(date = new Date()): WritingPrompt {
  const daySeed = Math.floor(date.getTime() / 86400000);
  return WRITING_PROMPTS[daySeed % WRITING_PROMPTS.length];
}

export function analyzeWritingText(text: string, vocabulary: VocabularyItem[]): WritingAnalysis {
  const normalized = text.trim();
  const detectedWords = vocabulary
    .filter((item) => {
      const values = [item.japanese, item.kana, item.kanji].filter(Boolean) as string[];
      return values.some((value) => value.length >= 2 && normalized.includes(value));
    })
    .slice(0, 8)
    .map((item) => item.kanji || item.japanese);
  const tokens = normalized.match(/[\u3040-\u30ff\u4e00-\u9fffー]+/gu) ?? [];
  const knownValues = new Set(
    vocabulary.flatMap((item) => [item.japanese, item.kana, item.kanji]).filter(Boolean) as string[]
  );
  const unknownTokens = tokens
    .filter((token) => token.length >= 2 && !knownValues.has(token) && !detectedWords.includes(token))
    .slice(0, 6);
  const suggestions = buildWritingSuggestions(normalized, unknownTokens);
  return { detectedWords: unique(detectedWords), unknownTokens: unique(unknownTokens), suggestions };
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

function buildWritingSuggestions(text: string, unknownTokens: string[]): string[] {
  const suggestions: string[] = [];
  if (text.length < 8) suggestions.push('Ajoute une deuxieme information : lieu, temps ou objet.');
  if (!PARTICLES.some((particle) => text.includes(particle))) suggestions.push('Ajoute une particule simple : は, が, を, に ou で.');
  if (!/[。.!?？]$/.test(text)) suggestions.push('Termine la phrase avec 。 pour prendre l habitude japonaise.');
  if (unknownTokens.length) suggestions.push(`Verifie ces mots non reconnus localement : ${unknownTokens.join(', ')}.`);
  if (!/(です|ます|ました|ません)/.test(text)) suggestions.push('Pour N5, essaie une fin polie en です ou ます.');
  if (!suggestions.length) suggestions.push('Phrase claire pour un niveau N5 : continue avec une variante au passe ou au negatif.');
  return suggestions.slice(0, 4);
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

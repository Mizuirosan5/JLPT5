import type { SQLiteDatabase } from 'expo-sqlite';
import type { KanjiItem, VocabularyCardData, VocabularyExample, VocabularyItem } from '../models';

export type VocabularyCardState = {
  card_id: string;
  favorite: number;
  review: number;
  seen_count: number;
  updated_at: string;
};

type VocabularyLoadResult = {
  rows: VocabularyItem[];
  total: number;
  n5: number;
};

const vocabularyItemsCache = new WeakMap<SQLiteDatabase, Promise<VocabularyLoadResult>>();
const kanjiItemsCache = new WeakMap<SQLiteDatabase, Promise<KanjiItem[]>>();

export function getVocabularyCategory(item: VocabularyExample): string {
  const text = `${item.japanese} ${item.kana ?? ''} ${item.kanji ?? ''} ${item.romaji ?? ''} ${item.meaning_fr}`.toLowerCase();
  if (/父|母|兄|姉|弟|妹|家族|famille|père|mère|frère|sœur/.test(text)) return 'Famille';
  if (/頭|手|足|目|耳|口|体|corps|tête|main|pied|jambe|œil|oreille/.test(text)) return 'Corps';
  if (/食|飲|水|茶|肉|魚|米|パン|ご飯|nourriture|manger|boire|eau|thé|riz|pain/.test(text)) return 'Nourriture et boissons';
  if (/学校|先生|学生|本|鉛筆|勉強|école|professeur|étudiant|livre|crayon/.test(text)) return 'École et étude';
  if (/駅|電車|車|道|行|来|帰|gare|train|voiture|route|aller|venir|rentrer/.test(text)) return 'Déplacements';
  if (/今日|明日|昨日|時|分|月|日|年|matin|soir|heure|jour|mois|année|demain|hier/.test(text)) return 'Temps et calendrier';
  if (/赤|青|白|黒|大|小|新|古|高|安|couleur|grand|petit|nouveau|cher/.test(text)) return 'Descriptions';
  if (/こんにちは|ありがとう|すみません|salut|bonjour|merci|pardon/.test(text)) return 'Expressions';
  return 'Vocabulaire général';
}

export function getVocabularyThemeLabel(item: VocabularyItem | VocabularyExample): string {
  const rawTheme = 'theme' in item ? item.theme : null;
  if (rawTheme?.trim()) return formatVocabularyTheme(rawTheme);
  return getVocabularyCategory(item);
}

export function getVocabularyMainText(item: VocabularyExample): string {
  return item.kanji?.trim() || item.japanese?.trim() || item.kana?.trim() || '語';
}

export function buildVocabularyCards(items: VocabularyItem[], kanjiItems: KanjiItem[] = []): VocabularyCardData[] {
  const kanjiRoots = new Set(kanjiItems.map((kanji) => kanji.character));
  const relatedEntriesByKanji = new Map<string, VocabularyItem[]>();
  const grouped = new Map<string, VocabularyItem[]>();

  items.forEach((item) => {
    const itemKanji = `${item.kanji ?? ''}${item.japanese ?? ''}`.match(/[\u4E00-\u9FFF]/gu) ?? [];
    Array.from(new Set(itemKanji)).forEach((character) => {
      if (!kanjiRoots.has(character)) return;
      const related = relatedEntriesByKanji.get(character) ?? [];
      related.push(item);
      relatedEntriesByKanji.set(character, related);
    });

    const root = getVocabularyRoot(item);
    if (kanjiRoots.has(root)) return;
    const group = grouped.get(root) ?? [];
    group.push(item);
    grouped.set(root, group);
  });

  const kanjiCards = kanjiItems.map((kanji) => {
    const relatedEntries = relatedEntriesByKanji.get(kanji.character) ?? [];
    const primary = relatedEntries[0] ?? createVocabularyItemFromKanji(kanji);
    return {
      id: `kanji-card-${kanji.id}`,
      root: kanji.character,
      primary,
      entries: relatedEntries.length ? relatedEntries : [primary],
      readings: uniqueCompact([
        ...(kanji.n5_readings ? splitVocabularyField(kanji.n5_readings) : []),
        ...relatedEntries.flatMap((entry) => splitVocabularyField(entry.romaji)),
      ]),
      kanaReadings: uniqueCompact(relatedEntries.flatMap((entry) => splitVocabularyField(entry.kana || entry.japanese))),
      meanings: uniqueCompact([kanji.meaning_fr, ...relatedEntries.flatMap((entry) => splitVocabularyField(entry.meaning_fr))]),
      kanji,
    };
  });

  const vocabularyCards = Array.from(grouped.entries()).map(([root, entries]) => {
    const sortedEntries = [...entries].sort((a, b) => {
      const aMain = getVocabularyMainText(a);
      const bMain = getVocabularyMainText(b);
      if (aMain === root && bMain !== root) return -1;
      if (bMain === root && aMain !== root) return 1;
      return aMain.length - bMain.length;
    });
    const primary = sortedEntries[0];
    return {
      id: `vocab-root-${root}`,
      root,
      primary,
      entries: sortedEntries,
      readings: uniqueCompact(sortedEntries.flatMap((entry) => splitVocabularyField(entry.romaji))),
      kanaReadings: uniqueCompact(sortedEntries.flatMap((entry) => splitVocabularyField(entry.kana || entry.japanese))),
      meanings: uniqueCompact(sortedEntries.flatMap((entry) => splitVocabularyField(entry.meaning_fr))),
    };
  });
  return [...kanjiCards, ...vocabularyCards];
}

export function createVocabularyItemFromKanji(kanji: KanjiItem): VocabularyItem {
  return {
    id: `synthetic-${kanji.id}`,
    japanese: kanji.character,
    kana: kanji.n5_readings,
    kanji: kanji.character,
    romaji: kanji.n5_readings,
    meaning_fr: kanji.meaning_fr,
    category: 'Kanji JLPT N5',
    jlpt_level: kanji.jlpt_level,
  };
}

export function getVocabularyCardSearchText(card: VocabularyCardData): string {
  return [
    card.root,
    card.kanji?.meaning_fr,
    card.kanji?.onyomi,
    card.kanji?.kunyomi,
    card.kanji?.n5_readings,
    ...card.readings,
    ...card.kanaReadings,
    ...card.meanings,
    ...card.entries.flatMap((entry) => [entry.japanese, entry.kana, entry.kanji, entry.romaji, entry.meaning_fr]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function formatVocabularyTheme(theme: string): string {
  const normalized = theme
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  const known: Record<string, string> = {
    nourriture: 'Nourriture et boissons',
    nourriture_boisson: 'Nourriture et boissons',
    'nourriture boisson': 'Nourriture et boissons',
    lieux: 'Lieux',
    temps: 'Temps et calendrier',
    famille: 'Famille',
    corps: 'Corps',
    transport: 'Déplacements',
    deplacements: 'Déplacements',
    déplacements: 'Déplacements',
    ecole: 'École et étude',
    école: 'École et étude',
    animaux: 'Animaux',
    nature: 'Nature',
    nombres: 'Nombres',
    couleurs: 'Couleurs',
    adjectifs: 'Descriptions',
    verbes: 'Verbes et actions',
  };
  if (known[normalized]) return known[normalized];
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function getVocabularyRoot(item: VocabularyExample): string {
  const kanjiText = item.kanji?.trim() || item.japanese?.trim() || '';
  const kanjiChars = kanjiText.match(/[\u4E00-\u9FFF]/gu);
  if (kanjiChars?.length) return kanjiChars[0];
  return getVocabularyMainText(item);
}

function splitVocabularyField(value?: string | null): string[] {
  if (!value) return [];
  return value
    .split(/[;,/、・]| ou | et /i)
    .map((part) => part.trim())
    .filter(Boolean);
}

function uniqueCompact(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  values.forEach((value) => {
    const normalized = value.trim();
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) return;
    seen.add(key);
    result.push(normalized);
  });
  return result;
}

export async function loadVocabularyItems(db: SQLiteDatabase): Promise<VocabularyLoadResult> {
  const cached = vocabularyItemsCache.get(db);
  if (cached) return cached;
  const request = loadVocabularyItemsFromDatabase(db).catch((error) => {
    vocabularyItemsCache.delete(db);
    throw error;
  });
  vocabularyItemsCache.set(db, request);
  return request;
}

async function loadVocabularyItemsFromDatabase(db: SQLiteDatabase): Promise<VocabularyLoadResult> {
  try {
    const rows = await db.getAllAsync<VocabularyItem>(`
      SELECT id, japanese, kana, kanji, romaji, meaning_fr, part_of_speech, theme, importance,
             COALESCE(jlpt_level, 'N5') AS jlpt_level
      FROM canonical_vocabulary
      ORDER BY CASE WHEN kana IS NULL OR kana = '' THEN japanese ELSE kana END
      LIMIT 2500
    `);
    const totalRow = await db.getFirstAsync<{ count: number }>(`
      SELECT COUNT(*) AS count
      FROM canonical_vocabulary
    `);
    const n5Row = await db.getFirstAsync<{ count: number }>(`
      SELECT COUNT(*) AS count
      FROM canonical_vocabulary
      WHERE COALESCE(jlpt_level, 'N5') = 'N5'
    `);
    return {
      rows: rows.map((row) => ({
        ...row,
        category: getVocabularyCategory(row),
        jlpt_level: row.jlpt_level ?? 'N5',
      })),
      total: totalRow?.count ?? rows.length,
      n5: n5Row?.count ?? rows.length,
    };
  } catch (error) {
    console.warn('Vocabulary level column unavailable, loading vocabulary as N5 fallback', error);
    const rows = await db.getAllAsync<VocabularyExample>(`
      SELECT id, japanese, kana, kanji, romaji, meaning_fr
      FROM canonical_vocabulary
      ORDER BY CASE WHEN kana IS NULL OR kana = '' THEN japanese ELSE kana END
      LIMIT 2500
    `);
    const totalRow = await db.getFirstAsync<{ count: number }>(`
      SELECT COUNT(*) AS count
      FROM canonical_vocabulary
    `);
    const mappedRows = rows.map((row) => ({
      ...row,
      category: getVocabularyCategory(row),
      jlpt_level: 'N5',
    }));
    return {
      rows: mappedRows,
      total: totalRow?.count ?? mappedRows.length,
      n5: totalRow?.count ?? mappedRows.length,
    };
  }
}

export async function loadKanjiItems(db: SQLiteDatabase): Promise<KanjiItem[]> {
  const cached = kanjiItemsCache.get(db);
  if (cached) return cached;
  const request = db.getAllAsync<KanjiItem>(`
    SELECT id, character, meaning_fr, onyomi, kunyomi, n5_readings, stroke_count, jlpt_level
    FROM canonical_kanji
    WHERE jlpt_level = 'N5'
    ORDER BY id
  `).catch((error) => {
    kanjiItemsCache.delete(db);
    throw error;
  });
  kanjiItemsCache.set(db, request);
  return request;
}

export async function loadVocabularyCardStates(db: SQLiteDatabase): Promise<VocabularyCardState[]> {
  return db.getAllAsync<VocabularyCardState>(`
    SELECT card_id, favorite, review, seen_count, updated_at
    FROM app_vocabulary_card_state
  `);
}

export async function updateVocabularyCardFlag(
  db: SQLiteDatabase,
  cardId: string,
  flag: 'favorite' | 'review',
  value: boolean
): Promise<void> {
  const favoriteValue = flag === 'favorite' ? (value ? 1 : 0) : 0;
  const reviewValue = flag === 'review' ? (value ? 1 : 0) : 0;
  await db.runAsync(
    `
    INSERT INTO app_vocabulary_card_state (
      card_id, favorite, review, seen_count, updated_at
    ) VALUES (?, ?, ?, 0, datetime('now'))
    ON CONFLICT(card_id) DO UPDATE SET
      favorite = CASE WHEN ? = 'favorite' THEN ? ELSE favorite END,
      review = CASE WHEN ? = 'review' THEN ? ELSE review END,
      updated_at = datetime('now')
    `,
    cardId,
    favoriteValue,
    reviewValue,
    flag,
    favoriteValue,
    flag,
    reviewValue
  );
}

export async function recordVocabularyCardSeen(db: SQLiteDatabase, cardId: string): Promise<void> {
  await db.runAsync(
    `
    INSERT INTO app_vocabulary_card_state (
      card_id, favorite, review, seen_count, updated_at
    ) VALUES (?, 0, 0, 1, datetime('now'))
    ON CONFLICT(card_id) DO UPDATE SET
      seen_count = seen_count + 1,
      updated_at = datetime('now')
    `,
    cardId
  );
}

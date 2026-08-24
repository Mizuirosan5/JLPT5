import type { SQLiteDatabase } from 'expo-sqlite';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { styles } from '../appStyles';
import type { JapaneseTextToken, VocabularyExample, WordLookupEntry } from '../models';
import { saveErrorFlashcard } from '../services/errorFlashcards';
import { markSrsItemForReview, type SrsItemType } from '../services/srs';
import { getVocabularyCategory } from '../services/vocabulary';

export type CorrectionToken = JapaneseTextToken;
export type CorrectionInsight = {
  japanese?: string | null;
  kana?: string | null;
  translation?: string | null;
  expectedAnswer?: string | null;
  explanation?: string | null;
};

export function useVocabularyLookupIndex(db: SQLiteDatabase): WordLookupEntry[] {
  const [entries, setEntries] = useState<WordLookupEntry[]>(CORE_GRAMMAR_LOOKUP_ENTRIES);

  useEffect(() => {
    let mounted = true;
    db.getAllAsync<VocabularyExample>(`
      SELECT id, japanese, kana, kanji, romaji, meaning_fr
      FROM canonical_vocabulary
      ORDER BY length(COALESCE(kanji, japanese, kana)) DESC
      LIMIT 2500
    `)
      .then((rows) => {
        if (!mounted) return;
        setEntries([
          ...CORE_GRAMMAR_LOOKUP_ENTRIES,
          ...rows.map((row) => ({
            ...row,
            usage: buildVocabularyUsage(row),
          })),
        ]);
      })
      .catch((error) => {
        console.error('Unable to load vocabulary lookup index', error);
        if (mounted) setEntries(CORE_GRAMMAR_LOOKUP_ENTRIES);
      });
    return () => {
      mounted = false;
    };
  }, [db]);

  return entries;
}

export function JapaneseLookupText({
  text,
  entries,
  onSelect,
  style,
}: {
  text: string;
  entries: WordLookupEntry[];
  onSelect: (entry: WordLookupEntry) => void;
  style: any;
}) {
  const tokens = useMemo(() => tokenizeJapaneseTextForLookup(text, entries), [text, entries]);
  return (
    <Text style={style}>
      {tokens.map((token, index) =>
        token.entry ? (
          <Text
            key={`${token.text}-${index}`}
            accessibilityLabel={`Afficher la lecture et le sens de ${token.text}`}
            accessibilityRole="link"
            style={styles.lookupToken}
            onPress={() => onSelect(token.entry!)}
            onLongPress={() => onSelect(token.entry!)}
          >
            {token.text}
          </Text>
        ) : (
          <Text key={`${token.text}-${index}`}>{token.text}</Text>
        )
      )}
    </Text>
  );
}

export function WordLookupPanel({ entry, onClose }: { entry: WordLookupEntry | null; onClose: () => void }) {
  const db = useSQLiteContext();
  const [reviewAdded, setReviewAdded] = useState(false);
  useEffect(() => {
    setReviewAdded(false);
  }, [entry?.id]);
  if (!entry) return null;
  const itemType = getLookupSrsItemType(entry);
  const addToReview = async () => {
    try {
      await markSrsItemForReview(db, { itemId: entry.id, itemType });
      setReviewAdded(true);
    } catch (error) {
      console.error('Unable to add lookup entry to SRS review', error);
    }
  };
  return (
    <View style={styles.wordLookupPanel}>
      <View style={styles.wordLookupHeader}>
        <View>
          <Text style={styles.wordLookupKicker}>Mot sélectionné</Text>
          <Text style={styles.wordLookupTitle}>{entry.kanji || entry.japanese}</Text>
        </View>
        <Pressable accessibilityLabel="Fermer la fiche du mot" accessibilityRole="button" style={styles.wordLookupClose} onPress={onClose}>
          <Text style={styles.wordLookupCloseText}>×</Text>
        </Pressable>
      </View>
      {!!entry.kana && entry.kana !== (entry.kanji || entry.japanese) && (
        <Text style={styles.wordLookupLine}>Hiragana / kana : {entry.kana}</Text>
      )}
      {!!entry.romaji && <Text style={styles.wordLookupLine}>Romaji : {entry.romaji}</Text>}
      <Text style={styles.wordLookupMeaning}>Français : {entry.meaning_fr}</Text>
      <Text style={styles.wordLookupUsage}>{entry.usage}</Text>
      <View style={styles.wordLookupActionRow}>
        <Pressable
          accessibilityLabel={reviewAdded ? 'Mot ajouté aux révisions' : 'Ajouter ce mot aux révisions'}
          accessibilityRole="button"
          accessibilityState={{ disabled: reviewAdded }}
          disabled={reviewAdded}
          style={[styles.wordLookupActionButton, reviewAdded && styles.wordLookupActionButtonDone]}
          onPress={addToReview}
        >
          <Text style={styles.wordLookupActionText}>{reviewAdded ? 'Ajouté aux révisions' : 'Ajouter à revoir'}</Text>
        </Pressable>
        <Text style={styles.wordLookupActionMeta}>{formatLookupSrsType(itemType)}</Text>
      </View>
    </View>
  );
}

function getLookupSrsItemType(entry: WordLookupEntry): SrsItemType {
  if (entry.id.startsWith('lookup-')) return 'grammar';
  return 'vocabulary';
}

function formatLookupSrsType(type: SrsItemType): string {
  if (type === 'grammar') return 'Point de grammaire';
  if (type === 'kanji') return 'Kanji';
  return 'Vocabulaire';
}

export function JapaneseCorrectionDetails({
  japanese,
  kana,
  translation,
  expectedAnswer,
  explanation,
  entries,
  showRomaji = true,
  showTranslationFirst = false,
  sourceQuestionId,
  sourceMode = 'correction',
  selectedAnswer,
  onSelect,
}: {
  japanese?: string | null;
  kana?: string | null;
  translation?: string | null;
  expectedAnswer?: string | null;
  explanation?: string | null;
  entries: WordLookupEntry[];
  showRomaji?: boolean;
  showTranslationFirst?: boolean;
  sourceQuestionId?: string | null;
  sourceMode?: string;
  selectedAnswer?: string | null;
  onSelect: (entry: WordLookupEntry) => void;
}) {
  const db = useSQLiteContext();
  const [answerReviewAdded, setAnswerReviewAdded] = useState(false);
  useEffect(() => {
    setAnswerReviewAdded(false);
  }, [expectedAnswer]);
  const hasJapanese = Boolean(japanese?.trim());
  const hasKana = Boolean(kana?.trim() && kana !== japanese);
  const expectedLookupEntry = useMemo(
    () =>
      expectedAnswer
        ? entries.find((entry) =>
            getLookupCandidates(entry).some((candidate) => candidate === expectedAnswer || expectedAnswer.includes(candidate))
          ) ?? null
        : null,
    [entries, expectedAnswer]
  );
  const canCreateErrorCard = Boolean(sourceQuestionId && expectedAnswer?.trim());
  const translationBlock = !!translation && (
    <View style={styles.correctionInsightBlock}>
      <Text style={styles.correctionInsightLabel}>Sens</Text>
      <Text style={styles.correctionInsightText}>{translation}</Text>
    </View>
  );
  return (
    <View style={styles.correctionInsightCard}>
      <Text style={styles.correctionInsightKicker}>Correction detaillee</Text>
      {showTranslationFirst && translationBlock}
      {hasJapanese && (
        <View style={styles.correctionInsightBlock}>
          <Text style={styles.correctionInsightLabel}>Phrase japonaise</Text>
          <JapaneseLookupText text={japanese!} entries={entries} onSelect={onSelect} style={styles.correctionInsightJapanese} />
        </View>
      )}
      {hasKana && (
        <View style={styles.correctionInsightBlock}>
          <Text style={styles.correctionInsightLabel}>Lecture kana</Text>
          <JapaneseLookupText text={kana!} entries={entries} onSelect={onSelect} style={styles.correctionInsightText} />
        </View>
      )}
      {!showTranslationFirst && translationBlock}
      {!!expectedAnswer && (
        <View style={styles.correctionInsightBlock}>
          <Text style={styles.correctionInsightLabel}>Reponse attendue</Text>
          <Text style={styles.correctionInsightText}>{expectedAnswer}</Text>
          {(expectedLookupEntry || canCreateErrorCard) && (
            <Pressable
              style={[styles.wordLookupActionButton, answerReviewAdded && styles.wordLookupActionButtonDone]}
              onPress={async () => {
                try {
                  if (sourceQuestionId && expectedAnswer) {
                    await saveErrorFlashcard(db, {
                      sourceQuestionId,
                      sourceMode,
                      itemType: expectedLookupEntry ? getLookupSrsItemType(expectedLookupEntry) : undefined,
                      prompt: translation || japanese || expectedAnswer,
                      japanese,
                      translation,
                      expectedAnswer,
                      selectedAnswer,
                      explanation,
                    });
                  } else if (expectedLookupEntry) {
                    await markSrsItemForReview(db, {
                      itemId: expectedLookupEntry.id,
                      itemType: getLookupSrsItemType(expectedLookupEntry),
                    });
                  }
                  setAnswerReviewAdded(true);
                } catch (error) {
                  console.error('Unable to add expected answer to error reviews', error);
                }
              }}
            >
              <Text style={styles.wordLookupActionText}>
                {answerReviewAdded ? 'Ajouté aux révisions' : 'Ajouter cette réponse à revoir'}
              </Text>
            </Pressable>
          )}
        </View>
      )}
      {!!explanation && (
        <View style={styles.correctionInsightBlock}>
          <Text style={styles.correctionInsightLabel}>Pourquoi</Text>
          <Text style={styles.correctionInsightText}>{explanation}</Text>
        </View>
      )}
    </View>
  );
}

export const SmartCorrectionPanel = JapaneseCorrectionDetails;

function tokenizeJapaneseTextForLookup(text: string, entries: WordLookupEntry[]): JapaneseTextToken[] {
  if (!text) return [];
  const sortedEntries = [...entries]
    .filter((entry) => getLookupCandidates(entry).length > 0)
    .sort((a, b) => getLookupCandidates(b)[0].length - getLookupCandidates(a)[0].length);
  const tokens: JapaneseTextToken[] = [];
  let index = 0;

  while (index < text.length) {
    const char = text[index];
    if (/[\s。、！？,.!?「」『』（）()：:・…]/.test(char)) {
      tokens.push({ text: char });
      index += 1;
      continue;
    }

    const match = sortedEntries.find((entry) =>
      getLookupCandidates(entry).some((candidate) => candidate.length > 0 && text.startsWith(candidate, index))
    );

    if (match) {
      const matchedText = getLookupCandidates(match).find((candidate) => text.startsWith(candidate, index)) ?? char;
      tokens.push({ text: matchedText, entry: match });
      index += matchedText.length;
      continue;
    }

    const singleKanjiMatch = isKanjiChar(char) ? findSingleKanjiLookupEntry(char, sortedEntries) : null;
    if (singleKanjiMatch) {
      tokens.push({ text: char, entry: singleKanjiMatch });
      index += 1;
      continue;
    }

    tokens.push({ text: char });
    index += 1;
  }

  return tokens;
}

function isKanjiChar(value: string): boolean {
  return /^[\u4E00-\u9FFF]$/.test(value);
}

function findSingleKanjiLookupEntry(char: string, entries: WordLookupEntry[]): WordLookupEntry | null {
  return (
    entries.find((entry) =>
      [entry.kanji, entry.japanese].some((value) => value?.includes(char)) && Boolean(entry.kana || entry.romaji)
    ) ?? null
  );
}

function getLookupCandidates(entry: WordLookupEntry): string[] {
  return [entry.kanji, entry.japanese, entry.kana]
    .filter((value): value is string => !!value && value.trim().length > 0)
    .sort((a, b) => b.length - a.length);
}

function buildVocabularyUsage(item: VocabularyExample): string {
  const category = getVocabularyCategory(item);
  if (category === 'Temps et calendrier') return 'On l’emploie pour situer une action dans le temps : jour, heure, date ou moment.';
  if (category === 'Déplacements') return 'On l’emploie avec des verbes comme 行きます, 来ます ou 帰ります pour parler d’un trajet.';
  if (category === 'Nourriture et boissons') return 'On l’emploie souvent avec を + 食べます / 飲みます pour dire ce qu’on mange ou boit.';
  if (category === 'École et étude') return 'On l’emploie dans les phrases de cours, d’étude, d’objet scolaire ou de lieu d’apprentissage.';
  if (category === 'Famille') return 'On l’emploie pour présenter une personne de la famille ou parler d’une relation.';
  if (category === 'Corps') return 'On l’emploie avec が pour dire ce qui fait mal ou ce qui est concerné.';
  if (category === 'Descriptions') return 'On l’emploie pour décrire une personne, une chose, un lieu ou une sensation.';
  return 'On l’emploie comme mot de vocabulaire dans une phrase simple. Regarde la particule juste après pour comprendre son rôle.';
}

const CORE_GRAMMAR_LOOKUP_ENTRIES: WordLookupEntry[] = [
  { id: 'lookup-wa', japanese: 'は', kana: 'は', kanji: null, romaji: 'wa', meaning_fr: 'marque le thème', usage: 'On l’emploie après ce dont on parle. Il se prononce wa quand il est particule.' },
  { id: 'lookup-ga', japanese: 'が', kana: 'が', kanji: null, romaji: 'ga', meaning_fr: 'marque le sujet précis', usage: 'On l’emploie pour pointer ce qui fait l’action, existe, ou porte l’information nouvelle.' },
  { id: 'lookup-o', japanese: 'を', kana: 'を', kanji: null, romaji: 'o', meaning_fr: 'marque l’objet direct', usage: 'On l’emploie après la chose touchée par une action : boire de l’eau, lire un livre, acheter un objet.' },
  { id: 'lookup-ni', japanese: 'に', kana: 'に', kanji: null, romaji: 'ni', meaning_fr: 'moment, destination ou cible', usage: 'On l’emploie pour un point précis : heure, lieu d’arrivée, personne cible, ou lieu d’existence.' },
  { id: 'lookup-de', japanese: 'で', kana: 'で', kanji: null, romaji: 'de', meaning_fr: 'lieu de l’action ou moyen', usage: 'On l’emploie pour dire où une action se passe ou avec quel moyen elle est faite.' },
  { id: 'lookup-e', japanese: 'へ', kana: 'へ', kanji: null, romaji: 'e', meaning_fr: 'direction', usage: 'On l’emploie pour indiquer vers où l’on va. Il se prononce e quand il est particule.' },
  { id: 'lookup-no', japanese: 'の', kana: 'の', kanji: null, romaji: 'no', meaning_fr: 'possession ou précision', usage: 'On l’emploie pour relier deux noms : mon sac, livre de japonais, professeur de japonais.' },
  { id: 'lookup-mo', japanese: 'も', kana: 'も', kanji: null, romaji: 'mo', meaning_fr: 'aussi', usage: 'On l’emploie pour ajouter un élément qui reçoit la même information.' },
  { id: 'lookup-ka', japanese: 'か', kana: 'か', kanji: null, romaji: 'ka', meaning_fr: 'question', usage: 'On l’emploie à la fin d’une phrase polie pour poser une question.' },
  { id: 'lookup-desu', japanese: 'です', kana: 'です', kanji: null, romaji: 'desu', meaning_fr: 'forme polie avec nom/adjectif', usage: 'On l’emploie pour terminer poliment une phrase avec un nom ou un adjectif.' },
  { id: 'lookup-masu', japanese: 'ます', kana: 'ます', kanji: null, romaji: 'masu', meaning_fr: 'forme polie du verbe', usage: 'On l’emploie à la fin d’un verbe pour parler poliment au présent ou futur.' },
];

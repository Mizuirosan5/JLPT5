import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, TextInput, View, type StyleProp, type TextStyle } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { styles } from '../appStyles';
import type { KanjiItem, LearningPreferences, VocabularyCardData, VocabularyItem, VocabularyScope, VocabularyViewMode } from '../models';
import {
  buildVocabularyCards,
  getVocabularyCardSearchText,
  getVocabularyCategory,
  getVocabularyMainText,
  getVocabularyThemeLabel,
  loadKanjiItems,
  loadVocabularyCardStates,
  loadVocabularyItems,
  recordVocabularyCardSeen,
  updateVocabularyCardFlag,
  type VocabularyCardState,
} from '../services/vocabulary';
import { DEFAULT_LEARNING_PREFERENCES, loadLearningPreferences } from '../services/preferences';
import { EmptyState, Metric, Section } from './sharedUi';
import { SegmentButton } from './formControls';

function getCompactReading(value: string | null | undefined) {
  if (!value?.trim()) return '-';
  return value
    .split(/[、,;；/]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join('\n');
}

function formatCardReading(values: string[]) {
  const compact = values
    .flatMap((value) => value.split(/[;,/、]/))
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 5);
  if (!compact.length) return 'lecture';
  const [first, second, ...rest] = compact;
  return [first?.toUpperCase(), second?.toUpperCase(), rest.length ? `/ ${rest.join(', ')}` : '']
    .filter(Boolean)
    .join(', ');
}

function formatCardMeaning(values: string[]) {
  return values
    .flatMap((value) => value.split(/[;,/]/))
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 4)
    .join(', ');
}

function getKanjiCardTextStyle(
  baseStyle: StyleProp<TextStyle>,
  value: string,
  singleSize: number,
  compactSize: number,
): StyleProp<TextStyle> {
  return [baseStyle, value.length <= 1 ? { fontSize: singleSize } : { fontSize: compactSize }];
}

type VocabularyCardFilter = 'all' | 'favorites' | 'review';

export function VocabularyScreen() {
  const db = useSQLiteContext();
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [kanjiItems, setKanjiItems] = useState<KanjiItem[]>([]);
  const [query, setQuery] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [n5Count, setN5Count] = useState(0);
  const [scope, setScope] = useState<VocabularyScope>('n5');
  const [viewMode, setViewMode] = useState<VocabularyViewMode>('cards');
  const [flippedIds, setFlippedIds] = useState<Set<string>>(new Set());
  const [selectedVocabularyTheme, setSelectedVocabularyTheme] = useState<string | null>(null);
  const [cardFilter, setCardFilter] = useState<VocabularyCardFilter>('all');
  const [cardStates, setCardStates] = useState<Record<string, VocabularyCardState>>({});
  const [preferences, setPreferences] = useState<LearningPreferences>(DEFAULT_LEARNING_PREFERENCES);

  useEffect(() => {
    let mounted = true;
    Promise.all([loadVocabularyItems(db), loadKanjiItems(db), loadVocabularyCardStates(db), loadLearningPreferences(db)])
      .then(([{ rows, total, n5 }, kanjiRows, stateRows, loadedPreferences]) => {
        if (!mounted) return;
        setTotalCount(total);
        setN5Count(n5);
        setItems(rows.map((row) => ({ ...row, category: getVocabularyCategory(row) })));
        setKanjiItems(kanjiRows);
        setCardStates(indexVocabularyCardStates(stateRows));
        setPreferences(loadedPreferences);
      })
      .catch((error) => {
        console.error('Unable to load vocabulary', error);
        if (mounted) {
        setTotalCount(0);
        setItems([]);
        setKanjiItems([]);
        setCardStates({});
      }
      });
    return () => {
      mounted = false;
    };
  }, [db]);

  const scopedItems = useMemo(() => {
    if (scope === 'all') return items;
    return items.filter((item) => (item.jlpt_level ?? 'N5').toUpperCase() === 'N5');
  }, [items, scope]);

  const vocabularyThemeGroups = useMemo(() => {
    const groups = new Map<string, VocabularyItem[]>();
    items.forEach((item) => {
      const theme = getVocabularyThemeLabel(item);
      const group = groups.get(theme) ?? [];
      group.push(item);
      groups.set(theme, group);
    });
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0], 'fr'));
  }, [items]);

  useEffect(() => {
    if (scope !== 'all') return;
    if (selectedVocabularyTheme && vocabularyThemeGroups.some(([theme]) => theme === selectedVocabularyTheme)) return;
    setSelectedVocabularyTheme(vocabularyThemeGroups[0]?.[0] ?? null);
  }, [scope, selectedVocabularyTheme, vocabularyThemeGroups]);

  const genericThemeItems = useMemo(() => {
    if (scope !== 'all' || !selectedVocabularyTheme) return scopedItems;
    return scopedItems.filter((item) => getVocabularyThemeLabel(item) === selectedVocabularyTheme);
  }, [scope, scopedItems, selectedVocabularyTheme]);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const baseItems = scope === 'all' ? genericThemeItems : scopedItems;
    if (!normalized) return baseItems;
    return baseItems.filter((item) =>
      `${item.japanese} ${item.kana ?? ''} ${item.kanji ?? ''} ${item.romaji ?? ''} ${item.meaning_fr}`
        .toLowerCase()
        .includes(normalized)
    );
  }, [genericThemeItems, scopedItems, query, scope]);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, VocabularyItem[]>();
    filteredItems.forEach((item) => {
      const group = groups.get(item.category) ?? [];
      group.push(item);
      groups.set(item.category, group);
    });
    return Array.from(groups.entries());
  }, [filteredItems]);

  const scopedKanjiItems = useMemo(() => {
    if (scope === 'all') return kanjiItems;
    return kanjiItems.filter((item) => item.jlpt_level.toUpperCase() === 'N5');
  }, [kanjiItems, scope]);

  const deckItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const cards = buildVocabularyCards(scopedItems, scopedKanjiItems).filter((card) => !!card.kanji);
    const filteredCards = normalized
      ? cards.filter((card) => getVocabularyCardSearchText(card).includes(normalized))
      : cards;
    return filterVocabularyCards(filteredCards, cardStates, cardFilter).slice(0, 80);
  }, [query, scopedItems, scopedKanjiItems, cardFilter, cardStates]);

  const genericDeckItems = useMemo(
    () => filterGenericVocabularyCards(filteredItems, cardStates, cardFilter).slice(0, 160),
    [filteredItems, cardStates, cardFilter]
  );

  const smartCardStats = useMemo(() => {
    const allCardIds =
      scope === 'n5'
        ? buildVocabularyCards(scopedItems, scopedKanjiItems).filter((card) => !!card.kanji).map((card) => card.id)
        : filteredItems.map((item) => item.id);
    return allCardIds.reduce(
      (acc, id) => {
        const state = cardStates[id];
        if (state?.favorite) acc.favorites += 1;
        if (state?.review) acc.review += 1;
        return acc;
      },
      { total: allCardIds.length, favorites: 0, review: 0 }
    );
  }, [scope, scopedItems, scopedKanjiItems, filteredItems, cardStates]);

  const toggleVocabularyCard = (id: string) => {
    setFlippedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    recordVocabularyCardSeen(db, id).catch((error) => console.error('Unable to record vocabulary card seen', error));
  };

  const toggleCardFlag = async (id: string, flag: 'favorite' | 'review') => {
    const current = cardStates[id];
    const nextValue = !(flag === 'favorite' ? current?.favorite : current?.review);
    setCardStates((states) => ({
      ...states,
      [id]: {
        card_id: id,
        favorite: flag === 'favorite' ? (nextValue ? 1 : 0) : current?.favorite ?? 0,
        review: flag === 'review' ? (nextValue ? 1 : 0) : current?.review ?? 0,
        seen_count: current?.seen_count ?? 0,
        updated_at: new Date().toISOString(),
      },
    }));
    await updateVocabularyCardFlag(db, id, flag, nextValue);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.grammarHero}>
        <View style={styles.grammarHeroText}>
          <Text style={styles.grammarKicker}>語彙 N5</Text>
          <Text style={styles.grammarTitle}>Vocabulaire</Text>
          <Text style={styles.grammarSubtitle}>
            Cartes de mémorisation, kanji, kana, romaji et français. Clique sur une carte pour la retourner.
          </Text>
        </View>
        <View style={styles.grammarHeroBadge}>
          <Text style={styles.grammarHeroBadgeValue}>{scope === 'n5' ? n5Count : totalCount}</Text>
          <Text style={styles.grammarHeroBadgeText}>mots</Text>
        </View>
      </View>

      <View style={styles.segmented}>
        <SegmentButton label="JLPT N5" active={scope === 'n5'} onPress={() => setScope('n5')} />
        <SegmentButton label="Tout vocabulaire" active={scope === 'all'} onPress={() => setScope('all')} />
      </View>

      <View style={styles.segmented}>
        <SegmentButton label="Flashcards" active={viewMode === 'cards'} onPress={() => setViewMode('cards')} />
        <SegmentButton label="Liste" active={viewMode === 'list'} onPress={() => setViewMode('list')} />
      </View>

      {viewMode === 'cards' && (
        <View style={styles.segmented}>
          <SegmentButton label={`Toutes ${smartCardStats.total}`} active={cardFilter === 'all'} onPress={() => setCardFilter('all')} />
          <SegmentButton label={`Favoris ${smartCardStats.favorites}`} active={cardFilter === 'favorites'} onPress={() => setCardFilter('favorites')} />
          <SegmentButton label={`A revoir ${smartCardStats.review}`} active={cardFilter === 'review'} onPress={() => setCardFilter('review')} />
        </View>
      )}

      <View style={styles.grammarStatsRow}>
        <Metric label="En base" value={totalCount} />
        <Metric label="N5" value={n5Count} />
        <Metric label="Kanji" value={scopedKanjiItems.length} />
        <Metric label="Affichés" value={filteredItems.length} />
      </View>

      {scope === 'all' && (
        <Section title="Dossiers par thème">
          <View style={styles.vocabularyThemeGrid}>
            {vocabularyThemeGroups.map(([theme, words]) => (
              <Pressable
                key={theme}
                onPress={() => setSelectedVocabularyTheme(theme)}
                style={[
                  styles.vocabularyThemeCard,
                  selectedVocabularyTheme === theme && styles.vocabularyThemeCardActive,
                ]}
              >
                <GenericVocabularyIllustration
                  item={words[0]}
                  size={54}
                  muted={selectedVocabularyTheme !== theme}
                />
                <View style={styles.vocabularyThemeTextBlock}>
                  <Text
                    numberOfLines={2}
                    style={[
                      styles.vocabularyThemeTitle,
                      selectedVocabularyTheme === theme && styles.vocabularyThemeTitleActive,
                    ]}
                  >
                    {theme}
                  </Text>
                  <Text
                    style={[
                      styles.vocabularyThemeCount,
                      selectedVocabularyTheme === theme && styles.vocabularyThemeCountActive,
                    ]}
                  >
                    {words.length} cartes
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </Section>
      )}

      <Section title={scope === 'n5' ? 'Recherche vocabulaire N5' : `Recherche · ${selectedVocabularyTheme ?? 'Tout vocabulaire'}`}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Rechercher japonais, kana, romaji ou français"
          style={styles.vocabularySearchInput}
        />
      </Section>

      {groupedItems.length === 0 ? (
        <EmptyState title="Aucun mot trouvé" />
      ) : viewMode === 'cards' ? (
        <Section title={scope === 'n5' ? 'Flashcards JLPT N5' : `Flashcards · ${selectedVocabularyTheme ?? 'Tout vocabulaire'}`}>
          <Text style={styles.quizConfigText}>
            {scope === 'n5'
              ? 'Format carte physique : recto pour reconnaître le kanji, verso pour vérifier les lectures et les mots liés.'
              : 'Chaque carte montre le mot au recto. Au verso, le dessin représente le mot, avec lecture et traduction.'}
          </Text>
          <View style={styles.vocabularyDeckGrid}>
            {scope === 'n5'
              ? deckItems.map((item, index) => (
                  <VocabularySmartCardShell
                    key={item.id}
                    favorite={!!cardStates[item.id]?.favorite}
                    review={!!cardStates[item.id]?.review}
                    seenCount={cardStates[item.id]?.seen_count ?? 0}
                    onToggleFavorite={() => toggleCardFlag(item.id, 'favorite')}
                    onToggleReview={() => toggleCardFlag(item.id, 'review')}
                  >
                    <VocabularyFlashCard
                      card={item}
                      index={index}
                      flipped={flippedIds.has(item.id)}
                      showRomaji={preferences.showRomaji}
                      onPress={() => toggleVocabularyCard(item.id)}
                    />
                  </VocabularySmartCardShell>
                ))
              : genericDeckItems.map((item, index) => (
                  <VocabularySmartCardShell
                    key={item.id}
                    favorite={!!cardStates[item.id]?.favorite}
                    review={!!cardStates[item.id]?.review}
                    seenCount={cardStates[item.id]?.seen_count ?? 0}
                    onToggleFavorite={() => toggleCardFlag(item.id, 'favorite')}
                    onToggleReview={() => toggleCardFlag(item.id, 'review')}
                  >
                    <GenericVocabularyFlashCard
                      item={item}
                      index={index}
                      flipped={flippedIds.has(item.id)}
                      showRomaji={preferences.showRomaji}
                      onPress={() => toggleVocabularyCard(item.id)}
                    />
                  </VocabularySmartCardShell>
                ))}
          </View>
        </Section>
      ) : (
        groupedItems.map(([category, words]) => (
          <Section key={category} title={category}>
            <View style={styles.grammarLessonList}>
              {words.slice(0, 40).map((item) => (
                <View key={item.id} style={styles.grammarLessonRow}>
                  <Text style={styles.grammarLessonNumber}>語</Text>
                  <View style={styles.grammarLessonRowBody}>
                    <Text style={styles.grammarLessonTitle}>{item.kanji || item.japanese}</Text>
                    <Text style={styles.grammarLessonPattern}>
                      {[item.kana, preferences.showRomaji ? item.romaji : null].filter(Boolean).join(' / ')}
                    </Text>
                    <Text style={styles.quizConfigText}>{item.meaning_fr}</Text>
                  </View>
                </View>
              ))}
            </View>
          </Section>
        ))
      )}
    </ScrollView>
  );
}

function VocabularyFlashCard({
  card,
  index: _index,
  flipped,
  showRomaji,
  onPress,
}: {
  card: VocabularyCardData;
  index: number;
  flipped: boolean;
  showRomaji: boolean;
  onPress: () => void;
}) {
  const mainText = card.root;
  const primary = card.primary;
  const romajiText = showRomaji ? formatCardReading(card.readings.length ? card.readings : [primary.romaji ?? '']) : '';
  const meaningText = formatCardMeaning(card.meanings.length ? card.meanings : [primary.meaning_fr]) || 'sens';
  const onyomiText = getCompactReading(card.kanji?.onyomi);
  const kunyomiText = getCompactReading(card.kanji?.kunyomi || card.kanji?.n5_readings || primary.kana || primary.japanese);

  return (
    <Pressable
      onPress={onPress}
      style={[styles.vocabularyFlashCard, flipped && styles.vocabularyFlashCardBack]}
    >
      {!flipped ? (
        <>
          <View style={styles.vocabCardFrontCenter}>
            <Text numberOfLines={1} style={getKanjiCardTextStyle(styles.vocabCardMain, mainText, 104, 82)}>
              {mainText}
            </Text>
          </View>
        </>
      ) : (
        <>
          <View style={styles.vocabCardCenter}>
            <Text numberOfLines={1} style={getKanjiCardTextStyle(styles.vocabCardBackKanji, mainText, 46, 38)}>
              {mainText}
            </Text>
            {showRomaji && (
              <Text numberOfLines={3} style={styles.vocabCardReading}>
                {romajiText}
              </Text>
            )}
            <Text numberOfLines={5} style={styles.vocabCardMeaning}>
              {meaningText}
            </Text>
          </View>
          <View style={styles.vocabCardBottomRow}>
            <Text numberOfLines={3} style={styles.vocabCardSmall}>
              {onyomiText}
            </Text>
            <Text numberOfLines={3} style={styles.vocabCardSmallRight}>
              {kunyomiText}
            </Text>
          </View>
        </>
      )}
    </Pressable>
  );
}

function VocabularySmartCardShell({
  children,
  favorite,
  review,
  seenCount,
  onToggleFavorite,
  onToggleReview,
}: {
  children: ReactNode;
  favorite: boolean;
  review: boolean;
  seenCount: number;
  onToggleFavorite: () => void;
  onToggleReview: () => void;
}) {
  return (
    <View style={styles.vocabSmartCardShell}>
      {children}
      <View style={styles.vocabSmartCardActions}>
        <Pressable
          onPress={onToggleFavorite}
          style={[styles.vocabSmartActionButton, favorite && styles.vocabSmartActionButtonActive]}
        >
          <Text style={[styles.vocabSmartActionText, favorite && styles.vocabSmartActionTextActive]}>
            {favorite ? 'Favori' : 'Favori'}
          </Text>
        </Pressable>
        <Pressable
          onPress={onToggleReview}
          style={[styles.vocabSmartActionButton, review && styles.vocabSmartActionButtonReview]}
        >
          <Text style={[styles.vocabSmartActionText, review && styles.vocabSmartActionTextActive]}>
            {review ? 'A revoir' : 'Revoir'}
          </Text>
        </Pressable>
      </View>
      <Text style={styles.vocabSmartSeenText}>{seenCount} vue{seenCount > 1 ? 's' : ''}</Text>
    </View>
  );
}

function GenericVocabularyFlashCard({
  item,
  index,
  flipped,
  showRomaji,
  onPress,
}: {
  item: VocabularyItem;
  index: number;
  flipped: boolean;
  showRomaji: boolean;
  onPress: () => void;
}) {
  const mainText = getVocabularyMainText(item);
  const reading = [item.kana, showRomaji ? item.romaji : null].filter(Boolean).join(' / ') || 'lecture a completer';
  const theme = getVocabularyThemeLabel(item);

  return (
    <Pressable
      onPress={onPress}
      style={[styles.genericVocabCard, flipped && styles.genericVocabCardBack]}
    >
      {!flipped ? (
        <>
          <View style={styles.genericVocabTopRow}>
            <Text style={styles.genericVocabPill}>語 {index + 1}</Text>
            <Text numberOfLines={1} style={styles.genericVocabTheme}>{theme}</Text>
          </View>
          <View style={styles.genericVocabFrontCenter}>
            <Text adjustsFontSizeToFit numberOfLines={1} style={styles.genericVocabMain}>
              {mainText}
            </Text>
            {!!item.kana && item.kana !== mainText && (
              <Text numberOfLines={1} style={styles.genericVocabKana}>{item.kana}</Text>
            )}
          </View>
          <Text numberOfLines={1} style={styles.genericVocabHint}>toucher pour révéler</Text>
        </>
      ) : (
        <>
          <View style={styles.genericVocabIllustrationLayer}>
            <GenericVocabularyIllustration item={item} size={178} />
          </View>
          <View style={styles.genericVocabBackOverlay} />
          <View style={styles.genericVocabTopRow}>
            <Text style={styles.genericVocabPillDark}>{mainText}</Text>
            <Text numberOfLines={1} style={styles.genericVocabThemeDark}>{theme}</Text>
          </View>
          <View style={styles.genericVocabBackCenter}>
            <Text numberOfLines={2} adjustsFontSizeToFit style={styles.genericVocabMeaning}>
              {item.meaning_fr}
            </Text>
            <Text numberOfLines={2} style={styles.genericVocabReading}>{reading}</Text>
          </View>
          <Text numberOfLines={1} style={styles.genericVocabHintDark}>
            {item.part_of_speech || 'vocabulaire'}
          </Text>
        </>
      )}
    </Pressable>
  );
}

function GenericVocabularyIllustration({
  item,
  size,
  muted = false,
}: {
  item: VocabularyItem;
  size: number;
  muted?: boolean;
}) {
  const visual = getVocabularyVisual(item);
  const opacity = muted ? 0.52 : 1;
  const symbolSize = size * 0.32;
  return (
    <View style={{ height: size, width: size, opacity }}>
      <Svg width={size} height={size} viewBox="0 0 120 120">
        <Defs>
          <LinearGradient id={`vocabGrad-${visual.kind}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={visual.colors[0]} stopOpacity="1" />
            <Stop offset="1" stopColor={visual.colors[1]} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect x="4" y="4" width="112" height="112" rx="22" fill={`url(#vocabGrad-${visual.kind})`} />
        <Circle cx="92" cy="22" r="18" fill="#FFFFFF" opacity="0.25" />
        <Circle cx="26" cy="92" r="20" fill="#FFFFFF" opacity="0.18" />
        {renderVocabularyVisualShape(visual.kind)}
        <SvgText
          x="60"
          y="72"
          fill="#FFFFFF"
          fontSize={symbolSize}
          fontWeight="900"
          textAnchor="middle"
          opacity="0.95"
        >
          {visual.symbol}
        </SvgText>
      </Svg>
    </View>
  );
}

function indexVocabularyCardStates(rows: VocabularyCardState[]): Record<string, VocabularyCardState> {
  return rows.reduce<Record<string, VocabularyCardState>>((acc, row) => {
    acc[row.card_id] = row;
    return acc;
  }, {});
}

function filterVocabularyCards(
  cards: VocabularyCardData[],
  states: Record<string, VocabularyCardState>,
  filter: VocabularyCardFilter
): VocabularyCardData[] {
  if (filter === 'all') return cards;
  return cards.filter((card) => {
    const state = states[card.id];
    return filter === 'favorites' ? !!state?.favorite : !!state?.review;
  });
}

function filterGenericVocabularyCards(
  items: VocabularyItem[],
  states: Record<string, VocabularyCardState>,
  filter: VocabularyCardFilter
): VocabularyItem[] {
  if (filter === 'all') return items;
  return items.filter((item) => {
    const state = states[item.id];
    return filter === 'favorites' ? !!state?.favorite : !!state?.review;
  });
}

function getVocabularyVisual(item: VocabularyItem): { kind: string; symbol: string; colors: [string, string] } {
  const text = `${getVocabularyThemeLabel(item)} ${item.japanese} ${item.kana ?? ''} ${item.kanji ?? ''} ${item.meaning_fr}`.toLowerCase();
  if (/chat|chien|oiseau|poisson|animal|çŒ«|çŠ¬|é³¥|é­š/.test(text)) return { kind: 'animal', symbol: 'ç”Ÿ', colors: ['#4BAE7F', '#1F7A68'] };
  if (/eau|thÃ©|riz|pain|viande|poisson|manger|boire|nourriture|é£Ÿ|é£²|æ°´|èŒ¶|è‚‰|é­š|ç±³|ãƒ‘ãƒ³/.test(text)) return { kind: 'food', symbol: 'é£Ÿ', colors: ['#F08A4B', '#C83543'] };
  if (/mÃ¨re|pÃ¨re|frÃ¨re|sÅ“ur|famille|ami|personne|çˆ¶|æ¯|å…„|å§‰|å¼Ÿ|å¦¹|å‹|äºº/.test(text)) return { kind: 'family', symbol: 'äºº', colors: ['#E85D75', '#9A4DAD'] };
  if (/Ã©cole|Ã©tude|livre|crayon|professeur|Ã©tudiant|å­¦æ ¡|å­¦|æœ¬|æ›¸|å…ˆç”Ÿ|å­¦ç”Ÿ|é‰›ç­†/.test(text)) return { kind: 'study', symbol: 'å­¦', colors: ['#4F8CC9', '#1B5E8C'] };
  if (/gare|train|voiture|route|aller|venir|rentrer|dÃ©placement|é§…|é›»è»Š|è»Š|é“|è¡Œ|æ¥|å¸°/.test(text)) return { kind: 'transport', symbol: 'è»Š', colors: ['#2D7DD2', '#143D73'] };
  if (/jour|mois|annÃ©e|heure|temps|matin|soir|hier|demain|ä»Šæ—¥|æ˜Žæ—¥|æ˜¨æ—¥|æ™‚|åˆ†|æœˆ|æ—¥|å¹´/.test(text)) return { kind: 'time', symbol: 'æ™‚', colors: ['#F6C85F', '#D7891B'] };
  if (/montagne|riviÃ¨re|pluie|feu|ciel|arbre|nature|å±±|å·|é›¨|ç«|æ°´|å¤©|æœ¨/.test(text)) return { kind: 'nature', symbol: 'å±±', colors: ['#52A66B', '#28745C'] };
  if (/rouge|bleu|blanc|noir|couleur|èµ¤|é’|ç™½|é»’/.test(text)) return { kind: 'color', symbol: 'è‰²', colors: ['#F05A5A', '#4666D8'] };
  if (/grand|petit|nouveau|ancien|cher|haut|long|å¤§|å°|æ–°|å¤|é«˜|é•·/.test(text)) return { kind: 'description', symbol: 'å½¢', colors: ['#A77BD8', '#5C4BB2'] };
  if (/main|pied|tÃªte|Å“il|oreille|bouche|corps|æ‰‹|è¶³|é ­|ç›®|è€³|å£|ä½“/.test(text)) return { kind: 'body', symbol: 'æ‰‹', colors: ['#E0A95C', '#B45A3C'] };
  if (/yen|argent|acheter|magasin|å††|é‡‘|è²·|åº—/.test(text)) return { kind: 'money', symbol: 'å††', colors: ['#E6C84F', '#8F7A17'] };
  if (/bonjour|merci|pardon|expression|salut|ã“ã‚“ã«ã¡ã¯|ã‚ã‚ŠãŒã¨ã†|ã™ã¿ã¾ã›ã‚“/.test(text)) return { kind: 'expression', symbol: 'ä¼š', colors: ['#47B8A8', '#186B63'] };
  if (/verbe|faire|voir|Ã©couter|lire|parler|Ã©crire|è¦‹|èž|èª­|è©±|æ›¸|ã™ã‚‹/.test(text)) return { kind: 'action', symbol: 'å‹•', colors: ['#D86F45', '#A8324B'] };
  return { kind: 'object', symbol: 'èªž', colors: ['#325B67', '#152B3A'] };
}

function renderVocabularyVisualShape(kind: string): ReactNode {
  if (kind === 'food') {
    return (
      <G opacity="0.86">
        <Circle cx="60" cy="58" r="30" fill="#FFF6DA" />
        <Circle cx="52" cy="52" r="5" fill="#D94B3D" />
        <Circle cx="69" cy="60" r="5" fill="#2F8A50" />
        <Path d="M28 87 C46 98 74 98 92 87" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" />
      </G>
    );
  }
  if (kind === 'transport') {
    return (
      <G opacity="0.9">
        <Rect x="28" y="42" width="64" height="35" rx="10" fill="#FFFFFF" />
        <Rect x="37" y="49" width="18" height="12" rx="3" fill="#8CC7F4" />
        <Rect x="64" y="49" width="18" height="12" rx="3" fill="#8CC7F4" />
        <Circle cx="43" cy="82" r="7" fill="#152B3A" />
        <Circle cx="77" cy="82" r="7" fill="#152B3A" />
      </G>
    );
  }
  if (kind === 'time') {
    return (
      <G opacity="0.9">
        <Circle cx="60" cy="58" r="34" fill="#FFFFFF" />
        <Line x1="60" y1="58" x2="60" y2="35" stroke="#152B3A" strokeWidth="6" strokeLinecap="round" />
        <Line x1="60" y1="58" x2="79" y2="67" stroke="#152B3A" strokeWidth="6" strokeLinecap="round" />
      </G>
    );
  }
  if (kind === 'nature') {
    return (
      <G opacity="0.9">
        <Path d="M18 86 L46 42 L65 86 Z" fill="#FFFFFF" />
        <Path d="M48 86 L78 35 L105 86 Z" fill="#E8FFF4" />
        <Circle cx="88" cy="28" r="10" fill="#FFEFA6" />
      </G>
    );
  }
  if (kind === 'family' || kind === 'animal') {
    return (
      <G opacity="0.88">
        <Circle cx="47" cy="50" r="15" fill="#FFFFFF" />
        <Circle cx="75" cy="50" r="15" fill="#FFF1D6" />
        <Path d="M25 91 C34 72 52 72 60 91" fill="#FFFFFF" />
        <Path d="M60 91 C68 72 86 72 95 91" fill="#FFF1D6" />
      </G>
    );
  }
  if (kind === 'study') {
    return (
      <G opacity="0.9">
        <Path d="M29 36 H82 C88 36 93 41 93 47 V88 H39 C33 88 29 84 29 78 Z" fill="#FFFFFF" />
        <Path d="M39 36 V88" stroke="#4F8CC9" strokeWidth="5" />
        <Line x1="49" y1="52" x2="82" y2="52" stroke="#152B3A" strokeWidth="4" strokeLinecap="round" />
        <Line x1="49" y1="65" x2="76" y2="65" stroke="#152B3A" strokeWidth="4" strokeLinecap="round" />
      </G>
    );
  }
  return (
    <G opacity="0.86">
      <Rect x="30" y="34" width="60" height="60" rx="14" fill="#FFFFFF" />
      <Circle cx="45" cy="49" r="7" fill="#F6C85F" />
      <Path d="M38 82 L55 63 L66 75 L76 58 L89 82 Z" fill="#8FD6C7" />
    </G>
  );
}

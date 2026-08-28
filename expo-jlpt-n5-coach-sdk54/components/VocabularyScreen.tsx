import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Modal, PanResponder, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { styles } from '../appStyles';
import type { LearningPreferences, VocabularyCardData, VocabularyItem, VocabularyScope, VocabularyViewMode } from '../models';
import {
  getVocabularyCategory,
  getVocabularyMainText,
  getVocabularyThemeLabel,
  curateVocabularyLearningItems,
  loadVocabularyCardStates,
  loadVocabularyItems,
  recordVocabularyCardSeen,
  sanitizeRomaji,
  updateVocabularyCardFlag,
  type VocabularyCardState,
} from '../services/vocabulary';
import { DEFAULT_LEARNING_PREFERENCES, loadLearningPreferences } from '../services/preferences';
import type { KanjiDetail } from '../services/kanjiComponents';
import { EmptyState, Metric, Section } from './sharedUi';
import { SegmentButton } from './formControls';
import { OfflineAudioButton } from './OfflineAudioButton';
import { KANJI_READING_CARDS } from '../data/kanjiReadingCards';
import { getMasteryColorToken, loadMasteryMap, masteryKey, summarizeMastery, type MasteryView } from '../services/mastery';
import { getVocabularyLearningMeta, type VocabularyAttribute } from '../services/vocabularyLearning';
import { DomainProgressHeader } from './DomainProgressHeader';
import { VOCABULARY_ANTONYM_PAIRS } from '../data/vocabularyAntonyms';
import { shuffle } from '../services/random';

type VocabularyCardFilter = 'learn' | 'review' | 'known' | 'all' | 'favorites';
const CARD_PAGE_SIZE = 24;

export function VocabularyScreen() {
  const db = useSQLiteContext();
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [query, setQuery] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [n5Count, setN5Count] = useState(0);
  const [scope, setScope] = useState<VocabularyScope>('n5');
  const [viewMode, setViewMode] = useState<VocabularyViewMode>('cards');
  const [flippedIds, setFlippedIds] = useState<Set<string>>(new Set());
  const [selectedVocabularyTheme, setSelectedVocabularyTheme] = useState<string | null>(null);
  const [cardFilter, setCardFilter] = useState<VocabularyCardFilter>('learn');
  const [cardStates, setCardStates] = useState<Record<string, VocabularyCardState>>({});
  const [masteryById, setMasteryById] = useState<Record<string, MasteryView>>({});
  const [preferences, setPreferences] = useState<LearningPreferences>(DEFAULT_LEARNING_PREFERENCES);
  const [cardPage, setCardPage] = useState(0);
  const [detailItem, setDetailItem] = useState<VocabularyItem | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([loadVocabularyItems(db), loadVocabularyCardStates(db), loadLearningPreferences(db)])
      .then(([{ rows, total, n5 }, stateRows, loadedPreferences]) => {
        if (!mounted) return;
        setTotalCount(total);
        setN5Count(n5);
        setItems(rows.map((row) => ({ ...row, category: getVocabularyCategory(row) })));
        setCardStates(indexVocabularyCardStates(stateRows));
        setPreferences(loadedPreferences);
      })
      .catch((error) => {
        console.error('Unable to load vocabulary', error);
        if (mounted) {
        setTotalCount(0);
        setItems([]);
        setCardStates({});
      }
      });
    return () => {
      mounted = false;
    };
  }, [db]);

  useEffect(() => {
    let mounted = true;
    const refs = items.map((item) => ({ itemId: item.id, itemType: 'vocabulary' as const }));
    loadMasteryMap(db, refs)
      .then((views) => {
        if (!mounted) return;
        setMasteryById(items.reduce<Record<string, MasteryView>>((acc, item) => {
          const view = views[masteryKey('vocabulary', item.id)];
          if (view) acc[item.id] = view;
          return acc;
        }, {}));
      })
      .catch((error) => console.error('Unable to load vocabulary mastery', error));
    return () => { mounted = false; };
  }, [db, items]);

  const scopedItems = useMemo(() => {
    const source = scope === 'all' ? items : items.filter((item) => (item.jlpt_level ?? 'N5') === 'N5');
    return curateVocabularyLearningItems(source);
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

  const learningIntentItems = useMemo(
    () => filterVocabularyByMastery(filteredItems, cardStates, masteryById, cardFilter),
    [cardFilter, cardStates, filteredItems, masteryById]
  );

  const groupedItems = useMemo(() => {
    const groups = new Map<string, VocabularyItem[]>();
    learningIntentItems.forEach((item) => {
      const group = groups.get(item.category) ?? [];
      group.push(item);
      groups.set(item.category, group);
    });
    return Array.from(groups.entries());
  }, [learningIntentItems]);

  const genericDeckItems = useMemo(
    () => learningIntentItems,
    [learningIntentItems]
  );

  const smartCardStats = useMemo(() => {
    const allCardIds = filteredItems.map((item) => item.id);
    const flags = allCardIds.reduce(
      (acc, id) => {
        const state = cardStates[id];
        if (state?.favorite) acc.favorites += 1;
        if (state?.review) acc.review += 1;
        return acc;
      },
      { total: allCardIds.length, favorites: 0, review: 0 }
    );
    const mastery = summarizeMastery(allCardIds.map((id) => masteryById[id]).filter((item): item is MasteryView => !!item));
    return { ...flags, ...mastery, review: Math.max(flags.review, mastery.review) };
  }, [filteredItems, cardStates, masteryById]);

  useEffect(() => {
    setCardPage(0);
  }, [scope, viewMode, query, cardFilter, selectedVocabularyTheme]);

  const visibleGenericDeckItems = useMemo(
    () => genericDeckItems.slice(cardPage * CARD_PAGE_SIZE, (cardPage + 1) * CARD_PAGE_SIZE),
    [cardPage, genericDeckItems]
  );
  const activeDeckLength = genericDeckItems.length;
  const cardPageCount = Math.max(1, Math.ceil(activeDeckLength / CARD_PAGE_SIZE));

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
            Une image, un mot japonais et sa traduction pour mémoriser rapidement. Touche une carte pour découvrir sa lecture.
          </Text>
        </View>
        <View style={styles.grammarHeroBadge}>
          <Text style={styles.grammarHeroBadgeValue}>{scope === 'n5' ? n5Count : totalCount}</Text>
          <Text style={styles.grammarHeroBadgeText}>mots</Text>
        </View>
      </View>

      <DomainProgressHeader
        label="Progression Vocabulaire"
        mastered={smartCardStats.mastered}
        total={smartCardStats.total}
        review={smartCardStats.review}
        attempts={Object.values(masteryById).reduce((sum, item) => sum + item.attempts, 0)}
        recommendation={smartCardStats.review ? 'Reprendre les mots dus avant d’en découvrir de nouveaux.' : 'Découvrir le prochain lot de mots N5.'}
        actionLabel={smartCardStats.review ? 'Revoir' : 'Apprendre'}
        onContinue={() => { setViewMode('cards'); setCardFilter(smartCardStats.review ? 'review' : 'learn'); }}
      />

      <View style={styles.segmented}>
        <SegmentButton label="JLPT N5" active={scope === 'n5'} onPress={() => setScope('n5')} />
        <SegmentButton label="Tout vocabulaire" active={scope === 'all'} onPress={() => setScope('all')} />
      </View>

      <View style={styles.segmented}>
        <SegmentButton label="Flashcards" active={viewMode === 'cards'} onPress={() => setViewMode('cards')} />
        <SegmentButton label="Liste" active={viewMode === 'list'} onPress={() => setViewMode('list')} />
        <SegmentButton label="Contraires" active={viewMode === 'antonyms'} onPress={() => setViewMode('antonyms')} />
      </View>

      <View style={styles.segmented}>
        <SegmentButton label={`À apprendre ${smartCardStats.new + smartCardStats.learning}`} active={cardFilter === 'learn'} onPress={() => setCardFilter('learn')} />
        <SegmentButton label={`À revoir ${smartCardStats.review}`} active={cardFilter === 'review'} onPress={() => setCardFilter('review')} />
        <SegmentButton label={`Connus ${smartCardStats.known + smartCardStats.mastered}`} active={cardFilter === 'known'} onPress={() => setCardFilter('known')} />
      </View>
      <View style={styles.segmented}>
        <SegmentButton label={`Tout voir ${smartCardStats.total}`} active={cardFilter === 'all'} onPress={() => setCardFilter('all')} />
        <SegmentButton label={`Favoris ${smartCardStats.favorites}`} active={cardFilter === 'favorites'} onPress={() => setCardFilter('favorites')} />
      </View>

      <View style={styles.grammarStatsRow}>
        <Metric label="En base" value={totalCount} />
        <Metric label="N5" value={n5Count} />
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

      {viewMode === 'antonyms' ? (
        <VocabularyAntonymPractice />
      ) : groupedItems.length === 0 ? (
        <EmptyState title="Aucun mot trouvé" />
      ) : viewMode === 'cards' ? (
        <Section title={scope === 'n5' ? 'Flashcards JLPT N5' : `Flashcards · ${selectedVocabularyTheme ?? 'Tout vocabulaire'}`}>
          <Text style={styles.quizConfigText}>
            Chaque carte associe une image, le mot japonais et sa traduction. Touche-la pour afficher sa lecture et ses détails.
          </Text>
          <View style={styles.vocabularyDeckGrid}>
            {visibleGenericDeckItems.map((item, index) => (
                  <VocabularySmartCardShell
                    key={item.id}
                    favorite={!!cardStates[item.id]?.favorite}
                    review={!!cardStates[item.id]?.review}
                    seenCount={cardStates[item.id]?.seen_count ?? 0}
                    mastery={masteryById[item.id]}
                    onOpenDetail={() => setDetailItem(item)}
                    onToggleFavorite={() => toggleCardFlag(item.id, 'favorite')}
                    onToggleReview={() => toggleCardFlag(item.id, 'review')}
                    audioText={item.kanji || item.japanese}
                  >
                    <GenericVocabularyFlashCard
                      item={item}
                      index={cardPage * CARD_PAGE_SIZE + index}
                      flipped={flippedIds.has(item.id)}
                      showRomaji={preferences.showRomaji}
                      onPress={() => toggleVocabularyCard(item.id)}
                    />
                  </VocabularySmartCardShell>
                ))}
          </View>
          {cardPageCount > 1 && (
            <View style={styles.segmented}>
              <Pressable
                accessibilityLabel="Page de cartes précédente"
                accessibilityRole="button"
                accessibilityState={{ disabled: cardPage === 0 }}
                disabled={cardPage === 0}
                style={[styles.segmentButton, cardPage === 0 && styles.primaryButtonDisabled]}
                onPress={() => setCardPage((page) => Math.max(0, page - 1))}
              >
                <Text style={styles.segmentText}>Précédent</Text>
              </Pressable>
              <View style={styles.segmentButton}>
                <Text style={styles.segmentText}>{cardPage + 1}/{cardPageCount}</Text>
              </View>
              <Pressable
                accessibilityLabel="Page de cartes suivante"
                accessibilityRole="button"
                accessibilityState={{ disabled: cardPage >= cardPageCount - 1 }}
                disabled={cardPage >= cardPageCount - 1}
                style={[styles.segmentButton, cardPage >= cardPageCount - 1 && styles.primaryButtonDisabled]}
                onPress={() => setCardPage((page) => Math.min(cardPageCount - 1, page + 1))}
              >
                <Text style={styles.segmentText}>Suivant</Text>
              </Pressable>
            </View>
          )}
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
      <VocabularyLearningDetailModal item={detailItem} onClose={() => setDetailItem(null)} />
    </ScrollView>
  );
}

function VocabularyAntonymPractice() {
  const [round, setRound] = useState(0);
  const [selected, setSelected] = useState('');
  const [score, setScore] = useState(0);
  const pair = VOCABULARY_ANTONYM_PAIRS[round % VOCABULARY_ANTONYM_PAIRS.length];
  const reverse = round % 2 === 1;
  const prompt = reverse ? pair.right : pair.left;
  const expected = reverse ? pair.left : pair.right;
  const choices = useMemo(() => shuffle([
    expected.japanese,
    ...shuffle(VOCABULARY_ANTONYM_PAIRS.filter((item) => item.id !== pair.id).map((item) => item[round % 4 < 2 ? 'left' : 'right'].japanese)).slice(0, 3),
  ]), [pair.id, round]);

  return (
    <Section title="Entraînement aux contraires">
      <View style={styles.quizConfigCard}>
        <Text style={styles.quizConfigMode}>Paire {round + 1} · Score {score}</Text>
        <Text style={styles.questionTitle}>Quel est le contraire de ce mot ?</Text>
        <Text style={styles.kanaExercisePrompt}>{prompt.japanese}</Text>
        <Text style={styles.quizConfigText}>{prompt.kana} · {prompt.romaji} · {prompt.french}</Text>
        <OfflineAudioButton text={prompt.japanese} label="Écouter" />
      </View>
      <View style={styles.choiceList}>
        {choices.map((choice) => {
          const correct = choice === expected.japanese;
          const chosen = choice === selected;
          return (
            <Pressable
              key={choice}
              disabled={!!selected}
              onPress={() => { setSelected(choice); if (correct) setScore((value) => value + 1); }}
              style={[styles.choice, selected && correct && styles.choiceCorrect, selected && chosen && !correct && styles.choiceWrong]}
            >
              <Text style={styles.choiceText}>{choice}</Text>
            </Pressable>
          );
        })}
      </View>
      {!!selected && (
        <View style={styles.feedback}>
          <Text style={styles.feedbackTitle}>{selected === expected.japanese ? 'Correct' : 'À revoir'}</Text>
          <Text style={styles.feedbackText}>
            {prompt.japanese} ({prompt.romaji}, {prompt.french}) s’oppose à {expected.japanese} ({expected.romaji}, {expected.french}).
          </Text>
          <OfflineAudioButton text={expected.japanese} label="Écouter le contraire" />
          <Pressable style={styles.primaryButton} onPress={() => { setSelected(''); setRound((value) => value + 1); }}>
            <Text style={styles.primaryButtonText}>Contraste suivant</Text>
          </Pressable>
        </View>
      )}
    </Section>
  );
}

function VocabularyLearningDetailModal({ item, onClose }: { item: VocabularyItem | null; onClose: () => void }) {
  const [selectedAttribute, setSelectedAttribute] = useState<VocabularyAttribute | null>(null);
  useEffect(() => { setSelectedAttribute(null); }, [item?.id]);
  if (!item) return null;
  const meta = getVocabularyLearningMeta(item);
  const mainText = getVocabularyMainText(item);
  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={styles.vocabDetailScreen}>
        <View style={styles.vocabDetailHeader}><View><Text style={styles.vocabDetailKicker}>語 · FICHE DU MOT</Text><Text style={styles.vocabDetailHeaderTitle}>{mainText}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Fermer la fiche" onPress={onClose} style={styles.vocabDetailClose}><Text style={styles.vocabDetailCloseText}>×</Text></Pressable></View>
        <ScrollView contentContainerStyle={styles.vocabDetailContent}>
          <View style={styles.vocabDetailHero}><GenericVocabularyIllustration item={item} size={132} /><View style={styles.vocabDetailHeroCopy}><Text adjustsFontSizeToFit numberOfLines={1} style={styles.vocabDetailJapanese}>{mainText}</Text><Text style={styles.vocabDetailReading}>{item.kana || item.japanese}</Text><Text style={styles.vocabDetailMeaning}>{item.meaning_fr}</Text><OfflineAudioButton text={mainText} label="Écouter" /></View></View>
          <Text style={styles.vocabDetailSectionLabel}>Nature et attributs</Text>
          <Text style={styles.vocabDetailPartOfSpeech}>{meta.partOfSpeech}</Text>
          <View style={styles.vocabAttributeRow}>{meta.attributes.map((attribute) => <Pressable key={attribute.id} onPress={() => setSelectedAttribute(selectedAttribute?.id === attribute.id ? null : attribute)} style={[styles.vocabAttributeChip, selectedAttribute?.id === attribute.id && styles.vocabAttributeChipActive]}><Text style={[styles.vocabAttributeChipText, selectedAttribute?.id === attribute.id && styles.vocabAttributeChipTextActive]}>{attribute.label}</Text></Pressable>)}</View>
          {selectedAttribute && <View style={styles.vocabAttributeExplanation}><Text style={styles.vocabAttributeExplanationTitle}>{selectedAttribute.label}</Text><Text style={styles.vocabAttributeExplanationText}>{selectedAttribute.explanation}</Text></View>}
          <Text style={styles.vocabDetailSectionLabel}>Exemple N5</Text>
          {meta.example && <View style={styles.vocabExamplePanel}><Text style={styles.vocabExampleJapanese}>{meta.example.japanese}</Text><Text style={styles.vocabExampleKana}>{meta.example.kana}</Text><Text style={styles.vocabExampleFrench}>{meta.example.french}</Text>{meta.example.usage && <Text style={styles.vocabExampleUsage}>{meta.example.usage}</Text>}</View>}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function KanjiFullscreenViewer({
  cards,
  index,
  flipped,
  onClose,
  onFlip,
  onNext,
  onPrevious,
  onRandom,
}: {
  cards: VocabularyCardData[];
  index: number | null;
  flipped: boolean;
  onClose: () => void;
  onFlip: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onRandom: () => void;
}) {
  const card = index === null ? null : cards[index] ?? null;
  const readingCard = card ? KANJI_READING_CARDS[card.root] : null;
  const panResponder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 24 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.3,
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx < -54) onNext();
        if (gesture.dx > 54) onPrevious();
      },
    }),
    [onNext, onPrevious],
  );

  return (
    <Modal visible={index !== null} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={styles.kanjiViewerScreen}>
        <View style={styles.kanjiViewerHeader}>
          <Pressable accessibilityRole="button" accessibilityLabel="Fermer le plein écran" style={styles.kanjiViewerHeaderButton} onPress={onClose}>
            <Text style={styles.kanjiViewerHeaderButtonText}>Fermer</Text>
          </Pressable>
          <View style={styles.kanjiViewerCounterBlock}>
            <Text style={styles.kanjiViewerCounter}>{card && index !== null ? `${index + 1}/${cards.length}` : `0/${cards.length}`}</Text>
            <Text style={styles.kanjiViewerCounterLabel}>{flipped ? 'Verso détaillé' : 'Recto'}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Carte aléatoire" style={styles.kanjiViewerHeaderButton} onPress={onRandom}>
            <Text style={styles.kanjiViewerHeaderButtonText}>Mélanger</Text>
          </Pressable>
        </View>

        <View style={styles.kanjiViewerStage} {...panResponder.panHandlers}>
          {card && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={flipped ? `Retourner ${card.root} au recto` : `Retourner la carte ${card.root}`}
              style={[styles.kanjiViewerCard, flipped ? styles.kanjiViewerCardBack : styles.kanjiViewerCardFront]}
              onPress={onFlip}
            >
              {!flipped ? (
                <View style={styles.kanjiViewerFrontInner}>
                  <Text adjustsFontSizeToFit numberOfLines={1} style={styles.kanjiViewerFrontKanji}>{card.root}</Text>
                </View>
              ) : (
                <ScrollView
                  nestedScrollEnabled
                  showsVerticalScrollIndicator
                  style={styles.kanjiViewerBackScroll}
                  contentContainerStyle={styles.kanjiViewerBackContent}
                >
                  <View style={styles.kanjiViewerBackTitleRow}>
                    <Text style={styles.kanjiViewerBackKanji}>{card.root}</Text>
                    <Text style={styles.kanjiViewerBackMeaning}>
                      {readingCard?.meaningFr ?? card.kanji?.meaning_fr ?? card.primary.meaning_fr}
                    </Text>
                  </View>
                  {(readingCard?.readings ?? []).map((reading) => (
                    <View key={`${card.root}-viewer-${reading.kana}`} style={styles.kanjiViewerReadingSection}>
                      <View style={styles.kanjiViewerReadingHeader}>
                        <Text style={styles.kanjiViewerReadingKana}>{reading.kana}</Text>
                        <Text style={styles.kanjiViewerReadingRomaji}>{reading.romaji}</Text>
                      </View>
                      <View style={styles.kanjiViewerExampleList}>
                        {reading.examples.map((example) => (
                          <View key={`${reading.kana}-${example.word}-${example.kana}`} style={styles.kanjiViewerExampleRow}>
                            <Text style={styles.kanjiViewerExampleJapanese}>{example.word}（{example.kana}）</Text>
                            <Text style={styles.kanjiViewerExampleTranslation}>{example.romaji} · {example.meaningFr}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </ScrollView>
              )}
            </Pressable>
          )}
        </View>

        <Text style={styles.kanjiViewerHint}>Touche la carte pour la retourner. Glisse horizontalement pour changer de carte.</Text>
        <View style={styles.kanjiViewerActions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Carte kanji précédente" style={styles.kanjiViewerNavButton} onPress={onPrevious}>
            <Text style={styles.kanjiViewerNavText}>‹ Précédente</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Retourner la carte kanji" style={styles.kanjiViewerFlipButton} onPress={onFlip}>
            <Text style={styles.kanjiViewerFlipButtonText}>{flipped ? 'Voir le recto' : 'Voir le verso'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Carte kanji suivante" style={styles.kanjiViewerNavButton} onPress={onNext}>
            <Text style={styles.kanjiViewerNavText}>Suivante ›</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function VocabularyFlashCard({
  card,
  index: _index,
  flipped,
  onPress,
}: {
  card: VocabularyCardData;
  index: number;
  flipped: boolean;
  onPress: () => void;
}) {
  const mainText = card.root;
  const readingCard = KANJI_READING_CARDS[mainText];

  return (
    <Pressable
      onPress={onPress}
      style={[styles.vocabularyFlashCard, flipped && styles.vocabularyFlashCardBack]}
    >
      {!flipped ? (
        <View style={styles.vocabCardFrontCenter}>
          <Text style={styles.vocabCardMain}>{mainText}</Text>
        </View>
      ) : (
        <>
          <View style={styles.vocabKanjiBackHeader}>
            <Text style={styles.vocabCardBackKanji}>{mainText}</Text>
            <Text numberOfLines={2} style={styles.vocabCardMeaning}>
              {readingCard?.meaningFr ?? card.kanji?.meaning_fr ?? card.primary.meaning_fr}
            </Text>
          </View>
          <View style={styles.vocabKanjiReadingList}>
            {(readingCard?.readings ?? []).map((reading) => {
              const example = reading.examples[0];
              return (
                <View key={`${mainText}-${reading.kana}`} style={styles.vocabKanjiReadingRow}>
                  <View style={styles.vocabKanjiReadingHeader}>
                    <Text numberOfLines={1} style={styles.vocabKanjiReadingKana}>{reading.kana}</Text>
                    <Text numberOfLines={1} style={styles.vocabKanjiReadingRomaji}>{reading.romaji}</Text>
                  </View>
                  {!!example && (
                    <>
                      <Text numberOfLines={1} style={styles.vocabKanjiExampleWord}>
                        {example.word}（{example.kana}）
                      </Text>
                      <Text numberOfLines={1} style={styles.vocabKanjiExampleMeaning}>
                        {example.romaji} · {example.meaningFr}
                      </Text>
                    </>
                  )}
                </View>
              );
            })}
          </View>
        </>
      )}
    </Pressable>
  );
}

function VocabularySmartCardShell({
  children,
  favorite,
  wide = false,
  onOpenDetail,
  review,
  seenCount,
  onToggleFavorite,
  onToggleReview,
  audioText,
  mastery,
}: {
  children: ReactNode;
  favorite: boolean;
  wide?: boolean;
  onOpenDetail?: () => void;
  review: boolean;
  seenCount: number;
  onToggleFavorite: () => void;
  onToggleReview: () => void;
  audioText?: string;
  mastery?: MasteryView;
}) {
  return (
    <View style={[styles.vocabSmartCardShell, wide && styles.vocabKanjiSmartCardShell]}>
      {!!mastery && (
        <View
          accessibilityLabel={`Maîtrise : ${mastery.label}`}
          style={[styles.vocabCardMasteryDot, { backgroundColor: getMasteryColorToken(mastery.status) }]}
        />
      )}
      {children}
      <View style={styles.vocabCardCornerActions}>
        {!!audioText && <OfflineAudioButton iconOnly text={audioText} label="Écouter le mot" />}
        {!!onOpenDetail && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Afficher la carte en plein écran"
            onPress={onOpenDetail}
            style={styles.vocabCardIconButton}
          >
            <Text style={styles.vocabCardIconText}>⛶</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function KanjiDetailPanel({ detail, onClose }: { detail: KanjiDetail; onClose: () => void }) {
  const item = detail.item;
  return (
    <View style={styles.aptitudeReportCard}>
      <View style={styles.aptitudeReportHeader}>
        <View>
          <Text style={styles.pathNextLabel}>Détail du kanji</Text>
          <Text style={styles.pathModuleDetailTitle}>{detail.character}</Text>
          <Text style={styles.pathModuleDetailText}>{item.meaning_fr}</Text>
        </View>
        <Pressable style={styles.drawerCloseButton} onPress={onClose}>
          <Text style={styles.drawerCloseText}>×</Text>
        </Pressable>
      </View>

      <View style={styles.aptitudeInsightGrid}>
        <View style={styles.aptitudeInsightCard}>
          <Text style={styles.pathNextLabel}>Composants</Text>
          <Text style={styles.pathRequirementText}>{detail.components.join(' + ')}</Text>
        </View>
        <View style={styles.aptitudeInsightCard}>
          <Text style={styles.pathNextLabel}>Lectures</Text>
          <Text style={styles.pathRequirementText}>
            {[item.n5_readings, item.onyomi, item.kunyomi].filter(Boolean).join(' / ') || 'A reviser'}
          </Text>
        </View>
      </View>

      <View style={styles.pathGuidanceBox}>
        <Text style={styles.pathGuidanceLabel}>Mnemonique</Text>
        <Text style={styles.pathGuidanceText}>{detail.mnemonicFr}</Text>
      </View>

      {!!detail.confusions.length && (
        <View style={styles.pathRequirementList}>
          <View style={styles.pathRequirementItem}>
            <Text style={styles.pathRequirementIndex}>!</Text>
            <Text style={styles.pathRequirementText}>A ne pas confondre avec : {detail.confusions.join(', ')}</Text>
          </View>
        </View>
      )}

      <View style={styles.pathRequirementList}>
        {detail.relatedWords.length ? detail.relatedWords.map((word, index) => (
          <View key={word.id} style={styles.pathRequirementItem}>
            <Text style={styles.pathRequirementIndex}>{index + 1}</Text>
            <Text style={styles.pathRequirementText}>
              {(word.kanji || word.japanese)} {word.kana ? `(${word.kana})` : ''} : {word.meaning_fr}
            </Text>
          </View>
        )) : (
          <View style={styles.pathRequirementItem}>
            <Text style={styles.pathRequirementIndex}>1</Text>
            <Text style={styles.pathRequirementText}>Aucun mot lie trouve dans la base locale pour ce kanji.</Text>
          </View>
        )}
      </View>
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
  const romaji = sanitizeRomaji(item.romaji);
  const reading = [item.kana, showRomaji && romaji ? romaji : null].filter(Boolean).join(' / ') || 'lecture à compléter';
  const theme = getVocabularyThemeLabel(item);

  return (
    <Pressable
      onPress={onPress}
      style={[styles.genericVocabCard, flipped && styles.genericVocabCardBack]}
    >
      {!flipped ? (
        <>
          <View style={styles.genericVocabTopRow}>
            <Text style={styles.genericVocabPill}>N5 · {index + 1}</Text>
            <Text numberOfLines={1} style={styles.genericVocabTheme}>{theme}</Text>
          </View>
          <View style={styles.genericVocabFrontCenter}>
            <GenericVocabularyIllustration item={item} size={104} />
            <View style={styles.genericVocabFrontTextBlock}>
              <Text adjustsFontSizeToFit numberOfLines={1} style={styles.genericVocabMain}>
                {mainText}
              </Text>
              <Text adjustsFontSizeToFit numberOfLines={2} style={styles.genericVocabFrontMeaning}>
                {item.meaning_fr}
              </Text>
            </View>
          </View>
          <Text numberOfLines={1} style={styles.genericVocabHint}>toucher pour la lecture</Text>
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
  const counter = getVocabularyCounterInfo(item);
  if (counter) {
    return (
      <View
        accessible
        accessibilityLabel={`${counter.label}. Exemple : ${counter.exampleJapanese}, ${counter.exampleFrench}`}
        style={[
          styles.genericVocabCounterIllustration,
          { height: size, width: size, opacity: muted ? 0.52 : 1 },
        ]}
      >
        <Text style={[styles.genericVocabCounterLabel, { fontSize: size * 0.105 }]}>COMPTEUR</Text>
        <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.genericVocabCounterJapanese, { fontSize: size * 0.31 }]}>{counter.suffix}</Text>
        <View style={styles.genericVocabCounterExample}>
          <Text style={[styles.genericVocabCounterExampleJapanese, { fontSize: size * 0.16 }]}>{counter.exampleJapanese}</Text>
          <Text numberOfLines={2} style={[styles.genericVocabCounterExampleFrench, { fontSize: size * 0.09 }]}>{counter.exampleFrench}</Text>
        </View>
      </View>
    );
  }

  const visual = getVocabularyVisual(item);
  const opacity = muted ? 0.52 : 1;
  return (
    <View
      accessible
      accessibilityLabel={`Illustration : ${item.meaning_fr}`}
      style={{ height: size, width: size, opacity }}
    >
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
      </Svg>
      <Text
        importantForAccessibility="no-hide-descendants"
        style={[styles.genericVocabPictogram, { fontSize: size * 0.38, lineHeight: size * 0.48 }]}
      >
        {visual.pictogram}
      </Text>
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

function filterVocabularyByMastery(
  items: VocabularyItem[],
  states: Record<string, VocabularyCardState>,
  masteryById: Record<string, MasteryView>,
  filter: VocabularyCardFilter
): VocabularyItem[] {
  if (filter === 'all') return items;
  return items.filter((item) => {
    const state = states[item.id];
    const mastery = masteryById[item.id];
    if (filter === 'favorites') return !!state?.favorite;
    if (filter === 'review') return !!state?.review || mastery?.status === 'review';
    if (filter === 'known') return mastery?.status === 'known' || mastery?.status === 'mastered';
    return !mastery || mastery.status === 'new' || mastery.status === 'learning';
  });
}

export function getVocabularyVisual(item: VocabularyItem): { kind: string; pictogram: string; colors: [string, string] } {
  // Match the meaning and reading, not arbitrary kanji contained in a compound
  // (for example 本 in 日本 must never turn "Japon" into a book illustration).
  const normalizeSearchText = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const text = normalizeSearchText(`${item.meaning_fr} ${item.kana ?? ''}`);
  const themeText = normalizeSearchText(`${getVocabularyThemeLabel(item)} ${item.part_of_speech ?? ''}`);
  if (/rencontrer|voir une personne|会う|あう|あいます/.test(text)) {
    return { kind: 'meeting', pictogram: '', colors: ['#F4C76A', '#C95B54'] };
  }
  if (/^(?:青|あお)(?:\s|$)|\b(?:le )?bleu\b/.test(text)) {
    return { kind: 'blue-paint', pictogram: '', colors: ['#77C8EA', '#1769AA'] };
  }
  if (/chat|猫|ねこ/.test(text)) return { kind: 'animal', pictogram: '🐈', colors: ['#5BAE8B', '#286B63'] };
  if (/chien|犬|いぬ/.test(text)) return { kind: 'animal', pictogram: '🐕', colors: ['#B98A5A', '#76543C'] };
  if (/oiseau|鳥|とり/.test(text)) return { kind: 'animal', pictogram: '🐦', colors: ['#65AEDD', '#366B9A'] };
  if (/poisson|魚|さかな/.test(text)) return { kind: 'animal', pictogram: '🐟', colors: ['#4CA9BC', '#24657C'] };
  if (/cheval|馬|うま/.test(text)) return { kind: 'animal', pictogram: '🐎', colors: ['#A77A52', '#65432F'] };
  if (/eau|水|みず/.test(text)) return { kind: 'food', pictogram: '💧', colors: ['#5DBBE3', '#246BA0'] };
  if (/thé|茶|ちゃ/.test(text)) return { kind: 'food', pictogram: '🍵', colors: ['#78A85B', '#3F6F45'] };
  if (/riz|ご飯|米|こめ/.test(text)) return { kind: 'food', pictogram: '🍚', colors: ['#E8B55A', '#B35B3E'] };
  if (/pain|パン/.test(text)) return { kind: 'food', pictogram: '🍞', colors: ['#E9A65B', '#A85C35'] };
  if (/viande|肉|にく/.test(text)) return { kind: 'food', pictogram: '🍖', colors: ['#E47463', '#A33D3D'] };
  if (/œuf|卵|たまご/.test(text)) return { kind: 'food', pictogram: '🥚', colors: ['#E7B74D', '#C97A35'] };
  if (/pomme|果物|くだもの/.test(text)) return { kind: 'food', pictogram: '🍎', colors: ['#E45959', '#9C343A'] };
  if (/manger|食べ|食事/.test(text)) return { kind: 'food', pictogram: '🍱', colors: ['#F08A4B', '#C83543'] };
  if (/boire|飲/.test(text)) return { kind: 'food', pictogram: '🥤', colors: ['#46A6B3', '#246C78'] };
  if (/mère|母|おかあ/.test(text)) return { kind: 'family', pictogram: '👩', colors: ['#D97891', '#92517B'] };
  if (/père|父|おとう/.test(text)) return { kind: 'family', pictogram: '👨', colors: ['#698FC0', '#405E8B'] };
  if (/famille|家族/.test(text)) return { kind: 'family', pictogram: '👪', colors: ['#D97891', '#6D5B9A'] };
  if (/ami|友/.test(text)) return { kind: 'family', pictogram: '🤝', colors: ['#DB8C69', '#9C5362'] };
  if (/personne|homme|femme|人|男|女/.test(text)) return { kind: 'family', pictogram: '👤', colors: ['#8B83C8', '#505386'] };
  if (/école|学校/.test(text)) return { kind: 'study', pictogram: '🏫', colors: ['#4F8CC9', '#1B5E8C'] };
  if (/livre|本|ほん/.test(text)) return { kind: 'study', pictogram: '📖', colors: ['#4F8CC9', '#284F79'] };
  if (/crayon|鉛筆/.test(text)) return { kind: 'study', pictogram: '✏️', colors: ['#E2A83D', '#A05A31'] };
  if (/professeur|先生/.test(text)) return { kind: 'study', pictogram: '🧑‍🏫', colors: ['#4F8CC9', '#484D8B'] };
  if (/étudiant|élève|学生/.test(text)) return { kind: 'study', pictogram: '🎓', colors: ['#5679B8', '#253F70'] };
  if (/gare|駅/.test(text)) return { kind: 'transport', pictogram: '🚉', colors: ['#2D7DD2', '#143D73'] };
  if (/train|電車/.test(text)) return { kind: 'transport', pictogram: '🚆', colors: ['#3D8DD4', '#26577A'] };
  if (/voiture|自動車|車/.test(text)) return { kind: 'transport', pictogram: '🚗', colors: ['#D85656', '#8D3037'] };
  if (/vélo|自転車/.test(text)) return { kind: 'transport', pictogram: '🚲', colors: ['#4D9E8B', '#2B655F'] };
  if (/avion|飛行機/.test(text)) return { kind: 'transport', pictogram: '✈️', colors: ['#58A8D1', '#396C98'] };
  if (/marcher|aller|venir|rentrer|行|来|帰/.test(text)) return { kind: 'transport', pictogram: '🚶', colors: ['#4A91B8', '#285771'] };
  if (/heure|時|時計/.test(text)) return { kind: 'time', pictogram: '🕒', colors: ['#F6C85F', '#D7891B'] };
  if (/jour|mois|année|hier|demain|今日|明日|昨日|月|日|年/.test(text)) return { kind: 'time', pictogram: '📅', colors: ['#F0B750', '#C8732B'] };
  if (/matin|朝/.test(text)) return { kind: 'time', pictogram: '🌅', colors: ['#F7B95E', '#D76845'] };
  if (/soir|夜|晩/.test(text)) return { kind: 'time', pictogram: '🌙', colors: ['#5368A7', '#283659'] };
  if (/montagne|山/.test(text)) return { kind: 'nature', pictogram: '⛰️', colors: ['#67A66C', '#356C53'] };
  if (/rivière|川/.test(text)) return { kind: 'nature', pictogram: '🌊', colors: ['#4AA5C3', '#28637C'] };
  if (/pluie|雨/.test(text)) return { kind: 'nature', pictogram: '🌧️', colors: ['#668EAD', '#3B536E'] };
  if (/neige|雪/.test(text)) return { kind: 'nature', pictogram: '❄️', colors: ['#91C6D5', '#537C9B'] };
  if (/feu|火/.test(text)) return { kind: 'nature', pictogram: '🔥', colors: ['#EF8C45', '#C43A37'] };
  if (/arbre|bois|木/.test(text)) return { kind: 'nature', pictogram: '🌳', colors: ['#52A66B', '#28745C'] };
  if (/fleur|花/.test(text)) return { kind: 'nature', pictogram: '🌸', colors: ['#E884A2', '#A74770'] };
  if (/ciel|空|天/.test(text)) return { kind: 'nature', pictogram: '☁️', colors: ['#67B4DA', '#4578A4'] };
  if (/soleil|日/.test(text)) return { kind: 'nature', pictogram: '☀️', colors: ['#F3B83E', '#D36D31'] };
  if (/\bmain\b|手/.test(text)) return { kind: 'body', pictogram: '✋', colors: ['#E0A95C', '#B45A3C'] };
  if (/\bpied\b|足/.test(text)) return { kind: 'body', pictogram: '🦶', colors: ['#D9A16A', '#9A5B42'] };
  if (/œil|目/.test(text)) return { kind: 'body', pictogram: '👁️', colors: ['#5B9DB5', '#355B79'] };
  if (/oreille|耳/.test(text)) return { kind: 'body', pictogram: '👂', colors: ['#D89972', '#A4584B'] };
  if (/bouche|口/.test(text)) return { kind: 'body', pictogram: '👄', colors: ['#D96D76', '#9D3D56'] };
  if (/tête|頭/.test(text)) return { kind: 'body', pictogram: '🙂', colors: ['#D9A16A', '#9A5B42'] };
  if (/yen|argent|円|金/.test(text)) return { kind: 'money', pictogram: '💴', colors: ['#E6C84F', '#8F7A17'] };
  if (/acheter|magasin|買|店/.test(text)) return { kind: 'money', pictogram: '🛍️', colors: ['#D79D43', '#8A6328'] };
  if (/téléphone|電話/.test(text)) return { kind: 'object', pictogram: '📱', colors: ['#537E9B', '#293E58'] };
  if (/parapluie|傘/.test(text)) return { kind: 'object', pictogram: '☂️', colors: ['#7B79B8', '#494A83'] };
  if (/maison|家/.test(text)) return { kind: 'object', pictogram: '🏠', colors: ['#D98255', '#8A493A'] };
  if (/table|つくえ/.test(text)) return { kind: 'table', pictogram: '', colors: ['#D5A360', '#75503A'] };
  if (/chaise|椅子/.test(text)) return { kind: 'object', pictogram: '🪑', colors: ['#B88956', '#725238'] };
  if (/vêtement|habit|tee-shirt|tshirt|tシャツ|ティーシャツ|服/.test(text)) return { kind: 'object', pictogram: '👕', colors: ['#579BC1', '#3C5F91'] };
  if (/côté|side|側/.test(text)) return { kind: 'description', pictogram: '↔️', colors: ['#698FC0', '#405E8B'] };
  if (/étage|階/.test(text)) return { kind: 'object', pictogram: '🏢', colors: ['#5D84A8', '#354F6A'] };
  if (/langue.*langage|語/.test(text)) return { kind: 'expression', pictogram: '🗣️', colors: ['#C45B6A', '#70415C'] };
  if (/âge|ans \(âge\)|歳/.test(text)) return { kind: 'time', pictogram: '🎂', colors: ['#D97B8C', '#92517B'] };
  if (/bonjour|merci|pardon|expression|salut|こんにちは|ありがとう|すみません/.test(text)) return { kind: 'expression', pictogram: '💬', colors: ['#C83543', '#152B3A'] };
  if (/lire|読/.test(text)) return { kind: 'action', pictogram: '📖', colors: ['#4F8CC9', '#294E76'] };
  if (/écrire|書/.test(text)) return { kind: 'action', pictogram: '✍️', colors: ['#D86F45', '#A8324B'] };
  if (/écouter|聞/.test(text)) return { kind: 'action', pictogram: '🎧', colors: ['#577FB6', '#3E477E'] };
  if (/parler|話/.test(text)) return { kind: 'action', pictogram: '🗣️', colors: ['#C86268', '#7C3F5B'] };
  if (/voir|regarder|見/.test(text)) return { kind: 'action', pictogram: '👀', colors: ['#4E91A8', '#31546F'] };
  if (/nombre|chiffre|compter|一|二|三|四|五|六|七|八|九|十/.test(text)) return { kind: 'object', pictogram: '🔢', colors: ['#5D7EAE', '#344B75'] };
  if (/rouge|bleu|blanc|noir|couleur|赤|青|白|黒/.test(text)) return { kind: 'color', pictogram: '🎨', colors: ['#F05A5A', '#4666D8'] };
  if (/grand|petit|nouveau|ancien|cher|haut|long|大|小|新|古|高|長/.test(text)) return { kind: 'description', pictogram: '↕️', colors: ['#A77BD8', '#5C4BB2'] };
  if (/verbe|faire|する/.test(text)) return { kind: 'action', pictogram: '⚙️', colors: ['#D86F45', '#A8324B'] };
  if (/animal/.test(themeText)) return { kind: 'animal', pictogram: '🐾', colors: ['#4BAE7F', '#1F7A68'] };
  if (/nourriture|repas/.test(themeText)) return { kind: 'food', pictogram: '🍱', colors: ['#F08A4B', '#C83543'] };
  if (/famille|personne/.test(themeText)) return { kind: 'family', pictogram: '👪', colors: ['#E85D75', '#9A4DAD'] };
  if (/école|étude/.test(themeText)) return { kind: 'study', pictogram: '📚', colors: ['#4F8CC9', '#1B5E8C'] };
  if (/déplacement|transport/.test(themeText)) return { kind: 'transport', pictogram: '🚆', colors: ['#2D7DD2', '#143D73'] };
  if (/temps|date|calendrier/.test(themeText)) return { kind: 'time', pictogram: '🕒', colors: ['#F6C85F', '#D7891B'] };
  if (/nombre|compteur/.test(themeText)) return { kind: 'object', pictogram: '🔢', colors: ['#5D7EAE', '#344B75'] };
  if (/nature/.test(themeText)) return { kind: 'nature', pictogram: '🌿', colors: ['#52A66B', '#28745C'] };
  if (/corps/.test(themeText)) return { kind: 'body', pictogram: '🧍', colors: ['#E0A95C', '#B45A3C'] };
  if (/docteur|medecin|malade|douleur|medicament|sante|hopital/.test(text)) return { kind: 'body', pictogram: '🩺', colors: ['#4FA38A', '#27685C'] };
  if (/appartement|chambre|toilette|entree|porte|fenetre|escalier|ascen[cs]eur|lit|frigo|jardin/.test(text)) return { kind: 'object', pictogram: '🏠', colors: ['#D98255', '#71483C'] };
  if (/sac|cle|vase|assiette|verre|boite|fourchette|baguette|bouton|enveloppe|mouchoir|chiffon/.test(text)) return { kind: 'object', pictogram: '🧰', colors: ['#B88956', '#654938'] };
  if (/veste|chaussure|cravate|chemise|vetement|habit|se deshabiller/.test(text)) return { kind: 'object', pictogram: '👕', colors: ['#579BC1', '#3C5F91'] };
  if (/musique|chanson|chanter|guitare|radio|voix/.test(text)) return { kind: 'expression', pictogram: '🎵', colors: ['#8B72C5', '#55427E'] };
  if (/photo|camera|cinema|film|television|tv|enregistreur|electricite/.test(text)) return { kind: 'object', pictogram: '📷', colors: ['#537E9B', '#293E58'] };
  if (/parc|ville|restaurant|cafe|banque|entreprise|piscine|hotel|pays|etranger/.test(text)) return { kind: 'transport', pictogram: '📍', colors: ['#D85656', '#78353C'] };
  if (/nord|sud|est|ouest|gauche|droite|ici|la-bas|dessus|dessous|interieur|devant|coin|direction/.test(text)) return { kind: 'description', pictogram: '🧭', colors: ['#698FC0', '#405E8B'] };
  if (/chaud|froid|clair|fonce|pluie|vent|temps|ete|printemps|hiver|automne/.test(text)) return { kind: 'nature', pictogram: '🌤️', colors: ['#67B4DA', '#4578A4'] };
  if (/travail|travailler|occupe|affaire|pratique|exercice|memoriser|comprendre|oublier/.test(text)) return { kind: 'study', pictogram: '🧠', colors: ['#4F8CC9', '#284F79'] };
  if (/heureux|triste|agreable|desagreable|interessant|ennuyeux|difficile|facile|fatigue|calme|splendide|mignon/.test(text)) return { kind: 'description', pictogram: '🙂', colors: ['#D97891', '#705387'] };
  if (/ouvrir|fermer|donner|nettoyer|jouer|mettre|placer|pousser|tirer|couper|preter|rendre|attendre|arriver|quitter|utiliser|brosser|souffler|grimper|nager|vendre|repondre|aligner|traverser/.test(text)) return { kind: 'action', pictogram: '🙌', colors: ['#D86F45', '#A8324B'] };
  if (/sel|beurre|legume|repas|diner|dejeuner|boisson|epice|cuisin/.test(text)) return { kind: 'food', pictogram: '🍽️', colors: ['#F08A4B', '#A85035'] };
  if (/question|reponse|mot|phrase|langue|anglais|japonais|kanji|hiragana|katakana|dictionnaire|magazine|carnet|page|nom|signification/.test(text)) return { kind: 'study', pictogram: '📝', colors: ['#4F8CC9', '#284F79'] };
  if (/acheter|vendre|prix|bon marche|cher|shopping|banque/.test(text)) return { kind: 'money', pictogram: '🛍️', colors: ['#D79D43', '#8A6328'] };
  if (/^\s*[0-9]+\s*$|zero|un|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|cent|mille/.test(text)) return { kind: 'object', pictogram: '🔢', colors: ['#5D7EAE', '#344B75'] };
  if (/dire|demander|conversation|allo|bonjour|merci|monsieur|madame|pardon/.test(text)) return { kind: 'expression', pictogram: '💬', colors: ['#C83543', '#152B3A'] };
  if (/adjectif|adverbe|particule|grammaire/.test(themeText)) return { kind: 'description', pictogram: '✨', colors: ['#8B72C5', '#55427E'] };
  if (/verbe|action/.test(themeText)) return { kind: 'action', pictogram: '🙌', colors: ['#D86F45', '#A8324B'] };
  if (/grammaire|expression/.test(themeText)) return { kind: 'expression', pictogram: '💬', colors: ['#C83543', '#152B3A'] };
  if (/verbe|verb/.test(themeText)) return { kind: 'action', pictogram: '🙌', colors: ['#D86F45', '#A8324B'] };
  if (/adjectif|adjective|etat/.test(themeText)) return { kind: 'description', pictogram: '✨', colors: ['#8B72C5', '#55427E'] };
  if (/adverbe|particule|conjonction|expression/.test(themeText)) return { kind: 'expression', pictogram: '💬', colors: ['#C83543', '#152B3A'] };
  if (/nom|noun|objet/.test(themeText)) return { kind: 'object', pictogram: '🔎', colors: ['#537E9B', '#293E58'] };
  return { kind: 'expression', pictogram: '💡', colors: ['#325B67', '#152B3A'] };
}

type VocabularyCounterInfo = {
  suffix: string;
  label: string;
  exampleJapanese: string;
  exampleFrench: string;
};

function getVocabularyCounterInfo(item: VocabularyItem): VocabularyCounterInfo | null {
  const mainText = getVocabularyMainText(item);
  const meaning = item.meaning_fr.toLowerCase();
  const theme = getVocabularyThemeLabel(item).toLowerCase();
  const isCounter = /^[~〜～]/u.test(mainText) || /compteur|nombre de|durée|fois/.test(meaning) || /compteur/.test(theme);
  if (!isCounter) return null;

  const suffix = mainText.replace(/^[~〜～]+/u, '〜');
  const entries: Array<[RegExp, Omit<VocabularyCounterInfo, 'suffix'>]> = [
    [/か月|ヶ?月/u, { label: 'Compteur pour les mois', exampleJapanese: '3か月', exampleFrench: 'trois mois' }],
    [/週間/u, { label: 'Compteur pour les semaines', exampleJapanese: '3週間', exampleFrench: 'trois semaines' }],
    [/時間/u, { label: 'Compteur pour une durée en heures', exampleJapanese: '3時間', exampleFrench: 'pendant trois heures' }],
    [/時$/u, { label: 'Compteur pour indiquer l’heure', exampleJapanese: '3時', exampleFrench: 'trois heures' }],
    [/回/u, { label: 'Compteur pour les occurrences', exampleJapanese: '3回', exampleFrench: 'trois fois' }],
    [/個/u, { label: 'Compteur pour les petits objets', exampleJapanese: '3個', exampleFrench: 'trois petits objets' }],
    [/冊/u, { label: 'Compteur pour les livres', exampleJapanese: '3冊', exampleFrench: 'trois livres' }],
    [/台/u, { label: 'Compteur pour les machines et véhicules', exampleJapanese: '3台', exampleFrench: 'trois machines ou véhicules' }],
    [/階/u, { label: 'Compteur pour les étages', exampleJapanese: '3階', exampleFrench: 'troisième étage' }],
    [/歳/u, { label: 'Compteur pour l’âge', exampleJapanese: '3歳', exampleFrench: 'trois ans' }],
    [/人/u, { label: 'Compteur pour les personnes', exampleJapanese: '3人', exampleFrench: 'trois personnes' }],
    [/匹/u, { label: 'Compteur pour les petits animaux', exampleJapanese: '3匹', exampleFrench: 'trois petits animaux' }],
    [/本/u, { label: 'Compteur pour les objets longs', exampleJapanese: '3本', exampleFrench: 'trois objets longs' }],
    [/枚/u, { label: 'Compteur pour les objets plats', exampleJapanese: '3枚', exampleFrench: 'trois objets plats' }],
    [/杯/u, { label: 'Compteur pour les tasses et verres', exampleJapanese: '3杯', exampleFrench: 'trois tasses ou verres' }],
  ];
  const match = entries.find(([pattern]) => pattern.test(mainText));
  if (match) return { suffix, ...match[1] };
  return {
    suffix,
    label: item.meaning_fr,
    exampleJapanese: `3${mainText.replace(/^[~〜～]+/u, '')}`,
    exampleFrench: item.meaning_fr,
  };
}

function renderVocabularyVisualShape(kind: string): ReactNode {
  if (kind === 'meeting') {
    return (
      <G opacity="0.95">
        <Circle cx="34" cy="37" r="11" fill="#FFF8E9" />
        <Circle cx="86" cy="37" r="11" fill="#FFF8E9" />
        <Path d="M18 87 C20 62 27 53 42 51 L51 70 L43 94 Z" fill="#173849" />
        <Path d="M102 87 C100 62 93 53 78 51 L69 70 L77 94 Z" fill="#FFFFFF" />
        <Path d="M44 58 L56 69" stroke="#F7D3B1" strokeWidth="7" strokeLinecap="round" />
        <Path d="M76 58 L64 69" stroke="#F7D3B1" strokeWidth="7" strokeLinecap="round" />
        <Path d="M55 69 C58 72 62 72 65 69" stroke="#F7D3B1" strokeWidth="7" strokeLinecap="round" />
        <Path d="M25 33 L43 40" stroke="#173849" strokeWidth="4" strokeLinecap="round" />
        <Path d="M95 33 L77 40" stroke="#173849" strokeWidth="4" strokeLinecap="round" />
      </G>
    );
  }
  if (kind === 'blue-paint') {
    return (
      <G opacity="0.96">
        <Path d="M23 88 C40 76 60 78 96 89 C78 100 43 101 23 88 Z" fill="#0D74C7" />
        <Path d="M42 24 L83 35 L72 78 L31 67 Z" fill="#F8F4E8" />
        <Path d="M47 29 L79 38 L69 72 L37 63 Z" fill="#1788D0" />
        <Rect x="50" y="18" width="25" height="12" rx="3" fill="#173849" transform="rotate(15 62 24)" />
        <Path d="M44 49 L72 57" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
        <Circle cx="87" cy="78" r="8" fill="#38AEEA" />
      </G>
    );
  }
  if (kind === 'table') {
    return (
      <G opacity="0.96">
        <Path d="M22 48 L98 48 L91 64 L29 64 Z" fill="#FFF8E9" />
        <Path d="M31 64 L39 64 L35 98 L26 98 Z" fill="#5A3828" />
        <Path d="M81 64 L89 64 L94 98 L85 98 Z" fill="#5A3828" />
        <Path d="M18 43 C34 35 84 35 102 43 L98 52 L22 52 Z" fill="#A9673F" />
        <Line x1="33" y1="75" x2="87" y2="75" stroke="#75452E" strokeWidth="5" strokeLinecap="round" />
      </G>
    );
  }
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
  if (kind === 'word') {
    return (
      <G opacity="0.9">
        <Rect x="29" y="29" width="62" height="70" rx="8" fill="#FFFDF7" />
        <Rect x="37" y="40" width="32" height="7" rx="3" fill="#F2C35A" />
        <Line x1="38" y1="59" x2="82" y2="59" stroke="#53707A" strokeWidth="5" strokeLinecap="round" />
        <Line x1="38" y1="72" x2="76" y2="72" stroke="#53707A" strokeWidth="5" strokeLinecap="round" />
        <Line x1="38" y1="85" x2="66" y2="85" stroke="#53707A" strokeWidth="5" strokeLinecap="round" />
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

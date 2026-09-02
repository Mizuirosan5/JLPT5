import { useMemo, useState } from 'react';
import { Modal, PanResponder, Pressable, SafeAreaView, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { styles } from '../appStyles';
import { KANJI_READING_CARDS } from '../data/kanjiReadingCards';
import type { VocabularyCardData } from '../models';
import { recordVocabularyCardSeen } from '../services/vocabulary';
import { getKanjiComponentDetail } from '../services/kanjiComponents';
import { Section } from './sharedUi';
import { OfflineAudioButton } from './OfflineAudioButton';

const CARD_PAGE_SIZE = 80;

export function KanjiFlashcardsSection({ cards }: { cards: VocabularyCardData[] }) {
  const db = useSQLiteContext();
  const deck = useMemo(() => cards.slice(0, 80), [cards]);
  const [page, setPage] = useState(0);
  const [flippedIds, setFlippedIds] = useState<Set<string>>(new Set());
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [viewerFlipped, setViewerFlipped] = useState(false);
  const pageCount = Math.max(1, Math.ceil(deck.length / CARD_PAGE_SIZE));
  const visibleCards = deck.slice(page * CARD_PAGE_SIZE, (page + 1) * CARD_PAGE_SIZE);

  const recordSeen = (card: VocabularyCardData) => {
    recordVocabularyCardSeen(db, card.id).catch((error) => console.error('Unable to record kanji card seen', error));
  };

  const toggleGridCard = (card: VocabularyCardData) => {
    setFlippedIds((current) => {
      const next = new Set(current);
      if (next.has(card.id)) next.delete(card.id);
      else next.add(card.id);
      return next;
    });
    recordSeen(card);
  };

  const moveViewer = (direction: -1 | 1) => {
    setViewerIndex((current) => {
      if (current === null || deck.length === 0) return current;
      return (current + direction + deck.length) % deck.length;
    });
    setViewerFlipped(false);
  };

  const toggleViewer = () => {
    const card = viewerIndex === null ? null : deck[viewerIndex];
    if (!card) return;
    setViewerFlipped((current) => !current);
    recordSeen(card);
  };

  return (
    <Section title="Cartes kanji N5">
      <Text style={styles.quizConfigText}>
        Recto : le kanji seul. Verso : ses lectures et un exemple compact. Le plein écran contient tous les exemples.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Ouvrir les ${deck.length} cartes kanji en plein écran`}
        style={styles.kanjiViewerLaunchButton}
        onPress={() => {
          setViewerIndex(0);
          setViewerFlipped(false);
        }}
      >
        <View style={styles.kanjiViewerLaunchIcon}>
          <MaterialCommunityIcons accessibilityElementsHidden color="#152B3A" name="fullscreen" size={28} />
        </View>
        <View style={styles.kanjiViewerLaunchTextBlock}>
          <Text style={styles.kanjiViewerLaunchTitle}>Apprendre en plein écran</Text>
          <Text style={styles.kanjiViewerLaunchText}>{deck.length} cartes · recto-verso · navigation continue</Text>
        </View>
        <Text style={styles.kanjiViewerLaunchArrow}>›</Text>
      </Pressable>

      <View style={styles.vocabularyDeckGrid}>
        {visibleCards.map((card, cardIndex) => (
          <KanjiFlashCard
            key={card.id}
            card={card}
            flipped={flippedIds.has(card.id)}
            onPress={() => toggleGridCard(card)}
            onOpenFullscreen={() => {
              setViewerIndex(page * CARD_PAGE_SIZE + cardIndex);
              setViewerFlipped(false);
              recordSeen(card);
            }}
          />
        ))}
      </View>

      {pageCount > 1 && (
        <View style={styles.segmented}>
          <Pressable
            accessibilityLabel="Page de cartes kanji précédente"
            accessibilityRole="button"
            accessibilityState={{ disabled: page === 0 }}
            disabled={page === 0}
            style={[styles.segmentButton, page === 0 && styles.primaryButtonDisabled]}
            onPress={() => setPage((current) => Math.max(0, current - 1))}
          >
            <Text style={styles.segmentText}>Précédent</Text>
          </Pressable>
          <View style={styles.segmentButton}>
            <Text style={styles.segmentText}>{page + 1}/{pageCount}</Text>
          </View>
          <Pressable
            accessibilityLabel="Page de cartes kanji suivante"
            accessibilityRole="button"
            accessibilityState={{ disabled: page >= pageCount - 1 }}
            disabled={page >= pageCount - 1}
            style={[styles.segmentButton, page >= pageCount - 1 && styles.primaryButtonDisabled]}
            onPress={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
          >
            <Text style={styles.segmentText}>Suivant</Text>
          </Pressable>
        </View>
      )}

      <KanjiFullscreenViewer
        cards={deck}
        index={viewerIndex}
        flipped={viewerFlipped}
        onClose={() => {
          setViewerIndex(null);
          setViewerFlipped(false);
        }}
        onFlip={toggleViewer}
        onNext={() => moveViewer(1)}
        onPrevious={() => moveViewer(-1)}
        onRandom={() => {
          if (deck.length < 2) return;
          setViewerIndex((current) => {
            const next = Math.floor(Math.random() * deck.length);
            return next === current ? (next + 1) % deck.length : next;
          });
          setViewerFlipped(false);
        }}
      />
    </Section>
  );
}

function KanjiFlashCard({
  card,
  flipped,
  onPress,
  onOpenFullscreen,
}: {
  card: VocabularyCardData;
  flipped: boolean;
  onPress: () => void;
  onOpenFullscreen: () => void;
}) {
  const readingCard = KANJI_READING_CARDS[card.root];
  return (
    <View style={[styles.vocabularyFlashCard, flipped && styles.vocabularyFlashCardBack]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={flipped ? `Voir le recto de ${card.root}` : `Voir le verso de ${card.root}`}
        onPress={onPress}
        style={styles.kanjiFlashCardTap}
      >
        {!flipped ? (
          <View style={styles.vocabCardFrontCenter}>
            <Text adjustsFontSizeToFit numberOfLines={1} style={styles.vocabCardMain}>{card.root}</Text>
          </View>
        ) : (
          <>
            <View style={styles.vocabKanjiBackHeader}>
              <Text style={styles.vocabCardBackKanji}>{card.root}</Text>
              <Text numberOfLines={2} style={styles.vocabCardMeaning}>
                {readingCard?.meaningFr ?? card.kanji?.meaning_fr ?? card.primary.meaning_fr}
              </Text>
            </View>
            <View style={styles.vocabKanjiReadingList}>
              {(readingCard?.readings ?? []).map((reading) => {
                const example = reading.examples[0];
                return (
                  <View key={`${card.root}-${reading.kana}`} style={styles.vocabKanjiReadingRow}>
                    <View style={styles.vocabKanjiReadingHeader}>
                      <Text numberOfLines={1} style={styles.vocabKanjiReadingKana}>{reading.kana}</Text>
                      <Text numberOfLines={1} style={styles.vocabKanjiReadingRomaji}>{reading.romaji}</Text>
                    </View>
                    {!!example && (
                      <>
                        <Text numberOfLines={1} style={styles.vocabKanjiExampleWord}>{example.word}（{example.kana}）</Text>
                        <Text numberOfLines={1} style={styles.vocabKanjiExampleMeaning}>{example.romaji} · {example.meaningFr}</Text>
                      </>
                    )}
                  </View>
                );
              })}
            </View>
          </>
        )}
      </Pressable>
      <View style={styles.kanjiFlashCardCornerActions}>
        <OfflineAudioButton iconOnly compact text={card.root} label={`Écouter ${card.root}`} />
        <Pressable accessibilityRole="button" accessibilityLabel={`Ouvrir ${card.root} en plein écran`} onPress={onOpenFullscreen} style={styles.kanjiFlashCardIconButton}>
          <MaterialCommunityIcons accessibilityElementsHidden color="#152B3A" name="fullscreen" size={23} />
        </Pressable>
      </View>
    </View>
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
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const card = index === null ? null : cards[index] ?? null;
  const readingCard = card ? KANJI_READING_CARDS[card.root] : null;
  const mnemonic = card ? getKanjiComponentDetail(card.root)?.mnemonicFr : null;
  const frontKanjiSize = Math.max(132, Math.min(240, windowWidth * 0.58, windowHeight * 0.3));
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
                  <Text
                    allowFontScaling={false}
                    numberOfLines={1}
                    style={[styles.kanjiViewerFrontKanji, { fontSize: frontKanjiSize, lineHeight: frontKanjiSize * 1.14 }]}
                  >
                    {card.root}
                  </Text>
                </View>
              ) : (
                <ScrollView nestedScrollEnabled showsVerticalScrollIndicator style={styles.kanjiViewerBackScroll} contentContainerStyle={styles.kanjiViewerBackContent}>
                  <View style={styles.kanjiViewerBackTitleRow}>
                    <Text style={styles.kanjiViewerBackKanji}>{card.root}</Text>
                    <Text style={styles.kanjiViewerBackMeaning}>{readingCard?.meaningFr ?? card.kanji?.meaning_fr ?? card.primary.meaning_fr}</Text>
                  </View>
                  {!!mnemonic && (
                    <View style={styles.kanjiViewerMnemonic}>
                      <Text style={styles.kanjiViewerMnemonicLabel}>Image mentale</Text>
                      <Text style={styles.kanjiViewerMnemonicText}>{mnemonic}</Text>
                    </View>
                  )}
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
          {!!card && <OfflineAudioButton iconOnly text={card.root} label={`Écouter ${card.root}`} />}
          <Pressable accessibilityRole="button" accessibilityLabel="Carte kanji suivante" style={styles.kanjiViewerNavButton} onPress={onNext}>
            <Text style={styles.kanjiViewerNavText}>Suivante ›</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

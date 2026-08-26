import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { styles } from '../appStyles';
import type { KanjiItem, Screen, VocabularyItem } from '../models';
import { buildKanjiDetail, type KanjiDetail } from '../services/kanjiComponents';
import { markSrsItemForReview } from '../services/srs';
import { buildVocabularyCards, loadKanjiItems, loadVocabularyItems } from '../services/vocabulary';
import { KanjiFlashcardsSection } from './KanjiFlashcardsSection';
import { EmptyState, LoadingView, Section } from './sharedUi';

export function KanjiDetailScreen({ onNavigate }: { onNavigate?: (screen: Screen) => void }) {
  const db = useSQLiteContext();
  const [loading, setLoading] = useState(true);
  const [kanjiItems, setKanjiItems] = useState<KanjiItem[]>([]);
  const [vocabularyItems, setVocabularyItems] = useState<VocabularyItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [reviewMessage, setReviewMessage] = useState('');

  useEffect(() => {
    let mounted = true;
    Promise.all([loadKanjiItems(db), loadVocabularyItems(db)])
      .then(([kanjiRows, vocabularyResult]) => {
        if (!mounted) return;
        const n5Kanji = kanjiRows.filter((item) => item.jlpt_level === 'N5');
        setKanjiItems(n5Kanji);
        setVocabularyItems(vocabularyResult.rows.filter((item) => (item.jlpt_level ?? 'N5') === 'N5'));
        setSelectedId((current) => current ?? n5Kanji[0]?.id ?? null);
      })
      .catch((error) => {
        console.error('Unable to load kanji detail screen', error);
        if (mounted) {
          setKanjiItems([]);
          setVocabularyItems([]);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [db]);

  const filteredKanji = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return kanjiItems;
    return kanjiItems.filter((item) =>
      `${item.character} ${item.meaning_fr} ${item.n5_readings ?? ''} ${item.onyomi ?? ''} ${item.kunyomi ?? ''}`
        .toLowerCase()
        .includes(normalized)
    );
  }, [kanjiItems, query]);

  const selectedKanji = useMemo(
    () => kanjiItems.find((item) => item.id === selectedId) ?? filteredKanji[0] ?? kanjiItems[0] ?? null,
    [filteredKanji, kanjiItems, selectedId]
  );

  const detail = useMemo<KanjiDetail | null>(
    () => selectedKanji ? buildKanjiDetail(selectedKanji, vocabularyItems) : null,
    [selectedKanji, vocabularyItems]
  );
  const kanjiCards = useMemo(
    () => buildVocabularyCards(vocabularyItems, kanjiItems).filter((card) => !!card.kanji).slice(0, 80),
    [kanjiItems, vocabularyItems]
  );

  const markForReview = async () => {
    if (!selectedKanji) return;
    await markSrsItemForReview(db, { itemId: selectedKanji.id, itemType: 'kanji' });
    setReviewMessage(`${selectedKanji.character} ajoute a la file de revision.`);
  };

  if (loading) return <LoadingView />;
  if (!detail) return <EmptyState title="Aucun kanji N5 trouve" />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.grammarHero}>
        <View style={styles.grammarHeroText}>
          <Text style={styles.grammarKicker}>字 N5</Text>
          <Text style={styles.grammarTitle}>Détail du kanji</Text>
          <Text style={styles.grammarSubtitle}>
            Composants, lectures, mnémoniques, confusions et mots lies pour les 80 kanji N5.
          </Text>
        </View>
        <View style={styles.grammarHeroBadge}>
          <Text style={styles.grammarHeroBadgeValue}>{kanjiItems.length}</Text>
          <Text style={styles.grammarHeroBadgeText}>kanji</Text>
        </View>
      </View>

      <KanjiFlashcardsSection cards={kanjiCards} />

      <Section title="Chercher un kanji">
        <TextInput
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Kanji, sens, lecture"
          style={styles.vocabularySearchInput}
        />
        <View style={styles.globalDomainStrip}>
          {filteredKanji.slice(0, 24).map((item) => (
            <Pressable
              key={item.id}
              onPress={() => {
                setSelectedId(item.id);
                setReviewMessage('');
              }}
              style={[
                styles.globalDomainChip,
                selectedKanji?.id === item.id && styles.grammarModeCardActive,
              ]}
            >
              <Text style={styles.globalDomainChipText}>{item.character}</Text>
            </Pressable>
          ))}
        </View>
      </Section>

      <KanjiDetailContent detail={detail} />

      <View style={styles.segmented}>
        <Pressable style={styles.pathActionButton} onPress={markForReview}>
          <Text style={styles.pathActionText}>Ajouter aux révisions</Text>
        </Pressable>
        <Pressable style={styles.secondaryFullButton} onPress={() => onNavigate?.('quiz')}>
          <Text style={styles.secondaryFullButtonText}>Quiz kanji</Text>
        </Pressable>
      </View>
      {!!reviewMessage && <Text style={styles.feedbackMnemonic}>{reviewMessage}</Text>}
    </ScrollView>
  );
}

function KanjiDetailContent({ detail }: { detail: KanjiDetail }) {
  const item = detail.item;
  return (
    <Section title={`Fiche ${detail.character}`}>
      <View style={styles.resultCard}>
        <Text style={styles.resultKicker}>Kanji N5</Text>
        <Text style={styles.resultScore}>{detail.character}</Text>
        <Text style={styles.resultPercent}>{item.meaning_fr}</Text>
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

      <Text style={styles.quizConfigMode}>Mots lies</Text>
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
    </Section>
  );
}

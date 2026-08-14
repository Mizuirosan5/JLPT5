import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { styles } from '../appStyles';
import {
  archiveErrorFlashcard,
  loadErrorFlashcards,
  restoreErrorFlashcard,
  type ErrorFlashcard,
} from '../services/errorFlashcards';
import { SegmentButton } from './formControls';
import { EmptyState, LoadingView, Section } from './sharedUi';

type ErrorFilter = 'active' | 'archived' | 'all';
type ErrorDomainFilter = 'all' | 'kana' | 'vocabulary' | 'kanji' | 'grammar' | 'skill';

export function ErrorFlashcardsScreen() {
  const db = useSQLiteContext();
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ErrorFilter>('active');
  const [domainFilter, setDomainFilter] = useState<ErrorDomainFilter>('all');
  const [cards, setCards] = useState<ErrorFlashcard[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCards(await loadErrorFlashcards(db, filter !== 'active'));
    } catch (error) {
      console.error('Unable to load error flashcards', error);
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [db, filter]);

  useEffect(() => {
    load();
  }, [load]);

  const visibleCards = useMemo(() => {
    const statusCards =
      filter === 'active'
        ? cards.filter((card) => card.archived === 0)
        : filter === 'archived'
          ? cards.filter((card) => card.archived === 1)
          : cards;
    return domainFilter === 'all' ? statusCards : statusCards.filter((card) => card.item_type === domainFilter);
  }, [cards, domainFilter, filter]);

  async function toggleArchive(card: ErrorFlashcard) {
    if (card.archived) {
      await restoreErrorFlashcard(db, card.id);
    } else {
      await archiveErrorFlashcard(db, card.id);
    }
    await load();
  }

  if (loading) return <LoadingView />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.quickHero}>
        <View>
          <Text style={styles.quickKicker}>Memoire d'erreurs</Text>
          <Text style={styles.quickTitle}>Mes erreurs</Text>
          <Text style={styles.quickText}>Les reponses ratees deviennent des cartes de revision locales.</Text>
        </View>
        <View style={styles.quickCounter}>
          <Text style={styles.quickCounterValue}>{visibleCards.length}</Text>
          <Text style={styles.quickCounterLabel}>cartes</Text>
        </View>
      </View>

      <View style={styles.preferenceSegmentRow}>
        <SegmentButton label="Actives" active={filter === 'active'} onPress={() => setFilter('active')} />
        <SegmentButton label="Archivees" active={filter === 'archived'} onPress={() => setFilter('archived')} />
        <SegmentButton label="Tout" active={filter === 'all'} onPress={() => setFilter('all')} />
      </View>
      <View style={styles.preferenceSegmentRow}>
        <SegmentButton label="Tous" active={domainFilter === 'all'} onPress={() => setDomainFilter('all')} />
        <SegmentButton label="Kana" active={domainFilter === 'kana'} onPress={() => setDomainFilter('kana')} />
        <SegmentButton label="Vocab" active={domainFilter === 'vocabulary'} onPress={() => setDomainFilter('vocabulary')} />
      </View>
      <View style={styles.preferenceSegmentRow}>
        <SegmentButton label="Kanji" active={domainFilter === 'kanji'} onPress={() => setDomainFilter('kanji')} />
        <SegmentButton label="Grammaire" active={domainFilter === 'grammar'} onPress={() => setDomainFilter('grammar')} />
        <SegmentButton label="Autres" active={domainFilter === 'skill'} onPress={() => setDomainFilter('skill')} />
      </View>

      {visibleCards.length === 0 ? (
        <EmptyState title="Aucune erreur enregistree pour le moment." />
      ) : (
        <Section title="Cartes issues des erreurs">
          {visibleCards.map((card) => (
            <View key={card.id} style={styles.preferenceOptionCard}>
              <Text style={styles.preferenceOptionTitle}>{card.prompt}</Text>
              {!!card.japanese && <Text style={styles.quickJapanese}>{card.japanese}</Text>}
              {!!card.translation && <Text style={styles.preferenceOptionText}>{card.translation}</Text>}
              <Text style={styles.quickCorrectionAnswer}>Reponse : {card.expected_answer}</Text>
              {!!card.selected_answer && <Text style={styles.preferenceOptionText}>Ta reponse : {card.selected_answer}</Text>}
              {!!card.explanation && <Text style={styles.quickCorrectionText}>{card.explanation}</Text>}
              <Pressable
                style={[styles.wordLookupActionButton, card.archived === 1 && styles.wordLookupActionButtonDone]}
                onPress={() => toggleArchive(card)}
              >
                <Text style={styles.wordLookupActionText}>{card.archived ? 'Restaurer' : 'Archiver'}</Text>
              </Pressable>
            </View>
          ))}
        </Section>
      )}
    </ScrollView>
  );
}

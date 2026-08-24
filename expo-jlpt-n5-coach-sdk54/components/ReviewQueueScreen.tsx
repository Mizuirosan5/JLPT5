import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { styles } from '../appStyles';
import {
  buildSrsReviewSession,
  loadDueSrsItems,
  markSrsQueueItemKnown,
  postponeSrsQueueItem,
  recordSrsReview,
  type SrsQueueItem,
  type SrsQueueSection,
} from '../services/srsQueue';
import { hasJapaneseText, normalizeAnswer } from '../services/text';
import { SegmentButton } from './formControls';
import { JapaneseLookupText, WordLookupPanel, useVocabularyLookupIndex } from './JapaneseLookup';
import { EmptyState, LoadingView, Section } from './sharedUi';
import type { WordLookupEntry } from '../models';

type ReviewAnswer = {
  questionId: string;
  isCorrect: boolean;
};

type ReviewDomainFilter = 'all' | 'kana' | 'vocabulary' | 'kanji' | 'grammar';

const SECTION_LABELS: Record<SrsQueueSection, string> = {
  urgent: 'Urgent',
  today: "Aujourd'hui",
  soon: 'Bientot',
};

export function ReviewQueueScreen() {
  const db = useSQLiteContext();
  const vocabularyLookupEntries = useVocabularyLookupIndex(db);
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<SrsQueueItem[]>([]);
  const [session, setSession] = useState<SrsQueueItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [answers, setAnswers] = useState<ReviewAnswer[]>([]);
  const [domainFilter, setDomainFilter] = useState<ReviewDomainFilter>('all');
  const [selectedWordLookup, setSelectedWordLookup] = useState<WordLookupEntry | null>(null);

  const current = session[currentIndex] ?? null;
  const sessionDone = session.length > 0 && currentIndex >= session.length;
  const correctCount = answers.filter((answer) => answer.isCorrect).length;

  const visibleQueue = useMemo(
    () => (domainFilter === 'all' ? queue : queue.filter((item) => item.itemType === domainFilter)),
    [domainFilter, queue]
  );

  const grouped = useMemo(
    () => ({
      urgent: visibleQueue.filter((item) => item.section === 'urgent'),
      today: visibleQueue.filter((item) => item.section === 'today'),
      soon: visibleQueue.filter((item) => item.section === 'soon'),
    }),
    [visibleQueue]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setSession([]);
    setCurrentIndex(0);
    setSelectedChoice(null);
    setAnswers([]);
    setSelectedWordLookup(null);
    try {
      setQueue(await loadDueSrsItems(db));
    } catch (error) {
      console.error('Unable to load SRS queue', error);
      setQueue([]);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    load();
  }, [load]);

  async function startSession() {
      const items = (await buildSrsReviewSession(db, 30))
        .filter((item) => domainFilter === 'all' || item.itemType === domainFilter)
        .slice(0, 10);
    setSession(items);
    setCurrentIndex(0);
    setSelectedChoice(null);
    setAnswers([]);
    setSelectedWordLookup(null);
  }

  async function answer(choice: string) {
    if (!current || selectedChoice) return;
    const isCorrect = normalizeAnswer(choice) === normalizeAnswer(current.correctAnswer);
    setSelectedChoice(choice);
    setAnswers((existing) => [...existing, { questionId: current.questionId, isCorrect }]);
    try {
      await recordSrsReview(db, current, choice, isCorrect);
    } catch (error) {
      console.error('Unable to record SRS review', error);
    }
  }

  async function next() {
    if (!selectedChoice) return;
    if (currentIndex + 1 >= session.length) {
      setCurrentIndex(session.length);
      setSelectedChoice(null);
      setSelectedWordLookup(null);
      setQueue(await loadDueSrsItems(db));
      return;
    }
    setCurrentIndex((index) => index + 1);
    setSelectedChoice(null);
    setSelectedWordLookup(null);
  }

  async function refreshQueue() {
    setQueue(await loadDueSrsItems(db));
  }

  async function markKnown(item: SrsQueueItem) {
    try {
      await markSrsQueueItemKnown(db, item);
      await refreshQueue();
    } catch (error) {
      console.error('Unable to mark SRS item as known', error);
    }
  }

  async function postpone(item: SrsQueueItem) {
    try {
      await postponeSrsQueueItem(db, item);
      await refreshQueue();
    } catch (error) {
      console.error('Unable to postpone SRS item', error);
    }
  }

  async function completeCurrentWithAction(action: 'known' | 'postpone') {
    if (!current || selectedChoice) return;
    if (action === 'known') {
      await markSrsQueueItemKnown(db, current);
      setAnswers((existing) => [...existing, { questionId: current.questionId, isCorrect: true }]);
    } else {
      await postponeSrsQueueItem(db, current);
    }
    if (currentIndex + 1 >= session.length) {
      setCurrentIndex(session.length);
      setSelectedChoice(null);
      setSelectedWordLookup(null);
      await refreshQueue();
      return;
    }
    setCurrentIndex((index) => index + 1);
    setSelectedChoice(null);
    setSelectedWordLookup(null);
  }

  if (loading) return <LoadingView />;

  if (sessionDone) {
    const rate = Math.round((correctCount / Math.max(1, answers.length)) * 100);
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.quickResultHero}>
          <Text style={styles.quickKicker}>Révisions terminées</Text>
          <Text style={styles.quickResultScore}>{rate}%</Text>
          <Text style={styles.quickResultText}>
            {correctCount}/{answers.length} réponses justes. Les prochaines dates SRS ont ete mises a jour.
          </Text>
        </View>
        <Pressable onPress={load} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Retour aux révisions</Text>
        </Pressable>
      </ScrollView>
    );
  }

  if (current) {
    const progress = Math.round(((currentIndex + (selectedChoice ? 1 : 0)) / session.length) * 100);
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.quickHero}>
          <View>
            <Text style={styles.quickKicker}>Mémoire SRS</Text>
            <Text style={styles.quickTitle}>Revision du jour</Text>
            <Text style={styles.quickText}>Les erreurs reviennent vite, les acquis s'espacent.</Text>
          </View>
          <View style={styles.quickCounter}>
            <Text style={styles.quickCounterValue}>{currentIndex + 1}</Text>
            <Text style={styles.quickCounterLabel}>/{session.length}</Text>
          </View>
        </View>
        <View style={styles.quickProgressTrack}>
          <View style={[styles.quickProgressFill, { width: `${progress}%` }]} />
        </View>
        <View style={styles.quickQuestionCard}>
          <Text style={styles.quickQuestionSkill}>{current.skillId.replace(/_/g, ' ')}</Text>
          <View style={styles.srsReasonBox}>
            <Text style={styles.srsReasonTitle}>Risque memoire {current.riskScore}</Text>
            <Text style={styles.srsReasonText}>{current.reviewReason}</Text>
          </View>
          <Text style={styles.quickPrompt}>{current.promptFr}</Text>
          {!!current.promptJa && (
            <JapaneseLookupText
              text={current.promptJa}
              entries={vocabularyLookupEntries}
              onSelect={setSelectedWordLookup}
              style={styles.quickJapanese}
            />
          )}
          {selectedWordLookup && <WordLookupPanel entry={selectedWordLookup} onClose={() => setSelectedWordLookup(null)} />}
          <View style={styles.quickChoiceList}>
            {current.choices.map((choice) => {
              const isSelected = selectedChoice === choice;
              const isCorrect = normalizeAnswer(choice) === normalizeAnswer(current.correctAnswer);
              return (
                <Pressable
                  key={choice}
                  disabled={!!selectedChoice}
                  onPress={() => answer(choice)}
                  style={[
                    styles.quickChoiceButton,
                    isSelected && (isCorrect ? styles.quickChoiceCorrect : styles.quickChoiceWrong),
                    selectedChoice && isCorrect && styles.quickChoiceCorrect,
                  ]}
                >
                  {selectedChoice && hasJapaneseText(choice) ? (
                    <JapaneseLookupText
                      text={choice}
                      entries={vocabularyLookupEntries}
                      onSelect={setSelectedWordLookup}
                      style={[
                        styles.quickChoiceText,
                        (isSelected || (selectedChoice && isCorrect)) && styles.quickChoiceTextActive,
                      ]}
                    />
                  ) : (
                    <Text
                      style={[
                        styles.quickChoiceText,
                        (isSelected || (selectedChoice && isCorrect)) && styles.quickChoiceTextActive,
                      ]}
                    >
                      {choice}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
          {selectedChoice && (
            <View style={styles.quickCorrectionBox}>
              <Text style={styles.quickCorrectionTitle}>
                {normalizeAnswer(selectedChoice) === normalizeAnswer(current.correctAnswer) ? 'Solide' : 'À revoir vite'}
              </Text>
              <Text style={styles.quickCorrectionText}>{current.explanationFr}</Text>
              {hasJapaneseText(current.correctAnswer) ? (
                <View>
                  <Text style={styles.quickCorrectionAnswer}>Reponse :</Text>
                  <JapaneseLookupText
                    text={current.correctAnswer}
                    entries={vocabularyLookupEntries}
                    onSelect={setSelectedWordLookup}
                    style={styles.quickCorrectionAnswer}
                  />
                </View>
              ) : (
                <Text style={styles.quickCorrectionAnswer}>Reponse : {current.correctAnswer}</Text>
              )}
            </View>
          )}
        </View>
        {!selectedChoice && (
          <View style={styles.srsActionRow}>
            <Pressable onPress={() => completeCurrentWithAction('known')} style={styles.srsKnownButton}>
              <Text style={styles.srsKnownButtonText}>Je connais deja</Text>
            </Pressable>
            <Pressable onPress={() => completeCurrentWithAction('postpone')} style={styles.srsPostponeButton}>
              <Text style={styles.srsPostponeButtonText}>Revoir plus tard</Text>
            </Pressable>
          </View>
        )}
        <Pressable disabled={!selectedChoice} onPress={next} style={[styles.primaryButton, !selectedChoice && styles.primaryButtonDisabled]}>
          <Text style={styles.primaryButtonText}>{currentIndex + 1 >= session.length ? 'Terminer' : 'Suivant'}</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.quickHero}>
        <View>
          <Text style={styles.quickKicker}>Mémoire SRS</Text>
          <Text style={styles.quickTitle}>À revoir</Text>
          <Text style={styles.quickText}>Une file courte pour consolider les notions qui doivent revenir.</Text>
        </View>
        <View style={styles.quickCounter}>
          <Text style={styles.quickCounterValue}>{grouped.urgent.length + grouped.today.length}</Text>
          <Text style={styles.quickCounterLabel}>dus</Text>
        </View>
      </View>

      <View style={styles.preferenceSegmentRow}>
        <SegmentButton label={`Tous ${queue.length}`} active={domainFilter === 'all'} onPress={() => setDomainFilter('all')} />
        <SegmentButton label="Kana" active={domainFilter === 'kana'} onPress={() => setDomainFilter('kana')} />
        <SegmentButton label="Vocab" active={domainFilter === 'vocabulary'} onPress={() => setDomainFilter('vocabulary')} />
      </View>
      <View style={styles.preferenceSegmentRow}>
        <SegmentButton label="Kanji" active={domainFilter === 'kanji'} onPress={() => setDomainFilter('kanji')} />
        <SegmentButton label="Grammaire" active={domainFilter === 'grammar'} onPress={() => setDomainFilter('grammar')} />
      </View>

      {visibleQueue.length === 0 ? (
        <View style={styles.srsEmptyState}>
          <EmptyState title="Rien à revoir pour le moment." />
          <Text style={styles.srsEmptyText}>
            Ta file SRS est vide pour ce filtre. Continue un quiz, une leçon ou marque des cartes à revoir : elles reviendront ici automatiquement.
          </Text>
        </View>
      ) : (
        <>
          <Pressable onPress={startSession} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Lancer 10 révisions</Text>
          </Pressable>
          {(['urgent', 'today', 'soon'] as SrsQueueSection[]).map((section) => (
            <Section key={section} title={`${SECTION_LABELS[section]} (${grouped[section].length})`}>
              {grouped[section].slice(0, 6).map((item) => (
                <View key={`${item.itemType}-${item.itemId}-${item.questionId}`} style={styles.preferenceOptionCard}>
                  <Text style={styles.preferenceOptionTitle}>{item.promptFr}</Text>
                  <Text style={styles.preferenceOptionText}>
                    {item.itemType} - {item.status} - risque {item.riskScore} - {item.attempts} essai{item.attempts > 1 ? 's' : ''}
                  </Text>
                  <Text style={styles.srsReasonText}>{item.reviewReason}</Text>
                  <View style={styles.srsActionRow}>
                    <Pressable onPress={() => markKnown(item)} style={styles.srsKnownButton}>
                      <Text style={styles.srsKnownButtonText}>Je connais deja</Text>
                    </Pressable>
                    <Pressable onPress={() => postpone(item)} style={styles.srsPostponeButton}>
                      <Text style={styles.srsPostponeButtonText}>Plus tard</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </Section>
          ))}
        </>
      )}
    </ScrollView>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { styles } from '../appStyles';
import {
  buildSrsReviewSession,
  loadDueSrsItems,
  recordSrsReview,
  type SrsQueueItem,
  type SrsQueueSection,
} from '../services/srsQueue';
import { normalizeAnswer } from '../services/text';
import { SegmentButton } from './formControls';
import { EmptyState, LoadingView, Section } from './sharedUi';

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
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<SrsQueueItem[]>([]);
  const [session, setSession] = useState<SrsQueueItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [answers, setAnswers] = useState<ReviewAnswer[]>([]);
  const [domainFilter, setDomainFilter] = useState<ReviewDomainFilter>('all');

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
      setQueue(await loadDueSrsItems(db));
      return;
    }
    setCurrentIndex((index) => index + 1);
    setSelectedChoice(null);
  }

  if (loading) return <LoadingView />;

  if (sessionDone) {
    const rate = Math.round((correctCount / Math.max(1, answers.length)) * 100);
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.quickResultHero}>
          <Text style={styles.quickKicker}>Revisions terminees</Text>
          <Text style={styles.quickResultScore}>{rate}%</Text>
          <Text style={styles.quickResultText}>
            {correctCount}/{answers.length} reponses justes. Les prochaines dates SRS ont ete mises a jour.
          </Text>
        </View>
        <Pressable onPress={load} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Retour aux revisions</Text>
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
            <Text style={styles.quickKicker}>Memoire SRS</Text>
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
          <Text style={styles.quickPrompt}>{current.promptFr}</Text>
          {!!current.promptJa && <Text style={styles.quickJapanese}>{current.promptJa}</Text>}
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
                  <Text
                    style={[
                      styles.quickChoiceText,
                      (isSelected || (selectedChoice && isCorrect)) && styles.quickChoiceTextActive,
                    ]}
                  >
                    {choice}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {selectedChoice && (
            <View style={styles.quickCorrectionBox}>
              <Text style={styles.quickCorrectionTitle}>
                {normalizeAnswer(selectedChoice) === normalizeAnswer(current.correctAnswer) ? 'Solide' : 'A revoir vite'}
              </Text>
              <Text style={styles.quickCorrectionText}>{current.explanationFr}</Text>
              <Text style={styles.quickCorrectionAnswer}>Reponse : {current.correctAnswer}</Text>
            </View>
          )}
        </View>
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
          <Text style={styles.quickKicker}>Memoire SRS</Text>
          <Text style={styles.quickTitle}>A revoir</Text>
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
        <EmptyState title="Rien a revoir pour le moment." />
      ) : (
        <>
          <Pressable onPress={startSession} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Lancer 10 revisions</Text>
          </Pressable>
          {(['urgent', 'today', 'soon'] as SrsQueueSection[]).map((section) => (
            <Section key={section} title={`${SECTION_LABELS[section]} (${grouped[section].length})`}>
              {grouped[section].slice(0, 6).map((item) => (
                <View key={`${item.itemType}-${item.itemId}-${item.questionId}`} style={styles.preferenceOptionCard}>
                  <Text style={styles.preferenceOptionTitle}>{item.promptFr}</Text>
                  <Text style={styles.preferenceOptionText}>
                    {item.itemType} · {item.status} · {item.attempts} essai{item.attempts > 1 ? 's' : ''}
                  </Text>
                </View>
              ))}
            </Section>
          ))}
        </>
      )}
    </ScrollView>
  );
}

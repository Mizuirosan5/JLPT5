import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { styles } from '../appStyles';
import type { WordLookupEntry } from '../models';
import {
  loadImmersionProgress,
  loadImmersionTexts,
  recordImmersionOpened,
  recordImmersionResult,
  type ImmersionProgress,
} from '../services/immersion';
import { JapaneseLookupText, useVocabularyLookupIndex, WordLookupPanel } from './JapaneseLookup';
import { OfflineAudioButton } from './OfflineAudioButton';
import { Metric, Section } from './sharedUi';

export function ImmersionReaderScreen() {
  const db = useSQLiteContext();
  const entries = useVocabularyLookupIndex(db);
  const texts = useMemo(() => loadImmersionTexts(), []);
  const [selectedId, setSelectedId] = useState(texts[0]?.id ?? '');
  const [showTranslation, setShowTranslation] = useState(false);
  const [selectedLookup, setSelectedLookup] = useState<WordLookupEntry | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<Record<string, ImmersionProgress>>({});
  const selectedText = texts.find((text) => text.id === selectedId) ?? texts[0];
  const selectedProgress = selectedText ? progress[selectedText.id] : null;

  const loadProgress = useCallback(async () => {
    try {
      setProgress(await loadImmersionProgress(db));
    } catch (error) {
      console.error('Unable to load immersion progress', error);
      setProgress({});
    }
  }, [db]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  useEffect(() => {
    if (!selectedText) return;
    recordImmersionOpened(db, selectedText.id)
      .then(loadProgress)
      .catch((error) => console.error('Unable to record immersion open', error));
  }, [db, loadProgress, selectedText]);

  if (!selectedText) return null;

  const answered = selectedText.questions.filter((question) => answers[question.prompt]).length;
  const correct = selectedText.questions.filter((question) => answers[question.prompt] === question.answer).length;
  const completedCount = Object.values(progress).filter((item) => item.completed).length;

  const answerQuestion = async (prompt: string, choice: string) => {
    const nextAnswers = { ...answers, [prompt]: choice };
    setAnswers(nextAnswers);
    const nextCorrect = selectedText.questions.filter((question) => nextAnswers[question.prompt] === question.answer).length;
    const nextAnswered = selectedText.questions.filter((question) => nextAnswers[question.prompt]).length;
    if (nextAnswered >= selectedText.questions.length) {
      await recordImmersionResult(db, selectedText.id, nextCorrect, selectedText.questions.length);
      await loadProgress();
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.pathHero}>
        <View style={styles.pathHeroInk}>
          <Text style={styles.pathHeroKicker}>Immersion N5</Text>
          <Text style={styles.pathHeroTitle}>Lectures cliquables</Text>
          <Text style={styles.pathHeroSubtitle}>
            Lis des textes courts, touche les mots inconnus, masque la traduction puis valide la comprehension.
          </Text>
        </View>
        <View style={styles.pathHeroBadge}>
          <Text style={styles.pathHeroBadgeValue}>{completedCount}/{texts.length}</Text>
          <Text style={styles.pathHeroBadgeText}>lus</Text>
        </View>
      </View>

      <Section title="Textes">
        <View style={styles.vocabularyThemeGrid}>
          {texts.map((text) => {
            const itemProgress = progress[text.id];
            const active = selectedText.id === text.id;
            return (
              <Pressable
                key={text.id}
                onPress={() => {
                  setSelectedId(text.id);
                  setShowTranslation(false);
                  setAnswers({});
                  setSelectedLookup(null);
                }}
                style={[styles.vocabularyThemeCard, active && styles.vocabularyThemeCardActive]}
              >
                <View style={styles.vocabularyThemeTextBlock}>
                  <Text style={[styles.vocabularyThemeTitle, active && styles.vocabularyThemeTitleActive]}>{text.title}</Text>
                  <Text style={[styles.vocabularyThemeCount, active && styles.vocabularyThemeCountActive]}>
                    {text.theme} · {itemProgress?.completed ? 'terminé' : 'à lire'}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <View style={styles.pathSummaryGrid}>
        <Metric label="Niveau" value={selectedText.level} />
        <Metric label="Questions" value={selectedText.questions.length} />
        <Metric label="Score" value={`${selectedProgress?.correct_count ?? correct}/${selectedText.questions.length}`} />
        <Metric label="Ouvert" value={selectedProgress?.opened_count ?? 0} />
      </View>

      <Section title={selectedText.title}>
        <View style={styles.correctionInsightCard}>
          <Text style={styles.correctionInsightLabel}>Phrase japonaise</Text>
          <JapaneseLookupText
            text={selectedText.japanese}
            entries={entries}
            onSelect={setSelectedLookup}
            style={styles.correctionInsightJapanese}
          />
          <Text style={styles.correctionInsightLabel}>Lecture kana</Text>
          <JapaneseLookupText
            text={selectedText.kana}
            entries={entries}
            onSelect={setSelectedLookup}
            style={styles.correctionInsightText}
          />
          <Pressable style={styles.secondaryFullButton} onPress={() => setShowTranslation((value) => !value)}>
            <Text style={styles.secondaryFullButtonText}>{showTranslation ? 'Masquer la traduction' : 'Afficher la traduction'}</Text>
          </Pressable>
          <OfflineAudioButton text={selectedText.japanese} slow />
          {showTranslation && <Text style={styles.correctionInsightText}>{selectedText.translationFr}</Text>}
        </View>
        <WordLookupPanel entry={selectedLookup} onClose={() => setSelectedLookup(null)} />
      </Section>

      <Section title="Compréhension">
        <View style={styles.pathRequirementList}>
          {selectedText.questions.map((question, index) => {
            const selected = answers[question.prompt];
            return (
              <View key={question.prompt} style={styles.aptitudeDomainCard}>
                <Text style={styles.pathStageFocus}>{index + 1}. {question.prompt}</Text>
                {question.choices.map((choice) => (
                  <Pressable
                    key={choice}
                    disabled={!!selected}
                    onPress={() => answerQuestion(question.prompt, choice)}
                    style={[
                      styles.choice,
                      selected && choice === question.answer && styles.choiceCorrect,
                      selected === choice && selected !== question.answer && styles.choiceWrong,
                    ]}
                  >
                    <Text style={styles.choiceText}>{choice}</Text>
                  </Pressable>
                ))}
                {!!selected && <Text style={styles.feedbackText}>{question.explanation}</Text>}
              </View>
            );
          })}
        </View>
        <Text style={styles.quizConfigText}>Progression de ce texte : {answered}/{selectedText.questions.length} question(s).</Text>
      </Section>
    </ScrollView>
  );
}

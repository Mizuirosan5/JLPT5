import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { styles } from '../appStyles';
import type { WordLookupEntry } from '../models';
import { loadStoryLessons, loadStoryProgress, recordStoryOpened, recordStoryResult } from '../services/stories';
import type { ImmersionProgress } from '../services/immersion';
import { recordSrsReviewForQuestionAttempt } from '../services/srs';
import { JapaneseLookupText, useVocabularyLookupIndex, WordLookupPanel } from './JapaneseLookup';
import { Metric, Section } from './sharedUi';

export function StoryLessonScreen() {
  const db = useSQLiteContext();
  const entries = useVocabularyLookupIndex(db);
  const stories = useMemo(() => loadStoryLessons(), []);
  const [selectedId, setSelectedId] = useState(stories[0]?.id ?? '');
  const [selectedLookup, setSelectedLookup] = useState<WordLookupEntry | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<Record<string, ImmersionProgress>>({});
  const selectedStory = stories.find((story) => story.id === selectedId) ?? stories[0];
  const selectedProgress = selectedStory ? progress[selectedStory.id] : null;

  const loadProgress = useCallback(async () => {
    try {
      setProgress(await loadStoryProgress(db));
    } catch (error) {
      console.error('Unable to load story progress', error);
      setProgress({});
    }
  }, [db]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  useEffect(() => {
    if (!selectedStory) return;
    recordStoryOpened(db, selectedStory.id).then(loadProgress).catch((error) => console.error('Unable to record story open', error));
  }, [db, loadProgress, selectedStory]);

  if (!selectedStory) return null;

  const correct = selectedStory.questions.filter((question) => answers[question.prompt] === question.answer).length;
  const answered = selectedStory.questions.filter((question) => answers[question.prompt]).length;
  const completedCount = Object.values(progress).filter((item) => item.completed).length;

  const answerQuestion = async (prompt: string, choice: string) => {
    const nextAnswers = { ...answers, [prompt]: choice };
    const questionIndex = selectedStory.questions.findIndex((question) => question.prompt === prompt);
    const question = selectedStory.questions[questionIndex];
    const isCorrect = question?.answer === choice;
    setAnswers(nextAnswers);
    const nextCorrect = selectedStory.questions.filter((question) => nextAnswers[question.prompt] === question.answer).length;
    const nextAnswered = selectedStory.questions.filter((question) => nextAnswers[question.prompt]).length;
    await recordSrsReviewForQuestionAttempt(db, {
      itemId: `${selectedStory.id}:q${questionIndex + 1}`,
      itemType: 'skill',
      skillId: `story:${selectedStory.theme}`,
      questionId: `${selectedStory.id}:${prompt}`,
      sourceMode: 'story_dialogue',
      isCorrect,
    });
    if (nextAnswered >= selectedStory.questions.length) {
      await recordStoryResult(db, selectedStory.id, nextCorrect, selectedStory.questions.length);
      await loadProgress();
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.pathHero}>
        <View style={styles.pathHeroInk}>
          <Text style={styles.pathHeroKicker}>Stories N5</Text>
          <Text style={styles.pathHeroTitle}>Dialogues cliquables</Text>
          <Text style={styles.pathHeroSubtitle}>Lis des scenes courtes, touche les kanji inconnus et valide le sens du dialogue.</Text>
        </View>
        <View style={styles.pathHeroBadge}>
          <Text style={styles.pathHeroBadgeValue}>{completedCount}/{stories.length}</Text>
          <Text style={styles.pathHeroBadgeText}>finis</Text>
        </View>
      </View>

      <Section title="Dialogues">
        <View style={styles.vocabularyThemeGrid}>
          {stories.map((story) => {
            const active = selectedStory.id === story.id;
            const itemProgress = progress[story.id];
            return (
              <Pressable
                key={story.id}
                onPress={() => {
                  setSelectedId(story.id);
                  setAnswers({});
                  setSelectedLookup(null);
                }}
                style={[styles.vocabularyThemeCard, active && styles.vocabularyThemeCardActive]}
              >
                <View style={styles.vocabularyThemeTextBlock}>
                  <Text style={[styles.vocabularyThemeTitle, active && styles.vocabularyThemeTitleActive]}>{story.title}</Text>
                  <Text style={[styles.vocabularyThemeCount, active && styles.vocabularyThemeCountActive]}>
                    {story.theme} · {itemProgress?.completed ? 'termine' : 'a jouer'}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <View style={styles.pathSummaryGrid}>
        <Metric label="Niveau" value={selectedStory.level} />
        <Metric label="Repliques" value={selectedStory.lines.length} />
        <Metric label="Score" value={`${selectedProgress?.correct_count ?? correct}/${selectedStory.questions.length}`} />
        <Metric label="Ouvert" value={selectedProgress?.opened_count ?? 0} />
      </View>

      <Section title={selectedStory.title}>
        <View style={styles.correctionInsightCard}>
          <Text style={styles.correctionInsightLabel}>Objectif</Text>
          <Text style={styles.correctionInsightText}>{selectedStory.goal}</Text>
          {selectedStory.lines.map((line, index) => (
            <View key={`${line.speaker}-${index}`} style={styles.pathRequirementItem}>
              <Text style={styles.pathRequirementIndex}>{line.speaker.slice(0, 2)}</Text>
              <View style={styles.vocabularyThemeTextBlock}>
                <JapaneseLookupText text={line.japanese} entries={entries} onSelect={setSelectedLookup} style={styles.correctionInsightJapanese} />
                <Text style={styles.correctionInsightText}>{line.kana}</Text>
                <Text style={styles.quickCorrectionText}>{line.translationFr}</Text>
              </View>
            </View>
          ))}
        </View>
        <WordLookupPanel entry={selectedLookup} onClose={() => setSelectedLookup(null)} />
      </Section>

      <Section title="Compréhension">
        <View style={styles.pathRequirementList}>
          {selectedStory.questions.map((question, index) => {
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
        <Text style={styles.quizConfigText}>Progression : {answered}/{selectedStory.questions.length} question(s).</Text>
      </Section>
    </ScrollView>
  );
}

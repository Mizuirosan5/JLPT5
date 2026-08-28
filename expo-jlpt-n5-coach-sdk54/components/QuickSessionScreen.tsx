import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { styles } from '../appStyles';
import type { LearningPreferences, WordLookupEntry } from '../models';
import { loadLearningPreferences } from '../services/preferences';
import {
  buildQuickSessionQuestions,
  calculateQuickSessionResult,
  claimQuickSessionReward,
  type QuickSessionQuestion,
  type QuickSessionResult,
} from '../services/quickSession';
import { recordSrsReviewForQuestionAttempt } from '../services/srs';
import { normalizeAnswer } from '../services/text';
import { EmptyState, LoadingView } from './sharedUi';
import { CelebrationBurst, ExerciseChoiceGrid, ExerciseFeedback, ExerciseHeader, SessionSummary } from './ExerciseShell';
import { playAnswerFeedback } from '../services/feedbackAudio';
import { useManagedTimers } from '../services/useManagedTimers';
import { JapaneseLookupText, useVocabularyLookupIndex, WordLookupPanel } from './JapaneseLookup';
import { useReducedMotion } from '../services/useReducedMotion';

type QuickAnswer = {
  questionId: string;
  prompt: string;
  choice: string;
  correctAnswer: string;
  isCorrect: boolean;
};

export function QuickSessionScreen() {
  const db = useSQLiteContext();
  const reducedMotion = useReducedMotion();
  const lookupEntries = useVocabularyLookupIndex(db);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<LearningPreferences | null>(null);
  const [questions, setQuestions] = useState<QuickSessionQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [answers, setAnswers] = useState<QuickAnswer[]>([]);
  const [result, setResult] = useState<QuickSessionResult | null>(null);
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const rewardAnim = useRef(new Animated.Value(0)).current;
  const sessionId = useRef(`${Date.now()}-${Math.random()}`);
  const sessionStartedAt = useRef(Date.now());
  const answerInFlight = useRef(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [selectedLookup, setSelectedLookup] = useState<WordLookupEntry | null>(null);
  const schedule = useManagedTimers();

  const current = questions[currentIndex] ?? null;
  const correctCount = answers.filter((answer) => answer.isCorrect).length;

  const load = useCallback(async () => {
    setLoading(true);
    setSelectedChoice(null);
    setAnswers([]);
    setResult(null);
    setRewardClaimed(false);
    sessionId.current = `${Date.now()}-${Math.random()}`;
    sessionStartedAt.current = Date.now();
    setElapsedMs(0);
    setSelectedLookup(null);
    setCurrentIndex(0);
    try {
      const loadedPreferences = await loadLearningPreferences(db);
      setPreferences(loadedPreferences);
      setQuestions(await buildQuickSessionQuestions(db, loadedPreferences));
    } catch (error) {
      console.error('Unable to build quick session', error);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!result || rewardClaimed) return;
    setRewardClaimed(true);
    rewardAnim.setValue(0);
    if (reducedMotion) {
      rewardAnim.setValue(1);
    } else {
    Animated.spring(rewardAnim, {
      toValue: 1,
      friction: 5,
      tension: 90,
      useNativeDriver: true,
    }).start();
    }
    claimQuickSessionReward(db, result, sessionId.current).catch((error) => {
      console.error('Unable to claim quick session reward', error);
    });
  }, [db, reducedMotion, result, rewardAnim, rewardClaimed]);

  const progressRate = useMemo(() => {
    if (questions.length === 0) return 0;
    return Math.round(((currentIndex + (selectedChoice ? 1 : 0)) / questions.length) * 100);
  }, [currentIndex, questions.length, selectedChoice]);

  async function answer(choice: string) {
    if (!current || selectedChoice || result || answerInFlight.current) return;
    answerInFlight.current = true;
    const isCorrect = normalizeAnswer(choice) === normalizeAnswer(current.question.correct_answer);
    setSelectedChoice(choice);
    const nextAnswers = [...answers, { questionId: current.question.question_id, prompt: current.question.prompt_fr, choice, correctAnswer: current.question.correct_answer, isCorrect }];
    setAnswers(nextAnswers);
    void playAnswerFeedback(isCorrect, preferences?.audioEnabled ?? true);
    try {
      await db.runAsync(
        `
        INSERT INTO app_question_attempt_local (
          id, question_id, source_mode, selected_answer, correct_answer,
          is_correct, skill_id, answered_at
        ) VALUES (?, ?, 'quick_session', ?, ?, ?, ?, datetime('now'))
        `,
        `${Date.now()}-${Math.random()}`,
        current.question.question_id,
        choice,
        current.question.correct_answer,
        isCorrect ? 1 : 0,
        current.question.skill_id
      );
      await recordSrsReviewForQuestionAttempt(db, {
        questionId: current.question.question_id,
        skillId: current.question.skill_id,
        sourceMode: 'quick_session',
        isCorrect,
      });
    } catch (error) {
      console.error('Unable to save quick session answer', error);
    } finally {
      answerInFlight.current = false;
    }
    if (isCorrect) schedule(() => advanceWithAnswers(nextAnswers), getCurrentStreak(nextAnswers) % 5 === 0 ? 1050 : 620);
  }

  function advanceWithAnswers(answerRows: QuickAnswer[]) {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= questions.length) {
      const finalCorrect = answerRows.filter((answer) => answer.isCorrect).length;
      setElapsedMs(Date.now() - sessionStartedAt.current);
      setResult(calculateQuickSessionResult(finalCorrect, questions.length));
      return;
    }
    setCurrentIndex(nextIndex);
    setSelectedChoice(null);
    setSelectedLookup(null);
  }

  function next() { if (selectedChoice) advanceWithAnswers(answers); }

  if (loading) return <LoadingView />;

  if (questions.length === 0) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <EmptyState title="Aucune session rapide disponible pour le moment." />
        <Pressable onPress={load} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Recharger</Text>
        </Pressable>
      </ScrollView>
    );
  }

  if (result) {
    const errors = answers.filter((answer) => !answer.isCorrect);
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View style={{ opacity: rewardAnim, transform: [{ scale: rewardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] }}>
          <SessionSummary
            bestStreak={getBestQuickStreak(answers)}
            correct={result.correct}
            durationLabel={formatSessionDuration(elapsedMs)}
            errors={errors.map((answer) => ({ id: answer.questionId, prompt: answer.prompt, selected: answer.choice, expected: answer.correctAnswer }))}
            onRestart={load}
            onRetryErrors={() => {
              const failedIds = new Set(errors.map((answer) => answer.questionId));
              setQuestions((items) => items.filter((item) => failedIds.has(item.question.question_id)));
              setAnswers([]);
              setCurrentIndex(0);
              setSelectedChoice(null);
              setResult(null);
              setRewardClaimed(false);
              sessionStartedAt.current = Date.now();
            }}
            total={result.total}
            xp={result.xp}
          />
        </Animated.View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ExerciseHeader
        current={currentIndex + 1}
        kicker={getStageKicker(current?.stage)}
        progress={progressRate}
        title={current?.stage === 'discovery' ? 'Premiers hiragana' : `${preferences?.preferredSessionLength ?? 5} minutes`}
        total={questions.length}
      />
      <Text style={styles.quickText}>{getStageDescription(current?.stage)}</Text>

      {current && (
        <View style={styles.quickQuestionCard}>
          <CelebrationBurst visible={!!selectedChoice && normalizeAnswer(selectedChoice) === normalizeAnswer(current.question.correct_answer) && getCurrentStreak(answers) > 0 && getCurrentStreak(answers) % 5 === 0} streak={getCurrentStreak(answers)} />
          <Text style={styles.quickQuestionSkill}>{formatQuickSkill(current.question.skill_id)}</Text>
          <Text style={styles.quickPrompt}>{current.question.prompt_fr}</Text>
          {!!current.helper && <Text style={styles.quickLearningHelper}>{current.helper}</Text>}
          {!!current.question.prompt_ja && (
            <JapaneseLookupText
              text={current.question.prompt_ja}
              entries={lookupEntries}
              onSelect={setSelectedLookup}
              style={styles.quickJapanese}
            />
          )}
          <WordLookupPanel entry={selectedLookup} onClose={() => setSelectedLookup(null)} />

          <ExerciseChoiceGrid
            choices={current.choices}
            disabled={!!selectedChoice}
            getState={(choice) => {
              if (!selectedChoice) return 'idle';
              if (normalizeAnswer(choice) === normalizeAnswer(current.question.correct_answer)) return 'correct';
              if (choice === selectedChoice) return 'wrong';
              return 'muted';
            }}
            onChoose={answer}
          />

          {!selectedChoice && (
            <Pressable onPress={() => answer('Je ne sais pas')} style={styles.quickUnknownButton}>
              <Text style={styles.quickUnknownButtonText}>Je ne sais pas</Text>
            </Pressable>
          )}

          {selectedChoice && (
            <ExerciseFeedback
              answer={current.question.correct_answer}
              correct={normalizeAnswer(selectedChoice) === normalizeAnswer(current.question.correct_answer)}
              explanation={current.question.explanation_fr}
            />
          )}
        </View>
      )}

      <View style={styles.quickFooterRow}>
        <Text style={styles.quickFooterText}>
          Score actuel : {correctCount}/{answers.length}
        </Text>
        <Pressable disabled={!selectedChoice} onPress={next} style={[styles.primaryButton, !selectedChoice && styles.primaryButtonDisabled]}>
          <Text style={styles.primaryButtonText}>{currentIndex + 1 >= questions.length ? 'Terminer' : 'Suivant'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function getStageKicker(stage?: QuickSessionQuestion['stage']): string {
  if (stage === 'discovery') return 'Découverte guidée';
  if (stage === 'hiragana') return 'Fondations hiragana';
  if (stage === 'kana') return 'Entraînement kana';
  return 'Session adaptée';
}

function getStageDescription(stage?: QuickSessionQuestion['stage']): string {
  if (stage === 'discovery') return 'Tu n’es pas censé connaître ces signes : chaque correction est expliquée après ton choix.';
  if (stage === 'hiragana') return 'Des signes fondamentaux, sans kanji ni grammaire avancée.';
  if (stage === 'kana') return 'Hiragana et katakana progressifs avant le vocabulaire.';
  return 'Kana, vocabulaire et kanji choisis selon tes acquis. La grammaire se travaille dans ses leçons dédiées.';
}

function formatQuickSkill(skill: string): string {
  if (skill === 'kana') return 'Kana · lecture';
  if (skill === 'vocabulary') return 'Vocabulaire · sens';
  if (skill === 'kanji') return 'Kanji · sens';
  return skill.replace(/_/g, ' ');
}

function getBestQuickStreak(answers: QuickAnswer[]): number {
  let current = 0;
  let best = 0;
  answers.forEach((answer) => {
    current = answer.isCorrect ? current + 1 : 0;
    best = Math.max(best, current);
  });
  return best;
}

function getCurrentStreak(answers: QuickAnswer[]): number {
  let streak = 0;
  for (let index = answers.length - 1; index >= 0 && answers[index]?.isCorrect; index -= 1) streak += 1;
  return streak;
}

function formatSessionDuration(elapsedMs: number): string {
  const seconds = Math.max(1, Math.round(elapsedMs / 1000));
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

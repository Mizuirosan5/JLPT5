import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { styles } from '../appStyles';
import type { LearningPreferences } from '../models';
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

type QuickAnswer = {
  questionId: string;
  choice: string;
  correctAnswer: string;
  isCorrect: boolean;
};

export function QuickSessionScreen() {
  const db = useSQLiteContext();
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
  const answerInFlight = useRef(false);

  const current = questions[currentIndex] ?? null;
  const correctCount = answers.filter((answer) => answer.isCorrect).length;

  const load = useCallback(async () => {
    setLoading(true);
    setSelectedChoice(null);
    setAnswers([]);
    setResult(null);
    setRewardClaimed(false);
    sessionId.current = `${Date.now()}-${Math.random()}`;
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
    Animated.spring(rewardAnim, {
      toValue: 1,
      friction: 5,
      tension: 90,
      useNativeDriver: true,
    }).start();
    claimQuickSessionReward(db, result, sessionId.current).catch((error) => {
      console.error('Unable to claim quick session reward', error);
    });
  }, [db, result, rewardAnim, rewardClaimed]);

  const progressRate = useMemo(() => {
    if (questions.length === 0) return 0;
    return Math.round(((currentIndex + (selectedChoice ? 1 : 0)) / questions.length) * 100);
  }, [currentIndex, questions.length, selectedChoice]);

  async function answer(choice: string) {
    if (!current || selectedChoice || result || answerInFlight.current) return;
    answerInFlight.current = true;
    const isCorrect = normalizeAnswer(choice) === normalizeAnswer(current.question.correct_answer);
    setSelectedChoice(choice);
    setAnswers((existing) => [
      ...existing,
      {
        questionId: current.question.question_id,
        choice,
        correctAnswer: current.question.correct_answer,
        isCorrect,
      },
    ]);
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
  }

  function next() {
    if (!selectedChoice) return;
    const nextIndex = currentIndex + 1;
    if (nextIndex >= questions.length) {
      const finalCorrect = answers.filter((answer) => answer.isCorrect).length;
      setResult(calculateQuickSessionResult(finalCorrect, questions.length));
      return;
    }
    setCurrentIndex(nextIndex);
    setSelectedChoice(null);
  }

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
    const rate = result.total > 0 ? Math.round((result.correct / result.total) * 100) : 0;
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.quickResultHero}>
          <Text style={styles.quickKicker}>Session terminee</Text>
          <Animated.View
            style={{
              opacity: rewardAnim,
              transform: [
                { scale: rewardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) },
                { translateY: rewardAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
              ],
            }}
          >
            <Text style={styles.quickResultScore}>{rate}%</Text>
            <Text style={styles.quickResultText}>+{result.xp} XP</Text>
          </Animated.View>
          <Text style={styles.quickResultText}>
            {result.correct}/{result.total} reponses justes. +{result.xp} XP ajoutes a ta progression.
          </Text>
        </View>
        <Pressable onPress={load} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Relancer une session</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.quickHero}>
        <View style={styles.quickHeroCopy}>
          <Text style={styles.quickKicker}>Mode rapide</Text>
          <Text style={styles.quickTitle}>{preferences?.preferredSessionLength ?? 5} minutes</Text>
          <Text style={styles.quickText}>Une session courte, choisie localement selon ton historique.</Text>
        </View>
        <View style={styles.quickCounter}>
          <Text style={styles.quickCounterValue}>{currentIndex + 1}</Text>
          <Text style={styles.quickCounterLabel}>/{questions.length}</Text>
        </View>
      </View>

      <View style={styles.quickProgressTrack}>
        <View style={[styles.quickProgressFill, { width: `${progressRate}%` }]} />
      </View>

      {current && (
        <View style={styles.quickQuestionCard}>
          <Text style={styles.quickQuestionSkill}>{current.question.skill_id.replace(/_/g, ' ')}</Text>
          <Text style={styles.quickPrompt}>{current.question.prompt_fr}</Text>
          {!!current.question.prompt_ja && <Text style={styles.quickJapanese}>{current.question.prompt_ja}</Text>}

          <View style={styles.quickChoiceList}>
            {current.choices.map((choice, choiceIndex) => {
              const isSelected = selectedChoice === choice;
              const isCorrect = normalizeAnswer(choice) === normalizeAnswer(current.question.correct_answer);
              return (
                <Pressable
                  key={`${current.question.question_id}-${choiceIndex}-${choice}`}
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
                {normalizeAnswer(selectedChoice) === normalizeAnswer(current.question.correct_answer) ? 'Bonne reponse' : 'A revoir'}
              </Text>
              <Text style={styles.quickCorrectionText}>{current.question.explanation_fr}</Text>
              <Text style={styles.quickCorrectionAnswer}>Reponse : {current.question.correct_answer}</Text>
            </View>
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

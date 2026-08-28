import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { styles } from '../appStyles';
import { useReducedMotion } from '../services/useReducedMotion';

export type ExerciseChoiceState = 'idle' | 'correct' | 'wrong' | 'muted';

const CONFETTI = ['#C83543', '#D4A72C', '#173E46', '#4C8C80', '#E58A55', '#7390A0', '#C83543', '#D4A72C', '#4C8C80', '#E58A55', '#173E46', '#7390A0'];

export function CelebrationBurst({ visible, streak }: { visible: boolean; streak: number }) {
  const progress = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (!visible) { progress.setValue(0); return; }
    if (reducedMotion) { progress.setValue(1); return; }
    progress.setValue(0);
    Animated.sequence([
      Animated.spring(progress, { toValue: 0.72, friction: 5, tension: 110, useNativeDriver: true }),
      Animated.timing(progress, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();
  }, [progress, reducedMotion, visible]);
  if (!visible) return null;
  if (reducedMotion) {
    return (
      <View pointerEvents="none" style={styles.celebrationOverlay}>
        <View style={styles.celebrationMessage}>
          <Text style={styles.celebrationKicker}>連続 · BELLE SÉRIE</Text>
          <Text style={styles.celebrationTitle}>{streak} réponses justes</Text>
        </View>
      </View>
    );
  }
  return (
    <View pointerEvents="none" style={styles.celebrationOverlay}>
      {CONFETTI.map((color, index) => {
        const direction = index % 2 === 0 ? -1 : 1;
        const distance = 34 + (index % 4) * 18;
        return <Animated.View key={`${color}-${index}`} style={[styles.celebrationConfetti, { backgroundColor: color, left: `${10 + index * 7}%`, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-8, 78 + (index % 3) * 18] }) }, { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, direction * distance] }) }, { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${direction * (180 + index * 25)}deg`] }) }], opacity: progress.interpolate({ inputRange: [0, 0.78, 1], outputRange: [1, 1, 0] }) }]} />;
      })}
      <Animated.View style={[styles.celebrationMessage, { opacity: progress.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 1, 1, 0] }), transform: [{ scale: progress.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.75, 1, 1.04] }) }] }]}><Text style={styles.celebrationKicker}>連続 · BELLE SÉRIE</Text><Text style={styles.celebrationTitle}>{streak} réponses justes</Text></Animated.View>
    </View>
  );
}

export function ExerciseHeader({
  kicker,
  title,
  current,
  total,
  progress,
}: {
  kicker: string;
  title: string;
  current: number;
  total: number;
  progress: number;
}) {
  return (
    <View style={styles.exerciseHeader}>
      <View style={styles.exerciseHeaderTop}>
        <View style={styles.exerciseHeaderCopy}>
          <Text style={styles.exerciseKicker}>{kicker}</Text>
          <Text style={styles.exerciseTitle}>{title}</Text>
        </View>
        <Text style={styles.exerciseCounter}>{current}/{total}</Text>
      </View>
      <View style={styles.exerciseProgressTrack}>
        <View style={[styles.exerciseProgressFill, { width: `${Math.max(0, Math.min(100, progress))}%` }]} />
      </View>
    </View>
  );
}

export function ExerciseChoiceGrid({
  choices,
  disabled,
  getState,
  onChoose,
}: {
  choices: string[];
  disabled: boolean;
  getState: (choice: string) => ExerciseChoiceState;
  onChoose: (choice: string) => void;
}) {
  return (
    <View style={styles.exerciseChoiceGrid}>
      {choices.map((choice, index) => {
        const state = getState(choice);
        return (
          <Pressable
            accessibilityRole="button"
            disabled={disabled}
            key={`${choice}-${index}`}
            onPress={() => onChoose(choice)}
            style={[
              styles.exerciseChoice,
              state === 'correct' && styles.exerciseChoiceCorrect,
              state === 'wrong' && styles.exerciseChoiceWrong,
              state === 'muted' && styles.exerciseChoiceMuted,
            ]}
          >
            <Text style={[styles.exerciseChoiceText, (state === 'correct' || state === 'wrong') && styles.exerciseChoiceTextActive]}>{choice}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ExerciseFeedback({
  correct,
  answer,
  explanation,
  children,
}: {
  correct: boolean;
  answer: string;
  explanation: string;
  children?: ReactNode;
}) {
  return (
    <View style={[styles.exerciseFeedback, correct ? styles.exerciseFeedbackCorrect : styles.exerciseFeedbackWrong]}>
      <Text style={styles.exerciseFeedbackKicker}>{correct ? '正解 · CORRECT' : '復習 · À REVOIR'}</Text>
      <Text style={styles.exerciseFeedbackAnswer}>{answer}</Text>
      <Text style={styles.exerciseFeedbackText}>{explanation}</Text>
      {children}
    </View>
  );
}

export type SessionSummaryError = {
  id: string;
  prompt: string;
  selected: string;
  expected: string;
};

export function SessionSummary({
  correct,
  total,
  xp,
  rewardLabel,
  durationLabel,
  bestStreak,
  errors,
  onRestart,
  onRetryErrors,
  onContinue,
}: {
  correct: number;
  total: number;
  xp: number;
  rewardLabel?: string;
  durationLabel: string;
  bestStreak: number;
  errors: SessionSummaryError[];
  onRestart: () => void;
  onRetryErrors?: () => void;
  onContinue?: () => void;
}) {
  const rate = total > 0 ? Math.round((correct / total) * 100) : 0;
  return (
    <View style={styles.sessionSummary}>
      <Text style={styles.sessionSummaryKicker}>SESSION TERMINÉE</Text>
      <Text style={styles.sessionSummaryScore}>{rate}%</Text>
      <View style={styles.sessionSummaryMetrics}>
        <SummaryMetric label="Réussite" value={`${correct}/${total}`} />
        <SummaryMetric label="Série max" value={`${bestStreak}`} />
        <SummaryMetric label="Durée" value={durationLabel} />
        <SummaryMetric label="Récompense" value={rewardLabel ?? `+${xp} XP`} />
      </View>
      {errors.length > 0 && (
        <View style={styles.sessionErrorList}>
          <Text style={styles.sessionErrorTitle}>Notions à reprendre</Text>
          {errors.map((error) => (
            <View key={error.id} style={styles.sessionErrorRow}>
              <Text numberOfLines={2} style={styles.sessionErrorPrompt}>{error.prompt}</Text>
              <Text style={styles.sessionErrorCorrection}>{error.selected} → {error.expected}</Text>
            </View>
          ))}
        </View>
      )}
      <View style={styles.sessionSummaryActions}>
        {!!onContinue && <Pressable onPress={onContinue} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Continuer</Text></Pressable>}
        {!!onRetryErrors && errors.length > 0 && <Pressable onPress={onRetryErrors} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Refaire mes erreurs</Text></Pressable>}
        <Pressable onPress={onRestart} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Recommencer</Text></Pressable>
      </View>
    </View>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.sessionSummaryMetric}>
      <Text style={styles.sessionSummaryMetricValue}>{value}</Text>
      <Text style={styles.sessionSummaryMetricLabel}>{label}</Text>
    </View>
  );
}

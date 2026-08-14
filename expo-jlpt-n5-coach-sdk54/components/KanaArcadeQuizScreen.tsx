import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { styles } from '../appStyles';
import { SegmentButton } from './formControls';
import { EmptyState, EmptyText, Section } from './sharedUi';
import type {
  KanaArcadeAnswer,
  KanaArcadeScoreRecord,
  KanaArcadeSession,
  KanaCard,
  KnowledgeQuizScope,
  MainQuizMode,
} from '../models';
import { buildKanaArcadeQuestions, getKanaArcadeMultiplier } from '../services/kanaArcade';
import { normalizeAnswer } from '../services/text';
import { formatElapsedTime } from '../services/time';
import { recordSrsReviewForQuestionAttempt } from '../services/srs';

type KanaArcadeQuizScreenProps = {
  kanaArcadeCards: KanaCard[];
  onNavigate: (mode: MainQuizMode, scope?: KnowledgeQuizScope) => void;
};

export function KanaArcadeQuizScreen({ kanaArcadeCards, onNavigate }: KanaArcadeQuizScreenProps) {
  const db = useSQLiteContext();
  const [kanaQuizSize, setKanaQuizSize] = useState<10 | 20>(10);
  const [kanaArcadeSession, setKanaArcadeSession] = useState<KanaArcadeSession | null>(null);
  const [kanaArcadeScores, setKanaArcadeScores] = useState<KanaArcadeScoreRecord[]>([]);
  const [arcadeCelebration, setArcadeCelebration] = useState<{
    streak: number;
    multiplier: number;
    points: number;
  } | null>(null);
  const [arcadeTick, setArcadeTick] = useState(Date.now());
  const arcadeCelebrateAnim = useRef(new Animated.Value(0)).current;
  const arcadeRecordAnim = useRef(new Animated.Value(0)).current;

  const loadKanaArcadeScores = useCallback(async () => {
    try {
      const rows = await db.getAllAsync<KanaArcadeScoreRecord>(
        `
        SELECT id, score, elapsed_ms, correct_count, total_count, best_streak, created_at
        FROM app_kana_arcade_score
        WHERE quiz_size = ?
        ORDER BY score DESC, elapsed_ms ASC, created_at DESC
        LIMIT 5
        `,
        kanaQuizSize
      );
      setKanaArcadeScores(rows);
    } catch (error) {
      console.error('Unable to load kana arcade scores', error);
      setKanaArcadeScores([]);
    }
  }, [db, kanaQuizSize]);

  const getKanaArcadeAllTimeBest = useCallback(async () => {
    try {
      return await db.getFirstAsync<KanaArcadeScoreRecord>(
        `
        SELECT id, score, elapsed_ms, correct_count, total_count, best_streak, created_at
        FROM app_kana_arcade_score
        ORDER BY score DESC, elapsed_ms ASC, created_at ASC
        LIMIT 1
        `
      );
    } catch (error) {
      console.error('Unable to load all-time best kana arcade score', error);
      return null;
    }
  }, [db]);

  useEffect(() => {
    loadKanaArcadeScores();
  }, [loadKanaArcadeScores]);

  useEffect(() => {
    if (!kanaArcadeSession || kanaArcadeSession.finished) return;
    const timer = setInterval(() => setArcadeTick(Date.now()), 250);
    return () => clearInterval(timer);
  }, [kanaArcadeSession]);

  const startKanaArcade = () => {
    const questions = buildKanaArcadeQuestions(kanaArcadeCards, kanaQuizSize);
    if (questions.length === 0) return;
    setArcadeTick(Date.now());
    setArcadeCelebration(null);
    setKanaArcadeSession({
      questions,
      currentIndex: 0,
      selected: null,
      answers: [],
      score: 0,
      streak: 0,
      bestStreak: 0,
      startedAt: Date.now(),
      finished: false,
    });
  };

  const quitKanaArcade = () => {
    setArcadeCelebration(null);
    setKanaArcadeSession(null);
  };

  const saveKanaArcadeScore = useCallback(
    async (session: KanaArcadeSession) => {
      const elapsed = session.elapsedMs ?? Math.max(0, Date.now() - session.startedAt);
      const correct = session.answers.filter((answer) => answer.isCorrect).length;
      try {
        await db.runAsync(
          `
          INSERT INTO app_kana_arcade_score (
            id, quiz_size, score, elapsed_ms, correct_count, total_count, best_streak, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
          `,
          `${Date.now()}-${Math.random()}`,
          kanaQuizSize,
          session.score,
          elapsed,
          correct,
          session.questions.length,
          session.bestStreak
        );
        await loadKanaArcadeScores();
      } catch (error) {
        console.error('Unable to save kana arcade score', error);
      }
    },
    [db, kanaQuizSize, loadKanaArcadeScores]
  );

  const advanceKanaArcadeFromSession = useCallback(
    async (session: KanaArcadeSession) => {
      const nextIndex = session.currentIndex + 1;
      const finished = nextIndex >= session.questions.length;
      const elapsedMs = finished ? Math.max(0, Date.now() - session.startedAt) : session.elapsedMs;
      const previousBest = finished ? await getKanaArcadeAllTimeBest() : null;
      const isNewBestScore =
        finished &&
        (!previousBest ||
          session.score > previousBest.score ||
          (session.score === previousBest.score && (elapsedMs ?? 0) < previousBest.elapsed_ms));
      const nextSession = {
        ...session,
        currentIndex: Math.min(nextIndex, session.questions.length - 1),
        selected: null,
        finished,
        elapsedMs,
        isNewBestScore,
        allTimeBest: isNewBestScore
          ? {
              id: 'current',
              score: session.score,
              elapsed_ms: elapsedMs ?? 0,
              correct_count: session.answers.filter((answer) => answer.isCorrect).length,
              total_count: session.questions.length,
              best_streak: session.bestStreak,
              created_at: new Date().toISOString(),
            }
          : previousBest,
      };
      setKanaArcadeSession(nextSession);
      if (finished) {
        if (isNewBestScore) {
          arcadeRecordAnim.setValue(0);
          Animated.sequence([
            Animated.timing(arcadeRecordAnim, {
              toValue: 1,
              duration: 420,
              useNativeDriver: true,
            }),
            Animated.timing(arcadeRecordAnim, {
              toValue: 0.96,
              duration: 900,
              useNativeDriver: true,
            }),
          ]).start();
        }
        await saveKanaArcadeScore(nextSession);
      }
    },
    [arcadeRecordAnim, getKanaArcadeAllTimeBest, saveKanaArcadeScore]
  );

  const answerKanaArcade = async (choice: string) => {
    if (!kanaArcadeSession || kanaArcadeSession.selected || kanaArcadeSession.finished) return;
    const current = kanaArcadeSession.questions[kanaArcadeSession.currentIndex];
    if (!current) return;
    const isCorrect = normalizeAnswer(choice) === normalizeAnswer(current.prompt.romaji);
    const nextStreak = isCorrect ? kanaArcadeSession.streak + 1 : 0;
    const multiplier = isCorrect ? getKanaArcadeMultiplier(nextStreak) : 0;
    const points = isCorrect ? Math.round(100 * multiplier) : 0;
    const nextAnswer: KanaArcadeAnswer = {
      questionId: current.prompt.id,
      prompt: current.prompt.character,
      selected: choice,
      correct: current.prompt.romaji,
      isCorrect,
      points,
      multiplier,
    };
    try {
      await db.runAsync(
        `
        INSERT INTO app_question_attempt_local (
          id, question_id, source_mode, selected_answer, correct_answer,
          is_correct, skill_id, answered_at
        ) VALUES (?, ?, 'kana_arcade', ?, ?, ?, ?, datetime('now'))
        `,
        `${Date.now()}-${Math.random()}`,
        current.prompt.id,
        choice,
        current.prompt.romaji,
        isCorrect ? 1 : 0,
        `kana_arcade:${current.prompt.script}:${current.prompt.character.length > 1 ? 'combined' : 'basic'}`
      );
      await recordSrsReviewForQuestionAttempt(db, {
        questionId: current.prompt.id,
        itemId: current.prompt.id,
        itemType: 'kana',
        skillId: `kana_arcade:${current.prompt.script}:${current.prompt.character.length > 1 ? 'combined' : 'basic'}`,
        sourceMode: 'kana_arcade',
        isCorrect,
      });
    } catch (error) {
      console.error('Unable to save kana arcade answer', error);
    }
    const nextSession = {
      ...kanaArcadeSession,
      selected: choice,
      score: kanaArcadeSession.score + points,
      streak: nextStreak,
      bestStreak: Math.max(kanaArcadeSession.bestStreak, nextStreak),
      answers: [...kanaArcadeSession.answers, nextAnswer],
    };
    setKanaArcadeSession(nextSession);
    if (isCorrect) {
      setArcadeCelebration({ streak: nextStreak, multiplier, points });
      arcadeCelebrateAnim.setValue(0);
      Animated.sequence([
        Animated.timing(arcadeCelebrateAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(arcadeCelebrateAnim, {
          toValue: 0,
          duration: 900,
          delay: 500,
          useNativeDriver: true,
        }),
      ]).start();
      setTimeout(() => setArcadeCelebration(null), 1700);
    } else {
      setArcadeCelebration(null);
    }
    setTimeout(() => {
      void advanceKanaArcadeFromSession(nextSession);
    }, isCorrect ? 850 : 650);
  };

  const nextKanaArcade = async () => {
    if (!kanaArcadeSession) return;
    await advanceKanaArcadeFromSession(kanaArcadeSession);
  };

  {
    const liveElapsed = kanaArcadeSession
      ? kanaArcadeSession.elapsedMs ?? Math.max(0, arcadeTick - kanaArcadeSession.startedAt)
      : 0;
    const currentArcadeQuestion = kanaArcadeSession?.questions[kanaArcadeSession.currentIndex] ?? null;
    const correctCount = kanaArcadeSession?.answers.filter((answer) => answer.isCorrect).length ?? 0;
    const currentMultiplier = getKanaArcadeMultiplier(kanaArcadeSession?.streak ?? 0);

    return (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.segmented}>
          <SegmentButton label="Tout" active={false} onPress={() => onNavigate('global', 'all')} />
          <SegmentButton label="Kana" active onPress={() => onNavigate('global', 'kana')} />
          <SegmentButton label="Vocab" active={false} onPress={() => onNavigate('global', 'vocabulary')} />
        </View>
        <View style={styles.segmented}>
          <SegmentButton label="Grammaire" active={false} onPress={() => onNavigate('grammar')} />
          <SegmentButton label="Kanji" active={false} onPress={() => onNavigate('global', 'kanji')} />
          <SegmentButton label="JLPT" active={false} onPress={() => onNavigate('adaptive')} />
        </View>

        {!kanaArcadeSession ? (
          <>
            <View style={styles.arcadeHero}>
              <Text style={styles.arcadeKicker}>Arcade Kana</Text>
              <Text style={styles.arcadeTitle}>Hiragana, katakana et sons combinés</Text>
              <Text style={styles.arcadeText}>
                QCM chronométré avec score, séries et multiplicateurs. Une bonne réponse vaut 100 points avant bonus.
              </Text>
            </View>
            <Section title="Configuration">
              <View style={styles.segmented}>
                <SegmentButton label="10 questions" active={kanaQuizSize === 10} onPress={() => setKanaQuizSize(10)} />
                <SegmentButton label="20 questions" active={kanaQuizSize === 20} onPress={() => setKanaQuizSize(20)} />
              </View>
              <View style={styles.arcadeRulesGrid}>
                <View style={styles.arcadeRuleCard}>
                  <Text style={styles.arcadeRuleValue}>100</Text>
                  <Text style={styles.arcadeRuleLabel}>points de base</Text>
                </View>
                <View style={styles.arcadeRuleCard}>
                  <Text style={styles.arcadeRuleValue}>x5</Text>
                  <Text style={styles.arcadeRuleLabel}>combo max</Text>
                </View>
                <View style={styles.arcadeRuleCard}>
                  <Text style={styles.arcadeRuleValue}>0</Text>
                  <Text style={styles.arcadeRuleLabel}>si erreur</Text>
                </View>
              </View>
              <View style={styles.quizConfigCard}>
                <Text style={styles.quizConfigTitle}>{kanaQuizSize} questions prêtes</Text>
                <Text style={styles.quizConfigMode}>Deck complet kana</Text>
                <Text style={styles.quizConfigText}>
                  Pool disponible : {kanaArcadeCards.length} kana, incluant hiragana, katakana et sons combinés.
                </Text>
                <Text style={styles.quizConfigText}>
                  Multiplicateur : x1 puis x1.5 à 3 bonnes réponses, x2 à 5, x3 à 8, x4 à 10 et x5 à 12.
                </Text>
              </View>
              <Pressable
                disabled={kanaArcadeCards.length < 4}
                style={[styles.primaryButton, kanaArcadeCards.length < 4 && styles.primaryButtonDisabled]}
                onPress={startKanaArcade}
              >
                <Text style={styles.primaryButtonText}>Lancer le Quiz Kana</Text>
              </Pressable>
            </Section>
            <Section title="Meilleurs scores">
              {kanaArcadeScores.length === 0 ? (
                <EmptyText text="Lance un Quiz Kana pour créer ton premier score." />
              ) : (
                <View style={styles.timeRankingCard}>
                  {kanaArcadeScores.map((record, index) => (
                    <View key={record.id} style={styles.timeRankingRow}>
                      <Text style={styles.timeRankingRank}>#{index + 1}</Text>
                      <Text style={styles.timeRankingTime}>{record.score} pts</Text>
                      <Text style={styles.timeRankingMeta}>
                        {record.correct_count}/{record.total_count} · {formatElapsedTime(record.elapsed_ms)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </Section>
          </>
        ) : kanaArcadeSession.finished ? (
          <>
            {kanaArcadeSession.isNewBestScore && (
              <Animated.View
                style={[
                  styles.arcadeRecordBanner,
                  {
                    opacity: arcadeRecordAnim,
                    transform: [
                      {
                        scale: arcadeRecordAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.92, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Text style={styles.arcadeRecordKicker}>Nouveau record</Text>
                <Text style={styles.arcadeRecordTitle}>Meilleur score de tous les temps</Text>
                <Text style={styles.arcadeRecordScore}>
                  {kanaArcadeSession.score} pts · {formatElapsedTime(kanaArcadeSession.elapsedMs ?? liveElapsed)}
                </Text>
                <View style={styles.arcadeConfettiRow}>
                  <View style={[styles.arcadeConfetti, styles.arcadeConfettiGold]} />
                  <View style={[styles.arcadeConfetti, styles.arcadeConfettiGreen]} />
                  <View style={[styles.arcadeConfetti, styles.arcadeConfettiRed]} />
                  <View style={[styles.arcadeConfetti, styles.arcadeConfettiBlue]} />
                </View>
              </Animated.View>
            )}
            <View style={styles.resultCard}>
              <Text style={styles.resultKicker}>Quiz Kana terminé</Text>
              <Text style={styles.resultScore}>{kanaArcadeSession.score}</Text>
              <Text style={styles.resultPercent}>points · {correctCount}/{kanaArcadeSession.questions.length} bonnes réponses</Text>
              <Text style={styles.resultTime}>Temps : {formatElapsedTime(kanaArcadeSession.elapsedMs ?? liveElapsed)}</Text>
              <Text style={styles.resultTime}>Meilleure série : {kanaArcadeSession.bestStreak}</Text>
            </View>
            <Section title="Meilleur score de tous les temps">
              <View style={styles.arcadeBestScoreCard}>
                <Text style={styles.arcadeBestScoreValue}>
                  {(kanaArcadeSession.allTimeBest?.score ?? kanaArcadeSession.score)} pts
                </Text>
                <Text style={styles.arcadeBestScoreMeta}>
                  Temps : {formatElapsedTime(kanaArcadeSession.allTimeBest?.elapsed_ms ?? kanaArcadeSession.elapsedMs ?? liveElapsed)}
                </Text>
                <Text style={styles.arcadeBestScoreMeta}>
                  Réussite : {kanaArcadeSession.allTimeBest?.correct_count ?? correctCount}/
                  {kanaArcadeSession.allTimeBest?.total_count ?? kanaArcadeSession.questions.length} · Série max {kanaArcadeSession.allTimeBest?.best_streak ?? kanaArcadeSession.bestStreak}
                </Text>
              </View>
            </Section>
            <Section title="Détail des points">
              {kanaArcadeSession.answers.map((answer, index) => (
                <View key={`${answer.questionId}-${index}`} style={styles.answerReviewRow}>
                  <Text style={styles.answerReviewIndex}>{index + 1}</Text>
                  <Text style={styles.answerReviewText}>
                    {answer.prompt} · {answer.selected} / {answer.correct}
                  </Text>
                  <Text style={[styles.answerReviewStatus, answer.isCorrect ? styles.answerOk : styles.answerKo]}>
                    {answer.isCorrect ? `+${answer.points} x${answer.multiplier}` : '0'}
                  </Text>
                </View>
              ))}
            </Section>
            <Section title="Classement">
              <View style={styles.timeRankingCard}>
                {kanaArcadeScores.map((record, index) => (
                  <View key={record.id} style={styles.timeRankingRow}>
                    <Text style={styles.timeRankingRank}>#{index + 1}</Text>
                    <Text style={styles.timeRankingTime}>{record.score} pts</Text>
                    <Text style={styles.timeRankingMeta}>
                      {record.correct_count}/{record.total_count} · {formatElapsedTime(record.elapsed_ms)}
                    </Text>
                  </View>
                ))}
              </View>
            </Section>
            <Pressable style={styles.primaryButton} onPress={startKanaArcade}>
              <Text style={styles.primaryButtonText}>Rejouer</Text>
            </Pressable>
            <Pressable style={styles.secondaryFullButton} onPress={quitKanaArcade}>
              <Text style={styles.secondaryFullButtonText}>Quitter</Text>
            </Pressable>
          </>
        ) : currentArcadeQuestion ? (
          <>
            <View style={styles.arcadeHud}>
              <View>
                <Text style={styles.questionMeta}>
                  Question {kanaArcadeSession.currentIndex + 1}/{kanaArcadeSession.questions.length}
                </Text>
                <Text style={styles.arcadeHudScore}>{kanaArcadeSession.score} pts</Text>
                <Text style={styles.arcadeHudCorrect}>
                  {correctCount}/{kanaArcadeSession.questions.length} bonnes réponses
                </Text>
              </View>
              <View style={styles.arcadeHudRight}>
                <Text style={styles.quizTimerPill}>{formatElapsedTime(liveElapsed)}</Text>
                <Text style={styles.quizScorePill}>Série {kanaArcadeSession.streak} · x{currentMultiplier}</Text>
              </View>
            </View>
            {arcadeCelebration && (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.arcadeCelebration,
                    {
                      opacity: arcadeCelebrateAnim,
                      transform: [
                        {
                          translateY: arcadeCelebrateAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [10, 0],
                          }),
                        },
                        {
                          scale: arcadeCelebrateAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.96, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Text style={styles.arcadeCelebrationTitle}>+{arcadeCelebration.points} pts</Text>
                  <Text style={styles.arcadeCelebrationText}>
                    Série {arcadeCelebration.streak} · x{arcadeCelebration.multiplier}
                  </Text>
                </Animated.View>
              )}
            <Text style={styles.kanaExercisePrompt}>{currentArcadeQuestion.prompt.character}</Text>
            <Text style={styles.questionTitle}>Choisis le bon romaji</Text>
            <View style={styles.choiceList}>
              {currentArcadeQuestion.choices.map((choice) => {
                const isCorrect = normalizeAnswer(choice) === normalizeAnswer(currentArcadeQuestion.prompt.romaji);
                const isSelected = normalizeAnswer(kanaArcadeSession.selected ?? '') === normalizeAnswer(choice);
                return (
                  <Pressable
                    key={choice}
                    disabled={kanaArcadeSession.selected !== null}
                    onPress={() => answerKanaArcade(choice)}
                    style={[
                      styles.choice,
                      kanaArcadeSession.selected && isCorrect && styles.choiceCorrect,
                      kanaArcadeSession.selected && isSelected && !isCorrect && styles.choiceWrong,
                    ]}
                  >
                    <Text style={styles.choiceText}>{choice}</Text>
                    {kanaArcadeSession.selected && isCorrect && <Text style={styles.choiceIcon}>✓</Text>}
                    {kanaArcadeSession.selected && isSelected && !isCorrect && <Text style={styles.choiceIcon}>×</Text>}
                  </Pressable>
                );
              })}
            </View>
            {kanaArcadeSession.selected && (
              <View style={styles.feedback}>
                <Text style={styles.feedbackTitle}>
                  {normalizeAnswer(kanaArcadeSession.selected) === normalizeAnswer(currentArcadeQuestion.prompt.romaji)
                    ? 'Combo validé'
                    : 'Série cassée'}
                </Text>
                <Text style={styles.feedbackText}>
                  Réponse : {currentArcadeQuestion.prompt.character} se lit {currentArcadeQuestion.prompt.romaji}.
                </Text>
                <Text style={styles.feedbackMnemonic}>
                  Passage automatique à la question suivante.
                </Text>
                <Pressable style={styles.secondaryFullButton} onPress={quitKanaArcade}>
                  <Text style={styles.secondaryFullButtonText}>Quitter</Text>
                </Pressable>
              </View>
            )}
          </>
        ) : (
          <EmptyState title="Pas assez de kana pour créer le quiz" />
        )}
      </ScrollView>
    );
  }
}

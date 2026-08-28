import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { styles } from '../appStyles';
import { SegmentButton } from './formControls';
import { JapaneseLookupText, WordLookupPanel } from './JapaneseLookup';
import { EmptyState, Section } from './sharedUi';
import { OfflineAudioButton } from './OfflineAudioButton';
import { SmartCorrectionInsightCard } from './SmartCorrectionInsightCard';
import { GRAMMAR_QUIZ_MODES } from '../models';
import type { GrammarExerciseKind, GrammarLesson, GrammarMatchingPair, GrammarMatchingRound, GrammarMatchingSession, GrammarQuizMistake, GrammarQuizMode, GrammarQuizQuestion, GrammarQuizSession, LearningPreferences, WordLookupEntry } from '../models';
import { buildGrammarQuestionAnswerQuiz, buildGrammarQuizQuestions, createGrammarMatchingSession, maskGrammarKeyword, uniqueChoices } from '../services/grammarQuizFactory';
import { GRAMMAR_KEY_TOKENS, buildGrammarCorrectionDetails, createGrammarSession, getGrammarExerciseInstruction, getGrammarKeyword, getGrammarStreakMultiplier, hideGrammarAnswerInHint, humanizeGrammarFormula, isGrammarAnswerCorrect } from '../services/grammarPedagogy';
import { ALL_GRAMMAR_LESSONS, getGrammarMainMenu, humanizeGrammarPattern } from '../services/grammarCourse';
import { hasJapaneseText, normalizeAnswer } from '../services/text';
import { getExerciseInstruction } from '../services/exerciseFactory';
import { recordGrammarExerciseAttempt } from '../services/grammarProgress';
import { DEFAULT_LEARNING_PREFERENCES, loadLearningPreferences } from '../services/preferences';
import { saveErrorFlashcard } from '../services/errorFlashcards';
import { clearSession, loadSession, saveSession } from '../services/sessionPersistence';
import { recordTechnicalLog } from '../services/technicalLog';
import { useManagedTimers } from '../services/useManagedTimers';
import { filterGrammarForCurriculum, loadCurriculumProfile } from '../services/curriculum';
import type { CurriculumCode } from '../data/curriculum';
import type { GrammarQuizScreenProps, GrammarQuizSnapshot } from './grammarQuizModels';
import { CelebrationBurst, ExerciseChoiceGrid, ExerciseFeedback, ExerciseHeader, SessionSummary } from './ExerciseShell';
import { playAnswerFeedback } from '../services/feedbackAudio';
const GRAMMAR_QUIZ_SESSION_KEY = 'quiz:grammar';
export function GrammarQuizScreen({ vocabularyLookupEntries, onNavigate }: GrammarQuizScreenProps) {
  const db = useSQLiteContext();
  const [grammarQuizSize, setGrammarQuizSize] = useState<10 | 20>(10);
  const [grammarQuizMode, setGrammarQuizMode] = useState<GrammarQuizMode>('blank_qcm');
  const [grammarQuizSession, setGrammarQuizSession] = useState<GrammarQuizSession | null>(null);
  const [grammarMatchingSession, setGrammarMatchingSession] = useState<GrammarMatchingSession | null>(null);
  const [grammarMatchMessage, setGrammarMatchMessage] = useState('Choisis une phrase, puis sa traduction.');
  const [grammarDirectInput, setGrammarDirectInput] = useState('');
  const [grammarQuizRomajiVisible, setGrammarQuizRomajiVisible] = useState(false);
  const [grammarQuizFrenchVisible, setGrammarQuizFrenchVisible] = useState(false);
  const [grammarQuizKanaOnly, setGrammarQuizKanaOnly] = useState(false);
  const [selectedWordLookup, setSelectedWordLookup] = useState<WordLookupEntry | null>(null);
  const [selectedWordLookupAnchorId, setSelectedWordLookupAnchorId] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<LearningPreferences>(DEFAULT_LEARNING_PREFERENCES);
  const [grammarErrorCardAdded, setGrammarErrorCardAdded] = useState(false);
  const [sessionHydrated, setSessionHydrated] = useState(false);
  const [availableLessons, setAvailableLessons] = useState<GrammarLesson[]>(() => filterGrammarForCurriculum(ALL_GRAMMAR_LESSONS, '1A'));
  const [curriculumCode, setCurriculumCode] = useState<CurriculumCode>('1A');
  const answerInFlight = useRef(false);
  const sessionStartedAt = useRef(Date.now());
  const schedule = useManagedTimers();
  useEffect(() => {
    Promise.all([loadLearningPreferences(db), loadCurriculumProfile(db)])
      .then(([loadedPreferences, curriculum]) => {
        setPreferences(loadedPreferences);
        setAvailableLessons(filterGrammarForCurriculum(ALL_GRAMMAR_LESSONS, curriculum.currentCode));
        setCurriculumCode(curriculum.currentCode);
        setGrammarQuizRomajiVisible(loadedPreferences.showRomaji);
        setGrammarQuizFrenchVisible(loadedPreferences.showTranslationFirst);
      })
      .catch((error) => console.error('Unable to load grammar quiz preferences', error));
  }, [db]);
  useEffect(() => {
    loadSession<GrammarQuizSnapshot>(db, GRAMMAR_QUIZ_SESSION_KEY)
      .then((snapshot) => {
        if (!snapshot || snapshot.curriculumCode !== curriculumCode) return;
        setGrammarQuizMode(snapshot.mode);
        setGrammarQuizSize(snapshot.size);
        setGrammarQuizSession(snapshot.quizSession);
        setGrammarMatchingSession(snapshot.matchingSession);
      })
      .catch((error) => recordTechnicalLog(db, 'error', 'grammar_quiz_restore', error instanceof Error ? error.message : String(error)))
      .finally(() => setSessionHydrated(true));
  }, [db]);
  useEffect(() => {
    if (!sessionHydrated) return;
    if (!grammarQuizSession && !grammarMatchingSession) {
      clearSession(db, GRAMMAR_QUIZ_SESSION_KEY).catch(() => undefined);
      return;
    }
    saveSession<GrammarQuizSnapshot>(db, GRAMMAR_QUIZ_SESSION_KEY, {
      mode: grammarQuizMode,
      size: grammarQuizSize,
      quizSession: grammarQuizSession,
      matchingSession: grammarMatchingSession,
      curriculumCode,
    }).catch((error) => recordTechnicalLog(db, 'error', 'grammar_quiz_save', error instanceof Error ? error.message : String(error)));
  }, [curriculumCode, db, grammarMatchingSession, grammarQuizMode, grammarQuizSession, grammarQuizSize, sessionHydrated]);
  const startGrammarQuiz = () => {
    sessionStartedAt.current = Date.now();
    if (grammarQuizMode === 'matching') {
      setGrammarQuizSession(null);
      setGrammarMatchingSession(createGrammarMatchingSession(availableLessons));
      setGrammarMatchMessage('Choisis une phrase, puis sa traduction.');
    } else {
      const questions =
        grammarQuizMode === 'question_answer'
          ? buildGrammarQuestionAnswerQuiz(grammarQuizSize, availableLessons)
          : buildGrammarQuizQuestions(grammarQuizSize, grammarQuizMode, availableLessons);
      setGrammarMatchingSession(null);
      setGrammarQuizSession(createGrammarSession(questions));
    }
    setGrammarDirectInput('');
    setGrammarQuizRomajiVisible(preferences.showRomaji);
    setGrammarQuizFrenchVisible(preferences.showTranslationFirst);
    setGrammarQuizKanaOnly(false);
    setSelectedWordLookup(null);
    setSelectedWordLookupAnchorId(null);
    setGrammarErrorCardAdded(false);
  };
  const restartGrammarQuizMistakes = () => {
    if (!grammarQuizSession?.mistakes.length) return;
    sessionStartedAt.current = Date.now();
    setGrammarQuizSession(createGrammarSession(grammarQuizSession.mistakes.map((mistake) => mistake.question)));
    setGrammarDirectInput('');
    setGrammarQuizRomajiVisible(preferences.showRomaji);
    setGrammarQuizFrenchVisible(preferences.showTranslationFirst);
    setGrammarQuizKanaOnly(false);
    setSelectedWordLookup(null);
    setSelectedWordLookupAnchorId(null);
    setGrammarErrorCardAdded(false);
  };
  const answerGrammarQuiz = async (choice: string) => {
    if (!grammarQuizSession || grammarQuizSession.selected || grammarQuizSession.finished || answerInFlight.current) return;
    const current = grammarQuizSession.questions[grammarQuizSession.currentIndex];
    if (!current) return;
    answerInFlight.current = true;
    const isCorrect = isGrammarAnswerCorrect(choice, current.correctAnswer);
    const nextStreak = isCorrect ? grammarQuizSession.streak + 1 : 0;
    const points = isCorrect ? 100 * getGrammarStreakMultiplier(nextStreak) : 0;
    try {
      await recordGrammarExerciseAttempt(db, current.lesson, choice, current.correctAnswer, isCorrect, 'grammar_quiz', getGrammarMainMenu);
    } catch (error) {
      console.error('Unable to save grammar quiz answer', error);
    } finally {
      answerInFlight.current = false;
    }
    setGrammarQuizSession({
      ...grammarQuizSession,
      selected: choice,
      correctCount: grammarQuizSession.correctCount + (isCorrect ? 1 : 0),
      score: grammarQuizSession.score + points,
      streak: nextStreak,
      bestStreak: Math.max(grammarQuizSession.bestStreak, nextStreak),
      lives: isCorrect ? grammarQuizSession.lives : Math.max(0, grammarQuizSession.lives - 1),
      mistakes: isCorrect
        ? grammarQuizSession.mistakes
        : [...grammarQuizSession.mistakes, { question: current, selected: choice }],
    });
    setGrammarDirectInput('');
    void playAnswerFeedback(isCorrect, preferences.audioEnabled);
    if (isCorrect) schedule(advanceGrammarQuiz, nextStreak > 0 && nextStreak % 5 === 0 ? 1050 : 620);
  };
  const advanceGrammarQuiz = () => {
    setGrammarQuizSession((session) => {
      if (!session) return session;
      const nextIndex = session.currentIndex + 1;
      const finished = session.lives <= 0 || nextIndex >= session.questions.length;
      return { ...session, currentIndex: finished ? session.currentIndex : nextIndex, selected: null, finished };
    });
    setGrammarQuizRomajiVisible(preferences.showRomaji);
    setGrammarQuizFrenchVisible(preferences.showTranslationFirst);
    setGrammarQuizKanaOnly(false);
    setSelectedWordLookup(null);
    setSelectedWordLookupAnchorId(null);
    setGrammarErrorCardAdded(false);
  };
  const quitGrammarQuiz = () => {
    setGrammarQuizSession(null);
    setGrammarMatchingSession(null);
    setGrammarMatchMessage('Choisis une phrase, puis sa traduction.');
    setGrammarDirectInput('');
    setGrammarQuizRomajiVisible(false);
    setGrammarQuizFrenchVisible(false);
    setGrammarQuizKanaOnly(false);
    setSelectedWordLookup(null);
    setSelectedWordLookupAnchorId(null);
    setGrammarErrorCardAdded(false);
  };
  const selectGrammarMatchLeft = (pairId: string) => {
    if (!grammarMatchingSession || grammarMatchingSession.finished || grammarMatchingSession.locked) return;
    if (grammarMatchingSession.matchedIds.includes(pairId)) return;
    setGrammarMatchingSession({
      ...grammarMatchingSession,
      selectedLeftId: pairId,
      selectedRightId: null,
    });
    setGrammarMatchMessage('Maintenant, choisis la traduction correspondante.');
  };
  const answerGrammarMatchRight = async (pairId: string) => {
    if (
      !grammarMatchingSession ||
      grammarMatchingSession.finished ||
      grammarMatchingSession.locked ||
      !grammarMatchingSession.selectedLeftId ||
      grammarMatchingSession.matchedIds.includes(pairId)
    ) {
      return;
    }
    const round = grammarMatchingSession.rounds[grammarMatchingSession.currentRound];
    const selectedPair = round?.pairs.find((pair) => pair.id === grammarMatchingSession.selectedLeftId);
    const chosenPair = round?.pairs.find((pair) => pair.id === pairId);
    if (!selectedPair || !chosenPair) return;
    if (answerInFlight.current) return;
    answerInFlight.current = true;
    const isCorrect = selectedPair.id === chosenPair.id;
    const answeredSession = {
      ...grammarMatchingSession,
      selectedRightId: pairId,
      attempts: grammarMatchingSession.attempts + 1,
      errors: grammarMatchingSession.errors + (isCorrect ? 0 : 1),
      locked: true,
    };
    setGrammarMatchingSession(answeredSession);
    setGrammarMatchMessage(isCorrect ? 'Bonne association.' : 'Ces deux cartes ne vont pas ensemble. Réessaie.');
    try {
      await recordGrammarExerciseAttempt(
        db,
        selectedPair.lesson,
        chosenPair.french,
        selectedPair.french,
        isCorrect,
        'grammar_matching',
        getGrammarMainMenu
      );
    } catch (error) {
      console.error('Unable to save grammar matching answer', error);
    } finally {
      answerInFlight.current = false;
    }
    schedule(() => {
      setGrammarMatchingSession((current) => {
        if (!current) return current;
        if (!isCorrect) {
          return { ...current, selectedLeftId: null, selectedRightId: null, locked: false };
        }
        const matchedIds = [...current.matchedIds, selectedPair.id];
        const currentRound = current.rounds[current.currentRound];
        const roundComplete = currentRound.pairs.every((pair) => matchedIds.includes(pair.id));
        const finalRound = current.currentRound + 1 >= current.rounds.length;
        if (roundComplete && finalRound) {
          setGrammarMatchMessage('Toutes les paires sont reliées. Excellent travail.');
          return {
            ...current,
            matchedIds,
            selectedLeftId: null,
            selectedRightId: null,
            score: current.score + 100,
            finished: true,
            locked: false,
          };
        }
        if (roundComplete) {
          setGrammarMatchMessage('Manche réussie. La suivante commence.');
          return {
            ...current,
            currentRound: current.currentRound + 1,
            matchedIds,
            selectedLeftId: null,
            selectedRightId: null,
            score: current.score + 250,
            locked: false,
          };
        }
        setGrammarMatchMessage('Paire validée. Continue.');
        return {
          ...current,
          matchedIds,
          selectedLeftId: null,
          selectedRightId: null,
          score: current.score + 100,
          locked: false,
        };
      });
    }, isCorrect ? 450 : 650);
  };
  {
    const currentGrammarQuestion = grammarQuizSession?.questions[grammarQuizSession.currentIndex] ?? null;
    const grammarTotal = grammarQuizSession?.questions.length ?? grammarQuizSize;
    const safeGrammarQuizRomaji = currentGrammarQuestion
      ? hideGrammarAnswerInHint(
          currentGrammarQuestion.romaji,
          currentGrammarQuestion.correctAnswer,
          'Romaji complet masqué pendant cette question.'
        )
      : '';
    const safeGrammarQuizFrench = currentGrammarQuestion
      ? hideGrammarAnswerInHint(
          currentGrammarQuestion.french,
          currentGrammarQuestion.correctAnswer,
          'Traduction complète masquée pendant cette question.'
        )
      : '';
    const grammarRate =
      grammarQuizSession && grammarQuizSession.questions.length > 0
        ? Math.round((grammarQuizSession.correctCount / grammarQuizSession.questions.length) * 100)
        : 0;
    const currentMatchingRound = grammarMatchingSession?.rounds[grammarMatchingSession.currentRound] ?? null;
    const matchingTotal = grammarMatchingSession
      ? grammarMatchingSession.rounds.reduce((total, round) => total + round.pairs.length, 0)
      : 0;
    const matchingRate = grammarMatchingSession?.attempts
      ? Math.round(((grammarMatchingSession.attempts - grammarMatchingSession.errors) / grammarMatchingSession.attempts) * 100)
      : 100;
    const activeGrammarMode = GRAMMAR_QUIZ_MODES.find((mode) => mode.id === grammarQuizMode) ?? GRAMMAR_QUIZ_MODES[0];
    if (!availableLessons.length) return <EmptyState title="Aucune question de grammaire ne correspond encore à ton niveau guidé." />;
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.segmented}>
          <SegmentButton label="Tout" active={false} onPress={() => onNavigate('global', 'all')} />
          <SegmentButton label="Kana" active={false} onPress={() => onNavigate('global', 'kana')} />
          <SegmentButton label="Vocab" active={false} onPress={() => onNavigate('global', 'vocabulary')} />
        </View>
        <View style={styles.segmented}>
          <SegmentButton label="Grammaire" active onPress={() => onNavigate('grammar')} />
          <SegmentButton label="Kanji" active={false} onPress={() => onNavigate('global', 'kanji')} />
          <SegmentButton label="JLPT" active={false} onPress={() => onNavigate('adaptive')} />
        </View>
        <View style={styles.segmented}>
          <SegmentButton label="Audio" active={false} onPress={() => onNavigate('audio')} />
        </View>
        {!grammarQuizSession && !grammarMatchingSession ? (
          <>
            <View style={styles.arcadeHero}>
              <Text style={styles.arcadeKicker}>文法 Quiz</Text>
              <Text style={styles.arcadeTitle}>Grammaire N5 active</Text>
              <Text style={styles.arcadeText}>
                Cinq entraînements distincts sur les {availableLessons.length} leçons de ton niveau : écriture, QCM,
                associations, dialogues et défi à score.
              </Text>
            </View>
            <Section title="Configuration">
              <Text style={styles.quizConfigMode}>Choisis ton mode</Text>
              <View style={styles.grammarModeGrid}>
                {GRAMMAR_QUIZ_MODES.map((mode) => {
                  const active = grammarQuizMode === mode.id;
                  return (
                    <Pressable
                      key={mode.id}
                      onPress={() => setGrammarQuizMode(mode.id)}
                      style={[styles.grammarModeCard, active && styles.grammarModeCardActive]}
                    >
                      <Text style={[styles.grammarModeSymbol, active && styles.grammarModeSymbolActive]}>{mode.symbol}</Text>
                      <View style={styles.grammarModeCopy}>
                        <Text style={[styles.grammarModeTitle, active && styles.grammarModeTitleActive]}>{mode.title}</Text>
                        <Text style={[styles.grammarModeSubtitle, active && styles.grammarModeSubtitleActive]}>
                          {mode.subtitle}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              {grammarQuizMode !== 'matching' && (
                <View style={styles.segmented}>
                  <SegmentButton label="10 questions" active={grammarQuizSize === 10} onPress={() => setGrammarQuizSize(10)} />
                  <SegmentButton label="20 questions" active={grammarQuizSize === 20} onPress={() => setGrammarQuizSize(20)} />
                </View>
              )}
              <View style={styles.quizConfigCard}>
                <Text style={styles.quizConfigTitle}>
                  {grammarQuizMode === 'matching' ? '3 manches de 5 paires' : grammarQuizSize + ' questions prêtes'}
                </Text>
                <Text style={styles.quizConfigMode}>{activeGrammarMode.title}</Text>
                <Text style={styles.quizConfigText}>
                  Chaque réponse est enregistrée dans les stats, les missions, les badges et le parcours JLPT.
                </Text>
                <Text style={styles.quizConfigText}>{activeGrammarMode.subtitle}</Text>
              </View>
              <Pressable style={styles.primaryButton} onPress={startGrammarQuiz}>
                <Text style={styles.primaryButtonText}>Lancer · {activeGrammarMode.title}</Text>
              </Pressable>
            </Section>
          </>
        ) : grammarMatchingSession?.finished ? (
          <>
            <SessionSummary
              correct={Math.max(0, grammarMatchingSession.attempts - grammarMatchingSession.errors)}
              total={grammarMatchingSession.attempts}
              xp={Math.round(grammarMatchingSession.score / 10)}
              durationLabel={formatSessionDuration(sessionStartedAt.current)}
              bestStreak={matchingTotal}
              errors={[]}
              onRestart={() => {
                sessionStartedAt.current = Date.now();
                setGrammarMatchingSession(createGrammarMatchingSession(availableLessons));
                setGrammarMatchMessage('Choisis une phrase, puis sa traduction.');
              }}
              onContinue={quitGrammarQuiz}
            />
          </>
        ) : grammarMatchingSession && currentMatchingRound ? (
          <>
            <ExerciseHeader
              kicker="文法 · ASSOCIATIONS"
              title="Relie chaque phrase à son sens"
              current={grammarMatchingSession.matchedIds.length}
              total={matchingTotal}
              progress={Math.round((grammarMatchingSession.matchedIds.length / matchingTotal) * 100)}
            />
            <Text style={styles.feedbackMnemonic}>{grammarMatchMessage}</Text>
            {selectedWordLookupAnchorId === 'quiz-grammar-matching' && (
              <WordLookupPanel
                entry={selectedWordLookup}
                onClose={() => {
                  setSelectedWordLookup(null);
                  setSelectedWordLookupAnchorId(null);
                }}
              />
            )}
            <View style={styles.grammarMatchingBoard}>
              <View style={styles.grammarMatchingColumn}>
                <Text style={styles.grammarMatchingColumnTitle}>Japonais</Text>
                {currentMatchingRound.pairs.map((pair) => {
                  const matched = grammarMatchingSession.matchedIds.includes(pair.id);
                  const selected = grammarMatchingSession.selectedLeftId === pair.id;
                  return (
                    <Pressable
                      key={`left-${pair.id}`}
                      disabled={matched || grammarMatchingSession.locked}
                      onPress={() => selectGrammarMatchLeft(pair.id)}
                      style={[
                        styles.grammarMatchCard,
                        selected && styles.grammarMatchCardSelected,
                        matched && styles.grammarMatchCardMatched,
                      ]}
                    >
                      <JapaneseLookupText
                        text={pair.japanese}
                        entries={vocabularyLookupEntries}
                        onSelect={(entry) => {
                          setSelectedWordLookup(entry);
                          setSelectedWordLookupAnchorId('quiz-grammar-matching');
                        }}
                        style={styles.grammarMatchJapanese}
                      />
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.grammarMatchingColumn}>
                <Text style={styles.grammarMatchingColumnTitle}>Français</Text>
                {currentMatchingRound.rightOrder.map((pairId) => {
                  const pair = currentMatchingRound.pairs.find((item) => item.id === pairId);
                  if (!pair) return null;
                  const matched = grammarMatchingSession.matchedIds.includes(pair.id);
                  const selected = grammarMatchingSession.selectedRightId === pair.id;
                  const wrong = selected && grammarMatchingSession.selectedLeftId !== pair.id;
                  return (
                    <Pressable
                      key={`right-${pair.id}`}
                      disabled={matched || grammarMatchingSession.locked || !grammarMatchingSession.selectedLeftId}
                      onPress={() => answerGrammarMatchRight(pair.id)}
                      style={[
                        styles.grammarMatchCard,
                        selected && !wrong && styles.grammarMatchCardSelected,
                        wrong && styles.grammarMatchCardWrong,
                        matched && styles.grammarMatchCardMatched,
                      ]}
                    >
                      <Text style={styles.grammarMatchFrench}>{pair.french}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <Pressable style={styles.secondaryFullButton} onPress={quitGrammarQuiz}>
              <Text style={styles.secondaryFullButtonText}>Quitter</Text>
            </Pressable>
          </>
        ) : grammarQuizSession?.finished ? (
          <>
            <SessionSummary
              correct={grammarQuizSession.correctCount}
              total={grammarQuizSession.questions.length}
              xp={Math.round(grammarQuizSession.score / 10)}
              durationLabel={formatSessionDuration(sessionStartedAt.current)}
              bestStreak={grammarQuizSession.bestStreak}
              errors={grammarQuizSession.mistakes.map((mistake, index) => ({
                id: `${mistake.question.id}-${index}`,
                prompt: mistake.question.prompt,
                selected: mistake.selected,
                expected: mistake.question.correctAnswer,
              }))}
              onRetryErrors={restartGrammarQuizMistakes}
              onRestart={startGrammarQuiz}
              onContinue={quitGrammarQuiz}
            />
          </>
        ) : grammarQuizSession && currentGrammarQuestion ? (
          <>
            <CelebrationBurst visible={grammarQuizSession.selected !== null && isGrammarAnswerCorrect(grammarQuizSession.selected, currentGrammarQuestion.correctAnswer) && grammarQuizSession.streak > 0 && grammarQuizSession.streak % 5 === 0} streak={grammarQuizSession.streak} />
            <ExerciseHeader
              kicker={`文法 · ${activeGrammarMode.title}`}
              title={getGrammarMainMenu(currentGrammarQuestion.lesson)}
              current={grammarQuizSession.currentIndex + 1}
              total={grammarTotal}
              progress={Math.round(((grammarQuizSession.currentIndex + (grammarQuizSession.selected ? 1 : 0)) / grammarQuizSession.questions.length) * 100)}
            />
            <View style={styles.arcadeHud}>
              <Text style={styles.quizScorePill}>{grammarQuizSession.score} pts</Text>
              <Text style={styles.quizScorePill}>
                Série {grammarQuizSession.streak} · x{getGrammarStreakMultiplier(grammarQuizSession.streak)}
              </Text>
              <Text style={styles.quizScorePill}>
                {'♥'.repeat(grammarQuizSession.lives)}{'♡'.repeat(Math.max(0, 3 - grammarQuizSession.lives))}
              </Text>
            </View>
            <Text style={styles.questionTitle}>{currentGrammarQuestion.prompt}</Text>
            {!!currentGrammarQuestion.japanese && (
              <>
                <JapaneseLookupText
                  text={
                    grammarQuizKanaOnly
                      ? currentGrammarQuestion.kanaJapanese ?? currentGrammarQuestion.japanese
                      : currentGrammarQuestion.japanese
                  }
                  entries={vocabularyLookupEntries}
                  onSelect={(entry) => {
                    setSelectedWordLookup(entry);
                    setSelectedWordLookupAnchorId('quiz-grammar');
                  }}
                  style={styles.japanese}
                />
                {selectedWordLookupAnchorId === 'quiz-grammar' && (
                  <WordLookupPanel
                    entry={selectedWordLookup}
                    onClose={() => {
                      setSelectedWordLookup(null);
                      setSelectedWordLookupAnchorId(null);
                    }}
                  />
                )}
                {!!currentGrammarQuestion.kanaJapanese &&
                  currentGrammarQuestion.kanaJapanese !== currentGrammarQuestion.japanese && (
                    <Pressable
                      onPress={() => setGrammarQuizKanaOnly((value) => !value)}
                      style={styles.grammarExampleActionButton}
                    >
                      <Text style={styles.grammarExampleActionText}>
                        {grammarQuizKanaOnly ? 'Voir phrase naturelle' : 'Voir en hiragana'}
                      </Text>
                    </Pressable>
                  )}
              </>
            )}
            <View style={styles.grammarExampleActions}>
              {grammarQuizSession.selected !== null && preferences.showRomaji && !!safeGrammarQuizRomaji && (
                <Pressable
                  onPress={() => setGrammarQuizRomajiVisible((visible) => !visible)}
                  style={styles.grammarExampleActionButton}
                >
                  <Text style={styles.grammarExampleActionText}>
                    {grammarQuizRomajiVisible ? 'Masquer romaji' : 'Voir romaji'}
                  </Text>
                </Pressable>
              )}
              {grammarQuizSession.selected !== null && !!safeGrammarQuizFrench && (
                <Pressable
                  onPress={() => setGrammarQuizFrenchVisible((visible) => !visible)}
                  style={[styles.grammarExampleActionButton, styles.grammarExampleTranslateButton]}
                >
                  <Text style={[styles.grammarExampleActionText, styles.grammarExampleTranslateText]}>
                    {grammarQuizFrenchVisible ? 'Masquer français' : 'Voir français'}
                  </Text>
                </Pressable>
              )}
              {!!currentGrammarQuestion.japanese && (
                <OfflineAudioButton text={currentGrammarQuestion.japanese} slow />
              )}
            </View>
            {grammarQuizSession.selected !== null && preferences.showRomaji && grammarQuizRomajiVisible && !!safeGrammarQuizRomaji && (
              <Text style={styles.grammarExampleRomaji}>{safeGrammarQuizRomaji}</Text>
            )}
            {grammarQuizSession.selected !== null && grammarQuizFrenchVisible && !!safeGrammarQuizFrench && (
              <View style={styles.grammarTranslationBox}>
                <Text style={styles.grammarTranslation}>{safeGrammarQuizFrench}</Text>
              </View>
            )}
            <Text style={styles.feedbackMnemonic}>
              {getExerciseInstruction(currentGrammarQuestion.exerciseFormat)} {getGrammarExerciseInstruction(currentGrammarQuestion.kind)}
            </Text>
            {currentGrammarQuestion.choices.length > 0 ? (
              <>
              <ExerciseChoiceGrid
                choices={currentGrammarQuestion.choices}
                disabled={grammarQuizSession.selected !== null}
                getState={(choice) => {
                  if (!grammarQuizSession.selected) return 'idle';
                  if (isGrammarAnswerCorrect(choice, currentGrammarQuestion.correctAnswer)) return 'correct';
                  if (grammarQuizSession.selected === choice) return 'wrong';
                  return 'muted';
                }}
                onChoose={answerGrammarQuiz}
              />
              {selectedWordLookupAnchorId === 'quiz-grammar-choice' && (
                <WordLookupPanel
                  entry={selectedWordLookup}
                  onClose={() => {
                    setSelectedWordLookup(null);
                    setSelectedWordLookupAnchorId(null);
                  }}
                />
              )}
              </>
            ) : (
              <View style={styles.directAnswerBox}>
                <TextInput
                  value={grammarDirectInput}
                  onChangeText={setGrammarDirectInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Tape la réponse"
                  style={styles.directAnswerInput}
                />
                <Pressable
                  disabled={grammarDirectInput.trim().length === 0 || grammarQuizSession.selected !== null}
                  style={[
                    styles.primaryButton,
                    (grammarDirectInput.trim().length === 0 || grammarQuizSession.selected !== null) &&
                      styles.primaryButtonDisabled,
                  ]}
                  onPress={() => answerGrammarQuiz(grammarDirectInput)}
                >
                  <Text style={styles.primaryButtonText}>Valider</Text>
                </Pressable>
              </View>
            )}
            {grammarQuizSession.selected !== null && (
              <ExerciseFeedback
                correct={isGrammarAnswerCorrect(grammarQuizSession.selected, currentGrammarQuestion.correctAnswer)}
                answer={currentGrammarQuestion.correctAnswer}
                explanation={currentGrammarQuestion.helper}
              >
                <SmartCorrectionInsightCard selectedAnswer={grammarQuizSession.selected} expectedAnswer={currentGrammarQuestion.correctAnswer} explanation={currentGrammarQuestion.lesson.explanation} japanese={currentGrammarQuestion.japanese} translation={currentGrammarQuestion.french} wrongAnswerExplanations={currentGrammarQuestion.wrongAnswerExplanations} />
                {hasJapaneseText(currentGrammarQuestion.correctAnswer) && (
                  <JapaneseLookupText
                    text={currentGrammarQuestion.correctAnswer}
                    entries={vocabularyLookupEntries}
                    onSelect={(entry) => {
                      setSelectedWordLookup(entry);
                      setSelectedWordLookupAnchorId('quiz-grammar-feedback');
                    }}
                    style={styles.feedbackText}
                  />
                )}
                {!!currentGrammarQuestion.japanese && (
                  <View style={styles.grammarCourseBlock}>
                    <Text style={styles.grammarCourseTitle}>Sens de la phrase</Text>
                    <JapaneseLookupText
                      text={currentGrammarQuestion.japanese}
                      entries={vocabularyLookupEntries}
                      onSelect={(entry) => {
                        setSelectedWordLookup(entry);
                        setSelectedWordLookupAnchorId('quiz-grammar-feedback');
                      }}
                      style={styles.japanese}
                    />
                    {!!currentGrammarQuestion.kanaJapanese &&
                      currentGrammarQuestion.kanaJapanese !== currentGrammarQuestion.japanese && (
                        <Text style={styles.grammarCourseText}>Hiragana : {currentGrammarQuestion.kanaJapanese}</Text>
                      )}
                    {preferences.showRomaji && !!currentGrammarQuestion.romaji && (
                      <Text style={styles.grammarCourseText}>Romaji : {currentGrammarQuestion.romaji}</Text>
                    )}
                    {!!currentGrammarQuestion.french && (
                      <Text style={styles.grammarCourseText}>Traduction : {currentGrammarQuestion.french}</Text>
                    )}
                    {selectedWordLookupAnchorId === 'quiz-grammar-feedback' && (
                      <WordLookupPanel
                        entry={selectedWordLookup}
                        onClose={() => {
                          setSelectedWordLookup(null);
                          setSelectedWordLookupAnchorId(null);
                        }}
                      />
                    )}
                  </View>
                )}
                {buildGrammarCorrectionDetails(currentGrammarQuestion).map((detail) => (
                  <View key={`${currentGrammarQuestion.id}-${detail.title}`} style={styles.grammarCourseBlock}>
                    <Text style={styles.grammarCourseTitle}>{detail.title}</Text>
                    <Text style={styles.grammarCourseText}>{detail.text}</Text>
                  </View>
                ))}
                <Pressable
                  style={[styles.wordLookupActionButton, grammarErrorCardAdded && styles.wordLookupActionButtonDone]}
                  onPress={async () => {
                    try {
                      await saveErrorFlashcard(db, {
                        sourceQuestionId: currentGrammarQuestion.id,
                        sourceMode: 'grammar_quiz',
                        itemType: 'grammar',
                        prompt: currentGrammarQuestion.prompt,
                        japanese: currentGrammarQuestion.japanese,
                        translation: currentGrammarQuestion.french,
                        expectedAnswer: currentGrammarQuestion.correctAnswer,
                        selectedAnswer: grammarQuizSession.selected,
                        explanation: buildGrammarCorrectionDetails(currentGrammarQuestion)
                          .map((detail) => `${detail.title}: ${detail.text}`)
                          .join(' '),
                      });
                      setGrammarErrorCardAdded(true);
                    } catch (error) {
                      console.error('Unable to create grammar error flashcard', error);
                    }
                  }}
                >
                  <Text style={styles.wordLookupActionText}>
                    {grammarErrorCardAdded ? 'Ajouté aux révisions' : 'Ajouter cette erreur à mes révisions'}
                  </Text>
                </Pressable>
                <Pressable style={styles.primaryButton} onPress={advanceGrammarQuiz}>
                  <Text style={styles.primaryButtonText}>
                    {grammarQuizSession.currentIndex + 1 >= grammarQuizSession.questions.length
                      ? 'Voir le résultat'
                      : 'Question suivante'}
                  </Text>
                </Pressable>
              </ExerciseFeedback>
            )}
            <Pressable style={styles.secondaryFullButton} onPress={quitGrammarQuiz}>
              <Text style={styles.secondaryFullButtonText}>Quitter</Text>
            </Pressable>
          </>
        ) : (
          <EmptyState title="Aucune question de grammaire" />
        )}
      </ScrollView>
    );
  }
}

function formatSessionDuration(startedAt: number): string {
  const elapsedSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  return minutes ? `${minutes} min ${seconds.toString().padStart(2, '0')} s` : `${seconds} s`;
}

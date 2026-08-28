import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { styles } from '../appStyles';
import { SegmentButton } from './formControls';
import { JapaneseCorrectionDetails, JapaneseLookupText, WordLookupPanel } from './JapaneseLookup';
import { EmptyState, Section } from './sharedUi';
import { GLOBAL_QUIZ_MODES } from '../models';
import type { GlobalMatchingSession, GlobalQuizDomain, GlobalQuizMode, GlobalQuizSession, KnowledgeQuizScope, LearningPreferences, WordLookupEntry } from '../models';
import { hasJapaneseText, normalizeAnswer } from '../services/text';
import {
  buildGlobalMatchingSession,
  buildGlobalQuizQuestions,
  createGlobalQuizSession,
  getGlobalDomainLabel,
  getKnowledgeQuizModeCopy,
} from '../services/globalQuizFactory';
import { getGrammarStreakMultiplier } from '../services/grammarPedagogy';
import { DEFAULT_LEARNING_PREFERENCES, loadLearningPreferences } from '../services/preferences';
import { buildQuizFeedbackInsights } from '../services/quizFeedback';
import { recordSrsReviewForQuestionAttempt } from '../services/srs';
import { clearSession, loadSession, saveSession } from '../services/sessionPersistence';
import { recordTechnicalLog } from '../services/technicalLog';
import { useManagedTimers } from '../services/useManagedTimers';
import type { GlobalQuizScreenProps, GlobalQuizSnapshot } from './globalQuizModels';
import type { KanjiAnswerTarget } from '../services/globalQuizFactory';
import { getCurriculumIndex } from '../services/curriculum';
import { CelebrationBurst, ExerciseChoiceGrid, ExerciseFeedback, ExerciseHeader, SessionSummary } from './ExerciseShell';
import { playAnswerFeedback } from '../services/feedbackAudio';

const GLOBAL_QUIZ_SESSION_KEY = 'quiz:global';
export function GlobalQuizScreen({
  initialScope,
  kanaArcadeCards,
  vocabularyLookupEntries,
  globalKanjiItems,
  curriculumCode,
  onNavigate,
}: GlobalQuizScreenProps) {
  const db = useSQLiteContext();
  const [knowledgeQuizScope, setKnowledgeQuizScope] = useState<KnowledgeQuizScope>(initialScope);
  const [globalQuizMode, setGlobalQuizMode] = useState<GlobalQuizMode>('blank_qcm');
  const [globalQuizSize, setGlobalQuizSize] = useState<10 | 20>(20);
  const [globalQuizSession, setGlobalQuizSession] = useState<GlobalQuizSession | null>(null);
  const [globalMatchingSession, setGlobalMatchingSession] = useState<GlobalMatchingSession | null>(null);
  const [globalDirectInput, setGlobalDirectInput] = useState('');
  const [globalMatchMessage, setGlobalMatchMessage] = useState('Choisis un élément, puis sa correspondance.');
  const [kanjiAnswerTarget, setKanjiAnswerTarget] = useState<KanjiAnswerTarget>('french');
  const [selectedWordLookup, setSelectedWordLookup] = useState<WordLookupEntry | null>(null);
  const [preferences, setPreferences] = useState<LearningPreferences>(DEFAULT_LEARNING_PREFERENCES);
  const [sessionHydrated, setSessionHydrated] = useState(false);
  const answerInFlight = useRef(false);
  const schedule = useManagedTimers();
  useEffect(() => {
    setKnowledgeQuizScope(initialScope);
  }, [initialScope]);
  useEffect(() => {
    loadLearningPreferences(db)
      .then((loadedPreferences) => {
        setPreferences(loadedPreferences);
        setGlobalQuizSize(loadedPreferences.preferredSessionLength === 5 ? 10 : 20);
        if (loadedPreferences.japaneseAnswerMode) setKanjiAnswerTarget('japanese');
      })
      .catch((error) => {
        console.error('Unable to load global quiz preferences', error);
      });
  }, [db]);
  useEffect(() => {
    loadSession<GlobalQuizSnapshot>(db, GLOBAL_QUIZ_SESSION_KEY)
      .then((snapshot) => {
        if (!snapshot || snapshot.curriculumCode !== curriculumCode) return;
        setKnowledgeQuizScope(snapshot.scope);
        setGlobalQuizMode(snapshot.mode);
        setGlobalQuizSize(snapshot.size);
        setGlobalQuizSession(snapshot.quizSession);
        setGlobalMatchingSession(snapshot.matchingSession);
        setKanjiAnswerTarget(snapshot.kanjiAnswerTarget);
      })
      .catch((error) => recordTechnicalLog(db, 'error', 'global_quiz_restore', error instanceof Error ? error.message : String(error)))
      .finally(() => setSessionHydrated(true));
  }, [db]);
  useEffect(() => {
    if (!sessionHydrated) return;
    if (!globalQuizSession && !globalMatchingSession) {
      clearSession(db, GLOBAL_QUIZ_SESSION_KEY).catch(() => undefined);
      return;
    }
    saveSession<GlobalQuizSnapshot>(db, GLOBAL_QUIZ_SESSION_KEY, {
      scope: knowledgeQuizScope,
      mode: globalQuizMode,
      size: globalQuizSize,
      quizSession: globalQuizSession,
      matchingSession: globalMatchingSession,
      kanjiAnswerTarget,
      curriculumCode,
    }).catch((error) => recordTechnicalLog(db, 'error', 'global_quiz_save', error instanceof Error ? error.message : String(error)));
  }, [curriculumCode, db, globalMatchingSession, globalQuizMode, globalQuizSession, globalQuizSize, kanjiAnswerTarget, knowledgeQuizScope, sessionHydrated]);
  const startGlobalQuiz = () => {
    setGlobalDirectInput('');
    setSelectedWordLookup(null);
    setGlobalMatchMessage('Choisis un élément, puis sa correspondance.');
    if (globalQuizMode === 'matching') {
      setGlobalQuizSession(null);
      setGlobalMatchingSession(
        buildGlobalMatchingSession(kanaArcadeCards, vocabularyLookupEntries, globalKanjiItems, knowledgeQuizScope, curriculumCode)
      );
      return;
    }
    setGlobalMatchingSession(null);
    setGlobalQuizSession(
      createGlobalQuizSession(
        buildGlobalQuizQuestions(
          globalQuizSize,
          globalQuizMode,
          kanaArcadeCards,
          vocabularyLookupEntries,
          globalKanjiItems,
          knowledgeQuizScope,
          kanjiAnswerTarget,
          { ...preferences, curriculumCode }
        )
      )
    );
  };

  const quitGlobalQuiz = () => {
    setGlobalQuizSession(null);
    setGlobalMatchingSession(null);
    setGlobalDirectInput('');
    setSelectedWordLookup(null);
    setGlobalMatchMessage('Choisis un élément, puis sa correspondance.');
  };
  const openKnowledgeQuizScope = (scope: KnowledgeQuizScope) => {
    setKnowledgeQuizScope(scope);
    setGlobalQuizSession(null);
    setGlobalMatchingSession(null);
    setGlobalDirectInput('');
    setSelectedWordLookup(null);
    setGlobalMatchMessage('Choisis un élément, puis sa correspondance.');
  };

  const answerGlobalQuiz = async (choice: string) => {
    if (!globalQuizSession || globalQuizSession.selected || globalQuizSession.finished || answerInFlight.current) return;
    const current = globalQuizSession.questions[globalQuizSession.currentIndex];
    if (!current) return;
    answerInFlight.current = true;
    const isCorrect = normalizeAnswer(choice) === normalizeAnswer(current.correctAnswer);
    const nextStreak = isCorrect ? globalQuizSession.streak + 1 : 0;
    const points = isCorrect ? 100 * getGrammarStreakMultiplier(nextStreak) : 0;
    setGlobalQuizSession({
      ...globalQuizSession,
      selected: choice,
      correctCount: globalQuizSession.correctCount + (isCorrect ? 1 : 0),
      score: globalQuizSession.score + points,
      streak: nextStreak,
      bestStreak: Math.max(globalQuizSession.bestStreak, nextStreak),
      mistakes: isCorrect
        ? globalQuizSession.mistakes
        : [...globalQuizSession.mistakes, { question: current, selected: choice }],
    });
    void playAnswerFeedback(isCorrect, preferences.audioEnabled);
    setGlobalDirectInput('');
    try {
      await db.runAsync(
        `
        INSERT INTO app_question_attempt_local (
          id, question_id, source_mode, selected_answer, correct_answer,
          is_correct, skill_id, answered_at
        ) VALUES (?, ?, 'global_quiz', ?, ?, ?, ?, datetime('now'))
        `,
        `${Date.now()}-${Math.random()}`,
        current.id,
        choice,
        current.correctAnswer,
        isCorrect ? 1 : 0,
        `global:${current.domain}`
      );
      await recordSrsReviewForQuestionAttempt(db, {
        questionId: current.id,
        skillId: `global:${current.domain}`,
        sourceMode: 'global_quiz',
        isCorrect,
        itemId: current.srsItemId,
        itemType: current.srsItemType,
      });
    } catch (error) {
      console.error('Unable to save global quiz answer', error);
    } finally {
      answerInFlight.current = false;
    }
    if (isCorrect) schedule(advanceGlobalQuiz, nextStreak > 0 && nextStreak % 5 === 0 ? 1050 : 620);
  };

  const advanceGlobalQuiz = () => {
    setSelectedWordLookup(null);
    setGlobalQuizSession((session) => {
      if (!session) return session;
      const nextIndex = session.currentIndex + 1;
      return { ...session, currentIndex: Math.min(nextIndex, session.questions.length - 1), selected: null, finished: nextIndex >= session.questions.length };
    });
  };

  const selectGlobalMatchLeft = (pairId: string) => {
    if (!globalMatchingSession || globalMatchingSession.finished || globalMatchingSession.locked) return;
    if (globalMatchingSession.matchedIds.includes(pairId)) return;
    setGlobalMatchingSession({ ...globalMatchingSession, selectedLeftId: pairId, selectedRightId: null });
    setGlobalMatchMessage('Choisis maintenant la correspondance dans la colonne de droite.');
  };

  const answerGlobalMatchRight = async (pairId: string) => {
    if (
      !globalMatchingSession ||
      !globalMatchingSession.selectedLeftId ||
      globalMatchingSession.locked ||
      globalMatchingSession.finished
    ) return;
    const round = globalMatchingSession.rounds[globalMatchingSession.currentRound];
    const left = round?.pairs.find((pair) => pair.id === globalMatchingSession.selectedLeftId);
    const right = round?.pairs.find((pair) => pair.id === pairId);
    if (!left || !right) return;
    if (answerInFlight.current) return;
    answerInFlight.current = true;
    const isCorrect = left.id === right.id;
    setGlobalMatchingSession({
      ...globalMatchingSession,
      selectedRightId: pairId,
      errors: globalMatchingSession.errors + (isCorrect ? 0 : 1),
      locked: true,
    });
    setGlobalMatchMessage(isCorrect ? `${getGlobalDomainLabel(left.domain)} : bonne association.` : 'Mauvaise paire. Observe les deux cartes et réessaie.');
    try {
      await db.runAsync(
        `
        INSERT INTO app_question_attempt_local (
          id, question_id, source_mode, selected_answer, correct_answer,
          is_correct, skill_id, answered_at
        ) VALUES (?, ?, 'global_matching', ?, ?, ?, ?, datetime('now'))
        `,
        `${Date.now()}-${Math.random()}`,
        left.id,
        right.right,
        left.right,
        isCorrect ? 1 : 0,
        `global:${left.domain}`
      );
      await recordSrsReviewForQuestionAttempt(db, {
        questionId: left.id,
        skillId: `global:${left.domain}`,
        sourceMode: 'global_matching',
        isCorrect,
      });
    } catch (error) {
      console.error('Unable to save global matching answer', error);
    } finally {
      answerInFlight.current = false;
    }
    schedule(() => {
      setGlobalMatchingSession((current) => {
        if (!current) return current;
        if (!isCorrect) return { ...current, selectedLeftId: null, selectedRightId: null, locked: false };
        const matchedIds = [...current.matchedIds, left.id];
        const activeRound = current.rounds[current.currentRound];
        const roundComplete = activeRound.pairs.every((pair) => matchedIds.includes(pair.id));
        const finalRound = current.currentRound + 1 >= current.rounds.length;
        if (roundComplete && finalRound) {
          setGlobalMatchMessage('Maîtrise globale validée : les quatre domaines ont été reliés.');
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
          setGlobalMatchMessage('Manche terminée. Nouveau mélange des quatre domaines.');
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
        return {
          ...current,
          matchedIds,
          selectedLeftId: null,
          selectedRightId: null,
          score: current.score + 100,
          locked: false,
        };
      });
    }, isCorrect ? 420 : 650);
  };

  {
    const scopeLabel =
      knowledgeQuizScope === 'all'
        ? 'Global'
        : getGlobalDomainLabel(knowledgeQuizScope);
    const availableDomains: GlobalQuizDomain[] = [
      ...(kanaArcadeCards.length >= 4 ? ['kana' as const] : []),
      ...(vocabularyLookupEntries.length >= 4 ? ['vocabulary' as const] : []),
      ...(getCurriculumIndex(curriculumCode) >= getCurriculumIndex('2A') ? ['grammar' as const] : []),
      ...(globalKanjiItems.length >= 4 ? ['kanji' as const] : []),
    ];
    const effectiveScope = knowledgeQuizScope === 'all' && availableDomains.length === 1 ? availableDomains[0] ?? 'all' : knowledgeQuizScope;
    const activeMode = getKnowledgeQuizModeCopy(globalQuizMode, effectiveScope);
    const scopedDomains = knowledgeQuizScope === 'all' ? availableDomains : availableDomains.filter((domain) => domain === knowledgeQuizScope);
    const currentQuestion = globalQuizSession?.questions[globalQuizSession.currentIndex] ?? null;
    const currentRound = globalMatchingSession?.rounds[globalMatchingSession.currentRound] ?? null;
    const matchingTotal = globalMatchingSession
      ? globalMatchingSession.rounds.reduce((total, round) => total + round.pairs.length, 0)
      : 0;
    const ready =
      knowledgeQuizScope === 'all'
        ? availableDomains.length > 0
        : knowledgeQuizScope === 'kana'
          ? kanaArcadeCards.length >= 4
          : knowledgeQuizScope === 'vocabulary'
            ? vocabularyLookupEntries.length >= 4
            : globalKanjiItems.length >= 4;
    const rate = globalQuizSession?.questions.length
      ? Math.round((globalQuizSession.correctCount / globalQuizSession.questions.length) * 100)
      : 0;
    const domainResults = (['kana', 'vocabulary', 'grammar', 'kanji'] as GlobalQuizDomain[]).map((domain) => {
      const questions = globalQuizSession?.questions.filter((question) => question.domain === domain) ?? [];
      const mistakes = globalQuizSession?.mistakes.filter((mistake) => mistake.question.domain === domain) ?? [];
      return { domain, total: questions.length, correct: questions.length - mistakes.length };
    });
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.segmented}>
          <SegmentButton label="Tout" active={knowledgeQuizScope === 'all'} onPress={() => openKnowledgeQuizScope('all')} />
          <SegmentButton label="Kana" active={knowledgeQuizScope === 'kana'} onPress={() => openKnowledgeQuizScope('kana')} />
          <SegmentButton label="Vocab" active={knowledgeQuizScope === 'vocabulary'} onPress={() => openKnowledgeQuizScope('vocabulary')} />
        </View>
        <View style={styles.segmented}>
          <SegmentButton label="Grammaire" active={false} onPress={() => onNavigate('grammar')} />
          <SegmentButton label="Kanji" active={knowledgeQuizScope === 'kanji'} onPress={() => openKnowledgeQuizScope('kanji')} />
          <SegmentButton label="JLPT" active={false} onPress={() => onNavigate('adaptive')} />
        </View>
        <View style={styles.segmented}>
          <SegmentButton label="Audio" active={false} onPress={() => onNavigate('audio')} />
        </View>

        {!globalQuizSession && !globalMatchingSession ? (
          <>
            <View style={styles.arcadeHero}>
              <Text style={styles.arcadeKicker}>総合 Quiz {scopeLabel}</Text>
              <Text style={styles.arcadeTitle}>
                {knowledgeQuizScope === 'all' ? `Entraînement guidé · niveau ${curriculumCode}` : `Entraînement complet · ${scopeLabel}`}
              </Text>
              <Text style={styles.arcadeText}>
                {knowledgeQuizScope === 'all'
                  ? 'Uniquement les notions déjà acquises et celles du niveau actuel, sans contenu futur.'
                  : `Les cinq configurations d’exercice sont appliquées uniquement au domaine ${scopeLabel}.`}
              </Text>
            </View>
            <View style={styles.globalDomainStrip}>
              {scopedDomains.map((domain) => (
                <View key={domain} style={styles.globalDomainChip}>
                  <Text style={styles.globalDomainChipText}>{getGlobalDomainLabel(domain)}</Text>
                </View>
              ))}
            </View>
            <Section title={`Configuration · ${scopeLabel}`}>
              <Text style={styles.quizConfigMode}>Choisis ton entraînement</Text>
              <View style={styles.grammarModeGrid}>
                {GLOBAL_QUIZ_MODES.map((mode) => {
                  const active = globalQuizMode === mode.id;
                  const copy = getKnowledgeQuizModeCopy(mode.id, effectiveScope);
                  return (
                    <Pressable
                      key={mode.id}
                      onPress={() => setGlobalQuizMode(mode.id)}
                      style={[styles.grammarModeCard, active && styles.grammarModeCardActive]}
                    >
                      <Text style={[styles.grammarModeSymbol, active && styles.grammarModeSymbolActive]}>{copy.symbol}</Text>
                      <View style={styles.grammarModeCopy}>
                        <Text style={[styles.grammarModeTitle, active && styles.grammarModeTitleActive]}>{copy.title}</Text>
                        <Text style={[styles.grammarModeSubtitle, active && styles.grammarModeSubtitleActive]}>
                          {copy.subtitle}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              {globalQuizMode !== 'matching' && (
                <>
                  {knowledgeQuizScope === 'kanji' && (
                    <View style={styles.segmented}>
                      <SegmentButton
                        label="Sens FR"
                        active={kanjiAnswerTarget === 'french'}
                        onPress={() => setKanjiAnswerTarget('french')}
                      />
                      <SegmentButton
                        label="Lecture JP"
                        active={kanjiAnswerTarget === 'japanese'}
                        onPress={() => setKanjiAnswerTarget('japanese')}
                      />
                      <SegmentButton
                        label="Composants"
                        active={kanjiAnswerTarget === 'components'}
                        onPress={() => setKanjiAnswerTarget('components')}
                      />
                    </View>
                  )}
                  <View style={styles.segmented}>
                    <SegmentButton label="10 questions" active={globalQuizSize === 10} onPress={() => setGlobalQuizSize(10)} />
                    <SegmentButton label="20 questions" active={globalQuizSize === 20} onPress={() => setGlobalQuizSize(20)} />
                  </View>
                </>
              )}
              <View style={styles.quizConfigCard}>
                <Text style={styles.quizConfigTitle}>
                  {globalQuizMode === 'matching' ? '3 manches · 15 associations' : `${globalQuizSize} questions équilibrées`}
                </Text>
                <Text style={styles.quizConfigMode}>{activeMode.title}</Text>
                <Text style={styles.quizConfigText}>{activeMode.subtitle}</Text>
                <Text style={styles.quizConfigText}>
                  {knowledgeQuizScope === 'all'
                    ? `Domaines disponibles au niveau ${curriculumCode} : ${availableDomains.map(getGlobalDomainLabel).join(', ')}.`
                    : `Toutes les questions portent sur ${scopeLabel}, avec un nouveau tirage à chaque session.`}
                </Text>
              </View>
              <Pressable
                disabled={!ready}
                style={[styles.primaryButton, !ready && styles.primaryButtonDisabled]}
                onPress={startGlobalQuiz}
              >
                <Text style={styles.primaryButtonText}>{ready ? `Lancer · ${activeMode.title}` : 'Préparation des données…'}</Text>
              </Pressable>
              {knowledgeQuizScope === 'kana' && (
                <Pressable style={styles.secondaryFullButton} onPress={() => onNavigate('kana_arcade')}>
                  <Text style={styles.secondaryFullButtonText}>Ouvrir l’Arcade Kana chronométrée</Text>
                </Pressable>
              )}
            </Section>
          </>
        ) : globalMatchingSession?.finished ? (
          <>
            <View style={styles.resultCard}>
              <Text style={styles.resultKicker}>Associations globales terminées</Text>
              <Text style={styles.resultScore}>{globalMatchingSession.score}</Text>
              <Text style={styles.resultPercent}>points · {matchingTotal}/{matchingTotal} paires</Text>
              <Text style={styles.resultTime}>{globalMatchingSession.errors} erreur(s) sur les quatre domaines</Text>
            </View>
            <Pressable style={styles.primaryButton} onPress={startGlobalQuiz}>
              <Text style={styles.primaryButtonText}>Rejouer</Text>
            </Pressable>
            <Pressable style={styles.secondaryFullButton} onPress={quitGlobalQuiz}>
              <Text style={styles.secondaryFullButtonText}>Quitter</Text>
            </Pressable>
          </>
        ) : globalMatchingSession && currentRound ? (
          <>
            <View style={styles.arcadeHud}>
              <View>
                <Text style={styles.questionMeta}>Manche {globalMatchingSession.currentRound + 1}/3</Text>
                <Text style={styles.arcadeHudScore}>{globalMatchingSession.matchedIds.length}/{matchingTotal} paires</Text>
              </View>
              <Text style={styles.quizScorePill}>{globalMatchingSession.score} pts</Text>
            </View>
            <View style={styles.pathProgressTrack}>
              <View style={[styles.pathProgressFill, { width: `${Math.round((globalMatchingSession.matchedIds.length / matchingTotal) * 100)}%` }]} />
            </View>
            <Text style={styles.questionTitle}>Relie les connaissances correspondantes</Text>
            <Text style={styles.feedbackMnemonic}>{globalMatchMessage}</Text>
            <WordLookupPanel entry={selectedWordLookup} onClose={() => setSelectedWordLookup(null)} />
            <View style={styles.grammarMatchingBoard}>
              <View style={styles.grammarMatchingColumn}>
                <Text style={styles.grammarMatchingColumnTitle}>Question</Text>
                {currentRound.pairs.map((pair) => {
                  const matched = globalMatchingSession.matchedIds.includes(pair.id);
                  const selected = globalMatchingSession.selectedLeftId === pair.id;
                  return (
                    <Pressable
                      key={`global-left-${pair.id}`}
                      disabled={matched || globalMatchingSession.locked}
                      onPress={() => selectGlobalMatchLeft(pair.id)}
                      style={[
                        styles.grammarMatchCard,
                        selected && styles.grammarMatchCardSelected,
                        matched && styles.grammarMatchCardMatched,
                      ]}
                    >
                      <Text style={styles.globalMatchDomain}>{getGlobalDomainLabel(pair.domain)}</Text>
                      <JapaneseLookupText
                        text={pair.left}
                        entries={vocabularyLookupEntries}
                        onSelect={setSelectedWordLookup}
                        style={styles.grammarMatchJapanese}
                      />
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.grammarMatchingColumn}>
                <Text style={styles.grammarMatchingColumnTitle}>Réponse</Text>
                {currentRound.rightOrder.map((pairId) => {
                  const pair = currentRound.pairs.find((item) => item.id === pairId);
                  if (!pair) return null;
                  const matched = globalMatchingSession.matchedIds.includes(pair.id);
                  const selected = globalMatchingSession.selectedRightId === pair.id;
                  const wrong = selected && globalMatchingSession.selectedLeftId !== pair.id;
                  return (
                    <Pressable
                      key={`global-right-${pair.id}`}
                      disabled={matched || globalMatchingSession.locked || !globalMatchingSession.selectedLeftId}
                      onPress={() => answerGlobalMatchRight(pair.id)}
                      style={[
                        styles.grammarMatchCard,
                        selected && !wrong && styles.grammarMatchCardSelected,
                        wrong && styles.grammarMatchCardWrong,
                        matched && styles.grammarMatchCardMatched,
                      ]}
                    >
                      <Text style={styles.grammarMatchFrench}>{pair.right}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <Pressable style={styles.secondaryFullButton} onPress={quitGlobalQuiz}>
              <Text style={styles.secondaryFullButtonText}>Quitter</Text>
            </Pressable>
          </>
        ) : globalQuizSession?.finished ? (
          <>
            <SessionSummary
              bestStreak={globalQuizSession.bestStreak}
              correct={globalQuizSession.correctCount}
              durationLabel="session"
              errors={globalQuizSession.mistakes.map((mistake) => ({ id: mistake.question.id, prompt: mistake.question.prompt, selected: mistake.selected, expected: mistake.question.correctAnswer }))}
              onContinue={quitGlobalQuiz}
              onRestart={startGlobalQuiz}
              onRetryErrors={() => setGlobalQuizSession(createGlobalQuizSession(globalQuizSession.mistakes.map((mistake) => mistake.question)))}
              rewardLabel={`${globalQuizSession.score} pts`}
              total={globalQuizSession.questions.length}
              xp={0}
            />
            <View style={styles.globalResultGrid}>
              {domainResults.map((result) => (
                <View key={result.domain} style={styles.globalResultCard}>
                  <Text style={styles.globalResultDomain}>{getGlobalDomainLabel(result.domain)}</Text>
                  <Text style={styles.globalResultValue}>{result.correct}/{result.total}</Text>
                </View>
              ))}
            </View>
          </>
        ) : globalQuizSession && currentQuestion ? (
          <>
            <CelebrationBurst visible={globalQuizSession.selected !== null && normalizeAnswer(globalQuizSession.selected) === normalizeAnswer(currentQuestion.correctAnswer) && globalQuizSession.streak > 0 && globalQuizSession.streak % 5 === 0} streak={globalQuizSession.streak} />
            <ExerciseHeader
              current={globalQuizSession.currentIndex + 1}
              kicker={`${getGlobalDomainLabel(currentQuestion.domain)} · ${currentQuestion.formatLabel}`}
              progress={Math.round(((globalQuizSession.currentIndex + (globalQuizSession.selected ? 1 : 0)) / globalQuizSession.questions.length) * 100)}
              title={activeMode.title}
              total={globalQuizSession.questions.length}
            />
            <View style={styles.arcadeHud}>
              <Text style={styles.quizScorePill}>{globalQuizSession.score} pts</Text>
              <Text style={styles.quizScorePill}>Combo x{getGrammarStreakMultiplier(globalQuizSession.streak)}</Text>
            </View>
            <View style={styles.globalQuestionSkillCard}>
              <Text style={styles.globalQuestionSkillLabel}>{currentQuestion.formatLabel}</Text>
              <Text style={styles.globalQuestionSkillText}>{currentQuestion.measuredSkill}</Text>
            </View>
            <Text style={styles.questionTitle}>{currentQuestion.prompt}</Text>
            <JapaneseLookupText
              text={currentQuestion.display}
              entries={vocabularyLookupEntries}
              onSelect={setSelectedWordLookup}
              style={[styles.globalQuestionDisplay, currentQuestion.domain === 'kanji' && styles.globalKanjiQuestionDisplay]}
            />
            <WordLookupPanel entry={selectedWordLookup} onClose={() => setSelectedWordLookup(null)} />
            {currentQuestion.choices.length > 0 ? (
              <ExerciseChoiceGrid
                choices={currentQuestion.choices}
                disabled={globalQuizSession.selected !== null}
                getState={(choice) => {
                  if (globalQuizSession.selected === null) return 'idle';
                  if (normalizeAnswer(choice) === normalizeAnswer(currentQuestion.correctAnswer)) return 'correct';
                  if (choice === globalQuizSession.selected) return 'wrong';
                  return 'muted';
                }}
                onChoose={answerGlobalQuiz}
              />
            ) : (
              <View style={styles.directAnswerBox}>
                <TextInput
                  value={globalDirectInput}
                  onChangeText={setGlobalDirectInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Tape ta réponse"
                  style={styles.directAnswerInput}
                />
                <Pressable
                  disabled={!globalDirectInput.trim() || globalQuizSession.selected !== null}
                  style={[styles.primaryButton, (!globalDirectInput.trim() || globalQuizSession.selected !== null) && styles.primaryButtonDisabled]}
                  onPress={() => answerGlobalQuiz(globalDirectInput)}
                >
                  <Text style={styles.primaryButtonText}>Valider</Text>
                </Pressable>
              </View>
            )}
            {globalQuizSession.selected === null && (
              <Pressable onPress={() => answerGlobalQuiz('Je ne sais pas')} style={styles.quickUnknownButton}>
                <Text style={styles.quickUnknownButtonText}>Je ne sais pas</Text>
              </Pressable>
            )}
            {globalQuizSession.selected !== null && (
              <ExerciseFeedback
                answer={currentQuestion.correctAnswer}
                correct={normalizeAnswer(globalQuizSession.selected) === normalizeAnswer(currentQuestion.correctAnswer)}
                explanation={currentQuestion.explanation}
              >
                <View style={styles.correctionInsightCard}>
                  <Text style={styles.correctionInsightKicker}>Analyse</Text>
                  {buildQuizFeedbackInsights({
                    selectedAnswer: globalQuizSession.selected,
                    expectedAnswer: currentQuestion.correctAnswer,
                    explanation: currentQuestion.explanation,
                    japanese: hasJapaneseText(currentQuestion.display) ? currentQuestion.display : currentQuestion.correctAnswer,
                    translation: currentQuestion.prompt,
                  }).map((insight) => (
                    <View key={insight.title} style={styles.correctionInsightBlock}>
                      <Text style={styles.correctionInsightLabel}>{insight.title}</Text>
                      <Text style={styles.correctionInsightText}>{insight.detail}</Text>
                    </View>
                  ))}
                </View>
                {hasJapaneseText(currentQuestion.correctAnswer) && (
                  <JapaneseLookupText
                    text={currentQuestion.correctAnswer}
                    entries={vocabularyLookupEntries}
                    onSelect={setSelectedWordLookup}
                    style={styles.feedbackText}
                  />
                )}
                <JapaneseCorrectionDetails
                  japanese={hasJapaneseText(currentQuestion.display) ? currentQuestion.display : currentQuestion.correctAnswer}
                  translation={currentQuestion.prompt}
                  expectedAnswer={currentQuestion.correctAnswer}
                  explanation={currentQuestion.explanation}
                  entries={vocabularyLookupEntries}
                  showRomaji={preferences.showRomaji}
                  showTranslationFirst={preferences.showTranslationFirst}
                  sourceQuestionId={currentQuestion.id}
                  sourceMode="global_quiz"
                  selectedAnswer={globalQuizSession.selected}
                  onSelect={setSelectedWordLookup}
                />
                <Pressable style={styles.primaryButton} onPress={advanceGlobalQuiz}>
                  <Text style={styles.primaryButtonText}>
                    {globalQuizSession.currentIndex + 1 >= globalQuizSession.questions.length ? 'Voir le résultat' : 'Question suivante'}
                  </Text>
                </Pressable>
              </ExerciseFeedback>
            )}
            <Pressable style={styles.secondaryFullButton} onPress={quitGlobalQuiz}>
              <Text style={styles.secondaryFullButtonText}>Quitter</Text>
            </Pressable>
          </>
        ) : (
          <EmptyState title="Le Quiz Global se prépare" />
        )}
      </ScrollView>
    );
  }
}

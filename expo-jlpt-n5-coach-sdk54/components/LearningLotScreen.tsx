import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { styles } from '../appStyles';
import type { LearningPreferences, Screen, WordLookupEntry } from '../models';
import { DEFAULT_LEARNING_PREFERENCES, loadLearningPreferences } from '../services/preferences';
import { buildGuidedLearningLot, getLearningLotScore, updateLearningLot, type LearningLotSnapshot } from '../services/learningLot';
import { clearSession, loadSession, saveSession } from '../services/sessionPersistence';
import { normalizeAnswer } from '../services/text';
import { recordSrsReviewForQuestionAttempt } from '../services/srs';
import { saveErrorFlashcard } from '../services/errorFlashcards';
import { calculateQuickSessionResult, claimQuickSessionReward } from '../services/quickSession';
import { playAnswerFeedback } from '../services/feedbackAudio';
import { useManagedTimers } from '../services/useManagedTimers';
import { CelebrationBurst, ExerciseChoiceGrid, ExerciseFeedback, ExerciseHeader, SessionSummary } from './ExerciseShell';
import { EmptyState, LoadingView } from './sharedUi';
import { OfflineAudioButton } from './OfflineAudioButton';
import { JapaneseLookupText, useVocabularyLookupIndex, WordLookupPanel } from './JapaneseLookup';

const SESSION_KEY = 'learning:guided';

export function LearningLotScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const db = useSQLiteContext();
  const lookupEntries = useVocabularyLookupIndex(db);
  const schedule = useManagedTimers();
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<LearningPreferences>(DEFAULT_LEARNING_PREFERENCES);
  const [snapshot, setSnapshot] = useState<LearningLotSnapshot | null>(null);
  const [readingVisible, setReadingVisible] = useState(false);
  const [selectedLookup, setSelectedLookup] = useState<WordLookupEntry | null>(null);

  const load = useCallback(async (forceNew = false) => {
    setLoading(true);
    try {
      const loadedPreferences = await loadLearningPreferences(db);
      setPreferences(loadedPreferences);
      const restored = forceNew ? null : await loadSession<LearningLotSnapshot>(db, SESSION_KEY);
      const next = restored?.items?.length ? restored : await buildGuidedLearningLot(db, loadedPreferences);
      setSnapshot(next);
      await saveSession(db, SESSION_KEY, next);
    } catch (error) {
      console.error('Unable to load guided learning lot', error);
      setSnapshot(null);
    } finally { setLoading(false); }
  }, [db]);

  useEffect(() => { void load(); }, [load]);
  const commit = useCallback((next: LearningLotSnapshot) => {
    setSnapshot(next);
    saveSession(db, SESSION_KEY, next).catch((error) => console.error('Unable to save learning lot', error));
  }, [db]);

  const item = snapshot?.items[snapshot.currentIndex] ?? null;
  const currentAnswer = snapshot && item ? snapshot.answers.find((answer) => answer.questionId === item.question.question.question_id) : null;
  const currentStreak = useMemo(() => getCurrentStreak(snapshot?.answers ?? []), [snapshot?.answers]);

  async function answer(choice: string) {
    if (!snapshot || !item || currentAnswer) return;
    const question = item.question.question;
    const correct = normalizeAnswer(choice) === normalizeAnswer(question.correct_answer);
    const answers = [...snapshot.answers, { questionId: question.question_id, selected: choice, correct }];
    const next = updateLearningLot(snapshot, { answers });
    commit(next);
    void playAnswerFeedback(correct, preferences.audioEnabled);
    try {
      await db.runAsync(`INSERT INTO app_question_attempt_local (id, question_id, source_mode, selected_answer, correct_answer, is_correct, skill_id, answered_at) VALUES (?, ?, 'learning_lot', ?, ?, ?, ?, datetime('now'))`, `${Date.now()}-${Math.random()}`, question.question_id, choice, question.correct_answer, correct ? 1 : 0, question.skill_id);
      await recordSrsReviewForQuestionAttempt(db, { questionId: question.question_id, skillId: question.skill_id, sourceMode: 'learning_lot', isCorrect: correct, itemId: item.itemId, itemType: item.itemType });
      if (!correct) await saveErrorFlashcard(db, { sourceQuestionId: question.question_id, sourceMode: 'learning_lot', itemType: item.itemType, prompt: question.prompt_fr, japanese: question.prompt_ja, translation: item.meaning, expectedAnswer: question.correct_answer, selectedAnswer: choice, explanation: question.explanation_fr });
    } catch (error) { console.error('Unable to save learning lot answer', error); }
    if (correct) schedule(() => advanceQuiz(next), getCurrentStreak(answers) % 5 === 0 ? 1050 : 620);
  }

  function advanceQuiz(source = snapshot) {
    if (!source) return;
    setSelectedLookup(null);
    const nextIndex = source.currentIndex + 1;
    if (nextIndex >= source.items.length) {
      const final = updateLearningLot(source, { phase: 'summary' });
      commit(final);
      const score = getLearningLotScore(final);
      void claimQuickSessionReward(db, calculateQuickSessionResult(score.correct, score.total), final.id);
    } else commit(updateLearningLot(source, { currentIndex: nextIndex }));
  }

  if (loading) return <LoadingView />;
  if (!snapshot || !snapshot.items.length) return <ScrollView contentContainerStyle={styles.content}><EmptyState title="Aucun lot compatible avec ce niveau." /><Pressable onPress={() => load(true)} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Réessayer</Text></Pressable></ScrollView>;

  if (snapshot.phase === 'intro') return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.learningLotIntro}><Text style={styles.learningLotSymbol}>始</Text><Text style={styles.learningLotKicker}>PARCOURS {snapshot.curriculumCode}</Text><Text style={styles.learningLotTitle}>{snapshot.title}</Text><Text style={styles.learningLotObjective}>{snapshot.objective}</Text><View style={styles.learningLotFacts}><Text style={styles.learningLotFact}>{snapshot.items.length} notions</Text><Text style={styles.learningLotFact}>5 à 8 min</Text><Text style={styles.learningLotFact}>Quiz inclus</Text></View><Text style={styles.learningLotNote}>Aucun prérequis ne bloque l’accès. Ce lot utilise seulement ton niveau actuel et les acquis antérieurs.</Text></View>
      <Pressable onPress={() => commit(updateLearningLot(snapshot, { phase: 'learn', currentIndex: 0 }))} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Découvrir les notions</Text></Pressable>
    </ScrollView>
  );

  if (snapshot.phase === 'learn' && item) return (
    <ScrollView contentContainerStyle={styles.content}>
      <ExerciseHeader kicker={`DÉCOUVERTE · ${item.attribute}`} title={snapshot.title} current={snapshot.currentIndex + 1} total={snapshot.items.length} progress={Math.round((snapshot.currentIndex + 1) * 100 / snapshot.items.length)} />
      <View style={styles.learningLotCard}><Text adjustsFontSizeToFit numberOfLines={1} style={styles.learningLotMain}>{item.main}</Text><Text style={styles.learningLotMeaning}>{item.meaning}</Text>{readingVisible && !!item.reading && <Text style={styles.learningLotReading}>{item.reading}</Text>}<View style={styles.learningLotCardActions}><Pressable onPress={() => setReadingVisible((value) => !value)} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>{readingVisible ? 'Masquer la lecture' : 'Voir la lecture'}</Text></Pressable><OfflineAudioButton text={item.main} label="Écouter" /></View><Text style={styles.learningLotExplanation}>{item.question.question.explanation_fr}</Text></View>
      <View style={styles.learningLotNavigation}><Pressable disabled={snapshot.currentIndex === 0} onPress={() => { setReadingVisible(false); commit(updateLearningLot(snapshot, { currentIndex: Math.max(0, snapshot.currentIndex - 1) })); }} style={[styles.secondaryButton, snapshot.currentIndex === 0 && styles.primaryButtonDisabled]}><Text style={styles.secondaryButtonText}>Précédent</Text></Pressable><Pressable onPress={() => { setReadingVisible(false); const last = snapshot.currentIndex + 1 >= snapshot.items.length; commit(updateLearningLot(snapshot, last ? { phase: 'recap', currentIndex: 0 } : { currentIndex: snapshot.currentIndex + 1 })); }} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{snapshot.currentIndex + 1 >= snapshot.items.length ? 'Voir le récapitulatif' : 'Suivant'}</Text></Pressable></View>
    </ScrollView>
  );

  if (snapshot.phase === 'recap') return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.learningLotRecapHeader}><Text style={styles.learningLotKicker}>RÉCAPITULATIF</Text><Text style={styles.learningLotTitle}>Les notions du lot</Text><Text style={styles.learningLotObjective}>Relis-les une dernière fois avant le quiz.</Text></View>
      <View style={styles.learningLotRecapList}>{snapshot.items.map((entry, index) => <Pressable key={entry.itemId} onPress={() => commit(updateLearningLot(snapshot, { phase: 'learn', currentIndex: index }))} style={styles.learningLotRecapRow}><Text style={styles.learningLotRecapMain}>{entry.main}</Text><View style={styles.learningLotRecapCopy}><Text style={styles.learningLotRecapMeaning}>{entry.meaning}</Text><Text style={styles.learningLotRecapReading}>{entry.reading || entry.attribute}</Text></View><Text style={styles.learningLotRecapArrow}>›</Text></Pressable>)}</View>
      <Pressable onPress={() => commit(updateLearningLot(snapshot, { phase: 'quiz', currentIndex: 0, answers: [] }))} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Je suis prêt</Text></Pressable><Pressable onPress={() => commit(updateLearningLot(snapshot, { phase: 'learn', currentIndex: 0 }))} style={styles.secondaryFullButton}><Text style={styles.secondaryFullButtonText}>Revoir les cartes</Text></Pressable>
    </ScrollView>
  );

  if (snapshot.phase === 'quiz' && item) {
    const question = item.question.question;
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <CelebrationBurst visible={!!currentAnswer?.correct && currentStreak > 0 && currentStreak % 5 === 0} streak={currentStreak} />
        <ExerciseHeader kicker={`QUIZ CIBLÉ · ${item.attribute}`} title={snapshot.title} current={snapshot.currentIndex + 1} total={snapshot.items.length} progress={Math.round((snapshot.currentIndex + (currentAnswer ? 1 : 0)) * 100 / snapshot.items.length)} />
        <View style={styles.quickQuestionCard}><Text style={styles.quickPrompt}>{question.prompt_fr}</Text>{question.prompt_ja && <JapaneseLookupText text={question.prompt_ja} entries={lookupEntries} onSelect={setSelectedLookup} style={styles.quickJapanese} />}<WordLookupPanel entry={selectedLookup} onClose={() => setSelectedLookup(null)} /><ExerciseChoiceGrid choices={item.question.choices} disabled={!!currentAnswer} getState={(choice) => !currentAnswer ? 'idle' : normalizeAnswer(choice) === normalizeAnswer(question.correct_answer) ? 'correct' : choice === currentAnswer.selected ? 'wrong' : 'muted'} onChoose={answer} />{!currentAnswer && <Pressable onPress={() => answer('Je ne sais pas')} style={styles.quickUnknownButton}><Text style={styles.quickUnknownButtonText}>Je ne sais pas</Text></Pressable>}{currentAnswer && <ExerciseFeedback correct={currentAnswer.correct} answer={question.correct_answer} explanation={question.explanation_fr}>{!currentAnswer.correct && <Pressable onPress={() => advanceQuiz()} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{snapshot.currentIndex + 1 >= snapshot.items.length ? 'Voir le bilan' : 'Continuer'}</Text></Pressable>}</ExerciseFeedback>}</View>
      </ScrollView>
    );
  }

  const score = getLearningLotScore(snapshot);
  const wrongIds = new Set(snapshot.answers.filter((answer) => !answer.correct).map((answer) => answer.questionId));
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SessionSummary correct={score.correct} total={score.total} xp={calculateQuickSessionResult(score.correct, score.total).xp} durationLabel={formatDuration(snapshot.startedAt)} bestStreak={getBestStreak(snapshot.answers)} errors={snapshot.answers.filter((answer) => !answer.correct).map((answer) => { const entry = snapshot.items.find((candidate) => candidate.question.question.question_id === answer.questionId)!; return { id: answer.questionId, prompt: entry.question.question.prompt_fr, selected: answer.selected, expected: entry.question.question.correct_answer }; })} onRestart={() => commit(updateLearningLot(snapshot, { phase: 'learn', currentIndex: 0, answers: [] }))} onRetryErrors={wrongIds.size ? () => commit({ ...snapshot, id: `${snapshot.id}:retry`, items: snapshot.items.filter((entry) => wrongIds.has(entry.question.question.question_id)), itemRefs: snapshot.itemRefs.filter((_, index) => wrongIds.has(snapshot.items[index]!.question.question.question_id)), phase: 'quiz', currentIndex: 0, answers: [] }) : undefined} onContinue={async () => { await clearSession(db, SESSION_KEY); onNavigate('learn'); }} />
      <View style={styles.learningLotLearned}><Text style={styles.learningLotLearnedTitle}>Notions rencontrées</Text><View style={styles.learningLotLearnedGrid}>{snapshot.items.map((entry) => <View key={entry.itemId} style={styles.learningLotLearnedChip}><Text style={styles.learningLotLearnedMain}>{entry.main}</Text><Text numberOfLines={1} style={styles.learningLotLearnedMeaning}>{entry.meaning}</Text></View>)}</View></View>
    </ScrollView>
  );
}

function getCurrentStreak(answers: LearningLotSnapshot['answers']) { let streak = 0; for (let index = answers.length - 1; index >= 0 && answers[index]?.correct; index -= 1) streak += 1; return streak; }
function getBestStreak(answers: LearningLotSnapshot['answers']) { let streak = 0; let best = 0; answers.forEach((answer) => { streak = answer.correct ? streak + 1 : 0; best = Math.max(best, streak); }); return best; }
function formatDuration(startedAt: string) { const seconds = Math.max(1, Math.round((Date.now() - Date.parse(startedAt)) / 1000)); return seconds >= 60 ? `${Math.floor(seconds / 60)} min ${String(seconds % 60).padStart(2, '0')} s` : `${seconds} s`; }

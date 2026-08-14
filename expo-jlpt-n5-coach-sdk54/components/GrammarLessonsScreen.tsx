import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { styles } from '../appStyles';
import { SegmentButton } from './formControls';
import { JapaneseLookupText, WordLookupPanel, useVocabularyLookupIndex } from './JapaneseLookup';
import { OfflineAudioButton } from './OfflineAudioButton';
import { EmptyState, EmptyText, LoadingView, Metric, ProgressRow, Section } from './sharedUi';
import { GRAMMAR_QUIZ_MODES } from '../models';
import type {
  GrammarExerciseKind,
  GrammarLesson,
  GrammarLessonExample,
  GrammarLessonStatus,
  GrammarMode,
  GrammarProgressSummary,
  GrammarQuizMistake,
  GrammarQuizQuestion,
  GrammarQuizSession,
  WordLookupEntry,
} from '../models';
import {
  ALL_GRAMMAR_LESSONS,
  GRAMMAR_MAIN_MENUS,
  emptyGrammarProgressSummary,
  getGrammarMainMenu,
  humanizeGrammarPattern,
} from '../services/grammarCourse';
import {
  buildGrammarQuestionAnswerQuiz,
  buildGrammarQuizQuestions,
  maskGrammarKeyword,
  uniqueChoices,
} from '../services/grammarQuizFactory';
import {
  formatGrammarLessonStatus,
  loadGrammarLessonStatusById,
  loadGrammarProgressSummary,
  markGrammarLessonOpened,
  recordGrammarExerciseAttempt,
  setGrammarLessonStatus,
} from '../services/grammarProgress';
import {
  GRAMMAR_KEY_TOKENS,
  buildGrammarContrastWhy,
  buildGrammarCorrectionDetails,
  buildGrammarExampleAnalysis,
  buildGrammarExampleBreakdown,
  buildGrammarMnemonic,
  buildGrammarPracticePrompt,
  buildGrammarQuickReminder,
  buildGrammarSituation,
  buildGrammarSteps,
  buildGrammarUseCase,
  buildGrammarWhy,
  createGrammarSession,
  explainGrammarSlots,
  getGrammarExerciseInstruction,
  getGrammarKeyword,
  getGrammarStreakMultiplier,
  hideGrammarAnswerInHint,
  humanizeGrammarFormula,
  isGrammarAnswerCorrect,
} from '../services/grammarPedagogy';
import { shuffle } from '../services/random';

export function GrammarLessonsScreen() {
  const db = useSQLiteContext();
  const vocabularyLookupEntries = useVocabularyLookupIndex(db);
  const folders = useMemo(
    () => GRAMMAR_MAIN_MENUS.filter((menu) => ALL_GRAMMAR_LESSONS.some((lesson) => getGrammarMainMenu(lesson) === menu)),
    []
  );
  const [selectedFolder, setSelectedFolder] = useState<string>(folders[0] ?? 'Particules');
  const [selectedSubfolder, setSelectedSubfolder] = useState<string | null>(null);
  const [grammarMode, setGrammarMode] = useState<GrammarMode>('learn');
  const [memoryGrammarCount, setMemoryGrammarCount] = useState(0);
  const folderLessons = useMemo(
    () => ALL_GRAMMAR_LESSONS.filter((lesson) => getGrammarMainMenu(lesson) === selectedFolder).sort((a, b) => a.order - b.order),
    [selectedFolder]
  );
  const visibleLessons = useMemo(
    () =>
      folderLessons.filter((lesson) => !selectedSubfolder || lesson.subfolder === selectedSubfolder),
    [folderLessons, selectedSubfolder]
  );
  const [selectedLessonId, setSelectedLessonId] = useState(visibleLessons[0]?.id ?? ALL_GRAMMAR_LESSONS[0]?.id);
  const [openedLessonId, setOpenedLessonId] = useState<string | null>(null);
  const [revealedRomajiExampleId, setRevealedRomajiExampleId] = useState<string | null>(null);
  const [revealedTranslationExampleId, setRevealedTranslationExampleId] = useState<string | null>(null);
  const [revealedKanaExampleId, setRevealedKanaExampleId] = useState<string | null>(null);
  const [exerciseFeedback, setExerciseFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [grammarProgress, setGrammarProgress] = useState<GrammarProgressSummary>(emptyGrammarProgressSummary);
  const [grammarExerciseSize, setGrammarExerciseSize] = useState<10 | 20>(10);
  const [grammarExerciseSession, setGrammarExerciseSession] = useState<GrammarQuizSession | null>(null);
  const [grammarExerciseInput, setGrammarExerciseInput] = useState('');
  const [grammarExerciseRomajiVisible, setGrammarExerciseRomajiVisible] = useState(false);
  const [grammarExerciseFrenchVisible, setGrammarExerciseFrenchVisible] = useState(false);
  const [grammarExerciseKanaOnly, setGrammarExerciseKanaOnly] = useState(false);
  const [selectedWordLookup, setSelectedWordLookup] = useState<WordLookupEntry | null>(null);
  const [selectedWordLookupAnchorId, setSelectedWordLookupAnchorId] = useState<string | null>(null);
  const [lessonStatusById, setLessonStatusById] = useState<Record<string, GrammarLessonStatus>>({});
  const selectedLesson =
    ALL_GRAMMAR_LESSONS.find((lesson) => lesson.id === selectedLessonId) ?? visibleLessons[0] ?? ALL_GRAMMAR_LESSONS[0];
  const selectedLessonStatus = lessonStatusById[selectedLesson.id] ?? 'neutral';
  const currentFolderLessons = visibleLessons.length > 0 ? visibleLessons : folderLessons;
  const subfolders = Array.from(new Set(folderLessons.map((lesson) => lesson.subfolder)));
  const easyCount = ALL_GRAMMAR_LESSONS.filter((lesson) => lesson.level === 'facile').length;
  const advancedCount = ALL_GRAMMAR_LESSONS.filter((lesson) => lesson.level === 'avance').length;

  useEffect(() => {
    let mounted = true;
    Promise.all([
      db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) AS count FROM canonical_grammar WHERE jlpt_level = 'N5'`),
      loadGrammarProgressSummary(db, ALL_GRAMMAR_LESSONS, getGrammarMainMenu),
      loadGrammarLessonStatusById(db, ALL_GRAMMAR_LESSONS),
    ])
      .then(([row, progress, statuses]) => {
        if (!mounted) return;
        setMemoryGrammarCount(row?.count ?? 0);
        setGrammarProgress(progress);
        setLessonStatusById(statuses);
      })
      .catch(() => {
        if (mounted) {
          setMemoryGrammarCount(0);
          setGrammarProgress(emptyGrammarProgressSummary);
        }
      });
    return () => {
      mounted = false;
    };
  }, [db]);

  const selectFolder = (folder: string) => {
    const folderItems = ALL_GRAMMAR_LESSONS.filter((lesson) => getGrammarMainMenu(lesson) === folder).sort((a, b) => a.order - b.order);
    const first = folderItems[0];
    setSelectedFolder(folder);
    setSelectedSubfolder(null);
    setSelectedLessonId(first?.id ?? selectedLessonId);
    setOpenedLessonId(null);
    setRevealedRomajiExampleId(null);
    setRevealedTranslationExampleId(null);
    setRevealedKanaExampleId(null);
    setSelectedWordLookup(null);
    setSelectedWordLookupAnchorId(null);
  };

  const selectSubfolder = (subfolder: string | null) => {
    const scopedLessons = folderLessons.filter((lesson) => !subfolder || lesson.subfolder === subfolder);
    setSelectedSubfolder(subfolder);
    setSelectedLessonId(scopedLessons[0]?.id ?? selectedLessonId);
    setOpenedLessonId(null);
    setRevealedRomajiExampleId(null);
    setRevealedTranslationExampleId(null);
    setRevealedKanaExampleId(null);
    setSelectedWordLookup(null);
    setSelectedWordLookupAnchorId(null);
  };

  const selectLesson = (lesson: GrammarLesson) => {
    setSelectedLessonId(lesson.id);
    setOpenedLessonId(lesson.id);
    setRevealedRomajiExampleId(null);
    setRevealedTranslationExampleId(null);
    setRevealedKanaExampleId(null);
    setExerciseFeedback(null);
    setSelectedWordLookup(null);
    setSelectedWordLookupAnchorId(null);
    void markGrammarLessonOpened(db, lesson.id)
      .then(() => loadGrammarProgressSummary(db, ALL_GRAMMAR_LESSONS, getGrammarMainMenu))
      .then(setGrammarProgress)
      .catch((error) => console.error('Unable to mark grammar lesson opened', error));
  };

  const closeLesson = () => {
    setOpenedLessonId(null);
    setRevealedRomajiExampleId(null);
    setRevealedTranslationExampleId(null);
    setRevealedKanaExampleId(null);
    setExerciseFeedback(null);
    setSelectedWordLookup(null);
    setSelectedWordLookupAnchorId(null);
  };

  const lessonExerciseExample = selectedLesson.examples[0];
  const exerciseDistractor = ALL_GRAMMAR_LESSONS.find(
    (lesson) => lesson.id !== selectedLesson.id && lesson.examples[0]?.fr !== lessonExerciseExample?.fr
  )?.examples[0]?.fr;
  const lessonExerciseChoices = lessonExerciseExample
    ? shuffle([lessonExerciseExample.fr, exerciseDistractor ?? 'Je vais à l’école.']).slice(0, 2)
    : [];

  const answerLessonExercise = async (choice: string) => {
    if (!lessonExerciseExample || exerciseFeedback) return;
    const isCorrect = choice === lessonExerciseExample.fr;
    setExerciseFeedback(isCorrect ? 'correct' : 'wrong');
    try {
      await recordGrammarExerciseAttempt(
        db,
        selectedLesson,
        choice,
        lessonExerciseExample.fr,
        isCorrect,
        'grammar_lesson',
        getGrammarMainMenu
      );
      setGrammarProgress(await loadGrammarProgressSummary(db, ALL_GRAMMAR_LESSONS, getGrammarMainMenu));
    } catch (error) {
      console.error('Unable to save grammar lesson exercise', error);
    }
  };

  const setSelectedLessonStatusValue = async (status: GrammarLessonStatus) => {
    try {
      await setGrammarLessonStatus(db, selectedLesson.id, status);
      setGrammarProgress(await loadGrammarProgressSummary(db, ALL_GRAMMAR_LESSONS, getGrammarMainMenu));
      setLessonStatusById((current) => ({ ...current, [selectedLesson.id]: status }));
    } catch (error) {
      console.error('Unable to update grammar lesson status', error);
    }
  };

  const startGrammarExercises = () => {
    setGrammarExerciseSession(createGrammarSession(buildGrammarQuizQuestions(grammarExerciseSize)));
    setGrammarExerciseInput('');
    setGrammarExerciseRomajiVisible(false);
    setGrammarExerciseFrenchVisible(false);
    setGrammarExerciseKanaOnly(false);
    setSelectedWordLookup(null);
    setSelectedWordLookupAnchorId(null);
  };

  const restartGrammarExerciseMistakes = () => {
    if (!grammarExerciseSession?.mistakes.length) return;
    setGrammarExerciseSession(createGrammarSession(grammarExerciseSession.mistakes.map((mistake) => mistake.question)));
    setGrammarExerciseInput('');
    setGrammarExerciseRomajiVisible(false);
    setGrammarExerciseFrenchVisible(false);
    setGrammarExerciseKanaOnly(false);
    setSelectedWordLookup(null);
    setSelectedWordLookupAnchorId(null);
  };

  const quitGrammarExercises = () => {
    setGrammarExerciseSession(null);
    setGrammarExerciseInput('');
    setGrammarExerciseRomajiVisible(false);
    setGrammarExerciseFrenchVisible(false);
    setGrammarExerciseKanaOnly(false);
    setSelectedWordLookup(null);
    setSelectedWordLookupAnchorId(null);
  };

  const answerGrammarExercise = async (choice: string) => {
    if (!grammarExerciseSession || grammarExerciseSession.finished || grammarExerciseSession.selected) return;
    const current = grammarExerciseSession.questions[grammarExerciseSession.currentIndex];
    if (!current) return;
    const isCorrect = isGrammarAnswerCorrect(choice, current.correctAnswer);
    const nextStreak = isCorrect ? grammarExerciseSession.streak + 1 : 0;
    const points = isCorrect ? 100 * getGrammarStreakMultiplier(nextStreak) : 0;
    try {
      await recordGrammarExerciseAttempt(db, current.lesson, choice, current.correctAnswer, isCorrect, 'grammar_quiz', getGrammarMainMenu);
      setGrammarProgress(await loadGrammarProgressSummary(db, ALL_GRAMMAR_LESSONS, getGrammarMainMenu));
    } catch (error) {
      console.error('Unable to save grammar exercise answer', error);
    }
    setGrammarExerciseSession({
      ...grammarExerciseSession,
      selected: choice,
      correctCount: grammarExerciseSession.correctCount + (isCorrect ? 1 : 0),
      score: grammarExerciseSession.score + points,
      streak: nextStreak,
      bestStreak: Math.max(grammarExerciseSession.bestStreak, nextStreak),
      lives: isCorrect ? grammarExerciseSession.lives : Math.max(0, grammarExerciseSession.lives - 1),
      mistakes: isCorrect
        ? grammarExerciseSession.mistakes
        : [...grammarExerciseSession.mistakes, { question: current, selected: choice }],
    });
    setGrammarExerciseInput('');
  };

  const advanceGrammarExercise = () => {
    if (!grammarExerciseSession) return;
    const nextIndex = grammarExerciseSession.currentIndex + 1;
    const finished = grammarExerciseSession.lives <= 0 || nextIndex >= grammarExerciseSession.questions.length;
    setGrammarExerciseSession({
      ...grammarExerciseSession,
      currentIndex: finished ? grammarExerciseSession.currentIndex : nextIndex,
      selected: null,
      streak: finished ? grammarExerciseSession.streak : grammarExerciseSession.streak,
      finished,
    });
    setGrammarExerciseRomajiVisible(false);
    setGrammarExerciseFrenchVisible(false);
    setGrammarExerciseKanaOnly(false);
    setSelectedWordLookup(null);
    setSelectedWordLookupAnchorId(null);
  };

  if (openedLessonId && selectedLesson) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.grammarBackButton} onPress={closeLesson}>
          <Text style={styles.grammarBackText}>← Retour aux leçons</Text>
        </Pressable>

        <Section title="Leçon">
          <View style={styles.grammarDetailCard}>
            <View style={styles.grammarDetailHeader}>
              <View style={styles.grammarOrderBadge}>
                <Text style={styles.grammarOrderText}>{selectedLesson.order}</Text>
              </View>
              <View style={styles.grammarDetailTitleBlock}>
                <Text style={styles.grammarDetailTitle}>{selectedLesson.title}</Text>
                <Text style={styles.grammarDetailPattern}>{humanizeGrammarPattern(selectedLesson)}</Text>
              </View>
              <View
                style={[
                  styles.lessonStatusBadge,
                  selectedLessonStatus === 'understood' && styles.lessonStatusBadge_understood,
                  selectedLessonStatus === 'not_understood' && styles.lessonStatusBadge_notUnderstood,
                ]}
              >
                <Text style={styles.lessonStatusBadgeText}>{formatGrammarLessonStatus(selectedLessonStatus)}</Text>
              </View>
            </View>

            <View style={styles.grammarInfoGrid}>
              <View style={styles.grammarInfoCard}>
                <Text style={styles.grammarInfoLabel}>Objectif</Text>
                <Text style={styles.grammarInfoText}>{selectedLesson.goal}</Text>
              </View>
              <View style={styles.grammarInfoCard}>
                <Text style={styles.grammarInfoLabel}>Formule</Text>
                <Text style={styles.grammarInfoText}>{humanizeGrammarFormula(selectedLesson)}</Text>
              </View>
            </View>

            <View style={styles.grammarFormulaCard}>
              <Text style={styles.grammarFormulaTitle}>La règle avec des cases simples</Text>
              <Text style={styles.grammarFormulaPattern}>{humanizeGrammarPattern(selectedLesson)}</Text>
              <Text style={styles.grammarFormulaText}>{explainGrammarSlots(selectedLesson)}</Text>
            </View>

            <Text style={styles.grammarExplanation}>{selectedLesson.explanation}</Text>

            <View style={styles.grammarCourseBlock}>
              <Text style={styles.grammarCourseTitle}>À quoi ça sert ?</Text>
              <Text style={styles.grammarCourseText}>{buildGrammarUseCase(selectedLesson)}</Text>
            </View>

            <View style={styles.grammarCourseBlock}>
              <Text style={styles.grammarCourseTitle}>Pourquoi ça marche comme ça ?</Text>
              <Text style={styles.grammarCourseText}>{buildGrammarWhy(selectedLesson)}</Text>
            </View>

            <View style={styles.grammarHowCard}>
              <Text style={styles.grammarCourseTitle}>Comment l’utiliser, étape par étape</Text>
              {buildGrammarSteps(selectedLesson).map((step, index) => (
                <View key={`${selectedLesson.id}-step-${index}`} style={styles.grammarStepRow}>
                  <Text style={styles.grammarStepNumber}>{index + 1}</Text>
                  <Text style={styles.grammarStepText}>{step}</Text>
                </View>
              ))}
            </View>

            <View style={styles.grammarSituationCard}>
              <Text style={styles.grammarSituationLabel}>Mise en situation réelle</Text>
              <Text style={styles.grammarSituationText}>{buildGrammarSituation(selectedLesson)}</Text>
            </View>

            <View style={styles.grammarMnemonicCard}>
              <Text style={styles.grammarMnemonicLabel}>Mémo technique et mnémotechnique</Text>
              <Text style={styles.grammarMnemonicText}>{buildGrammarMnemonic(selectedLesson)}</Text>
            </View>

            <View style={styles.grammarTrapCard}>
              <Text style={styles.grammarTrapLabel}>Piège JLPT</Text>
              <Text style={styles.grammarTrapText}>{selectedLesson.trap}</Text>
            </View>

            <View style={styles.grammarExamples}>
              <Text style={styles.grammarExamplesTitle}>Exemples expliqués</Text>
              {selectedLesson.examples.map((example) => {
                const romajiRevealed = revealedRomajiExampleId === example.id;
                const translationRevealed = revealedTranslationExampleId === example.id;
                const kanaRevealed = revealedKanaExampleId === example.id;
                const lookupAnchorId = `example-${example.id}`;
                return (
                  <View
                    key={example.id}
                    style={[styles.grammarExampleCard, translationRevealed && styles.grammarExampleCardRevealed]}
                  >
                    <JapaneseLookupText
                      text={example.kanji || example.kana}
                      entries={vocabularyLookupEntries}
                      onSelect={(entry) => {
                        setSelectedWordLookup(entry);
                        setSelectedWordLookupAnchorId(lookupAnchorId);
                      }}
                      style={styles.grammarExampleKanji}
                    />
                    {selectedWordLookupAnchorId === lookupAnchorId && (
                      <WordLookupPanel
                        entry={selectedWordLookup}
                        onClose={() => {
                          setSelectedWordLookup(null);
                          setSelectedWordLookupAnchorId(null);
                        }}
                      />
                    )}
                    {kanaRevealed && example.kanji !== example.kana && (
                      <Text style={styles.grammarExampleKana}>{example.kana}</Text>
                    )}
                    {romajiRevealed && <Text style={styles.grammarExampleRomaji}>{example.romaji}</Text>}
                    <View style={styles.grammarExampleActions}>
                      {example.kanji !== example.kana && (
                        <Pressable
                          onPress={() => setRevealedKanaExampleId(kanaRevealed ? null : example.id)}
                          style={styles.grammarExampleActionButton}
                        >
                          <Text style={styles.grammarExampleActionText}>
                            {kanaRevealed ? 'Masquer hiragana' : 'Voir en hiragana'}
                          </Text>
                        </Pressable>
                      )}
                      <Pressable
                        onPress={() => setRevealedRomajiExampleId(romajiRevealed ? null : example.id)}
                        style={styles.grammarExampleActionButton}
                      >
                        <Text style={styles.grammarExampleActionText}>
                          {romajiRevealed ? 'Masquer romaji' : 'Voir romaji'}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setRevealedTranslationExampleId(translationRevealed ? null : example.id)}
                        style={[styles.grammarExampleActionButton, styles.grammarExampleTranslateButton]}
                      >
                        <Text style={[styles.grammarExampleActionText, styles.grammarExampleTranslateText]}>
                          {translationRevealed ? 'Masquer français' : 'Voir traduction'}
                        </Text>
                      </Pressable>
                      <OfflineAudioButton text={example.kanji || example.kana} slow />
                    </View>
                    {translationRevealed && (
                      <View style={styles.grammarTranslationBox}>
                        <Text style={styles.grammarTranslation}>{example.fr}</Text>
                        <Text style={styles.grammarBreakdownTitle}>On démonte la phrase</Text>
                        <Text style={styles.grammarBreakdownText}>{buildGrammarExampleBreakdown(selectedLesson, example)}</Text>
                        <Text style={styles.grammarExampleNote}>{example.note}</Text>
                        <Text style={styles.grammarExampleAnalysis}>
                          {buildGrammarExampleAnalysis(selectedLesson, example)}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            <View style={styles.grammarPracticeCard}>
              <Text style={styles.grammarPracticeTitle}>Mini-entraînement</Text>
              <Text style={styles.grammarPracticeText}>{buildGrammarPracticePrompt(selectedLesson)}</Text>
              {lessonExerciseExample && (
                <>
                  <Text style={styles.questionMeta}>Quelle traduction correspond à cette phrase ?</Text>
                  <Text style={styles.grammarExampleKana}>{lessonExerciseExample.kana}</Text>
                  <JapaneseLookupText
                    text={lessonExerciseExample.kanji}
                    entries={vocabularyLookupEntries}
                    onSelect={(entry) => {
                      setSelectedWordLookup(entry);
                      setSelectedWordLookupAnchorId('lesson-mini');
                    }}
                    style={styles.grammarExampleKanji}
                  />
                  {selectedWordLookupAnchorId === 'lesson-mini' && (
                    <WordLookupPanel
                      entry={selectedWordLookup}
                      onClose={() => {
                        setSelectedWordLookup(null);
                        setSelectedWordLookupAnchorId(null);
                      }}
                    />
                  )}
                  <View style={styles.choiceList}>
                    {lessonExerciseChoices.map((choice) => {
                      const isCorrect = choice === lessonExerciseExample.fr;
                      const isSelected =
                        exerciseFeedback !== null &&
                        ((exerciseFeedback === 'correct' && isCorrect) || (exerciseFeedback === 'wrong' && !isCorrect));
                      return (
                        <Pressable
                          key={choice}
                          disabled={exerciseFeedback !== null}
                          onPress={() => answerLessonExercise(choice)}
                          style={[
                            styles.choice,
                            exerciseFeedback && isCorrect && styles.choiceCorrect,
                            exerciseFeedback === 'wrong' && isSelected && styles.choiceWrong,
                          ]}
                        >
                          <Text style={styles.choiceText}>{choice}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {exerciseFeedback && (
                    <Text style={styles.feedbackText}>
                      {exerciseFeedback === 'correct'
                        ? 'Très bien : cette leçon gagne en maîtrise.'
                        : `À revoir : la bonne réponse était “${lessonExerciseExample.fr}”.`}
                    </Text>
                  )}
                </>
              )}
              <View style={styles.lessonStatusSelector}>
                <Pressable
                  style={[
                    styles.lessonStatusButton,
                    selectedLessonStatus === 'understood' && styles.lessonStatusButton_understood,
                  ]}
                  onPress={() => setSelectedLessonStatusValue('understood')}
                >
                  <Text
                    style={[
                      styles.lessonStatusButtonText,
                      selectedLessonStatus === 'understood' && styles.lessonStatusButtonTextActive,
                    ]}
                  >
                    Comprise
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.lessonStatusButton,
                    selectedLessonStatus === 'not_understood' && styles.lessonStatusButton_notUnderstood,
                  ]}
                  onPress={() => setSelectedLessonStatusValue('not_understood')}
                >
                  <Text
                    style={[
                      styles.lessonStatusButtonText,
                      selectedLessonStatus === 'not_understood' && styles.lessonStatusButtonTextActive,
                    ]}
                  >
                    Non comprise
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.lessonStatusButton,
                    selectedLessonStatus === 'neutral' && styles.lessonStatusButton_neutral,
                  ]}
                  onPress={() => setSelectedLessonStatusValue('neutral')}
                >
                  <Text
                    style={[
                      styles.lessonStatusButtonText,
                      selectedLessonStatus === 'neutral' && styles.lessonStatusButtonTextActive,
                    ]}
                  >
                    Neutre
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Section>
      </ScrollView>
    );
  }

  const currentGrammarExercise = grammarExerciseSession?.questions[grammarExerciseSession.currentIndex] ?? null;
  const grammarExerciseRate =
    grammarExerciseSession && grammarExerciseSession.questions.length > 0
      ? Math.round((grammarExerciseSession.correctCount / grammarExerciseSession.questions.length) * 100)
      : 0;

  if (grammarMode === 'exercise') {
    const safeGrammarExerciseRomaji = currentGrammarExercise
      ? hideGrammarAnswerInHint(
          currentGrammarExercise.romaji,
          currentGrammarExercise.correctAnswer,
          'Romaji complet masqué pendant cette question.'
        )
      : '';
    const safeGrammarExerciseFrench = currentGrammarExercise
      ? hideGrammarAnswerInHint(
          currentGrammarExercise.french,
          currentGrammarExercise.correctAnswer,
          'Traduction complète masquée pendant cette question.'
        )
      : '';
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.grammarHero}>
          <View style={styles.grammarHeroText}>
            <Text style={styles.grammarKicker}>文法 練習</Text>
            <Text style={styles.grammarTitle}>Exercices de grammaire</Text>
            <Text style={styles.grammarSubtitle}>
              Texte à trou, réponses tapées, QCM, traduction et situations : la session se renouvelle à chaque lancement.
            </Text>
          </View>
          <View style={styles.grammarHeroBadge}>
            <Text style={styles.grammarHeroBadgeValue}>{grammarProgress.exerciseAttempts}</Text>
            <Text style={styles.grammarHeroBadgeText}>réponses</Text>
          </View>
        </View>

        <View style={styles.segmented}>
          <SegmentButton label="Leçons" active={false} onPress={() => setGrammarMode('learn')} />
          <SegmentButton label="Exercices" active onPress={() => setGrammarMode('exercise')} />
        </View>

        <View style={styles.grammarStatsRow}>
          <Metric label="Réussite" value={`${grammarProgress.exerciseRate}%`} />
          <Metric label="Comprises" value={grammarProgress.completed} />
          <Metric label="Ouvertes" value={`${grammarProgress.opened}/${grammarProgress.total}`} />
        </View>

        {!grammarExerciseSession ? (
          <Section title="Configuration">
            <View style={styles.segmented}>
              <SegmentButton label="10 questions" active={grammarExerciseSize === 10} onPress={() => setGrammarExerciseSize(10)} />
              <SegmentButton label="20 questions" active={grammarExerciseSize === 20} onPress={() => setGrammarExerciseSize(20)} />
            </View>
            <View style={styles.quizConfigCard}>
              <Text style={styles.quizConfigTitle}>{grammarExerciseSize} exercices prêts</Text>
              <Text style={styles.quizConfigMode}>Atelier complet N5</Text>
              <Text style={styles.quizConfigText}>
                La session mélange textes à trou, réponses à taper, QCM de règle, traductions et situations concrètes.
              </Text>
              <Text style={styles.quizConfigText}>
                Les réponses alimentent les stats, missions, badges et le parcours JLPT.
              </Text>
            </View>
            <Pressable style={styles.primaryButton} onPress={startGrammarExercises}>
              <Text style={styles.primaryButtonText}>Lancer les exercices</Text>
            </Pressable>
          </Section>
        ) : grammarExerciseSession.finished ? (
          <>
            <View style={styles.resultCard}>
              <Text style={styles.resultKicker}>Exercices terminés</Text>
              <Text style={styles.resultScore}>{grammarExerciseRate}%</Text>
              <Text style={styles.resultPercent}>
                {grammarExerciseSession.correctCount}/{grammarExerciseSession.questions.length} bonnes réponses
              </Text>
              <Text style={styles.resultTime}>
                Score : {grammarExerciseSession.score} pts · Meilleure série : {grammarExerciseSession.bestStreak}
              </Text>
              <Text style={styles.resultTime}>
                Vies restantes : {grammarExerciseSession.lives}/3 · Erreurs à revoir : {grammarExerciseSession.mistakes.length}
              </Text>
              <Text style={styles.resultTime}>Progression grammaire enregistrée.</Text>
            </View>
            {grammarExerciseSession.mistakes.length > 0 && (
              <Pressable style={styles.primaryButton} onPress={restartGrammarExerciseMistakes}>
                <Text style={styles.primaryButtonText}>Revoir mes erreurs</Text>
              </Pressable>
            )}
            <Pressable style={styles.primaryButton} onPress={startGrammarExercises}>
              <Text style={styles.primaryButtonText}>Nouvelle session</Text>
            </Pressable>
            <Pressable style={styles.secondaryFullButton} onPress={quitGrammarExercises}>
              <Text style={styles.secondaryFullButtonText}>Quitter</Text>
            </Pressable>
          </>
        ) : currentGrammarExercise ? (
          <Section title={`Exercice ${grammarExerciseSession.currentIndex + 1}/${grammarExerciseSession.questions.length}`}>
            <Text style={styles.questionMeta}>{getGrammarMainMenu(currentGrammarExercise.lesson)}</Text>
            <View style={styles.pathProgressTrack}>
              <View
                style={[
                  styles.pathProgressFill,
                  {
                    width: `${Math.round(
                      ((grammarExerciseSession.currentIndex + (grammarExerciseSession.selected ? 1 : 0)) /
                        grammarExerciseSession.questions.length) *
                        100
                    )}%`,
                  },
                ]}
              />
            </View>
            <View style={styles.arcadeHud}>
              <Text style={styles.quizScorePill}>{grammarExerciseSession.score} pts</Text>
              <Text style={styles.quizScorePill}>
                Série {grammarExerciseSession.streak} · x{getGrammarStreakMultiplier(grammarExerciseSession.streak)}
              </Text>
              <Text style={styles.quizScorePill}>
                {'♥'.repeat(grammarExerciseSession.lives)}{'♡'.repeat(Math.max(0, 3 - grammarExerciseSession.lives))}
              </Text>
            </View>
            <Text style={styles.questionTitle}>{currentGrammarExercise.prompt}</Text>
            {!!currentGrammarExercise.japanese && (
              <>
                <JapaneseLookupText
                  text={
                    grammarExerciseKanaOnly
                      ? currentGrammarExercise.kanaJapanese ?? currentGrammarExercise.japanese
                      : currentGrammarExercise.japanese
                  }
                  entries={vocabularyLookupEntries}
                  onSelect={(entry) => {
                    setSelectedWordLookup(entry);
                    setSelectedWordLookupAnchorId('grammar-exercise');
                  }}
                  style={styles.japanese}
                />
                {selectedWordLookupAnchorId === 'grammar-exercise' && (
                  <WordLookupPanel
                    entry={selectedWordLookup}
                    onClose={() => {
                      setSelectedWordLookup(null);
                      setSelectedWordLookupAnchorId(null);
                    }}
                  />
                )}
                {!!currentGrammarExercise.kanaJapanese &&
                  currentGrammarExercise.kanaJapanese !== currentGrammarExercise.japanese && (
                    <Pressable
                      onPress={() => setGrammarExerciseKanaOnly((value) => !value)}
                      style={styles.grammarExampleActionButton}
                    >
                      <Text style={styles.grammarExampleActionText}>
                        {grammarExerciseKanaOnly ? 'Voir phrase naturelle' : 'Voir en hiragana'}
                      </Text>
                    </Pressable>
                  )}
              </>
            )}
            <View style={styles.grammarExampleActions}>
              {!!safeGrammarExerciseRomaji && (
                <Pressable
                  onPress={() => setGrammarExerciseRomajiVisible((visible) => !visible)}
                  style={styles.grammarExampleActionButton}
                >
                  <Text style={styles.grammarExampleActionText}>
                    {grammarExerciseRomajiVisible ? 'Masquer romaji' : 'Voir romaji'}
                  </Text>
                </Pressable>
              )}
              {!!safeGrammarExerciseFrench && (
                <Pressable
                  onPress={() => setGrammarExerciseFrenchVisible((visible) => !visible)}
                  style={[styles.grammarExampleActionButton, styles.grammarExampleTranslateButton]}
                >
                  <Text style={[styles.grammarExampleActionText, styles.grammarExampleTranslateText]}>
                    {grammarExerciseFrenchVisible ? 'Masquer français' : 'Voir français'}
                  </Text>
                </Pressable>
              )}
            </View>
            {grammarExerciseRomajiVisible && !!safeGrammarExerciseRomaji && (
              <Text style={styles.grammarExampleRomaji}>{safeGrammarExerciseRomaji}</Text>
            )}
            {grammarExerciseFrenchVisible && !!safeGrammarExerciseFrench && (
              <View style={styles.grammarTranslationBox}>
                <Text style={styles.grammarTranslation}>{safeGrammarExerciseFrench}</Text>
              </View>
            )}
            <Text style={styles.feedbackMnemonic}>{getGrammarExerciseInstruction(currentGrammarExercise.kind)}</Text>
            <Text style={styles.feedbackText}>{currentGrammarExercise.helper}</Text>
            {currentGrammarExercise.choices.length > 0 ? (
              <View style={styles.choiceList}>
                {currentGrammarExercise.choices.map((choice) => {
                  const isCorrect = isGrammarAnswerCorrect(choice, currentGrammarExercise.correctAnswer);
                  const isSelected = grammarExerciseSession.selected === choice;
                  return (
                    <Pressable
                      key={choice}
                      disabled={grammarExerciseSession.selected !== null}
                      style={[
                        styles.choice,
                        grammarExerciseSession.selected && isCorrect && styles.choiceCorrect,
                        grammarExerciseSession.selected && isSelected && !isCorrect && styles.choiceWrong,
                      ]}
                      onPress={() => answerGrammarExercise(choice)}
                    >
                      <Text style={styles.choiceText}>{choice}</Text>
                      {grammarExerciseSession.selected && isCorrect && <Text style={styles.choiceIcon}>✓</Text>}
                      {grammarExerciseSession.selected && isSelected && !isCorrect && <Text style={styles.choiceIcon}>×</Text>}
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View style={styles.directAnswerBox}>
                <TextInput
                  value={grammarExerciseInput}
                  onChangeText={setGrammarExerciseInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Tape la réponse"
                  style={styles.directAnswerInput}
                />
                <Pressable
                  disabled={grammarExerciseInput.trim().length === 0 || grammarExerciseSession.selected !== null}
                  style={[
                    styles.primaryButton,
                    (grammarExerciseInput.trim().length === 0 || grammarExerciseSession.selected !== null) &&
                      styles.primaryButtonDisabled,
                  ]}
                  onPress={() => answerGrammarExercise(grammarExerciseInput)}
                >
                  <Text style={styles.primaryButtonText}>Valider</Text>
                </Pressable>
              </View>
            )}
            {grammarExerciseSession.selected !== null && (
              <View style={styles.feedback}>
                <Text style={styles.feedbackTitle}>
                  {isGrammarAnswerCorrect(grammarExerciseSession.selected, currentGrammarExercise.correctAnswer)
                    ? 'Correct'
                    : 'À revoir'}
                </Text>
                <Text style={styles.feedbackText}>Réponse : {currentGrammarExercise.correctAnswer}</Text>
                {buildGrammarCorrectionDetails(currentGrammarExercise).map((detail) => (
                  <View key={`${currentGrammarExercise.id}-${detail.title}`} style={styles.grammarCourseBlock}>
                    <Text style={styles.grammarCourseTitle}>{detail.title}</Text>
                    <Text style={styles.grammarCourseText}>{detail.text}</Text>
                  </View>
                ))}
                <Pressable style={styles.primaryButton} onPress={advanceGrammarExercise}>
                  <Text style={styles.primaryButtonText}>
                    {grammarExerciseSession.currentIndex + 1 >= grammarExerciseSession.questions.length
                      ? 'Voir le résultat'
                      : 'Question suivante'}
                  </Text>
                </Pressable>
              </View>
            )}
            <Pressable style={styles.secondaryFullButton} onPress={quitGrammarExercises}>
              <Text style={styles.secondaryFullButtonText}>Quitter</Text>
            </Pressable>
          </Section>
        ) : (
          <EmptyState title="Aucun exercice de grammaire" />
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.grammarHero}>
        <View style={styles.grammarHeroText}>
          <Text style={styles.grammarKicker}>文法 N5</Text>
          <Text style={styles.grammarTitle}>Leçons de grammaire</Text>
          <Text style={styles.grammarSubtitle}>
            Choisis un grand menu, puis un sous-menu, puis une leçon complète avec exemples et traduction au toucher.
          </Text>
        </View>
        <View style={styles.grammarHeroBadge}>
          <Text style={styles.grammarHeroBadgeValue}>{ALL_GRAMMAR_LESSONS.length}</Text>
          <Text style={styles.grammarHeroBadgeText}>leçons</Text>
        </View>
      </View>

      <View style={styles.segmented}>
        <SegmentButton label="Leçons" active onPress={() => setGrammarMode('learn')} />
        <SegmentButton label="Exercices" active={false} onPress={() => setGrammarMode('exercise')} />
      </View>

      <View style={styles.grammarStatsRow}>
        <Metric label="Ouvertes" value={`${grammarProgress.opened}/${grammarProgress.total}`} />
        <Metric label="Comprises" value={grammarProgress.completed} />
        <Metric label="Réussite" value={`${grammarProgress.exerciseRate}%`} />
      </View>

      <View style={styles.grammarMemoryCard}>
        <Text style={styles.grammarMemoryTitle}>Base mémoire connectée</Text>
        <Text style={styles.grammarMemoryText}>
          {memoryGrammarCount} entrées de grammaire N5 disponibles dans SQLite. Les leçons ci-dessous sont regroupées,
          clarifiées et classées en menus pédagogiques pour apprendre sans surcharge.
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.grammarFolderTabs}>
        {folders.map((folder) => (
          <Pressable
            key={folder}
            onPress={() => selectFolder(folder)}
            style={[styles.grammarFolderButton, selectedFolder === folder && styles.grammarFolderButtonActive]}
          >
            <Text style={[styles.grammarFolderText, selectedFolder === folder && styles.grammarFolderTextActive]}>
              {folder}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Section title="Menu et sous-menu">
        <View style={styles.grammarSubfolderList}>
          <Pressable
            onPress={() => selectSubfolder(null)}
            style={[styles.grammarSubfolderPill, selectedSubfolder === null && styles.grammarSubfolderPillActive]}
          >
            <Text style={[styles.grammarSubfolderText, selectedSubfolder === null && styles.grammarSubfolderTextActive]}>
              Tout le dossier
            </Text>
            <Text style={[styles.grammarSubfolderCount, selectedSubfolder === null && styles.grammarSubfolderTextActive]}>
              {folderLessons.length}
            </Text>
          </Pressable>
          {subfolders.map((subfolder) => {
            const count = folderLessons.filter((lesson) => lesson.subfolder === subfolder).length;
            return (
              <Pressable
                key={subfolder}
                onPress={() => selectSubfolder(subfolder)}
                style={[styles.grammarSubfolderPill, selectedSubfolder === subfolder && styles.grammarSubfolderPillActive]}
              >
                <Text style={[styles.grammarSubfolderText, selectedSubfolder === subfolder && styles.grammarSubfolderTextActive]}>
                  {subfolder}
                </Text>
                <Text style={[styles.grammarSubfolderCount, selectedSubfolder === subfolder && styles.grammarSubfolderTextActive]}>
                  {count}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.grammarLessonList}>
          {currentFolderLessons.map((lesson) => (
            <Pressable
              key={lesson.id}
              onPress={() => selectLesson(lesson)}
              style={[styles.grammarLessonRow, selectedLesson?.id === lesson.id && styles.grammarLessonRowActive]}
            >
              <Text style={styles.grammarLessonNumber}>{lesson.order}</Text>
              <View style={styles.grammarLessonRowBody}>
                <Text style={styles.grammarLessonTitle}>{lesson.title}</Text>
                <Text style={styles.grammarLessonPattern}>{humanizeGrammarPattern(lesson)}</Text>
              </View>
              <Text style={[styles.grammarLevelPill, getGrammarLevelStyle(lesson.level)]}>
                {formatGrammarLevel(lesson.level)}
              </Text>
            </Pressable>
          ))}
        </View>
      </Section>

    </ScrollView>
  );
}

function formatGrammarLevel(level: GrammarLesson['level']): string {
  if (level === 'facile') return 'Facile';
  if (level === 'pratique') return 'Pratique';
  if (level === 'intermediaire') return 'Intermédiaire';
  return 'Avancé';
}

function getGrammarLevelStyle(level: GrammarLesson['level']) {
  if (level === 'facile') return styles.grammarLevel_facile;
  if (level === 'pratique') return styles.grammarLevel_pratique;
  if (level === 'intermediaire') return styles.grammarLevel_intermediaire;
  return styles.grammarLevel_avance;
}

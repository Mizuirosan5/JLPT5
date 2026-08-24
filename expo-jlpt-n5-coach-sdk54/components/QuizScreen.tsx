import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { styles } from '../appStyles';
import { SegmentButton } from './formControls';
import { JapaneseCorrectionDetails, JapaneseLookupText, WordLookupPanel, useVocabularyLookupIndex } from './JapaneseLookup';
import { KanaArcadeQuizScreen } from './KanaArcadeQuizScreen';
import { GlobalQuizScreen } from './GlobalQuizScreen';
import { GrammarQuizScreen } from './GrammarQuizScreen';
import { AudioQuizScreen } from './AudioQuizScreen';
import { EmptyState, LoadingView } from './sharedUi';
import type {
  KanaCard,
  KanjiItem,
  KnowledgeQuizScope,
  LearningPreferences,
  MainQuizMode,
  QuizChoice,
  QuizQuestion,
  WordLookupEntry,
} from '../models';
import {
  buildCombinedKanaVocabularyExample,
  getCombinedKanaExamplePreset,
  normalizeKanaRomaji,
} from '../services/kanaVisual';
import { hasJapaneseText, keepChoicesInWritingSystem, normalizeAnswer } from '../services/text';
import { loadKanjiItems } from '../services/vocabulary';
import { shuffle } from '../services/random';
import { DEFAULT_LEARNING_PREFERENCES, loadLearningPreferences } from '../services/preferences';
import { buildQuizFeedbackInsights } from '../services/quizFeedback';
import { recordSrsReviewForQuestionAttempt } from '../services/srs';
import { filterKanaForCurriculum, filterKanjiForCurriculum, filterQuestionsForCurriculum, filterVocabularyForCurriculum, getQuestionCurriculumCode, loadCurriculumCatalog, loadCurriculumProfile } from '../services/curriculum';
import type { CurriculumCode } from '../data/curriculum';

type QuizLocation = { mode: MainQuizMode; scope: KnowledgeQuizScope };

export function QuizScreen({
  backSignal = 0,
  onBackStateChange,
}: {
  backSignal?: number;
  onBackStateChange?: (canGoBack: boolean) => void;
}) {
  const db = useSQLiteContext();
  const vocabularyLookupEntries = useVocabularyLookupIndex(db);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [choices, setChoices] = useState<QuizChoice[]>([]);
  const [selected, setSelected] = useState<QuizChoice | null>(null);
  const [quizMode, setQuizMode] = useState<MainQuizMode>('global');
  const [knowledgeQuizScope, setKnowledgeQuizScope] = useState<KnowledgeQuizScope>('all');
  const [quizHistory, setQuizHistory] = useState<QuizLocation[]>([]);
  const [globalKanjiItems, setGlobalKanjiItems] = useState<KanjiItem[]>([]);
  const [selectedWordLookup, setSelectedWordLookup] = useState<WordLookupEntry | null>(null);
  const [selectedWordLookupAnchorId, setSelectedWordLookupAnchorId] = useState<string | null>(null);
  const [kanaArcadeCards, setKanaArcadeCards] = useState<KanaCard[]>([]);
  const [preferences, setPreferences] = useState<LearningPreferences>(DEFAULT_LEARNING_PREFERENCES);
  const [curriculumCode, setCurriculumCode] = useState<CurriculumCode>('1A');
  const curriculumVocabularyEntries = useMemo(() => filterVocabularyForCurriculum(vocabularyLookupEntries, curriculumCode), [curriculumCode, vocabularyLookupEntries]);

  useEffect(() => {
    Promise.all([loadLearningPreferences(db), loadCurriculumProfile(db)])
      .then(([loaded, curriculum]) => { setPreferences(loaded); setCurriculumCode(curriculum.currentCode); })
      .catch((error) => console.error('Unable to load quiz preferences', error));
  }, [db]);

  const loadKanaArcadeCards = useCallback(async () => {
    try {
      const rows = await db.getAllAsync<Omit<KanaCard, 'examples'>>(
        `
        SELECT k.id, k.script, k.character, k.romaji, k.row_name,
               COALESCE(s.favorite, 0) AS favorite,
               COALESCE(s.review, 0) AS review,
               COALESCE(s.mastered, 0) AS mastered,
               COALESCE(s.seen_count, 0) AS seen_count,
               COALESCE(s.correct_count, 0) AS correct_count,
               m.note AS mnemonic_note
        FROM canonical_kana k
        LEFT JOIN app_kana_card_state s ON s.kana_id = k.id
        LEFT JOIN app_kana_mnemonic_local m ON m.kana_id = k.id
        WHERE k.needs_review = 0
          AND instr(k.character, '?') = 0
        ORDER BY k.script, length(k.character), k.romaji
        `
      );
      setKanaArcadeCards(filterKanaForCurriculum(
        rows.map((row) => {
          const combinedPreset = getCombinedKanaExamplePreset(row.romaji);
          return {
            ...row,
            script: row.script as 'hiragana' | 'katakana',
            romaji: normalizeKanaRomaji(row.character, row.romaji),
            examples: combinedPreset ? [buildCombinedKanaVocabularyExample(row.character, combinedPreset)] : [],
          };
        }), curriculumCode));
    } catch (error) {
      console.error('Unable to load kana arcade cards', error);
      setKanaArcadeCards([]);
    }
  }, [db, curriculumCode]);

  useEffect(() => {
    loadKanaArcadeCards();
  }, [loadKanaArcadeCards]);

  useEffect(() => {
    loadKanjiItems(db).then((items) => setGlobalKanjiItems(filterKanjiForCurriculum(items, curriculumCode))).catch((error) => {
      console.error('Unable to load global quiz kanji', error);
      setGlobalKanjiItems([]);
    });
  }, [db, curriculumCode]);

  const loadQuestion = useCallback(async () => {
    setLoading(true);
    setSelected(null);
    setSelectedWordLookup(null);
    setSelectedWordLookupAnchorId(null);
    try {
      const candidates = await db.getAllAsync<QuizQuestion>(`
        SELECT q.question_id, q.question_origin, q.item_type, q.item_id, q.skill_id, q.question_type,
               q.prompt_fr, q.prompt_ja, q.correct_answer, q.explanation_fr
        FROM app_question_bank q
        JOIN app_adaptive_question_priority p ON p.question_id = q.question_id
        LEFT JOIN (
          SELECT question_id,
                 COUNT(*) AS local_attempts,
                 SUM(is_correct) AS local_correct,
                 MAX(answered_at) AS last_answered_at
          FROM app_question_attempt_local
          GROUP BY question_id
        ) a ON a.question_id = q.question_id
        ORDER BY
          CASE
            WHEN a.local_attempts IS NULL THEN p.final_priority + 25
            WHEN a.local_correct = 0 THEN p.final_priority + 45
            WHEN (a.local_correct * 1.0 / a.local_attempts) < 0.70 THEN p.final_priority + 30
            ELSE p.final_priority - 10
          END DESC,
          COALESCE(a.last_answered_at, '1970-01-01') ASC,
          q.question_id
        LIMIT 240
      `);
      const catalog = await loadCurriculumCatalog(db);
      const eligibleCandidates = filterQuestionsForCurriculum(candidates, catalog, curriculumCode);
      const currentCandidates = eligibleCandidates.filter((candidate) => getQuestionCurriculumCode(candidate, catalog) === curriculumCode);
      const next = shuffle((currentCandidates.length ? currentCandidates : eligibleCandidates).slice(0, 8))[0] ?? null;
      setQuestion(next ?? null);

      if (next) {
        const generatedChoices = await db.getAllAsync<QuizChoice>(
          `
          SELECT id, choice_text, is_correct
          FROM app_generated_choice
          WHERE question_id = ?
          ORDER BY sort_order
        `,
          next.question_id
        );
        const allowedAnswers = new Set(eligibleCandidates.map((candidate) => candidate.correct_answer));
        const compatibleGenerated = keepChoicesInWritingSystem(
          next.correct_answer,
          generatedChoices.map((choice) => choice.choice_text).filter((choice) => allowedAnswers.has(choice))
        );
        if (compatibleGenerated.length >= 2) {
          setChoices(
            compatibleGenerated.map((choiceText, index) => ({
              id: `${next.question_id}-compatible-${index}`,
              choice_text: choiceText,
              is_correct: normalizeAnswer(choiceText) === normalizeAnswer(next.correct_answer) ? 1 : 0,
            }))
          );
        } else {
          const compatibleFallback = keepChoicesInWritingSystem(
            next.correct_answer,
            [next.correct_answer, ...eligibleCandidates.map((candidate) => candidate.correct_answer)]
          );
          setChoices(
            shuffle(
              compatibleFallback.slice(0, 4).map((choiceText, index) => ({
                id: `${next.question_id}-fallback-${index}`,
                choice_text: choiceText,
                is_correct: normalizeAnswer(choiceText) === normalizeAnswer(next.correct_answer) ? 1 : 0,
              }))
            )
          );
        }
      } else {
        setChoices([]);
      }
    } catch (error) {
      console.error('Unable to load adaptive quiz question', error);
      setQuestion(null);
      setChoices([]);
    } finally {
      setLoading(false);
    }
  }, [db, curriculumCode]);

  useEffect(() => {
    loadQuestion();
  }, [loadQuestion]);

  const answer = async (choice: QuizChoice) => {
    if (!question || selected) return;
    setSelected(choice);
    try {
      await db.runAsync(
        `
        INSERT INTO app_question_attempt_local (
          id, question_id, source_mode, selected_answer, correct_answer,
          is_correct, skill_id, answered_at
        ) VALUES (?, ?, 'adaptive_quiz', ?, ?, ?, ?, datetime('now'))
      `,
        `${Date.now()}-${Math.random()}`,
        question.question_id,
        choice.choice_text,
        question.correct_answer,
        choice.is_correct ? 1 : 0,
        question.skill_id
      );
      await recordSrsReviewForQuestionAttempt(db, {
        questionId: question.question_id,
        skillId: question.skill_id,
        sourceMode: 'adaptive_quiz',
        isCorrect: choice.is_correct === 1,
      });
    } catch (error) {
      console.error('Unable to save adaptive quiz answer', error);
    }
  };

  const openKnowledgeQuizScope = (scope: KnowledgeQuizScope) => {
    setQuizHistory((history) => [...history, { mode: quizMode, scope: knowledgeQuizScope }].slice(-20));
    setKnowledgeQuizScope(scope);
    setQuizMode('global');
  };

  const navigateQuiz = (mode: MainQuizMode, scope?: KnowledgeQuizScope) => {
    setQuizHistory((history) => [...history, { mode: quizMode, scope: knowledgeQuizScope }].slice(-20));
    setQuizMode(mode);
    if (scope) setKnowledgeQuizScope(scope);
  };

  useEffect(() => {
    onBackStateChange?.(quizHistory.length > 0);
  }, [onBackStateChange, quizHistory.length]);

  useEffect(() => {
    if (backSignal <= 0) return;
    setQuizHistory((history) => {
      const previous = history[history.length - 1];
      if (!previous) return history;
      setQuizMode(previous.mode);
      setKnowledgeQuizScope(previous.scope);
      return history.slice(0, -1);
    });
  }, [backSignal]);

  if (loading) {
    return <LoadingView />;
  }

  if (quizMode === 'global') {
    return (
      <GlobalQuizScreen
        initialScope={knowledgeQuizScope}
        kanaArcadeCards={kanaArcadeCards}
        vocabularyLookupEntries={curriculumVocabularyEntries}
        globalKanjiItems={globalKanjiItems}
        curriculumCode={curriculumCode}
        onNavigate={navigateQuiz}
      />
    );
  }

  if (quizMode === 'grammar') {
    return (
      <GrammarQuizScreen
        vocabularyLookupEntries={curriculumVocabularyEntries}
        onNavigate={navigateQuiz}
      />
    );
  }

  if (quizMode === 'kana_arcade') {
    return (
      <KanaArcadeQuizScreen
        kanaArcadeCards={kanaArcadeCards}
        onNavigate={navigateQuiz}
      />
    );
  }

  if (quizMode === 'audio') {
    return (
      <AudioQuizScreen
        vocabularyLookupEntries={curriculumVocabularyEntries}
        curriculumCode={curriculumCode}
        onNavigate={navigateQuiz}
      />
    );
  }

  if (!question) {
    return <EmptyState title="Aucune question" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.segmented}>
        <SegmentButton label="Tout" active={false} onPress={() => openKnowledgeQuizScope('all')} />
        <SegmentButton label="Kana" active={false} onPress={() => openKnowledgeQuizScope('kana')} />
        <SegmentButton label="Vocab" active={false} onPress={() => openKnowledgeQuizScope('vocabulary')} />
      </View>
      <View style={styles.segmented}>
        <SegmentButton label="Grammaire" active={false} onPress={() => setQuizMode('grammar')} />
        <SegmentButton label="Kanji" active={false} onPress={() => openKnowledgeQuizScope('kanji')} />
        <SegmentButton label="JLPT" active onPress={() => setQuizMode('adaptive')} />
      </View>
      <View style={styles.segmented}>
        <SegmentButton label="Audio" active={false} onPress={() => setQuizMode('audio')} />
      </View>
      <Text style={styles.questionMeta}>{question.skill_id.toUpperCase()}</Text>
      <Text style={styles.questionTitle}>{question.prompt_fr}</Text>
      {!!question.prompt_ja && (
        <>
          <JapaneseLookupText
            text={question.prompt_ja}
            entries={vocabularyLookupEntries}
            onSelect={(entry) => {
              setSelectedWordLookup(entry);
              setSelectedWordLookupAnchorId('quiz-adaptive');
            }}
            style={styles.japanese}
          />
          {selectedWordLookupAnchorId?.startsWith('quiz-adaptive') && (
            <WordLookupPanel
              entry={selectedWordLookup}
              onClose={() => {
                setSelectedWordLookup(null);
                setSelectedWordLookupAnchorId(null);
              }}
            />
          )}
        </>
      )}

      <View style={styles.choiceList}>
        {choices.map((choice) => {
          const isSelected = selected?.id === choice.id;
          const isCorrect = choice.is_correct === 1;
          return (
            <Pressable
              key={choice.id}
              disabled={!!selected}
              onPress={() => answer(choice)}
              style={[
                styles.choice,
                selected && isCorrect && styles.choiceCorrect,
                selected && isSelected && !isCorrect && styles.choiceWrong,
              ]}
            >
              {selected && hasJapaneseText(choice.choice_text) ? (
                <JapaneseLookupText
                  text={choice.choice_text}
                  entries={vocabularyLookupEntries}
                  onSelect={(entry) => {
                    setSelectedWordLookup(entry);
                    setSelectedWordLookupAnchorId('quiz-adaptive-choice');
                  }}
                  style={styles.choiceText}
                />
              ) : (
                <Text style={styles.choiceText}>{choice.choice_text}</Text>
              )}
              {selected && isCorrect && <Text style={styles.choiceIcon}>OK</Text>}
              {selected && isSelected && !isCorrect && <Text style={styles.choiceIcon}>×</Text>}
            </Pressable>
          );
        })}
      </View>

      {selected && (
        <View style={styles.feedback}>
          <Text style={styles.feedbackTitle}>
            {selected.is_correct ? 'Correct' : 'À revoir'}
          </Text>
          <View style={styles.correctionInsightCard}>
            <Text style={styles.correctionInsightKicker}>Analyse</Text>
            {buildQuizFeedbackInsights({
              selectedAnswer: selected.choice_text,
              expectedAnswer: question.correct_answer,
              explanation: question.explanation_fr,
              japanese: question.prompt_ja,
              translation: question.prompt_fr,
            }).map((insight) => (
              <View key={insight.title} style={styles.correctionInsightBlock}>
                <Text style={styles.correctionInsightLabel}>{insight.title}</Text>
                <Text style={styles.correctionInsightText}>{insight.detail}</Text>
              </View>
            ))}
          </View>
          <JapaneseCorrectionDetails
            japanese={question.prompt_ja}
            translation={question.prompt_fr}
            expectedAnswer={question.correct_answer}
            explanation={question.explanation_fr}
            entries={vocabularyLookupEntries}
            showRomaji={preferences.showRomaji}
            showTranslationFirst={preferences.showTranslationFirst}
            sourceQuestionId={question.question_id}
            sourceMode="adaptive_quiz"
            selectedAnswer={selected.choice_text}
            onSelect={(entry) => {
              setSelectedWordLookup(entry);
              setSelectedWordLookupAnchorId('quiz-adaptive-feedback');
            }}
          />
          <Pressable style={styles.primaryButton} onPress={loadQuestion}>
            <Text style={styles.primaryButtonText}>Question suivante</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

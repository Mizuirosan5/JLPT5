import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { styles } from '../appStyles';
import { SegmentButton } from './formControls';
import { JapaneseLookupText, WordLookupPanel, useVocabularyLookupIndex } from './JapaneseLookup';
import { KanaArcadeQuizScreen } from './KanaArcadeQuizScreen';
import { GlobalQuizScreen } from './GlobalQuizScreen';
import { GrammarQuizScreen } from './GrammarQuizScreen';
import { EmptyState, LoadingView } from './sharedUi';
import type {
  KanaCard,
  KanjiItem,
  KnowledgeQuizScope,
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
import { normalizeAnswer } from '../services/text';
import { loadKanjiItems } from '../services/vocabulary';
import { shuffle } from '../services/random';

export function QuizScreen() {
  const db = useSQLiteContext();
  const vocabularyLookupEntries = useVocabularyLookupIndex(db);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [choices, setChoices] = useState<QuizChoice[]>([]);
  const [selected, setSelected] = useState<QuizChoice | null>(null);
  const [quizMode, setQuizMode] = useState<MainQuizMode>('global');
  const [knowledgeQuizScope, setKnowledgeQuizScope] = useState<KnowledgeQuizScope>('all');
  const [globalKanjiItems, setGlobalKanjiItems] = useState<KanjiItem[]>([]);
  const [selectedWordLookup, setSelectedWordLookup] = useState<WordLookupEntry | null>(null);
  const [selectedWordLookupAnchorId, setSelectedWordLookupAnchorId] = useState<string | null>(null);
  const [kanaArcadeCards, setKanaArcadeCards] = useState<KanaCard[]>([]);

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
      setKanaArcadeCards(
        rows.map((row) => {
          const combinedPreset = getCombinedKanaExamplePreset(row.romaji);
          return {
            ...row,
            script: row.script as 'hiragana' | 'katakana',
            romaji: normalizeKanaRomaji(row.character, row.romaji),
            examples: combinedPreset ? [buildCombinedKanaVocabularyExample(row.character, combinedPreset)] : [],
          };
        })
      );
    } catch (error) {
      console.error('Unable to load kana arcade cards', error);
      setKanaArcadeCards([]);
    }
  }, [db]);

  useEffect(() => {
    loadKanaArcadeCards();
  }, [loadKanaArcadeCards]);

  useEffect(() => {
    loadKanjiItems(db).then(setGlobalKanjiItems).catch((error) => {
      console.error('Unable to load global quiz kanji', error);
      setGlobalKanjiItems([]);
    });
  }, [db]);

  const loadQuestion = useCallback(async () => {
    setLoading(true);
    setSelected(null);
    setSelectedWordLookup(null);
    setSelectedWordLookupAnchorId(null);
    try {
      const next = await db.getFirstAsync<QuizQuestion>(`
        SELECT q.question_id, q.question_origin, q.skill_id, q.question_type,
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
          random()
        LIMIT 1
      `);
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
        if (generatedChoices.length > 0) {
          setChoices(generatedChoices);
        } else {
          const distractors = await db.getAllAsync<{ choice_text: string }>(
            `
            SELECT correct_answer AS choice_text
            FROM app_question_bank
            WHERE question_id != ?
              AND skill_id = ?
              AND question_type = ?
              AND correct_answer IS NOT NULL
              AND correct_answer != ?
            GROUP BY correct_answer
            ORDER BY random()
            LIMIT 3
            `,
            next.question_id,
            next.skill_id,
            next.question_type,
            next.correct_answer
          );
          setChoices(
            shuffle([
              {
                id: `${next.question_id}-correct`,
                choice_text: next.correct_answer,
                is_correct: 1,
              },
              ...distractors.map((choice, index) => ({
                id: `${next.question_id}-fallback-${index}`,
                choice_text: choice.choice_text,
                is_correct: 0,
              })),
            ])
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
  }, [db]);

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
    } catch (error) {
      console.error('Unable to save adaptive quiz answer', error);
    }
  };

  const openKnowledgeQuizScope = (scope: KnowledgeQuizScope) => {
    setKnowledgeQuizScope(scope);
    setQuizMode('global');
  };

  if (loading) {
    return <LoadingView />;
  }

  if (quizMode === 'global') {
    return (
      <GlobalQuizScreen
        initialScope={knowledgeQuizScope}
        kanaArcadeCards={kanaArcadeCards}
        vocabularyLookupEntries={vocabularyLookupEntries}
        globalKanjiItems={globalKanjiItems}
        onNavigate={(mode, scope) => {
          setQuizMode(mode);
          if (scope) setKnowledgeQuizScope(scope);
        }}
      />
    );
  }

  if (quizMode === 'grammar') {
    return (
      <GrammarQuizScreen
        vocabularyLookupEntries={vocabularyLookupEntries}
        onNavigate={(mode, scope) => {
          setQuizMode(mode);
          if (scope) setKnowledgeQuizScope(scope);
        }}
      />
    );
  }

  if (quizMode === 'kana_arcade') {
    return (
      <KanaArcadeQuizScreen
        kanaArcadeCards={kanaArcadeCards}
        onNavigate={(mode, scope) => {
          setQuizMode(mode);
          if (scope) setKnowledgeQuizScope(scope);
        }}
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
          {selectedWordLookupAnchorId === 'quiz-adaptive' && (
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
              <Text style={styles.choiceText}>{choice.choice_text}</Text>
              {selected && isCorrect && <Text style={styles.choiceIcon}>???</Text>}
              {selected && isSelected && !isCorrect && <Text style={styles.choiceIcon}>??</Text>}
            </Pressable>
          );
        })}
      </View>

      {selected && (
        <View style={styles.feedback}>
          <Text style={styles.feedbackTitle}>
            {selected.is_correct ? 'Correct' : '?? revoir'}
          </Text>
          <Text style={styles.feedbackText}>{question.explanation_fr}</Text>
          <Pressable style={styles.primaryButton} onPress={loadQuestion}>
            <Text style={styles.primaryButtonText}>Question suivante</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

import * as Speech from 'expo-speech';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { styles } from '../appStyles';
import { HIRAGANA_STANDARD, KATAKANA_STANDARD } from '../data/kanaTables';
import { FilterButton, SegmentButton } from './formControls';
import { LoadingView } from './sharedUi';
import { KanaReferenceTable } from './KanaReferenceTable';
import { KanaCardViewer, KanaIllustratedCard, KanaLearningCard, KanaThumbnailCard } from './KanaCards';
import { KanaExercisePanel } from './KanaExercisePanel';
import { buildConfusionKanaQuiz, buildKanaExercise, buildKanaQuiz, buildMatchingRounds, getMatchingTotalCount } from '../services/kanaQuizFactory';
import { buildDailyKanaDeck, buildSmartKanaDeck, getKanaPriority } from '../services/kanaProgress';
import { shuffle } from '../services/random';
import { normalizeAnswer } from '../services/text';
import { recordSrsReviewForQuestionAttempt } from '../services/srs';
import type {
  KanaCard,
  KanaDisplayStyle,
  KanaExerciseDirection,
  KanaFilter,
  KanaMode,
  KanaPracticeMode,
  KanaQuizAnswerMode,
  KanaQuizSession,
  KanaQuizSize,
  KanaTab,
  KanaTimeRecord,
  KanaViewerPanel,
  VocabularyExample,
} from '../models';
import {
  HIRAGANA_BY_KATAKANA,
  PREFERRED_N5_EXAMPLES,
  buildCombinedKanaVocabularyExample,
  buildKanaSpeechText,
  getCombinedKanaExamplePreset,
  normalizeKanaRomaji,
  sortKanaCards,
} from '../services/kanaVisual';

export function KanaScreen() {
  const db = useSQLiteContext();
  const [mode, setMode] = useState<KanaMode>('learn');
  const [tab, setTab] = useState<KanaTab>('hiragana');
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<KanaCard[]>([]);
  const [flippedId, setFlippedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<KanaFilter>('all');
  const [search, setSearch] = useState('');
  const [focusMode, setFocusMode] = useState(false);
  const [displayStyle, setDisplayStyle] = useState<KanaDisplayStyle>('illustrated');
  const [focusIndex, setFocusIndex] = useState(0);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [viewerPanel, setViewerPanel] = useState<KanaViewerPanel>('card');
  const [quizSize, setQuizSize] = useState<KanaQuizSize>(10);
  const [exerciseDirection, setExerciseDirection] = useState<KanaExerciseDirection>('kana_to_romaji');
  const [answerMode, setAnswerMode] = useState<KanaQuizAnswerMode>('multiple_choice');
  const [practiceMode, setPracticeMode] = useState<KanaPracticeMode>('standard');
  const [includeCombinedKana, setIncludeCombinedKana] = useState(false);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerTick, setTimerTick] = useState(Date.now());
  const [timeRecords, setTimeRecords] = useState<KanaTimeRecord[]>([]);
  const [quizSession, setQuizSession] = useState<KanaQuizSession | null>(null);
  const [exerciseChoice, setExerciseChoice] = useState<string | null>(null);
  const [directInput, setDirectInput] = useState('');
  const [matchingKanaId, setMatchingKanaId] = useState<string | null>(null);
  const [matchingRomaji, setMatchingRomaji] = useState<string | null>(null);
  const [japaneseVoiceId, setJapaneseVoiceId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    Speech.getAvailableVoicesAsync()
      .then((voices) => {
        if (!mounted) return;
        const japaneseVoices = voices.filter((voice) => voice.language?.toLowerCase().startsWith('ja'));
        const preferredVoice =
          japaneseVoices.find((voice) => /ja-jp|japanese|kyoko|otoya|siri/i.test(`${voice.identifier} ${voice.name}`)) ??
          japaneseVoices[0];
        setJapaneseVoiceId(preferredVoice?.identifier ?? null);
      })
      .catch(() => setJapaneseVoiceId(null));
    return () => {
      mounted = false;
    };
  }, []);

  const loadCards = useCallback(async () => {
    setLoading(true);
    setFlippedId(null);
    setViewerIndex(null);
    setQuizSession(null);
    setExerciseChoice(null);
    setDirectInput('');
    setMatchingKanaId(null);
    setMatchingRomaji(null);

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
          AND (
            (? = 'hiragana' AND k.script = 'hiragana' AND length(k.character) = 1)
            OR (? = 'katakana' AND k.script = 'katakana' AND length(k.character) = 1)
            OR (? = 'combined' AND length(k.character) > 1)
          )
        ORDER BY k.script,
          CASE substr(k.romaji, 1, 1)
            WHEN 'a' THEN 1 WHEN 'i' THEN 2 WHEN 'u' THEN 3 WHEN 'e' THEN 4 WHEN 'o' THEN 5
            WHEN 'k' THEN 6 WHEN 's' THEN 7 WHEN 't' THEN 8 WHEN 'n' THEN 9 WHEN 'h' THEN 10
            WHEN 'm' THEN 11 WHEN 'y' THEN 12 WHEN 'r' THEN 13 WHEN 'w' THEN 14 ELSE 30
          END,
          k.romaji
        `,
        tab,
        tab,
        tab
      );

      const validCharacters =
        tab === 'hiragana'
          ? new Set(HIRAGANA_STANDARD.flat().filter(Boolean))
          : tab === 'katakana'
            ? new Set(KATAKANA_STANDARD.flat().filter(Boolean))
            : null;

      const filteredRows = validCharacters
        ? rows.filter((row) => validCharacters.has(row.character))
        : rows.filter((row) => !row.character.includes('?'));

      const enriched = await Promise.all(
        filteredRows.map(async (row) => {
          const lookupCharacter = HIRAGANA_BY_KATAKANA.get(row.character) ?? row.character;
          const preferredExample = PREFERRED_N5_EXAMPLES[lookupCharacter] ?? '';
          const dbExamples = await db.getAllAsync<VocabularyExample>(
            `
            SELECT id, japanese, kana, kanji, romaji, meaning_fr
            FROM canonical_vocabulary
            WHERE jlpt_level = 'N5'
              AND kana IS NOT NULL
              AND (
                (? != '' AND kana = ?)
                OR substr(kana, 1, length(?)) = ?
                OR instr(kana, ?) > 0
              )
            ORDER BY
              CASE
                WHEN ? != '' AND kana = ? THEN 0
                WHEN substr(kana, 1, length(?)) = ? THEN 1
                ELSE 2
              END,
              importance DESC,
              difficulty ASC,
              length(kana) ASC
            LIMIT 1
            `,
            preferredExample,
            preferredExample,
            lookupCharacter,
            lookupCharacter,
            lookupCharacter,
            preferredExample,
            preferredExample,
            lookupCharacter,
            lookupCharacter
          );
          const combinedPreset = getCombinedKanaExamplePreset(row.romaji);
          const examples =
            row.character.length > 1 && combinedPreset
              ? [buildCombinedKanaVocabularyExample(row.character, combinedPreset)]
              : dbExamples;
          return {
            ...row,
            script: row.script as 'hiragana' | 'katakana',
            romaji: normalizeKanaRomaji(row.character, row.romaji),
            examples,
          };
        })
      );

      setCards(sortKanaCards(enriched, tab));
      setFocusIndex(0);
    } catch (error) {
      console.error('Unable to load kana cards', error);
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [db, tab]);

  const visibleCards = useMemo(() => {
    const query = search.trim().toLowerCase();
    return cards.filter((card) => {
      const matchesSearch =
        !query ||
        card.character.includes(query) ||
        card.romaji.toLowerCase().includes(query) ||
        card.examples.some((example) =>
          `${example.japanese} ${example.kana ?? ''} ${example.meaning_fr}`
            .toLowerCase()
            .includes(query)
        );
      const matchesFilter =
        filter === 'all' ||
        (filter === 'known' && card.favorite === 1) ||
        (filter === 'review' && card.review === 1) ||
        (filter === 'mastered' && card.mastered === 1) ||
        (filter === 'unseen' && card.seen_count === 0);
      return matchesSearch && matchesFilter;
    });
  }, [cards, filter, search]);

  const focusedCard = visibleCards[Math.min(focusIndex, Math.max(0, visibleCards.length - 1))];
  const viewerCard =
    viewerIndex === null || visibleCards.length === 0
      ? null
      : visibleCards[Math.min(viewerIndex, Math.max(0, visibleCards.length - 1))];
  const safeViewerIndex =
    viewerIndex === null || visibleCards.length === 0
      ? 0
      : Math.min(viewerIndex, Math.max(0, visibleCards.length - 1));
  const kanaStats = useMemo(() => {
    const seen = cards.filter((card) => card.seen_count > 0).length;
    const mastered = cards.filter((card) => card.mastered === 1).length;
    const review = cards.filter((card) => card.review === 1).length;
    const known = cards.filter((card) => card.favorite === 1).length;
    return { seen, mastered, review, known };
  }, [cards]);

  const smartDeck = useMemo(() => buildSmartKanaDeck(cards), [cards]);
  const dailyDeck = useMemo(() => buildDailyKanaDeck(cards), [cards]);
  const liveElapsedMs =
    quizSession?.timerEnabled
      ? quizSession.elapsedMs ?? (quizSession.startedAt ? Math.max(0, timerTick - quizSession.startedAt) : 0)
      : undefined;

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const loadTimeRecords = useCallback(async () => {
    const records = await db.getAllAsync<KanaTimeRecord>(
      `
      SELECT id, elapsed_ms, correct_count, total_count, created_at
      FROM app_kana_time_record
      WHERE script = ?
        AND practice_mode = ?
        AND quiz_size = ?
        AND include_combined = ?
      ORDER BY elapsed_ms ASC, correct_count DESC, created_at DESC
      LIMIT 5
      `,
      tab,
      practiceMode,
      practiceMode === 'matching' ? 25 : quizSize,
      includeCombinedKana ? 1 : 0
    );
    setTimeRecords(records);
  }, [db, includeCombinedKana, practiceMode, quizSize, tab]);

  useEffect(() => {
    loadTimeRecords();
  }, [loadTimeRecords]);

  useEffect(() => {
    if (!quizSession?.timerEnabled || quizSession.finished || !quizSession.startedAt) return;
    const timer = setInterval(() => setTimerTick(Date.now()), 250);
    return () => clearInterval(timer);
  }, [quizSession?.finished, quizSession?.startedAt, quizSession?.timerEnabled]);

  const loadCombinedExerciseCards = useCallback(async () => {
    if (tab === 'combined') return [];
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
        AND k.script = ?
        AND length(k.character) > 1
        AND instr(k.character, '?') = 0
      ORDER BY k.romaji
      `,
      tab
    );

    return sortKanaCards(
      rows.map((row) => {
        const combinedPreset = getCombinedKanaExamplePreset(row.romaji);
        return {
          ...row,
          script: row.script as 'hiragana' | 'katakana',
          romaji: normalizeKanaRomaji(row.character, row.romaji),
          examples: combinedPreset ? [buildCombinedKanaVocabularyExample(row.character, combinedPreset)] : [],
        };
      }),
      tab
    );
  }, [db, tab]);

  useEffect(() => {
    if (viewerIndex !== null && visibleCards.length > 0 && viewerIndex >= visibleCards.length) {
      setViewerIndex(visibleCards.length - 1);
    }
    if (visibleCards.length === 0) {
      setViewerIndex(null);
    }
  }, [viewerIndex, visibleCards.length]);

  const openViewer = (index: number) => {
    const card = visibleCards[index];
    if (!card) return;
    setViewerIndex(index);
    setFlippedId(null);
    updateKanaCardState(card.id, { seenDelta: 1 });
  };

  const openCardInViewer = (card: KanaCard) => {
    const nextIndex = visibleCards.findIndex((visibleCard) => visibleCard.id === card.id);
    openViewer(nextIndex >= 0 ? nextIndex : 0);
  };

  const openSmartReview = () => {
    const firstCard = smartDeck[0];
    if (!firstCard) return;
    setFilter('all');
    setSearch('');
    setFocusMode(false);
    const nextIndex = cards.findIndex((card) => card.id === firstCard.id);
    setViewerIndex(Math.max(0, nextIndex));
    updateKanaCardState(firstCard.id, { seenDelta: 1 });
  };

  const openDailySession = () => {
    const firstCard = dailyDeck[0];
    if (!firstCard) return;
    setFilter('all');
    setSearch('');
    setFocusMode(false);
    const nextIndex = cards.findIndex((card) => card.id === firstCard.id);
    setViewerIndex(Math.max(0, nextIndex));
    updateKanaCardState(firstCard.id, { seenDelta: 1 });
  };

  const speakJapanese = useCallback(
    (text: string, slow = false) => {
      Speech.stop();
      Speech.speak(text, {
        language: 'ja-JP',
        voice: japaneseVoiceId ?? undefined,
        rate: slow ? 0.62 : 0.72,
        pitch: 1,
      });
    },
    [japaneseVoiceId]
  );

  const speakKanaCard = (card: KanaCard) => {
    Speech.stop();
    speakJapanese(buildKanaSpeechText(card), true);
  };

  const startSingleCardQuiz = (card: KanaCard) => {
    const pool = cards.length >= 4 ? cards : visibleCards;
    const exercise = buildKanaExercise(pool, card, 'kana_to_romaji', 'multiple_choice');
    if (!exercise) return;
    setMode('exercise');
    setViewerIndex(null);
    setFlippedId(null);
    setAnswerMode('multiple_choice');
    setExerciseDirection('kana_to_romaji');
    setQuizSession({
      questions: [exercise],
      currentIndex: 0,
      correctCount: 0,
      answers: [],
      finished: false,
      storyCompleted: true,
      practiceMode: 'standard',
    });
  };

  const showPreviousViewerCard = () => {
    if (visibleCards.length === 0) return;
    setFlippedId(null);
    setViewerIndex((current) => {
      const nextIndex = current === null ? 0 : (current - 1 + visibleCards.length) % visibleCards.length;
      const nextCard = visibleCards[nextIndex];
      if (nextCard) updateKanaCardState(nextCard.id, { seenDelta: 1 });
      return nextIndex;
    });
  };

  const showNextViewerCard = () => {
    if (visibleCards.length === 0) return;
    setFlippedId(null);
    setViewerIndex((current) => {
      const nextIndex = current === null ? 0 : (current + 1) % visibleCards.length;
      const nextCard = visibleCards[nextIndex];
      if (nextCard) updateKanaCardState(nextCard.id, { seenDelta: 1 });
      return nextIndex;
    });
  };

  const showRandomViewerCard = () => {
    if (visibleCards.length === 0) return;
    setFlippedId(null);
    setViewerIndex((current) => {
      if (visibleCards.length === 1) return 0;
      let nextIndex = Math.floor(Math.random() * visibleCards.length);
      if (current !== null && nextIndex === current) {
        nextIndex = (nextIndex + 1) % visibleCards.length;
      }
      const nextCard = visibleCards[nextIndex];
      if (nextCard) updateKanaCardState(nextCard.id, { seenDelta: 1 });
      return nextIndex;
    });
  };

  const saveKanaTimeRecord = useCallback(
    async (session: KanaQuizSession) => {
      if (!session.timerEnabled || !session.elapsedMs) return;
      const total = session.practiceMode === 'matching' ? getMatchingTotalCount(session) : session.questions.length;
      if (total <= 0) return;
      await db.runAsync(
        `
        INSERT INTO app_kana_time_record (
          id, script, practice_mode, quiz_size, include_combined,
          total_count, correct_count, elapsed_ms, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `,
        `${Date.now()}-${Math.random()}`,
        tab,
        session.practiceMode,
        session.practiceMode === 'matching' ? getMatchingTotalCount(session) : quizSize,
        includeCombinedKana ? 1 : 0,
        total,
        session.correctCount,
        session.elapsedMs
      );
      await loadTimeRecords();
    },
    [db, includeCombinedKana, loadTimeRecords, quizSize, tab]
  );

  const answerExercise = async (choice: string) => {
    const exercise = quizSession?.questions[quizSession.currentIndex];
    if (!exercise || !quizSession || exerciseChoice || quizSession.finished) return;
    const submittedChoice = normalizeAnswer(choice);
    setExerciseChoice(submittedChoice);
    const correctAnswer = exercise.direction === 'kana_to_romaji' ? exercise.prompt.romaji : exercise.prompt.character;
    const isCorrect = normalizeAnswer(submittedChoice) === normalizeAnswer(correctAnswer);
    await db.runAsync(
      `
      INSERT INTO app_question_attempt_local (
        id, question_id, source_mode, selected_answer, correct_answer,
        is_correct, skill_id, answered_at
      ) VALUES (?, ?, 'kana_exercise', ?, ?, ?, ?, datetime('now'))
      `,
      `${Date.now()}-${Math.random()}`,
      exercise.prompt.id,
      submittedChoice,
      correctAnswer,
      isCorrect ? 1 : 0,
      `kana:${exercise.prompt.script}:${exercise.direction}`
    );
    await recordSrsReviewForQuestionAttempt(db, {
      questionId: exercise.prompt.id,
      itemId: exercise.prompt.id,
      itemType: 'kana',
      skillId: `kana:${exercise.prompt.script}:${exercise.direction}`,
      sourceMode: 'kana_exercise',
      isCorrect,
    });
    await updateKanaCardState(exercise.prompt.id, {
      seenDelta: 1,
      correctDelta: isCorrect ? 1 : 0,
      review: isCorrect ? 0 : 1,
      mastered: isCorrect ? exercise.prompt.mastered : 0,
    });
    setQuizSession({
      ...quizSession,
      questions: quizSession.questions,
      correctCount: quizSession.correctCount + (isCorrect ? 1 : 0),
      answers: [
        ...quizSession.answers,
        {
          questionId: exercise.prompt.id,
          selected: submittedChoice,
          correct: correctAnswer,
          isCorrect,
        },
      ],
    });
  };

  const nextExercise = async () => {
    if (!quizSession) return;
    setExerciseChoice(null);
    setDirectInput('');
    const nextIndex = quizSession.currentIndex + 1;
    const finished = nextIndex >= quizSession.questions.length;
    const nextSession = {
      ...quizSession,
      currentIndex: Math.min(nextIndex, quizSession.questions.length - 1),
      finished,
      elapsedMs:
        finished && quizSession.timerEnabled && quizSession.startedAt
          ? Date.now() - quizSession.startedAt
          : quizSession.elapsedMs,
    };
    setQuizSession(nextSession);
    if (finished) {
      await saveKanaTimeRecord(nextSession);
    }
  };

  const quitExercise = () => {
    setQuizSession(null);
    setExerciseChoice(null);
    setDirectInput('');
    setMatchingKanaId(null);
    setMatchingRomaji(null);
  };

  const startQuiz = async () => {
    const baseQuizCards = visibleCards.length >= 4 ? visibleCards : cards;
    let quizCards = baseQuizCards;
    if (includeCombinedKana && tab !== 'combined') {
      const combinedCards = await loadCombinedExerciseCards();
      const byId = new Map<string, KanaCard>();
      [...baseQuizCards, ...combinedCards].forEach((card) => byId.set(card.id, card));
      quizCards = [...byId.values()];
    }
    if (practiceMode === 'matching') {
      const matchingRounds = buildMatchingRounds(quizCards, 5, 5);
      const matchingCards = matchingRounds[0] ?? [];
      setExerciseChoice(null);
      setDirectInput('');
      setMatchingKanaId(null);
      setMatchingRomaji(null);
      setQuizSession({
        questions: [],
        currentIndex: 0,
        correctCount: 0,
        answers: [],
        finished: false,
        matchingCards,
        matchingRounds,
        matchingRoundIndex: 0,
        matchingRoundCount: matchingRounds.length,
        matchingRomajiOrder: shuffle(matchingCards.map((card) => card.romaji)),
        matchingMatchedIds: [],
        matchingMistakes: 0,
        storyCompleted: true,
        practiceMode,
        timerEnabled,
        startedAt: timerEnabled ? Date.now() : undefined,
      });
      return;
    }
    const questions =
      practiceMode === 'confusion'
        ? buildConfusionKanaQuiz(quizCards, quizSize, answerMode)
        : buildKanaQuiz(quizCards, quizSize, exerciseDirection, answerMode);
    const storyCards = practiceMode === 'story' ? questions.slice(0, 5).map((question) => question.prompt) : undefined;
    setExerciseChoice(null);
    setDirectInput('');
    setMatchingKanaId(null);
    setMatchingRomaji(null);
    setQuizSession({
      questions,
      currentIndex: 0,
      correctCount: 0,
      answers: [],
      finished: false,
      storyCards,
      storyCompleted: practiceMode !== 'story',
      practiceMode,
      timerEnabled,
      startedAt: timerEnabled && practiceMode !== 'story' ? Date.now() : undefined,
    });
  };

  const beginStoryQuiz = () => {
    setQuizSession((current) =>
      current
        ? {
            ...current,
            storyCompleted: true,
            startedAt: current.timerEnabled && !current.startedAt ? Date.now() : current.startedAt,
          }
        : current
    );
  };

  const evaluateMatchingPair = async (kanaId: string, romaji: string) => {
    const session = quizSession;
    const card = session?.matchingCards?.find((matchingCard) => matchingCard.id === kanaId);
    if (!session || !card || session.finished) return;
    const alreadyMatched = session.matchingMatchedIds?.includes(kanaId);
    if (alreadyMatched) return;
    const isCorrect = normalizeAnswer(card.romaji) === normalizeAnswer(romaji);
    const nextMatchedIds = isCorrect ? [...(session.matchingMatchedIds ?? []), kanaId] : session.matchingMatchedIds ?? [];
    await updateKanaCardState(card.id, {
      seenDelta: 1,
      correctDelta: isCorrect ? 1 : 0,
      review: isCorrect ? 0 : 1,
      mastered: isCorrect ? card.mastered : 0,
    });
    const roundFinished = nextMatchedIds.length >= (session.matchingCards?.length ?? 0);
    const currentRoundIndex = session.matchingRoundIndex ?? 0;
    const nextRoundIndex = currentRoundIndex + 1;
    const nextRoundCards = session.matchingRounds?.[nextRoundIndex] ?? [];
    const finished = roundFinished && nextRoundIndex >= (session.matchingRoundCount ?? 1);
    const nextSession = {
      ...session,
      currentIndex: roundFinished && !finished ? nextRoundIndex : session.currentIndex,
      correctCount: session.correctCount + (isCorrect ? 1 : 0),
      matchingCards: roundFinished && !finished ? nextRoundCards : session.matchingCards,
      matchingRoundIndex: roundFinished && !finished ? nextRoundIndex : currentRoundIndex,
      matchingRomajiOrder:
        roundFinished && !finished ? shuffle(nextRoundCards.map((nextCard) => nextCard.romaji)) : session.matchingRomajiOrder,
      matchingMatchedIds: roundFinished && !finished ? [] : nextMatchedIds,
      matchingMistakes: (session.matchingMistakes ?? 0) + (isCorrect ? 0 : 1),
      finished,
      elapsedMs:
        finished && session.timerEnabled && session.startedAt
          ? Date.now() - session.startedAt
          : session.elapsedMs,
      answers: [
        ...session.answers,
        {
          questionId: card.id,
          selected: romaji,
          correct: card.romaji,
          isCorrect,
        },
      ],
    };
    setQuizSession(nextSession);
    if (finished) {
      await saveKanaTimeRecord(nextSession);
    }
    setMatchingKanaId(null);
    setMatchingRomaji(null);
  };

  const selectMatchingKana = (kanaId: string) => {
    if (matchingRomaji) {
      void evaluateMatchingPair(kanaId, matchingRomaji);
      return;
    }
    setMatchingKanaId((current) => (current === kanaId ? null : kanaId));
  };

  const selectMatchingRomaji = (romaji: string) => {
    if (matchingKanaId) {
      void evaluateMatchingPair(matchingKanaId, romaji);
      return;
    }
    setMatchingRomaji((current) => (current === romaji ? null : romaji));
  };

  const updateKanaCardState = async (
    kanaId: string,
    changes: {
      favorite?: number;
      review?: number;
      mastered?: number;
      seenDelta?: number;
      correctDelta?: number;
    }
  ) => {
    const current =
      cards.find((card) => card.id === kanaId) ??
      quizSession?.matchingCards?.find((card) => card.id === kanaId) ??
      quizSession?.questions.find((question) => question.prompt.id === kanaId)?.prompt;
    if (!current) return;
    const nextState = {
      favorite: changes.favorite ?? current.favorite,
      review: changes.review ?? current.review,
      mastered: changes.mastered ?? current.mastered,
      seen_count: current.seen_count + (changes.seenDelta ?? 0),
      correct_count: current.correct_count + (changes.correctDelta ?? 0),
    };
    await db.runAsync(
      `
      INSERT INTO app_kana_card_state (
        kana_id, favorite, review, mastered, seen_count, correct_count, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(kana_id) DO UPDATE SET
        favorite = excluded.favorite,
        review = excluded.review,
        mastered = excluded.mastered,
        seen_count = excluded.seen_count,
        correct_count = excluded.correct_count,
        updated_at = excluded.updated_at
      `,
      kanaId,
      nextState.favorite,
      nextState.review,
      nextState.mastered,
      nextState.seen_count,
      nextState.correct_count
    );
    setCards((currentCards) =>
      currentCards.map((card) => (card.id === kanaId ? { ...card, ...nextState } : card))
    );
  };

  const updateKanaMnemonicNote = async (kanaId: string, note: string) => {
    await db.runAsync(
      `
      INSERT INTO app_kana_mnemonic_local (kana_id, note, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(kana_id) DO UPDATE SET
        note = excluded.note,
        updated_at = excluded.updated_at
      `,
      kanaId,
      note
    );
    setCards((currentCards) =>
      currentCards.map((card) => (card.id === kanaId ? { ...card, mnemonic_note: note } : card))
    );
  };

  const shuffleVisibleDeck = () => {
    setCards((currentCards) => shuffle(currentCards));
    setFlippedId(null);
    setFocusIndex(0);
  };

  if (loading) {
    return <LoadingView />;
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.segmented}>
        <SegmentButton label="Apprendre" active={mode === 'learn'} onPress={() => setMode('learn')} />
        <SegmentButton label="Exercices" active={mode === 'exercise'} onPress={() => setMode('exercise')} />
      </View>

      <View style={styles.segmented}>
        <SegmentButton label="Hiragana" active={tab === 'hiragana'} onPress={() => setTab('hiragana')} />
        <SegmentButton label="Katakana" active={tab === 'katakana'} onPress={() => setTab('katakana')} />
      </View>

      <View style={styles.kanaToolbar}>
        <View style={styles.kanaProgressHeader}>
          <Text style={styles.kanaProgressTitle}>{visibleCards.length}/{cards.length} cartes</Text>
          <Text style={styles.kanaProgressHint}>
            Vues {kanaStats.seen} · Maîtrisées {kanaStats.mastered} · À revoir {kanaStats.review}
          </Text>
        </View>
        <View style={styles.kanaProgressTrack}>
          <View
            style={[
              styles.kanaProgressFill,
              { width: `${cards.length ? Math.round((kanaStats.mastered / cards.length) * 100) : 0}%` },
            ]}
          />
        </View>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher un kana, romaji ou mot"
          placeholderTextColor="#8A938F"
          style={styles.searchInput}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBar}>
          <FilterButton label="Tout" active={filter === 'all'} onPress={() => setFilter('all')} />
          <FilterButton label="Connus" active={filter === 'known'} onPress={() => setFilter('known')} />
          <FilterButton label="À revoir" active={filter === 'review'} onPress={() => setFilter('review')} />
          <FilterButton label="Maîtrisés" active={filter === 'mastered'} onPress={() => setFilter('mastered')} />
          <FilterButton label="Jamais vus" active={filter === 'unseen'} onPress={() => setFilter('unseen')} />
        </ScrollView>
        <View style={styles.statusLegend}>
          <View style={styles.statusLegendItem}>
            <View style={[styles.statusLegendDot, styles.thumbnailStatusUnseen]} />
            <Text style={styles.statusLegendText}>Jamais vu</Text>
          </View>
          <View style={styles.statusLegendItem}>
            <View style={[styles.statusLegendDot, styles.thumbnailStatusWeak]} />
            <Text style={styles.statusLegendText}>À revoir</Text>
          </View>
          <View style={styles.statusLegendItem}>
            <View style={[styles.statusLegendDot, styles.thumbnailStatusKnown]} />
            <Text style={styles.statusLegendText}>Connu</Text>
          </View>
          <View style={styles.statusLegendItem}>
            <View style={[styles.statusLegendDot, styles.thumbnailStatusMastered]} />
            <Text style={styles.statusLegendText}>Maîtrisé</Text>
          </View>
        </View>
        <View style={styles.kanaQuickActions}>
          <Pressable style={styles.kanaQuickButton} onPress={openDailySession}>
            <Text style={styles.kanaQuickTitle}>5 minutes Kana</Text>
            <Text style={styles.kanaQuickMeta}>{dailyDeck.length} cartes</Text>
          </Pressable>
          <Pressable style={styles.kanaQuickButton} onPress={openSmartReview}>
            <Text style={styles.kanaQuickTitle}>À travailler maintenant</Text>
            <Text style={styles.kanaQuickMeta}>{smartDeck.length} prioritaires</Text>
          </Pressable>
        </View>
        <View style={styles.kanaToolbarActions}>
          <Pressable
            style={[styles.secondaryButton, displayStyle === 'illustrated' && styles.secondaryButtonActive]}
            onPress={() => setDisplayStyle(displayStyle === 'illustrated' ? 'classic' : 'illustrated')}
          >
            <Text style={[styles.secondaryButtonText, displayStyle === 'illustrated' && styles.secondaryButtonTextActive]}>
              Illustré
            </Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={shuffleVisibleDeck}>
            <Text style={styles.secondaryButtonText}>Mélanger</Text>
          </Pressable>
          <Pressable
            style={[styles.secondaryButton, focusMode && styles.secondaryButtonActive]}
            onPress={() => {
              setFocusMode(!focusMode);
              setFlippedId(null);
              setFocusIndex(0);
            }}
          >
            <Text style={[styles.secondaryButtonText, focusMode && styles.secondaryButtonTextActive]}>
              Mode focus
            </Text>
          </Pressable>
        </View>
      </View>

      {mode === 'learn' ? (
        <>
          <Text style={styles.kanaIntro}>
            Touche une miniature pour ouvrir la carte en plein écran, puis glisse pour passer à la suivante.
          </Text>
          {tab !== 'combined' && (
            <KanaReferenceTable
              tab={tab}
              cards={cards}
              onSelect={(card) => {
                const nextIndex = visibleCards.findIndex((visibleCard) => visibleCard.id === card.id);
                openViewer(nextIndex >= 0 ? nextIndex : 0);
              }}
            />
          )}
          {focusMode && focusedCard ? (
            <View style={styles.focusPanel}>
              {displayStyle === 'illustrated' ? (
                <KanaIllustratedCard
                  card={focusedCard}
                  index={focusIndex}
                  total={visibleCards.length}
                  flipped={flippedId === focusedCard.id}
                  large
                  onPress={() => {
                    setFlippedId(flippedId === focusedCard.id ? null : focusedCard.id);
                    updateKanaCardState(focusedCard.id, { seenDelta: flippedId === focusedCard.id ? 0 : 1 });
                  }}
                  onToggleFavorite={() =>
                    updateKanaCardState(focusedCard.id, { favorite: focusedCard.favorite === 1 ? 0 : 1 })
                  }
                  onReview={() => updateKanaCardState(focusedCard.id, { review: 1, mastered: 0, seenDelta: 1 })}
                  onMastered={() => updateKanaCardState(focusedCard.id, { mastered: 1, review: 0, seenDelta: 1 })}
                />
              ) : (
                <KanaLearningCard
                  card={focusedCard}
                  flipped={flippedId === focusedCard.id}
                  large
                  onPress={() => {
                    setFlippedId(flippedId === focusedCard.id ? null : focusedCard.id);
                    updateKanaCardState(focusedCard.id, { seenDelta: flippedId === focusedCard.id ? 0 : 1 });
                  }}
                  onToggleFavorite={() =>
                    updateKanaCardState(focusedCard.id, { favorite: focusedCard.favorite === 1 ? 0 : 1 })
                  }
                  onReview={() => updateKanaCardState(focusedCard.id, { review: 1, mastered: 0, seenDelta: 1 })}
                  onMastered={() => updateKanaCardState(focusedCard.id, { mastered: 1, review: 0, seenDelta: 1 })}
                />
              )}
              <View style={styles.focusActions}>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => {
                    setFlippedId(null);
                    setFocusIndex(Math.max(0, focusIndex - 1));
                  }}
                >
                  <Text style={styles.secondaryButtonText}>Précédent</Text>
                </Pressable>
                <Text style={styles.focusCounter}>
                  {Math.min(focusIndex + 1, visibleCards.length)}/{visibleCards.length}
                </Text>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => {
                    setFlippedId(null);
                    setFocusIndex(Math.min(Math.max(0, visibleCards.length - 1), focusIndex + 1));
                  }}
                >
                  <Text style={styles.secondaryButtonText}>Suivant</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={displayStyle === 'illustrated' ? styles.illustratedKanaGrid : styles.kanaGrid}>
              {visibleCards.map((card, index) =>
                displayStyle === 'illustrated' ? (
                  <KanaThumbnailCard
                    key={card.id}
                    card={card}
                    index={index}
                    total={visibleCards.length}
                    onPress={() => openViewer(index)}
                  />
                ) : (
                  <KanaLearningCard
                    key={card.id}
                    card={card}
                    flipped={flippedId === card.id}
                    onPress={() => {
                      setFlippedId(flippedId === card.id ? null : card.id);
                      updateKanaCardState(card.id, { seenDelta: flippedId === card.id ? 0 : 1 });
                    }}
                    onToggleFavorite={() =>
                      updateKanaCardState(card.id, { favorite: card.favorite === 1 ? 0 : 1 })
                    }
                    onReview={() => updateKanaCardState(card.id, { review: 1, mastered: 0, seenDelta: 1 })}
                    onMastered={() => updateKanaCardState(card.id, { mastered: 1, review: 0, seenDelta: 1 })}
                  />
                )
              )}
            </View>
          )}
          <KanaCardViewer
            visible={Boolean(viewerCard)}
            card={viewerCard}
            index={safeViewerIndex}
            total={visibleCards.length}
            flipped={Boolean(viewerCard && flippedId === viewerCard.id)}
            panel={viewerPanel}
            onClose={() => {
              setViewerIndex(null);
              setFlippedId(null);
              setViewerPanel('card');
            }}
            onPanelChange={setViewerPanel}
            onToggleFlip={() => {
              if (!viewerCard) return;
              setFlippedId(flippedId === viewerCard.id ? null : viewerCard.id);
            }}
            onSpeak={() => viewerCard && speakKanaCard(viewerCard)}
            onStartQuiz={() => viewerCard && startSingleCardQuiz(viewerCard)}
            onPrevious={showPreviousViewerCard}
            onNext={showNextViewerCard}
            onRandom={showRandomViewerCard}
            onToggleFavorite={() =>
              viewerCard &&
              updateKanaCardState(viewerCard.id, { favorite: viewerCard.favorite === 1 ? 0 : 1 })
            }
            onReview={() =>
              viewerCard && updateKanaCardState(viewerCard.id, { review: 1, mastered: 0, seenDelta: 1 })
            }
            onMastered={() =>
              viewerCard && updateKanaCardState(viewerCard.id, { mastered: 1, review: 0, seenDelta: 1 })
            }
            onMnemonicNoteChange={(note) => viewerCard && updateKanaMnemonicNote(viewerCard.id, note)}
          />
        </>
      ) : (
        <KanaExercisePanel
          session={quizSession}
          quizSize={quizSize}
          direction={exerciseDirection}
          answerMode={answerMode}
          includeCombinedKana={includeCombinedKana}
          timerEnabled={timerEnabled}
          elapsedMs={liveElapsedMs}
          timeRecords={timeRecords}
          availableCount={visibleCards.length}
          selectedChoice={exerciseChoice}
          directInput={directInput}
          selectedMatchingKanaId={matchingKanaId}
          selectedMatchingRomaji={matchingRomaji}
          onQuizSizeChange={setQuizSize}
          onDirectionChange={setExerciseDirection}
          onAnswerModeChange={setAnswerMode}
          onIncludeCombinedKanaChange={setIncludeCombinedKana}
          onTimerEnabledChange={setTimerEnabled}
          practiceMode={practiceMode}
          onPracticeModeChange={setPracticeMode}
          onDirectInputChange={setDirectInput}
          onStart={startQuiz}
          onAnswer={answerExercise}
          onNext={nextExercise}
          onQuit={quitExercise}
          onBeginStoryQuiz={beginStoryQuiz}
          onSelectMatchingKana={selectMatchingKana}
          onSelectMatchingRomaji={selectMatchingRomaji}
        />
      )}
    </ScrollView>
  );
}

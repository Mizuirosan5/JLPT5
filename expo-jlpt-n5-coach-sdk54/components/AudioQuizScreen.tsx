import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { styles } from '../appStyles';
import { SegmentButton } from './formControls';
import { JapaneseLookupText, WordLookupPanel } from './JapaneseLookup';
import { EmptyState, Section } from './sharedUi';
import type {
  AudioQuizMode,
  AudioPackCategory,
  AudioQuizSession,
  KnowledgeQuizScope,
  MainQuizMode,
  WordLookupEntry,
} from '../models';
import { detectOfflineAudio, speakJapanese, stopOfflineAudio, type OfflineAudioState } from '../services/audio';
import { hasEmbeddedAudioAsset, playEmbeddedAudioAsset, stopEmbeddedAudioAsset } from '../services/embeddedAudio';
import {
  buildAudioQuizQuestions,
  buildEmbeddedAudioPack,
  createAudioQuizSession,
  getAudioCategoryLabel,
} from '../services/audioQuiz';
import { getGrammarStreakMultiplier } from '../services/grammarPedagogy';
import { DEFAULT_LEARNING_PREFERENCES, loadLearningPreferences } from '../services/preferences';
import { recordSrsReviewForQuestionAttempt } from '../services/srs';
import { hasJapaneseText, normalizeAnswer } from '../services/text';

type AudioQuizScreenProps = {
  vocabularyLookupEntries: WordLookupEntry[];
  onNavigate: (mode: MainQuizMode, scope?: KnowledgeQuizScope) => void;
};

export function AudioQuizScreen({ vocabularyLookupEntries, onNavigate }: AudioQuizScreenProps) {
  const db = useSQLiteContext();
  const [audio, setAudio] = useState<OfflineAudioState>({ available: false, japaneseVoiceId: null });
  const [audioEnabled, setAudioEnabled] = useState(DEFAULT_LEARNING_PREFERENCES.audioEnabled);
  const [quizSize, setQuizSize] = useState<10 | 20>(10);
  const [quizMode, setQuizMode] = useState<AudioQuizMode>('listen_meaning');
  const [session, setSession] = useState<AudioQuizSession | null>(null);
  const [selectedWordLookup, setSelectedWordLookup] = useState<WordLookupEntry | null>(null);

  const pack = useMemo(() => buildEmbeddedAudioPack(vocabularyLookupEntries), [vocabularyLookupEntries]);
  const categoryCounts = useMemo(() => {
    return pack.reduce<Record<string, number>>((acc, item) => {
      acc[item.category] = (acc[item.category] ?? 0) + 1;
      return acc;
    }, {});
  }, [pack]);
  const embeddedFileCount = useMemo(() => pack.filter((item) => hasEmbeddedAudioAsset(item.id)).length, [pack]);

  useEffect(() => {
    let mounted = true;
    Promise.all([detectOfflineAudio(), loadLearningPreferences(db)])
      .then(([audioState, preferences]) => {
        if (!mounted) return;
        setAudio(audioState);
        setAudioEnabled(preferences.audioEnabled);
      })
      .catch(() => {
        if (mounted) setAudio({ available: false, japaneseVoiceId: null });
      });
    return () => {
      mounted = false;
      stopEmbeddedAudioAsset();
      stopOfflineAudio();
    };
  }, [db]);

  const currentQuestion = session?.questions[session.currentIndex] ?? null;
  const canPlayEmbeddedAudio = Boolean(currentQuestion && hasEmbeddedAudioAsset(currentQuestion.item.id));
  const canPlayAudio = audioEnabled && (audio.available || canPlayEmbeddedAudio);

  const playCurrentAudio = useCallback(() => {
    if (!currentQuestion || !audioEnabled) return;
    playEmbeddedAudioAsset(currentQuestion.item.id, true)
      .then((playedEmbedded) => {
        if (!playedEmbedded) speakJapanese(currentQuestion.item.japanese || currentQuestion.item.kana, audio, true);
      })
      .catch(() => speakJapanese(currentQuestion.item.japanese || currentQuestion.item.kana, audio, true));
  }, [audio, audioEnabled, currentQuestion]);

  useEffect(() => {
    if (!currentQuestion || session?.selected || session?.finished || !canPlayAudio) return;
    const timer = setTimeout(playCurrentAudio, 180);
    return () => clearTimeout(timer);
  }, [canPlayAudio, currentQuestion, playCurrentAudio, session?.finished, session?.selected]);

  const startAudioQuiz = () => {
    const questions = buildAudioQuizQuestions(vocabularyLookupEntries, quizSize, quizMode);
    setSelectedWordLookup(null);
    setSession(createAudioQuizSession(questions));
  };

  const quitAudioQuiz = () => {
    stopEmbeddedAudioAsset();
    stopOfflineAudio();
    setSelectedWordLookup(null);
    setSession(null);
  };

  const answerAudioQuiz = async (choice: string) => {
    if (!session || !currentQuestion || session.selected || session.finished) return;
    const isCorrect = normalizeAnswer(choice) === normalizeAnswer(currentQuestion.correctAnswer);
    const nextStreak = isCorrect ? session.streak + 1 : 0;
    const points = isCorrect ? 100 * getGrammarStreakMultiplier(nextStreak) : 0;
    setSession({
      ...session,
      selected: choice,
      correctCount: session.correctCount + (isCorrect ? 1 : 0),
      score: session.score + points,
      streak: nextStreak,
      bestStreak: Math.max(session.bestStreak, nextStreak),
      mistakes: isCorrect ? session.mistakes : [...session.mistakes, { question: currentQuestion, selected: choice }],
    });
    try {
      await db.runAsync(
        `
        INSERT INTO app_question_attempt_local (
          id, question_id, source_mode, selected_answer, correct_answer,
          is_correct, skill_id, answered_at
        ) VALUES (?, ?, 'audio_quiz', ?, ?, ?, ?, datetime('now'))
        `,
        `${Date.now()}-${Math.random()}`,
        currentQuestion.id,
        choice,
        currentQuestion.correctAnswer,
        isCorrect ? 1 : 0,
        `audio:${currentQuestion.item.category}`
      );
      await recordSrsReviewForQuestionAttempt(db, {
        questionId: currentQuestion.id,
        skillId: `audio:${currentQuestion.item.category}`,
        sourceMode: 'audio_quiz',
        isCorrect,
        itemId: `audio:${currentQuestion.item.id}`,
        itemType: 'skill',
      });
    } catch (error) {
      console.error('Unable to save audio quiz answer', error);
    }
  };

  const advanceAudioQuiz = () => {
    if (!session) return;
    stopEmbeddedAudioAsset();
    stopOfflineAudio();
    setSelectedWordLookup(null);
    const nextIndex = session.currentIndex + 1;
    setSession({
      ...session,
      currentIndex: Math.min(nextIndex, session.questions.length - 1),
      selected: null,
      finished: nextIndex >= session.questions.length,
    });
  };

  if (pack.length < 4) {
    return <EmptyState title="Le pack audio se prépare" />;
  }

  const rate = session?.questions.length ? Math.round((session.correctCount / session.questions.length) * 100) : 0;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.segmented}>
        <SegmentButton label="Tout" active={false} onPress={() => onNavigate('global', 'all')} />
        <SegmentButton label="Kana" active={false} onPress={() => onNavigate('global', 'kana')} />
        <SegmentButton label="Vocab" active={false} onPress={() => onNavigate('global', 'vocabulary')} />
      </View>
      <View style={styles.segmented}>
        <SegmentButton label="Grammaire" active={false} onPress={() => onNavigate('grammar')} />
        <SegmentButton label="Audio" active onPress={() => onNavigate('audio')} />
        <SegmentButton label="JLPT" active={false} onPress={() => onNavigate('adaptive')} />
      </View>

      {!session ? (
        <>
          <View style={styles.arcadeHero}>
            <Text style={styles.arcadeKicker}>聞く Quiz Audio</Text>
            <Text style={styles.arcadeTitle}>Ecoute active N5</Text>
            <Text style={styles.arcadeText}>
              Pack local de {pack.length} prompts : salutations, nombres, phrases de classe, vocabulaire, grammaire,
              dialogues et textes d immersion.
            </Text>
          </View>
          <View style={styles.globalDomainStrip}>
            {Object.entries(categoryCounts).map(([category, count]) => (
              <View key={category} style={styles.globalDomainChip}>
                <Text style={styles.globalDomainChipText}>{getAudioCategoryLabel(category as AudioPackCategory)} · {count}</Text>
              </View>
            ))}
          </View>
          <Section title="Configuration audio">
            <View style={styles.segmented}>
              <SegmentButton label="Sens FR" active={quizMode === 'listen_meaning'} onPress={() => setQuizMode('listen_meaning')} />
              <SegmentButton label="Lecture JP" active={quizMode === 'listen_japanese'} onPress={() => setQuizMode('listen_japanese')} />
            </View>
            <View style={styles.segmented}>
              <SegmentButton label="10 questions" active={quizSize === 10} onPress={() => setQuizSize(10)} />
              <SegmentButton label="20 questions" active={quizSize === 20} onPress={() => setQuizSize(20)} />
            </View>
            <View style={styles.quizConfigCard}>
              <Text style={styles.quizConfigTitle}>{canPlayAudio ? 'Audio local prêt' : 'Mode sans voix détectée'}</Text>
              <Text style={styles.quizConfigText}>
                {canPlayAudio
                  ? 'Le quiz lit les fichiers embarques quand ils existent, puis utilise la voix japonaise locale en secours.'
                  : 'Le quiz reste utilisable en fallback texte si la voix japonaise locale est absente ou désactivée.'}
              </Text>
              <Text style={styles.quizConfigText}>
                Fichiers embarques actifs : {embeddedFileCount}/{pack.length}. Le reste passe en TTS ou en texte.
              </Text>
              <Text style={styles.quizConfigText}>Chaque réponse alimente la mémoire SRS audio.</Text>
            </View>
            <Pressable style={styles.primaryButton} onPress={startAudioQuiz}>
              <Text style={styles.primaryButtonText}>Lancer le quiz audio</Text>
            </Pressable>
          </Section>
        </>
      ) : session.finished ? (
        <>
          <View style={styles.resultCard}>
            <Text style={styles.resultKicker}>Quiz audio terminé</Text>
            <Text style={styles.resultScore}>{session.score}</Text>
            <Text style={styles.resultPercent}>{rate}% · {session.correctCount}/{session.questions.length} réponses justes</Text>
            <Text style={styles.resultTime}>Meilleure série : {session.bestStreak} · Erreurs : {session.mistakes.length}</Text>
          </View>
          <Pressable style={styles.primaryButton} onPress={startAudioQuiz}>
            <Text style={styles.primaryButtonText}>Rejouer</Text>
          </Pressable>
          <Pressable style={styles.secondaryFullButton} onPress={quitAudioQuiz}>
            <Text style={styles.secondaryFullButtonText}>Quitter</Text>
          </Pressable>
        </>
      ) : currentQuestion ? (
        <>
          <View style={styles.arcadeHud}>
            <View>
              <Text style={styles.questionMeta}>Question {session.currentIndex + 1}/{session.questions.length}</Text>
              <Text style={styles.arcadeHudScore}>{session.correctCount} justes</Text>
            </View>
            <Text style={styles.quizScorePill}>{getAudioCategoryLabel(currentQuestion.item.category)}</Text>
          </View>
          <View style={styles.pathProgressTrack}>
            <View
              style={[
                styles.pathProgressFill,
                { width: `${Math.round(((session.currentIndex + (session.selected ? 1 : 0)) / session.questions.length) * 100)}%` },
              ]}
            />
          </View>
          <View style={styles.arcadeHud}>
            <Text style={styles.quizScorePill}>{session.score} pts</Text>
            <Text style={styles.quizScorePill}>Combo x{getGrammarStreakMultiplier(session.streak)}</Text>
          </View>
          <Text style={styles.questionTitle}>{currentQuestion.prompt}</Text>
          <Pressable style={styles.primaryButton} onPress={playCurrentAudio}>
            <Text style={styles.primaryButtonText}>
              {canPlayEmbeddedAudio ? 'Réécouter le fichier' : canPlayAudio ? 'Réécouter' : 'Afficher le prompt'}
            </Text>
          </Pressable>
          {!canPlayAudio && (
            <JapaneseLookupText
              text={currentQuestion.item.japanese}
              entries={vocabularyLookupEntries}
              onSelect={setSelectedWordLookup}
              style={styles.globalQuestionDisplay}
            />
          )}
          <WordLookupPanel entry={selectedWordLookup} onClose={() => setSelectedWordLookup(null)} />
          <View style={styles.choiceList}>
            {currentQuestion.choices.map((choice) => {
              const correct = normalizeAnswer(choice) === normalizeAnswer(currentQuestion.correctAnswer);
              const selectedChoice = session.selected === choice;
              return (
                <Pressable
                  key={choice}
                  disabled={session.selected !== null}
                  onPress={() => answerAudioQuiz(choice)}
                  style={[
                    styles.choice,
                    session.selected && correct && styles.choiceCorrect,
                    session.selected && selectedChoice && !correct && styles.choiceWrong,
                  ]}
                >
                  {session.selected !== null && hasJapaneseText(choice) ? (
                    <JapaneseLookupText
                      text={choice}
                      entries={vocabularyLookupEntries}
                      onSelect={setSelectedWordLookup}
                      style={styles.choiceText}
                    />
                  ) : (
                    <Text style={styles.choiceText}>{choice}</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
          {session.selected !== null && (
            <View style={styles.feedback}>
              <Text style={styles.feedbackTitle}>
                {normalizeAnswer(session.selected) === normalizeAnswer(currentQuestion.correctAnswer) ? 'Correct' : 'À revoir'}
              </Text>
              <JapaneseLookupText
                text={currentQuestion.item.japanese}
                entries={vocabularyLookupEntries}
                onSelect={setSelectedWordLookup}
                style={styles.japanese}
              />
              <Text style={styles.feedbackText}>Kana : {currentQuestion.item.kana}</Text>
              {!!currentQuestion.item.romaji && <Text style={styles.feedbackText}>Romaji : {currentQuestion.item.romaji}</Text>}
              <Text style={styles.feedbackText}>Sens : {currentQuestion.item.meaningFr}</Text>
              <Text style={styles.feedbackMnemonic}>{currentQuestion.explanation}</Text>
              <Pressable style={styles.primaryButton} onPress={advanceAudioQuiz}>
                <Text style={styles.primaryButtonText}>
                  {session.currentIndex + 1 >= session.questions.length ? 'Voir le résultat' : 'Question suivante'}
                </Text>
              </Pressable>
            </View>
          )}
          <Pressable style={styles.secondaryFullButton} onPress={quitAudioQuiz}>
            <Text style={styles.secondaryFullButtonText}>Quitter</Text>
          </Pressable>
        </>
      ) : (
        <EmptyState title="Le quiz audio se prépare" />
      )}
    </ScrollView>
  );
}

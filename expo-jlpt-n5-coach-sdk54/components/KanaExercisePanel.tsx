import { Pressable, Text, TextInput, View } from 'react-native';
import { styles } from '../appStyles';
import type {
  KanaExerciseDirection,
  KanaPracticeMode,
  KanaQuizAnswerMode,
  KanaQuizSession,
  KanaQuizSize,
  KanaTimeRecord,
} from '../models';
import { SegmentButton } from './formControls';
import { EmptyState, Section } from './sharedUi';
import { formatElapsedTime } from '../services/time';
import { normalizeAnswer } from '../services/text';
import { getCombinedKanaExplanation, getMatchingTotalCount } from '../services/kanaQuizFactory';
import { CelebrationBurst } from './ExerciseShell';
import {
  buildKanaMnemonicSentence,
  getKanaVisual,
} from '../services/kanaVisual';

export function KanaExercisePanel({
  session,
  quizSize,
  direction,
  answerMode,
  includeCombinedKana,
  timerEnabled,
  elapsedMs,
  timeRecords,
  availableCount,
  selectedChoice,
  directInput,
  selectedMatchingKanaId,
  selectedMatchingRomaji,
  onQuizSizeChange,
  onDirectionChange,
  onAnswerModeChange,
  onIncludeCombinedKanaChange,
  onTimerEnabledChange,
  practiceMode,
  onPracticeModeChange,
  onDirectInputChange,
  onStart,
  onAnswer,
  onNext,
  onQuit,
  onBeginStoryQuiz,
  onSelectMatchingKana,
  onSelectMatchingRomaji,
}: {
  session: KanaQuizSession | null;
  quizSize: KanaQuizSize;
  direction: KanaExerciseDirection;
  answerMode: KanaQuizAnswerMode;
  includeCombinedKana: boolean;
  timerEnabled: boolean;
  elapsedMs?: number;
  timeRecords: KanaTimeRecord[];
  availableCount: number;
  selectedChoice: string | null;
  directInput: string;
  selectedMatchingKanaId: string | null;
  selectedMatchingRomaji: string | null;
  onQuizSizeChange: (size: KanaQuizSize) => void;
  onDirectionChange: (direction: KanaExerciseDirection) => void;
  onAnswerModeChange: (mode: KanaQuizAnswerMode) => void;
  onIncludeCombinedKanaChange: (include: boolean) => void;
  onTimerEnabledChange: (enabled: boolean) => void;
  practiceMode: KanaPracticeMode;
  onPracticeModeChange: (mode: KanaPracticeMode) => void;
  onDirectInputChange: (value: string) => void;
  onStart: () => void | Promise<void>;
  onAnswer: (choice: string) => void;
  onNext: () => void | Promise<void>;
  onQuit: () => void;
  onBeginStoryQuiz: () => void;
  onSelectMatchingKana: (kanaId: string) => void;
  onSelectMatchingRomaji: (romaji: string) => void;
}) {
  const practiceMemo = getKanaPracticeMemo(practiceMode);
  const minRequiredCards = practiceMode === 'matching' ? 5 : 4;
  const readyLabel =
    practiceMode === 'matching'
      ? '25 paires prêtes'
      : `${Math.min(quizSize, availableCount)} questions prêtes`;

  if (!session) {
    return (
      <View style={styles.kanaExercisePanel}>
        <Section title="Questionnaire kana">
          <Text style={styles.kanaIntro}>
            Choisis la taille et le sens du questionnaire. Les questions sont tirées au hasard dans le deck et les filtres actifs.
          </Text>
          <View style={styles.segmented}>
            <SegmentButton label="10 questions" active={quizSize === 10} onPress={() => onQuizSizeChange(10)} />
            <SegmentButton label="20 questions" active={quizSize === 20} onPress={() => onQuizSizeChange(20)} />
          </View>
          <View style={styles.segmented}>
            <SegmentButton
              label="Sons simples"
              active={!includeCombinedKana}
              onPress={() => onIncludeCombinedKanaChange(false)}
            />
            <SegmentButton
              label="Avec combinés"
              active={includeCombinedKana}
              onPress={() => onIncludeCombinedKanaChange(true)}
            />
          </View>
          <View style={styles.segmented}>
            <SegmentButton label="Standard" active={practiceMode === 'standard'} onPress={() => onPracticeModeChange('standard')} />
            <SegmentButton label="Histoire" active={practiceMode === 'story'} onPress={() => onPracticeModeChange('story')} />
            <SegmentButton label="Confusions" active={practiceMode === 'confusion'} onPress={() => onPracticeModeChange('confusion')} />
            <SegmentButton label="Association" active={practiceMode === 'matching'} onPress={() => onPracticeModeChange('matching')} />
          </View>
          <View style={styles.segmented}>
            <SegmentButton
              label="QCM"
              active={answerMode === 'multiple_choice'}
              onPress={() => onAnswerModeChange('multiple_choice')}
            />
            <SegmentButton
              label="Réponse directe"
              active={answerMode === 'direct_input'}
              onPress={() => onAnswerModeChange('direct_input')}
            />
          </View>
          <View style={styles.segmented}>
            <SegmentButton
              label="Kana → romaji"
              active={direction === 'kana_to_romaji'}
              onPress={() => onDirectionChange('kana_to_romaji')}
            />
            <SegmentButton
              label="Romaji → kana"
              active={direction === 'romaji_to_kana'}
              onPress={() => onDirectionChange('romaji_to_kana')}
            />
          </View>
          <Pressable
            style={[styles.timerToggle, timerEnabled && styles.timerToggleActive]}
            onPress={() => onTimerEnabledChange(!timerEnabled)}
          >
            <View style={[styles.timerSwitch, timerEnabled && styles.timerSwitchActive]}>
              <View style={[styles.timerSwitchKnob, timerEnabled && styles.timerSwitchKnobActive]} />
            </View>
            <View style={styles.timerToggleCopy}>
              <Text style={styles.timerToggleTitle}>Chronomètre</Text>
              <Text style={styles.timerToggleText}>
                {timerEnabled
                  ? 'Activé : ton temps sera affiché et classé.'
                  : 'Désactivé : entraînement sans pression de temps.'}
              </Text>
            </View>
          </Pressable>
          <View style={styles.quizConfigCard}>
            <Text style={styles.quizConfigTitle}>{readyLabel}</Text>
            <Text style={styles.quizConfigMode}>{practiceMemo.title}</Text>
            <Text style={styles.quizConfigText}>{practiceMemo.description}</Text>
            <Text style={styles.quizConfigText}>
              Deck disponible : {availableCount} cartes. Le questionnaire évite les doublons quand le deck est assez grand.
            </Text>
          </View>
          <Pressable
            disabled={availableCount < minRequiredCards}
            style={[styles.primaryButton, availableCount < minRequiredCards && styles.primaryButtonDisabled]}
            onPress={onStart}
          >
            <Text style={styles.primaryButtonText}>Démarrer le questionnaire</Text>
          </Pressable>
        </Section>
      </View>
    );
  }

  if (session.finished) {
    const total = session.practiceMode === 'matching' ? getMatchingTotalCount(session) : session.questions.length;
    const percent = total > 0 ? Math.round((session.correctCount / total) * 100) : 0;
    return (
      <View style={styles.kanaExercisePanel}>
        <View style={styles.resultCard}>
          <Text style={styles.resultKicker}>Résultat</Text>
          <Text style={styles.resultScore}>{session.correctCount}/{total}</Text>
          <Text style={styles.resultPercent}>{percent}% de réussite</Text>
          {session.practiceMode === 'matching' && (
            <Text style={styles.resultTime}>Erreurs : {session.matchingMistakes ?? 0}</Text>
          )}
          {session.timerEnabled && (
            <Text style={styles.resultTime}>Temps : {formatElapsedTime(session.elapsedMs ?? elapsedMs ?? 0)}</Text>
          )}
        </View>
        {session.timerEnabled && (
          <Section title="Classement chrono">
            <View style={styles.timeRankingCard}>
              {timeRecords.length === 0 ? (
                <Text style={styles.quizConfigText}>Premier temps enregistré pour cette configuration.</Text>
              ) : (
                timeRecords.map((record, index) => (
                  <View key={record.id} style={styles.timeRankingRow}>
                    <Text style={styles.timeRankingRank}>#{index + 1}</Text>
                    <Text style={styles.timeRankingTime}>{formatElapsedTime(record.elapsed_ms)}</Text>
                    <Text style={styles.timeRankingMeta}>
                      {record.correct_count}/{record.total_count} juste{record.correct_count > 1 ? 's' : ''}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </Section>
        )}
        <Section title="Correction rapide">
          {session.answers.map((answer, index) => (
            <View key={`${answer.questionId}-${index}`} style={styles.answerReviewRow}>
              <Text style={styles.answerReviewIndex}>{index + 1}</Text>
              <Text style={styles.answerReviewText}>
                Ta réponse : {answer.selected} · Correct : {answer.correct}
              </Text>
              <Text style={[styles.answerReviewStatus, answer.isCorrect ? styles.answerOk : styles.answerKo]}>
                {answer.isCorrect ? 'OK' : 'À revoir'}
              </Text>
            </View>
          ))}
        </Section>
        <Pressable style={styles.primaryButton} onPress={onStart}>
          <Text style={styles.primaryButtonText}>Recommencer</Text>
        </Pressable>
        <Pressable style={styles.secondaryFullButton} onPress={onQuit}>
          <Text style={styles.secondaryFullButtonText}>Quitter</Text>
        </Pressable>
      </View>
    );
  }

  if (session.storyCards && session.storyCompleted === false) {
    return (
      <View style={styles.kanaExercisePanel}>
        <Section title="Mémorise l'histoire">
          <Text style={styles.kanaIntro}>
            Observe ces cartes, associe le dessin au son, puis lance le quiz. Les mêmes cartes reviennent juste après.
          </Text>
          <View style={styles.storyCardGrid}>
            {session.storyCards.map((card, index) => {
              const visual = getKanaVisual(card, index);
              return (
                <View key={card.id} style={[styles.storyMemoCard, { backgroundColor: visual.background }]}>
                  <Text style={styles.storyKana}>{card.character}</Text>
                  <Text style={styles.storyRomaji}>{card.romaji}</Text>
                  <Text style={styles.storyMnemonic} numberOfLines={3}>
                    {buildKanaMnemonicSentence(card, visual)}
                  </Text>
                </View>
              );
            })}
          </View>
          <Pressable style={styles.primaryButton} onPress={onBeginStoryQuiz}>
            <Text style={styles.primaryButtonText}>Commencer le quiz</Text>
          </Pressable>
          <Pressable style={styles.secondaryFullButton} onPress={onQuit}>
            <Text style={styles.secondaryFullButtonText}>Quitter</Text>
          </Pressable>
        </Section>
      </View>
    );
  }

  if (session.practiceMode === 'matching' && session.matchingCards) {
    const matchedIds = new Set(session.matchingMatchedIds ?? []);
    const total = session.matchingCards.length;
    const matchedCount = matchedIds.size;
    const roundIndex = session.matchingRoundIndex ?? 0;
    const roundCount = session.matchingRoundCount ?? 1;
    const totalPairs = getMatchingTotalCount(session);
    return (
      <View style={styles.kanaExercisePanel}>
        <View style={styles.quizHeaderRow}>
          <Text style={styles.questionMeta}>Association manche {roundIndex + 1}/{roundCount}</Text>
          <View style={styles.quizHeaderStats}>
            {session.timerEnabled && <Text style={styles.quizTimerPill}>{formatElapsedTime(elapsedMs ?? 0)}</Text>}
            <Text style={styles.quizScorePill}>{session.correctCount}/{totalPairs} paires</Text>
          </View>
        </View>
        <Text style={styles.questionTitle}>Associe les 5 kana de cette manche à leur romaji</Text>
        <View style={styles.matchingBoard}>
          <View style={styles.matchingColumn}>
            {session.matchingCards.map((card) => {
              const matched = matchedIds.has(card.id);
              const selected = selectedMatchingKanaId === card.id;
              return (
                <Pressable
                  key={card.id}
                  disabled={matched}
                  onPress={() => onSelectMatchingKana(card.id)}
                  style={[
                    styles.matchingCard,
                    selected && styles.matchingCardSelected,
                    matched && styles.matchingCardMatched,
                  ]}
                >
                  <Text style={styles.matchingKana}>{card.character}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.matchingColumn}>
            {(session.matchingRomajiOrder ?? []).map((romaji) => {
              const matched = session.matchingCards?.some(
                (card) => matchedIds.has(card.id) && normalizeAnswer(card.romaji) === normalizeAnswer(romaji)
              );
              const selected = selectedMatchingRomaji === romaji;
              return (
                <Pressable
                  key={romaji}
                  disabled={matched}
                  onPress={() => onSelectMatchingRomaji(romaji)}
                  style={[
                    styles.matchingCard,
                    styles.matchingRomajiCard,
                    selected && styles.matchingCardSelected,
                    matched && styles.matchingCardMatched,
                  ]}
                >
                  <Text style={styles.matchingRomaji}>{romaji}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <Text style={styles.matchingFooter}>
          Manche : {matchedCount}/{total}. Erreurs : {session.matchingMistakes ?? 0}. Clique une carte à gauche puis sa correspondance à droite.
        </Text>
        <Pressable style={styles.secondaryFullButton} onPress={onQuit}>
          <Text style={styles.secondaryFullButtonText}>Quitter</Text>
        </Pressable>
      </View>
    );
  }

  const exercise = session.questions[session.currentIndex];
  if (!exercise) {
    return <EmptyState title="Pas assez de kana pour créer un exercice" />;
  }
  const promptText = exercise.direction === 'kana_to_romaji' ? exercise.prompt.character : exercise.prompt.romaji;
  const correctAnswer = exercise.direction === 'kana_to_romaji' ? exercise.prompt.romaji : exercise.prompt.character;
  const isAnswerCorrect =
    selectedChoice !== null && normalizeAnswer(selectedChoice) === normalizeAnswer(correctAnswer);
  const combinedExplanation = getCombinedKanaExplanation(exercise.prompt);
  const previousStreak = [...session.answers].reverse().findIndex((answer) => !answer.isCorrect);
  const completedStreak = previousStreak === -1 ? session.answers.length : previousStreak;
  const currentAnswerRecorded = session.answers.at(-1)?.questionId === exercise.prompt.id;
  const visibleStreak = selectedChoice && isAnswerCorrect && !currentAnswerRecorded
    ? completedStreak + 1
    : completedStreak;
  const promptLabel =
    exercise.direction === 'kana_to_romaji'
      ? 'Quel est le bon romaji ?'
      : 'Quel est le bon kana ?';

  return (
    <View style={styles.kanaExercisePanel}>
      <CelebrationBurst
        visible={isAnswerCorrect && visibleStreak > 0 && visibleStreak % 5 === 0}
        streak={visibleStreak}
      />
      <View style={styles.quizHeaderRow}>
        <Text style={styles.questionMeta}>Question {session.currentIndex + 1}/{session.questions.length}</Text>
        <View style={styles.quizHeaderStats}>
          {session.timerEnabled && <Text style={styles.quizTimerPill}>{formatElapsedTime(elapsedMs ?? 0)}</Text>}
          <Text style={styles.quizScorePill}>{session.correctCount} juste{session.correctCount > 1 ? 's' : ''}</Text>
        </View>
      </View>
      <Text style={styles.kanaExercisePrompt}>{promptText}</Text>
      <Text style={styles.questionTitle}>{promptLabel}</Text>

      {exercise.answerMode === 'multiple_choice' ? (
        <View style={styles.choiceList}>
          {exercise.choices.map((choice) => {
            const isCorrect = normalizeAnswer(choice) === normalizeAnswer(correctAnswer);
            const isSelected = normalizeAnswer(selectedChoice ?? '') === normalizeAnswer(choice);
            return (
              <Pressable
                key={choice}
                disabled={selectedChoice !== null}
                onPress={() => onAnswer(choice)}
                style={[
                  styles.choice,
                  selectedChoice && isCorrect && styles.choiceCorrect,
                  selectedChoice && isSelected && !isCorrect && styles.choiceWrong,
                ]}
              >
                <Text style={styles.choiceText}>{choice}</Text>
                {selectedChoice && isCorrect && <Text style={styles.choiceIcon}>✓</Text>}
                {selectedChoice && isSelected && !isCorrect && <Text style={styles.choiceIcon}>×</Text>}
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={styles.directAnswerBox}>
          <TextInput
            value={directInput}
            onChangeText={onDirectInputChange}
            editable={selectedChoice === null}
            autoCapitalize="none"
            autoCorrect={false}
            blurOnSubmit
            returnKeyType="done"
            onSubmitEditing={() => {
              if (selectedChoice === null && directInput.trim().length > 0) onAnswer(directInput);
            }}
            placeholder={exercise.direction === 'kana_to_romaji' ? 'Tape le romaji...' : 'Tape le kana...'}
            placeholderTextColor="#8A938F"
            style={[
              styles.directAnswerInput,
              selectedChoice && normalizeAnswer(selectedChoice) === normalizeAnswer(correctAnswer) && styles.directAnswerCorrect,
              selectedChoice && normalizeAnswer(selectedChoice) !== normalizeAnswer(correctAnswer) && styles.directAnswerWrong,
            ]}
          />
          <Pressable
            disabled={selectedChoice !== null || directInput.trim().length === 0}
            style={[
              styles.primaryButton,
              (selectedChoice !== null || directInput.trim().length === 0) && styles.primaryButtonDisabled,
            ]}
            onPress={() => onAnswer(directInput)}
          >
            <Text style={styles.primaryButtonText}>Valider ma réponse</Text>
          </Pressable>
        </View>
      )}

      {selectedChoice && (
        <View style={styles.feedback}>
          <Text style={styles.feedbackTitle}>
            {isAnswerCorrect ? 'Correct' : 'À revoir'}
          </Text>
          <Text style={styles.feedbackText}>
            {exercise.prompt.character} se lit {exercise.prompt.romaji}.
          </Text>
          {combinedExplanation && <Text style={styles.feedbackText}>{combinedExplanation}</Text>}
          <Pressable style={[styles.primaryButton, styles.kanaFeedbackNextButton]} onPress={onNext}>
            <Text style={styles.primaryButtonText}>
              {session.currentIndex + 1 >= session.questions.length ? 'Voir le résultat' : 'Question suivante'}
            </Text>
          </Pressable>
          <Pressable style={styles.secondaryFullButton} onPress={onQuit}>
            <Text style={styles.secondaryFullButtonText}>Quitter</Text>
          </Pressable>
        </View>
      )}
      {!selectedChoice && (
        <Pressable style={styles.secondaryFullButton} onPress={onQuit}>
          <Text style={styles.secondaryFullButtonText}>Quitter</Text>
        </Pressable>
      )}
    </View>
  );
}

function getKanaPracticeMemo(mode: KanaPracticeMode): { title: string; description: string } {
  if (mode === 'story') {
    return {
      title: 'Mode Histoire',
      description:
        'Tu observes d’abord 5 cartes avec leur image et leur phrase mémo, puis tu réponds juste après. Idéal pour créer une association visuelle forte.',
    };
  }
  if (mode === 'confusion') {
    return {
      title: 'Mode Confusions',
      description:
        'L’app cible les kana qui se ressemblent ou se mélangent souvent. Très utile pour éliminer les erreurs classiques avant l’examen.',
    };
  }
  if (mode === 'matching') {
    return {
      title: 'Mode Association',
      description:
        'Tu joues 5 manches de 5 paires. Clique sur une carte kana puis sur son romaji pour entraîner la reconnaissance rapide.',
    };
  }
  return {
    title: 'Mode Standard',
    description:
      'Questionnaire classique, équilibré et adaptatif. Les cartes faibles reviennent plus souvent, tout en gardant un peu de révision sur ce que tu connais déjà.',
  };
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { styles } from '../appStyles';
import type { WordLookupEntry } from '../models';
import {
  loadImmersionProgress,
  loadImmersionTexts,
  recordImmersionOpened,
  recordImmersionResult,
  type ImmersionProgress,
} from '../services/immersion';
import { JapaneseLookupText, useVocabularyLookupIndex, WordLookupPanel } from './JapaneseLookup';
import { OfflineAudioButton } from './OfflineAudioButton';
import { ExerciseChoiceGrid, ExerciseFeedback } from './ExerciseShell';
import { SegmentButton } from './formControls';
import { Metric, Section } from './sharedUi';
import { DomainProgressHeader } from './DomainProgressHeader';
import { shuffleChoices } from '../services/random';

type DifficultyFilter = 0 | 1 | 2 | 3;
type DurationFilter = 0 | 2 | 3 | 4;

export function ImmersionReaderScreen() {
  const db = useSQLiteContext();
  const entries = useVocabularyLookupIndex(db);
  const texts = useMemo(() => loadImmersionTexts(), []);
  const [selectedId, setSelectedId] = useState(texts[0]?.id ?? '');
  const [openedTextId, setOpenedTextId] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyFilter>(0);
  const [maxDuration, setMaxDuration] = useState<DurationFilter>(0);
  const [showKana, setShowKana] = useState(false);
  const [showRomaji, setShowRomaji] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showGrammar, setShowGrammar] = useState(false);
  const [selectedLookup, setSelectedLookup] = useState<WordLookupEntry | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<Record<string, ImmersionProgress>>({});
  const [seenVocabularyIds, setSeenVocabularyIds] = useState<Set<string>>(new Set());
  const filteredTexts = useMemo(
    () => texts.filter((text) => (!difficulty || text.difficulty === difficulty) && (!maxDuration || text.estimatedMinutes <= maxDuration)),
    [difficulty, maxDuration, texts]
  );
  const selectedText = filteredTexts.find((text) => text.id === selectedId) ?? filteredTexts[0] ?? texts[0];
  const selectedProgress = selectedText ? progress[selectedText.id] : null;
  const questionChoices = useMemo(
    () => Object.fromEntries((selectedText?.questions ?? []).map((question) => [question.prompt, shuffleChoices(question.choices, question.answer)])),
    [selectedText?.id]
  );

  const loadProgress = useCallback(async () => {
    try {
      setProgress(await loadImmersionProgress(db));
      const rows = await db.getAllAsync<{ card_id: string }>(
        'SELECT card_id FROM app_vocabulary_card_state WHERE seen_count > 0 OR favorite = 1 OR review = 1'
      );
      setSeenVocabularyIds(new Set(rows.map((row) => row.card_id)));
    } catch (error) {
      console.error('Unable to load immersion progress', error);
      setProgress({});
    }
  }, [db]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  useEffect(() => {
    if (!selectedText || openedTextId !== selectedText.id) return;
    setSelectedId(selectedText.id);
    recordImmersionOpened(db, selectedText.id)
      .then(loadProgress)
      .catch((error) => console.error('Unable to record immersion open', error));
  }, [db, loadProgress, openedTextId, selectedText?.id]);

  if (!selectedText) return null;

  const textVocabulary = dedupeEntries(entries.filter((entry) => entry.japanese && selectedText.japanese.includes(entry.japanese)));
  const knownVocabularyCount = textVocabulary.filter((entry) => seenVocabularyIds.has(entry.id)).length;
  const knownVocabularyRate = textVocabulary.length ? Math.round((knownVocabularyCount / textVocabulary.length) * 100) : 0;
  const answered = selectedText.questions.filter((question) => answers[question.prompt]).length;
  const correct = selectedText.questions.filter((question) => answers[question.prompt] === question.answer).length;
  const completedCount = Object.values(progress).filter((item) => item.completed).length;

  const selectText = (id: string) => {
    setSelectedId(id);
    setOpenedTextId(id);
    setShowTranslation(false);
    setShowGrammar(false);
    setAnswers({});
    setSelectedLookup(null);
  };

  const answerQuestion = async (prompt: string, choice: string) => {
    if (answers[prompt]) return;
    const nextAnswers = { ...answers, [prompt]: choice };
    setAnswers(nextAnswers);
    const nextCorrect = selectedText.questions.filter((question) => nextAnswers[question.prompt] === question.answer).length;
    const nextAnswered = selectedText.questions.filter((question) => nextAnswers[question.prompt]).length;
    if (nextAnswered >= selectedText.questions.length) {
      await recordImmersionResult(db, selectedText.id, nextCorrect, selectedText.questions.length);
      await loadProgress();
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.pathHero}>
        <View style={styles.pathHeroInk}>
          <Text style={styles.pathHeroKicker}>読 · Lecture N5</Text>
          <Text style={styles.pathHeroTitle}>Immersion guidée</Text>
          <Text style={styles.pathHeroSubtitle}>
            Lis sans dévoiler la traduction, touche un mot inconnu puis vérifie ta compréhension.
          </Text>
        </View>
        <View style={styles.pathHeroBadge}>
          <Text style={styles.pathHeroBadgeValue}>{completedCount}/{texts.length}</Text>
          <Text style={styles.pathHeroBadgeText}>terminés</Text>
        </View>
      </View>

      <DomainProgressHeader
        label="Progression Lecture"
        mastered={completedCount}
        total={texts.length}
        review={Object.values(progress).filter((item) => item.total_count >= 3 && item.correct_count / item.total_count < 0.7).length}
        attempts={Object.values(progress).reduce((sum, item) => sum + item.total_count, 0)}
        recommendation={selectedProgress?.completed ? 'Choisir le prochain texte de difficulté adaptée.' : `Continuer « ${selectedText.title} ».`}
        onContinue={() => selectText(selectedText.id)}
      />

      <Section title="Choisir une lecture">
        <Text style={styles.quizConfigMode}>Difficulté</Text>
        <View style={styles.segmented}>
          {([0, 1, 2, 3] as DifficultyFilter[]).map((value) => (
            <SegmentButton key={value} label={value ? `Niveau ${value}` : 'Tous'} active={difficulty === value} onPress={() => setDifficulty(value)} />
          ))}
        </View>
        <Text style={styles.quizConfigMode}>Durée maximale</Text>
        <View style={styles.segmented}>
          {([0, 2, 3, 4] as DurationFilter[]).map((value) => (
            <SegmentButton key={value} label={value ? `${value} min` : 'Toutes'} active={maxDuration === value} onPress={() => setMaxDuration(value)} />
          ))}
        </View>
        {filteredTexts.length ? (
          <View style={styles.vocabularyThemeGrid}>
            {filteredTexts.map((text) => {
              const itemProgress = progress[text.id];
              const active = selectedText.id === text.id;
              return (
                <Pressable key={text.id} onPress={() => selectText(text.id)} style={[styles.vocabularyThemeCard, active && styles.vocabularyThemeCardActive]}>
                  <View style={styles.vocabularyThemeTextBlock}>
                    <Text style={[styles.vocabularyThemeTitle, active && styles.vocabularyThemeTitleActive]}>{text.title}</Text>
                    <Text style={[styles.vocabularyThemeCount, active && styles.vocabularyThemeCountActive]}>
                      {text.theme} · niveau {text.difficulty} · {text.estimatedMinutes} min · {itemProgress?.completed ? 'terminé' : 'à lire'}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.immersionEmpty}>
            <Text style={styles.quizConfigTitle}>Aucun texte avec ces filtres.</Text>
            <Pressable style={styles.secondaryButton} onPress={() => { setDifficulty(0); setMaxDuration(0); }}>
              <Text style={styles.secondaryButtonText}>Réinitialiser les filtres</Text>
            </Pressable>
          </View>
        )}
      </Section>

      <Modal visible={openedTextId !== null} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setOpenedTextId(null)}>
        <SafeAreaView style={styles.lessonPageScreen}>
          <View style={styles.lessonPageHeader}>
            <Pressable accessibilityRole="button" onPress={() => setOpenedTextId(null)} style={styles.lessonPageBackButton}>
              <Text style={styles.lessonPageBackText}>‹ Lectures</Text>
            </Pressable>
            <Text numberOfLines={1} style={styles.lessonPageHeaderTitle}>{selectedText.title}</Text>
          </View>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.pathSummaryGrid}>
        <Metric label="Difficulté" value={`${selectedText.difficulty}/3`} />
        <Metric label="Durée" value={`${selectedText.estimatedMinutes} min`} />
        <Metric label="Vocabulaire vu" value={`${knownVocabularyRate}%`} />
        <Metric label="Score" value={`${selectedProgress?.correct_count ?? correct}/${selectedText.questions.length}`} />
      </View>

      <Section title={selectedText.title}>
        <View style={styles.immersionReadingCard}>
          <Text style={styles.correctionInsightLabel}>Texte japonais</Text>
          <JapaneseLookupText text={selectedText.japanese} entries={entries} onSelect={setSelectedLookup} style={styles.immersionJapanese} />
          <View style={styles.immersionToggleRow}>
            <Pressable onPress={() => setShowKana((value) => !value)} style={[styles.immersionToggle, showKana && styles.immersionToggleActive]}>
              <Text style={[styles.immersionToggleText, showKana && styles.immersionToggleTextActive]}>かな</Text>
            </Pressable>
            <Pressable onPress={() => setShowRomaji((value) => !value)} style={[styles.immersionToggle, showRomaji && styles.immersionToggleActive]}>
              <Text style={[styles.immersionToggleText, showRomaji && styles.immersionToggleTextActive]}>Romaji</Text>
            </Pressable>
            <OfflineAudioButton text={selectedText.japanese} slow />
          </View>
          {showKana && <JapaneseLookupText text={selectedText.kana} entries={entries} onSelect={setSelectedLookup} style={styles.immersionReading} />}
          {showRomaji && <Text style={styles.immersionRomaji}>{selectedText.romaji}</Text>}
          <WordLookupPanel entry={selectedLookup} onClose={() => setSelectedLookup(null)} />
          <Pressable style={styles.secondaryFullButton} onPress={() => setShowTranslation((value) => !value)}>
            <Text style={styles.secondaryFullButtonText}>{showTranslation ? 'Masquer la traduction' : 'Afficher la traduction'}</Text>
          </Pressable>
          {showTranslation && <Text style={styles.immersionTranslation}>{selectedText.translationFr}</Text>}
        </View>
      </Section>

      <Section title="Points de langue">
        <Pressable style={styles.secondaryFullButton} onPress={() => setShowGrammar((value) => !value)}>
          <Text style={styles.secondaryFullButtonText}>{showGrammar ? 'Masquer les annotations' : 'Analyser la grammaire'}</Text>
        </Pressable>
        {showGrammar && (
          <View style={styles.immersionGrammarList}>
            {selectedText.grammarPoints.map((point) => (
              <View key={point.pattern} style={styles.immersionGrammarRow}>
                <Text style={styles.immersionGrammarPattern}>{point.pattern}</Text>
                <Text style={styles.immersionGrammarText}>{point.explanation}</Text>
              </View>
            ))}
          </View>
        )}
      </Section>

      <Section title="Compréhension">
        <View style={styles.pathRequirementList}>
          {selectedText.questions.map((question, index) => {
            const selected = answers[question.prompt];
            return (
              <View key={question.prompt} style={styles.aptitudeDomainCard}>
                <Text style={styles.pathStageFocus}>{index + 1}. {question.prompt}</Text>
                <ExerciseChoiceGrid
                  choices={questionChoices[question.prompt] ?? question.choices}
                  disabled={!!selected}
                  getState={(choice) => !selected ? 'idle' : choice === question.answer ? 'correct' : choice === selected ? 'wrong' : 'muted'}
                  onChoose={(choice) => answerQuestion(question.prompt, choice)}
                />
                {!!selected && (
                  <ExerciseFeedback
                    correct={selected === question.answer}
                    answer={question.answer}
                    explanation={question.explanation}
                  />
                )}
              </View>
            );
          })}
        </View>
        <Text style={styles.quizConfigText}>Progression : {answered}/{selectedText.questions.length} question(s).</Text>
      </Section>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </ScrollView>
  );
}

function dedupeEntries(entries: WordLookupEntry[]): WordLookupEntry[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    if (seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });
}

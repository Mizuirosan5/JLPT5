import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { styles } from '../appStyles';
import { PHRASE_KITS, PHRASE_KIT_CONSTRUCTIONS, type PhraseKit } from '../data/phraseKits';
import type { WordLookupEntry } from '../models';
import { recordPracticeAttempt } from '../services/practice';
import { CelebrationBurst, SessionSummary, type SessionSummaryError } from './ExerciseShell';
import { JapaneseLookupText, WordLookupPanel, useVocabularyLookupIndex } from './JapaneseLookup';
import { OfflineAudioButton } from './OfflineAudioButton';

type Phase = 'catalog' | 'learn' | 'dialogue' | 'match' | 'build' | 'quiz' | 'summary';

export function PhraseKitsScreen({ onClose }: { onClose: () => void }) {
  const db = useSQLiteContext();
  const lookupEntries = useVocabularyLookupIndex(db);
  const [kit, setKit] = useState<PhraseKit | null>(null);
  const [phase, setPhase] = useState<Phase>('catalog');
  const [selected, setSelected] = useState('');
  const [buildBlocks, setBuildBlocks] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [errors, setErrors] = useState<SessionSummaryError[]>([]);
  const [lookup, setLookup] = useState<WordLookupEntry | null>(null);
  const [startedAt, setStartedAt] = useState(Date.now());
  const [showKana, setShowKana] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);

  const construction = kit ? PHRASE_KIT_CONSTRUCTIONS[kit.id] : [];
  const constructionTarget = construction.join('');
  const constructionChoices = useMemo(() => construction.length > 1 ? [...construction.slice(1), construction[0]] : construction, [construction]);

  const start = (nextKit: PhraseKit) => {
    setKit(nextKit); setPhase('learn'); setSelected(''); setBuildBlocks([]); setScore(0); setErrors([]); setLookup(null); setShowKana(false); setShowTranslation(false); setStartedAt(Date.now());
  };
  const saveAnswer = async (id: string, chosen: string, expected: string) => {
    const correct = chosen === expected;
    if (correct) setScore((value) => value + 1);
    else setErrors((value) => [...value, { id, prompt: id, selected: chosen, expected }]);
    await recordPracticeAttempt(db, { tool: 'phrase_kit', itemId: id, selected: chosen, expected, isCorrect: correct });
  };
  const resetExercise = (next: Phase) => { setSelected(''); setBuildBlocks([]); setLookup(null); setPhase(next); };

  if (!kit || phase === 'catalog') {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable accessibilityLabel="Retour au centre de pratique" onPress={onClose} style={styles.secondaryFullButton}><Text style={styles.secondaryFullButtonText}>Retour aux exercices</Text></Pressable>
        <View style={styles.phraseKitHero}><Text style={styles.grammarKicker}>会話 · SITUATIONS</Text><Text style={styles.grammarTitle}>Kits de phrases</Text><Text style={styles.grammarSubtitle}>Douze mini-parcours N5 complets, utilisables hors ligne.</Text></View>
        <View style={styles.phraseKitGrid}>
          {PHRASE_KITS.map((item) => (
            <Pressable key={item.id} onPress={() => start(item)} style={styles.phraseKitCard} accessibilityRole="button">
              <Text style={styles.phraseKitIcon}>{item.icon}</Text><View style={styles.phraseKitCardCopy}><Text style={styles.phraseKitTitle}>{item.title}</Text><Text style={styles.phraseKitObjective}>{item.objective}</Text><Text style={styles.phraseKitMeta}>{item.phrases.length} phrases · 4 activités</Text></View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    );
  }

  if (phase === 'summary') {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <SessionSummary correct={score} total={3} xp={score * 15} durationLabel={`${Math.max(1, Math.round((Date.now() - startedAt) / 60000))} min`} bestStreak={score} errors={errors} onRestart={() => start(kit)} onRetryErrors={() => resetExercise('match')} onContinue={() => { setKit(null); setPhase('catalog'); }} />
      </ScrollView>
    );
  }

  const phaseNumber = phase === 'learn' ? 1 : phase === 'dialogue' ? 2 : phase === 'match' ? 3 : phase === 'build' ? 4 : 5;
  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <CelebrationBurst visible={phase === 'quiz' && selected === kit.phrases[0].japanese && score >= 2} streak={3} />
      <View style={styles.practiceToolHeader}>
        <Pressable accessibilityLabel="Retour aux kits" onPress={() => { setKit(null); setPhase('catalog'); }} style={styles.practiceInlineBack}><Text style={styles.practiceInlineBackText}>‹</Text></Pressable>
        <View style={styles.practiceToolHeaderText}><Text style={styles.grammarKicker}>{kit.icon} · {phaseNumber}/5</Text><Text style={styles.practiceScreenTitle}>{kit.title}</Text></View>
      </View>
      <View style={styles.practiceProgressTrack}><View style={[styles.practiceProgressFill, { width: `${phaseNumber * 20}%` }]} /></View>

      {(phase === 'learn' || phase === 'dialogue') && (
        <View style={styles.segmented}>
          <Pressable onPress={() => setShowKana((value) => !value)} style={[styles.segmentButton, showKana && styles.segmentButtonActive]}>
            <Text style={[styles.segmentText, showKana && styles.segmentTextActive]}>{showKana ? 'Masquer kana' : 'Afficher kana'}</Text>
          </Pressable>
          <Pressable onPress={() => setShowTranslation((value) => !value)} style={[styles.segmentButton, showTranslation && styles.segmentButtonActive]}>
            <Text style={[styles.segmentText, showTranslation && styles.segmentTextActive]}>{showTranslation ? 'Masquer français' : 'Afficher français'}</Text>
          </Pressable>
        </View>
      )}

      {phase === 'learn' && <>
        <Text style={styles.phraseKitObjectiveLead}>{kit.objective}</Text>
        <View style={styles.practiceWarning}><Text style={styles.practiceWarningLabel}>Contexte</Text><Text style={styles.practiceWarningText}>{kit.contextNote}</Text></View>
        <View style={styles.phraseKitPhraseList}>{kit.phrases.map((phrase) => <View key={phrase.id} style={styles.phraseKitPhrase}><View style={styles.phraseKitPhraseCopy}><JapaneseLookupText text={phrase.japanese} entries={lookupEntries} onSelect={setLookup} style={styles.practiceReferenceJapanese} />{showKana && <Text style={styles.practiceReading}>{phrase.kana}</Text>}{showTranslation && <Text style={styles.practicePanelText}>{phrase.french}</Text>}</View><OfflineAudioButton compact text={phrase.japanese} label="Écouter" slow /></View>)}</View>
        <Pressable style={styles.primaryButton} onPress={() => setPhase('dialogue')}><Text style={styles.primaryButtonText}>Voir le dialogue</Text></Pressable>
      </>}

      {phase === 'dialogue' && <>
        <Text style={styles.practicePrompt}>Dialogue modèle</Text>
        <View style={styles.phraseKitDialogue}>{kit.dialogue.map((line, index) => { const phrase = kit.phrases.find((item) => item.id === line.phraseId)!; return <View key={`${line.phraseId}-${index}`} style={styles.phraseKitDialogueLine}><Text style={styles.phraseKitSpeaker}>{line.speaker}</Text><View style={styles.phraseKitPhraseCopy}><JapaneseLookupText text={phrase.japanese} entries={lookupEntries} onSelect={setLookup} style={styles.practiceReferenceJapanese} />{showKana && <Text style={styles.practiceReading}>{phrase.kana}</Text>}{showTranslation && <Text style={styles.practicePanelText}>{phrase.french}</Text>}</View><OfflineAudioButton compact text={phrase.japanese} label="Écouter" /></View>; })}</View>
        <Pressable style={styles.primaryButton} onPress={() => setPhase('match')}><Text style={styles.primaryButtonText}>Commencer les exercices</Text></Pressable>
      </>}

      {phase === 'match' && <ExerciseBlock title="Association" prompt={kit.phrases[2].japanese}>
        {kit.phrases.slice(1, 4).map((phrase) => <AnswerButton key={phrase.id} label={phrase.french} selected={selected} expected={kit.phrases[2].french} onPress={async () => { if (selected) return; setSelected(phrase.french); await saveAnswer(`${kit.id}:match`, phrase.french, kit.phrases[2].french); }} />)}
        {!!selected && <Correction phrase={kit.phrases[2]} entries={lookupEntries} onLookup={setLookup} onNext={() => resetExercise('build')} />}
      </ExerciseBlock>}

      {phase === 'build' && <ExerciseBlock title="Construction" prompt={kit.phrases.find((item) => item.id === kit.constructionPhraseId)?.french ?? 'Construis la phrase.'}>
        <View style={styles.practiceSentenceTarget}>{buildBlocks.length ? buildBlocks.map((block, index) => <Pressable key={`${block}-${index}`} style={styles.practiceBlockSelected} onPress={() => !selected && setBuildBlocks((items) => items.filter((_, itemIndex) => itemIndex !== index))}><Text style={styles.practiceBlockTextSelected}>{block}</Text></Pressable>) : <Text style={styles.practiceSentencePlaceholder}>Compose la phrase</Text>}</View>
        <View style={styles.practiceBlockPool}>{constructionChoices.filter((block) => !buildBlocks.includes(block)).map((block) => <Pressable key={block} style={styles.practiceBlock} onPress={() => setBuildBlocks((items) => [...items, block])}><Text style={styles.practiceBlockText}>{block}</Text></Pressable>)}</View>
        {!selected && buildBlocks.length === construction.length && <Pressable style={styles.primaryButton} onPress={async () => { const answer = buildBlocks.join(''); setSelected(answer); await saveAnswer(`${kit.id}:build`, answer, constructionTarget); }}><Text style={styles.primaryButtonText}>Valider</Text></Pressable>}
        {!!selected && <Correction phrase={kit.phrases.find((item) => item.id === kit.constructionPhraseId)!} entries={lookupEntries} onLookup={setLookup} onNext={() => resetExercise('quiz')} />}
      </ExerciseBlock>}

      {phase === 'quiz' && <ExerciseBlock title="Mini-quiz final" prompt={kit.phrases[0].french}>
        {[kit.phrases[6], kit.phrases[0], kit.phrases[7]].map((phrase) => <AnswerButton key={phrase.id} label={phrase.japanese} selected={selected} expected={kit.phrases[0].japanese} onPress={async () => { if (selected) return; setSelected(phrase.japanese); await saveAnswer(`${kit.id}:quiz`, phrase.japanese, kit.phrases[0].japanese); }} />)}
        {!!selected && <Correction phrase={kit.phrases[0]} entries={lookupEntries} onLookup={setLookup} onNext={() => setPhase('summary')} nextLabel="Voir le bilan" />}
      </ExerciseBlock>}
      <WordLookupPanel entry={lookup} onClose={() => setLookup(null)} />
    </ScrollView>
  );
}

function ExerciseBlock({ title, prompt, children }: { title: string; prompt: string; children: React.ReactNode }) {
  return <View style={styles.practiceAnswerPanel}><Text style={styles.practicePanelLabel}>{title}</Text><Text style={styles.practicePrompt}>{prompt}</Text>{children}</View>;
}

function AnswerButton({ label, selected, expected, onPress }: { label: string; selected: string; expected: string; onPress: () => void }) {
  return <Pressable disabled={!!selected} onPress={onPress} style={[styles.practiceChoice, !!selected && label === expected && styles.practiceAnswerCorrect, selected === label && label !== expected && styles.practiceAnswerWrong]}><Text style={styles.practiceChoiceText}>{label}</Text></Pressable>;
}

function Correction({ phrase, entries, onLookup, onNext, nextLabel = 'Continuer' }: { phrase: PhraseKit['phrases'][number]; entries: WordLookupEntry[]; onLookup: (entry: WordLookupEntry) => void; onNext: () => void; nextLabel?: string }) {
  return <View style={styles.phraseKitCorrection}><Text style={styles.practicePanelLabel}>Correction</Text><JapaneseLookupText text={phrase.japanese} entries={entries} onSelect={onLookup} style={styles.practiceReferenceJapanese} /><Text style={styles.practiceReading}>{phrase.kana}</Text><Text style={styles.practicePanelText}>{phrase.french}</Text><OfflineAudioButton compact text={phrase.japanese} label="Écouter" /><Pressable style={styles.primaryButton} onPress={onNext}><Text style={styles.primaryButtonText}>{nextLabel}</Text></Pressable></View>;
}

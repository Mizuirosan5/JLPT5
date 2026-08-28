import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { styles } from '../appStyles';
import type { Screen, WordLookupEntry } from '../models';
import {
  BASIC_KANA_SPRINT,
  CONJUGATION_FORM_LABELS,
  CONJUGATION_PRACTICE_ITEMS,
  GRAMMAR_REFERENCE_SHEETS,
  RADICAL_PRACTICE_ITEMS,
  SENTENCE_PRACTICE_ITEMS,
  type ConjugationFormId,
  type PracticeToolId,
} from '../data/practiceCatalog';
import { normalizeAnswer } from '../services/text';
import { shuffleChoices } from '../services/random';
import { recordPracticeAttempt, toJapaneseQuantity, type JapaneseQuantityKind } from '../services/practice';
import { OfflineAudioButton } from './OfflineAudioButton';
import { SegmentButton } from './formControls';
import { PhraseKitsScreen } from './PhraseKitsScreen';
import { DomainProgressHeader } from './DomainProgressHeader';
import { JapaneseLookupText, useVocabularyLookupIndex, WordLookupPanel } from './JapaneseLookup';

type PracticeView = 'hub' | PracticeToolId;

const TOOLS: Array<{ id: PracticeToolId; icon: string; title: string; subtitle: string; tag?: string }> = [
  { id: 'radicals', icon: '部', title: 'Radicaux', subtitle: 'Relier les composants aux kanji N5.', tag: 'Kanji' },
  { id: 'conjugation', icon: '活', title: 'Conjugaison', subtitle: 'Produire les formes japonaises essentielles.', tag: 'Recommande' },
  { id: 'sentences', icon: '組', title: 'Construire une phrase', subtitle: 'Remettre les blocs dans un ordre naturel.' },
  { id: 'numbers', icon: '数', title: 'Nombres', subtitle: 'Lire et produire nombres, prix et quantites.' },
  { id: 'kana_sprint', icon: '速', title: 'Sprint kana', subtitle: 'Consolider la reconnaissance apres la precision.' },
  { id: 'reference', icon: '比', title: 'Fiches comparatives', subtitle: 'Distinguer les points souvent confondus.' },
  { id: 'kits', icon: '会', title: 'Kits de phrases', subtitle: 'Douze situations guidées avec production et quiz.', tag: 'N5 pratique' },
];

export function PracticeHubScreen({
  backSignal = 0,
  onBackStateChange,
  onNavigate,
}: {
  backSignal?: number;
  onBackStateChange?: (canGoBack: boolean) => void;
  onNavigate: (screen: Screen) => void;
}) {
  const db = useSQLiteContext();
  const [view, setView] = useState<PracticeView>('hub');
  const [recommendedTool, setRecommendedTool] = useState<PracticeToolId>('conjugation');
  const [practiceSummary, setPracticeSummary] = useState({ attempts: 0, correct: 0 });

  useEffect(() => onBackStateChange?.(view !== 'hub'), [onBackStateChange, view]);
  useEffect(() => {
    if (backSignal > 0) setView('hub');
  }, [backSignal]);
  useEffect(() => {
    db.getAllAsync<{ source_mode: string; attempts: number; correct: number; rate: number }>(`
      SELECT source_mode, COUNT(*) AS attempts, SUM(is_correct) AS correct,
             ROUND(SUM(is_correct) * 100.0 / COUNT(*)) AS rate
      FROM app_question_attempt_local
      WHERE source_mode LIKE 'practice_%'
      GROUP BY source_mode
      ORDER BY rate ASC, attempts DESC
    `).then((rows) => {
      setPracticeSummary({
        attempts: rows.reduce((sum, row) => sum + row.attempts, 0),
        correct: rows.reduce((sum, row) => sum + row.correct, 0),
      });
      const mapped = sourceModeToTool(rows[0]?.source_mode);
      if (mapped) setRecommendedTool(mapped);
    }).catch((error) => console.error('Unable to load practice recommendations', error));
  }, [db, view]);

  if (view === 'radicals') return <RadicalPractice onClose={() => setView('hub')} />;
  if (view === 'conjugation') return <ConjugationPractice onClose={() => setView('hub')} />;
  if (view === 'sentences') return <SentencePractice onClose={() => setView('hub')} />;
  if (view === 'numbers') return <NumberPractice onClose={() => setView('hub')} />;
  if (view === 'kana_sprint') return <KanaSprint onClose={() => setView('hub')} />;
  if (view === 'reference') return <ReferenceSheets onClose={() => setView('hub')} />;
  if (view === 'kits') return <PhraseKitsScreen onClose={() => setView('hub')} />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.practiceHero}>
        <Text style={styles.grammarKicker}>練習 · PRATIQUE</Text>
        <Text style={styles.grammarTitle}>Choisir un entraînement</Text>
        <Text style={styles.grammarSubtitle}>Travaille une compétence précise ou reprends la recommandation du jour.</Text>
      </View>

      <DomainProgressHeader
        label="Progression Pratique"
        mastered={practiceSummary.correct}
        total={practiceSummary.attempts}
        review={practiceSummary.attempts >= 3 ? Math.max(0, practiceSummary.attempts - practiceSummary.correct) : 0}
        attempts={practiceSummary.attempts}
        recommendation={`Priorité actuelle : ${TOOLS.find((tool) => tool.id === recommendedTool)?.title ?? 'Conjugaison'}.`}
        onContinue={() => setView(recommendedTool)}
      />

      <View style={styles.practiceToolGrid}>
        {TOOLS.map((tool) => (
          <Pressable
            accessibilityRole="button"
            key={tool.id}
            onPress={() => setView(tool.id)}
            style={({ pressed }) => [styles.practiceToolCard, pressed && styles.controlPressed]}
          >
            <View style={styles.practiceToolTopRow}>
              <Text style={styles.practiceToolIcon}>{tool.icon}</Text>
              {(tool.id === recommendedTool || tool.tag) && (
                <Text style={styles.practiceToolTag}>{tool.id === recommendedTool ? 'Recommandé' : tool.tag}</Text>
              )}
            </View>
            <Text style={styles.practiceToolTitle}>{tool.title}</Text>
            <Text style={styles.practiceToolSubtitle}>{tool.subtitle}</Text>
            <Text style={styles.practiceToolArrow}>›</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.practiceMasteryBand}>
        <View style={styles.practiceMasteryText}>
          <Text style={styles.practiceMasteryKicker}>進捗 · MAÎTRISE</Text>
          <Text style={styles.practiceMasteryTitle}>
            {practiceSummary.attempts
              ? `${practiceSummary.correct}/${practiceSummary.attempts} réponses justes · priorité : ${TOOLS.find((tool) => tool.id === recommendedTool)?.title}`
              : 'Commence une activité pour obtenir une recommandation personnalisée.'}
          </Text>
        </View>
        <Pressable onPress={() => onNavigate('dashboard')} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Ouvrir</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function sourceModeToTool(sourceMode?: string): PracticeToolId | null {
  if (sourceMode === 'practice_conjugation') return 'conjugation';
  if (sourceMode === 'practice_sentences') return 'sentences';
  if (sourceMode === 'practice_numbers') return 'numbers';
  if (sourceMode === 'practice_kana_sprint') return 'kana_sprint';
  return null;
}

function ToolHeader({ title, kicker, onClose }: { title: string; kicker: string; onClose: () => void }) {
  return (
    <View style={styles.practiceToolHeader}>
      <Pressable accessibilityLabel="Retour au centre de pratique" onPress={onClose} style={styles.practiceInlineBack}>
        <Text style={styles.practiceInlineBackText}>‹</Text>
      </Pressable>
      <View style={styles.practiceToolHeaderText}>
        <Text style={styles.grammarKicker}>{kicker}</Text>
        <Text style={styles.practiceScreenTitle}>{title}</Text>
      </View>
    </View>
  );
}

function RadicalPractice({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const current = RADICAL_PRACTICE_ITEMS[index];
  const [revealed, setRevealed] = useState(false);

  const next = () => {
    setIndex((value) => (value + 1) % RADICAL_PRACTICE_ITEMS.length);
    setRevealed(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ToolHeader kicker="部首 · KANJI" title="Reconnaître les radicaux" onClose={onClose} />
      <View style={styles.practiceProgressTrack}><View style={[styles.practiceProgressFill, { width: `${((index + 1) / RADICAL_PRACTICE_ITEMS.length) * 100}%` }]} /></View>
      <Text style={styles.practicePrompt}>Quel sens évoque ce composant ?</Text>
      <Text style={styles.practiceLargeJapanese}>{current.radical}</Text>
      {!revealed ? (
        <Pressable onPress={() => setRevealed(true)} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Révéler</Text></Pressable>
      ) : (
        <View style={styles.practiceAnswerPanel}>
          <Text style={styles.practiceAnswerTitle}>{current.meaning}</Text>
          <Text style={styles.practiceReading}>{current.name}</Text>
          <Text style={styles.practicePanelLabel}>Kanji associés</Text>
          <View style={styles.practiceKanjiRow}>{current.kanji.map((kanji) => <Text key={kanji} style={styles.practiceRelatedKanji}>{kanji}</Text>)}</View>
          <Pressable onPress={next} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Suivant</Text></Pressable>
        </View>
      )}
    </ScrollView>
  );
}

function ConjugationPractice({ onClose }: { onClose: () => void }) {
  const db = useSQLiteContext();
  const [verbIndex, setVerbIndex] = useState(0);
  const [form, setForm] = useState<ConjugationFormId>('polite');
  const [answer, setAnswer] = useState('');
  const [checked, setChecked] = useState(false);
  const verb = CONJUGATION_PRACTICE_ITEMS[verbIndex];
  const correct = normalizeAnswer(answer) === normalizeAnswer(verb.forms[form]);

  const next = () => {
    setVerbIndex((value) => (value + 1) % CONJUGATION_PRACTICE_ITEMS.length);
    setAnswer('');
    setChecked(false);
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <ToolHeader kicker="活用 · PRODUCTION" title="Conjugaison guidée" onClose={onClose} />
      <View style={styles.practiceSegmentRow}>
        {(Object.keys(CONJUGATION_FORM_LABELS) as ConjugationFormId[]).map((id) => (
          <Pressable key={id} onPress={() => { setForm(id); setAnswer(''); setChecked(false); }} style={[styles.practiceSegment, form === id && styles.practiceSegmentActive]}>
            <Text style={[styles.practiceSegmentText, form === id && styles.practiceSegmentTextActive]}>{id === 'polite' ? 'ます' : id === 'negative' ? 'ない' : id === 'past' ? 'た' : 'て'}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.practicePrompt}>Mets ce verbe à la {CONJUGATION_FORM_LABELS[form]}.</Text>
      <Text style={styles.practiceLargeJapanese}>{verb.dictionary}</Text>
      <Text style={styles.practiceReading}>{verb.reading} · {verb.meaning}</Text>
      <TextInput
        accessibilityLabel="Réponse en japonais"
        autoCapitalize="none"
        onChangeText={(value) => { setAnswer(value); setChecked(false); }}
        placeholder="Écris la forme japonaise"
        style={styles.practiceInput}
        value={answer}
      />
      <Pressable disabled={!answer.trim() || checked} onPress={() => { setChecked(true); recordPracticeAttempt(db, { tool: 'conjugation', itemId: `${verb.reading}:${form}`, selected: answer, expected: verb.forms[form], isCorrect: correct }).catch((error) => console.error('Unable to save conjugation attempt', error)); }} style={[styles.primaryButton, (!answer.trim() || checked) && styles.primaryButtonDisabled]}>
        <Text style={styles.primaryButtonText}>Vérifier</Text>
      </Pressable>
      {checked && (
        <View style={[styles.practiceAnswerPanel, correct ? styles.practiceAnswerCorrect : styles.practiceAnswerWrong]}>
          <Text style={styles.practiceAnswerTitle}>{correct ? 'Correct' : 'À revoir'}</Text>
          <Text style={styles.practiceAnswerJapanese}>{verb.forms[form]}</Text>
          <Text style={styles.practicePanelText}>Groupe : {verb.group === 'godan' ? 'godan' : verb.group === 'ichidan' ? 'ichidan' : 'irrégulier'}.</Text>
          <Pressable onPress={next} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Verbe suivant</Text></Pressable>
        </View>
      )}
    </ScrollView>
  );
}

function SentencePractice({ onClose }: { onClose: () => void }) {
  const db = useSQLiteContext();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showReading, setShowReading] = useState(false);
  const item = SENTENCE_PRACTICE_ITEMS[index];
  const remaining = item.blocks.filter((block) => !selected.includes(block));
  const correct = selected.join('|') === item.answer.join('|');

  const next = () => {
    setIndex((value) => (value + 1) % SENTENCE_PRACTICE_ITEMS.length);
    setSelected([]);
    setChecked(false);
    setShowHint(false);
    setShowReading(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ToolHeader kicker="文 · ORDRE DES MOTS" title="Construire une phrase" onClose={onClose} />
      <Text style={styles.practicePrompt}>{item.french}</Text>
      <View style={styles.practiceSentenceTarget}>
        {selected.length === 0 && <Text style={styles.practiceSentencePlaceholder}>Compose la phrase</Text>}
        {selected.map((block) => <Pressable key={block} onPress={() => { setSelected((values) => values.filter((value) => value !== block)); setChecked(false); }} style={styles.practiceBlockSelected}><Text style={styles.practiceBlockTextSelected}>{block}</Text></Pressable>)}
      </View>
      <View style={styles.practiceBlockPool}>
        {remaining.map((block) => <Pressable key={block} onPress={() => { setSelected((values) => [...values, block]); setChecked(false); }} style={styles.practiceBlock}><Text style={styles.practiceBlockText}>{block}</Text></Pressable>)}
      </View>
      {showHint && <Text style={styles.practiceHint}>Premier bloc conseillé : {item.answer[0]}</Text>}
      <View style={styles.practiceActionRow}>
        <Pressable disabled={selected.length === 0} onPress={() => { setSelected([]); setChecked(false); }} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Effacer</Text></Pressable>
        <Pressable onPress={() => setShowHint(true)} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Indice</Text></Pressable>
        <Pressable disabled={remaining.length > 0 || checked} onPress={() => { setChecked(true); recordPracticeAttempt(db, { tool: 'sentences', itemId: item.id, selected: selected.join(' '), expected: item.answer.join(' '), isCorrect: correct }).catch((error) => console.error('Unable to save sentence attempt', error)); }} style={[styles.primaryButton, (remaining.length > 0 || checked) && styles.primaryButtonDisabled]}><Text style={styles.primaryButtonText}>Vérifier</Text></Pressable>
      </View>
      {checked && (
        <View style={[styles.practiceAnswerPanel, correct ? styles.practiceAnswerCorrect : styles.practiceAnswerWrong]}>
          <Text style={styles.practiceAnswerTitle}>{correct ? 'Ordre correct' : 'Ordre à corriger'}</Text>
          <Text style={styles.practiceAnswerJapanese}>{item.answer.join(' ')}</Text>
          <Pressable onPress={() => setShowReading((value) => !value)} style={styles.todayTextAction}><Text style={styles.todayTextActionText}>{showReading ? 'Masquer la lecture' : 'Afficher la lecture'}</Text></Pressable>
          {showReading && <Text style={styles.practiceReading}>{item.reading}</Text>}
          <OfflineAudioButton compact text={item.answer.join(' ')} label="Écouter" slow />
          <Text style={styles.practicePanelText}>{item.explanation}</Text>
          <Pressable onPress={next} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Phrase suivante</Text></Pressable>
        </View>
      )}
    </ScrollView>
  );
}

function NumberPractice({ onClose }: { onClose: () => void }) {
  const db = useSQLiteContext();
  const [number, setNumber] = useState(24);
  const [kind, setKind] = useState<JapaneseQuantityKind>('number');
  const [direction, setDirection] = useState<'to_japanese' | 'to_number'>('to_japanese');
  const [answer, setAnswer] = useState('');
  const [checked, setChecked] = useState(false);
  const expectedJapanese = toJapaneseQuantity(number, kind);
  const expected = direction === 'to_japanese' ? expectedJapanese : `${number}`;
  const correct = normalizeAnswer(answer) === normalizeAnswer(expected);

  const next = () => {
    setNumber((value) => nextQuantityValue(value, kind));
    setAnswer('');
    setChecked(false);
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <ToolHeader kicker="数 · NOMBRES" title="Écrire un nombre" onClose={onClose} />
      <View style={styles.segmented}>
        <SegmentButton label="Nombre" active={kind === 'number'} onPress={() => resetQuantityMode('number', setKind, setNumber, setAnswer, setChecked)} />
        <SegmentButton label="Prix" active={kind === 'price'} onPress={() => resetQuantityMode('price', setKind, setNumber, setAnswer, setChecked)} />
        <SegmentButton label="Heure" active={kind === 'hour'} onPress={() => resetQuantityMode('hour', setKind, setNumber, setAnswer, setChecked)} />
      </View>
      <View style={styles.segmented}>
        <SegmentButton label="Personnes" active={kind === 'people'} onPress={() => resetQuantityMode('people', setKind, setNumber, setAnswer, setChecked)} />
        <SegmentButton label="Objets" active={kind === 'generic'} onPress={() => resetQuantityMode('generic', setKind, setNumber, setAnswer, setChecked)} />
      </View>
      <View style={styles.segmented}>
        <SegmentButton label="Vers japonais" active={direction === 'to_japanese'} onPress={() => { setDirection('to_japanese'); setAnswer(''); setChecked(false); }} />
        <SegmentButton label="Vers nombre" active={direction === 'to_number'} onPress={() => { setDirection('to_number'); setAnswer(''); setChecked(false); }} />
      </View>
      <Text style={styles.practicePrompt}>{direction === 'to_japanese' ? 'Écris cette quantité en japonais.' : 'Écris cette quantité en chiffres.'}</Text>
      <Text style={styles.practiceLargeNumber}>{direction === 'to_japanese' ? formatQuantityPrompt(number, kind) : expectedJapanese}</Text>
      <TextInput autoCapitalize="none" inputMode={direction === 'to_number' ? 'numeric' : 'text'} onChangeText={(value) => { setAnswer(value); setChecked(false); }} placeholder={direction === 'to_japanese' ? 'Réponse en hiragana' : 'Réponse en chiffres'} style={styles.practiceInput} value={answer} />
      <Pressable disabled={!answer.trim() || checked} onPress={() => { setChecked(true); recordPracticeAttempt(db, { tool: 'numbers', itemId: `${number}`, selected: answer, expected, isCorrect: correct }).catch((error) => console.error('Unable to save number attempt', error)); }} style={[styles.primaryButton, (!answer.trim() || checked) && styles.primaryButtonDisabled]}><Text style={styles.primaryButtonText}>Vérifier</Text></Pressable>
      {checked && <View style={[styles.practiceAnswerPanel, correct ? styles.practiceAnswerCorrect : styles.practiceAnswerWrong]}><Text style={styles.practiceAnswerTitle}>{correct ? 'Correct' : 'À revoir'}</Text><Text style={styles.practiceAnswerJapanese}>{expected}</Text><Pressable onPress={next} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Nombre suivant</Text></Pressable></View>}
    </ScrollView>
  );
}

function nextQuantityValue(value: number, kind: JapaneseQuantityKind): number {
  const maximum = kind === 'number' ? 9999 : kind === 'price' ? 9999 : kind === 'hour' ? 12 : 10;
  return ((value * 37 + 53) % maximum) + 1;
}

function formatQuantityPrompt(value: number, kind: JapaneseQuantityKind): string {
  if (kind === 'price') return `${value} ¥`;
  if (kind === 'hour') return `${value} h`;
  if (kind === 'people') return `${value} personne${value > 1 ? 's' : ''}`;
  if (kind === 'generic') return `${value} objet${value > 1 ? 's' : ''}`;
  return `${value}`;
}

function resetQuantityMode(
  kind: JapaneseQuantityKind,
  setKind: (kind: JapaneseQuantityKind) => void,
  setNumber: (value: number) => void,
  setAnswer: (value: string) => void,
  setChecked: (value: boolean) => void,
) {
  setKind(kind);
  setNumber(kind === 'number' || kind === 'price' ? 24 : 3);
  setAnswer('');
  setChecked(false);
}

function KanaSprint({ onClose }: { onClose: () => void }) {
  const db = useSQLiteContext();
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(30);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const current = BASIC_KANA_SPRINT[index % BASIC_KANA_SPRINT.length];
  const choices = useMemo(() => {
    const offsets = [0, 3, 7, 11];
    const answers = offsets.map((offset) => BASIC_KANA_SPRINT[(index + offset) % BASIC_KANA_SPRINT.length][1]);
    return shuffleChoices(answers, current[1]);
  }, [index]);

  useEffect(() => {
    if (!running || seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [running, seconds]);

  useEffect(() => {
    if (seconds === 0) setRunning(false);
  }, [seconds]);

  const start = (duration: number) => {
    setSeconds(duration);
    setScore(0);
    setIndex(0);
    setRunning(true);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ToolHeader kicker="速 · FLUIDITÉ" title="Sprint kana" onClose={onClose} />
      {!running && seconds > 0 ? (
        <>
          <Text style={styles.practicePrompt}>Choisis une durée.</Text>
          <View style={styles.practiceDurationRow}>{[15, 30, 60, 120].map((duration) => <Pressable key={duration} onPress={() => start(duration)} style={styles.practiceDurationButton}><Text style={styles.practiceDurationValue}>{duration}</Text><Text style={styles.practiceDurationUnit}>sec</Text></Pressable>)}</View>
        </>
      ) : seconds === 0 ? (
        <View style={styles.practiceAnswerPanel}><Text style={styles.practiceAnswerTitle}>Sprint terminé</Text><Text style={styles.practiceSprintScore}>{score}</Text><Text style={styles.practicePanelText}>kana reconnus</Text><Pressable onPress={() => start(30)} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Recommencer</Text></Pressable></View>
      ) : (
        <>
          <View style={styles.practiceSprintMeta}><Text style={styles.practiceSprintTimer}>{seconds}s</Text><Text style={styles.practiceSprintMetaScore}>{score} correct</Text></View>
          <Text style={styles.practiceLargeJapanese}>{current[0]}</Text>
          <View style={styles.practiceChoiceGrid}>{choices.map((choice) => <Pressable key={choice} onPress={() => { const isCorrect = choice === current[1]; if (isCorrect) setScore((value) => value + 1); recordPracticeAttempt(db, { tool: 'kana_sprint', itemId: current[0], selected: choice, expected: current[1], isCorrect }).catch((error) => console.error('Unable to save kana sprint attempt', error)); setIndex((value) => value + 1); }} style={styles.practiceChoice}><Text style={styles.practiceChoiceText}>{choice}</Text></Pressable>)}</View>
        </>
      )}
    </ScrollView>
  );
}

function ReferenceSheets({ onClose }: { onClose: () => void }) {
  const db = useSQLiteContext();
  const lookupEntries = useVocabularyLookupIndex(db);
  const [selectedLookup, setSelectedLookup] = useState<WordLookupEntry | null>(null);
  const [selectedId, setSelectedId] = useState(GRAMMAR_REFERENCE_SHEETS[0].id);
  const [quizAnswer, setQuizAnswer] = useState('');
  const sheet = GRAMMAR_REFERENCE_SHEETS.find((item) => item.id === selectedId) ?? GRAMMAR_REFERENCE_SHEETS[0];
  const quizChoices = useMemo(() => shuffleChoices(sheet.quiz.choices, sheet.quiz.answer), [sheet.id]);
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ToolHeader kicker="比 · COMPARAISONS" title="Fiches pratiques" onClose={onClose} />
      <View style={styles.practiceReferenceTabs}>{GRAMMAR_REFERENCE_SHEETS.map((item) => <Pressable key={item.id} onPress={() => { setSelectedId(item.id); setQuizAnswer(''); }} style={[styles.practiceReferenceTab, item.id === selectedId && styles.practiceReferenceTabActive]}><Text style={[styles.practiceReferenceTabText, item.id === selectedId && styles.practiceReferenceTabTextActive]}>{item.title}</Text></Pressable>)}</View>
      <Text style={styles.practiceReferenceTitle}>{sheet.title}</Text>
      <Text style={styles.practiceReferenceDecision}>{sheet.decision}</Text>
      {sheet.examples.map((example) => <View key={example.japanese} style={styles.practiceReferenceExample}><JapaneseLookupText text={example.japanese} entries={lookupEntries} onSelect={setSelectedLookup} style={styles.practiceReferenceJapanese} /><Text style={styles.practiceReading}>{example.reading}</Text><Text style={styles.practicePanelText}>{example.french}</Text></View>)}
      <View style={styles.practiceWarning}><Text style={styles.practiceWarningLabel}>À retenir</Text><Text style={styles.practiceWarningText}>{sheet.warning}</Text></View>
      <View style={styles.practiceAnswerPanel}>
        <Text style={styles.practicePanelLabel}>Mini-quiz</Text>
        <Text style={styles.practicePrompt}>{sheet.quiz.prompt}</Text>
        <View style={styles.practiceChoiceGrid}>{quizChoices.map((choice) => <Pressable disabled={!!quizAnswer} key={choice} onPress={() => setQuizAnswer(choice)} style={[styles.practiceChoice, quizAnswer && choice === sheet.quiz.answer && styles.practiceAnswerCorrect, quizAnswer === choice && choice !== sheet.quiz.answer && styles.practiceAnswerWrong]}><Text style={styles.practiceChoiceText}>{choice}</Text></Pressable>)}</View>
        {!!quizAnswer && <Text style={styles.practicePanelText}>{quizAnswer === sheet.quiz.answer ? 'Correct. ' : `Réponse : ${sheet.quiz.answer}. `}{sheet.quiz.explanation}</Text>}
      </View>
      <WordLookupPanel entry={selectedLookup} onClose={() => setSelectedLookup(null)} />
    </ScrollView>
  );
}

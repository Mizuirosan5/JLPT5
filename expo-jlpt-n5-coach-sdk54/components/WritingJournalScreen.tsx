import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { styles } from '../appStyles';
import type { VocabularyItem, WordLookupEntry } from '../models';
import { loadVocabularyItems } from '../services/vocabulary';
import {
  analyzeWritingText,
  getDailyWritingPrompt,
  loadWritingJournalEntries,
  saveWritingJournalEntry,
  type WritingAnalysis,
  type WritingJournalEntry,
} from '../services/writingJournal';
import { EmptyState, LoadingView, Section } from './sharedUi';
import { JapaneseLookupText, useVocabularyLookupIndex, WordLookupPanel } from './JapaneseLookup';

export function WritingJournalScreen() {
  const db = useSQLiteContext();
  const lookupEntries = useVocabularyLookupIndex(db);
  const prompt = useMemo(() => getDailyWritingPrompt(), []);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [entries, setEntries] = useState<WritingJournalEntry[]>([]);
  const [analysis, setAnalysis] = useState<WritingAnalysis | null>(null);
  const [savedMessage, setSavedMessage] = useState('');
  const [selectedLookup, setSelectedLookup] = useState<WordLookupEntry | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [vocabularyResult, journalEntries] = await Promise.all([
        loadVocabularyItems(db),
        loadWritingJournalEntries(db),
      ]);
      setVocabulary(vocabularyResult.rows);
      setEntries(journalEntries);
    } catch (error) {
      console.error('Unable to load writing journal', error);
      setVocabulary([]);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    load();
  }, [load]);

  const runAnalysis = () => {
    const nextAnalysis = analyzeWritingText(text, vocabulary);
    setAnalysis(nextAnalysis);
    setSavedMessage('');
    return nextAnalysis;
  };

  const saveEntry = async () => {
    if (!text.trim()) return;
    const nextAnalysis = analysis ?? runAnalysis();
    await saveWritingJournalEntry(db, prompt, text, nextAnalysis);
    setSavedMessage('Phrase sauvegardee dans le journal.');
    setText('');
    setAnalysis(null);
    await load();
  };

  if (loading) return <LoadingView />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.quickHero}>
        <View>
          <Text style={styles.quickKicker}>Ecriture offline</Text>
          <Text style={styles.quickTitle}>Journal N5</Text>
          <Text style={styles.quickText}>Ecris court, verifie les particules, garde une trace de tes phrases.</Text>
        </View>
        <View style={styles.quickCounter}>
          <Text style={styles.quickCounterValue}>{entries.length}</Text>
          <Text style={styles.quickCounterLabel}>notes</Text>
        </View>
      </View>

      <Section title="Objectif du jour">
        <View style={styles.preferenceOptionCard}>
          <Text style={styles.preferenceOptionTitle}>{prompt.title}</Text>
          <Text style={styles.preferenceOptionText}>{prompt.promptFr}</Text>
          <Text style={styles.quickCorrectionText}>{prompt.helper}</Text>
          <JapaneseLookupText text={prompt.exampleJa} entries={lookupEntries} onSelect={setSelectedLookup} style={styles.quickJapanese} />
        </View>
      </Section>

      <Section title="Ta phrase">
        <TextInput
          value={text}
          onChangeText={(value) => {
            setText(value);
            setAnalysis(null);
            setSavedMessage('');
          }}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Exemple : きょうは にほんご を べんきょうします。"
          style={[styles.directAnswerInput, { minHeight: 112, textAlignVertical: 'top' }]}
        />
        <View style={styles.segmented}>
          <Pressable
            disabled={!text.trim()}
            style={[styles.secondaryFullButton, !text.trim() && styles.primaryButtonDisabled]}
            onPress={runAnalysis}
          >
            <Text style={styles.secondaryFullButtonText}>Analyser</Text>
          </Pressable>
          <Pressable
            disabled={!text.trim()}
            style={[styles.pathActionButton, !text.trim() && styles.primaryButtonDisabled]}
            onPress={saveEntry}
          >
            <Text style={styles.pathActionText}>Sauvegarder</Text>
          </Pressable>
        </View>
        {!!savedMessage && <Text style={styles.feedbackMnemonic}>{savedMessage}</Text>}
      </Section>

      {!!analysis && (
        <Section title="Retour local">
          <View style={[styles.feedback, analysis.assessment === 'likely_correct' ? styles.choiceCorrect : styles.choiceWrong]}>
            <Text style={styles.feedbackTitle}>{analysis.assessment === 'likely_correct' ? 'Phrase cohérente' : 'Phrase à vérifier'}</Text>
            <Text style={styles.feedbackText}>{analysis.assessmentDetail}</Text>
            {analysis.correctedText !== text.trim() && <Text style={styles.quickJapanese}>Ponctuation proposée : {analysis.correctedText}</Text>}
          </View>
          <View style={styles.aptitudeInsightGrid}>
            <View style={styles.aptitudeInsightCard}>
              <Text style={styles.pathNextLabel}>Mots reconnus</Text>
              <Text style={styles.pathRequirementText}>{analysis.detectedWords.join(', ') || 'Aucun mot detecte'}</Text>
            </View>
            <View style={styles.aptitudeInsightCard}>
              <Text style={styles.pathNextLabel}>À vérifier</Text>
              <Text style={styles.pathRequirementText}>{analysis.unknownTokens.join(', ') || 'Rien de bloquant'}</Text>
            </View>
          </View>
          <View style={styles.pathRequirementList}>
            {analysis.suggestions.map((suggestion, index) => (
              <View key={`${suggestion}-${index}`} style={styles.pathRequirementItem}>
                <Text style={styles.pathRequirementIndex}>{index + 1}</Text>
                <Text style={styles.pathRequirementText}>{suggestion}</Text>
              </View>
            ))}
          </View>
        </Section>
      )}

      <Section title="Historique recent">
        {entries.length ? entries.map((entry) => (
          <View key={entry.id} style={styles.preferenceOptionCard}>
            <Text style={styles.preferenceOptionTitle}>{entry.prompt_title}</Text>
            <Text style={styles.preferenceOptionText}>{entry.prompt_fr}</Text>
            <JapaneseLookupText text={entry.user_text} entries={lookupEntries} onSelect={setSelectedLookup} style={styles.quickJapanese} />
            {parseJsonArray(entry.suggestions_json).slice(0, 2).map((suggestion, index) => (
              <Text key={`${entry.id}-${index}`} style={styles.quickCorrectionText}>{suggestion}</Text>
            ))}
          </View>
        )) : (
          <EmptyState title="Aucune phrase sauvegardee" />
        )}
      </Section>
      <WordLookupPanel entry={selectedLookup} onClose={() => setSelectedLookup(null)} />
    </ScrollView>
  );
}

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

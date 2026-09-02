import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { styles } from '../appStyles';
import type { KanjiItem, Screen, VocabularyItem } from '../models';
import { buildKanjiDetail, type KanjiDetail } from '../services/kanjiComponents';
import { markSrsItemForReview } from '../services/srs';
import { buildVocabularyCards, loadKanjiItems, loadVocabularyItems } from '../services/vocabulary';
import { KanjiFlashcardsSection } from './KanjiFlashcardsSection';
import { EmptyState, LoadingView, Section } from './sharedUi';
import { SegmentButton } from './formControls';
import { getMasteryColorToken, loadMasteryMap, masteryKey, summarizeMastery, type MasteryStatus, type MasteryView } from '../services/mastery';
import { KANJI_THEORY, getKanjiForRadical, getPrimaryRadical, type RadicalEntry } from '../data/kanjiRadicals';
import { sortByKanjiLearningOrder } from '../data/kanjiLearningOrder';
import { DomainProgressHeader } from './DomainProgressHeader';

type KanjiLearningFilter = 'learn' | 'review' | 'known' | 'all';

export function KanjiDetailScreen({ onNavigate }: { onNavigate?: (screen: Screen) => void }) {
  const db = useSQLiteContext();
  const [loading, setLoading] = useState(true);
  const [kanjiItems, setKanjiItems] = useState<KanjiItem[]>([]);
  const [vocabularyItems, setVocabularyItems] = useState<VocabularyItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [reviewMessage, setReviewMessage] = useState('');
  const [learningFilter, setLearningFilter] = useState<KanjiLearningFilter>('learn');
  const [masteryById, setMasteryById] = useState<Record<string, MasteryView>>({});
  const [showTheory, setShowTheory] = useState(false);
  const [selectedRadical, setSelectedRadical] = useState<RadicalEntry | null>(null);
  const [kanjiTrail, setKanjiTrail] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    Promise.all([loadKanjiItems(db), loadVocabularyItems(db)])
      .then(([kanjiRows, vocabularyResult]) => {
        if (!mounted) return;
        const n5Kanji = sortByKanjiLearningOrder(
          kanjiRows.filter((item) => item.jlpt_level === 'N5'),
          (item) => item.character,
        );
        setKanjiItems(n5Kanji);
        setVocabularyItems(vocabularyResult.rows.filter((item) => (item.jlpt_level ?? 'N5') === 'N5'));
        setSelectedId((current) => current ?? n5Kanji[0]?.id ?? null);
      })
      .catch((error) => {
        console.error('Unable to load kanji detail screen', error);
        if (mounted) {
          setKanjiItems([]);
          setVocabularyItems([]);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [db]);

  useEffect(() => {
    let mounted = true;
    loadMasteryMap(db, kanjiItems.map((item) => ({ itemId: item.id, itemType: 'kanji' as const })))
      .then((views) => {
        if (!mounted) return;
        setMasteryById(kanjiItems.reduce<Record<string, MasteryView>>((acc, item) => {
          const view = views[masteryKey('kanji', item.id)];
          if (view) acc[item.id] = view;
          return acc;
        }, {}));
      })
      .catch((error) => console.error('Unable to load kanji mastery', error));
    return () => { mounted = false; };
  }, [db, kanjiItems]);

  const filteredKanji = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return kanjiItems.filter((item) => {
      const matchesQuery = !normalized || `${item.character} ${item.meaning_fr} ${item.n5_readings ?? ''} ${item.onyomi ?? ''} ${item.kunyomi ?? ''}`
        .toLowerCase().includes(normalized);
      const status = masteryById[item.id]?.status ?? 'new';
      const matchesLearning = learningFilter === 'all'
        || (learningFilter === 'learn' && (status === 'new' || status === 'learning'))
        || (learningFilter === 'review' && status === 'review')
        || (learningFilter === 'known' && (status === 'known' || status === 'mastered'));
      return matchesQuery && matchesLearning;
    });
  }, [kanjiItems, learningFilter, masteryById, query]);

  const masterySummary = useMemo(
    () => summarizeMastery(kanjiItems.map((item) => masteryById[item.id]).filter((item): item is MasteryView => !!item)),
    [kanjiItems, masteryById]
  );

  const selectedKanji = useMemo(
    () => kanjiItems.find((item) => item.id === selectedId) ?? filteredKanji[0] ?? kanjiItems[0] ?? null,
    [filteredKanji, kanjiItems, selectedId]
  );

  const detail = useMemo<KanjiDetail | null>(
    () => selectedKanji ? buildKanjiDetail(selectedKanji, vocabularyItems) : null,
    [selectedKanji, vocabularyItems]
  );
  const kanjiCards = useMemo(
    () => buildVocabularyCards(vocabularyItems, kanjiItems).filter((card) => !!card.kanji).slice(0, 80),
    [kanjiItems, vocabularyItems]
  );
  const radical = selectedKanji ? getPrimaryRadical(selectedKanji.character) : null;
  const radicalKanji = selectedRadical ? getKanjiForRadical(selectedRadical.symbol, kanjiItems.map((item) => item.character)) : [];

  const markForReview = async () => {
    if (!selectedKanji) return;
    await markSrsItemForReview(db, { itemId: selectedKanji.id, itemType: 'kanji' });
    const mastery = await loadMasteryMap(db, [{ itemId: selectedKanji.id, itemType: 'kanji' }]);
    const updated = mastery[masteryKey('kanji', selectedKanji.id)];
    if (updated) setMasteryById((current) => ({ ...current, [selectedKanji.id]: updated }));
    setReviewMessage(`${selectedKanji.character} ajoute a la file de revision.`);
  };

  if (loading) return <LoadingView />;
  if (!detail) return <EmptyState title="Aucun kanji N5 trouve" />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.grammarHero}>
        <View style={styles.grammarHeroText}>
          <Text style={styles.grammarKicker}>字 N5</Text>
          <Text style={styles.grammarTitle}>Détail du kanji</Text>
          <Text style={styles.grammarSubtitle}>
            Composants, lectures, mnémoniques, confusions et mots lies pour les 80 kanji N5.
          </Text>
        </View>
        <View style={styles.grammarHeroBadge}>
          <Text style={styles.grammarHeroBadgeValue}>{kanjiItems.length}</Text>
          <Text style={styles.grammarHeroBadgeText}>kanji</Text>
        </View>
      </View>

      <DomainProgressHeader
        label="Progression Kanji"
        mastered={masterySummary.mastered}
        total={kanjiItems.length}
        review={masterySummary.review}
        attempts={Object.values(masteryById).reduce((sum, item) => sum + item.attempts, 0)}
        recommendation={masterySummary.review ? 'Revoir les kanji fragiles et leur radical.' : 'Étudier le prochain kanji recommandé.'}
        actionLabel={masterySummary.review ? 'À revoir' : 'Continuer'}
        onContinue={() => setLearningFilter(masterySummary.review ? 'review' : 'learn')}
      />

      <Pressable accessibilityRole="button" onPress={() => setShowTheory((value) => !value)} style={styles.kanjiTheoryLaunch}>
        <Text style={styles.kanjiTheoryLaunchIcon}>理</Text><View style={styles.kanjiTheoryLaunchCopy}><Text style={styles.kanjiTheoryLaunchTitle}>Comprendre les kanji</Text><Text style={styles.kanjiTheoryLaunchText}>Origine, lectures, okurigana, radicaux et méthode N5.</Text></View><Text style={styles.kanjiTheoryLaunchArrow}>{showTheory ? '−' : '+'}</Text>
      </Pressable>
      {showTheory && <View style={styles.kanjiTheoryPanel}>{KANJI_THEORY.map((chapter, index) => <View key={chapter.title} style={styles.kanjiTheoryChapter}><Text style={styles.kanjiTheoryNumber}>{String(index + 1).padStart(2, '0')}</Text><View style={styles.kanjiTheoryChapterCopy}><Text style={styles.kanjiTheoryTitle}>{chapter.title}</Text><Text style={styles.kanjiTheoryText}>{chapter.text}</Text></View></View>)}</View>}

      <KanjiFlashcardsSection cards={kanjiCards} />

      <Section title="Chercher un kanji">
        <View style={styles.segmented}>
          <SegmentButton label={`À apprendre ${masterySummary.new + masterySummary.learning}`} active={learningFilter === 'learn'} onPress={() => setLearningFilter('learn')} />
          <SegmentButton label={`À revoir ${masterySummary.review}`} active={learningFilter === 'review'} onPress={() => setLearningFilter('review')} />
        </View>
        <View style={styles.segmented}>
          <SegmentButton label={`Connus ${masterySummary.known + masterySummary.mastered}`} active={learningFilter === 'known'} onPress={() => setLearningFilter('known')} />
          <SegmentButton label={`Tout voir ${masterySummary.total}`} active={learningFilter === 'all'} onPress={() => setLearningFilter('all')} />
        </View>
        <TextInput
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Kanji, sens, lecture"
          style={styles.vocabularySearchInput}
        />
        <View style={styles.globalDomainStrip}>
          {filteredKanji.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => {
                setSelectedId(item.id);
                setReviewMessage('');
              }}
              style={[
                styles.globalDomainChip,
                selectedKanji?.id === item.id && styles.grammarModeCardActive,
              ]}
            >
              <View style={[styles.kanjiMasteryDot, { backgroundColor: getMasteryColorToken(masteryById[item.id]?.status ?? 'new') }]} />
              <Text style={styles.globalDomainChipText}>{item.character}</Text>
            </Pressable>
          ))}
        </View>
      </Section>

      {selectedRadical && (
        <Section title={`Radical ${selectedRadical.symbol}`}>
          <View style={styles.radicalDetailPanel}>
            <View style={styles.radicalDetailHeader}><Text style={styles.radicalDetailSymbol}>{selectedRadical.symbol}</Text><View style={styles.radicalDetailCopy}><Text style={styles.radicalDetailName}>{selectedRadical.nameJa}</Text><Text style={styles.radicalDetailMeaning}>{selectedRadical.meaningFr}</Text><Text style={styles.radicalDetailPosition}>{selectedRadical.position}{selectedRadical.variants.length ? ` · variantes ${selectedRadical.variants.join(', ')}` : ''}</Text></View></View>
            <Text style={styles.radicalDetailLabel}>{radicalKanji.length} kanji N5 classé{radicalKanji.length > 1 ? 's' : ''} sous ce radical</Text>
            <View style={styles.radicalKanjiGrid}>{radicalKanji.map((character) => { const target = kanjiItems.find((item) => item.character === character); return <Pressable key={character} onPress={() => { if (!target || target.id === selectedId) return; setKanjiTrail((trail) => selectedId ? [...trail, selectedId] : trail); setSelectedId(target.id); }} style={[styles.radicalKanjiButton, target?.id === selectedId && styles.radicalKanjiButtonActive]}><Text style={[styles.radicalKanjiCharacter, target?.id === selectedId && styles.radicalKanjiCharacterActive]}>{character}</Text><View style={[styles.kanjiMasteryDot, { backgroundColor: getMasteryColorToken(target ? masteryById[target.id]?.status ?? 'new' : 'new') }]} /></Pressable>; })}</View>
            <Pressable accessibilityRole="button" onPress={() => { const previous = kanjiTrail[kanjiTrail.length - 1]; if (previous) { setSelectedId(previous); setKanjiTrail((trail) => trail.slice(0, -1)); } else setSelectedRadical(null); }} style={styles.radicalBackButton}><Text style={styles.radicalBackButtonText}>{kanjiTrail.length ? 'Retour au kanji précédent' : 'Fermer la fiche radical'}</Text></Pressable>
          </View>
        </Section>
      )}

      <KanjiDetailContent detail={detail} mastery={selectedKanji ? masteryById[selectedKanji.id] : undefined} radical={radical} onOpenRadical={() => { setSelectedRadical(radical); setKanjiTrail([]); }} />

      <View style={styles.segmented}>
        <Pressable style={styles.pathActionButton} onPress={markForReview}>
          <Text style={styles.pathActionText}>Ajouter aux révisions</Text>
        </Pressable>
        <Pressable style={styles.secondaryFullButton} onPress={() => onNavigate?.('quiz')}>
          <Text style={styles.secondaryFullButtonText}>Quiz kanji</Text>
        </Pressable>
      </View>
      {!!reviewMessage && <Text style={styles.feedbackMnemonic}>{reviewMessage}</Text>}
    </ScrollView>
  );
}

function KanjiDetailContent({ detail, mastery, radical, onOpenRadical }: { detail: KanjiDetail; mastery?: MasteryView; radical: RadicalEntry | null; onOpenRadical: () => void }) {
  const item = detail.item;
  return (
    <Section title={`Fiche ${detail.character}`}>
      <View style={styles.resultCard}>
        <Text style={styles.resultKicker}>Kanji N5</Text>
        <Text style={styles.resultScore}>{detail.character}</Text>
        <Text style={styles.resultPercent}>{item.meaning_fr}</Text>
        {!!mastery && (
          <View style={[styles.kanjiMasteryStatus, { borderColor: getMasteryColorToken(mastery.status as MasteryStatus) }]}>
            <Text style={styles.kanjiMasteryStatusText}>{mastery.label}</Text>
            <Text style={styles.kanjiMasteryStatusMeta}>{mastery.accuracy === null ? `${mastery.attempts} essai(s)` : `${mastery.accuracy}% de réussite`}</Text>
          </View>
        )}
      </View>

      <View style={styles.aptitudeInsightGrid}>
        <Pressable accessibilityRole="button" disabled={!radical} onPress={onOpenRadical} style={styles.kanjiRadicalCard}>
          <Text style={styles.pathNextLabel}>Radical principal</Text>
          <View style={styles.kanjiRadicalCardRow}><Text style={styles.kanjiRadicalSymbol}>{radical?.symbol ?? '?'}</Text><View style={styles.kanjiRadicalCopy}><Text style={styles.pathRequirementText}>{radical?.meaningFr ?? 'À documenter'}</Text><Text style={styles.kanjiRadicalHint}>{radical ? 'Toucher pour voir les kanji associés' : 'Radical indisponible'}</Text></View></View>
        </Pressable>
        <View style={styles.aptitudeInsightCard}>
          <Text style={styles.pathNextLabel}>Composants</Text>
          <Text style={styles.pathRequirementText}>{detail.components.join(' + ')}</Text>
        </View>
        <View style={styles.aptitudeInsightCard}>
          <Text style={styles.pathNextLabel}>Lectures</Text>
          <Text style={styles.pathRequirementText}>
            {[item.n5_readings, item.onyomi, item.kunyomi].filter(Boolean).join(' / ') || 'A reviser'}
          </Text>
        </View>
      </View>

      <View style={styles.pathGuidanceBox}>
        <Text style={styles.pathGuidanceLabel}>Mnemonique</Text>
        <Text style={styles.pathGuidanceText}>{detail.mnemonicFr}</Text>
      </View>

      {!!detail.confusions.length && (
        <View style={styles.pathRequirementList}>
          <View style={styles.pathRequirementItem}>
            <Text style={styles.pathRequirementIndex}>!</Text>
            <Text style={styles.pathRequirementText}>A ne pas confondre avec : {detail.confusions.join(', ')}</Text>
          </View>
        </View>
      )}

      <Text style={styles.quizConfigMode}>Mots lies</Text>
      <View style={styles.pathRequirementList}>
        {detail.relatedWords.length ? detail.relatedWords.map((word, index) => (
          <View key={word.id} style={styles.pathRequirementItem}>
            <Text style={styles.pathRequirementIndex}>{index + 1}</Text>
            <Text style={styles.pathRequirementText}>
              {(word.kanji || word.japanese)} {word.kana ? `(${word.kana})` : ''} : {word.meaning_fr}
            </Text>
          </View>
        )) : (
          <View style={styles.pathRequirementItem}>
            <Text style={styles.pathRequirementIndex}>1</Text>
            <Text style={styles.pathRequirementText}>Aucun mot lie trouve dans la base locale pour ce kanji.</Text>
          </View>
        )}
      </View>
    </Section>
  );
}

import { useMemo, useState } from 'react';
import {
  Image,
  ImageStyle,
  Modal,
  PanResponder,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Circle, Ellipse, Line, Path, Polygon, Rect } from 'react-native-svg';
import { styles } from '../appStyles';
import type { KanaCard, KanaViewerPanel } from '../models';
import { getKanaMasteryStatus, type KanaMasteryStatus } from '../services/kanaProgress';
import {
  buildKanaMnemonicSentence,
  capitalizeKanaLabel,
  formatVocabularyExample,
  getKanaVisual,
  isCombinedKanaFallbackExample,
} from '../services/kanaVisual';
import { EmptyText } from './sharedUi';
import { KanaTracePanel } from './KanaTracePanel';

export function KanaThumbnailCard({
  card,
  index,
  total,
  onPress,
}: {
  card: KanaCard;
  index: number;
  total: number;
  onPress: () => void;
}) {
  const visual = getKanaVisual(card, index);
  const scriptLabel = card.script === 'hiragana' ? 'Hiragana' : 'Katakana';
  const orderLabel = `${Math.min(index + 1, total)}/${total}`;
  const status = getKanaMasteryStatus(card);
  const exampleBadge = isCombinedKanaFallbackExample(card) ? 'Repère' : 'N5';
  const mnemonic = buildKanaMnemonicSentence(card, visual);

  return (
    <Pressable
      onPress={onPress}
      style={[styles.thumbnailCard, { backgroundColor: visual.background }]}
    >
      <View style={styles.thumbnailArt}>
        <MnemonicArt
          kind={visual.art}
          accent={visual.accent}
          uri={visual.illustrationUri}
          fallback={visual.illustrationFallback}
        />
      </View>
      <View style={styles.thumbnailReadabilityWash} />
      <Text style={styles.thumbnailScript}>{scriptLabel}</Text>
      <Text style={styles.thumbnailCount}>{orderLabel}</Text>
      <Text style={styles.thumbnailN5Badge}>{exampleBadge}</Text>
      <View style={[styles.thumbnailStatusDot, getKanaStatusStyle(status)]} />
      <Text style={styles.thumbnailRomaji}>{capitalizeKanaLabel(card.romaji)}/{card.character}</Text>
      <View style={styles.thumbnailWordBlock}>
        <Text style={styles.thumbnailWordRomaji}>{visual.wordRomaji}</Text>
        <Text style={styles.thumbnailMeaning}>{visual.meaning}</Text>
        <Text style={styles.thumbnailMnemonic} numberOfLines={1}>{mnemonic}</Text>
      </View>
    </Pressable>
  );
}

export function KanaCardViewer({
  visible,
  card,
  index,
  total,
  flipped,
  panel,
  onClose,
  onPanelChange,
  onToggleFlip,
  onSpeak,
  onStartQuiz,
  onPrevious,
  onNext,
  onRandom,
  onToggleFavorite,
  onReview,
  onMastered,
  onMnemonicNoteChange,
}: {
  visible: boolean;
  card: KanaCard | null;
  index: number;
  total: number;
  flipped: boolean;
  panel: KanaViewerPanel;
  onClose: () => void;
  onPanelChange: (panel: KanaViewerPanel) => void;
  onToggleFlip: () => void;
  onSpeak: () => void;
  onStartQuiz: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onRandom: () => void;
  onToggleFavorite: () => void;
  onReview: () => void;
  onMastered: () => void;
  onMnemonicNoteChange: (note: string) => void;
}) {
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gestureState) =>
          panel === 'card' &&
          Math.abs(gestureState.dx) > 18 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.25,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          panel === 'card' &&
          Math.abs(gestureState.dx) > 24 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -54) onNext();
          if (gestureState.dx > 54) onPrevious();
        },
      }),
    [onNext, onPrevious, panel]
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={styles.viewerScreen}>
        <View style={styles.viewerHeader}>
          <Pressable style={styles.viewerCloseButton} onPress={onClose}>
            <Text style={styles.viewerCloseText}>Fermer</Text>
          </Pressable>
          <Text style={styles.viewerCounter}>{total > 0 ? `${index + 1}/${total}` : '0/0'}</Text>
          <Pressable style={styles.viewerRandomButton} onPress={onRandom}>
            <Text style={styles.viewerRandomText}>Aléatoire</Text>
          </Pressable>
        </View>

        <View style={styles.viewerModeTabs}>
          <Pressable
            style={[styles.viewerModeButton, panel === 'card' && styles.viewerModeButtonActive]}
            onPress={() => onPanelChange('card')}
          >
            <Text style={[styles.viewerModeText, panel === 'card' && styles.viewerModeTextActive]}>Carte</Text>
          </Pressable>
          <Pressable
            style={[styles.viewerModeButton, panel === 'trace' && styles.viewerModeButtonActive]}
            onPress={() => onPanelChange('trace')}
          >
            <Text style={[styles.viewerModeText, panel === 'trace' && styles.viewerModeTextActive]}>Tracé</Text>
          </Pressable>
          <Pressable style={styles.viewerModeButton} onPress={onSpeak}>
            <Text style={styles.viewerModeText}>Audio</Text>
          </Pressable>
          <Pressable style={styles.viewerModeButton} onPress={onStartQuiz}>
            <Text style={styles.viewerModeText}>Quiz</Text>
          </Pressable>
        </View>

        <View style={styles.viewerCardArea}>
          <View style={styles.viewerSwipeZone} {...panResponder.panHandlers}>
            {card && panel === 'card' ? (
            <KanaIllustratedCard
              card={card}
              index={index}
              total={total}
              flipped={flipped}
              large
              onPress={onToggleFlip}
              onToggleFavorite={onToggleFavorite}
              onReview={onReview}
              onMastered={onMastered}
            />
          ) : card ? (
            <KanaTracePanel card={card} />
          ) : (
            <EmptyText text="Aucune carte à afficher." />
            )}
          </View>
        </View>
        {card && (
          <TextInput
            value={card.mnemonic_note ?? ''}
            onChangeText={onMnemonicNoteChange}
            placeholder="Note mémo personnelle"
            placeholderTextColor="#B8C0BC"
            style={styles.viewerMnemonicInput}
          />
        )}

        <View style={styles.viewerToolActions}>
          <Pressable style={styles.viewerToolButton} onPress={onSpeak}>
            <Text style={styles.viewerToolText}>Écouter</Text>
          </Pressable>
          <Pressable style={styles.viewerToolButton} onPress={onStartQuiz}>
            <Text style={styles.viewerToolText}>Quiz carte</Text>
          </Pressable>
        </View>

        <View style={styles.viewerActions}>
          <Pressable style={styles.viewerNavButton} onPress={onPrevious}>
            <Text style={styles.viewerNavText}>Précédent</Text>
          </Pressable>
          <Pressable
            style={styles.viewerNavButton}
            onPress={() => onPanelChange(panel === 'trace' ? 'card' : 'trace')}
          >
            <Text style={styles.viewerNavText}>{panel === 'trace' ? 'Carte' : 'Tracer'}</Text>
          </Pressable>
          <Pressable style={[styles.viewerNavButton, styles.viewerNavButtonStrong]} onPress={onNext}>
            <Text style={[styles.viewerNavText, styles.viewerNavTextStrong]}>Suivant</Text>
          </Pressable>
        </View>
        <Text style={styles.viewerHint}>Glisse à gauche ou à droite pour changer de carte.</Text>
      </SafeAreaView>
    </Modal>
  );
}

export function KanaIllustratedCard({
  card,
  index,
  total,
  flipped,
  large = false,
  onPress,
  onToggleFavorite,
  onReview,
  onMastered,
}: {
  card: KanaCard;
  index: number;
  total: number;
  flipped: boolean;
  large?: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
  onReview: () => void;
  onMastered: () => void;
}) {
  const visual = getKanaVisual(card, index);
  const scriptLabel = card.script === 'hiragana' ? 'Hiragana' : 'Katakana';
  const orderLabel = `${Math.min(index + 1, total)}/${total}`;
  const exampleBadge = isCombinedKanaFallbackExample(card) ? 'Mot repère' : 'N5 vérifié';
  const mnemonic = buildKanaMnemonicSentence(card, visual);

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.illustratedCard,
        large && styles.illustratedCardLarge,
        { backgroundColor: visual.background },
      ]}
    >
      {!flipped ? (
        <>
          <View style={styles.illustratedTopRow}>
            <View>
              <Text style={styles.illustratedScript}>{scriptLabel}</Text>
              <Text style={styles.illustratedCount}>{orderLabel}</Text>
            </View>
            <Text style={styles.illustratedN5Badge}>{exampleBadge}</Text>
            <Text style={styles.illustratedRomaji}>{capitalizeKanaLabel(card.romaji)}/{card.character}</Text>
          </View>
          <View style={styles.illustrationLayer}>
            <MnemonicArt
              kind={visual.art}
              accent={visual.accent}
              uri={visual.illustrationUri}
              fallback={visual.illustrationFallback}
            />
          </View>
          <View style={styles.illustrationReadabilityWash} />
          <Text style={[styles.illustratedKana, large && styles.illustratedKanaLarge]}>{card.character}</Text>
          <View style={styles.illustratedBottom}>
            <Text style={styles.illustratedWordKana}>{visual.wordKana}</Text>
            <Text style={styles.illustratedWordRomaji}>{visual.wordRomaji}</Text>
            <Text style={styles.illustratedWordMeaning}>{visual.meaning}</Text>
            <Text style={styles.illustratedMnemonic} numberOfLines={2}>{mnemonic}</Text>
          </View>
        </>
      ) : (
        <>
          <Text style={styles.illustratedBackRomaji}>{card.romaji}</Text>
          <Text style={styles.illustratedBackTitle}>Carte mémoire</Text>
          <Text style={styles.illustratedBackText}>{card.character} se lit {card.romaji}.</Text>
          <View style={styles.illustratedBackVocabulary}>
            <Text style={styles.illustratedBackKana}>{visual.wordKana}</Text>
            <Text style={styles.illustratedBackWord}>{visual.wordRomaji}</Text>
            <Text style={styles.illustratedBackMeaning}>{visual.meaning}</Text>
            <Text style={styles.illustratedBackMnemonic}>{mnemonic}</Text>
          </View>
          <View style={styles.kanaCardActions}>
            <Pressable
              style={styles.kanaActionButton}
              onPress={(event) => {
                event.stopPropagation();
                onToggleFavorite();
              }}
            >
              <Text style={styles.kanaActionText}>{card.favorite === 1 ? 'Retirer' : 'Connu'}</Text>
            </Pressable>
            <Pressable
              style={styles.kanaActionButton}
              onPress={(event) => {
                event.stopPropagation();
                onReview();
              }}
            >
              <Text style={styles.kanaActionText}>À revoir</Text>
            </Pressable>
            <Pressable
              style={[styles.kanaActionButton, styles.kanaActionStrong]}
              onPress={(event) => {
                event.stopPropagation();
                onMastered();
              }}
            >
              <Text style={[styles.kanaActionText, styles.kanaActionStrongText]}>Maîtrisé</Text>
            </Pressable>
          </View>
        </>
      )}
    </Pressable>
  );
}

function MnemonicArt({
  kind,
  accent,
  uri,
  fallback,
}: {
  kind: string;
  accent: string;
  uri?: string;
  fallback: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  if (uri && !imageFailed) {
    return (
      <Image
        source={{ uri }}
        resizeMode="contain"
        style={styles.mnemonicImage as ImageStyle}
        onError={() => setImageFailed(true)}
      />
    );
  }

  if (!fallback) return null;

  return <Text style={styles.mnemonicFallback}>{fallback}</Text>;

  return (
    <Svg width="100%" height="100%" viewBox="0 0 220 220">
      {kind === 'umbrella' && (
        <>
          <Path d="M55 92 Q110 36 165 92 Z" fill={accent} opacity={0.55} />
          <Line x1="110" y1="92" x2="110" y2="180" stroke={accent} strokeWidth="8" />
          <Path d="M110 180 Q124 204 142 184" fill="none" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <Line x1="70" y1="104" x2="42" y2="128" stroke={accent} strokeWidth="4" opacity={0.65} />
          <Line x1="151" y1="104" x2="182" y2="126" stroke={accent} strokeWidth="4" opacity={0.65} />
        </>
      )}
      {kind === 'life' && (
        <>
          <Path d="M54 158 C46 86 92 42 122 84 C147 118 109 142 164 160" fill="none" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <Ellipse cx="166" cy="82" rx="21" ry="30" fill={accent} opacity={0.85} />
          <Line x1="141" y1="104" x2="183" y2="130" stroke={accent} strokeWidth="7" />
        </>
      )}
      {kind === 'hit' && (
        <>
          <Path d="M56 136 L28 160 L64 162 L50 190 L90 160" fill="none" stroke={accent} strokeWidth="6" strokeLinejoin="round" />
          <Line x1="72" y1="70" x2="160" y2="100" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <Polygon points="72,134 92,116 102,142 132,128 116,158 136,178 102,168 82,190 84,158" fill="none" stroke={accent} strokeWidth="5" />
        </>
      )}
      {kind === 'eternity' && (
        <>
          <Path d="M54 126 C54 84 98 84 110 126 C122 168 166 168 166 126 C166 84 122 84 110 126 C98 168 54 168 54 126Z" fill="none" stroke={accent} strokeWidth="9" />
          <Circle cx="74" cy="78" r="11" fill={accent} opacity={0.75} />
          <Line x1="52" y1="48" x2="80" y2="88" stroke={accent} strokeWidth="4" />
        </>
      )}
      {kind === 'big' && (
        <>
          <Circle cx="112" cy="116" r="42" fill={accent} opacity={0.35} />
          <Circle cx="92" cy="104" r="10" fill={accent} />
          <Circle cx="132" cy="104" r="10" fill={accent} />
          <Path d="M83 142 Q112 165 141 142" fill="none" stroke={accent} strokeWidth="7" strokeLinecap="round" />
          <Line x1="76" y1="66" x2="56" y2="38" stroke={accent} strokeWidth="7" />
          <Line x1="146" y1="66" x2="166" y2="38" stroke={accent} strokeWidth="7" />
        </>
      )}
      {kind === 'turtle' && (
        <>
          <Ellipse cx="112" cy="124" rx="52" ry="38" fill={accent} opacity={0.55} />
          <Circle cx="164" cy="116" r="17" fill={accent} opacity={0.55} />
          <Line x1="86" y1="96" x2="134" y2="150" stroke={accent} strokeWidth="5" opacity={0.85} />
          <Line x1="136" y1="96" x2="88" y2="150" stroke={accent} strokeWidth="5" opacity={0.85} />
          <Line x1="76" y1="150" x2="56" y2="174" stroke={accent} strokeWidth="7" strokeLinecap="round" />
          <Line x1="148" y1="150" x2="168" y2="174" stroke={accent} strokeWidth="7" strokeLinecap="round" />
        </>
      )}
      {kind === 'gold' && (
        <>
          <Rect x="60" y="78" width="100" height="54" rx="8" fill={accent} opacity={0.85} />
          <Rect x="72" y="60" width="76" height="22" rx="5" fill={accent} opacity={0.65} />
          <Line x1="74" y1="104" x2="146" y2="104" stroke="#FFFFFF" strokeWidth="5" opacity={0.55} />
          <Path d="M74 150 Q112 176 150 150" fill="none" stroke={accent} strokeWidth="6" />
        </>
      )}
      {kind === 'shoe' && (
        <>
          <Path d="M58 128 C84 142 126 142 164 126 L178 148 C132 174 76 166 42 146 Z" fill={accent} opacity={0.65} />
          <Circle cx="170" cy="112" r="9" fill={accent} />
          <Path d="M58 128 C50 98 74 76 98 88" fill="none" stroke={accent} strokeWidth="7" strokeLinecap="round" />
        </>
      )}
      {kind === 'sword' && (
        <>
          <Line x1="40" y1="124" x2="172" y2="78" stroke={accent} strokeWidth="12" strokeLinecap="round" />
          <Polygon points="172,78 196,66 184,92" fill={accent} />
          <Line x1="84" y1="108" x2="104" y2="164" stroke={accent} strokeWidth="9" strokeLinecap="round" />
          <Line x1="70" y1="142" x2="116" y2="126" stroke={accent} strokeWidth="7" strokeLinecap="round" />
        </>
      )}
      {kind === 'mast' && (
        <>
          <Polygon points="78,64 154,84 78,112" fill={accent} opacity={0.35} />
          <Line x1="82" y1="54" x2="82" y2="176" stroke={accent} strokeWidth="8" />
          <Path d="M82 176 L46 184 L128 184 Z" fill={accent} opacity={0.5} />
          <Line x1="82" y1="62" x2="154" y2="84" stroke={accent} strokeWidth="4" />
        </>
      )}
      {!['umbrella', 'life', 'hit', 'eternity', 'big', 'turtle', 'gold', 'shoe', 'sword', 'mast'].includes(kind) && (
        <>
          <Circle cx="110" cy="110" r="54" fill={accent} opacity={0.28} />
          <Line x1="66" y1="154" x2="154" y2="66" stroke={accent} strokeWidth="8" strokeLinecap="round" opacity={0.7} />
          <Circle cx="154" cy="66" r="12" fill={accent} opacity={0.75} />
        </>
      )}
    </Svg>
  );
}

export function KanaLearningCard({
  card,
  flipped,
  large = false,
  onPress,
  onToggleFavorite,
  onReview,
  onMastered,
}: {
  card: KanaCard;
  flipped: boolean;
  large?: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
  onReview: () => void;
  onMastered: () => void;
}) {
  const firstExample = card.examples[0];
  const associatedKanji = firstExample?.kanji ?? firstExample?.japanese ?? 'Aucun mot trouvé';
  const successRate = card.seen_count > 0 ? Math.round((card.correct_count / card.seen_count) * 100) : 0;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.kanaCard,
        large && styles.kanaCardLarge,
        flipped && styles.kanaCardFlipped,
        card.mastered === 1 && styles.kanaCardMastered,
        card.review === 1 && styles.kanaCardReview,
      ]}
    >
      {!flipped ? (
        <>
          <View style={styles.kanaStatusRow}>
            <Text style={styles.kanaStatusText}>{card.favorite === 1 ? 'Connu' : ' '}</Text>
            <Text style={styles.kanaStatusText}>{card.mastered === 1 ? 'Maîtrisé' : card.review === 1 ? 'À revoir' : ' '}</Text>
          </View>
          <Text style={styles.kanaCharacter}>{card.character}</Text>
          <Text style={styles.kanaScript}>{card.script === 'hiragana' ? 'Hiragana' : 'Katakana'}</Text>
          {card.seen_count > 0 && <Text style={styles.kanaMiniStat}>{successRate}% · {card.seen_count} vues</Text>}
        </>
      ) : (
        <>
          <Text style={styles.kanaRomaji}>{card.romaji}</Text>
          <Text style={styles.kanaBackLabel}>Kanji / mot associé</Text>
          <Text style={styles.kanaAssociated}>{associatedKanji}</Text>
          {card.examples.length > 0 ? (
            card.examples.map((example) => (
              <Text key={example.id} style={styles.kanaExample} numberOfLines={2}>
                {formatVocabularyExample(example)}
              </Text>
            ))
          ) : (
            <Text style={styles.kanaExample}>Aucun exemple N5 dans la base</Text>
          )}
          <View style={styles.kanaCardActions}>
            <Pressable
              style={styles.kanaActionButton}
              onPress={(event) => {
                event.stopPropagation();
                onToggleFavorite();
              }}
            >
              <Text style={styles.kanaActionText}>{card.favorite === 1 ? 'Retirer' : 'Connu'}</Text>
            </Pressable>
            <Pressable
              style={styles.kanaActionButton}
              onPress={(event) => {
                event.stopPropagation();
                onReview();
              }}
            >
              <Text style={styles.kanaActionText}>À revoir</Text>
            </Pressable>
            <Pressable
              style={[styles.kanaActionButton, styles.kanaActionStrong]}
              onPress={(event) => {
                event.stopPropagation();
                onMastered();
              }}
            >
              <Text style={[styles.kanaActionText, styles.kanaActionStrongText]}>Maîtrisé</Text>
            </Pressable>
          </View>
        </>
      )}
    </Pressable>
  );
}

function getKanaStatusStyle(status: KanaMasteryStatus) {
  if (status === 'mastered') return styles.thumbnailStatusMastered;
  if (status === 'known') return styles.thumbnailStatusKnown;
  if (status === 'weak') return styles.thumbnailStatusWeak;
  return styles.thumbnailStatusUnseen;
}

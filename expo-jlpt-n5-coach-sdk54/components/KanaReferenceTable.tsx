import { Pressable, Text, View } from 'react-native';
import { styles } from '../appStyles';
import { HIRAGANA_STANDARD, KATAKANA_STANDARD } from '../data/kanaTables';
import type { KanaCard, KanaTab } from '../models';

const chunk = <T,>(items: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, index * size + size));

export function KanaReferenceTable({
  tab,
  cards,
  onSelect,
}: {
  tab: Exclude<KanaTab, 'combined'>;
  cards: KanaCard[];
  onSelect: (card: KanaCard) => void;
}) {
  const rows = tab === 'hiragana' ? HIRAGANA_STANDARD : KATAKANA_STANDARD;
  const cardByCharacter = new Map(cards.map((card) => [card.character, card]));
  const standardCharacters = new Set(rows.flat().filter(Boolean));
  const voicedRows = chunk(cards.filter((card) => !standardCharacters.has(card.character)), 5);

  const renderCell = (character: string, key: string) => {
    const card = cardByCharacter.get(character);
    if (!character) return <View key={key} style={styles.referenceEmptyCell} />;
    return (
      <Pressable
        key={key}
        disabled={!card}
        onPress={() => card && onSelect(card)}
        style={[
          styles.referenceCell,
          (card?.correct_count ?? 0) > 0 && styles.referenceCellKnown,
          card?.mastered === 1 && styles.referenceCellMastered,
          card?.review === 1 && styles.referenceCellReview,
        ]}
      >
        <Text style={styles.referenceKana}>{character}</Text>
        <Text style={styles.referenceRomaji}>{card?.romaji ?? ''}</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.referenceTable}>
      <View style={styles.referenceHeaderRow}>
        {['a', 'i', 'u', 'e', 'o'].map((label) => (
          <Text key={label} style={styles.referenceHeaderCell}>{label}</Text>
        ))}
      </View>
      {rows.map((row, rowIndex) => (
        <View key={`${tab}-${rowIndex}`} style={styles.referenceRow}>
          {row.map((character, cellIndex) => renderCell(character, `${rowIndex}-${cellIndex}`))}
        </View>
      ))}
      {voicedRows.length > 0 && (
        <>
          <Text style={styles.referenceSectionTitle}>Sons voisés · ゛ et ゜</Text>
          {voicedRows.map((row, rowIndex) => (
            <View key={`${tab}-voiced-${rowIndex}`} style={styles.referenceRow}>
              {Array.from({ length: 5 }, (_, cellIndex) =>
                renderCell(row[cellIndex]?.character ?? '', `voiced-${rowIndex}-${cellIndex}`)
              )}
            </View>
          ))}
        </>
      )}
    </View>
  );
}

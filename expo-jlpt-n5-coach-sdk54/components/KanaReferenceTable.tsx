import { Pressable, Text, View } from 'react-native';
import { styles } from '../appStyles';
import { HIRAGANA_STANDARD, KATAKANA_STANDARD } from '../data/kanaTables';
import type { KanaCard, KanaTab } from '../models';

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

  return (
    <View style={styles.referenceTable}>
      <View style={styles.referenceHeaderRow}>
        {['a', 'i', 'u', 'e', 'o'].map((label) => (
          <Text key={label} style={styles.referenceHeaderCell}>{label}</Text>
        ))}
      </View>
      {rows.map((row, rowIndex) => (
        <View key={`${tab}-${rowIndex}`} style={styles.referenceRow}>
          {row.map((character, cellIndex) => {
            const card = character ? cardByCharacter.get(character) : undefined;
            if (!character) {
              return <View key={`${rowIndex}-${cellIndex}`} style={styles.referenceEmptyCell} />;
            }
            return (
              <Pressable
                key={character}
                onPress={() => card && onSelect(card)}
                style={[
                  styles.referenceCell,
                  card?.mastered === 1 && styles.referenceCellMastered,
                  card?.review === 1 && styles.referenceCellReview,
                ]}
              >
                <Text style={styles.referenceKana}>{character}</Text>
                <Text style={styles.referenceRomaji}>{card ? card.romaji : ''}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

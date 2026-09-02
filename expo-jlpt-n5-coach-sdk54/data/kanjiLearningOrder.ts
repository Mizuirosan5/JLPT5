/**
 * Stable pedagogical sequence for the app's 80 N5 kanji.
 * The JLPT does not publish an official kanji list or ranking, so this order
 * groups concepts from concrete foundations to common N5 reading contexts.
 */
export const N5_KANJI_LEARNING_ORDER = [
  // Numbers and money
  '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '百', '千', '万', '円',
  // Calendar and time
  '日', '月', '火', '水', '木', '金', '土', '年', '時', '分', '半', '午', '今', '毎', '前', '後', '間',
  // People and relationships
  '人', '男', '女', '子', '父', '母', '友', '先', '生',
  // School, books and language
  '学', '校', '本', '書', '読', '聞', '話', '語', '名',
  // Common actions
  '見', '行', '来', '入', '出', '休', '食', '何',
  // Position and directions
  '上', '下', '中', '外', '左', '右', '東', '西', '南', '北',
  // World and nature
  '国', '山', '川', '天', '雨', '気',
  // Transport, electricity and descriptions
  '車', '電', '大', '小', '高', '長', '白',
] as const;

const KANJI_ORDER_INDEX = new Map<string, number>(
  N5_KANJI_LEARNING_ORDER.map((character, index) => [character, index]),
);

export function getKanjiLearningPosition(character: string): number | null {
  const index = KANJI_ORDER_INDEX.get(character);
  return index === undefined ? null : index + 1;
}

export function sortByKanjiLearningOrder<T>(items: readonly T[], getCharacter: (item: T) => string): T[] {
  return [...items].sort((left, right) => {
    const leftIndex = KANJI_ORDER_INDEX.get(getCharacter(left)) ?? Number.MAX_SAFE_INTEGER;
    const rightIndex = KANJI_ORDER_INDEX.get(getCharacter(right)) ?? Number.MAX_SAFE_INTEGER;
    return leftIndex - rightIndex;
  });
}

export function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

export function hasJapaneseText(value: string | null | undefined): value is string {
  return !!value && /[\u3040-\u30FF\u4E00-\u9FFF]/.test(value);
}

export type WritingSystem = 'japanese' | 'latin' | 'numeric';

export function getWritingSystem(value: string): WritingSystem {
  if (/[\u3040-\u30FF\u4E00-\u9FFF]/u.test(value)) return 'japanese';
  if (/^[\d\s.,%+-]+$/u.test(value.trim())) return 'numeric';
  return 'latin';
}

export function keepChoicesInWritingSystem(correctAnswer: string, choices: string[]): string[] {
  const expectedSystem = getWritingSystem(correctAnswer);
  const seen = new Set<string>();
  return choices.filter((choice) => {
    const normalized = choice.trim().toLowerCase();
    if (!normalized || seen.has(normalized) || getWritingSystem(choice) !== expectedSystem) return false;
    seen.add(normalized);
    return true;
  });
}

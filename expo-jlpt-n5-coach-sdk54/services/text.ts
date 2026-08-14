export function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

export function hasJapaneseText(value: string | null | undefined): value is string {
  return !!value && /[\u3040-\u30FF\u4E00-\u9FFF]/.test(value);
}

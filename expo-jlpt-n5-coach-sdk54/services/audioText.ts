export function getJapaneseSpeechText(text: string, maxCharacters = 64): string {
  const value = text.replace(/\s+/gu, ' ').trim();
  if (value.length <= maxCharacters) return value;
  const firstSentence = value.match(/^.*?[\u3002\uff01\uff1f!?](?:[\u300d\u300f\u3011\uff09)])?/u)?.[0];
  return (firstSentence && firstSentence.length <= maxCharacters ? firstSentence : value.slice(0, maxCharacters)).trim();
}

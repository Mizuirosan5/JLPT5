import * as Speech from 'expo-speech';

export type OfflineAudioState = {
  available: boolean;
  japaneseVoiceId: string | null;
};

export async function detectOfflineAudio(): Promise<OfflineAudioState> {
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const japaneseVoices = voices.filter((voice) => voice.language?.toLowerCase().startsWith('ja'));
    const preferredVoice =
      japaneseVoices.find((voice) => /ja-jp|japanese|kyoko|otoya|siri/i.test(`${voice.identifier} ${voice.name}`)) ??
      japaneseVoices[0];
    return { available: japaneseVoices.length > 0, japaneseVoiceId: preferredVoice?.identifier ?? null };
  } catch {
    return { available: false, japaneseVoiceId: null };
  }
}

export function speakJapanese(text: string, audio: OfflineAudioState, slow = false): boolean {
  const value = text.trim();
  if (!value || !audio.available) return false;
  Speech.stop();
  Speech.speak(value, {
    language: 'ja-JP',
    voice: audio.japaneseVoiceId ?? undefined,
    rate: slow ? 0.62 : 0.74,
    pitch: 1,
  });
  return true;
}

export function stopOfflineAudio() {
  Speech.stop();
}

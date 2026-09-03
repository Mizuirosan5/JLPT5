import * as Speech from 'expo-speech';
import { getJapaneseSpeechText } from './audioText';

let speechStopTimer: ReturnType<typeof setTimeout> | null = null;

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
  const value = getJapaneseSpeechText(text);
  if (!value || !audio.available) return false;
  stopOfflineAudio();
  const clearTimer = () => {
    if (speechStopTimer) clearTimeout(speechStopTimer);
    speechStopTimer = null;
  };
  Speech.speak(value, {
    language: 'ja-JP',
    voice: audio.japaneseVoiceId ?? undefined,
    rate: slow ? 0.76 : 0.88,
    pitch: 1,
    onDone: clearTimer,
    onError: clearTimer,
    onStopped: clearTimer,
  });
  speechStopTimer = setTimeout(() => {
    speechStopTimer = null;
    Speech.stop();
  }, 12_000);
  return true;
}

export function stopOfflineAudio() {
  if (speechStopTimer) clearTimeout(speechStopTimer);
  speechStopTimer = null;
  Speech.stop();
}

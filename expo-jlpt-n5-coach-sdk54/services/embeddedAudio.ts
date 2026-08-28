import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioSource } from 'expo-audio';
import { AUDIO_ASSET_REGISTRY, AUDIO_TEXT_ASSET_IDS } from '../data/audioAssetRegistry';

let currentPlayer: AudioPlayer | null = null;

export function hasEmbeddedAudioAsset(itemId: string): boolean {
  return Boolean(AUDIO_ASSET_REGISTRY[itemId]);
}

export function hasEmbeddedAudioText(text: string): boolean {
  return Boolean(AUDIO_TEXT_ASSET_IDS[text.trim()]);
}

export function playEmbeddedAudioText(text: string, slow = false): Promise<boolean> {
  const itemId = AUDIO_TEXT_ASSET_IDS[text.trim()];
  return itemId ? playEmbeddedAudioAsset(itemId, slow) : Promise.resolve(false);
}

export async function playEmbeddedAudioAsset(itemId: string, slow = false): Promise<boolean> {
  const source = AUDIO_ASSET_REGISTRY[itemId] as AudioSource | undefined;
  if (!source) return false;
  try {
    currentPlayer?.remove();
    await setAudioModeAsync({
      allowsRecording: false,
      interruptionMode: 'duckOthers',
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    });
    currentPlayer = createAudioPlayer(source, { downloadFirst: true });
    currentPlayer.setPlaybackRate(slow ? 0.84 : 1);
    currentPlayer.seekTo(0).catch(() => undefined);
    currentPlayer.play();
    return true;
  } catch (error) {
    console.warn('Unable to play embedded audio asset', error);
    currentPlayer?.remove();
    currentPlayer = null;
    return false;
  }
}

export function stopEmbeddedAudioAsset() {
  currentPlayer?.pause();
}

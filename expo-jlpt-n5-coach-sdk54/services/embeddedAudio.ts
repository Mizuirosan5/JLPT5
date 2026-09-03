import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioSource } from 'expo-audio';
import { Asset } from 'expo-asset';
import { AUDIO_ASSET_REGISTRY, AUDIO_TEXT_ASSET_IDS } from '../data/audioAssetRegistry';

let currentPlayer: AudioPlayer | null = null;
let playbackRequest = 0;
let audioModeConfigured = false;

function releaseCurrentPlayer() {
  try {
    currentPlayer?.remove();
  } catch {
    // Le lecteur Expo peut déjà avoir été libéré par le système audio.
  }
  currentPlayer = null;
}

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
  const request = ++playbackRequest;
  try {
    releaseCurrentPlayer();
    if (!audioModeConfigured) {
      await setAudioModeAsync({
        allowsRecording: false,
        interruptionMode: 'duckOthers',
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        shouldRouteThroughEarpiece: false,
      });
      audioModeConfigured = true;
    }
    const asset = typeof source === 'number' ? Asset.fromModule(source) : null;
    if (asset) await asset.downloadAsync();
    // Une requête plus récente a pris la main : ne déclenche pas le secours vocal de l'ancienne.
    if (request !== playbackRequest) return true;
    const playableSource = asset?.localUri ? { uri: asset.localUri } : source;
    currentPlayer = createAudioPlayer(playableSource);
    currentPlayer.setPlaybackRate(slow ? 0.84 : 1);
    currentPlayer.play();
    return true;
  } catch (error) {
    if (request !== playbackRequest) return true;
    console.warn('Unable to play embedded audio asset', error);
    releaseCurrentPlayer();
    return false;
  }
}

export function stopEmbeddedAudioAsset() {
  playbackRequest += 1;
  releaseCurrentPlayer();
}

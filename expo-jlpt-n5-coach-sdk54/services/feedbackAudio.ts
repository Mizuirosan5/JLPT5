import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioSource } from 'expo-audio';

const CORRECT_SOURCE = require('../assets/audio/ui/correct.wav') as AudioSource;
const WRONG_SOURCE = require('../assets/audio/ui/wrong.wav') as AudioSource;
let player: AudioPlayer | null = null;
let configured = false;

export async function playAnswerFeedback(isCorrect: boolean, enabled = true): Promise<void> {
  if (!enabled) return;
  try {
    if (!configured) {
      await setAudioModeAsync({ allowsRecording: false, interruptionMode: 'duckOthers', playsInSilentMode: true, shouldPlayInBackground: false, shouldRouteThroughEarpiece: false });
      configured = true;
    }
    player?.remove();
    player = createAudioPlayer(isCorrect ? CORRECT_SOURCE : WRONG_SOURCE, { downloadFirst: true });
    player.play();
  } catch (error) {
    console.warn('Unable to play answer feedback', error);
  }
}

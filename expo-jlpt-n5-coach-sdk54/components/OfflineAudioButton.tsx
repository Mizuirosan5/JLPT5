import { useEffect, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { styles } from '../appStyles';
import { detectOfflineAudio, speakJapanese, type OfflineAudioState } from '../services/audio';
import { DEFAULT_LEARNING_PREFERENCES, loadLearningPreferences } from '../services/preferences';

type OfflineAudioButtonProps = {
  text: string;
  enabled?: boolean;
  label?: string;
  slow?: boolean;
};

export function OfflineAudioButton({ enabled = true, label = 'Audio', slow, text }: OfflineAudioButtonProps) {
  const db = useSQLiteContext();
  const [audio, setAudio] = useState<OfflineAudioState>({ available: false, japaneseVoiceId: null });
  const [audioEnabled, setAudioEnabled] = useState(DEFAULT_LEARNING_PREFERENCES.audioEnabled);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let mounted = true;
    Promise.all([detectOfflineAudio(), loadLearningPreferences(db)])
      .then(([state, preferences]) => {
        if (!mounted) return;
        setAudio(state);
        setAudioEnabled(preferences.audioEnabled);
      })
      .catch(() => {
        if (mounted) setAudio({ available: false, japaneseVoiceId: null });
      });
    return () => {
      mounted = false;
    };
  }, [db]);

  if (!enabled || !audioEnabled) return null;

  const active = audio.available && text.trim().length > 0;
  return (
    <Pressable
      disabled={!active}
      onPress={() => {
        const played = speakJapanese(text, audio, slow);
        setMessage(played ? 'Lecture locale' : 'Audio indisponible');
      }}
      style={[styles.grammarExampleActionButton, !active && styles.primaryButtonDisabled]}
    >
      <Text style={styles.grammarExampleActionText}>{message || label}</Text>
    </Pressable>
  );
}

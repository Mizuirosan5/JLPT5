import { useEffect, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { styles } from '../appStyles';
import { detectOfflineAudio, speakJapanese, type OfflineAudioState } from '../services/audio';
import { DEFAULT_LEARNING_PREFERENCES, loadLearningPreferences } from '../services/preferences';
import { hasEmbeddedAudioText, playEmbeddedAudioText } from '../services/embeddedAudio';

type OfflineAudioButtonProps = {
  text: string;
  compact?: boolean;
  enabled?: boolean;
  label?: string;
  slow?: boolean;
  iconOnly?: boolean;
};

export function OfflineAudioButton({ compact = false, enabled = true, iconOnly = false, label = 'Audio', slow, text }: OfflineAudioButtonProps) {
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

  const embedded = hasEmbeddedAudioText(text);
  const active = text.trim().length > 0 && (embedded || audio.available);
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={!active}
      onPress={() => {
        playEmbeddedAudioText(text, slow).then((playedEmbedded) => {
          const played = playedEmbedded || speakJapanese(text, audio, slow);
          setMessage(played ? (playedEmbedded ? 'Audio embarqué' : 'Lecture locale') : 'Audio indisponible');
        });
      }}
      style={[
        iconOnly ? styles.vocabCardIconButton : compact ? styles.vocabSmartActionButton : styles.grammarExampleActionButton,
        !active && styles.primaryButtonDisabled,
      ]}
    >
      <Text style={iconOnly ? styles.vocabCardIconText : compact ? styles.vocabSmartActionText : styles.grammarExampleActionText}>
        {iconOnly ? '♪' : message || label}
      </Text>
    </Pressable>
  );
}

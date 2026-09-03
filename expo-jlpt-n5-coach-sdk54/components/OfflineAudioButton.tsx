import { useEffect, useRef, useState } from 'react';
import { Pressable, Text } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useSQLiteContext } from 'expo-sqlite';
import { styles } from '../appStyles';
import { detectOfflineAudio, speakJapanese, stopOfflineAudio, type OfflineAudioState } from '../services/audio';
import { DEFAULT_LEARNING_PREFERENCES, loadLearningPreferences } from '../services/preferences';
import { hasEmbeddedAudioText, playEmbeddedAudioText, stopEmbeddedAudioAsset } from '../services/embeddedAudio';

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
  const pressLocked = useRef(false);
  const unlockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (unlockTimer.current) clearTimeout(unlockTimer.current);
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
      onPress={async () => {
        if (pressLocked.current) return;
        pressLocked.current = true;
        stopOfflineAudio();
        stopEmbeddedAudioAsset();
        setMessage(iconOnly ? '' : 'Lecture…');
        const playedEmbedded = await playEmbeddedAudioText(text, slow).catch(() => false);
        const played = playedEmbedded || speakJapanese(text, audio, slow);
        setMessage(played ? (playedEmbedded ? 'Audio embarqué' : 'Lecture locale') : 'Audio indisponible');
        unlockTimer.current = setTimeout(() => {
          pressLocked.current = false;
        }, 700);
      }}
      style={[
        iconOnly ? styles.vocabCardIconButton : compact ? styles.vocabSmartActionButton : styles.grammarExampleActionButton,
        !active && styles.primaryButtonDisabled,
      ]}
    >
      {iconOnly ? (
        <MaterialCommunityIcons accessibilityElementsHidden color="#152B3A" name="volume-high" size={21} />
      ) : (
        <Text style={compact ? styles.vocabSmartActionText : styles.grammarExampleActionText}>{message || label}</Text>
      )}
    </Pressable>
  );
}

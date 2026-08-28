import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { styles } from '../appStyles';
import type { Screen } from '../models';
import { loadNextLearningAction, type NextLearningAction } from '../services/nextLearningAction';

const VISIBLE_SCREENS: Screen[] = ['today', 'learn', 'path', 'practice'];

export function ContinueLearningBar({ currentScreen, onNavigate }: { currentScreen: Screen; onNavigate: (screen: Screen) => void }) {
  const db = useSQLiteContext();
  const [action, setAction] = useState<NextLearningAction | null>(null);
  useEffect(() => {
    if (!VISIBLE_SCREENS.includes(currentScreen)) return;
    loadNextLearningAction(db).then(setAction).catch((error) => console.warn('Unable to load next learning action', error));
  }, [currentScreen, db]);
  if (!action || !VISIBLE_SCREENS.includes(currentScreen)) return null;
  return (
    <View style={styles.continueBarWrap}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${action.eyebrow}. ${action.title}. Continuer.`} onPress={() => onNavigate(action.screen)} style={({ pressed }) => [styles.continueBar, pressed && styles.controlPressed]}>
        <Text style={styles.continueBarSymbol}>{action.symbol}</Text>
        <View style={styles.continueBarCopy}>
          <View style={styles.continueBarTopLine}><Text numberOfLines={1} style={styles.continueBarEyebrow}>{action.eyebrow}</Text><Text style={styles.continueBarLevel}>Niv. {action.level}</Text></View>
          <Text numberOfLines={1} style={styles.continueBarTitle}>{action.title}</Text>
          <View style={styles.continueBarProgressTrack}><View style={[styles.continueBarProgressFill, { width: `${action.progress}%` }]} /></View>
        </View>
        <View style={styles.continueBarAction}><Text style={styles.continueBarActionText}>Continuer</Text><Text style={styles.continueBarArrow}>›</Text></View>
      </Pressable>
    </View>
  );
}

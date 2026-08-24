import { Image, Pressable, Text } from 'react-native';
import { styles } from '../appStyles';

export function HeaderJapanScene() {
  return <Image accessibilityIgnoresInvertColors source={require('../assets/favicon.png')} style={styles.headerScene} />;
}

export function TabButton({
  icon,
  label,
  active,
  onPress,
}: {
  icon: string;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tabButton, active && styles.tabButtonActive, pressed && styles.controlPressed]}
    >
      <Text style={[styles.tabIcon, active && styles.tabIconActive]}>{icon}</Text>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function RubricButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.rubricButton, active && styles.rubricButtonActive, pressed && styles.controlPressed]}
    >
      <Text style={[styles.rubricButtonText, active && styles.rubricButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

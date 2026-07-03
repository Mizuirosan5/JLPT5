import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { styles } from '../appStyles';

export function HeaderJapanScene() {
  return (
    <View style={styles.headerScene} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 390 150">
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFE8DA" />
            <Stop offset="0.58" stopColor="#FFF7E8" />
            <Stop offset="1" stopColor="#E7F6F0" />
          </LinearGradient>
          <LinearGradient id="fuji" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#8FC9E8" />
            <Stop offset="1" stopColor="#2F7EA0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="390" height="150" fill="url(#sky)" />
        <Circle cx="300" cy="38" r="34" fill="#E94B5F" opacity="0.92" />
        <Path d="M152 130 L235 42 L318 130 Z" fill="url(#fuji)" opacity="0.9" />
        <Path d="M235 42 L210 76 L238 68 L258 78 Z" fill="#FFFFFF" opacity="0.95" />
        <Path d="M0 132 C56 110 98 122 142 111 C188 98 219 115 260 105 C315 91 352 105 390 92 L390 150 L0 150 Z" fill="#F4B860" opacity="0.5" />
        <Rect x="42" y="74" width="64" height="9" rx="2" fill="#C83543" />
        <Rect x="50" y="84" width="9" height="45" rx="2" fill="#B92E39" />
        <Rect x="90" y="84" width="9" height="45" rx="2" fill="#B92E39" />
        <Rect x="36" y="66" width="76" height="8" rx="2" fill="#E94B5F" />
        <Path d="M32 66 C52 58 94 58 116 66" fill="none" stroke="#7A1E28" strokeWidth="4" strokeLinecap="round" />
        <Circle cx="78" cy="42" r="5" fill="#F6A6B5" opacity="0.85" />
        <Circle cx="98" cy="34" r="4" fill="#F6A6B5" opacity="0.8" />
        <Circle cx="118" cy="49" r="3" fill="#F6A6B5" opacity="0.75" />
        <Path d="M348 78 C358 70 370 70 381 77" fill="none" stroke="#213A57" strokeWidth="3" strokeLinecap="round" opacity="0.32" />
      </Svg>
    </View>
  );
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
      style={[styles.tabButton, active && styles.tabButtonActive]}
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
      style={[styles.rubricButton, active && styles.rubricButtonActive]}
    >
      <Text style={[styles.rubricButtonText, active && styles.rubricButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { styles } from '../appStyles';

export function HeaderJapanScene() {
  return (
    <View style={styles.headerScene}>
      <Svg width="100%" height="100%" viewBox="0 0 390 150">
        <Rect x="0" y="0" width="390" height="150" fill="#FFF8EF" />
        <Circle cx="312" cy="36" r="31" fill="#C83543" opacity="0.9" />
        <Circle cx="212" cy="29" r="4" fill="#F6C85F" opacity="0.9" />
        <Circle cx="229" cy="18" r="3" fill="#C83543" opacity="0.46" />
        <Circle cx="245" cy="31" r="3" fill="#F6C85F" opacity="0.72" />
        <Path d="M158 116 C196 96 229 97 269 115 L269 143 C229 127 194 127 158 143 Z" fill="#F6C85F" opacity="0.72" />
        <Path d="M269 115 C307 96 340 97 378 116 L378 143 C342 127 307 127 269 143 Z" fill="#F6C85F" opacity="0.5" />
        <Path d="M269 115 L269 143" fill="none" stroke="#C83543" strokeWidth="3" opacity="0.78" />
        <Rect x="246" y="54" width="68" height="8" rx="2" fill="#152B3A" />
        <Rect x="252" y="66" width="9" height="47" rx="2" fill="#152B3A" />
        <Rect x="299" y="66" width="9" height="47" rx="2" fill="#152B3A" />
        <Rect x="239" y="45" width="82" height="8" rx="2" fill="#152B3A" />
        <Path d="M236 45 C258 36 302 36 324 45" fill="none" stroke="#152B3A" strokeWidth="4" strokeLinecap="round" />
        <Rect x="266" y="62" width="28" height="5" rx="2" fill="#C83543" />
        <Path d="M0 139 C58 127 105 131 158 122 L158 150 L0 150 Z" fill="#F6C85F" opacity="0.2" />
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

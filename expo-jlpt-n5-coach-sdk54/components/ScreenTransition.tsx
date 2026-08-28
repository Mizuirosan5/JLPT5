import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Platform } from 'react-native';
import { styles } from '../appStyles';
import type { Screen } from '../models';
import { useReducedMotion } from '../services/useReducedMotion';

export function ScreenTransition({ screen, children }: { screen: Screen; children: ReactNode }) {
  const reducedMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducedMotion) {
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }
    opacity.setValue(0.25);
    translateY.setValue(8);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 190, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(translateY, { toValue: 0, duration: 230, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, [opacity, reducedMotion, screen, translateY]);

  return <Animated.View style={[styles.screenStage, { opacity, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

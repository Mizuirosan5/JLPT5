import { useEffect } from 'react';
import { BackHandler } from 'react-native';

export function useHardwareBack(enabled: boolean, onBack: () => void): void {
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!enabled) return false;
      onBack();
      return true;
    });
    return () => subscription.remove();
  }, [enabled, onBack]);
}

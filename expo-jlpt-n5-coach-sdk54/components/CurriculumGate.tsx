import { useEffect, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { styles } from '../appStyles';
import type { CurriculumCode } from '../data/curriculum';
import { isCurriculumAccessible, loadCurriculumProfile } from '../services/curriculum';
import { EmptyState, LoadingView } from './sharedUi';

export function CurriculumGate({ minimum, children }: { minimum: CurriculumCode; children: ReactNode }) {
  const db = useSQLiteContext();
  const [current, setCurrent] = useState<CurriculumCode | null>(null);
  useEffect(() => {
    loadCurriculumProfile(db).then((profile) => setCurrent(profile.currentCode)).catch(() => setCurrent('1A'));
  }, [db]);
  if (!current) return <LoadingView />;
  if (!isCurriculumAccessible(minimum, current)) {
    return <View style={styles.content}><EmptyState title={`Cette activité se débloque au niveau ${minimum}.`} /></View>;
  }
  return <>{children}</>;
}

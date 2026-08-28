import type { SQLiteDatabase } from 'expo-sqlite';
import type { Screen } from '../models';
import { loadCurriculumProfile } from './curriculum';
import { loadSrsOverview } from './srs';

export type NextLearningAction = {
  screen: Screen;
  symbol: string;
  eyebrow: string;
  title: string;
  detail: string;
  level: string;
  progress: number;
};

export function chooseNextLearningAction(input: {
  dueToday: number;
  activeErrors: number;
  currentCode: string;
  unitTitle: string;
  progress: number;
}): NextLearningAction {
  const common = { level: input.currentCode, progress: Math.max(0, Math.min(100, input.progress)) };
  if (input.dueToday > 0) return { ...common, screen: 'review', symbol: '復', eyebrow: 'Mémoire prioritaire', title: `${input.dueToday} révision${input.dueToday > 1 ? 's' : ''} à faire`, detail: 'Consolider avant d’ajouter une nouvelle notion.' };
  if (input.activeErrors > 0) return { ...common, screen: 'errors', symbol: '直', eyebrow: 'Correction recommandée', title: `${input.activeErrors} erreur${input.activeErrors > 1 ? 's' : ''} à reprendre`, detail: 'Comprendre les erreurs récentes avant de continuer.' };
  return { ...common, screen: 'lesson', symbol: '進', eyebrow: `Parcours ${input.currentCode}`, title: input.unitTitle, detail: 'Continuer avec une leçon courte adaptée à ton niveau.' };
}

export async function loadNextLearningAction(db: SQLiteDatabase): Promise<NextLearningAction> {
  const [srs, profile, errorRow] = await Promise.all([
    loadSrsOverview(db),
    loadCurriculumProfile(db),
    db.getFirstAsync<{ total: number }>(`SELECT COUNT(*) AS total FROM app_error_flashcard WHERE archived = 0`),
  ]);
  return chooseNextLearningAction({ dueToday: srs.dueToday, activeErrors: errorRow?.total ?? 0, currentCode: profile.currentCode, unitTitle: profile.unit.title, progress: profile.progress });
}

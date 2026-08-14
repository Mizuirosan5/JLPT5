import type { SQLiteDatabase } from 'expo-sqlite';
import type { LeagueTier } from '../models';
import { formatDateKey, getWeekStart } from './goals';
import { getLeagueTier, getNextLeagueTier } from './progress';

export type LocalLeagueStatus = {
  seasonKey: string;
  current: LeagueTier;
  next: LeagueTier | null;
  division: string;
  progress: number;
  weeklyPoints: number;
  promotionTarget: number;
  maintenanceTarget: number;
  promoted: boolean;
  maintained: boolean;
  statusLabel: string;
  statusDetail: string;
};

export function buildLocalLeagueStatus({
  activeDays,
  level,
  weeklyAttempts,
  xpCurrentLevel,
  xpRequiredForLevel,
}: {
  activeDays: number;
  level: number;
  weeklyAttempts: number;
  xpCurrentLevel: number;
  xpRequiredForLevel: number;
}): LocalLeagueStatus {
  const current = getLeagueTier(level);
  const next = getNextLeagueTier(level);
  const levelProgress = xpRequiredForLevel > 0 ? Math.round((xpCurrentLevel / xpRequiredForLevel) * 100) : 100;
  const weeklyPoints = weeklyAttempts * 10 + activeDays * 35 + levelProgress;
  const promotionTarget = 260;
  const maintenanceTarget = 80;
  const promoted = weeklyPoints >= promotionTarget;
  const maintained = weeklyPoints >= maintenanceTarget;
  return {
    seasonKey: formatDateKey(getWeekStart()),
    current,
    next,
    division: current.name.split(' ').at(-1) ?? 'V',
    progress: Math.min(100, Math.round((weeklyPoints / promotionTarget) * 100)),
    weeklyPoints,
    promotionTarget,
    maintenanceTarget,
    promoted,
    maintained,
    statusLabel: promoted ? 'Promotion en vue' : maintained ? 'Maintien assure' : 'Zone fragile',
    statusDetail: promoted
      ? next
        ? `Continue : tu pousses vers ${next.name}.`
        : 'Dernier palier atteint, objectif maintien.'
      : maintained
        ? 'Le rythme de la semaine suffit pour garder la ligue.'
        : 'Une courte session aujourd hui securise le maintien.',
  };
}

export async function saveLocalLeagueSeason(db: SQLiteDatabase, status: LocalLeagueStatus, totalXp: number, activeDays: number) {
  await db.runAsync(
    `
    INSERT INTO app_local_league_season (
      season_key, league_name, division, xp_start, xp_current,
      active_days, promoted, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(season_key) DO UPDATE SET
      league_name = excluded.league_name,
      division = excluded.division,
      xp_current = excluded.xp_current,
      active_days = excluded.active_days,
      promoted = excluded.promoted,
      updated_at = datetime('now')
    `,
    status.seasonKey,
    status.current.name,
    status.division,
    totalXp,
    totalXp,
    activeDays,
    status.promoted ? 1 : 0
  );
}

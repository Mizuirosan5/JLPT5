import type { DailyProgress, DashboardStats, LearningPathStage, LeagueTier, MasteryDomainStats } from '../models';

export const emptyStats: DashboardStats = {
  questions: 0,
  vocabulary: 0,
  grammar: 0,
  kanji: 0,
  kana: 0,
  audio: 0,
  attempts: 0,
  todayAttempts: 0,
  todayCorrect: 0,
  correctRate: 0,
};

export const MAX_LEVEL = 250;
export const CALENDAR_HISTORY_DAYS = 365;
export const GOAL_PLAN_DAYS = 730;
const LEAGUE_NAMES = [
  { name: 'Bronze', symbol: '銅' },
  { name: 'Argent', symbol: '銀' },
  { name: 'Or', symbol: '金' },
  { name: 'Platine', symbol: '白' },
  { name: 'Émeraude', symbol: '翠' },
  { name: 'Sakura', symbol: '桜' },
  { name: 'Fuji', symbol: '富' },
  { name: 'Sensei', symbol: '先' },
  { name: 'JLPT', symbol: '試' },
  { name: 'Elite N5', symbol: '合' },
];
const LEAGUE_DIVISIONS = ['V', 'IV', 'III', 'II', 'I'];
export const LEAGUE_TIERS: LeagueTier[] = LEAGUE_NAMES.flatMap((league, leagueIndex) =>
  LEAGUE_DIVISIONS.map((division, divisionIndex) => ({
    name: `${league.name} ${division}`,
    minLevel: 1 + (leagueIndex * LEAGUE_DIVISIONS.length + divisionIndex) * 5,
    symbol: `${league.symbol}${divisionIndex + 1}`,
  }))
).map((league, index, all) =>
  index === all.length - 1 ? { ...league, minLevel: MAX_LEVEL } : league
);

export function getMasteryDomain(domains: MasteryDomainStats[], id: string): MasteryDomainStats | null {
  return domains.find((domain) => domain.id === id) ?? null;
}

export function masteryProgress(domain?: MasteryDomainStats): number {
  if (!domain || domain.total <= 0) return 0;
  return Math.min(100, Math.round(((domain.mastered + domain.known * 0.55 + domain.review * 0.2) / domain.total) * 100));
}

export function clampProgress(value: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((value / target) * 100));
}

export function formatPathStatus(status: LearningPathStage['status']): string {
  if (status === 'done') return 'Maîtrisé';
  if (status === 'active') return 'À faire';
  return 'Verrouillé';
}

export function formatQuizModeLabel(mode: string): string {
  if (mode === 'kana_arcade') return 'Quiz Kana';
  if (mode === 'adaptive_quiz') return 'Quiz JLPT';
  if (mode === 'global_quiz') return 'Quiz Global';
  if (mode === 'global_matching') return 'Associations globales';
  if (mode === 'grammar_quiz') return 'Quiz Grammaire';
  if (mode === 'grammar_matching') return 'Associations grammaire';
  if (mode === 'exam_mode') return 'Mode examen';
  return mode;
}

export function formatChartDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function calculateStudyStreak(days: DailyProgress[]): number {
  const studiedDays = new Set(days.filter((day) => day.attempts > 0).map((day) => day.day));
  const cursor = new Date();
  let streak = 0;

  for (let index = 0; index < 365; index += 1) {
    const key = cursor.toISOString().slice(0, 10);
    if (!studiedDays.has(key)) {
      break;
    }
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function formatSkillLabel(skill: string): string {
  return skill
    .replace(/^kana_arcade:/, 'Kana ')
    .replace(/^kana:/, 'Kana ')
    .replace(/:/g, ' · ')
    .replace(/_/g, ' ');
}

export function getLeagueTier(level: number): LeagueTier {
  return [...LEAGUE_TIERS].reverse().find((tier) => level >= tier.minLevel) ?? LEAGUE_TIERS[0];
}

export function getNextLeagueTier(level: number): LeagueTier | null {
  return LEAGUE_TIERS.find((tier) => tier.minLevel > level) ?? null;
}

export function getXpRequiredForLevel(level: number): number {
  if (level >= MAX_LEVEL) return 0;
  return Math.round(160 + level * 4 + Math.pow(level, 1.15) * 1.2);
}

export function getLevelProgressFromXp(totalXp: number) {
  let level = 1;
  let remainingXp = Math.max(0, Math.round(totalXp));
  while (level < MAX_LEVEL) {
    const required = getXpRequiredForLevel(level);
    if (remainingXp < required) break;
    remainingXp -= required;
    level += 1;
  }
  const requiredForCurrentLevel = getXpRequiredForLevel(level);
  return {
    level,
    xpCurrentLevel: level >= MAX_LEVEL ? requiredForCurrentLevel : remainingXp,
    xpRequiredForLevel: requiredForCurrentLevel,
    xpToNextLevel: level >= MAX_LEVEL ? 0 : Math.max(0, requiredForCurrentLevel - remainingXp),
  };
}

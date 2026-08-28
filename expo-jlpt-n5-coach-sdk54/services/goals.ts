import type { CoachQuest, DailyGoalDay, DailyGoalMetrics, GoalPeriod } from '../models';

export type GoalDefinition = {
  id: string;
  title: string;
  description: string;
  target: number;
  rewardXp: number;
  badgeCode: string;
  unit: string;
  period: GoalPeriod;
};

export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildDateRange(days: number, from = new Date()): string[] {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(from);
    date.setDate(from.getDate() + index);
    return formatDateKey(date);
  });
}

export function getWeekStart(date = new Date()): Date {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  return start;
}

export function getMonthStart(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function getGoalProgress(goalId: string, metrics: DailyGoalMetrics): number {
  if (goalId === 'daily-precision') return metrics.attempts >= 10 ? metrics.rate : 0;
  if (goalId === 'weekly-precision') return metrics.attempts >= 80 ? metrics.rate : 0;
  if (goalId === 'monthly-precision') return metrics.attempts >= 400 ? metrics.rate : 0;
  if (goalId === 'yearly-precision') return metrics.attempts >= 5000 ? metrics.rate : 0;
  if (goalId === 'daily-quiz') return metrics.quizAttempts + (metrics.grammarActivities ?? 0);
  if (goalId.startsWith('daily-') && goalId.includes('precision')) {
    const minimumAnswers = Number(goalId.match(/-m(\d+)-/)?.[1] ?? 10);
    return metrics.attempts >= minimumAnswers ? metrics.rate : 0;
  }
  if (goalId.startsWith('daily-') && (goalId.includes('quiz') || goalId.includes('session') || goalId.includes('grammar'))) {
    return metrics.quizAttempts + (metrics.grammarActivities ?? 0);
  }
  if (
    goalId.endsWith('questions') ||
    (goalId.startsWith('daily-') &&
      (goalId.includes('question') || goalId.includes('review') || goalId.includes('focus') || goalId.includes('endurance')))
  ) {
    return metrics.attempts;
  }
  if (goalId.endsWith('quiz')) return metrics.quizAttempts;
  if (goalId.endsWith('connection')) return metrics.activeDays ?? 0;
  return 0;
}

export function buildQuests(metrics: DailyGoalMetrics, definitions: GoalDefinition[]): CoachQuest[] {
  return definitions.map((goal) => ({
    id: goal.id,
    title: goal.title,
    description: goal.description,
    progress: getGoalProgress(goal.id, metrics),
    target: goal.target,
    reward: `+${goal.rewardXp} XP`,
    rewardXp: goal.rewardXp,
    badgeCode: goal.badgeCode,
    unit: goal.unit,
    period: goal.period,
  }));
}

export function isQuestComplete(quest: CoachQuest): boolean {
  return quest.progress >= quest.target;
}

export function getPerfectGoalDays(days: DailyGoalDay[]): number {
  return days.filter((day) => day.completed === day.total).length;
}

export function getActiveGoalDays(days: DailyGoalDay[]): number {
  return days.filter((day) => day.attempts > 0 || day.quizAttempts > 0 || (day.grammarActivities ?? 0) > 0).length;
}

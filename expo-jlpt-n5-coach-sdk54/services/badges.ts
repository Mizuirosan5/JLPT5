import type { BadgeDefinition, BadgeDifficulty, BadgeProgressContext, BadgeView } from '../models';
import { GRAMMAR_MAIN_MENUS } from '../data/grammarLessons';
import { BADGE_DEFINITIONS } from '../data/goalDefinitions';
import { getActiveGoalDays, getPerfectGoalDays } from './goals';
import { getMasteryDomain } from './progress';

function isBadgeUnlocked(badge: BadgeDefinition, context: BadgeProgressContext): boolean {
  const hiragana = getMasteryDomain(context.masteryDomains, 'hiragana');
  const katakana = getMasteryDomain(context.masteryDomains, 'katakana');
  const vocabulary = getMasteryDomain(context.masteryDomains, 'vocabulary');
  const grammar = getMasteryDomain(context.masteryDomains, 'grammar');
  const kanji = getMasteryDomain(context.masteryDomains, 'kanji');
  const perfectDays = getPerfectGoalDays(context.goalCalendar);
  const activeDays = getActiveGoalDays(context.goalCalendar);
  const kanaSeen = (hiragana?.attempted ?? 0) + (katakana?.attempted ?? 0);

  switch (badge.id) {
    case 'daily-keiko': return activeDays >= 10;
    case 'daily-seikaku': return activeDays >= 20;
    case 'daily-sho': return activeDays >= 50;
    case 'daily-100': return activeDays >= 100;
    case 'daily-200': return activeDays >= 200;
    case 'daily-365': return activeDays >= 365;
    case 'daily-triple': return perfectDays >= 10;
    case 'daily-week': return perfectDays >= 20;
    case 'daily-month': return perfectDays >= 50;
    case 'perfect-100': return perfectDays >= 100;
    case 'perfect-200': return perfectDays >= 200;
    case 'perfect-365': return perfectDays >= 365;
    case 'streak-3': return context.streakDays >= 10;
    case 'streak-7': return context.streakDays >= 20;
    case 'streak-30': return context.streakDays >= 50;
    case 'streak-100': return context.streakDays >= 100;
    case 'streak-365': return context.streakDays >= 365;
    case 'level-5': return context.level >= 5;
    case 'level-10': return context.level >= 10;
    case 'level-20': return context.level >= 20;
    case 'level-50': return context.level >= 50;
    case 'level-100': return context.level >= 100;
    case 'level-150': return context.level >= 150;
    case 'level-200': return context.level >= 200;
    case 'level-250': return context.level >= 250;

    case 'kana-first': return kanaSeen >= 50;
    case 'kana-25': return kanaSeen >= 100;
    case 'kana-50': return context.stats.attempts >= 250;
    case 'hiragana-10': return (hiragana?.mastered ?? 0) >= 30;
    case 'hiragana-46': return (hiragana?.mastered ?? 0) >= 46;
    case 'katakana-10': return (katakana?.mastered ?? 0) >= 30;
    case 'katakana-46': return (katakana?.mastered ?? 0) >= 46;
    case 'kana-combined': return context.stats.attempts >= 100 && context.quizSummary.kanaArcadeAttempts >= 5;

    case 'quiz-first': return context.stats.attempts >= 50;
    case 'quiz-100': return context.stats.attempts >= 100;
    case 'quiz-500': return context.stats.attempts >= 500;
    case 'quiz-accuracy-70': return context.stats.attempts >= 200 && context.stats.correctRate >= 75;
    case 'quiz-accuracy-85': return context.stats.attempts >= 500 && context.stats.correctRate >= 90;
    case 'quiz-score-1000': return context.quizSummary.bestScore >= 3000;
    case 'quiz-streak-5': return context.quizSummary.bestStreak >= 10;
    case 'quiz-streak-10': return context.quizSummary.bestStreak >= 20;

    case 'vocab-first': return (vocabulary?.mastered ?? 0) >= 1;
    case 'vocab-25': return (vocabulary?.mastered ?? 0) >= 25;
    case 'vocab-50': return (vocabulary?.mastered ?? 0) >= 50;
    case 'vocab-100': return (vocabulary?.mastered ?? 0) >= 100;
    case 'vocab-250': return (vocabulary?.mastered ?? 0) >= 250;
    case 'vocab-500': return (vocabulary?.mastered ?? 0) >= 500;
    case 'vocab-review-clear': return (vocabulary?.attempted ?? 0) >= 100 && (vocabulary?.review ?? 0) <= 10;
    case 'vocab-ready': return (vocabulary?.rate ?? 0) >= 70 && (vocabulary?.attempted ?? 0) >= 100;

    case 'grammar-first': return (grammar?.mastered ?? 0) >= 1;
    case 'grammar-particles': return (grammar?.attempted ?? 0) >= 10;
    case 'grammar-10': return (grammar?.mastered ?? 0) >= 10;
    case 'grammar-25': return (grammar?.mastered ?? 0) >= 25;
    case 'grammar-50': return (grammar?.mastered ?? 0) >= 50;
    case 'grammar-accuracy': return (grammar?.rate ?? 0) >= 80 && (grammar?.attempted ?? 0) >= 25;
    case 'grammar-review-clear': return (grammar?.attempted ?? 0) >= 50 && (grammar?.review ?? 0) <= 5;
    case 'grammar-ready': return (grammar?.rate ?? 0) >= 70 && (grammar?.attempted ?? 0) >= 50;
    case 'grammar-open-10': return context.grammarLessons.opened >= 10;
    case 'grammar-open-50': return context.grammarLessons.opened >= 50;
    case 'grammar-open-all': return context.grammarLessons.opened >= context.grammarLessons.total;
    case 'grammar-exercise-50': return context.grammarLessons.exerciseAttempts >= 50;
    case 'grammar-exercise-200': return context.grammarLessons.exerciseAttempts >= 200;
    case 'grammar-menus': return context.grammarLessons.menusOpened >= GRAMMAR_MAIN_MENUS.length;

    case 'kanji-first': return (kanji?.mastered ?? 0) >= 1;
    case 'kanji-10': return (kanji?.mastered ?? 0) >= 10;
    case 'kanji-40': return (kanji?.mastered ?? 0) >= 40;
    case 'kanji-80': return (kanji?.mastered ?? 0) >= 80;

    case 'jlpt-first-exam': return context.quizSummary.examAttempts > 0;
    case 'jlpt-readiness-50': return context.stats.correctRate >= 50 && context.stats.attempts >= 50;
    case 'jlpt-readiness-75': return context.stats.correctRate >= 75 && context.stats.attempts >= 100;
    case 'jlpt-readiness-90': return context.stats.correctRate >= 90 && context.stats.attempts >= 200;
    case 'year-questions': return context.stats.attempts >= 10000;
    case 'year-quiz': return context.quizSummary.kanaArcadeAttempts + context.quizSummary.adaptiveAttempts + context.quizSummary.examAttempts >= 250;
    case 'year-precision': return context.stats.attempts >= 5000 && context.stats.correctRate >= 90;
    default:
      return false;
  }
}

function getBadgeDifficulty(badge: BadgeDefinition): BadgeDifficulty {
  if (
    badge.id.includes('365') ||
    badge.id.includes('year') ||
    badge.id === 'level-200' ||
    badge.id === 'level-250' ||
    badge.id === 'kanji-80' ||
    badge.id === 'jlpt-readiness-90'
  ) {
    return 'legendaire';
  }
  if (
    badge.id.includes('200') ||
    badge.id.includes('500') ||
    badge.id === 'level-100' ||
    badge.id === 'level-150' ||
    badge.id === 'level-50' ||
    badge.id === 'perfect-200' ||
    badge.id === 'streak-100' ||
    badge.id === 'vocab-ready' ||
    badge.id === 'grammar-ready' ||
    badge.id === 'grammar-open-all' ||
    badge.id === 'grammar-exercise-200'
  ) {
    return 'expert';
  }
  if (
    badge.id.includes('100') ||
    badge.id === 'daily-sho' ||
    badge.id === 'daily-month' ||
    badge.id === 'streak-30' ||
    badge.id === 'level-20' ||
    badge.id === 'kana-50' ||
    badge.id === 'quiz-500' ||
    badge.id === 'quiz-score-1000' ||
    badge.id === 'quiz-accuracy-85' ||
    badge.id === 'vocab-250' ||
    badge.id === 'grammar-50' ||
    badge.id === 'grammar-open-50' ||
    badge.id === 'grammar-exercise-50' ||
    badge.id === 'grammar-menus' ||
    badge.id === 'kanji-40' ||
    badge.id === 'jlpt-readiness-75'
  ) {
    return 'difficile';
  }
  if (
    badge.id.includes('50') ||
    badge.id === 'daily-seikaku' ||
    badge.id === 'daily-week' ||
    badge.id === 'streak-7' ||
    badge.id === 'level-10' ||
    badge.id === 'kana-25' ||
    badge.id === 'hiragana-46' ||
    badge.id === 'katakana-46' ||
    badge.id === 'quiz-100' ||
    badge.id === 'quiz-accuracy-70' ||
    badge.id === 'quiz-streak-10' ||
    badge.id === 'vocab-100' ||
    badge.id === 'grammar-25' ||
    badge.id === 'kanji-10' ||
    badge.id === 'jlpt-readiness-50'
  ) {
    return 'moyen';
  }
  return 'facile';
}

export function getBadgeGate(difficulty: BadgeDifficulty): { requiredLevel: number; requiredBadges: number } {
  if (difficulty === 'moyen') return { requiredLevel: 8, requiredBadges: 5 };
  if (difficulty === 'difficile') return { requiredLevel: 18, requiredBadges: 14 };
  if (difficulty === 'expert') return { requiredLevel: 40, requiredBadges: 28 };
  if (difficulty === 'legendaire') return { requiredLevel: 70, requiredBadges: 45 };
  return { requiredLevel: 1, requiredBadges: 0 };
}

export function buildBadgeViews(context: BadgeProgressContext): BadgeView[] {
  const baseUnlockedIds = BADGE_DEFINITIONS
    .filter((badge) => isBadgeUnlocked(badge, context))
    .map((badge) => badge.id);
  const baseUnlockedCount = baseUnlockedIds.length;

  return BADGE_DEFINITIONS.map((badge) => {
    const difficulty = getBadgeDifficulty(badge);
    const gate = getBadgeGate(difficulty);
    const baseUnlocked = baseUnlockedIds.includes(badge.id);
    const gateLocked = context.level < gate.requiredLevel || baseUnlockedCount < gate.requiredBadges;
    return {
      ...badge,
      difficulty,
      requiredLevel: gate.requiredLevel,
      requiredBadges: gate.requiredBadges,
      baseUnlocked,
      gateLocked,
      unlocked: baseUnlocked && !gateLocked,
    };
  });
}

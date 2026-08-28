export type AptitudeAssessmentLevel = 1 | 2 | 3;

export type AptitudeAssessmentQuestion = {
  id: string;
  level: AptitudeAssessmentLevel;
  domain: string;
  answer: string;
};

export type AptitudeLevelMetric = {
  level: AptitudeAssessmentLevel;
  correct: number;
  total: number;
  rate: number;
};

export type AptitudeDomainMetric = {
  domain: string;
  correct: number;
  total: number;
  rate: number;
};

const LEVEL_WEIGHTS: Record<AptitudeAssessmentLevel, number> = { 1: 1, 2: 1.5, 3: 2 };

export function calculateAptitudeMetrics(
  questions: AptitudeAssessmentQuestion[],
  answers: Record<string, string>,
) {
  const completed = questions.filter((question) => answers[question.id] !== undefined);
  const correct = completed.filter((question) => answers[question.id] === question.answer).length;
  const weightedMaximum = questions.reduce((sum, question) => sum + LEVEL_WEIGHTS[question.level], 0);
  const weightedCorrect = questions.reduce(
    (sum, question) => sum + (answers[question.id] === question.answer ? LEVEL_WEIGHTS[question.level] : 0),
    0,
  );
  const rawScore = questions.length ? Math.round((correct / questions.length) * 100) : 0;
  const weightedScore = weightedMaximum ? Math.round((weightedCorrect / weightedMaximum) * 100) : 0;
  const completionRate = questions.length ? Math.round((completed.length / questions.length) * 100) : 0;
  const levelRows = ([1, 2, 3] as AptitudeAssessmentLevel[]).map((level) => {
    const rows = questions.filter((question) => question.level === level);
    const levelCorrect = rows.filter((question) => answers[question.id] === question.answer).length;
    return {
      level,
      correct: levelCorrect,
      total: rows.length,
      rate: rows.length ? Math.round((levelCorrect / rows.length) * 100) : 0,
    };
  });
  const domains = Array.from(new Set(questions.map((question) => question.domain)));
  const domainRows = domains.map((domain) => {
    const rows = questions.filter((question) => question.domain === domain);
    const domainCorrect = rows.filter((question) => answers[question.id] === question.answer).length;
    const domainMaximum = rows.reduce((sum, question) => sum + LEVEL_WEIGHTS[question.level], 0);
    const domainWeightedCorrect = rows.reduce(
      (sum, question) => sum + (answers[question.id] === question.answer ? LEVEL_WEIGHTS[question.level] : 0),
      0,
    );
    return {
      domain,
      correct: domainCorrect,
      total: rows.length,
      rate: domainMaximum ? Math.round((domainWeightedCorrect / domainMaximum) * 100) : 0,
    };
  });
  return { rawScore, weightedScore, completionRate, levelRows, domainRows };
}

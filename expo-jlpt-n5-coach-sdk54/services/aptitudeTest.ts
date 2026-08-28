import type { SQLiteDatabase } from 'expo-sqlite';
import { applyDiagnosticCurriculumPlacement } from './curriculum';
import type { AptitudeLevelMetric } from './aptitudeAssessment';

type AptitudeDomainRow = {
  domain: string;
  correct: number;
  total: number;
  rate: number;
  comment: string;
};

export type AptitudeReportSnapshot = {
  score: number;
  rawScore: number;
  completionRate: number;
  globalLabel: string;
  summary: string;
  domainRows: AptitudeDomainRow[];
  levelRows: AptitudeLevelMetric[];
  strengths: string[];
  priorities: string[];
  maintenance: string[];
  estimatedLevel: string;
  levelAdvice: string;
  level3Rate: number;
  difficultyAdvice: string;
  recommendedModules: string[];
  sevenDayPlan: string[];
  thirtyDayPlan: string[];
};

export type AptitudeResultSnapshot = {
  id: string;
  score: number;
  level3Rate: number;
  estimatedLevel: string;
  globalLabel: string;
  recommendedModule: string;
  weakestDomain: string;
  strongestDomain: string;
  answers: Record<string, string>;
  report: AptitudeReportSnapshot;
  createdAt: string;
};

export async function saveAptitudeResult(
  db: SQLiteDatabase,
  answers: Record<string, string>,
  report: AptitudeReportSnapshot
) {
  const weakestDomain = [...report.domainRows].sort((a, b) => a.rate - b.rate)[0]?.domain ?? '';
  const strongestDomain = [...report.domainRows].sort((a, b) => b.rate - a.rate)[0]?.domain ?? '';
  const recommendedModule = report.recommendedModules[0] ?? '';
  await db.runAsync(
    `
    INSERT INTO app_aptitude_result (
      id, score, level3_rate, estimated_level, global_label,
      recommended_module, weakest_domain, strongest_domain,
      answers_json, report_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `,
    `${Date.now()}-${Math.random()}`,
    report.score,
    report.level3Rate,
    report.estimatedLevel,
    report.globalLabel,
    recommendedModule,
    weakestDomain,
    strongestDomain,
    JSON.stringify(answers),
    JSON.stringify(report)
  );
  await applyDiagnosticCurriculumPlacement(db, report.score);
}

export async function loadLatestAptitudeResult(db: SQLiteDatabase): Promise<AptitudeResultSnapshot | null> {
  const row = await db.getFirstAsync<{
    id: string;
    score: number;
    level3_rate: number;
    estimated_level: string;
    global_label: string;
    recommended_module: string;
    weakest_domain: string;
    strongest_domain: string;
    answers_json: string;
    report_json: string;
    created_at: string;
  }>(`
    SELECT
      id, score, level3_rate, estimated_level, global_label,
      recommended_module, weakest_domain, strongest_domain,
      answers_json, report_json, created_at
    FROM app_aptitude_result
    ORDER BY datetime(created_at) DESC
    LIMIT 1
  `);

  if (!row) return null;
  const answers = parseJsonObject(row.answers_json);
  const report = normalizeAptitudeReport(parseJsonObject(row.report_json), row);
  return {
    id: row.id,
    score: row.score,
    level3Rate: row.level3_rate,
    estimatedLevel: row.estimated_level,
    globalLabel: row.global_label,
    recommendedModule: row.recommended_module,
    weakestDomain: row.weakest_domain,
    strongestDomain: row.strongest_domain,
    answers: Object.fromEntries(Object.entries(answers).map(([key, value]) => [key, String(value ?? '')])),
    report,
    createdAt: row.created_at,
  };
}

function parseJsonObject(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function normalizeAptitudeReport(
  value: Record<string, unknown>,
  row: {
    score: number;
    level3_rate: number;
    estimated_level: string;
    global_label: string;
    weakest_domain: string;
    recommended_module: string;
  }
): AptitudeReportSnapshot {
  const domainRows = Array.isArray(value.domainRows)
    ? value.domainRows.filter((item): item is AptitudeDomainRow => {
        if (!item || typeof item !== 'object') return false;
        const candidate = item as Partial<AptitudeDomainRow>;
        return typeof candidate.domain === 'string' && typeof candidate.rate === 'number';
      })
    : [];
  return {
    score: typeof value.score === 'number' ? value.score : row.score,
    rawScore: typeof value.rawScore === 'number' ? value.rawScore : row.score,
    completionRate: typeof value.completionRate === 'number' ? value.completionRate : 100,
    globalLabel: typeof value.globalLabel === 'string' ? value.globalLabel : row.global_label,
    summary: typeof value.summary === 'string' ? value.summary : 'Rapport restaure depuis une version precedente.',
    domainRows,
    levelRows: Array.isArray(value.levelRows)
      ? value.levelRows.filter((item): item is AptitudeLevelMetric => {
          if (!item || typeof item !== 'object') return false;
          const candidate = item as Partial<AptitudeLevelMetric>;
          return (candidate.level === 1 || candidate.level === 2 || candidate.level === 3)
            && typeof candidate.rate === 'number'
            && typeof candidate.correct === 'number'
            && typeof candidate.total === 'number';
        })
      : [],
    strengths: stringArray(value.strengths),
    priorities: stringArray(value.priorities),
    maintenance: stringArray(value.maintenance),
    estimatedLevel: typeof value.estimatedLevel === 'string' ? value.estimatedLevel : row.estimated_level,
    levelAdvice: typeof value.levelAdvice === 'string' ? value.levelAdvice : '',
    level3Rate: typeof value.level3Rate === 'number' ? value.level3Rate : row.level3_rate,
    difficultyAdvice: typeof value.difficultyAdvice === 'string' ? value.difficultyAdvice : '',
    recommendedModules: stringArray(value.recommendedModules).length
      ? stringArray(value.recommendedModules)
      : [row.recommended_module].filter(Boolean),
    sevenDayPlan: stringArray(value.sevenDayPlan),
    thirtyDayPlan: stringArray(value.thirtyDayPlan),
  };
}

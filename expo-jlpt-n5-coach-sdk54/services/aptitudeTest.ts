import type { SQLiteDatabase } from 'expo-sqlite';

type AptitudeDomainRow = {
  domain: string;
  correct: number;
  total: number;
  rate: number;
  comment: string;
};

export type AptitudeReportSnapshot = {
  score: number;
  globalLabel: string;
  summary: string;
  domainRows: AptitudeDomainRow[];
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
  return {
    id: row.id,
    score: row.score,
    level3Rate: row.level3_rate,
    estimatedLevel: row.estimated_level,
    globalLabel: row.global_label,
    recommendedModule: row.recommended_module,
    weakestDomain: row.weakest_domain,
    strongestDomain: row.strongest_domain,
    answers: JSON.parse(row.answers_json),
    report: JSON.parse(row.report_json),
    createdAt: row.created_at,
  };
}

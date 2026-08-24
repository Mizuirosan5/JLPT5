import type { SQLiteDatabase } from 'expo-sqlite';

export type TechnicalLogLevel = 'info' | 'warning' | 'error';

export type TechnicalLogEntry = {
  id: string;
  level: TechnicalLogLevel;
  scope: string;
  message: string;
  detail: string | null;
  created_at: string;
};

const MAX_TECHNICAL_LOG_ROWS = 80;

export async function recordTechnicalLog(
  db: SQLiteDatabase,
  level: TechnicalLogLevel,
  scope: string,
  message: string,
  detail?: unknown
): Promise<void> {
  try {
    await db.runAsync(
      `
      INSERT INTO app_technical_log (id, level, scope, message, detail, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
      `,
      `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      level,
      scope,
      message,
      formatDetail(detail)
    );
    await db.execAsync(`
      DELETE FROM app_technical_log
      WHERE id NOT IN (
        SELECT id
        FROM app_technical_log
        ORDER BY created_at DESC
        LIMIT ${MAX_TECHNICAL_LOG_ROWS}
      )
    `);
  } catch (logError) {
    console.warn('Unable to record technical log', logError);
  }
}

export async function loadRecentTechnicalLogs(db: SQLiteDatabase, limit = 20): Promise<TechnicalLogEntry[]> {
  return db.getAllAsync<TechnicalLogEntry>(
    `
    SELECT id, level, scope, message, detail, created_at
    FROM app_technical_log
    ORDER BY created_at DESC
    LIMIT ?
    `,
    Math.max(1, Math.min(limit, MAX_TECHNICAL_LOG_ROWS))
  );
}

function formatDetail(detail: unknown): string | null {
  if (detail == null) return null;
  if (detail instanceof Error) {
    return JSON.stringify({ name: detail.name, message: detail.message, stack: detail.stack?.slice(0, 1200) });
  }
  if (typeof detail === 'string') return detail.slice(0, 2000);
  try {
    return JSON.stringify(detail).slice(0, 2000);
  } catch {
    return String(detail).slice(0, 2000);
  }
}

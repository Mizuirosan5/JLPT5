import { DATABASE_NAME, SCHEMA_VERSION, USER_DATA_TABLES } from './databaseSchema';

export const BACKUP_FORMAT = 'coach-japonais-n5-local-backup';
export const BACKUP_VERSION = 1;

export type LocalBackupPayload = {
  format: typeof BACKUP_FORMAT;
  version: number;
  databaseName: string;
  schemaVersion: number;
  exportedAt: string;
  tables: Record<string, Array<Record<string, unknown>>>;
};

export type LocalBackupSummary = {
  exportedAt: string;
  tableCounts: Record<string, number>;
  totalRows: number;
};

export function summarizeLocalBackup(payload: LocalBackupPayload): LocalBackupSummary {
  const tableCounts = Object.fromEntries(
    Object.entries(payload.tables).map(([tableName, rows]) => [tableName, Array.isArray(rows) ? rows.length : 0])
  );
  return {
    exportedAt: payload.exportedAt,
    tableCounts,
    totalRows: Object.values(tableCounts).reduce((sum, count) => sum + count, 0),
  };
}

export function validateLocalBackup(payload: unknown): LocalBackupPayload {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Sauvegarde invalide: objet JSON attendu.');
  }
  const candidate = payload as Partial<LocalBackupPayload>;
  if (candidate.format !== BACKUP_FORMAT) {
    throw new Error('Sauvegarde invalide: format non reconnu.');
  }
  if (candidate.version !== BACKUP_VERSION) {
    throw new Error('Sauvegarde invalide: version de sauvegarde non supportee.');
  }
  const schemaVersion = candidate.schemaVersion;
  if (!Number.isInteger(schemaVersion) || schemaVersion == null || schemaVersion > SCHEMA_VERSION) {
    throw new Error('Sauvegarde trop recente pour cette version de l application.');
  }
  if (typeof candidate.exportedAt !== 'string' || Number.isNaN(Date.parse(candidate.exportedAt))) {
    throw new Error('Sauvegarde invalide: date exportee absente ou illisible.');
  }
  if (!candidate.tables || typeof candidate.tables !== 'object') {
    throw new Error('Sauvegarde invalide: tables utilisateur absentes.');
  }
  const normalizedTables: LocalBackupPayload['tables'] = {};
  for (const tableName of USER_DATA_TABLES) {
    const rows = candidate.tables[tableName];
    if (rows == null) {
      normalizedTables[tableName] = [];
      continue;
    }
    if (!Array.isArray(rows) || rows.some((row) => !row || typeof row !== 'object' || Array.isArray(row))) {
      throw new Error(`Sauvegarde invalide: table ${tableName} corrompue.`);
    }
    normalizedTables[tableName] = rows as Array<Record<string, unknown>>;
  }
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    databaseName: typeof candidate.databaseName === 'string' ? candidate.databaseName : DATABASE_NAME,
    schemaVersion,
    exportedAt: candidate.exportedAt,
    tables: normalizedTables,
  };
}

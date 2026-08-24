import type { SQLiteDatabase } from 'expo-sqlite';
import { DATABASE_NAME, SCHEMA_VERSION, USER_DATA_TABLES } from './databaseSchema';
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  summarizeLocalBackup,
  validateLocalBackup,
  type LocalBackupPayload,
  type LocalBackupSummary,
} from './localBackupFormat';

export { summarizeLocalBackup, validateLocalBackup } from './localBackupFormat';
export type { LocalBackupPayload, LocalBackupSummary } from './localBackupFormat';
const LOCAL_BACKUP_METADATA_KEY = 'latest_local_backup_json';

export async function exportLocalBackup(db: SQLiteDatabase): Promise<LocalBackupPayload> {
  const tables: LocalBackupPayload['tables'] = {};
  for (const tableName of USER_DATA_TABLES) {
    if (!(await tableExists(db, tableName))) {
      tables[tableName] = [];
      continue;
    }
    tables[tableName] = await db.getAllAsync<Record<string, unknown>>(`SELECT * FROM ${quoteIdentifier(tableName)}`);
  }

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    databaseName: DATABASE_NAME,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    tables,
  };
}

export async function createLocalBackupSnapshot(db: SQLiteDatabase): Promise<LocalBackupSummary> {
  const payload = await exportLocalBackup(db);
  await db.runAsync(
    `
    INSERT INTO app_local_metadata (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
    `,
    LOCAL_BACKUP_METADATA_KEY,
    JSON.stringify(payload)
  );
  return summarizeLocalBackup(payload);
}

export async function restoreLatestLocalBackupSnapshot(db: SQLiteDatabase): Promise<LocalBackupSummary | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_local_metadata WHERE key = ?',
    LOCAL_BACKUP_METADATA_KEY
  );
  if (!row?.value) return null;
  return importLocalBackup(db, JSON.parse(row.value));
}

export async function importLocalBackup(db: SQLiteDatabase, payload: unknown): Promise<LocalBackupSummary> {
  const backup = validateLocalBackup(payload);
  await db.withTransactionAsync(async () => {
    for (const tableName of USER_DATA_TABLES) {
      const rows = backup.tables[tableName] ?? [];
      if (!rows.length || !(await tableExists(db, tableName))) continue;
      const targetColumns = await getColumnNames(db, tableName);
      for (const row of rows) {
        const columns = Object.keys(row).filter((columnName) => targetColumns.has(columnName));
        if (!columns.length) continue;
        const values = columns.map((columnName) => row[columnName] as SQLiteValue);
        await db.runAsync(
          `
          INSERT OR REPLACE INTO ${quoteIdentifier(tableName)} (${columns.map(quoteIdentifier).join(', ')})
          VALUES (${columns.map(() => '?').join(', ')})
          `,
          ...values
        );
      }
    }
  });
  return summarizeLocalBackup(backup);
}

export async function deleteAllUserData(db: SQLiteDatabase): Promise<LocalBackupSummary> {
  const before = await exportLocalBackup(db);
  await db.withTransactionAsync(async () => {
    for (const tableName of USER_DATA_TABLES) {
      if (await tableExists(db, tableName)) {
        await db.execAsync(`DELETE FROM ${quoteIdentifier(tableName)}`);
      }
    }
  });
  return summarizeLocalBackup(before);
}

async function tableExists(db: SQLiteDatabase, tableName: string): Promise<boolean> {
  const row = await db.getFirstAsync<{ name: string }>(
    `
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name = ?
    `,
    tableName
  );
  return !!row;
}

async function getColumnNames(db: SQLiteDatabase, tableName: string): Promise<Set<string>> {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${quoteSqlString(tableName)})`);
  return new Set(columns.map((column) => column.name));
}

type SQLiteValue = string | number | null;

function quoteIdentifier(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function quoteSqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

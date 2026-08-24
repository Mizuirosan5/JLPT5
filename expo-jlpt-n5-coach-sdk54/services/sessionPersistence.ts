import type { SQLiteDatabase } from 'expo-sqlite';

export type PersistedSession<T> = {
  version: 1;
  savedAt: string;
  payload: T;
};

export async function saveSession<T>(db: SQLiteDatabase, key: string, payload: T): Promise<void> {
  const session: PersistedSession<T> = { version: 1, savedAt: new Date().toISOString(), payload };
  await db.runAsync(
    `
    INSERT INTO app_session_state (session_key, payload_json, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(session_key) DO UPDATE SET
      payload_json = excluded.payload_json,
      updated_at = excluded.updated_at
    `,
    key,
    JSON.stringify(session)
  );
}

export async function loadSession<T>(db: SQLiteDatabase, key: string, maxAgeDays = 7): Promise<T | null> {
  const row = await db.getFirstAsync<{ payload_json: string }>(
    'SELECT payload_json FROM app_session_state WHERE session_key = ?',
    key
  );
  if (!row?.payload_json) return null;
  try {
    const session = JSON.parse(row.payload_json) as Partial<PersistedSession<T>>;
    if (session.version !== 1 || typeof session.savedAt !== 'string' || session.payload == null) {
      await clearSession(db, key);
      return null;
    }
    const savedAt = Date.parse(session.savedAt);
    if (!Number.isFinite(savedAt) || Date.now() - savedAt > maxAgeDays * 86_400_000) {
      await clearSession(db, key);
      return null;
    }
    return session.payload;
  } catch {
    await clearSession(db, key);
    return null;
  }
}

export async function clearSession(db: SQLiteDatabase, key: string): Promise<void> {
  await db.runAsync('DELETE FROM app_session_state WHERE session_key = ?', key);
}

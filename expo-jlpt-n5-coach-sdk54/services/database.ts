import { SQLiteDatabase, openDatabaseAsync } from 'expo-sqlite';
import { CORE_AUDIO_PACK } from '../data/audioPack';
import { DATABASE_NAME, LEGACY_DATABASE_NAME, SCHEMA_VERSION, USER_DATA_TABLES } from './databaseSchema';
import { assertMigrationCounts, getCommonMigrationColumns } from './databaseMigration';

export { DATABASE_NAME, LEGACY_DATABASE_NAME, SCHEMA_VERSION, USER_DATA_TABLES } from './databaseSchema';
const LEGACY_V7_MIGRATION_KEY = 'migration_v7_to_v8_user_data';
const AUDIO_PACK_SEED_KEY = 'core_audio_pack_seed_version';
const AUDIO_PACK_SEED_VERSION = `v2:${CORE_AUDIO_PACK.length}`;

export async function initializeDatabase(db: SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS app_local_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_migration_log (
      id TEXT PRIMARY KEY,
      from_database TEXT NOT NULL,
      to_database TEXT NOT NULL,
      status TEXT NOT NULL,
      detail_json TEXT NOT NULL,
      started_at TEXT NOT NULL,
      finished_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_technical_log (
      id TEXT PRIMARY KEY,
      level TEXT NOT NULL,
      scope TEXT NOT NULL,
      message TEXT NOT NULL,
      detail TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_question_attempt_local (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL,
      source_mode TEXT NOT NULL,
      selected_answer TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      is_correct INTEGER NOT NULL,
      skill_id TEXT NOT NULL,
      answered_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_kana_card_state (
      kana_id TEXT PRIMARY KEY,
      favorite INTEGER NOT NULL DEFAULT 0,
      review INTEGER NOT NULL DEFAULT 0,
      mastered INTEGER NOT NULL DEFAULT 0,
      seen_count INTEGER NOT NULL DEFAULT 0,
      correct_count INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_kana_mnemonic_local (
      kana_id TEXT PRIMARY KEY,
      note TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_vocabulary_card_state (
      card_id TEXT PRIMARY KEY,
      favorite INTEGER NOT NULL DEFAULT 0,
      review INTEGER NOT NULL DEFAULT 0,
      seen_count INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_lookup_favorite_local (
      item_id TEXT NOT NULL,
      item_type TEXT NOT NULL,
      favorite INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (item_id, item_type)
    );

    CREATE TABLE IF NOT EXISTS app_kana_time_record (
      id TEXT PRIMARY KEY,
      script TEXT NOT NULL,
      practice_mode TEXT NOT NULL,
      quiz_size INTEGER NOT NULL,
      include_combined INTEGER NOT NULL,
      total_count INTEGER NOT NULL,
      correct_count INTEGER NOT NULL,
      elapsed_ms INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_kana_arcade_score (
      id TEXT PRIMARY KEY,
      quiz_size INTEGER NOT NULL,
      score INTEGER NOT NULL,
      elapsed_ms INTEGER NOT NULL,
      correct_count INTEGER NOT NULL,
      total_count INTEGER NOT NULL,
      best_streak INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_daily_goal_plan (
      day TEXT NOT NULL,
      goal_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      target INTEGER NOT NULL,
      reward_xp INTEGER NOT NULL,
      badge_code TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (day, goal_id)
    );

    CREATE TABLE IF NOT EXISTS app_daily_reward_claim (
      day TEXT NOT NULL,
      goal_id TEXT NOT NULL,
      reward_xp INTEGER NOT NULL,
      badge_code TEXT NOT NULL,
      claimed_at TEXT NOT NULL,
      PRIMARY KEY (day, goal_id)
    );

    CREATE TABLE IF NOT EXISTS app_user_learning_preferences (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_srs_item_state (
      item_id TEXT NOT NULL,
      item_type TEXT NOT NULL,
      status TEXT NOT NULL,
      ease REAL NOT NULL DEFAULT 2.5,
      interval_days INTEGER NOT NULL DEFAULT 0,
      due_at TEXT NOT NULL,
      last_reviewed_at TEXT,
      attempts INTEGER NOT NULL DEFAULT 0,
      correct INTEGER NOT NULL DEFAULT 0,
      wrong_streak INTEGER NOT NULL DEFAULT 0,
      correct_streak INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (item_id, item_type)
    );

    CREATE TABLE IF NOT EXISTS app_error_flashcard (
      id TEXT PRIMARY KEY,
      source_question_id TEXT NOT NULL,
      source_mode TEXT NOT NULL,
      item_type TEXT NOT NULL,
      prompt TEXT NOT NULL,
      japanese TEXT,
      translation TEXT,
      expected_answer TEXT NOT NULL,
      selected_answer TEXT,
      explanation TEXT,
      archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(source_question_id, expected_answer)
    );

    CREATE TABLE IF NOT EXISTS app_aptitude_result (
      id TEXT PRIMARY KEY,
      score INTEGER NOT NULL,
      level3_rate INTEGER NOT NULL,
      estimated_level TEXT NOT NULL,
      global_label TEXT NOT NULL,
      recommended_module TEXT,
      weakest_domain TEXT,
      strongest_domain TEXT,
      answers_json TEXT NOT NULL,
      report_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_content_progress (
      content_id TEXT NOT NULL,
      content_type TEXT NOT NULL,
      opened_count INTEGER NOT NULL DEFAULT 0,
      completed INTEGER NOT NULL DEFAULT 0,
      correct_count INTEGER NOT NULL DEFAULT 0,
      total_count INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (content_id, content_type)
    );

    CREATE TABLE IF NOT EXISTS app_local_league_season (
      season_key TEXT PRIMARY KEY,
      league_name TEXT NOT NULL,
      division TEXT NOT NULL,
      xp_start INTEGER NOT NULL,
      xp_current INTEGER NOT NULL,
      active_days INTEGER NOT NULL DEFAULT 0,
      promoted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_grammar_lesson_state (
      lesson_id TEXT PRIMARY KEY,
      opened_count INTEGER NOT NULL DEFAULT 0,
      completed INTEGER NOT NULL DEFAULT 0,
      exercise_attempts INTEGER NOT NULL DEFAULT 0,
      exercise_correct INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_writing_journal_entry (
      id TEXT PRIMARY KEY,
      prompt_id TEXT NOT NULL,
      prompt_title TEXT NOT NULL,
      prompt_fr TEXT NOT NULL,
      user_text TEXT NOT NULL,
      detected_words_json TEXT NOT NULL,
      suggestions_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_session_state (
      session_key TEXT PRIMARY KEY,
      payload_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_wallet (
      currency TEXT PRIMARY KEY,
      balance INTEGER NOT NULL CHECK(balance >= 0),
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_reward_ledger (
      id TEXT PRIMARY KEY,
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(source_type, source_id)
    );

    CREATE TABLE IF NOT EXISTS app_cosmetic_inventory (
      cosmetic_id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      acquired_at TEXT NOT NULL,
      equipped INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS app_audio_asset (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      japanese TEXT NOT NULL,
      kana TEXT,
      romaji TEXT,
      meaning_fr TEXT NOT NULL,
      asset_kind TEXT NOT NULL DEFAULT 'tts_local',
      asset_path TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_question_attempt_answered_at
      ON app_question_attempt_local(answered_at);
    CREATE INDEX IF NOT EXISTS idx_question_attempt_source_mode
      ON app_question_attempt_local(source_mode);
    CREATE INDEX IF NOT EXISTS idx_question_attempt_skill_id
      ON app_question_attempt_local(skill_id);
    CREATE INDEX IF NOT EXISTS idx_question_attempt_question_id
      ON app_question_attempt_local(question_id);
    CREATE INDEX IF NOT EXISTS idx_kana_arcade_created_at
      ON app_kana_arcade_score(created_at);
    CREATE INDEX IF NOT EXISTS idx_daily_goal_plan_day
      ON app_daily_goal_plan(day);
    CREATE INDEX IF NOT EXISTS idx_daily_reward_claim_day
      ON app_daily_reward_claim(day);
    CREATE INDEX IF NOT EXISTS idx_technical_log_created_at
      ON app_technical_log(created_at);
    CREATE INDEX IF NOT EXISTS idx_session_state_updated_at
      ON app_session_state(updated_at);
    CREATE INDEX IF NOT EXISTS idx_reward_ledger_created_at
      ON app_reward_ledger(created_at);
    CREATE INDEX IF NOT EXISTS idx_cosmetic_inventory_category
      ON app_cosmetic_inventory(category, equipped);
  `);

  await migrateLegacyV7UserData(db);

  await ensureColumns(db, 'app_audio_asset', [
    ['category', "TEXT NOT NULL DEFAULT 'core'"],
    ['japanese', "TEXT NOT NULL DEFAULT ''"],
    ['kana', 'TEXT'],
    ['romaji', 'TEXT'],
    ['meaning_fr', "TEXT NOT NULL DEFAULT ''"],
    ['asset_kind', "TEXT NOT NULL DEFAULT 'tts_local'"],
    ['asset_path', 'TEXT'],
    ['created_at', "TEXT NOT NULL DEFAULT ''"],
  ]);
  await ensureSrsItemStateSchema(db);
  await ensureErrorFlashcardSchema(db);
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_srs_due
      ON app_srs_item_state(due_at, status);
    CREATE INDEX IF NOT EXISTS idx_srs_item
      ON app_srs_item_state(item_id, item_type);
    CREATE INDEX IF NOT EXISTS idx_error_flashcard_archived
      ON app_error_flashcard(archived);
    CREATE INDEX IF NOT EXISTS idx_audio_category
      ON app_audio_asset(category);
  `);

  const audioAssetColumns = await getColumnNames(db, 'app_audio_asset');
  const hasLegacyAudioInventoryColumns =
    audioAssetColumns.has('source_id') && audioAssetColumns.has('zip_path') && audioAssetColumns.has('entry_name');

  const existingAudioSeed = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_local_metadata WHERE key = ?',
    AUDIO_PACK_SEED_KEY
  );
  if (existingAudioSeed?.value !== AUDIO_PACK_SEED_VERSION) {
    for (const item of CORE_AUDIO_PACK) {
    if (hasLegacyAudioInventoryColumns) {
      await db.runAsync(
        `
        INSERT INTO app_audio_asset (
          id, source_id, zip_path, entry_name, file_size_bytes, compressed_size_bytes, module, rights_status,
          category, japanese, kana, romaji, meaning_fr, asset_kind, asset_path, created_at
        ) VALUES (?, ?, 'core_audio_pack', ?, 0, NULL, 'core_audio_pack', 'local_tts', ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          category = excluded.category,
          japanese = excluded.japanese,
          kana = excluded.kana,
          romaji = excluded.romaji,
          meaning_fr = excluded.meaning_fr,
          asset_kind = excluded.asset_kind,
          asset_path = excluded.asset_path
        `,
        item.id,
        item.id,
        item.id,
        item.category,
        item.japanese,
        item.kana,
        item.romaji ?? null,
        item.meaningFr,
        item.assetKind ?? 'tts_local',
        item.assetPath ?? null
      );
    } else {
      await db.runAsync(
        `
        INSERT INTO app_audio_asset (
          id, category, japanese, kana, romaji, meaning_fr, asset_kind, asset_path, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          category = excluded.category,
          japanese = excluded.japanese,
          kana = excluded.kana,
          romaji = excluded.romaji,
          meaning_fr = excluded.meaning_fr,
          asset_kind = excluded.asset_kind,
          asset_path = excluded.asset_path
        `,
        item.id,
        item.category,
        item.japanese,
        item.kana,
        item.romaji ?? null,
        item.meaningFr,
        item.assetKind ?? 'tts_local',
        item.assetPath ?? null
      );
    }
    }

    await db.runAsync(
      `
      INSERT INTO app_local_metadata (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
      `,
      AUDIO_PACK_SEED_KEY,
      AUDIO_PACK_SEED_VERSION
    );
  }

  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  await setMetadataValue(db, 'schema_version', String(SCHEMA_VERSION));
  await repairCanonicalVocabulary(db);
  await checkDatabaseIntegrity(db);
}

async function repairCanonicalVocabulary(db: SQLiteDatabase): Promise<void> {
  const tables = await getExistingTables(db, ['canonical_vocabulary']);
  if (!tables.includes('canonical_vocabulary')) return;

  await db.runAsync(
    `UPDATE canonical_vocabulary
     SET japanese = ?, kana = ?, kanji = NULL, romaji = ?, meaning_fr = ?, theme = ?
     WHERE id = ?`,
    'つくえ',
    'つくえ',
    'tsukue',
    'table',
    'Maison et quotidien',
    'cvocab_dab51e6598bad3'
  );
  await db.runAsync(
    `UPDATE canonical_vocabulary
     SET japanese = ?, kana = ?, kanji = ?, romaji = ?, meaning_fr = ?, theme = ?
     WHERE id = ?`,
    '千',
    'せん',
    '千',
    'sen',
    'mille',
    'Nombres',
    'auto-n5-vocab-sen-?'
  );
  await db.runAsync(
    `UPDATE canonical_vocabulary
     SET japanese = ?, kana = ?, romaji = ?, meaning_fr = ?, theme = ?
     WHERE id = ?`,
    'Tシャツ',
    'ティーシャツ',
    'tiishatsu',
    'tee-shirt',
    'Vêtements',
    'cvocab_b9a3fbd3d8cb89'
  );
}

export async function checkDatabaseIntegrity(db: SQLiteDatabase): Promise<void> {
  const result = await db.getFirstAsync<{ integrity_check: string }>('PRAGMA quick_check');
  const value = result?.integrity_check ?? Object.values(result ?? {})[0];
  if (value !== 'ok') {
    throw new Error(`SQLite integrity check failed: ${String(value ?? 'unknown result')}`);
  }
}

async function migrateLegacyV7UserData(db: SQLiteDatabase): Promise<void> {
  const existingMigration = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_local_metadata WHERE key = ?',
    LEGACY_V7_MIGRATION_KEY
  );
  if (existingMigration?.value === 'complete' || existingMigration?.value === 'skipped_no_user_data') return;

  const startedAt = new Date().toISOString();
  const legacyDb = await openDatabaseAsync(LEGACY_DATABASE_NAME);
  try {
    const legacyUserTables = await getExistingTables(legacyDb, USER_DATA_TABLES);
    const legacyCounts = await countRowsByTable(legacyDb, legacyUserTables);
    const hasLegacyRows = Object.values(legacyCounts).some((count) => count > 0);

    if (!legacyUserTables.length || !hasLegacyRows) {
      await writeMigrationLog(db, {
        id: LEGACY_V7_MIGRATION_KEY,
        status: 'skipped_no_user_data',
        startedAt,
        detail: { legacyDatabase: LEGACY_DATABASE_NAME, copied: {}, reason: 'no legacy user rows detected' },
      });
      await setMetadataValue(db, LEGACY_V7_MIGRATION_KEY, 'skipped_no_user_data');
      return;
    }

    const legacyPath = quoteSqlString(legacyDb.databasePath);
    await db.execAsync(`ATTACH DATABASE ${legacyPath} AS legacy_v7`);
    const copied: Record<string, { before: number; legacy: number; after: number; inserted: number }> = {};

    try {
      await db.withTransactionAsync(async () => {
        for (const tableName of legacyUserTables) {
          const targetColumns = await getColumnNames(db, tableName);
          const legacyColumns = await getColumnNames(db, tableName, 'legacy_v7');
          const commonColumns = getCommonMigrationColumns(targetColumns, legacyColumns);
          if (!commonColumns.length) continue;

          const before = await countTableRows(db, tableName);
          const legacy = legacyCounts[tableName] ?? 0;
          const columnsSql = commonColumns.map(quoteIdentifier).join(', ');
          await db.execAsync(`
            INSERT OR IGNORE INTO ${quoteIdentifier(tableName)} (${columnsSql})
            SELECT ${columnsSql}
            FROM legacy_v7.${quoteIdentifier(tableName)}
          `);
          const after = await countTableRows(db, tableName);
          assertMigrationCounts(tableName, before, legacy, after);
          copied[tableName] = { before, legacy, after, inserted: Math.max(0, after - before) };
        }
      });
    } finally {
      await db.execAsync('DETACH DATABASE legacy_v7');
    }

    await writeMigrationLog(db, {
      id: LEGACY_V7_MIGRATION_KEY,
      status: 'complete',
      startedAt,
      detail: { legacyDatabase: LEGACY_DATABASE_NAME, copied },
    });
    await setMetadataValue(db, LEGACY_V7_MIGRATION_KEY, 'complete');
  } catch (error) {
    await writeMigrationLog(db, {
      id: LEGACY_V7_MIGRATION_KEY,
      status: 'failed',
      startedAt,
      detail: {
        legacyDatabase: LEGACY_DATABASE_NAME,
        message: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  } finally {
    await legacyDb.closeAsync();
  }
}

async function writeMigrationLog(
  db: SQLiteDatabase,
  entry: { id: string; status: string; startedAt: string; detail: unknown }
): Promise<void> {
  await db.runAsync(
    `
    INSERT INTO app_migration_log (
      id, from_database, to_database, status, detail_json, started_at, finished_at
    ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      status = excluded.status,
      detail_json = excluded.detail_json,
      finished_at = excluded.finished_at
    `,
    entry.id,
    LEGACY_DATABASE_NAME,
    DATABASE_NAME,
    entry.status,
    JSON.stringify(entry.detail),
    entry.startedAt
  );
}

async function setMetadataValue(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync(
    `
    INSERT INTO app_local_metadata (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
    `,
    key,
    value
  );
}

async function ensureColumns(
  db: SQLiteDatabase,
  tableName: string,
  definitions: Array<[columnName: string, definition: string]>
): Promise<void> {
  const columns = await getColumnNames(db, tableName);
  for (const [columnName, definition] of definitions) {
    if (!columns.has(columnName)) {
      await db.execAsync(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
      columns.add(columnName);
    }
  }
}

async function ensureSrsItemStateSchema(db: SQLiteDatabase): Promise<void> {
  await ensureColumns(db, 'app_srs_item_state', [
    ['item_id', "TEXT NOT NULL DEFAULT ''"],
    ['item_type', "TEXT NOT NULL DEFAULT 'vocabulary'"],
    ['status', "TEXT NOT NULL DEFAULT 'new'"],
    ['ease', 'REAL NOT NULL DEFAULT 2.5'],
    ['interval_days', 'INTEGER NOT NULL DEFAULT 0'],
    ['due_at', "TEXT NOT NULL DEFAULT ''"],
    ['last_reviewed_at', 'TEXT'],
    ['attempts', 'INTEGER NOT NULL DEFAULT 0'],
    ['correct', 'INTEGER NOT NULL DEFAULT 0'],
    ['wrong_streak', 'INTEGER NOT NULL DEFAULT 0'],
    ['correct_streak', 'INTEGER NOT NULL DEFAULT 0'],
    ['updated_at', "TEXT NOT NULL DEFAULT ''"],
  ]);
}

async function ensureErrorFlashcardSchema(db: SQLiteDatabase): Promise<void> {
  await ensureColumns(db, 'app_error_flashcard', [
    ['source_question_id', "TEXT NOT NULL DEFAULT ''"],
    ['source_mode', "TEXT NOT NULL DEFAULT 'unknown'"],
    ['item_type', "TEXT NOT NULL DEFAULT 'vocabulary'"],
    ['prompt', "TEXT NOT NULL DEFAULT ''"],
    ['japanese', 'TEXT'],
    ['translation', 'TEXT'],
    ['expected_answer', "TEXT NOT NULL DEFAULT ''"],
    ['selected_answer', 'TEXT'],
    ['explanation', 'TEXT'],
    ['archived', 'INTEGER NOT NULL DEFAULT 0'],
    ['created_at', "TEXT NOT NULL DEFAULT ''"],
    ['updated_at', "TEXT NOT NULL DEFAULT ''"],
  ]);
}

async function getColumnNames(db: SQLiteDatabase, tableName: string, schemaName?: string): Promise<Set<string>> {
  const pragma = schemaName
    ? `PRAGMA ${quoteIdentifier(schemaName)}.table_info(${quoteSqlString(tableName)})`
    : `PRAGMA table_info(${quoteSqlString(tableName)})`;
  const columns = await db.getAllAsync<{ name: string }>(pragma);
  return new Set(columns.map((column) => column.name));
}

async function getExistingTables(db: SQLiteDatabase, tableNames: readonly string[]): Promise<string[]> {
  const rows = await db.getAllAsync<{ name: string }>(
    `
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name IN (${tableNames.map(() => '?').join(', ')})
    `,
    ...tableNames
  );
  const existing = new Set(rows.map((row) => row.name));
  return tableNames.filter((tableName) => existing.has(tableName));
}

async function countRowsByTable(db: SQLiteDatabase, tableNames: readonly string[]): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const tableName of tableNames) {
    counts[tableName] = await countTableRows(db, tableName);
  }
  return counts;
}

async function countTableRows(db: SQLiteDatabase, tableName: string): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) AS count FROM ${quoteIdentifier(tableName)}`);
  return row?.count ?? 0;
}

function quoteIdentifier(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function quoteSqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

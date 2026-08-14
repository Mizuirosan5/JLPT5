import { SQLiteDatabase } from 'expo-sqlite';
import { CORE_AUDIO_PACK } from '../data/audioPack';

export async function initializeDatabase(db: SQLiteDatabase) {
  await db.execAsync(`
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
  `);

  for (const item of CORE_AUDIO_PACK) {
    await db.runAsync(
      `
      INSERT OR IGNORE INTO app_audio_asset (
        id, category, japanese, kana, romaji, meaning_fr, asset_kind, asset_path, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
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

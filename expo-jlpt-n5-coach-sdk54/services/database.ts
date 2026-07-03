import { SQLiteDatabase } from 'expo-sqlite';

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

    CREATE TABLE IF NOT EXISTS app_grammar_lesson_state (
      lesson_id TEXT PRIMARY KEY,
      opened_count INTEGER NOT NULL DEFAULT 0,
      completed INTEGER NOT NULL DEFAULT 0,
      exercise_attempts INTEGER NOT NULL DEFAULT 0,
      exercise_correct INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
  `);
}

export const DATABASE_NAME = 'jlpt_n5_mobile_v8.db';
export const LEGACY_DATABASE_NAME = 'jlpt_n5_mobile_v7.db';
export const SCHEMA_VERSION = 8;

export const USER_DATA_TABLES = [
  'app_question_attempt_local',
  'app_kana_card_state',
  'app_kana_mnemonic_local',
  'app_vocabulary_card_state',
  'app_lookup_favorite_local',
  'app_kana_time_record',
  'app_kana_arcade_score',
  'app_daily_goal_plan',
  'app_daily_reward_claim',
  'app_user_learning_preferences',
  'app_srs_item_state',
  'app_error_flashcard',
  'app_aptitude_result',
  'app_content_progress',
  'app_local_league_season',
  'app_grammar_lesson_state',
  'app_writing_journal_entry',
  'app_session_state',
  'app_wallet',
  'app_reward_ledger',
  'app_cosmetic_inventory',
] as const;

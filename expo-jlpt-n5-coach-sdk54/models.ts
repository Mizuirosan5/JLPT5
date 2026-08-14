// Shared app models and small static configs used across screens.

export type Screen =
  | 'dashboard'
  | 'path'
  | 'aptitudeTest'
  | 'aptitudeReport'
  | 'review'
  | 'errors'
  | 'kana'
  | 'vocabulary'
  | 'grammar'
  | 'immersion'
  | 'quiz'
  | 'exam'
  | 'quick'
  | 'preferences';
export type DashboardTab = 'overview' | 'quiz' | 'mastery' | 'progress' | 'focus';
export type QuizDifficultyPreference = 'soft' | 'normal' | 'hard';
export type LearningPlanMode = 'balanced' | 'kana_first' | 'grammar_intensive' | 'exam_revision';
export type LearningPreferences = {
  showRomaji: boolean;
  showTranslationFirst: boolean;
  quizDifficulty: QuizDifficultyPreference;
  preferredSessionLength: 5 | 10 | 20;
  japaneseAnswerMode: boolean;
  learningPlanMode: LearningPlanMode;
};
export type KanaTab = 'hiragana' | 'katakana' | 'combined';
export type KanaMode = 'learn' | 'exercise';
export type GrammarMode = 'learn' | 'exercise';
export type GrammarLessonStatus = 'neutral' | 'understood' | 'not_understood';
export type VocabularyScope = 'n5' | 'all';
export type VocabularyViewMode = 'cards' | 'list';
export type KanaFilter = 'all' | 'known' | 'review' | 'mastered' | 'unseen';
export type KanaDisplayStyle = 'illustrated' | 'classic';
export type KanaExerciseDirection = 'kana_to_romaji' | 'romaji_to_kana';
export type KanaQuizAnswerMode = 'multiple_choice' | 'direct_input';
export type KanaQuizSize = 10 | 20;
export type KanaViewerPanel = 'card' | 'trace';
export type KanaPracticeMode = 'standard' | 'story' | 'confusion' | 'matching';
export type MainQuizMode = 'global' | 'kana_arcade' | 'adaptive' | 'grammar';
export type GrammarQuizMode = 'direct_input' | 'blank_qcm' | 'matching' | 'question_answer' | 'arcade';
export type GlobalQuizMode = GrammarQuizMode;
export type GlobalQuizDomain = 'kana' | 'vocabulary' | 'grammar' | 'kanji';
export type GlobalQuizFormat =
  | 'kana_reading'
  | 'kana_recognition'
  | 'vocabulary_meaning'
  | 'vocabulary_reading'
  | 'vocabulary_japanese'
  | 'kanji_meaning'
  | 'kanji_reading'
  | 'kanji_japanese_word'
  | 'kanji_components'
  | 'grammar_blank'
  | 'grammar_rule'
  | 'grammar_translation'
  | 'grammar_situation';
export type KnowledgeQuizScope = 'all' | 'kana' | 'vocabulary' | 'kanji';
export const GRAMMAR_QUIZ_MODES: Array<{
  id: GrammarQuizMode;
  symbol: string;
  title: string;
  subtitle: string;
}> = [
  { id: 'direct_input', symbol: '書', title: 'Réponse tapée', subtitle: 'Retrouve et écris le mot manquant.' },
  { id: 'blank_qcm', symbol: '選', title: 'Texte à trou QCM', subtitle: 'Choisis la bonne forme parmi quatre réponses.' },
  { id: 'matching', symbol: '結', title: 'Relier les paires', subtitle: 'Associe cinq phrases à leurs traductions.' },
  { id: 'question_answer', symbol: '答', title: 'Question-réponse', subtitle: 'Trouve la réponse naturelle à une situation.' },
  { id: 'arcade', symbol: '遊', title: 'Défi ludique', subtitle: 'Formats mélangés, vies, score et séries.' },
];
export const GLOBAL_QUIZ_MODES: Array<{
  id: GlobalQuizMode;
  symbol: string;
  title: string;
  subtitle: string;
}> = [
  { id: 'direct_input', symbol: '書', title: 'Réponse directe', subtitle: 'Écris la lecture, le mot ou la règle attendue.' },
  { id: 'blank_qcm', symbol: '選', title: 'QCM global', subtitle: 'Quatre choix sur tous les domaines N5.' },
  { id: 'matching', symbol: '結', title: 'Associations globales', subtitle: 'Relie kana, mots, kanji et phrases à leur sens.' },
  { id: 'question_answer', symbol: '逆', title: 'Question inversée', subtitle: 'Pars du français ou du romaji pour retrouver le japonais.' },
  { id: 'arcade', symbol: '遊', title: 'Défi maîtrise', subtitle: 'Mélange complet avec score et combo jusqu’à x5.' },
];
export type GrammarExerciseKind =
  | 'rule_qcm'
  | 'translation_qcm'
  | 'blank_choice'
  | 'blank_input'
  | 'keyword_input'
  | 'situation_qcm'
  | 'dialogue_response_qcm';
export type TracePoint = { x: number; y: number };
export type TraceStroke = { id: string; points: TracePoint[] };
export type TraceGuideArrow = { start: TracePoint; end: TracePoint; label: string };

export type DashboardStats = {
  questions: number;
  vocabulary: number;
  grammar: number;
  kanji: number;
  kana: number;
  audio: number;
  attempts: number;
  todayAttempts: number;
  todayCorrect: number;
  correctRate: number;
};

export type SkillProgress = {
  skill_id: string;
  attempts: number;
  correct: number;
  rate: number;
};

export type DailyProgress = {
  day: string;
  attempts: number;
  correct: number;
  rate: number;
};

export type QuizDashboardSummary = {
  attempts: number;
  correct: number;
  rate: number;
  todayAttempts: number;
  kanaArcadeAttempts: number;
  adaptiveAttempts: number;
  examAttempts: number;
  bestScore: number;
  bestScoreTime: number;
  bestStreak: number;
  averageScore: number;
  averageTime: number;
};

export type QuizModeProgress = {
  source_mode: string;
  attempts: number;
  correct: number;
  rate: number;
};

export type QuizScoreTrend = {
  label: string;
  score: number;
  rate: number;
  elapsed_ms: number;
  created_at: string;
};

export type GrammarProgressSummary = {
  total: number;
  opened: number;
  completed: number;
  exerciseAttempts: number;
  exerciseCorrect: number;
  exerciseRate: number;
  menusOpened: number;
};

export type MasteryDomainStats = {
  id: string;
  label: string;
  total: number;
  mastered: number;
  known: number;
  review: number;
  unseen: number;
  attempted: number;
  correct: number;
  rate: number;
};

export type LearningPathStage = {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  focus: string;
  progress: number;
  done: number;
  total: number;
  status: 'locked' | 'active' | 'done';
  reward: string;
  screen: Screen;
  actionLabel: string;
  subSteps?: LearningPathSubStep[];
  detail?: string;
  checkpoints?: string[];
  prerequisites?: string[];
  successCriteria?: string[];
  lockedReason?: string;
  nextActionHint?: string;
};

export type LearningPathSubStep = {
  id: string;
  code: string;
  title: string;
  objective: string;
  requirement: string;
  progress: number;
  status: 'locked' | 'active' | 'done';
};

export type GrammarLessonExample = {
  id: string;
  kana: string;
  kanji: string;
  romaji: string;
  fr: string;
  note: string;
};

export type GrammarLesson = {
  id: string;
  folder: string;
  subfolder: string;
  order: number;
  title: string;
  pattern: string;
  level: 'facile' | 'pratique' | 'intermediaire' | 'avance';
  goal: string;
  explanation: string;
  formula: string;
  trap: string;
  examples: GrammarLessonExample[];
};

export type LeagueTier = {
  name: string;
  minLevel: number;
  symbol: string;
};

export type CoachQuest = {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  reward: string;
  rewardXp: number;
  badgeCode: string;
  unit: string;
  period: GoalPeriod;
};

export type GoalPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type DailyGoalMetrics = {
  day: string;
  attempts: number;
  correct: number;
  rate: number;
  quizAttempts: number;
  grammarActivities?: number;
  activeDays?: number;
};

export type DailyGoalDay = {
  day: string;
  attempts: number;
  correct: number;
  rate: number;
  quizAttempts: number;
  grammarActivities?: number;
  completed: number;
  total: number;
};

export type RewardSummary = {
  xp: number;
  badges: number;
};

export type SrsOverview = {
  dueToday: number;
  fragile: number;
  known: number;
  solid: number;
  mastered: number;
  total: number;
  nextDueAt: string | null;
};

export type RewardToast = {
  title: string;
  xp: number;
  badgeCode: string;
};

export type BadgeDomain = 'quotidien' | 'kana' | 'quiz' | 'vocabulaire' | 'grammaire' | 'kanji' | 'jlpt' | 'maitrise';
export type BadgeDifficulty = 'facile' | 'moyen' | 'difficile' | 'expert' | 'legendaire';

export type BadgeDefinition = {
  id: string;
  title: string;
  description: string;
  icon: string;
  domain: BadgeDomain;
};

export type BadgeProgressContext = {
  stats: DashboardStats;
  quizSummary: QuizDashboardSummary;
  masteryDomains: MasteryDomainStats[];
  grammarLessons: GrammarProgressSummary;
  goalCalendar: DailyGoalDay[];
  earnedBadgeCodes: string[];
  streakDays: number;
  level: number;
};

export type BadgeView = BadgeDefinition & {
  unlocked: boolean;
  baseUnlocked: boolean;
  difficulty: BadgeDifficulty;
  requiredLevel: number;
  requiredBadges: number;
  gateLocked: boolean;
};

export type QuizQuestion = {
  question_id: string;
  question_origin: string;
  skill_id: string;
  question_type: string;
  prompt_fr: string;
  prompt_ja: string | null;
  correct_answer: string;
  explanation_fr: string;
};

export type QuizChoice = {
  id: string;
  choice_text: string;
  is_correct: number;
};

export type GrammarQuizQuestion = {
  id: string;
  kind: GrammarExerciseKind;
  lesson: GrammarLesson;
  prompt: string;
  japanese?: string;
  kanaJapanese?: string;
  romaji?: string;
  french?: string;
  helper: string;
  correctAnswer: string;
  choices: string[];
};

export type GrammarQuizMistake = {
  question: GrammarQuizQuestion;
  selected: string;
};

export type GrammarQuizSession = {
  questions: GrammarQuizQuestion[];
  currentIndex: number;
  selected: string | null;
  correctCount: number;
  score: number;
  streak: number;
  bestStreak: number;
  lives: number;
  mistakes: GrammarQuizMistake[];
  finished: boolean;
};

export type GrammarMatchingPair = {
  id: string;
  lesson: GrammarLesson;
  japanese: string;
  french: string;
};

export type GrammarMatchingRound = {
  pairs: GrammarMatchingPair[];
  rightOrder: string[];
};

export type GrammarMatchingSession = {
  rounds: GrammarMatchingRound[];
  currentRound: number;
  selectedLeftId: string | null;
  selectedRightId: string | null;
  matchedIds: string[];
  attempts: number;
  errors: number;
  score: number;
  finished: boolean;
  locked: boolean;
};

export type GlobalQuizQuestion = {
  id: string;
  domain: GlobalQuizDomain;
  format: GlobalQuizFormat;
  formatLabel: string;
  measuredSkill: string;
  prompt: string;
  display: string;
  correctAnswer: string;
  choices: string[];
  explanation: string;
  srsItemId?: string;
  srsItemType?: 'kana' | 'vocabulary' | 'kanji' | 'grammar' | 'skill';
};

export type GlobalQuizSession = {
  questions: GlobalQuizQuestion[];
  currentIndex: number;
  selected: string | null;
  correctCount: number;
  score: number;
  streak: number;
  bestStreak: number;
  mistakes: Array<{ question: GlobalQuizQuestion; selected: string }>;
  finished: boolean;
};

export type GlobalMatchingPair = {
  id: string;
  domain: GlobalQuizDomain;
  left: string;
  right: string;
};

export type GlobalMatchingSession = {
  rounds: Array<{ pairs: GlobalMatchingPair[]; rightOrder: string[] }>;
  currentRound: number;
  selectedLeftId: string | null;
  selectedRightId: string | null;
  matchedIds: string[];
  errors: number;
  score: number;
  finished: boolean;
  locked: boolean;
};

export type ExamSegment = {
  question_id: string;
  source_id: string;
  section: string;
  skill_id: string;
  linked_question_source_file: string | null;
  problem_number: number;
  question_number: number;
  page_number: number | null;
  image_path: string | null;
  correct_choice: number;
  context_ja: string | null;
  prompt_ja: string | null;
  choices_json: string | null;
  display_mode: 'native_text' | 'question_image' | null;
};

export type KanaCard = {
  id: string;
  script: 'hiragana' | 'katakana';
  character: string;
  romaji: string;
  row_name: string | null;
  favorite: number;
  review: number;
  mastered: number;
  seen_count: number;
  correct_count: number;
  mnemonic_note: string | null;
  examples: VocabularyExample[];
};

export type VocabularyExample = {
  id: string;
  japanese: string;
  kana: string | null;
  kanji: string | null;
  romaji: string | null;
  meaning_fr: string;
};

export type VocabularyItem = VocabularyExample & {
  category: string;
  jlpt_level?: string | null;
  part_of_speech?: string | null;
  theme?: string | null;
};

export type KanjiItem = {
  id: string;
  character: string;
  meaning_fr: string;
  onyomi: string | null;
  kunyomi: string | null;
  n5_readings: string | null;
  stroke_count: number | null;
  jlpt_level: string;
};

export type VocabularyCardData = {
  id: string;
  root: string;
  primary: VocabularyItem;
  entries: VocabularyItem[];
  readings: string[];
  kanaReadings: string[];
  meanings: string[];
  kanji?: KanjiItem;
};

export type WordLookupEntry = VocabularyExample & {
  usage: string;
};

export type JapaneseTextToken = {
  text: string;
  entry?: WordLookupEntry;
};

export type KanaExercise = {
  prompt: KanaCard;
  choices: string[];
  direction: KanaExerciseDirection;
  answerMode: KanaQuizAnswerMode;
  retry?: boolean;
};

export type KanaQuizSession = {
  questions: KanaExercise[];
  currentIndex: number;
  correctCount: number;
  answers: {
    questionId: string;
    selected: string;
    correct: string;
    isCorrect: boolean;
  }[];
  finished: boolean;
  storyCards?: KanaCard[];
  storyCompleted?: boolean;
  matchingCards?: KanaCard[];
  matchingRounds?: KanaCard[][];
  matchingRoundIndex?: number;
  matchingRoundCount?: number;
  matchingRomajiOrder?: string[];
  matchingMatchedIds?: string[];
  matchingMistakes?: number;
  practiceMode: KanaPracticeMode;
  timerEnabled?: boolean;
  startedAt?: number;
  elapsedMs?: number;
};

export type KanaTimeRecord = {
  id: string;
  elapsed_ms: number;
  correct_count: number;
  total_count: number;
  created_at: string;
};

export type KanaArcadeQuestion = {
  prompt: KanaCard;
  choices: string[];
};

export type KanaArcadeAnswer = {
  questionId: string;
  prompt: string;
  selected: string;
  correct: string;
  isCorrect: boolean;
  points: number;
  multiplier: number;
};

export type KanaArcadeSession = {
  questions: KanaArcadeQuestion[];
  currentIndex: number;
  selected: string | null;
  answers: KanaArcadeAnswer[];
  score: number;
  streak: number;
  bestStreak: number;
  startedAt: number;
  finished: boolean;
  elapsedMs?: number;
  isNewBestScore?: boolean;
  allTimeBest?: KanaArcadeScoreRecord | null;
};

export type KanaArcadeScoreRecord = {
  id: string;
  score: number;
  elapsed_ms: number;
  correct_count: number;
  total_count: number;
  best_streak: number;
  created_at: string;
};

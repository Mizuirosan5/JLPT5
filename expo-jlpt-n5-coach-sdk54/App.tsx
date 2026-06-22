import { StatusBar } from 'expo-status-bar';
import * as Speech from 'expo-speech';
import {
  SQLiteDatabase,
  SQLiteProvider,
  useSQLiteContext,
} from 'expo-sqlite';
import { Component, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  ImageStyle,
  LayoutChangeEvent,
  Modal,
  PanResponder,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, Polygon, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { OFFICIAL_EXAM_QUESTION_ASSETS } from './examQuestionAssets';

type Screen = 'dashboard' | 'path' | 'kana' | 'vocabulary' | 'grammar' | 'quiz' | 'exam';
type DashboardTab = 'overview' | 'quiz' | 'mastery' | 'progress' | 'focus';
type KanaTab = 'hiragana' | 'katakana' | 'combined';
type KanaMode = 'learn' | 'exercise';
type GrammarMode = 'learn' | 'exercise';
type GrammarLessonStatus = 'neutral' | 'understood' | 'not_understood';
type VocabularyScope = 'n5' | 'all';
type VocabularyViewMode = 'cards' | 'list';
type KanaFilter = 'all' | 'known' | 'review' | 'mastered' | 'unseen';
type KanaDisplayStyle = 'illustrated' | 'classic';
type KanaExerciseDirection = 'kana_to_romaji' | 'romaji_to_kana';
type KanaQuizAnswerMode = 'multiple_choice' | 'direct_input';
type KanaQuizSize = 10 | 20;
type KanaViewerPanel = 'card' | 'trace';
type KanaPracticeMode = 'standard' | 'story' | 'confusion' | 'matching';
type MainQuizMode = 'global' | 'kana_arcade' | 'adaptive' | 'grammar';
type GrammarQuizMode = 'direct_input' | 'blank_qcm' | 'matching' | 'question_answer' | 'arcade';
type GlobalQuizMode = GrammarQuizMode;
type GlobalQuizDomain = 'kana' | 'vocabulary' | 'grammar' | 'kanji';
type KnowledgeQuizScope = 'all' | 'kana' | 'vocabulary' | 'kanji';
const GRAMMAR_QUIZ_MODES: Array<{
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
const GLOBAL_QUIZ_MODES: Array<{
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
type GrammarExerciseKind =
  | 'rule_qcm'
  | 'translation_qcm'
  | 'blank_choice'
  | 'blank_input'
  | 'keyword_input'
  | 'situation_qcm'
  | 'dialogue_response_qcm';
type TracePoint = { x: number; y: number };
type TraceStroke = { id: string; points: TracePoint[] };
type TraceGuideArrow = { start: TracePoint; end: TracePoint; label: string };

type AppErrorBoundaryState = {
  error: Error | null;
};

type DashboardStats = {
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

type SkillProgress = {
  skill_id: string;
  attempts: number;
  correct: number;
  rate: number;
};

type DailyProgress = {
  day: string;
  attempts: number;
  correct: number;
  rate: number;
};

type QuizDashboardSummary = {
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

type QuizModeProgress = {
  source_mode: string;
  attempts: number;
  correct: number;
  rate: number;
};

type QuizScoreTrend = {
  label: string;
  score: number;
  rate: number;
  elapsed_ms: number;
  created_at: string;
};

type GrammarProgressSummary = {
  total: number;
  opened: number;
  completed: number;
  exerciseAttempts: number;
  exerciseCorrect: number;
  exerciseRate: number;
  menusOpened: number;
};

type MasteryDomainStats = {
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

type LearningPathStage = {
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
};

type GrammarLessonExample = {
  id: string;
  kana: string;
  kanji: string;
  romaji: string;
  fr: string;
  note: string;
};

type GrammarLesson = {
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

type LeagueTier = {
  name: string;
  minLevel: number;
  symbol: string;
};

type CoachQuest = {
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

type GoalPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

type DailyGoalMetrics = {
  day: string;
  attempts: number;
  correct: number;
  rate: number;
  quizAttempts: number;
  grammarActivities?: number;
  activeDays?: number;
};

type DailyGoalDay = {
  day: string;
  attempts: number;
  correct: number;
  rate: number;
  quizAttempts: number;
  grammarActivities?: number;
  completed: number;
  total: number;
};

type RewardSummary = {
  xp: number;
  badges: number;
};

type RewardToast = {
  title: string;
  xp: number;
  badgeCode: string;
};

type BadgeDomain = 'quotidien' | 'kana' | 'quiz' | 'vocabulaire' | 'grammaire' | 'kanji' | 'jlpt' | 'maitrise';
type BadgeDifficulty = 'facile' | 'moyen' | 'difficile' | 'expert' | 'legendaire';

type BadgeDefinition = {
  id: string;
  title: string;
  description: string;
  icon: string;
  domain: BadgeDomain;
};

type BadgeProgressContext = {
  stats: DashboardStats;
  quizSummary: QuizDashboardSummary;
  masteryDomains: MasteryDomainStats[];
  grammarLessons: GrammarProgressSummary;
  goalCalendar: DailyGoalDay[];
  earnedBadgeCodes: string[];
  streakDays: number;
  level: number;
};

type BadgeView = BadgeDefinition & {
  unlocked: boolean;
  baseUnlocked: boolean;
  difficulty: BadgeDifficulty;
  requiredLevel: number;
  requiredBadges: number;
  gateLocked: boolean;
};

type QuizQuestion = {
  question_id: string;
  question_origin: string;
  skill_id: string;
  question_type: string;
  prompt_fr: string;
  prompt_ja: string | null;
  correct_answer: string;
  explanation_fr: string;
};

type QuizChoice = {
  id: string;
  choice_text: string;
  is_correct: number;
};

type GrammarQuizQuestion = {
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

type GrammarQuizMistake = {
  question: GrammarQuizQuestion;
  selected: string;
};

type GrammarQuizSession = {
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

type GrammarMatchingPair = {
  id: string;
  lesson: GrammarLesson;
  japanese: string;
  french: string;
};

type GrammarMatchingRound = {
  pairs: GrammarMatchingPair[];
  rightOrder: string[];
};

type GrammarMatchingSession = {
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

type GlobalQuizQuestion = {
  id: string;
  domain: GlobalQuizDomain;
  prompt: string;
  display: string;
  correctAnswer: string;
  choices: string[];
  explanation: string;
};

type GlobalQuizSession = {
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

type GlobalMatchingPair = {
  id: string;
  domain: GlobalQuizDomain;
  left: string;
  right: string;
};

type GlobalMatchingSession = {
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

type ExamSegment = {
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

type KanaCard = {
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

type VocabularyExample = {
  id: string;
  japanese: string;
  kana: string | null;
  kanji: string | null;
  romaji: string | null;
  meaning_fr: string;
};

type VocabularyItem = VocabularyExample & {
  category: string;
  jlpt_level?: string | null;
  part_of_speech?: string | null;
  theme?: string | null;
};

type KanjiItem = {
  id: string;
  character: string;
  meaning_fr: string;
  onyomi: string | null;
  kunyomi: string | null;
  n5_readings: string | null;
  stroke_count: number | null;
  jlpt_level: string;
};

type VocabularyCardData = {
  id: string;
  root: string;
  primary: VocabularyItem;
  entries: VocabularyItem[];
  readings: string[];
  kanaReadings: string[];
  meanings: string[];
  kanji?: KanjiItem;
};

type WordLookupEntry = VocabularyExample & {
  usage: string;
};

type JapaneseTextToken = {
  text: string;
  entry?: WordLookupEntry;
};

type KanaExercise = {
  prompt: KanaCard;
  choices: string[];
  direction: KanaExerciseDirection;
  answerMode: KanaQuizAnswerMode;
  retry?: boolean;
};

type KanaQuizSession = {
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

type KanaTimeRecord = {
  id: string;
  elapsed_ms: number;
  correct_count: number;
  total_count: number;
  created_at: string;
};

type KanaArcadeQuestion = {
  prompt: KanaCard;
  choices: string[];
};

type KanaArcadeAnswer = {
  questionId: string;
  prompt: string;
  selected: string;
  correct: string;
  isCorrect: boolean;
  points: number;
  multiplier: number;
};

type KanaArcadeSession = {
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

type KanaArcadeScoreRecord = {
  id: string;
  score: number;
  elapsed_ms: number;
  correct_count: number;
  total_count: number;
  best_streak: number;
  created_at: string;
};

const HIRAGANA_STANDARD = [
  ['あ', 'い', 'う', 'え', 'お'],
  ['か', 'き', 'く', 'け', 'こ'],
  ['さ', 'し', 'す', 'せ', 'そ'],
  ['た', 'ち', 'つ', 'て', 'と'],
  ['な', 'に', 'ぬ', 'ね', 'の'],
  ['は', 'ひ', 'ふ', 'へ', 'ほ'],
  ['ま', 'み', 'む', 'め', 'も'],
  ['や', '', 'ゆ', '', 'よ'],
  ['ら', 'り', 'る', 'れ', 'ろ'],
  ['わ', '', '', '', 'を'],
  ['ん', '', '', '', ''],
];

const KATAKANA_STANDARD = [
  ['ア', 'イ', 'ウ', 'エ', 'オ'],
  ['カ', 'キ', 'ク', 'ケ', 'コ'],
  ['サ', 'シ', 'ス', 'セ', 'ソ'],
  ['タ', 'チ', 'ツ', 'テ', 'ト'],
  ['ナ', 'ニ', 'ヌ', 'ネ', 'ノ'],
  ['ハ', 'ヒ', 'フ', 'ヘ', 'ホ'],
  ['マ', 'ミ', 'ム', 'メ', 'モ'],
  ['ヤ', '', 'ユ', '', 'ヨ'],
  ['ラ', 'リ', 'ル', 'レ', 'ロ'],
  ['ワ', '', '', '', 'ヲ'],
  ['ン', '', '', '', ''],
];

const KANA_CONFUSION_GROUPS = [
  ['シ', 'ツ', 'ソ', 'ン'],
  ['さ', 'ち'],
  ['わ', 'ね', 'れ'],
  ['め', 'ぬ'],
  ['ク', 'ケ'],
  ['ア', 'マ'],
  ['フ', 'ワ'],
  ['ラ', 'ヲ'],
  ['き', 'さ'],
  ['は', 'ほ'],
];

const ROMAJI_OVERRIDES: Record<string, string> = {
  っ: 'petit tsu',
  ッ: 'petit tsu',
  ー: 'voyelle longue',
  ヽ: 'répétition',
  ヾ: 'répétition voisée',
  'あ-い-う + voyelle du même son': 'voyelle longue',
  'え + い ouえ': 'voyelle longue',
  'お + う': 'voyelle longue',
  ĀĒĪŌŪ: 'voyelle longue',
};

const PREFERRED_N5_EXAMPLES: Record<string, string> = {
  あ: 'あめ',
  い: 'いえ',
  う: 'うさぎ',
  え: 'えんぴつ',
  お: 'おかね',
  か: 'かぎ',
  き: 'き',
  く: 'くつ',
  け: 'けいかん',
  こ: 'こども',
  さ: 'さかな',
  し: 'しごと',
  す: 'すし',
  せ: 'せっけん',
  そ: 'そら',
  た: 'たまご',
  ち: 'ちず',
  つ: 'つくえ',
  て: 'て',
  と: 'とけい',
  な: 'なまえ',
  に: 'にく',
  ぬ: 'ぬぐ',
  ね: 'ねこ',
  の: 'のむ',
  は: 'はな',
  ひ: 'ひこうき',
  ふ: 'ふね',
  へ: 'へや',
  ほ: 'ほん',
  ま: 'まど',
  み: 'みみ',
  む: 'むら',
  め: 'めがね',
  も: 'もん',
  や: 'やま',
  ゆ: 'ゆき',
  よ: 'よる',
  ら: 'らいげつ',
  り: 'りょうり',
  る: 'ある',
  れ: 'れいぞうこ',
  ろ: 'ろく',
  わ: 'わたし',
  を: '電話をかけました',
  ん: 'えん',
};

const PREFERRED_N5_ROMAJI: Record<string, string> = {
  あめ: 'ame',
  いえ: 'ie',
  うさぎ: 'usagi',
  えんぴつ: 'enpitsu',
  おかね: 'okane',
  かぎ: 'kagi',
  き: 'ki',
  くつ: 'kutsu',
  けいかん: 'keikan',
  こども: 'kodomo',
  さかな: 'sakana',
  しごと: 'shigoto',
  すし: 'sushi',
  せっけん: 'sekken',
  そら: 'sora',
  たまご: 'tamago',
  ちず: 'chizu',
  つくえ: 'tsukue',
  て: 'te',
  とけい: 'tokei',
  なまえ: 'namae',
  にく: 'niku',
  ぬぐ: 'nugu',
  ねこ: 'neko',
  のむ: 'nomu',
  はな: 'hana',
  ひこうき: 'hikouki',
  ふね: 'fune',
  へや: 'heya',
  ほん: 'hon',
  まど: 'mado',
  みみ: 'mimi',
  むら: 'mura',
  めがね: 'megane',
  もん: 'mon',
  やま: 'yama',
  ゆき: 'yuki',
  よる: 'yoru',
  らいげつ: 'raigetsu',
  りょうり: 'ryouri',
  ある: 'aru',
  れいぞうこ: 'reizouko',
  ろく: 'roku',
  わたし: 'watashi',
  電話をかけました: 'denwa wo suru',
  えん: 'en',
};

// OpenMoji illustrations are CC BY-SA 4.0; keep attribution in the app credits before release.
const OPENMOJI_BASE_URI = 'https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/color/618x618';

function openMoji(code: string): string {
  return `${OPENMOJI_BASE_URI}/${code}.png`;
}

const N5_EXAMPLE_ILLUSTRATIONS: Record<string, { uri: string; fallback: string }> = {
  ame: { uri: openMoji('2614'), fallback: '☔' },
  ah: { uri: openMoji('1F4AC'), fallback: '💬' },
  ie: { uri: openMoji('1F3E0'), fallback: '🏠' },
  iu: { uri: openMoji('1F5E3'), fallback: '🗣️' },
  ue: { uri: openMoji('2B06'), fallback: '⬆️' },
  e: { uri: openMoji('1F5BC'), fallback: '🖼️' },
  enpitsu: { uri: openMoji('270F'), fallback: '✏️' },
  o: { uri: openMoji('1F647'), fallback: '🙇' },
  okane: { uri: openMoji('1F4B4'), fallback: '💴' },
  ookii: { uri: openMoji('1F418'), fallback: '🐘' },
  kau: { uri: openMoji('1F6CD'), fallback: '🛍️' },
  kagi: { uri: openMoji('1F511'), fallback: '🔑' },
  ki: { uri: openMoji('1F333'), fallback: '🌳' },
  kutsu: { uri: openMoji('1F45F'), fallback: '👟' },
  kuru: { uri: openMoji('1F6B6'), fallback: '🚶' },
  keikan: { uri: openMoji('1F46E'), fallback: '👮' },
  kesa: { uri: openMoji('1F305'), fallback: '🌅' },
  kodomo: { uri: openMoji('1F9D2'), fallback: '🧒' },
  koe: { uri: openMoji('1F5E3'), fallback: '🗣️' },
  saa: { uri: openMoji('1F4A1'), fallback: '💡' },
  sakana: { uri: openMoji('1F41F'), fallback: '🐟' },
  shigoto: { uri: openMoji('1F4BC'), fallback: '💼' },
  shi: { uri: openMoji('0034-FE0F-20E3'), fallback: '4️⃣' },
  sushi: { uri: openMoji('1F363'), fallback: '🍣' },
  suu: { uri: openMoji('1FAC1'), fallback: '🫁' },
  suki: { uri: openMoji('2764'), fallback: '❤' },
  sei: { uri: openMoji('1F4CF'), fallback: '📏' },
  sekken: { uri: openMoji('1F9FC'), fallback: '🧼' },
  sou: { uri: openMoji('2705'), fallback: '✅' },
  sora: { uri: openMoji('1F324'), fallback: '🌤️' },
  tatsu: { uri: openMoji('1F9CD'), fallback: '🧍' },
  tamago: { uri: openMoji('1F95A'), fallback: '🥚' },
  chizu: { uri: openMoji('1F5FA'), fallback: '🗺️' },
  tsugi: { uri: openMoji('23ED'), fallback: '⏭️' },
  tsukue: { uri: openMoji('1FA91'), fallback: '🪑' },
  te: { uri: openMoji('270B'), fallback: '✋' },
  to: { uri: openMoji('1F6AA'), fallback: '🚪' },
  tokei: { uri: openMoji('23F0'), fallback: '⏰' },
  namae: { uri: openMoji('1F3F7'), fallback: '🏷️' },
  niku: { uri: openMoji('1F969'), fallback: '🥩' },
  naka: { uri: openMoji('1F3E0'), fallback: '🏠' },
  nishi: { uri: openMoji('1F9ED'), fallback: '🧭' },
  nugu: { uri: openMoji('1F455'), fallback: '👕' },
  neko: { uri: openMoji('1F431'), fallback: '🐱' },
  neru: { uri: openMoji('1F6CF'), fallback: '🛏️' },
  nomu: { uri: openMoji('1F964'), fallback: '🥤' },
  hana: { uri: openMoji('1F33C'), fallback: '🌼' },
  ha: { uri: openMoji('1F9B7'), fallback: '🦷' },
  hikouki: { uri: openMoji('2708'), fallback: '✈️' },
  hiku: { uri: openMoji('1FAA2'), fallback: '🪢' },
  fune: { uri: openMoji('26F5'), fallback: '⛵' },
  fuku: { uri: openMoji('1F32C'), fallback: '🌬️' },
  heya: { uri: openMoji('1F6CB'), fallback: '🛋️' },
  heta: { uri: openMoji('274C'), fallback: '❌' },
  hon: { uri: openMoji('1F4D8'), fallback: '📘' },
  hou: { uri: openMoji('2696'), fallback: '⚖️' },
  mado: { uri: openMoji('1FA9F'), fallback: '🪟' },
  mata: { uri: openMoji('1F501'), fallback: '🔁' },
  migi: { uri: openMoji('27A1'), fallback: '➡️' },
  muika: { uri: openMoji('1F4C5'), fallback: '📅' },
  mimi: { uri: openMoji('1F442'), fallback: '👂' },
  mura: { uri: openMoji('1F3D8'), fallback: '🏘️' },
  me: { uri: openMoji('1F441'), fallback: '👁️' },
  megane: { uri: openMoji('1F453'), fallback: '👓' },
  mon: { uri: openMoji('1F6AA'), fallback: '🚪' },
  mou: { uri: openMoji('1F501'), fallback: '🔁' },
  yama: { uri: openMoji('26F0'), fallback: '⛰️' },
  yuki: { uri: openMoji('2744'), fallback: '❄️' },
  yoko: { uri: openMoji('2194'), fallback: '↔️' },
  yoru: { uri: openMoji('1F303'), fallback: '🌃' },
  raigetsu: { uri: openMoji('1F4C5'), fallback: '📅' },
  rippa: { uri: openMoji('2728'), fallback: '✨' },
  ryouri: { uri: openMoji('1F373'), fallback: '🍳' },
  aru: { uri: openMoji('1F4CD'), fallback: '📍' },
  rei: { uri: openMoji('0030-FE0F-20E3'), fallback: '0️⃣' },
  reizouko: { uri: openMoji('1F9CA'), fallback: '🧊' },
  roku: { uri: openMoji('0036-FE0F-20E3'), fallback: '6️⃣' },
  rokugatsu: { uri: openMoji('1F5D3'), fallback: '🗓️' },
  wakaru: { uri: openMoji('1F9E0'), fallback: '🧠' },
  watashi: { uri: openMoji('1F9D1'), fallback: '🧑' },
  denwawosuru: { uri: openMoji('260E'), fallback: '☎️' },
  en: { uri: openMoji('1F4B4'), fallback: '💴' },
  usagi: { uri: openMoji('1F407'), fallback: '🐇' },
};

type KanaExamplePreset = {
  kana: string;
  romaji: string;
  meaning_fr: string;
  illustrationKey: string;
};

const COMBINED_KANA_EXAMPLES: Record<string, KanaExamplePreset> = {
  kya: { kana: 'キャベツ', romaji: 'kyabetsu', meaning_fr: 'chou', illustrationKey: 'cabbage' },
  kyu: { kana: 'きゅうり', romaji: 'kyuuri', meaning_fr: 'concombre', illustrationKey: 'cucumber' },
  kyo: { kana: 'きょう', romaji: 'kyou', meaning_fr: "aujourd'hui", illustrationKey: 'today' },
  gya: { kana: 'ギャグ', romaji: 'gyagu', meaning_fr: 'blague', illustrationKey: 'joke' },
  gyu: { kana: 'ぎゅうにゅう', romaji: 'gyuunyuu', meaning_fr: 'lait', illustrationKey: 'milk' },
  gyo: { kana: 'ぎょうざ', romaji: 'gyouza', meaning_fr: 'gyoza', illustrationKey: 'dumpling' },
  she: { kana: 'シェフ', romaji: 'shefu', meaning_fr: 'chef', illustrationKey: 'chef' },
  sha: { kana: 'しゃしん', romaji: 'shashin', meaning_fr: 'photo', illustrationKey: 'photo' },
  shu: { kana: 'しゅくだい', romaji: 'shukudai', meaning_fr: 'devoirs', illustrationKey: 'homework' },
  sho: { kana: 'しょうがっこう', romaji: 'shougakkou', meaning_fr: 'école primaire', illustrationKey: 'school' },
  je: { kana: 'ジェラート', romaji: 'jeraato', meaning_fr: 'glace', illustrationKey: 'icecream' },
  ja: { kana: 'じゃがいも', romaji: 'jagaimo', meaning_fr: 'pomme de terre', illustrationKey: 'potato' },
  ju: { kana: 'ジュース', romaji: 'juusu', meaning_fr: 'jus', illustrationKey: 'juice' },
  jo: { kana: 'じょうず', romaji: 'jouzu', meaning_fr: 'habile', illustrationKey: 'star' },
  che: { kana: 'チェス', romaji: 'chesu', meaning_fr: 'échecs', illustrationKey: 'chess' },
  cha: { kana: 'おちゃ', romaji: 'ocha', meaning_fr: 'thé', illustrationKey: 'tea' },
  chu: { kana: 'ちゅうしゃ', romaji: 'chuusha', meaning_fr: 'injection', illustrationKey: 'syringe' },
  cho: { kana: 'ちょう', romaji: 'chou', meaning_fr: 'papillon', illustrationKey: 'butterfly' },
  nya: { kana: 'にゃんこ', romaji: 'nyanko', meaning_fr: 'chat', illustrationKey: 'cat' },
  nyu: { kana: 'ニュース', romaji: 'nyuusu', meaning_fr: 'nouvelles', illustrationKey: 'news' },
  nyo: { kana: 'にょきにょき', romaji: 'nyokinyoki', meaning_fr: 'qui pousse', illustrationKey: 'sprout' },
  hya: { kana: 'ひゃく', romaji: 'hyaku', meaning_fr: 'cent', illustrationKey: 'hundred' },
  hyu: { kana: 'ヒュー', romaji: 'hyuu', meaning_fr: 'sifflement', illustrationKey: 'wind' },
  hyo: { kana: 'ひょう', romaji: 'hyou', meaning_fr: 'tableau', illustrationKey: 'chart' },
  bya: { kana: 'びゃくや', romaji: 'byakuya', meaning_fr: 'nuit blanche', illustrationKey: 'night' },
  byu: { kana: 'ビュー', romaji: 'byuu', meaning_fr: 'vue', illustrationKey: 'view' },
  byo: { kana: 'びょういん', romaji: 'byouin', meaning_fr: 'hôpital', illustrationKey: 'hospital' },
  pya: { kana: 'ピャノ', romaji: 'pyano', meaning_fr: 'piano', illustrationKey: 'piano' },
  pyu: { kana: 'ピュア', romaji: 'pyua', meaning_fr: 'pur', illustrationKey: 'sparkles' },
  pyo: { kana: 'ぴょん', romaji: 'pyon', meaning_fr: 'bond', illustrationKey: 'jump' },
  mya: { kana: 'みゃく', romaji: 'myaku', meaning_fr: 'pouls', illustrationKey: 'heartbeat' },
  myu: { kana: 'ミュージック', romaji: 'myuujikku', meaning_fr: 'musique', illustrationKey: 'music' },
  myo: { kana: 'みょうじ', romaji: 'myouji', meaning_fr: 'nom de famille', illustrationKey: 'label' },
  rya: { kana: 'りゃく', romaji: 'ryaku', meaning_fr: 'abréviation', illustrationKey: 'memo' },
  ryu: { kana: 'りゅう', romaji: 'ryuu', meaning_fr: 'dragon', illustrationKey: 'dragon' },
  ryo: { kana: 'りょうり', romaji: 'ryouri', meaning_fr: 'cuisine', illustrationKey: 'cooking' },
  wi: { kana: 'ウィンドウ', romaji: 'windou', meaning_fr: 'fenêtre', illustrationKey: 'window' },
  we: { kana: 'ウェブ', romaji: 'webu', meaning_fr: 'web', illustrationKey: 'web' },
  kā: { kana: 'カー', romaji: 'kaa', meaning_fr: 'voiture', illustrationKey: 'car' },
  kī: { kana: 'キー', romaji: 'kii', meaning_fr: 'clé', illustrationKey: 'key' },
  kū: { kana: 'クール', romaji: 'kuuru', meaning_fr: 'cool', illustrationKey: 'cool' },
  kē: { kana: 'ケーキ', romaji: 'keeki', meaning_fr: 'gâteau', illustrationKey: 'cake' },
  kō: { kana: 'コーヒー', romaji: 'koohii', meaning_fr: 'café', illustrationKey: 'coffee' },
};

const COMBINED_KANA_ILLUSTRATIONS: Record<string, { uri: string; fallback: string }> = {
  cabbage: { uri: openMoji('1F96C'), fallback: '🥬' },
  cucumber: { uri: openMoji('1F952'), fallback: '🥒' },
  today: { uri: openMoji('1F4C5'), fallback: '📅' },
  joke: { uri: openMoji('1F602'), fallback: '😂' },
  milk: { uri: openMoji('1F95B'), fallback: '🥛' },
  dumpling: { uri: openMoji('1F95F'), fallback: '🥟' },
  chef: { uri: openMoji('1F9D1-200D-1F373'), fallback: '🧑‍🍳' },
  photo: { uri: openMoji('1F5BC'), fallback: '🖼️' },
  homework: { uri: openMoji('1F4D6'), fallback: '📖' },
  school: { uri: openMoji('1F3EB'), fallback: '🏫' },
  icecream: { uri: openMoji('1F368'), fallback: '🍨' },
  potato: { uri: openMoji('1F954'), fallback: '🥔' },
  juice: { uri: openMoji('1F9C3'), fallback: '🧃' },
  star: { uri: openMoji('2B50'), fallback: '⭐' },
  chess: { uri: openMoji('265F'), fallback: '♟️' },
  tea: { uri: openMoji('1F375'), fallback: '🍵' },
  syringe: { uri: openMoji('1F489'), fallback: '💉' },
  butterfly: { uri: openMoji('1F98B'), fallback: '🦋' },
  cat: { uri: openMoji('1F431'), fallback: '🐱' },
  news: { uri: openMoji('1F4F0'), fallback: '📰' },
  sprout: { uri: openMoji('1F331'), fallback: '🌱' },
  hundred: { uri: openMoji('1F4AF'), fallback: '💯' },
  wind: { uri: openMoji('1F32C'), fallback: '🌬️' },
  chart: { uri: openMoji('1F4CA'), fallback: '📊' },
  night: { uri: openMoji('1F303'), fallback: '🌃' },
  view: { uri: openMoji('1F441'), fallback: '👁️' },
  hospital: { uri: openMoji('1F3E5'), fallback: '🏥' },
  piano: { uri: openMoji('1F3B9'), fallback: '🎹' },
  sparkles: { uri: openMoji('2728'), fallback: '✨' },
  jump: { uri: openMoji('1F998'), fallback: '🦘' },
  heartbeat: { uri: openMoji('1FAC0'), fallback: '🫀' },
  music: { uri: openMoji('1F3B5'), fallback: '🎵' },
  label: { uri: openMoji('1F3F7'), fallback: '🏷️' },
  memo: { uri: openMoji('1F4DD'), fallback: '📝' },
  dragon: { uri: openMoji('1F409'), fallback: '🐉' },
  cooking: { uri: openMoji('1F373'), fallback: '🍳' },
  window: { uri: openMoji('1FA9F'), fallback: '🪟' },
  web: { uri: openMoji('1F310'), fallback: '🌐' },
  car: { uri: openMoji('1F697'), fallback: '🚗' },
  key: { uri: openMoji('1F511'), fallback: '🔑' },
  cool: { uri: openMoji('1F60E'), fallback: '😎' },
  cake: { uri: openMoji('1F370'), fallback: '🍰' },
  coffee: { uri: openMoji('2615'), fallback: '☕' },
};

const HIRAGANA_BY_KATAKANA = new Map<string, string>();
HIRAGANA_STANDARD.forEach((row, rowIndex) => {
  row.forEach((hiragana, cellIndex) => {
    const katakana = KATAKANA_STANDARD[rowIndex]?.[cellIndex];
    if (hiragana && katakana) HIRAGANA_BY_KATAKANA.set(katakana, hiragana);
  });
});

const KATAKANA_BY_HIRAGANA = new Map<string, string>();
HIRAGANA_BY_KATAKANA.forEach((hiragana, katakana) => {
  KATAKANA_BY_HIRAGANA.set(hiragana, katakana);
});

const ILLUSTRATED_MNEMONICS: Record<
  string,
  {
    background: string;
    accent: string;
    wordKana: string;
    wordRomaji: string;
    meaning: string;
    art: string;
    illustrationUri?: string;
    illustrationFallback: string;
  }
> = {
  あ: {
    background: '#E5C856',
    accent: '#C96D58',
    wordKana: 'あめ',
    wordRomaji: 'ame',
    meaning: 'pluie',
    art: 'umbrella',
    illustrationUri: openMoji('2614'),
    illustrationFallback: '☔',
  },
  い: {
    background: '#C96555',
    accent: '#2F3A3A',
    wordKana: 'いのち',
    wordRomaji: 'inochi',
    meaning: 'vie',
    art: 'life',
    illustrationUri: openMoji('1F331'),
    illustrationFallback: '🌱',
  },
  う: {
    background: '#6F9AD2',
    accent: '#E8EEF3',
    wordKana: 'うさぎ',
    wordRomaji: 'usagi',
    meaning: 'lapin',
    art: 'rabbit',
    illustrationUri: openMoji('1F407'),
    illustrationFallback: '🐇',
  },
  え: {
    background: '#AED98C',
    accent: '#5A8AC4',
    wordKana: 'えいえん',
    wordRomaji: 'eien',
    meaning: 'éternité',
    art: 'eternity',
    illustrationUri: openMoji('267E'),
    illustrationFallback: '∞',
  },
  お: {
    background: '#D0A76D',
    accent: '#3F4A4A',
    wordKana: 'おおきい',
    wordRomaji: 'ookii',
    meaning: 'gros',
    art: 'big',
    illustrationUri: openMoji('1F418'),
    illustrationFallback: '🐘',
  },
  か: {
    background: '#E4CA59',
    accent: '#B55D50',
    wordKana: 'かめ',
    wordRomaji: 'kame',
    meaning: 'tortue',
    art: 'turtle',
    illustrationUri: openMoji('1F422'),
    illustrationFallback: '🐢',
  },
  き: {
    background: '#4B4C49',
    accent: '#D7B846',
    wordKana: 'きん',
    wordRomaji: 'kin',
    meaning: 'or',
    art: 'gold',
    illustrationUri: openMoji('1FA99'),
    illustrationFallback: '🪙',
  },
  く: {
    background: '#719DD0',
    accent: '#2F3A3A',
    wordKana: 'くつ',
    wordRomaji: 'kutsu',
    meaning: 'chaussure',
    art: 'shoe',
    illustrationUri: openMoji('1F45F'),
    illustrationFallback: '👟',
  },
  け: {
    background: '#AFD98E',
    accent: '#C98552',
    wordKana: 'けん',
    wordRomaji: 'ken',
    meaning: 'épée',
    art: 'sword',
    illustrationUri: openMoji('2694'),
    illustrationFallback: '⚔️',
  },
  ま: {
    background: '#F2B63F',
    accent: '#8F6B3C',
    wordKana: 'ま',
    wordRomaji: 'ma',
    meaning: 'un mât',
    art: 'mast',
    illustrationUri: openMoji('26F5'),
    illustrationFallback: '⛵',
  },
};

const emptyStats: DashboardStats = {
  questions: 0,
  vocabulary: 0,
  grammar: 0,
  kanji: 0,
  kana: 0,
  audio: 0,
  attempts: 0,
  todayAttempts: 0,
  todayCorrect: 0,
  correctRate: 0,
};

const MAX_LEVEL = 250;
const CALENDAR_HISTORY_DAYS = 365;
const GOAL_PLAN_DAYS = 730;
const LEAGUE_NAMES = [
  { name: 'Bronze', symbol: '銅' },
  { name: 'Argent', symbol: '銀' },
  { name: 'Or', symbol: '金' },
  { name: 'Platine', symbol: '白' },
  { name: 'Émeraude', symbol: '翠' },
  { name: 'Sakura', symbol: '桜' },
  { name: 'Fuji', symbol: '富' },
  { name: 'Sensei', symbol: '先' },
  { name: 'JLPT', symbol: '試' },
  { name: 'Elite N5', symbol: '合' },
];
const LEAGUE_DIVISIONS = ['V', 'IV', 'III', 'II', 'I'];
const LEAGUE_TIERS: LeagueTier[] = LEAGUE_NAMES.flatMap((league, leagueIndex) =>
  LEAGUE_DIVISIONS.map((division, divisionIndex) => ({
    name: `${league.name} ${division}`,
    minLevel: 1 + (leagueIndex * LEAGUE_DIVISIONS.length + divisionIndex) * 5,
    symbol: `${league.symbol}${divisionIndex + 1}`,
  }))
).map((league, index, all) =>
  index === all.length - 1 ? { ...league, minLevel: MAX_LEVEL } : league
);

const GRAMMAR_LESSONS: GrammarLesson[] = [
  {
    id: 'wa-topic',
    folder: 'Fondations',
    subfolder: 'Particules essentielles',
    order: 1,
    title: 'は : annoncer le sujet',
    pattern: 'A は B です',
    level: 'facile',
    goal: 'Dire de quoi on parle.',
    explanation: 'は se prononce wa quand il marque le thème. Il place le projecteur sur le mot avant lui.',
    formula: 'Sujet + は + information + です',
    trap: 'Ne traduis pas は par “est”. Il sert surtout à annoncer le thème.',
    examples: [
      { id: 'wa-1', kana: 'わたしはがくせいです。', kanji: '私は学生です。', romaji: 'Watashi wa gakusei desu.', fr: 'Je suis étudiant.', note: '学生 est un mot N5 très fréquent.' },
      { id: 'wa-2', kana: 'これはみずです。', kanji: 'これは水です。', romaji: 'Kore wa mizu desu.', fr: 'Ceci est de l’eau.', note: 'これ + は permet de présenter un objet proche.' },
    ],
  },
  {
    id: 'desu-copula',
    folder: 'Fondations',
    subfolder: 'Phrases nominales',
    order: 2,
    title: 'です : phrase polie simple',
    pattern: 'Nom / adjectif + です',
    level: 'facile',
    goal: 'Faire des phrases polies et propres.',
    explanation: 'です rend la phrase polie. Avec un nom ou un adjectif, c’est la forme de base la plus utile au N5.',
    formula: 'Information + です',
    trap: 'Avec un verbe, on n’ajoute pas です après la forme ます.',
    examples: [
      { id: 'desu-1', kana: 'きょうはあめです。', kanji: '今日は雨です。', romaji: 'Kyou wa ame desu.', fr: 'Aujourd’hui, il pleut.', note: '雨 est utile pour les conversations simples.' },
      { id: 'desu-2', kana: 'このほんはやすいです。', kanji: 'この本は安いです。', romaji: 'Kono hon wa yasui desu.', fr: 'Ce livre est bon marché.', note: 'この + nom = ce/cette près de moi.' },
    ],
  },
  {
    id: 'ka-question',
    folder: 'Fondations',
    subfolder: 'Questions',
    order: 3,
    title: 'か : poser une question',
    pattern: 'Phrase + か',
    level: 'facile',
    goal: 'Transformer une phrase polie en question.',
    explanation: 'か se place à la fin. En japonais poli, il suffit souvent de garder l’ordre de la phrase et d’ajouter か.',
    formula: 'Phrase polie + か',
    trap: 'Pas besoin de point d’interrogation dans une phrase japonaise standard.',
    examples: [
      { id: 'ka-1', kana: 'これはえんぴつですか。', kanji: 'これは鉛筆ですか。', romaji: 'Kore wa enpitsu desu ka.', fr: 'Est-ce un crayon ?', note: '鉛筆 est vocabulaire N5.' },
      { id: 'ka-2', kana: 'あしたがっこうへいきますか。', kanji: '明日学校へ行きますか。', romaji: 'Ashita gakkou e ikimasu ka.', fr: 'Est-ce que tu vas à l’école demain ?', note: '明日 et 学校 reviennent souvent.' },
    ],
  },
  {
    id: 'no-possession',
    folder: 'Fondations',
    subfolder: 'Particules essentielles',
    order: 4,
    title: 'の : possession et précision',
    pattern: 'A の B',
    level: 'facile',
    goal: 'Relier deux noms.',
    explanation: 'の indique souvent l’appartenance, l’origine ou une précision. Le nom important arrive après の.',
    formula: 'Nom qui précise + の + nom principal',
    trap: 'L’ordre est inverse du français : 日本の本 = livre du Japon.',
    examples: [
      { id: 'no-1', kana: 'これはわたしのかばんです。', kanji: 'これは私の鞄です。', romaji: 'Kore wa watashi no kaban desu.', fr: 'C’est mon sac.', note: '私の = mon/ma/mes.' },
      { id: 'no-2', kana: 'にほんごのせんせいです。', kanji: '日本語の先生です。', romaji: 'Nihongo no sensei desu.', fr: 'C’est un professeur de japonais.', note: '日本語の précise le type de professeur.' },
    ],
  },
  {
    id: 'mo-also',
    folder: 'Fondations',
    subfolder: 'Particules essentielles',
    order: 5,
    title: 'も : aussi',
    pattern: 'A も',
    level: 'facile',
    goal: 'Ajouter “aussi” dans une phrase.',
    explanation: 'も remplace souvent は quand on veut dire “aussi”.',
    formula: 'Sujet + も + information',
    trap: 'Évite はも. On utilise généralement も seul.',
    examples: [
      { id: 'mo-1', kana: 'わたしもいきます。', kanji: '私も行きます。', romaji: 'Watashi mo ikimasu.', fr: 'Moi aussi, j’y vais.', note: '行きます est la forme polie de aller.' },
      { id: 'mo-2', kana: 'これもおいしいです。', kanji: 'これも美味しいです。', romaji: 'Kore mo oishii desu.', fr: 'Ceci aussi est bon.', note: '美味しい est très courant dans la vie quotidienne.' },
    ],
  },
  {
    id: 'wo-object',
    folder: 'Actions',
    subfolder: 'Particules avec verbes',
    order: 6,
    title: 'を : objet direct',
    pattern: 'Nom を verbe',
    level: 'facile',
    goal: 'Dire ce que l’action touche.',
    explanation: 'を se prononce o et marque souvent l’objet direct : ce que l’on mange, boit, lit, achète.',
    formula: 'Objet + を + verbe',
    trap: 'を s’écrit wo en romaji parfois, mais se prononce o.',
    examples: [
      { id: 'wo-1', kana: 'みずをのみます。', kanji: '水を飲みます。', romaji: 'Mizu o nomimasu.', fr: 'Je bois de l’eau.', note: '水 et 飲みます sont N5.' },
      { id: 'wo-2', kana: 'ほんをよみます。', kanji: '本を読みます。', romaji: 'Hon o yomimasu.', fr: 'Je lis un livre.', note: '本を読む est une combinaison très fréquente.' },
    ],
  },
  {
    id: 'e-direction',
    folder: 'Actions',
    subfolder: 'Déplacement',
    order: 7,
    title: 'へ : direction',
    pattern: 'Lieu へ 行きます',
    level: 'facile',
    goal: 'Indiquer vers où on va.',
    explanation: 'へ se prononce e et indique une direction. Il va souvent avec 行く, 来る, 帰る.',
    formula: 'Destination + へ + verbe de mouvement',
    trap: 'へ insiste sur la direction, に insiste souvent sur le point d’arrivée.',
    examples: [
      { id: 'e-1', kana: 'がっこうへいきます。', kanji: '学校へ行きます。', romaji: 'Gakkou e ikimasu.', fr: 'Je vais à l’école.', note: '学校 est N5.' },
      { id: 'e-2', kana: 'うちへかえります。', kanji: '家へ帰ります。', romaji: 'Uchi e kaerimasu.', fr: 'Je rentre à la maison.', note: '帰ります = rentrer.' },
    ],
  },
  {
    id: 'ni-time',
    folder: 'Actions',
    subfolder: 'Temps et destination',
    order: 8,
    title: 'に : heure et point d’arrivée',
    pattern: 'Temps に / lieu に',
    level: 'pratique',
    goal: 'Préciser quand ou où arrive l’action.',
    explanation: 'に marque souvent une heure précise, un jour, un endroit d’arrivée ou une existence.',
    formula: 'Heure + に + action',
    trap: 'Aujourd’hui, demain, hier n’ont généralement pas besoin de に.',
    examples: [
      { id: 'ni-1', kana: 'しちじにおきます。', kanji: '七時に起きます。', romaji: 'Shichi-ji ni okimasu.', fr: 'Je me lève à 7 heures.', note: '時 sert à lire les heures.' },
      { id: 'ni-2', kana: 'えきにいきます。', kanji: '駅に行きます。', romaji: 'Eki ni ikimasu.', fr: 'Je vais à la gare.', note: '駅 est utile en voyage.' },
    ],
  },
  {
    id: 'de-place',
    folder: 'Actions',
    subfolder: 'Lieu et moyen',
    order: 9,
    title: 'で : lieu de l’action',
    pattern: 'Lieu で action',
    level: 'pratique',
    goal: 'Dire où une action se passe.',
    explanation: 'で marque le lieu où l’on fait quelque chose : manger, étudier, acheter, lire.',
    formula: 'Lieu + で + verbe d’action',
    trap: 'Pour exister quelque part, on utilise plutôt に avec あります/います.',
    examples: [
      { id: 'de-1', kana: 'としょかんでべんきょうします。', kanji: '図書館で勉強します。', romaji: 'Toshokan de benkyou shimasu.', fr: 'J’étudie à la bibliothèque.', note: '勉強します est essentiel.' },
      { id: 'de-2', kana: 'みせでパンをかいます。', kanji: '店でパンを買います。', romaji: 'Mise de pan o kaimasu.', fr: 'J’achète du pain au magasin.', note: '店 et 買います sont N5.' },
    ],
  },
  {
    id: 'de-tool',
    folder: 'Actions',
    subfolder: 'Lieu et moyen',
    order: 10,
    title: 'で : moyen ou outil',
    pattern: 'Moyen で action',
    level: 'pratique',
    goal: 'Dire avec quoi ou comment on fait.',
    explanation: 'で peut indiquer le moyen : en train, en japonais, avec des baguettes.',
    formula: 'Moyen / outil + で + verbe',
    trap: 'Même particule que le lieu d’action, mais le sens vient du contexte.',
    examples: [
      { id: 'de-tool-1', kana: 'でんしゃでいきます。', kanji: '電車で行きます。', romaji: 'Densha de ikimasu.', fr: 'J’y vais en train.', note: '電車 est utile au JLPT N5.' },
      { id: 'de-tool-2', kana: 'にほんごではなします。', kanji: '日本語で話します。', romaji: 'Nihongo de hanashimasu.', fr: 'Je parle en japonais.', note: '日本語で = en japonais.' },
    ],
  },
  {
    id: 'ga-subject',
    folder: 'Fondations',
    subfolder: 'Particules essentielles',
    order: 11,
    title: 'が : sujet nouveau ou important',
    pattern: 'A が ...',
    level: 'pratique',
    goal: 'Identifier ce qui est important dans la phrase.',
    explanation: 'が marque souvent le sujet grammatical, surtout quand l’information est nouvelle ou mise en avant.',
    formula: 'Sujet précis + が + description/action',
    trap: 'は parle du thème général ; が pointe souvent le sujet exact.',
    examples: [
      { id: 'ga-1', kana: 'ねこがいます。', kanji: '猫がいます。', romaji: 'Neko ga imasu.', fr: 'Il y a un chat.', note: 'いる sert aux êtres vivants.' },
      { id: 'ga-2', kana: 'あめがふります。', kanji: '雨が降ります。', romaji: 'Ame ga furimasu.', fr: 'La pluie tombe / il pleut.', note: 'Expression courante météo.' },
    ],
  },
  {
    id: 'aru-iru',
    folder: 'Vie courante',
    subfolder: 'Existence',
    order: 12,
    title: 'あります / います : il y a',
    pattern: 'Objet が あります / personne が います',
    level: 'pratique',
    goal: 'Dire qu’une chose ou une personne existe.',
    explanation: 'あります s’utilise pour les objets et plantes. います s’utilise pour personnes et animaux.',
    formula: 'Lieu に + chose/personne が + あります/います',
    trap: 'Chat, chien, personne = います. Livre, table, argent = あります.',
    examples: [
      { id: 'aru-1', kana: 'つくえのうえにほんがあります。', kanji: '机の上に本があります。', romaji: 'Tsukue no ue ni hon ga arimasu.', fr: 'Il y a un livre sur le bureau.', note: '上 = au-dessus/sur.' },
      { id: 'iru-1', kana: 'へやにともだちがいます。', kanji: '部屋に友達がいます。', romaji: 'Heya ni tomodachi ga imasu.', fr: 'Il y a un ami dans la pièce.', note: '友達 est très courant.' },
    ],
  },
  {
    id: 'kore-sore-are',
    folder: 'Vie courante',
    subfolder: 'Démonstratifs',
    order: 13,
    title: 'これ / それ / あれ',
    pattern: 'ceci / cela / cela là-bas',
    level: 'facile',
    goal: 'Désigner une chose.',
    explanation: 'これ est près de moi, それ près de toi, あれ loin de nous deux.',
    formula: 'これ/それ/あれ + は + information',
    trap: 'Ces mots remplacent un nom. Pour dire “ce livre”, utilise この本.',
    examples: [
      { id: 'kore-1', kana: 'これはなんですか。', kanji: 'これは何ですか。', romaji: 'Kore wa nan desu ka.', fr: 'Qu’est-ce que c’est ?', note: 'Question ultra fréquente.' },
      { id: 'are-1', kana: 'あれはやまです。', kanji: 'あれは山です。', romaji: 'Are wa yama desu.', fr: 'Là-bas, c’est une montagne.', note: '山 est kanji N5.' },
    ],
  },
  {
    id: 'kono-sono-ano',
    folder: 'Vie courante',
    subfolder: 'Démonstratifs',
    order: 14,
    title: 'この / その / あの + nom',
    pattern: 'この Nom',
    level: 'facile',
    goal: 'Dire “ce/cette + nom”.',
    explanation: 'この, その, あの doivent être suivis d’un nom.',
    formula: 'この/その/あの + nom + は ...',
    trap: 'Ne dis pas このです. Il faut un nom après この.',
    examples: [
      { id: 'kono-1', kana: 'このえんぴつはながいです。', kanji: 'この鉛筆は長いです。', romaji: 'Kono enpitsu wa nagai desu.', fr: 'Ce crayon est long.', note: '長い = long.' },
      { id: 'sono-1', kana: 'そのくるまはあたらしいです。', kanji: 'その車は新しいです。', romaji: 'Sono kuruma wa atarashii desu.', fr: 'Cette voiture est neuve.', note: '新しい est N5.' },
    ],
  },
  {
    id: 'imasu-masu',
    folder: 'Actions',
    subfolder: 'Verbes polis',
    order: 15,
    title: 'ます : action polie',
    pattern: 'Verbe en ます',
    level: 'facile',
    goal: 'Parler d’habitudes ou du futur proche poliment.',
    explanation: 'La forme ます sert pour les actions polies au présent/futur.',
    formula: 'Radical poli + ます',
    trap: 'Le contexte indique souvent présent ou futur.',
    examples: [
      { id: 'masu-1', kana: 'まいにちごはんをたべます。', kanji: '毎日ご飯を食べます。', romaji: 'Mainichi gohan o tabemasu.', fr: 'Je mange du riz / un repas tous les jours.', note: '毎日 indique l’habitude.' },
      { id: 'masu-2', kana: 'あしたともだちにあいます。', kanji: '明日友達に会います。', romaji: 'Ashita tomodachi ni aimasu.', fr: 'Demain, je rencontre un ami.', note: '明日 indique le futur.' },
    ],
  },
  {
    id: 'masen-negative',
    folder: 'Actions',
    subfolder: 'Verbes polis',
    order: 16,
    title: 'ません : négation polie',
    pattern: 'Verbe + ません',
    level: 'facile',
    goal: 'Dire qu’on ne fait pas.',
    explanation: 'ません est la forme négative polie des verbes.',
    formula: 'Radical poli + ません',
    trap: 'Ne combine pas ます et ない : choisis ません en style poli.',
    examples: [
      { id: 'masen-1', kana: 'きょうはにくをたべません。', kanji: '今日は肉を食べません。', romaji: 'Kyou wa niku o tabemasen.', fr: 'Aujourd’hui, je ne mange pas de viande.', note: '肉 est vocabulaire N5.' },
      { id: 'masen-2', kana: 'テレビをみません。', kanji: 'テレビを見ません。', romaji: 'Terebi o mimasen.', fr: 'Je ne regarde pas la télévision.', note: '見る = voir/regarder.' },
    ],
  },
  {
    id: 'mashita-past',
    folder: 'Actions',
    subfolder: 'Passé',
    order: 17,
    title: 'ました : passé poli',
    pattern: 'Verbe + ました',
    level: 'pratique',
    goal: 'Raconter une action passée.',
    explanation: 'ました marque une action terminée dans le passé en style poli.',
    formula: 'Radical poli + ました',
    trap: 'Pour nier au passé, utilise ませんでした.',
    examples: [
      { id: 'mashita-1', kana: 'きのうえいがをみました。', kanji: '昨日映画を見ました。', romaji: 'Kinou eiga o mimashita.', fr: 'Hier, j’ai regardé un film.', note: '昨日 signale le passé.' },
      { id: 'mashita-2', kana: 'あさごはんをたべました。', kanji: '朝ご飯を食べました。', romaji: 'Asa-gohan o tabemashita.', fr: 'J’ai pris le petit-déjeuner.', note: '朝ご飯 est utile au quotidien.' },
    ],
  },
  {
    id: 'masen-deshita',
    folder: 'Actions',
    subfolder: 'Passé',
    order: 18,
    title: 'ませんでした : passé négatif',
    pattern: 'Verbe + ませんでした',
    level: 'pratique',
    goal: 'Dire qu’on n’a pas fait.',
    explanation: 'C’est la négation polie au passé.',
    formula: 'Radical poli + ませんでした',
    trap: 'Ne dis pas ましたない. La forme correcte est ませんでした.',
    examples: [
      { id: 'masendeshita-1', kana: 'きのうべんきょうしませんでした。', kanji: '昨日勉強しませんでした。', romaji: 'Kinou benkyou shimasen deshita.', fr: 'Hier, je n’ai pas étudié.', note: '勉強する devient 勉強します.' },
      { id: 'masendeshita-2', kana: 'けさコーヒーをのみませんでした。', kanji: '今朝コーヒーを飲みませんでした。', romaji: 'Kesa koohii o nomimasen deshita.', fr: 'Ce matin, je n’ai pas bu de café.', note: '今朝 = ce matin.' },
    ],
  },
  {
    id: 'i-adjectives',
    folder: 'Descriptions',
    subfolder: 'Adjectifs',
    order: 19,
    title: 'Adjectifs en い',
    pattern: 'い-adjectif + です',
    level: 'pratique',
    goal: 'Décrire les choses simplement.',
    explanation: 'Les adjectifs en い gardent leur い devant です.',
    formula: 'Nom は + adjectif en い + です',
    trap: 'Ne mets pas な après un adjectif en い.',
    examples: [
      { id: 'i-adj-1', kana: 'このみちはながいです。', kanji: 'この道は長いです。', romaji: 'Kono michi wa nagai desu.', fr: 'Cette route est longue.', note: '道 est N5.' },
      { id: 'i-adj-2', kana: 'このみずはつめたいです。', kanji: 'この水は冷たいです。', romaji: 'Kono mizu wa tsumetai desu.', fr: 'Cette eau est froide.', note: '冷たい s’utilise pour les objets au toucher.' },
    ],
  },
  {
    id: 'i-adjective-negative',
    folder: 'Descriptions',
    subfolder: 'Adjectifs',
    order: 20,
    title: 'Adjectif い négatif : くない',
    pattern: '高い → 高くない',
    level: 'pratique',
    goal: 'Dire qu’une chose n’est pas comme ça.',
    explanation: 'Pour nier un adjectif en い, remplace い par くない.',
    formula: 'Adjectif sans い + くないです',
    trap: 'いい devient よくない, pas いくない.',
    examples: [
      { id: 'i-neg-1', kana: 'このほんはたかくないです。', kanji: 'この本は高くないです。', romaji: 'Kono hon wa takakunai desu.', fr: 'Ce livre n’est pas cher.', note: '高い = cher/haut.' },
      { id: 'i-neg-2', kana: 'きょうはさむくないです。', kanji: '今日は寒くないです。', romaji: 'Kyou wa samukunai desu.', fr: 'Aujourd’hui, il ne fait pas froid.', note: '寒い décrit la météo froide.' },
    ],
  },
  {
    id: 'na-adjectives',
    folder: 'Descriptions',
    subfolder: 'Adjectifs',
    order: 21,
    title: 'Adjectifs en な',
    pattern: '静かな町 / 町は静かです',
    level: 'pratique',
    goal: 'Utiliser les adjectifs nominaux.',
    explanation: 'Les adjectifs en な prennent な devant un nom, mais pas avant です.',
    formula: 'な-adjectif + な + nom',
    trap: '静かです, pas 静かなです.',
    examples: [
      { id: 'na-1', kana: 'しずかなまちです。', kanji: '静かな町です。', romaji: 'Shizuka na machi desu.', fr: 'C’est une ville calme.', note: '町 est courant.' },
      { id: 'na-2', kana: 'このへやはきれいです。', kanji: 'この部屋は綺麗です。', romaji: 'Kono heya wa kirei desu.', fr: 'Cette pièce est propre/jolie.', note: '綺麗 est souvent écrit en kana.' },
    ],
  },
  {
    id: 'te-form-request',
    folder: 'Actions',
    subfolder: 'Forme て',
    order: 22,
    title: 'てください : demande polie',
    pattern: 'Verbe て + ください',
    level: 'intermediaire',
    goal: 'Demander à quelqu’un de faire quelque chose.',
    explanation: 'La forme て + ください sert à formuler une demande claire et polie.',
    formula: 'Action en て + ください',
    trap: 'ください tout seul veut dire “donnez-moi”, mais après un verbe il demande une action.',
    examples: [
      { id: 'te-kudasai-1', kana: 'ここにかいてください。', kanji: 'ここに書いてください。', romaji: 'Koko ni kaite kudasai.', fr: 'Écrivez ici, s’il vous plaît.', note: '書く → 書いて.' },
      { id: 'te-kudasai-2', kana: 'もういちどいってください。', kanji: 'もう一度言ってください。', romaji: 'Mou ichido itte kudasai.', fr: 'Veuillez le dire encore une fois.', note: 'もう一度 est très utile.' },
    ],
  },
  {
    id: 'te-imasu',
    folder: 'Actions',
    subfolder: 'Forme て',
    order: 23,
    title: 'ています : action en cours',
    pattern: 'Verbe て + います',
    level: 'intermediaire',
    goal: 'Dire ce qui est en train de se passer.',
    explanation: 'ています indique souvent une action en cours ou un état résultant.',
    formula: 'Verbe en て + います',
    trap: 'Le sens peut être “en train de” ou “être dans un état”.',
    examples: [
      { id: 'teimasu-1', kana: 'いまべんきょうしています。', kanji: '今勉強しています。', romaji: 'Ima benkyou shite imasu.', fr: 'Je suis en train d’étudier.', note: '今 renforce l’action en cours.' },
      { id: 'teimasu-2', kana: 'あにはとうきょうにすんでいます。', kanji: '兄は東京に住んでいます。', romaji: 'Ani wa Toukyou ni sunde imasu.', fr: 'Mon grand frère habite à Tokyo.', note: '住んでいます exprime un état durable.' },
    ],
  },
  {
    id: 'tai-want',
    folder: 'Vie courante',
    subfolder: 'Envies',
    order: 24,
    title: 'たい : vouloir faire',
    pattern: 'Radical ます + たい',
    level: 'intermediaire',
    goal: 'Exprimer une envie personnelle.',
    explanation: 'たい se colle au radical de la forme ます pour dire “vouloir faire”.',
    formula: '食べます → 食べたいです',
    trap: 'たい parle surtout de ce que “je” veux. Pour les autres, on utilise souvent d’autres formes plus tard.',
    examples: [
      { id: 'tai-1', kana: 'すしをたべたいです。', kanji: '寿司を食べたいです。', romaji: 'Sushi o tabetai desu.', fr: 'Je veux manger des sushis.', note: '寿司 est facile à mémoriser.' },
      { id: 'tai-2', kana: 'にほんへいきたいです。', kanji: '日本へ行きたいです。', romaji: 'Nihon e ikitai desu.', fr: 'Je veux aller au Japon.', note: '行きます → 行きたい.' },
    ],
  },
  {
    id: 'ga-suki',
    folder: 'Vie courante',
    subfolder: 'Goûts',
    order: 25,
    title: 'が好きです : aimer',
    pattern: 'Nom が 好きです',
    level: 'pratique',
    goal: 'Dire ce qu’on aime.',
    explanation: '好き se comporte comme un adjectif en な. La chose aimée est souvent marquée par が.',
    formula: 'Chose aimée + が + 好きです',
    trap: 'Ce n’est pas un verbe comme “aimer” en français.',
    examples: [
      { id: 'suki-1', kana: 'ねこがすきです。', kanji: '猫が好きです。', romaji: 'Neko ga suki desu.', fr: 'J’aime les chats.', note: '猫 est utile et concret.' },
      { id: 'suki-2', kana: 'にほんごがすきです。', kanji: '日本語が好きです。', romaji: 'Nihongo ga suki desu.', fr: 'J’aime le japonais.', note: 'Très utile pour parler de ton apprentissage.' },
    ],
  },
  {
    id: 'kara-because',
    folder: 'Lier les idées',
    subfolder: 'Raison',
    order: 26,
    title: 'から : parce que',
    pattern: 'Raison から résultat',
    level: 'intermediaire',
    goal: 'Donner une raison simple.',
    explanation: 'から relie une cause à une conséquence. Il vient après la raison.',
    formula: 'Phrase raison + から + phrase résultat',
    trap: 'から peut aussi vouloir dire “depuis”. Le contexte décide.',
    examples: [
      { id: 'kara-1', kana: 'あめですから、いきません。', kanji: '雨ですから、行きません。', romaji: 'Ame desu kara, ikimasen.', fr: 'Comme il pleut, je n’y vais pas.', note: 'Phrase utile au quotidien.' },
      { id: 'kara-2', kana: 'じかんがありませんから、タクシーでいきます。', kanji: '時間がありませんから、タクシーで行きます。', romaji: 'Jikan ga arimasen kara, takushii de ikimasu.', fr: 'Comme je n’ai pas le temps, j’y vais en taxi.', note: '時間がない = ne pas avoir le temps.' },
    ],
  },
  {
    id: 'demo-but',
    folder: 'Lier les idées',
    subfolder: 'Contraste',
    order: 27,
    title: 'でも : mais',
    pattern: 'Phrase. でも, phrase.',
    level: 'pratique',
    goal: 'Contraster deux idées.',
    explanation: 'でも se met souvent au début d’une phrase pour dire “mais”.',
    formula: 'Phrase A. でも, phrase B.',
    trap: 'でも est simple et conversationnel ; が peut aussi marquer “mais” dans une phrase.',
    examples: [
      { id: 'demo-1', kana: 'このほんはたかいです。でも、おもしろいです。', kanji: 'この本は高いです。でも、面白いです。', romaji: 'Kono hon wa takai desu. Demo, omoshiroi desu.', fr: 'Ce livre est cher. Mais il est intéressant.', note: '面白い est fréquent.' },
      { id: 'demo-2', kana: 'いきたいです。でも、じかんがありません。', kanji: '行きたいです。でも、時間がありません。', romaji: 'Ikitai desu. Demo, jikan ga arimasen.', fr: 'Je veux y aller. Mais je n’ai pas le temps.', note: 'Combine たい + でも.' },
    ],
  },
  {
    id: 'to-and',
    folder: 'Lier les idées',
    subfolder: 'Enumération',
    order: 28,
    title: 'と : et avec des noms',
    pattern: 'Nom と Nom',
    level: 'facile',
    goal: 'Énumérer complètement des noms.',
    explanation: 'と relie des noms de manière complète : A et B.',
    formula: 'Nom A + と + Nom B',
    trap: 'Pour une liste non complète, on utilise plutôt や.',
    examples: [
      { id: 'to-1', kana: 'パンとみずをかいます。', kanji: 'パンと水を買います。', romaji: 'Pan to mizu o kaimasu.', fr: 'J’achète du pain et de l’eau.', note: 'Liste complète.' },
      { id: 'to-2', kana: 'ははとえきへいきます。', kanji: '母と駅へ行きます。', romaji: 'Haha to eki e ikimasu.', fr: 'Je vais à la gare avec ma mère.', note: 'と peut aussi dire “avec”.' },
    ],
  },
  {
    id: 'ya-list',
    folder: 'Lier les idées',
    subfolder: 'Enumération',
    order: 29,
    title: 'や : liste ouverte',
    pattern: 'Nom や Nom',
    level: 'intermediaire',
    goal: 'Donner des exemples sans tout lister.',
    explanation: 'や signifie “comme A, B, etc.”. La liste n’est pas exhaustive.',
    formula: 'Nom A + や + Nom B + など',
    trap: 'と = liste complète ; や = exemples.',
    examples: [
      { id: 'ya-1', kana: 'つくえのうえにほんやえんぴつがあります。', kanji: '机の上に本や鉛筆があります。', romaji: 'Tsukue no ue ni hon ya enpitsu ga arimasu.', fr: 'Sur le bureau, il y a des livres, des crayons, etc.', note: 'Liste ouverte.' },
      { id: 'ya-2', kana: 'スーパーでやさいやくだものをかいます。', kanji: 'スーパーで野菜や果物を買います。', romaji: 'Suupaa de yasai ya kudamono o kaimasu.', fr: 'Au supermarché, j’achète des légumes, des fruits, etc.', note: '野菜 et 果物 sont utiles.' },
    ],
  },
  {
    id: 'mashou',
    folder: 'Interaction',
    subfolder: 'Inviter',
    order: 30,
    title: 'ましょう : faisons',
    pattern: 'Verbe + ましょう',
    level: 'pratique',
    goal: 'Proposer de faire quelque chose ensemble.',
    explanation: 'ましょう exprime une proposition ou une invitation : faisons...',
    formula: 'Radical poli + ましょう',
    trap: 'ましょう est plus affirmatif que ませんか.',
    examples: [
      { id: 'mashou-1', kana: 'いっしょにべんきょうしましょう。', kanji: '一緒に勉強しましょう。', romaji: 'Issho ni benkyou shimashou.', fr: 'Étudions ensemble.', note: '一緒に = ensemble.' },
      { id: 'mashou-2', kana: 'ひるごはんをたべましょう。', kanji: '昼ご飯を食べましょう。', romaji: 'Hiru-gohan o tabemashou.', fr: 'Mangeons le déjeuner.', note: '昼ご飯 = repas de midi.' },
    ],
  },
  {
    id: 'masenka',
    folder: 'Interaction',
    subfolder: 'Inviter',
    order: 31,
    title: 'ませんか : invitation douce',
    pattern: 'Verbe + ませんか',
    level: 'intermediaire',
    goal: 'Inviter poliment sans imposer.',
    explanation: 'ませんか veut littéralement dire “ne ... pas ?”, mais sert souvent à proposer.',
    formula: 'Radical poli + ませんか',
    trap: 'Même si la forme est négative, le sens naturel est une invitation.',
    examples: [
      { id: 'masenka-1', kana: 'いっしょにおちゃをのみませんか。', kanji: '一緒にお茶を飲みませんか。', romaji: 'Issho ni ocha o nomimasen ka.', fr: 'Tu veux boire du thé ensemble ?', note: 'Invitation polie.' },
      { id: 'masenka-2', kana: 'あしたえいがをみませんか。', kanji: '明日映画を見ませんか。', romaji: 'Ashita eiga o mimasen ka.', fr: 'Ça te dirait de voir un film demain ?', note: 'Très naturel.' },
    ],
  },
  {
    id: 'mae-ni',
    folder: 'Temps',
    subfolder: 'Avant et après',
    order: 32,
    title: '前に : avant de',
    pattern: 'Verbe dictionnaire + 前に',
    level: 'avance',
    goal: 'Organiser deux actions dans le temps.',
    explanation: '前に indique qu’une action arrive avant une autre.',
    formula: 'Verbe dictionnaire + 前に + action',
    trap: 'Avec un nom, utilise Nom の前に.',
    examples: [
      { id: 'mae-1', kana: 'ねるまえに、ほんをよみます。', kanji: '寝る前に、本を読みます。', romaji: 'Neru mae ni, hon o yomimasu.', fr: 'Avant de dormir, je lis un livre.', note: '寝る est forme dictionnaire.' },
      { id: 'mae-2', kana: 'ごはんのまえに、てをあらいます。', kanji: 'ご飯の前に、手を洗います。', romaji: 'Gohan no mae ni, te o araimasu.', fr: 'Avant le repas, je me lave les mains.', note: 'Nom + の前に.' },
    ],
  },
  {
    id: 'ato-de',
    folder: 'Temps',
    subfolder: 'Avant et après',
    order: 33,
    title: '後で : après',
    pattern: 'Nom の後で / verbe た後で',
    level: 'avance',
    goal: 'Dire ce qu’on fait après.',
    explanation: '後で indique une action qui arrive après un événement.',
    formula: 'Nom の後で + action',
    trap: 'Avec un verbe, il faut la forme passée courte : 食べた後で.',
    examples: [
      { id: 'ato-1', kana: 'がっこうのあとで、うちへかえります。', kanji: '学校の後で、家へ帰ります。', romaji: 'Gakkou no ato de, uchi e kaerimasu.', fr: 'Après l’école, je rentre à la maison.', note: 'Nom + の後で.' },
      { id: 'ato-2', kana: 'ばんごはんをたべたあとで、べんきょうします。', kanji: '晩ご飯を食べた後で、勉強します。', romaji: 'Ban-gohan o tabeta ato de, benkyou shimasu.', fr: 'Après avoir dîné, j’étudie.', note: '食べた est forme た.' },
    ],
  },
  {
    id: 'comparison-yori',
    folder: 'Descriptions',
    subfolder: 'Comparer',
    order: 34,
    title: 'より : comparaison',
    pattern: 'A は B より ...',
    level: 'avance',
    goal: 'Dire qu’une chose est plus ... qu’une autre.',
    explanation: 'より marque l’élément comparé : “que B”.',
    formula: 'A は B より + adjectif',
    trap: 'より se place après ce qui sert de référence.',
    examples: [
      { id: 'yori-1', kana: 'でんしゃはバスよりはやいです。', kanji: '電車はバスより速いです。', romaji: 'Densha wa basu yori hayai desu.', fr: 'Le train est plus rapide que le bus.', note: '速い = rapide.' },
      { id: 'yori-2', kana: 'きょうはきのうよりあついです。', kanji: '今日は昨日より暑いです。', romaji: 'Kyou wa kinou yori atsui desu.', fr: 'Aujourd’hui, il fait plus chaud qu’hier.', note: 'Comparaison très naturelle.' },
    ],
  },
  {
    id: 'ichiban',
    folder: 'Descriptions',
    subfolder: 'Comparer',
    order: 35,
    title: '一番 : le plus',
    pattern: 'A が 一番 ...',
    level: 'avance',
    goal: 'Exprimer le superlatif.',
    explanation: '一番 indique “le plus” dans un groupe.',
    formula: 'Groupe で + A が 一番 + adjectif',
    trap: '一番 signifie aussi “numéro un”.',
    examples: [
      { id: 'ichiban-1', kana: 'くだもののなかで、りんごがいちばんすきです。', kanji: '果物の中で、林檎が一番好きです。', romaji: 'Kudamono no naka de, ringo ga ichiban suki desu.', fr: 'Parmi les fruits, j’aime le plus les pommes.', note: 'の中で = parmi.' },
      { id: 'ichiban-2', kana: 'にほんごがいちばんおもしろいです。', kanji: '日本語が一番面白いです。', romaji: 'Nihongo ga ichiban omoshiroi desu.', fr: 'Le japonais est le plus intéressant.', note: 'Phrase motivante et simple.' },
    ],
  },
  {
    id: 'hou-ga-ii',
    folder: 'Interaction',
    subfolder: 'Conseiller',
    order: 36,
    title: 'ほうがいい : il vaut mieux',
    pattern: 'Verbe た / ない + ほうがいい',
    level: 'avance',
    goal: 'Donner un conseil simple.',
    explanation: 'ほうがいい sert à dire qu’une option est préférable.',
    formula: 'Verbe passé court + ほうがいいです',
    trap: 'Pour conseiller de ne pas faire, utilise la forme ない + ほうがいい.',
    examples: [
      { id: 'hou-1', kana: 'はやくねたほうがいいです。', kanji: '早く寝た方がいいです。', romaji: 'Hayaku neta hou ga ii desu.', fr: 'Tu ferais mieux de dormir tôt.', note: 'Conseil courant.' },
      { id: 'hou-2', kana: 'ここでたばこをすわないほうがいいです。', kanji: 'ここで煙草を吸わない方がいいです。', romaji: 'Koko de tabako o suwanai hou ga ii desu.', fr: 'Il vaut mieux ne pas fumer ici.', note: 'Forme négative + 方がいい.' },
    ],
  },
];

const CONSOLIDATED_GRAMMAR_LESSONS: GrammarLesson[] = [
  makeGrammarLesson(37, 'Fondations', 'Vue d’ensemble', 'Structure générale de la phrase japonaise', 'Sujet + compléments + verbe final', 'facile', 'Comprendre pourquoi le verbe arrive à la fin.', 'Le japonais organise l’information avant l’action. La phrase construit le contexte, puis finit par le verbe ou です.', 'Thème + temps/lieu/objet + verbe final', 'Ne cherche pas l’ordre français mot à mot.', [
    ['わたしはがっこうでにほんごをべんきょうします。', '私は学校で日本語を勉強します。', 'Watashi wa gakkou de nihongo o benkyou shimasu.', 'J’étudie le japonais à l’école.'],
    ['きょう、えきでともだちにあいます。', '今日、駅で友達に会います。', 'Kyou, eki de tomodachi ni aimasu.', 'Aujourd’hui, je rencontre un ami à la gare.'],
  ]),
  makeGrammarLesson(38, 'Fondations', 'Ordre des mots', 'Verbe final : la clé de lecture', 'Information + verbe', 'facile', 'Lire une phrase japonaise sans paniquer.', 'Le verbe final donne souvent le sens principal : aller, manger, lire, voir, étudier.', 'Compléments + verbe', 'Ne conclus pas trop tôt avant d’avoir lu la fin.', [
    ['あさ、パンをたべます。', '朝、パンを食べます。', 'Asa, pan o tabemasu.', 'Le matin, je mange du pain.'],
    ['よる、ほんをよみます。', '夜、本を読みます。', 'Yoru, hon o yomimasu.', 'Le soir, je lis un livre.'],
  ]),
  makeGrammarLesson(39, 'Fondations', 'Thème et sujet', 'Différence entre は et が', 'は thème / が sujet précis', 'pratique', 'Savoir pourquoi deux particules peuvent marquer un sujet apparent.', 'は présente le thème de conversation. が pointe le sujet exact, nouveau ou important.', 'Thème は ... / sujet が ...', 'は et が ne sont pas interchangeables automatiquement.', [
    ['わたしはすしがすきです。', '私は寿司が好きです。', 'Watashi wa sushi ga suki desu.', 'Moi, j’aime les sushis.'],
    ['だれがきますか。', '誰が来ますか。', 'Dare ga kimasu ka.', 'Qui vient ?'],
  ]),
  makeGrammarLesson(40, 'Fondations', 'Glossaire grammatical', 'Nom, verbe, adjectif, particule', 'Abréviations de leçon', 'facile', 'Comprendre les mots utilisés dans les leçons.', 'Une leçon peut parler de nom, verbe, adjectif en い, adjectif en な, particule, forme polie ou forme neutre.', 'Nom + particule + verbe', 'Le glossaire sert à lire les explications, pas à mémoriser du vocabulaire isolé.', [
    ['ねこがいます。', '猫がいます。', 'Neko ga imasu.', 'Il y a un chat.'],
    ['あたらしいほんです。', '新しい本です。', 'Atarashii hon desu.', 'C’est un nouveau livre.'],
  ]),
  makeGrammarLesson(41, 'Fondations', 'Noms', 'Nom + です / Nom + particule', 'Nom comme bloc de phrase', 'facile', 'Utiliser les noms dans une phrase japonaise.', 'Un nom peut être thème, sujet, objet, lieu, destination ou possession selon la particule qui le suit.', 'Nom + particule', 'Le nom seul ne donne pas sa fonction : la particule est essentielle.', [
    ['がっこうはおおきいです。', '学校は大きいです。', 'Gakkou wa ookii desu.', 'L’école est grande.'],
    ['えきでまちます。', '駅で待ちます。', 'Eki de machimasu.', 'J’attends à la gare.'],
  ]),
  makeGrammarLesson(42, 'Fondations', 'Référence grammaticale', 'Pronoms personnels', '私 / あなた / 彼 / 彼女', 'pratique', 'Savoir quand utiliser ou éviter les pronoms.', 'Le japonais omet souvent les pronoms quand le contexte est clair. 私 est utile, mais pas obligatoire dans chaque phrase.', 'Contexte + phrase sans pronom possible', 'Répéter 私 dans toutes les phrases sonne lourd.', [
    ['わたしはフランスじんです。', '私はフランス人です。', 'Watashi wa furansu-jin desu.', 'Je suis français.'],
    ['きょうはいきません。', '今日は行きません。', 'Kyou wa ikimasen.', 'Aujourd’hui, je n’y vais pas.'],
  ]),
  makeGrammarLesson(43, 'Vie courante', 'Questions', 'だれ / なに / どこ / いつ', 'Mots interrogatifs', 'facile', 'Poser les questions de base.', 'Les mots interrogatifs se placent souvent là où serait l’information attendue.', 'Mot question + particule + verbe + か', 'Garde la particule adaptée après le mot interrogatif.', [
    ['だれがきますか。', '誰が来ますか。', 'Dare ga kimasu ka.', 'Qui vient ?'],
    ['どこでべんきょうしますか。', 'どこで勉強しますか。', 'Doko de benkyou shimasu ka.', 'Où est-ce que tu étudies ?'],
  ]),
  makeGrammarLesson(44, 'Vie courante', 'Questions', 'どの / どれ / どちら', 'Choisir ou demander lequel', 'pratique', 'Demander lequel parmi plusieurs options.', 'どれ remplace un nom. どの doit être suivi d’un nom. どちら est plus poli ou demande une direction/option.', 'どの + nom / どれ + particule', 'どの ne s’utilise pas seul.', [
    ['どのほんをよみますか。', 'どの本を読みますか。', 'Dono hon o yomimasu ka.', 'Quel livre lis-tu ?'],
    ['どれがすきですか。', 'どれが好きですか。', 'Dore ga suki desu ka.', 'Lequel aimes-tu ?'],
  ]),
  makeGrammarLesson(45, 'Temps et quantités', 'Nombres', 'Nombre + classificateur', 'Nombres en contexte', 'pratique', 'Utiliser les nombres dans de vraies phrases.', 'Les nombres deviennent vraiment utiles avec les heures, dates, âges et compteurs.', 'Nombre + compteur + verbe', 'Ne traite pas les nombres comme une liste isolée : associe-les à une fonction.', [
    ['りんごをみっつかいます。', '林檎を三つ買います。', 'Ringo o mittsu kaimasu.', 'J’achète trois pommes.'],
    ['ごじにかえります。', '五時に帰ります。', 'Go-ji ni kaerimasu.', 'Je rentre à cinq heures.'],
  ]),
  makeGrammarLesson(46, 'Temps et quantités', 'Quantités', '少し / たくさん / もっと', 'Quantité + verbe', 'pratique', 'Exprimer une quantité sans apprendre une liste de mots.', 'Les quantités se placent souvent avant le verbe et modifient l’action.', 'Quantité + verbe', 'Beaucoup d’expressions de quantité n’ont pas besoin de particule.', [
    ['みずをすこしのみます。', '水を少し飲みます。', 'Mizu o sukoshi nomimasu.', 'Je bois un peu d’eau.'],
    ['もっとべんきょうします。', 'もっと勉強します。', 'Motto benkyou shimasu.', 'Je vais étudier davantage.'],
  ]),
  makeGrammarLesson(47, 'Temps et quantités', 'Compteurs', '人 / 枚 / 本 / 個', 'Compter selon la nature', 'intermediaire', 'Comprendre pourquoi le japonais change de compteur.', 'Le compteur dépend de ce qu’on compte : personnes, objets plats, objets longs, petits objets.', 'Nombre + compteur + nom/verbe', 'C’est normal de ne pas tout connaître au N5 : commence par les plus fréquents.', [
    ['ともだちがふたりいます。', '友達が二人います。', 'Tomodachi ga futari imasu.', 'Il y a deux amis.'],
    ['えんぴつをさんぼんかいます。', '鉛筆を三本買います。', 'Enpitsu o sanbon kaimasu.', 'J’achète trois crayons.'],
  ]),
  makeGrammarLesson(48, 'Temps et quantités', 'Dates', '日 / 月 / 年', 'Date + に', 'pratique', 'Parler d’un jour, mois ou année.', 'Les dates précises prennent souvent に pour marquer le moment.', 'Date + に + action', 'Les mots relatifs comme 今日 et 明日 n’ont généralement pas besoin de に.', [
    ['いちがつににほんへいきます。', '一月に日本へ行きます。', 'Ichigatsu ni Nihon e ikimasu.', 'Je vais au Japon en janvier.'],
    ['にちようびにやすみます。', '日曜日に休みます。', 'Nichiyoubi ni yasumimasu.', 'Je me repose dimanche.'],
  ]),
  makeGrammarLesson(49, 'Temps et quantités', 'Heures', '時 / 分', 'Heure + に', 'facile', 'Dire à quelle heure une action a lieu.', 'Une heure précise se place avec に avant le verbe.', 'Heure + に + verbe', 'Attention aux lectures irrégulières comme 四時 et 七時.', [
    ['ろくじにおきます。', '六時に起きます。', 'Roku-ji ni okimasu.', 'Je me lève à six heures.'],
    ['はちじはんにねます。', '八時半に寝ます。', 'Hachi-ji han ni nemasu.', 'Je dors à huit heures et demie.'],
  ]),
  makeGrammarLesson(50, 'Temps et quantités', 'Expressions de temps', '今日 / 明日 / 昨日', 'Temps relatif', 'facile', 'Placer le temps dans une phrase.', 'Les expressions de temps se mettent souvent au début pour cadrer la phrase.', 'Temps + phrase', 'Ne mets pas に partout après les mots de temps.', [
    ['きのう、えいがをみました。', '昨日、映画を見ました。', 'Kinou, eiga o mimashita.', 'Hier, j’ai regardé un film.'],
    ['あした、がっこうへいきます。', '明日、学校へ行きます。', 'Ashita, gakkou e ikimasu.', 'Demain, je vais à l’école.'],
  ]),
  makeGrammarLesson(51, 'Actions', 'Groupes de verbes', '五段 / 一段 / irréguliers', 'Familles de conjugaison', 'intermediaire', 'Comprendre pourquoi les formes changent.', 'Les verbes japonais se regroupent par comportement. Cela aide à former て, ない, た et les autres formes.', 'Verbe dictionnaire → forme utile', 'Ne devine pas uniquement à la traduction française.', [
    ['たべるはよくつかうどうしです。', '食べるはよく使う動詞です。', 'Taberu wa yoku tsukau doushi desu.', '食べる est un verbe souvent utilisé.'],
    ['いくはとくべつです。', '行くは特別です。', 'Iku wa tokubetsu desu.', '行く est spécial.'],
  ]),
  makeGrammarLesson(52, 'Actions', 'Forme dictionnaire', '食べる / 行く / する', 'Forme neutre de base', 'pratique', 'Reconnaître la forme de dictionnaire.', 'La forme dictionnaire sert dans les dictionnaires, mais aussi dans de nombreuses structures grammaticales.', 'Verbe dictionnaire + structure', 'La forme dictionnaire n’est pas toujours familière : elle sert aussi à construire.', [
    ['にほんごをべんきょうすることがすきです。', '日本語を勉強することが好きです。', 'Nihongo o benkyou suru koto ga suki desu.', 'J’aime étudier le japonais.'],
    ['ねるまえに、みずをのみます。', '寝る前に、水を飲みます。', 'Neru mae ni, mizu o nomimasu.', 'Avant de dormir, je bois de l’eau.'],
  ]),
  makeGrammarLesson(53, 'Actions', 'Forme simple / neutre', '行く / 行かない / 行った', 'Style neutre', 'intermediaire', 'Lire les formes courtes utilisées dans les textes simples.', 'La forme neutre est essentielle pour les structures, les phrases relatives et le style familier.', 'Forme courte + nom/structure', 'Ne la confonds pas avec un manque de politesse : elle sert aussi grammaticalement.', [
    ['きのうかったほんをよみます。', '昨日買った本を読みます。', 'Kinou katta hon o yomimasu.', 'Je lis le livre acheté hier.'],
    ['あしたいくひとがいます。', '明日行く人がいます。', 'Ashita iku hito ga imasu.', 'Il y a une personne qui ira demain.'],
  ]),
  makeGrammarLesson(54, 'Actions', 'Forme négative', 'ない / ません', 'Nier une action', 'pratique', 'Choisir entre style neutre et style poli.', 'ません est poli. ない est la forme courte, utile dans beaucoup de constructions.', 'Verbe négatif + structure', 'ない ne se place pas après ます.', [
    ['きょうはいきません。', '今日は行きません。', 'Kyou wa ikimasen.', 'Aujourd’hui, je n’y vais pas.'],
    ['たべないほうがいいです。', '食べない方がいいです。', 'Tabenai hou ga ii desu.', 'Il vaut mieux ne pas manger.'],
  ]),
  makeGrammarLesson(55, 'Actions', 'Forme ない', '行かない / 食べない', 'Base de plusieurs structures', 'intermediaire', 'Former interdiction, conseil négatif et obligation.', 'La forme ない sert dans ないでください, ないほうがいい, なければなりません.', 'Forme ない + structure', 'C’est une forme courte, pas seulement une phrase complète.', [
    ['ここでたべないでください。', 'ここで食べないでください。', 'Koko de tabenaide kudasai.', 'Ne mangez pas ici, s’il vous plaît.'],
    ['はやくねなければなりません。', '早く寝なければなりません。', 'Hayaku nenakereba narimasen.', 'Il faut dormir tôt.'],
  ]),
  makeGrammarLesson(56, 'Actions', 'Forme た', '行った / 食べた', 'Passé court', 'intermediaire', 'Utiliser le passé court dans des structures.', 'La forme た sert au passé neutre et dans des expressions comme たことがある ou た後で.', 'Forme た + structure', 'Ce n’est pas seulement “passé familier”.', [
    ['すしをたべたことがあります。', '寿司を食べたことがあります。', 'Sushi o tabeta koto ga arimasu.', 'J’ai déjà mangé des sushis.'],
    ['べんきょうしたあとで、ねます。', '勉強した後で、寝ます。', 'Benkyou shita ato de, nemasu.', 'Après avoir étudié, je dors.'],
  ]),
  makeGrammarLesson(57, 'Actions', 'Forme potentielle', 'できる / 食べられる', 'Pouvoir faire', 'avance', 'Exprimer la capacité.', 'La forme potentielle dit qu’on peut faire quelque chose. Au N5, できます est déjà très utile.', 'Nom/Verbe + ことができます', 'La forme potentielle complète dépasse N5, mais la notion est utile tôt.', [
    ['にほんごをすこしはなすことができます。', '日本語を少し話すことができます。', 'Nihongo o sukoshi hanasu koto ga dekimasu.', 'Je peux parler un peu japonais.'],
    ['ここでべんきょうできます。', 'ここで勉強できます。', 'Koko de benkyou dekimasu.', 'On peut étudier ici.'],
  ]),
  makeGrammarLesson(58, 'Actions', 'Forme volitive', '行こう / しましょう', 'Proposer ou vouloir agir', 'avance', 'Reconnaître les invitations et intentions.', 'La volitive sert à proposer ou exprimer une volonté. La version polie ましょう est prioritaire au N5.', 'Verbe volitif / ましょう', 'La forme courte est plus conversationnelle.', [
    ['いっしょにいきましょう。', '一緒に行きましょう。', 'Issho ni ikimashou.', 'Allons-y ensemble.'],
    ['あとでべんきょうしよう。', '後で勉強しよう。', 'Ato de benkyou shiyou.', 'Étudions plus tard.'],
  ]),
  makeGrammarLesson(59, 'Actions', 'Impératif et ordres', 'てください / なさい', 'Demander sans être brutal', 'avance', 'Reconnaître les ordres et préférer les demandes polies.', 'L’impératif direct peut être dur. Pour le N5, てください est la forme pratique.', 'Forme て + ください', 'N’utilise pas l’impératif direct dans une conversation normale de débutant.', [
    ['ここにすわってください。', 'ここに座ってください。', 'Koko ni suwatte kudasai.', 'Asseyez-vous ici, s’il vous plaît.'],
    ['なまえをかいてください。', '名前を書いてください。', 'Namae o kaite kudasai.', 'Écrivez votre nom, s’il vous plaît.'],
  ]),
  makeGrammarLesson(60, 'Actions', 'Passif', '〜られる', 'Être fait / subir', 'avance', 'Avoir une première exposition au passif.', 'Le passif est plus avancé que N5, mais il faut savoir qu’il existe pour ne pas le confondre avec le potentiel.', 'Verbe passif', 'À apprendre plus tard en détail : ici, reconnaissance seulement.', [
    ['このほんはよくよまれます。', 'この本はよく読まれます。', 'Kono hon wa yoku yomaremasu.', 'Ce livre est souvent lu.'],
    ['なまえをよばれました。', '名前を呼ばれました。', 'Namae o yobaremashita.', 'Mon nom a été appelé.'],
  ]),
  makeGrammarLesson(61, 'Actions', 'Causatif', '〜させる', 'Faire faire / laisser faire', 'avance', 'Découvrir une forme avancée pour la roadmap.', 'Le causatif exprime faire faire ou laisser faire. Ce n’est pas prioritaire N5, mais utile dans la progression future.', 'Verbe causatif', 'Ne le mélange pas avec てください.', [
    ['こどもにほんをよませます。', '子供に本を読ませます。', 'Kodomo ni hon o yomasemasu.', 'Je fais lire un livre à l’enfant.'],
    ['すこしやすませてください。', '少し休ませてください。', 'Sukoshi yasumasete kudasai.', 'Laissez-moi me reposer un peu.'],
  ]),
  makeGrammarLesson(62, 'Actions', 'Transitifs / intransitifs', '開ける / 開く', 'Action sur objet ou changement seul', 'avance', 'Comprendre pourquoi certains verbes vont avec を et d’autres avec が.', 'Un verbe transitif agit sur un objet. Un intransitif décrit ce qui arrive au sujet.', 'Objet を verbe / sujet が verbe', 'Très fréquent dans les textes : à reconnaître progressivement.', [
    ['まどをあけます。', '窓を開けます。', 'Mado o akemasu.', 'J’ouvre la fenêtre.'],
    ['まどがあきます。', '窓が開きます。', 'Mado ga akimasu.', 'La fenêtre s’ouvre.'],
  ]),
  makeGrammarLesson(63, 'Actions', 'Verbes de déplacement', '行く / 来る / 帰る', 'Aller, venir, rentrer', 'facile', 'Parler des déplacements quotidiens.', 'Les verbes de déplacement utilisent souvent へ ou に pour la destination.', 'Destination + へ/に + verbe', 'Choisis へ pour la direction, に pour l’arrivée.', [
    ['がっこうへいきます。', '学校へ行きます。', 'Gakkou e ikimasu.', 'Je vais à l’école.'],
    ['うちにかえります。', '家に帰ります。', 'Uchi ni kaerimasu.', 'Je rentre à la maison.'],
  ]),
  makeGrammarLesson(64, 'Interaction', 'Donner / recevoir', 'あげる / もらう / くれる', 'Échange et point de vue', 'avance', 'Préparer la logique des échanges.', 'Ces verbes dépendent du point de vue : qui donne, qui reçoit, et dans quelle direction va le bénéfice.', 'Donneur は receveur に objet を あげる', 'Sujet délicat : commence par phrases simples.', [
    ['ともだちにほんをあげます。', '友達に本をあげます。', 'Tomodachi ni hon o agemasu.', 'Je donne un livre à un ami.'],
    ['ともだちにほんをもらいました。', '友達に本をもらいました。', 'Tomodachi ni hon o moraimashita.', 'J’ai reçu un livre d’un ami.'],
  ]),
  makeGrammarLesson(65, 'Descriptions', 'Conjugaison des adjectifs', '高い / 高くない / 高かった', 'Temps et négation', 'intermediaire', 'Conjuguer les adjectifs comme des prédicats.', 'Les adjectifs en い se conjuguent. Les adjectifs en な utilisent です/でした pour le temps poli.', 'い → くない / かった', 'Ne conjugue pas です pour nier un adjectif en い dans la forme standard.', [
    ['きのうはあつかったです。', '昨日は暑かったです。', 'Kinou wa atsukatta desu.', 'Hier, il faisait chaud.'],
    ['このまちはしずかでした。', 'この町は静かでした。', 'Kono machi wa shizuka deshita.', 'Cette ville était calme.'],
  ]),
  makeGrammarLesson(66, 'Descriptions', 'Adverbes', 'よく / とても / あまり', 'Nuancer une action ou qualité', 'pratique', 'Dire souvent, beaucoup, pas vraiment.', 'Les adverbes se placent avant ce qu’ils modifient : verbe, adjectif ou phrase.', 'Adverbe + verbe/adjectif', 'あまり appelle souvent une négation.', [
    ['よくにほんごをべんきょうします。', 'よく日本語を勉強します。', 'Yoku nihongo o benkyou shimasu.', 'J’étudie souvent le japonais.'],
    ['このみせはあまりたかくないです。', 'この店はあまり高くないです。', 'Kono mise wa amari takakunai desu.', 'Ce magasin n’est pas très cher.'],
  ]),
  makeGrammarLesson(67, 'Interaction', 'Suffixes de personnes', 'さん / ちゃん / くん / 先生', 'Respect et relation', 'facile', 'Choisir une adresse simple et correcte.', 'Les suffixes indiquent la relation sociale. さん est le choix sûr et poli.', 'Nom + suffixe', 'N’utilise pas さん pour toi-même.', [
    ['たなかさんはせんせいです。', '田中さんは先生です。', 'Tanaka-san wa sensei desu.', 'M. ou Mme Tanaka est professeur.'],
    ['やまださんにあいます。', '山田さんに会います。', 'Yamada-san ni aimasu.', 'Je rencontre M. ou Mme Yamada.'],
  ]),
  makeGrammarLesson(68, 'Vie courante', 'Expressions toutes faites', 'お願いします / 大丈夫です', 'Phrases fonctionnelles', 'facile', 'Utiliser des blocs prêts dans la conversation.', 'Certaines expressions se mémorisent comme des blocs grammaticaux car elles servent à agir socialement.', 'Expression fixe + contexte', 'Ce n’est pas du vocabulaire pur : ce sont des actes de communication.', [
    ['よろしくおねがいします。', 'よろしくお願いします。', 'Yoroshiku onegai shimasu.', 'Enchanté / merci d’avance.'],
    ['だいじょうぶです。', '大丈夫です。', 'Daijoubu desu.', 'Ça va / c’est bon.'],
  ]),
  makeGrammarLesson(69, 'Vie courante', 'Onomatopées grammaticales', 'ゆっくり / すぐ / ちゃんと', 'Manière de faire', 'pratique', 'Utiliser quelques mots expressifs dans la phrase.', 'Certaines onomatopées ou adverbes expressifs modifient la manière de faire l’action.', 'Expression + verbe', 'Le glossaire complet sera séparé : ici on voit seulement l’usage grammatical.', [
    ['ゆっくりはなしてください。', 'ゆっくり話してください。', 'Yukkuri hanashite kudasai.', 'Parlez lentement, s’il vous plaît.'],
    ['ちゃんとべんきょうします。', 'ちゃんと勉強します。', 'Chanto benkyou shimasu.', 'J’étudie sérieusement/correctement.'],
  ]),
  makeGrammarLesson(70, 'Expressions', 'Désir', 'たい / ほしい', 'Vouloir faire / vouloir une chose', 'intermediaire', 'Différencier envie d’action et envie d’objet.', 'たい s’utilise avec un verbe. ほしい s’utilise avec un objet voulu.', 'Verbe radical + たい / Nom が ほしい', 'Ne mets pas たい directement après un nom.', [
    ['にほんへいきたいです。', '日本へ行きたいです。', 'Nihon e ikitai desu.', 'Je veux aller au Japon.'],
    ['あたらしいかばんがほしいです。', '新しい鞄が欲しいです。', 'Atarashii kaban ga hoshii desu.', 'Je veux un nouveau sac.'],
  ]),
  makeGrammarLesson(71, 'Expressions', 'Permission', 'てもいいです', 'On peut faire', 'intermediaire', 'Demander ou donner la permission.', 'て-form + もいいです indique qu’une action est autorisée.', 'Verbe て + もいいです', 'En question, cela devient “est-ce que je peux... ?”.', [
    ['ここですわってもいいですか。', 'ここで座ってもいいですか。', 'Koko de suwatte mo ii desu ka.', 'Est-ce que je peux m’asseoir ici ?'],
    ['しゃしんをとってもいいです。', '写真を撮ってもいいです。', 'Shashin o totte mo ii desu.', 'Vous pouvez prendre une photo.'],
  ]),
  makeGrammarLesson(72, 'Expressions', 'Interdiction', 'てはいけません', 'Il ne faut pas', 'intermediaire', 'Comprendre une interdiction simple.', 'てはいけません indique qu’une action est interdite.', 'Verbe て + はいけません', 'Plus fort que ないでください.', [
    ['ここでたばこをすってはいけません。', 'ここで煙草を吸ってはいけません。', 'Koko de tabako o sutte wa ikemasen.', 'Il ne faut pas fumer ici.'],
    ['このみずをのんではいけません。', 'この水を飲んではいけません。', 'Kono mizu o nonde wa ikemasen.', 'Il ne faut pas boire cette eau.'],
  ]),
  makeGrammarLesson(73, 'Expressions', 'Obligation', 'なければなりません', 'Il faut', 'avance', 'Exprimer une obligation.', 'La forme négative conditionnelle + なりません exprime “il faut faire”.', 'Verbe ない → なければなりません', 'La structure est longue : apprends-la comme bloc au début.', [
    ['まいにちべんきょうしなければなりません。', '毎日勉強しなければなりません。', 'Mainichi benkyou shinakereba narimasen.', 'Il faut étudier tous les jours.'],
    ['はやくいかなければなりません。', '早く行かなければなりません。', 'Hayaku ikanakereba narimasen.', 'Il faut y aller vite.'],
  ]),
  makeGrammarLesson(74, 'Expressions', 'Capacité', 'ことができます', 'Pouvoir faire', 'intermediaire', 'Exprimer une capacité sans conjugaison complexe.', 'Verbe dictionnaire + ことができます est une manière claire de dire “pouvoir faire”.', 'Verbe dictionnaire + ことができます', 'できる s’attache à l’action nominalisée par こと.', [
    ['ひらがなをよむことができます。', 'ひらがなを読むことができます。', 'Hiragana o yomu koto ga dekimasu.', 'Je peux lire les hiragana.'],
    ['にほんごでかくことができます。', '日本語で書くことができます。', 'Nihongo de kaku koto ga dekimasu.', 'Je peux écrire en japonais.'],
  ]),
  makeGrammarLesson(75, 'Expressions', 'Expérience', 'たことがあります', 'Avoir déjà fait', 'intermediaire', 'Parler d’une expérience vécue.', 'Forme た + ことがあります indique qu’on a déjà vécu l’action.', 'Verbe た + ことがあります', 'Ne confonds pas avec un passé précis.', [
    ['にほんへいったことがあります。', '日本へ行ったことがあります。', 'Nihon e itta koto ga arimasu.', 'Je suis déjà allé au Japon.'],
    ['すしをたべたことがあります。', '寿司を食べたことがあります。', 'Sushi o tabeta koto ga arimasu.', 'J’ai déjà mangé des sushis.'],
  ]),
  makeGrammarLesson(76, 'Expressions', 'État résultant', 'ています', 'État qui dure', 'intermediaire', 'Comprendre que ています ne veut pas toujours dire “en train de”.', 'Avec certains verbes, ています décrit un état actuel résultant d’une action.', 'Verbe て + います', '住んでいます = habiter, pas être en train d’habiter.', [
    ['とうきょうにすんでいます。', '東京に住んでいます。', 'Toukyou ni sunde imasu.', 'J’habite à Tokyo.'],
    ['けっこんしています。', '結婚しています。', 'Kekkon shite imasu.', 'Je suis marié.'],
  ]),
  makeGrammarLesson(77, 'Connecteurs', 'Connecteurs logiques', 'そして / それから / それで', 'Lier des phrases', 'pratique', 'Raconter une suite simple.', 'Les connecteurs organisent les phrases : ajout, suite, conséquence.', 'Phrase. Connecteur, phrase.', 'Ne surcharge pas chaque phrase avec un connecteur.', [
    ['あさごはんをたべます。それから、がっこうへいきます。', '朝ご飯を食べます。それから、学校へ行きます。', 'Asa-gohan o tabemasu. Sorekara, gakkou e ikimasu.', 'Je prends le petit-déjeuner. Ensuite, je vais à l’école.'],
    ['べんきょうしました。そして、ねました。', '勉強しました。そして、寝ました。', 'Benkyou shimashita. Soshite, nemashita.', 'J’ai étudié. Puis j’ai dormi.'],
  ]),
  makeGrammarLesson(78, 'Connecteurs', 'Cause et conséquence', 'から / ので', 'Parce que / donc', 'intermediaire', 'Expliquer une raison.', 'から est direct. ので est souvent plus doux ou explicatif.', 'Raison + から/ので + résultat', 'から peut aussi signifier “depuis”.', [
    ['あめですから、いきません。', '雨ですから、行きません。', 'Ame desu kara, ikimasen.', 'Comme il pleut, je n’y vais pas.'],
    ['じかんがないので、かえります。', '時間がないので、帰ります。', 'Jikan ga nai node, kaerimasu.', 'Comme je n’ai pas le temps, je rentre.'],
  ]),
  makeGrammarLesson(79, 'Connecteurs', 'Opposition', 'でも / が / けど', 'Mais / cependant', 'intermediaire', 'Opposer deux idées.', 'でも commence souvent une phrase. が et けど relient deux propositions.', 'Phrase A が/けど Phrase B', 'けど est plus conversationnel.', [
    ['たかいですが、おいしいです。', '高いですが、美味しいです。', 'Takai desu ga, oishii desu.', 'C’est cher, mais c’est bon.'],
    ['いきたいけど、じかんがありません。', '行きたいけど、時間がありません。', 'Ikitai kedo, jikan ga arimasen.', 'Je veux y aller, mais je n’ai pas le temps.'],
  ]),
  makeGrammarLesson(80, 'Connecteurs', 'But et intention', 'に / ために', 'Pour faire', 'avance', 'Exprimer un but simple.', 'Avec certains verbes de déplacement, on utilise le radical + に pour dire “aller faire”. ために exprime un but plus général.', 'Radical + に行く / verbe + ために', 'ために demande souvent une phrase bien construite avant.', [
    ['ほんをかいにいきます。', '本を買いに行きます。', 'Hon o kai ni ikimasu.', 'Je vais acheter un livre.'],
    ['にほんごをべんきょうするために、アプリをつかいます。', '日本語を勉強するために、アプリを使います。', 'Nihongo o benkyou suru tame ni, apuri o tsukaimasu.', 'J’utilise une app pour étudier le japonais.'],
  ]),
  makeGrammarLesson(81, 'Connecteurs', 'Conditionnels', 'たら / と', 'Si / quand', 'avance', 'Comprendre les conditions de base.', 'たら indique souvent “si/quand”. と indique une conséquence naturelle ou automatique.', 'Condition + résultat', 'Les conditionnels dépassent souvent N5, mais ils sont essentiels ensuite.', [
    ['あめがふったら、いきません。', '雨が降ったら、行きません。', 'Ame ga futtara, ikimasen.', 'S’il pleut, je n’y vais pas.'],
    ['このボタンをおすと、ドアがあきます。', 'このボタンを押すと、ドアが開きます。', 'Kono botan o osu to, doa ga akimasu.', 'Quand on appuie sur ce bouton, la porte s’ouvre.'],
  ]),
  makeGrammarLesson(82, 'Connecteurs', 'Hypothèses', 'でしょう / と思います', 'Probablement / je pense que', 'intermediaire', 'Exprimer une opinion prudente.', 'でしょう adoucit une prédiction. と思います rapporte ce que l’on pense.', 'Phrase neutre + と思います', 'Avant と思います, on utilise souvent une forme neutre.', [
    ['あしたはあめでしょう。', '明日は雨でしょう。', 'Ashita wa ame deshou.', 'Demain, il pleuvra probablement.'],
    ['このほんはおもしろいとおもいます。', 'この本は面白いと思います。', 'Kono hon wa omoshiroi to omoimasu.', 'Je pense que ce livre est intéressant.'],
  ]),
  makeGrammarLesson(83, 'Phrases complexes', 'Subordonnées relatives', 'Nom qualifié par une phrase', 'Phrase + nom', 'avance', 'Dire “le livre que j’ai acheté”.', 'En japonais, la phrase qui décrit le nom se place directement avant ce nom.', 'Phrase neutre + nom', 'Il n’y a pas de “que” comme en français.', [
    ['きのうかったほんをよみます。', '昨日買った本を読みます。', 'Kinou katta hon o yomimasu.', 'Je lis le livre que j’ai acheté hier.'],
    ['えきにいるひとはせんせいです。', '駅にいる人は先生です。', 'Eki ni iru hito wa sensei desu.', 'La personne qui est à la gare est professeur.'],
  ]),
  makeGrammarLesson(84, 'Phrases complexes', 'Nominalisation', 'こと / の', 'Transformer une action en nom', 'avance', 'Parler d’une action comme d’une chose.', 'こと et の peuvent nominaliser un verbe. こと est fréquent dans les structures apprises.', 'Verbe dictionnaire + こと', 'Le choix entre こと et の dépend du contexte.', [
    ['にほんごをべんきょうすることがすきです。', '日本語を勉強することが好きです。', 'Nihongo o benkyou suru koto ga suki desu.', 'J’aime étudier le japonais.'],
    ['はしるのがすきです。', '走るのが好きです。', 'Hashiru no ga suki desu.', 'J’aime courir.'],
  ]),
  makeGrammarLesson(85, 'Phrases complexes', 'Citation directe et indirecte', 'といいます / と思います', 'Citer ou rapporter', 'avance', 'Rapporter une parole ou une pensée.', 'La particule と introduit ce qui est dit ou pensé.', 'Citation + と + verbe', 'Garde la phrase citée avant と.', [
    ['「ありがとう」といいました。', '「ありがとう」と言いました。', 'Arigatou to iimashita.', 'Il/elle a dit “merci”.'],
    ['あしたいくとおもいます。', '明日行くと思います。', 'Ashita iku to omoimasu.', 'Je pense que j’irai demain.'],
  ]),
  makeGrammarLesson(86, 'Style et registre', 'Style poli', 'です / ます', 'Base sûre', 'facile', 'Parler correctement dans presque toutes les situations de débutant.', 'Le style poli est la priorité pour le JLPT N5 et les interactions quotidiennes.', 'Nom/adjectif + です / verbe + ます', 'Ne mélange pas toutes les formes au hasard dans une même phrase.', [
    ['わたしはがくせいです。', '私は学生です。', 'Watashi wa gakusei desu.', 'Je suis étudiant.'],
    ['まいにちべんきょうします。', '毎日勉強します。', 'Mainichi benkyou shimasu.', 'J’étudie tous les jours.'],
  ]),
  makeGrammarLesson(87, 'Style et registre', 'Style neutre', 'だ / formes courtes', 'Lire et construire', 'intermediaire', 'Comprendre les phrases courtes et les structures grammaticales.', 'Le style neutre sert dans les textes, avec les amis, et à l’intérieur de nombreuses structures.', 'Forme neutre + structure', 'Ne l’utilise pas partout avec des inconnus.', [
    ['これはほんだ。', 'これは本だ。', 'Kore wa hon da.', 'C’est un livre.'],
    ['あしたいく。', '明日行く。', 'Ashita iku.', 'J’irai demain.'],
  ]),
  makeGrammarLesson(88, 'Style et registre', 'Style familier', 'Formes courtes en conversation', 'Oral naturel', 'avance', 'Reconnaître le japonais parlé simple.', 'À l’oral, beaucoup de phrases utilisent les formes courtes et omettent des éléments évidents.', 'Contexte + forme courte', 'À comprendre avant de produire avec nuance.', [
    ['もうたべた？', 'もう食べた？', 'Mou tabeta?', 'Tu as déjà mangé ?'],
    ['うん、いく。', 'うん、行く。', 'Un, iku.', 'Oui, j’y vais.'],
  ]),
  makeGrammarLesson(89, 'Style et registre', 'Keigo : vue d’ensemble', '尊敬語 / 謙譲語 / 丁寧語', 'Politesse avancée', 'avance', 'Savoir que plusieurs niveaux de politesse existent.', 'Le keigo dépasse N5, mais il est utile de savoir qu’il existe : langage poli, respectueux et humble.', 'Situation sociale + forme adaptée', 'N’essaie pas de tout produire au début.', [
    ['せんせいはいらっしゃいます。', '先生はいらっしゃいます。', 'Sensei wa irasshaimasu.', 'Le professeur est là / vient / va.'],
    ['わたしがまいります。', '私が参ります。', 'Watashi ga mairimasu.', 'J’irai / je viendrai humblement.'],
  ]),
  makeGrammarLesson(90, 'Style et registre', 'Langage respectueux', '尊敬語', 'Élever l’autre', 'avance', 'Reconnaître les formes qui honorent l’interlocuteur.', 'Le langage respectueux élève l’action de l’autre personne.', 'Sujet honoré + forme respectueuse', 'Ne l’utilise pas pour tes propres actions.', [
    ['せんせいがよまれます。', '先生が読まれます。', 'Sensei ga yomaremasu.', 'Le professeur lit.'],
    ['しゃちょうはいらっしゃいます。', '社長はいらっしゃいます。', 'Shachou wa irasshaimasu.', 'Le directeur est là.'],
  ]),
  makeGrammarLesson(91, 'Style et registre', 'Langage humble', '謙譲語', 'Abaisser son action', 'avance', 'Reconnaître les formes humbles.', 'Le langage humble abaisse ses propres actions pour respecter l’autre.', 'Je + forme humble', 'Très avancé : priorité à la reconnaissance.', [
    ['わたしがうかがいます。', '私が伺います。', 'Watashi ga ukagaimasu.', 'Je viendrai / j’irai humblement.'],
    ['あとでれんらくいたします。', '後で連絡いたします。', 'Ato de renraku itashimasu.', 'Je vous contacterai plus tard.'],
  ]),
  makeGrammarLesson(92, 'Style et registre', 'Particules de fin', 'ね / よ / か', 'Nuance émotionnelle', 'pratique', 'Comprendre le ton à la fin d’une phrase.', 'Les particules finales changent la nuance : confirmation, information nouvelle, question.', 'Phrase + particule finale', 'Elles sont petites mais très importantes à l’oral.', [
    ['いいてんきですね。', 'いい天気ですね。', 'Ii tenki desu ne.', 'Il fait beau, n’est-ce pas ?'],
    ['これはおいしいですよ。', 'これは美味しいですよ。', 'Kore wa oishii desu yo.', 'C’est bon, je te le dis.'],
  ]),
  makeGrammarLesson(93, 'Style et registre', 'Oral et écrit', 'Formes plus compactes à l’oral', 'Différence de registre', 'avance', 'Ne pas être surpris par les conversations naturelles.', 'L’oral omet souvent ce qui est évident. L’écrit garde des formes plus complètes.', 'Contexte + omission possible', 'Pour l’examen, garde des phrases propres.', [
    ['なにしてる？', '何してる？', 'Nani shiteru?', 'Qu’est-ce que tu fais ?'],
    ['いまべんきょうしています。', '今勉強しています。', 'Ima benkyou shite imasu.', 'J’étudie maintenant.'],
  ]),
  makeGrammarLesson(94, 'Style et registre', 'Formes contractées', 'ている → てる', 'Contraction orale', 'avance', 'Reconnaître les contractions fréquentes.', 'Dans la conversation, ています peut devenir てる en style familier.', 'ている → てる', 'À reconnaître, pas prioritaire à produire en N5.', [
    ['なにをしてる？', '何をしてる？', 'Nani o shiteru?', 'Qu’est-ce que tu fais ?'],
    ['ほんをよんでる。', '本を読んでる。', 'Hon o yonderu.', 'Je lis un livre.'],
  ]),
  makeGrammarLesson(95, 'JLPT', 'Structures JLPT N5', 'Socle N5 complet', 'Révision ciblée', 'pratique', 'Identifier les structures prioritaires pour réussir N5.', 'Le N5 repose surtout sur particules, formes polies, adjectifs, existence, temps, demandes et connecteurs simples.', 'Structure N5 + exemple quotidien', 'Ne révise pas tout au même poids : les bases rapportent beaucoup.', [
    ['これはなんですか。', 'これは何ですか。', 'Kore wa nan desu ka.', 'Qu’est-ce que c’est ?'],
    ['ここでべんきょうしてもいいですか。', 'ここで勉強してもいいですか。', 'Koko de benkyou shite mo ii desu ka.', 'Puis-je étudier ici ?'],
  ]),
  makeGrammarLesson(96, 'JLPT', 'Structures JLPT N4', 'Préparer la suite', 'Aperçu post-N5', 'avance', 'Voir ce qui viendra après N5 sans le mélanger au programme prioritaire.', 'Le N4 approfondit conditionnels, intentions, expériences, obligations et formes plus naturelles.', 'N5 solide → N4 progressif', 'Ne bloque pas le N5 en voulant tout apprendre trop tôt.', [
    ['にほんへいったことがあります。', '日本へ行ったことがあります。', 'Nihon e itta koto ga arimasu.', 'Je suis déjà allé au Japon.'],
    ['もっとべんきょうしなければなりません。', 'もっと勉強しなければなりません。', 'Motto benkyou shinakereba narimasen.', 'Il faut étudier davantage.'],
  ]),
  makeGrammarLesson(97, 'JLPT', 'Structures JLPT N3', 'Lecture intermédiaire', 'Aperçu futur', 'avance', 'Comprendre que les niveaux supérieurs ajoutent nuance et abstraction.', 'Le N3 introduit des connecteurs plus riches et des expressions moins littérales.', 'Phrase + nuance', 'À garder comme horizon, pas comme priorité N5.', [
    ['べんきょうすればするほど、わかります。', '勉強すればするほど、分かります。', 'Benkyou sureba suru hodo, wakarimasu.', 'Plus on étudie, plus on comprend.'],
    ['にほんごはむずかしいけれど、おもしろいです。', '日本語は難しいけれど、面白いです。', 'Nihongo wa muzukashii keredo, omoshiroi desu.', 'Le japonais est difficile, mais intéressant.'],
  ]),
  makeGrammarLesson(98, 'JLPT', 'Structures JLPT N2', 'Nuances avancées', 'Aperçu futur', 'avance', 'Voir que N2 demande des tournures plus écrites et abstraites.', 'Le N2 ajoute beaucoup de connecteurs, nuances d’opinion et structures formelles.', 'Structure avancée + contexte', 'Ne pas intégrer dans les quiz N5 pour éviter la surcharge.', [
    ['どんなにいそがしくても、べんきょうします。', 'どんなに忙しくても、勉強します。', 'Donna ni isogashikute mo, benkyou shimasu.', 'Même très occupé, j’étudie.'],
    ['にほんごをまなぶことによって、せかいがひろがります。', '日本語を学ぶことによって、世界が広がります。', 'Nihongo o manabu koto ni yotte, sekai ga hirogarimasu.', 'En apprenant le japonais, le monde s’élargit.'],
  ]),
  makeGrammarLesson(99, 'JLPT', 'Structures JLPT N1', 'Maîtrise finale', 'Aperçu futur', 'avance', 'Placer le N1 comme horizon très long terme.', 'Le N1 demande précision, registres, lecture formelle et nuances proches du natif.', 'Expression avancée + registre', 'Objectif futur : ne pas mélanger au N5 actif.', [
    ['どりょくなしには、じょうたつできません。', '努力なしには、上達できません。', 'Doryoku nashi ni wa, joutatsu dekimasen.', 'Sans effort, on ne peut pas progresser.'],
    ['にほんごをつづけてこそ、けっかがでます。', '日本語を続けてこそ、結果が出ます。', 'Nihongo o tsuzukete koso, kekka ga demasu.', 'C’est précisément en continuant le japonais que les résultats arrivent.'],
  ]),
];

const SUPPLEMENTAL_GRAMMAR_LESSONS: GrammarLesson[] = [
  makeGrammarLesson(100, 'Fondations', 'Vue d’ensemble', 'Présentation générale de la langue japonaise', 'Contexte + particules + verbe final', 'facile', 'Comprendre la logique générale du japonais avant les règles isolées.', 'Le japonais donne d’abord le contexte, puis la fonction des mots avec les particules, et finit souvent par le verbe. Cette logique permet de lire sans traduire mot à mot.', 'Thème + informations + verbe/です', 'Ne cherche pas un équivalent français pour chaque mot : regarde le rôle de chaque bloc.', [
    ['わたしはにほんごをべんきょうします。', '私は日本語を勉強します。', 'Watashi wa nihongo o benkyou shimasu.', 'J’étudie le japonais.'],
    ['きょう、がっこうでともだちにあいます。', '今日、学校で友達に会います。', 'Kyou, gakkou de tomodachi ni aimasu.', 'Aujourd’hui, je rencontre un ami à l’école.'],
  ]),
  makeGrammarLesson(101, 'Fondations', 'Écriture', 'Systèmes d’écriture japonais', 'かな + 漢字 + 外来語', 'facile', 'Savoir pourquoi une même phrase mélange hiragana, katakana et kanji.', 'Les hiragana servent aux formes grammaticales, particules et mots japonais. Les katakana servent souvent aux mots étrangers. Les kanji portent beaucoup de sens lexical.', 'Kanji pour le sens + kana pour la grammaire', 'Ne lis pas une phrase japonaise comme une suite uniforme de signes : chaque système a un rôle.', [
    ['これはにほんごのほんです。', 'これは日本語の本です。', 'Kore wa nihongo no hon desu.', 'C’est un livre de japonais.'],
    ['コーヒーをのみます。', 'コーヒーを飲みます。', 'Koohii o nomimasu.', 'Je bois du café.'],
  ]),
  makeGrammarLesson(102, 'Fondations', 'Écriture', 'Hiragana dans la grammaire', 'Particules et terminaisons', 'facile', 'Comprendre pourquoi les hiragana restent indispensables même avec les kanji.', 'Les hiragana écrivent les particules, les terminaisons de verbes et beaucoup de mots grammaticaux. Ils montrent comment les kanji fonctionnent dans la phrase.', 'Kanji + hiragana grammatical', 'Ne pense pas que les kanji remplacent les hiragana : ils travaillent ensemble.', [
    ['ほんをよみます。', '本を読みます。', 'Hon o yomimasu.', 'Je lis un livre.'],
    ['たかくないです。', '高くないです。', 'Takakunai desu.', 'Ce n’est pas cher / pas haut.'],
  ]),
  makeGrammarLesson(103, 'Fondations', 'Écriture', 'Katakana et katakana spéciaux', '外来語 + 音の追加', 'facile', 'Reconnaître les mots étrangers et les sons adaptés au japonais.', 'Les katakana écrivent souvent les mots venus d’autres langues. Certains sons spéciaux comme ファ, ティ, チェ servent à approcher des sons étrangers.', 'Katakana + mot emprunté', 'Un mot en katakana n’est pas toujours anglais exact : sa prononciation devient japonaise.', [
    ['タクシーでいきます。', 'タクシーで行きます。', 'Takushii de ikimasu.', 'J’y vais en taxi.'],
    ['パーティーにいきます。', 'パーティーに行きます。', 'Paatii ni ikimasu.', 'Je vais à une fête.'],
  ]),
  makeGrammarLesson(104, 'Fondations', 'Écriture', 'Kanji dans une phrase N5', '漢字 + lecture + contexte', 'pratique', 'Utiliser les kanji comme aide de sens, pas comme obstacle.', 'Au N5, les kanji fréquents indiquent vite le sens : jour, mois, personne, école, eau, feu, livre. Le kana autour donne la grammaire.', 'Kanji lexical + particule kana', 'Ne bloque pas sur la lecture parfaite : commence par reconnaître le sens en contexte.', [
    ['月よう日に学校へ行きます。', '月曜日に学校へ行きます。', 'Getsuyoubi ni gakkou e ikimasu.', 'Lundi, je vais à l’école.'],
    ['水を飲みます。', '水を飲みます。', 'Mizu o nomimasu.', 'Je bois de l’eau.'],
  ]),
  makeGrammarLesson(105, 'Vie courante', 'Expressions de base', 'Salutations et expressions de base', 'Formule fixe + situation', 'facile', 'Répondre naturellement aux échanges quotidiens.', 'Certaines phrases se mémorisent comme des paires sociales. Elles ne se reconstruisent pas toujours mot à mot : on apprend la réponse attendue dans la situation.', 'Situation → formule naturelle', 'Une phrase grammaticalement correcte peut être socialement étrange si elle ne correspond pas à la formule attendue.', [
    ['ただいま。おかえりなさい。', 'ただいま。お帰りなさい。', 'Tadaima. Okaerinasai.', 'Je suis rentré. Bon retour.'],
    ['いってきます。いってらっしゃい。', '行ってきます。行ってらっしゃい。', 'Ittekimasu. Itterasshai.', 'J’y vais. Bonne route.'],
  ]),
  makeGrammarLesson(106, 'Particules', 'Particules avancées', 'だけ / しか / まで / ほど', 'Limite, restriction, degré', 'avance', 'Reconnaître quelques particules qui ajoutent une nuance précise.', 'Certaines particules ne marquent pas seulement une fonction simple. Elles ajoutent une idée de limite, restriction, approximation ou degré.', 'Nom + particule de nuance', 'Ne les traduis pas toujours par un seul mot français : regarde la nuance.', [
    ['みずだけのみます。', '水だけ飲みます。', 'Mizu dake nomimasu.', 'Je bois seulement de l’eau.'],
    ['ひらがなしかわかりません。', 'ひらがなしか分かりません。', 'Hiragana shika wakarimasen.', 'Je ne comprends que les hiragana.'],
  ]),
  makeGrammarLesson(107, 'Temps et quantités', 'Calendrier', 'Jours, mois et dates', 'Date précise + に', 'pratique', 'Dire un jour, un mois, une date et les placer dans une phrase.', 'Les dates précises prennent souvent に. Les mots relatifs comme 今日, 明日, 昨日 n’en ont généralement pas besoin.', 'Date + に + action', 'Ne mets pas に après tous les mots de temps.', [
    ['六月二十日に日本へ行きます。', '六月二十日に日本へ行きます。', 'Rokugatsu hatsuka ni Nihon e ikimasu.', 'Le 20 juin, je vais au Japon.'],
    ['明日、学校へ行きます。', '明日、学校へ行きます。', 'Ashita, gakkou e ikimasu.', 'Demain, je vais à l’école.'],
  ]),
  makeGrammarLesson(108, 'Temps et quantités', 'Heures', 'Heures, minutes et moments de la journée', '時 / 分 / 半 / ごろ', 'pratique', 'Dire l’heure exacte ou approximative.', '時 marque l’heure, 分 les minutes, 半 la demie, ごろ l’approximation. Une heure précise prend souvent に.', 'Heure + に + verbe', '四時, 七時 et 九時 ont des lectures à surveiller.', [
    ['七時半に起きます。', '七時半に起きます。', 'Shichi-ji han ni okimasu.', 'Je me lève à sept heures et demie.'],
    ['八時ごろ家へ帰ります。', '八時ごろ家へ帰ります。', 'Hachi-ji goro uchi e kaerimasu.', 'Je rentre vers huit heures.'],
  ]),
  makeGrammarLesson(109, 'Temps et quantités', 'Expressions de temps', 'Fréquence et durée', 'いつも / よく / 時々 / あまり / 全然', 'pratique', 'Dire souvent, parfois, rarement ou pas du tout.', 'Les adverbes de fréquence se placent souvent avant le verbe ou près du début de la phrase. あまり et 全然 appellent généralement une négation.', 'Adverbe de fréquence + verbe', 'あまり好きです est incomplet : on attend souvent あまり好きではありません.', [
    ['よく日本語を勉強します。', 'よく日本語を勉強します。', 'Yoku nihongo o benkyou shimasu.', 'J’étudie souvent le japonais.'],
    ['あまりテレビを見ません。', 'あまりテレビを見ません。', 'Amari terebi o mimasen.', 'Je ne regarde pas beaucoup la télévision.'],
  ]),
  makeGrammarLesson(110, 'Temps et quantités', 'Saisons', '春 / 夏 / 秋 / 冬', 'Saison + は / に', 'facile', 'Parler des quatre saisons dans une phrase simple.', 'Les saisons peuvent être thème avec は, moment avec に, ou complément de temps dans une description. Elles servent souvent avec les adjectifs de météo.', 'Saison + は + adjectif', 'Ne confonds pas saison générale et date précise : la date précise prend plus facilement に.', [
    ['春は暖かいです。', '春は暖かいです。', 'Haru wa atatakai desu.', 'Le printemps est doux.'],
    ['冬に雪が降ります。', '冬に雪が降ります。', 'Fuyu ni yuki ga furimasu.', 'En hiver, il neige.'],
  ]),
  makeGrammarLesson(111, 'Actions', 'Vue d’ensemble', 'Verbes japonais : rôle et position', 'Verbe final', 'facile', 'Comprendre le rôle central du verbe japonais.', 'Le verbe arrive souvent à la fin et décide de l’action principale. Les informations avant lui préparent le lieu, le temps, l’objet, la personne ou la raison.', 'Informations + verbe final', 'Ne décide pas du sens avant d’avoir lu le verbe final.', [
    ['朝、家でご飯を食べます。', '朝、家でご飯を食べます。', 'Asa, uchi de gohan o tabemasu.', 'Le matin, je mange à la maison.'],
    ['駅で友達を待ちます。', '駅で友達を待ちます。', 'Eki de tomodachi o machimasu.', 'J’attends un ami à la gare.'],
  ]),
  makeGrammarLesson(112, 'Actions', 'Changement', 'なる : devenir', 'Nom/adjectif + になります', 'intermediaire', 'Dire qu’un état change.', 'なる exprime un changement : devenir étudiant, devenir froid, devenir calme. Avec un adjectif en い, い devient く. Avec un nom ou adjectif en な, on utilise に.', 'い → くなる / nom・な-adj + になる', 'Ne mets pas です avant なる.', [
    ['日本語が上手になります。', '日本語が上手になります。', 'Nihongo ga jouzu ni narimasu.', 'Je deviens bon en japonais.'],
    ['寒くなりました。', '寒くなりました。', 'Samuku narimashita.', 'Il a commencé à faire froid.'],
  ]),
  makeGrammarLesson(113, 'Actions', 'Formes avancées', 'Forme causative-passive', 'させられる', 'avance', 'Reconnaître “être forcé de faire” dans la progression future.', 'La causative-passive combine faire faire et subir. Elle signifie souvent qu’une personne est obligée de faire une action.', 'Verbe causatif-passif', 'Ce n’est pas une priorité N5 : reconnaissance seulement pour ne pas confondre les formes.', [
    ['宿題をさせられました。', '宿題をさせられました。', 'Shukudai o saseraremashita.', 'On m’a forcé à faire les devoirs.'],
    ['長く待たされました。', '長く待たされました。', 'Nagaku matasaremashita.', 'On m’a fait attendre longtemps.'],
  ]),
  makeGrammarLesson(114, 'Descriptions', 'Adverbes', 'Adverbes de manière, degré et fréquence', '副詞 + verbe/adjectif', 'pratique', 'Utiliser les adverbes sans les confondre avec les adjectifs.', 'Un adverbe modifie une action, une qualité ou toute la phrase. Il ne se conjugue pas comme un adjectif. よく, とても, 少し, ゆっくり, すぐ sont très utiles.', 'Adverbe + mot modifié', 'あまり et 全然 demandent souvent une négation.', [
    ['ゆっくり話してください。', 'ゆっくり話してください。', 'Yukkuri hanashite kudasai.', 'Parlez lentement, s’il vous plaît.'],
    ['この店はとても有名です。', 'この店はとても有名です。', 'Kono mise wa totemo yuumei desu.', 'Ce magasin est très connu.'],
  ]),
  makeGrammarLesson(115, 'Vie courante', 'Famille', 'Famille : parler des proches', '家族 + は / が / の', 'facile', 'Présenter sa famille avec des phrases N5.', 'Les mots de famille changent parfois selon qu’on parle de sa famille ou de celle d’une autre personne. La grammaire utile reste simple : は pour présenter, の pour relier, と pour accompagner.', 'Membre de famille + particule', '兄/姉 parlent de ton grand frère/ta grande sœur ; お兄さん/お姉さん parlent souvent de ceux des autres.', [
    ['母は先生です。', '母は先生です。', 'Haha wa sensei desu.', 'Ma mère est professeure.'],
    ['兄と学校へ行きます。', '兄と学校へ行きます。', 'Ani to gakkou e ikimasu.', 'Je vais à l’école avec mon grand frère.'],
  ]),
  makeGrammarLesson(116, 'Vie courante', 'Corps', 'Parties du corps', '体 + が / を', 'facile', 'Exprimer une douleur, une action ou une description liée au corps.', 'Les parties du corps s’utilisent avec が pour dire ce qui fait mal ou ce qui est concerné. を sert quand l’action touche directement une partie.', 'Partie du corps + が/を + verbe', '痛い fonctionne souvent avec が : 頭が痛いです.', [
    ['頭が痛いです。', '頭が痛いです。', 'Atama ga itai desu.', 'J’ai mal à la tête.'],
    ['手を洗います。', '手を洗います。', 'Te o araimasu.', 'Je me lave les mains.'],
  ]),
  makeGrammarLesson(117, 'Vie courante', 'Registre prudent', 'Gros mots et insultes : comprendre et éviter', 'Langage blessant + contexte', 'avance', 'Reconnaître qu’un mot peut être violent ou impoli sans l’utiliser.', 'Certaines expressions peuvent blesser, provoquer ou donner une image très rude. Pour un apprenant N5, l’objectif est surtout de reconnaître le registre et d’éviter de les produire.', 'Mot rude → éviter / reformuler', 'Ne mémorise pas les insultes comme vocabulaire actif : apprends plutôt les alternatives neutres.', [
    ['そんな言い方はよくないです。', 'そんな言い方はよくないです。', 'Sonna iikata wa yokunai desu.', 'Cette façon de parler n’est pas bonne.'],
    ['丁寧に話してください。', '丁寧に話してください。', 'Teinei ni hanashite kudasai.', 'Parlez poliment, s’il vous plaît.'],
  ]),
  makeGrammarLesson(118, 'Phrases complexes', 'Discours rapporté', 'Discours rapporté', 'Phrase + と言いました', 'avance', 'Rapporter ce que quelqu’un a dit.', 'と marque le contenu rapporté. La phrase citée vient avant と, puis un verbe comme 言います, 思います ou 聞きます indique l’action de dire/penser/demander.', 'Citation + と + verbe de parole', 'Ne place pas と au début comme “que” en français.', [
    ['先生は明日テストがあると言いました。', '先生は明日テストがあると言いました。', 'Sensei wa ashita tesuto ga aru to iimashita.', 'Le professeur a dit qu’il y aurait un test demain.'],
    ['友達は行きたいと言いました。', '友達は行きたいと言いました。', 'Tomodachi wa ikitai to iimashita.', 'Mon ami a dit qu’il voulait y aller.'],
  ]),
  makeGrammarLesson(119, 'Style et registre', 'Conversation quotidienne', 'Grammaire de conversation quotidienne', 'Omission + contexte', 'pratique', 'Comprendre les phrases courtes naturelles.', 'À l’oral, le japonais omet souvent le sujet, raccourcit les réponses et s’appuie sur le contexte. La phrase peut rester correcte même si tout n’est pas dit.', 'Contexte + réponse courte', 'Pour l’examen, garde des phrases complètes ; pour écouter, accepte les omissions.', [
    ['行きますか。はい、行きます。', '行きますか。はい、行きます。', 'Ikimasu ka. Hai, ikimasu.', 'Tu y vas ? Oui, j’y vais.'],
    ['何を飲みますか。水を。', '何を飲みますか。水を。', 'Nani o nomimasu ka. Mizu o.', 'Tu bois quoi ? De l’eau.'],
  ]),
  makeGrammarLesson(120, 'Style et registre', 'Écrit formel', 'Grammaire écrite formelle', 'Phrase complète + registre stable', 'avance', 'Reconnaître les formes plus propres à l’écrit.', 'L’écrit garde plus souvent les éléments complets, les connecteurs précis et un style stable. Les omissions orales sont moins fréquentes.', 'Phrase complète + connecteur', 'Ne copie pas l’oral familier dans une réponse écrite formelle.', [
    ['雨ですから、今日は行きません。', '雨ですから、今日は行きません。', 'Ame desu kara, kyou wa ikimasen.', 'Comme il pleut, je n’y vais pas aujourd’hui.'],
    ['この町は静かで便利です。', 'この町は静かで便利です。', 'Kono machi wa shizuka de benri desu.', 'Cette ville est calme et pratique.'],
  ]),
  makeGrammarLesson(121, 'Lexique et grammaire', 'Vocabulaire thématique', 'Vocabulaire thématique de base en phrase', 'Thème lexical + particule', 'facile', 'Utiliser le vocabulaire par thème dans une phrase correcte.', 'Le vocabulaire seul ne suffit pas. Pour parler de nourriture, famille, école, transport ou corps, il faut ajouter la bonne particule et le bon verbe.', 'Mot thématique + particule + verbe', 'Apprendre un mot sans phrase rend son usage fragile.', [
    ['駅で電車を待ちます。', '駅で電車を待ちます。', 'Eki de densha o machimasu.', 'J’attends le train à la gare.'],
    ['学校で日本語を勉強します。', '学校で日本語を勉強します。', 'Gakkou de nihongo o benkyou shimasu.', 'J’étudie le japonais à l’école.'],
  ]),
  makeGrammarLesson(122, 'Lexique et grammaire', 'Index', 'Index du vocabulaire : retrouver une règle par mot', 'Mot → phrase → règle', 'facile', 'Savoir réviser un mot avec sa structure grammaticale.', 'Un index utile ne donne pas seulement la traduction. Il indique dans quelles phrases le mot apparaît, avec quelle particule et quel verbe.', 'Mot + exemple grammatical', 'Ne révise pas les listes sans regarder la phrase exemple.', [
    ['水：水を飲みます。', '水：水を飲みます。', 'Mizu: mizu o nomimasu.', 'Eau : je bois de l’eau.'],
    ['学校：学校へ行きます。', '学校：学校へ行きます。', 'Gakkou: gakkou e ikimasu.', 'École : je vais à l’école.'],
  ]),
  makeGrammarLesson(123, 'Lexique et grammaire', 'Kanji', 'Glossaire de kanji en contexte', 'Kanji + lecture + phrase', 'facile', 'Apprendre les kanji N5 dans de vraies phrases.', 'Un kanji doit être relié à sa lecture et à une phrase. 日, 月, 人, 本, 水, 火 changent de lecture selon les mots.', 'Kanji + mot + phrase', 'Ne mémorise pas seulement le dessin : relie sens, lecture et usage.', [
    ['日本へ行きます。', '日本へ行きます。', 'Nihon e ikimasu.', 'Je vais au Japon.'],
    ['月曜日に会います。', '月曜日に会います。', 'Getsuyoubi ni aimasu.', 'On se voit lundi.'],
  ]),
  makeGrammarLesson(124, 'Lexique et grammaire', 'Onomatopées', 'Glossaire d’onomatopées utiles', 'Expression expressive + verbe/adjectif', 'pratique', 'Utiliser quelques mots expressifs sans surcharge.', 'Les onomatopées japonaises peuvent décrire un son, une manière, une sensation ou un état. Au début, il faut surtout apprendre les plus utiles en phrase.', 'Onomatopée/adverbe + verbe', 'Toutes les onomatopées ne sont pas N5 : garde un usage simple.', [
    ['ゆっくり歩きます。', 'ゆっくり歩きます。', 'Yukkuri arukimasu.', 'Je marche lentement.'],
    ['雨がざあざあ降っています。', '雨がざあざあ降っています。', 'Ame ga zaazaa futte imasu.', 'La pluie tombe à verse.'],
  ]),
  makeGrammarLesson(125, 'Méthode JLPT', 'Exercices', 'Exercices et corrections', 'Erreur → règle → nouvel exemple', 'facile', 'Savoir utiliser une correction pour progresser.', 'Une bonne correction ne donne pas seulement la bonne réponse. Elle explique la règle, l’indice dans la phrase, le piège et un nouvel exemple à mémoriser.', 'Réponse + pourquoi + mémo', 'Ne passe pas trop vite après une erreur : la correction est une mini-leçon.', [
    ['なぜ「を」ですか。目的語だからです。', 'なぜ「を」ですか。目的語だからです。', 'Naze “o” desu ka. Mokutekigo dakara desu.', 'Pourquoi “を” ? Parce que c’est l’objet direct.'],
    ['まちがえた問題をもう一度します。', '間違えた問題をもう一度します。', 'Machigaeta mondai o mou ichido shimasu.', 'Je refais encore une fois les questions ratées.'],
  ]),
  makeGrammarLesson(126, 'Vie courante', 'Questions', 'Placer le mot interrogatif et sa particule', '誰が / 何を / どこで / いつから', 'facile', 'Construire une question complète sans supprimer la particule.', 'Le mot interrogatif prend la place de l’information inconnue. La particule reste après lui et indique son rôle : が pour la personne qui agit, を pour l’objet, で pour le lieu de l’action, から pour le point de départ.', 'Mot interrogatif + particule + reste de la phrase + か', 'Ne mets pas automatiquement は après chaque mot interrogatif.', [
    ['だれが来ますか。', '誰が来ますか。', 'Dare ga kimasu ka.', 'Qui vient ?'],
    ['何を食べますか。', '何を食べますか。', 'Nani o tabemasu ka.', 'Que mangez-vous ?'],
    ['どこで日本語を勉強しますか。', 'どこで日本語を勉強しますか。', 'Doko de nihongo o benkyou shimasu ka.', 'Où étudiez-vous le japonais ?'],
  ]),
  makeGrammarLesson(127, 'Vie courante', 'Questions', 'どう / どうして / なぜ : comment et pourquoi', 'どう + verbe / どうして・なぜ + raison', 'pratique', 'Demander une manière, un état ou une raison.', 'どう demande comment ou dans quel état. どうして et なぜ demandent pourquoi. どうして est très courant dans la conversation ; なぜ paraît souvent plus direct ou plus écrit.', 'どう + phrase / どうして・なぜ + phrase + か', 'どう ne signifie pas pourquoi : regarde si la réponse attend une manière ou une raison.', [
    ['学校までどうやって行きますか。', '学校までどうやって行きますか。', 'Gakkou made dou yatte ikimasu ka.', 'Comment allez-vous jusqu’à l’école ?'],
    ['この料理はどうですか。', 'この料理はどうですか。', 'Kono ryouri wa dou desu ka.', 'Comment trouvez-vous ce plat ?'],
    ['どうして昨日休みましたか。', 'どうして昨日休みましたか。', 'Doushite kinou yasumimashita ka.', 'Pourquoi vous êtes-vous absenté hier ?'],
  ]),
  makeGrammarLesson(128, 'Temps et quantités', 'Questions pratiques', 'いくら / 何時 / 何曜日 / 何歳', 'Mot interrogatif de mesure + ですか', 'facile', 'Demander un prix, une heure, un jour ou un âge.', 'Le japonais utilise un mot interrogatif adapté à l’unité recherchée. いくら demande le prix. 何時 demande l’heure. 何曜日 demande le jour de la semaine. 何歳 demande l’âge.', 'Information recherchée + ですか', '何 change parfois de lecture : なんじ, なんようび et なんさい.', [
    ['この本はいくらですか。', 'この本はいくらですか。', 'Kono hon wa ikura desu ka.', 'Combien coûte ce livre ?'],
    ['今、何時ですか。', '今、何時ですか。', 'Ima nanji desu ka.', 'Quelle heure est-il maintenant ?'],
    ['誕生日は何曜日ですか。', '誕生日は何曜日ですか。', 'Tanjoubi wa nanyoubi desu ka.', 'Quel jour de la semaine est votre anniversaire ?'],
  ]),
  makeGrammarLesson(129, 'Temps et quantités', 'Questions de quantité', 'いくつ / 何人 / 何本 / どのくらい', 'Question + compteur ou durée', 'pratique', 'Demander combien, combien de personnes ou pendant combien de temps.', 'いくつ demande un nombre général. Avec un compteur, on emploie 何 + compteur. どのくらい demande une durée, une distance ou un degré approximatif.', 'いくつ / 何 + compteur / どのくらい + verbe', 'Le compteur doit correspondre à ce que l’on compte.', [
    ['りんごをいくつ買いますか。', '林檎をいくつ買いますか。', 'Ringo o ikutsu kaimasu ka.', 'Combien de pommes achetez-vous ?'],
    ['学生が何人いますか。', '学生が何人いますか。', 'Gakusei ga nannin imasu ka.', 'Combien y a-t-il d’étudiants ?'],
    ['毎日どのくらい勉強しますか。', '毎日どのくらい勉強しますか。', 'Mainichi dono kurai benkyou shimasu ka.', 'Combien de temps étudiez-vous chaque jour ?'],
  ]),
  makeGrammarLesson(130, 'Vie courante', 'Questions', '誰か / 何か / どこか : une information indéfinie', 'Mot interrogatif + か', 'intermediaire', 'Dire quelqu’un, quelque chose ou quelque part.', 'Ajouter か à un mot interrogatif ne pose plus une question : cela crée une information indéfinie. 誰か signifie quelqu’un, 何か quelque chose et どこか quelque part.', '誰か / 何か / どこか + particule éventuelle', 'Dans certaines phrases, la particule qui suit peut être omise, mais le sens de か reste essentiel.', [
    ['教室に誰かいます。', '教室に誰かいます。', 'Kyoushitsu ni dareka imasu.', 'Il y a quelqu’un dans la salle de classe.'],
    ['何か飲みませんか。', '何か飲みませんか。', 'Nanika nomimasen ka.', 'Voulez-vous boire quelque chose ?'],
    ['日曜日にどこかへ行きます。', '日曜日にどこかへ行きます。', 'Nichiyoubi ni dokoka e ikimasu.', 'Dimanche, je vais quelque part.'],
  ]),
  makeGrammarLesson(131, 'Vie courante', 'Questions', '誰も / 何も : personne et rien avec la négation', 'Mot interrogatif + も + négation', 'intermediaire', 'Comprendre pourquoi も change le sens avec une phrase négative.', 'Avec une négation, 誰も signifie personne et 何も signifie rien. Le mot ne suffit pas seul : c’est la négation du verbe qui complète le sens.', '誰も・何も + verbe négatif', '誰もいます ne signifie pas personne : il faut 誰もいません.', [
    ['教室に誰もいません。', '教室に誰もいません。', 'Kyoushitsu ni daremo imasen.', 'Il n’y a personne dans la salle de classe.'],
    ['朝は何も食べませんでした。', '朝は何も食べませんでした。', 'Asa wa nanimo tabemasen deshita.', 'Ce matin, je n’ai rien mangé.'],
    ['今日は誰も来ません。', '今日は誰も来ません。', 'Kyou wa daremo kimasen.', 'Aujourd’hui, personne ne vient.'],
  ]),
  makeGrammarLesson(132, 'Particules', 'Origine et limite', 'から…まで : de… jusqu’à…', 'Départ から + limite まで', 'facile', 'Indiquer le début et la fin d’un trajet, d’un horaire ou d’une période.', 'から marque le point de départ. まで marque la limite finale. Ils peuvent être employés ensemble ou séparément, pour un lieu comme pour un moment.', 'Lieu/heure から + lieu/heure まで', 'L’ordre naturel est から…まで : du point de départ vers la limite.', [
    ['学校は九時から三時までです。', '学校は九時から三時までです。', 'Gakkou wa kuji kara sanji made desu.', 'L’école est de neuf heures à trois heures.'],
    ['家から駅まで歩きます。', '家から駅まで歩きます。', 'Ie kara eki made arukimasu.', 'Je marche de la maison jusqu’à la gare.'],
    ['月曜日から金曜日まで働きます。', '月曜日から金曜日まで働きます。', 'Getsuyoubi kara kinyoubi made hatarakimasu.', 'Je travaille du lundi au vendredi.'],
  ]),
  makeGrammarLesson(133, 'Particules', 'Limite temporelle', 'まで et までに : jusqu’à ou au plus tard', 'Durée まで / échéance までに', 'intermediaire', 'Distinguer une action qui continue d’une échéance à respecter.', 'まで indique que l’action ou l’état continue jusqu’à une limite. までに indique qu’une action doit être terminée avant cette limite.', 'Action continue + まで / action terminée + までに', 'に transforme la limite en échéance : cinq heures au plus tard.', [
    ['五時まで勉強します。', '五時まで勉強します。', 'Goji made benkyou shimasu.', 'J’étudie jusqu’à cinq heures.'],
    ['五時までに宿題をします。', '五時までに宿題をします。', 'Goji made ni shukudai o shimasu.', 'Je fais mes devoirs pour cinq heures au plus tard.'],
    ['金曜日までに本を返してください。', '金曜日までに本を返してください。', 'Kinyoubi made ni hon o kaeshite kudasai.', 'Veuillez rendre le livre au plus tard vendredi.'],
  ]),
  makeGrammarLesson(134, 'Temps et quantités', 'Fréquence', 'いつも / よく / 時々 / あまり / 全然', 'Échelle de fréquence + verbe', 'facile', 'Exprimer précisément toujours, souvent, parfois, rarement et jamais.', 'いつも indique une habitude très régulière. よく signifie souvent. 時々 signifie parfois. あまり et 全然 s’emploient normalement avec une négation au niveau N5.', 'Adverbe de fréquence + verbe positif ou négatif', 'あまり et 全然 appellent une forme négative : あまり行きません, 全然食べません.', [
    ['毎朝いつも七時に起きます。', '毎朝いつも七時に起きます。', 'Maiasa itsumo shichiji ni okimasu.', 'Chaque matin, je me lève toujours à sept heures.'],
    ['週末はよく映画を見ます。', '週末はよく映画を見ます。', 'Shuumatsu wa yoku eiga o mimasu.', 'Le week-end, je regarde souvent des films.'],
    ['肉はあまり食べません。', '肉はあまり食べません。', 'Niku wa amari tabemasen.', 'Je ne mange pas souvent de viande.'],
  ]),
  makeGrammarLesson(135, 'Temps et quantités', 'Adverbes temporels', 'もう / まだ / すぐ / 後で', 'Moment relatif + action', 'pratique', 'Dire déjà, pas encore, tout de suite ou plus tard.', 'もう avec une forme affirmative signifie déjà. まだ avec une négation signifie pas encore. すぐ indique une action immédiate. 後で place l’action plus tard.', 'もう + affirmatif / まだ + négatif / すぐ・後で + verbe', 'まだ食べます signifie encore manger ; pour pas encore, utilise まだ食べていません.', [
    ['宿題はもう終わりました。', '宿題はもう終わりました。', 'Shukudai wa mou owarimashita.', 'Les devoirs sont déjà terminés.'],
    ['昼ご飯はまだ食べていません。', '昼ご飯はまだ食べていません。', 'Hirugohan wa mada tabete imasen.', 'Je n’ai pas encore déjeuné.'],
    ['後ですぐ電話します。', '後ですぐ電話します。', 'Ato de sugu denwa shimasu.', 'Je téléphonerai juste après.'],
  ]),
  makeGrammarLesson(136, 'Temps et quantités', 'Durée et approximation', '間 / ぐらい / ごろ', 'Durée ou heure approximative', 'pratique', 'Différencier pendant combien de temps et vers quelle heure.', '間 indique une durée complète. ぐらい donne une quantité ou une durée approximative. ごろ s’utilise surtout avec un point dans le temps, comme une heure.', 'Durée + 間・ぐらい / heure + ごろ', 'Deux heures environ se dit 二時間ぐらい ; vers deux heures se dit 二時ごろ.', [
    ['毎日一時間勉強します。', '毎日一時間勉強します。', 'Mainichi ichijikan benkyou shimasu.', 'J’étudie une heure chaque jour.'],
    ['駅まで十分ぐらいです。', '駅まで十分ぐらいです。', 'Eki made juppun gurai desu.', 'Il faut environ dix minutes jusqu’à la gare.'],
    ['十一時ごろ寝ます。', '十一時ごろ寝ます。', 'Juuichiji goro nemasu.', 'Je me couche vers onze heures.'],
  ]),
  makeGrammarLesson(137, 'Actions', 'Conjugaison groupe 1', 'Verbes godan : 書く・話す・読む', 'Dernière syllabe transformée', 'intermediaire', 'Former correctement ます, ない, て et た pour les verbes du groupe 1.', 'Les verbes godan changent leur dernière syllabe selon la forme. 書く devient 書きます, 書かない, 書いて et 書いた. Les terminaisons う・つ・る, む・ぶ・ぬ, く, ぐ et す suivent chacune un modèle.', 'Forme dictionnaire → ligne en い pour ます / ligne en あ pour ない / groupe sonore pour て・た', '行く est irrégulier pour la forme て : 行って, pas 行いて.', [
    ['毎日手紙を書きます。', '毎日手紙を書きます。', 'Mainichi tegami o kakimasu.', 'J’écris une lettre chaque jour.'],
    ['今日はお酒を飲まないです。', '今日はお酒を飲まないです。', 'Kyou wa osake o nomanai desu.', 'Aujourd’hui, je ne bois pas d’alcool.'],
    ['駅まで歩いて行きました。', '駅まで歩いて行きました。', 'Eki made aruite ikimashita.', 'Je suis allé jusqu’à la gare à pied.'],
  ]),
  makeGrammarLesson(138, 'Actions', 'Conjugaison groupe 2', 'Verbes ichidan : 食べる・見る・起きる', 'Retirer る puis ajouter la terminaison', 'facile', 'Conjuguer les verbes du groupe 2 avec une règle stable.', 'Pour un verbe ichidan, on retire généralement le る final. On ajoute ensuite ます, ない, て ou た : 食べます, 食べない, 食べて, 食べた.', 'Base sans る + ます / ない / て / た', 'Tous les verbes terminés par る ne sont pas ichidan : 帰る et 走る sont notamment du groupe 1.', [
    ['毎朝七時に起きます。', '毎朝七時に起きます。', 'Maiasa shichiji ni okimasu.', 'Chaque matin, je me lève à sept heures.'],
    ['朝ご飯を食べない日もあります。', '朝ご飯を食べない日もあります。', 'Asagohan o tabenai hi mo arimasu.', 'Il y a aussi des jours où je ne prends pas de petit-déjeuner.'],
    ['昨日その映画を見ました。', '昨日その映画を見ました。', 'Kinou sono eiga o mimashita.', 'Hier, j’ai vu ce film.'],
  ]),
  makeGrammarLesson(139, 'Actions', 'Conjugaison irrégulière', 'する / 来る', 'します・しない・して / 来ます・来ない・来て', 'facile', 'Maîtriser les deux familles irrégulières indispensables.', 'する et 来る ne suivent pas les modèles ordinaires. Il faut mémoriser leurs bases : する devient します, しない, して, した ; 来る devient 来ます, 来ない, 来て, 来た.', 'する → し… / 来る → き・こ・きて', 'La lecture de 来 change selon la forme : くる, きます, こない.', [
    ['毎日日本語を勉強します。', '毎日日本語を勉強します。', 'Mainichi nihongo o benkyou shimasu.', 'J’étudie le japonais chaque jour.'],
    ['今日は運動しません。', '今日は運動しません。', 'Kyou wa undou shimasen.', 'Aujourd’hui, je ne fais pas de sport.'],
    ['友達が家に来ました。', '友達が家に来ました。', 'Tomodachi ga ie ni kimashita.', 'Un ami est venu chez moi.'],
  ]),
  makeGrammarLesson(140, 'Actions', 'Conjugaison polie', 'ます / ません / ました / ませんでした', 'Temps × affirmation ou négation', 'facile', 'Construire les quatre formes polies de base sans les mélanger.', 'La terminaison indique deux informations : le temps et l’affirmation. ます est affirmatif non-passé, ません négatif non-passé, ました affirmatif passé et ませんでした négatif passé.', 'Radical verbal + terminaison polie', 'Le non-passé japonais peut décrire le présent habituel ou le futur.', [
    ['毎日学校へ行きます。', '毎日学校へ行きます。', 'Mainichi gakkou e ikimasu.', 'Je vais à l’école chaque jour.'],
    ['明日は学校へ行きません。', '明日は学校へ行きません。', 'Ashita wa gakkou e ikimasen.', 'Demain, je n’irai pas à l’école.'],
    ['昨日は学校へ行きませんでした。', '昨日は学校へ行きませんでした。', 'Kinou wa gakkou e ikimasen deshita.', 'Hier, je ne suis pas allé à l’école.'],
  ]),
  makeGrammarLesson(141, 'Actions', 'Forme て', '書いて / 読んで / 話して / 行って', 'Relier, demander et construire', 'intermediaire', 'Former la forme て et comprendre ses usages principaux.', 'La forme て relie des actions et sert dans de nombreuses structures : てください, ています, てもいいです. う・つ・る donnent って ; む・ぶ・ぬ donnent んで ; く donne いて ; ぐ donne いで ; す donne して.', 'Verbe en て + structure', 'La forme て n’indique pas seule le temps : la fin de la phrase donne le temps principal.', [
    ['朝ご飯を食べて、学校へ行きます。', '朝ご飯を食べて、学校へ行きます。', 'Asagohan o tabete, gakkou e ikimasu.', 'Je prends mon petit-déjeuner puis je vais à l’école.'],
    ['ここに名前を書いてください。', 'ここに名前を書いてください。', 'Koko ni namae o kaite kudasai.', 'Veuillez écrire votre nom ici.'],
    ['今、本を読んでいます。', '今、本を読んでいます。', 'Ima hon o yonde imasu.', 'Je suis en train de lire un livre.'],
  ]),
  makeGrammarLesson(142, 'Descriptions', 'Conjugaison adjectifs en い', '高い / 高くない / 高かった / 高くなかった', 'Adjectif en い transformé', 'intermediaire', 'Exprimer présent, négation et passé avec un adjectif en い.', 'L’adjectif en い porte lui-même le temps et la négation. Pour nier, い devient くない. Pour le passé, い devient かった. Le passé négatif se termine par くなかった.', 'い → くない / かった / くなかった', 'いい est irrégulier : よくない et よかった.', [
    ['この本は高いです。', 'この本は高いです。', 'Kono hon wa takai desu.', 'Ce livre est cher.'],
    ['この店は高くないです。', 'この店は高くないです。', 'Kono mise wa takakunai desu.', 'Ce magasin n’est pas cher.'],
    ['昨日は寒くなかったです。', '昨日は寒くなかったです。', 'Kinou wa samukunakatta desu.', 'Hier, il ne faisait pas froid.'],
  ]),
  makeGrammarLesson(143, 'Descriptions', 'Adjectifs en な et noms', '静かです / 静かではありません / 静かでした', 'Mot + copule conjuguée', 'intermediaire', 'Conjuguer les adjectifs en な et les noms sans appliquer la règle des adjectifs en い.', 'Les adjectifs en な et les noms utilisent la copule. Au style poli : です, ではありません, でした, ではありませんでした. な apparaît surtout lorsque l’adjectif est directement devant un nom.', 'な-adjectif ou nom + copule', 'Ne transforme pas 静か en 静かくない : utilise 静かではありません.', [
    ['この町は静かです。', 'この町は静かです。', 'Kono machi wa shizuka desu.', 'Cette ville est calme.'],
    ['この部屋は綺麗ではありません。', 'この部屋は綺麗ではありません。', 'Kono heya wa kirei dewa arimasen.', 'Cette pièce n’est pas propre.'],
    ['昨日は休みでした。', '昨日は休みでした。', 'Kinou wa yasumi deshita.', 'Hier était un jour de congé.'],
  ]),
  makeGrammarLesson(144, 'Connecteurs', 'Ordre des actions', '前に / 後で / てから', 'Avant, après, puis', 'pratique', 'Raconter des actions quotidiennes dans le bon ordre.', 'Avant une action, on emploie la forme dictionnaire + 前に. Après une action terminée, on utilise la forme た + 後で. La forme て + から insiste sur le fait que la seconde action vient après la première.', 'Verbe dictionnaire + 前に / verbe た + 後で / verbe て + から', 'Avant utilise la forme dictionnaire même si toute la phrase parle du passé.', [
    ['寝る前に歯を磨きます。', '寝る前に歯を磨きます。', 'Neru mae ni ha o migakimasu.', 'Je me brosse les dents avant de dormir.'],
    ['ご飯を食べた後で勉強します。', 'ご飯を食べた後で勉強します。', 'Gohan o tabeta ato de benkyou shimasu.', 'J’étudie après avoir mangé.'],
    ['宿題をしてから遊びます。', '宿題をしてから遊びます。', 'Shukudai o shite kara asobimasu.', 'Je joue après avoir fait mes devoirs.'],
  ]),
  makeGrammarLesson(145, 'Descriptions', 'Comparaison', 'より / ほうが / 一番', 'Comparer deux éléments ou choisir le maximum', 'intermediaire', 'Comparer clairement deux choses et former un superlatif.', 'より marque le point de comparaison. ほうが indique le côté qui possède davantage la qualité. 一番 indique le plus haut degré dans un groupe.', 'A より B のほうが + adjectif / groupe で X が一番', 'より ne signifie pas automatiquement meilleur : l’adjectif décide de la qualité comparée.', [
    ['電車はバスより速いです。', '電車はバスより速いです。', 'Densha wa basu yori hayai desu.', 'Le train est plus rapide que le bus.'],
    ['魚より肉のほうが好きです。', '魚より肉のほうが好きです。', 'Sakana yori niku no hou ga suki desu.', 'Je préfère la viande au poisson.'],
    ['日本料理で寿司が一番好きです。', '日本料理で寿司が一番好きです。', 'Nihon ryouri de sushi ga ichiban suki desu.', 'Parmi les plats japonais, je préfère les sushis.'],
  ]),
  makeGrammarLesson(146, 'Actions', 'Liste d’actions', 'たり…たりします', 'Exemples d’actions non exhaustifs', 'intermediaire', 'Donner quelques exemples d’activités sans raconter une suite stricte.', 'La forme たり énumère des actions représentatives. Elle se construit à partir de la forme た + り et se termine souvent par します.', 'Verbe たり + verbe たり + します', 'Cette structure ne donne pas forcément l’ordre chronologique des actions.', [
    ['日曜日は本を読んだり、映画を見たりします。', '日曜日は本を読んだり、映画を見たりします。', 'Nichiyoubi wa hon o yondari, eiga o mitari shimasu.', 'Le dimanche, je lis des livres et regarde des films, entre autres.'],
    ['公園で歩いたり、写真を撮ったりしました。', '公園で歩いたり、写真を撮ったりしました。', 'Kouen de aruitari, shashin o tottari shimashita.', 'Au parc, j’ai notamment marché et pris des photos.'],
    ['家で音楽を聞いたり、料理を作ったりします。', '家で音楽を聞いたり、料理を作ったりします。', 'Ie de ongaku o kiitari, ryouri o tsukuttari shimasu.', 'Chez moi, j’écoute de la musique et cuisine, entre autres.'],
  ]),
  makeGrammarLesson(147, 'Vie courante', 'Questions', 'はい・いいえ et réponses naturelles', 'Question en か → réponse courte + information', 'facile', 'Répondre à une question sans répéter toute la phrase.', 'À une question en か, on peut répondre par はい ou いいえ, puis reprendre le verbe utile. Une réponse naturelle peut aussi corriger l’information demandée.', 'はい、verbe positif / いいえ、verbe négatif', 'はい confirme la proposition de l’interlocuteur ; il ne correspond pas toujours mécaniquement au oui français.', [
    ['毎日勉強しますか。はい、勉強します。', '毎日勉強しますか。はい、勉強します。', 'Mainichi benkyou shimasu ka. Hai, benkyou shimasu.', 'Étudiez-vous chaque jour ? Oui.'],
    ['魚を食べますか。いいえ、食べません。', '魚を食べますか。いいえ、食べません。', 'Sakana o tabemasu ka. Iie, tabemasen.', 'Mangez-vous du poisson ? Non.'],
    ['田中さんですか。いいえ、山田です。', '田中さんですか。いいえ、山田です。', 'Tanaka-san desu ka. Iie, Yamada desu.', 'Êtes-vous M. Tanaka ? Non, je suis Yamada.'],
  ]),
];

const VOCABULARY_ONLY_GRAMMAR_LESSON_ORDERS = new Set([101, 102, 103, 104, 115, 116, 117, 121, 122, 123, 124]);

const VOCABULARY_TRANSFER_CARDS = [
  {
    title: 'Écritures et kanji',
    subtitle: 'Hiragana, katakana, katakana spéciaux et kanji hors règle grammaticale.',
    target: 'Kana / Kanji / Vocabulaire',
  },
  {
    title: 'Vocabulaire thématique',
    subtitle: 'Famille, corps, objets, lieux, nourriture et mots N5 à mémoriser en cartes.',
    target: 'Vocabulaire',
  },
  {
    title: 'Glossaires',
    subtitle: 'Index de mots, lectures, onomatopées et listes de référence.',
    target: 'Vocabulaire',
  },
] as const;

function isGrammarLessonUsefulForGrammar(lesson: GrammarLesson): boolean {
  return !VOCABULARY_ONLY_GRAMMAR_LESSON_ORDERS.has(lesson.order);
}

const ALL_GRAMMAR_LESSONS = [...GRAMMAR_LESSONS, ...CONSOLIDATED_GRAMMAR_LESSONS, ...SUPPLEMENTAL_GRAMMAR_LESSONS]
  .filter(isGrammarLessonUsefulForGrammar)
  .map(normalizeGrammarLessonForTeacherCourse)
  .sort((a, b) => a.order - b.order);

const emptyGrammarProgressSummary: GrammarProgressSummary = {
  total: ALL_GRAMMAR_LESSONS.length,
  opened: 0,
  completed: 0,
  exerciseAttempts: 0,
  exerciseCorrect: 0,
  exerciseRate: 0,
  menusOpened: 0,
};

const GRAMMAR_MAIN_MENUS = [
  'Écriture et bases',
  'Particules',
  'Adjectifs',
  'Formes verbales',
  'Verbes et actions',
  'Structure de phrase',
  'Questions',
  'Temps et adverbes',
  'Expressions pratiques',
  'Connecteurs',
  'Phrases complexes',
  'Style et registre',
  'Lexique en contexte',
  'Méthode et corrections',
  'JLPT',
] as const;

class AppErrorBoundary extends Component<{ children: ReactNode }, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('App runtime error', error);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <SafeAreaView style={styles.app}>
          <View style={styles.errorScreen}>
            <Text style={styles.errorKicker}>Erreur détectée</Text>
            <Text style={styles.errorTitle}>L'app a protégé la session</Text>
            <Text style={styles.errorText}>
              Une erreur est survenue, mais l'application ne s'est pas fermée. Relance l'écran et envoie-moi ce message si cela revient.
            </Text>
            <Text style={styles.errorDetail}>{this.state.error.message}</Text>
            <Pressable style={styles.primaryButton} onPress={this.reset}>
              <Text style={styles.primaryButtonText}>Reprendre</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

async function initializeDatabase(db: SQLiteDatabase) {
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

const DAILY_GOAL_DEFINITIONS: Array<{
  id: string;
  title: string;
  description: string;
  target: number;
  rewardXp: number;
  badgeCode: string;
  unit: string;
  period: GoalPeriod;
}> = [
  {
    id: 'daily-questions',
    title: 'Rythme N5',
    description: 'Répondre à 20 questions aujourd’hui.',
    target: 20,
    rewardXp: 120,
    badgeCode: 'XP',
    unit: 'questions',
    period: 'daily',
  },
  {
    id: 'daily-precision',
    title: 'Précision',
    description: 'Atteindre 80% de réussite avec au moins 10 réponses.',
    target: 80,
    rewardXp: 160,
    badgeCode: 'XP',
    unit: '%',
    period: 'daily',
  },
  {
    id: 'daily-quiz',
    title: 'Défi Quiz/Grammaire',
    description: 'Terminer 1 session quiz ou 1 exercice de grammaire.',
    target: 1,
    rewardXp: 220,
    badgeCode: 'XP',
    unit: 'activité',
    period: 'daily',
  },
];

const WEEKLY_GOAL_DEFINITIONS = [
  {
    id: 'weekly-questions',
    title: 'Semaine active',
    description: 'Répondre à 150 questions cette semaine.',
    target: 150,
    rewardXp: 850,
    badgeCode: 'XP',
    unit: 'questions',
    period: 'weekly' as const,
  },
  {
    id: 'weekly-precision',
    title: 'Semaine précise',
    description: 'Atteindre 85% avec au moins 80 réponses cette semaine.',
    target: 85,
    rewardXp: 1100,
    badgeCode: 'XP',
    unit: '%',
    period: 'weekly' as const,
  },
  {
    id: 'weekly-quiz',
    title: 'Routine quiz',
    description: 'Terminer 5 sessions quiz cette semaine.',
    target: 5,
    rewardXp: 950,
    badgeCode: 'XP',
    unit: 'quiz',
    period: 'weekly' as const,
  },
];

const MONTHLY_GOAL_DEFINITIONS = [
  {
    id: 'monthly-questions',
    title: 'Mois intensif',
    description: 'Répondre à 800 questions ce mois-ci.',
    target: 800,
    rewardXp: 4200,
    badgeCode: 'XP',
    unit: 'questions',
    period: 'monthly' as const,
  },
  {
    id: 'monthly-precision',
    title: 'Mois maîtrisé',
    description: 'Atteindre 88% avec au moins 400 réponses ce mois-ci.',
    target: 88,
    rewardXp: 5200,
    badgeCode: 'XP',
    unit: '%',
    period: 'monthly' as const,
  },
  {
    id: 'monthly-quiz',
    title: 'Mois de simulation',
    description: 'Terminer 25 sessions quiz ce mois-ci.',
    target: 25,
    rewardXp: 4700,
    badgeCode: 'XP',
    unit: 'quiz',
    period: 'monthly' as const,
  },
];

const YEARLY_GOAL_DEFINITIONS = [
  {
    id: 'yearly-questions',
    title: 'Année JLPT',
    description: 'Répondre à 10000 questions sur 365 jours.',
    target: 10000,
    rewardXp: 25000,
    badgeCode: 'XP',
    unit: 'questions',
    period: 'yearly' as const,
  },
  {
    id: 'yearly-precision',
    title: 'Année maîtrisée',
    description: 'Atteindre 90% avec au moins 5000 réponses sur l’année.',
    target: 90,
    rewardXp: 32000,
    badgeCode: 'XP',
    unit: '%',
    period: 'yearly' as const,
  },
  {
    id: 'yearly-quiz',
    title: 'Année de simulation',
    description: 'Terminer 250 sessions quiz sur 365 jours.',
    target: 250,
    rewardXp: 28000,
    badgeCode: 'XP',
    unit: 'quiz',
    period: 'yearly' as const,
  },
  {
    id: 'yearly-connection',
    title: '365 jours',
    description: 'Étudier tous les jours pendant une année.',
    target: 365,
    rewardXp: 40000,
    badgeCode: 'XP',
    unit: 'jours',
    period: 'yearly' as const,
  },
];

const GOAL_DEFINITIONS = [
  ...DAILY_GOAL_DEFINITIONS,
  ...WEEKLY_GOAL_DEFINITIONS,
  ...MONTHLY_GOAL_DEFINITIONS,
  ...YEARLY_GOAL_DEFINITIONS,
];

const BADGE_DEFINITIONS: BadgeDefinition[] = [
  { id: 'daily-keiko', title: '10 connexions', description: 'Étudier 10 jours différents.', icon: '十日', domain: 'quotidien' },
  { id: 'daily-seikaku', title: '20 connexions', description: 'Étudier 20 jours différents.', icon: '二十', domain: 'quotidien' },
  { id: 'daily-sho', title: '50 connexions', description: 'Étudier 50 jours différents.', icon: '五十', domain: 'quotidien' },
  { id: 'daily-100', title: '100 connexions', description: 'Étudier 100 jours différents.', icon: '百日', domain: 'quotidien' },
  { id: 'daily-200', title: '200 connexions', description: 'Étudier 200 jours différents.', icon: '二百', domain: 'quotidien' },
  { id: 'daily-365', title: '365 connexions', description: 'Étudier chaque jour sur une année complète.', icon: '年完', domain: 'quotidien' },
  { id: 'daily-triple', title: '10 jours parfaits', description: 'Réussir les 3 objectifs sur 10 jours.', icon: '完十', domain: 'quotidien' },
  { id: 'daily-week', title: '20 jours parfaits', description: 'Réussir les 3 objectifs sur 20 jours.', icon: '完二', domain: 'quotidien' },
  { id: 'daily-month', title: '50 jours parfaits', description: 'Réussir les 3 objectifs sur 50 jours.', icon: '完五', domain: 'quotidien' },
  { id: 'perfect-100', title: '100 jours parfaits', description: 'Réussir les 3 objectifs quotidiens sur 100 jours.', icon: '完百', domain: 'quotidien' },
  { id: 'perfect-200', title: '200 jours parfaits', description: 'Réussir les 3 objectifs quotidiens sur 200 jours.', icon: '完二', domain: 'quotidien' },
  { id: 'perfect-365', title: 'Année parfaite', description: 'Réussir les objectifs quotidiens chaque jour pendant un an.', icon: '完年', domain: 'quotidien' },
  { id: 'streak-3', title: 'Série 10', description: 'Étudier 10 jours de suite.', icon: '連十', domain: 'quotidien' },
  { id: 'streak-7', title: 'Série 20', description: 'Étudier 20 jours de suite.', icon: '連二', domain: 'quotidien' },
  { id: 'streak-30', title: 'Série 50', description: 'Étudier 50 jours de suite.', icon: '連五', domain: 'quotidien' },
  { id: 'streak-100', title: 'Série 100', description: 'Étudier 100 jours de suite.', icon: '連百', domain: 'quotidien' },
  { id: 'streak-365', title: 'Série 365', description: 'Étudier 365 jours de suite.', icon: '連年', domain: 'quotidien' },
  { id: 'level-5', title: 'Niveau 5', description: 'Atteindre le niveau 5.', icon: '段五', domain: 'maitrise' },
  { id: 'level-10', title: 'Niveau 10', description: 'Atteindre le niveau 10.', icon: '段十', domain: 'maitrise' },
  { id: 'level-20', title: 'Niveau 20', description: 'Atteindre le niveau 20.', icon: '段二', domain: 'maitrise' },
  { id: 'level-50', title: 'Niveau 50', description: 'Atteindre le niveau 50.', icon: '段五', domain: 'maitrise' },
  { id: 'level-100', title: 'Niveau 100', description: 'Atteindre le niveau 100.', icon: '段百', domain: 'maitrise' },
  { id: 'level-150', title: 'Niveau 150', description: 'Atteindre le niveau 150.', icon: '段一', domain: 'maitrise' },
  { id: 'level-200', title: 'Niveau 200', description: 'Atteindre le niveau 200.', icon: '段二', domain: 'maitrise' },
  { id: 'level-250', title: 'Niveau 250', description: 'Atteindre le niveau maximum.', icon: '極', domain: 'maitrise' },

  { id: 'kana-first', title: 'Kana 50', description: 'Voir 50 kana.', icon: '仮五', domain: 'kana' },
  { id: 'kana-25', title: 'Kana 100', description: 'Voir 100 kana et sons combinés.', icon: '仮百', domain: 'kana' },
  { id: 'kana-50', title: 'Kana 250', description: 'Faire 250 réponses kana.', icon: '仮二', domain: 'kana' },
  { id: 'hiragana-10', title: 'Hiragana solide', description: 'Maîtriser 30 hiragana.', icon: 'あ', domain: 'kana' },
  { id: 'hiragana-46', title: 'Hiragana Complet', description: 'Maîtriser les hiragana de base.', icon: 'ひ', domain: 'kana' },
  { id: 'katakana-10', title: 'Katakana solide', description: 'Maîtriser 30 katakana.', icon: 'ア', domain: 'kana' },
  { id: 'katakana-46', title: 'Katakana Complet', description: 'Maîtriser les katakana de base.', icon: 'カ', domain: 'kana' },
  { id: 'kana-combined', title: 'Sons combinés', description: 'Faire 100 réponses sur les sons combinés.', icon: 'きゃ', domain: 'kana' },

  { id: 'quiz-first', title: '50 questions', description: 'Répondre à 50 questions.', icon: '問五', domain: 'quiz' },
  { id: 'quiz-100', title: '100 Réponses', description: 'Répondre à 100 questions.', icon: '百', domain: 'quiz' },
  { id: 'quiz-500', title: '500 Réponses', description: 'Répondre à 500 questions.', icon: '五百', domain: 'quiz' },
  { id: 'quiz-accuracy-70', title: 'Précision 75', description: 'Atteindre 75% avec au moins 200 réponses.', icon: '七五', domain: 'quiz' },
  { id: 'quiz-accuracy-85', title: 'Précision 90', description: 'Atteindre 90% avec au moins 500 réponses.', icon: '九割', domain: 'quiz' },
  { id: 'quiz-score-1000', title: 'Score 3000', description: 'Faire 3000 points au Quiz Kana.', icon: '三千', domain: 'quiz' },
  { id: 'quiz-streak-5', title: 'Combo 10', description: 'Obtenir une série de 10.', icon: '十連', domain: 'quiz' },
  { id: 'quiz-streak-10', title: 'Combo 20', description: 'Obtenir une série de 20.', icon: '二連', domain: 'quiz' },

  { id: 'vocab-first', title: 'Premier mot', description: 'Maîtriser 1 mot de vocabulaire.', icon: '語', domain: 'vocabulaire' },
  { id: 'vocab-25', title: '25 mots', description: 'Maîtriser 25 mots N5.', icon: '語25', domain: 'vocabulaire' },
  { id: 'vocab-50', title: '50 mots', description: 'Maîtriser 50 mots N5.', icon: '語50', domain: 'vocabulaire' },
  { id: 'vocab-100', title: '100 mots', description: 'Maîtriser 100 mots N5.', icon: '語百', domain: 'vocabulaire' },
  { id: 'vocab-250', title: '250 mots', description: 'Maîtriser 250 mots N5.', icon: '語二', domain: 'vocabulaire' },
  { id: 'vocab-500', title: '500 mots', description: 'Maîtriser 500 mots N5.', icon: '語五', domain: 'vocabulaire' },
  { id: 'vocab-review-clear', title: 'Vocabulaire clair', description: 'Avoir peu de mots à revoir.', icon: '明', domain: 'vocabulaire' },
  { id: 'vocab-ready', title: 'Lexique N5 solide', description: 'Atteindre 70% de maîtrise vocabulaire.', icon: '辞', domain: 'vocabulaire' },

  { id: 'grammar-first', title: 'Première règle', description: 'Maîtriser 1 règle de grammaire.', icon: '文', domain: 'grammaire' },
  { id: 'grammar-particles', title: 'Particules', description: 'Travailler les particules essentielles.', icon: '助', domain: 'grammaire' },
  { id: 'grammar-10', title: '10 règles', description: 'Maîtriser 10 règles N5.', icon: '文十', domain: 'grammaire' },
  { id: 'grammar-25', title: '25 règles', description: 'Maîtriser 25 règles N5.', icon: '文二', domain: 'grammaire' },
  { id: 'grammar-50', title: '50 règles', description: 'Maîtriser 50 règles N5.', icon: '文五', domain: 'grammaire' },
  { id: 'grammar-accuracy', title: 'Syntaxe fiable', description: 'Atteindre 80% en grammaire.', icon: '整', domain: 'grammaire' },
  { id: 'grammar-review-clear', title: 'Grammaire claire', description: 'Réduire fortement les règles à revoir.', icon: '清', domain: 'grammaire' },
  { id: 'grammar-ready', title: 'Grammaire N5 prête', description: 'Atteindre 70% de maîtrise grammaire.', icon: '合', domain: 'grammaire' },
  { id: 'grammar-open-10', title: '10 leçons ouvertes', description: 'Ouvrir 10 leçons de grammaire.', icon: '読十', domain: 'grammaire' },
  { id: 'grammar-open-50', title: '50 leçons ouvertes', description: 'Explorer 50 leçons de grammaire.', icon: '読五', domain: 'grammaire' },
  { id: 'grammar-open-all', title: 'Bibliothèque ouverte', description: 'Ouvrir les 99 leçons de grammaire.', icon: '読完', domain: 'grammaire' },
  { id: 'grammar-exercise-50', title: '50 exercices grammaire', description: 'Répondre à 50 exercices de grammaire.', icon: '練五', domain: 'grammaire' },
  { id: 'grammar-exercise-200', title: '200 exercices grammaire', description: 'Répondre à 200 exercices de grammaire.', icon: '練二', domain: 'grammaire' },
  { id: 'grammar-menus', title: 'Tous les dossiers', description: 'Ouvrir au moins une leçon dans chaque grand menu.', icon: '目録', domain: 'grammaire' },

  { id: 'kanji-first', title: 'Premier kanji', description: 'Maîtriser 1 kanji.', icon: '字', domain: 'kanji' },
  { id: 'kanji-10', title: '10 kanji', description: 'Maîtriser 10 kanji N5.', icon: '字十', domain: 'kanji' },
  { id: 'kanji-40', title: '40 kanji', description: 'Maîtriser 40 kanji N5.', icon: '字四', domain: 'kanji' },
  { id: 'kanji-80', title: '80 kanji', description: 'Maîtriser les 80 kanji N5.', icon: '字完', domain: 'kanji' },

  { id: 'jlpt-first-exam', title: 'Premier examen', description: 'Faire une session examen.', icon: '試', domain: 'jlpt' },
  { id: 'jlpt-readiness-50', title: 'Mi-parcours N5', description: 'Atteindre 50% de préparation.', icon: '半', domain: 'jlpt' },
  { id: 'jlpt-readiness-75', title: 'N5 proche', description: 'Atteindre 75% de préparation.', icon: '近', domain: 'jlpt' },
  { id: 'jlpt-readiness-90', title: 'Prêt examen', description: 'Atteindre 90% de préparation.', icon: '合格', domain: 'jlpt' },
  { id: 'year-questions', title: '10000 questions', description: 'Répondre à 10000 questions sur un an.', icon: '万問', domain: 'jlpt' },
  { id: 'year-quiz', title: '250 quiz', description: 'Terminer 250 sessions quiz sur un an.', icon: '試二', domain: 'jlpt' },
  { id: 'year-precision', title: 'Année 90%', description: 'Tenir 90% avec au moins 5000 réponses.', icon: '九割', domain: 'jlpt' },
] as const;

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildDateRange(days: number, from = new Date()): string[] {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(from);
    date.setDate(from.getDate() + index);
    return formatDateKey(date);
  });
}

function getWeekStart(date = new Date()): Date {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  return start;
}

function getMonthStart(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function getGoalProgress(goalId: string, metrics: DailyGoalMetrics): number {
  if (goalId.endsWith('questions')) return metrics.attempts;
  if (goalId === 'daily-precision') return metrics.attempts >= 10 ? metrics.rate : 0;
  if (goalId === 'weekly-precision') return metrics.attempts >= 80 ? metrics.rate : 0;
  if (goalId === 'monthly-precision') return metrics.attempts >= 400 ? metrics.rate : 0;
  if (goalId === 'yearly-precision') return metrics.attempts >= 5000 ? metrics.rate : 0;
  if (goalId === 'daily-quiz') return metrics.quizAttempts + (metrics.grammarActivities ?? 0);
  if (goalId.endsWith('quiz')) return metrics.quizAttempts;
  if (goalId.endsWith('connection')) return metrics.activeDays ?? 0;
  return 0;
}

function buildQuests(metrics: DailyGoalMetrics, definitions = DAILY_GOAL_DEFINITIONS): CoachQuest[] {
  return definitions.map((goal) => ({
    id: goal.id,
    title: goal.title,
    description: goal.description,
    progress: getGoalProgress(goal.id, metrics),
    target: goal.target,
    reward: `+${goal.rewardXp} XP`,
    rewardXp: goal.rewardXp,
    badgeCode: goal.badgeCode,
    unit: goal.unit,
    period: goal.period,
  }));
}

function buildDailyQuests(metrics: DailyGoalMetrics): CoachQuest[] {
  return buildQuests(metrics, DAILY_GOAL_DEFINITIONS);
}

function isQuestComplete(quest: CoachQuest): boolean {
  return quest.progress >= quest.target;
}

function getMasteryDomain(domains: MasteryDomainStats[], id: string): MasteryDomainStats | null {
  return domains.find((domain) => domain.id === id) ?? null;
}

function getPerfectGoalDays(days: DailyGoalDay[]): number {
  return days.filter((day) => day.completed === day.total).length;
}

function getActiveGoalDays(days: DailyGoalDay[]): number {
  return days.filter((day) => day.attempts > 0 || day.quizAttempts > 0 || (day.grammarActivities ?? 0) > 0).length;
}

function isBadgeUnlocked(badge: BadgeDefinition, context: BadgeProgressContext): boolean {
  const hiragana = getMasteryDomain(context.masteryDomains, 'hiragana');
  const katakana = getMasteryDomain(context.masteryDomains, 'katakana');
  const vocabulary = getMasteryDomain(context.masteryDomains, 'vocabulary');
  const grammar = getMasteryDomain(context.masteryDomains, 'grammar');
  const kanji = getMasteryDomain(context.masteryDomains, 'kanji');
  const perfectDays = getPerfectGoalDays(context.goalCalendar);
  const activeDays = getActiveGoalDays(context.goalCalendar);
  const kanaSeen = (hiragana?.attempted ?? 0) + (katakana?.attempted ?? 0);

  switch (badge.id) {
    case 'daily-keiko': return activeDays >= 10;
    case 'daily-seikaku': return activeDays >= 20;
    case 'daily-sho': return activeDays >= 50;
    case 'daily-100': return activeDays >= 100;
    case 'daily-200': return activeDays >= 200;
    case 'daily-365': return activeDays >= 365;
    case 'daily-triple': return perfectDays >= 10;
    case 'daily-week': return perfectDays >= 20;
    case 'daily-month': return perfectDays >= 50;
    case 'perfect-100': return perfectDays >= 100;
    case 'perfect-200': return perfectDays >= 200;
    case 'perfect-365': return perfectDays >= 365;
    case 'streak-3': return context.streakDays >= 10;
    case 'streak-7': return context.streakDays >= 20;
    case 'streak-30': return context.streakDays >= 50;
    case 'streak-100': return context.streakDays >= 100;
    case 'streak-365': return context.streakDays >= 365;
    case 'level-5': return context.level >= 5;
    case 'level-10': return context.level >= 10;
    case 'level-20': return context.level >= 20;
    case 'level-50': return context.level >= 50;
    case 'level-100': return context.level >= 100;
    case 'level-150': return context.level >= 150;
    case 'level-200': return context.level >= 200;
    case 'level-250': return context.level >= 250;

    case 'kana-first': return kanaSeen >= 50;
    case 'kana-25': return kanaSeen >= 100;
    case 'kana-50': return context.stats.attempts >= 250;
    case 'hiragana-10': return (hiragana?.mastered ?? 0) >= 30;
    case 'hiragana-46': return (hiragana?.mastered ?? 0) >= 46;
    case 'katakana-10': return (katakana?.mastered ?? 0) >= 30;
    case 'katakana-46': return (katakana?.mastered ?? 0) >= 46;
    case 'kana-combined': return context.stats.attempts >= 100 && context.quizSummary.kanaArcadeAttempts >= 5;

    case 'quiz-first': return context.stats.attempts >= 50;
    case 'quiz-100': return context.stats.attempts >= 100;
    case 'quiz-500': return context.stats.attempts >= 500;
    case 'quiz-accuracy-70': return context.stats.attempts >= 200 && context.stats.correctRate >= 75;
    case 'quiz-accuracy-85': return context.stats.attempts >= 500 && context.stats.correctRate >= 90;
    case 'quiz-score-1000': return context.quizSummary.bestScore >= 3000;
    case 'quiz-streak-5': return context.quizSummary.bestStreak >= 10;
    case 'quiz-streak-10': return context.quizSummary.bestStreak >= 20;

    case 'vocab-first': return (vocabulary?.mastered ?? 0) >= 1;
    case 'vocab-25': return (vocabulary?.mastered ?? 0) >= 25;
    case 'vocab-50': return (vocabulary?.mastered ?? 0) >= 50;
    case 'vocab-100': return (vocabulary?.mastered ?? 0) >= 100;
    case 'vocab-250': return (vocabulary?.mastered ?? 0) >= 250;
    case 'vocab-500': return (vocabulary?.mastered ?? 0) >= 500;
    case 'vocab-review-clear': return (vocabulary?.attempted ?? 0) >= 100 && (vocabulary?.review ?? 0) <= 10;
    case 'vocab-ready': return (vocabulary?.rate ?? 0) >= 70 && (vocabulary?.attempted ?? 0) >= 100;

    case 'grammar-first': return (grammar?.mastered ?? 0) >= 1;
    case 'grammar-particles': return (grammar?.attempted ?? 0) >= 10;
    case 'grammar-10': return (grammar?.mastered ?? 0) >= 10;
    case 'grammar-25': return (grammar?.mastered ?? 0) >= 25;
    case 'grammar-50': return (grammar?.mastered ?? 0) >= 50;
    case 'grammar-accuracy': return (grammar?.rate ?? 0) >= 80 && (grammar?.attempted ?? 0) >= 25;
    case 'grammar-review-clear': return (grammar?.attempted ?? 0) >= 50 && (grammar?.review ?? 0) <= 5;
    case 'grammar-ready': return (grammar?.rate ?? 0) >= 70 && (grammar?.attempted ?? 0) >= 50;
    case 'grammar-open-10': return context.grammarLessons.opened >= 10;
    case 'grammar-open-50': return context.grammarLessons.opened >= 50;
    case 'grammar-open-all': return context.grammarLessons.opened >= context.grammarLessons.total;
    case 'grammar-exercise-50': return context.grammarLessons.exerciseAttempts >= 50;
    case 'grammar-exercise-200': return context.grammarLessons.exerciseAttempts >= 200;
    case 'grammar-menus': return context.grammarLessons.menusOpened >= GRAMMAR_MAIN_MENUS.length;

    case 'kanji-first': return (kanji?.mastered ?? 0) >= 1;
    case 'kanji-10': return (kanji?.mastered ?? 0) >= 10;
    case 'kanji-40': return (kanji?.mastered ?? 0) >= 40;
    case 'kanji-80': return (kanji?.mastered ?? 0) >= 80;

    case 'jlpt-first-exam': return context.quizSummary.examAttempts > 0;
    case 'jlpt-readiness-50': return context.stats.correctRate >= 50 && context.stats.attempts >= 50;
    case 'jlpt-readiness-75': return context.stats.correctRate >= 75 && context.stats.attempts >= 100;
    case 'jlpt-readiness-90': return context.stats.correctRate >= 90 && context.stats.attempts >= 200;
    case 'year-questions': return context.stats.attempts >= 10000;
    case 'year-quiz': return context.quizSummary.kanaArcadeAttempts + context.quizSummary.adaptiveAttempts + context.quizSummary.examAttempts >= 250;
    case 'year-precision': return context.stats.attempts >= 5000 && context.stats.correctRate >= 90;
    default:
      return false;
  }
}

function getBadgeDifficulty(badge: BadgeDefinition): BadgeDifficulty {
  if (
    badge.id.includes('365') ||
    badge.id.includes('year') ||
    badge.id === 'level-200' ||
    badge.id === 'level-250' ||
    badge.id === 'kanji-80' ||
    badge.id === 'jlpt-readiness-90'
  ) {
    return 'legendaire';
  }
  if (
    badge.id.includes('200') ||
    badge.id.includes('500') ||
    badge.id === 'level-100' ||
    badge.id === 'level-150' ||
    badge.id === 'level-50' ||
    badge.id === 'perfect-200' ||
    badge.id === 'streak-100' ||
    badge.id === 'vocab-ready' ||
    badge.id === 'grammar-ready' ||
    badge.id === 'grammar-open-all' ||
    badge.id === 'grammar-exercise-200'
  ) {
    return 'expert';
  }
  if (
    badge.id.includes('100') ||
    badge.id === 'daily-sho' ||
    badge.id === 'daily-month' ||
    badge.id === 'streak-30' ||
    badge.id === 'level-20' ||
    badge.id === 'kana-50' ||
    badge.id === 'quiz-500' ||
    badge.id === 'quiz-score-1000' ||
    badge.id === 'quiz-accuracy-85' ||
    badge.id === 'vocab-250' ||
    badge.id === 'grammar-50' ||
    badge.id === 'grammar-open-50' ||
    badge.id === 'grammar-exercise-50' ||
    badge.id === 'grammar-menus' ||
    badge.id === 'kanji-40' ||
    badge.id === 'jlpt-readiness-75'
  ) {
    return 'difficile';
  }
  if (
    badge.id.includes('50') ||
    badge.id === 'daily-seikaku' ||
    badge.id === 'daily-week' ||
    badge.id === 'streak-7' ||
    badge.id === 'level-10' ||
    badge.id === 'kana-25' ||
    badge.id === 'hiragana-46' ||
    badge.id === 'katakana-46' ||
    badge.id === 'quiz-100' ||
    badge.id === 'quiz-accuracy-70' ||
    badge.id === 'quiz-streak-10' ||
    badge.id === 'vocab-100' ||
    badge.id === 'grammar-25' ||
    badge.id === 'kanji-10' ||
    badge.id === 'jlpt-readiness-50'
  ) {
    return 'moyen';
  }
  return 'facile';
}

function getBadgeGate(difficulty: BadgeDifficulty): { requiredLevel: number; requiredBadges: number } {
  if (difficulty === 'moyen') return { requiredLevel: 8, requiredBadges: 5 };
  if (difficulty === 'difficile') return { requiredLevel: 18, requiredBadges: 14 };
  if (difficulty === 'expert') return { requiredLevel: 40, requiredBadges: 28 };
  if (difficulty === 'legendaire') return { requiredLevel: 70, requiredBadges: 45 };
  return { requiredLevel: 1, requiredBadges: 0 };
}

function buildBadgeViews(context: BadgeProgressContext): BadgeView[] {
  const baseUnlockedIds = BADGE_DEFINITIONS
    .filter((badge) => isBadgeUnlocked(badge, context))
    .map((badge) => badge.id);
  const baseUnlockedCount = baseUnlockedIds.length;

  return BADGE_DEFINITIONS.map((badge) => {
    const difficulty = getBadgeDifficulty(badge);
    const gate = getBadgeGate(difficulty);
    const baseUnlocked = baseUnlockedIds.includes(badge.id);
    const gateLocked = context.level < gate.requiredLevel || baseUnlockedCount < gate.requiredBadges;
    return {
      ...badge,
      difficulty,
      requiredLevel: gate.requiredLevel,
      requiredBadges: gate.requiredBadges,
      baseUnlocked,
      gateLocked,
      unlocked: baseUnlocked && !gateLocked,
    };
  });
}

async function ensureDailyGoalPlan(db: SQLiteDatabase) {
  const existing = await db.getFirstAsync<{ days: number }>(
    `
    SELECT COUNT(DISTINCT day) AS days
    FROM app_daily_goal_plan
    WHERE day >= date('now')
    `
  );
  if ((existing?.days ?? 0) >= 365) return;

  const start = new Date();
  start.setDate(start.getDate() - 364);
  const days = buildDateRange(GOAL_PLAN_DAYS, start);
  for (const day of days) {
    for (const goal of DAILY_GOAL_DEFINITIONS) {
      await db.runAsync(
        `
        INSERT OR IGNORE INTO app_daily_goal_plan (
          day, goal_id, title, description, target, reward_xp, badge_code, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `,
        day,
        goal.id,
        goal.title,
        goal.description,
        goal.target,
        goal.rewardXp,
        goal.badgeCode
      );
    }
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <SQLiteProvider
        databaseName="jlpt_n5_mobile_v7.db"
        assetSource={{
          assetId: require('./assets/database/jlpt_n5_mobile.db'),
          forceOverwrite: false,
        }}
        onInit={initializeDatabase}
      >
        <MainApp />
      </SQLiteProvider>
    </AppErrorBoundary>
  );
}

function MainApp() {
  const [screen, setScreen] = useState<Screen>('dashboard');

  return (
    <SafeAreaView style={styles.app}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <HeaderJapanScene />
        <View style={styles.headerTextBlock}>
          <Text style={styles.kicker}>JLPT N5</Text>
          <Text style={styles.title}>Coach Japonais</Text>
          <Text style={styles.headerSubtitle}>日本語を楽しく · Objectif réussite</Text>
        </View>
        <View style={styles.headerBadgeStack}>
          <Text style={styles.badge}>N5</Text>
          <Text style={styles.headerBadgeCaption}>mobile</Text>
        </View>
      </View>

      <View style={styles.screenStage}>
        {screen === 'dashboard' && <DashboardScreen />}
        {screen === 'path' && <LearningPathScreen onNavigate={setScreen} />}
        {screen === 'kana' && <KanaScreen />}
        {screen === 'vocabulary' && <VocabularyScreen />}
        {screen === 'grammar' && <GrammarLessonsScreen />}
        {screen === 'quiz' && <QuizScreen />}
        {screen === 'exam' && <ExamScreen />}
      </View>

      <View style={styles.tabs}>
        <TabButton icon="数" label="Stats" active={screen === 'dashboard'} onPress={() => setScreen('dashboard')} />
        <TabButton icon="道" label="Parcours" active={screen === 'path'} onPress={() => setScreen('path')} />
        <TabButton icon="仮" label="Kana" active={screen === 'kana'} onPress={() => setScreen('kana')} />
        <TabButton icon="語" label="Vocab" active={screen === 'vocabulary'} onPress={() => setScreen('vocabulary')} />
        <TabButton icon="文" label="Grammaire" active={screen === 'grammar'} onPress={() => setScreen('grammar')} />
        <TabButton icon="問" label="Quiz" active={screen === 'quiz'} onPress={() => setScreen('quiz')} />
        <TabButton icon="試" label="JLPT" active={screen === 'exam'} onPress={() => setScreen('exam')} />
      </View>
    </SafeAreaView>
  );
}

function HeaderJapanScene() {
  return (
    <View style={styles.headerScene} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 390 150">
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFE8DA" />
            <Stop offset="0.58" stopColor="#FFF7E8" />
            <Stop offset="1" stopColor="#E7F6F0" />
          </LinearGradient>
          <LinearGradient id="fuji" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#8FC9E8" />
            <Stop offset="1" stopColor="#2F7EA0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="390" height="150" fill="url(#sky)" />
        <Circle cx="300" cy="38" r="34" fill="#E94B5F" opacity="0.92" />
        <Path d="M152 130 L235 42 L318 130 Z" fill="url(#fuji)" opacity="0.9" />
        <Path d="M235 42 L210 76 L238 68 L258 78 Z" fill="#FFFFFF" opacity="0.95" />
        <Path d="M0 132 C56 110 98 122 142 111 C188 98 219 115 260 105 C315 91 352 105 390 92 L390 150 L0 150 Z" fill="#F4B860" opacity="0.5" />
        <Rect x="42" y="74" width="64" height="9" rx="2" fill="#C83543" />
        <Rect x="50" y="84" width="9" height="45" rx="2" fill="#B92E39" />
        <Rect x="90" y="84" width="9" height="45" rx="2" fill="#B92E39" />
        <Rect x="36" y="66" width="76" height="8" rx="2" fill="#E94B5F" />
        <Path d="M32 66 C52 58 94 58 116 66" fill="none" stroke="#7A1E28" strokeWidth="4" strokeLinecap="round" />
        <Circle cx="78" cy="42" r="5" fill="#F6A6B5" opacity="0.85" />
        <Circle cx="98" cy="34" r="4" fill="#F6A6B5" opacity="0.8" />
        <Circle cx="118" cy="49" r="3" fill="#F6A6B5" opacity="0.75" />
        <Path d="M348 78 C358 70 370 70 381 77" fill="none" stroke="#213A57" strokeWidth="3" strokeLinecap="round" opacity="0.32" />
      </Svg>
    </View>
  );
}

function TabButton({
  icon,
  label,
  active,
  onPress,
}: {
  icon: string;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tabButton, active && styles.tabButtonActive]}
    >
      <Text style={[styles.tabIcon, active && styles.tabIconActive]}>{icon}</Text>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function RubricButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.rubricButton, active && styles.rubricButtonActive]}
    >
      <Text style={[styles.rubricButtonText, active && styles.rubricButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

function useVocabularyLookupIndex(db: SQLiteDatabase): WordLookupEntry[] {
  const [entries, setEntries] = useState<WordLookupEntry[]>(CORE_GRAMMAR_LOOKUP_ENTRIES);

  useEffect(() => {
    let mounted = true;
    db.getAllAsync<VocabularyExample>(`
      SELECT id, japanese, kana, kanji, romaji, meaning_fr
      FROM canonical_vocabulary
      ORDER BY length(COALESCE(kanji, japanese, kana)) DESC
      LIMIT 2500
    `)
      .then((rows) => {
        if (!mounted) return;
        setEntries([
          ...CORE_GRAMMAR_LOOKUP_ENTRIES,
          ...rows.map((row) => ({
            ...row,
            usage: buildVocabularyUsage(row),
          })),
        ]);
      })
      .catch((error) => {
        console.error('Unable to load vocabulary lookup index', error);
        if (mounted) setEntries(CORE_GRAMMAR_LOOKUP_ENTRIES);
      });
    return () => {
      mounted = false;
    };
  }, [db]);

  return entries;
}

function JapaneseLookupText({
  text,
  entries,
  onSelect,
  style,
}: {
  text: string;
  entries: WordLookupEntry[];
  onSelect: (entry: WordLookupEntry) => void;
  style: any;
}) {
  const tokens = useMemo(() => tokenizeJapaneseTextForLookup(text, entries), [text, entries]);
  return (
    <Text style={style}>
      {tokens.map((token, index) =>
        token.entry ? (
          <Text
            key={`${token.text}-${index}`}
            style={styles.lookupToken}
            onPress={() => onSelect(token.entry!)}
            onLongPress={() => onSelect(token.entry!)}
          >
            {token.text}
          </Text>
        ) : (
          <Text key={`${token.text}-${index}`}>{token.text}</Text>
        )
      )}
    </Text>
  );
}

function WordLookupPanel({ entry, onClose }: { entry: WordLookupEntry | null; onClose: () => void }) {
  if (!entry) return null;
  return (
    <View style={styles.wordLookupPanel}>
      <View style={styles.wordLookupHeader}>
        <View>
          <Text style={styles.wordLookupKicker}>Mot sélectionné</Text>
          <Text style={styles.wordLookupTitle}>{entry.kanji || entry.japanese}</Text>
        </View>
        <Pressable style={styles.wordLookupClose} onPress={onClose}>
          <Text style={styles.wordLookupCloseText}>×</Text>
        </Pressable>
      </View>
      {!!entry.kana && entry.kana !== (entry.kanji || entry.japanese) && (
        <Text style={styles.wordLookupLine}>Kana : {entry.kana}</Text>
      )}
      {!!entry.romaji && <Text style={styles.wordLookupLine}>Romaji : {entry.romaji}</Text>}
      <Text style={styles.wordLookupMeaning}>Français : {entry.meaning_fr}</Text>
      <Text style={styles.wordLookupUsage}>{entry.usage}</Text>
    </View>
  );
}

function tokenizeJapaneseTextForLookup(text: string, entries: WordLookupEntry[]): JapaneseTextToken[] {
  if (!text) return [];
  const sortedEntries = [...entries]
    .filter((entry) => getLookupCandidates(entry).length > 0)
    .sort((a, b) => getLookupCandidates(b)[0].length - getLookupCandidates(a)[0].length);
  const tokens: JapaneseTextToken[] = [];
  let index = 0;

  while (index < text.length) {
    const char = text[index];
    if (/[\s。、！？,.!?「」『』（）()：:・…]/.test(char)) {
      tokens.push({ text: char });
      index += 1;
      continue;
    }

    const match = sortedEntries.find((entry) =>
      getLookupCandidates(entry).some((candidate) => candidate.length > 0 && text.startsWith(candidate, index))
    );

    if (match) {
      const matchedText = getLookupCandidates(match).find((candidate) => text.startsWith(candidate, index)) ?? char;
      tokens.push({ text: matchedText, entry: match });
      index += matchedText.length;
      continue;
    }

    tokens.push({ text: char });
    index += 1;
  }

  return tokens;
}

function getLookupCandidates(entry: WordLookupEntry): string[] {
  return [entry.kanji, entry.japanese, entry.kana]
    .filter((value): value is string => !!value && value.trim().length > 0)
    .sort((a, b) => b.length - a.length);
}

function buildVocabularyUsage(item: VocabularyExample): string {
  const category = getVocabularyCategory(item);
  if (category === 'Temps et calendrier') return 'On l’emploie pour situer une action dans le temps : jour, heure, date ou moment.';
  if (category === 'Déplacements') return 'On l’emploie avec des verbes comme 行きます, 来ます ou 帰ります pour parler d’un trajet.';
  if (category === 'Nourriture et boissons') return 'On l’emploie souvent avec を + 食べます / 飲みます pour dire ce qu’on mange ou boit.';
  if (category === 'École et étude') return 'On l’emploie dans les phrases de cours, d’étude, d’objet scolaire ou de lieu d’apprentissage.';
  if (category === 'Famille') return 'On l’emploie pour présenter une personne de la famille ou parler d’une relation.';
  if (category === 'Corps') return 'On l’emploie avec が pour dire ce qui fait mal ou ce qui est concerné.';
  if (category === 'Descriptions') return 'On l’emploie pour décrire une personne, une chose, un lieu ou une sensation.';
  return 'On l’emploie comme mot de vocabulaire dans une phrase simple. Regarde la particule juste après pour comprendre son rôle.';
}

const CORE_GRAMMAR_LOOKUP_ENTRIES: WordLookupEntry[] = [
  { id: 'lookup-wa', japanese: 'は', kana: 'は', kanji: null, romaji: 'wa', meaning_fr: 'marque le thème', usage: 'On l’emploie après ce dont on parle. Il se prononce wa quand il est particule.' },
  { id: 'lookup-ga', japanese: 'が', kana: 'が', kanji: null, romaji: 'ga', meaning_fr: 'marque le sujet précis', usage: 'On l’emploie pour pointer ce qui fait l’action, existe, ou porte l’information nouvelle.' },
  { id: 'lookup-o', japanese: 'を', kana: 'を', kanji: null, romaji: 'o', meaning_fr: 'marque l’objet direct', usage: 'On l’emploie après la chose touchée par une action : boire de l’eau, lire un livre, acheter un objet.' },
  { id: 'lookup-ni', japanese: 'に', kana: 'に', kanji: null, romaji: 'ni', meaning_fr: 'moment, destination ou cible', usage: 'On l’emploie pour un point précis : heure, lieu d’arrivée, personne cible, ou lieu d’existence.' },
  { id: 'lookup-de', japanese: 'で', kana: 'で', kanji: null, romaji: 'de', meaning_fr: 'lieu de l’action ou moyen', usage: 'On l’emploie pour dire où une action se passe ou avec quel moyen elle est faite.' },
  { id: 'lookup-e', japanese: 'へ', kana: 'へ', kanji: null, romaji: 'e', meaning_fr: 'direction', usage: 'On l’emploie pour indiquer vers où l’on va. Il se prononce e quand il est particule.' },
  { id: 'lookup-no', japanese: 'の', kana: 'の', kanji: null, romaji: 'no', meaning_fr: 'possession ou précision', usage: 'On l’emploie pour relier deux noms : mon sac, livre de japonais, professeur de japonais.' },
  { id: 'lookup-mo', japanese: 'も', kana: 'も', kanji: null, romaji: 'mo', meaning_fr: 'aussi', usage: 'On l’emploie pour ajouter un élément qui reçoit la même information.' },
  { id: 'lookup-ka', japanese: 'か', kana: 'か', kanji: null, romaji: 'ka', meaning_fr: 'question', usage: 'On l’emploie à la fin d’une phrase polie pour poser une question.' },
  { id: 'lookup-desu', japanese: 'です', kana: 'です', kanji: null, romaji: 'desu', meaning_fr: 'forme polie avec nom/adjectif', usage: 'On l’emploie pour terminer poliment une phrase avec un nom ou un adjectif.' },
  { id: 'lookup-masu', japanese: 'ます', kana: 'ます', kanji: null, romaji: 'masu', meaning_fr: 'forme polie du verbe', usage: 'On l’emploie à la fin d’un verbe pour parler poliment au présent ou futur.' },
];

function GrammarLessonsScreen() {
  const db = useSQLiteContext();
  const vocabularyLookupEntries = useVocabularyLookupIndex(db);
  const folders = useMemo(
    () => GRAMMAR_MAIN_MENUS.filter((menu) => ALL_GRAMMAR_LESSONS.some((lesson) => getGrammarMainMenu(lesson) === menu)),
    []
  );
  const [selectedFolder, setSelectedFolder] = useState<string>(folders[0] ?? 'Particules');
  const [selectedSubfolder, setSelectedSubfolder] = useState<string | null>(null);
  const [grammarMode, setGrammarMode] = useState<GrammarMode>('learn');
  const [memoryGrammarCount, setMemoryGrammarCount] = useState(0);
  const folderLessons = useMemo(
    () => ALL_GRAMMAR_LESSONS.filter((lesson) => getGrammarMainMenu(lesson) === selectedFolder).sort((a, b) => a.order - b.order),
    [selectedFolder]
  );
  const visibleLessons = useMemo(
    () =>
      folderLessons.filter((lesson) => !selectedSubfolder || lesson.subfolder === selectedSubfolder),
    [folderLessons, selectedSubfolder]
  );
  const [selectedLessonId, setSelectedLessonId] = useState(visibleLessons[0]?.id ?? ALL_GRAMMAR_LESSONS[0]?.id);
  const [openedLessonId, setOpenedLessonId] = useState<string | null>(null);
  const [revealedRomajiExampleId, setRevealedRomajiExampleId] = useState<string | null>(null);
  const [revealedTranslationExampleId, setRevealedTranslationExampleId] = useState<string | null>(null);
  const [revealedKanaExampleId, setRevealedKanaExampleId] = useState<string | null>(null);
  const [exerciseFeedback, setExerciseFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [grammarProgress, setGrammarProgress] = useState<GrammarProgressSummary>(emptyGrammarProgressSummary);
  const [grammarExerciseSize, setGrammarExerciseSize] = useState<10 | 20>(10);
  const [grammarExerciseSession, setGrammarExerciseSession] = useState<GrammarQuizSession | null>(null);
  const [grammarExerciseInput, setGrammarExerciseInput] = useState('');
  const [grammarExerciseRomajiVisible, setGrammarExerciseRomajiVisible] = useState(false);
  const [grammarExerciseFrenchVisible, setGrammarExerciseFrenchVisible] = useState(false);
  const [grammarExerciseKanaOnly, setGrammarExerciseKanaOnly] = useState(false);
  const [selectedWordLookup, setSelectedWordLookup] = useState<WordLookupEntry | null>(null);
  const [selectedWordLookupAnchorId, setSelectedWordLookupAnchorId] = useState<string | null>(null);
  const [lessonStatusById, setLessonStatusById] = useState<Record<string, GrammarLessonStatus>>({});
  const selectedLesson =
    ALL_GRAMMAR_LESSONS.find((lesson) => lesson.id === selectedLessonId) ?? visibleLessons[0] ?? ALL_GRAMMAR_LESSONS[0];
  const selectedLessonStatus = lessonStatusById[selectedLesson.id] ?? 'neutral';
  const currentFolderLessons = visibleLessons.length > 0 ? visibleLessons : folderLessons;
  const subfolders = Array.from(new Set(folderLessons.map((lesson) => lesson.subfolder)));
  const easyCount = ALL_GRAMMAR_LESSONS.filter((lesson) => lesson.level === 'facile').length;
  const advancedCount = ALL_GRAMMAR_LESSONS.filter((lesson) => lesson.level === 'avance').length;

  useEffect(() => {
    let mounted = true;
    Promise.all([
      db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) AS count FROM canonical_grammar WHERE jlpt_level = 'N5'`),
      loadGrammarProgressSummary(db),
      loadGrammarLessonStatusById(db),
    ])
      .then(([row, progress, statuses]) => {
        if (!mounted) return;
        setMemoryGrammarCount(row?.count ?? 0);
        setGrammarProgress(progress);
        setLessonStatusById(statuses);
      })
      .catch(() => {
        if (mounted) {
          setMemoryGrammarCount(0);
          setGrammarProgress(emptyGrammarProgressSummary);
        }
      });
    return () => {
      mounted = false;
    };
  }, [db]);

  const selectFolder = (folder: string) => {
    const folderItems = ALL_GRAMMAR_LESSONS.filter((lesson) => getGrammarMainMenu(lesson) === folder).sort((a, b) => a.order - b.order);
    const first = folderItems[0];
    setSelectedFolder(folder);
    setSelectedSubfolder(null);
    setSelectedLessonId(first?.id ?? selectedLessonId);
    setOpenedLessonId(null);
    setRevealedRomajiExampleId(null);
    setRevealedTranslationExampleId(null);
    setRevealedKanaExampleId(null);
    setSelectedWordLookup(null);
    setSelectedWordLookupAnchorId(null);
  };

  const selectSubfolder = (subfolder: string | null) => {
    const scopedLessons = folderLessons.filter((lesson) => !subfolder || lesson.subfolder === subfolder);
    setSelectedSubfolder(subfolder);
    setSelectedLessonId(scopedLessons[0]?.id ?? selectedLessonId);
    setOpenedLessonId(null);
    setRevealedRomajiExampleId(null);
    setRevealedTranslationExampleId(null);
    setRevealedKanaExampleId(null);
    setSelectedWordLookup(null);
    setSelectedWordLookupAnchorId(null);
  };

  const selectLesson = (lesson: GrammarLesson) => {
    setSelectedLessonId(lesson.id);
    setOpenedLessonId(lesson.id);
    setRevealedRomajiExampleId(null);
    setRevealedTranslationExampleId(null);
    setRevealedKanaExampleId(null);
    setExerciseFeedback(null);
    setSelectedWordLookup(null);
    setSelectedWordLookupAnchorId(null);
    void markGrammarLessonOpened(db, lesson.id)
      .then(() => loadGrammarProgressSummary(db))
      .then(setGrammarProgress)
      .catch((error) => console.error('Unable to mark grammar lesson opened', error));
  };

  const closeLesson = () => {
    setOpenedLessonId(null);
    setRevealedRomajiExampleId(null);
    setRevealedTranslationExampleId(null);
    setRevealedKanaExampleId(null);
    setExerciseFeedback(null);
    setSelectedWordLookup(null);
    setSelectedWordLookupAnchorId(null);
  };

  const lessonExerciseExample = selectedLesson.examples[0];
  const exerciseDistractor = ALL_GRAMMAR_LESSONS.find(
    (lesson) => lesson.id !== selectedLesson.id && lesson.examples[0]?.fr !== lessonExerciseExample?.fr
  )?.examples[0]?.fr;
  const lessonExerciseChoices = lessonExerciseExample
    ? shuffle([lessonExerciseExample.fr, exerciseDistractor ?? 'Je vais à l’école.']).slice(0, 2)
    : [];

  const answerLessonExercise = async (choice: string) => {
    if (!lessonExerciseExample || exerciseFeedback) return;
    const isCorrect = choice === lessonExerciseExample.fr;
    setExerciseFeedback(isCorrect ? 'correct' : 'wrong');
    try {
      await recordGrammarExerciseAttempt(
        db,
        selectedLesson,
        choice,
        lessonExerciseExample.fr,
        isCorrect,
        'grammar_lesson'
      );
      setGrammarProgress(await loadGrammarProgressSummary(db));
    } catch (error) {
      console.error('Unable to save grammar lesson exercise', error);
    }
  };

  const setSelectedLessonStatusValue = async (status: GrammarLessonStatus) => {
    try {
      await setGrammarLessonStatus(db, selectedLesson.id, status);
      setGrammarProgress(await loadGrammarProgressSummary(db));
      setLessonStatusById((current) => ({ ...current, [selectedLesson.id]: status }));
    } catch (error) {
      console.error('Unable to update grammar lesson status', error);
    }
  };

  const startGrammarExercises = () => {
    setGrammarExerciseSession(createGrammarSession(buildGrammarQuizQuestions(grammarExerciseSize)));
    setGrammarExerciseInput('');
    setGrammarExerciseRomajiVisible(false);
    setGrammarExerciseFrenchVisible(false);
    setGrammarExerciseKanaOnly(false);
    setSelectedWordLookup(null);
    setSelectedWordLookupAnchorId(null);
  };

  const restartGrammarExerciseMistakes = () => {
    if (!grammarExerciseSession?.mistakes.length) return;
    setGrammarExerciseSession(createGrammarSession(grammarExerciseSession.mistakes.map((mistake) => mistake.question)));
    setGrammarExerciseInput('');
    setGrammarExerciseRomajiVisible(false);
    setGrammarExerciseFrenchVisible(false);
    setGrammarExerciseKanaOnly(false);
    setSelectedWordLookup(null);
    setSelectedWordLookupAnchorId(null);
  };

  const quitGrammarExercises = () => {
    setGrammarExerciseSession(null);
    setGrammarExerciseInput('');
    setGrammarExerciseRomajiVisible(false);
    setGrammarExerciseFrenchVisible(false);
    setGrammarExerciseKanaOnly(false);
    setSelectedWordLookup(null);
    setSelectedWordLookupAnchorId(null);
  };

  const answerGrammarExercise = async (choice: string) => {
    if (!grammarExerciseSession || grammarExerciseSession.finished || grammarExerciseSession.selected) return;
    const current = grammarExerciseSession.questions[grammarExerciseSession.currentIndex];
    if (!current) return;
    const isCorrect = isGrammarAnswerCorrect(choice, current.correctAnswer);
    const nextStreak = isCorrect ? grammarExerciseSession.streak + 1 : 0;
    const points = isCorrect ? 100 * getGrammarStreakMultiplier(nextStreak) : 0;
    try {
      await recordGrammarExerciseAttempt(db, current.lesson, choice, current.correctAnswer, isCorrect, 'grammar_quiz');
      setGrammarProgress(await loadGrammarProgressSummary(db));
    } catch (error) {
      console.error('Unable to save grammar exercise answer', error);
    }
    setGrammarExerciseSession({
      ...grammarExerciseSession,
      selected: choice,
      correctCount: grammarExerciseSession.correctCount + (isCorrect ? 1 : 0),
      score: grammarExerciseSession.score + points,
      streak: nextStreak,
      bestStreak: Math.max(grammarExerciseSession.bestStreak, nextStreak),
      lives: isCorrect ? grammarExerciseSession.lives : Math.max(0, grammarExerciseSession.lives - 1),
      mistakes: isCorrect
        ? grammarExerciseSession.mistakes
        : [...grammarExerciseSession.mistakes, { question: current, selected: choice }],
    });
    setGrammarExerciseInput('');
  };

  const advanceGrammarExercise = () => {
    if (!grammarExerciseSession) return;
    const nextIndex = grammarExerciseSession.currentIndex + 1;
    const finished = grammarExerciseSession.lives <= 0 || nextIndex >= grammarExerciseSession.questions.length;
    setGrammarExerciseSession({
      ...grammarExerciseSession,
      currentIndex: finished ? grammarExerciseSession.currentIndex : nextIndex,
      selected: null,
      streak: finished ? grammarExerciseSession.streak : grammarExerciseSession.streak,
      finished,
    });
    setGrammarExerciseRomajiVisible(false);
    setGrammarExerciseFrenchVisible(false);
    setGrammarExerciseKanaOnly(false);
    setSelectedWordLookup(null);
    setSelectedWordLookupAnchorId(null);
  };

  if (openedLessonId && selectedLesson) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.grammarBackButton} onPress={closeLesson}>
          <Text style={styles.grammarBackText}>← Retour aux leçons</Text>
        </Pressable>

        <Section title="Leçon">
          <View style={styles.grammarDetailCard}>
            <View style={styles.grammarDetailHeader}>
              <View style={styles.grammarOrderBadge}>
                <Text style={styles.grammarOrderText}>{selectedLesson.order}</Text>
              </View>
              <View style={styles.grammarDetailTitleBlock}>
                <Text style={styles.grammarDetailTitle}>{selectedLesson.title}</Text>
                <Text style={styles.grammarDetailPattern}>{humanizeGrammarPattern(selectedLesson)}</Text>
              </View>
              <View
                style={[
                  styles.lessonStatusBadge,
                  selectedLessonStatus === 'understood' && styles.lessonStatusBadge_understood,
                  selectedLessonStatus === 'not_understood' && styles.lessonStatusBadge_notUnderstood,
                ]}
              >
                <Text style={styles.lessonStatusBadgeText}>{formatGrammarLessonStatus(selectedLessonStatus)}</Text>
              </View>
            </View>

            <View style={styles.grammarInfoGrid}>
              <View style={styles.grammarInfoCard}>
                <Text style={styles.grammarInfoLabel}>Objectif</Text>
                <Text style={styles.grammarInfoText}>{selectedLesson.goal}</Text>
              </View>
              <View style={styles.grammarInfoCard}>
                <Text style={styles.grammarInfoLabel}>Formule</Text>
                <Text style={styles.grammarInfoText}>{humanizeGrammarFormula(selectedLesson)}</Text>
              </View>
            </View>

            <View style={styles.grammarFormulaCard}>
              <Text style={styles.grammarFormulaTitle}>La règle avec des cases simples</Text>
              <Text style={styles.grammarFormulaPattern}>{humanizeGrammarPattern(selectedLesson)}</Text>
              <Text style={styles.grammarFormulaText}>{explainGrammarSlots(selectedLesson)}</Text>
            </View>

            <Text style={styles.grammarExplanation}>{selectedLesson.explanation}</Text>

            <View style={styles.grammarCourseBlock}>
              <Text style={styles.grammarCourseTitle}>À quoi ça sert ?</Text>
              <Text style={styles.grammarCourseText}>{buildGrammarUseCase(selectedLesson)}</Text>
            </View>

            <View style={styles.grammarCourseBlock}>
              <Text style={styles.grammarCourseTitle}>Pourquoi ça marche comme ça ?</Text>
              <Text style={styles.grammarCourseText}>{buildGrammarWhy(selectedLesson)}</Text>
            </View>

            <View style={styles.grammarHowCard}>
              <Text style={styles.grammarCourseTitle}>Comment l’utiliser, étape par étape</Text>
              {buildGrammarSteps(selectedLesson).map((step, index) => (
                <View key={`${selectedLesson.id}-step-${index}`} style={styles.grammarStepRow}>
                  <Text style={styles.grammarStepNumber}>{index + 1}</Text>
                  <Text style={styles.grammarStepText}>{step}</Text>
                </View>
              ))}
            </View>

            <View style={styles.grammarSituationCard}>
              <Text style={styles.grammarSituationLabel}>Mise en situation réelle</Text>
              <Text style={styles.grammarSituationText}>{buildGrammarSituation(selectedLesson)}</Text>
            </View>

            <View style={styles.grammarMnemonicCard}>
              <Text style={styles.grammarMnemonicLabel}>Mémo technique et mnémotechnique</Text>
              <Text style={styles.grammarMnemonicText}>{buildGrammarMnemonic(selectedLesson)}</Text>
            </View>

            <View style={styles.grammarTrapCard}>
              <Text style={styles.grammarTrapLabel}>Piège JLPT</Text>
              <Text style={styles.grammarTrapText}>{selectedLesson.trap}</Text>
            </View>

            <View style={styles.grammarExamples}>
              <Text style={styles.grammarExamplesTitle}>Exemples expliqués</Text>
              {selectedLesson.examples.map((example) => {
                const romajiRevealed = revealedRomajiExampleId === example.id;
                const translationRevealed = revealedTranslationExampleId === example.id;
                const kanaRevealed = revealedKanaExampleId === example.id;
                const lookupAnchorId = `example-${example.id}`;
                return (
                  <View
                    key={example.id}
                    style={[styles.grammarExampleCard, translationRevealed && styles.grammarExampleCardRevealed]}
                  >
                    <JapaneseLookupText
                      text={example.kanji || example.kana}
                      entries={vocabularyLookupEntries}
                      onSelect={(entry) => {
                        setSelectedWordLookup(entry);
                        setSelectedWordLookupAnchorId(lookupAnchorId);
                      }}
                      style={styles.grammarExampleKanji}
                    />
                    {selectedWordLookupAnchorId === lookupAnchorId && (
                      <WordLookupPanel
                        entry={selectedWordLookup}
                        onClose={() => {
                          setSelectedWordLookup(null);
                          setSelectedWordLookupAnchorId(null);
                        }}
                      />
                    )}
                    {kanaRevealed && example.kanji !== example.kana && (
                      <Text style={styles.grammarExampleKana}>{example.kana}</Text>
                    )}
                    {romajiRevealed && <Text style={styles.grammarExampleRomaji}>{example.romaji}</Text>}
                    <View style={styles.grammarExampleActions}>
                      {example.kanji !== example.kana && (
                        <Pressable
                          onPress={() => setRevealedKanaExampleId(kanaRevealed ? null : example.id)}
                          style={styles.grammarExampleActionButton}
                        >
                          <Text style={styles.grammarExampleActionText}>
                            {kanaRevealed ? 'Masquer hiragana' : 'Voir en hiragana'}
                          </Text>
                        </Pressable>
                      )}
                      <Pressable
                        onPress={() => setRevealedRomajiExampleId(romajiRevealed ? null : example.id)}
                        style={styles.grammarExampleActionButton}
                      >
                        <Text style={styles.grammarExampleActionText}>
                          {romajiRevealed ? 'Masquer romaji' : 'Voir romaji'}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setRevealedTranslationExampleId(translationRevealed ? null : example.id)}
                        style={[styles.grammarExampleActionButton, styles.grammarExampleTranslateButton]}
                      >
                        <Text style={[styles.grammarExampleActionText, styles.grammarExampleTranslateText]}>
                          {translationRevealed ? 'Masquer français' : 'Voir traduction'}
                        </Text>
                      </Pressable>
                    </View>
                    {translationRevealed && (
                      <View style={styles.grammarTranslationBox}>
                        <Text style={styles.grammarTranslation}>{example.fr}</Text>
                        <Text style={styles.grammarBreakdownTitle}>On démonte la phrase</Text>
                        <Text style={styles.grammarBreakdownText}>{buildGrammarExampleBreakdown(selectedLesson, example)}</Text>
                        <Text style={styles.grammarExampleNote}>{example.note}</Text>
                        <Text style={styles.grammarExampleAnalysis}>
                          {buildGrammarExampleAnalysis(selectedLesson, example)}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            <View style={styles.grammarPracticeCard}>
              <Text style={styles.grammarPracticeTitle}>Mini-entraînement</Text>
              <Text style={styles.grammarPracticeText}>{buildGrammarPracticePrompt(selectedLesson)}</Text>
              {lessonExerciseExample && (
                <>
                  <Text style={styles.questionMeta}>Quelle traduction correspond à cette phrase ?</Text>
                  <Text style={styles.grammarExampleKana}>{lessonExerciseExample.kana}</Text>
                  <JapaneseLookupText
                    text={lessonExerciseExample.kanji}
                    entries={vocabularyLookupEntries}
                    onSelect={(entry) => {
                      setSelectedWordLookup(entry);
                      setSelectedWordLookupAnchorId('lesson-mini');
                    }}
                    style={styles.grammarExampleKanji}
                  />
                  {selectedWordLookupAnchorId === 'lesson-mini' && (
                    <WordLookupPanel
                      entry={selectedWordLookup}
                      onClose={() => {
                        setSelectedWordLookup(null);
                        setSelectedWordLookupAnchorId(null);
                      }}
                    />
                  )}
                  <View style={styles.choiceList}>
                    {lessonExerciseChoices.map((choice) => {
                      const isCorrect = choice === lessonExerciseExample.fr;
                      const isSelected =
                        exerciseFeedback !== null &&
                        ((exerciseFeedback === 'correct' && isCorrect) || (exerciseFeedback === 'wrong' && !isCorrect));
                      return (
                        <Pressable
                          key={choice}
                          disabled={exerciseFeedback !== null}
                          onPress={() => answerLessonExercise(choice)}
                          style={[
                            styles.choice,
                            exerciseFeedback && isCorrect && styles.choiceCorrect,
                            exerciseFeedback === 'wrong' && isSelected && styles.choiceWrong,
                          ]}
                        >
                          <Text style={styles.choiceText}>{choice}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {exerciseFeedback && (
                    <Text style={styles.feedbackText}>
                      {exerciseFeedback === 'correct'
                        ? 'Très bien : cette leçon gagne en maîtrise.'
                        : `À revoir : la bonne réponse était “${lessonExerciseExample.fr}”.`}
                    </Text>
                  )}
                </>
              )}
              <View style={styles.lessonStatusSelector}>
                <Pressable
                  style={[
                    styles.lessonStatusButton,
                    selectedLessonStatus === 'understood' && styles.lessonStatusButton_understood,
                  ]}
                  onPress={() => setSelectedLessonStatusValue('understood')}
                >
                  <Text
                    style={[
                      styles.lessonStatusButtonText,
                      selectedLessonStatus === 'understood' && styles.lessonStatusButtonTextActive,
                    ]}
                  >
                    Comprise
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.lessonStatusButton,
                    selectedLessonStatus === 'not_understood' && styles.lessonStatusButton_notUnderstood,
                  ]}
                  onPress={() => setSelectedLessonStatusValue('not_understood')}
                >
                  <Text
                    style={[
                      styles.lessonStatusButtonText,
                      selectedLessonStatus === 'not_understood' && styles.lessonStatusButtonTextActive,
                    ]}
                  >
                    Non comprise
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.lessonStatusButton,
                    selectedLessonStatus === 'neutral' && styles.lessonStatusButton_neutral,
                  ]}
                  onPress={() => setSelectedLessonStatusValue('neutral')}
                >
                  <Text
                    style={[
                      styles.lessonStatusButtonText,
                      selectedLessonStatus === 'neutral' && styles.lessonStatusButtonTextActive,
                    ]}
                  >
                    Neutre
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Section>
      </ScrollView>
    );
  }

  const currentGrammarExercise = grammarExerciseSession?.questions[grammarExerciseSession.currentIndex] ?? null;
  const grammarExerciseRate =
    grammarExerciseSession && grammarExerciseSession.questions.length > 0
      ? Math.round((grammarExerciseSession.correctCount / grammarExerciseSession.questions.length) * 100)
      : 0;

  if (grammarMode === 'exercise') {
    const safeGrammarExerciseRomaji = currentGrammarExercise
      ? hideGrammarAnswerInHint(
          currentGrammarExercise.romaji,
          currentGrammarExercise.correctAnswer,
          'Romaji complet masqué pendant cette question.'
        )
      : '';
    const safeGrammarExerciseFrench = currentGrammarExercise
      ? hideGrammarAnswerInHint(
          currentGrammarExercise.french,
          currentGrammarExercise.correctAnswer,
          'Traduction complète masquée pendant cette question.'
        )
      : '';
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.grammarHero}>
          <View style={styles.grammarHeroText}>
            <Text style={styles.grammarKicker}>文法 練習</Text>
            <Text style={styles.grammarTitle}>Exercices de grammaire</Text>
            <Text style={styles.grammarSubtitle}>
              Texte à trou, réponses tapées, QCM, traduction et situations : la session se renouvelle à chaque lancement.
            </Text>
          </View>
          <View style={styles.grammarHeroBadge}>
            <Text style={styles.grammarHeroBadgeValue}>{grammarProgress.exerciseAttempts}</Text>
            <Text style={styles.grammarHeroBadgeText}>réponses</Text>
          </View>
        </View>

        <View style={styles.segmented}>
          <SegmentButton label="Leçons" active={false} onPress={() => setGrammarMode('learn')} />
          <SegmentButton label="Exercices" active onPress={() => setGrammarMode('exercise')} />
        </View>

        <View style={styles.grammarStatsRow}>
          <Metric label="Réussite" value={`${grammarProgress.exerciseRate}%`} />
          <Metric label="Comprises" value={grammarProgress.completed} />
          <Metric label="Ouvertes" value={`${grammarProgress.opened}/${grammarProgress.total}`} />
        </View>

        {!grammarExerciseSession ? (
          <Section title="Configuration">
            <View style={styles.segmented}>
              <SegmentButton label="10 questions" active={grammarExerciseSize === 10} onPress={() => setGrammarExerciseSize(10)} />
              <SegmentButton label="20 questions" active={grammarExerciseSize === 20} onPress={() => setGrammarExerciseSize(20)} />
            </View>
            <View style={styles.quizConfigCard}>
              <Text style={styles.quizConfigTitle}>{grammarExerciseSize} exercices prêts</Text>
              <Text style={styles.quizConfigMode}>Atelier complet N5</Text>
              <Text style={styles.quizConfigText}>
                La session mélange textes à trou, réponses à taper, QCM de règle, traductions et situations concrètes.
              </Text>
              <Text style={styles.quizConfigText}>
                Les réponses alimentent les stats, missions, badges et le parcours JLPT.
              </Text>
            </View>
            <Pressable style={styles.primaryButton} onPress={startGrammarExercises}>
              <Text style={styles.primaryButtonText}>Lancer les exercices</Text>
            </Pressable>
          </Section>
        ) : grammarExerciseSession.finished ? (
          <>
            <View style={styles.resultCard}>
              <Text style={styles.resultKicker}>Exercices terminés</Text>
              <Text style={styles.resultScore}>{grammarExerciseRate}%</Text>
              <Text style={styles.resultPercent}>
                {grammarExerciseSession.correctCount}/{grammarExerciseSession.questions.length} bonnes réponses
              </Text>
              <Text style={styles.resultTime}>
                Score : {grammarExerciseSession.score} pts · Meilleure série : {grammarExerciseSession.bestStreak}
              </Text>
              <Text style={styles.resultTime}>
                Vies restantes : {grammarExerciseSession.lives}/3 · Erreurs à revoir : {grammarExerciseSession.mistakes.length}
              </Text>
              <Text style={styles.resultTime}>Progression grammaire enregistrée.</Text>
            </View>
            {grammarExerciseSession.mistakes.length > 0 && (
              <Pressable style={styles.primaryButton} onPress={restartGrammarExerciseMistakes}>
                <Text style={styles.primaryButtonText}>Revoir mes erreurs</Text>
              </Pressable>
            )}
            <Pressable style={styles.primaryButton} onPress={startGrammarExercises}>
              <Text style={styles.primaryButtonText}>Nouvelle session</Text>
            </Pressable>
            <Pressable style={styles.secondaryFullButton} onPress={quitGrammarExercises}>
              <Text style={styles.secondaryFullButtonText}>Quitter</Text>
            </Pressable>
          </>
        ) : currentGrammarExercise ? (
          <Section title={`Exercice ${grammarExerciseSession.currentIndex + 1}/${grammarExerciseSession.questions.length}`}>
            <Text style={styles.questionMeta}>{getGrammarMainMenu(currentGrammarExercise.lesson)}</Text>
            <View style={styles.pathProgressTrack}>
              <View
                style={[
                  styles.pathProgressFill,
                  {
                    width: `${Math.round(
                      ((grammarExerciseSession.currentIndex + (grammarExerciseSession.selected ? 1 : 0)) /
                        grammarExerciseSession.questions.length) *
                        100
                    )}%`,
                  },
                ]}
              />
            </View>
            <View style={styles.arcadeHud}>
              <Text style={styles.quizScorePill}>{grammarExerciseSession.score} pts</Text>
              <Text style={styles.quizScorePill}>
                Série {grammarExerciseSession.streak} · x{getGrammarStreakMultiplier(grammarExerciseSession.streak)}
              </Text>
              <Text style={styles.quizScorePill}>
                {'♥'.repeat(grammarExerciseSession.lives)}{'♡'.repeat(Math.max(0, 3 - grammarExerciseSession.lives))}
              </Text>
            </View>
            <Text style={styles.questionTitle}>{currentGrammarExercise.prompt}</Text>
            {!!currentGrammarExercise.japanese && (
              <>
                <JapaneseLookupText
                  text={
                    grammarExerciseKanaOnly
                      ? currentGrammarExercise.kanaJapanese ?? currentGrammarExercise.japanese
                      : currentGrammarExercise.japanese
                  }
                  entries={vocabularyLookupEntries}
                  onSelect={(entry) => {
                    setSelectedWordLookup(entry);
                    setSelectedWordLookupAnchorId('grammar-exercise');
                  }}
                  style={styles.japanese}
                />
                {selectedWordLookupAnchorId === 'grammar-exercise' && (
                  <WordLookupPanel
                    entry={selectedWordLookup}
                    onClose={() => {
                      setSelectedWordLookup(null);
                      setSelectedWordLookupAnchorId(null);
                    }}
                  />
                )}
                {!!currentGrammarExercise.kanaJapanese &&
                  currentGrammarExercise.kanaJapanese !== currentGrammarExercise.japanese && (
                    <Pressable
                      onPress={() => setGrammarExerciseKanaOnly((value) => !value)}
                      style={styles.grammarExampleActionButton}
                    >
                      <Text style={styles.grammarExampleActionText}>
                        {grammarExerciseKanaOnly ? 'Voir phrase naturelle' : 'Voir en hiragana'}
                      </Text>
                    </Pressable>
                  )}
              </>
            )}
            <View style={styles.grammarExampleActions}>
              {!!safeGrammarExerciseRomaji && (
                <Pressable
                  onPress={() => setGrammarExerciseRomajiVisible((visible) => !visible)}
                  style={styles.grammarExampleActionButton}
                >
                  <Text style={styles.grammarExampleActionText}>
                    {grammarExerciseRomajiVisible ? 'Masquer romaji' : 'Voir romaji'}
                  </Text>
                </Pressable>
              )}
              {!!safeGrammarExerciseFrench && (
                <Pressable
                  onPress={() => setGrammarExerciseFrenchVisible((visible) => !visible)}
                  style={[styles.grammarExampleActionButton, styles.grammarExampleTranslateButton]}
                >
                  <Text style={[styles.grammarExampleActionText, styles.grammarExampleTranslateText]}>
                    {grammarExerciseFrenchVisible ? 'Masquer français' : 'Voir français'}
                  </Text>
                </Pressable>
              )}
            </View>
            {grammarExerciseRomajiVisible && !!safeGrammarExerciseRomaji && (
              <Text style={styles.grammarExampleRomaji}>{safeGrammarExerciseRomaji}</Text>
            )}
            {grammarExerciseFrenchVisible && !!safeGrammarExerciseFrench && (
              <View style={styles.grammarTranslationBox}>
                <Text style={styles.grammarTranslation}>{safeGrammarExerciseFrench}</Text>
              </View>
            )}
            <Text style={styles.feedbackMnemonic}>{getGrammarExerciseInstruction(currentGrammarExercise.kind)}</Text>
            <Text style={styles.feedbackText}>{currentGrammarExercise.helper}</Text>
            {currentGrammarExercise.choices.length > 0 ? (
              <View style={styles.choiceList}>
                {currentGrammarExercise.choices.map((choice) => {
                  const isCorrect = isGrammarAnswerCorrect(choice, currentGrammarExercise.correctAnswer);
                  const isSelected = grammarExerciseSession.selected === choice;
                  return (
                    <Pressable
                      key={choice}
                      disabled={grammarExerciseSession.selected !== null}
                      style={[
                        styles.choice,
                        grammarExerciseSession.selected && isCorrect && styles.choiceCorrect,
                        grammarExerciseSession.selected && isSelected && !isCorrect && styles.choiceWrong,
                      ]}
                      onPress={() => answerGrammarExercise(choice)}
                    >
                      <Text style={styles.choiceText}>{choice}</Text>
                      {grammarExerciseSession.selected && isCorrect && <Text style={styles.choiceIcon}>✓</Text>}
                      {grammarExerciseSession.selected && isSelected && !isCorrect && <Text style={styles.choiceIcon}>×</Text>}
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View style={styles.directAnswerBox}>
                <TextInput
                  value={grammarExerciseInput}
                  onChangeText={setGrammarExerciseInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Tape la réponse"
                  style={styles.directAnswerInput}
                />
                <Pressable
                  disabled={grammarExerciseInput.trim().length === 0 || grammarExerciseSession.selected !== null}
                  style={[
                    styles.primaryButton,
                    (grammarExerciseInput.trim().length === 0 || grammarExerciseSession.selected !== null) &&
                      styles.primaryButtonDisabled,
                  ]}
                  onPress={() => answerGrammarExercise(grammarExerciseInput)}
                >
                  <Text style={styles.primaryButtonText}>Valider</Text>
                </Pressable>
              </View>
            )}
            {grammarExerciseSession.selected !== null && (
              <View style={styles.feedback}>
                <Text style={styles.feedbackTitle}>
                  {isGrammarAnswerCorrect(grammarExerciseSession.selected, currentGrammarExercise.correctAnswer)
                    ? 'Correct'
                    : 'À revoir'}
                </Text>
                <Text style={styles.feedbackText}>Réponse : {currentGrammarExercise.correctAnswer}</Text>
                {buildGrammarCorrectionDetails(currentGrammarExercise).map((detail) => (
                  <View key={`${currentGrammarExercise.id}-${detail.title}`} style={styles.grammarCourseBlock}>
                    <Text style={styles.grammarCourseTitle}>{detail.title}</Text>
                    <Text style={styles.grammarCourseText}>{detail.text}</Text>
                  </View>
                ))}
                <Pressable style={styles.primaryButton} onPress={advanceGrammarExercise}>
                  <Text style={styles.primaryButtonText}>
                    {grammarExerciseSession.currentIndex + 1 >= grammarExerciseSession.questions.length
                      ? 'Voir le résultat'
                      : 'Question suivante'}
                  </Text>
                </Pressable>
              </View>
            )}
            <Pressable style={styles.secondaryFullButton} onPress={quitGrammarExercises}>
              <Text style={styles.secondaryFullButtonText}>Quitter</Text>
            </Pressable>
          </Section>
        ) : (
          <EmptyState title="Aucun exercice de grammaire" />
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.grammarHero}>
        <View style={styles.grammarHeroText}>
          <Text style={styles.grammarKicker}>文法 N5</Text>
          <Text style={styles.grammarTitle}>Leçons de grammaire</Text>
          <Text style={styles.grammarSubtitle}>
            Choisis un grand menu, puis un sous-menu, puis une leçon complète avec exemples et traduction au toucher.
          </Text>
        </View>
        <View style={styles.grammarHeroBadge}>
          <Text style={styles.grammarHeroBadgeValue}>{ALL_GRAMMAR_LESSONS.length}</Text>
          <Text style={styles.grammarHeroBadgeText}>leçons</Text>
        </View>
      </View>

      <View style={styles.segmented}>
        <SegmentButton label="Leçons" active onPress={() => setGrammarMode('learn')} />
        <SegmentButton label="Exercices" active={false} onPress={() => setGrammarMode('exercise')} />
      </View>

      <View style={styles.grammarStatsRow}>
        <Metric label="Ouvertes" value={`${grammarProgress.opened}/${grammarProgress.total}`} />
        <Metric label="Comprises" value={grammarProgress.completed} />
        <Metric label="Réussite" value={`${grammarProgress.exerciseRate}%`} />
      </View>

      <View style={styles.grammarMemoryCard}>
        <Text style={styles.grammarMemoryTitle}>Base mémoire connectée</Text>
        <Text style={styles.grammarMemoryText}>
          {memoryGrammarCount} entrées de grammaire N5 disponibles dans SQLite. Les leçons ci-dessous sont regroupées,
          clarifiées et classées en menus pédagogiques pour apprendre sans surcharge.
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.grammarFolderTabs}>
        {folders.map((folder) => (
          <Pressable
            key={folder}
            onPress={() => selectFolder(folder)}
            style={[styles.grammarFolderButton, selectedFolder === folder && styles.grammarFolderButtonActive]}
          >
            <Text style={[styles.grammarFolderText, selectedFolder === folder && styles.grammarFolderTextActive]}>
              {folder}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Section title="Menu et sous-menu">
        <View style={styles.grammarSubfolderList}>
          <Pressable
            onPress={() => selectSubfolder(null)}
            style={[styles.grammarSubfolderPill, selectedSubfolder === null && styles.grammarSubfolderPillActive]}
          >
            <Text style={[styles.grammarSubfolderText, selectedSubfolder === null && styles.grammarSubfolderTextActive]}>
              Tout le dossier
            </Text>
            <Text style={[styles.grammarSubfolderCount, selectedSubfolder === null && styles.grammarSubfolderTextActive]}>
              {folderLessons.length}
            </Text>
          </Pressable>
          {subfolders.map((subfolder) => {
            const count = folderLessons.filter((lesson) => lesson.subfolder === subfolder).length;
            return (
              <Pressable
                key={subfolder}
                onPress={() => selectSubfolder(subfolder)}
                style={[styles.grammarSubfolderPill, selectedSubfolder === subfolder && styles.grammarSubfolderPillActive]}
              >
                <Text style={[styles.grammarSubfolderText, selectedSubfolder === subfolder && styles.grammarSubfolderTextActive]}>
                  {subfolder}
                </Text>
                <Text style={[styles.grammarSubfolderCount, selectedSubfolder === subfolder && styles.grammarSubfolderTextActive]}>
                  {count}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.grammarLessonList}>
          {currentFolderLessons.map((lesson) => (
            <Pressable
              key={lesson.id}
              onPress={() => selectLesson(lesson)}
              style={[styles.grammarLessonRow, selectedLesson?.id === lesson.id && styles.grammarLessonRowActive]}
            >
              <Text style={styles.grammarLessonNumber}>{lesson.order}</Text>
              <View style={styles.grammarLessonRowBody}>
                <Text style={styles.grammarLessonTitle}>{lesson.title}</Text>
                <Text style={styles.grammarLessonPattern}>{humanizeGrammarPattern(lesson)}</Text>
              </View>
              <Text style={[styles.grammarLevelPill, getGrammarLevelStyle(lesson.level)]}>
                {formatGrammarLevel(lesson.level)}
              </Text>
            </Pressable>
          ))}
        </View>
      </Section>

    </ScrollView>
  );
}

function VocabularyScreen() {
  const db = useSQLiteContext();
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [kanjiItems, setKanjiItems] = useState<KanjiItem[]>([]);
  const [query, setQuery] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [n5Count, setN5Count] = useState(0);
  const [scope, setScope] = useState<VocabularyScope>('n5');
  const [viewMode, setViewMode] = useState<VocabularyViewMode>('cards');
  const [flippedIds, setFlippedIds] = useState<Set<string>>(new Set());
  const [selectedVocabularyTheme, setSelectedVocabularyTheme] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([loadVocabularyItems(db), loadKanjiItems(db)])
      .then(([{ rows, total, n5 }, kanjiRows]) => {
        if (!mounted) return;
        setTotalCount(total);
        setN5Count(n5);
        setItems(rows.map((row) => ({ ...row, category: getVocabularyCategory(row) })));
        setKanjiItems(kanjiRows);
      })
      .catch((error) => {
        console.error('Unable to load vocabulary', error);
        if (mounted) {
          setTotalCount(0);
          setItems([]);
          setKanjiItems([]);
        }
      });
    return () => {
      mounted = false;
    };
  }, [db]);

  const scopedItems = useMemo(() => {
    if (scope === 'all') return items;
    return items.filter((item) => (item.jlpt_level ?? 'N5').toUpperCase() === 'N5');
  }, [items, scope]);

  const vocabularyThemeGroups = useMemo(() => {
    const groups = new Map<string, VocabularyItem[]>();
    items.forEach((item) => {
      const theme = getVocabularyThemeLabel(item);
      const group = groups.get(theme) ?? [];
      group.push(item);
      groups.set(theme, group);
    });
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0], 'fr'));
  }, [items]);

  useEffect(() => {
    if (scope !== 'all') return;
    if (selectedVocabularyTheme && vocabularyThemeGroups.some(([theme]) => theme === selectedVocabularyTheme)) return;
    setSelectedVocabularyTheme(vocabularyThemeGroups[0]?.[0] ?? null);
  }, [scope, selectedVocabularyTheme, vocabularyThemeGroups]);

  const genericThemeItems = useMemo(() => {
    if (scope !== 'all' || !selectedVocabularyTheme) return scopedItems;
    return scopedItems.filter((item) => getVocabularyThemeLabel(item) === selectedVocabularyTheme);
  }, [scope, scopedItems, selectedVocabularyTheme]);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const baseItems = scope === 'all' ? genericThemeItems : scopedItems;
    if (!normalized) return baseItems;
    return baseItems.filter((item) =>
      `${item.japanese} ${item.kana ?? ''} ${item.kanji ?? ''} ${item.romaji ?? ''} ${item.meaning_fr}`
        .toLowerCase()
        .includes(normalized)
    );
  }, [genericThemeItems, scopedItems, query, scope]);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, VocabularyItem[]>();
    filteredItems.forEach((item) => {
      const group = groups.get(item.category) ?? [];
      group.push(item);
      groups.set(item.category, group);
    });
    return Array.from(groups.entries());
  }, [filteredItems]);

  const scopedKanjiItems = useMemo(() => {
    if (scope === 'all') return kanjiItems;
    return kanjiItems.filter((item) => item.jlpt_level.toUpperCase() === 'N5');
  }, [kanjiItems, scope]);

  const deckItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const cards = buildVocabularyCards(scopedItems, scopedKanjiItems).filter((card) => !!card.kanji);
    const filteredCards = normalized
      ? cards.filter((card) => getVocabularyCardSearchText(card).includes(normalized))
      : cards;
    return filteredCards.slice(0, 80);
  }, [query, scopedItems, scopedKanjiItems]);

  const genericDeckItems = useMemo(() => filteredItems.slice(0, 160), [filteredItems]);

  const toggleVocabularyCard = (id: string) => {
    setFlippedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.grammarHero}>
        <View style={styles.grammarHeroText}>
          <Text style={styles.grammarKicker}>語彙 N5</Text>
          <Text style={styles.grammarTitle}>Vocabulaire</Text>
          <Text style={styles.grammarSubtitle}>
            Cartes de mémorisation, kanji, kana, romaji et français. Clique sur une carte pour la retourner.
          </Text>
        </View>
        <View style={styles.grammarHeroBadge}>
          <Text style={styles.grammarHeroBadgeValue}>{scope === 'n5' ? n5Count : totalCount}</Text>
          <Text style={styles.grammarHeroBadgeText}>mots</Text>
        </View>
      </View>

      <View style={styles.segmented}>
        <SegmentButton label="JLPT N5" active={scope === 'n5'} onPress={() => setScope('n5')} />
        <SegmentButton label="Tout vocabulaire" active={scope === 'all'} onPress={() => setScope('all')} />
      </View>

      <View style={styles.segmented}>
        <SegmentButton label="Flashcards" active={viewMode === 'cards'} onPress={() => setViewMode('cards')} />
        <SegmentButton label="Liste" active={viewMode === 'list'} onPress={() => setViewMode('list')} />
      </View>

      <View style={styles.grammarStatsRow}>
        <Metric label="En base" value={totalCount} />
        <Metric label="N5" value={n5Count} />
        <Metric label="Kanji" value={scopedKanjiItems.length} />
        <Metric label="Affichés" value={filteredItems.length} />
      </View>

      {scope === 'all' && (
        <Section title="Dossiers par thème">
          <View style={styles.vocabularyThemeGrid}>
            {vocabularyThemeGroups.map(([theme, words]) => (
              <Pressable
                key={theme}
                onPress={() => setSelectedVocabularyTheme(theme)}
                style={[
                  styles.vocabularyThemeCard,
                  selectedVocabularyTheme === theme && styles.vocabularyThemeCardActive,
                ]}
              >
                <GenericVocabularyIllustration
                  item={words[0]}
                  size={54}
                  muted={selectedVocabularyTheme !== theme}
                />
                <View style={styles.vocabularyThemeTextBlock}>
                  <Text
                    numberOfLines={2}
                    style={[
                      styles.vocabularyThemeTitle,
                      selectedVocabularyTheme === theme && styles.vocabularyThemeTitleActive,
                    ]}
                  >
                    {theme}
                  </Text>
                  <Text
                    style={[
                      styles.vocabularyThemeCount,
                      selectedVocabularyTheme === theme && styles.vocabularyThemeCountActive,
                    ]}
                  >
                    {words.length} cartes
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </Section>
      )}

      <Section title={scope === 'n5' ? 'Recherche vocabulaire N5' : `Recherche · ${selectedVocabularyTheme ?? 'Tout vocabulaire'}`}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Rechercher japonais, kana, romaji ou français"
          style={styles.vocabularySearchInput}
        />
      </Section>

      {groupedItems.length === 0 ? (
        <EmptyState title="Aucun mot trouvé" />
      ) : viewMode === 'cards' ? (
        <Section title={scope === 'n5' ? 'Flashcards JLPT N5' : `Flashcards · ${selectedVocabularyTheme ?? 'Tout vocabulaire'}`}>
          <Text style={styles.quizConfigText}>
            {scope === 'n5'
              ? 'Format carte physique : recto pour reconnaître le kanji, verso pour vérifier les lectures et les mots liés.'
              : 'Chaque carte montre le mot au recto. Au verso, le dessin représente le mot, avec lecture et traduction.'}
          </Text>
          <View style={styles.vocabularyDeckGrid}>
            {scope === 'n5'
              ? deckItems.map((item, index) => (
                  <VocabularyFlashCard
                    key={item.id}
                    card={item}
                    index={index}
                    flipped={flippedIds.has(item.id)}
                    onPress={() => toggleVocabularyCard(item.id)}
                  />
                ))
              : genericDeckItems.map((item, index) => (
                  <GenericVocabularyFlashCard
                    key={item.id}
                    item={item}
                    index={index}
                    flipped={flippedIds.has(item.id)}
                    onPress={() => toggleVocabularyCard(item.id)}
                  />
                ))}
          </View>
        </Section>
      ) : (
        groupedItems.map(([category, words]) => (
          <Section key={category} title={category}>
            <View style={styles.grammarLessonList}>
              {words.slice(0, 40).map((item) => (
                <View key={item.id} style={styles.grammarLessonRow}>
                  <Text style={styles.grammarLessonNumber}>語</Text>
                  <View style={styles.grammarLessonRowBody}>
                    <Text style={styles.grammarLessonTitle}>{item.kanji || item.japanese}</Text>
                    <Text style={styles.grammarLessonPattern}>
                      {[item.kana, item.romaji].filter(Boolean).join(' · ')}
                    </Text>
                    <Text style={styles.quizConfigText}>{item.meaning_fr}</Text>
                  </View>
                </View>
              ))}
            </View>
          </Section>
        ))
      )}
    </ScrollView>
  );
}

function VocabularyFlashCard({
  card,
  index,
  flipped,
  onPress,
}: {
  card: VocabularyCardData;
  index: number;
  flipped: boolean;
  onPress: () => void;
}) {
  const mainText = card.root;
  const primary = card.primary;
  const kanaText = card.kanaReadings.slice(0, 3).join(' / ') || primary.kana || primary.japanese;
  const romajiText = card.kanji?.n5_readings || card.readings.slice(0, 4).join(' / ') || primary.romaji?.trim() || 'lecture';
  const meaningText = card.meanings.slice(0, 4).join(', ') || primary.meaning_fr?.trim() || 'sens à compléter';
  const levelText = (primary.jlpt_level ?? 'N5').toUpperCase();
  const relatedEntries = card.entries.slice(0, 5);
  const strokeText = card.kanji?.stroke_count ? `${card.kanji.stroke_count} traits` : `${card.entries.length} mot${card.entries.length > 1 ? 's' : ''}`;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.vocabularyFlashCard, flipped && styles.vocabularyFlashCardBack]}
    >
      {!flipped ? (
        <>
          <View style={styles.vocabCardTopRow}>
            <Text style={styles.vocabCardCorner}>{mainText}</Text>
            <Text style={styles.vocabCardStroke}>{strokeText}</Text>
            <Text style={styles.vocabCardCorner}>{levelText}</Text>
          </View>
          <View style={styles.vocabCardCenter}>
            <Text adjustsFontSizeToFit numberOfLines={1} style={styles.vocabCardMain}>
              {mainText}
            </Text>
            <Text numberOfLines={2} style={styles.vocabCardFrontMeaning}>
              {card.meanings[0] ?? primary.meaning_fr}
            </Text>
          </View>
          <View style={styles.vocabCardBottomRow}>
            <Text numberOfLines={2} style={styles.vocabCardSmall}>
              {kanaText}
            </Text>
            <Text numberOfLines={2} style={styles.vocabCardSmallRight}>
              {index + 1}
            </Text>
          </View>
        </>
      ) : (
        <>
          <View style={styles.vocabCardTopRow}>
            <Text numberOfLines={1} style={styles.vocabCardCorner}>
              {mainText}
            </Text>
            <Text style={styles.vocabCardStroke}>{strokeText}</Text>
            <Text style={styles.vocabCardCorner}>語</Text>
          </View>
          <View style={styles.vocabCardCenter}>
            <Text adjustsFontSizeToFit numberOfLines={2} style={styles.vocabCardReading}>
              {romajiText}
            </Text>
            <Text adjustsFontSizeToFit numberOfLines={3} style={styles.vocabCardMeaning}>
              {meaningText}
            </Text>
            {!!card.kanji && (
              <View style={styles.vocabKanjiReadingBox}>
                <Text numberOfLines={2} style={styles.vocabKanjiReadingText}>ON : {card.kanji.onyomi || '—'}</Text>
                <Text numberOfLines={2} style={styles.vocabKanjiReadingText}>KUN : {card.kanji.kunyomi || '—'}</Text>
              </View>
            )}
            <View style={styles.vocabRelatedList}>
              {relatedEntries.map((entry) => (
                <Text key={entry.id} numberOfLines={1} style={styles.vocabRelatedItem}>
                  {getVocabularyMainText(entry)} {entry.kana ? `(${entry.kana})` : ''} : {entry.meaning_fr}
                </Text>
              ))}
            </View>
          </View>
          <View style={styles.vocabCardBottomRow}>
            <Text numberOfLines={2} style={styles.vocabCardSmall}>
              {kanaText}
            </Text>
            <Text numberOfLines={2} style={styles.vocabCardSmallRight}>
              {primary.category}
            </Text>
          </View>
        </>
      )}
    </Pressable>
  );
}

function GenericVocabularyFlashCard({
  item,
  index,
  flipped,
  onPress,
}: {
  item: VocabularyItem;
  index: number;
  flipped: boolean;
  onPress: () => void;
}) {
  const mainText = getVocabularyMainText(item);
  const reading = [item.kana, item.romaji].filter(Boolean).join(' · ') || 'lecture à compléter';
  const theme = getVocabularyThemeLabel(item);

  return (
    <Pressable
      onPress={onPress}
      style={[styles.genericVocabCard, flipped && styles.genericVocabCardBack]}
    >
      {!flipped ? (
        <>
          <View style={styles.genericVocabTopRow}>
            <Text style={styles.genericVocabPill}>語 {index + 1}</Text>
            <Text numberOfLines={1} style={styles.genericVocabTheme}>{theme}</Text>
          </View>
          <View style={styles.genericVocabFrontCenter}>
            <Text adjustsFontSizeToFit numberOfLines={1} style={styles.genericVocabMain}>
              {mainText}
            </Text>
            {!!item.kana && item.kana !== mainText && (
              <Text numberOfLines={1} style={styles.genericVocabKana}>{item.kana}</Text>
            )}
          </View>
          <Text numberOfLines={1} style={styles.genericVocabHint}>toucher pour révéler</Text>
        </>
      ) : (
        <>
          <View style={styles.genericVocabIllustrationLayer}>
            <GenericVocabularyIllustration item={item} size={178} />
          </View>
          <View style={styles.genericVocabBackOverlay} />
          <View style={styles.genericVocabTopRow}>
            <Text style={styles.genericVocabPillDark}>{mainText}</Text>
            <Text numberOfLines={1} style={styles.genericVocabThemeDark}>{theme}</Text>
          </View>
          <View style={styles.genericVocabBackCenter}>
            <Text numberOfLines={2} adjustsFontSizeToFit style={styles.genericVocabMeaning}>
              {item.meaning_fr}
            </Text>
            <Text numberOfLines={2} style={styles.genericVocabReading}>{reading}</Text>
          </View>
          <Text numberOfLines={1} style={styles.genericVocabHintDark}>
            {item.part_of_speech || 'vocabulaire'}
          </Text>
        </>
      )}
    </Pressable>
  );
}

function GenericVocabularyIllustration({
  item,
  size,
  muted = false,
}: {
  item: VocabularyItem;
  size: number;
  muted?: boolean;
}) {
  const visual = getVocabularyVisual(item);
  const opacity = muted ? 0.52 : 1;
  const symbolSize = size * 0.32;
  return (
    <View style={{ height: size, width: size, opacity }}>
      <Svg width={size} height={size} viewBox="0 0 120 120">
        <Defs>
          <LinearGradient id={`vocabGrad-${visual.kind}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={visual.colors[0]} stopOpacity="1" />
            <Stop offset="1" stopColor={visual.colors[1]} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect x="4" y="4" width="112" height="112" rx="22" fill={`url(#vocabGrad-${visual.kind})`} />
        <Circle cx="92" cy="22" r="18" fill="#FFFFFF" opacity="0.25" />
        <Circle cx="26" cy="92" r="20" fill="#FFFFFF" opacity="0.18" />
        {renderVocabularyVisualShape(visual.kind)}
        <SvgText
          x="60"
          y="72"
          fill="#FFFFFF"
          fontSize={symbolSize}
          fontWeight="900"
          textAnchor="middle"
          opacity="0.95"
        >
          {visual.symbol}
        </SvgText>
      </Svg>
    </View>
  );
}

function LearningPathScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const db = useSQLiteContext();
  const [loading, setLoading] = useState(true);
  const [stages, setStages] = useState<LearningPathStage[]>([]);
  const [summary, setSummary] = useState({
    readiness: 0,
    mastered: 0,
    total: 0,
    activeStage: 'Démarrage',
    todayAttempts: 0,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const grammarProgress = await loadGrammarProgressSummary(db);
      const kanaRows = await db.getAllAsync<MasteryDomainStats>(`
        SELECT
          k.script AS id,
          CASE WHEN k.script = 'hiragana' THEN 'Hiragana' ELSE 'Katakana' END AS label,
          COUNT(*) AS total,
          SUM(CASE WHEN COALESCE(s.mastered, 0) = 1 THEN 1 ELSE 0 END) AS mastered,
          SUM(CASE
            WHEN COALESCE(s.mastered, 0) = 0
             AND COALESCE(s.review, 0) = 0
             AND COALESCE(s.seen_count, 0) > 0 THEN 1 ELSE 0 END) AS known,
          SUM(CASE WHEN COALESCE(s.review, 0) = 1 THEN 1 ELSE 0 END) AS review,
          SUM(CASE WHEN COALESCE(s.seen_count, 0) = 0 THEN 1 ELSE 0 END) AS unseen,
          SUM(CASE WHEN COALESCE(s.seen_count, 0) > 0 THEN 1 ELSE 0 END) AS attempted,
          SUM(COALESCE(s.correct_count, 0)) AS correct,
          CASE
            WHEN SUM(COALESCE(s.seen_count, 0)) > 0
            THEN ROUND(SUM(COALESCE(s.correct_count, 0)) * 100.0 / SUM(COALESCE(s.seen_count, 0)))
            ELSE 0
          END AS rate
        FROM canonical_kana k
        LEFT JOIN app_kana_card_state s ON s.kana_id = k.id
        WHERE k.script IN ('hiragana', 'katakana')
          AND instr(k.character, '?') = 0
        GROUP BY k.script
      `);

      const combinedKana = await db.getFirstAsync<MasteryDomainStats>(`
        SELECT
          'combined' AS id,
          'Sons combinés' AS label,
          COUNT(*) AS total,
          SUM(CASE WHEN COALESCE(s.mastered, 0) = 1 THEN 1 ELSE 0 END) AS mastered,
          SUM(CASE
            WHEN COALESCE(s.mastered, 0) = 0
             AND COALESCE(s.review, 0) = 0
             AND COALESCE(s.seen_count, 0) > 0 THEN 1 ELSE 0 END) AS known,
          SUM(CASE WHEN COALESCE(s.review, 0) = 1 THEN 1 ELSE 0 END) AS review,
          SUM(CASE WHEN COALESCE(s.seen_count, 0) = 0 THEN 1 ELSE 0 END) AS unseen,
          SUM(CASE WHEN COALESCE(s.seen_count, 0) > 0 THEN 1 ELSE 0 END) AS attempted,
          SUM(COALESCE(s.correct_count, 0)) AS correct,
          CASE
            WHEN SUM(COALESCE(s.seen_count, 0)) > 0
            THEN ROUND(SUM(COALESCE(s.correct_count, 0)) * 100.0 / SUM(COALESCE(s.seen_count, 0)))
            ELSE 0
          END AS rate
        FROM canonical_kana k
        LEFT JOIN app_kana_card_state s ON s.kana_id = k.id
        WHERE instr(k.character, '?') = 0
          AND length(k.character) > 1
      `);

      const contentRows = await db.getAllAsync<MasteryDomainStats>(`
        WITH content AS (
          SELECT 'vocabulary' AS id, 'Vocabulaire' AS label, id AS item_id FROM canonical_vocabulary
          UNION ALL
          SELECT 'grammar' AS id, 'Grammaire' AS label, id AS item_id FROM canonical_grammar
          UNION ALL
          SELECT 'kanji' AS id, 'Kanji' AS label, id AS item_id FROM canonical_kanji
        ),
        item_attempts AS (
          SELECT
            q.item_type AS id,
            q.item_id,
            COUNT(a.id) AS attempts,
            SUM(a.is_correct) AS correct,
            ROUND(SUM(a.is_correct) * 100.0 / COUNT(a.id)) AS rate
          FROM app_question_attempt_local a
          INNER JOIN app_question_bank q ON q.question_id = a.question_id
          WHERE q.item_type IN ('vocabulary', 'grammar', 'kanji')
          GROUP BY q.item_type, q.item_id
        )
        SELECT
          c.id,
          c.label,
          COUNT(*) AS total,
          SUM(CASE WHEN COALESCE(i.attempts, 0) >= 2 AND COALESCE(i.rate, 0) >= 90 THEN 1 ELSE 0 END) AS mastered,
          SUM(CASE WHEN COALESCE(i.attempts, 0) >= 2 AND COALESCE(i.rate, 0) >= 70 AND COALESCE(i.rate, 0) < 90 THEN 1 ELSE 0 END) AS known,
          SUM(CASE WHEN COALESCE(i.attempts, 0) > 0 AND COALESCE(i.rate, 0) < 70 THEN 1 ELSE 0 END) AS review,
          SUM(CASE WHEN COALESCE(i.attempts, 0) = 0 THEN 1 ELSE 0 END) AS unseen,
          SUM(COALESCE(i.attempts, 0)) AS attempted,
          SUM(COALESCE(i.correct, 0)) AS correct,
          CASE
            WHEN SUM(COALESCE(i.attempts, 0)) > 0
            THEN ROUND(SUM(COALESCE(i.correct, 0)) * 100.0 / SUM(COALESCE(i.attempts, 0)))
            ELSE 0
          END AS rate
        FROM content c
        LEFT JOIN item_attempts i ON i.id = c.id AND i.item_id = c.item_id
        GROUP BY c.id, c.label
      `);

      const activity = await db.getFirstAsync<{
        attempts: number;
        todayAttempts: number;
        quizAttempts: number;
        examAttempts: number;
        bestScore: number | null;
      }>(`
        SELECT
          COUNT(*) AS attempts,
          SUM(CASE WHEN date(answered_at) = date('now') THEN 1 ELSE 0 END) AS todayAttempts,
          SUM(CASE WHEN source_mode IN ('kana_arcade', 'adaptive_quiz', 'grammar_quiz', 'grammar_lesson') THEN 1 ELSE 0 END) AS quizAttempts,
          SUM(CASE WHEN source_mode = 'exam_mode' THEN 1 ELSE 0 END) AS examAttempts,
          (SELECT MAX(score) FROM app_kana_arcade_score) AS bestScore
        FROM app_question_attempt_local
      `);

      const adjustedContentRows = contentRows.map((domain) =>
        domain.id === 'grammar' ? buildGrammarMasteryDomain(grammarProgress) : domain
      );
      const allDomains = [
        ...kanaRows,
        ...(combinedKana ? [combinedKana] : []),
        ...adjustedContentRows,
      ];
      const nextStages = buildLearningPathStages(allDomains, {
        attempts: activity?.attempts ?? 0,
        quizAttempts: activity?.quizAttempts ?? 0,
        examAttempts: activity?.examAttempts ?? 0,
        bestScore: activity?.bestScore ?? 0,
      });
      const active = nextStages.find((stage) => stage.status === 'active') ?? nextStages[nextStages.length - 1];
      const mastered = allDomains.reduce((total, domain) => total + domain.mastered, 0);
      const total = allDomains.reduce((sum, domain) => sum + domain.total, 0);
      const routeProgress =
        nextStages.length > 0
          ? Math.round(
              (nextStages.reduce((sum, stage) => sum + stage.progress, 0) / (nextStages.length * 100)) * 100
            )
          : 0;

      setStages(nextStages);
      setSummary({
        readiness: routeProgress,
        mastered,
        total,
        activeStage: active?.title ?? 'Parcours JLPT',
        todayAttempts: activity?.todayAttempts ?? 0,
      });
    } catch (error) {
      console.error('Unable to load learning path', error);
      setStages([]);
      setSummary({ readiness: 0, mastered: 0, total: 0, activeStage: 'Démarrage', todayAttempts: 0 });
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <LoadingView />;
  }

  const activeStage = stages.find((stage) => stage.status === 'active') ?? stages.find((stage) => stage.status !== 'locked');
  const doneCount = stages.filter((stage) => stage.status === 'done').length;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.pathHero}>
        <View style={styles.pathHeroInk}>
          <Text style={styles.pathHeroKicker}>Parcours guidé</Text>
          <Text style={styles.pathHeroTitle}>Route JLPT N5</Text>
          <Text style={styles.pathHeroSubtitle}>
            Une progression par étapes, avec priorité donnée à ce qui débloque le plus vite la réussite.
          </Text>
        </View>
        <View style={styles.pathHeroBadge}>
          <Text style={styles.pathHeroBadgeValue}>{summary.readiness}%</Text>
          <Text style={styles.pathHeroBadgeText}>route</Text>
        </View>
      </View>

      <View style={styles.pathSummaryGrid}>
        <Metric label="Étapes finies" value={`${doneCount}/${stages.length}`} />
        <Metric label="Maîtrisés" value={`${summary.mastered}/${summary.total}`} />
        <Metric label="Aujourd'hui" value={summary.todayAttempts} />
      </View>

      {activeStage && (
        <View style={styles.pathNextCard}>
          <Text style={styles.pathNextLabel}>Prochaine mission</Text>
          <Text style={styles.pathNextTitle}>{activeStage.title}</Text>
          <Text style={styles.pathNextText}>{activeStage.subtitle}</Text>
          <View style={styles.pathProgressTrack}>
            <View style={[styles.pathProgressFill, { width: `${activeStage.progress}%` }]} />
          </View>
          <View style={styles.pathNextFooter}>
            <Text style={styles.pathReward}>{activeStage.reward}</Text>
            <Pressable style={styles.pathActionButton} onPress={() => onNavigate(activeStage.screen)}>
              <Text style={styles.pathActionText}>{activeStage.actionLabel}</Text>
            </Pressable>
          </View>
        </View>
      )}

      <Section title="Carte de progression">
        <View style={styles.pathTimeline}>
          {stages.map((stage, index) => (
            <Pressable
              key={stage.id}
              style={[
                styles.pathStageCard,
                stage.status === 'done' && styles.pathStageDone,
                stage.status === 'active' && styles.pathStageActive,
                stage.status === 'locked' && styles.pathStageLocked,
              ]}
              onPress={() => {
                if (stage.status !== 'locked') onNavigate(stage.screen);
              }}
            >
              <View style={styles.pathStageRail}>
                <View
                  style={[
                    styles.pathStageDot,
                    stage.status === 'done' && styles.pathStageDotDone,
                    stage.status === 'active' && styles.pathStageDotActive,
                  ]}
                >
                  <Text style={styles.pathStageDotText}>{stage.status === 'done' ? '✓' : index + 1}</Text>
                </View>
                {index < stages.length - 1 && <View style={styles.pathStageLine} />}
              </View>
              <View style={styles.pathStageBody}>
                <View style={styles.pathStageTopRow}>
                  <Text style={styles.pathStageTitle}>{stage.title}</Text>
                  <Text style={[styles.pathStageStatus, getPathStatusStyle(stage.status)]}>
                    {formatPathStatus(stage.status)}
                  </Text>
                </View>
                <Text style={styles.pathStageSubtitle}>{stage.subtitle}</Text>
                <View style={styles.pathStageMetaRow}>
                  <Text style={styles.pathStageFocus}>{stage.focus}</Text>
                  <Text style={styles.pathStageCount}>{stage.done}/{stage.total}</Text>
                </View>
                <View style={styles.pathProgressTrack}>
                  <View style={[styles.pathProgressFill, { width: `${stage.progress}%` }]} />
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </Section>
    </ScrollView>
  );
}

function DashboardScreen() {
  const db = useSQLiteContext();
  const [loading, setLoading] = useState(true);
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('quiz');
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [weakSkills, setWeakSkills] = useState<SkillProgress[]>([]);
  const [masteredSkills, setMasteredSkills] = useState<SkillProgress[]>([]);
  const [dailyProgress, setDailyProgress] = useState<DailyProgress[]>([]);
  const [quizSummary, setQuizSummary] = useState<QuizDashboardSummary>({
    attempts: 0,
    correct: 0,
    rate: 0,
    todayAttempts: 0,
    kanaArcadeAttempts: 0,
    adaptiveAttempts: 0,
    examAttempts: 0,
    bestScore: 0,
    bestScoreTime: 0,
    bestStreak: 0,
    averageScore: 0,
    averageTime: 0,
  });
  const [quizDailyProgress, setQuizDailyProgress] = useState<DailyProgress[]>([]);
  const [quizModeProgress, setQuizModeProgress] = useState<QuizModeProgress[]>([]);
  const [quizScoreTrend, setQuizScoreTrend] = useState<QuizScoreTrend[]>([]);
  const [quizWeakSkills, setQuizWeakSkills] = useState<SkillProgress[]>([]);
  const [masteryDomains, setMasteryDomains] = useState<MasteryDomainStats[]>([]);
  const [grammarLessonSummary, setGrammarLessonSummary] = useState<GrammarProgressSummary>(emptyGrammarProgressSummary);
  const [todayGoalMetrics, setTodayGoalMetrics] = useState<DailyGoalMetrics>({
    day: formatDateKey(new Date()),
    attempts: 0,
    correct: 0,
    rate: 0,
    quizAttempts: 0,
    grammarActivities: 0,
  });
  const [weeklyGoalMetrics, setWeeklyGoalMetrics] = useState<DailyGoalMetrics>({
    day: formatDateKey(getWeekStart()),
    attempts: 0,
    correct: 0,
    rate: 0,
    quizAttempts: 0,
    grammarActivities: 0,
  });
  const [monthlyGoalMetrics, setMonthlyGoalMetrics] = useState<DailyGoalMetrics>({
    day: formatDateKey(getMonthStart()),
    attempts: 0,
    correct: 0,
    rate: 0,
    quizAttempts: 0,
    grammarActivities: 0,
  });
  const [yearlyGoalMetrics, setYearlyGoalMetrics] = useState<DailyGoalMetrics>({
    day: formatDateKey(addDays(new Date(), -(CALENDAR_HISTORY_DAYS - 1))),
    attempts: 0,
    correct: 0,
    rate: 0,
    quizAttempts: 0,
    grammarActivities: 0,
    activeDays: 0,
  });
  const [goalCalendar, setGoalCalendar] = useState<DailyGoalDay[]>([]);
  const [rewardSummary, setRewardSummary] = useState<RewardSummary>({ xp: 0, badges: 0 });
  const [earnedBadgeCodes, setEarnedBadgeCodes] = useState<string[]>([]);
  const [rewardToast, setRewardToast] = useState<RewardToast | null>(null);
  const rewardAnim = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await ensureDailyGoalPlan(db);
      const grammarProgress = await loadGrammarProgressSummary(db);
      setGrammarLessonSummary(grammarProgress);
      const base = await db.getFirstAsync<{
      questions: number;
      vocabulary: number;
      grammar: number;
      kanji: number;
      kana: number;
      audio: number;
    }>(`
      SELECT
        (SELECT COUNT(*) FROM app_question_bank) AS questions,
        (SELECT COUNT(*) FROM canonical_vocabulary) AS vocabulary,
        (SELECT COUNT(*) FROM canonical_grammar) AS grammar,
        (SELECT COUNT(*) FROM canonical_kanji) AS kanji,
        (SELECT COUNT(*) FROM canonical_kana) AS kana,
        (SELECT COUNT(*) FROM app_audio_asset) AS audio
    `);

    const attempts = await db.getFirstAsync<{
      attempts: number;
      todayAttempts: number;
      correct: number | null;
      todayCorrect: number | null;
    }>(`
      SELECT
        COUNT(*) AS attempts,
        SUM(CASE WHEN date(answered_at) = date('now') THEN 1 ELSE 0 END) AS todayAttempts,
        SUM(CASE WHEN date(answered_at) = date('now') THEN is_correct ELSE 0 END) AS todayCorrect,
        SUM(is_correct) AS correct
      FROM app_question_attempt_local
    `);

    const total = attempts?.attempts ?? 0;
    const correct = attempts?.correct ?? 0;
    const todayAttempts = attempts?.todayAttempts ?? 0;
    const todayCorrect = attempts?.todayCorrect ?? 0;
    setStats({
      questions: base?.questions ?? 0,
      vocabulary: base?.vocabulary ?? 0,
      grammar: grammarProgress.total,
      kanji: base?.kanji ?? 0,
      kana: base?.kana ?? 0,
      audio: base?.audio ?? 0,
      attempts: total,
      todayAttempts,
      todayCorrect,
      correctRate: total > 0 ? Math.round((correct / total) * 100) : 0,
    });

    const skills = await db.getAllAsync<SkillProgress>(`
      SELECT skill_id,
             COUNT(*) AS attempts,
             SUM(is_correct) AS correct,
             ROUND(SUM(is_correct) * 100.0 / COUNT(*)) AS rate
      FROM app_question_attempt_local
      GROUP BY skill_id
      HAVING attempts >= 2
      ORDER BY rate ASC, attempts DESC
      LIMIT 5
    `);
    setWeakSkills(skills);

    const mastered = await db.getAllAsync<SkillProgress>(`
      SELECT skill_id,
             COUNT(*) AS attempts,
             SUM(is_correct) AS correct,
             ROUND(SUM(is_correct) * 100.0 / COUNT(*)) AS rate
      FROM app_question_attempt_local
      GROUP BY skill_id
      HAVING attempts >= 2
      ORDER BY rate DESC, attempts DESC
      LIMIT 5
    `);
    setMasteredSkills(mastered);

    const days = await db.getAllAsync<DailyProgress>(`
      SELECT date(answered_at) AS day,
             COUNT(*) AS attempts,
             SUM(is_correct) AS correct,
             ROUND(SUM(is_correct) * 100.0 / COUNT(*)) AS rate
      FROM app_question_attempt_local
      GROUP BY date(answered_at)
      ORDER BY day DESC
      LIMIT 14
    `);
    setDailyProgress(days.reverse());

    const quizAttempts = await db.getFirstAsync<{
      attempts: number;
      todayAttempts: number;
      correct: number | null;
      kanaArcadeAttempts: number;
      adaptiveAttempts: number;
      examAttempts: number;
    }>(`
      SELECT
        COUNT(*) AS attempts,
        SUM(CASE WHEN date(answered_at) = date('now') THEN 1 ELSE 0 END) AS todayAttempts,
        SUM(is_correct) AS correct,
        SUM(CASE WHEN source_mode = 'kana_arcade' THEN 1 ELSE 0 END) AS kanaArcadeAttempts,
        SUM(CASE WHEN source_mode IN ('adaptive_quiz', 'grammar_quiz', 'grammar_lesson') THEN 1 ELSE 0 END) AS adaptiveAttempts,
        SUM(CASE WHEN source_mode = 'exam_mode' THEN 1 ELSE 0 END) AS examAttempts
      FROM app_question_attempt_local
      WHERE source_mode IN ('kana_arcade', 'adaptive_quiz', 'exam_mode', 'grammar_quiz', 'grammar_lesson')
    `);
    const arcadeScoreStats = await db.getFirstAsync<{
      bestScore: number | null;
      bestScoreTime: number | null;
      bestStreak: number | null;
      averageScore: number | null;
      averageTime: number | null;
    }>(`
      SELECT
        MAX(score) AS bestScore,
        (SELECT elapsed_ms FROM app_kana_arcade_score ORDER BY score DESC, elapsed_ms ASC LIMIT 1) AS bestScoreTime,
        MAX(best_streak) AS bestStreak,
        ROUND(AVG(score)) AS averageScore,
        ROUND(AVG(elapsed_ms)) AS averageTime
      FROM app_kana_arcade_score
    `);
    const quizTotal = quizAttempts?.attempts ?? 0;
    const quizCorrect = quizAttempts?.correct ?? 0;
    setQuizSummary({
      attempts: quizTotal,
      correct: quizCorrect,
      rate: quizTotal > 0 ? Math.round((quizCorrect / quizTotal) * 100) : 0,
      todayAttempts: quizAttempts?.todayAttempts ?? 0,
      kanaArcadeAttempts: quizAttempts?.kanaArcadeAttempts ?? 0,
      adaptiveAttempts: quizAttempts?.adaptiveAttempts ?? 0,
      examAttempts: quizAttempts?.examAttempts ?? 0,
      bestScore: arcadeScoreStats?.bestScore ?? 0,
      bestScoreTime: arcadeScoreStats?.bestScoreTime ?? 0,
      bestStreak: arcadeScoreStats?.bestStreak ?? 0,
      averageScore: arcadeScoreStats?.averageScore ?? 0,
      averageTime: arcadeScoreStats?.averageTime ?? 0,
    });

    const quizDays = await db.getAllAsync<DailyProgress>(`
      SELECT date(answered_at) AS day,
             COUNT(*) AS attempts,
             SUM(is_correct) AS correct,
             ROUND(SUM(is_correct) * 100.0 / COUNT(*)) AS rate
      FROM app_question_attempt_local
      WHERE source_mode IN ('kana_arcade', 'adaptive_quiz', 'exam_mode', 'grammar_quiz', 'grammar_lesson')
      GROUP BY date(answered_at)
      ORDER BY day DESC
      LIMIT 14
    `);
    setQuizDailyProgress(quizDays.reverse());

    const modes = await db.getAllAsync<QuizModeProgress>(`
      SELECT source_mode,
             COUNT(*) AS attempts,
             SUM(is_correct) AS correct,
             ROUND(SUM(is_correct) * 100.0 / COUNT(*)) AS rate
      FROM app_question_attempt_local
      WHERE source_mode IN ('kana_arcade', 'adaptive_quiz', 'exam_mode', 'grammar_quiz', 'grammar_lesson')
      GROUP BY source_mode
      ORDER BY attempts DESC
    `);
    setQuizModeProgress(modes);

    const trend = await db.getAllAsync<QuizScoreTrend>(`
      SELECT '#' || ROW_NUMBER() OVER (ORDER BY created_at ASC) AS label,
             score,
             ROUND(correct_count * 100.0 / total_count) AS rate,
             elapsed_ms,
             created_at
      FROM app_kana_arcade_score
      ORDER BY created_at DESC
      LIMIT 10
    `);
    setQuizScoreTrend(trend.reverse());

    const weakQuiz = await db.getAllAsync<SkillProgress>(`
      SELECT skill_id,
             COUNT(*) AS attempts,
             SUM(is_correct) AS correct,
             ROUND(SUM(is_correct) * 100.0 / COUNT(*)) AS rate
      FROM app_question_attempt_local
      WHERE source_mode IN ('kana_arcade', 'adaptive_quiz', 'exam_mode', 'grammar_quiz', 'grammar_lesson')
      GROUP BY skill_id
      HAVING attempts >= 2
      ORDER BY rate ASC, attempts DESC
      LIMIT 6
    `);
    setQuizWeakSkills(weakQuiz);

    const kanaMastery = await db.getAllAsync<MasteryDomainStats>(`
      SELECT
        k.script AS id,
        CASE WHEN k.script = 'hiragana' THEN 'Hiragana' ELSE 'Katakana' END AS label,
        COUNT(*) AS total,
        SUM(CASE WHEN COALESCE(s.mastered, 0) = 1 THEN 1 ELSE 0 END) AS mastered,
        SUM(CASE
          WHEN COALESCE(s.mastered, 0) = 0
           AND COALESCE(s.review, 0) = 0
           AND COALESCE(s.seen_count, 0) > 0 THEN 1 ELSE 0 END) AS known,
        SUM(CASE WHEN COALESCE(s.review, 0) = 1 THEN 1 ELSE 0 END) AS review,
        SUM(CASE WHEN COALESCE(s.seen_count, 0) = 0 THEN 1 ELSE 0 END) AS unseen,
        SUM(CASE WHEN COALESCE(s.seen_count, 0) > 0 THEN 1 ELSE 0 END) AS attempted,
        SUM(COALESCE(s.correct_count, 0)) AS correct,
        CASE
          WHEN SUM(COALESCE(s.seen_count, 0)) > 0
          THEN ROUND(SUM(COALESCE(s.correct_count, 0)) * 100.0 / SUM(COALESCE(s.seen_count, 0)))
          ELSE 0
        END AS rate
      FROM canonical_kana k
      LEFT JOIN app_kana_card_state s ON s.kana_id = k.id
      WHERE k.script IN ('hiragana', 'katakana')
      GROUP BY k.script
      ORDER BY CASE WHEN k.script = 'hiragana' THEN 0 ELSE 1 END
    `);
    const contentMastery = await db.getAllAsync<MasteryDomainStats>(`
      WITH content AS (
        SELECT 'vocabulary' AS id, 'Vocabulaire' AS label, id AS item_id FROM canonical_vocabulary
        UNION ALL
        SELECT 'grammar' AS id, 'Grammaire' AS label, id AS item_id FROM canonical_grammar
        UNION ALL
        SELECT 'kanji' AS id, 'Kanji' AS label, id AS item_id FROM canonical_kanji
      ),
      item_attempts AS (
        SELECT
          q.item_type AS id,
          q.item_id,
          COUNT(a.id) AS attempts,
          SUM(a.is_correct) AS correct,
          ROUND(SUM(a.is_correct) * 100.0 / COUNT(a.id)) AS rate
        FROM app_question_attempt_local a
        INNER JOIN app_question_bank q ON q.question_id = a.question_id
        WHERE q.item_type IN ('vocabulary', 'grammar', 'kanji')
        GROUP BY q.item_type, q.item_id
      )
      SELECT
        c.id,
        c.label,
        COUNT(*) AS total,
        SUM(CASE WHEN COALESCE(i.attempts, 0) >= 2 AND COALESCE(i.rate, 0) >= 90 THEN 1 ELSE 0 END) AS mastered,
        SUM(CASE WHEN COALESCE(i.attempts, 0) >= 2 AND COALESCE(i.rate, 0) >= 70 AND COALESCE(i.rate, 0) < 90 THEN 1 ELSE 0 END) AS known,
        SUM(CASE WHEN COALESCE(i.attempts, 0) > 0 AND COALESCE(i.rate, 0) < 70 THEN 1 ELSE 0 END) AS review,
        SUM(CASE WHEN COALESCE(i.attempts, 0) = 0 THEN 1 ELSE 0 END) AS unseen,
        SUM(COALESCE(i.attempts, 0)) AS attempted,
        SUM(COALESCE(i.correct, 0)) AS correct,
        CASE
          WHEN SUM(COALESCE(i.attempts, 0)) > 0
          THEN ROUND(SUM(COALESCE(i.correct, 0)) * 100.0 / SUM(COALESCE(i.attempts, 0)))
          ELSE 0
        END AS rate
      FROM content c
      LEFT JOIN item_attempts i ON i.id = c.id AND i.item_id = c.item_id
      GROUP BY c.id, c.label
      ORDER BY CASE c.id
        WHEN 'vocabulary' THEN 0
        WHEN 'grammar' THEN 1
        WHEN 'kanji' THEN 2
        ELSE 3
      END
    `);
      const grammarMastery = buildGrammarMasteryDomain(grammarProgress);
      const adjustedContentMastery = contentMastery.map((domain) =>
        domain.id === 'grammar' ? grammarMastery : domain
      );
      setMasteryDomains([...kanaMastery, ...adjustedContentMastery]);

      const loadGoalMetrics = async (periodStart: Date, periodEnd: Date): Promise<DailyGoalMetrics> => {
        const startKey = formatDateKey(periodStart);
        const endKey = formatDateKey(periodEnd);
        const row = await db.getFirstAsync<{
          attempts: number;
          correct: number | null;
          quizAttempts: number;
          grammarActivities: number;
          activeDays: number;
        }>(
          `
          SELECT
            (SELECT COUNT(*)
             FROM app_question_attempt_local
             WHERE date(answered_at) >= ? AND date(answered_at) < ?) AS attempts,
            (SELECT SUM(is_correct)
             FROM app_question_attempt_local
             WHERE date(answered_at) >= ? AND date(answered_at) < ?) AS correct,
            (
              (SELECT COUNT(*)
               FROM app_kana_arcade_score
               WHERE date(created_at) >= ? AND date(created_at) < ?)
              +
              (SELECT CAST(COUNT(*) / 10 AS INTEGER)
               FROM app_question_attempt_local
               WHERE date(answered_at) >= ? AND date(answered_at) < ?
                 AND source_mode IN ('adaptive_quiz', 'exam_mode', 'grammar_quiz'))
            ) AS quizAttempts,
            (SELECT COUNT(*)
             FROM app_question_attempt_local
             WHERE date(answered_at) >= ? AND date(answered_at) < ?
               AND source_mode = 'grammar_lesson') AS grammarActivities,
            (
              SELECT COUNT(DISTINCT day)
              FROM (
                SELECT date(answered_at) AS day
                FROM app_question_attempt_local
                WHERE date(answered_at) >= ? AND date(answered_at) < ?
                UNION
                SELECT date(created_at) AS day
                FROM app_kana_arcade_score
                WHERE date(created_at) >= ? AND date(created_at) < ?
              )
            ) AS activeDays
          `,
          startKey,
          endKey,
          startKey,
          endKey,
          startKey,
          endKey,
          startKey,
          endKey,
          startKey,
          endKey,
          startKey,
          endKey,
          startKey,
          endKey
        );
        const periodAttempts = row?.attempts ?? 0;
        const periodCorrect = row?.correct ?? 0;
        return {
          day: startKey,
          attempts: periodAttempts,
          correct: periodCorrect,
          rate: periodAttempts > 0 ? Math.round((periodCorrect / periodAttempts) * 100) : 0,
          quizAttempts: row?.quizAttempts ?? 0,
          grammarActivities: row?.grammarActivities ?? 0,
          activeDays: row?.activeDays ?? 0,
        };
      };

      const now = new Date();
      const today = formatDateKey(now);
      const weekStart = getWeekStart(now);
      const monthStart = getMonthStart(now);
      const yearStart = addDays(now, -(CALENDAR_HISTORY_DAYS - 1));
      const currentGoalMetrics: DailyGoalMetrics = {
        day: today,
        attempts: todayAttempts,
        correct: todayCorrect,
        rate: todayAttempts > 0 ? Math.round((todayCorrect / todayAttempts) * 100) : 0,
        quizAttempts: 0,
        grammarActivities: 0,
      };
      const todayQuizAttempts = await db.getFirstAsync<{ quizAttempts: number; grammarActivities: number }>(
        `
        SELECT
          (
            (SELECT COUNT(*)
             FROM app_kana_arcade_score
             WHERE date(created_at) = ?)
            +
            (SELECT CAST(COUNT(*) / 10 AS INTEGER)
             FROM app_question_attempt_local
             WHERE date(answered_at) = ?
               AND source_mode IN ('adaptive_quiz', 'exam_mode', 'grammar_quiz'))
          ) AS quizAttempts,
          (SELECT COUNT(*)
           FROM app_question_attempt_local
           WHERE date(answered_at) = ?
             AND source_mode = 'grammar_lesson') AS grammarActivities
        `,
        today,
        today,
        today
      );
      currentGoalMetrics.quizAttempts = todayQuizAttempts?.quizAttempts ?? 0;
      currentGoalMetrics.grammarActivities = todayQuizAttempts?.grammarActivities ?? 0;
      const currentWeeklyMetrics = await loadGoalMetrics(weekStart, addDays(weekStart, 7));
      const currentMonthlyMetrics = await loadGoalMetrics(monthStart, addMonths(monthStart, 1));
      const currentYearlyMetrics = await loadGoalMetrics(yearStart, addDays(now, 1));
      setTodayGoalMetrics(currentGoalMetrics);
      setWeeklyGoalMetrics(currentWeeklyMetrics);
      setMonthlyGoalMetrics(currentMonthlyMetrics);
      setYearlyGoalMetrics(currentYearlyMetrics);

      const questGroups = [
        { key: today, quests: buildDailyQuests(currentGoalMetrics) },
        { key: `${currentWeeklyMetrics.day}:week`, quests: buildQuests(currentWeeklyMetrics, WEEKLY_GOAL_DEFINITIONS) },
        { key: `${currentMonthlyMetrics.day}:month`, quests: buildQuests(currentMonthlyMetrics, MONTHLY_GOAL_DEFINITIONS) },
        { key: `${currentYearlyMetrics.day}:year`, quests: buildQuests(currentYearlyMetrics, YEARLY_GOAL_DEFINITIONS) },
      ];
      for (const group of questGroups) {
        for (const quest of group.quests) {
          if (!isQuestComplete(quest)) {
            await db.runAsync(
              `
              DELETE FROM app_daily_reward_claim
              WHERE day = ? AND goal_id = ?
              `,
              group.key,
              quest.id
            );
          }
        }
      }
      const newlyCompleted = questGroups.flatMap((group) =>
        group.quests.filter(isQuestComplete).map((quest) => ({ key: group.key, quest }))
      );
      for (const { key, quest } of newlyCompleted) {
        const existingClaim = await db.getFirstAsync<{ goal_id: string }>(
          `
          SELECT goal_id
          FROM app_daily_reward_claim
          WHERE day = ? AND goal_id = ?
          `,
          key,
          quest.id
        );
        if (!existingClaim) {
          await db.runAsync(
            `
            INSERT INTO app_daily_reward_claim (
              day, goal_id, reward_xp, badge_code, claimed_at
            ) VALUES (?, ?, ?, ?, datetime('now'))
            `,
            key,
            quest.id,
            quest.rewardXp,
            quest.badgeCode
          );
          setRewardToast({ title: quest.title, xp: quest.rewardXp, badgeCode: quest.badgeCode });
        }
      }

      const rewards = await db.getFirstAsync<RewardSummary>(
        `
        SELECT COALESCE(SUM(reward_xp), 0) AS xp,
               COUNT(DISTINCT badge_code) AS badges
        FROM app_daily_reward_claim
        `
      );
      setRewardSummary({ xp: rewards?.xp ?? 0, badges: rewards?.badges ?? 0 });
      const badgeRows = await db.getAllAsync<{ badge_code: string }>(
        `
        SELECT DISTINCT badge_code
        FROM app_daily_reward_claim
        ORDER BY badge_code
        `
      );
      setEarnedBadgeCodes(badgeRows.map((row) => row.badge_code));

      const calendarRows = await db.getAllAsync<DailyGoalMetrics>(
        `
        SELECT p.day,
               COALESCE(a.attempts, 0) AS attempts,
               COALESCE(a.correct, 0) AS correct,
               CASE
                 WHEN COALESCE(a.attempts, 0) > 0
                 THEN ROUND(COALESCE(a.correct, 0) * 100.0 / a.attempts)
                 ELSE 0
               END AS rate,
               COALESCE(a.quizAttempts, 0) AS quizAttempts,
               COALESCE(a.grammarActivities, 0) AS grammarActivities
        FROM (
          SELECT day
          FROM (
            SELECT DISTINCT day
            FROM app_daily_goal_plan
            WHERE day <= date('now')
            ORDER BY day DESC
            LIMIT ${CALENDAR_HISTORY_DAYS}
          )
          ORDER BY day ASC
        ) p
        LEFT JOIN (
          SELECT day,
                 SUM(attempts) AS attempts,
                 SUM(correct) AS correct,
                 SUM(quizAttempts) AS quizAttempts,
                 SUM(grammarActivities) AS grammarActivities
          FROM (
            SELECT date(answered_at) AS day,
                   COUNT(*) AS attempts,
                   SUM(is_correct) AS correct,
                   CAST(SUM(CASE WHEN source_mode IN ('adaptive_quiz', 'exam_mode', 'grammar_quiz') THEN 1 ELSE 0 END) / 10 AS INTEGER) AS quizAttempts,
                   SUM(CASE WHEN source_mode = 'grammar_lesson' THEN 1 ELSE 0 END) AS grammarActivities
            FROM app_question_attempt_local
            GROUP BY date(answered_at)
            UNION ALL
            SELECT date(created_at) AS day,
                   0 AS attempts,
                   0 AS correct,
                   COUNT(*) AS quizAttempts,
                   0 AS grammarActivities
            FROM app_kana_arcade_score
            GROUP BY date(created_at)
          )
          GROUP BY day
        ) a ON a.day = p.day
        ORDER BY p.day ASC
        `
      );
      setGoalCalendar(
        calendarRows.map((day) => {
          const quests = buildDailyQuests(day);
          return {
            ...day,
            completed: quests.filter(isQuestComplete).length,
            total: quests.length,
          };
        })
      );
    } catch (error) {
      console.error('Unable to load dashboard stats', error);
      setStats(emptyStats);
      setWeakSkills([]);
      setMasteredSkills([]);
      setDailyProgress([]);
      setQuizDailyProgress([]);
      setQuizModeProgress([]);
      setQuizScoreTrend([]);
      setQuizWeakSkills([]);
      setMasteryDomains([]);
      setGrammarLessonSummary(emptyGrammarProgressSummary);
      setGoalCalendar([]);
      setRewardSummary({ xp: 0, badges: 0 });
      setEarnedBadgeCodes([]);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!rewardToast) return;
    rewardAnim.setValue(0);
    Animated.sequence([
      Animated.timing(rewardAnim, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.timing(rewardAnim, {
        toValue: 0,
        duration: 520,
        delay: 1800,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setRewardToast(null);
    });
  }, [rewardAnim, rewardToast]);

  const masteryTotal = masteryDomains.reduce(
    (acc, domain) => ({
      total: acc.total + domain.total,
      mastered: acc.mastered + domain.mastered,
      known: acc.known + domain.known,
      review: acc.review + domain.review,
      unseen: acc.unseen + domain.unseen,
    }),
    { total: 0, mastered: 0, known: 0, review: 0, unseen: 0 }
  );
  const masteryRate =
    masteryTotal.total > 0 ? Math.round((masteryTotal.mastered / masteryTotal.total) * 100) : 0;
  const remainingToMaster = Math.max(0, masteryTotal.total - masteryTotal.mastered);
  const streakDays = calculateStudyStreak(dailyProgress);
  const xpTotal =
    stats.correctRate * 3 +
    stats.attempts * 10 +
    masteryTotal.mastered * 25 +
    masteryTotal.known * 8 +
    quizSummary.bestScore +
    rewardSummary.xp;
  const levelProgress = getLevelProgressFromXp(xpTotal);
  const { level, xpCurrentLevel, xpRequiredForLevel, xpToNextLevel } = levelProgress;
  const examReadiness = Math.min(100, Math.round(masteryRate * 0.55 + quizSummary.rate * 0.35 + Math.min(streakDays, 10)));
  const recommendedDomain =
    masteryDomains
      .slice()
      .sort((a, b) => b.review - a.review || b.unseen - a.unseen || b.total - b.mastered - (a.total - a.mastered))[0] ??
    null;
  const coachQuests = buildDailyQuests(todayGoalMetrics);
  const badgeViews = buildBadgeViews({
    stats,
    quizSummary,
    masteryDomains,
    grammarLessons: grammarLessonSummary,
    goalCalendar,
    earnedBadgeCodes,
    streakDays,
    level,
  });
  const unlockedBadgeCount = badgeViews.filter((badge) => badge.unlocked).length;

  if (loading) {
    return <LoadingView />;
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.statsRubrics}>
        <RubricButton label="Résumé" active={dashboardTab === 'overview'} onPress={() => setDashboardTab('overview')} />
        <RubricButton label="Quiz" active={dashboardTab === 'quiz'} onPress={() => setDashboardTab('quiz')} />
        <RubricButton label="Maîtrise" active={dashboardTab === 'mastery'} onPress={() => setDashboardTab('mastery')} />
        <RubricButton label="Progression" active={dashboardTab === 'progress'} onPress={() => setDashboardTab('progress')} />
        <RubricButton label="À travailler" active={dashboardTab === 'focus'} onPress={() => setDashboardTab('focus')} />
      </View>

      {dashboardTab === 'overview' && (
        <>
          {rewardToast && (
            <Animated.View
              style={[
                styles.rewardToast,
                {
                  opacity: rewardAnim,
                  transform: [
                    {
                      translateY: rewardAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-12, 0],
                      }),
                    },
                    {
                      scale: rewardAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.96, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.rewardToastBadge}>{rewardToast.badgeCode}</Text>
              <View style={styles.rewardToastCopy}>
                <Text style={styles.rewardToastTitle}>Récompense gagnée</Text>
                <Text style={styles.rewardToastText}>{rewardToast.title} · +{rewardToast.xp} XP</Text>
              </View>
            </Animated.View>
          )}

          <CoachPremiumPanel
            examReadiness={examReadiness}
            level={level}
            xpCurrentLevel={xpCurrentLevel}
            xpRequiredForLevel={xpRequiredForLevel}
            xpToNextLevel={xpToNextLevel}
            streakDays={streakDays}
            quests={coachQuests}
            goalCalendar={goalCalendar}
            recommendedDomain={recommendedDomain}
            rewardSummary={{ ...rewardSummary, badges: unlockedBadgeCount }}
          />

          <Section title="Calendrier des badges journaliers">
            <DailyGoalCalendar days={goalCalendar} />
          </Section>

          <Section title="Collection de badges">
            <BadgeCollection badges={badgeViews} />
          </Section>

          <Section title="Vue générale">
            <View style={styles.statsGrid}>
              <Metric label="Questions" value={stats.questions} />
              <Metric label="Vocabulaire" value={stats.vocabulary} />
              <Metric label="Grammaire" value={stats.grammar} />
              <Metric label="Kanji" value={stats.kanji} />
              <Metric label="Kana" value={stats.kana} />
              <Metric label="Audio" value={stats.audio} />
            </View>
          </Section>

          <Section title="Progression globale">
            <View style={styles.statsGrid}>
              <Metric label="Réponses" value={stats.attempts} />
              <Metric label="Aujourd'hui" value={stats.todayAttempts} />
              <Metric label="Réussite" value={`${stats.correctRate}%`} />
            </View>
          </Section>
        </>
      )}

      {dashboardTab === 'quiz' && (
        <>
          <Section title="Performance Quiz">
            <View style={styles.quizStatsHero}>
              <View>
                <Text style={styles.quizStatsKicker}>Performance globale</Text>
                <Text style={styles.quizStatsScore}>{quizSummary.rate}%</Text>
                <Text style={styles.quizStatsMeta}>
                  {quizSummary.correct}/{quizSummary.attempts} réponses justes · {quizSummary.todayAttempts} aujourd'hui
                </Text>
              </View>
              <View style={styles.quizStatsBadge}>
                <Text style={styles.quizStatsBadgeValue}>{quizSummary.bestScore}</Text>
                <Text style={styles.quizStatsBadgeLabel}>meilleur score</Text>
              </View>
            </View>
            <View style={styles.statsGrid}>
              <Metric label="Quiz Kana" value={quizSummary.kanaArcadeAttempts} />
              <Metric label="Quiz JLPT" value={quizSummary.adaptiveAttempts} />
              <Metric label="Mode examen" value={quizSummary.examAttempts} />
              <Metric label="Score moyen" value={quizSummary.averageScore || '-'} />
              <Metric label="Meilleur temps" value={quizSummary.bestScoreTime ? formatElapsedTime(quizSummary.bestScoreTime) : '-'} />
              <Metric label="Série max" value={quizSummary.bestStreak} />
            </View>
          </Section>

          <Section title="Courbe de réussite quiz">
            {quizDailyProgress.length === 0 ? (
              <EmptyText text="Les courbes quiz apparaîtront après quelques réponses." />
            ) : (
              <StatsLineChart
                points={quizDailyProgress.map((day) => ({ label: day.day.slice(5), detail: day.day, value: day.rate }))}
                suffix="%"
                maxValue={100}
                color="#186B63"
                xAxisLabel="Date"
                yAxisLabel="Réussite"
              />
            )}
          </Section>

          <Section title="Courbe des scores Kana">
            {quizScoreTrend.length === 0 ? (
              <EmptyText text="Termine un Quiz Kana pour voir l'évolution des scores." />
            ) : (
              <StatsLineChart
                points={quizScoreTrend.map((item) => ({
                  label: item.label,
                  detail: formatChartDateTime(item.created_at),
                  value: item.score,
                }))}
                suffix=" pts"
                color="#B45A46"
                xAxisLabel="Session"
                yAxisLabel="Score"
              />
            )}
          </Section>

          <Section title="Répartition par mode">
            {quizModeProgress.length === 0 ? (
              <EmptyText text="Les modes de quiz apparaîtront après tes prochaines sessions." />
            ) : (
              quizModeProgress.map((mode) => (
                <ProgressRow
                  key={mode.source_mode}
                  label={formatQuizModeLabel(mode.source_mode)}
                  detail={`${mode.correct}/${mode.attempts} réponses justes`}
                  rate={mode.rate}
                />
              ))
            )}
          </Section>
        </>
      )}

      {dashboardTab === 'mastery' && (
        <>
          <Section title="Tableau de maîtrise JLPT N5">
            <View style={styles.masteryHero}>
              <View>
                <Text style={styles.quizStatsKicker}>Maîtrise globale</Text>
                <Text style={styles.quizStatsScore}>{masteryRate}%</Text>
                <Text style={styles.quizStatsMeta}>
                  {masteryTotal.mastered}/{masteryTotal.total} éléments maîtrisés · {remainingToMaster} à maîtriser
                </Text>
              </View>
              <View style={styles.masteryRing}>
                <Text style={styles.masteryRingValue}>{remainingToMaster}</Text>
                <Text style={styles.masteryRingLabel}>restants</Text>
              </View>
            </View>
            <View style={styles.statsGrid}>
              <Metric label="Maîtrisés" value={masteryTotal.mastered} />
              <Metric label="Connus" value={masteryTotal.known} />
              <Metric label="À revoir" value={masteryTotal.review} />
              <Metric label="Jamais vus" value={masteryTotal.unseen} />
            </View>
          </Section>

          <Section title="Maîtrise par domaine">
            {masteryDomains.length === 0 ? (
              <EmptyText text="Les statistiques de maîtrise apparaîtront avec ton apprentissage." />
            ) : (
              masteryDomains.map((domain) => <MasteryDomainCard key={domain.id} domain={domain} />)
            )}
          </Section>

          <Section title="Ce qui reste à maîtriser">
            {masteryDomains.length === 0 ? (
              <EmptyText text="Aucune donnée de maîtrise disponible pour le moment." />
            ) : (
              masteryDomains
                .slice()
                .sort((a, b) => b.total - b.mastered - (a.total - a.mastered))
                .map((domain) => (
                  <ProgressRow
                    key={`remaining-${domain.id}`}
                    label={domain.label}
                    detail={`${Math.max(0, domain.total - domain.mastered)} éléments encore à maîtriser · ${domain.review} à revoir`}
                    rate={domain.total > 0 ? Math.round((domain.mastered / domain.total) * 100) : 0}
                  />
                ))
            )}
          </Section>
        </>
      )}

      {dashboardTab === 'progress' && (
        <>
          <Section title="Courbe générale">
            {dailyProgress.length === 0 ? (
              <EmptyText text="Réponds à quelques questions pour voir ton évolution." />
            ) : (
              <StatsLineChart
                points={dailyProgress.map((day) => ({ label: day.day.slice(5), detail: day.day, value: day.rate }))}
                suffix="%"
                maxValue={100}
                color="#186B63"
                xAxisLabel="Date"
                yAxisLabel="Réussite"
              />
            )}
          </Section>

          <Section title="Détail jour par jour">
            {dailyProgress.length === 0 ? (
              <EmptyText text="Réponds à quelques questions pour voir ton évolution." />
            ) : (
              dailyProgress.map((day) => (
                <ProgressRow
                  key={day.day}
                  label={day.day}
                  detail={`${day.correct}/${day.attempts} réponses justes`}
                  rate={day.rate}
                />
              ))
            )}
          </Section>
        </>
      )}

      {dashboardTab === 'focus' && (
        <>
          <Section title="Points faibles quiz">
            {quizWeakSkills.length === 0 ? (
              <EmptyText text="Les points faibles quiz apparaîtront après quelques réponses." />
            ) : (
              quizWeakSkills.map((skill) => (
                <ProgressRow
                  key={skill.skill_id}
                  label={formatSkillLabel(skill.skill_id)}
                  detail={`${skill.correct}/${skill.attempts} réponses justes`}
                  rate={skill.rate}
                />
              ))
            )}
          </Section>

          <Section title="À renforcer">
            {weakSkills.length === 0 ? (
              <EmptyText text="Les points faibles apparaîtront après quelques réponses." />
            ) : (
              weakSkills.map((skill) => (
                <ProgressRow
                  key={skill.skill_id}
                  label={formatSkillLabel(skill.skill_id)}
                  detail={`${skill.correct}/${skill.attempts} réponses justes`}
                  rate={skill.rate}
                />
              ))
            )}
          </Section>

          <Section title="Mieux maîtrisé">
            {masteredSkills.length === 0 ? (
              <EmptyText text="Les maîtrises apparaîtront avec ton historique." />
            ) : (
              masteredSkills.map((skill) => (
                <ProgressRow
                  key={skill.skill_id}
                  label={formatSkillLabel(skill.skill_id)}
                  detail={`${skill.correct}/${skill.attempts} réponses justes`}
                  rate={skill.rate}
                />
              ))
            )}
          </Section>
        </>
      )}
    </ScrollView>
  );
}

function KanaScreen() {
  const db = useSQLiteContext();
  const [mode, setMode] = useState<KanaMode>('learn');
  const [tab, setTab] = useState<KanaTab>('hiragana');
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<KanaCard[]>([]);
  const [flippedId, setFlippedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<KanaFilter>('all');
  const [search, setSearch] = useState('');
  const [focusMode, setFocusMode] = useState(false);
  const [displayStyle, setDisplayStyle] = useState<KanaDisplayStyle>('illustrated');
  const [focusIndex, setFocusIndex] = useState(0);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [viewerPanel, setViewerPanel] = useState<KanaViewerPanel>('card');
  const [quizSize, setQuizSize] = useState<KanaQuizSize>(10);
  const [exerciseDirection, setExerciseDirection] = useState<KanaExerciseDirection>('kana_to_romaji');
  const [answerMode, setAnswerMode] = useState<KanaQuizAnswerMode>('multiple_choice');
  const [practiceMode, setPracticeMode] = useState<KanaPracticeMode>('standard');
  const [includeCombinedKana, setIncludeCombinedKana] = useState(false);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerTick, setTimerTick] = useState(Date.now());
  const [timeRecords, setTimeRecords] = useState<KanaTimeRecord[]>([]);
  const [quizSession, setQuizSession] = useState<KanaQuizSession | null>(null);
  const [exerciseChoice, setExerciseChoice] = useState<string | null>(null);
  const [directInput, setDirectInput] = useState('');
  const [matchingKanaId, setMatchingKanaId] = useState<string | null>(null);
  const [matchingRomaji, setMatchingRomaji] = useState<string | null>(null);
  const [japaneseVoiceId, setJapaneseVoiceId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    Speech.getAvailableVoicesAsync()
      .then((voices) => {
        if (!mounted) return;
        const japaneseVoices = voices.filter((voice) => voice.language?.toLowerCase().startsWith('ja'));
        const preferredVoice =
          japaneseVoices.find((voice) => /ja-jp|japanese|kyoko|otoya|siri/i.test(`${voice.identifier} ${voice.name}`)) ??
          japaneseVoices[0];
        setJapaneseVoiceId(preferredVoice?.identifier ?? null);
      })
      .catch(() => setJapaneseVoiceId(null));
    return () => {
      mounted = false;
    };
  }, []);

  const loadCards = useCallback(async () => {
    setLoading(true);
    setFlippedId(null);
    setViewerIndex(null);
    setQuizSession(null);
    setExerciseChoice(null);
    setDirectInput('');
    setMatchingKanaId(null);
    setMatchingRomaji(null);

    try {
      const rows = await db.getAllAsync<Omit<KanaCard, 'examples'>>(
        `
        SELECT k.id, k.script, k.character, k.romaji, k.row_name,
               COALESCE(s.favorite, 0) AS favorite,
               COALESCE(s.review, 0) AS review,
               COALESCE(s.mastered, 0) AS mastered,
               COALESCE(s.seen_count, 0) AS seen_count,
               COALESCE(s.correct_count, 0) AS correct_count,
               m.note AS mnemonic_note
        FROM canonical_kana k
        LEFT JOIN app_kana_card_state s ON s.kana_id = k.id
        LEFT JOIN app_kana_mnemonic_local m ON m.kana_id = k.id
        WHERE k.needs_review = 0
          AND (
            (? = 'hiragana' AND k.script = 'hiragana' AND length(k.character) = 1)
            OR (? = 'katakana' AND k.script = 'katakana' AND length(k.character) = 1)
            OR (? = 'combined' AND length(k.character) > 1)
          )
        ORDER BY k.script,
          CASE substr(k.romaji, 1, 1)
            WHEN 'a' THEN 1 WHEN 'i' THEN 2 WHEN 'u' THEN 3 WHEN 'e' THEN 4 WHEN 'o' THEN 5
            WHEN 'k' THEN 6 WHEN 's' THEN 7 WHEN 't' THEN 8 WHEN 'n' THEN 9 WHEN 'h' THEN 10
            WHEN 'm' THEN 11 WHEN 'y' THEN 12 WHEN 'r' THEN 13 WHEN 'w' THEN 14 ELSE 30
          END,
          k.romaji
        `,
        tab,
        tab,
        tab
      );

      const validCharacters =
        tab === 'hiragana'
          ? new Set(HIRAGANA_STANDARD.flat().filter(Boolean))
          : tab === 'katakana'
            ? new Set(KATAKANA_STANDARD.flat().filter(Boolean))
            : null;

      const filteredRows = validCharacters
        ? rows.filter((row) => validCharacters.has(row.character))
        : rows.filter((row) => !row.character.includes('?'));

      const enriched = await Promise.all(
        filteredRows.map(async (row) => {
          const lookupCharacter = HIRAGANA_BY_KATAKANA.get(row.character) ?? row.character;
          const preferredExample = PREFERRED_N5_EXAMPLES[lookupCharacter] ?? '';
          const dbExamples = await db.getAllAsync<VocabularyExample>(
            `
            SELECT id, japanese, kana, kanji, romaji, meaning_fr
            FROM canonical_vocabulary
            WHERE jlpt_level = 'N5'
              AND kana IS NOT NULL
              AND (
                (? != '' AND kana = ?)
                OR substr(kana, 1, length(?)) = ?
                OR instr(kana, ?) > 0
              )
            ORDER BY
              CASE
                WHEN ? != '' AND kana = ? THEN 0
                WHEN substr(kana, 1, length(?)) = ? THEN 1
                ELSE 2
              END,
              importance DESC,
              difficulty ASC,
              length(kana) ASC
            LIMIT 1
            `,
            preferredExample,
            preferredExample,
            lookupCharacter,
            lookupCharacter,
            lookupCharacter,
            preferredExample,
            preferredExample,
            lookupCharacter,
            lookupCharacter
          );
          const combinedPreset = getCombinedKanaExamplePreset(row.romaji);
          const examples =
            row.character.length > 1 && combinedPreset
              ? [buildCombinedKanaVocabularyExample(row.character, combinedPreset)]
              : dbExamples;
          return {
            ...row,
            script: row.script as 'hiragana' | 'katakana',
            romaji: normalizeKanaRomaji(row.character, row.romaji),
            examples,
          };
        })
      );

      setCards(sortKanaCards(enriched, tab));
      setFocusIndex(0);
    } catch (error) {
      console.error('Unable to load kana cards', error);
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [db, tab]);

  const visibleCards = useMemo(() => {
    const query = search.trim().toLowerCase();
    return cards.filter((card) => {
      const matchesSearch =
        !query ||
        card.character.includes(query) ||
        card.romaji.toLowerCase().includes(query) ||
        card.examples.some((example) =>
          `${example.japanese} ${example.kana ?? ''} ${example.meaning_fr}`
            .toLowerCase()
            .includes(query)
        );
      const matchesFilter =
        filter === 'all' ||
        (filter === 'known' && card.favorite === 1) ||
        (filter === 'review' && card.review === 1) ||
        (filter === 'mastered' && card.mastered === 1) ||
        (filter === 'unseen' && card.seen_count === 0);
      return matchesSearch && matchesFilter;
    });
  }, [cards, filter, search]);

  const focusedCard = visibleCards[Math.min(focusIndex, Math.max(0, visibleCards.length - 1))];
  const viewerCard =
    viewerIndex === null || visibleCards.length === 0
      ? null
      : visibleCards[Math.min(viewerIndex, Math.max(0, visibleCards.length - 1))];
  const safeViewerIndex =
    viewerIndex === null || visibleCards.length === 0
      ? 0
      : Math.min(viewerIndex, Math.max(0, visibleCards.length - 1));
  const kanaStats = useMemo(() => {
    const seen = cards.filter((card) => card.seen_count > 0).length;
    const mastered = cards.filter((card) => card.mastered === 1).length;
    const review = cards.filter((card) => card.review === 1).length;
    const known = cards.filter((card) => card.favorite === 1).length;
    return { seen, mastered, review, known };
  }, [cards]);

  const smartDeck = useMemo(() => buildSmartKanaDeck(cards), [cards]);
  const dailyDeck = useMemo(() => buildDailyKanaDeck(cards), [cards]);
  const liveElapsedMs =
    quizSession?.timerEnabled
      ? quizSession.elapsedMs ?? (quizSession.startedAt ? Math.max(0, timerTick - quizSession.startedAt) : 0)
      : undefined;

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const loadTimeRecords = useCallback(async () => {
    const records = await db.getAllAsync<KanaTimeRecord>(
      `
      SELECT id, elapsed_ms, correct_count, total_count, created_at
      FROM app_kana_time_record
      WHERE script = ?
        AND practice_mode = ?
        AND quiz_size = ?
        AND include_combined = ?
      ORDER BY elapsed_ms ASC, correct_count DESC, created_at DESC
      LIMIT 5
      `,
      tab,
      practiceMode,
      practiceMode === 'matching' ? 25 : quizSize,
      includeCombinedKana ? 1 : 0
    );
    setTimeRecords(records);
  }, [db, includeCombinedKana, practiceMode, quizSize, tab]);

  useEffect(() => {
    loadTimeRecords();
  }, [loadTimeRecords]);

  useEffect(() => {
    if (!quizSession?.timerEnabled || quizSession.finished || !quizSession.startedAt) return;
    const timer = setInterval(() => setTimerTick(Date.now()), 250);
    return () => clearInterval(timer);
  }, [quizSession?.finished, quizSession?.startedAt, quizSession?.timerEnabled]);

  const loadCombinedExerciseCards = useCallback(async () => {
    if (tab === 'combined') return [];
    const rows = await db.getAllAsync<Omit<KanaCard, 'examples'>>(
      `
      SELECT k.id, k.script, k.character, k.romaji, k.row_name,
             COALESCE(s.favorite, 0) AS favorite,
             COALESCE(s.review, 0) AS review,
             COALESCE(s.mastered, 0) AS mastered,
             COALESCE(s.seen_count, 0) AS seen_count,
             COALESCE(s.correct_count, 0) AS correct_count,
             m.note AS mnemonic_note
      FROM canonical_kana k
      LEFT JOIN app_kana_card_state s ON s.kana_id = k.id
      LEFT JOIN app_kana_mnemonic_local m ON m.kana_id = k.id
      WHERE k.needs_review = 0
        AND k.script = ?
        AND length(k.character) > 1
        AND instr(k.character, '?') = 0
      ORDER BY k.romaji
      `,
      tab
    );

    return sortKanaCards(
      rows.map((row) => {
        const combinedPreset = getCombinedKanaExamplePreset(row.romaji);
        return {
          ...row,
          script: row.script as 'hiragana' | 'katakana',
          romaji: normalizeKanaRomaji(row.character, row.romaji),
          examples: combinedPreset ? [buildCombinedKanaVocabularyExample(row.character, combinedPreset)] : [],
        };
      }),
      tab
    );
  }, [db, tab]);

  useEffect(() => {
    if (viewerIndex !== null && visibleCards.length > 0 && viewerIndex >= visibleCards.length) {
      setViewerIndex(visibleCards.length - 1);
    }
    if (visibleCards.length === 0) {
      setViewerIndex(null);
    }
  }, [viewerIndex, visibleCards.length]);

  const openViewer = (index: number) => {
    const card = visibleCards[index];
    if (!card) return;
    setViewerIndex(index);
    setFlippedId(null);
    updateKanaCardState(card.id, { seenDelta: 1 });
  };

  const openCardInViewer = (card: KanaCard) => {
    const nextIndex = visibleCards.findIndex((visibleCard) => visibleCard.id === card.id);
    openViewer(nextIndex >= 0 ? nextIndex : 0);
  };

  const openSmartReview = () => {
    const firstCard = smartDeck[0];
    if (!firstCard) return;
    setFilter('all');
    setSearch('');
    setFocusMode(false);
    const nextIndex = cards.findIndex((card) => card.id === firstCard.id);
    setViewerIndex(Math.max(0, nextIndex));
    updateKanaCardState(firstCard.id, { seenDelta: 1 });
  };

  const openDailySession = () => {
    const firstCard = dailyDeck[0];
    if (!firstCard) return;
    setFilter('all');
    setSearch('');
    setFocusMode(false);
    const nextIndex = cards.findIndex((card) => card.id === firstCard.id);
    setViewerIndex(Math.max(0, nextIndex));
    updateKanaCardState(firstCard.id, { seenDelta: 1 });
  };

  const speakJapanese = useCallback(
    (text: string, slow = false) => {
      Speech.stop();
      Speech.speak(text, {
        language: 'ja-JP',
        voice: japaneseVoiceId ?? undefined,
        rate: slow ? 0.62 : 0.72,
        pitch: 1,
      });
    },
    [japaneseVoiceId]
  );

  const speakKanaCard = (card: KanaCard) => {
    Speech.stop();
    speakJapanese(buildKanaSpeechText(card), true);
  };

  const startSingleCardQuiz = (card: KanaCard) => {
    const pool = cards.length >= 4 ? cards : visibleCards;
    const exercise = buildKanaExercise(pool, card, 'kana_to_romaji', 'multiple_choice');
    if (!exercise) return;
    setMode('exercise');
    setViewerIndex(null);
    setFlippedId(null);
    setAnswerMode('multiple_choice');
    setExerciseDirection('kana_to_romaji');
    setQuizSession({
      questions: [exercise],
      currentIndex: 0,
      correctCount: 0,
      answers: [],
      finished: false,
      storyCompleted: true,
      practiceMode: 'standard',
    });
  };

  const showPreviousViewerCard = () => {
    if (visibleCards.length === 0) return;
    setFlippedId(null);
    setViewerIndex((current) => {
      const nextIndex = current === null ? 0 : (current - 1 + visibleCards.length) % visibleCards.length;
      const nextCard = visibleCards[nextIndex];
      if (nextCard) updateKanaCardState(nextCard.id, { seenDelta: 1 });
      return nextIndex;
    });
  };

  const showNextViewerCard = () => {
    if (visibleCards.length === 0) return;
    setFlippedId(null);
    setViewerIndex((current) => {
      const nextIndex = current === null ? 0 : (current + 1) % visibleCards.length;
      const nextCard = visibleCards[nextIndex];
      if (nextCard) updateKanaCardState(nextCard.id, { seenDelta: 1 });
      return nextIndex;
    });
  };

  const showRandomViewerCard = () => {
    if (visibleCards.length === 0) return;
    setFlippedId(null);
    setViewerIndex((current) => {
      if (visibleCards.length === 1) return 0;
      let nextIndex = Math.floor(Math.random() * visibleCards.length);
      if (current !== null && nextIndex === current) {
        nextIndex = (nextIndex + 1) % visibleCards.length;
      }
      const nextCard = visibleCards[nextIndex];
      if (nextCard) updateKanaCardState(nextCard.id, { seenDelta: 1 });
      return nextIndex;
    });
  };

  const saveKanaTimeRecord = useCallback(
    async (session: KanaQuizSession) => {
      if (!session.timerEnabled || !session.elapsedMs) return;
      const total = session.practiceMode === 'matching' ? getMatchingTotalCount(session) : session.questions.length;
      if (total <= 0) return;
      await db.runAsync(
        `
        INSERT INTO app_kana_time_record (
          id, script, practice_mode, quiz_size, include_combined,
          total_count, correct_count, elapsed_ms, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `,
        `${Date.now()}-${Math.random()}`,
        tab,
        session.practiceMode,
        session.practiceMode === 'matching' ? getMatchingTotalCount(session) : quizSize,
        includeCombinedKana ? 1 : 0,
        total,
        session.correctCount,
        session.elapsedMs
      );
      await loadTimeRecords();
    },
    [db, includeCombinedKana, loadTimeRecords, quizSize, tab]
  );

  const answerExercise = async (choice: string) => {
    const exercise = quizSession?.questions[quizSession.currentIndex];
    if (!exercise || !quizSession || exerciseChoice || quizSession.finished) return;
    const submittedChoice = normalizeAnswer(choice);
    setExerciseChoice(submittedChoice);
    const correctAnswer = exercise.direction === 'kana_to_romaji' ? exercise.prompt.romaji : exercise.prompt.character;
    const isCorrect = normalizeAnswer(submittedChoice) === normalizeAnswer(correctAnswer);
    await db.runAsync(
      `
      INSERT INTO app_question_attempt_local (
        id, question_id, source_mode, selected_answer, correct_answer,
        is_correct, skill_id, answered_at
      ) VALUES (?, ?, 'kana_exercise', ?, ?, ?, ?, datetime('now'))
      `,
      `${Date.now()}-${Math.random()}`,
      exercise.prompt.id,
      submittedChoice,
      correctAnswer,
      isCorrect ? 1 : 0,
      `kana:${exercise.prompt.script}:${exercise.direction}`
    );
    await updateKanaCardState(exercise.prompt.id, {
      seenDelta: 1,
      correctDelta: isCorrect ? 1 : 0,
      review: isCorrect ? 0 : 1,
      mastered: isCorrect ? exercise.prompt.mastered : 0,
    });
    setQuizSession({
      ...quizSession,
      questions: quizSession.questions,
      correctCount: quizSession.correctCount + (isCorrect ? 1 : 0),
      answers: [
        ...quizSession.answers,
        {
          questionId: exercise.prompt.id,
          selected: submittedChoice,
          correct: correctAnswer,
          isCorrect,
        },
      ],
    });
  };

  const nextExercise = async () => {
    if (!quizSession) return;
    setExerciseChoice(null);
    setDirectInput('');
    const nextIndex = quizSession.currentIndex + 1;
    const finished = nextIndex >= quizSession.questions.length;
    const nextSession = {
      ...quizSession,
      currentIndex: Math.min(nextIndex, quizSession.questions.length - 1),
      finished,
      elapsedMs:
        finished && quizSession.timerEnabled && quizSession.startedAt
          ? Date.now() - quizSession.startedAt
          : quizSession.elapsedMs,
    };
    setQuizSession(nextSession);
    if (finished) {
      await saveKanaTimeRecord(nextSession);
    }
  };

  const quitExercise = () => {
    setQuizSession(null);
    setExerciseChoice(null);
    setDirectInput('');
    setMatchingKanaId(null);
    setMatchingRomaji(null);
  };

  const startQuiz = async () => {
    const baseQuizCards = visibleCards.length >= 4 ? visibleCards : cards;
    let quizCards = baseQuizCards;
    if (includeCombinedKana && tab !== 'combined') {
      const combinedCards = await loadCombinedExerciseCards();
      const byId = new Map<string, KanaCard>();
      [...baseQuizCards, ...combinedCards].forEach((card) => byId.set(card.id, card));
      quizCards = [...byId.values()];
    }
    if (practiceMode === 'matching') {
      const matchingRounds = buildMatchingRounds(quizCards, 5, 5);
      const matchingCards = matchingRounds[0] ?? [];
      setExerciseChoice(null);
      setDirectInput('');
      setMatchingKanaId(null);
      setMatchingRomaji(null);
      setQuizSession({
        questions: [],
        currentIndex: 0,
        correctCount: 0,
        answers: [],
        finished: false,
        matchingCards,
        matchingRounds,
        matchingRoundIndex: 0,
        matchingRoundCount: matchingRounds.length,
        matchingRomajiOrder: shuffle(matchingCards.map((card) => card.romaji)),
        matchingMatchedIds: [],
        matchingMistakes: 0,
        storyCompleted: true,
        practiceMode,
        timerEnabled,
        startedAt: timerEnabled ? Date.now() : undefined,
      });
      return;
    }
    const questions =
      practiceMode === 'confusion'
        ? buildConfusionKanaQuiz(quizCards, quizSize, answerMode)
        : buildKanaQuiz(quizCards, quizSize, exerciseDirection, answerMode);
    const storyCards = practiceMode === 'story' ? questions.slice(0, 5).map((question) => question.prompt) : undefined;
    setExerciseChoice(null);
    setDirectInput('');
    setMatchingKanaId(null);
    setMatchingRomaji(null);
    setQuizSession({
      questions,
      currentIndex: 0,
      correctCount: 0,
      answers: [],
      finished: false,
      storyCards,
      storyCompleted: practiceMode !== 'story',
      practiceMode,
      timerEnabled,
      startedAt: timerEnabled && practiceMode !== 'story' ? Date.now() : undefined,
    });
  };

  const beginStoryQuiz = () => {
    setQuizSession((current) =>
      current
        ? {
            ...current,
            storyCompleted: true,
            startedAt: current.timerEnabled && !current.startedAt ? Date.now() : current.startedAt,
          }
        : current
    );
  };

  const evaluateMatchingPair = async (kanaId: string, romaji: string) => {
    const session = quizSession;
    const card = session?.matchingCards?.find((matchingCard) => matchingCard.id === kanaId);
    if (!session || !card || session.finished) return;
    const alreadyMatched = session.matchingMatchedIds?.includes(kanaId);
    if (alreadyMatched) return;
    const isCorrect = normalizeAnswer(card.romaji) === normalizeAnswer(romaji);
    const nextMatchedIds = isCorrect ? [...(session.matchingMatchedIds ?? []), kanaId] : session.matchingMatchedIds ?? [];
    await updateKanaCardState(card.id, {
      seenDelta: 1,
      correctDelta: isCorrect ? 1 : 0,
      review: isCorrect ? 0 : 1,
      mastered: isCorrect ? card.mastered : 0,
    });
    const roundFinished = nextMatchedIds.length >= (session.matchingCards?.length ?? 0);
    const currentRoundIndex = session.matchingRoundIndex ?? 0;
    const nextRoundIndex = currentRoundIndex + 1;
    const nextRoundCards = session.matchingRounds?.[nextRoundIndex] ?? [];
    const finished = roundFinished && nextRoundIndex >= (session.matchingRoundCount ?? 1);
    const nextSession = {
      ...session,
      currentIndex: roundFinished && !finished ? nextRoundIndex : session.currentIndex,
      correctCount: session.correctCount + (isCorrect ? 1 : 0),
      matchingCards: roundFinished && !finished ? nextRoundCards : session.matchingCards,
      matchingRoundIndex: roundFinished && !finished ? nextRoundIndex : currentRoundIndex,
      matchingRomajiOrder:
        roundFinished && !finished ? shuffle(nextRoundCards.map((nextCard) => nextCard.romaji)) : session.matchingRomajiOrder,
      matchingMatchedIds: roundFinished && !finished ? [] : nextMatchedIds,
      matchingMistakes: (session.matchingMistakes ?? 0) + (isCorrect ? 0 : 1),
      finished,
      elapsedMs:
        finished && session.timerEnabled && session.startedAt
          ? Date.now() - session.startedAt
          : session.elapsedMs,
      answers: [
        ...session.answers,
        {
          questionId: card.id,
          selected: romaji,
          correct: card.romaji,
          isCorrect,
        },
      ],
    };
    setQuizSession(nextSession);
    if (finished) {
      await saveKanaTimeRecord(nextSession);
    }
    setMatchingKanaId(null);
    setMatchingRomaji(null);
  };

  const selectMatchingKana = (kanaId: string) => {
    if (matchingRomaji) {
      void evaluateMatchingPair(kanaId, matchingRomaji);
      return;
    }
    setMatchingKanaId((current) => (current === kanaId ? null : kanaId));
  };

  const selectMatchingRomaji = (romaji: string) => {
    if (matchingKanaId) {
      void evaluateMatchingPair(matchingKanaId, romaji);
      return;
    }
    setMatchingRomaji((current) => (current === romaji ? null : romaji));
  };

  const updateKanaCardState = async (
    kanaId: string,
    changes: {
      favorite?: number;
      review?: number;
      mastered?: number;
      seenDelta?: number;
      correctDelta?: number;
    }
  ) => {
    const current =
      cards.find((card) => card.id === kanaId) ??
      quizSession?.matchingCards?.find((card) => card.id === kanaId) ??
      quizSession?.questions.find((question) => question.prompt.id === kanaId)?.prompt;
    if (!current) return;
    const nextState = {
      favorite: changes.favorite ?? current.favorite,
      review: changes.review ?? current.review,
      mastered: changes.mastered ?? current.mastered,
      seen_count: current.seen_count + (changes.seenDelta ?? 0),
      correct_count: current.correct_count + (changes.correctDelta ?? 0),
    };
    await db.runAsync(
      `
      INSERT INTO app_kana_card_state (
        kana_id, favorite, review, mastered, seen_count, correct_count, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(kana_id) DO UPDATE SET
        favorite = excluded.favorite,
        review = excluded.review,
        mastered = excluded.mastered,
        seen_count = excluded.seen_count,
        correct_count = excluded.correct_count,
        updated_at = excluded.updated_at
      `,
      kanaId,
      nextState.favorite,
      nextState.review,
      nextState.mastered,
      nextState.seen_count,
      nextState.correct_count
    );
    setCards((currentCards) =>
      currentCards.map((card) => (card.id === kanaId ? { ...card, ...nextState } : card))
    );
  };

  const updateKanaMnemonicNote = async (kanaId: string, note: string) => {
    await db.runAsync(
      `
      INSERT INTO app_kana_mnemonic_local (kana_id, note, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(kana_id) DO UPDATE SET
        note = excluded.note,
        updated_at = excluded.updated_at
      `,
      kanaId,
      note
    );
    setCards((currentCards) =>
      currentCards.map((card) => (card.id === kanaId ? { ...card, mnemonic_note: note } : card))
    );
  };

  const shuffleVisibleDeck = () => {
    setCards((currentCards) => shuffle(currentCards));
    setFlippedId(null);
    setFocusIndex(0);
  };

  if (loading) {
    return <LoadingView />;
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.segmented}>
        <SegmentButton label="Apprendre" active={mode === 'learn'} onPress={() => setMode('learn')} />
        <SegmentButton label="Exercices" active={mode === 'exercise'} onPress={() => setMode('exercise')} />
      </View>

      <View style={styles.segmented}>
        <SegmentButton label="Hiragana" active={tab === 'hiragana'} onPress={() => setTab('hiragana')} />
        <SegmentButton label="Katakana" active={tab === 'katakana'} onPress={() => setTab('katakana')} />
      </View>

      <View style={styles.kanaToolbar}>
        <View style={styles.kanaProgressHeader}>
          <Text style={styles.kanaProgressTitle}>{visibleCards.length}/{cards.length} cartes</Text>
          <Text style={styles.kanaProgressHint}>
            Vues {kanaStats.seen} · Maîtrisées {kanaStats.mastered} · À revoir {kanaStats.review}
          </Text>
        </View>
        <View style={styles.kanaProgressTrack}>
          <View
            style={[
              styles.kanaProgressFill,
              { width: `${cards.length ? Math.round((kanaStats.mastered / cards.length) * 100) : 0}%` },
            ]}
          />
        </View>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher un kana, romaji ou mot"
          placeholderTextColor="#8A938F"
          style={styles.searchInput}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBar}>
          <FilterButton label="Tout" active={filter === 'all'} onPress={() => setFilter('all')} />
          <FilterButton label="Connus" active={filter === 'known'} onPress={() => setFilter('known')} />
          <FilterButton label="À revoir" active={filter === 'review'} onPress={() => setFilter('review')} />
          <FilterButton label="Maîtrisés" active={filter === 'mastered'} onPress={() => setFilter('mastered')} />
          <FilterButton label="Jamais vus" active={filter === 'unseen'} onPress={() => setFilter('unseen')} />
        </ScrollView>
        <View style={styles.statusLegend}>
          <View style={styles.statusLegendItem}>
            <View style={[styles.statusLegendDot, styles.thumbnailStatusUnseen]} />
            <Text style={styles.statusLegendText}>Jamais vu</Text>
          </View>
          <View style={styles.statusLegendItem}>
            <View style={[styles.statusLegendDot, styles.thumbnailStatusWeak]} />
            <Text style={styles.statusLegendText}>À revoir</Text>
          </View>
          <View style={styles.statusLegendItem}>
            <View style={[styles.statusLegendDot, styles.thumbnailStatusKnown]} />
            <Text style={styles.statusLegendText}>Connu</Text>
          </View>
          <View style={styles.statusLegendItem}>
            <View style={[styles.statusLegendDot, styles.thumbnailStatusMastered]} />
            <Text style={styles.statusLegendText}>Maîtrisé</Text>
          </View>
        </View>
        <View style={styles.kanaQuickActions}>
          <Pressable style={styles.kanaQuickButton} onPress={openDailySession}>
            <Text style={styles.kanaQuickTitle}>5 minutes Kana</Text>
            <Text style={styles.kanaQuickMeta}>{dailyDeck.length} cartes</Text>
          </Pressable>
          <Pressable style={styles.kanaQuickButton} onPress={openSmartReview}>
            <Text style={styles.kanaQuickTitle}>À travailler maintenant</Text>
            <Text style={styles.kanaQuickMeta}>{smartDeck.length} prioritaires</Text>
          </Pressable>
        </View>
        <View style={styles.kanaToolbarActions}>
          <Pressable
            style={[styles.secondaryButton, displayStyle === 'illustrated' && styles.secondaryButtonActive]}
            onPress={() => setDisplayStyle(displayStyle === 'illustrated' ? 'classic' : 'illustrated')}
          >
            <Text style={[styles.secondaryButtonText, displayStyle === 'illustrated' && styles.secondaryButtonTextActive]}>
              Illustré
            </Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={shuffleVisibleDeck}>
            <Text style={styles.secondaryButtonText}>Mélanger</Text>
          </Pressable>
          <Pressable
            style={[styles.secondaryButton, focusMode && styles.secondaryButtonActive]}
            onPress={() => {
              setFocusMode(!focusMode);
              setFlippedId(null);
              setFocusIndex(0);
            }}
          >
            <Text style={[styles.secondaryButtonText, focusMode && styles.secondaryButtonTextActive]}>
              Mode focus
            </Text>
          </Pressable>
        </View>
      </View>

      {mode === 'learn' ? (
        <>
          <Text style={styles.kanaIntro}>
            Touche une miniature pour ouvrir la carte en plein écran, puis glisse pour passer à la suivante.
          </Text>
          {tab !== 'combined' && (
            <KanaReferenceTable
              tab={tab}
              cards={cards}
              onSelect={(card) => {
                const nextIndex = visibleCards.findIndex((visibleCard) => visibleCard.id === card.id);
                openViewer(nextIndex >= 0 ? nextIndex : 0);
              }}
            />
          )}
          {focusMode && focusedCard ? (
            <View style={styles.focusPanel}>
              {displayStyle === 'illustrated' ? (
                <KanaIllustratedCard
                  card={focusedCard}
                  index={focusIndex}
                  total={visibleCards.length}
                  flipped={flippedId === focusedCard.id}
                  large
                  onPress={() => {
                    setFlippedId(flippedId === focusedCard.id ? null : focusedCard.id);
                    updateKanaCardState(focusedCard.id, { seenDelta: flippedId === focusedCard.id ? 0 : 1 });
                  }}
                  onToggleFavorite={() =>
                    updateKanaCardState(focusedCard.id, { favorite: focusedCard.favorite === 1 ? 0 : 1 })
                  }
                  onReview={() => updateKanaCardState(focusedCard.id, { review: 1, mastered: 0, seenDelta: 1 })}
                  onMastered={() => updateKanaCardState(focusedCard.id, { mastered: 1, review: 0, seenDelta: 1 })}
                />
              ) : (
                <KanaLearningCard
                  card={focusedCard}
                  flipped={flippedId === focusedCard.id}
                  large
                  onPress={() => {
                    setFlippedId(flippedId === focusedCard.id ? null : focusedCard.id);
                    updateKanaCardState(focusedCard.id, { seenDelta: flippedId === focusedCard.id ? 0 : 1 });
                  }}
                  onToggleFavorite={() =>
                    updateKanaCardState(focusedCard.id, { favorite: focusedCard.favorite === 1 ? 0 : 1 })
                  }
                  onReview={() => updateKanaCardState(focusedCard.id, { review: 1, mastered: 0, seenDelta: 1 })}
                  onMastered={() => updateKanaCardState(focusedCard.id, { mastered: 1, review: 0, seenDelta: 1 })}
                />
              )}
              <View style={styles.focusActions}>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => {
                    setFlippedId(null);
                    setFocusIndex(Math.max(0, focusIndex - 1));
                  }}
                >
                  <Text style={styles.secondaryButtonText}>Précédent</Text>
                </Pressable>
                <Text style={styles.focusCounter}>
                  {Math.min(focusIndex + 1, visibleCards.length)}/{visibleCards.length}
                </Text>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => {
                    setFlippedId(null);
                    setFocusIndex(Math.min(Math.max(0, visibleCards.length - 1), focusIndex + 1));
                  }}
                >
                  <Text style={styles.secondaryButtonText}>Suivant</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={displayStyle === 'illustrated' ? styles.illustratedKanaGrid : styles.kanaGrid}>
              {visibleCards.map((card, index) =>
                displayStyle === 'illustrated' ? (
                  <KanaThumbnailCard
                    key={card.id}
                    card={card}
                    index={index}
                    total={visibleCards.length}
                    onPress={() => openViewer(index)}
                  />
                ) : (
                  <KanaLearningCard
                    key={card.id}
                    card={card}
                    flipped={flippedId === card.id}
                    onPress={() => {
                      setFlippedId(flippedId === card.id ? null : card.id);
                      updateKanaCardState(card.id, { seenDelta: flippedId === card.id ? 0 : 1 });
                    }}
                    onToggleFavorite={() =>
                      updateKanaCardState(card.id, { favorite: card.favorite === 1 ? 0 : 1 })
                    }
                    onReview={() => updateKanaCardState(card.id, { review: 1, mastered: 0, seenDelta: 1 })}
                    onMastered={() => updateKanaCardState(card.id, { mastered: 1, review: 0, seenDelta: 1 })}
                  />
                )
              )}
            </View>
          )}
          <KanaCardViewer
            visible={Boolean(viewerCard)}
            card={viewerCard}
            index={safeViewerIndex}
            total={visibleCards.length}
            flipped={Boolean(viewerCard && flippedId === viewerCard.id)}
            panel={viewerPanel}
            onClose={() => {
              setViewerIndex(null);
              setFlippedId(null);
              setViewerPanel('card');
            }}
            onPanelChange={setViewerPanel}
            onToggleFlip={() => {
              if (!viewerCard) return;
              setFlippedId(flippedId === viewerCard.id ? null : viewerCard.id);
            }}
            onSpeak={() => viewerCard && speakKanaCard(viewerCard)}
            onStartQuiz={() => viewerCard && startSingleCardQuiz(viewerCard)}
            onPrevious={showPreviousViewerCard}
            onNext={showNextViewerCard}
            onRandom={showRandomViewerCard}
            onToggleFavorite={() =>
              viewerCard &&
              updateKanaCardState(viewerCard.id, { favorite: viewerCard.favorite === 1 ? 0 : 1 })
            }
            onReview={() =>
              viewerCard && updateKanaCardState(viewerCard.id, { review: 1, mastered: 0, seenDelta: 1 })
            }
            onMastered={() =>
              viewerCard && updateKanaCardState(viewerCard.id, { mastered: 1, review: 0, seenDelta: 1 })
            }
            onMnemonicNoteChange={(note) => viewerCard && updateKanaMnemonicNote(viewerCard.id, note)}
          />
        </>
      ) : (
        <KanaExercisePanel
          session={quizSession}
          quizSize={quizSize}
          direction={exerciseDirection}
          answerMode={answerMode}
          includeCombinedKana={includeCombinedKana}
          timerEnabled={timerEnabled}
          elapsedMs={liveElapsedMs}
          timeRecords={timeRecords}
          availableCount={visibleCards.length}
          selectedChoice={exerciseChoice}
          directInput={directInput}
          selectedMatchingKanaId={matchingKanaId}
          selectedMatchingRomaji={matchingRomaji}
          onQuizSizeChange={setQuizSize}
          onDirectionChange={setExerciseDirection}
          onAnswerModeChange={setAnswerMode}
          onIncludeCombinedKanaChange={setIncludeCombinedKana}
          onTimerEnabledChange={setTimerEnabled}
          practiceMode={practiceMode}
          onPracticeModeChange={setPracticeMode}
          onDirectInputChange={setDirectInput}
          onStart={startQuiz}
          onAnswer={answerExercise}
          onNext={nextExercise}
          onQuit={quitExercise}
          onBeginStoryQuiz={beginStoryQuiz}
          onSelectMatchingKana={selectMatchingKana}
          onSelectMatchingRomaji={selectMatchingRomaji}
        />
      )}
    </ScrollView>
  );
}

function SegmentButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.segmentButton, active && styles.segmentButtonActive]}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </Pressable>
  );
}

function KanaReferenceTable({
  tab,
  cards,
  onSelect,
}: {
  tab: Exclude<KanaTab, 'combined'>;
  cards: KanaCard[];
  onSelect: (card: KanaCard) => void;
}) {
  const rows = tab === 'hiragana' ? HIRAGANA_STANDARD : KATAKANA_STANDARD;
  const cardByCharacter = new Map(cards.map((card) => [card.character, card]));

  return (
    <View style={styles.referenceTable}>
      <View style={styles.referenceHeaderRow}>
        {['a', 'i', 'u', 'e', 'o'].map((label) => (
          <Text key={label} style={styles.referenceHeaderCell}>{label}</Text>
        ))}
      </View>
      {rows.map((row, rowIndex) => (
        <View key={`${tab}-${rowIndex}`} style={styles.referenceRow}>
          {row.map((character, cellIndex) => {
            const card = character ? cardByCharacter.get(character) : undefined;
            if (!character) {
              return <View key={`${rowIndex}-${cellIndex}`} style={styles.referenceEmptyCell} />;
            }
            return (
              <Pressable
                key={character}
                onPress={() => card && onSelect(card)}
                style={[
                  styles.referenceCell,
                  card?.mastered === 1 && styles.referenceCellMastered,
                  card?.review === 1 && styles.referenceCellReview,
                ]}
              >
                <Text style={styles.referenceKana}>{character}</Text>
                <Text style={styles.referenceRomaji}>{card ? card.romaji : ''}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function FilterButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.filterButton, active && styles.filterButtonActive]}>
      <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
    </Pressable>
  );
}

function KanaThumbnailCard({
  card,
  index,
  total,
  onPress,
}: {
  card: KanaCard;
  index: number;
  total: number;
  onPress: () => void;
}) {
  const visual = getKanaVisual(card, index);
  const scriptLabel = card.script === 'hiragana' ? 'Hiragana' : 'Katakana';
  const orderLabel = `${Math.min(index + 1, total)}/${total}`;
  const status = getKanaMasteryStatus(card);
  const exampleBadge = isCombinedKanaFallbackExample(card) ? 'Repère' : 'N5';
  const mnemonic = buildKanaMnemonicSentence(card, visual);

  return (
    <Pressable
      onPress={onPress}
      style={[styles.thumbnailCard, { backgroundColor: visual.background }]}
    >
      <View style={styles.thumbnailArt}>
        <MnemonicArt
          kind={visual.art}
          accent={visual.accent}
          uri={visual.illustrationUri}
          fallback={visual.illustrationFallback}
        />
      </View>
      <View style={styles.thumbnailReadabilityWash} />
      <Text style={styles.thumbnailScript}>{scriptLabel}</Text>
      <Text style={styles.thumbnailCount}>{orderLabel}</Text>
      <Text style={styles.thumbnailN5Badge}>{exampleBadge}</Text>
      <View style={[styles.thumbnailStatusDot, getKanaStatusStyle(status)]} />
      <Text style={styles.thumbnailRomaji}>{capitalizeKanaLabel(card.romaji)}/{card.character}</Text>
      <View style={styles.thumbnailWordBlock}>
        <Text style={styles.thumbnailWordRomaji}>{visual.wordRomaji}</Text>
        <Text style={styles.thumbnailMeaning}>{visual.meaning}</Text>
        <Text style={styles.thumbnailMnemonic} numberOfLines={1}>{mnemonic}</Text>
      </View>
    </Pressable>
  );
}

function KanaCardViewer({
  visible,
  card,
  index,
  total,
  flipped,
  panel,
  onClose,
  onPanelChange,
  onToggleFlip,
  onSpeak,
  onStartQuiz,
  onPrevious,
  onNext,
  onRandom,
  onToggleFavorite,
  onReview,
  onMastered,
  onMnemonicNoteChange,
}: {
  visible: boolean;
  card: KanaCard | null;
  index: number;
  total: number;
  flipped: boolean;
  panel: KanaViewerPanel;
  onClose: () => void;
  onPanelChange: (panel: KanaViewerPanel) => void;
  onToggleFlip: () => void;
  onSpeak: () => void;
  onStartQuiz: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onRandom: () => void;
  onToggleFavorite: () => void;
  onReview: () => void;
  onMastered: () => void;
  onMnemonicNoteChange: (note: string) => void;
}) {
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gestureState) =>
          panel === 'card' &&
          Math.abs(gestureState.dx) > 18 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.25,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          panel === 'card' &&
          Math.abs(gestureState.dx) > 24 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -54) onNext();
          if (gestureState.dx > 54) onPrevious();
        },
      }),
    [onNext, onPrevious, panel]
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={styles.viewerScreen}>
        <View style={styles.viewerHeader}>
          <Pressable style={styles.viewerCloseButton} onPress={onClose}>
            <Text style={styles.viewerCloseText}>Fermer</Text>
          </Pressable>
          <Text style={styles.viewerCounter}>{total > 0 ? `${index + 1}/${total}` : '0/0'}</Text>
          <Pressable style={styles.viewerRandomButton} onPress={onRandom}>
            <Text style={styles.viewerRandomText}>Aléatoire</Text>
          </Pressable>
        </View>

        <View style={styles.viewerModeTabs}>
          <Pressable
            style={[styles.viewerModeButton, panel === 'card' && styles.viewerModeButtonActive]}
            onPress={() => onPanelChange('card')}
          >
            <Text style={[styles.viewerModeText, panel === 'card' && styles.viewerModeTextActive]}>Carte</Text>
          </Pressable>
          <Pressable
            style={[styles.viewerModeButton, panel === 'trace' && styles.viewerModeButtonActive]}
            onPress={() => onPanelChange('trace')}
          >
            <Text style={[styles.viewerModeText, panel === 'trace' && styles.viewerModeTextActive]}>Tracé</Text>
          </Pressable>
          <Pressable style={styles.viewerModeButton} onPress={onSpeak}>
            <Text style={styles.viewerModeText}>Audio</Text>
          </Pressable>
          <Pressable style={styles.viewerModeButton} onPress={onStartQuiz}>
            <Text style={styles.viewerModeText}>Quiz</Text>
          </Pressable>
        </View>

        <View style={styles.viewerCardArea}>
          <View style={styles.viewerSwipeZone} {...panResponder.panHandlers}>
            {card && panel === 'card' ? (
            <KanaIllustratedCard
              card={card}
              index={index}
              total={total}
              flipped={flipped}
              large
              onPress={onToggleFlip}
              onToggleFavorite={onToggleFavorite}
              onReview={onReview}
              onMastered={onMastered}
            />
          ) : card ? (
            <KanaTracePanel card={card} />
          ) : (
            <EmptyText text="Aucune carte à afficher." />
            )}
          </View>
        </View>
        {card && (
          <TextInput
            value={card.mnemonic_note ?? ''}
            onChangeText={onMnemonicNoteChange}
            placeholder="Note mémo personnelle"
            placeholderTextColor="#B8C0BC"
            style={styles.viewerMnemonicInput}
          />
        )}

        <View style={styles.viewerToolActions}>
          <Pressable style={styles.viewerToolButton} onPress={onSpeak}>
            <Text style={styles.viewerToolText}>Écouter</Text>
          </Pressable>
          <Pressable style={styles.viewerToolButton} onPress={onStartQuiz}>
            <Text style={styles.viewerToolText}>Quiz carte</Text>
          </Pressable>
        </View>

        <View style={styles.viewerActions}>
          <Pressable style={styles.viewerNavButton} onPress={onPrevious}>
            <Text style={styles.viewerNavText}>Précédent</Text>
          </Pressable>
          <Pressable
            style={styles.viewerNavButton}
            onPress={() => onPanelChange(panel === 'trace' ? 'card' : 'trace')}
          >
            <Text style={styles.viewerNavText}>{panel === 'trace' ? 'Carte' : 'Tracer'}</Text>
          </Pressable>
          <Pressable style={[styles.viewerNavButton, styles.viewerNavButtonStrong]} onPress={onNext}>
            <Text style={[styles.viewerNavText, styles.viewerNavTextStrong]}>Suivant</Text>
          </Pressable>
        </View>
        <Text style={styles.viewerHint}>Glisse à gauche ou à droite pour changer de carte.</Text>
      </SafeAreaView>
    </Modal>
  );
}

const TRACE_GUIDES: Record<string, TraceGuideArrow[]> = {
  あ: [
    { label: '1', start: { x: 88, y: 76 }, end: { x: 214, y: 76 } },
    { label: '2', start: { x: 153, y: 44 }, end: { x: 126, y: 232 } },
    { label: '3', start: { x: 182, y: 132 }, end: { x: 94, y: 218 } },
  ],
  い: [
    { label: '1', start: { x: 106, y: 70 }, end: { x: 118, y: 218 } },
    { label: '2', start: { x: 196, y: 78 }, end: { x: 218, y: 182 } },
  ],
  う: [{ label: '1', start: { x: 92, y: 78 }, end: { x: 214, y: 196 } }],
  え: [
    { label: '1', start: { x: 98, y: 78 }, end: { x: 194, y: 78 } },
    { label: '2', start: { x: 96, y: 136 }, end: { x: 216, y: 214 } },
  ],
  お: [
    { label: '1', start: { x: 92, y: 80 }, end: { x: 210, y: 80 } },
    { label: '2', start: { x: 148, y: 46 }, end: { x: 128, y: 224 } },
    { label: '3', start: { x: 190, y: 56 }, end: { x: 224, y: 112 } },
  ],
  か: [
    { label: '1', start: { x: 92, y: 88 }, end: { x: 190, y: 220 } },
    { label: '2', start: { x: 164, y: 76 }, end: { x: 224, y: 172 } },
    { label: '3', start: { x: 216, y: 62 }, end: { x: 242, y: 106 } },
  ],
  き: [
    { label: '1', start: { x: 88, y: 70 }, end: { x: 214, y: 70 } },
    { label: '2', start: { x: 84, y: 118 }, end: { x: 220, y: 118 } },
    { label: '3', start: { x: 132, y: 42 }, end: { x: 176, y: 218 } },
  ],
  く: [{ label: '1', start: { x: 190, y: 54 }, end: { x: 96, y: 150 } }],
  け: [
    { label: '1', start: { x: 82, y: 70 }, end: { x: 80, y: 220 } },
    { label: '2', start: { x: 132, y: 90 }, end: { x: 226, y: 90 } },
    { label: '3', start: { x: 178, y: 58 }, end: { x: 156, y: 228 } },
  ],
  こ: [
    { label: '1', start: { x: 96, y: 96 }, end: { x: 208, y: 96 } },
    { label: '2', start: { x: 90, y: 198 }, end: { x: 216, y: 198 } },
  ],
};

function getTraceGuideArrows(character: string): TraceGuideArrow[] {
  const firstCharacter = character[0] ?? '';
  if (TRACE_GUIDES[firstCharacter]) return TRACE_GUIDES[firstCharacter];
  if (character.length > 1) {
    return [
      { label: '1', start: { x: 78, y: 88 }, end: { x: 142, y: 88 } },
      { label: '2', start: { x: 92, y: 142 }, end: { x: 148, y: 214 } },
      { label: '3', start: { x: 180, y: 86 }, end: { x: 224, y: 206 } },
    ];
  }
  return [
    { label: '1', start: { x: 92, y: 76 }, end: { x: 208, y: 76 } },
    { label: '2', start: { x: 112, y: 120 }, end: { x: 202, y: 210 } },
  ];
}

function pointsToSvgPath(points: TracePoint[]): string {
  if (points.length === 0) return '';
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ');
}

function TraceGuideArrow({ arrow }: { arrow: TraceGuideArrow }) {
  const dx = arrow.end.x - arrow.start.x;
  const dy = arrow.end.y - arrow.start.y;
  const angle = Math.atan2(dy, dx);
  const headLength = 13;
  const left = {
    x: arrow.end.x - headLength * Math.cos(angle - Math.PI / 6),
    y: arrow.end.y - headLength * Math.sin(angle - Math.PI / 6),
  };
  const right = {
    x: arrow.end.x - headLength * Math.cos(angle + Math.PI / 6),
    y: arrow.end.y - headLength * Math.sin(angle + Math.PI / 6),
  };

  return (
    <G>
      <Line
        x1={arrow.start.x}
        y1={arrow.start.y}
        x2={arrow.end.x}
        y2={arrow.end.y}
        stroke="#C83543"
        strokeWidth="5"
        strokeLinecap="round"
        opacity="0.78"
      />
      <Polygon
        points={`${arrow.end.x},${arrow.end.y} ${left.x},${left.y} ${right.x},${right.y}`}
        fill="#C83543"
        opacity="0.9"
      />
      <Circle cx={arrow.start.x} cy={arrow.start.y} r="13" fill="#FFFFFF" stroke="#C83543" strokeWidth="3" />
      <SvgText x={arrow.start.x} y={arrow.start.y + 5} fill="#C83543" fontSize="13" fontWeight="900" textAnchor="middle">
        {arrow.label}
      </SvgText>
    </G>
  );
}

function KanaTracePanel({ card }: { card: KanaCard }) {
  const [strokes, setStrokes] = useState<TraceStroke[]>([]);
  const [padSize, setPadSize] = useState({ width: 300, height: 300 });
  const lastPointRef = useRef<TracePoint | null>(null);

  useEffect(() => {
    setStrokes([]);
    lastPointRef.current = null;
  }, [card.id]);

  const normalizeTracePoint = useCallback(
    (x: number, y: number): TracePoint => ({
      x: Math.max(0, Math.min(300, (x / Math.max(1, padSize.width)) * 300)),
      y: Math.max(0, Math.min(300, (y / Math.max(1, padSize.height)) * 300)),
    }),
    [padSize.height, padSize.width]
  );

  const traceResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          const point = normalizeTracePoint(event.nativeEvent.locationX, event.nativeEvent.locationY);
          lastPointRef.current = point;
          setStrokes((current) => [...current.slice(-3), { id: `${Date.now()}-${Math.random()}`, points: [point] }]);
        },
        onPanResponderMove: (event) => {
          const point = normalizeTracePoint(event.nativeEvent.locationX, event.nativeEvent.locationY);
          const previous = lastPointRef.current;
          if (previous && Math.hypot(point.x - previous.x, point.y - previous.y) < 5) return;
          lastPointRef.current = point;
          setStrokes((current) => {
            const next = [...current];
            const latest = next[next.length - 1];
            if (!latest) return [{ id: `${Date.now()}-${Math.random()}`, points: [point] }];
            next[next.length - 1] = {
              ...latest,
              points: [...latest.points.slice(-90), point],
            };
            return next;
          });
        },
        onPanResponderRelease: () => {
          lastPointRef.current = null;
        },
        onPanResponderTerminate: () => {
          lastPointRef.current = null;
        },
      }),
    [normalizeTracePoint]
  );
  const traceArrows = getTraceGuideArrows(card.character);
  const handlePadLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setPadSize({ width, height });
  }, []);

  return (
    <View style={styles.tracePanel}>
      <Text style={styles.traceTitle}>{card.character}</Text>
      <Text style={styles.traceSubtitle}>Suis les flèches numérotées, puis trace par-dessus le modèle.</Text>
      <View style={styles.tracePad} onLayout={handlePadLayout} {...traceResponder.panHandlers}>
        <Text style={styles.traceGhost}>{card.character}</Text>
        <View style={styles.traceCenterLineVertical} />
        <View style={styles.traceCenterLineHorizontal} />
        <Svg width="100%" height="100%" viewBox="0 0 300 300" style={styles.traceSvg}>
          {traceArrows.map((arrow) => (
            <TraceGuideArrow key={`${card.character}-${arrow.label}`} arrow={arrow} />
          ))}
          {strokes.map((stroke) => {
            const path = pointsToSvgPath(stroke.points);
            return path ? (
              <Path
                key={stroke.id}
                d={path}
                fill="none"
                stroke="#A34B35"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null;
          })}
        </Svg>
      </View>
      <View style={styles.traceActions}>
        <Pressable style={styles.viewerNavButton} onPress={() => setStrokes([])}>
          <Text style={styles.viewerNavText}>Effacer</Text>
        </Pressable>
      </View>
    </View>
  );
}

function KanaIllustratedCard({
  card,
  index,
  total,
  flipped,
  large = false,
  onPress,
  onToggleFavorite,
  onReview,
  onMastered,
}: {
  card: KanaCard;
  index: number;
  total: number;
  flipped: boolean;
  large?: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
  onReview: () => void;
  onMastered: () => void;
}) {
  const visual = getKanaVisual(card, index);
  const scriptLabel = card.script === 'hiragana' ? 'Hiragana' : 'Katakana';
  const orderLabel = `${Math.min(index + 1, total)}/${total}`;
  const exampleBadge = isCombinedKanaFallbackExample(card) ? 'Mot repère' : 'N5 vérifié';
  const mnemonic = buildKanaMnemonicSentence(card, visual);

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.illustratedCard,
        large && styles.illustratedCardLarge,
        { backgroundColor: visual.background },
      ]}
    >
      {!flipped ? (
        <>
          <View style={styles.illustratedTopRow}>
            <View>
              <Text style={styles.illustratedScript}>{scriptLabel}</Text>
              <Text style={styles.illustratedCount}>{orderLabel}</Text>
            </View>
            <Text style={styles.illustratedN5Badge}>{exampleBadge}</Text>
            <Text style={styles.illustratedRomaji}>{capitalizeKanaLabel(card.romaji)}/{card.character}</Text>
          </View>
          <View style={styles.illustrationLayer}>
            <MnemonicArt
              kind={visual.art}
              accent={visual.accent}
              uri={visual.illustrationUri}
              fallback={visual.illustrationFallback}
            />
          </View>
          <View style={styles.illustrationReadabilityWash} />
          <Text style={[styles.illustratedKana, large && styles.illustratedKanaLarge]}>{card.character}</Text>
          <View style={styles.illustratedBottom}>
            <Text style={styles.illustratedWordKana}>{visual.wordKana}</Text>
            <Text style={styles.illustratedWordRomaji}>{visual.wordRomaji}</Text>
            <Text style={styles.illustratedWordMeaning}>{visual.meaning}</Text>
            <Text style={styles.illustratedMnemonic} numberOfLines={2}>{mnemonic}</Text>
          </View>
        </>
      ) : (
        <>
          <Text style={styles.illustratedBackRomaji}>{card.romaji}</Text>
          <Text style={styles.illustratedBackTitle}>Carte mémoire</Text>
          <Text style={styles.illustratedBackText}>{card.character} se lit {card.romaji}.</Text>
          <View style={styles.illustratedBackVocabulary}>
            <Text style={styles.illustratedBackKana}>{visual.wordKana}</Text>
            <Text style={styles.illustratedBackWord}>{visual.wordRomaji}</Text>
            <Text style={styles.illustratedBackMeaning}>{visual.meaning}</Text>
            <Text style={styles.illustratedBackMnemonic}>{mnemonic}</Text>
          </View>
          <View style={styles.kanaCardActions}>
            <Pressable
              style={styles.kanaActionButton}
              onPress={(event) => {
                event.stopPropagation();
                onToggleFavorite();
              }}
            >
              <Text style={styles.kanaActionText}>{card.favorite === 1 ? 'Retirer' : 'Connu'}</Text>
            </Pressable>
            <Pressable
              style={styles.kanaActionButton}
              onPress={(event) => {
                event.stopPropagation();
                onReview();
              }}
            >
              <Text style={styles.kanaActionText}>À revoir</Text>
            </Pressable>
            <Pressable
              style={[styles.kanaActionButton, styles.kanaActionStrong]}
              onPress={(event) => {
                event.stopPropagation();
                onMastered();
              }}
            >
              <Text style={[styles.kanaActionText, styles.kanaActionStrongText]}>Maîtrisé</Text>
            </Pressable>
          </View>
        </>
      )}
    </Pressable>
  );
}

function MnemonicArt({
  kind,
  accent,
  uri,
  fallback,
}: {
  kind: string;
  accent: string;
  uri?: string;
  fallback: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  if (uri && !imageFailed) {
    return (
      <Image
        source={{ uri }}
        resizeMode="contain"
        style={styles.mnemonicImage as ImageStyle}
        onError={() => setImageFailed(true)}
      />
    );
  }

  if (!fallback) return null;

  return <Text style={styles.mnemonicFallback}>{fallback}</Text>;

  return (
    <Svg width="100%" height="100%" viewBox="0 0 220 220">
      {kind === 'umbrella' && (
        <>
          <Path d="M55 92 Q110 36 165 92 Z" fill={accent} opacity={0.55} />
          <Line x1="110" y1="92" x2="110" y2="180" stroke={accent} strokeWidth="8" />
          <Path d="M110 180 Q124 204 142 184" fill="none" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <Line x1="70" y1="104" x2="42" y2="128" stroke={accent} strokeWidth="4" opacity={0.65} />
          <Line x1="151" y1="104" x2="182" y2="126" stroke={accent} strokeWidth="4" opacity={0.65} />
        </>
      )}
      {kind === 'life' && (
        <>
          <Path d="M54 158 C46 86 92 42 122 84 C147 118 109 142 164 160" fill="none" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <Ellipse cx="166" cy="82" rx="21" ry="30" fill={accent} opacity={0.85} />
          <Line x1="141" y1="104" x2="183" y2="130" stroke={accent} strokeWidth="7" />
        </>
      )}
      {kind === 'hit' && (
        <>
          <Path d="M56 136 L28 160 L64 162 L50 190 L90 160" fill="none" stroke={accent} strokeWidth="6" strokeLinejoin="round" />
          <Line x1="72" y1="70" x2="160" y2="100" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <Polygon points="72,134 92,116 102,142 132,128 116,158 136,178 102,168 82,190 84,158" fill="none" stroke={accent} strokeWidth="5" />
        </>
      )}
      {kind === 'eternity' && (
        <>
          <Path d="M54 126 C54 84 98 84 110 126 C122 168 166 168 166 126 C166 84 122 84 110 126 C98 168 54 168 54 126Z" fill="none" stroke={accent} strokeWidth="9" />
          <Circle cx="74" cy="78" r="11" fill={accent} opacity={0.75} />
          <Line x1="52" y1="48" x2="80" y2="88" stroke={accent} strokeWidth="4" />
        </>
      )}
      {kind === 'big' && (
        <>
          <Circle cx="112" cy="116" r="42" fill={accent} opacity={0.35} />
          <Circle cx="92" cy="104" r="10" fill={accent} />
          <Circle cx="132" cy="104" r="10" fill={accent} />
          <Path d="M83 142 Q112 165 141 142" fill="none" stroke={accent} strokeWidth="7" strokeLinecap="round" />
          <Line x1="76" y1="66" x2="56" y2="38" stroke={accent} strokeWidth="7" />
          <Line x1="146" y1="66" x2="166" y2="38" stroke={accent} strokeWidth="7" />
        </>
      )}
      {kind === 'turtle' && (
        <>
          <Ellipse cx="112" cy="124" rx="52" ry="38" fill={accent} opacity={0.55} />
          <Circle cx="164" cy="116" r="17" fill={accent} opacity={0.55} />
          <Line x1="86" y1="96" x2="134" y2="150" stroke={accent} strokeWidth="5" opacity={0.85} />
          <Line x1="136" y1="96" x2="88" y2="150" stroke={accent} strokeWidth="5" opacity={0.85} />
          <Line x1="76" y1="150" x2="56" y2="174" stroke={accent} strokeWidth="7" strokeLinecap="round" />
          <Line x1="148" y1="150" x2="168" y2="174" stroke={accent} strokeWidth="7" strokeLinecap="round" />
        </>
      )}
      {kind === 'gold' && (
        <>
          <Rect x="60" y="78" width="100" height="54" rx="8" fill={accent} opacity={0.85} />
          <Rect x="72" y="60" width="76" height="22" rx="5" fill={accent} opacity={0.65} />
          <Line x1="74" y1="104" x2="146" y2="104" stroke="#FFFFFF" strokeWidth="5" opacity={0.55} />
          <Path d="M74 150 Q112 176 150 150" fill="none" stroke={accent} strokeWidth="6" />
        </>
      )}
      {kind === 'shoe' && (
        <>
          <Path d="M58 128 C84 142 126 142 164 126 L178 148 C132 174 76 166 42 146 Z" fill={accent} opacity={0.65} />
          <Circle cx="170" cy="112" r="9" fill={accent} />
          <Path d="M58 128 C50 98 74 76 98 88" fill="none" stroke={accent} strokeWidth="7" strokeLinecap="round" />
        </>
      )}
      {kind === 'sword' && (
        <>
          <Line x1="40" y1="124" x2="172" y2="78" stroke={accent} strokeWidth="12" strokeLinecap="round" />
          <Polygon points="172,78 196,66 184,92" fill={accent} />
          <Line x1="84" y1="108" x2="104" y2="164" stroke={accent} strokeWidth="9" strokeLinecap="round" />
          <Line x1="70" y1="142" x2="116" y2="126" stroke={accent} strokeWidth="7" strokeLinecap="round" />
        </>
      )}
      {kind === 'mast' && (
        <>
          <Polygon points="78,64 154,84 78,112" fill={accent} opacity={0.35} />
          <Line x1="82" y1="54" x2="82" y2="176" stroke={accent} strokeWidth="8" />
          <Path d="M82 176 L46 184 L128 184 Z" fill={accent} opacity={0.5} />
          <Line x1="82" y1="62" x2="154" y2="84" stroke={accent} strokeWidth="4" />
        </>
      )}
      {!['umbrella', 'life', 'hit', 'eternity', 'big', 'turtle', 'gold', 'shoe', 'sword', 'mast'].includes(kind) && (
        <>
          <Circle cx="110" cy="110" r="54" fill={accent} opacity={0.28} />
          <Line x1="66" y1="154" x2="154" y2="66" stroke={accent} strokeWidth="8" strokeLinecap="round" opacity={0.7} />
          <Circle cx="154" cy="66" r="12" fill={accent} opacity={0.75} />
        </>
      )}
    </Svg>
  );
}

function KanaLearningCard({
  card,
  flipped,
  large = false,
  onPress,
  onToggleFavorite,
  onReview,
  onMastered,
}: {
  card: KanaCard;
  flipped: boolean;
  large?: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
  onReview: () => void;
  onMastered: () => void;
}) {
  const firstExample = card.examples[0];
  const associatedKanji = firstExample?.kanji ?? firstExample?.japanese ?? 'Aucun mot trouvé';
  const successRate = card.seen_count > 0 ? Math.round((card.correct_count / card.seen_count) * 100) : 0;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.kanaCard,
        large && styles.kanaCardLarge,
        flipped && styles.kanaCardFlipped,
        card.mastered === 1 && styles.kanaCardMastered,
        card.review === 1 && styles.kanaCardReview,
      ]}
    >
      {!flipped ? (
        <>
          <View style={styles.kanaStatusRow}>
            <Text style={styles.kanaStatusText}>{card.favorite === 1 ? 'Connu' : ' '}</Text>
            <Text style={styles.kanaStatusText}>{card.mastered === 1 ? 'Maîtrisé' : card.review === 1 ? 'À revoir' : ' '}</Text>
          </View>
          <Text style={styles.kanaCharacter}>{card.character}</Text>
          <Text style={styles.kanaScript}>{card.script === 'hiragana' ? 'Hiragana' : 'Katakana'}</Text>
          {card.seen_count > 0 && <Text style={styles.kanaMiniStat}>{successRate}% · {card.seen_count} vues</Text>}
        </>
      ) : (
        <>
          <Text style={styles.kanaRomaji}>{card.romaji}</Text>
          <Text style={styles.kanaBackLabel}>Kanji / mot associé</Text>
          <Text style={styles.kanaAssociated}>{associatedKanji}</Text>
          {card.examples.length > 0 ? (
            card.examples.map((example) => (
              <Text key={example.id} style={styles.kanaExample} numberOfLines={2}>
                {formatVocabularyExample(example)}
              </Text>
            ))
          ) : (
            <Text style={styles.kanaExample}>Aucun exemple N5 dans la base</Text>
          )}
          <View style={styles.kanaCardActions}>
            <Pressable
              style={styles.kanaActionButton}
              onPress={(event) => {
                event.stopPropagation();
                onToggleFavorite();
              }}
            >
              <Text style={styles.kanaActionText}>{card.favorite === 1 ? 'Retirer' : 'Connu'}</Text>
            </Pressable>
            <Pressable
              style={styles.kanaActionButton}
              onPress={(event) => {
                event.stopPropagation();
                onReview();
              }}
            >
              <Text style={styles.kanaActionText}>À revoir</Text>
            </Pressable>
            <Pressable
              style={[styles.kanaActionButton, styles.kanaActionStrong]}
              onPress={(event) => {
                event.stopPropagation();
                onMastered();
              }}
            >
              <Text style={[styles.kanaActionText, styles.kanaActionStrongText]}>Maîtrisé</Text>
            </Pressable>
          </View>
        </>
      )}
    </Pressable>
  );
}

function KanaExercisePanel({
  session,
  quizSize,
  direction,
  answerMode,
  includeCombinedKana,
  timerEnabled,
  elapsedMs,
  timeRecords,
  availableCount,
  selectedChoice,
  directInput,
  selectedMatchingKanaId,
  selectedMatchingRomaji,
  onQuizSizeChange,
  onDirectionChange,
  onAnswerModeChange,
  onIncludeCombinedKanaChange,
  onTimerEnabledChange,
  practiceMode,
  onPracticeModeChange,
  onDirectInputChange,
  onStart,
  onAnswer,
  onNext,
  onQuit,
  onBeginStoryQuiz,
  onSelectMatchingKana,
  onSelectMatchingRomaji,
}: {
  session: KanaQuizSession | null;
  quizSize: KanaQuizSize;
  direction: KanaExerciseDirection;
  answerMode: KanaQuizAnswerMode;
  includeCombinedKana: boolean;
  timerEnabled: boolean;
  elapsedMs?: number;
  timeRecords: KanaTimeRecord[];
  availableCount: number;
  selectedChoice: string | null;
  directInput: string;
  selectedMatchingKanaId: string | null;
  selectedMatchingRomaji: string | null;
  onQuizSizeChange: (size: KanaQuizSize) => void;
  onDirectionChange: (direction: KanaExerciseDirection) => void;
  onAnswerModeChange: (mode: KanaQuizAnswerMode) => void;
  onIncludeCombinedKanaChange: (include: boolean) => void;
  onTimerEnabledChange: (enabled: boolean) => void;
  practiceMode: KanaPracticeMode;
  onPracticeModeChange: (mode: KanaPracticeMode) => void;
  onDirectInputChange: (value: string) => void;
  onStart: () => void | Promise<void>;
  onAnswer: (choice: string) => void;
  onNext: () => void | Promise<void>;
  onQuit: () => void;
  onBeginStoryQuiz: () => void;
  onSelectMatchingKana: (kanaId: string) => void;
  onSelectMatchingRomaji: (romaji: string) => void;
}) {
  const practiceMemo = getKanaPracticeMemo(practiceMode);
  const minRequiredCards = practiceMode === 'matching' ? 5 : 4;
  const readyLabel =
    practiceMode === 'matching'
      ? '25 paires prêtes'
      : `${Math.min(quizSize, availableCount)} questions prêtes`;

  if (!session) {
    return (
      <View style={styles.kanaExercisePanel}>
        <Section title="Questionnaire kana">
          <Text style={styles.kanaIntro}>
            Choisis la taille et le sens du questionnaire. Les questions sont tirées au hasard dans le deck et les filtres actifs.
          </Text>
          <View style={styles.segmented}>
            <SegmentButton label="10 questions" active={quizSize === 10} onPress={() => onQuizSizeChange(10)} />
            <SegmentButton label="20 questions" active={quizSize === 20} onPress={() => onQuizSizeChange(20)} />
          </View>
          <View style={styles.segmented}>
            <SegmentButton
              label="Sons simples"
              active={!includeCombinedKana}
              onPress={() => onIncludeCombinedKanaChange(false)}
            />
            <SegmentButton
              label="Avec combinés"
              active={includeCombinedKana}
              onPress={() => onIncludeCombinedKanaChange(true)}
            />
          </View>
          <View style={styles.segmented}>
            <SegmentButton label="Standard" active={practiceMode === 'standard'} onPress={() => onPracticeModeChange('standard')} />
            <SegmentButton label="Histoire" active={practiceMode === 'story'} onPress={() => onPracticeModeChange('story')} />
            <SegmentButton label="Confusions" active={practiceMode === 'confusion'} onPress={() => onPracticeModeChange('confusion')} />
            <SegmentButton label="Association" active={practiceMode === 'matching'} onPress={() => onPracticeModeChange('matching')} />
          </View>
          <View style={styles.segmented}>
            <SegmentButton
              label="QCM"
              active={answerMode === 'multiple_choice'}
              onPress={() => onAnswerModeChange('multiple_choice')}
            />
            <SegmentButton
              label="Réponse directe"
              active={answerMode === 'direct_input'}
              onPress={() => onAnswerModeChange('direct_input')}
            />
          </View>
          <View style={styles.segmented}>
            <SegmentButton
              label="Kana → romaji"
              active={direction === 'kana_to_romaji'}
              onPress={() => onDirectionChange('kana_to_romaji')}
            />
            <SegmentButton
              label="Romaji → kana"
              active={direction === 'romaji_to_kana'}
              onPress={() => onDirectionChange('romaji_to_kana')}
            />
          </View>
          <Pressable
            style={[styles.timerToggle, timerEnabled && styles.timerToggleActive]}
            onPress={() => onTimerEnabledChange(!timerEnabled)}
          >
            <View style={[styles.timerSwitch, timerEnabled && styles.timerSwitchActive]}>
              <View style={[styles.timerSwitchKnob, timerEnabled && styles.timerSwitchKnobActive]} />
            </View>
            <View style={styles.timerToggleCopy}>
              <Text style={styles.timerToggleTitle}>Chronomètre</Text>
              <Text style={styles.timerToggleText}>
                {timerEnabled
                  ? 'Activé : ton temps sera affiché et classé.'
                  : 'Désactivé : entraînement sans pression de temps.'}
              </Text>
            </View>
          </Pressable>
          <View style={styles.quizConfigCard}>
            <Text style={styles.quizConfigTitle}>{readyLabel}</Text>
            <Text style={styles.quizConfigMode}>{practiceMemo.title}</Text>
            <Text style={styles.quizConfigText}>{practiceMemo.description}</Text>
            <Text style={styles.quizConfigText}>
              Deck disponible : {availableCount} cartes. Le questionnaire évite les doublons quand le deck est assez grand.
            </Text>
          </View>
          <Pressable
            disabled={availableCount < minRequiredCards}
            style={[styles.primaryButton, availableCount < minRequiredCards && styles.primaryButtonDisabled]}
            onPress={onStart}
          >
            <Text style={styles.primaryButtonText}>Démarrer le questionnaire</Text>
          </Pressable>
        </Section>
      </View>
    );
  }

  if (session.finished) {
    const total = session.practiceMode === 'matching' ? getMatchingTotalCount(session) : session.questions.length;
    const percent = total > 0 ? Math.round((session.correctCount / total) * 100) : 0;
    return (
      <View style={styles.kanaExercisePanel}>
        <View style={styles.resultCard}>
          <Text style={styles.resultKicker}>Résultat</Text>
          <Text style={styles.resultScore}>{session.correctCount}/{total}</Text>
          <Text style={styles.resultPercent}>{percent}% de réussite</Text>
          {session.practiceMode === 'matching' && (
            <Text style={styles.resultTime}>Erreurs : {session.matchingMistakes ?? 0}</Text>
          )}
          {session.timerEnabled && (
            <Text style={styles.resultTime}>Temps : {formatElapsedTime(session.elapsedMs ?? elapsedMs ?? 0)}</Text>
          )}
        </View>
        {session.timerEnabled && (
          <Section title="Classement chrono">
            <View style={styles.timeRankingCard}>
              {timeRecords.length === 0 ? (
                <Text style={styles.quizConfigText}>Premier temps enregistré pour cette configuration.</Text>
              ) : (
                timeRecords.map((record, index) => (
                  <View key={record.id} style={styles.timeRankingRow}>
                    <Text style={styles.timeRankingRank}>#{index + 1}</Text>
                    <Text style={styles.timeRankingTime}>{formatElapsedTime(record.elapsed_ms)}</Text>
                    <Text style={styles.timeRankingMeta}>
                      {record.correct_count}/{record.total_count} juste{record.correct_count > 1 ? 's' : ''}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </Section>
        )}
        <Section title="Correction rapide">
          {session.answers.map((answer, index) => (
            <View key={`${answer.questionId}-${index}`} style={styles.answerReviewRow}>
              <Text style={styles.answerReviewIndex}>{index + 1}</Text>
              <Text style={styles.answerReviewText}>
                Ta réponse : {answer.selected} · Correct : {answer.correct}
              </Text>
              <Text style={[styles.answerReviewStatus, answer.isCorrect ? styles.answerOk : styles.answerKo]}>
                {answer.isCorrect ? 'OK' : 'À revoir'}
              </Text>
            </View>
          ))}
        </Section>
        <Pressable style={styles.primaryButton} onPress={onStart}>
          <Text style={styles.primaryButtonText}>Recommencer</Text>
        </Pressable>
        <Pressable style={styles.secondaryFullButton} onPress={onQuit}>
          <Text style={styles.secondaryFullButtonText}>Quitter</Text>
        </Pressable>
      </View>
    );
  }

  if (session.storyCards && session.storyCompleted === false) {
    return (
      <View style={styles.kanaExercisePanel}>
        <Section title="Mémorise l'histoire">
          <Text style={styles.kanaIntro}>
            Observe ces cartes, associe le dessin au son, puis lance le quiz. Les mêmes cartes reviennent juste après.
          </Text>
          <View style={styles.storyCardGrid}>
            {session.storyCards.map((card, index) => {
              const visual = getKanaVisual(card, index);
              return (
                <View key={card.id} style={[styles.storyMemoCard, { backgroundColor: visual.background }]}>
                  <Text style={styles.storyKana}>{card.character}</Text>
                  <Text style={styles.storyRomaji}>{card.romaji}</Text>
                  <Text style={styles.storyMnemonic} numberOfLines={3}>
                    {buildKanaMnemonicSentence(card, visual)}
                  </Text>
                </View>
              );
            })}
          </View>
          <Pressable style={styles.primaryButton} onPress={onBeginStoryQuiz}>
            <Text style={styles.primaryButtonText}>Commencer le quiz</Text>
          </Pressable>
          <Pressable style={styles.secondaryFullButton} onPress={onQuit}>
            <Text style={styles.secondaryFullButtonText}>Quitter</Text>
          </Pressable>
        </Section>
      </View>
    );
  }

  if (session.practiceMode === 'matching' && session.matchingCards) {
    const matchedIds = new Set(session.matchingMatchedIds ?? []);
    const total = session.matchingCards.length;
    const matchedCount = matchedIds.size;
    const roundIndex = session.matchingRoundIndex ?? 0;
    const roundCount = session.matchingRoundCount ?? 1;
    const totalPairs = getMatchingTotalCount(session);
    return (
      <View style={styles.kanaExercisePanel}>
        <View style={styles.quizHeaderRow}>
          <Text style={styles.questionMeta}>Association manche {roundIndex + 1}/{roundCount}</Text>
          <View style={styles.quizHeaderStats}>
            {session.timerEnabled && <Text style={styles.quizTimerPill}>{formatElapsedTime(elapsedMs ?? 0)}</Text>}
            <Text style={styles.quizScorePill}>{session.correctCount}/{totalPairs} paires</Text>
          </View>
        </View>
        <Text style={styles.questionTitle}>Associe les 5 kana de cette manche à leur romaji</Text>
        <View style={styles.matchingBoard}>
          <View style={styles.matchingColumn}>
            {session.matchingCards.map((card) => {
              const matched = matchedIds.has(card.id);
              const selected = selectedMatchingKanaId === card.id;
              return (
                <Pressable
                  key={card.id}
                  disabled={matched}
                  onPress={() => onSelectMatchingKana(card.id)}
                  style={[
                    styles.matchingCard,
                    selected && styles.matchingCardSelected,
                    matched && styles.matchingCardMatched,
                  ]}
                >
                  <Text style={styles.matchingKana}>{card.character}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.matchingColumn}>
            {(session.matchingRomajiOrder ?? []).map((romaji) => {
              const matched = session.matchingCards?.some(
                (card) => matchedIds.has(card.id) && normalizeAnswer(card.romaji) === normalizeAnswer(romaji)
              );
              const selected = selectedMatchingRomaji === romaji;
              return (
                <Pressable
                  key={romaji}
                  disabled={matched}
                  onPress={() => onSelectMatchingRomaji(romaji)}
                  style={[
                    styles.matchingCard,
                    styles.matchingRomajiCard,
                    selected && styles.matchingCardSelected,
                    matched && styles.matchingCardMatched,
                  ]}
                >
                  <Text style={styles.matchingRomaji}>{romaji}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <Text style={styles.matchingFooter}>
          Manche : {matchedCount}/{total}. Erreurs : {session.matchingMistakes ?? 0}. Clique une carte à gauche puis sa correspondance à droite.
        </Text>
        <Pressable style={styles.secondaryFullButton} onPress={onQuit}>
          <Text style={styles.secondaryFullButtonText}>Quitter</Text>
        </Pressable>
      </View>
    );
  }

  const exercise = session.questions[session.currentIndex];
  if (!exercise) {
    return <EmptyState title="Pas assez de kana pour créer un exercice" />;
  }
  const promptText = exercise.direction === 'kana_to_romaji' ? exercise.prompt.character : exercise.prompt.romaji;
  const correctAnswer = exercise.direction === 'kana_to_romaji' ? exercise.prompt.romaji : exercise.prompt.character;
  const visual = getKanaVisual(exercise.prompt, session.currentIndex);
  const isAnswerCorrect =
    selectedChoice !== null && normalizeAnswer(selectedChoice) === normalizeAnswer(correctAnswer);
  const exampleLabel = isCombinedKanaFallbackExample(exercise.prompt) ? 'Mot repère' : 'Mot N5';
  const mnemonic = buildKanaMnemonicSentence(exercise.prompt, visual);
  const promptLabel =
    exercise.direction === 'kana_to_romaji'
      ? 'Quel est le bon romaji ?'
      : 'Quel est le bon kana ?';

  return (
    <View style={styles.kanaExercisePanel}>
      <View style={styles.quizHeaderRow}>
        <Text style={styles.questionMeta}>Question {session.currentIndex + 1}/{session.questions.length}</Text>
        <View style={styles.quizHeaderStats}>
          {session.timerEnabled && <Text style={styles.quizTimerPill}>{formatElapsedTime(elapsedMs ?? 0)}</Text>}
          <Text style={styles.quizScorePill}>{session.correctCount} juste{session.correctCount > 1 ? 's' : ''}</Text>
        </View>
      </View>
      <Text style={styles.kanaExercisePrompt}>{promptText}</Text>
      <Text style={styles.questionTitle}>{promptLabel}</Text>

      {exercise.answerMode === 'multiple_choice' ? (
        <View style={styles.choiceList}>
          {exercise.choices.map((choice) => {
            const isCorrect = normalizeAnswer(choice) === normalizeAnswer(correctAnswer);
            const isSelected = normalizeAnswer(selectedChoice ?? '') === normalizeAnswer(choice);
            return (
              <Pressable
                key={choice}
                disabled={selectedChoice !== null}
                onPress={() => onAnswer(choice)}
                style={[
                  styles.choice,
                  selectedChoice && isCorrect && styles.choiceCorrect,
                  selectedChoice && isSelected && !isCorrect && styles.choiceWrong,
                ]}
              >
                <Text style={styles.choiceText}>{choice}</Text>
                {selectedChoice && isCorrect && <Text style={styles.choiceIcon}>✓</Text>}
                {selectedChoice && isSelected && !isCorrect && <Text style={styles.choiceIcon}>×</Text>}
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={styles.directAnswerBox}>
          <TextInput
            value={directInput}
            onChangeText={onDirectInputChange}
            editable={selectedChoice === null}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={exercise.direction === 'kana_to_romaji' ? 'Tape le romaji...' : 'Tape le kana...'}
            placeholderTextColor="#8A938F"
            style={[
              styles.directAnswerInput,
              selectedChoice && normalizeAnswer(selectedChoice) === normalizeAnswer(correctAnswer) && styles.directAnswerCorrect,
              selectedChoice && normalizeAnswer(selectedChoice) !== normalizeAnswer(correctAnswer) && styles.directAnswerWrong,
            ]}
          />
          <Pressable
            disabled={selectedChoice !== null || directInput.trim().length === 0}
            style={[
              styles.primaryButton,
              (selectedChoice !== null || directInput.trim().length === 0) && styles.primaryButtonDisabled,
            ]}
            onPress={() => onAnswer(directInput)}
          >
            <Text style={styles.primaryButtonText}>Valider ma réponse</Text>
          </Pressable>
        </View>
      )}

      {selectedChoice && (
        <View style={styles.feedback}>
          <Text style={styles.feedbackTitle}>
            {isAnswerCorrect ? 'Correct' : 'À revoir'}
          </Text>
          <Text style={styles.feedbackText}>
            {exercise.prompt.character} se lit {exercise.prompt.romaji}.
          </Text>
          <Text style={styles.feedbackText}>
            {exampleLabel} : {visual.wordKana} · {visual.wordRomaji} · {visual.meaning}
          </Text>
          <Text style={styles.feedbackMnemonic}>{mnemonic}</Text>
          <Pressable style={styles.primaryButton} onPress={onNext}>
            <Text style={styles.primaryButtonText}>
              {session.currentIndex + 1 >= session.questions.length ? 'Voir le résultat' : 'Question suivante'}
            </Text>
          </Pressable>
          <Pressable style={styles.secondaryFullButton} onPress={onQuit}>
            <Text style={styles.secondaryFullButtonText}>Quitter</Text>
          </Pressable>
        </View>
      )}
      {!selectedChoice && (
        <Pressable style={styles.secondaryFullButton} onPress={onQuit}>
          <Text style={styles.secondaryFullButtonText}>Quitter</Text>
        </Pressable>
      )}
    </View>
  );
}

function getKanaPracticeMemo(mode: KanaPracticeMode): { title: string; description: string } {
  if (mode === 'story') {
    return {
      title: 'Mode Histoire',
      description:
        'Tu observes d’abord 5 cartes avec leur image et leur phrase mémo, puis tu réponds juste après. Idéal pour créer une association visuelle forte.',
    };
  }
  if (mode === 'confusion') {
    return {
      title: 'Mode Confusions',
      description:
        'L’app cible les kana qui se ressemblent ou se mélangent souvent. Très utile pour éliminer les erreurs classiques avant l’examen.',
    };
  }
  if (mode === 'matching') {
    return {
      title: 'Mode Association',
      description:
        'Tu joues 5 manches de 5 paires. Clique sur une carte kana puis sur son romaji pour entraîner la reconnaissance rapide.',
    };
  }
  return {
    title: 'Mode Standard',
    description:
      'Questionnaire classique, équilibré et adaptatif. Les cartes faibles reviennent plus souvent, tout en gardant un peu de révision sur ce que tu connais déjà.',
  };
}

function formatElapsedTime(ms: number): string {
  const safeMs = Math.max(0, Math.floor(ms));
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((safeMs % 1000) / 100);
  return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths}`;
}

function buildKanaQuiz(
  cards: KanaCard[],
  size: KanaQuizSize,
  direction: KanaExerciseDirection,
  answerMode: KanaQuizAnswerMode
): KanaExercise[] {
  if (cards.length < 4) return [];
  return buildAdaptiveKanaQuizPool(cards, Math.min(size, cards.length))
    .map((prompt) => buildKanaExercise(cards, prompt, direction, answerMode))
    .filter((exercise): exercise is KanaExercise => exercise !== null);
}

function buildKanaArcadeQuestions(cards: KanaCard[], size: KanaQuizSize): KanaArcadeQuestion[] {
  const usableCards = cards.filter((card) => card.character && card.romaji && !card.character.includes('?'));
  if (usableCards.length < 4) return [];
  return buildAdaptiveKanaQuizPool(usableCards, Math.min(size, usableCards.length))
    .map((prompt) => {
      const distractors = shuffle(usableCards.filter((card) => card.id !== prompt.id))
        .map((card) => card.romaji)
        .filter((value, index, values) => value !== prompt.romaji && values.indexOf(value) === index)
        .slice(0, 3);
      if (distractors.length < 3) return null;
      return {
        prompt,
        choices: shuffle([prompt.romaji, ...distractors]),
      };
    })
    .filter((question): question is KanaArcadeQuestion => question !== null);
}

function getKanaArcadeMultiplier(streak: number): number {
  if (streak >= 12) return 5;
  if (streak >= 10) return 4;
  if (streak >= 8) return 3;
  if (streak >= 5) return 2;
  if (streak >= 3) return 1.5;
  return 1;
}

function buildConfusionKanaQuiz(
  cards: KanaCard[],
  size: KanaQuizSize,
  answerMode: KanaQuizAnswerMode
): KanaExercise[] {
  if (cards.length < 4) return [];
  const byCharacter = new Map(cards.map((card) => [card.character, card]));
  const exercises: KanaExercise[] = [];
  shuffle(KANA_CONFUSION_GROUPS).forEach((group) => {
    const groupCards = group.map((character) => byCharacter.get(character)).filter((card): card is KanaCard => !!card);
    if (groupCards.length < 2) return;
    groupCards.forEach((prompt) => {
      if (exercises.length >= size) return;
      const choices = shuffle(groupCards.map((card) => card.character));
      exercises.push({
        prompt,
        choices,
        direction: 'romaji_to_kana',
        answerMode,
      });
    });
  });
  if (exercises.length >= Math.min(size, cards.length)) return shuffle(exercises).slice(0, size);
  return buildKanaQuiz(cards, size, 'romaji_to_kana', answerMode);
}

function buildAdaptiveKanaQuizPool(cards: KanaCard[], size: number): KanaCard[] {
  const weak = shuffle(cards.filter((card) => getKanaPriority(card) <= 2));
  const learning = shuffle(cards.filter((card) => getKanaPriority(card) === 3));
  const mastered = shuffle(cards.filter((card) => getKanaPriority(card) >= 4));
  const selected = new Map<string, KanaCard>();
  const take = (pool: KanaCard[], count: number) => {
    pool.forEach((card) => {
      if (selected.size < size && selected.size < count) selected.set(card.id, card);
    });
  };

  take(weak, Math.ceil(size * 0.6));
  take([...selected.values(), ...learning], Math.ceil(size * 0.85));
  take([...selected.values(), ...mastered], size);
  shuffle(cards).forEach((card) => {
    if (selected.size < size) selected.set(card.id, card);
  });

  return shuffle([...selected.values()]);
}

function buildMatchingRounds(cards: KanaCard[], roundCount: number, roundSize: number): KanaCard[][] {
  if (cards.length < roundSize) return [];
  const targetSize = roundCount * roundSize;
  const adaptivePool = buildAdaptiveKanaQuizPool(cards, Math.min(targetSize, cards.length));
  const pool = [...adaptivePool];
  while (pool.length < targetSize) {
    shuffle(cards).forEach((card) => {
      if (pool.length < targetSize) pool.push(card);
    });
  }
  return Array.from({ length: roundCount }, (_, roundIndex) =>
    pool.slice(roundIndex * roundSize, roundIndex * roundSize + roundSize)
  );
}

function getMatchingTotalCount(session: KanaQuizSession): number {
  if (session.matchingRounds?.length) {
    return session.matchingRounds.reduce((total, round) => total + round.length, 0);
  }
  return session.matchingCards?.length ?? 0;
}

function buildKanaExercise(
  cards: KanaCard[],
  prompt: KanaCard,
  direction: KanaExerciseDirection,
  answerMode: KanaQuizAnswerMode
): KanaExercise | null {
  if (cards.length < 4) return null;
  const answerKey = direction === 'kana_to_romaji' ? 'romaji' : 'character';
  const correctAnswer = prompt[answerKey];
  if (answerMode === 'direct_input') {
    return {
      prompt,
      direction,
      answerMode,
      choices: [],
    };
  }
  const distractors = shuffle(cards.filter((card) => card.id !== prompt.id))
    .map((card) => card[answerKey])
    .filter((value, index, values) => value !== correctAnswer && values.indexOf(value) === index)
    .slice(0, 3);
  if (distractors.length < 3) return null;
  return {
    prompt,
    direction,
    answerMode,
    choices: shuffle([correctAnswer, ...distractors]),
  };
}

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

const GRAMMAR_KEY_TOKENS = [
  'ではありませんでした',
  'ませんでした',
  'ではありません',
  'どうして',
  'どのくらい',
  '何曜日',
  '誰か',
  '何か',
  'どこか',
  '誰も',
  '何も',
  '何時',
  '何歳',
  '何人',
  '何本',
  'までに',
  'てから',
  'くなかった',
  'くない',
  'いつも',
  '時々',
  'あまり',
  '全然',
  'いくら',
  'いくつ',
  'どう',
  'なぜ',
  'だれ',
  '誰',
  'なに',
  '何',
  'どこ',
  'いつ',
  'どれ',
  'どの',
  'どちら',
  'ぐらい',
  'ごろ',
  'もう',
  'まだ',
  'すぐ',
  '一番',
  'ほうが',
  'たり',
  'ました',
  'ません',
  'ます',
  'から',
  'まで',
  'より',
  'は',
  'が',
  'を',
  'に',
  'で',
  'へ',
  'の',
  'も',
  'と',
  'や',
  'か',
  'です',
  'ない',
  'たい',
  'て',
  'た',
  'な',
  'い',
  'ね',
  'よ',
];

const GRAMMAR_DIALOGUE_PROMPTS = [
  {
    cue: 'ただいま。',
    romaji: 'Tadaima.',
    cueFr: 'Je suis rentré.',
    situation: 'Quelqu’un rentre à la maison.',
    answer: 'おかえりなさい。',
    answerFr: 'Bon retour à la maison.',
    choices: ['おかえりなさい。', 'いただきます。', 'いってきます。', 'おやすみなさい。'],
    helper: 'À la maison : celui qui rentre dit ただいま, celui qui accueille répond おかえりなさい.',
  },
  {
    cue: 'いってきます。',
    romaji: 'Ittekimasu.',
    cueFr: 'J’y vais / je pars.',
    situation: 'Quelqu’un part de la maison.',
    answer: 'いってらっしゃい。',
    answerFr: 'Bonne route / reviens bien.',
    choices: ['いってらっしゃい。', 'ただいま。', 'ごちそうさまでした。', 'おかえりなさい。'],
    helper: 'Quand quelqu’un part, on l’accompagne avec いってらっしゃい.',
  },
  {
    cue: 'いただきます。',
    romaji: 'Itadakimasu.',
    cueFr: 'Je reçois ce repas avec gratitude.',
    situation: 'On commence à manger.',
    answer: 'どうぞ。',
    answerFr: 'Je t’en prie / vas-y.',
    choices: ['どうぞ。', 'おかえりなさい。', 'いってきます。', 'おやすみなさい。'],
    helper: 'Avant de manger, いただきます est naturel. La réponse courte et polie peut être どうぞ.',
  },
  {
    cue: 'ごちそうさまでした。',
    romaji: 'Gochisousama deshita.',
    cueFr: 'Merci pour le repas.',
    situation: 'Après le repas, on remercie.',
    answer: 'おそまつさまでした。',
    answerFr: 'Ce n’était pas grand-chose.',
    choices: ['おそまつさまでした。', 'いただきます。', 'いってらっしゃい。', 'ただいま。'],
    helper: 'Après un repas offert ou préparé, ごちそうさまでした remercie. Réponse humble : おそまつさまでした.',
  },
  {
    cue: 'おはようございます。',
    romaji: 'Ohayou gozaimasu.',
    cueFr: 'Bonjour, le matin.',
    situation: 'On se salue le matin.',
    answer: 'おはようございます。',
    answerFr: 'Bonjour, le matin.',
    choices: ['おはようございます。', 'こんばんは。', 'おやすみなさい。', 'ただいま。'],
    helper: 'Le matin, on peut répondre avec la même salutation.',
  },
  {
    cue: 'こんばんは。',
    romaji: 'Konbanwa.',
    cueFr: 'Bonsoir.',
    situation: 'On se salue le soir.',
    answer: 'こんばんは。',
    answerFr: 'Bonsoir.',
    choices: ['こんばんは。', 'おはようございます。', 'いってきます。', 'いただきます。'],
    helper: 'Le soir, こんばんは appelle souvent la même réponse.',
  },
  {
    cue: 'おやすみなさい。',
    romaji: 'Oyasuminasai.',
    cueFr: 'Bonne nuit.',
    situation: 'Quelqu’un va dormir.',
    answer: 'おやすみなさい。',
    answerFr: 'Bonne nuit.',
    choices: ['おやすみなさい。', 'おかえりなさい。', 'ごちそうさまでした。', 'どうぞ。'],
    helper: 'Avant de dormir, on répond naturellement おやすみなさい.',
  },
  {
    cue: 'ありがとうございます。',
    romaji: 'Arigatou gozaimasu.',
    cueFr: 'Merci beaucoup.',
    situation: 'Quelqu’un te remercie.',
    answer: 'どういたしまして。',
    answerFr: 'Je vous en prie.',
    choices: ['どういたしまして。', 'すみません。', 'いただきます。', 'いってらっしゃい。'],
    helper: 'Après un remerciement, どういたしまして signifie “je vous en prie”.',
  },
  {
    cue: 'すみません。',
    romaji: 'Sumimasen.',
    cueFr: 'Excusez-moi / pardon.',
    situation: 'Quelqu’un s’excuse ou attire ton attention.',
    answer: 'いいえ。',
    answerFr: 'Non, ce n’est rien.',
    choices: ['いいえ。', 'ただいま。', 'おやすみなさい。', 'ごちそうさまでした。'],
    helper: 'Pour minimiser une petite excuse, いいえ peut répondre “non, ce n’est rien”.',
  },
  {
    cue: 'はじめまして。',
    romaji: 'Hajimemashite.',
    cueFr: 'Enchanté.',
    situation: 'Première rencontre.',
    answer: 'よろしくおねがいします。',
    answerFr: 'Ravi de vous rencontrer / merci d’avance pour cette relation.',
    choices: ['よろしくおねがいします。', 'おかえりなさい。', 'いただきます。', 'いってきます。'],
    helper: 'Lors d’une première rencontre, はじめまして est suivi très naturellement de よろしくおねがいします.',
  },
  {
    cue: 'おげんきですか。',
    romaji: 'Ogenki desu ka.',
    cueFr: 'Comment allez-vous ?',
    situation: 'Quelqu’un demande comment tu vas.',
    answer: 'はい、げんきです。',
    answerFr: 'Oui, je vais bien.',
    choices: ['はい、げんきです。', 'いただきます。', 'いってらっしゃい。', 'ただいま。'],
    helper: 'À おげんきですか, la réponse N5 naturelle est はい、げんきです.',
  },
  {
    cue: 'おなまえはなんですか。',
    romaji: 'Onamae wa nan desu ka.',
    cueFr: 'Comment vous appelez-vous ?',
    situation: 'Quelqu’un demande ton nom.',
    answer: 'わたしはアンです。',
    answerFr: 'Je suis Anne.',
    choices: ['わたしはアンです。', 'いいえ、ちがいます。', 'おやすみなさい。', 'ごちそうさまでした。'],
    helper: 'Pour donner son nom simplement : わたしは + nom + です.',
  },
  {
    cue: 'これはなんですか。',
    romaji: 'Kore wa nan desu ka.',
    cueFr: 'Qu’est-ce que c’est ?',
    situation: 'Quelqu’un montre un objet.',
    answer: 'それはほんです。',
    answerFr: 'C’est un livre.',
    choices: ['それはほんです。', 'どこですか。', 'いってきます。', 'おかえりなさい。'],
    helper: 'Question これはなんですか : on répond souvent それは + nom + です.',
  },
  {
    cue: 'トイレはどこですか。',
    romaji: 'Toire wa doko desu ka.',
    cueFr: 'Où sont les toilettes ?',
    situation: 'Quelqu’un cherche un lieu.',
    answer: 'あそこです。',
    answerFr: 'C’est là-bas.',
    choices: ['あそこです。', 'いただきます。', 'はじめまして。', 'おやすみなさい。'],
    helper: 'Avec どこですか, on répond par un lieu : ここ, そこ, あそこ + です.',
  },
  {
    cue: 'いくらですか。',
    romaji: 'Ikura desu ka.',
    cueFr: 'Combien ça coûte ?',
    situation: 'Dans un magasin.',
    answer: 'さんびゃくえんです。',
    answerFr: 'C’est 300 yens.',
    choices: ['さんびゃくえんです。', 'あそこです。', 'どういたしまして。', 'いってきます。'],
    helper: 'Avec いくらですか, on répond par le prix + です.',
  },
  {
    cue: 'なんじですか。',
    romaji: 'Nanji desu ka.',
    cueFr: 'Quelle heure est-il ?',
    situation: 'Quelqu’un demande l’heure.',
    answer: 'さんじです。',
    answerFr: 'Il est trois heures.',
    choices: ['さんじです。', 'さんびゃくえんです。', 'おかえりなさい。', 'いただきます。'],
    helper: 'Avec なんじですか, on répond nombre + じ + です.',
  },
  {
    cue: 'いっしょにいきませんか。',
    romaji: 'Issho ni ikimasen ka.',
    cueFr: 'On y va ensemble ?',
    situation: 'Invitation polie.',
    answer: 'いいですね。',
    answerFr: 'Bonne idée.',
    choices: ['いいですね。', 'ただいま。', 'ごちそうさまでした。', 'おやすみなさい。'],
    helper: 'Pour accepter naturellement une invitation : いいですね est court et utile.',
  },
  {
    cue: 'もういちどおねがいします。',
    romaji: 'Mou ichido onegai shimasu.',
    cueFr: 'Encore une fois, s’il vous plaît.',
    situation: 'Quelqu’un demande de répéter.',
    answer: 'はい、わかりました。',
    answerFr: 'Oui, compris.',
    choices: ['はい、わかりました。', 'いってらっしゃい。', 'いただきます。', 'こんばんは。'],
    helper: 'Quand on accepte une demande simple : はい、わかりました.',
  },
  {
    cue: 'しゃしんをとってもいいですか。',
    romaji: 'Shashin o totte mo ii desu ka.',
    cueFr: 'Puis-je prendre une photo ?',
    situation: 'Demande de permission.',
    answer: 'はい、いいです。',
    answerFr: 'Oui, c’est possible.',
    choices: ['はい、いいです。', 'おかえりなさい。', 'ごちそうさまでした。', 'はじめまして。'],
    helper: 'Pour répondre à てもいいですか : はい、いいです autorise.',
  },
  {
    cue: 'ここにすわってもいいですか。',
    romaji: 'Koko ni suwatte mo ii desu ka.',
    cueFr: 'Puis-je m’asseoir ici ?',
    situation: 'Demande de permission dans un lieu.',
    answer: 'どうぞ。',
    answerFr: 'Je vous en prie.',
    choices: ['どうぞ。', 'ただいま。', 'いくらですか。', 'おやすみなさい。'],
    helper: 'どうぞ est très utile pour inviter ou autoriser quelqu’un à faire quelque chose.',
  },
  {
    cue: 'ちょっとまってください。',
    romaji: 'Chotto matte kudasai.',
    cueFr: 'Attendez un instant, s’il vous plaît.',
    situation: 'Quelqu’un demande d’attendre.',
    answer: 'はい。',
    answerFr: 'Oui.',
    choices: ['はい。', 'いただきます。', 'いってきます。', 'おかえりなさい。'],
    helper: 'Pour une demande simple avec ください, はい est une réponse minimale naturelle.',
  },
  {
    cue: 'もうすこしゆっくりはなしてください。',
    romaji: 'Mou sukoshi yukkuri hanashite kudasai.',
    cueFr: 'Parlez un peu plus lentement, s’il vous plaît.',
    situation: 'Tu ne comprends pas bien la phrase.',
    answer: 'はい、わかりました。',
    answerFr: 'Oui, compris.',
    choices: ['はい、わかりました。', 'おかえりなさい。', 'いただきます。', 'いくらですか。'],
    helper: 'Avec une demande en てください, une réponse simple est はい、わかりました.',
  },
  {
    cue: 'これはあなたのかばんですか。',
    romaji: 'Kore wa anata no kaban desu ka.',
    cueFr: 'Est-ce votre sac ?',
    situation: 'On te demande si un objet est à toi.',
    answer: 'はい、わたしのです。',
    answerFr: 'Oui, c’est le mien.',
    choices: ['はい、わたしのです。', 'おやすみなさい。', 'いってらっしゃい。', 'ごちそうさまでした。'],
    helper: 'の peut remplacer un nom déjà connu : わたしのです = c’est le mien.',
  },
  {
    cue: 'あした、ひまですか。',
    romaji: 'Ashita, hima desu ka.',
    cueFr: 'Êtes-vous libre demain ?',
    situation: 'Quelqu’un prépare une invitation.',
    answer: 'はい、ひまです。',
    answerFr: 'Oui, je suis libre.',
    choices: ['はい、ひまです。', 'さんじです。', 'あそこです。', 'いただきます。'],
    helper: 'Pour répondre à une question en ですか, on peut reprendre le mot clé + です.',
  },
  {
    cue: 'きょうはなんようびですか。',
    romaji: 'Kyou wa nan youbi desu ka.',
    cueFr: 'Quel jour sommes-nous aujourd’hui ?',
    situation: 'Question de date fréquente N5.',
    answer: 'げつようびです。',
    answerFr: 'C’est lundi.',
    choices: ['げつようびです。', 'さんびゃくえんです。', 'おかえりなさい。', 'いいえ。'],
    helper: 'なんようび demande le jour de la semaine : lundi, mardi, etc. + です.',
  },
  {
    cue: 'どこからきましたか。',
    romaji: 'Doko kara kimashita ka.',
    cueFr: 'D’où venez-vous ?',
    situation: 'Présentation personnelle.',
    answer: 'フランスからきました。',
    answerFr: 'Je viens de France.',
    choices: ['フランスからきました。', 'ここにすわります。', 'どういたしまして。', 'おやすみなさい。'],
    helper: 'から marque le point de départ ou l’origine : France から.',
  },
  {
    cue: 'なにをのみますか。',
    romaji: 'Nani o nomimasu ka.',
    cueFr: 'Que buvez-vous ?',
    situation: 'Restaurant ou café.',
    answer: 'みずをのみます。',
    answerFr: 'Je bois de l’eau.',
    choices: ['みずをのみます。', 'あそこです。', 'いってらっしゃい。', 'はじめまして。'],
    helper: 'を marque l’objet direct : みずをのみます.',
  },
  {
    cue: 'どこでべんきょうしますか。',
    romaji: 'Doko de benkyou shimasu ka.',
    cueFr: 'Où étudiez-vous ?',
    situation: 'Question sur le lieu d’une action.',
    answer: 'うちでべんきょうします。',
    answerFr: 'J’étudie à la maison.',
    choices: ['うちでべんきょうします。', 'うちへかえります。', 'おはようございます。', 'いただきます。'],
    helper: 'で marque le lieu où l’action se passe : うちでべんきょうします.',
  },
  {
    cue: 'どこへいきますか。',
    romaji: 'Doko e ikimasu ka.',
    cueFr: 'Où allez-vous ?',
    situation: 'Question sur une direction.',
    answer: 'がっこうへいきます。',
    answerFr: 'Je vais à l’école.',
    choices: ['がっこうへいきます。', 'がっこうでたべます。', 'どうぞ。', 'おかえりなさい。'],
    helper: 'へ marque la direction avec les verbes de déplacement : がっこうへいきます.',
  },
  {
    cue: 'だれといきますか。',
    romaji: 'Dare to ikimasu ka.',
    cueFr: 'Avec qui y allez-vous ?',
    situation: 'Question sur l’accompagnement.',
    answer: 'ともだちといきます。',
    answerFr: 'J’y vais avec un ami.',
    choices: ['ともだちといきます。', 'さんじです。', 'ほんです。', 'おやすみなさい。'],
    helper: 'と signifie “avec” pour accompagner quelqu’un : ともだちと.',
  },
  {
    cue: 'どちらがすきですか。',
    romaji: 'Dochira ga suki desu ka.',
    cueFr: 'Lequel préférez-vous ?',
    situation: 'On te demande de choisir.',
    answer: 'こちらがすきです。',
    answerFr: 'Je préfère celui-ci.',
    choices: ['こちらがすきです。', 'おかえりなさい。', 'いってきます。', 'さんびゃくえんです。'],
    helper: 'すき prend souvent が pour marquer ce qui est aimé : こちらがすきです.',
  },
  {
    cue: 'にほんごがわかりますか。',
    romaji: 'Nihongo ga wakarimasu ka.',
    cueFr: 'Comprenez-vous le japonais ?',
    situation: 'Quelqu’un vérifie ta compréhension.',
    answer: 'すこしわかります。',
    answerFr: 'Je comprends un peu.',
    choices: ['すこしわかります。', 'いただきます。', 'おかえりなさい。', 'いくらですか。'],
    helper: 'すこし adoucit la réponse : “un peu”. Très utile au N5.',
  },
  {
    cue: 'このでんしゃはとうきょうへいきますか。',
    romaji: 'Kono densha wa Toukyou e ikimasu ka.',
    cueFr: 'Ce train va-t-il à Tokyo ?',
    situation: 'Transport.',
    answer: 'はい、いきます。',
    answerFr: 'Oui, il y va.',
    choices: ['はい、いきます。', 'おやすみなさい。', 'ごちそうさまでした。', 'どういたしまして。'],
    helper: 'Pour confirmer un verbe, on peut répondre はい + verbe.',
  },
  {
    cue: 'ここでたばこをすってはいけません。',
    romaji: 'Koko de tabako o sutte wa ikemasen.',
    cueFr: 'Il est interdit de fumer ici.',
    situation: 'Interdiction dans un lieu public.',
    answer: 'わかりました。',
    answerFr: 'J’ai compris.',
    choices: ['わかりました。', 'いただきます。', 'いってらっしゃい。', 'おはようございます。'],
    helper: 'てはいけません exprime une interdiction. Réponse naturelle : わかりました.',
  },
  {
    cue: 'まどをあけてください。',
    romaji: 'Mado o akete kudasai.',
    cueFr: 'Ouvrez la fenêtre, s’il vous plaît.',
    situation: 'Demande polie.',
    answer: 'はい。',
    answerFr: 'Oui.',
    choices: ['はい。', 'ただいま。', 'ごちそうさまでした。', 'いくらですか。'],
    helper: 'てください sert à demander une action poliment.',
  },
  {
    cue: 'てつだいましょうか。',
    romaji: 'Tetsudaimashou ka.',
    cueFr: 'Je vous aide ?',
    situation: 'Quelqu’un propose son aide.',
    answer: 'おねがいします。',
    answerFr: 'Oui, s’il vous plaît.',
    choices: ['おねがいします。', 'おかえりなさい。', 'いただきます。', 'こんばんは。'],
    helper: 'Quand on accepte une aide, おねがいします est naturel et poli.',
  },
];

function getGrammarExample(lesson: GrammarLesson): GrammarLessonExample {
  return shuffle(lesson.examples)[0] ?? lesson.examples[0];
}

function getGrammarKeyword(lesson: GrammarLesson, example?: GrammarLessonExample): string {
  const ruleText = `${lesson.title} ${lesson.pattern} ${lesson.formula}`;
  const sentenceText = `${example?.kana ?? ''} ${example?.kanji ?? ''}`;
  return (
    GRAMMAR_KEY_TOKENS.find((token) => ruleText.includes(token) && sentenceText.includes(token)) ??
    GRAMMAR_KEY_TOKENS.find((token) => ruleText.includes(token)) ??
    GRAMMAR_KEY_TOKENS.find((token) => sentenceText.includes(token)) ??
    lesson.pattern.split(/\s+/)[0] ??
    lesson.title
  );
}

function maskGrammarKeyword(text: string, keyword: string): string {
  if (!keyword || !text.includes(keyword)) return `${text}  ___`;
  return text.replace(keyword, '___');
}

function uniqueChoices(values: string[], fallback: string[]): string[] {
  const unique = values.filter((value, index, list) => value.trim().length > 0 && list.indexOf(value) === index);
  const correct = unique[0] ?? fallback[0] ?? '';
  const distractors = [...unique.slice(1), ...fallback.filter((value) => value !== correct && !unique.includes(value))].slice(0, 12);
  return shuffle([correct, ...shuffle(distractors).slice(0, 3)]).filter(Boolean);
}

function buildGrammarQuizQuestions(
  size: 10 | 20,
  mode: Exclude<GrammarQuizMode, 'matching' | 'question_answer'> = 'arcade'
): GrammarQuizQuestion[] {
  const pool = shuffle(ALL_GRAMMAR_LESSONS).slice(0, size);
  const exerciseCycle: GrammarExerciseKind[] =
    mode === 'direct_input'
      ? ['blank_input', 'keyword_input']
      : mode === 'blank_qcm'
        ? ['blank_choice']
        : [
            'blank_choice',
            'translation_qcm',
            'rule_qcm',
            'blank_input',
            'situation_qcm',
            'keyword_input',
            'dialogue_response_qcm',
          ];
  return pool.map((lesson, index) => {
    const example = getGrammarExample(lesson);
    const keyword = getGrammarKeyword(lesson, example);
    const kind = exerciseCycle[index % exerciseCycle.length];
    const formula = humanizeGrammarPattern(lesson);
    const formulaChoices = uniqueChoices(
      [
        formula,
        ...shuffle(ALL_GRAMMAR_LESSONS.filter((item) => item.id !== lesson.id)).map((item) => humanizeGrammarPattern(item)),
      ],
      GRAMMAR_KEY_TOKENS
    );
    if (kind === 'translation_qcm') {
      return {
        id: `${lesson.id}-translation-${index}`,
        kind,
        lesson,
        prompt: 'Choisis la bonne traduction française.',
        japanese: example.kanji || example.kana,
        kanaJapanese: example.kana,
        romaji: example.romaji,
        french: example.fr,
        helper: `Indice règle : ${lesson.title}`,
        correctAnswer: example.fr,
        choices: uniqueChoices(
          [example.fr, ...shuffle(ALL_GRAMMAR_LESSONS).map((item) => item.examples[0]?.fr ?? '')],
          ['Je vais à l’école.', 'C’est un livre.', 'Je mange du riz.', 'Il fait beau.']
        ),
      };
    }
    if (kind === 'blank_choice' || kind === 'blank_input') {
      return {
        id: `${lesson.id}-blank-${index}`,
        kind,
        lesson,
        prompt: kind === 'blank_choice' ? 'Complète le trou avec la bonne réponse.' : 'Tape la réponse qui manque.',
        japanese: maskGrammarKeyword(example.kanji || example.kana, keyword),
        kanaJapanese: maskGrammarKeyword(example.kana, keyword),
        romaji: example.romaji,
        french: example.fr,
        helper: `Objectif : ${lesson.goal}`,
        correctAnswer: keyword,
        choices: kind === 'blank_choice' ? uniqueChoices([keyword, ...GRAMMAR_KEY_TOKENS], GRAMMAR_KEY_TOKENS) : [],
      };
    }
    if (kind === 'keyword_input') {
      return {
        id: `${lesson.id}-keyword-${index}`,
        kind,
        lesson,
        prompt: `Tape le marqueur ou la forme clé pour : ${lesson.title}`,
        japanese: example.kanji || example.kana,
        kanaJapanese: example.kana,
        romaji: example.romaji,
        french: example.fr,
        helper: `Formule : ${formula}`,
        correctAnswer: keyword,
        choices: [],
      };
    }
    if (kind === 'situation_qcm') {
      return {
        id: `${lesson.id}-situation-${index}`,
        kind,
        lesson,
        prompt: `Quelle règle utiliserais-tu pour cette intention : ${lesson.goal}`,
        japanese: example.kanji || example.kana,
        kanaJapanese: example.kana,
        romaji: example.romaji,
        french: example.fr,
        helper: 'Pense à ce que tu veux faire dans la phrase, pas seulement aux mots.',
        correctAnswer: lesson.title,
        choices: uniqueChoices(
          [lesson.title, ...shuffle(ALL_GRAMMAR_LESSONS.filter((item) => item.id !== lesson.id)).map((item) => item.title)],
          ['は / thème', 'を / objet', 'です / phrase polie', 'か / question']
        ),
      };
    }
    if (kind === 'dialogue_response_qcm') {
      const dialogue = GRAMMAR_DIALOGUE_PROMPTS[index % GRAMMAR_DIALOGUE_PROMPTS.length];
      return {
        id: `${lesson.id}-dialogue-${index}`,
        kind,
        lesson,
        prompt: `Quelle est la meilleure réponse ? ${dialogue.situation}`,
        japanese: dialogue.cue,
        kanaJapanese: dialogue.cue,
        romaji: dialogue.romaji,
        french: dialogue.cueFr,
        helper: dialogue.helper,
        correctAnswer: dialogue.answer,
        choices: shuffle(dialogue.choices),
      };
    }
    return {
      id: `${lesson.id}-rule-${index}`,
      kind: 'rule_qcm',
      lesson,
      prompt: `${lesson.title} — quelle formule correspond ?`,
      japanese: example.kanji || example.kana,
      kanaJapanese: example.kana,
      romaji: example.romaji,
      french: example.fr,
      helper: buildGrammarMnemonic(lesson),
      correctAnswer: formula,
      choices: formulaChoices,
    };
  });
}

function buildGrammarQuestionAnswerQuiz(size: 10 | 20): GrammarQuizQuestion[] {
  const responseLesson =
    ALL_GRAMMAR_LESSONS.find((lesson) => lesson.order === 147) ??
    ALL_GRAMMAR_LESSONS.find((lesson) => lesson.title.includes('réponses naturelles')) ??
    ALL_GRAMMAR_LESSONS[0];
  return Array.from({ length: size }, (_, index) => {
    const dialogue = GRAMMAR_DIALOGUE_PROMPTS[index % GRAMMAR_DIALOGUE_PROMPTS.length];
    return {
      id: `grammar-response-${index}-${dialogue.answer}`,
      kind: 'dialogue_response_qcm' as const,
      lesson: responseLesson,
      prompt: `Choisis la réponse la plus naturelle. ${dialogue.situation}`,
      japanese: dialogue.cue,
      kanaJapanese: dialogue.cue,
      romaji: dialogue.romaji,
      french: dialogue.cueFr,
      helper: dialogue.helper,
      correctAnswer: dialogue.answer,
      choices: shuffle(dialogue.choices),
    };
  });
}

function buildGrammarMatchingRounds(roundCount = 3, pairsPerRound = 5): GrammarMatchingRound[] {
  const lessons = shuffle(
    ALL_GRAMMAR_LESSONS.filter((lesson) => lesson.examples.some((example) => example.fr && (example.kanji || example.kana)))
  );
  return Array.from({ length: roundCount }, (_, roundIndex) => {
    const pairs = Array.from({ length: pairsPerRound }, (_, pairIndex) => {
      const lesson = lessons[(roundIndex * pairsPerRound + pairIndex) % lessons.length];
      const example = lesson.examples[pairIndex % lesson.examples.length] ?? lesson.examples[0];
      return {
        id: `grammar-match-${roundIndex}-${pairIndex}-${lesson.id}`,
        lesson,
        japanese: example.kanji || example.kana,
        french: example.fr,
      };
    });
    return { pairs, rightOrder: shuffle(pairs.map((pair) => pair.id)) };
  });
}

function createGrammarMatchingSession(): GrammarMatchingSession {
  return {
    rounds: buildGrammarMatchingRounds(),
    currentRound: 0,
    selectedLeftId: null,
    selectedRightId: null,
    matchedIds: [],
    attempts: 0,
    errors: 0,
    score: 0,
    finished: false,
    locked: false,
  };
}

function getGlobalDomainLabel(domain: GlobalQuizDomain): string {
  if (domain === 'kana') return 'Kana';
  if (domain === 'vocabulary') return 'Vocabulaire';
  if (domain === 'grammar') return 'Grammaire';
  return 'Kanji';
}

function getKnowledgeQuizModeCopy(mode: GlobalQuizMode, scope: KnowledgeQuizScope) {
  const base = GLOBAL_QUIZ_MODES.find((item) => item.id === mode) ?? GLOBAL_QUIZ_MODES[0];
  if (scope === 'all') return base;
  const domain = getGlobalDomainLabel(scope);
  if (mode === 'blank_qcm') return { ...base, title: `QCM ${domain}`, subtitle: `Quatre choix portant uniquement sur ${domain}.` };
  if (mode === 'matching') return { ...base, title: `Associations ${domain}`, subtitle: `Relie cinq éléments de ${domain} à leur correspondance.` };
  if (mode === 'question_answer') return { ...base, title: `Question inversée ${domain}`, subtitle: `Pars du sens ou de la lecture pour retrouver la réponse en ${domain}.` };
  if (mode === 'arcade') return { ...base, title: `Défi ${domain}`, subtitle: `Score, séries et combo sur le domaine ${domain}.` };
  return { ...base, title: `Réponse directe ${domain}`, subtitle: `Écris directement la réponse attendue en ${domain}.` };
}

function buildGlobalQuizQuestions(
  size: 10 | 20,
  mode: Exclude<GlobalQuizMode, 'matching'>,
  kanaCards: KanaCard[],
  vocabulary: WordLookupEntry[],
  kanjiItems: KanjiItem[],
  scope: KnowledgeQuizScope = 'all'
): GlobalQuizQuestion[] {
  const kanaPool = shuffle(kanaCards).slice(0, Math.max(size, 20));
  const vocabularyPool = shuffle(
    vocabulary.filter((item, index, list) =>
      Boolean(item.japanese && item.meaning_fr) && list.findIndex((candidate) => candidate.japanese === item.japanese) === index
    )
  ).slice(0, Math.max(size, 20));
  const grammarPool = shuffle(ALL_GRAMMAR_LESSONS).slice(0, Math.max(size, 20));
  const kanjiPool = shuffle(kanjiItems).slice(0, Math.max(size, 20));
  const domains: GlobalQuizDomain[] = scope === 'all' ? ['kana', 'vocabulary', 'grammar', 'kanji'] : [scope];

  return Array.from({ length: size }, (_, index) => {
    const domain = domains[index % domains.length];
    const reverse = mode === 'question_answer';
    const direct = mode === 'direct_input';
    if (domain === 'kana') {
      const item = kanaPool[index % kanaPool.length];
      const answer = reverse ? item.character : item.romaji;
      const alternatives = kanaPool.map((candidate) => (reverse ? candidate.character : candidate.romaji));
      return {
        id: `global-kana-${index}-${item.id}`,
        domain,
        prompt: reverse ? 'Quel kana correspond à ce romaji ?' : 'Quelle est la lecture en romaji ?',
        display: reverse ? item.romaji : item.character,
        correctAnswer: answer,
        choices: direct ? [] : uniqueChoices([answer, ...shuffle(alternatives)], alternatives),
        explanation: `${item.character} se lit ${item.romaji}.`,
      };
    }
    if (domain === 'vocabulary') {
      const item = vocabularyPool[index % vocabularyPool.length];
      const directAnswer = item.romaji || item.kana || item.meaning_fr;
      const answer = direct ? directAnswer : reverse ? item.japanese : item.meaning_fr;
      const alternatives = vocabularyPool.map((candidate) =>
        direct ? candidate.romaji || candidate.kana || candidate.meaning_fr : reverse ? candidate.japanese : candidate.meaning_fr
      );
      return {
        id: `global-vocabulary-${index}-${item.id}`,
        domain,
        prompt: direct ? 'Écris la lecture en romaji.' : reverse ? 'Quel mot japonais correspond ?' : 'Que signifie ce mot ?',
        display: direct || !reverse ? item.japanese : item.meaning_fr,
        correctAnswer: answer,
        choices: direct ? [] : uniqueChoices([answer, ...shuffle(alternatives)], alternatives),
        explanation: `${item.japanese}${item.romaji ? ` (${item.romaji})` : ''} signifie « ${item.meaning_fr} ».` ,
      };
    }
    if (domain === 'grammar') {
      const lesson = grammarPool[index % grammarPool.length];
      const example = lesson.examples[index % lesson.examples.length] ?? lesson.examples[0];
      const keyword = getGrammarKeyword(lesson, example);
      const answer = reverse ? lesson.title : keyword;
      const alternatives = reverse
        ? grammarPool.map((candidate) => candidate.title)
        : GRAMMAR_KEY_TOKENS;
      return {
        id: `global-grammar-${index}-${lesson.id}`,
        domain,
        prompt: reverse ? 'Quelle règle répond à cette intention ?' : 'Complète la phrase avec la forme grammaticale correcte.',
        display: reverse ? lesson.goal : maskGrammarKeyword(example.kanji || example.kana, keyword),
        correctAnswer: answer,
        choices: direct ? [] : uniqueChoices([answer, ...shuffle(alternatives)], alternatives),
        explanation: `${lesson.title} : ${buildGrammarWhy(lesson)}`,
      };
    }
    const item = kanjiPool[index % kanjiPool.length];
    const answer = reverse ? item.character : item.meaning_fr;
    const alternatives = kanjiPool.map((candidate) => (reverse ? candidate.character : candidate.meaning_fr));
    return {
      id: `global-kanji-${index}-${item.id}`,
      domain,
      prompt: reverse ? 'Quel kanji correspond à ce sens ?' : 'Quel est le sens principal de ce kanji ?',
      display: reverse ? item.meaning_fr : item.character,
      correctAnswer: answer,
      choices: direct ? [] : uniqueChoices([answer, ...shuffle(alternatives)], alternatives),
      explanation: `${item.character} signifie « ${item.meaning_fr} ». Lectures : ${item.n5_readings || item.onyomi || item.kunyomi || 'à réviser'}.`,
    };
  });
}

function createGlobalQuizSession(questions: GlobalQuizQuestion[]): GlobalQuizSession {
  return {
    questions,
    currentIndex: 0,
    selected: null,
    correctCount: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    mistakes: [],
    finished: questions.length === 0,
  };
}

function buildGlobalMatchingSession(
  kanaCards: KanaCard[],
  vocabulary: WordLookupEntry[],
  kanjiItems: KanjiItem[],
  scope: KnowledgeQuizScope = 'all'
): GlobalMatchingSession {
  const kanaPool = shuffle(kanaCards);
  const vocabularyPool = shuffle(vocabulary.filter((item) => item.japanese && item.meaning_fr));
  const grammarPool = shuffle(ALL_GRAMMAR_LESSONS);
  const kanjiPool = shuffle(kanjiItems);
  const rounds = Array.from({ length: 3 }, (_, roundIndex) => {
    const kana = kanaPool[roundIndex % kanaPool.length];
    const word = vocabularyPool[roundIndex % vocabularyPool.length];
    const grammar = grammarPool[roundIndex % grammarPool.length];
    const example = grammar.examples[roundIndex % grammar.examples.length] ?? grammar.examples[0];
    const kanji = kanjiPool[roundIndex % kanjiPool.length];
    const extraWord = vocabularyPool[(roundIndex + 3) % vocabularyPool.length];
    const allPairs: GlobalMatchingPair[] = [
      ...Array.from({ length: 5 }, (_, index) => {
        const item = kanaPool[(roundIndex * 5 + index) % kanaPool.length];
        return { id: `global-match-${roundIndex}-kana-${index}`, domain: 'kana' as const, left: item.character, right: item.romaji };
      }),
      ...Array.from({ length: 5 }, (_, index) => {
        const item = vocabularyPool[(roundIndex * 5 + index) % vocabularyPool.length];
        return { id: `global-match-${roundIndex}-vocab-${index}`, domain: 'vocabulary' as const, left: item.japanese, right: item.meaning_fr };
      }),
      ...Array.from({ length: 5 }, (_, index) => {
        const item = kanjiPool[(roundIndex * 5 + index) % kanjiPool.length];
        return { id: `global-match-${roundIndex}-kanji-${index}`, domain: 'kanji' as const, left: item.character, right: item.meaning_fr };
      }),
    ];
    const mixedPairs: GlobalMatchingPair[] = [
      { id: `global-match-${roundIndex}-kana`, domain: 'kana', left: kana.character, right: kana.romaji },
      { id: `global-match-${roundIndex}-vocab`, domain: 'vocabulary', left: word.japanese, right: word.meaning_fr },
      { id: `global-match-${roundIndex}-grammar`, domain: 'grammar', left: example.kanji || example.kana, right: example.fr },
      { id: `global-match-${roundIndex}-kanji`, domain: 'kanji', left: kanji.character, right: kanji.meaning_fr },
      { id: `global-match-${roundIndex}-extra`, domain: 'vocabulary', left: extraWord.japanese, right: extraWord.meaning_fr },
    ];
    const pairs = scope === 'all' ? mixedPairs : allPairs.filter((pair) => pair.domain === scope).slice(0, 5);
    return { pairs, rightOrder: shuffle(pairs.map((pair) => pair.id)) };
  });
  return {
    rounds,
    currentRound: 0,
    selectedLeftId: null,
    selectedRightId: null,
    matchedIds: [],
    errors: 0,
    score: 0,
    finished: false,
    locked: false,
  };
}

function getGrammarExerciseInstruction(kind: GrammarExerciseKind): string {
  if (kind === 'blank_choice') return 'Choisis l’élément qui complète correctement la phrase.';
  if (kind === 'blank_input') return 'Tape exactement l’élément manquant.';
  if (kind === 'translation_qcm') return 'Lis la phrase japonaise puis choisis le sens français.';
  if (kind === 'keyword_input') return 'Retrouve le marqueur clé de la règle.';
  if (kind === 'situation_qcm') return 'Choisis la règle adaptée à la situation.';
  if (kind === 'dialogue_response_qcm') return 'Choisis la réponse naturelle dans cette situation.';
  return 'Choisis la formule qui explique le mieux cette règle.';
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getGrammarAnswerAliases(answer: string): string[] {
  const aliases: Record<string, string[]> = {
    は: ['wa', 'ha'],
    へ: ['e', 'he'],
    を: ['o', 'wo'],
    が: ['ga'],
    に: ['ni'],
    で: ['de'],
    の: ['no'],
    も: ['mo'],
    と: ['to'],
    や: ['ya'],
    か: ['ka'],
    から: ['kara'],
    まで: ['made'],
    より: ['yori'],
    て: ['te'],
    た: ['ta'],
    ない: ['nai'],
    たい: ['tai'],
    です: ['desu'],
    ます: ['masu'],
    ません: ['masen'],
    ね: ['ne'],
    よ: ['yo'],
  };
  return [answer, ...(aliases[answer] ?? [])].filter(Boolean);
}

function hideGrammarAnswerInHint(text: string | undefined, answer: string, fallback: string): string {
  if (!text) return '';
  if (normalizeAnswer(text) === normalizeAnswer(answer)) return fallback;
  let next = text;
  getGrammarAnswerAliases(answer).forEach((alias) => {
    if (!alias) return;
    const pattern = /^[a-z]+$/i.test(alias)
      ? new RegExp(`\\b${escapeRegExp(alias)}\\b`, 'gi')
      : new RegExp(escapeRegExp(alias), 'g');
    next = next.replace(pattern, '___');
  });
  return normalizeAnswer(next).includes(normalizeAnswer(answer)) ? fallback : next;
}

function buildGrammarQuickReminder(question: GrammarQuizQuestion): string {
  if (question.kind === 'dialogue_response_qcm') {
    return `Rappel : en situation quotidienne, on ne traduit pas mot à mot. On mémorise la paire complète : ${question.japanese ?? ''} → ${question.correctAnswer}.`;
  }
  if (question.kind === 'blank_choice' || question.kind === 'blank_input' || question.kind === 'keyword_input') {
    return `Rappel : l’élément clé ici est “${question.correctAnswer}”. ${explainGrammarSlots(question.lesson)}`;
  }
  if (question.kind === 'translation_qcm') {
    return `Rappel : lis d’abord la structure, puis le vocabulaire. Ici la règle visée est : ${humanizeGrammarPattern(question.lesson)}.`;
  }
  if (question.kind === 'situation_qcm') {
    return `Rappel : pars de l’intention de la phrase. Cette situation appelle : ${question.correctAnswer}.`;
  }
  return `Rappel : ${humanizeGrammarPattern(question.lesson)}. ${question.lesson.trap}`;
}

function buildGrammarContrastWhy(question: GrammarQuizQuestion): string {
  const lessonText = `${question.lesson.title} ${question.lesson.pattern} ${question.lesson.formula} ${question.japanese ?? ''}`;
  const answer = question.correctAnswer;
  const parts: string[] = [];
  const add = (text: string) => {
    if (parts.length < 5) parts.push(text);
  };
  const finish = () => parts.slice(0, 5).join(' ');

  if (question.kind === 'dialogue_response_qcm') {
    return [
      `C’est une formule sociale fixe.`,
      `L’indice est la situation : ${question.prompt.replace('Quelle est la meilleure réponse ? ', '')}`,
      `On ne traduit pas mot à mot.`,
      `On choisit la réponse naturelle : ${answer}.`,
    ].join(' ');
  }

  if (lessonText.includes('は') || answer === 'は') {
    add(`は pose le thème : “à propos de cela”.`);
    add(`Ici, on présente ou décrit quelque chose.`);
    add(`が serait plus fort pour identifier le sujet précis.`);
  }
  if (lessonText.includes('が') || answer === 'が') {
    add(`が marque l’élément qui porte l’état ou la réponse.`);
    add(`Ici, on identifie ce qui est aimé, compris, présent ou concerné.`);
    add(`は serait plutôt le thème général.`);
  }
  if (lessonText.includes('を') || answer === 'を') {
    add(`を marque l’objet direct.`);
    add(`Le mot avant を reçoit l’action du verbe.`);
    add(`で serait le lieu ou le moyen.`);
    add(`に serait plutôt une destination, une heure ou un point précis.`);
  }
  if (lessonText.includes('に') || answer === 'に') {
    add(`に marque un point précis.`);
    add(`Cela peut être une heure, une destination, une personne cible ou un lieu d’existence.`);
    add(`で serait le lieu où une action se déroule.`);
  }
  if (lessonText.includes('で') || answer === 'で') {
    add(`で marque le lieu de l’action.`);
    add(`Il peut aussi marquer le moyen utilisé.`);
    add(`に serait plutôt un point d’arrivée ou d’existence.`);
  }
  if (lessonText.includes('へ') || answer === 'へ') {
    add(`へ marque la direction.`);
    add(`On regarde vers où le mouvement va.`);
    add(`で ne convient pas car ce n’est pas le lieu de l’action.`);
  }
  if (lessonText.includes('の') || answer === 'の') {
    add(`の relie deux noms.`);
    add(`Il indique possession, appartenance ou précision.`);
    add(`は et が ne relient pas deux noms.`);
  }
  if (lessonText.includes('と') || answer === 'と') {
    add(`と signifie souvent “avec”.`);
    add(`Il sert aussi à faire une liste complète.`);
    add(`や donne une liste ouverte : “entre autres”.`);
  }
  if (lessonText.includes('から') || answer === 'から') {
    add(`から marque le départ, l’origine ou la cause.`);
    add(`C’est “depuis”, “à partir de” ou “parce que”.`);
    add(`まで marque plutôt la limite finale.`);
  }
  if (lessonText.includes('まで') || answer === 'まで') {
    add(`まで marque la limite finale.`);
    add(`C’est “jusqu’à”.`);
    add(`から marque plutôt le point de départ.`);
  }
  if (lessonText.includes('より') || answer === 'より') {
    add(`より sert à comparer.`);
    add(`Il marque le point de référence : “que”.`);
    add(`から n’exprime pas cette comparaison.`);
  }
  if (lessonText.includes('か') || answer === 'か') {
    add(`か transforme la phrase en question.`);
    add(`Il peut aussi marquer un choix.`);
    add(`ね cherche plutôt l’accord de l’autre.`);
  }
  if (lessonText.includes('てください') || answer === 'て') {
    add(`La forme en て connecte l’action à une autre idée.`);
    add(`Ici, elle sert à faire une demande ou une construction.`);
    add(`La forme dictionnaire ne ferait pas ce lien.`);
  }
  if (lessonText.includes('てもいい') || question.prompt.includes('permission')) {
    add(`てもいいですか demande une permission.`);
    add(`C’est “Puis-je... ?”.`);
    add(`てください demanderait à l’autre de faire l’action.`);
  }
  if (lessonText.includes('てはいけません') || question.japanese?.includes('いけません')) {
    add(`てはいけません exprime une interdiction.`);
    add(`C’est “il ne faut pas”.`);
    add(`てもいいです autorise, donc c’est l’inverse.`);
  }
  if (lessonText.includes('たい') || answer === 'たい') {
    add(`たい exprime l’envie de faire une action.`);
    add(`ます dit seulement que l’action se fait.`);
    add(`Ici, il y a une idée de désir.`);
  }
  if (lessonText.includes('ない') || answer === 'ない') {
    add(`ない sert à nier en forme simple.`);
    add(`ません est la négation polie.`);
    add(`Ici, la structure demande la forme simple.`);
  }
  if (lessonText.includes('た') || answer === 'た') {
    add(`た marque une action passée ou accomplie.`);
    add(`て sert plutôt à connecter.`);
    add(`Ici, l’action est vue comme terminée.`);
  }
  if (lessonText.includes('です') || answer === 'です') {
    add(`です termine poliment une phrase avec nom ou adjectif.`);
    add(`ます s’utilise avec un verbe.`);
    add(`Ici, on ne conjugue pas une action.`);
  }
  if (lessonText.includes('ます') || answer === 'ます') {
    add(`ます rend le verbe poli.`);
    add(`です ne conjugue pas les verbes d’action.`);
    add(`Ici, le mot principal est un verbe.`);
  }

  if (parts.length === 0) {
    return [
      `On applique cette règle car l’intention est : ${question.lesson.goal}`,
      `L’indice principal est la structure de la phrase.`,
      `Une autre règle changerait le sens.`,
      `La forme attendue est : ${humanizeGrammarPattern(question.lesson)}.`,
    ].join(' ');
  }

  return finish();
}

function getGrammarCorrectionSentence(question: GrammarQuizQuestion): string {
  const example = question.lesson.examples.find(
    (item) => item.kana === question.japanese || item.kanji === question.japanese || item.fr === question.french
  ) ?? question.lesson.examples[0];
  return (example?.kanji || example?.kana || question.japanese || '').replace(/___/g, question.correctAnswer);
}

function compactJapanesePhrase(value: string): string {
  return value.replace(/[。、！？,.!?「」『』（）()：:・…]/g, '').trim();
}

function findParticleContext(sentence: string, particle: string): { before: string; after: string } | null {
  const index = sentence.indexOf(particle);
  if (index <= 0) return null;
  const beforeRaw = compactJapanesePhrase(sentence.slice(0, index));
  const afterRaw = compactJapanesePhrase(sentence.slice(index + particle.length));
  const before = beforeRaw.slice(Math.max(0, beforeRaw.length - 8));
  const after = afterRaw.slice(0, 10);
  return { before, after };
}

function buildSimpleRoleAnalysis(question: GrammarQuizQuestion): string {
  const sentence = getGrammarCorrectionSentence(question);
  const roles: string[] = [];
  const addParticleRole = (particle: string, label: string, role: string) => {
    const context = findParticleContext(sentence, particle);
    if (!context) return;
    roles.push(`${context.before} ${label} : ${role}`);
  };

  addParticleRole('は', 'は', 'thème. C’est ce dont la phrase parle.');
  addParticleRole('が', 'が', 'sujet précis. C’est l’élément qui existe, agit, ou porte l’état.');
  addParticleRole('を', 'を', 'objet. C’est la chose touchée par l’action.');
  addParticleRole('で', 'で', 'lieu ou moyen. C’est là où l’action se passe, ou avec quoi elle se fait.');
  addParticleRole('に', 'に', 'point précis. C’est une heure, une destination, une cible, ou un lieu d’existence.');
  addParticleRole('へ', 'へ', 'direction. C’est l’endroit vers lequel on va.');
  addParticleRole('の', 'の', 'lien entre deux noms. Cela précise ou indique l’appartenance.');
  addParticleRole('と', 'と', 'accompagnement ou liste complète.');
  addParticleRole('から', 'から', 'origine, départ ou cause.');
  addParticleRole('まで', 'まで', 'limite finale, “jusqu’à”.');

  if (sentence.includes('です')) roles.push('です : termine poliment une phrase avec un nom ou un adjectif.');
  if (sentence.includes('ます')) roles.push('ます : rend le verbe poli.');
  if (sentence.includes('ください')) roles.push('ください : transforme l’action en demande polie.');
  if (sentence.includes('てもいい')) roles.push('てもいい : indique une permission.');
  if (sentence.includes('てはいけません')) roles.push('てはいけません : indique une interdiction.');

  return roles.slice(0, 4).join(' ');
}

function buildCaseSpecificGrammarWhy(question: GrammarQuizQuestion): string {
  const sentence = getGrammarCorrectionSentence(question);
  const answer = question.correctAnswer;
  const lessonText = `${question.lesson.title} ${question.lesson.pattern} ${question.lesson.formula} ${sentence}`;
  const uses = (token: string) => lessonText.includes(token) || answer === token;
  const contextFor = (particle: string) => findParticleContext(sentence, particle);

  if (question.kind === 'dialogue_response_qcm') {
    return `La phrase demande une réponse naturelle, pas une traduction mot à mot. La situation dit quoi répondre. Ici, “${answer}” est la formule attendue.`;
  }

  if (uses('で')) {
    const context = contextFor('で');
    const place = context?.before ?? 'ce mot';
    return `${place} est le lieu où l’action se passe. On utilise で pour le lieu d’une action. On n’utilise pas に ici, car に marque plutôt une destination, une heure précise ou un lieu d’existence.`;
  }
  if (uses('に')) {
    const context = contextFor('に');
    const target = context?.before ?? 'ce mot';
    return `${target} est un point précis. On utilise に pour viser une heure, une destination, une cible ou un lieu d’existence. On n’utilise pas で ici, car で décrit le lieu où l’on fait une action.`;
  }
  if (uses('へ')) {
    const context = contextFor('へ');
    const destination = context?.before ?? 'ce mot';
    return `${destination} est la direction du mouvement. On utilise へ avec aller, venir ou rentrer. On n’utilise pas で, car ce n’est pas le lieu où l’action se déroule.`;
  }
  if (uses('を')) {
    const context = contextFor('を');
    const object = context?.before ?? 'ce mot';
    return `${object} est la chose touchée par le verbe. On utilise を pour l’objet direct. On n’utilise pas で, car ce n’est pas un lieu ou un moyen.`;
  }
  if (uses('は')) {
    const context = contextFor('は');
    const topic = context?.before ?? 'ce mot';
    return `${topic} est le thème. On utilise は pour dire “à propos de ça”. On n’utilise pas が ici si on ne cherche pas à identifier un sujet nouveau ou précis.`;
  }
  if (uses('が')) {
    const context = contextFor('が');
    const subject = context?.before ?? 'ce mot';
    return `${subject} est l’élément précis de la phrase. On utilise が pour pointer le sujet ou la chose concernée. は serait plus général : il annoncerait seulement le thème.`;
  }
  if (uses('の')) {
    const context = contextFor('の');
    const first = context?.before ?? 'le premier nom';
    return `${first} précise le nom qui vient après. On utilise の pour relier deux noms. は ou が ne peuvent pas faire ce lien entre deux noms.`;
  }
  if (uses('と')) {
    const context = contextFor('と');
    const companion = context?.before ?? 'ce mot';
    return `${companion} est l’élément associé. と signifie souvent “avec” ou fait une liste complète. や serait une liste ouverte, comme “entre autres”.`;
  }
  if (uses('か')) {
    return `La phrase pose une question. か se met à la fin pour demander. ね demanderait plutôt confirmation, pas une vraie réponse.`;
  }
  if (uses('です')) {
    return `La phrase donne une information avec un nom ou un adjectif. です rend cette phrase polie. ます ne convient pas, car ます s’attache aux verbes d’action.`;
  }
  if (uses('ます')) {
    return `Le mot principal est un verbe. ます rend ce verbe poli. です ne convient pas, car です ne conjugue pas une action.`;
  }
  if (uses('てください')) {
    return `La phrase demande à quelqu’un de faire l’action. La forme て relie le verbe à ください. La forme dictionnaire seule ne ferait pas une demande polie.`;
  }
  if (uses('てもいい')) {
    return `La phrase demande ou donne une permission. てもいい signifie “on peut faire”. てはいけません serait l’inverse : “il ne faut pas”.`;
  }
  if (uses('てはいけません')) {
    return `La phrase interdit une action. てはいけません signifie “il ne faut pas”. てもいい ne convient pas, car cela autorise.`;
  }
  if (uses('たい')) {
    return `La phrase exprime une envie. たい s’attache au verbe pour dire “vouloir faire”. ます dirait seulement que l’action se fait.`;
  }
  if (uses('ない')) {
    return `La phrase est négative. ない sert de base négative simple. ません serait la négation polie, mais certaines structures demandent ない.`;
  }
  if (uses('た')) {
    return `L’action est vue comme terminée. た marque le passé ou l’accompli. て servirait plutôt à connecter avec une autre idée.`;
  }

  return `Ici, on applique cette règle parce que l’intention est : ${question.lesson.goal} La phrase suit le modèle : ${humanizeGrammarPattern(question.lesson)}.`;
}

function buildGrammarCorrectionDetails(question: GrammarQuizQuestion): Array<{ title: string; text: string }> {
  const example = question.lesson.examples.find(
    (item) => item.kana === question.japanese || item.kanji === question.japanese || item.fr === question.french
  ) ?? question.lesson.examples[0];
  const translation = question.french ?? example?.fr ?? question.lesson.goal;
  const sentence = getGrammarCorrectionSentence(question);
  const roleAnalysis = buildSimpleRoleAnalysis(question);
  const appliedWhy = buildCaseSpecificGrammarWhy(question);
  return [
    {
      title: 'Traduction',
      text: translation,
    },
    {
      title: 'Phrase analysée',
      text: sentence,
    },
    {
      title: 'Rôle des mots',
      text: roleAnalysis || 'Regarde le mot avant la particule : c’est lui qui donne le rôle dans la phrase.',
    },
    {
      title: 'Pourquoi cette règle ici',
      text: appliedWhy,
    },
    {
      title: 'Erreur à éviter',
      text: question.lesson.trap,
    },
    {
      title: 'À retenir',
      text: buildGrammarMnemonic(question.lesson),
    },
  ];
}

function getGrammarStreakMultiplier(streak: number): number {
  if (streak >= 10) return 5;
  if (streak >= 7) return 4;
  if (streak >= 5) return 3;
  if (streak >= 3) return 2;
  return 1;
}

function createGrammarSession(questions: GrammarQuizQuestion[]): GrammarQuizSession {
  return {
    questions,
    currentIndex: 0,
    selected: null,
    correctCount: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    lives: 3,
    mistakes: [],
    finished: false,
  };
}

function isGrammarAnswerCorrect(answer: string, correctAnswer: string): boolean {
  const expected = normalizeAnswer(correctAnswer);
  const submitted = normalizeAnswer(answer);
  const acceptedRomaji: Record<string, string[]> = {
    は: ['ha', 'wa'],
    へ: ['he', 'e'],
    を: ['wo', 'o'],
    が: ['ga'],
    に: ['ni'],
    で: ['de'],
    の: ['no'],
    も: ['mo'],
    と: ['to'],
    や: ['ya'],
    か: ['ka'],
    から: ['kara'],
    まで: ['made'],
    より: ['yori'],
    て: ['te'],
    た: ['ta'],
    ない: ['nai'],
    たい: ['tai'],
    です: ['desu'],
    ます: ['masu'],
    ません: ['masen'],
    ね: ['ne'],
    よ: ['yo'],
  };
  return submitted === expected || (acceptedRomaji[correctAnswer] ?? []).includes(submitted);
}

function getKanaMasteryStatus(card: KanaCard): 'unseen' | 'weak' | 'known' | 'mastered' {
  if (card.mastered === 1) return 'mastered';
  if (card.seen_count === 0) return 'unseen';
  if (card.review === 1 || card.correct_count / Math.max(1, card.seen_count) < 0.75) return 'weak';
  return 'known';
}

function getKanaStatusStyle(status: 'unseen' | 'weak' | 'known' | 'mastered') {
  if (status === 'mastered') return styles.thumbnailStatusMastered;
  if (status === 'known') return styles.thumbnailStatusKnown;
  if (status === 'weak') return styles.thumbnailStatusWeak;
  return styles.thumbnailStatusUnseen;
}

function getKanaPriority(card: KanaCard): number {
  const successRate = card.seen_count > 0 ? card.correct_count / card.seen_count : 0;
  if (card.review === 1) return 0;
  if (card.seen_count === 0) return 1;
  if (successRate < 0.75) return 2;
  if (card.mastered !== 1) return 3;
  return 4;
}

function buildSmartKanaDeck(cards: KanaCard[]): KanaCard[] {
  return [...cards]
    .sort((a, b) => getKanaPriority(a) - getKanaPriority(b) || a.seen_count - b.seen_count)
    .slice(0, Math.min(20, cards.length));
}

function buildDailyKanaDeck(cards: KanaCard[]): KanaCard[] {
  const weak = cards.filter((card) => getKanaPriority(card) <= 2).slice(0, 10);
  const newCards = cards.filter((card) => card.seen_count === 0).slice(0, 5);
  const maintenance = cards.filter((card) => card.mastered === 1).slice(0, 5);
  const byId = new Map<string, KanaCard>();
  [...weak, ...newCards, ...maintenance].forEach((card) => byId.set(card.id, card));
  return [...byId.values()].slice(0, 20);
}

function getKanaVisual(card: KanaCard, index: number) {
  const palette = [
    ['#AFD98E', '#C98552'],
    ['#719DD0', '#2F3A3A'],
    ['#E4CA59', '#B55D50'],
    ['#C96555', '#2F3A3A'],
    ['#D0A76D', '#3F4A4A'],
    ['#4B4C49', '#D7B846'],
  ];
  const baseCharacter = HIRAGANA_BY_KATAKANA.get(card.character) ?? card.character;
  const mnemonic = ILLUSTRATED_MNEMONICS[baseCharacter];
  const example = card.examples[0];
  const illustration = getVocabularyIllustration(example, card.romaji);
  const wordRomaji = getVocabularyRomaji(example, card.romaji);
  const [background, accent] = palette[index % palette.length];
  return {
    background: mnemonic?.background ?? background,
    accent: mnemonic?.accent ?? accent,
    wordKana: example?.kana ?? example?.japanese ?? card.character,
    wordRomaji,
    meaning: example?.meaning_fr ?? 'son japonais',
    art: mnemonic?.art ?? 'abstract',
    illustrationUri: illustration.uri,
    illustrationFallback: illustration.fallback,
  };
}

function buildKanaSpeechText(card: KanaCard): string {
  const visual = getKanaVisual(card, 0);
  return `${card.character}。${visual.wordKana}。`;
}

function buildKanaMnemonicSentence(
  card: KanaCard,
  visual: ReturnType<typeof getKanaVisual> = getKanaVisual(card, 0)
): string {
  const label = isCombinedKanaFallbackExample(card) ? 'repère' : 'N5';
  return `${card.character} comme ${visual.wordRomaji} : vois ${visual.meaning} dans la forme du kana (${label}).`;
}

function getCombinedKanaExamplePreset(romaji: string): KanaExamplePreset | undefined {
  return COMBINED_KANA_EXAMPLES[romaji] ?? COMBINED_KANA_EXAMPLES[normalizeAnswer(romaji)];
}

function buildCombinedKanaVocabularyExample(character: string, preset: KanaExamplePreset): VocabularyExample {
  return {
    id: `combined-${character}-${preset.romaji}`,
    japanese: preset.kana,
    kana: preset.kana,
    kanji: null,
    romaji: preset.romaji,
    meaning_fr: preset.meaning_fr,
  };
}

function isCombinedKanaFallbackExample(card: KanaCard): boolean {
  return card.examples[0]?.id.startsWith('combined-') ?? false;
}

function getVocabularyIllustration(example?: VocabularyExample, fallbackRomaji = '') {
  const key = normalizeIllustrationKey(getVocabularyRomaji(example, fallbackRomaji));
  const combinedPreset =
    COMBINED_KANA_EXAMPLES[key] ??
    Object.values(COMBINED_KANA_EXAMPLES).find((preset) => normalizeIllustrationKey(preset.romaji) === key);
  if (combinedPreset) return COMBINED_KANA_ILLUSTRATIONS[combinedPreset.illustrationKey];
  if (key && N5_EXAMPLE_ILLUSTRATIONS[key]) return N5_EXAMPLE_ILLUSTRATIONS[key];

  const kanaKey = normalizeIllustrationKey(example?.kana ?? example?.japanese ?? '');
  if (kanaKey === 'denwawosuru') return N5_EXAMPLE_ILLUSTRATIONS.denwawosuru;

  return { uri: openMoji('1F4D8'), fallback: '📘' };
}

function getVocabularyRomaji(example?: VocabularyExample, fallbackRomaji = ''): string {
  const kana = example?.kana ?? example?.japanese ?? '';
  return PREFERRED_N5_ROMAJI[kana] ?? example?.romaji ?? fallbackRomaji;
}

function normalizeIllustrationKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function capitalizeKanaLabel(value: string): string {
  return value.length > 0 ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}

function formatVocabularyExample(example: VocabularyExample): string {
  const reading = example.romaji || example.kana || '';
  return reading
    ? `${example.japanese} · ${reading} · ${example.meaning_fr}`
    : `${example.japanese} · ${example.meaning_fr}`;
}

function normalizeKanaRomaji(character: string, romaji: string): string {
  return ROMAJI_OVERRIDES[character] ?? ROMAJI_OVERRIDES[romaji] ?? romaji;
}

function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

function sortKanaCards(cards: KanaCard[], tab: KanaTab): KanaCard[] {
  if (tab === 'combined') {
    return [...cards].sort((a, b) => a.script.localeCompare(b.script) || a.romaji.localeCompare(b.romaji));
  }
  const standard = tab === 'hiragana' ? HIRAGANA_STANDARD : KATAKANA_STANDARD;
  const order = new Map<string, number>();
  standard.flat().forEach((character, index) => {
    if (character) order.set(character, index);
  });
  return [...cards].sort((a, b) => {
    const aOrder = order.get(a.character) ?? 999;
    const bOrder = order.get(b.character) ?? 999;
    return aOrder - bOrder || a.romaji.localeCompare(b.romaji);
  });
}

function buildLearningPathStages(
  domains: MasteryDomainStats[],
  activity: { attempts: number; quizAttempts: number; examAttempts: number; bestScore: number }
): LearningPathStage[] {
  const domain = (id: string) => domains.find((item) => item.id === id);
  const hiragana = domain('hiragana');
  const katakana = domain('katakana');
  const combined = domain('combined');
  const vocabulary = domain('vocabulary');
  const grammar = domain('grammar');
  const kanji = domain('kanji');
  const kanaDone = (hiragana?.mastered ?? 0) + (katakana?.mastered ?? 0) + (combined?.mastered ?? 0);
  const kanaTotal = (hiragana?.total ?? 0) + (katakana?.total ?? 0) + (combined?.total ?? 0);
  const contentDone = (vocabulary?.mastered ?? 0) + (grammar?.mastered ?? 0) + (kanji?.mastered ?? 0);
  const contentTotal = (vocabulary?.total ?? 0) + (grammar?.total ?? 0) + (kanji?.total ?? 0);

  const rawStages: Omit<LearningPathStage, 'status'>[] = [
    {
      id: 'start',
      order: 1,
      title: 'Démarrage intelligent',
      subtitle: 'Installer le rythme : quelques questions, repérage des points forts et premières données de progression.',
      focus: 'Routine',
      progress: clampProgress(activity.attempts, 30),
      done: Math.min(activity.attempts, 30),
      total: 30,
      reward: '+300 XP · badge de départ',
      screen: 'quiz',
      actionLabel: 'Lancer un quiz',
    },
    {
      id: 'hiragana',
      order: 2,
      title: 'Hiragana solides',
      subtitle: 'Maîtriser les sons de base pour lire les consignes, le vocabulaire et les petites phrases N5.',
      focus: 'Kana',
      progress: masteryProgress(hiragana),
      done: hiragana?.mastered ?? 0,
      total: hiragana?.total ?? 0,
      reward: '+900 XP · badge hiragana',
      screen: 'kana',
      actionLabel: 'Travailler les kana',
    },
    {
      id: 'katakana',
      order: 3,
      title: 'Katakana sans hésitation',
      subtitle: 'Lire les mots étrangers, noms propres et formes courantes qui tombent souvent dans les exercices.',
      focus: 'Kana',
      progress: masteryProgress(katakana),
      done: katakana?.mastered ?? 0,
      total: katakana?.total ?? 0,
      reward: '+900 XP · badge katakana',
      screen: 'kana',
      actionLabel: 'Travailler les kana',
    },
    {
      id: 'combined',
      order: 4,
      title: 'Sons combinés',
      subtitle: 'Automatiser kya, shu, cho et les autres combinaisons pour accélérer la lecture.',
      focus: 'Fluidité',
      progress: masteryProgress(combined),
      done: combined?.mastered ?? 0,
      total: combined?.total ?? 0,
      reward: '+1200 XP · lecture plus rapide',
      screen: 'kana',
      actionLabel: 'Activer combinés',
    },
    {
      id: 'kana-arcade',
      order: 5,
      title: 'Réflexes kana chronométrés',
      subtitle: 'Passer de la reconnaissance lente au réflexe : séries, score, combo et pression légère.',
      focus: 'Vitesse',
      progress: clampProgress(activity.quizAttempts, 80),
      done: Math.min(activity.quizAttempts, 80),
      total: 80,
      reward: '+1500 XP · score arcade',
      screen: 'quiz',
      actionLabel: 'Mode kana quiz',
    },
    {
      id: 'vocabulary',
      order: 6,
      title: 'Vocabulaire N5 priorisé',
      subtitle: 'Apprendre les mots utiles avec rappel adaptatif : les erreurs reviennent plus souvent.',
      focus: 'Vocabulaire',
      progress: masteryProgress(vocabulary),
      done: vocabulary?.mastered ?? 0,
      total: vocabulary?.total ?? 0,
      reward: '+2200 XP · socle lexical',
      screen: 'quiz',
      actionLabel: 'Réviser en quiz',
    },
    {
      id: 'grammar',
      order: 7,
      title: 'Grammaire N5 opérationnelle',
      subtitle: 'Comprendre particules, formes verbales et structures qui font gagner des points rapidement.',
      focus: 'Grammaire',
      progress: masteryProgress(grammar),
      done: grammar?.mastered ?? 0,
      total: grammar?.total ?? 0,
      reward: '+2400 XP · phrases correctes',
      screen: 'quiz',
      actionLabel: 'Réviser en quiz',
    },
    {
      id: 'kanji',
      order: 8,
      title: 'Kanji N5 essentiels',
      subtitle: 'Reconnaître les kanji utiles à l’examen avec lecture, sens et pièges fréquents.',
      focus: 'Kanji',
      progress: masteryProgress(kanji),
      done: kanji?.mastered ?? 0,
      total: kanji?.total ?? 0,
      reward: '+2400 XP · lecture kanji',
      screen: 'quiz',
      actionLabel: 'Réviser en quiz',
    },
    {
      id: 'integration',
      order: 9,
      title: 'Lecture et intégration',
      subtitle: 'Mélanger kana, mots, grammaire et kanji pour préparer les vraies questions du JLPT.',
      focus: 'Compréhension',
      progress: contentTotal > 0 ? Math.round((contentDone / contentTotal) * 100) : 0,
      done: contentDone,
      total: contentTotal,
      reward: '+3000 XP · prêt lecture',
      screen: 'quiz',
      actionLabel: 'Quiz mixte',
    },
    {
      id: 'mock-exam',
      order: 10,
      title: 'Examens blancs',
      subtitle: 'S’entraîner dans les conditions les plus proches du test : endurance, timing et score final.',
      focus: 'JLPT',
      progress: clampProgress(activity.examAttempts, 120),
      done: Math.min(activity.examAttempts, 120),
      total: 120,
      reward: '+5000 XP · objectif réussite',
      screen: 'exam',
      actionLabel: 'Faire un test',
    },
  ];

  let gateOpen = true;
  return rawStages.map((stage) => {
    let status: LearningPathStage['status'] = 'locked';
    if (gateOpen && stage.progress >= 95) {
      status = 'done';
    } else if (gateOpen) {
      status = 'active';
      gateOpen = false;
    }
    return { ...stage, status };
  });
}

function masteryProgress(domain?: MasteryDomainStats): number {
  if (!domain || domain.total <= 0) return 0;
  return Math.min(100, Math.round(((domain.mastered + domain.known * 0.55 + domain.review * 0.2) / domain.total) * 100));
}

function clampProgress(value: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((value / target) * 100));
}

function formatPathStatus(status: LearningPathStage['status']): string {
  if (status === 'done') return 'Maîtrisé';
  if (status === 'active') return 'À faire';
  return 'Verrouillé';
}

function makeGrammarLesson(
  order: number,
  folder: string,
  subfolder: string,
  title: string,
  pattern: string,
  level: GrammarLesson['level'],
  goal: string,
  explanation: string,
  formula: string,
  trap: string,
  examples: Array<[string, string, string, string]>
): GrammarLesson {
  const id = `consolidated-${order}-${title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`;
  return {
    id,
    folder,
    subfolder,
    order,
    title,
    pattern,
    level,
    goal,
    explanation,
    formula,
    trap,
    examples: examples.map(([kana, kanji, romaji, fr], index) => ({
      id: `${id}-ex-${index + 1}`,
      kana,
      kanji,
      romaji,
      fr,
      note: 'Exemple orienté vie courante avec structure utile pour le JLPT.',
    })),
  };
}

function normalizeGrammarLessonForTeacherCourse(lesson: GrammarLesson): GrammarLesson {
  const placement = getTeacherGrammarPlacement(lesson);
  const examples = ensureTeacherGrammarExamples(lesson);
  return {
    ...lesson,
    folder: placement.folder,
    subfolder: placement.subfolder,
    explanation: buildTeacherGrammarExplanation(lesson),
    examples,
  };
}

function getTeacherGrammarPlacement(lesson: GrammarLesson): { folder: string; subfolder: string } {
  const text = `${lesson.folder} ${lesson.subfolder} ${lesson.title} ${lesson.pattern}`.toLowerCase();
  const title = lesson.title;

  if (
    text.includes('présentation') ||
    text.includes('écriture') ||
    text.includes('hiragana') ||
    text.includes('katakana') ||
    text.includes('kanji dans une phrase') ||
    text.includes('glossaire grammatical') ||
    text.includes('vue d’ensemble')
  ) {
    return { folder: '01. Fondations JLPT N5', subfolder: 'Comprendre la langue' };
  }
  if (
    text.includes('question') ||
    text.includes('interrogatif') ||
    /誰|何|どこ|いつ|どう|なぜ|いくら|いくつ|どのくらい/.test(text) ||
    text.includes('これ') ||
    text.includes('それ') ||
    text.includes('あれ') ||
    text.includes('この') ||
    text.includes('その') ||
    text.includes('あの') ||
    text.includes('pronom') ||
    text.includes('démonstratif')
  ) {
    return { folder: '03. Phrase et questions', subfolder: 'Identifier et demander' };
  }
  if (
    text.includes('adjectif') ||
    text.includes('description') ||
    text.includes('comparaison') ||
    text.includes('superlatif') ||
    /高い|高くない|静かです|ほうが|一番/.test(text)
  ) {
    return { folder: '06. Adjectifs et descriptions', subfolder: 'Décrire et comparer' };
  }
  if (
    text.includes('connecteur') ||
    text.includes('cause') ||
    text.includes('opposition') ||
    text.includes('condition') ||
    text.includes('hypothèse') ||
    text.includes('but') ||
    text.includes('intention') ||
    /前に|後で|てから|たり/.test(text)
  ) {
    return { folder: '08. Connecteurs et logique', subfolder: 'Relier deux idées' };
  }
  if (
    text.includes('は') ||
    text.includes('が') ||
    text.includes('を') ||
    text.includes('に') ||
    text.includes('で') ||
    text.includes('へ') ||
    text.includes('の') ||
    text.includes('も') ||
    text.includes('particule') ||
    /^(は|が|を|に|で|へ|の|も|と|や|より|か)\s*[:：]/.test(title)
  ) {
    if (text.includes('fin de phrase') || text.includes('ね') || text.includes('よ')) {
      return { folder: '02. Particules', subfolder: 'Nuances de fin de phrase' };
    }
    if (text.includes('avancée') || text.includes('だけ') || text.includes('しか') || text.includes('まで') || text.includes('ほど')) {
      return { folder: '02. Particules', subfolder: 'Nuances et limites' };
    }
    return { folder: '02. Particules', subfolder: 'Particules essentielles' };
  }
  if (
    text.includes('question') ||
    text.includes('interrogatif') ||
    text.includes('これ') ||
    text.includes('それ') ||
    text.includes('あれ') ||
    text.includes('この') ||
    text.includes('その') ||
    text.includes('あの') ||
    text.includes('pronom') ||
    text.includes('démonstratif')
  ) {
    return { folder: '03. Phrase et questions', subfolder: 'Identifier et demander' };
  }
  if (
    text.includes('temps') ||
    text.includes('heure') ||
    text.includes('date') ||
    text.includes('jour') ||
    text.includes('mois') ||
    text.includes('saison') ||
    text.includes('nombre') ||
    text.includes('quantité') ||
    text.includes('compteur') ||
    text.includes('adverbe') ||
    text.includes('fréquence') ||
    text.includes('durée')
  ) {
    if (text.includes('adverbe') || text.includes('fréquence') || text.includes('durée')) {
      return { folder: '04. Temps, nombres et adverbes', subfolder: 'Fréquence, durée et manière' };
    }
    if (text.includes('heure') || text.includes('date') || text.includes('jour') || text.includes('mois') || text.includes('saison')) {
      return { folder: '04. Temps, nombres et adverbes', subfolder: 'Calendrier et heure' };
    }
    return { folder: '04. Temps, nombres et adverbes', subfolder: 'Nombres, quantités et compteurs' };
  }
  if (
    text.includes('verbe') ||
    text.includes('forme') ||
    text.includes('ます') ||
    text.includes('ない') ||
    text.includes('た') ||
    text.includes('て') ||
    text.includes('potentielle') ||
    text.includes('volitive') ||
    text.includes('passif') ||
    text.includes('causatif') ||
    text.includes('impératif') ||
    text.includes('transitif') ||
    text.includes('intransitif') ||
    text.includes('déplacement') ||
    text.includes('なる')
  ) {
    if (text.includes('déplacement') || text.includes('行く') || text.includes('来る') || text.includes('帰る')) {
      return { folder: '05. Verbes et formes', subfolder: 'Déplacement et actions utiles' };
    }
    if (text.includes('avance') || text.includes('passif') || text.includes('causatif') || text.includes('volitive') || text.includes('potentielle')) {
      return { folder: '05. Verbes et formes', subfolder: 'Formes à reconnaître progressivement' };
    }
    return { folder: '05. Verbes et formes', subfolder: 'Formes N5 prioritaires' };
  }
  if (text.includes('adjectif') || text.includes('description') || text.includes('comparaison') || text.includes('superlatif')) {
    return { folder: '06. Adjectifs et descriptions', subfolder: 'Décrire et comparer' };
  }
  if (
    text.includes('expression') ||
    text.includes('permission') ||
    text.includes('interdiction') ||
    text.includes('obligation') ||
    text.includes('désir') ||
    text.includes('capacité') ||
    text.includes('expérience') ||
    text.includes('interaction') ||
    text.includes('salutation')
  ) {
    return { folder: '07. Expressions utiles', subfolder: 'Situations du quotidien' };
  }
  if (
    text.includes('connecteur') ||
    text.includes('cause') ||
    text.includes('opposition') ||
    text.includes('condition') ||
    text.includes('hypothèse') ||
    text.includes('but') ||
    text.includes('intention')
  ) {
    return { folder: '08. Connecteurs et logique', subfolder: 'Relier deux idées' };
  }
  if (
    text.includes('subordonnée') ||
    text.includes('nominalisation') ||
    text.includes('citation') ||
    text.includes('discours')
  ) {
    return { folder: '09. Lecture et phrases complexes', subfolder: 'Comprendre les phrases longues' };
  }
  if (
    text.includes('style') ||
    text.includes('registre') ||
    text.includes('keigo') ||
    text.includes('oral') ||
    text.includes('écrit') ||
    text.includes('conversation') ||
    text.includes('respectueux') ||
    text.includes('humble')
  ) {
    return { folder: '10. Conversation et registres', subfolder: 'Politesse et naturel' };
  }
  if (
    text.includes('vocabulaire') ||
    text.includes('lexique') ||
    text.includes('glossaire') ||
    text.includes('famille') ||
    text.includes('corps') ||
    text.includes('onomatopée') ||
    text.includes('insulte')
  ) {
    return { folder: '11. Lexique grammatical', subfolder: 'Mots utiles en phrase' };
  }
  if (text.includes('jlpt') || text.includes('exercice') || text.includes('correction')) {
    return { folder: '12. Révision JLPT', subfolder: 'Méthode, corrections et niveaux' };
  }
  return { folder: '03. Phrase et questions', subfolder: 'Construire une phrase simple' };
}

function buildTeacherGrammarExplanation(lesson: GrammarLesson): string {
  const simplePattern = humanizeGrammarPattern(lesson);
  const existing = lesson.explanation.trim();
  const teacherSentences = [
    `Règle professeur : cette leçon se lit avec le moule ${simplePattern}.`,
    `Commence par repérer le rôle de chaque morceau : thème, sujet, objet, lieu, temps, qualité ou action.`,
    `Dans une phrase N5, le petit mot grammatical indique souvent la fonction du mot placé juste avant lui.`,
    `Les exemples ci-dessous montrent le cas concret : lis d’abord la phrase en kanji, puis vérifie le romaji et le français seulement après.`,
    `Pour réussir l’exercice, ne traduis pas mot à mot : demande-toi pourquoi cette règle est nécessaire dans cette situation.`,
  ];
  return `${existing}\n\n${teacherSentences.join(' ')}`;
}

function ensureTeacherGrammarExamples(lesson: GrammarLesson): GrammarLessonExample[] {
  const existing = lesson.examples.map((example, index) => ({
    ...example,
    note: buildTeacherExampleNote(lesson, example, example.note, index),
  }));
  const seen = new Set(existing.map((example) => example.kanji || example.kana));
  const additions: GrammarLessonExample[] = [];

  for (const example of getTeacherExampleCandidates(lesson)) {
    if (existing.length + additions.length >= 3) break;
    if (seen.has(example.kanji || example.kana)) continue;
    seen.add(example.kanji || example.kana);
    additions.push({
      ...example,
      id: `${lesson.id}-teacher-ex-${additions.length + 1}`,
      note: buildTeacherExampleNote(lesson, example, example.note, existing.length + additions.length),
    });
  }

  while (existing.length + additions.length < 3) {
    const index = existing.length + additions.length + 1;
    additions.push({
      id: `${lesson.id}-teacher-fallback-${index}`,
      kana: 'まいにちにほんごをべんきょうします。',
      kanji: '毎日日本語を勉強します。',
      romaji: 'Mainichi nihongo o benkyou shimasu.',
      fr: 'J’étudie le japonais tous les jours.',
      note: buildTeacherExampleNote(
        lesson,
        {
          kana: 'まいにちにほんごをべんきょうします。',
          kanji: '毎日日本語を勉強します。',
          romaji: 'Mainichi nihongo o benkyou shimasu.',
          fr: 'J’étudie le japonais tous les jours.',
          note: '',
        },
        'Exemple de secours volontairement simple pour garder une phrase N5 analysable.',
        index - 1
      ),
    });
  }

  return [...existing, ...additions];
}

function buildTeacherExampleNote(
  lesson: GrammarLesson,
  example: Pick<GrammarLessonExample, 'kanji' | 'kana' | 'romaji' | 'fr' | 'note'>,
  originalNote: string,
  index: number
): string {
  const label = index === 0 ? 'Cas de base' : index === 1 ? 'Variation guidée' : 'Cas d’entraînement';
  return `${label} : ${originalNote} Ici, observe comment “${example.kanji || example.kana}” applique la règle “${humanizeGrammarPattern(
    lesson
  )}”. La traduction sert à vérifier le sens après avoir reconnu la structure.`;
}

function getTeacherExampleCandidates(lesson: GrammarLesson): GrammarLessonExample[] {
  const text = `${lesson.folder} ${lesson.subfolder} ${lesson.title} ${lesson.pattern}`.toLowerCase();
  const title = lesson.title;
  const candidates: Array<Omit<GrammarLessonExample, 'id'>> = [];

  const add = (kana: string, kanji: string, romaji: string, fr: string, note: string) => {
    candidates.push({ kana, kanji, romaji, fr, note });
  };

  if (title.includes('は') || text.includes(' は ')) {
    add('あしたはやすみです。', '明日は休みです。', 'Ashita wa yasumi desu.', 'Demain, c’est repos.', 'は annonce 明日 comme thème de conversation.');
  }
  if (title.includes('が') || text.includes(' が ')) {
    add('いぬがいます。', '犬がいます。', 'Inu ga imasu.', 'Il y a un chien.', 'が pointe précisément ce qui existe.');
  }
  if (title.includes('を') || text.includes(' を ')) {
    add('おちゃをのみます。', 'お茶を飲みます。', 'Ocha o nomimasu.', 'Je bois du thé.', 'を marque la chose touchée par boire.');
  }
  if (title.includes('に') || text.includes(' に ')) {
    add('くじにねます。', '九時に寝ます。', 'Ku-ji ni nemasu.', 'Je dors à neuf heures.', 'に fixe un moment précis sur l’horloge.');
  }
  if (title.includes('で') || text.includes(' で ')) {
    add('うちでべんきょうします。', '家で勉強します。', 'Uchi de benkyou shimasu.', 'J’étudie à la maison.', 'で indique le lieu où l’action se passe.');
  }
  if (title.includes('へ') || text.includes(' へ ')) {
    add('あしたえきへいきます。', '明日駅へ行きます。', 'Ashita eki e ikimasu.', 'Demain, je vais à la gare.', 'へ indique la direction du déplacement.');
  }
  if (title.includes('の') || text.includes(' の ')) {
    add('これはともだちのほんです。', 'これは友達の本です。', 'Kore wa tomodachi no hon desu.', 'C’est le livre de mon ami.', 'の relie le possesseur et le nom principal.');
  }
  if (title.includes('も') || text.includes(' も')) {
    add('わたしもにほんごをべんきょうします。', '私も日本語を勉強します。', 'Watashi mo nihongo o benkyou shimasu.', 'Moi aussi, j’étudie le japonais.', 'も ajoute le même type d’information.');
  }
  if (text.includes('question') || title.includes('か')) {
    add('これはなんですか。', 'これは何ですか。', 'Kore wa nan desu ka.', 'Qu’est-ce que c’est ?', 'か transforme la phrase polie en question.');
  }
  if (text.includes('heure') || text.includes('temps') || text.includes('date')) {
    add('まいあさしちじにおきます。', '毎朝七時に起きます。', 'Maiasa shichi-ji ni okimasu.', 'Tous les matins, je me lève à sept heures.', 'Le temps rend la phrase précise et vérifiable.');
  }
  if (text.includes('adverbe') || text.includes('fréquence')) {
    add('いつもはやくおきます。', 'いつも早く起きます。', 'Itsumo hayaku okimasu.', 'Je me lève toujours tôt.', 'L’adverbe précise la fréquence ou la manière.');
  }
  if (text.includes('adjectif') || text.includes('description')) {
    add('このへやはあかるいです。', 'この部屋は明るいです。', 'Kono heya wa akarui desu.', 'Cette pièce est lumineuse.', 'L’adjectif donne une qualité au thème.');
  }
  if (text.includes('verbe') || text.includes('ます')) {
    add('まいにちにほんごをべんきょうします。', '毎日日本語を勉強します。', 'Mainichi nihongo o benkyou shimasu.', 'J’étudie le japonais tous les jours.', 'Le verbe final donne l’action principale.');
  }
  if (text.includes('ない') || text.includes('négation')) {
    add('きょうはテレビをみません。', '今日はテレビを見ません。', 'Kyou wa terebi o mimasen.', 'Aujourd’hui, je ne regarde pas la télévision.', 'La négation change l’action sans changer le reste de la phrase.');
  }
  if (text.includes('た') || text.includes('passé')) {
    add('きのうほんをよみました。', '昨日本を読みました。', 'Kinou hon o yomimashita.', 'Hier, j’ai lu un livre.', 'Le passé est confirmé par 昨日 et par la forme du verbe.');
  }
  if (text.includes('て')) {
    add('ここにすわってください。', 'ここに座ってください。', 'Koko ni suwatte kudasai.', 'Asseyez-vous ici, s’il vous plaît.', 'La forme て accroche le verbe à une demande.');
  }
  if (text.includes('permission')) {
    add('ここでしゃしんをとってもいいです。', 'ここで写真を撮ってもいいです。', 'Koko de shashin o totte mo ii desu.', 'On peut prendre des photos ici.', 'てもいい indique que l’action est autorisée.');
  }
  if (text.includes('interdiction')) {
    add('ここでたばこをすってはいけません。', 'ここでたばこを吸ってはいけません。', 'Koko de tabako o sutte wa ikemasen.', 'Il ne faut pas fumer ici.', 'てはいけません signale une interdiction.');
  }
  if (text.includes('obligation')) {
    add('まいにちべんきょうしなければなりません。', '毎日勉強しなければなりません。', 'Mainichi benkyou shinakereba narimasen.', 'Il faut étudier tous les jours.', 'なければなりません exprime une obligation.');
  }
  if (text.includes('connecteur') || text.includes('cause') || text.includes('opposition')) {
    add('あめですから、いきません。', '雨ですから、行きません。', 'Ame desu kara, ikimasen.', 'Comme il pleut, je n’y vais pas.', 'Le connecteur explique le lien logique entre deux idées.');
  }
  if (text.includes('salutation') || text.includes('conversation')) {
    add('おはようございます。げんきですか。', 'おはようございます。元気ですか。', 'Ohayou gozaimasu. Genki desu ka.', 'Bonjour. Ça va ?', 'La situation sociale détermine la formule naturelle.');
  }
  if (text.includes('famille')) {
    add('父は会社員です。', '父は会社員です。', 'Chichi wa kaishain desu.', 'Mon père est employé de bureau.', 'Les mots de famille se placent dans des phrases très simples.');
  }
  if (text.includes('corps')) {
    add('足が痛いです。', '足が痛いです。', 'Ashi ga itai desu.', 'J’ai mal au pied / à la jambe.', 'が marque la partie du corps concernée.');
  }
  if (text.includes('jlpt') || text.includes('exercice') || text.includes('correction')) {
    add('まちがえたもんだいをもういちどします。', '間違えた問題をもう一度します。', 'Machigaeta mondai o mou ichido shimasu.', 'Je refais encore une fois les questions ratées.', 'La correction sert à transformer une erreur en révision active.');
  }

  add('これはにほんごのほんです。', 'これは日本語の本です。', 'Kore wa nihongo no hon desu.', 'C’est un livre de japonais.', 'Phrase N5 courte pour réviser thème, possession et です.');
  add('あしたがっこうへいきます。', '明日学校へ行きます。', 'Ashita gakkou e ikimasu.', 'Demain, je vais à l’école.', 'Phrase N5 utile pour temps, destination et verbe final.');
  add('ここでみずをのみます。', 'ここで水を飲みます。', 'Koko de mizu o nomimasu.', 'Je bois de l’eau ici.', 'Phrase N5 utile pour lieu, objet et action.');

  return candidates.map((candidate, index) => ({
    ...candidate,
    id: `${lesson.id}-candidate-${index + 1}`,
  }));
}

function getGrammarMainMenu(lesson: GrammarLesson): string {
  const text = `${lesson.folder} ${lesson.subfolder} ${lesson.title} ${lesson.pattern}`.toLowerCase();
  const detailText = `${lesson.subfolder} ${lesson.title} ${lesson.pattern}`.toLowerCase();
  if (text.includes('01. fondations')) return 'Écriture et bases';
  if (text.includes('02. particules')) return 'Particules';
  if (text.includes('03. phrase')) {
    if (
      text.includes('question') ||
      text.includes('identifier et demander') ||
      /誰|何|どこ|いつ|どう|なぜ|いくら|いくつ|どれ|どの|どちら/.test(text)
    ) {
      return 'Questions';
    }
    return 'Structure de phrase';
  }
  if (text.includes('04. temps')) return 'Temps et adverbes';
  if (text.includes('05. verbes')) {
    if (
      detailText.includes('formes n5') ||
      detailText.includes('forme') ||
      detailText.includes('conjugaison') ||
      detailText.includes('godan') ||
      detailText.includes('ichidan') ||
      detailText.includes('ます') ||
      detailText.includes('ない') ||
      detailText.includes('passif') ||
      detailText.includes('causatif')
    ) {
      return 'Formes verbales';
    }
    return 'Verbes et actions';
  }
  if (text.includes('06. adjectifs')) return 'Adjectifs';
  if (text.includes('07. expressions')) return 'Expressions pratiques';
  if (text.includes('08. connecteurs')) return 'Connecteurs';
  if (text.includes('09. lecture')) return 'Phrases complexes';
  if (text.includes('10. conversation')) return 'Style et registre';
  if (text.includes('11. lexique')) return 'Lexique en contexte';
  if (text.includes('12. révision')) return 'Méthode et corrections';
  if (
    text.includes('présentation générale') ||
    text.includes('système') ||
    text.includes('écriture') ||
    text.includes('hiragana') ||
    text.includes('katakana') ||
    text.includes('kanji dans une phrase')
  ) {
    return 'Écriture et bases';
  }
  if (
    text.includes('particule') ||
    /^(は|が|を|に|で|へ|の|も|と|や|より|か)\s*[:：]/.test(lesson.title) ||
    lesson.title.includes('Particules de fin')
  ) {
    return 'Particules';
  }
  if (text.includes('adjectif') || text.includes('descriptions') || text.includes('comparaison') || text.includes('superlatif')) {
    return 'Adjectifs';
  }
  if (
    text.includes('forme') ||
    text.includes('conjugaison') ||
    text.includes('potentielle') ||
    text.includes('volitive') ||
    text.includes('passif') ||
    text.includes('causatif') ||
    text.includes('impératif')
  ) {
    return 'Formes verbales';
  }
  if (
    text.includes('verbe') ||
    text.includes('actions') ||
    text.includes('déplacement') ||
    text.includes('transitif') ||
    text.includes('intransitif') ||
    text.includes('donner') ||
    text.includes('recevoir')
  ) {
    return 'Verbes et actions';
  }
  if (text.includes('question') || text.includes('interrogatif') || text.includes('どれ') || text.includes('だれ')) {
    return 'Questions';
  }
  if (
    text.includes('temps') ||
    text.includes('heure') ||
    text.includes('date') ||
    text.includes('jour') ||
    text.includes('mois') ||
    text.includes('saison') ||
    text.includes('nombre') ||
    text.includes('quantité') ||
    text.includes('compteur') ||
    text.includes('adverbe') ||
    text.includes('fréquence') ||
    text.includes('durée')
  ) {
    return 'Temps et adverbes';
  }
  if (text.includes('connecteur') || text.includes('cause') || text.includes('opposition') || text.includes('condition') || text.includes('hypothèse') || text.includes('but')) {
    return 'Connecteurs';
  }
  if (text.includes('subordonnée') || text.includes('nominalisation') || text.includes('citation') || text.includes('discours')) {
    return 'Phrases complexes';
  }
  if (text.includes('style') || text.includes('registre') || text.includes('keigo') || text.includes('oral') || text.includes('écrit') || text.includes('respectueux') || text.includes('humble')) {
    return 'Style et registre';
  }
  if (
    text.includes('vocabulaire') ||
    text.includes('lexique') ||
    text.includes('glossaire') ||
    text.includes('famille') ||
    text.includes('corps') ||
    text.includes('onomatopée') ||
    text.includes('insulte')
  ) {
    return 'Lexique en contexte';
  }
  if (
    text.includes('exercice') ||
    text.includes('correction') ||
    text.includes('erreur') ||
    text.includes('révision') ||
    text.includes('mémoriser')
  ) {
    return 'Méthode et corrections';
  }
  if (text.includes('jlpt')) {
    return 'JLPT';
  }
  if (text.includes('expression') || text.includes('permission') || text.includes('interdiction') || text.includes('obligation') || text.includes('désir') || text.includes('capacité') || text.includes('expérience') || text.includes('interaction') || text.includes('vie courante')) {
    return 'Expressions pratiques';
  }
  return 'Structure de phrase';
}

function buildGrammarMasteryDomain(summary: GrammarProgressSummary): MasteryDomainStats {
  const known = Math.max(0, summary.opened - summary.completed);
  const review =
    summary.exerciseAttempts > 0 && summary.exerciseRate < 70
      ? Math.min(known, Math.max(1, Math.round(summary.exerciseAttempts / 5)))
      : 0;
  return {
    id: 'grammar',
    label: 'Grammaire',
    total: summary.total,
    mastered: summary.completed,
    known: Math.max(0, known - review),
    review,
    unseen: Math.max(0, summary.total - summary.opened),
    attempted: summary.exerciseAttempts,
    correct: summary.exerciseCorrect,
    rate: summary.exerciseRate,
  };
}

function getVocabularyCategory(item: VocabularyExample): string {
  const text = `${item.japanese} ${item.kana ?? ''} ${item.kanji ?? ''} ${item.romaji ?? ''} ${item.meaning_fr}`.toLowerCase();
  if (/父|母|兄|姉|弟|妹|家族|famille|père|mère|frère|sœur/.test(text)) return 'Famille';
  if (/頭|手|足|目|耳|口|体|corps|tête|main|pied|jambe|œil|oreille/.test(text)) return 'Corps';
  if (/食|飲|水|茶|肉|魚|米|パン|ご飯|nourriture|manger|boire|eau|thé|riz|pain/.test(text)) return 'Nourriture et boissons';
  if (/学校|先生|学生|本|鉛筆|勉強|école|professeur|étudiant|livre|crayon/.test(text)) return 'École et étude';
  if (/駅|電車|車|道|行|来|帰|gare|train|voiture|route|aller|venir|rentrer/.test(text)) return 'Déplacements';
  if (/今日|明日|昨日|時|分|月|日|年|matin|soir|heure|jour|mois|année|demain|hier/.test(text)) return 'Temps et calendrier';
  if (/赤|青|白|黒|大|小|新|古|高|安|couleur|grand|petit|nouveau|cher/.test(text)) return 'Descriptions';
  if (/こんにちは|ありがとう|すみません|salut|bonjour|merci|pardon/.test(text)) return 'Expressions';
  return 'Vocabulaire général';
}

function getVocabularyThemeLabel(item: VocabularyItem | VocabularyExample): string {
  const rawTheme = 'theme' in item ? item.theme : null;
  if (rawTheme?.trim()) return formatVocabularyTheme(rawTheme);
  return getVocabularyCategory(item);
}

function formatVocabularyTheme(theme: string): string {
  const normalized = theme
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  const known: Record<string, string> = {
    nourriture: 'Nourriture et boissons',
    nourriture_boisson: 'Nourriture et boissons',
    'nourriture boisson': 'Nourriture et boissons',
    lieux: 'Lieux',
    temps: 'Temps et calendrier',
    famille: 'Famille',
    corps: 'Corps',
    transport: 'Déplacements',
    deplacements: 'Déplacements',
    déplacements: 'Déplacements',
    ecole: 'École et étude',
    école: 'École et étude',
    animaux: 'Animaux',
    nature: 'Nature',
    nombres: 'Nombres',
    couleurs: 'Couleurs',
    adjectifs: 'Descriptions',
    verbes: 'Verbes et actions',
  };
  if (known[normalized]) return known[normalized];
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function getVocabularyVisual(item: VocabularyItem): { kind: string; symbol: string; colors: [string, string] } {
  const text = `${getVocabularyThemeLabel(item)} ${item.japanese} ${item.kana ?? ''} ${item.kanji ?? ''} ${item.meaning_fr}`.toLowerCase();
  if (/chat|chien|oiseau|poisson|animal|猫|犬|鳥|魚/.test(text)) return { kind: 'animal', symbol: '生', colors: ['#4BAE7F', '#1F7A68'] };
  if (/eau|thé|riz|pain|viande|poisson|manger|boire|nourriture|食|飲|水|茶|肉|魚|米|パン/.test(text)) return { kind: 'food', symbol: '食', colors: ['#F08A4B', '#C83543'] };
  if (/mère|père|frère|sœur|famille|ami|personne|父|母|兄|姉|弟|妹|友|人/.test(text)) return { kind: 'family', symbol: '人', colors: ['#E85D75', '#9A4DAD'] };
  if (/école|étude|livre|crayon|professeur|étudiant|学校|学|本|書|先生|学生|鉛筆/.test(text)) return { kind: 'study', symbol: '学', colors: ['#4F8CC9', '#1B5E8C'] };
  if (/gare|train|voiture|route|aller|venir|rentrer|déplacement|駅|電車|車|道|行|来|帰/.test(text)) return { kind: 'transport', symbol: '車', colors: ['#2D7DD2', '#143D73'] };
  if (/jour|mois|année|heure|temps|matin|soir|hier|demain|今日|明日|昨日|時|分|月|日|年/.test(text)) return { kind: 'time', symbol: '時', colors: ['#F6C85F', '#D7891B'] };
  if (/montagne|rivière|pluie|feu|ciel|arbre|nature|山|川|雨|火|水|天|木/.test(text)) return { kind: 'nature', symbol: '山', colors: ['#52A66B', '#28745C'] };
  if (/rouge|bleu|blanc|noir|couleur|赤|青|白|黒/.test(text)) return { kind: 'color', symbol: '色', colors: ['#F05A5A', '#4666D8'] };
  if (/grand|petit|nouveau|ancien|cher|haut|long|大|小|新|古|高|長/.test(text)) return { kind: 'description', symbol: '形', colors: ['#A77BD8', '#5C4BB2'] };
  if (/main|pied|tête|œil|oreille|bouche|corps|手|足|頭|目|耳|口|体/.test(text)) return { kind: 'body', symbol: '手', colors: ['#E0A95C', '#B45A3C'] };
  if (/yen|argent|acheter|magasin|円|金|買|店/.test(text)) return { kind: 'money', symbol: '円', colors: ['#E6C84F', '#8F7A17'] };
  if (/bonjour|merci|pardon|expression|salut|こんにちは|ありがとう|すみません/.test(text)) return { kind: 'expression', symbol: '会', colors: ['#47B8A8', '#186B63'] };
  if (/verbe|faire|voir|écouter|lire|parler|écrire|見|聞|読|話|書|する/.test(text)) return { kind: 'action', symbol: '動', colors: ['#D86F45', '#A8324B'] };
  return { kind: 'object', symbol: '語', colors: ['#325B67', '#152B3A'] };
}

function renderVocabularyVisualShape(kind: string): ReactNode {
  if (kind === 'food') {
    return (
      <G opacity="0.86">
        <Circle cx="60" cy="58" r="30" fill="#FFF6DA" />
        <Circle cx="52" cy="52" r="5" fill="#D94B3D" />
        <Circle cx="69" cy="60" r="5" fill="#2F8A50" />
        <Path d="M28 87 C46 98 74 98 92 87" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" />
      </G>
    );
  }
  if (kind === 'transport') {
    return (
      <G opacity="0.9">
        <Rect x="28" y="42" width="64" height="35" rx="10" fill="#FFFFFF" />
        <Rect x="37" y="49" width="18" height="12" rx="3" fill="#8CC7F4" />
        <Rect x="64" y="49" width="18" height="12" rx="3" fill="#8CC7F4" />
        <Circle cx="43" cy="82" r="7" fill="#152B3A" />
        <Circle cx="77" cy="82" r="7" fill="#152B3A" />
      </G>
    );
  }
  if (kind === 'time') {
    return (
      <G opacity="0.9">
        <Circle cx="60" cy="58" r="34" fill="#FFFFFF" />
        <Line x1="60" y1="58" x2="60" y2="35" stroke="#152B3A" strokeWidth="6" strokeLinecap="round" />
        <Line x1="60" y1="58" x2="79" y2="67" stroke="#152B3A" strokeWidth="6" strokeLinecap="round" />
      </G>
    );
  }
  if (kind === 'nature') {
    return (
      <G opacity="0.9">
        <Path d="M18 86 L46 42 L65 86 Z" fill="#FFFFFF" />
        <Path d="M48 86 L78 35 L105 86 Z" fill="#E8FFF4" />
        <Circle cx="88" cy="28" r="10" fill="#FFEFA6" />
      </G>
    );
  }
  if (kind === 'family' || kind === 'animal') {
    return (
      <G opacity="0.88">
        <Circle cx="47" cy="50" r="15" fill="#FFFFFF" />
        <Circle cx="75" cy="50" r="15" fill="#FFF1D6" />
        <Path d="M25 91 C34 72 52 72 60 91" fill="#FFFFFF" />
        <Path d="M60 91 C68 72 86 72 95 91" fill="#FFF1D6" />
      </G>
    );
  }
  if (kind === 'study') {
    return (
      <G opacity="0.9">
        <Path d="M29 36 H82 C88 36 93 41 93 47 V88 H39 C33 88 29 84 29 78 Z" fill="#FFFFFF" />
        <Path d="M39 36 V88" stroke="#4F8CC9" strokeWidth="5" />
        <Line x1="49" y1="52" x2="82" y2="52" stroke="#152B3A" strokeWidth="4" strokeLinecap="round" />
        <Line x1="49" y1="65" x2="76" y2="65" stroke="#152B3A" strokeWidth="4" strokeLinecap="round" />
      </G>
    );
  }
  return (
    <G opacity="0.86">
      <Rect x="30" y="34" width="60" height="60" rx="14" fill="#FFFFFF" />
      <Circle cx="45" cy="49" r="7" fill="#F6C85F" />
      <Path d="M38 82 L55 63 L66 75 L76 58 L89 82 Z" fill="#8FD6C7" />
    </G>
  );
}

function getVocabularyMainText(item: VocabularyExample): string {
  return item.kanji?.trim() || item.japanese?.trim() || item.kana?.trim() || '語';
}

function buildVocabularyCards(items: VocabularyItem[], kanjiItems: KanjiItem[] = []): VocabularyCardData[] {
  const kanjiCards = kanjiItems.map((kanji) => {
    const relatedEntries = items.filter((item) => vocabularyItemContainsKanji(item, kanji.character));
    const primary = relatedEntries[0] ?? createVocabularyItemFromKanji(kanji);
    return {
      id: `kanji-card-${kanji.id}`,
      root: kanji.character,
      primary,
      entries: relatedEntries.length ? relatedEntries : [primary],
      readings: uniqueCompact([
        ...(kanji.n5_readings ? splitVocabularyField(kanji.n5_readings) : []),
        ...relatedEntries.flatMap((entry) => splitVocabularyField(entry.romaji)),
      ]),
      kanaReadings: uniqueCompact(relatedEntries.flatMap((entry) => splitVocabularyField(entry.kana || entry.japanese))),
      meanings: uniqueCompact([kanji.meaning_fr, ...relatedEntries.flatMap((entry) => splitVocabularyField(entry.meaning_fr))]),
      kanji,
    };
  });
  const kanjiRoots = new Set(kanjiItems.map((kanji) => kanji.character));
  const grouped = new Map<string, VocabularyItem[]>();
  items.forEach((item) => {
    const root = getVocabularyRoot(item);
    if (kanjiRoots.has(root)) return;
    const group = grouped.get(root) ?? [];
    group.push(item);
    grouped.set(root, group);
  });

  const vocabularyCards = Array.from(grouped.entries()).map(([root, entries]) => {
    const sortedEntries = [...entries].sort((a, b) => {
      const aMain = getVocabularyMainText(a);
      const bMain = getVocabularyMainText(b);
      if (aMain === root && bMain !== root) return -1;
      if (bMain === root && aMain !== root) return 1;
      return aMain.length - bMain.length;
    });
    const primary = sortedEntries[0];
    return {
      id: `vocab-root-${root}`,
      root,
      primary,
      entries: sortedEntries,
      readings: uniqueCompact(sortedEntries.flatMap((entry) => splitVocabularyField(entry.romaji))),
      kanaReadings: uniqueCompact(sortedEntries.flatMap((entry) => splitVocabularyField(entry.kana || entry.japanese))),
      meanings: uniqueCompact(sortedEntries.flatMap((entry) => splitVocabularyField(entry.meaning_fr))),
    };
  });
  return [...kanjiCards, ...vocabularyCards];
}

function getVocabularyRoot(item: VocabularyExample): string {
  const kanjiText = item.kanji?.trim() || item.japanese?.trim() || '';
  const kanjiChars = kanjiText.match(/[\u4E00-\u9FFF]/gu);
  if (kanjiChars?.length) return kanjiChars[0];
  return getVocabularyMainText(item);
}

function vocabularyItemContainsKanji(item: VocabularyExample, character: string): boolean {
  const text = `${item.kanji ?? ''}${item.japanese ?? ''}`;
  return text.includes(character);
}

function createVocabularyItemFromKanji(kanji: KanjiItem): VocabularyItem {
  return {
    id: `synthetic-${kanji.id}`,
    japanese: kanji.character,
    kana: kanji.n5_readings,
    kanji: kanji.character,
    romaji: kanji.n5_readings,
    meaning_fr: kanji.meaning_fr,
    category: 'Kanji JLPT N5',
    jlpt_level: kanji.jlpt_level,
  };
}

function getVocabularyCardSearchText(card: VocabularyCardData): string {
  return [
    card.root,
    card.kanji?.meaning_fr,
    card.kanji?.onyomi,
    card.kanji?.kunyomi,
    card.kanji?.n5_readings,
    ...card.readings,
    ...card.kanaReadings,
    ...card.meanings,
    ...card.entries.flatMap((entry) => [entry.japanese, entry.kana, entry.kanji, entry.romaji, entry.meaning_fr]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function splitVocabularyField(value?: string | null): string[] {
  if (!value) return [];
  return value
    .split(/[;,/、・]| ou | et /i)
    .map((part) => part.trim())
    .filter(Boolean);
}

function uniqueCompact(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  values.forEach((value) => {
    const normalized = value.trim();
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) return;
    seen.add(key);
    result.push(normalized);
  });
  return result;
}

async function loadVocabularyItems(db: SQLiteDatabase): Promise<{
  rows: VocabularyItem[];
  total: number;
  n5: number;
}> {
  try {
    const rows = await db.getAllAsync<VocabularyItem>(`
      SELECT id, japanese, kana, kanji, romaji, meaning_fr, part_of_speech, theme, COALESCE(jlpt_level, 'N5') AS jlpt_level
      FROM canonical_vocabulary
      ORDER BY CASE WHEN kana IS NULL OR kana = '' THEN japanese ELSE kana END
      LIMIT 2500
    `);
    const totalRow = await db.getFirstAsync<{ count: number }>(`
      SELECT COUNT(*) AS count
      FROM canonical_vocabulary
    `);
    const n5Row = await db.getFirstAsync<{ count: number }>(`
      SELECT COUNT(*) AS count
      FROM canonical_vocabulary
      WHERE COALESCE(jlpt_level, 'N5') = 'N5'
    `);
    return {
      rows: rows.map((row) => ({
        ...row,
        category: getVocabularyCategory(row),
        jlpt_level: row.jlpt_level ?? 'N5',
      })),
      total: totalRow?.count ?? rows.length,
      n5: n5Row?.count ?? rows.length,
    };
  } catch (error) {
    console.warn('Vocabulary level column unavailable, loading vocabulary as N5 fallback', error);
    const rows = await db.getAllAsync<VocabularyExample>(`
      SELECT id, japanese, kana, kanji, romaji, meaning_fr
      FROM canonical_vocabulary
      ORDER BY CASE WHEN kana IS NULL OR kana = '' THEN japanese ELSE kana END
      LIMIT 2500
    `);
    const totalRow = await db.getFirstAsync<{ count: number }>(`
      SELECT COUNT(*) AS count
      FROM canonical_vocabulary
    `);
    const mappedRows = rows.map((row) => ({
      ...row,
      category: getVocabularyCategory(row),
      jlpt_level: 'N5',
    }));
    return {
      rows: mappedRows,
      total: totalRow?.count ?? mappedRows.length,
      n5: totalRow?.count ?? mappedRows.length,
    };
  }
}

async function loadKanjiItems(db: SQLiteDatabase): Promise<KanjiItem[]> {
  return db.getAllAsync<KanjiItem>(`
    SELECT id, character, meaning_fr, onyomi, kunyomi, n5_readings, stroke_count, jlpt_level
    FROM canonical_kanji
    WHERE jlpt_level = 'N5'
    ORDER BY id
  `);
}

async function loadGrammarProgressSummary(db: SQLiteDatabase): Promise<GrammarProgressSummary> {
  const rows = await db.getAllAsync<{
    lesson_id: string;
    opened_count: number;
    completed: number;
    exercise_attempts: number;
    exercise_correct: number;
  }>(`
    SELECT lesson_id, opened_count, completed, exercise_attempts, exercise_correct
    FROM app_grammar_lesson_state
  `);
  const lessonById = new Map(ALL_GRAMMAR_LESSONS.map((lesson) => [lesson.id, lesson]));
  const validRows = rows.filter((row) => lessonById.has(row.lesson_id));
  const opened = validRows.filter((row) => row.opened_count > 0).length;
  const completed = validRows.filter((row) => row.completed === 1).length;
  const exerciseAttempts = validRows.reduce((sum, row) => sum + row.exercise_attempts, 0);
  const exerciseCorrect = validRows.reduce((sum, row) => sum + row.exercise_correct, 0);
  const menusOpened = new Set(
    validRows
      .filter((row) => row.opened_count > 0)
      .map((row) => getGrammarMainMenu(lessonById.get(row.lesson_id)!))
  ).size;
  return {
    total: ALL_GRAMMAR_LESSONS.length,
    opened,
    completed,
    exerciseAttempts,
    exerciseCorrect,
    exerciseRate: exerciseAttempts > 0 ? Math.round((exerciseCorrect / exerciseAttempts) * 100) : 0,
    menusOpened,
  };
}

async function loadGrammarLessonStatusById(db: SQLiteDatabase): Promise<Record<string, GrammarLessonStatus>> {
  const rows = await db.getAllAsync<{ lesson_id: string; completed: number }>(`
    SELECT lesson_id, completed
    FROM app_grammar_lesson_state
  `);
  const validIds = new Set(ALL_GRAMMAR_LESSONS.map((lesson) => lesson.id));
  return rows.reduce<Record<string, GrammarLessonStatus>>((acc, row) => {
    if (!validIds.has(row.lesson_id)) return acc;
    acc[row.lesson_id] = numberToGrammarLessonStatus(row.completed);
    return acc;
  }, {});
}

async function markGrammarLessonOpened(db: SQLiteDatabase, lessonId: string): Promise<void> {
  await db.runAsync(
    `
    INSERT INTO app_grammar_lesson_state (
      lesson_id, opened_count, completed, exercise_attempts, exercise_correct, updated_at
    ) VALUES (?, 1, 0, 0, 0, datetime('now'))
    ON CONFLICT(lesson_id) DO UPDATE SET
      opened_count = opened_count + 1,
      updated_at = datetime('now')
    `,
    lessonId
  );
}

async function setGrammarLessonStatus(
  db: SQLiteDatabase,
  lessonId: string,
  status: GrammarLessonStatus
): Promise<void> {
  const value = grammarLessonStatusToNumber(status);
  await db.runAsync(
    `
    INSERT INTO app_grammar_lesson_state (
      lesson_id, opened_count, completed, exercise_attempts, exercise_correct, updated_at
    ) VALUES (?, 1, ?, 0, 0, datetime('now'))
    ON CONFLICT(lesson_id) DO UPDATE SET
      completed = ?,
      opened_count = MAX(opened_count, 1),
      updated_at = datetime('now')
    `,
    lessonId,
    value,
    value
  );
}

function grammarLessonStatusToNumber(status: GrammarLessonStatus): number {
  if (status === 'understood') return 1;
  if (status === 'not_understood') return -1;
  return 0;
}

function numberToGrammarLessonStatus(value: number): GrammarLessonStatus {
  if (value === 1) return 'understood';
  if (value === -1) return 'not_understood';
  return 'neutral';
}

function formatGrammarLessonStatus(status: GrammarLessonStatus): string {
  if (status === 'understood') return 'Comprise';
  if (status === 'not_understood') return 'Non comprise';
  return 'Neutre';
}

async function recordGrammarExerciseAttempt(
  db: SQLiteDatabase,
  lesson: GrammarLesson,
  selectedAnswer: string,
  correctAnswer: string,
  isCorrect: boolean,
  sourceMode: 'grammar_lesson' | 'grammar_quiz' | 'grammar_matching'
): Promise<void> {
  await db.runAsync(
    `
    INSERT INTO app_grammar_lesson_state (
      lesson_id, opened_count, completed, exercise_attempts, exercise_correct, updated_at
    ) VALUES (?, 1, 0, 1, ?, datetime('now'))
    ON CONFLICT(lesson_id) DO UPDATE SET
      opened_count = MAX(opened_count, 1),
      exercise_attempts = exercise_attempts + 1,
      exercise_correct = exercise_correct + ?,
      updated_at = datetime('now')
    `,
    lesson.id,
    isCorrect ? 1 : 0,
    isCorrect ? 1 : 0
  );
  await db.runAsync(
    `
    INSERT INTO app_question_attempt_local (
      id, question_id, source_mode, selected_answer, correct_answer,
      is_correct, skill_id, answered_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `,
    `${Date.now()}-${Math.random()}`,
    `${sourceMode}:${lesson.id}:${Date.now()}`,
    sourceMode,
    selectedAnswer,
    correctAnswer,
    isCorrect ? 1 : 0,
    `grammar:${getGrammarMainMenu(lesson)}`
  );
}

function buildGrammarUseCase(lesson: GrammarLesson): string {
  const base = `Cette règle sert à ${lesson.goal.charAt(0).toLowerCase()}${lesson.goal.slice(1)}`;
  if (lesson.folder.includes('Fondations')) {
    return `${base} Elle te donne la charpente de la phrase japonaise : qui, quoi, où, quand, puis l’information importante à la fin.`;
  }
  if (lesson.folder.includes('Verbes')) {
    return `${base} Elle permet de parler d’actions réelles : ce que tu fais, ne fais pas, as fait, veux faire ou demandes à quelqu’un de faire.`;
  }
  if (lesson.folder.includes('Temps')) {
    return `${base} Elle rend la phrase concrète : heure, date, quantité, fréquence ou durée. C’est très utile dans les questions JLPT.`;
  }
  if (lesson.folder.includes('Connecteurs')) {
    return `${base} Elle relie deux idées pour éviter les phrases isolées et comprendre la logique d’un petit texte.`;
  }
  if (lesson.folder.includes('Conversation')) {
    return `${base} Elle t’aide à comprendre le ton : poli, neutre, oral, écrit ou honorifique.`;
  }
  return `${base} Elle transforme une phrase simple en phrase utilisable dans une situation quotidienne.`;
}

function humanizeGrammarPattern(lesson: GrammarLesson): string {
  const title = lesson.title;
  const pattern = lesson.pattern;
  if (title.includes('は') || pattern.includes(' は ')) return '[ce dont on parle] は [information] です';
  if (title.includes('が好き') || pattern.includes('好き')) return '[chose aimée] が 好きです';
  if (title.includes('が') || pattern.includes(' が ')) return '[qui / quoi exactement] が [ce qui arrive]';
  if (title.includes('を') || pattern.includes(' を ')) return '[chose touchée par l’action] を [action]';
  if (title.includes('に') || pattern.includes(' に ')) return '[moment / destination / cible] に [action ou existence]';
  if (title.includes('で') || pattern.includes(' で ')) return '[lieu de l’action / moyen] で [action]';
  if (title.includes('へ') || pattern.includes(' へ ')) return '[direction] へ [aller / venir / rentrer]';
  if (title.includes('の') || pattern.includes(' の ')) return '[mot qui précise] の [mot principal]';
  if (title.includes('も') || pattern.includes(' も')) return '[élément ajouté] も [même information]';
  if (title.includes('と :') || pattern.includes(' と ')) return '[nom 1] と [nom 2]';
  if (title.includes('や') || pattern.includes(' や ')) return '[exemple 1] や [exemple 2]';
  if (title.includes('か') || pattern.endsWith('か')) return '[phrase polie] か';
  if (pattern.includes('てください')) return '[action en forme て] + ください';
  if (pattern.includes('ています')) return '[action en forme て] + います';
  if (pattern.includes('てもいい')) return '[action en forme て] + もいいです';
  if (pattern.includes('てはいけません')) return '[action en forme て] + はいけません';
  if (pattern.includes('たい')) return '[verbe sans ます] + たいです';
  if (pattern.includes('ほしい')) return '[chose voulue] が ほしいです';
  if (pattern.includes('なければ')) return '[verbe en ない transformé] + なければなりません';
  if (pattern.includes('ことができます')) return '[action en forme dictionnaire] + ことができます';
  if (pattern.includes('たことがあります')) return '[action en forme た] + ことがあります';
  if (pattern.includes('前に')) return '[avant cette action / ce moment] + 前に';
  if (pattern.includes('後で')) return '[après cette action / ce moment] + 後で';
  if (pattern.includes('より')) return '[chose comparée] は [référence] より [qualité]';
  if (pattern.includes('一番')) return '[dans un groupe], [élément] が 一番 [qualité]';
  if (pattern.includes('から') || pattern.includes('ので')) return '[raison] から / ので [résultat]';
  if (pattern.includes('でも') || pattern.includes('けど') || pattern.includes('が')) return '[idée 1] mais [idée 2]';
  if (pattern.includes('と思います')) return '[ce que je pense] と 思います';
  if (pattern.includes('Nom') || pattern.includes('nom')) return pattern.replace(/Nom/g, '[nom]').replace(/nom/g, '[nom]');
  return pattern
    .replace(/\bA\b/g, '[élément A]')
    .replace(/\bB\b/g, '[élément B]')
    .replace(/Phrase/g, '[phrase]')
    .replace(/Verbe/g, '[verbe]')
    .replace(/Nom/g, '[nom]');
}

function humanizeGrammarFormula(lesson: GrammarLesson): string {
  return lesson.formula
    .replace(/\bA\b/g, '[première idée]')
    .replace(/\bB\b/g, '[deuxième idée]')
    .replace(/Sujet/g, '[personne ou chose dont on parle]')
    .replace(/Objet/g, '[chose touchée par l’action]')
    .replace(/Lieu/g, '[lieu]')
    .replace(/Temps/g, '[moment]')
    .replace(/Destination/g, '[direction ou arrivée]')
    .replace(/Nom/g, '[nom]')
    .replace(/Verbe/g, '[verbe]')
    .replace(/Phrase/g, '[phrase]');
}

function explainGrammarSlots(lesson: GrammarLesson): string {
  const simple = humanizeGrammarPattern(lesson);
  if (simple.includes('[ce dont on parle]')) {
    return 'La première case sert à dire “on parle de quoi ?”. La deuxième case donne l’information. は est l’étiquette qui relie les deux.';
  }
  if (simple.includes('[chose touchée par l’action]')) {
    return 'La première case est la chose que l’action touche. Si je bois de l’eau, “eau” va dans cette case. Puis を annonce que l’action arrive.';
  }
  if (simple.includes('[moment / destination / cible]')) {
    return 'La première case pointe un endroit précis, une heure précise ou une personne cible. に fonctionne comme une punaise que tu plantes dans la phrase.';
  }
  if (simple.includes('[lieu de l’action / moyen]')) {
    return 'La première case dit le décor ou l’outil. で répond souvent à “où ça se passe ?” ou “avec quoi ?”.';
  }
  if (simple.includes('forme て')) {
    return 'La forme て est une main qui attrape une autre expression. Elle permet de demander, autoriser, interdire ou montrer une action en cours.';
  }
  if (simple.includes('forme た')) {
    return 'La forme た dit qu’une action est terminée. Ensuite, on peut l’utiliser pour dire “après avoir fait” ou “avoir déjà fait”.';
  }
  return `Lis la règle comme des cases à remplir : ${simple}. Tu ne mémorises pas des lettres, tu remplis des rôles.`;
}

function buildGrammarWhy(lesson: GrammarLesson): string {
  const text = `${lesson.title} ${lesson.pattern} ${lesson.formula}`;
  if (/誰|何|どこ|いつ|どう|なぜ|いくら|いくつ|どのくらい/.test(text)) {
    return 'Le japonais garde la structure de la phrase normale. Le mot interrogatif remplace seulement l’information inconnue, et la particule qui le suit conserve son rôle dans la phrase.';
  }
  if (text.includes('から') && text.includes('まで')) {
    return 'から fixe l’origine et まで fixe la limite. Ils fonctionnent comme deux bornes : on sait précisément où ou quand la période commence et où ou quand elle se termine.';
  }
  if (text.includes('までに')) {
    return 'まで donne la limite. に transforme cette limite en point d’échéance : l’action doit être achevée avant d’atteindre ce moment.';
  }
  if (/いつも|時々|あまり|全然|fréquence/i.test(text)) {
    return 'L’adverbe indique à quelle fréquence l’action se produit. あまり et 全然 sont associés à la négation au niveau N5 parce qu’ils expriment une fréquence faible ou nulle.';
  }
  if (/godan|ichidan|irréguli|conjugaison|ます \/ ません/i.test(text)) {
    return 'La terminaison du verbe porte le temps, la négation et le niveau de politesse. Identifier le groupe permet de changer cette terminaison sans modifier le sens lexical du verbe.';
  }
  if (/adjectif|高い|静か/.test(text)) {
    return 'Les adjectifs en い portent directement leur conjugaison. Les adjectifs en な et les noms utilisent la copule. Cette différence explique pourquoi leurs négations et leurs passés ne se construisent pas pareil.';
  }
  if (/より|ほうが|一番|comparaison/i.test(text)) {
    return 'より pose la référence de comparaison, ほうが désigne le côté qui possède davantage la qualité, et 一番 sélectionne le degré le plus élevé dans un groupe.';
  }
  if (lesson.pattern.includes('は') || lesson.title.includes('は')) {
    return 'Le japonais aime d’abord annoncer le thème, puis dire quelque chose à propos de ce thème. は fonctionne comme une étiquette : “concernant ceci...”.';
  }
  if (lesson.pattern.includes('が') || lesson.title.includes('が')) {
    return 'が sert à pointer précisément l’élément qui fait l’action ou qui porte l’information nouvelle. C’est le projecteur grammatical.';
  }
  if (lesson.pattern.includes('を') || lesson.title.includes('を')) {
    return 'を indique l’objet touché par l’action. Si tu manges, bois, lis ou achètes quelque chose, を marque souvent cette chose.';
  }
  if (lesson.pattern.includes('で')) {
    return 'で encadre l’action : il peut dire où elle se passe ou avec quel moyen elle se fait. Le contexte donne le sens.';
  }
  if (lesson.pattern.includes('に')) {
    return 'に marque souvent un point précis : moment précis, destination, emplacement d’existence ou cible de l’action.';
  }
  if (lesson.pattern.includes('て')) {
    return 'La forme て est une forme de connexion. Elle colle le verbe à une autre idée : demande, permission, interdiction, action en cours.';
  }
  if (lesson.pattern.includes('ない')) {
    return 'La forme ない est la base négative courte. Beaucoup de structures japonaises utilisent cette base pour construire une interdiction, un conseil ou une obligation.';
  }
  if (lesson.pattern.includes('た')) {
    return 'La forme た vient du passé court, mais elle sert aussi à construire des idées comme “après avoir fait” ou “avoir déjà fait”.';
  }
  if (lesson.folder === 'Connecteurs') {
    return 'Le japonais relie les idées avec des marqueurs courts. Ces marqueurs disent si la deuxième phrase ajoute, oppose, explique ou résulte de la première.';
  }
  return `La logique centrale est : ${lesson.formula}. Une fois cette forme reconnue, tu peux remplacer les mots autour sans changer la structure.`;
}

function buildGrammarSteps(lesson: GrammarLesson): string[] {
  const simplePattern = humanizeGrammarPattern(lesson);
  const firstExample = lesson.examples[0];
  const keyword = getGrammarKeyword(lesson, firstExample);
  return [
    `Décide d’abord ce que tu veux exprimer : ${lesson.goal.charAt(0).toLowerCase()}${lesson.goal.slice(1)}`,
    `Construis la phrase avec ce moule : ${simplePattern}.`,
    `Repère l’élément clé “${keyword}” et place-le exactement à l’endroit montré par le moule.`,
    firstExample
      ? `Teste le résultat avec ce modèle : ${firstExample.kanji || firstExample.kana} — ${firstExample.fr}`
      : `Vérifie enfin le piège principal : ${lesson.trap}`,
  ];
}

function buildGrammarSituation(lesson: GrammarLesson): string {
  const first = lesson.examples[0];
  if (!first) return 'Imagine une conversation simple : tu dois choisir cette règle pour dire clairement ton intention.';
  const text = `${lesson.title} ${lesson.pattern} ${lesson.formula}`;
  if (text.includes('から') && text.includes('まで')) {
    return `Tu demandes les horaires d’une école ou tu décris un trajet. Le départ reçoit から et la limite reçoit まで : “${first.kanji}” signifie « ${first.fr} ».`;
  }
  if (text.includes('までに')) {
    return `Un professeur fixe une heure limite pour rendre un devoir. Tu utilises までに parce que l’action doit être terminée avant l’échéance : “${first.kanji}” — « ${first.fr} ».`;
  }
  if (/誰|何|どこ|いつ|どう|なぜ|いくら|いくつ|どのくらい/.test(text)) {
    return `Tu as une information précise à demander dans un magasin, une gare ou une conversation. Remplace seulement l’information inconnue par le bon mot interrogatif : “${first.kanji}” — « ${first.fr} ».`;
  }
  if (/いつも|時々|あまり|全然|fréquence/i.test(text)) {
    return `Un ami te demande quelles sont tes habitudes. Choisis l’adverbe selon la fréquence réelle, puis vérifie si le verbe doit être négatif : “${first.kanji}” — « ${first.fr} ».`;
  }
  if (/もう|まだ|すぐ|後で/.test(text)) {
    return `Quelqu’un te demande si une action est déjà terminée ou quand tu vas la faire. Utilise le marqueur temporel avant l’action : “${first.kanji}” — « ${first.fr} ».`;
  }
  if (/godan|ichidan|irréguli|conjugaison|forme て|ます \/ ません/i.test(text)) {
    return `Tu racontes ce que tu fais aujourd’hui, ce que tu n’as pas fait hier ou ce que tu demandes à quelqu’un. Choisis d’abord le groupe du verbe, puis sa terminaison : “${first.kanji}” — « ${first.fr} ».`;
  }
  if (/adjectif|高い|静か/.test(text)) {
    return `Tu décris un objet, un lieu ou une journée. Identifie si l’adjectif finit en い ou s’il utilise な, puis applique la bonne négation ou le bon passé : “${first.kanji}” — « ${first.fr} ».`;
  }
  if (/より|ほうが|一番|comparaison/i.test(text)) {
    return `Tu compares deux moyens de transport ou deux aliments. La référence va avec より et l’élément choisi avec ほうが : “${first.kanji}” — « ${first.fr} ».`;
  }
  if (/前に|後で|てから/.test(text)) {
    return `Tu expliques l’ordre de ta journée. Place l’action antérieure avec 前に, 後で ou てから selon le point de vue : “${first.kanji}” — « ${first.fr} ».`;
  }
  return `Tu dois produire cette intention dans une conversation quotidienne : « ${lesson.goal} » Utilise le modèle “${first.kanji || first.kana}”, qui signifie « ${first.fr} », puis remplace seulement les mots nécessaires.`;
}

function buildGrammarMnemonic(lesson: GrammarLesson): string {
  const text = `${lesson.title} ${lesson.pattern} ${lesson.formula}`;
  if (text.includes('から') && text.includes('まで')) {
    return 'Imagine une course : から est la ligne de départ, まで est la ligne d’arrivée. La phrase avance toujours du départ vers la limite.';
  }
  if (text.includes('までに')) {
    return 'Le に de までに est une punaise sur l’heure limite : l’action doit être finie quand tu atteins cette punaise.';
  }
  if (/誰|何|どこ|いつ|どう|なぜ|いくら|いくつ|どのくらい/.test(text)) {
    return 'Le mot interrogatif est une case vide portant une étiquette : 誰 = personne, 何 = chose, どこ = lieu, いつ = moment, どう = manière.';
  }
  if (/いつも|時々|あまり|全然|fréquence/i.test(text)) {
    return 'Visualise une jauge : いつも est pleine, よく presque pleine, 時々 au milieu, あまり presque vide et 全然 vide. Les deux dernières vont avec la négation.';
  }
  if (/もう|まだ/.test(text)) {
    return 'もう franchit la ligne : c’est déjà fait. まだ reste avant la ligne : ce n’est pas encore fait.';
  }
  if (/ぐらい|ごろ/.test(text)) {
    return 'ごろ entoure un point sur l’horloge ; ぐらい entoure une quantité ou une durée approximative.';
  }
  if (/godan|groupe 1/i.test(text)) {
    return 'Le groupe 1 change de marche : son dernier kana se déplace pour construire ます, ない, て ou た. Pense à un escalier de sons.';
  }
  if (/ichidan|groupe 2/i.test(text)) {
    return 'Le groupe 2 est le groupe “coupe る” : retire る, puis accroche directement ます, ない, て ou た.';
  }
  if (/する \/ 来る|irréguli/i.test(text)) {
    return 'Deux verbes rebelles à connaître par cœur : する devient し…, et 来る alterne くる, き… et こ… selon la forme.';
  }
  if (/ます \/ ません \/ ました/.test(text)) {
    return 'Pense à un tableau de quatre cases : maintenant positif ます, maintenant négatif ません, passé positif ました, passé négatif ませんでした.';
  }
  if (/高い|adjectifs en い/i.test(text)) {
    return 'L’adjectif en い travaille tout seul : remplace son い par くない pour nier et par かった pour parler du passé.';
  }
  if (/静か|adjectifs en な/i.test(text)) {
    return 'L’adjectif en な a besoin d’un assistant : な devant un nom, puis です・ではありません・でした en fin de phrase.';
  }
  if (/前に|後で|てから/.test(text)) {
    return 'Dessine une ligne du temps : 前に regarde à gauche, 後で regarde à droite, てから pose d’abord une action puis fait avancer la suivante.';
  }
  if (/より|ほうが|一番/.test(text)) {
    return 'Imagine une balance : より reste du côté de la référence, ほうが montre le côté qui gagne, 一番 monte sur la première marche.';
  }
  if (/たり/.test(text)) {
    return 'たり est un panier d’exemples : tu y poses quelques actions possibles, sans dire que la liste est complète ni ordonnée.';
  }
  if (lesson.pattern.includes('は') || lesson.title.includes('は')) {
    return 'は = “wa, on parle de...” : le mot avant は devient le sujet de conversation.';
  }
  if (lesson.pattern.includes('が') || lesson.title.includes('が')) {
    return 'が = le projecteur : il éclaire précisément qui ou quoi fait l’action.';
  }
  if (lesson.pattern.includes('を') || lesson.title.includes('を')) {
    return 'を = objet touché : boire l’eau, lire le livre, acheter le pain.';
  }
  if (lesson.pattern.includes('で')) {
    return 'で = décor ou outil : où l’action se passe, ou avec quoi elle se fait.';
  }
  if (lesson.pattern.includes('に')) {
    return 'に = punaise sur une carte ou une horloge : point précis dans l’espace ou le temps.';
  }
  if (lesson.pattern.includes('て')) {
    return 'て = crochet : il accroche le verbe à une suite, comme “fais et puis...”.';
  }
  if (lesson.pattern.includes('たい')) {
    return 'たい ressemble à “j’ai envie de...” : accroche-le au radical du verbe.';
  }
  if (lesson.folder === 'Connecteurs') {
    return 'Connecteur = panneau de route : il annonce si l’idée continue, tourne, explique ou conclut.';
  }
  return `Mémo : garde en tête le moule “${lesson.formula}”, puis change seulement les mots.`;
}

function buildGrammarExampleAnalysis(lesson: GrammarLesson, example: GrammarLessonExample): string {
  return `Structure utilisée : ${humanizeGrammarPattern(lesson)}. Dans “${example.romaji}”, chaque morceau remplit une case de cette règle.`;
}

function buildGrammarExampleBreakdown(lesson: GrammarLesson, example: GrammarLessonExample): string {
  const pattern = humanizeGrammarPattern(lesson);
  if (pattern.includes('は')) {
    const parts = example.kanji.split('は');
    if (parts.length >= 2) return `Avant は : “${parts[0]}” = ce dont on parle. Après は : “${parts.slice(1).join('は')}” = l’information donnée.`;
  }
  if (pattern.includes('を')) {
    const parts = example.kanji.split('を');
    if (parts.length >= 2) return `Avant を : “${parts[0]}” = la chose touchée par l’action. Après を : “${parts.slice(1).join('を')}” = l’action.`;
  }
  if (pattern.includes('に')) {
    const parts = example.kanji.split('に');
    if (parts.length >= 2) return `Avant に : “${parts[0]}” = le point précis. Après に : “${parts.slice(1).join('に')}” = ce qui se passe.`;
  }
  if (pattern.includes('で')) {
    const parts = example.kanji.split('で');
    if (parts.length >= 2) return `Avant で : “${parts[0]}” = le lieu ou le moyen. Après で : “${parts.slice(1).join('で')}” = l’action.`;
  }
  if (pattern.includes('が')) {
    const parts = example.kanji.split('が');
    if (parts.length >= 2) return `Avant が : “${parts[0]}” = ce qu’on pointe précisément. Après が : “${parts.slice(1).join('が')}” = l’information sur cet élément.`;
  }
  return `Lis cette phrase avec les cases suivantes : ${pattern}. Essaie de retrouver quelle partie de la phrase remplit chaque case.`;
}

function buildGrammarPracticePrompt(lesson: GrammarLesson): string {
  const first = lesson.examples[0];
  if (!first) return `Crée une phrase avec la formule : ${lesson.formula}.`;
  return `À toi : reprends la structure “${first.romaji}” et remplace une seule case. Change par exemple [lieu], [moment], [objet] ou [personne], puis vérifie que la règle reste : ${humanizeGrammarPattern(lesson)}.`;
}

function formatGrammarLevel(level: GrammarLesson['level']): string {
  if (level === 'facile') return 'Facile';
  if (level === 'pratique') return 'Pratique';
  if (level === 'intermediaire') return 'Intermédiaire';
  return 'Avancé';
}

function getGrammarLevelStyle(level: GrammarLesson['level']) {
  if (level === 'facile') return styles.grammarLevel_facile;
  if (level === 'pratique') return styles.grammarLevel_pratique;
  if (level === 'intermediaire') return styles.grammarLevel_intermediaire;
  return styles.grammarLevel_avance;
}

function getLeagueTier(level: number): LeagueTier {
  return [...LEAGUE_TIERS].reverse().find((tier) => level >= tier.minLevel) ?? LEAGUE_TIERS[0];
}

function getNextLeagueTier(level: number): LeagueTier | null {
  return LEAGUE_TIERS.find((tier) => tier.minLevel > level) ?? null;
}

function getXpRequiredForLevel(level: number): number {
  if (level >= MAX_LEVEL) return 0;
  return Math.round(160 + level * 4 + Math.pow(level, 1.15) * 1.2);
}

function getLevelProgressFromXp(totalXp: number) {
  let level = 1;
  let remainingXp = Math.max(0, Math.round(totalXp));
  while (level < MAX_LEVEL) {
    const required = getXpRequiredForLevel(level);
    if (remainingXp < required) break;
    remainingXp -= required;
    level += 1;
  }
  const requiredForCurrentLevel = getXpRequiredForLevel(level);
  return {
    level,
    xpCurrentLevel: level >= MAX_LEVEL ? requiredForCurrentLevel : remainingXp,
    xpRequiredForLevel: requiredForCurrentLevel,
    xpToNextLevel: level >= MAX_LEVEL ? 0 : Math.max(0, requiredForCurrentLevel - remainingXp),
  };
}

function getPathStatusStyle(status: LearningPathStage['status']) {
  if (status === 'done') return styles.pathStageStatus_done;
  if (status === 'active') return styles.pathStageStatus_active;
  return styles.pathStageStatus_locked;
}

function QuizScreen() {
  const db = useSQLiteContext();
  const vocabularyLookupEntries = useVocabularyLookupIndex(db);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [choices, setChoices] = useState<QuizChoice[]>([]);
  const [selected, setSelected] = useState<QuizChoice | null>(null);
  const [quizMode, setQuizMode] = useState<MainQuizMode>('global');
  const [knowledgeQuizScope, setKnowledgeQuizScope] = useState<KnowledgeQuizScope>('all');
  const [globalQuizMode, setGlobalQuizMode] = useState<GlobalQuizMode>('blank_qcm');
  const [globalQuizSize, setGlobalQuizSize] = useState<10 | 20>(20);
  const [globalQuizSession, setGlobalQuizSession] = useState<GlobalQuizSession | null>(null);
  const [globalMatchingSession, setGlobalMatchingSession] = useState<GlobalMatchingSession | null>(null);
  const [globalDirectInput, setGlobalDirectInput] = useState('');
  const [globalMatchMessage, setGlobalMatchMessage] = useState('Choisis un élément, puis sa correspondance.');
  const [globalKanjiItems, setGlobalKanjiItems] = useState<KanjiItem[]>([]);
  const [kanaQuizSize, setKanaQuizSize] = useState<KanaQuizSize>(10);
  const [grammarQuizSize, setGrammarQuizSize] = useState<10 | 20>(10);
  const [grammarQuizMode, setGrammarQuizMode] = useState<GrammarQuizMode>('blank_qcm');
  const [grammarQuizSession, setGrammarQuizSession] = useState<GrammarQuizSession | null>(null);
  const [grammarMatchingSession, setGrammarMatchingSession] = useState<GrammarMatchingSession | null>(null);
  const [grammarMatchMessage, setGrammarMatchMessage] = useState('Choisis une phrase, puis sa traduction.');
  const [grammarDirectInput, setGrammarDirectInput] = useState('');
  const [grammarQuizRomajiVisible, setGrammarQuizRomajiVisible] = useState(false);
  const [grammarQuizFrenchVisible, setGrammarQuizFrenchVisible] = useState(false);
  const [grammarQuizKanaOnly, setGrammarQuizKanaOnly] = useState(false);
  const [selectedWordLookup, setSelectedWordLookup] = useState<WordLookupEntry | null>(null);
  const [selectedWordLookupAnchorId, setSelectedWordLookupAnchorId] = useState<string | null>(null);
  const [kanaArcadeCards, setKanaArcadeCards] = useState<KanaCard[]>([]);
  const [kanaArcadeSession, setKanaArcadeSession] = useState<KanaArcadeSession | null>(null);
  const [kanaArcadeScores, setKanaArcadeScores] = useState<KanaArcadeScoreRecord[]>([]);
  const [arcadeCelebration, setArcadeCelebration] = useState<{
    streak: number;
    multiplier: number;
    points: number;
  } | null>(null);
  const [arcadeTick, setArcadeTick] = useState(Date.now());
  const arcadeCelebrateAnim = useRef(new Animated.Value(0)).current;
  const arcadeRecordAnim = useRef(new Animated.Value(0)).current;

  const loadKanaArcadeScores = useCallback(async () => {
    try {
      const rows = await db.getAllAsync<KanaArcadeScoreRecord>(
        `
        SELECT id, score, elapsed_ms, correct_count, total_count, best_streak, created_at
        FROM app_kana_arcade_score
        WHERE quiz_size = ?
        ORDER BY score DESC, elapsed_ms ASC, created_at DESC
        LIMIT 5
        `,
        kanaQuizSize
      );
      setKanaArcadeScores(rows);
    } catch (error) {
      console.error('Unable to load kana arcade scores', error);
      setKanaArcadeScores([]);
    }
  }, [db, kanaQuizSize]);

  const getKanaArcadeAllTimeBest = useCallback(async () => {
    try {
      return await db.getFirstAsync<KanaArcadeScoreRecord>(
        `
        SELECT id, score, elapsed_ms, correct_count, total_count, best_streak, created_at
        FROM app_kana_arcade_score
        ORDER BY score DESC, elapsed_ms ASC, created_at ASC
        LIMIT 1
        `
      );
    } catch (error) {
      console.error('Unable to load all-time best kana arcade score', error);
      return null;
    }
  }, [db]);

  const loadKanaArcadeCards = useCallback(async () => {
    try {
      const rows = await db.getAllAsync<Omit<KanaCard, 'examples'>>(
        `
        SELECT k.id, k.script, k.character, k.romaji, k.row_name,
               COALESCE(s.favorite, 0) AS favorite,
               COALESCE(s.review, 0) AS review,
               COALESCE(s.mastered, 0) AS mastered,
               COALESCE(s.seen_count, 0) AS seen_count,
               COALESCE(s.correct_count, 0) AS correct_count,
               m.note AS mnemonic_note
        FROM canonical_kana k
        LEFT JOIN app_kana_card_state s ON s.kana_id = k.id
        LEFT JOIN app_kana_mnemonic_local m ON m.kana_id = k.id
        WHERE k.needs_review = 0
          AND instr(k.character, '?') = 0
        ORDER BY k.script, length(k.character), k.romaji
        `
      );
      setKanaArcadeCards(
        rows.map((row) => {
          const combinedPreset = getCombinedKanaExamplePreset(row.romaji);
          return {
            ...row,
            script: row.script as 'hiragana' | 'katakana',
            romaji: normalizeKanaRomaji(row.character, row.romaji),
            examples: combinedPreset ? [buildCombinedKanaVocabularyExample(row.character, combinedPreset)] : [],
          };
        })
      );
    } catch (error) {
      console.error('Unable to load kana arcade cards', error);
      setKanaArcadeCards([]);
    }
  }, [db]);

  useEffect(() => {
    loadKanaArcadeCards();
  }, [loadKanaArcadeCards]);

  useEffect(() => {
    loadKanjiItems(db).then(setGlobalKanjiItems).catch((error) => {
      console.error('Unable to load global quiz kanji', error);
      setGlobalKanjiItems([]);
    });
  }, [db]);

  useEffect(() => {
    loadKanaArcadeScores();
  }, [loadKanaArcadeScores]);

  useEffect(() => {
    if (!kanaArcadeSession || kanaArcadeSession.finished) return;
    const timer = setInterval(() => setArcadeTick(Date.now()), 250);
    return () => clearInterval(timer);
  }, [kanaArcadeSession]);

  const loadQuestion = useCallback(async () => {
    setLoading(true);
    setSelected(null);
    setSelectedWordLookup(null);
    setSelectedWordLookupAnchorId(null);
    try {
      const next = await db.getFirstAsync<QuizQuestion>(`
        SELECT q.question_id, q.question_origin, q.skill_id, q.question_type,
               q.prompt_fr, q.prompt_ja, q.correct_answer, q.explanation_fr
        FROM app_question_bank q
        JOIN app_adaptive_question_priority p ON p.question_id = q.question_id
        LEFT JOIN (
          SELECT question_id,
                 COUNT(*) AS local_attempts,
                 SUM(is_correct) AS local_correct,
                 MAX(answered_at) AS last_answered_at
          FROM app_question_attempt_local
          GROUP BY question_id
        ) a ON a.question_id = q.question_id
        ORDER BY
          CASE
            WHEN a.local_attempts IS NULL THEN p.final_priority + 25
            WHEN a.local_correct = 0 THEN p.final_priority + 45
            WHEN (a.local_correct * 1.0 / a.local_attempts) < 0.70 THEN p.final_priority + 30
            ELSE p.final_priority - 10
          END DESC,
          COALESCE(a.last_answered_at, '1970-01-01') ASC,
          random()
        LIMIT 1
      `);
      setQuestion(next ?? null);

      if (next) {
        const generatedChoices = await db.getAllAsync<QuizChoice>(
          `
          SELECT id, choice_text, is_correct
          FROM app_generated_choice
          WHERE question_id = ?
          ORDER BY sort_order
        `,
          next.question_id
        );
        if (generatedChoices.length > 0) {
          setChoices(generatedChoices);
        } else {
          const distractors = await db.getAllAsync<{ choice_text: string }>(
            `
            SELECT correct_answer AS choice_text
            FROM app_question_bank
            WHERE question_id != ?
              AND skill_id = ?
              AND question_type = ?
              AND correct_answer IS NOT NULL
              AND correct_answer != ?
            GROUP BY correct_answer
            ORDER BY random()
            LIMIT 3
            `,
            next.question_id,
            next.skill_id,
            next.question_type,
            next.correct_answer
          );
          setChoices(
            shuffle([
              {
                id: `${next.question_id}-correct`,
                choice_text: next.correct_answer,
                is_correct: 1,
              },
              ...distractors.map((choice, index) => ({
                id: `${next.question_id}-fallback-${index}`,
                choice_text: choice.choice_text,
                is_correct: 0,
              })),
            ])
          );
        }
      } else {
        setChoices([]);
      }
    } catch (error) {
      console.error('Unable to load adaptive quiz question', error);
      setQuestion(null);
      setChoices([]);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    loadQuestion();
  }, [loadQuestion]);

  const answer = async (choice: QuizChoice) => {
    if (!question || selected) return;
    setSelected(choice);
    try {
      await db.runAsync(
        `
        INSERT INTO app_question_attempt_local (
          id, question_id, source_mode, selected_answer, correct_answer,
          is_correct, skill_id, answered_at
        ) VALUES (?, ?, 'adaptive_quiz', ?, ?, ?, ?, datetime('now'))
      `,
        `${Date.now()}-${Math.random()}`,
        question.question_id,
        choice.choice_text,
        question.correct_answer,
        choice.is_correct ? 1 : 0,
        question.skill_id
      );
    } catch (error) {
      console.error('Unable to save adaptive quiz answer', error);
    }
  };

  const startGlobalQuiz = () => {
    setGlobalDirectInput('');
    setGlobalMatchMessage('Choisis un élément, puis sa correspondance.');
    if (globalQuizMode === 'matching') {
      setGlobalQuizSession(null);
      setGlobalMatchingSession(
        buildGlobalMatchingSession(kanaArcadeCards, vocabularyLookupEntries, globalKanjiItems, knowledgeQuizScope)
      );
      return;
    }
    setGlobalMatchingSession(null);
    setGlobalQuizSession(
      createGlobalQuizSession(
        buildGlobalQuizQuestions(
          globalQuizSize,
          globalQuizMode,
          kanaArcadeCards,
          vocabularyLookupEntries,
          globalKanjiItems,
          knowledgeQuizScope
        )
      )
    );
  };

  const quitGlobalQuiz = () => {
    setGlobalQuizSession(null);
    setGlobalMatchingSession(null);
    setGlobalDirectInput('');
    setGlobalMatchMessage('Choisis un élément, puis sa correspondance.');
  };

  const openKnowledgeQuizScope = (scope: KnowledgeQuizScope) => {
    setKnowledgeQuizScope(scope);
    setQuizMode('global');
    setGlobalQuizSession(null);
    setGlobalMatchingSession(null);
    setGlobalDirectInput('');
    setGlobalMatchMessage('Choisis un élément, puis sa correspondance.');
  };

  const answerGlobalQuiz = async (choice: string) => {
    if (!globalQuizSession || globalQuizSession.selected || globalQuizSession.finished) return;
    const current = globalQuizSession.questions[globalQuizSession.currentIndex];
    if (!current) return;
    const isCorrect = normalizeAnswer(choice) === normalizeAnswer(current.correctAnswer);
    const nextStreak = isCorrect ? globalQuizSession.streak + 1 : 0;
    const points = isCorrect ? 100 * getGrammarStreakMultiplier(nextStreak) : 0;
    setGlobalQuizSession({
      ...globalQuizSession,
      selected: choice,
      correctCount: globalQuizSession.correctCount + (isCorrect ? 1 : 0),
      score: globalQuizSession.score + points,
      streak: nextStreak,
      bestStreak: Math.max(globalQuizSession.bestStreak, nextStreak),
      mistakes: isCorrect
        ? globalQuizSession.mistakes
        : [...globalQuizSession.mistakes, { question: current, selected: choice }],
    });
    setGlobalDirectInput('');
    try {
      await db.runAsync(
        `
        INSERT INTO app_question_attempt_local (
          id, question_id, source_mode, selected_answer, correct_answer,
          is_correct, skill_id, answered_at
        ) VALUES (?, ?, 'global_quiz', ?, ?, ?, ?, datetime('now'))
        `,
        `${Date.now()}-${Math.random()}`,
        current.id,
        choice,
        current.correctAnswer,
        isCorrect ? 1 : 0,
        `global:${current.domain}`
      );
    } catch (error) {
      console.error('Unable to save global quiz answer', error);
    }
  };

  const advanceGlobalQuiz = () => {
    if (!globalQuizSession) return;
    const nextIndex = globalQuizSession.currentIndex + 1;
    setGlobalQuizSession({
      ...globalQuizSession,
      currentIndex: Math.min(nextIndex, globalQuizSession.questions.length - 1),
      selected: null,
      finished: nextIndex >= globalQuizSession.questions.length,
    });
  };

  const selectGlobalMatchLeft = (pairId: string) => {
    if (!globalMatchingSession || globalMatchingSession.finished || globalMatchingSession.locked) return;
    if (globalMatchingSession.matchedIds.includes(pairId)) return;
    setGlobalMatchingSession({ ...globalMatchingSession, selectedLeftId: pairId, selectedRightId: null });
    setGlobalMatchMessage('Choisis maintenant la correspondance dans la colonne de droite.');
  };

  const answerGlobalMatchRight = async (pairId: string) => {
    if (
      !globalMatchingSession ||
      !globalMatchingSession.selectedLeftId ||
      globalMatchingSession.locked ||
      globalMatchingSession.finished
    ) return;
    const round = globalMatchingSession.rounds[globalMatchingSession.currentRound];
    const left = round?.pairs.find((pair) => pair.id === globalMatchingSession.selectedLeftId);
    const right = round?.pairs.find((pair) => pair.id === pairId);
    if (!left || !right) return;
    const isCorrect = left.id === right.id;
    setGlobalMatchingSession({
      ...globalMatchingSession,
      selectedRightId: pairId,
      errors: globalMatchingSession.errors + (isCorrect ? 0 : 1),
      locked: true,
    });
    setGlobalMatchMessage(isCorrect ? `${getGlobalDomainLabel(left.domain)} : bonne association.` : 'Mauvaise paire. Observe les deux cartes et réessaie.');
    try {
      await db.runAsync(
        `
        INSERT INTO app_question_attempt_local (
          id, question_id, source_mode, selected_answer, correct_answer,
          is_correct, skill_id, answered_at
        ) VALUES (?, ?, 'global_matching', ?, ?, ?, ?, datetime('now'))
        `,
        `${Date.now()}-${Math.random()}`,
        left.id,
        right.right,
        left.right,
        isCorrect ? 1 : 0,
        `global:${left.domain}`
      );
    } catch (error) {
      console.error('Unable to save global matching answer', error);
    }
    setTimeout(() => {
      setGlobalMatchingSession((current) => {
        if (!current) return current;
        if (!isCorrect) return { ...current, selectedLeftId: null, selectedRightId: null, locked: false };
        const matchedIds = [...current.matchedIds, left.id];
        const activeRound = current.rounds[current.currentRound];
        const roundComplete = activeRound.pairs.every((pair) => matchedIds.includes(pair.id));
        const finalRound = current.currentRound + 1 >= current.rounds.length;
        if (roundComplete && finalRound) {
          setGlobalMatchMessage('Maîtrise globale validée : les quatre domaines ont été reliés.');
          return {
            ...current,
            matchedIds,
            selectedLeftId: null,
            selectedRightId: null,
            score: current.score + 100,
            finished: true,
            locked: false,
          };
        }
        if (roundComplete) {
          setGlobalMatchMessage('Manche terminée. Nouveau mélange des quatre domaines.');
          return {
            ...current,
            currentRound: current.currentRound + 1,
            matchedIds,
            selectedLeftId: null,
            selectedRightId: null,
            score: current.score + 250,
            locked: false,
          };
        }
        return {
          ...current,
          matchedIds,
          selectedLeftId: null,
          selectedRightId: null,
          score: current.score + 100,
          locked: false,
        };
      });
    }, isCorrect ? 420 : 650);
  };

  const startKanaArcade = () => {
    const questions = buildKanaArcadeQuestions(kanaArcadeCards, kanaQuizSize);
    if (questions.length === 0) return;
    setArcadeTick(Date.now());
    setArcadeCelebration(null);
    setKanaArcadeSession({
      questions,
      currentIndex: 0,
      selected: null,
      answers: [],
      score: 0,
      streak: 0,
      bestStreak: 0,
      startedAt: Date.now(),
      finished: false,
    });
  };

  const quitKanaArcade = () => {
    setArcadeCelebration(null);
    setKanaArcadeSession(null);
  };

  const saveKanaArcadeScore = useCallback(
    async (session: KanaArcadeSession) => {
      const elapsed = session.elapsedMs ?? Math.max(0, Date.now() - session.startedAt);
      const correct = session.answers.filter((answer) => answer.isCorrect).length;
      try {
        await db.runAsync(
          `
          INSERT INTO app_kana_arcade_score (
            id, quiz_size, score, elapsed_ms, correct_count, total_count, best_streak, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
          `,
          `${Date.now()}-${Math.random()}`,
          kanaQuizSize,
          session.score,
          elapsed,
          correct,
          session.questions.length,
          session.bestStreak
        );
        await loadKanaArcadeScores();
      } catch (error) {
        console.error('Unable to save kana arcade score', error);
      }
    },
    [db, kanaQuizSize, loadKanaArcadeScores]
  );

  const advanceKanaArcadeFromSession = useCallback(
    async (session: KanaArcadeSession) => {
      const nextIndex = session.currentIndex + 1;
      const finished = nextIndex >= session.questions.length;
      const elapsedMs = finished ? Math.max(0, Date.now() - session.startedAt) : session.elapsedMs;
      const previousBest = finished ? await getKanaArcadeAllTimeBest() : null;
      const isNewBestScore =
        finished &&
        (!previousBest ||
          session.score > previousBest.score ||
          (session.score === previousBest.score && (elapsedMs ?? 0) < previousBest.elapsed_ms));
      const nextSession = {
        ...session,
        currentIndex: Math.min(nextIndex, session.questions.length - 1),
        selected: null,
        finished,
        elapsedMs,
        isNewBestScore,
        allTimeBest: isNewBestScore
          ? {
              id: 'current',
              score: session.score,
              elapsed_ms: elapsedMs ?? 0,
              correct_count: session.answers.filter((answer) => answer.isCorrect).length,
              total_count: session.questions.length,
              best_streak: session.bestStreak,
              created_at: new Date().toISOString(),
            }
          : previousBest,
      };
      setKanaArcadeSession(nextSession);
      if (finished) {
        if (isNewBestScore) {
          arcadeRecordAnim.setValue(0);
          Animated.sequence([
            Animated.timing(arcadeRecordAnim, {
              toValue: 1,
              duration: 420,
              useNativeDriver: true,
            }),
            Animated.timing(arcadeRecordAnim, {
              toValue: 0.96,
              duration: 900,
              useNativeDriver: true,
            }),
          ]).start();
        }
        await saveKanaArcadeScore(nextSession);
      }
    },
    [arcadeRecordAnim, getKanaArcadeAllTimeBest, saveKanaArcadeScore]
  );

  const answerKanaArcade = async (choice: string) => {
    if (!kanaArcadeSession || kanaArcadeSession.selected || kanaArcadeSession.finished) return;
    const current = kanaArcadeSession.questions[kanaArcadeSession.currentIndex];
    if (!current) return;
    const isCorrect = normalizeAnswer(choice) === normalizeAnswer(current.prompt.romaji);
    const nextStreak = isCorrect ? kanaArcadeSession.streak + 1 : 0;
    const multiplier = isCorrect ? getKanaArcadeMultiplier(nextStreak) : 0;
    const points = isCorrect ? Math.round(100 * multiplier) : 0;
    const nextAnswer: KanaArcadeAnswer = {
      questionId: current.prompt.id,
      prompt: current.prompt.character,
      selected: choice,
      correct: current.prompt.romaji,
      isCorrect,
      points,
      multiplier,
    };
    try {
      await db.runAsync(
        `
        INSERT INTO app_question_attempt_local (
          id, question_id, source_mode, selected_answer, correct_answer,
          is_correct, skill_id, answered_at
        ) VALUES (?, ?, 'kana_arcade', ?, ?, ?, ?, datetime('now'))
        `,
        `${Date.now()}-${Math.random()}`,
        current.prompt.id,
        choice,
        current.prompt.romaji,
        isCorrect ? 1 : 0,
        `kana_arcade:${current.prompt.script}:${current.prompt.character.length > 1 ? 'combined' : 'basic'}`
      );
    } catch (error) {
      console.error('Unable to save kana arcade answer', error);
    }
    const nextSession = {
      ...kanaArcadeSession,
      selected: choice,
      score: kanaArcadeSession.score + points,
      streak: nextStreak,
      bestStreak: Math.max(kanaArcadeSession.bestStreak, nextStreak),
      answers: [...kanaArcadeSession.answers, nextAnswer],
    };
    setKanaArcadeSession(nextSession);
    if (isCorrect) {
      setArcadeCelebration({ streak: nextStreak, multiplier, points });
      arcadeCelebrateAnim.setValue(0);
      Animated.sequence([
        Animated.timing(arcadeCelebrateAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(arcadeCelebrateAnim, {
          toValue: 0,
          duration: 900,
          delay: 500,
          useNativeDriver: true,
        }),
      ]).start();
      setTimeout(() => setArcadeCelebration(null), 1700);
    } else {
      setArcadeCelebration(null);
    }
    setTimeout(() => {
      void advanceKanaArcadeFromSession(nextSession);
    }, isCorrect ? 850 : 650);
  };

  const nextKanaArcade = async () => {
    if (!kanaArcadeSession) return;
    await advanceKanaArcadeFromSession(kanaArcadeSession);
  };

  const startGrammarQuiz = () => {
    if (grammarQuizMode === 'matching') {
      setGrammarQuizSession(null);
      setGrammarMatchingSession(createGrammarMatchingSession());
      setGrammarMatchMessage('Choisis une phrase, puis sa traduction.');
    } else {
      const questions =
        grammarQuizMode === 'question_answer'
          ? buildGrammarQuestionAnswerQuiz(grammarQuizSize)
          : buildGrammarQuizQuestions(grammarQuizSize, grammarQuizMode);
      setGrammarMatchingSession(null);
      setGrammarQuizSession(createGrammarSession(questions));
    }
    setGrammarDirectInput('');
    setGrammarQuizRomajiVisible(false);
    setGrammarQuizFrenchVisible(false);
    setGrammarQuizKanaOnly(false);
    setSelectedWordLookup(null);
    setSelectedWordLookupAnchorId(null);
  };

  const restartGrammarQuizMistakes = () => {
    if (!grammarQuizSession?.mistakes.length) return;
    setGrammarQuizSession(createGrammarSession(grammarQuizSession.mistakes.map((mistake) => mistake.question)));
    setGrammarDirectInput('');
    setGrammarQuizRomajiVisible(false);
    setGrammarQuizFrenchVisible(false);
    setGrammarQuizKanaOnly(false);
    setSelectedWordLookup(null);
    setSelectedWordLookupAnchorId(null);
  };

  const answerGrammarQuiz = async (choice: string) => {
    if (!grammarQuizSession || grammarQuizSession.selected || grammarQuizSession.finished) return;
    const current = grammarQuizSession.questions[grammarQuizSession.currentIndex];
    if (!current) return;
    const isCorrect = isGrammarAnswerCorrect(choice, current.correctAnswer);
    const nextStreak = isCorrect ? grammarQuizSession.streak + 1 : 0;
    const points = isCorrect ? 100 * getGrammarStreakMultiplier(nextStreak) : 0;
    try {
      await recordGrammarExerciseAttempt(db, current.lesson, choice, current.correctAnswer, isCorrect, 'grammar_quiz');
    } catch (error) {
      console.error('Unable to save grammar quiz answer', error);
    }
    setGrammarQuizSession({
      ...grammarQuizSession,
      selected: choice,
      correctCount: grammarQuizSession.correctCount + (isCorrect ? 1 : 0),
      score: grammarQuizSession.score + points,
      streak: nextStreak,
      bestStreak: Math.max(grammarQuizSession.bestStreak, nextStreak),
      lives: isCorrect ? grammarQuizSession.lives : Math.max(0, grammarQuizSession.lives - 1),
      mistakes: isCorrect
        ? grammarQuizSession.mistakes
        : [...grammarQuizSession.mistakes, { question: current, selected: choice }],
    });
    setGrammarDirectInput('');
  };

  const advanceGrammarQuiz = () => {
    if (!grammarQuizSession) return;
    const nextIndex = grammarQuizSession.currentIndex + 1;
    const finished = grammarQuizSession.lives <= 0 || nextIndex >= grammarQuizSession.questions.length;
    setGrammarQuizSession({
      ...grammarQuizSession,
      currentIndex: finished ? grammarQuizSession.currentIndex : nextIndex,
      selected: null,
      finished,
    });
    setGrammarQuizRomajiVisible(false);
    setGrammarQuizFrenchVisible(false);
    setGrammarQuizKanaOnly(false);
    setSelectedWordLookup(null);
    setSelectedWordLookupAnchorId(null);
  };

  const quitGrammarQuiz = () => {
    setGrammarQuizSession(null);
    setGrammarMatchingSession(null);
    setGrammarMatchMessage('Choisis une phrase, puis sa traduction.');
    setGrammarDirectInput('');
    setGrammarQuizRomajiVisible(false);
    setGrammarQuizFrenchVisible(false);
    setGrammarQuizKanaOnly(false);
    setSelectedWordLookup(null);
    setSelectedWordLookupAnchorId(null);
  };

  const selectGrammarMatchLeft = (pairId: string) => {
    if (!grammarMatchingSession || grammarMatchingSession.finished || grammarMatchingSession.locked) return;
    if (grammarMatchingSession.matchedIds.includes(pairId)) return;
    setGrammarMatchingSession({
      ...grammarMatchingSession,
      selectedLeftId: pairId,
      selectedRightId: null,
    });
    setGrammarMatchMessage('Maintenant, choisis la traduction correspondante.');
  };

  const answerGrammarMatchRight = async (pairId: string) => {
    if (
      !grammarMatchingSession ||
      grammarMatchingSession.finished ||
      grammarMatchingSession.locked ||
      !grammarMatchingSession.selectedLeftId ||
      grammarMatchingSession.matchedIds.includes(pairId)
    ) {
      return;
    }
    const round = grammarMatchingSession.rounds[grammarMatchingSession.currentRound];
    const selectedPair = round?.pairs.find((pair) => pair.id === grammarMatchingSession.selectedLeftId);
    const chosenPair = round?.pairs.find((pair) => pair.id === pairId);
    if (!selectedPair || !chosenPair) return;
    const isCorrect = selectedPair.id === chosenPair.id;
    const answeredSession = {
      ...grammarMatchingSession,
      selectedRightId: pairId,
      attempts: grammarMatchingSession.attempts + 1,
      errors: grammarMatchingSession.errors + (isCorrect ? 0 : 1),
      locked: true,
    };
    setGrammarMatchingSession(answeredSession);
    setGrammarMatchMessage(isCorrect ? 'Bonne association.' : 'Ces deux cartes ne vont pas ensemble. Réessaie.');
    try {
      await recordGrammarExerciseAttempt(
        db,
        selectedPair.lesson,
        chosenPair.french,
        selectedPair.french,
        isCorrect,
        'grammar_matching'
      );
    } catch (error) {
      console.error('Unable to save grammar matching answer', error);
    }
    setTimeout(() => {
      setGrammarMatchingSession((current) => {
        if (!current) return current;
        if (!isCorrect) {
          return { ...current, selectedLeftId: null, selectedRightId: null, locked: false };
        }
        const matchedIds = [...current.matchedIds, selectedPair.id];
        const currentRound = current.rounds[current.currentRound];
        const roundComplete = currentRound.pairs.every((pair) => matchedIds.includes(pair.id));
        const finalRound = current.currentRound + 1 >= current.rounds.length;
        if (roundComplete && finalRound) {
          setGrammarMatchMessage('Toutes les paires sont reliées. Excellent travail.');
          return {
            ...current,
            matchedIds,
            selectedLeftId: null,
            selectedRightId: null,
            score: current.score + 100,
            finished: true,
            locked: false,
          };
        }
        if (roundComplete) {
          setGrammarMatchMessage('Manche réussie. La suivante commence.');
          return {
            ...current,
            currentRound: current.currentRound + 1,
            matchedIds,
            selectedLeftId: null,
            selectedRightId: null,
            score: current.score + 250,
            locked: false,
          };
        }
        setGrammarMatchMessage('Paire validée. Continue.');
        return {
          ...current,
          matchedIds,
          selectedLeftId: null,
          selectedRightId: null,
          score: current.score + 100,
          locked: false,
        };
      });
    }, isCorrect ? 450 : 650);
  };

  if (loading) {
    return <LoadingView />;
  }

  if (quizMode === 'global') {
    const activeMode = getKnowledgeQuizModeCopy(globalQuizMode, knowledgeQuizScope);
    const scopeLabel =
      knowledgeQuizScope === 'all'
        ? 'Global'
        : getGlobalDomainLabel(knowledgeQuizScope);
    const scopedDomains: GlobalQuizDomain[] =
      knowledgeQuizScope === 'all' ? ['kana', 'vocabulary', 'grammar', 'kanji'] : [knowledgeQuizScope];
    const currentQuestion = globalQuizSession?.questions[globalQuizSession.currentIndex] ?? null;
    const currentRound = globalMatchingSession?.rounds[globalMatchingSession.currentRound] ?? null;
    const matchingTotal = globalMatchingSession
      ? globalMatchingSession.rounds.reduce((total, round) => total + round.pairs.length, 0)
      : 0;
    const ready =
      knowledgeQuizScope === 'all'
        ? kanaArcadeCards.length >= 4 && vocabularyLookupEntries.length >= 4 && globalKanjiItems.length >= 4
        : knowledgeQuizScope === 'kana'
          ? kanaArcadeCards.length >= 4
          : knowledgeQuizScope === 'vocabulary'
            ? vocabularyLookupEntries.length >= 4
            : globalKanjiItems.length >= 4;
    const rate = globalQuizSession?.questions.length
      ? Math.round((globalQuizSession.correctCount / globalQuizSession.questions.length) * 100)
      : 0;
    const domainResults = (['kana', 'vocabulary', 'grammar', 'kanji'] as GlobalQuizDomain[]).map((domain) => {
      const questions = globalQuizSession?.questions.filter((question) => question.domain === domain) ?? [];
      const mistakes = globalQuizSession?.mistakes.filter((mistake) => mistake.question.domain === domain) ?? [];
      return { domain, total: questions.length, correct: questions.length - mistakes.length };
    });

    return (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.segmented}>
          <SegmentButton label="Tout" active={knowledgeQuizScope === 'all'} onPress={() => openKnowledgeQuizScope('all')} />
          <SegmentButton label="Kana" active={knowledgeQuizScope === 'kana'} onPress={() => openKnowledgeQuizScope('kana')} />
          <SegmentButton label="Vocab" active={knowledgeQuizScope === 'vocabulary'} onPress={() => openKnowledgeQuizScope('vocabulary')} />
        </View>
        <View style={styles.segmented}>
          <SegmentButton label="Grammaire" active={false} onPress={() => setQuizMode('grammar')} />
          <SegmentButton label="Kanji" active={knowledgeQuizScope === 'kanji'} onPress={() => openKnowledgeQuizScope('kanji')} />
          <SegmentButton label="JLPT" active={false} onPress={() => setQuizMode('adaptive')} />
        </View>

        {!globalQuizSession && !globalMatchingSession ? (
          <>
            <View style={styles.arcadeHero}>
              <Text style={styles.arcadeKicker}>総合 Quiz {scopeLabel}</Text>
              <Text style={styles.arcadeTitle}>
                {knowledgeQuizScope === 'all' ? 'Toute ta maîtrise N5 dans une session' : `Entraînement complet · ${scopeLabel}`}
              </Text>
              <Text style={styles.arcadeText}>
                {knowledgeQuizScope === 'all'
                  ? 'Kana, vocabulaire, grammaire et 80 kanji sont distribués équitablement pour révéler ton niveau réel.'
                  : `Les cinq configurations d’exercice sont appliquées uniquement au domaine ${scopeLabel}.`}
              </Text>
            </View>
            <View style={styles.globalDomainStrip}>
              {scopedDomains.map((domain) => (
                <View key={domain} style={styles.globalDomainChip}>
                  <Text style={styles.globalDomainChipText}>{getGlobalDomainLabel(domain)}</Text>
                </View>
              ))}
            </View>
            <Section title={`Configuration · ${scopeLabel}`}>
              <Text style={styles.quizConfigMode}>Choisis ton entraînement</Text>
              <View style={styles.grammarModeGrid}>
                {GLOBAL_QUIZ_MODES.map((mode) => {
                  const active = globalQuizMode === mode.id;
                  const copy = getKnowledgeQuizModeCopy(mode.id, knowledgeQuizScope);
                  return (
                    <Pressable
                      key={mode.id}
                      onPress={() => setGlobalQuizMode(mode.id)}
                      style={[styles.grammarModeCard, active && styles.grammarModeCardActive]}
                    >
                      <Text style={[styles.grammarModeSymbol, active && styles.grammarModeSymbolActive]}>{copy.symbol}</Text>
                      <View style={styles.grammarModeCopy}>
                        <Text style={[styles.grammarModeTitle, active && styles.grammarModeTitleActive]}>{copy.title}</Text>
                        <Text style={[styles.grammarModeSubtitle, active && styles.grammarModeSubtitleActive]}>
                          {copy.subtitle}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              {globalQuizMode !== 'matching' && (
                <View style={styles.segmented}>
                  <SegmentButton label="10 questions" active={globalQuizSize === 10} onPress={() => setGlobalQuizSize(10)} />
                  <SegmentButton label="20 questions" active={globalQuizSize === 20} onPress={() => setGlobalQuizSize(20)} />
                </View>
              )}
              <View style={styles.quizConfigCard}>
                <Text style={styles.quizConfigTitle}>
                  {globalQuizMode === 'matching' ? '3 manches · 15 associations' : `${globalQuizSize} questions équilibrées`}
                </Text>
                <Text style={styles.quizConfigMode}>{activeMode.title}</Text>
                <Text style={styles.quizConfigText}>{activeMode.subtitle}</Text>
                <Text style={styles.quizConfigText}>
                  {knowledgeQuizScope === 'all'
                    ? 'Chaque domaine revient régulièrement : aucun sujet maîtrisé ou difficile n’est laissé de côté.'
                    : `Toutes les questions portent sur ${scopeLabel}, avec un nouveau tirage à chaque session.`}
                </Text>
              </View>
              <Pressable
                disabled={!ready}
                style={[styles.primaryButton, !ready && styles.primaryButtonDisabled]}
                onPress={startGlobalQuiz}
              >
                <Text style={styles.primaryButtonText}>{ready ? `Lancer · ${activeMode.title}` : 'Préparation des données…'}</Text>
              </Pressable>
              {knowledgeQuizScope === 'kana' && (
                <Pressable style={styles.secondaryFullButton} onPress={() => setQuizMode('kana_arcade')}>
                  <Text style={styles.secondaryFullButtonText}>Ouvrir l’Arcade Kana chronométrée</Text>
                </Pressable>
              )}
            </Section>
          </>
        ) : globalMatchingSession?.finished ? (
          <>
            <View style={styles.resultCard}>
              <Text style={styles.resultKicker}>Associations globales terminées</Text>
              <Text style={styles.resultScore}>{globalMatchingSession.score}</Text>
              <Text style={styles.resultPercent}>points · {matchingTotal}/{matchingTotal} paires</Text>
              <Text style={styles.resultTime}>{globalMatchingSession.errors} erreur(s) sur les quatre domaines</Text>
            </View>
            <Pressable style={styles.primaryButton} onPress={startGlobalQuiz}>
              <Text style={styles.primaryButtonText}>Rejouer</Text>
            </Pressable>
            <Pressable style={styles.secondaryFullButton} onPress={quitGlobalQuiz}>
              <Text style={styles.secondaryFullButtonText}>Quitter</Text>
            </Pressable>
          </>
        ) : globalMatchingSession && currentRound ? (
          <>
            <View style={styles.arcadeHud}>
              <View>
                <Text style={styles.questionMeta}>Manche {globalMatchingSession.currentRound + 1}/3</Text>
                <Text style={styles.arcadeHudScore}>{globalMatchingSession.matchedIds.length}/{matchingTotal} paires</Text>
              </View>
              <Text style={styles.quizScorePill}>{globalMatchingSession.score} pts</Text>
            </View>
            <View style={styles.pathProgressTrack}>
              <View style={[styles.pathProgressFill, { width: `${Math.round((globalMatchingSession.matchedIds.length / matchingTotal) * 100)}%` }]} />
            </View>
            <Text style={styles.questionTitle}>Relie les connaissances correspondantes</Text>
            <Text style={styles.feedbackMnemonic}>{globalMatchMessage}</Text>
            <View style={styles.grammarMatchingBoard}>
              <View style={styles.grammarMatchingColumn}>
                <Text style={styles.grammarMatchingColumnTitle}>Question</Text>
                {currentRound.pairs.map((pair) => {
                  const matched = globalMatchingSession.matchedIds.includes(pair.id);
                  const selected = globalMatchingSession.selectedLeftId === pair.id;
                  return (
                    <Pressable
                      key={`global-left-${pair.id}`}
                      disabled={matched || globalMatchingSession.locked}
                      onPress={() => selectGlobalMatchLeft(pair.id)}
                      style={[
                        styles.grammarMatchCard,
                        selected && styles.grammarMatchCardSelected,
                        matched && styles.grammarMatchCardMatched,
                      ]}
                    >
                      <Text style={styles.globalMatchDomain}>{getGlobalDomainLabel(pair.domain)}</Text>
                      <Text style={styles.grammarMatchJapanese}>{pair.left}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.grammarMatchingColumn}>
                <Text style={styles.grammarMatchingColumnTitle}>Réponse</Text>
                {currentRound.rightOrder.map((pairId) => {
                  const pair = currentRound.pairs.find((item) => item.id === pairId);
                  if (!pair) return null;
                  const matched = globalMatchingSession.matchedIds.includes(pair.id);
                  const selected = globalMatchingSession.selectedRightId === pair.id;
                  const wrong = selected && globalMatchingSession.selectedLeftId !== pair.id;
                  return (
                    <Pressable
                      key={`global-right-${pair.id}`}
                      disabled={matched || globalMatchingSession.locked || !globalMatchingSession.selectedLeftId}
                      onPress={() => answerGlobalMatchRight(pair.id)}
                      style={[
                        styles.grammarMatchCard,
                        selected && !wrong && styles.grammarMatchCardSelected,
                        wrong && styles.grammarMatchCardWrong,
                        matched && styles.grammarMatchCardMatched,
                      ]}
                    >
                      <Text style={styles.grammarMatchFrench}>{pair.right}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <Pressable style={styles.secondaryFullButton} onPress={quitGlobalQuiz}>
              <Text style={styles.secondaryFullButtonText}>Quitter</Text>
            </Pressable>
          </>
        ) : globalQuizSession?.finished ? (
          <>
            <View style={styles.resultCard}>
              <Text style={styles.resultKicker}>{activeMode.title} terminé</Text>
              <Text style={styles.resultScore}>{globalQuizSession.score}</Text>
              <Text style={styles.resultPercent}>{rate}% · {globalQuizSession.correctCount}/{globalQuizSession.questions.length} réponses justes</Text>
              <Text style={styles.resultTime}>Meilleure série : {globalQuizSession.bestStreak} · Erreurs : {globalQuizSession.mistakes.length}</Text>
            </View>
            <View style={styles.globalResultGrid}>
              {domainResults.map((result) => (
                <View key={result.domain} style={styles.globalResultCard}>
                  <Text style={styles.globalResultDomain}>{getGlobalDomainLabel(result.domain)}</Text>
                  <Text style={styles.globalResultValue}>{result.correct}/{result.total}</Text>
                </View>
              ))}
            </View>
            <Pressable style={styles.primaryButton} onPress={startGlobalQuiz}>
              <Text style={styles.primaryButtonText}>Rejouer</Text>
            </Pressable>
            <Pressable style={styles.secondaryFullButton} onPress={quitGlobalQuiz}>
              <Text style={styles.secondaryFullButtonText}>Quitter</Text>
            </Pressable>
          </>
        ) : globalQuizSession && currentQuestion ? (
          <>
            <View style={styles.arcadeHud}>
              <View>
                <Text style={styles.questionMeta}>Question {globalQuizSession.currentIndex + 1}/{globalQuizSession.questions.length}</Text>
                <Text style={styles.arcadeHudScore}>{globalQuizSession.correctCount} justes</Text>
              </View>
              <Text style={styles.quizScorePill}>{getGlobalDomainLabel(currentQuestion.domain)}</Text>
            </View>
            <View style={styles.pathProgressTrack}>
              <View
                style={[
                  styles.pathProgressFill,
                  { width: `${Math.round(((globalQuizSession.currentIndex + (globalQuizSession.selected ? 1 : 0)) / globalQuizSession.questions.length) * 100)}%` },
                ]}
              />
            </View>
            <View style={styles.arcadeHud}>
              <Text style={styles.quizScorePill}>{globalQuizSession.score} pts</Text>
              <Text style={styles.quizScorePill}>Combo x{getGrammarStreakMultiplier(globalQuizSession.streak)}</Text>
            </View>
            <Text style={styles.questionTitle}>{currentQuestion.prompt}</Text>
            <Text style={styles.globalQuestionDisplay}>{currentQuestion.display}</Text>
            {currentQuestion.choices.length > 0 ? (
              <View style={styles.choiceList}>
                {currentQuestion.choices.map((choice) => {
                  const correct = normalizeAnswer(choice) === normalizeAnswer(currentQuestion.correctAnswer);
                  const selectedChoice = globalQuizSession.selected === choice;
                  return (
                    <Pressable
                      key={choice}
                      disabled={globalQuizSession.selected !== null}
                      onPress={() => answerGlobalQuiz(choice)}
                      style={[
                        styles.choice,
                        globalQuizSession.selected && correct && styles.choiceCorrect,
                        globalQuizSession.selected && selectedChoice && !correct && styles.choiceWrong,
                      ]}
                    >
                      <Text style={styles.choiceText}>{choice}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View style={styles.directAnswerBox}>
                <TextInput
                  value={globalDirectInput}
                  onChangeText={setGlobalDirectInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Tape ta réponse"
                  style={styles.directAnswerInput}
                />
                <Pressable
                  disabled={!globalDirectInput.trim() || globalQuizSession.selected !== null}
                  style={[styles.primaryButton, (!globalDirectInput.trim() || globalQuizSession.selected !== null) && styles.primaryButtonDisabled]}
                  onPress={() => answerGlobalQuiz(globalDirectInput)}
                >
                  <Text style={styles.primaryButtonText}>Valider</Text>
                </Pressable>
              </View>
            )}
            {globalQuizSession.selected !== null && (
              <View style={styles.feedback}>
                <Text style={styles.feedbackTitle}>
                  {normalizeAnswer(globalQuizSession.selected) === normalizeAnswer(currentQuestion.correctAnswer) ? 'Correct' : 'À revoir'}
                </Text>
                <Text style={styles.feedbackText}>Réponse : {currentQuestion.correctAnswer}</Text>
                <Text style={styles.feedbackText}>{currentQuestion.explanation}</Text>
                <Pressable style={styles.primaryButton} onPress={advanceGlobalQuiz}>
                  <Text style={styles.primaryButtonText}>
                    {globalQuizSession.currentIndex + 1 >= globalQuizSession.questions.length ? 'Voir le résultat' : 'Question suivante'}
                  </Text>
                </Pressable>
              </View>
            )}
            <Pressable style={styles.secondaryFullButton} onPress={quitGlobalQuiz}>
              <Text style={styles.secondaryFullButtonText}>Quitter</Text>
            </Pressable>
          </>
        ) : (
          <EmptyState title="Le Quiz Global se prépare" />
        )}
      </ScrollView>
    );
  }

  if (quizMode === 'grammar') {
    const currentGrammarQuestion = grammarQuizSession?.questions[grammarQuizSession.currentIndex] ?? null;
    const grammarTotal = grammarQuizSession?.questions.length ?? grammarQuizSize;
    const safeGrammarQuizRomaji = currentGrammarQuestion
      ? hideGrammarAnswerInHint(
          currentGrammarQuestion.romaji,
          currentGrammarQuestion.correctAnswer,
          'Romaji complet masqué pendant cette question.'
        )
      : '';
    const safeGrammarQuizFrench = currentGrammarQuestion
      ? hideGrammarAnswerInHint(
          currentGrammarQuestion.french,
          currentGrammarQuestion.correctAnswer,
          'Traduction complète masquée pendant cette question.'
        )
      : '';
    const grammarRate =
      grammarQuizSession && grammarQuizSession.questions.length > 0
        ? Math.round((grammarQuizSession.correctCount / grammarQuizSession.questions.length) * 100)
        : 0;
    const currentMatchingRound = grammarMatchingSession?.rounds[grammarMatchingSession.currentRound] ?? null;
    const matchingTotal = grammarMatchingSession
      ? grammarMatchingSession.rounds.reduce((total, round) => total + round.pairs.length, 0)
      : 0;
    const matchingRate = grammarMatchingSession?.attempts
      ? Math.round(((grammarMatchingSession.attempts - grammarMatchingSession.errors) / grammarMatchingSession.attempts) * 100)
      : 100;
    const activeGrammarMode = GRAMMAR_QUIZ_MODES.find((mode) => mode.id === grammarQuizMode) ?? GRAMMAR_QUIZ_MODES[0];

    return (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.segmented}>
          <SegmentButton label="Tout" active={false} onPress={() => openKnowledgeQuizScope('all')} />
          <SegmentButton label="Kana" active={false} onPress={() => openKnowledgeQuizScope('kana')} />
          <SegmentButton label="Vocab" active={false} onPress={() => openKnowledgeQuizScope('vocabulary')} />
        </View>
        <View style={styles.segmented}>
          <SegmentButton label="Grammaire" active onPress={() => setQuizMode('grammar')} />
          <SegmentButton label="Kanji" active={false} onPress={() => openKnowledgeQuizScope('kanji')} />
          <SegmentButton label="JLPT" active={false} onPress={() => setQuizMode('adaptive')} />
        </View>

        {!grammarQuizSession && !grammarMatchingSession ? (
          <>
            <View style={styles.arcadeHero}>
              <Text style={styles.arcadeKicker}>文法 Quiz</Text>
              <Text style={styles.arcadeTitle}>Grammaire N5 active</Text>
              <Text style={styles.arcadeText}>
                Cinq entraînements distincts sur les {ALL_GRAMMAR_LESSONS.length} leçons : écriture, QCM,
                associations, dialogues et défi à score.
              </Text>
            </View>
            <Section title="Configuration">
              <Text style={styles.quizConfigMode}>Choisis ton mode</Text>
              <View style={styles.grammarModeGrid}>
                {GRAMMAR_QUIZ_MODES.map((mode) => {
                  const active = grammarQuizMode === mode.id;
                  return (
                    <Pressable
                      key={mode.id}
                      onPress={() => setGrammarQuizMode(mode.id)}
                      style={[styles.grammarModeCard, active && styles.grammarModeCardActive]}
                    >
                      <Text style={[styles.grammarModeSymbol, active && styles.grammarModeSymbolActive]}>{mode.symbol}</Text>
                      <View style={styles.grammarModeCopy}>
                        <Text style={[styles.grammarModeTitle, active && styles.grammarModeTitleActive]}>{mode.title}</Text>
                        <Text style={[styles.grammarModeSubtitle, active && styles.grammarModeSubtitleActive]}>
                          {mode.subtitle}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              {grammarQuizMode !== 'matching' && (
                <View style={styles.segmented}>
                  <SegmentButton label="10 questions" active={grammarQuizSize === 10} onPress={() => setGrammarQuizSize(10)} />
                  <SegmentButton label="20 questions" active={grammarQuizSize === 20} onPress={() => setGrammarQuizSize(20)} />
                </View>
              )}
              <View style={styles.quizConfigCard}>
                <Text style={styles.quizConfigTitle}>
                  {grammarQuizMode === 'matching' ? '3 manches de 5 paires' : `${grammarQuizSize} questions prêtes`}
                </Text>
                <Text style={styles.quizConfigMode}>
                  {activeGrammarMode.title}
                </Text>
                <Text style={styles.quizConfigText}>
                  Chaque réponse est enregistrée dans les stats, les missions, les badges et le parcours JLPT.
                </Text>
                <Text style={styles.quizConfigText}>
                  {activeGrammarMode.subtitle}
                </Text>
              </View>
              <Pressable style={styles.primaryButton} onPress={startGrammarQuiz}>
                <Text style={styles.primaryButtonText}>
                  Lancer · {activeGrammarMode.title}
                </Text>
              </Pressable>
            </Section>
          </>
        ) : grammarMatchingSession?.finished ? (
          <>
            <View style={styles.resultCard}>
              <Text style={styles.resultKicker}>Associations terminées</Text>
              <Text style={styles.resultScore}>{grammarMatchingSession.score}</Text>
              <Text style={styles.resultPercent}>points · {matchingTotal}/{matchingTotal} paires reliées</Text>
              <Text style={styles.resultTime}>
                Précision : {matchingRate}% · {grammarMatchingSession.errors} erreur(s)
              </Text>
              <Text style={styles.resultTime}>Trois manches complètes enregistrées dans tes statistiques.</Text>
            </View>
            <Pressable
              style={styles.primaryButton}
              onPress={() => {
                setGrammarMatchingSession(createGrammarMatchingSession());
                setGrammarMatchMessage('Choisis une phrase, puis sa traduction.');
              }}
            >
              <Text style={styles.primaryButtonText}>Rejouer les associations</Text>
            </Pressable>
            <Pressable style={styles.secondaryFullButton} onPress={quitGrammarQuiz}>
              <Text style={styles.secondaryFullButtonText}>Quitter</Text>
            </Pressable>
          </>
        ) : grammarMatchingSession && currentMatchingRound ? (
          <>
            <View style={styles.arcadeHud}>
              <View>
                <Text style={styles.questionMeta}>
                  Manche {grammarMatchingSession.currentRound + 1}/{grammarMatchingSession.rounds.length}
                </Text>
                <Text style={styles.arcadeHudScore}>
                  {grammarMatchingSession.matchedIds.length}/{matchingTotal} paires
                </Text>
              </View>
              <Text style={styles.quizScorePill}>{grammarMatchingSession.score} pts</Text>
            </View>
            <View style={styles.pathProgressTrack}>
              <View
                style={[
                  styles.pathProgressFill,
                  { width: `${Math.round((grammarMatchingSession.matchedIds.length / matchingTotal) * 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.questionTitle}>Relie chaque phrase à son sens</Text>
            <Text style={styles.feedbackMnemonic}>{grammarMatchMessage}</Text>
            <View style={styles.grammarMatchingBoard}>
              <View style={styles.grammarMatchingColumn}>
                <Text style={styles.grammarMatchingColumnTitle}>Japonais</Text>
                {currentMatchingRound.pairs.map((pair) => {
                  const matched = grammarMatchingSession.matchedIds.includes(pair.id);
                  const selected = grammarMatchingSession.selectedLeftId === pair.id;
                  return (
                    <Pressable
                      key={`left-${pair.id}`}
                      disabled={matched || grammarMatchingSession.locked}
                      onPress={() => selectGrammarMatchLeft(pair.id)}
                      style={[
                        styles.grammarMatchCard,
                        selected && styles.grammarMatchCardSelected,
                        matched && styles.grammarMatchCardMatched,
                      ]}
                    >
                      <Text style={styles.grammarMatchJapanese}>{pair.japanese}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.grammarMatchingColumn}>
                <Text style={styles.grammarMatchingColumnTitle}>Français</Text>
                {currentMatchingRound.rightOrder.map((pairId) => {
                  const pair = currentMatchingRound.pairs.find((item) => item.id === pairId);
                  if (!pair) return null;
                  const matched = grammarMatchingSession.matchedIds.includes(pair.id);
                  const selected = grammarMatchingSession.selectedRightId === pair.id;
                  const wrong = selected && grammarMatchingSession.selectedLeftId !== pair.id;
                  return (
                    <Pressable
                      key={`right-${pair.id}`}
                      disabled={matched || grammarMatchingSession.locked || !grammarMatchingSession.selectedLeftId}
                      onPress={() => answerGrammarMatchRight(pair.id)}
                      style={[
                        styles.grammarMatchCard,
                        selected && !wrong && styles.grammarMatchCardSelected,
                        wrong && styles.grammarMatchCardWrong,
                        matched && styles.grammarMatchCardMatched,
                      ]}
                    >
                      <Text style={styles.grammarMatchFrench}>{pair.french}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <Pressable style={styles.secondaryFullButton} onPress={quitGrammarQuiz}>
              <Text style={styles.secondaryFullButtonText}>Quitter</Text>
            </Pressable>
          </>
        ) : grammarQuizSession?.finished ? (
          <>
            <View style={styles.resultCard}>
              <Text style={styles.resultKicker}>{activeGrammarMode.title} terminé</Text>
              <Text style={styles.resultScore}>{grammarRate}%</Text>
              <Text style={styles.resultPercent}>
                {grammarQuizSession.correctCount}/{grammarQuizSession.questions.length} bonnes réponses
              </Text>
              <Text style={styles.resultTime}>
                Score : {grammarQuizSession.score} pts · Meilleure série : {grammarQuizSession.bestStreak}
              </Text>
              <Text style={styles.resultTime}>
                Vies restantes : {grammarQuizSession.lives}/3 · Erreurs à revoir : {grammarQuizSession.mistakes.length}
              </Text>
              <Text style={styles.resultTime}>Progression grammaire enregistrée dans ton parcours JLPT.</Text>
            </View>
            {grammarQuizSession.mistakes.length > 0 && (
              <Pressable style={styles.primaryButton} onPress={restartGrammarQuizMistakes}>
                <Text style={styles.primaryButtonText}>Revoir mes erreurs</Text>
              </Pressable>
            )}
            <Pressable style={styles.primaryButton} onPress={startGrammarQuiz}>
              <Text style={styles.primaryButtonText}>Rejouer</Text>
            </Pressable>
            <Pressable style={styles.secondaryFullButton} onPress={quitGrammarQuiz}>
              <Text style={styles.secondaryFullButtonText}>Quitter</Text>
            </Pressable>
          </>
        ) : grammarQuizSession && currentGrammarQuestion ? (
          <>
            <View style={styles.arcadeHud}>
              <View>
                <Text style={styles.questionMeta}>
                  Question {grammarQuizSession.currentIndex + 1}/{grammarTotal}
                </Text>
                <Text style={styles.arcadeHudScore}>{grammarQuizSession.correctCount} justes</Text>
              </View>
              <View style={styles.arcadeHudRight}>
                <Text style={styles.quizScorePill}>{activeGrammarMode.title}</Text>
              </View>
            </View>
            <Text style={styles.questionMeta}>{getGrammarMainMenu(currentGrammarQuestion.lesson)}</Text>
            <View style={styles.pathProgressTrack}>
              <View
                style={[
                  styles.pathProgressFill,
                  {
                    width: `${Math.round(
                      ((grammarQuizSession.currentIndex + (grammarQuizSession.selected ? 1 : 0)) /
                        grammarQuizSession.questions.length) *
                        100
                    )}%`,
                  },
                ]}
              />
            </View>
            <View style={styles.arcadeHud}>
              <Text style={styles.quizScorePill}>{grammarQuizSession.score} pts</Text>
              <Text style={styles.quizScorePill}>
                Série {grammarQuizSession.streak} · x{getGrammarStreakMultiplier(grammarQuizSession.streak)}
              </Text>
              <Text style={styles.quizScorePill}>
                {'♥'.repeat(grammarQuizSession.lives)}{'♡'.repeat(Math.max(0, 3 - grammarQuizSession.lives))}
              </Text>
            </View>
            <Text style={styles.questionTitle}>{currentGrammarQuestion.prompt}</Text>
            {!!currentGrammarQuestion.japanese && (
              <>
                <JapaneseLookupText
                  text={
                    grammarQuizKanaOnly
                      ? currentGrammarQuestion.kanaJapanese ?? currentGrammarQuestion.japanese
                      : currentGrammarQuestion.japanese
                  }
                  entries={vocabularyLookupEntries}
                  onSelect={(entry) => {
                    setSelectedWordLookup(entry);
                    setSelectedWordLookupAnchorId('quiz-grammar');
                  }}
                  style={styles.japanese}
                />
                {selectedWordLookupAnchorId === 'quiz-grammar' && (
                  <WordLookupPanel
                    entry={selectedWordLookup}
                    onClose={() => {
                      setSelectedWordLookup(null);
                      setSelectedWordLookupAnchorId(null);
                    }}
                  />
                )}
                {!!currentGrammarQuestion.kanaJapanese &&
                  currentGrammarQuestion.kanaJapanese !== currentGrammarQuestion.japanese && (
                    <Pressable
                      onPress={() => setGrammarQuizKanaOnly((value) => !value)}
                      style={styles.grammarExampleActionButton}
                    >
                      <Text style={styles.grammarExampleActionText}>
                        {grammarQuizKanaOnly ? 'Voir phrase naturelle' : 'Voir en hiragana'}
                      </Text>
                    </Pressable>
                  )}
              </>
            )}
            <View style={styles.grammarExampleActions}>
              {!!safeGrammarQuizRomaji && (
                <Pressable
                  onPress={() => setGrammarQuizRomajiVisible((visible) => !visible)}
                  style={styles.grammarExampleActionButton}
                >
                  <Text style={styles.grammarExampleActionText}>
                    {grammarQuizRomajiVisible ? 'Masquer romaji' : 'Voir romaji'}
                  </Text>
                </Pressable>
              )}
              {!!safeGrammarQuizFrench && (
                <Pressable
                  onPress={() => setGrammarQuizFrenchVisible((visible) => !visible)}
                  style={[styles.grammarExampleActionButton, styles.grammarExampleTranslateButton]}
                >
                  <Text style={[styles.grammarExampleActionText, styles.grammarExampleTranslateText]}>
                    {grammarQuizFrenchVisible ? 'Masquer français' : 'Voir français'}
                  </Text>
                </Pressable>
              )}
            </View>
            {grammarQuizRomajiVisible && !!safeGrammarQuizRomaji && (
              <Text style={styles.grammarExampleRomaji}>{safeGrammarQuizRomaji}</Text>
            )}
            {grammarQuizFrenchVisible && !!safeGrammarQuizFrench && (
              <View style={styles.grammarTranslationBox}>
                <Text style={styles.grammarTranslation}>{safeGrammarQuizFrench}</Text>
              </View>
            )}
            <Text style={styles.feedbackMnemonic}>{getGrammarExerciseInstruction(currentGrammarQuestion.kind)}</Text>
            <Text style={styles.feedbackText}>{currentGrammarQuestion.helper}</Text>
            {currentGrammarQuestion.choices.length > 0 ? (
              <View style={styles.choiceList}>
                {currentGrammarQuestion.choices.map((choice) => {
                  const isCorrect = isGrammarAnswerCorrect(choice, currentGrammarQuestion.correctAnswer);
                  const isSelected = grammarQuizSession.selected === choice;
                  return (
                    <Pressable
                      key={choice}
                      disabled={grammarQuizSession.selected !== null}
                      style={[
                        styles.choice,
                        grammarQuizSession.selected && isCorrect && styles.choiceCorrect,
                        grammarQuizSession.selected && isSelected && !isCorrect && styles.choiceWrong,
                      ]}
                      onPress={() => answerGrammarQuiz(choice)}
                    >
                      <Text style={styles.choiceText}>{choice}</Text>
                      {grammarQuizSession.selected && isCorrect && <Text style={styles.choiceIcon}>✓</Text>}
                      {grammarQuizSession.selected && isSelected && !isCorrect && <Text style={styles.choiceIcon}>×</Text>}
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View style={styles.directAnswerBox}>
                <TextInput
                  value={grammarDirectInput}
                  onChangeText={setGrammarDirectInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Tape la réponse"
                  style={styles.directAnswerInput}
                />
                <Pressable
                  disabled={grammarDirectInput.trim().length === 0 || grammarQuizSession.selected !== null}
                  style={[
                    styles.primaryButton,
                    (grammarDirectInput.trim().length === 0 || grammarQuizSession.selected !== null) &&
                      styles.primaryButtonDisabled,
                  ]}
                  onPress={() => answerGrammarQuiz(grammarDirectInput)}
                >
                  <Text style={styles.primaryButtonText}>Valider</Text>
                </Pressable>
              </View>
            )}
            {grammarQuizSession.selected !== null && (
              <View style={styles.feedback}>
                <Text style={styles.feedbackTitle}>
                  {isGrammarAnswerCorrect(grammarQuizSession.selected, currentGrammarQuestion.correctAnswer)
                    ? 'Correct'
                    : 'À revoir'}
                </Text>
                <Text style={styles.feedbackText}>Réponse : {currentGrammarQuestion.correctAnswer}</Text>
                {buildGrammarCorrectionDetails(currentGrammarQuestion).map((detail) => (
                  <View key={`${currentGrammarQuestion.id}-${detail.title}`} style={styles.grammarCourseBlock}>
                    <Text style={styles.grammarCourseTitle}>{detail.title}</Text>
                    <Text style={styles.grammarCourseText}>{detail.text}</Text>
                  </View>
                ))}
                <Pressable style={styles.primaryButton} onPress={advanceGrammarQuiz}>
                  <Text style={styles.primaryButtonText}>
                    {grammarQuizSession.currentIndex + 1 >= grammarQuizSession.questions.length
                      ? 'Voir le résultat'
                      : 'Question suivante'}
                  </Text>
                </Pressable>
              </View>
            )}
            <Pressable style={styles.secondaryFullButton} onPress={quitGrammarQuiz}>
              <Text style={styles.secondaryFullButtonText}>Quitter</Text>
            </Pressable>
          </>
        ) : (
          <EmptyState title="Aucune question de grammaire" />
        )}
      </ScrollView>
    );
  }

  if (quizMode === 'kana_arcade') {
    const liveElapsed = kanaArcadeSession
      ? kanaArcadeSession.elapsedMs ?? Math.max(0, arcadeTick - kanaArcadeSession.startedAt)
      : 0;
    const currentArcadeQuestion = kanaArcadeSession?.questions[kanaArcadeSession.currentIndex] ?? null;
    const correctCount = kanaArcadeSession?.answers.filter((answer) => answer.isCorrect).length ?? 0;
    const currentMultiplier = getKanaArcadeMultiplier(kanaArcadeSession?.streak ?? 0);

    return (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.segmented}>
          <SegmentButton label="Tout" active={false} onPress={() => openKnowledgeQuizScope('all')} />
          <SegmentButton label="Kana" active onPress={() => openKnowledgeQuizScope('kana')} />
          <SegmentButton label="Vocab" active={false} onPress={() => openKnowledgeQuizScope('vocabulary')} />
        </View>
        <View style={styles.segmented}>
          <SegmentButton label="Grammaire" active={false} onPress={() => setQuizMode('grammar')} />
          <SegmentButton label="Kanji" active={false} onPress={() => openKnowledgeQuizScope('kanji')} />
          <SegmentButton label="JLPT" active={false} onPress={() => setQuizMode('adaptive')} />
        </View>

        {!kanaArcadeSession ? (
          <>
            <View style={styles.arcadeHero}>
              <Text style={styles.arcadeKicker}>Arcade Kana</Text>
              <Text style={styles.arcadeTitle}>Hiragana, katakana et sons combinés</Text>
              <Text style={styles.arcadeText}>
                QCM chronométré avec score, séries et multiplicateurs. Une bonne réponse vaut 100 points avant bonus.
              </Text>
            </View>
            <Section title="Configuration">
              <View style={styles.segmented}>
                <SegmentButton label="10 questions" active={kanaQuizSize === 10} onPress={() => setKanaQuizSize(10)} />
                <SegmentButton label="20 questions" active={kanaQuizSize === 20} onPress={() => setKanaQuizSize(20)} />
              </View>
              <View style={styles.arcadeRulesGrid}>
                <View style={styles.arcadeRuleCard}>
                  <Text style={styles.arcadeRuleValue}>100</Text>
                  <Text style={styles.arcadeRuleLabel}>points de base</Text>
                </View>
                <View style={styles.arcadeRuleCard}>
                  <Text style={styles.arcadeRuleValue}>x5</Text>
                  <Text style={styles.arcadeRuleLabel}>combo max</Text>
                </View>
                <View style={styles.arcadeRuleCard}>
                  <Text style={styles.arcadeRuleValue}>0</Text>
                  <Text style={styles.arcadeRuleLabel}>si erreur</Text>
                </View>
              </View>
              <View style={styles.quizConfigCard}>
                <Text style={styles.quizConfigTitle}>{kanaQuizSize} questions prêtes</Text>
                <Text style={styles.quizConfigMode}>Deck complet kana</Text>
                <Text style={styles.quizConfigText}>
                  Pool disponible : {kanaArcadeCards.length} kana, incluant hiragana, katakana et sons combinés.
                </Text>
                <Text style={styles.quizConfigText}>
                  Multiplicateur : x1 puis x1.5 à 3 bonnes réponses, x2 à 5, x3 à 8, x4 à 10 et x5 à 12.
                </Text>
              </View>
              <Pressable
                disabled={kanaArcadeCards.length < 4}
                style={[styles.primaryButton, kanaArcadeCards.length < 4 && styles.primaryButtonDisabled]}
                onPress={startKanaArcade}
              >
                <Text style={styles.primaryButtonText}>Lancer le Quiz Kana</Text>
              </Pressable>
            </Section>
            <Section title="Meilleurs scores">
              {kanaArcadeScores.length === 0 ? (
                <EmptyText text="Lance un Quiz Kana pour créer ton premier score." />
              ) : (
                <View style={styles.timeRankingCard}>
                  {kanaArcadeScores.map((record, index) => (
                    <View key={record.id} style={styles.timeRankingRow}>
                      <Text style={styles.timeRankingRank}>#{index + 1}</Text>
                      <Text style={styles.timeRankingTime}>{record.score} pts</Text>
                      <Text style={styles.timeRankingMeta}>
                        {record.correct_count}/{record.total_count} · {formatElapsedTime(record.elapsed_ms)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </Section>
          </>
        ) : kanaArcadeSession.finished ? (
          <>
            {kanaArcadeSession.isNewBestScore && (
              <Animated.View
                style={[
                  styles.arcadeRecordBanner,
                  {
                    opacity: arcadeRecordAnim,
                    transform: [
                      {
                        scale: arcadeRecordAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.92, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Text style={styles.arcadeRecordKicker}>Nouveau record</Text>
                <Text style={styles.arcadeRecordTitle}>Meilleur score de tous les temps</Text>
                <Text style={styles.arcadeRecordScore}>
                  {kanaArcadeSession.score} pts · {formatElapsedTime(kanaArcadeSession.elapsedMs ?? liveElapsed)}
                </Text>
                <View style={styles.arcadeConfettiRow}>
                  <View style={[styles.arcadeConfetti, styles.arcadeConfettiGold]} />
                  <View style={[styles.arcadeConfetti, styles.arcadeConfettiGreen]} />
                  <View style={[styles.arcadeConfetti, styles.arcadeConfettiRed]} />
                  <View style={[styles.arcadeConfetti, styles.arcadeConfettiBlue]} />
                </View>
              </Animated.View>
            )}
            <View style={styles.resultCard}>
              <Text style={styles.resultKicker}>Quiz Kana terminé</Text>
              <Text style={styles.resultScore}>{kanaArcadeSession.score}</Text>
              <Text style={styles.resultPercent}>points · {correctCount}/{kanaArcadeSession.questions.length} bonnes réponses</Text>
              <Text style={styles.resultTime}>Temps : {formatElapsedTime(kanaArcadeSession.elapsedMs ?? liveElapsed)}</Text>
              <Text style={styles.resultTime}>Meilleure série : {kanaArcadeSession.bestStreak}</Text>
            </View>
            <Section title="Meilleur score de tous les temps">
              <View style={styles.arcadeBestScoreCard}>
                <Text style={styles.arcadeBestScoreValue}>
                  {(kanaArcadeSession.allTimeBest?.score ?? kanaArcadeSession.score)} pts
                </Text>
                <Text style={styles.arcadeBestScoreMeta}>
                  Temps : {formatElapsedTime(kanaArcadeSession.allTimeBest?.elapsed_ms ?? kanaArcadeSession.elapsedMs ?? liveElapsed)}
                </Text>
                <Text style={styles.arcadeBestScoreMeta}>
                  Réussite : {kanaArcadeSession.allTimeBest?.correct_count ?? correctCount}/
                  {kanaArcadeSession.allTimeBest?.total_count ?? kanaArcadeSession.questions.length} · Série max {kanaArcadeSession.allTimeBest?.best_streak ?? kanaArcadeSession.bestStreak}
                </Text>
              </View>
            </Section>
            <Section title="Détail des points">
              {kanaArcadeSession.answers.map((answer, index) => (
                <View key={`${answer.questionId}-${index}`} style={styles.answerReviewRow}>
                  <Text style={styles.answerReviewIndex}>{index + 1}</Text>
                  <Text style={styles.answerReviewText}>
                    {answer.prompt} · {answer.selected} / {answer.correct}
                  </Text>
                  <Text style={[styles.answerReviewStatus, answer.isCorrect ? styles.answerOk : styles.answerKo]}>
                    {answer.isCorrect ? `+${answer.points} x${answer.multiplier}` : '0'}
                  </Text>
                </View>
              ))}
            </Section>
            <Section title="Classement">
              <View style={styles.timeRankingCard}>
                {kanaArcadeScores.map((record, index) => (
                  <View key={record.id} style={styles.timeRankingRow}>
                    <Text style={styles.timeRankingRank}>#{index + 1}</Text>
                    <Text style={styles.timeRankingTime}>{record.score} pts</Text>
                    <Text style={styles.timeRankingMeta}>
                      {record.correct_count}/{record.total_count} · {formatElapsedTime(record.elapsed_ms)}
                    </Text>
                  </View>
                ))}
              </View>
            </Section>
            <Pressable style={styles.primaryButton} onPress={startKanaArcade}>
              <Text style={styles.primaryButtonText}>Rejouer</Text>
            </Pressable>
            <Pressable style={styles.secondaryFullButton} onPress={quitKanaArcade}>
              <Text style={styles.secondaryFullButtonText}>Quitter</Text>
            </Pressable>
          </>
        ) : currentArcadeQuestion ? (
          <>
            <View style={styles.arcadeHud}>
              <View>
                <Text style={styles.questionMeta}>
                  Question {kanaArcadeSession.currentIndex + 1}/{kanaArcadeSession.questions.length}
                </Text>
                <Text style={styles.arcadeHudScore}>{kanaArcadeSession.score} pts</Text>
                <Text style={styles.arcadeHudCorrect}>
                  {correctCount}/{kanaArcadeSession.questions.length} bonnes réponses
                </Text>
              </View>
              <View style={styles.arcadeHudRight}>
                <Text style={styles.quizTimerPill}>{formatElapsedTime(liveElapsed)}</Text>
                <Text style={styles.quizScorePill}>Série {kanaArcadeSession.streak} · x{currentMultiplier}</Text>
              </View>
            </View>
            {arcadeCelebration && (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.arcadeCelebration,
                    {
                      opacity: arcadeCelebrateAnim,
                      transform: [
                        {
                          translateY: arcadeCelebrateAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [10, 0],
                          }),
                        },
                        {
                          scale: arcadeCelebrateAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.96, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Text style={styles.arcadeCelebrationTitle}>+{arcadeCelebration.points} pts</Text>
                  <Text style={styles.arcadeCelebrationText}>
                    Série {arcadeCelebration.streak} · x{arcadeCelebration.multiplier}
                  </Text>
                </Animated.View>
              )}
            <Text style={styles.kanaExercisePrompt}>{currentArcadeQuestion.prompt.character}</Text>
            <Text style={styles.questionTitle}>Choisis le bon romaji</Text>
            <View style={styles.choiceList}>
              {currentArcadeQuestion.choices.map((choice) => {
                const isCorrect = normalizeAnswer(choice) === normalizeAnswer(currentArcadeQuestion.prompt.romaji);
                const isSelected = normalizeAnswer(kanaArcadeSession.selected ?? '') === normalizeAnswer(choice);
                return (
                  <Pressable
                    key={choice}
                    disabled={kanaArcadeSession.selected !== null}
                    onPress={() => answerKanaArcade(choice)}
                    style={[
                      styles.choice,
                      kanaArcadeSession.selected && isCorrect && styles.choiceCorrect,
                      kanaArcadeSession.selected && isSelected && !isCorrect && styles.choiceWrong,
                    ]}
                  >
                    <Text style={styles.choiceText}>{choice}</Text>
                    {kanaArcadeSession.selected && isCorrect && <Text style={styles.choiceIcon}>✓</Text>}
                    {kanaArcadeSession.selected && isSelected && !isCorrect && <Text style={styles.choiceIcon}>×</Text>}
                  </Pressable>
                );
              })}
            </View>
            {kanaArcadeSession.selected && (
              <View style={styles.feedback}>
                <Text style={styles.feedbackTitle}>
                  {normalizeAnswer(kanaArcadeSession.selected) === normalizeAnswer(currentArcadeQuestion.prompt.romaji)
                    ? 'Combo validé'
                    : 'Série cassée'}
                </Text>
                <Text style={styles.feedbackText}>
                  Réponse : {currentArcadeQuestion.prompt.character} se lit {currentArcadeQuestion.prompt.romaji}.
                </Text>
                <Text style={styles.feedbackMnemonic}>
                  Passage automatique à la question suivante.
                </Text>
                <Pressable style={styles.secondaryFullButton} onPress={quitKanaArcade}>
                  <Text style={styles.secondaryFullButtonText}>Quitter</Text>
                </Pressable>
              </View>
            )}
          </>
        ) : (
          <EmptyState title="Pas assez de kana pour créer le quiz" />
        )}
      </ScrollView>
    );
  }

  if (!question) {
    return <EmptyState title="Aucune question" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.segmented}>
        <SegmentButton label="Tout" active={false} onPress={() => openKnowledgeQuizScope('all')} />
        <SegmentButton label="Kana" active={false} onPress={() => openKnowledgeQuizScope('kana')} />
        <SegmentButton label="Vocab" active={false} onPress={() => openKnowledgeQuizScope('vocabulary')} />
      </View>
      <View style={styles.segmented}>
        <SegmentButton label="Grammaire" active={false} onPress={() => setQuizMode('grammar')} />
        <SegmentButton label="Kanji" active={false} onPress={() => openKnowledgeQuizScope('kanji')} />
        <SegmentButton label="JLPT" active onPress={() => setQuizMode('adaptive')} />
      </View>
      <Text style={styles.questionMeta}>{question.skill_id.toUpperCase()}</Text>
      <Text style={styles.questionTitle}>{question.prompt_fr}</Text>
      {!!question.prompt_ja && (
        <>
          <JapaneseLookupText
            text={question.prompt_ja}
            entries={vocabularyLookupEntries}
            onSelect={(entry) => {
              setSelectedWordLookup(entry);
              setSelectedWordLookupAnchorId('quiz-adaptive');
            }}
            style={styles.japanese}
          />
          {selectedWordLookupAnchorId === 'quiz-adaptive' && (
            <WordLookupPanel
              entry={selectedWordLookup}
              onClose={() => {
                setSelectedWordLookup(null);
                setSelectedWordLookupAnchorId(null);
              }}
            />
          )}
        </>
      )}

      <View style={styles.choiceList}>
        {choices.map((choice) => {
          const isSelected = selected?.id === choice.id;
          const isCorrect = choice.is_correct === 1;
          return (
            <Pressable
              key={choice.id}
              disabled={!!selected}
              onPress={() => answer(choice)}
              style={[
                styles.choice,
                selected && isCorrect && styles.choiceCorrect,
                selected && isSelected && !isCorrect && styles.choiceWrong,
              ]}
            >
              <Text style={styles.choiceText}>{choice.choice_text}</Text>
              {selected && isCorrect && <Text style={styles.choiceIcon}>✓</Text>}
              {selected && isSelected && !isCorrect && <Text style={styles.choiceIcon}>×</Text>}
            </Pressable>
          );
        })}
      </View>

      {selected && (
        <View style={styles.feedback}>
          <Text style={styles.feedbackTitle}>
            {selected.is_correct ? 'Correct' : 'À revoir'}
          </Text>
          <Text style={styles.feedbackText}>{question.explanation_fr}</Text>
          <Pressable style={styles.primaryButton} onPress={loadQuestion}>
            <Text style={styles.primaryButtonText}>Question suivante</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

function ExamScreen() {
  const db = useSQLiteContext();
  const [edition, setEdition] = useState<'2012' | '2018'>('2018');
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [segments, setSegments] = useState<ExamSegment[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [zoomVisible, setZoomVisible] = useState(false);

  const segment = useMemo(() => segments[index] ?? null, [segments, index]);
  const questionAsset = segment ? OFFICIAL_EXAM_QUESTION_ASSETS[segment.question_id] : undefined;
  const choices = useMemo(() => {
    if (!segment?.choices_json) return ['1', '2', '3', '4'];
    try {
      const parsed = JSON.parse(segment.choices_json);
      return Array.isArray(parsed) && parsed.length === 4 ? parsed : ['1', '2', '3', '4'];
    } catch {
      return ['1', '2', '3', '4'];
    }
  }, [segment]);
  const examInstruction = useMemo(() => getExamInstruction(segment), [segment]);
  const examExplanation = useMemo(
    () => getExamExplanation(segment, choices),
    [segment, choices]
  );

  useEffect(() => {
    async function load() {
      setLoading(true);
      const rows = await db.getAllAsync<ExamSegment>(`
        SELECT s.question_id, q.source_id, s.section, q.skill_id,
               s.linked_question_source_file, s.problem_number, s.question_number,
               s.page_number, s.image_path, q.correct_choice,
               q.context_ja, q.prompt_ja, q.choices_json, q.display_mode
        FROM app_exam_question_segment s
        JOIN app_exam_question q ON q.id = s.question_id
        WHERE q.source_id = ?
        ORDER BY CASE s.section
          WHEN 'vocabulary' THEN 1
          WHEN 'grammar' THEN 2
          WHEN 'reading' THEN 3
          ELSE 4 END,
          s.problem_number, s.question_number
      `, edition === '2018' ? 'src_jlpt_official_practice_2018' : 'src_jlpt_n5_test_answer_key');
      setSegments(rows);
      setIndex(0);
      setSelected(null);
      setCorrectCount(0);
      setFinished(false);
      setLoading(false);
    }
    load();
  }, [db, edition]);

  const answer = async (value: number) => {
    if (!segment || selected !== null) return;
    setSelected(value);
    if (value === segment.correct_choice) setCorrectCount((count) => count + 1);
    await db.runAsync(
      `
      INSERT INTO app_question_attempt_local (
        id, question_id, source_mode, selected_answer, correct_answer,
        is_correct, skill_id, answered_at
      ) VALUES (?, ?, 'exam_mode', ?, ?, ?, ?, datetime('now'))
    `,
      `${Date.now()}-${Math.random()}`,
      segment.question_id,
      String(value),
      String(segment.correct_choice),
      value === segment.correct_choice ? 1 : 0,
      segment.section
    );
  };

  const next = () => {
    if (index >= segments.length - 1) {
      setFinished(true);
      return;
    }
    setSelected(null);
    setIndex((current) => current + 1);
  };

  if (loading) {
    return <LoadingView />;
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.examHero}>
        <Text style={styles.examEyebrow}>MODE EXAMEN OFFICIEL N5</Text>
        <Text style={styles.examHeroTitle}>Annales JLPT</Text>
        <Text style={styles.examHeroText}>
          Questions authentiques extraites et intégrées dans un quiz interactif.
        </Text>
      </View>

      <View style={styles.segmented}>
        {(['2018', '2012'] as const).map((year) => (
          <SegmentButton
            key={year}
            label={`${year} · ${year === '2018' ? 67 : 65} questions`}
            active={edition === year}
            onPress={() => setEdition(year)}
          />
        ))}
      </View>

      {finished ? (
        <View style={styles.examResultCard}>
          <Text style={styles.examResultKicker}>SESSION {edition} TERMINÉE</Text>
          <Text style={styles.examResultScore}>{correctCount}/{segments.length}</Text>
          <Text style={styles.examResultText}>
            {Math.round((correctCount / Math.max(1, segments.length)) * 100)} % de bonnes réponses
          </Text>
          <Pressable
            style={styles.primaryButton}
            onPress={() => {
              setIndex(0);
              setSelected(null);
              setCorrectCount(0);
              setFinished(false);
            }}
          >
            <Text style={styles.primaryButtonText}>Recommencer cette annale</Text>
          </Pressable>
        </View>
      ) : segment ? (
        <>
      <View style={styles.examProgressRow}>
        <Text style={styles.questionMeta}>{segment.section.toUpperCase()}</Text>
        <Text style={styles.examProgressText}>{index + 1}/{segments.length} · {correctCount} juste{correctCount > 1 ? 's' : ''}</Text>
      </View>
      <Text style={styles.questionTitle}>
        Problème {segment.problem_number} · Question {segment.question_number}
      </Text>
      <View style={styles.examTaskCard}>
        <Text style={styles.examTaskLabel}>QUESTION JLPT · CE QUE L'ON CHERCHE</Text>
        <Text style={styles.examTaskText}>{examInstruction}</Text>
      </View>
      {segment.display_mode === 'native_text' ? (
        <View style={styles.examNativeCard}>
          {!!segment.context_ja && <Text style={styles.examContextText}>{segment.context_ja}</Text>}
          <Text style={styles.examPromptText}>
            {segment.skill_id === 'vocabulary' && segment.problem_number === 1
              ? renderExamKanjiHighlight(segment.prompt_ja ?? '')
              : segment.prompt_ja}
          </Text>
        </View>
      ) : (
      <Pressable style={styles.examPageFrame} onPress={() => setZoomVisible(true)}>
        {questionAsset ? (
          <Image source={questionAsset} style={styles.examQuestionImage} resizeMode="contain" />
        ) : (
          <View style={styles.examBox}>
            <Text style={styles.examBoxTitle}>Question indisponible</Text>
            <Text style={styles.examBoxText}>L'extrait de cette question n'a pas été trouvé.</Text>
          </View>
        )}
        <View style={styles.examZoomBadge}><Text style={styles.examZoomBadgeText}>Agrandir</Text></View>
      </Pressable>
      )}
      <Text style={styles.examPageHint}>
        Choisis la meilleure réponse parmi les quatre propositions.
      </Text>
      <View style={styles.examChoices}>
        {choices.map((choice, choiceIndex) => {
          const value = choiceIndex + 1;
          return (
          <Pressable
            key={value}
            disabled={selected !== null}
            onPress={() => answer(value)}
            style={[
              styles.examChoice,
              selected !== null && value === segment.correct_choice && styles.choiceCorrect,
              selected === value && value !== segment.correct_choice && styles.choiceWrong,
            ]}
          >
            <Text style={styles.examChoiceNumber}>{value}</Text>
            <Text style={styles.examChoiceText}>{choice}</Text>
          </Pressable>
          );
        })}
      </View>
      {selected !== null && (
        <View style={[
          styles.examCorrectionCard,
          selected === segment.correct_choice ? styles.examCorrectionRight : styles.examCorrectionWrong,
        ]}>
          <Text style={styles.examCorrectionVerdict}>
            {selected === segment.correct_choice ? 'VRAI · Bonne réponse' : 'FAUX · À corriger'}
          </Text>
          <Text style={styles.examCorrectionAnswer}>
            Réponse correcte : {segment.correct_choice}. {choices[segment.correct_choice - 1]}
          </Text>
          <Text style={styles.examCorrectionWhyTitle}>Pourquoi ?</Text>
          <Text style={styles.examCorrectionWhy}>{examExplanation}</Text>
        </View>
      )}
      {selected !== null && (
        <Pressable style={styles.primaryButton} onPress={next}>
          <Text style={styles.primaryButtonText}>
            {index === segments.length - 1 ? 'Voir mon résultat' : 'Question suivante'}
          </Text>
        </Pressable>
      )}
        </>
      ) : (
        <EmptyState title="Aucune question JLPT" />
      )}

      <Modal visible={zoomVisible} animationType="fade" onRequestClose={() => setZoomVisible(false)}>
        <SafeAreaView style={styles.examZoomBackdrop}>
          <View style={styles.examZoomHeader}>
            <Text style={styles.examZoomTitle}>JLPT N5 · {edition} · page {segment?.page_number ?? ''}</Text>
            <Pressable style={styles.examZoomClose} onPress={() => setZoomVisible(false)}>
              <Text style={styles.examZoomCloseText}>Fermer</Text>
            </Pressable>
          </View>
          <ScrollView horizontal maximumZoomScale={3} minimumZoomScale={1} contentContainerStyle={styles.examZoomCanvas}>
            {questionAsset && <Image source={questionAsset} style={styles.examZoomQuestionImage} resizeMode="contain" />}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </ScrollView>
  );
}

function getExamInstruction(segment: ExamSegment | null): string {
  if (!segment) return '';
  if (segment.display_mode === 'question_image') {
    return 'Lis la question extraite de l’examen, puis choisis la proposition correcte.';
  }
  if (segment.skill_id === 'reading') {
    return 'Lis le texte, repère l’information demandée et choisis la réponse confirmée par le texte.';
  }
  if (segment.skill_id === 'vocabulary') {
    if (segment.problem_number === 1) return 'Trouve la lecture en hiragana du mot écrit en kanji.';
    if (segment.problem_number === 2) return 'Trouve l’écriture correcte en kanji ou en kana du mot indiqué.';
    if (segment.problem_number === 3) return 'Choisis le mot qui complète naturellement la phrase.';
    return 'Choisis la phrase qui garde le même sens que la phrase proposée.';
  }
  if (segment.problem_number === 1) return 'Choisis la particule ou la forme grammaticale qui complète correctement la phrase.';
  if (segment.problem_number === 2) return 'Remets mentalement les éléments dans l’ordre et trouve celui qui occupe la place marquée ★.';
  return 'Comprends le texte dans son ensemble et choisis l’élément qui assure une phrase logique et grammaticale.';
}

function renderExamKanjiHighlight(text: string): React.ReactNode[] {
  return text.split(/([\u3400-\u4DBF\u4E00-\u9FFF]+)/g).map((part, index) => {
    const isKanji = /[\u3400-\u4DBF\u4E00-\u9FFF]/.test(part);
    return (
      <Text key={`${part}-${index}`} style={isKanji ? styles.examTargetKanji : undefined}>
        {part}
      </Text>
    );
  });
}

const EXAM_GRAMMAR_EXPLANATIONS_2018: Record<number, string> = {
  1: 'ひこうき signifie « avion » : c’est le moyen utilisé pour rentrer. La particule で marque un moyen de transport, donc ひこうきで signifie « en avion ». 国 signifie « pays » et c’est la destination, déjà marquée par へ dans 国へ. に marquerait une destination, mais le blanc ne se trouve pas après 国.',
  2: 'かばん signifie « sac » et くつ signifie « chaussures ». La particule や relie des exemples d’une liste non complète : « un sac, des chaussures, etc. ». Le mot など, placé après くつ, confirme justement l’idée de « etc. ». と donnerait plutôt une liste complète.',
  3: '家 signifie « maison » et 出ます signifie « sortir ». Avec un verbe de départ, を marque le lieu que l’on quitte : 家を出ます signifie « sortir de la maison ». で marquerait le lieu où une action se déroule, pas le lieu quitté.',
  4: '田中さん est la personne rencontrée et 会いました signifie « j’ai rencontré ». La construction japonaise est 人に会います : に marque la personne vers laquelle la rencontre est dirigée. を ne s’emploie pas avec 会う pour désigner la personne rencontrée.',
  5: '父 signifie « mon père » et 作りました signifie « a fabriqué ». Le père est celui qui réalise l’action : が marque donc le sujet de 作りました. を ferait du père l’objet fabriqué, ce qui n’aurait pas de sens.',
  6: '五つ signifie « cinq objets » et la somme indique le prix de cet ensemble. で sert ici à fixer une quantité totale : 五つで…円 signifie « … yens pour les cinq ». に indiquerait plutôt un prix attribué à chaque unité dans une autre construction.',
  7: 'きのう et 今日 sont les deux thèmes comparés : hier, puis aujourd’hui. は place chacun comme thème, d’où きのうは et 今日は. Cette répétition crée un contraste clair entre les deux jours. も voudrait dire « aussi » et supprimerait ce contraste.',
  8: 'きれい est un adjectif en な. Pour le relier à 静かです dans la même phrase, il prend la forme connective きれいで. きれいと ne sert pas à enchaîner deux descriptions de cette manière.',
  9: 'Le locuteur montre un emplacement proche de son interlocuteur : そこ signifie « là, près de vous ». その et どの doivent être suivis directement d’un nom, tandis qu’ici に arrive juste après le mot choisi.',
  10: 'La question porte sur l’impression de la personne après avoir skié. いかがでしたか est la forme polie de « comment était-ce ? ». いくつ demande un nombre et どなた demande une personne.',
  11: 'Le cours commencera la semaine prochaine : au moment où l’on parle, il n’a donc pas encore commencé. まだ signifie « pas encore » avec cette réponse négative. もう signifierait « déjà » et contredirait 来週始まります.',
  12: 'Le médecin demande au patient de revenir le lundi suivant. また signifie « de nouveau » : また来てください veut dire « revenez ». あまり et たくさん expriment une quantité et ne peuvent pas modifier naturellement 来て ici.',
  13: 'La structure ながら exprime deux actions simultanées. Elle se construit avec la base en ます sans ます : 飲みます devient 飲みながら. 飲むながら et 飲んでながら sont incorrects.',
  14: '小さいとき situe la phrase dans le passé. 好き est un adjectif en な et sa forme négative polie passée est 好きじゃありませんでした. La partie attendue est donc じゃありません avant でした.',
  15: 'Le client commande deux gâteaux : 二つ indique la quantité et ください transforme la demande en « deux, s’il vous plaît ». ありますか demanderait seulement s’il y en a, alors que la réponse du vendeur confirme une commande.',
  16: 'リーさん invite Kim chez lui. 来ませんか est une invitation polie : littéralement « ne viendriez-vous pas ? ». La réponse 行きたいです montre que Kim accepte l’idée de venir.',
  17: 'Dans l’ordre correct, on dit つぎの信号を右にまがってください : « tournez à droite au prochain feu ». を marque 信号 comme point que l’on franchit avant de tourner. ★ correspond donc à を dans la reconstruction.',
  18: '兄 signifie « grand frère » et と signifie « avec ». La construction 兄と出かけました veut dire « je suis sorti avec mon grand frère ». と doit rester juste après la personne qui accompagne.',
  19: 'Dans la phrase reconstruite, が introduit la caractéristique donnée au sujet des gâteaux achetés hier. Il relie le groupe nominal à la description qui suit; son emplacement est donc celui de ★.',
  20: 'ある complète un groupe qui décrit un lieu : 駅の…にある… signifie « qui se trouve dans/près de la gare ». Cette forme précise l’emplacement avant le nom concerné, puis で marque le lieu où le magazine est acheté.',
  21: 'もらった est le passé neutre de もらう, « recevoir ». Placé avant le nom こうちゃ, il signifie « le thé que j’ai reçu ». Une proposition relative japonaise se place directement avant le nom qu’elle décrit.',
  22: 'Le premier passage dit que le jus de pastèque existe dans beaucoup de magasins du pays de Nin, puis oppose la situation au Japon. でも signifie « mais » et marque ce contraste. だから exprimerait une conséquence, ce qui ne correspond pas au texte.',
  23: 'Nin demande aux autres quel jus ils aiment. 教えてください signifie « dites-le-moi / apprenez-le-moi, s’il vous plaît ». C’est une demande adressée aux lecteurs, donc la forme en て + ください convient.',
  24: 'Le texte raconte une action terminée samedi dernier. 入りました est le passé poli de 入ります : « je suis entré dans le café ». 入ります serait au présent ou au futur et ne respecterait pas le récit passé.',
  25: '「はな」 est le nom du café et コーヒー est ce qu’il sert. の relie les deux noms : 「はな」のコーヒー signifie « le café de Hana ». から ou より exprimeraient une origine ou une comparaison inutile ici.',
  26: 'Le but du déplacement est de boire du café. 飲みに行きます suit la règle base en ます sans ます + に行きます : 飲みます devient 飲みに行きます, « aller boire ». 飲んで行きます signifie plutôt boire avant de partir.',
};

const EXAM_READING_EXPLANATIONS_2018: Record<number, string> = {
  27: 'La question demande ce qui a été mangé avant l’école ce matin. Le texte dit clairement けさはなにも食べませんでした : « ce matin, je n’ai rien mangé ». La banane a seulement été emportée à l’école, elle n’a pas été mangée avant le départ.',
  28: 'L’avis dit que le cours du matin n’a pas lieu parce que le professeur est absent jusqu’à midi. Il précise aussi que les devoirs doivent être rendus la semaine suivante. La bonne réponse réunit exactement ces deux informations.',
  29: 'La question demande la toute première action de Bogo. Le mémo lui demande d’abord de recevoir l’argent de Nakanishi, avant de poursuivre avec le colis. 中西さんにお金をもらいます reprend donc la première étape dans le bon ordre.',
  30: 'Chin n’avait pas étudié les kanji la veille et pensait que le contrôle avait lieu ce jour-là. Il s’est donc levé tôt pour étudier avant l’école. La cause est bien かんじテストのべんきょうがしたかったから : « parce qu’il voulait étudier pour le contrôle de kanji ».',
  31: 'À la fin du texte, Chin découvre que le contrôle n’est pas aujourd’hui mais demain. Il ne s’est pas trompé de manuel ni de salle : il s’est trompé sur le jour du contrôle. C’est pourquoi かんじのテストがある日 est la bonne réponse.',
  32: 'Il faut respecter deux conditions : rester dans le budget indiqué et choisir le trajet le plus court parmi ceux qui conviennent. L’itinéraire 4 satisfait la limite de prix et donne le meilleur temps compatible. Un trajet moins cher n’est pas correct s’il est plus long alors qu’une option autorisée est plus rapide.',
};

function getExamExplanation(segment: ExamSegment | null, choices: string[]): string {
  if (!segment) return '';
  const answer = choices[segment.correct_choice - 1] ?? String(segment.correct_choice);
  const prompt = segment.prompt_ja ?? '';

  if (segment.display_mode === 'question_image') {
    return `La proposition ${segment.correct_choice} est celle retenue par le corrigé de cette question. Compare-la avec l’élément demandé dans l’énoncé : lecture, mot, particule ou information du texte.`;
  }
  if (segment.skill_id === 'reading') {
    if (
      segment.source_id === 'src_jlpt_official_practice_2018'
      && EXAM_READING_EXPLANATIONS_2018[segment.question_number]
    ) {
      return EXAM_READING_EXPLANATIONS_2018[segment.question_number];
    }
    return `Le texte donne l’information qui correspond à « ${answer} ». Il faut répondre avec ce qui est réellement écrit, sans ajouter une supposition. Les autres choix contredisent un détail du texte ou répondent à une autre question.`;
  }
  if (segment.skill_id === 'vocabulary') {
    if (segment.problem_number === 1) {
      return `« ${answer} » est la lecture attendue du mot en kanji dans cette phrase. Les autres propositions changent un son ou utilisent la lecture d’un autre mot.`;
    }
    if (segment.problem_number === 2) {
      return `« ${answer} » est l’écriture qui correspond exactement au mot demandé. Les autres choix ont une lecture proche, mais ne représentent pas ce mot.`;
    }
    if (segment.problem_number === 3) {
      return `Dans « ${prompt} », « ${answer} » convient au sens et à la construction de la phrase. Les autres mots peuvent exister, mais ils ne décrivent pas correctement cette situation.`;
    }
    return `« ${answer} » exprime la même idée que la phrase de départ. Il faut conserver le sens, pas seulement reconnaître un mot commun.`;
  }

  if (
    segment.source_id === 'src_jlpt_official_practice_2018'
    && segment.skill_id === 'grammar'
    && EXAM_GRAMMAR_EXPLANATIONS_2018[segment.question_number]
  ) {
    return EXAM_GRAMMAR_EXPLANATIONS_2018[segment.question_number];
  }

  const particleExplanations: Record<string, string> = {
    'に': '「に」 marque ici le point d’arrivée, le moment précis ou la personne vers laquelle l’action se dirige. 「で」 indiquerait plutôt le lieu où une action se déroule.',
    'で': '「で」 marque ici le lieu de l’action ou le moyen utilisé. 「に」 servirait plutôt à indiquer une destination, une présence ou un moment précis.',
    'を': '「を」 marque ici ce que l’action touche directement. Le mot placé avant 「を」 est le complément du verbe.',
    'が': '「が」 désigne ici la personne ou la chose qui accomplit l’action ou possède la caractéristique décrite.',
    'は': '「は」 présente le thème dont on parle. La suite de la phrase donne une information à propos de ce thème.',
    'と': '「と」 relie ici des éléments de façon complète ou marque la personne avec laquelle l’action est faite.',
    'や': '「や」 donne plusieurs exemples sans fermer la liste. Cela correspond à « notamment… et… ».',
    'へ': '「へ」 indique la direction du déplacement. L’idée importante est le mouvement vers ce lieu.',
    'から': '「から」 indique le point de départ, dans l’espace ou dans le temps.',
    'まで': '「まで」 indique la limite ou le point d’arrivée, dans l’espace ou dans le temps.',
    'も': '「も」 ajoute un élément qui partage la même information : « aussi » ou « également ».',
    'の': '「の」 relie deux noms. Le premier précise l’appartenance, l’origine ou la catégorie du second.',
  };
  if (particleExplanations[answer]) {
    return `Dans « ${prompt} », ${particleExplanations[answer]} C’est cette fonction précise qui rend « ${answer} » correct ici.`;
  }
  if (segment.problem_number === 2) {
    return `Dans la phrase correctement reconstruite, « ${answer} » se place exactement à l’endroit de ★. L’ordre japonais conserve le verbe à la fin et place ses compléments avant lui.`;
  }
  return `Dans « ${prompt} », la forme « ${answer} » respecte à la fois le sens, le niveau de politesse et la construction demandée. Les autres formes changent le temps, la fonction ou la relation entre les mots.`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function CoachPremiumPanel({
  examReadiness,
  level,
  xpCurrentLevel,
  xpRequiredForLevel,
  xpToNextLevel,
  streakDays,
  quests,
  goalCalendar,
  recommendedDomain,
  rewardSummary,
}: {
  examReadiness: number;
  level: number;
  xpCurrentLevel: number;
  xpRequiredForLevel: number;
  xpToNextLevel: number;
  streakDays: number;
  quests: CoachQuest[];
  goalCalendar: DailyGoalDay[];
  recommendedDomain: MasteryDomainStats | null;
  rewardSummary: RewardSummary;
}) {
  const xpRate =
    xpRequiredForLevel > 0 ? Math.max(0, Math.min(100, Math.round((xpCurrentLevel / xpRequiredForLevel) * 100))) : 100;
  const league = getLeagueTier(level);
  const nextLeague = getNextLeagueTier(level);
  const recommendedRemaining = recommendedDomain
    ? Math.max(0, recommendedDomain.total - recommendedDomain.mastered)
    : 0;
  const completedQuests = quests.filter(isQuestComplete).length;
  const perfectDays = goalCalendar.filter((day) => Number(day.completed) === Number(day.total)).length;
  const activeDays = goalCalendar.filter((day) => Number(day.completed) > 0).length;
  const remainingPerfectDays = Math.max(0, CALENDAR_HISTORY_DAYS - perfectDays);
  return (
    <View style={styles.coachPanel}>
      <View style={styles.coachHero}>
        <View style={styles.coachHeroCopy}>
          <Text style={styles.coachKicker}>Coach JLPT N5</Text>
          <Text style={styles.coachTitle}>Plan du jour</Text>
          <Text style={styles.coachSubtitle}>
            Priorité : {recommendedDomain?.label ?? 'Kana'} · {recommendedRemaining} éléments restants
          </Text>
        </View>
        <View style={styles.readinessBadge}>
          <Text style={styles.readinessValue}>{examReadiness}%</Text>
          <Text style={styles.readinessLabel}>prêt N5</Text>
        </View>
      </View>

      <View style={styles.coachStatsRow}>
        <CoachMiniStat label="Série" value={`${streakDays} j`} />
        <CoachMiniStat label="Niveau" value={level} />
        <CoachMiniStat label="Ligue" value={league.name} />
      </View>

      <View style={styles.dailyTrackingCard}>
        <View style={styles.dailyTrackingHeader}>
          <View>
            <Text style={styles.dailyTrackingKicker}>Suivi journalier</Text>
            <Text style={styles.dailyTrackingTitle}>{completedQuests}/3 objectifs aujourd'hui</Text>
          </View>
          <Text style={styles.dailyTrackingBadge}>{league.symbol}</Text>
        </View>
        <View style={styles.dailyTrackingStats}>
          <View style={styles.dailyTrackingStat}>
            <Text style={styles.dailyTrackingValue}>{perfectDays}</Text>
            <Text style={styles.dailyTrackingLabel}>jours badge</Text>
          </View>
          <View style={styles.dailyTrackingStat}>
            <Text style={styles.dailyTrackingValue}>{activeDays}</Text>
            <Text style={styles.dailyTrackingLabel}>jours actifs</Text>
          </View>
          <View style={styles.dailyTrackingStat}>
            <Text style={styles.dailyTrackingValue}>{remainingPerfectDays}</Text>
            <Text style={styles.dailyTrackingLabel}>à valider</Text>
          </View>
        </View>
        <Text style={styles.dailyTrackingMeta}>
          {rewardSummary.xp} XP gagnés · {rewardSummary.badges} badges rares · prochain niveau dans {xpToNextLevel} XP
        </Text>
      </View>

      <View style={styles.xpCard}>
        <View style={styles.xpHeader}>
          <Text style={styles.xpTitle}>Ligue {league.name}</Text>
          <Text style={styles.xpValue}>
            {nextLeague ? `Prochaine : ${nextLeague.name} niv. ${nextLeague.minLevel}` : 'Ligue maximale'}
          </Text>
        </View>
        <View style={styles.xpTrack}>
          <View style={[styles.xpFill, { width: `${xpRate}%` }]} />
        </View>
        <Text style={styles.xpLeagueMeta}>
          {xpCurrentLevel}/{xpRequiredForLevel} XP dans le niveau · {LEAGUE_TIERS.length} ligues jusqu'au niveau {MAX_LEVEL}
        </Text>
        <Text style={styles.xpComfortText}>
          Progression courte à chaque session, profondeur longue sur 365 jours.
        </Text>
      </View>

      <QuestGroup title="Objectifs quotidiens" detail="Rapides, pour garder le rythme." quests={quests} />
    </View>
  );
}

function CoachMiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.coachMiniStat}>
      <Text style={styles.coachMiniLabel}>{label}</Text>
      <Text style={styles.coachMiniValue}>{value}</Text>
    </View>
  );
}

function DailyQuestCard({ quest }: { quest: CoachQuest }) {
  const progressRate = Math.max(0, Math.min(100, Math.round((quest.progress / Math.max(1, quest.target)) * 100)));
  const complete = progressRate >= 100;
  const displayProgress =
    quest.unit === '%' ? `${Math.min(quest.progress, quest.target)}%/${quest.target}%` : `${Math.min(quest.progress, quest.target)}/${quest.target}`;

  return (
    <View style={[styles.questCard, complete && styles.questCardComplete]}>
      <View style={styles.questHeader}>
        <Text style={styles.questTitle}>{quest.title}</Text>
        <Text style={[styles.questReward, complete && styles.questRewardComplete]}>{complete ? 'Terminé' : quest.reward}</Text>
      </View>
      <Text style={styles.questDescription}>{quest.description}</Text>
      <View style={styles.questTrack}>
        <View style={[styles.questFill, complete && styles.questFillComplete, { width: `${progressRate}%` }]} />
      </View>
      <Text style={styles.questProgress}>{displayProgress}</Text>
    </View>
  );
}

function QuestGroup({ title, detail, quests }: { title: string; detail: string; quests: CoachQuest[] }) {
  const completed = quests.filter(isQuestComplete).length;

  return (
    <View style={styles.questGroup}>
      <View style={styles.questGroupHeader}>
        <View style={styles.questGroupCopy}>
          <Text style={styles.questGroupTitle}>{title}</Text>
          <Text style={styles.questGroupDetail}>{detail}</Text>
        </View>
        <Text style={styles.questGroupCount}>{completed}/{quests.length}</Text>
      </View>
      <View style={styles.questGrid}>
        {quests.map((quest) => (
          <DailyQuestCard key={quest.id} quest={quest} />
        ))}
      </View>
    </View>
  );
}

function DailyGoalCalendar({ days }: { days: DailyGoalDay[] }) {
  const visibleDays = days.slice(0, CALENDAR_HISTORY_DAYS);
  const completedDays = visibleDays.filter((day) => Number(day.completed) === Number(day.total)).length;
  const partialDays = visibleDays.filter((day) => Number(day.completed) > 0 && Number(day.completed) < Number(day.total)).length;

  return (
    <View style={styles.goalCalendarCard}>
      <View style={styles.goalCalendarHeader}>
        <View>
          <Text style={styles.goalCalendarTitle}>Calendrier badges · {CALENDAR_HISTORY_DAYS} jours</Text>
          <Text style={styles.goalCalendarMeta}>
            {completedDays} jours badge · {partialDays} jours en cours
          </Text>
        </View>
        <View style={styles.goalCalendarLegend}>
          <CalendarLegendDot color="#1F8A83" label="badge" />
          <CalendarLegendDot color="#D5B36A" label="partiel" />
          <CalendarLegendDot color="#E7DED1" label="0" />
        </View>
      </View>
      <View style={styles.goalCalendarGrid}>
        {visibleDays.map((day) => {
          const complete = Number(day.completed) === Number(day.total);
          const partial = Number(day.completed) > 0 && !complete;
          const today = day.day === formatDateKey(new Date());
          return (
            <View
              key={day.day}
              style={[
                styles.goalCalendarDay,
                complete && styles.goalCalendarDayComplete,
                partial && styles.goalCalendarDayPartial,
                today && styles.goalCalendarDayToday,
              ]}
            >
              <Text style={[styles.goalCalendarDayText, (complete || partial) && styles.goalCalendarDayTextActive]}>
                {day.completed}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={styles.goalCalendarFooter}>
        <Text style={styles.goalCalendarFooterText}>Chaque case représente un jour. Une case verte indique un jour où le badge quotidien a été obtenu.</Text>
      </View>
    </View>
  );
}

function BadgeCollection({ badges }: { badges: BadgeView[] }) {
  const unlockedCount = badges.filter((badge) => badge.unlocked).length;
  const domains: BadgeDomain[] = ['quotidien', 'kana', 'quiz', 'vocabulaire', 'grammaire', 'kanji', 'jlpt', 'maitrise'];
  const difficulties: BadgeDifficulty[] = ['facile', 'moyen', 'difficile', 'expert', 'legendaire'];

  return (
    <View style={styles.badgeCollectionCard}>
      <View style={styles.badgeCollectionHeader}>
        <View>
          <Text style={styles.badgeCollectionTitle}>{unlockedCount}/{badges.length} badges</Text>
          <Text style={styles.badgeCollectionMeta}>Badges rares, ligues et accomplissements longs calibrés pour une année complète de pratique intensive.</Text>
        </View>
      </View>

      <View style={styles.badgeDifficultyGrid}>
        {difficulties.map((difficulty) => {
          const difficultyBadges = badges.filter((badge) => badge.difficulty === difficulty);
          const difficultyUnlocked = difficultyBadges.filter((badge) => badge.unlocked).length;
          const gate = getBadgeGate(difficulty);
          return (
            <View key={difficulty} style={styles.badgeDifficultyCard}>
              <Text style={styles.badgeDifficultyTitle}>{formatBadgeDifficulty(difficulty)}</Text>
              <Text style={styles.badgeDifficultyCount}>{difficultyUnlocked}/{difficultyBadges.length}</Text>
              <Text style={styles.badgeDifficultyMeta}>
                {gate.requiredLevel > 1 ? `Niv. ${gate.requiredLevel} · ${gate.requiredBadges} badges` : 'Ouvert'}
              </Text>
            </View>
          );
        })}
      </View>

      {domains.map((domain) => {
        const domainBadges = badges.filter((badge) => badge.domain === domain);
        if (domainBadges.length === 0) return null;
        const domainUnlocked = domainBadges.filter((badge) => badge.unlocked).length;
        return (
          <View key={domain} style={styles.badgeDomainBlock}>
            <View style={styles.badgeDomainHeader}>
              <Text style={styles.badgeDomainTitle}>{formatBadgeDomain(domain)}</Text>
              <Text style={styles.badgeDomainCount}>{domainUnlocked}/{domainBadges.length}</Text>
            </View>
            <View style={styles.badgeGrid}>
              {domainBadges.map((badge) => (
                <View key={badge.id} style={[styles.badgeCard, badge.unlocked && styles.badgeCardUnlocked]}>
                  <Text style={[styles.badgeIcon, !badge.unlocked && styles.badgeIconLocked]}>{badge.unlocked ? badge.icon : '鍵'}</Text>
                  <Text style={[styles.badgeDifficultyPill, badge.unlocked && styles.badgeDifficultyPillUnlocked]}>
                    {formatBadgeDifficulty(badge.difficulty)}
                  </Text>
                  <Text style={[styles.badgeTitle, badge.unlocked && styles.badgeTitleUnlocked]}>{badge.title}</Text>
                  <Text style={styles.badgeDescription}>{badge.description}</Text>
                  {badge.gateLocked && (
                    <Text style={styles.badgeGateText}>
                      Niv. {badge.requiredLevel} · {badge.requiredBadges} badges
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function formatBadgeDifficulty(difficulty: BadgeDifficulty): string {
  if (difficulty === 'facile') return 'Facile';
  if (difficulty === 'moyen') return 'Moyen';
  if (difficulty === 'difficile') return 'Difficile';
  if (difficulty === 'expert') return 'Expert';
  return 'Légendaire';
}

function formatBadgeDomain(domain: BadgeDomain): string {
  if (domain === 'quotidien') return 'Objectifs';
  if (domain === 'kana') return 'Kana';
  if (domain === 'quiz') return 'Quiz';
  if (domain === 'vocabulaire') return 'Vocabulaire';
  if (domain === 'grammaire') return 'Grammaire';
  if (domain === 'kanji') return 'Kanji';
  if (domain === 'jlpt') return 'JLPT';
  return 'Maîtrise';
}

function CalendarLegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.calendarLegendItem}>
      <View style={[styles.calendarLegendDot, { backgroundColor: color }]} />
      <Text style={styles.calendarLegendText}>{label}</Text>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function ProgressRow({
  label,
  detail,
  rate,
}: {
  label: string;
  detail: string;
  rate: number;
}) {
  const safeRate = Math.max(0, Math.min(100, Number(rate) || 0));
  return (
    <View style={styles.progressRow}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={styles.progressRate}>{safeRate}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${safeRate}%` }]} />
      </View>
      <Text style={styles.progressDetail}>{detail}</Text>
    </View>
  );
}

function MasteryDomainCard({ domain }: { domain: MasteryDomainStats }) {
  const total = Math.max(1, domain.total);
  const masteredRate = Math.round((domain.mastered / total) * 100);
  const knownRate = Math.round((domain.known / total) * 100);
  const reviewRate = Math.round((domain.review / total) * 100);
  const unseenRate = Math.max(0, 100 - masteredRate - knownRate - reviewRate);
  const remaining = Math.max(0, domain.total - domain.mastered);

  return (
    <View style={styles.masteryCard}>
      <View style={styles.masteryCardHeader}>
        <View>
          <Text style={styles.masteryTitle}>{domain.label}</Text>
          <Text style={styles.masterySubtitle}>
            {domain.mastered}/{domain.total} maîtrisés · {remaining} restants
          </Text>
        </View>
        <View style={styles.masteryPill}>
          <Text style={styles.masteryPillValue}>{masteredRate}%</Text>
        </View>
      </View>

      <View style={styles.masteryStack}>
        <View style={[styles.masteryStackMastered, { flex: masteredRate }]} />
        <View style={[styles.masteryStackKnown, { flex: knownRate }]} />
        <View style={[styles.masteryStackReview, { flex: reviewRate }]} />
        <View style={[styles.masteryStackUnseen, { flex: unseenRate }]} />
      </View>

      <View style={styles.masteryLegend}>
        <MasteryLegendItem color="#186B63" label="Maîtrisé" value={domain.mastered} />
        <MasteryLegendItem color="#5A8DCC" label="Connu" value={domain.known} />
        <MasteryLegendItem color="#B45A46" label="À revoir" value={domain.review} />
        <MasteryLegendItem color="#B7B1A8" label="Jamais vu" value={domain.unseen} />
      </View>
      <Text style={styles.masteryAccuracy}>
        Réussite sur exercices : {domain.rate}% · {domain.correct}/{domain.attempted} réponses justes
      </Text>
    </View>
  );
}

function MasteryLegendItem({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View style={styles.masteryLegendItem}>
      <View style={[styles.masteryLegendDot, { backgroundColor: color }]} />
      <Text style={styles.masteryLegendText}>{label}</Text>
      <Text style={styles.masteryLegendValue}>{value}</Text>
    </View>
  );
}

function StatsLineChart({
  points,
  suffix = '',
  maxValue,
  color,
  xAxisLabel,
  yAxisLabel,
}: {
  points: { label: string; detail?: string; value: number }[];
  suffix?: string;
  maxValue?: number;
  color: string;
  xAxisLabel: string;
  yAxisLabel: string;
}) {
  const [selectedIndex, setSelectedIndex] = useState(Math.max(0, points.length - 1));
  const width = 280;
  const height = 210;
  const paddingLeft = 36;
  const paddingRight = 10;
  const paddingTop = 24;
  const paddingBottom = 44;
  const values = points.map((point) => Number(point.value) || 0);
  const topValue = Math.max(maxValue ?? 0, ...values, 1);
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const yTicks = [topValue, topValue / 2, 0].map((value) => Math.round(value));
  const coordinates = points.map((point, index) => {
    const x = paddingLeft + (points.length <= 1 ? chartWidth / 2 : (index / (points.length - 1)) * chartWidth);
    const y = paddingTop + chartHeight - ((Number(point.value) || 0) / topValue) * chartHeight;
    return { ...point, x, y };
  });
  const path = coordinates
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ');
  const latest = points[points.length - 1];
  const selected = coordinates[Math.min(selectedIndex, Math.max(0, coordinates.length - 1))] ?? latest;
  const xLabelIndexes = coordinates
    .map((_, index) => index)
    .filter((index) => coordinates.length <= 5 || index === 0 || index === coordinates.length - 1 || index % Math.ceil(coordinates.length / 4) === 0);

  return (
    <View style={styles.lineChartCard}>
      <View style={styles.lineChartHeader}>
        <Text style={styles.lineChartValue}>
          {latest ? `${latest.value}${suffix}` : '-'}
        </Text>
        <Text style={styles.lineChartMeta}>
          {points.length} point{points.length > 1 ? 's' : ''} de progression
        </Text>
      </View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {yTicks.map((tick) => {
          const y = paddingTop + chartHeight - (tick / topValue) * chartHeight;
          return (
            <G key={`tick-${tick}`}>
              <Line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#F0E8DD" strokeWidth="1" />
              <SvgText x={paddingLeft - 8} y={y + 4} fill="#63706A" fontSize="10" fontWeight="700" textAnchor="end">
                {tick}{suffix}
              </SvgText>
            </G>
          );
        })}
        <Line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={height - paddingBottom} stroke="#D8CEC0" strokeWidth="2" />
        <Line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} stroke="#D8CEC0" strokeWidth="2" />
        <SvgText x={paddingLeft - 32} y={paddingTop - 8} fill="#63706A" fontSize="10" fontWeight="800">
          {yAxisLabel}
        </SvgText>
        <SvgText x={width - paddingRight} y={height - 8} fill="#63706A" fontSize="10" fontWeight="800" textAnchor="end">
          {xAxisLabel}
        </SvgText>
        {xLabelIndexes.map((index) => {
          const point = coordinates[index];
          return (
            <G key={`x-${point.label}-${index}`}>
              <Line x1={point.x} y1={height - paddingBottom} x2={point.x} y2={height - paddingBottom + 5} stroke="#D8CEC0" strokeWidth="2" />
              <SvgText x={point.x} y={height - paddingBottom + 20} fill="#63706A" fontSize="10" fontWeight="700" textAnchor="middle">
                {point.label}
              </SvgText>
            </G>
          );
        })}
        {path.length > 0 && <Path d={path} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />}
        {coordinates.map((point, index) => (
          <Circle
            key={`${point.label}-${index}`}
            cx={point.x}
            cy={point.y}
            r={selected?.label === point.label && selected?.value === point.value ? '7' : '5'}
            fill="#FFFFFF"
            stroke={color}
            strokeWidth="3"
            onPress={() => setSelectedIndex(index)}
            onPressIn={() => setSelectedIndex(index)}
          />
        ))}
        {selected && (
          <>
            <Line x1={selected.x} y1={paddingTop} x2={selected.x} y2={height - paddingBottom} stroke={color} strokeDasharray={[4, 5]} strokeWidth="1.5" />
            <Circle cx={selected.x} cy={selected.y} r="11" fill={color} opacity="0.14" />
          </>
        )}
      </Svg>
      <View style={styles.lineChartTooltip}>
        <View>
          <Text style={styles.lineChartTooltipLabel}>Point sélectionné</Text>
          <Text style={styles.lineChartTooltipDate}>{selected?.detail ?? selected?.label ?? '-'}</Text>
        </View>
        <Text style={styles.lineChartTooltipValue}>
          {selected ? `${selected.value}${suffix}` : '-'}
        </Text>
      </View>
    </View>
  );
}

function formatQuizModeLabel(mode: string): string {
  if (mode === 'kana_arcade') return 'Quiz Kana';
  if (mode === 'adaptive_quiz') return 'Quiz JLPT';
  if (mode === 'global_quiz') return 'Quiz Global';
  if (mode === 'global_matching') return 'Associations globales';
  if (mode === 'grammar_quiz') return 'Quiz Grammaire';
  if (mode === 'grammar_matching') return 'Associations grammaire';
  if (mode === 'exam_mode') return 'Mode examen';
  return mode;
}

function formatChartDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function calculateStudyStreak(days: DailyProgress[]): number {
  const studiedDays = new Set(days.filter((day) => day.attempts > 0).map((day) => day.day));
  const cursor = new Date();
  let streak = 0;

  for (let index = 0; index < 365; index += 1) {
    const key = cursor.toISOString().slice(0, 10);
    if (!studiedDays.has(key)) {
      break;
    }
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function formatSkillLabel(skill: string): string {
  return skill
    .replace(/^kana_arcade:/, 'Kana ')
    .replace(/^kana:/, 'Kana ')
    .replace(/:/g, ' · ')
    .replace(/_/g, ' ');
}

function LoadingView() {
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#186B63" />
      <Text style={styles.centerText}>Chargement de la base JLPT N5</Text>
    </View>
  );
}

function EmptyState({ title }: { title: string }) {
  return (
    <View style={styles.centered}>
      <Text style={styles.emptyTitle}>{title}</Text>
    </View>
  );
}

function EmptyText({ text }: { text: string }) {
  return <Text style={styles.emptyText}>{text}</Text>;
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: '#FFF6EA',
    overflow: 'hidden',
  },
  errorScreen: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  errorKicker: {
    color: '#C83543',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  errorTitle: {
    color: '#152B3A',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 8,
  },
  errorText: {
    color: '#52665F',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    marginTop: 10,
  },
  errorDetail: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F2C2A3',
    borderRadius: 8,
    borderWidth: 1,
    color: '#7A3B2D',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginBottom: 18,
    marginTop: 16,
    padding: 12,
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#FFF6EA',
    borderBottomColor: '#F2C2A3',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 112,
    overflow: 'hidden',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
  },
  headerScene: {
    bottom: 0,
    left: 0,
    opacity: 0.95,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  headerTextBlock: {
    flex: 1,
    zIndex: 2,
  },
  kicker: {
    color: '#C83543',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    color: '#152B3A',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0,
    textShadowColor: 'rgba(255, 255, 255, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headerSubtitle: {
    color: '#325B67',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 3,
  },
  badge: {
    backgroundColor: '#C83543',
    borderRadius: 8,
    color: '#FFFFFF',
    elevation: 5,
    fontSize: 18,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 13,
    paddingVertical: 9,
    shadowColor: '#8A2D36',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    textAlign: 'center',
    zIndex: 2,
  },
  headerBadgeStack: {
    alignItems: 'center',
    gap: 3,
    zIndex: 2,
  },
  headerBadgeCaption: {
    color: '#7A3036',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  screenStage: {
    flex: 1,
    backgroundColor: '#FFF6EA',
    overflow: 'hidden',
  },
  tabs: {
    backgroundColor: '#FFFDFC',
    borderColor: '#F0D8C4',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    elevation: 10,
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 10,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 12,
    shadowColor: '#7A3B2D',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
  },
  tabButton: {
    alignItems: 'center',
    backgroundColor: '#FFF8EF',
    borderColor: 'transparent',
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    gap: 2,
    minHeight: 58,
    minWidth: 0,
    paddingVertical: 8,
  },
  tabButtonActive: {
    backgroundColor: '#152B3A',
    borderColor: '#F6C85F',
    elevation: 5,
    shadowColor: '#152B3A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    transform: [{ translateY: -3 }],
  },
  tabIcon: {
    color: '#C83543',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 21,
  },
  tabIconActive: {
    color: '#F6C85F',
  },
  tabText: {
    color: '#325B67',
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  rubricButton: {
    alignItems: 'center',
    borderRadius: 7,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 92,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  rubricButtonActive: {
    backgroundColor: '#186B63',
  },
  rubricButtonText: {
    color: '#4F5A55',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  rubricButtonTextActive: {
    color: '#FFFFFF',
  },
  segmented: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E0D9CD',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    padding: 6,
  },
  segmentButton: {
    alignItems: 'center',
    borderRadius: 7,
    flex: 1,
    paddingVertical: 9,
  },
  segmentButtonActive: {
    backgroundColor: '#186B63',
  },
  segmentText: {
    color: '#4F5A55',
    fontSize: 13,
    fontWeight: '800',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  content: {
    alignSelf: 'stretch',
    gap: 16,
    padding: 12,
    paddingBottom: 168,
    backgroundColor: '#FFF6EA',
    width: '100%',
  },
  vocabularyDeckGrid: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    paddingTop: 4,
  },
  vocabularyThemeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  vocabularyThemeCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E0D9CD',
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: '48%',
    flexDirection: 'row',
    flexGrow: 1,
    gap: 10,
    minHeight: 78,
    padding: 10,
  },
  vocabularyThemeCardActive: {
    backgroundColor: '#152B3A',
    borderColor: '#F6C85F',
    elevation: 5,
    shadowColor: '#152B3A',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  vocabularyThemeTextBlock: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  vocabularyThemeTitle: {
    color: '#152B3A',
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 17,
  },
  vocabularyThemeTitleActive: {
    color: '#FFFFFF',
  },
  vocabularyThemeCount: {
    color: '#647B83',
    fontSize: 11,
    fontWeight: '800',
  },
  vocabularyThemeCountActive: {
    color: '#F6C85F',
  },
  vocabularySearchInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5DED3',
    borderRadius: 8,
    borderWidth: 1,
    color: '#192522',
    fontSize: 16,
    fontWeight: '800',
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  vocabularyFlashCard: {
    backgroundColor: '#FFE600',
    borderColor: '#F0D000',
    borderRadius: 3,
    borderWidth: 2,
    elevation: 5,
    height: 260,
    justifyContent: 'space-between',
    padding: 12,
    shadowColor: '#7A6A00',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    width: 164,
  },
  vocabularyFlashCardBack: {
    backgroundColor: '#FFFDF2',
    borderColor: '#FFE600',
    borderWidth: 8,
  },
  vocabCardTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  vocabCardCorner: {
    color: '#121212',
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '900',
    maxWidth: 48,
  },
  vocabCardStroke: {
    color: '#121212',
    flexShrink: 0,
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
  },
  vocabCardCenter: {
    alignItems: 'center',
    flex: 1,
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  vocabCardMain: {
    color: '#050505',
    fontSize: 56,
    fontWeight: '900',
    lineHeight: 66,
    textAlign: 'center',
  },
  vocabCardFrontMeaning: {
    color: '#121212',
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 21,
    textAlign: 'center',
  },
  vocabCardReading: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 20,
    textAlign: 'center',
  },
  vocabCardMeaning: {
    color: '#050505',
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 24,
    textAlign: 'center',
  },
  vocabKanjiReadingBox: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255, 230, 0, 0.22)',
    borderColor: '#F0D000',
    borderRadius: 4,
    borderWidth: 1,
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  vocabKanjiReadingText: {
    color: '#1E1E1E',
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 13,
    textAlign: 'center',
  },
  vocabRelatedList: {
    alignSelf: 'stretch',
    gap: 3,
    marginTop: 2,
  },
  vocabRelatedItem: {
    color: '#2D2D2D',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 13,
    textAlign: 'center',
  },
  vocabCardBottomRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  vocabCardSmall: {
    color: '#151515',
    flex: 1,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 15,
  },
  vocabCardSmallRight: {
    color: '#151515',
    flex: 1,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 15,
    textAlign: 'right',
  },
  genericVocabCard: {
    backgroundColor: '#FFFDF2',
    borderColor: '#F6C85F',
    borderRadius: 8,
    borderWidth: 2,
    elevation: 5,
    height: 244,
    justifyContent: 'space-between',
    overflow: 'hidden',
    padding: 13,
    shadowColor: '#7A3B2D',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    width: 164,
  },
  genericVocabCardBack: {
    backgroundColor: '#152B3A',
    borderColor: '#152B3A',
  },
  genericVocabIllustrationLayer: {
    alignItems: 'center',
    bottom: 14,
    justifyContent: 'center',
    left: 0,
    opacity: 0.95,
    position: 'absolute',
    right: 0,
    top: 18,
  },
  genericVocabBackOverlay: {
    backgroundColor: 'rgba(21, 43, 58, 0.28)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  genericVocabTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'space-between',
    zIndex: 2,
  },
  genericVocabPill: {
    backgroundColor: '#152B3A',
    borderRadius: 8,
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  genericVocabPillDark: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    color: '#152B3A',
    fontSize: 10,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  genericVocabTheme: {
    color: '#647B83',
    flex: 1,
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'right',
  },
  genericVocabThemeDark: {
    color: '#FFFFFF',
    flex: 1,
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'right',
  },
  genericVocabFrontCenter: {
    alignItems: 'center',
    flex: 1,
    gap: 8,
    justifyContent: 'center',
  },
  genericVocabMain: {
    color: '#111111',
    fontSize: 42,
    fontWeight: '900',
    lineHeight: 52,
    textAlign: 'center',
  },
  genericVocabKana: {
    color: '#325B67',
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  genericVocabHint: {
    color: '#8A6E12',
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
  },
  genericVocabBackCenter: {
    alignItems: 'center',
    flex: 1,
    gap: 8,
    justifyContent: 'center',
    zIndex: 2,
  },
  genericVocabMeaning: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 29,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  genericVocabReading: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 8,
    color: '#152B3A',
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
    textAlign: 'center',
  },
  genericVocabHintDark: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
    zIndex: 2,
  },
  pathHero: {
    backgroundColor: '#142A38',
    borderColor: '#F6C85F',
    borderRadius: 8,
    borderWidth: 1,
    elevation: 8,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    overflow: 'hidden',
    padding: 18,
    shadowColor: '#142A38',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
  },
  pathHeroInk: {
    flex: 1,
    gap: 5,
  },
  pathHeroKicker: {
    color: '#F6C85F',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  pathHeroTitle: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: 0,
  },
  pathHeroSubtitle: {
    color: '#D7E8E8',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
  },
  pathHeroBadge: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#FFF6EA',
    borderColor: '#F6C85F',
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'center',
    minHeight: 82,
    minWidth: 82,
    padding: 10,
  },
  pathHeroBadgeValue: {
    color: '#C83543',
    fontSize: 24,
    fontWeight: '900',
  },
  pathHeroBadgeText: {
    color: '#325B67',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  pathSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pathNextCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5DED3',
    borderRadius: 8,
    borderWidth: 1,
    gap: 9,
    padding: 15,
  },
  pathNextLabel: {
    color: '#C83543',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  pathNextTitle: {
    color: '#152B3A',
    fontSize: 20,
    fontWeight: '900',
  },
  pathNextText: {
    color: '#4F5A55',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  pathNextFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    marginTop: 2,
  },
  pathReward: {
    color: '#186B63',
    flex: 1,
    fontSize: 12,
    fontWeight: '900',
  },
  pathActionButton: {
    backgroundColor: '#C83543',
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  pathActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  pathTimeline: {
    gap: 0,
  },
  pathStageCard: {
    backgroundColor: '#FFFDFC',
    borderColor: '#E5DED3',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 11,
    marginBottom: 10,
    padding: 11,
  },
  pathStageDone: {
    borderColor: '#8FD3B1',
    backgroundColor: '#F2FFF8',
  },
  pathStageActive: {
    borderColor: '#F6C85F',
    backgroundColor: '#FFF9E6',
    elevation: 4,
    shadowColor: '#B78716',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
  },
  pathStageLocked: {
    opacity: 0.72,
  },
  pathStageRail: {
    alignItems: 'center',
    width: 30,
  },
  pathStageDot: {
    alignItems: 'center',
    backgroundColor: '#D9CEC1',
    borderRadius: 8,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  pathStageDotDone: {
    backgroundColor: '#186B63',
  },
  pathStageDotActive: {
    backgroundColor: '#C83543',
  },
  pathStageDotText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  pathStageLine: {
    backgroundColor: '#E6D8C8',
    flex: 1,
    marginTop: 5,
    minHeight: 30,
    width: 3,
  },
  pathStageBody: {
    flex: 1,
    gap: 7,
  },
  pathStageTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  pathStageTitle: {
    color: '#152B3A',
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
  },
  pathStageStatus: {
    borderRadius: 7,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  pathStageStatus_done: {
    backgroundColor: '#186B63',
    color: '#FFFFFF',
  },
  pathStageStatus_active: {
    backgroundColor: '#F6C85F',
    color: '#543910',
  },
  pathStageStatus_locked: {
    backgroundColor: '#E6D8C8',
    color: '#6C5B4F',
  },
  pathStageSubtitle: {
    color: '#4F5A55',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  pathStageMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pathStageFocus: {
    color: '#C83543',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  pathStageCount: {
    color: '#325B67',
    fontSize: 11,
    fontWeight: '900',
  },
  pathProgressTrack: {
    backgroundColor: '#E9DED1',
    borderRadius: 8,
    height: 8,
    overflow: 'hidden',
  },
  pathProgressFill: {
    backgroundColor: '#186B63',
    borderRadius: 8,
    height: 8,
  },
  grammarHero: {
    backgroundColor: '#FFFDFC',
    borderColor: '#E6D1BA',
    borderRadius: 8,
    borderWidth: 1,
    elevation: 5,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    padding: 16,
    shadowColor: '#7A3B2D',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  grammarHeroText: {
    flex: 1,
    gap: 5,
  },
  grammarKicker: {
    color: '#C83543',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  grammarTitle: {
    color: '#152B3A',
    fontSize: 25,
    fontWeight: '900',
  },
  grammarSubtitle: {
    color: '#4F5A55',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
  },
  grammarHeroBadge: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#152B3A',
    borderColor: '#F6C85F',
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 76,
    padding: 10,
  },
  grammarHeroBadgeValue: {
    color: '#F6C85F',
    fontSize: 24,
    fontWeight: '900',
  },
  grammarHeroBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  grammarStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  grammarMemoryCard: {
    backgroundColor: '#EEF9F5',
    borderColor: '#9ADBD2',
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 12,
  },
  grammarMemoryTitle: {
    color: '#186B63',
    fontSize: 13,
    fontWeight: '900',
  },
  grammarMemoryText: {
    color: '#325B67',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
  },
  grammarFolderTabs: {
    gap: 8,
    paddingRight: 12,
  },
  grammarFolderButton: {
    backgroundColor: '#FFFDFC',
    borderColor: '#E6D1BA',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  grammarFolderButtonActive: {
    backgroundColor: '#152B3A',
    borderColor: '#F6C85F',
  },
  grammarFolderText: {
    color: '#325B67',
    fontSize: 12,
    fontWeight: '900',
  },
  grammarFolderTextActive: {
    color: '#FFFFFF',
  },
  grammarSubfolderList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  grammarSubfolderPill: {
    alignItems: 'center',
    backgroundColor: '#FFF8EF',
    borderColor: '#F0D8C4',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  grammarSubfolderPillActive: {
    backgroundColor: '#186B63',
    borderColor: '#186B63',
  },
  grammarSubfolderText: {
    color: '#4F5A55',
    fontSize: 11,
    fontWeight: '900',
  },
  grammarSubfolderTextActive: {
    color: '#FFFFFF',
  },
  grammarSubfolderCount: {
    color: '#C83543',
    fontSize: 11,
    fontWeight: '900',
  },
  grammarLessonList: {
    gap: 8,
  },
  grammarLessonRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5DED3',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 10,
  },
  grammarLessonRowActive: {
    backgroundColor: '#FFF5D8',
    borderColor: '#F6C85F',
  },
  grammarLessonNumber: {
    backgroundColor: '#186B63',
    borderRadius: 8,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    minWidth: 30,
    overflow: 'hidden',
    paddingVertical: 7,
    textAlign: 'center',
  },
  grammarLessonRowBody: {
    flex: 1,
    minWidth: 0,
  },
  grammarLessonTitle: {
    color: '#152B3A',
    fontSize: 14,
    fontWeight: '900',
  },
  grammarLessonPattern: {
    color: '#647B83',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  grammarLevelPill: {
    borderRadius: 7,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  grammarLevel_facile: {
    backgroundColor: '#EAF8F0',
    color: '#186B63',
  },
  grammarLevel_pratique: {
    backgroundColor: '#FFF0B8',
    color: '#7A5517',
  },
  grammarLevel_intermediaire: {
    backgroundColor: '#FFE0D5',
    color: '#A43E2D',
  },
  grammarLevel_avance: {
    backgroundColor: '#152B3A',
    color: '#FFFFFF',
  },
  grammarBackButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFDFC',
    borderColor: '#E6D1BA',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  grammarBackText: {
    color: '#152B3A',
    fontSize: 13,
    fontWeight: '900',
  },
  grammarDetailCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5DED3',
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 13,
  },
  grammarDetailHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 11,
  },
  grammarOrderBadge: {
    alignItems: 'center',
    backgroundColor: '#C83543',
    borderRadius: 8,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  grammarOrderText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  grammarDetailTitleBlock: {
    flex: 1,
  },
  grammarDetailTitle: {
    color: '#152B3A',
    fontSize: 20,
    fontWeight: '900',
  },
  grammarDetailPattern: {
    color: '#186B63',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 2,
  },
  lessonStatusBadge: {
    backgroundColor: '#7A8790',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  lessonStatusBadge_understood: {
    backgroundColor: '#186B63',
  },
  lessonStatusBadge_notUnderstood: {
    backgroundColor: '#C83543',
  },
  lessonStatusBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  lessonStatusSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  lessonStatusButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D9D4C9',
    borderRadius: 8,
    borderWidth: 1,
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  lessonStatusButton_understood: {
    backgroundColor: '#186B63',
    borderColor: '#186B63',
  },
  lessonStatusButton_notUnderstood: {
    backgroundColor: '#C83543',
    borderColor: '#C83543',
  },
  lessonStatusButton_neutral: {
    backgroundColor: '#152B3A',
    borderColor: '#152B3A',
  },
  lessonStatusButtonText: {
    color: '#152B3A',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  lessonStatusButtonTextActive: {
    color: '#FFFFFF',
  },
  grammarInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  grammarInfoCard: {
    backgroundColor: '#FFF8EF',
    borderColor: '#F0D8C4',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minWidth: 140,
    padding: 10,
  },
  grammarInfoLabel: {
    color: '#C83543',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  grammarInfoText: {
    color: '#152B3A',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    marginTop: 3,
  },
  grammarFormulaCard: {
    backgroundColor: '#EEF9F5',
    borderColor: '#9ADBD2',
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 12,
  },
  grammarFormulaTitle: {
    color: '#186B63',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  grammarFormulaPattern: {
    color: '#152B3A',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 23,
  },
  grammarFormulaText: {
    color: '#325B67',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 20,
  },
  grammarExplanation: {
    color: '#4F5A55',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
  },
  lookupToken: {
    color: '#0F766E',
    fontWeight: '900',
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
  },
  wordLookupPanel: {
    backgroundColor: '#FFFCF6',
    borderColor: '#E8C88A',
    borderRadius: 8,
    borderWidth: 1,
    gap: 7,
    marginTop: 10,
    padding: 12,
  },
  wordLookupHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  wordLookupKicker: {
    color: '#B45309',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  wordLookupTitle: {
    color: '#152B3A',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
  },
  wordLookupClose: {
    alignItems: 'center',
    backgroundColor: '#152B3A',
    borderRadius: 8,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  wordLookupCloseText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 21,
  },
  wordLookupLine: {
    color: '#325B67',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  wordLookupMeaning: {
    color: '#152B3A',
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 20,
  },
  wordLookupUsage: {
    color: '#4F5A55',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
  },
  grammarCourseBlock: {
    backgroundColor: '#F9FBFA',
    borderColor: '#DDE8E3',
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
    padding: 12,
  },
  grammarCourseTitle: {
    color: '#152B3A',
    fontSize: 14,
    fontWeight: '900',
  },
  grammarCourseText: {
    color: '#4F5A55',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
  },
  grammarHowCard: {
    backgroundColor: '#FFF8EF',
    borderColor: '#F0D8C4',
    borderRadius: 8,
    borderWidth: 1,
    gap: 9,
    padding: 12,
  },
  grammarStepRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 9,
  },
  grammarStepNumber: {
    backgroundColor: '#186B63',
    borderRadius: 8,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    minWidth: 24,
    overflow: 'hidden',
    paddingVertical: 4,
    textAlign: 'center',
  },
  grammarStepText: {
    color: '#4F5A55',
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
  },
  grammarSituationCard: {
    backgroundColor: '#EEF4FF',
    borderColor: '#B8C9EA',
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 12,
  },
  grammarSituationLabel: {
    color: '#284A78',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  grammarSituationText: {
    color: '#213A57',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 20,
  },
  grammarMnemonicCard: {
    backgroundColor: '#FFF0B8',
    borderColor: '#F6C85F',
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 12,
  },
  grammarMnemonicLabel: {
    color: '#7A5517',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  grammarMnemonicText: {
    color: '#543910',
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 20,
  },
  grammarTrapCard: {
    backgroundColor: '#FFF5D8',
    borderColor: '#F6C85F',
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
  },
  grammarTrapLabel: {
    color: '#7A5517',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  grammarTrapText: {
    color: '#543910',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    marginTop: 3,
  },
  grammarExamples: {
    gap: 9,
  },
  grammarExamplesTitle: {
    color: '#152B3A',
    fontSize: 15,
    fontWeight: '900',
  },
  grammarExampleCard: {
    backgroundColor: '#F9FBFA',
    borderColor: '#DDE8E3',
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
    padding: 12,
  },
  grammarExampleCardRevealed: {
    backgroundColor: '#EEF9F5',
    borderColor: '#9ADBD2',
  },
  grammarExampleKana: {
    color: '#152B3A',
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 24,
  },
  grammarExampleKanji: {
    color: '#152B3A',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 24,
  },
  grammarExampleRomaji: {
    color: '#647B83',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  grammarExampleActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 8,
  },
  grammarExampleActionButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#BFD8D1',
    borderRadius: 8,
    borderWidth: 1,
    flexGrow: 1,
    minHeight: 46,
    minWidth: 132,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  grammarExampleTranslateButton: {
    backgroundColor: '#152B3A',
    borderColor: '#152B3A',
  },
  grammarExampleActionText: {
    color: '#186B63',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  grammarExampleTranslateText: {
    color: '#FFFFFF',
  },
  grammarTapHint: {
    color: '#C83543',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  grammarTranslationBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    gap: 3,
    marginTop: 5,
    padding: 10,
  },
  grammarTranslation: {
    color: '#186B63',
    fontSize: 14,
    fontWeight: '900',
  },
  grammarBreakdownTitle: {
    color: '#152B3A',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 8,
    textTransform: 'uppercase',
  },
  grammarBreakdownText: {
    color: '#325B67',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
    marginTop: 3,
  },
  grammarExampleNote: {
    color: '#4F5A55',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  grammarExampleAnalysis: {
    color: '#325B67',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
    marginTop: 4,
  },
  grammarPracticeCard: {
    backgroundColor: '#152B3A',
    borderColor: '#F6C85F',
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
    padding: 13,
  },
  grammarPracticeTitle: {
    color: '#F6C85F',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  grammarPracticeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 20,
  },
  kanaIntro: {
    color: '#4F5A55',
    fontSize: 14,
    lineHeight: 20,
  },
  kanaToolbar: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5DED3',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  kanaProgressHeader: {
    gap: 3,
  },
  kanaProgressTitle: {
    color: '#192522',
    fontSize: 17,
    fontWeight: '900',
  },
  kanaProgressHint: {
    color: '#63706A',
    fontSize: 12,
    fontWeight: '700',
  },
  kanaProgressTrack: {
    backgroundColor: '#E9E1D4',
    borderRadius: 8,
    height: 8,
    overflow: 'hidden',
  },
  kanaProgressFill: {
    backgroundColor: '#186B63',
    height: 8,
  },
  searchInput: {
    backgroundColor: '#F7F4EE',
    borderColor: '#E0D9CD',
    borderRadius: 8,
    borderWidth: 1,
    color: '#192522',
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  filterBar: {
    gap: 8,
    paddingRight: 4,
  },
  filterButton: {
    backgroundColor: '#F7F4EE',
    borderColor: '#E0D9CD',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterButtonActive: {
    backgroundColor: '#192522',
    borderColor: '#192522',
  },
  filterText: {
    color: '#4F5A55',
    fontSize: 12,
    fontWeight: '900',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  statusLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusLegendItem: {
    alignItems: 'center',
    backgroundColor: '#F7F4EE',
    borderColor: '#E0D9CD',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  statusLegendDot: {
    borderColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    height: 12,
    width: 12,
  },
  statusLegendText: {
    color: '#4F5A55',
    fontSize: 11,
    fontWeight: '900',
  },
  kanaToolbarActions: {
    flexDirection: 'row',
    gap: 10,
  },
  kanaQuickActions: {
    flexDirection: 'row',
    gap: 10,
  },
  kanaQuickButton: {
    backgroundColor: '#F7F4EE',
    borderColor: '#E0D9CD',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 10,
  },
  kanaQuickTitle: {
    color: '#192522',
    fontSize: 12,
    fontWeight: '900',
  },
  kanaQuickMeta: {
    color: '#63706A',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 3,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#CFC7BA',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 11,
  },
  secondaryButtonActive: {
    backgroundColor: '#A34B35',
    borderColor: '#A34B35',
  },
  secondaryButtonText: {
    color: '#192522',
    fontSize: 13,
    fontWeight: '900',
  },
  secondaryButtonTextActive: {
    color: '#FFFFFF',
  },
  secondaryFullButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#CFC7BA',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  secondaryFullButtonText: {
    color: '#192522',
    fontSize: 13,
    fontWeight: '900',
  },
  focusPanel: {
    gap: 12,
  },
  focusActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  focusCounter: {
    color: '#192522',
    fontSize: 13,
    fontWeight: '900',
    minWidth: 58,
    textAlign: 'center',
  },
  kanaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  illustratedKanaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  thumbnailCard: {
    borderColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 3,
    elevation: 4,
    height: 88,
    overflow: 'hidden',
    padding: 8,
    position: 'relative',
    shadowColor: '#7A3B2D',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    width: '48.7%',
  },
  thumbnailArt: {
    bottom: 4,
    left: 16,
    opacity: 0.96,
    position: 'absolute',
    right: 16,
    top: 12,
    zIndex: 1,
  },
  thumbnailReadabilityWash: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 2,
  },
  thumbnailScript: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    lineHeight: 11,
    zIndex: 3,
  },
  thumbnailCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 14,
    zIndex: 3,
  },
  thumbnailStatusDot: {
    borderColor: '#FFFFFF',
    borderRadius: 7,
    borderWidth: 2,
    height: 14,
    left: 8,
    position: 'absolute',
    top: 48,
    width: 14,
    zIndex: 5,
  },
  thumbnailN5Badge: {
    backgroundColor: 'rgba(255,255,255,0.24)',
    borderRadius: 5,
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
    left: 7,
    lineHeight: 12,
    paddingHorizontal: 5,
    position: 'absolute',
    top: 64,
    zIndex: 5,
  },
  thumbnailStatusUnseen: {
    backgroundColor: '#9AA39E',
  },
  thumbnailStatusWeak: {
    backgroundColor: '#E49A3A',
  },
  thumbnailStatusKnown: {
    backgroundColor: '#3B82C4',
  },
  thumbnailStatusMastered: {
    backgroundColor: '#2E9F6E',
  },
  thumbnailRomaji: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '900',
    lineHeight: 28,
    position: 'absolute',
    right: 7,
    textAlign: 'right',
    textShadowColor: 'rgba(0,0,0,0.42)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 3,
    top: 8,
    zIndex: 4,
  },
  thumbnailWordBlock: {
    bottom: 7,
    left: 8,
    position: 'absolute',
    right: 8,
    zIndex: 4,
  },
  thumbnailWordRomaji: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 20,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 3,
  },
  thumbnailMeaning: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 17,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 3,
  },
  thumbnailMnemonic: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
    marginTop: 2,
    opacity: 0.92,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  viewerScreen: {
    backgroundColor: '#151D1B',
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  viewerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  viewerCloseButton: {
    backgroundColor: '#F6F2EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  viewerCloseText: {
    color: '#192522',
    fontSize: 13,
    fontWeight: '900',
  },
  viewerCounter: {
    color: '#FFFFFF',
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  viewerRandomButton: {
    backgroundColor: '#186B63',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  viewerRandomText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  viewerCardArea: {
    flex: 1,
    justifyContent: 'center',
  },
  viewerSwipeZone: {
    flex: 1,
    justifyContent: 'center',
  },
  viewerModeTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    zIndex: 20,
  },
  viewerModeButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    flex: 1,
    minHeight: 46,
    justifyContent: 'center',
    paddingVertical: 12,
    zIndex: 21,
  },
  viewerModeButtonActive: {
    backgroundColor: '#E5C856',
  },
  viewerModeText: {
    color: '#192522',
    fontSize: 12,
    fontWeight: '900',
  },
  viewerModeTextActive: {
    color: '#192522',
  },
  viewerMnemonicInput: {
    backgroundColor: '#25302D',
    borderColor: '#3D4A46',
    borderRadius: 8,
    borderWidth: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  viewerToolActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  viewerToolButton: {
    alignItems: 'center',
    backgroundColor: '#25302D',
    borderColor: '#3D4A46',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 11,
  },
  viewerToolText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  viewerActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  viewerNavButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    flex: 1,
    paddingVertical: 13,
  },
  viewerNavButtonStrong: {
    backgroundColor: '#E5C856',
  },
  viewerNavText: {
    color: '#192522',
    fontSize: 15,
    fontWeight: '900',
  },
  viewerNavTextStrong: {
    color: '#192522',
  },
  viewerHint: {
    color: '#CFC7BA',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
    textAlign: 'center',
  },
  tracePanel: {
    backgroundColor: '#F6F2EA',
    borderColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 4,
    padding: 14,
  },
  traceTitle: {
    color: '#192522',
    fontSize: 42,
    fontWeight: '900',
    lineHeight: 48,
    textAlign: 'center',
  },
  traceSubtitle: {
    color: '#63706A',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
  tracePad: {
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    borderColor: '#D8D0C4',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  traceGhost: {
    color: 'rgba(24,37,34,0.12)',
    fontSize: 210,
    fontWeight: '900',
    left: 0,
    lineHeight: 238,
    position: 'absolute',
    right: 0,
    textAlign: 'center',
    top: 18,
  },
  traceSvg: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  traceCenterLineVertical: {
    backgroundColor: 'rgba(24,37,34,0.08)',
    bottom: 0,
    left: '50%',
    position: 'absolute',
    top: 0,
    width: 1,
  },
  traceCenterLineHorizontal: {
    backgroundColor: 'rgba(24,37,34,0.08)',
    height: 1,
    left: 0,
    position: 'absolute',
    right: 0,
    top: '50%',
  },
  traceActions: {
    marginTop: 10,
  },
  illustratedCard: {
    aspectRatio: 1,
    borderColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 3,
    elevation: 5,
    overflow: 'hidden',
    padding: 8,
    position: 'relative',
    shadowColor: '#7A3B2D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    width: '48.7%',
  },
  illustratedCardLarge: {
    borderWidth: 4,
    padding: 16,
    width: '100%',
  },
  illustratedTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    zIndex: 4,
  },
  illustratedScript: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  illustratedCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 14,
  },
  illustratedRomaji: {
    color: '#FFFFFF',
    flexShrink: 0,
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 30,
    textAlign: 'right',
  },
  illustratedN5Badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderColor: 'rgba(255,255,255,0.42)',
    borderRadius: 7,
    borderWidth: 1,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    marginHorizontal: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  illustrationLayer: {
    bottom: 56,
    left: 28,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.95,
    position: 'absolute',
    right: 28,
    top: 58,
    zIndex: 1,
  },
  illustrationReadabilityWash: {
    backgroundColor: 'rgba(0,0,0,0.08)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 2,
  },
  mnemonicImage: {
    height: '100%',
    opacity: 0.96,
    width: '100%',
  },
  mnemonicFallback: {
    color: '#FFFFFF',
    fontSize: 76,
    fontWeight: '900',
    opacity: 0.65,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.16)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 3,
  },
  illustratedKana: {
    color: '#FFFFFF',
    fontSize: 112,
    fontWeight: '900',
    left: 0,
    lineHeight: 126,
    position: 'absolute',
    right: 0,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.38)',
    textShadowOffset: { width: 2, height: 3 },
    textShadowRadius: 4,
    top: 48,
    zIndex: 3,
  },
  illustratedKanaLarge: {
    fontSize: 150,
    lineHeight: 170,
    top: 68,
  },
  illustratedBottom: {
    alignItems: 'center',
    bottom: 8,
    left: 6,
    position: 'absolute',
    right: 6,
    zIndex: 4,
  },
  illustratedWordKana: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 21,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 3,
  },
  illustratedWordRomaji: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 20,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 3,
  },
  illustratedWordMeaning: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 18,
    maxWidth: '98%',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 3,
  },
  illustratedMnemonic: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 14,
    marginTop: 4,
    maxWidth: '94%',
    opacity: 0.94,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.48)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  illustratedBackRomaji: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },
  illustratedBackTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 6,
    opacity: 0.8,
  },
  illustratedBackText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
    marginTop: 7,
  },
  illustratedBackVocabulary: {
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.42)',
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 12,
  },
  illustratedBackKana: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 34,
    textAlign: 'center',
  },
  illustratedBackWord: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 26,
    marginTop: 2,
    textAlign: 'center',
  },
  illustratedBackMeaning: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
    marginTop: 4,
    opacity: 0.9,
    textAlign: 'center',
  },
  illustratedBackMnemonic: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
    marginTop: 8,
    opacity: 0.92,
    textAlign: 'center',
  },
  referenceTable: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5DED3',
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 10,
  },
  referenceHeaderRow: {
    flexDirection: 'row',
    gap: 6,
  },
  referenceHeaderCell: {
    color: '#A34B35',
    flex: 1,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  referenceRow: {
    flexDirection: 'row',
    gap: 6,
  },
  referenceCell: {
    alignItems: 'center',
    backgroundColor: '#F7F4EE',
    borderColor: '#E0D9CD',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 58,
    justifyContent: 'center',
    paddingVertical: 5,
  },
  referenceCellMastered: {
    backgroundColor: '#DCEFE8',
    borderColor: '#186B63',
  },
  referenceCellReview: {
    backgroundColor: '#F3D8D2',
    borderColor: '#A34B35',
  },
  referenceEmptyCell: {
    flex: 1,
    minHeight: 58,
  },
  referenceKana: {
    color: '#192522',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 31,
  },
  referenceRomaji: {
    color: '#63706A',
    fontSize: 10,
    fontWeight: '900',
  },
  kanaCard: {
    alignItems: 'center',
    aspectRatio: 0.82,
    backgroundColor: '#FFFFFF',
    borderColor: '#F0D8C4',
    borderRadius: 8,
    borderWidth: 1,
    elevation: 3,
    justifyContent: 'center',
    padding: 8,
    shadowColor: '#C96D4D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.11,
    shadowRadius: 8,
    width: '22.6%',
  },
  kanaCardLarge: {
    aspectRatio: 1.25,
    padding: 16,
    width: '100%',
  },
  kanaCardFlipped: {
    alignItems: 'flex-start',
    backgroundColor: '#FFF8EF',
    borderColor: '#F6C85F',
    justifyContent: 'flex-start',
  },
  kanaCardMastered: {
    borderColor: '#1F8A83',
  },
  kanaCardReview: {
    borderColor: '#C83543',
  },
  kanaStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 7,
    position: 'absolute',
    right: 7,
    top: 6,
  },
  kanaStatusText: {
    color: '#A34B35',
    fontSize: 7,
    fontWeight: '900',
  },
  kanaCharacter: {
    color: '#192522',
    fontSize: 36,
    fontWeight: '900',
    lineHeight: 42,
  },
  kanaScript: {
    color: '#63706A',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 5,
  },
  kanaMiniStat: {
    color: '#186B63',
    fontSize: 8,
    fontWeight: '900',
    marginTop: 3,
  },
  kanaRomaji: {
    color: '#A34B35',
    fontSize: 19,
    fontWeight: '900',
    lineHeight: 22,
  },
  kanaBackLabel: {
    color: '#63706A',
    fontSize: 8,
    fontWeight: '800',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  kanaAssociated: {
    color: '#192522',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 1,
  },
  kanaExample: {
    color: '#4F5A55',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 12,
    marginTop: 3,
  },
  kanaCardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 6,
  },
  kanaActionButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E0D9CD',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  kanaActionStrong: {
    backgroundColor: '#186B63',
    borderColor: '#186B63',
  },
  kanaActionText: {
    color: '#192522',
    fontSize: 8,
    fontWeight: '900',
  },
  kanaActionStrongText: {
    color: '#FFFFFF',
  },
  kanaExercisePanel: {
    gap: 16,
  },
  arcadeHero: {
    backgroundColor: '#192522',
    borderRadius: 8,
    gap: 8,
    padding: 18,
  },
  arcadeKicker: {
    color: '#D5B36A',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  arcadeTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 29,
  },
  arcadeText: {
    color: '#DDE8E3',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  arcadeRulesGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  arcadeRuleCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5DED3',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 12,
  },
  arcadeRuleValue: {
    color: '#B45A46',
    fontSize: 22,
    fontWeight: '900',
  },
  arcadeRuleLabel: {
    color: '#63706A',
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
  },
  arcadeHud: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5DED3',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 13,
  },
  arcadeHudScore: {
    color: '#192522',
    fontSize: 24,
    fontWeight: '900',
  },
  arcadeHudCorrect: {
    color: '#63706A',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 2,
  },
  arcadeHudRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  arcadeCelebration: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#E8F3EF',
    borderColor: '#186B63',
    borderRadius: 8,
    borderWidth: 1,
    gap: 2,
    marginBottom: -6,
    marginTop: -4,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  arcadeCelebrationTitle: {
    color: '#186B63',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  arcadeCelebrationText: {
    color: '#192522',
    fontSize: 14,
    fontWeight: '900',
  },
  arcadeRecordBanner: {
    alignItems: 'center',
    backgroundColor: '#186B63',
    borderColor: '#D5B36A',
    borderRadius: 8,
    borderWidth: 2,
    gap: 8,
    overflow: 'hidden',
    paddingHorizontal: 18,
    paddingVertical: 22,
  },
  arcadeRecordKicker: {
    color: '#F6D978',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  arcadeRecordTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 29,
    textAlign: 'center',
  },
  arcadeRecordScore: {
    color: '#F8F2E7',
    fontSize: 17,
    fontWeight: '900',
  },
  arcadeConfettiRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  arcadeConfetti: {
    borderRadius: 5,
    height: 10,
    transform: [{ rotate: '18deg' }],
    width: 28,
  },
  arcadeConfettiGold: {
    backgroundColor: '#D5B36A',
  },
  arcadeConfettiGreen: {
    backgroundColor: '#8AC6A7',
  },
  arcadeConfettiRed: {
    backgroundColor: '#C96555',
  },
  arcadeConfettiBlue: {
    backgroundColor: '#719DD0',
  },
  arcadeBestScoreCard: {
    backgroundColor: '#FFF9EF',
    borderColor: '#D5B36A',
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
    padding: 14,
  },
  arcadeBestScoreValue: {
    color: '#192522',
    fontSize: 24,
    fontWeight: '900',
  },
  arcadeBestScoreMeta: {
    color: '#63706A',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  quizConfigCard: {
    backgroundColor: '#FFF9EF',
    borderColor: '#E5DED3',
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
    padding: 13,
  },
  quizConfigTitle: {
    color: '#192522',
    fontSize: 16,
    fontWeight: '900',
  },
  quizConfigMode: {
    color: '#186B63',
    fontSize: 14,
    fontWeight: '900',
  },
  quizConfigText: {
    color: '#63706A',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  grammarModeGrid: {
    gap: 9,
  },
  grammarModeCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5DED3',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 76,
    padding: 12,
  },
  grammarModeCardActive: {
    backgroundColor: '#E8F3EF',
    borderColor: '#186B63',
    borderWidth: 2,
  },
  grammarModeSymbol: {
    backgroundColor: '#F3EFE8',
    borderRadius: 8,
    color: '#6B625A',
    fontSize: 24,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlign: 'center',
    width: 48,
  },
  grammarModeSymbolActive: {
    backgroundColor: '#186B63',
    color: '#FFFFFF',
  },
  grammarModeCopy: {
    flex: 1,
    gap: 3,
  },
  grammarModeTitle: {
    color: '#192522',
    fontSize: 15,
    fontWeight: '900',
  },
  grammarModeTitleActive: {
    color: '#12564F',
  },
  grammarModeSubtitle: {
    color: '#6B746F',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  grammarModeSubtitleActive: {
    color: '#356B65',
  },
  grammarMatchingBoard: {
    alignItems: 'stretch',
    flexDirection: 'row',
    gap: 8,
  },
  grammarMatchingColumn: {
    flex: 1,
    gap: 8,
    minWidth: 0,
  },
  grammarMatchingColumnTitle: {
    color: '#63706A',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  grammarMatchCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5DED3',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 88,
    paddingHorizontal: 9,
    paddingVertical: 10,
  },
  grammarMatchCardSelected: {
    backgroundColor: '#FFF2CC',
    borderColor: '#C99622',
    borderWidth: 2,
  },
  grammarMatchCardMatched: {
    backgroundColor: '#DDF6F0',
    borderColor: '#1F8A83',
    opacity: 0.62,
  },
  grammarMatchCardWrong: {
    backgroundColor: '#FFE0DF',
    borderColor: '#C83543',
    borderWidth: 2,
  },
  grammarMatchJapanese: {
    color: '#152B3A',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 22,
    textAlign: 'center',
  },
  grammarMatchFrench: {
    color: '#33423E',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    textAlign: 'center',
  },
  globalDomainStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  globalDomainChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D8D0C5',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  globalDomainChipText: {
    color: '#186B63',
    fontSize: 12,
    fontWeight: '900',
  },
  globalQuestionDisplay: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F0D8C4',
    borderRadius: 8,
    borderWidth: 1,
    color: '#152B3A',
    fontSize: 25,
    fontWeight: '900',
    lineHeight: 34,
    minHeight: 104,
    padding: 16,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  globalResultGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  globalResultCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5DED3',
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    gap: 4,
    minHeight: 78,
    padding: 12,
  },
  globalResultDomain: {
    color: '#63706A',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  globalResultValue: {
    color: '#192522',
    fontSize: 24,
    fontWeight: '900',
  },
  globalMatchDomain: {
    color: '#186B63',
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  timerToggle: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E0D9CD',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 11,
    padding: 12,
  },
  timerToggleActive: {
    backgroundColor: '#E8F3EF',
    borderColor: '#186B63',
  },
  timerSwitch: {
    backgroundColor: '#C9D0CC',
    borderRadius: 16,
    height: 30,
    justifyContent: 'center',
    paddingHorizontal: 3,
    width: 54,
  },
  timerSwitchActive: {
    backgroundColor: '#186B63',
  },
  timerSwitchKnob: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    height: 24,
    width: 24,
  },
  timerSwitchKnobActive: {
    alignSelf: 'flex-end',
  },
  timerToggleCopy: {
    flex: 1,
    gap: 2,
  },
  timerToggleTitle: {
    color: '#192522',
    fontSize: 14,
    fontWeight: '900',
  },
  timerToggleText: {
    color: '#63706A',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  quizHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quizHeaderStats: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  quizTimerPill: {
    backgroundColor: '#FFF9EF',
    borderColor: '#D5B36A',
    borderRadius: 8,
    borderWidth: 1,
    color: '#6A4E13',
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  quizScorePill: {
    backgroundColor: '#E8F3EF',
    borderRadius: 8,
    color: '#186B63',
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  kanaExercisePrompt: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5DED3',
    borderRadius: 8,
    borderWidth: 1,
    color: '#192522',
    fontSize: 72,
    fontWeight: '900',
    lineHeight: 90,
    paddingVertical: 24,
    textAlign: 'center',
  },
  storyCardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  storyMemoCard: {
    borderColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 2,
    minHeight: 132,
    overflow: 'hidden',
    padding: 10,
    width: '48.5%',
  },
  storyKana: {
    color: '#FFFFFF',
    fontSize: 44,
    fontWeight: '900',
    lineHeight: 50,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 3,
  },
  storyRomaji: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  storyMnemonic: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 14,
    marginTop: 6,
    textAlign: 'center',
  },
  matchingBoard: {
    flexDirection: 'row',
    gap: 10,
  },
  matchingColumn: {
    flex: 1,
    gap: 10,
  },
  matchingCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E0D9CD',
    borderRadius: 8,
    borderWidth: 2,
    minHeight: 76,
    justifyContent: 'center',
    padding: 10,
  },
  matchingRomajiCard: {
    backgroundColor: '#FFF9EF',
  },
  matchingCardSelected: {
    borderColor: '#186B63',
    backgroundColor: '#E8F3EF',
  },
  matchingCardMatched: {
    backgroundColor: '#DFF2E9',
    borderColor: '#2E9F6E',
    opacity: 0.62,
  },
  matchingKana: {
    color: '#192522',
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 40,
  },
  matchingRomaji: {
    color: '#192522',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
  },
  matchingFooter: {
    color: '#63706A',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  directAnswerBox: {
    gap: 12,
  },
  directAnswerInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5DED3',
    borderRadius: 8,
    borderWidth: 1,
    color: '#192522',
    fontSize: 24,
    fontWeight: '900',
    minHeight: 64,
    paddingHorizontal: 16,
    textAlign: 'center',
  },
  directAnswerCorrect: {
    backgroundColor: '#DCEFE8',
    borderColor: '#186B63',
  },
  directAnswerWrong: {
    backgroundColor: '#F3D8D2',
    borderColor: '#A34B35',
  },
  resultCard: {
    alignItems: 'center',
    backgroundColor: '#192522',
    borderRadius: 8,
    gap: 6,
    padding: 22,
  },
  resultKicker: {
    color: '#D5B36A',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  resultScore: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '900',
  },
  resultPercent: {
    color: '#E8F3EF',
    fontSize: 15,
    fontWeight: '800',
  },
  resultTime: {
    color: '#D5B36A',
    fontSize: 16,
    fontWeight: '900',
  },
  timeRankingCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5DED3',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 11,
  },
  timeRankingRow: {
    alignItems: 'center',
    borderBottomColor: '#EFE8DC',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 8,
  },
  timeRankingRank: {
    color: '#D5B36A',
    fontSize: 13,
    fontWeight: '900',
    width: 32,
  },
  timeRankingTime: {
    color: '#192522',
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
  },
  timeRankingMeta: {
    color: '#63706A',
    fontSize: 12,
    fontWeight: '800',
  },
  answerReviewRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5DED3',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 11,
  },
  answerReviewIndex: {
    color: '#63706A',
    fontSize: 12,
    fontWeight: '900',
    width: 24,
  },
  answerReviewText: {
    color: '#192522',
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  answerReviewStatus: {
    fontSize: 11,
    fontWeight: '900',
  },
  answerOk: {
    color: '#186B63',
  },
  answerKo: {
    color: '#A34B35',
  },
  coachPanel: {
    alignSelf: 'stretch',
    backgroundColor: '#FFFDFC',
    borderColor: '#F0D8C4',
    borderRadius: 8,
    borderWidth: 1,
    elevation: 4,
    gap: 12,
    padding: 12,
    shadowColor: '#B44A37',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.13,
    shadowRadius: 14,
  },
  coachHero: {
    alignItems: 'center',
    backgroundColor: '#152B3A',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
    padding: 16,
  },
  coachHeroCopy: {
    flex: 1,
  },
  coachKicker: {
    color: '#F6C85F',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  coachTitle: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    marginTop: 3,
  },
  coachSubtitle: {
    color: '#E5F3F0',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },
  readinessBadge: {
    alignItems: 'center',
    backgroundColor: '#FFF0B8',
    borderColor: '#F6C85F',
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 92,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  readinessValue: {
    color: '#152B3A',
    fontSize: 28,
    fontWeight: '900',
  },
  readinessLabel: {
    color: '#7C5A27',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  coachStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  coachMiniStat: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F0D8C4',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  coachMiniLabel: {
    color: '#647B83',
    fontSize: 11,
    fontWeight: '900',
  },
  coachMiniValue: {
    color: '#152B3A',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
  },
  xpCard: {
    backgroundColor: '#FFF8EF',
    borderRadius: 8,
    gap: 8,
    padding: 12,
  },
  xpHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  xpTitle: {
    color: '#152B3A',
    fontSize: 13,
    fontWeight: '900',
  },
  xpValue: {
    color: '#1F8A83',
    fontSize: 12,
    fontWeight: '900',
  },
  xpTrack: {
    backgroundColor: '#F2D9BF',
    borderRadius: 999,
    height: 12,
    overflow: 'hidden',
  },
  xpFill: {
    backgroundColor: '#1F8A83',
    borderRadius: 999,
    height: '100%',
  },
  xpLeagueMeta: {
    color: '#647B83',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 16,
  },
  xpComfortText: {
    color: '#C83543',
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 16,
  },
  dailyTrackingCard: {
    backgroundColor: '#FFF8EF',
    borderColor: '#F0D8C4',
    borderRadius: 8,
    borderWidth: 1,
    gap: 11,
    padding: 12,
  },
  dailyTrackingHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  dailyTrackingKicker: {
    color: '#C83543',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  dailyTrackingTitle: {
    color: '#152B3A',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  dailyTrackingBadge: {
    backgroundColor: '#152B3A',
    borderColor: '#F6C85F',
    borderRadius: 8,
    borderWidth: 1,
    color: '#F6C85F',
    fontSize: 18,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dailyTrackingStats: {
    flexDirection: 'row',
    gap: 8,
  },
  dailyTrackingStat: {
    backgroundColor: '#FFFFFF',
    borderColor: '#ECD7C5',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 10,
  },
  dailyTrackingValue: {
    color: '#1F8A83',
    fontSize: 21,
    fontWeight: '900',
  },
  dailyTrackingLabel: {
    color: '#647B83',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  dailyTrackingMeta: {
    color: '#6E5D52',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 16,
  },
  rewardSummaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rewardSummaryCard: {
    alignItems: 'center',
    backgroundColor: '#FFF8EF',
    borderColor: '#F0D8C4',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  rewardSummaryValue: {
    color: '#C83543',
    fontSize: 19,
    fontWeight: '900',
  },
  rewardSummaryLabel: {
    color: '#647B83',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  questGrid: {
    gap: 10,
  },
  questGroup: {
    backgroundColor: '#FFF8EF',
    borderColor: '#F0D8C4',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 10,
  },
  questGroupHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  questGroupCopy: {
    flex: 1,
  },
  questGroupTitle: {
    color: '#152B3A',
    fontSize: 14,
    fontWeight: '900',
  },
  questGroupDetail: {
    color: '#647B83',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
    marginTop: 2,
  },
  questGroupCount: {
    backgroundColor: '#192522',
    borderRadius: 8,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  questCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F0D8C4',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  questCardComplete: {
    backgroundColor: '#EEF9F5',
    borderColor: '#9ADBD2',
  },
  questHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  questTitle: {
    color: '#152B3A',
    flex: 1,
    fontSize: 14,
    fontWeight: '900',
  },
  questReward: {
    color: '#C83543',
    fontSize: 11,
    fontWeight: '900',
  },
  questRewardComplete: {
    color: '#1F8A83',
  },
  questDescription: {
    color: '#647B83',
    fontSize: 12,
    fontWeight: '700',
  },
  questTrack: {
    backgroundColor: '#F2D9BF',
    borderRadius: 999,
    height: 9,
    overflow: 'hidden',
  },
  questFill: {
    backgroundColor: '#C83543',
    borderRadius: 999,
    height: '100%',
  },
  questFillComplete: {
    backgroundColor: '#1F8A83',
  },
  questProgress: {
    color: '#647B83',
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'right',
  },
  rewardToast: {
    alignItems: 'center',
    backgroundColor: '#192522',
    borderColor: '#D5B36A',
    borderRadius: 8,
    borderWidth: 2,
    elevation: 8,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    shadowColor: '#7A3B2D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
  },
  rewardToastBadge: {
    backgroundColor: '#FFF0B8',
    borderRadius: 8,
    color: '#C83543',
    fontSize: 24,
    fontWeight: '900',
    minWidth: 54,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlign: 'center',
  },
  rewardToastCopy: {
    flex: 1,
  },
  rewardToastTitle: {
    color: '#D5B36A',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  rewardToastText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
  },
  goalCalendarCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F0D8C4',
    borderRadius: 8,
    borderWidth: 1,
    elevation: 3,
    gap: 12,
    padding: 12,
    shadowColor: '#C96D4D',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  goalCalendarHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  goalCalendarTitle: {
    color: '#152B3A',
    fontSize: 17,
    fontWeight: '900',
  },
  goalCalendarMeta: {
    color: '#647B83',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  goalCalendarLegend: {
    alignItems: 'flex-end',
    gap: 4,
  },
  calendarLegendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  calendarLegendDot: {
    borderColor: '#E0D9CD',
    borderRadius: 999,
    borderWidth: 1,
    height: 9,
    width: 9,
  },
  calendarLegendText: {
    color: '#647B83',
    fontSize: 10,
    fontWeight: '900',
  },
  goalCalendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  goalCalendarDay: {
    alignItems: 'center',
    backgroundColor: '#E7DED1',
    borderColor: '#D8CEC0',
    borderRadius: 4,
    borderWidth: 1,
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  goalCalendarDayComplete: {
    backgroundColor: '#1F8A83',
    borderColor: '#186B63',
  },
  goalCalendarDayPartial: {
    backgroundColor: '#D5B36A',
    borderColor: '#B78F31',
  },
  goalCalendarDayToday: {
    borderColor: '#C83543',
    borderWidth: 2,
  },
  goalCalendarDayText: {
    color: '#7B7369',
    fontSize: 9,
    fontWeight: '900',
    lineHeight: 11,
  },
  goalCalendarDayTextActive: {
    color: '#FFFFFF',
  },
  goalCalendarFooter: {
    backgroundColor: '#FFF8EF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  goalCalendarFooterText: {
    color: '#647B83',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 16,
  },
  badgeCollectionCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F0D8C4',
    borderRadius: 8,
    borderWidth: 1,
    elevation: 3,
    gap: 14,
    padding: 12,
    shadowColor: '#C96D4D',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  badgeCollectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  badgeCollectionTitle: {
    color: '#152B3A',
    fontSize: 18,
    fontWeight: '900',
  },
  badgeCollectionMeta: {
    color: '#647B83',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
    marginTop: 3,
  },
  badgeDifficultyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badgeDifficultyCard: {
    backgroundColor: '#FFF8EF',
    borderColor: '#F0D8C4',
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: '30%',
    flexGrow: 1,
    minWidth: 96,
    padding: 9,
  },
  badgeDifficultyTitle: {
    color: '#C83543',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  badgeDifficultyCount: {
    color: '#152B3A',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  badgeDifficultyMeta: {
    color: '#647B83',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 12,
    marginTop: 2,
  },
  badgeDomainBlock: {
    gap: 8,
  },
  badgeDomainHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  badgeDomainTitle: {
    color: '#C83543',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  badgeDomainCount: {
    color: '#647B83',
    fontSize: 12,
    fontWeight: '900',
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badgeCard: {
    backgroundColor: '#F6F2EA',
    borderColor: '#E5DED3',
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: '31%',
    flexGrow: 1,
    minWidth: 92,
    opacity: 0.72,
    padding: 9,
  },
  badgeCardUnlocked: {
    backgroundColor: '#FFF8EF',
    borderColor: '#D5B36A',
    opacity: 1,
  },
  badgeIcon: {
    color: '#C83543',
    fontSize: 22,
    fontWeight: '900',
    minHeight: 29,
  },
  badgeIconLocked: {
    color: '#B7B1A8',
  },
  badgeDifficultyPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#E7DED1',
    borderRadius: 999,
    color: '#7B7369',
    fontSize: 8,
    fontWeight: '900',
    marginBottom: 5,
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 3,
    textTransform: 'uppercase',
  },
  badgeDifficultyPillUnlocked: {
    backgroundColor: '#D5B36A',
    color: '#192522',
  },
  badgeTitle: {
    color: '#152B3A',
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 14,
  },
  badgeTitleUnlocked: {
    color: '#192522',
  },
  badgeDescription: {
    color: '#647B83',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 12,
    marginTop: 3,
  },
  badgeGateText: {
    color: '#B45A46',
    fontSize: 8,
    fontWeight: '900',
    lineHeight: 11,
    marginTop: 5,
  },
  statsGrid: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    minWidth: 0,
  },
  statsRubrics: {
    alignSelf: 'stretch',
    backgroundColor: '#FFFDFC',
    borderColor: '#F0D8C4',
    borderRadius: 8,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 8,
    minWidth: 0,
    shadowColor: '#C96D4D',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 7,
  },
  masteryHero: {
    alignItems: 'center',
    backgroundColor: '#152B3A',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    padding: 16,
  },
  masteryRing: {
    alignItems: 'center',
    backgroundColor: '#FFF0B8',
    borderColor: '#F6C85F',
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 92,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  masteryRingValue: {
    color: '#152B3A',
    fontSize: 28,
    fontWeight: '900',
  },
  masteryRingLabel: {
    color: '#63706A',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  masteryCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F0D8C4',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  masteryCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  masteryTitle: {
    color: '#152B3A',
    fontSize: 16,
    fontWeight: '900',
  },
  masterySubtitle: {
    color: '#63706A',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  masteryPill: {
    alignItems: 'center',
    backgroundColor: '#F6F2EA',
    borderRadius: 8,
    minWidth: 56,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  masteryPillValue: {
    color: '#1F8A83',
    fontSize: 16,
    fontWeight: '900',
  },
  masteryStack: {
    backgroundColor: '#ECE6DC',
    borderRadius: 999,
    flexDirection: 'row',
    height: 13,
    overflow: 'hidden',
  },
  masteryStackMastered: {
    backgroundColor: '#1F8A83',
  },
  masteryStackKnown: {
    backgroundColor: '#5A8DCC',
  },
  masteryStackReview: {
    backgroundColor: '#B45A46',
  },
  masteryStackUnseen: {
    backgroundColor: '#B7B1A8',
  },
  masteryLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  masteryLegendItem: {
    alignItems: 'center',
    backgroundColor: '#F8F5EF',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  masteryLegendDot: {
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  masteryLegendText: {
    color: '#63706A',
    fontSize: 11,
    fontWeight: '800',
  },
  masteryLegendValue: {
    color: '#152B3A',
    fontSize: 11,
    fontWeight: '900',
  },
  masteryAccuracy: {
    color: '#63706A',
    fontSize: 11,
    fontWeight: '800',
  },
  lineChartCard: {
    alignSelf: 'stretch',
    backgroundColor: '#FFFFFF',
    borderColor: '#F0D8C4',
    borderRadius: 8,
    borderWidth: 1,
    elevation: 3,
    gap: 8,
    padding: 12,
    minWidth: 0,
    shadowColor: '#C96D4D',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  lineChartHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  lineChartValue: {
    color: '#152B3A',
    fontSize: 26,
    fontWeight: '900',
  },
  lineChartMeta: {
    color: '#647B83',
    fontSize: 12,
    fontWeight: '800',
    paddingTop: 7,
  },
  lineChartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  lineChartLabel: {
    color: '#63706A',
    fontSize: 10,
    fontWeight: '800',
  },
  lineChartTooltip: {
    alignItems: 'center',
    backgroundColor: '#FFF8EF',
    borderColor: '#F0D8C4',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  lineChartTooltipLabel: {
    color: '#63706A',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  lineChartTooltipDate: {
    color: '#152B3A',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
  },
  lineChartTooltipValue: {
    color: '#1F8A83',
    fontSize: 20,
    fontWeight: '900',
  },
  quizStatsHero: {
    alignItems: 'center',
    backgroundColor: '#192522',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    padding: 16,
  },
  quizStatsKicker: {
    color: '#D5B36A',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  quizStatsScore: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '900',
    lineHeight: 48,
  },
  quizStatsMeta: {
    color: '#DDE8E3',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  quizStatsBadge: {
    alignItems: 'center',
    backgroundColor: '#FFF9EF',
    borderColor: '#D5B36A',
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 112,
    padding: 11,
  },
  quizStatsBadgeValue: {
    color: '#192522',
    fontSize: 24,
    fontWeight: '900',
  },
  quizStatsBadgeLabel: {
    color: '#63706A',
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  quizChart: {
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5DED3',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    minHeight: 188,
    padding: 12,
  },
  quizChartColumn: {
    alignItems: 'center',
    flex: 1,
    gap: 5,
  },
  quizChartTrack: {
    backgroundColor: '#F1EADF',
    borderRadius: 8,
    height: 112,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    width: '100%',
  },
  quizChartBar: {
    backgroundColor: '#186B63',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    minHeight: 6,
    width: '100%',
  },
  quizChartRate: {
    color: '#192522',
    fontSize: 10,
    fontWeight: '900',
  },
  quizChartLabel: {
    color: '#63706A',
    fontSize: 9,
    fontWeight: '800',
  },
  scoreTrendList: {
    gap: 9,
  },
  scoreTrendRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5DED3',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 10,
  },
  scoreTrendLabel: {
    color: '#D5B36A',
    fontSize: 12,
    fontWeight: '900',
    width: 34,
  },
  scoreTrendTrack: {
    backgroundColor: '#F1EADF',
    borderRadius: 8,
    flex: 1,
    height: 10,
    overflow: 'hidden',
  },
  scoreTrendFill: {
    backgroundColor: '#B45A46',
    height: 10,
  },
  scoreTrendValue: {
    color: '#192522',
    fontSize: 12,
    fontWeight: '900',
    minWidth: 64,
    textAlign: 'right',
  },
  scoreTrendMeta: {
    color: '#63706A',
    fontSize: 10,
    fontWeight: '800',
    minWidth: 70,
    textAlign: 'right',
  },
  metric: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F0D8C4',
    borderRadius: 8,
    borderWidth: 1,
    elevation: 2,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 92,
    minWidth: 0,
    padding: 13,
    shadowColor: '#C96D4D',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.09,
    shadowRadius: 7,
  },
  metricLabel: {
    color: '#647B83',
    fontSize: 12,
    fontWeight: '700',
  },
  metricValue: {
    color: '#152B3A',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 4,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: '#152B3A',
    fontSize: 18,
    fontWeight: '900',
  },
  progressRow: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F0D8C4',
    borderRadius: 8,
    borderWidth: 1,
    elevation: 2,
    padding: 13,
    shadowColor: '#C96D4D',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  progressHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    color: '#152B3A',
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
  },
  progressRate: {
    color: '#C83543',
    fontSize: 14,
    fontWeight: '900',
  },
  progressTrack: {
    backgroundColor: '#F2D9BF',
    borderRadius: 8,
    height: 8,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: '#1F8A83',
    height: 8,
  },
  progressDetail: {
    color: '#647B83',
    fontSize: 12,
    marginTop: 7,
  },
  questionMeta: {
    color: '#C83543',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  questionTitle: {
    color: '#152B3A',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
  },
  japanese: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F0D8C4',
    borderRadius: 8,
    borderWidth: 1,
    color: '#152B3A',
    fontSize: 34,
    fontWeight: '900',
    padding: 18,
    textAlign: 'center',
  },
  choiceList: {
    gap: 10,
  },
  choice: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#F0D8C4',
    borderRadius: 8,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    padding: 15,
    shadowColor: '#C96D4D',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  choiceCorrect: {
    backgroundColor: '#DDF6F0',
    borderColor: '#1F8A83',
  },
  choiceWrong: {
    backgroundColor: '#FFE0DF',
    borderColor: '#C83543',
  },
  choiceText: {
    color: '#152B3A',
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  choiceIcon: {
    color: '#152B3A',
    fontSize: 22,
    fontWeight: '900',
  },
  feedback: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F0D8C4',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 15,
  },
  feedbackTitle: {
    color: '#152B3A',
    fontSize: 17,
    fontWeight: '900',
  },
  feedbackText: {
    color: '#325B67',
    fontSize: 14,
    lineHeight: 20,
  },
  feedbackMnemonic: {
    backgroundColor: '#FFF9EF',
    borderColor: '#E5DED3',
    borderRadius: 8,
    borderWidth: 1,
    color: '#192522',
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
    padding: 10,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#C83543',
    borderRadius: 8,
    elevation: 4,
    justifyContent: 'center',
    minWidth: 0,
    padding: 14,
    shadowColor: '#8A2D36',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 9,
  },
  primaryButtonDisabled: {
    backgroundColor: '#A9B0AD',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  examHero: {
    backgroundColor: '#123B36',
    borderRadius: 8,
    padding: 18,
  },
  examEyebrow: {
    color: '#F3C75F',
    fontSize: 11,
    fontWeight: '900',
  },
  examHeroTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 5,
  },
  examHeroText: {
    color: '#DCECE8',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  examProgressRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  examProgressText: {
    color: '#325B67',
    fontSize: 12,
    fontWeight: '900',
  },
  examTaskCard: {
    backgroundColor: '#FFF4D6',
    borderColor: '#E8C86C',
    borderRadius: 8,
    borderWidth: 1,
    padding: 13,
  },
  examTaskLabel: {
    color: '#8B5D0B',
    fontSize: 10,
    fontWeight: '900',
  },
  examTaskText: {
    color: '#302817',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
    marginTop: 5,
  },
  examPageFrame: {
    backgroundColor: '#E9E1D6',
    borderColor: '#D9C9B8',
    borderRadius: 8,
    borderWidth: 1,
    elevation: 3,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#6B4939',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  examPageImage: {
    aspectRatio: 0.707,
    backgroundColor: '#FFFFFF',
    width: '100%',
  },
  examQuestionImage: {
    backgroundColor: '#FFFFFF',
    height: 300,
    width: '100%',
  },
  examNativeCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D9C9B8',
    borderRadius: 8,
    borderWidth: 1,
    gap: 16,
    padding: 18,
  },
  examContextText: {
    color: '#263B38',
    fontSize: 16,
    lineHeight: 28,
  },
  examPromptText: {
    borderTopColor: '#E5DED3',
    borderTopWidth: 1,
    color: '#102E2A',
    fontSize: 19,
    fontWeight: '900',
    lineHeight: 31,
    paddingTop: 16,
  },
  examTargetKanji: {
    backgroundColor: '#FFE080',
    color: '#A52735',
    fontWeight: '900',
  },
  examZoomBadge: {
    backgroundColor: 'rgba(18, 59, 54, 0.92)',
    borderRadius: 6,
    bottom: 10,
    paddingHorizontal: 11,
    paddingVertical: 7,
    position: 'absolute',
    right: 10,
  },
  examZoomBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  examPageHint: {
    color: '#63706A',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
  examResultCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5DED3',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 24,
  },
  examResultKicker: {
    color: '#B23B46',
    fontSize: 11,
    fontWeight: '900',
  },
  examResultScore: {
    color: '#123B36',
    fontSize: 46,
    fontWeight: '900',
  },
  examResultText: {
    color: '#325B67',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
  },
  examCorrectionCard: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 7,
    padding: 15,
  },
  examCorrectionRight: {
    backgroundColor: '#EAF7EF',
    borderColor: '#72B98C',
  },
  examCorrectionWrong: {
    backgroundColor: '#FFF0F0',
    borderColor: '#D78383',
  },
  examCorrectionVerdict: {
    color: '#123B36',
    fontSize: 14,
    fontWeight: '900',
  },
  examCorrectionAnswer: {
    color: '#192522',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 23,
  },
  examCorrectionWhyTitle: {
    color: '#8B3038',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 3,
  },
  examCorrectionWhy: {
    color: '#33443F',
    fontSize: 14,
    lineHeight: 21,
  },
  examSourceCard: {
    backgroundColor: '#FFF9EF',
    borderColor: '#E5DED3',
    borderRadius: 8,
    borderWidth: 1,
    padding: 13,
  },
  examSourceTitle: {
    color: '#192522',
    fontSize: 12,
    fontWeight: '900',
  },
  examSourceText: {
    color: '#63706A',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  examZoomBackdrop: {
    backgroundColor: '#101716',
    flex: 1,
  },
  examZoomHeader: {
    alignItems: 'center',
    borderBottomColor: '#31413E',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
  },
  examZoomTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  examZoomClose: {
    backgroundColor: '#C83543',
    borderRadius: 6,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  examZoomCloseText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  examZoomCanvas: {
    alignItems: 'flex-start',
    backgroundColor: '#202927',
    minHeight: '100%',
    padding: 16,
  },
  examZoomImage: {
    backgroundColor: '#FFFFFF',
    height: 1273,
    width: 900,
  },
  examZoomQuestionImage: {
    backgroundColor: '#FFFFFF',
    height: 720,
    width: 1000,
  },
  examBox: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5DED3',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 230,
    justifyContent: 'center',
    padding: 16,
  },
  examBoxTitle: {
    color: '#192522',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  examBoxText: {
    color: '#63706A',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
    textAlign: 'center',
  },
  examChoices: {
    gap: 10,
  },
  examChoice: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5DED3',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 58,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  examChoiceNumber: {
    backgroundColor: '#123B36',
    borderRadius: 6,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
    textAlign: 'center',
  },
  examChoiceText: {
    color: '#192522',
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 23,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  centerText: {
    color: '#63706A',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
  },
  emptyTitle: {
    color: '#192522',
    fontSize: 18,
    fontWeight: '900',
  },
  emptyText: {
    color: '#63706A',
    fontSize: 14,
    lineHeight: 20,
  },
});



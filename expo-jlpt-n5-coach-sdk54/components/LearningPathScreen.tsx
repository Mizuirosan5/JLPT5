import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { styles } from '../appStyles';
import {
  ALL_GRAMMAR_LESSONS,
  getGrammarMainMenu,
} from '../services/grammarCourse';
import {
  buildGrammarMasteryDomain,
  loadGrammarProgressSummary,
} from '../services/grammarProgress';
import { buildLearningPathStages } from '../services/learningPath';
import { saveAptitudeResult } from '../services/aptitudeTest';
import {
  ensureDailyGoalPlan,
  loadDashboardGoalData,
  loadDashboardOverviewData,
  loadDashboardQuizData,
} from '../services/dashboardData';
import { buildBadgeViews } from '../services/badges';
import {
  CALENDAR_HISTORY_DAYS,
  GOAL_PLAN_DAYS,
  calculateStudyStreak,
  formatPathStatus,
  getLevelProgressFromXp,
} from '../services/progress';
import {
  DAILY_GOAL_DEFINITIONS,
  MONTHLY_GOAL_DEFINITIONS,
  WEEKLY_GOAL_DEFINITIONS,
  YEARLY_GOAL_DEFINITIONS,
} from '../data/goalDefinitions';
import { buildQuests } from '../services/goals';
import { loadSrsOverview, recordSrsReviewForQuestionAttempt } from '../services/srs';
import type {
  BadgeView,
  CoachQuest,
  DailyGoalDay,
  LearningPathStage,
  LeagueTier,
  MasteryDomainStats,
  QuizDashboardSummary,
  RewardSummary,
  Screen,
  SrsOverview,
} from '../models';
import {
  BadgeCollection,
  CoachPremiumPanel,
  LoadingView,
  Metric,
  QuestGroup,
  Section,
} from './sharedUi';

type RewardPathState = {
  quizSummary: QuizDashboardSummary;
  quests: CoachQuest[];
  tomorrowQuests: CoachQuest[];
  weeklyQuests: CoachQuest[];
  monthlyQuests: CoachQuest[];
  goalCalendar: DailyGoalDay[];
  rewardSummary: RewardSummary;
  badges: BadgeView[];
  recommendedDomain: MasteryDomainStats | null;
  level: number;
  xpCurrentLevel: number;
  xpRequiredForLevel: number;
  xpToNextLevel: number;
  streakDays: number;
  unlockedBadgeCount: number;
  srsOverview: SrsOverview;
};

type PathPanel = 'progress' | 'rewards';
type AptitudeDomain = 'kana' | 'orthographe' | 'vocabulaire' | 'kanji' | 'grammaire' | 'comprehension';
type AptitudeLevel = 1 | 2 | 3;
type AptitudeQuestion = {
  id: string;
  level: AptitudeLevel;
  domain: AptitudeDomain;
  prompt: string;
  display: string;
  choices: string[];
  answer: string;
  skill: string;
  explanation: string;
};

const APTITUDE_QUESTIONS: AptitudeQuestion[] = [
  {
    id: 'apt-1-kana-a',
    level: 1,
    domain: 'kana',
    prompt: 'Lecture de base : comment se lit ce kana ?',
    display: 'あ',
    choices: ['a', 'i', 'u', 'e'],
    answer: 'a',
    skill: 'kana:hiragana:basic',
    explanation: 'あ se lit a. C est une base indispensable avant les mots.',
  },
  {
    id: 'apt-1-orth-a',
    level: 1,
    domain: 'orthographe',
    prompt: 'Quelle ecriture kana correspond a "shi" ?',
    display: 'shi',
    choices: ['し', 'つ', 'そ', 'ん'],
    answer: 'し',
    skill: 'orthographe:kana:shi',
    explanation: 'shi s ecrit し. Les confusions し/つ/そ/ん sont frequentes.',
  },
  {
    id: 'apt-1-vocab-a',
    level: 1,
    domain: 'vocabulaire',
    prompt: 'Que signifie ce mot ?',
    display: 'みず',
    choices: ['eau', 'feu', 'livre', 'ecole'],
    answer: 'eau',
    skill: 'vocabulary:n5:basic',
    explanation: 'みず signifie eau.',
  },
  {
    id: 'apt-1-kanji-a',
    level: 1,
    domain: 'kanji',
    prompt: 'Quel est le sens de ce kanji ?',
    display: '日',
    choices: ['jour / soleil', 'eau', 'personne', 'montagne'],
    answer: 'jour / soleil',
    skill: 'kanji:n5:meaning',
    explanation: '日 renvoie au jour et au soleil. Il revient tres souvent au N5.',
  },
  {
    id: 'apt-1-grammar-a',
    level: 1,
    domain: 'grammaire',
    prompt: 'Quelle particule marque le theme ?',
    display: 'わたし ___ がくせいです。',
    choices: ['は', 'を', 'に', 'で'],
    answer: 'は',
    skill: 'grammar:particle:wa',
    explanation: 'は marque le theme : moi, je suis etudiant.',
  },
  {
    id: 'apt-1-comp-a',
    level: 1,
    domain: 'comprehension',
    prompt: 'Quelle traduction correspond ?',
    display: 'これは本です。',
    choices: ['Ceci est un livre.', 'Je vais a l ecole.', 'Il pleut.', 'Je mange.'],
    answer: 'Ceci est un livre.',
    skill: 'comprehension:simple_sentence',
    explanation: 'これ = ceci, 本 = livre, です = forme polie.',
  },
  {
    id: 'apt-2-kana-a',
    level: 2,
    domain: 'kana',
    prompt: 'Quelle lecture correspond a ce katakana ?',
    display: 'シャ',
    choices: ['sha', 'shu', 'cho', 'rya'],
    answer: 'sha',
    skill: 'kana:katakana:combined',
    explanation: 'シャ se lit sha. Les sons combines doivent devenir automatiques.',
  },
  {
    id: 'apt-2-orth-a',
    level: 2,
    domain: 'orthographe',
    prompt: 'Choisis l ecriture correcte de "gakkou".',
    display: 'gakkou',
    choices: ['がこう', 'がっこう', 'かっこ', 'がこお'],
    answer: 'がっこう',
    skill: 'orthographe:kana:small_tsu',
    explanation: 'Le double k demande un petit っ : がっこう.',
  },
  {
    id: 'apt-2-vocab-a',
    level: 2,
    domain: 'vocabulaire',
    prompt: 'Que signifie ce mot ?',
    display: '毎日',
    choices: ['tous les jours', 'aujourd hui', 'demain', 'ce mois-ci'],
    answer: 'tous les jours',
    skill: 'vocabulary:n5:time',
    explanation: '毎日 signifie tous les jours. 毎 marque la repetition.',
  },
  {
    id: 'apt-2-kanji-a',
    level: 2,
    domain: 'kanji',
    prompt: 'Quelle lecture japonaise convient souvent pour ce kanji seul ?',
    display: '人',
    choices: ['ひと', 'みず', 'やま', 'くに'],
    answer: 'ひと',
    skill: 'kanji:n5:reading',
    explanation: '人 peut se lire ひと quand il signifie personne.',
  },
  {
    id: 'apt-2-grammar-a',
    level: 2,
    domain: 'grammaire',
    prompt: 'Choisis la particule correcte.',
    display: 'えき ___ いきます。',
    choices: ['に', 'を', 'が', 'と'],
    answer: 'に',
    skill: 'grammar:particle:ni_direction',
    explanation: 'に marque ici la destination : aller a la gare.',
  },
  {
    id: 'apt-2-comp-a',
    level: 2,
    domain: 'comprehension',
    prompt: 'Quel est le sens global ?',
    display: 'きのう、友だちと映画を見ました。',
    choices: ['Hier, j ai regarde un film avec un ami.', 'Demain, je lirai un livre.', 'Je mange avec mon pere.', 'Je vais a la gare.'],
    answer: 'Hier, j ai regarde un film avec un ami.',
    skill: 'comprehension:past_sentence',
    explanation: 'きのう = hier, と = avec, 見ました = a regarde.',
  },
  {
    id: 'apt-3-kana-a',
    level: 3,
    domain: 'kana',
    prompt: 'Quel choix evite la confusion de sons combines ?',
    display: 'りょう',
    choices: ['ryou', 'rou', 'riyo', 'ryo'],
    answer: 'ryou',
    skill: 'kana:combined:long_sound',
    explanation: 'りょう contient りょ + う : ryou, avec allongement.',
  },
  {
    id: 'apt-3-orth-a',
    level: 3,
    domain: 'orthographe',
    prompt: 'Quelle forme kana transcrit correctement "byouin" ?',
    display: 'byouin',
    choices: ['びょういん', 'びよういん', 'びょいん', 'びょおいん'],
    answer: 'びょういん',
    skill: 'orthographe:kana:youon_long',
    explanation: 'びょういん combine びょ + う + いん. C est un piege classique.',
  },
  {
    id: 'apt-3-vocab-a',
    level: 3,
    domain: 'vocabulaire',
    prompt: 'Quel mot correspond au sens "emprunter / louer" ?',
    display: 'emprunter / louer',
    choices: ['借りる', '貸す', '買う', '帰る'],
    answer: '借りる',
    skill: 'vocabulary:n5:verb_contrast',
    explanation: '借りる = emprunter. 貸す = preter, piege de sens inverse.',
  },
  {
    id: 'apt-3-kanji-a',
    level: 3,
    domain: 'kanji',
    prompt: 'Quel sens correspond le mieux au kanji dans ce mot ?',
    display: '高い',
    choices: ['haut / cher', 'bas', 'ancien', 'petit'],
    answer: 'haut / cher',
    skill: 'kanji:n5:word_context',
    explanation: '高い signifie haut ou cher selon le contexte.',
  },
  {
    id: 'apt-3-grammar-a',
    level: 3,
    domain: 'grammaire',
    prompt: 'Choisis la forme correcte.',
    display: 'ここで写真を ___ いけません。',
    choices: ['とっては', 'とります', 'とった', 'とるの'],
    answer: 'とっては',
    skill: 'grammar:tewa_ikemasen',
    explanation: 'てはいけません exprime l interdiction : il ne faut pas prendre de photos ici.',
  },
  {
    id: 'apt-3-comp-a',
    level: 3,
    domain: 'comprehension',
    prompt: 'Quel diagnostic est correct pour cette phrase ?',
    display: '雨がふっていますから、外へ行きません。',
    choices: ['Cause + consequence', 'Comparaison', 'Invitation', 'Possession'],
    answer: 'Cause + consequence',
    skill: 'comprehension:because_sentence',
    explanation: 'から indique la cause : comme il pleut, je ne vais pas dehors.',
  },
  {
    id: 'apt-1-kana-b',
    level: 1,
    domain: 'kana',
    prompt: 'Lecture de base : comment se lit ce kana ?',
    display: 'ぬ',
    choices: ['nu', 'ne', 'me', 'mu'],
    answer: 'nu',
    skill: 'kana:hiragana:nu',
    explanation: 'ぬ se lit nu. Il faut le distinguer de ね et め.',
  },
  {
    id: 'apt-1-vocab-b',
    level: 1,
    domain: 'vocabulaire',
    prompt: 'Que signifie ce mot courant ?',
    display: 'ねこ',
    choices: ['chat', 'chien', 'poisson', 'oiseau'],
    answer: 'chat',
    skill: 'vocabulary:n5:animal',
    explanation: 'ねこ signifie chat. C est un mot simple utile pour verifier la lecture kana.',
  },
  {
    id: 'apt-1-kanji-b',
    level: 1,
    domain: 'kanji',
    prompt: 'Quel est le sens de ce kanji ?',
    display: '山',
    choices: ['montagne', 'riviere', 'pluie', 'main'],
    answer: 'montagne',
    skill: 'kanji:n5:yama',
    explanation: '山 signifie montagne et se lit souvent やま seul.',
  },
  {
    id: 'apt-1-grammar-b',
    level: 1,
    domain: 'grammaire',
    prompt: 'Quelle particule marque le complement direct ?',
    display: 'ごはん ___ たべます。',
    choices: ['を', 'は', 'に', 'と'],
    answer: 'を',
    skill: 'grammar:particle:o',
    explanation: 'を marque ce que l action touche directement : manger du riz / un repas.',
  },
  {
    id: 'apt-2-kana-b',
    level: 2,
    domain: 'kana',
    prompt: 'Quelle lecture correspond au katakana ?',
    display: 'チョ',
    choices: ['cho', 'cha', 'sho', 'jo'],
    answer: 'cho',
    skill: 'kana:katakana:cho',
    explanation: 'チョ se lit cho : petit ョ transforme la syllabe.',
  },
  {
    id: 'apt-2-orth-b',
    level: 2,
    domain: 'orthographe',
    prompt: 'Choisis l ecriture correcte de "ryokou".',
    display: 'ryokou',
    choices: ['りょこう', 'りよこう', 'りょこお', 'りおこう'],
    answer: 'りょこう',
    skill: 'orthographe:kana:ryokou',
    explanation: 'ryo demande un petit ょ : りょ. La fin longue est こう.',
  },
  {
    id: 'apt-2-kanji-b',
    level: 2,
    domain: 'kanji',
    prompt: 'Quel mot japonais correspond au kanji ?',
    display: '水',
    choices: ['みず', 'ひ', 'あめ', 'かね'],
    answer: 'みず',
    skill: 'kanji:n5:mizu',
    explanation: '水 signifie eau et se lit みず dans le mot courant.',
  },
  {
    id: 'apt-2-grammar-b',
    level: 2,
    domain: 'grammaire',
    prompt: 'Choisis la forme negative polie correcte.',
    display: 'いきます -> ?',
    choices: ['いきません', 'いきました', 'いって', 'いくないです'],
    answer: 'いきません',
    skill: 'grammar:polite_negative',
    explanation: 'La forme negative polie de いきます est いきません.',
  },
  {
    id: 'apt-3-vocab-b',
    level: 3,
    domain: 'vocabulaire',
    prompt: 'Quel choix correspond au sens inverse de "preter" ?',
    display: 'preter',
    choices: ['借りる', '貸す', '聞く', '出る'],
    answer: '借りる',
    skill: 'vocabulary:n5:borrow_lend_contrast',
    explanation: 'Face a 貸す = preter, le mouvement inverse est 借りる = emprunter.',
  },
  {
    id: 'apt-3-kanji-b',
    level: 3,
    domain: 'kanji',
    prompt: 'Dans ce mot, quel sens porte le kanji 新 ?',
    display: '新しい',
    choices: ['nouveau', 'ancien', 'grand', 'rapide'],
    answer: 'nouveau',
    skill: 'kanji:n5:atarashii',
    explanation: '新しい signifie nouveau. Le kanji 新 porte l idee de nouveaute.',
  },
  {
    id: 'apt-3-grammar-b',
    level: 3,
    domain: 'grammaire',
    prompt: 'Quelle nuance exprime la structure ?',
    display: 'コーヒーをのみながら、べんきょうします。',
    choices: ['deux actions en meme temps', 'interdiction', 'ordre', 'comparaison'],
    answer: 'deux actions en meme temps',
    skill: 'grammar:nagara',
    explanation: 'ながら indique deux actions simultanees : etudier en buvant un cafe.',
  },
  {
    id: 'apt-3-comp-b',
    level: 3,
    domain: 'comprehension',
    prompt: 'Quel sens global est le plus precis ?',
    display: 'この本はすこし難しいですが、おもしろいです。',
    choices: [
      'Ce livre est un peu difficile, mais interessant.',
      'Ce livre est facile et court.',
      'Je n aime pas ce livre.',
      'Je vais acheter ce livre demain.',
    ],
    answer: 'Ce livre est un peu difficile, mais interessant.',
    skill: 'comprehension:contrast_sentence',
    explanation: 'が relie ici deux idees opposees : difficile, mais interessant.',
  },
];

const LEAGUE_TIERS: LeagueTier[] = [
  { name: 'Depart N5', minLevel: 1, symbol: 'N5' },
  { name: 'Kana solides', minLevel: 5, symbol: 'KA' },
  { name: 'Lexique actif', minLevel: 12, symbol: 'VO' },
  { name: 'Grammaire claire', minLevel: 20, symbol: 'GR' },
  { name: 'Kanji en place', minLevel: 32, symbol: 'KJ' },
  { name: 'Simulation JLPT', minLevel: 45, symbol: 'JL' },
  { name: 'Pret examen', minLevel: 60, symbol: 'OK' },
];

export function LearningPathScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
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
  const [rewardState, setRewardState] = useState<RewardPathState | null>(null);
  const [pathPanel, setPathPanel] = useState<PathPanel>('progress');
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const grammarProgress = await loadGrammarProgressSummary(db, ALL_GRAMMAR_LESSONS, getGrammarMainMenu);
      await ensureDailyGoalPlan(db, DAILY_GOAL_DEFINITIONS, GOAL_PLAN_DAYS);
      const overview = await loadDashboardOverviewData(db, grammarProgress.total);
      const quizData = await loadDashboardQuizData(db);
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

      const goalData = await loadDashboardGoalData(
        db,
        {
          daily: DAILY_GOAL_DEFINITIONS,
          weekly: WEEKLY_GOAL_DEFINITIONS,
          monthly: MONTHLY_GOAL_DEFINITIONS,
          yearly: YEARLY_GOAL_DEFINITIONS,
        },
        CALENDAR_HISTORY_DAYS,
        overview.stats.todayAttempts,
        overview.stats.todayCorrect
      );
      const streakDays = calculateStudyStreak(overview.dailyProgress);
      const masteryTotal = allDomains.reduce(
        (acc, domain) => ({
          total: acc.total + domain.total,
          mastered: acc.mastered + domain.mastered,
          known: acc.known + domain.known,
          review: acc.review + domain.review,
          unseen: acc.unseen + domain.unseen,
        }),
        { total: 0, mastered: 0, known: 0, review: 0, unseen: 0 }
      );
      const xpTotal =
        overview.stats.correctRate * 3 +
        overview.stats.attempts * 10 +
        masteryTotal.mastered * 25 +
        masteryTotal.known * 8 +
        quizData.summary.bestScore +
        goalData.rewardSummary.xp;
      const levelProgress = getLevelProgressFromXp(xpTotal);
      const badges = buildBadgeViews({
        stats: overview.stats,
        quizSummary: quizData.summary,
        masteryDomains: allDomains,
        grammarLessons: grammarProgress,
        goalCalendar: goalData.goalCalendar,
        earnedBadgeCodes: goalData.earnedBadgeCodes,
        streakDays,
        level: levelProgress.level,
      });
      const recommendedDomain =
        allDomains
          .slice()
          .sort((a, b) => b.review - a.review || b.unseen - a.unseen || b.total - b.mastered - (a.total - a.mastered))[0] ??
        null;
      setRewardState({
        quizSummary: quizData.summary,
        quests: buildQuests(goalData.today, goalData.todayDefinitions),
        tomorrowQuests: buildQuests(
          { day: '', attempts: 0, correct: 0, rate: 0, quizAttempts: 0, grammarActivities: 0 },
          goalData.tomorrowDefinitions
        ),
        weeklyQuests: buildQuests(goalData.weekly, WEEKLY_GOAL_DEFINITIONS),
        monthlyQuests: buildQuests(goalData.monthly, MONTHLY_GOAL_DEFINITIONS),
        goalCalendar: goalData.goalCalendar,
        rewardSummary: goalData.rewardSummary,
        badges,
        recommendedDomain,
        srsOverview: await loadSrsOverview(db),
        ...levelProgress,
        streakDays,
        unlockedBadgeCount: badges.filter((badge) => badge.unlocked).length,
      });
    } catch (error) {
      console.error('Unable to load learning path', error);
      setStages([]);
      setRewardState(null);
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
  const activeSubStep =
    stages.flatMap((stage) => stage.subSteps ?? []).find((subStep) => subStep.status === 'active') ??
    activeStage?.subSteps?.find((subStep) => subStep.status !== 'locked') ??
    stages.flatMap((stage) => stage.subSteps ?? []).at(-1);
  const doneCount = stages.filter((stage) => stage.status === 'done').length;
  const doneSubStepCount = stages.flatMap((stage) => stage.subSteps ?? []).filter((subStep) => subStep.status === 'done').length;
  const totalSubStepCount = stages.reduce((total, stage) => total + (stage.subSteps?.length ?? 0), 0);
  const rewardMasteryRate = summary.total > 0 ? Math.round((summary.mastered / summary.total) * 100) : 0;
  const rewardExamReadiness = rewardState
    ? Math.min(100, Math.round(rewardMasteryRate * 0.55 + rewardState.quizSummary.rate * 0.35 + Math.min(rewardState.streakDays, 10)))
    : summary.readiness;
  const rewardLeague = rewardState ? getLeagueProgress(rewardState.level) : null;
  const rewardBadgeTargets = rewardState ? buildNextBadgeTargets(rewardState.badges) : [];
  const rewardContinuitySignals = rewardState ? buildContinuitySignals(rewardState, rewardExamReadiness) : [];
  const selectedStage = selectedStageId ? stages.find((stage) => stage.id === selectedStageId) ?? null : null;

  if (selectedStage) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.secondaryFullButton} onPress={() => setSelectedStageId(null)}>
          <Text style={styles.secondaryFullButtonText}>Retour au parcours</Text>
        </Pressable>
        <View style={styles.pathModuleDetailHero}>
          <Text style={styles.pathNextLabel}>Module {selectedStage.order}</Text>
          <Text style={styles.pathModuleDetailTitle}>{selectedStage.title}</Text>
          <Text style={styles.pathModuleDetailText}>{selectedStage.detail ?? selectedStage.subtitle}</Text>
          <View style={styles.pathProgressTrack}>
            <View style={[styles.pathProgressFill, { width: `${selectedStage.progress}%` }]} />
          </View>
          <View style={styles.pathStageMetaRow}>
            <Text style={styles.pathStageFocus}>{selectedStage.focus}</Text>
            <Text style={styles.pathStageCount}>{selectedStage.done}/{selectedStage.total}</Text>
          </View>
          {!!selectedStage.nextActionHint && (
            <View style={styles.pathGuidanceBox}>
              <Text style={styles.pathGuidanceLabel}>Action conseillee</Text>
              <Text style={styles.pathGuidanceText}>{selectedStage.nextActionHint}</Text>
            </View>
          )}
        </View>

        <Section title="Prerequis">
          <View style={styles.pathRequirementList}>
            {(selectedStage.prerequisites ?? []).map((prerequisite, index) => (
              <View key={`${selectedStage.id}-prerequisite-${index}`} style={styles.pathRequirementItem}>
                <Text style={styles.pathRequirementIndex}>{index + 1}</Text>
                <Text style={styles.pathRequirementText}>{prerequisite}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Ce qu on attend de toi">
          <View style={styles.pathRequirementList}>
            {(selectedStage.checkpoints ?? []).map((checkpoint, index) => (
              <View key={`${selectedStage.id}-checkpoint-${index}`} style={styles.pathRequirementItem}>
                <Text style={styles.pathRequirementIndex}>{index + 1}</Text>
                <Text style={styles.pathRequirementText}>{checkpoint}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Validation du module">
          <View style={styles.pathRequirementList}>
            {(selectedStage.successCriteria ?? []).map((criterion, index) => (
              <View key={`${selectedStage.id}-success-${index}`} style={styles.pathRequirementItem}>
                <Text style={styles.pathRequirementIndex}>{index + 1}</Text>
                <Text style={styles.pathRequirementText}>{criterion}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Points de passage">
          <View style={styles.pathDetailSubStepList}>
            {(selectedStage.subSteps ?? []).map((subStep) => (
              <View
                key={subStep.id}
                style={[
                  styles.pathDetailSubStep,
                  subStep.status === 'done' && styles.pathSubStepDone,
                  subStep.status === 'active' && styles.pathSubStepActive,
                  subStep.status === 'locked' && styles.pathSubStepLocked,
                ]}
              >
                <View style={styles.pathDetailSubStepHeader}>
                  <Text
                    style={[
                      styles.pathDetailSubStepCode,
                      (subStep.status === 'done' || subStep.status === 'active') && styles.pathSubStepTextActive,
                    ]}
                  >
                    {subStep.code}
                  </Text>
                  <Text
                    style={[
                      styles.pathDetailSubStepStatus,
                      (subStep.status === 'done' || subStep.status === 'active') && styles.pathSubStepTextActive,
                    ]}
                  >
                    {formatPathStatus(subStep.status)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.pathDetailSubStepTitle,
                    (subStep.status === 'done' || subStep.status === 'active') && styles.pathSubStepTextActive,
                  ]}
                >
                  {subStep.title}
                </Text>
                <Text
                  style={[
                    styles.pathDetailSubStepText,
                    (subStep.status === 'done' || subStep.status === 'active') && styles.pathSubStepTextActive,
                  ]}
                >
                  {subStep.objective}
                </Text>
                <Text
                  style={[
                    styles.pathDetailSubStepText,
                    (subStep.status === 'done' || subStep.status === 'active') && styles.pathSubStepTextActive,
                  ]}
                >
                  Validation : {subStep.requirement}
                </Text>
                <View style={styles.pathProgressTrack}>
                  <View style={[styles.pathProgressFill, { width: `${subStep.progress}%` }]} />
                </View>
              </View>
            ))}
          </View>
        </Section>

        {selectedStage.id === 'start' && (
          <Section title="Test d aptitude initial">
            <AptitudeTestPanel db={db} />
          </Section>
        )}

        <Pressable style={styles.pathActionButton} onPress={() => onNavigate(selectedStage.screen)}>
          <Text style={styles.pathActionText}>{selectedStage.actionLabel}</Text>
        </Pressable>
      </ScrollView>
    );
  }

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
        <Metric label="Sous-niveau" value={activeSubStep?.code ?? '1A'} />
      </View>

      <View style={styles.segmented}>
        <Pressable
          onPress={() => setPathPanel('progress')}
          style={[styles.pathPanelSwitchButton, pathPanel === 'progress' && styles.pathPanelSwitchButtonActive]}
        >
          <Text style={[styles.pathPanelSwitchText, pathPanel === 'progress' && styles.pathPanelSwitchTextActive]}>
            Parcours
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setPathPanel('rewards')}
          style={[styles.pathPanelSwitchButton, pathPanel === 'rewards' && styles.pathPanelSwitchButtonActive]}
        >
          <Text style={[styles.pathPanelSwitchText, pathPanel === 'rewards' && styles.pathPanelSwitchTextActive]}>
            Recompenses
          </Text>
        </Pressable>
      </View>

      {pathPanel === 'progress' && activeStage && activeSubStep && (
        <View style={styles.pathEvaluationCard}>
          <View style={styles.pathEvaluationCodeBox}>
            <Text style={styles.pathEvaluationCode}>{activeSubStep.code}</Text>
            <Text style={styles.pathEvaluationCodeLabel}>niveau actuel</Text>
          </View>
          <View style={styles.pathEvaluationBody}>
            <Text style={styles.pathNextLabel}>Evaluation du parcours</Text>
            <Text style={styles.pathEvaluationTitle}>{activeStage.title} - {activeSubStep.title}</Text>
            <Text style={styles.pathNextText}>{activeSubStep.objective}</Text>
            <View style={styles.pathProgressTrack}>
              <View style={[styles.pathProgressFill, { width: `${activeSubStep.progress}%` }]} />
            </View>
            <Text style={styles.pathStageCount}>
              Sous-etapes validees : {doneSubStepCount}/{totalSubStepCount}
            </Text>
          </View>
        </View>
      )}

      {pathPanel === 'rewards' && rewardState && (
        <Section title="Recompenses et assiduite">
          <CoachPremiumPanel
            examReadiness={rewardExamReadiness}
            level={rewardState.level}
            xpCurrentLevel={rewardState.xpCurrentLevel}
            xpRequiredForLevel={rewardState.xpRequiredForLevel}
            xpToNextLevel={rewardState.xpToNextLevel}
            streakDays={rewardState.streakDays}
            quests={rewardState.quests}
            nextQuests={rewardState.tomorrowQuests}
            srsOverview={rewardState.srsOverview}
            goalCalendar={rewardState.goalCalendar}
            recommendedDomain={rewardState.recommendedDomain}
            rewardSummary={{ ...rewardState.rewardSummary, badges: rewardState.unlockedBadgeCount }}
          />
        </Section>
      )}

      {pathPanel === 'rewards' && rewardState && rewardLeague && (
        <Section title="Grade et prochains objectifs">
          <View style={styles.rewardLeagueCard}>
            <View style={styles.rewardLeagueHeader}>
              <View style={styles.rewardLeagueSymbol}>
                <Text style={styles.rewardLeagueSymbolText}>{rewardLeague.current.symbol}</Text>
              </View>
              <View style={styles.rewardLeagueCopy}>
                <Text style={styles.rewardLeagueKicker}>Grade actuel</Text>
                <Text style={styles.rewardLeagueTitle}>{rewardLeague.current.name}</Text>
                <Text style={styles.rewardLeagueText}>
                  Niveau {rewardState.level}. {rewardLeague.next
                    ? `${rewardLeague.levelsToNext} niveau(x) avant ${rewardLeague.next.name}.`
                    : 'Dernier grade atteint.'}
                </Text>
              </View>
            </View>
            <View style={styles.pathProgressTrack}>
              <View style={[styles.pathProgressFill, { width: `${rewardLeague.progress}%` }]} />
            </View>
            <View style={styles.rewardLeagueMetricRow}>
              {rewardContinuitySignals.map((signal) => (
                <View key={signal.label} style={styles.rewardLeagueMetric}>
                  <Text style={styles.rewardLeagueMetricValue}>{signal.value}</Text>
                  <Text style={styles.rewardLeagueMetricLabel}>{signal.label}</Text>
                  <Text style={styles.rewardLeagueMetricText}>{signal.detail}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.rewardTargetList}>
            {rewardBadgeTargets.map((badge) => (
              <View key={badge.id} style={styles.rewardTargetCard}>
                <Text style={[styles.rewardTargetIcon, badge.unlocked && styles.rewardTargetIconDone]}>
                  {badge.unlocked ? 'OK' : badge.icon}
                </Text>
                <View style={styles.rewardTargetBody}>
                  <Text style={styles.rewardTargetTitle}>{badge.title}</Text>
                  <Text style={styles.rewardTargetText}>{badge.description}</Text>
                  {!badge.unlocked && badge.gateLocked && (
                    <Text style={styles.rewardTargetGate}>
                      Deverrouillage : niveau {badge.requiredLevel}, {badge.requiredBadges} badge(s).
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </Section>
      )}

      {pathPanel === 'rewards' && rewardState && (
        <Section title="Quetes longues">
          <QuestGroup title="Objectifs hebdomadaires" detail="Assez longs pour creer une vraie routine." quests={rewardState.weeklyQuests} />
          <QuestGroup title="Objectifs mensuels" detail="La progression lourde qui valide les niveaux." quests={rewardState.monthlyQuests} />
        </Section>
      )}

      {pathPanel === 'rewards' && rewardState && (
        <Section title="Badges et niveaux">
          <BadgeCollection badges={rewardState.badges} />
        </Section>
      )}

      {pathPanel === 'progress' && activeStage && (
        <View style={styles.pathNextCard}>
          <Text style={styles.pathNextLabel}>Prochaine mission</Text>
          <Text style={styles.pathNextTitle}>{activeStage.title}</Text>
          <Text style={styles.pathNextText}>{activeStage.subtitle}</Text>
          <View style={styles.pathProgressTrack}>
            <View style={[styles.pathProgressFill, { width: `${activeStage.progress}%` }]} />
          </View>
          <View style={styles.pathNextFooter}>
            <Text style={styles.pathReward}>Objectif : {activeStage.done}/{activeStage.total}</Text>
            <Pressable style={styles.pathActionButton} onPress={() => setSelectedStageId(activeStage.id)}>
              <Text style={styles.pathActionText}>Voir le module</Text>
            </Pressable>
          </View>
        </View>
      )}

      {pathPanel === 'progress' && (
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
                setSelectedStageId(stage.id);
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
                {stage.status === 'locked' && !!stage.lockedReason && (
                  <View style={styles.pathLockedReasonBox}>
                    <Text style={styles.pathLockedReasonText}>{stage.lockedReason}</Text>
                  </View>
                )}
                {stage.status === 'active' && !!stage.nextActionHint && (
                  <View style={styles.pathGuidanceBox}>
                    <Text style={styles.pathGuidanceLabel}>Maintenant</Text>
                    <Text style={styles.pathGuidanceText}>{stage.nextActionHint}</Text>
                  </View>
                )}
                <View style={styles.pathStageMetaRow}>
                  <Text style={styles.pathStageFocus}>{stage.focus}</Text>
                  <Text style={styles.pathStageCount}>{stage.done}/{stage.total}</Text>
                </View>
                <View style={styles.pathProgressTrack}>
                  <View style={[styles.pathProgressFill, { width: `${stage.progress}%` }]} />
                </View>
                <View style={styles.pathSubStepGrid}>
                  {(stage.subSteps ?? []).map((subStep) => (
                    <View
                      key={subStep.id}
                      style={[
                        styles.pathSubStepChip,
                        subStep.status === 'done' && styles.pathSubStepDone,
                        subStep.status === 'active' && styles.pathSubStepActive,
                        subStep.status === 'locked' && styles.pathSubStepLocked,
                      ]}
                    >
                      <Text
                        style={[
                          styles.pathSubStepCode,
                          subStep.status === 'done' && styles.pathSubStepTextDone,
                          subStep.status === 'active' && styles.pathSubStepTextActive,
                        ]}
                      >
                        {subStep.code}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.pathSubStepTitle,
                          subStep.status === 'done' && styles.pathSubStepTextDone,
                          subStep.status === 'active' && styles.pathSubStepTextActive,
                        ]}
                      >
                        {subStep.title}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </Section>
      )}
    </ScrollView>
  );
}

function getLeagueProgress(level: number) {
  const currentIndex = LEAGUE_TIERS.reduce((bestIndex, tier, index) => (level >= tier.minLevel ? index : bestIndex), 0);
  const current = LEAGUE_TIERS[currentIndex];
  const next = LEAGUE_TIERS[currentIndex + 1] ?? null;
  if (!next) {
    return { current, next, progress: 100, levelsToNext: 0 };
  }
  const levelSpan = Math.max(1, next.minLevel - current.minLevel);
  const progress = Math.max(0, Math.min(100, Math.round(((level - current.minLevel) / levelSpan) * 100)));
  return {
    current,
    next,
    progress,
    levelsToNext: Math.max(0, next.minLevel - level),
  };
}

function buildNextBadgeTargets(badges: BadgeView[]) {
  const visibleBadges = badges.filter((badge) => badge.domain !== 'quotidien');
  const locked = visibleBadges
    .filter((badge) => !badge.unlocked)
    .slice()
    .sort((a, b) => a.requiredLevel - b.requiredLevel || a.requiredBadges - b.requiredBadges)
    .slice(0, 3);
  if (locked.length >= 3) return locked;
  return [
    ...locked,
    ...visibleBadges
      .filter((badge) => badge.unlocked)
      .slice()
      .reverse()
      .slice(0, 3 - locked.length),
  ];
}

function buildContinuitySignals(state: RewardPathState, examReadiness: number) {
  const completedToday = state.quests.filter((quest) => quest.progress >= quest.target).length;
  const dueReviews = state.srsOverview.dueToday;
  const badgeTotal = Math.max(1, state.badges.length);
  return [
    {
      label: 'Jour',
      value: `${completedToday}/${state.quests.length}`,
      detail: 'Objectifs valides aujourd hui.',
    },
    {
      label: 'Memoire',
      value: `${dueReviews}`,
      detail: dueReviews > 0 ? 'Revisions SRS a sauver.' : 'Rien en retard.',
    },
    {
      label: 'N5',
      value: `${examReadiness}%`,
      detail: 'Preparation examen estimee.',
    },
    {
      label: 'Badges',
      value: `${state.unlockedBadgeCount}/${badgeTotal}`,
      detail: 'Collection debloquee.',
    },
  ];
}

function getPathStatusStyle(status: LearningPathStage['status']) {
  if (status === 'done') return styles.pathStageStatus_done;
  if (status === 'active') return styles.pathStageStatus_active;
  return styles.pathStageStatus_locked;
}

function AptitudeTestPanel({ db }: { db: SQLiteDatabase }) {
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [finished, setFinished] = useState(false);
  const [resultSaved, setResultSaved] = useState(false);
  const questions = APTITUDE_QUESTIONS;
  const current = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = Math.round((answeredCount / questions.length) * 100);

  const report = useMemo(() => buildAptitudeReport(questions, answers), [answers, questions]);

  useEffect(() => {
    if (!finished || resultSaved || answeredCount < questions.length) return;
    setResultSaved(true);
    saveAptitudeResult(db, answers, report).catch((error) => {
      console.error('Unable to save aptitude result', error);
    });
  }, [answeredCount, answers, db, finished, questions.length, report, resultSaved]);

  const answer = async (choice: string) => {
    if (!current || answers[current.id]) return;
    const nextAnswers = { ...answers, [current.id]: choice };
    setAnswers(nextAnswers);
    try {
      await db.runAsync(
        `
        INSERT INTO app_question_attempt_local (
          id, question_id, source_mode, selected_answer, correct_answer,
          is_correct, skill_id, answered_at
        ) VALUES (?, ?, 'aptitude_test', ?, ?, ?, ?, datetime('now'))
        `,
        `${Date.now()}-${Math.random()}`,
        current.id,
        choice,
        current.answer,
        choice === current.answer ? 1 : 0,
        current.skill
      );
      await recordSrsReviewForQuestionAttempt(db, {
        questionId: current.id,
        skillId: current.skill,
        sourceMode: 'aptitude_test',
        isCorrect: choice === current.answer,
      });
    } catch (error) {
      console.error('Unable to save aptitude answer', error);
    }
  };

  const next = () => {
    if (currentIndex + 1 >= questions.length) {
      setFinished(true);
      return;
    }
    setCurrentIndex((value) => value + 1);
  };

  const restart = () => {
    setStarted(false);
    setCurrentIndex(0);
    setAnswers({});
    setFinished(false);
    setResultSaved(false);
  };

  if (!started) {
    return (
      <View style={styles.aptitudeIntroCard}>
        <Text style={styles.pathModuleDetailTitle}>Diagnostic N5 complet</Text>
        <Text style={styles.pathModuleDetailText}>
          Un seul test en trois niveaux. Il mesure les bases, les automatismes et les points difficiles sur kana,
          orthographe kana, vocabulaire, kanji, grammaire et comprehension.
        </Text>
        <View style={styles.pathRequirementList}>
          <View style={styles.pathRequirementItem}>
            <Text style={styles.pathRequirementIndex}>1</Text>
            <Text style={styles.pathRequirementText}>Niveau facile : verifier les bases de lecture et de sens.</Text>
          </View>
          <View style={styles.pathRequirementItem}>
            <Text style={styles.pathRequirementIndex}>2</Text>
            <Text style={styles.pathRequirementText}>Niveau intermediaire : reperer les confusions et les acquis fragiles.</Text>
          </View>
          <View style={styles.pathRequirementItem}>
            <Text style={styles.pathRequirementIndex}>3</Text>
            <Text style={styles.pathRequirementText}>Niveau difficile : tester analyse, pieges N5 et resistance cognitive.</Text>
          </View>
        </View>
        <Pressable style={styles.pathActionButton} onPress={() => setStarted(true)}>
          <Text style={styles.pathActionText}>Lancer le test d aptitude</Text>
        </Pressable>
      </View>
    );
  }

  if (finished) {
    return (
      <View style={styles.aptitudeReportCard}>
        <View style={styles.aptitudeReportHeader}>
          <View>
            <Text style={styles.pathNextLabel}>Rapport d aptitude</Text>
            <Text style={styles.pathModuleDetailTitle}>{report.globalLabel}</Text>
          </View>
          <View style={styles.pathEvaluationCodeBox}>
            <Text style={styles.pathEvaluationCode}>{report.score}%</Text>
            <Text style={styles.pathEvaluationCodeLabel}>score</Text>
          </View>
        </View>
        <Text style={styles.pathModuleDetailText}>{report.summary}</Text>

        <View style={styles.aptitudeInsightGrid}>
          <View style={styles.aptitudeInsightCard}>
            <Text style={styles.pathNextLabel}>Niveau estime</Text>
            <Text style={styles.aptitudeInsightValue}>{report.estimatedLevel}</Text>
            <Text style={styles.pathDetailSubStepText}>{report.levelAdvice}</Text>
          </View>
          <View style={styles.aptitudeInsightCard}>
            <Text style={styles.pathNextLabel}>Questions difficiles</Text>
            <Text style={styles.aptitudeInsightValue}>{report.level3Rate}%</Text>
            <Text style={styles.pathDetailSubStepText}>{report.difficultyAdvice}</Text>
          </View>
        </View>

        <View style={styles.aptitudeDomainGrid}>
          {report.domainRows.map((row) => (
            <View key={row.domain} style={styles.aptitudeDomainCard}>
              <View style={styles.pathStageMetaRow}>
                <Text style={styles.pathStageFocus}>{formatAptitudeDomain(row.domain)}</Text>
                <Text style={styles.pathStageCount}>{row.correct}/{row.total}</Text>
              </View>
              <View style={styles.pathProgressTrack}>
                <View style={[styles.pathProgressFill, { width: `${row.rate}%` }]} />
              </View>
              <Text style={styles.pathDetailSubStepText}>{row.comment}</Text>
            </View>
          ))}
        </View>

        <Section title="Forces detectees">
          <View style={styles.pathRequirementList}>
            {report.strengths.map((item, index) => (
              <View key={`strength-${item}`} style={styles.pathRequirementItem}>
                <Text style={styles.pathRequirementIndex}>{index + 1}</Text>
                <Text style={styles.pathRequirementText}>{item}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Axes d apprentissage">
          <View style={styles.pathRequirementList}>
            {report.priorities.map((item, index) => (
              <View key={`priority-${item}`} style={styles.pathRequirementItem}>
                <Text style={styles.pathRequirementIndex}>{index + 1}</Text>
                <Text style={styles.pathRequirementText}>{item}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Modules recommandes">
          <View style={styles.pathRequirementList}>
            {report.recommendedModules.map((item, index) => (
              <View key={`module-${item}`} style={styles.pathRequirementItem}>
                <Text style={styles.pathRequirementIndex}>{index + 1}</Text>
                <Text style={styles.pathRequirementText}>{item}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Plan 7 jours">
          <View style={styles.pathRequirementList}>
            {report.sevenDayPlan.map((item, index) => (
              <View key={`seven-${item}`} style={styles.pathRequirementItem}>
                <Text style={styles.pathRequirementIndex}>{index + 1}</Text>
                <Text style={styles.pathRequirementText}>{item}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Plan 30 jours">
          <View style={styles.pathRequirementList}>
            {report.thirtyDayPlan.map((item, index) => (
              <View key={`thirty-${item}`} style={styles.pathRequirementItem}>
                <Text style={styles.pathRequirementIndex}>{index + 1}</Text>
                <Text style={styles.pathRequirementText}>{item}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="A ne pas abandonner">
          <View style={styles.pathRequirementList}>
            {report.maintenance.map((item, index) => (
              <View key={`maintenance-${item}`} style={styles.pathRequirementItem}>
                <Text style={styles.pathRequirementIndex}>{index + 1}</Text>
                <Text style={styles.pathRequirementText}>{item}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Pressable style={styles.secondaryFullButton} onPress={restart}>
          <Text style={styles.secondaryFullButtonText}>Repasser le diagnostic</Text>
        </Pressable>
      </View>
    );
  }

  if (!current) return null;
  const selected = answers[current.id];
  return (
    <View style={styles.aptitudeQuestionCard}>
      <View style={styles.aptitudeQuestionHeader}>
        <Text style={styles.pathNextLabel}>Niveau {current.level} / 3</Text>
        <Text style={styles.pathStageCount}>
          {currentIndex + 1}/{questions.length}
        </Text>
      </View>
      <View style={styles.pathProgressTrack}>
        <View style={[styles.pathProgressFill, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.pathEvaluationTitle}>{current.prompt}</Text>
      <Text style={styles.aptitudeQuestionDisplay}>{current.display}</Text>
      <View style={styles.choiceList}>
        {current.choices.map((choice) => {
          const isSelected = selected === choice;
          const isCorrect = choice === current.answer;
          return (
            <Pressable
              key={choice}
              disabled={!!selected}
              onPress={() => answer(choice)}
              style={[
                styles.choice,
                selected && isCorrect && styles.choiceCorrect,
                selected && isSelected && !isCorrect && styles.choiceWrong,
              ]}
            >
              <Text style={styles.choiceText}>{choice}</Text>
            </Pressable>
          );
        })}
      </View>
      {!!selected && (
        <View style={styles.feedback}>
          <Text style={styles.feedbackTitle}>{selected === current.answer ? 'Correct' : 'A analyser'}</Text>
          <Text style={styles.feedbackText}>Reponse attendue : {current.answer}</Text>
          <Text style={styles.feedbackText}>{current.explanation}</Text>
          <Pressable style={styles.pathActionButton} onPress={next}>
            <Text style={styles.pathActionText}>{currentIndex + 1 >= questions.length ? 'Voir le rapport' : 'Question suivante'}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function buildAptitudeReport(questions: AptitudeQuestion[], answers: Record<string, string>) {
  const completed = questions.filter((question) => answers[question.id]);
  const totalCorrect = completed.filter((question) => answers[question.id] === question.answer).length;
  const score = completed.length ? Math.round((totalCorrect / completed.length) * 100) : 0;
  const domains = Array.from(new Set(questions.map((question) => question.domain)));
  const domainRows = domains.map((domain) => {
    const domainQuestions = questions.filter((question) => question.domain === domain);
    const correct = domainQuestions.filter((question) => answers[question.id] === question.answer).length;
    const rate = Math.round((correct / domainQuestions.length) * 100);
    return {
      domain,
      correct,
      total: domainQuestions.length,
      rate,
      comment: getAptitudeDomainComment(domain, rate),
    };
  });
  const weak = domainRows.filter((row) => row.rate < 67).sort((a, b) => a.rate - b.rate);
  const strong = domainRows.filter((row) => row.rate >= 67).sort((a, b) => b.rate - a.rate);
  const level3 = questions.filter((question) => question.level === 3);
  const level3Rate = Math.round(
    (level3.filter((question) => answers[question.id] === question.answer).length / Math.max(1, level3.length)) * 100
  );
  const globalLabel = score >= 85 ? 'Profil N5 avance' : score >= 65 ? 'Profil N5 en construction' : 'Profil N5 a consolider';
  const summary =
    level3Rate >= 70
      ? 'Le niveau difficile tient correctement : l utilisateur peut travailler avec des exercices mixtes et des corrections fines.'
      : score >= 65
        ? 'Les bases existent, mais les questions mixtes montrent encore des fragilites. Le parcours doit renforcer les domaines faibles avant les tests blancs.'
        : 'Le diagnostic indique qu il faut securiser les fondations avant de viser la vitesse ou les examens blancs.';
  const strengths = strong.length
    ? strong.map((row) => `${formatAptitudeDomain(row.domain)} : acquis exploitable, a entretenir par rappels courts.`)
    : ['Aucun domaine n est encore stable : commencer par kana et vocabulaire de base.'];
  const priorities = weak.length
    ? weak.map((row) => `${formatAptitudeDomain(row.domain)} : priorite d apprentissage, viser au moins 70% avant de monter de niveau.`)
    : ['Continuer les questions difficiles et les examens blancs pour detecter les erreurs rares.'];
  const maintenance = strong.length
    ? strong.slice(0, 3).map((row) => `${formatAptitudeDomain(row.domain)} : ne pas abandonner, 5 minutes de rappel regulier evitent l oubli.`)
    : ['Revoir les bases chaque jour pour creer une memoire stable.'];
  const estimatedLevel = getAptitudeEstimatedLevel(score, level3Rate);
  const levelAdvice = getAptitudeLevelAdvice(score, level3Rate);
  const difficultyAdvice =
    level3Rate >= 70
      ? 'Bonne resistance : tu peux integrer des questions mixtes.'
      : level3Rate >= 40
        ? 'Resistance moyenne : alterner bases et pieges N5.'
        : 'Resistance fragile : consolider avant les examens blancs.';
  const recommendedModules = buildRecommendedAptitudeModules(weak, strong);
  const sevenDayPlan = buildAptitudeSevenDayPlan(weak, strong);
  const thirtyDayPlan = buildAptitudeThirtyDayPlan(weak, strong, score);
  return {
    score,
    globalLabel,
    summary,
    domainRows,
    strengths,
    priorities,
    maintenance,
    estimatedLevel,
    levelAdvice,
    level3Rate,
    difficultyAdvice,
    recommendedModules,
    sevenDayPlan,
    thirtyDayPlan,
  };
}

function formatAptitudeDomain(domain: AptitudeDomain): string {
  if (domain === 'kana') return 'Kana';
  if (domain === 'orthographe') return 'Orthographe kana';
  if (domain === 'vocabulaire') return 'Vocabulaire';
  if (domain === 'kanji') return 'Kanji';
  if (domain === 'grammaire') return 'Grammaire';
  return 'Comprehension';
}

function getAptitudeDomainComment(domain: AptitudeDomain, rate: number): string {
  const label = formatAptitudeDomain(domain);
  if (rate >= 85) return `${label} solide : tu peux garder ce domaine en entretien.`;
  if (rate >= 67) return `${label} correct mais fragile : continuer les rappels et les questions mixtes.`;
  if (rate >= 34) return `${label} instable : il faut renforcer avant de passer aux exercices rapides.`;
  return `${label} prioritaire : reprendre les bases et refaire le diagnostic apres entrainement.`;
}

function getAptitudeEstimatedLevel(score: number, level3Rate: number): string {
  if (score >= 85 && level3Rate >= 70) return 'N5 avance';
  if (score >= 70 && level3Rate >= 45) return 'N5 intermediaire';
  if (score >= 55) return 'N5 debutant solide';
  if (score >= 35) return 'N5 debutant fragile';
  return 'Fondations a reprendre';
}

function getAptitudeLevelAdvice(score: number, level3Rate: number): string {
  if (score >= 85 && level3Rate >= 70) return 'Priorite aux examens blancs, corrections fines et maintien SRS.';
  if (score >= 70) return 'Bon socle : renforcer les domaines faibles avant de monter la vitesse.';
  if (score >= 55) return 'Bases presentes : travailler chaque jour les erreurs et phrases mixtes simples.';
  return 'Reprendre les fondations : kana, mots essentiels et particules avant les tests longs.';
}

function buildRecommendedAptitudeModules(
  weak: Array<{ domain: AptitudeDomain; rate: number }>,
  strong: Array<{ domain: AptitudeDomain; rate: number }>
): string[] {
  const domains = weak.length ? weak.map((row) => row.domain) : strong.slice(0, 2).map((row) => row.domain);
  const modules = domains.map((domain) => {
    if (domain === 'kana' || domain === 'orthographe') return 'Hiragana, katakana et sons combines : automatiser la lecture.';
    if (domain === 'vocabulaire') return 'Vocabulaire N5 priorise : revoir les mots rates avec le SRS.';
    if (domain === 'kanji') return 'Kanji N5 essentiels : sens francais puis lecture japonaise.';
    if (domain === 'grammaire') return 'Grammaire N5 operationnelle : particules et formes de phrase.';
    return 'Lecture et integration : phrases mixtes avec correction mot par mot.';
  });
  return Array.from(new Set(modules)).slice(0, 3);
}

function buildAptitudeSevenDayPlan(
  weak: Array<{ domain: AptitudeDomain; rate: number }>,
  strong: Array<{ domain: AptitudeDomain; rate: number }>
): string[] {
  const mainWeak = weak[0]?.domain ?? 'kana';
  const secondWeak = weak[1]?.domain ?? 'vocabulaire';
  const keep = strong[0]?.domain ?? 'grammaire';
  return [
    `Jours 1-2 : renforcer ${formatAptitudeDomain(mainWeak)} avec des sessions courtes et correction immediate.`,
    `Jours 3-4 : travailler ${formatAptitudeDomain(secondWeak)} puis refaire les erreurs en SRS.`,
    `Jour 5 : quiz mixte lent, objectif comprehension avant vitesse.`,
    `Jour 6 : entretien ${formatAptitudeDomain(keep)} pour ne pas perdre les acquis.`,
    'Jour 7 : mini diagnostic de controle et lecture du rapport.',
  ];
}

function buildAptitudeThirtyDayPlan(
  weak: Array<{ domain: AptitudeDomain; rate: number }>,
  strong: Array<{ domain: AptitudeDomain; rate: number }>,
  score: number
): string[] {
  const priority = weak[0]?.domain ?? 'comprehension';
  const support = weak[1]?.domain ?? 'grammaire';
  const maintenance = strong[0]?.domain ?? 'kana';
  const examTarget = score >= 70 ? 'examens blancs progressifs' : 'quiz mixtes courts avant examen blanc';
  return [
    `Semaine 1 : securiser ${formatAptitudeDomain(priority)} jusqu a 70%.`,
    `Semaine 2 : consolider ${formatAptitudeDomain(support)} avec explications detaillees.`,
    `Semaine 3 : integrer ${formatAptitudeDomain(priority)} + ${formatAptitudeDomain(support)} dans des phrases completes.`,
    `Semaine 4 : ${examTarget}, puis plan de correction personnalise.`,
    `Chaque semaine : 2 rappels ${formatAptitudeDomain(maintenance)} pour eviter l oubli.`,
  ];
}

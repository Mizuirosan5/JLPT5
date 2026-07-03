import type { LearningPathStage, MasteryDomainStats } from '../models';
import { clampProgress, masteryProgress } from './progress';

export function buildLearningPathStages(
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

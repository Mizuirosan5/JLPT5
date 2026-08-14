import type { LearningPathStage, LearningPathSubStep, MasteryDomainStats } from '../models';
import { clampProgress, masteryProgress } from './progress';

const SUB_STEP_TEMPLATES = [
  {
    suffix: 'A',
    title: 'Decouverte',
    objective: 'Comprendre le bloc et commencer a le reconnaitre.',
    requirement: 'Atteindre 34% de progression sur ce module.',
    start: 0,
    end: 34,
  },
  {
    suffix: 'B',
    title: 'Consolidation',
    objective: 'Repondre avec moins d hesitation et corriger les erreurs.',
    requirement: 'Atteindre 67% de progression, avec les erreurs les plus frequentes retravaillees.',
    start: 34,
    end: 67,
  },
  {
    suffix: 'C',
    title: 'Validation',
    objective: 'Atteindre une maitrise stable avant de passer a la suite.',
    requirement: 'Atteindre 95% de progression pour valider le module et debloquer la suite.',
    start: 67,
    end: 100,
  },
];

const STAGE_DETAILS: Record<
  string,
  { detail: string; checkpoints: string[]; prerequisites: string[]; successCriteria: string[]; nextActionHint: string }
> = {
  start: {
    detail: 'Ce module sert a creer ton profil de depart avec un seul vrai test en trois niveaux. Il mesure les bases, les automatismes et les questions difficiles pour identifier les forces, les fragilites et les priorites de travail.',
    checkpoints: ['Terminer le niveau 1 sur les bases N5', 'Terminer le niveau 2 sur les confusions courantes', 'Terminer le niveau 3 sur les questions difficiles', 'Lire le rapport et les axes d apprentissage'],
    prerequisites: ['Aucun prerequis : ce module sert a calibrer ton niveau.'],
    successCriteria: ['30 reponses de diagnostic terminees', 'Rapport consulte', 'Premiers points faibles identifies'],
    nextActionHint: 'Commence par le test d aptitude pour que le coach sache quoi prioriser.',
  },
  hiragana: {
    detail: 'Tu dois reconnaitre les hiragana sans chercher longuement. Le but est de lire les sons de base, les mots simples et les consignes N5.',
    checkpoints: ['Reconnaitre chaque caractere', 'Associer hiragana et romaji', 'Revoir les kana confondus jusqu a stabilisation'],
    prerequisites: ['Avoir termine le demarrage intelligent.'],
    successCriteria: ['Hiragana de base reconnus', 'Confusions marquees a revoir', 'Lecture sans hesitation excessive'],
    nextActionHint: 'Travaille les cartes hiragana puis fais un exercice kana court.',
  },
  katakana: {
    detail: 'Tu dois lire les katakana courants, surtout les mots d origine etrangere et les noms propres qui apparaissent souvent dans les exercices.',
    checkpoints: ['Reconnaitre les caracteres de base', 'Distinguer les formes proches', 'Lire des petits mots sans hesitation'],
    prerequisites: ['Hiragana suffisamment solides pour ne pas melanger les deux systemes.'],
    successCriteria: ['Katakana de base reconnus', 'Paires proches distinguees', 'Mots courts lus sans blocage'],
    nextActionHint: 'Passe en mode katakana et cible les caracteres jamais vus ou fragiles.',
  },
  combined: {
    detail: 'Tu dois automatiser les sons combines comme kya, shu, cho. C est indispensable pour lire plus vite et eviter les confusions.',
    checkpoints: ['Identifier les combinaisons', 'Lire sans decomposer lentement', 'Reussir les associations kana/romaji'],
    prerequisites: ['Hiragana et katakana de base en cours de stabilisation.'],
    successCriteria: ['Sons combines reconnus', 'Allongements et petits kana compris', 'Lecture plus fluide en quiz'],
    nextActionHint: 'Active les sons combines dans les exercices kana.',
  },
  'kana-arcade': {
    detail: 'Tu passes de la connaissance lente au reflexe. Le module mesure vitesse, series et regularite sur les kana.',
    checkpoints: ['Faire plusieurs sessions chronometrees', 'Reduire les erreurs recurrentes', 'Stabiliser une bonne serie'],
    prerequisites: ['Kana de base et sons combines suffisamment familiers.'],
    successCriteria: ['Series plus longues', 'Temps de reponse plus court', 'Erreurs recurrentes en baisse'],
    nextActionHint: 'Fais une session chrono courte, puis revois uniquement les erreurs.',
  },
  vocabulary: {
    detail: 'Tu construis le socle lexical N5. Les mots doivent etre reconnus en japonais et compris en francais, avec rappel des erreurs.',
    checkpoints: ['Reconnaitre le mot japonais', 'Comprendre le sens principal', 'Revoir les mots marques faibles'],
    prerequisites: ['Lecture kana assez stable pour lire les mots sans deviner.'],
    successCriteria: ['Mots prioritaires connus', 'Mots rates ajoutes au SRS', 'Sens reconnu sans traduction mot a mot'],
    nextActionHint: 'Travaille les cartes vocabulaire, puis fais un quiz vocab court.',
  },
  grammar: {
    detail: 'Tu travailles les structures N5 : particules, formes verbales, phrases simples et intentions de communication.',
    checkpoints: ['Comprendre la regle', 'Identifier la bonne forme dans une phrase', 'Savoir pourquoi la reponse est correcte'],
    prerequisites: ['Kana lisibles et premier vocabulaire de base.'],
    successCriteria: ['Particules principales comprises', 'Corrections lues', 'Erreurs de regle en baisse'],
    nextActionHint: 'Ouvre une lecon courte puis fais les exercices associes.',
  },
  kanji: {
    detail: 'Tu apprends a reconnaitre les kanji N5 par sens et par lecture. Le but est de ne pas bloquer en lecture ou dans les quiz.',
    checkpoints: ['Reconnaitre le kanji seul', 'Associer le sens francais', 'Associer au moins une lecture japonaise utile'],
    prerequisites: ['Kana stables et vocabulaire de base en construction.'],
    successCriteria: ['Kanji reconnus visuellement', 'Lectures utiles consultees', 'Cartes faibles marquees a revoir'],
    nextActionHint: 'Commence par kanji vers francais, puis passe a kanji vers japonais.',
  },
  integration: {
    detail: 'Tu melanges kana, vocabulaire, grammaire et kanji. C est le passage entre exercices separes et vraies questions JLPT.',
    checkpoints: ['Lire une phrase complete', 'Comprendre le role des mots et particules', 'Repondre sans isoler un seul domaine'],
    prerequisites: ['Bases kana, vocabulaire, grammaire et kanji deja amorcees.'],
    successCriteria: ['Questions mixtes tentees', 'Corrections mot par mot consultees', 'Faiblesses reliees a des modules'],
    nextActionHint: 'Lance un quiz mixte et analyse chaque erreur.',
  },
  'mock-exam': {
    detail: 'Tu t entraines en condition examen. Le but est de gerer le temps, la fatigue et les questions melangees.',
    checkpoints: ['Terminer une session', 'Analyser les erreurs', 'Rejouer pour ameliorer le score global'],
    prerequisites: ['Parcours de lecture integree deja avance.'],
    successCriteria: ['Session terminee', 'Erreurs classees', 'Plan de correction lance'],
    nextActionHint: 'Fais un test blanc quand les modules precedents ne sont plus verrouilles.',
  },
};

function buildSubSteps(stage: Omit<LearningPathStage, 'status'>, stageStatus: LearningPathStage['status']): LearningPathSubStep[] {
  return SUB_STEP_TEMPLATES.map((template) => {
    const progress = Math.max(0, Math.min(100, Math.round(((stage.progress - template.start) / (template.end - template.start)) * 100)));
    const status: LearningPathSubStep['status'] =
      stageStatus === 'locked'
        ? 'locked'
        : stage.progress >= template.end
          ? 'done'
          : stage.progress >= template.start
            ? 'active'
            : 'locked';
    return {
      id: `${stage.id}-${template.suffix.toLowerCase()}`,
      code: `${stage.order}${template.suffix}`,
      title: template.title,
      objective: template.objective,
      requirement: template.requirement,
      progress,
      status,
    };
  });
}

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
      screen: 'aptitudeTest',
      actionLabel: 'Lancer le diagnostic',
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
    return {
      ...stage,
      ...STAGE_DETAILS[stage.id],
      status,
      lockedReason: status === 'locked' ? getLockedReason(rawStages, stage.order) : undefined,
      subSteps: buildSubSteps(stage, status),
    };
  });
}

function getLockedReason(stages: Omit<LearningPathStage, 'status'>[], order: number): string {
  const previous = stages[order - 2];
  if (!previous) return 'Ce module sera debloque apres le module precedent.';
  return `A debloquer apres "${previous.title}" : vise 95% sur ce module precedent.`;
}

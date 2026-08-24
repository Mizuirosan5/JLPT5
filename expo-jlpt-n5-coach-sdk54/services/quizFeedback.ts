import { hasJapaneseText } from './text';

export type QuizFeedbackInsight = {
  title: string;
  detail: string;
};

export type WrongAnswerExplanations = Record<string, string>;

export function buildQuizFeedbackInsights({
  selectedAnswer,
  expectedAnswer,
  explanation,
  japanese,
  translation,
  wrongAnswerExplanations,
}: {
  selectedAnswer: string;
  expectedAnswer: string;
  explanation?: string | null;
  japanese?: string | null;
  translation?: string | null;
  wrongAnswerExplanations?: WrongAnswerExplanations | null;
}): QuizFeedbackInsight[] {
  const wrong = normalizeFeedbackText(selectedAnswer) !== normalizeFeedbackText(expectedAnswer);
  const sourceHasJapanese = hasJapaneseText(japanese ?? '') || hasJapaneseText(expectedAnswer);

  if (!wrong) {
    return [
      {
        title: 'Reflexe a garder',
        detail: sourceHasJapanese
          ? 'Bonne reponse. Relis quand meme la phrase japonaise et clique les mots fragiles pour fixer lecture, sens et usage.'
          : 'Bonne reponse. Garde le meme raisonnement sur la prochaine question, sans repondre uniquement par intuition.',
      },
    ];
  }

  const insights: QuizFeedbackInsight[] = [
    {
      title: 'Erreur reperee',
      detail: `Tu as choisi "${selectedAnswer}". La reponse attendue est "${expectedAnswer}". Compare les deux avant de passer a la suite.`,
    },
  ];

  if (explanation?.trim()) {
    insights.push({
      title: 'Regle utile',
      detail: explanation.trim(),
    });
  }

  const wrongExplanation = findWrongAnswerExplanation(selectedAnswer, wrongAnswerExplanations);
  if (wrongExplanation) {
    insights.push({
      title: 'Pourquoi ce choix bloque',
      detail: wrongExplanation,
    });
  }

  const trap = detectKnownTrap(selectedAnswer, expectedAnswer, japanese);
  if (trap) {
    insights.push({
      title: 'Piege detecte',
      detail: trap,
    });
  }

  if (translation?.trim()) {
    insights.push({
      title: 'Sens global',
      detail: `La phrase veut dire : ${translation.trim()}`,
    });
  }

  insights.push({
    title: 'Action immediate',
    detail: sourceHasJapanese
      ? 'Clique les mots japonais ou les kanji inconnus dans la correction, puis ajoute-les aux revisions si besoin.'
      : 'Refais mentalement la question avec la bonne reponse, puis enchaine une question du meme domaine.',
  });

  return insights;
}

function normalizeFeedbackText(value: string): string {
  return value.trim().toLowerCase();
}

function findWrongAnswerExplanation(
  selectedAnswer: string,
  wrongAnswerExplanations?: WrongAnswerExplanations | null
): string | null {
  if (!wrongAnswerExplanations) return null;
  const direct = wrongAnswerExplanations[selectedAnswer];
  if (direct?.trim()) return direct.trim();
  const selected = normalizeFeedbackText(selectedAnswer);
  const match = Object.entries(wrongAnswerExplanations).find(([choice]) => normalizeFeedbackText(choice) === selected);
  return match?.[1]?.trim() || null;
}

function detectKnownTrap(selectedAnswer: string, expectedAnswer: string, japanese?: string | null): string | null {
  const selected = normalizeFeedbackText(selectedAnswer);
  const expected = normalizeFeedbackText(expectedAnswer);
  const particles = new Set(['は', 'が', 'を', 'に', 'で', 'へ', 'と', 'も', 'の', 'か']);
  if (particles.has(selected) && particles.has(expected)) {
    return getParticleTrapDetail(selectedAnswer, expectedAnswer);
  }
  if (selected.includes('romaji') || expected.includes('romaji')) {
    return 'Attention a ne pas remplacer la lecture par le sens : separe toujours son, ecriture et traduction.';
  }
  if (japanese && hasJapaneseText(japanese) && selected.length > 0 && expected.length > 0 && selected[0] === expected[0]) {
    return 'Les deux reponses se ressemblent au debut : relis la fin du mot et la fonction grammaticale avant de valider.';
  }
  return null;
}

function getParticleTrapDetail(selectedAnswer: string, expectedAnswer: string): string {
  if (expectedAnswer === 'は') return 'Ici on attend le theme de la phrase. は cadre le sujet de conversation, meme s il se prononce wa.';
  if (expectedAnswer === 'が') return 'Ici on attend le sujet grammatical ou une information mise en avant. が pointe ce qui existe, aime ou fait l action.';
  if (expectedAnswer === 'を') return 'Ici on attend l objet direct : ce qui est mange, bu, lu, achete ou fait.';
  if (expectedAnswer === 'に') return 'Ici on attend un point precis : heure, destination d arrivee, existence ou cible.';
  if (expectedAnswer === 'で') return 'Ici on attend le lieu de l action ou le moyen utilise pour faire quelque chose.';
  if (expectedAnswer === 'へ') return 'Ici on attend une direction generale, souvent avec aller, venir ou rentrer.';
  if (expectedAnswer === 'と') return 'Ici on attend un lien complet : avec quelqu un, ou A et B dans une liste fermee.';
  if (expectedAnswer === 'も') return 'Ici on attend aussi. も remplace souvent は pour ajouter une information similaire.';
  return `Tu as choisi ${selectedAnswer}, mais la particule attendue est ${expectedAnswer}. Repars de la fonction exacte dans la phrase.`;
}

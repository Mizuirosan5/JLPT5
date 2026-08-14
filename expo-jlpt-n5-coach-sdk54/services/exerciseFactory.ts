import type { ExerciseFormat, GlobalQuizFormat, GlobalQuizMode } from '../models';
import { shuffle } from './random';

export type ExerciseChoiceOptions = {
  correctAnswer: string;
  alternatives: string[];
  direct?: boolean;
};

export function getExerciseFormat(mode: GlobalQuizMode, format: GlobalQuizFormat): ExerciseFormat {
  if (mode === 'direct_input') return 'direct_input';
  if (mode === 'matching') return 'matching';
  if (mode === 'question_answer') return 'reverse';
  if (format === 'grammar_blank') return 'blank';
  if (format === 'grammar_translation' || format === 'grammar_situation') return 'word_order';
  return 'qcm';
}

export function buildExerciseChoices({ correctAnswer, alternatives, direct }: ExerciseChoiceOptions): string[] {
  if (direct) return [];
  const clean = [correctAnswer, ...alternatives]
    .map((choice) => choice.trim())
    .filter(Boolean);
  const unique = Array.from(new Set(clean));
  const distractors = unique.filter((choice) => choice !== correctAnswer);
  return shuffle([correctAnswer, ...shuffle(distractors).slice(0, 3)]).filter(Boolean);
}

export function buildWordOrderDisplay(sentence: string): string {
  const tokens = sentence
    .replace(/[。！？!?]/g, '')
    .split(/[\s、,]+/)
    .map((token) => token.trim())
    .filter(Boolean);
  if (tokens.length < 3) return sentence;
  return shuffle(tokens).join(' / ');
}

export function getExerciseInstruction(format: ExerciseFormat): string {
  if (format === 'direct_input') return 'Ecris la reponse exacte.';
  if (format === 'reverse') return 'Pars de l indice et retrouve la reponse japonaise.';
  if (format === 'matching') return 'Relie chaque element a sa correspondance.';
  if (format === 'blank') return 'Complete le trou avec la forme correcte.';
  if (format === 'word_order') return 'Remets mentalement les elements dans le bon ordre.';
  return 'Choisis la bonne reponse.';
}

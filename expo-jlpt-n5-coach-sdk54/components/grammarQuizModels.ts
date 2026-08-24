import type {
  GrammarMatchingSession,
  GrammarQuizMode,
  GrammarQuizSession,
  KnowledgeQuizScope,
  MainQuizMode,
  WordLookupEntry,
} from '../models';
import type { CurriculumCode } from '../data/curriculum';

export type GrammarQuizSnapshot = {
  mode: GrammarQuizMode;
  size: 10 | 20;
  quizSession: GrammarQuizSession | null;
  matchingSession: GrammarMatchingSession | null;
  curriculumCode?: CurriculumCode;
};

export type GrammarQuizScreenProps = {
  vocabularyLookupEntries: WordLookupEntry[];
  onNavigate: (mode: MainQuizMode, scope?: KnowledgeQuizScope) => void;
};

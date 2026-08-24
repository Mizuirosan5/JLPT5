import type {
  GrammarMatchingSession,
  GrammarQuizMode,
  GrammarQuizSession,
  KnowledgeQuizScope,
  MainQuizMode,
  WordLookupEntry,
} from '../models';

export type GrammarQuizSnapshot = {
  mode: GrammarQuizMode;
  size: 10 | 20;
  quizSession: GrammarQuizSession | null;
  matchingSession: GrammarMatchingSession | null;
};

export type GrammarQuizScreenProps = {
  vocabularyLookupEntries: WordLookupEntry[];
  onNavigate: (mode: MainQuizMode, scope?: KnowledgeQuizScope) => void;
};

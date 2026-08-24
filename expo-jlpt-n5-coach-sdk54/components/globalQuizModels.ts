import type {
  GlobalMatchingSession,
  GlobalQuizMode,
  GlobalQuizSession,
  KanaCard,
  KanjiItem,
  KnowledgeQuizScope,
  MainQuizMode,
  WordLookupEntry,
} from '../models';
import type { KanjiAnswerTarget } from '../services/globalQuizFactory';

export type GlobalQuizSnapshot = {
  scope: KnowledgeQuizScope;
  mode: GlobalQuizMode;
  size: 10 | 20;
  quizSession: GlobalQuizSession | null;
  matchingSession: GlobalMatchingSession | null;
  kanjiAnswerTarget: KanjiAnswerTarget;
};

export type GlobalQuizScreenProps = {
  initialScope: KnowledgeQuizScope;
  kanaArcadeCards: KanaCard[];
  vocabularyLookupEntries: WordLookupEntry[];
  globalKanjiItems: KanjiItem[];
  onNavigate: (mode: MainQuizMode, scope?: KnowledgeQuizScope) => void;
};

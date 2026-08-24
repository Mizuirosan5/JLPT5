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
import type { CurriculumCode } from '../data/curriculum';

export type GlobalQuizSnapshot = {
  scope: KnowledgeQuizScope;
  mode: GlobalQuizMode;
  size: 10 | 20;
  quizSession: GlobalQuizSession | null;
  matchingSession: GlobalMatchingSession | null;
  kanjiAnswerTarget: KanjiAnswerTarget;
  curriculumCode?: CurriculumCode;
};

export type GlobalQuizScreenProps = {
  initialScope: KnowledgeQuizScope;
  kanaArcadeCards: KanaCard[];
  vocabularyLookupEntries: WordLookupEntry[];
  globalKanjiItems: KanjiItem[];
  curriculumCode: CurriculumCode;
  onNavigate: (mode: MainQuizMode, scope?: KnowledgeQuizScope) => void;
};

import type { AudioPackItem, AudioQuizMode, AudioQuizQuestion, AudioQuizSession, WordLookupEntry } from '../models';
import { CORE_AUDIO_PACK } from '../data/audioPack';
import { IMMERSION_TEXTS } from '../data/immersionTexts';
import { STORY_LESSONS } from '../data/storyLessons';
import { ALL_GRAMMAR_LESSONS } from './grammarCourse';
import { buildExerciseChoices } from './exerciseFactory';
import { shuffle } from './random';
import { filterGrammarForCurriculum, getJapaneseTextCurriculumCode, getCurriculumIndex, isCurriculumAccessible } from './curriculum';
import type { CurriculumCode } from '../data/curriculum';

const MAX_DYNAMIC_VOCABULARY = 120;
const MAX_DYNAMIC_GRAMMAR = 60;
const MAX_DYNAMIC_STORIES = 90;
const MAX_DYNAMIC_IMMERSION = 60;

export function buildEmbeddedAudioPack(vocabulary: WordLookupEntry[] = [], currentCode: CurriculumCode = '10C'): AudioPackItem[] {
  const vocabularyItems = vocabulary
    .filter((item, index, list) =>
      Boolean(item.meaning_fr && (item.kanji || item.japanese || item.kana)) &&
      list.findIndex((candidate) => (candidate.kanji || candidate.japanese || candidate.kana) === (item.kanji || item.japanese || item.kana)) === index
    )
    .slice(0, MAX_DYNAMIC_VOCABULARY)
    .map<AudioPackItem>((item) => ({
      id: `vocabulary-${item.id}`,
      category: 'vocabulary',
      japanese: item.kanji || item.japanese || item.kana || '',
      kana: item.kana || item.japanese,
      romaji: item.romaji,
      meaningFr: item.meaning_fr,
      promptFr: `Mot N5 : ${item.meaning_fr}`,
      assetKind: 'tts_local',
    }));

  const grammarItems = filterGrammarForCurriculum(ALL_GRAMMAR_LESSONS, currentCode).flatMap((lesson) =>
    lesson.examples.slice(0, 1).map<AudioPackItem>((example) => ({
      id: `grammar-${lesson.id}-${example.id}`,
      category: 'grammar',
      japanese: example.kanji || example.kana,
      kana: example.kana,
      romaji: example.romaji,
      meaningFr: example.fr,
      promptFr: `Phrase de grammaire : ${lesson.title}`,
      assetKind: 'tts_local',
    }))
  ).slice(0, MAX_DYNAMIC_GRAMMAR);

  const storyItems = STORY_LESSONS.flatMap((story) =>
    story.lines.map<AudioPackItem>((line, index) => ({
      id: `story-${story.id}-${index}`,
      category: 'story',
      japanese: line.japanese,
      kana: line.kana,
      meaningFr: line.translationFr,
      promptFr: `Dialogue : ${story.title}`,
      assetKind: 'tts_local',
    }))
  ).slice(0, MAX_DYNAMIC_STORIES);

  const immersionItems = IMMERSION_TEXTS.map<AudioPackItem>((text) => ({
    id: `immersion-${text.id}`,
    category: 'immersion',
    japanese: text.japanese,
    kana: text.kana,
    meaningFr: text.translationFr,
    promptFr: `Ecoute en contexte : ${text.title}`,
    assetKind: 'tts_local',
  })).slice(0, MAX_DYNAMIC_IMMERSION);

  const coreItems = CORE_AUDIO_PACK.filter((item) => isAudioItemAccessible(item, currentCode));
  return dedupeAudioItems([
    ...coreItems,
    ...vocabularyItems,
    ...grammarItems,
    ...(getCurriculumIndex(currentCode) >= getCurriculumIndex('9A') ? storyItems.filter((item) => isAudioItemAccessible(item, currentCode)) : []),
    ...(getCurriculumIndex(currentCode) >= getCurriculumIndex('10A') ? immersionItems.filter((item) => isAudioItemAccessible(item, currentCode)) : []),
  ]);
}

export function buildAudioQuizQuestions(
  vocabulary: WordLookupEntry[],
  size: 10 | 20,
  mode: AudioQuizMode,
  currentCode: CurriculumCode = '10C',
): AudioQuizQuestion[] {
  const pack = buildEmbeddedAudioPack(vocabulary, currentCode);
  const pool = shuffle(pack).slice(0, size);
  return pool.map((item, index) => {
    const correctAnswer = mode === 'listen_japanese' ? item.kana || item.japanese : item.meaningFr;
    const alternatives = pack
      .filter((candidate) => candidate.id !== item.id && candidate.category === item.category)
      .concat(pack.filter((candidate) => candidate.id !== item.id))
      .map((candidate) => (mode === 'listen_japanese' ? candidate.kana || candidate.japanese : candidate.meaningFr));
    const choices = buildExerciseChoices({ correctAnswer, alternatives });
    return {
      id: `audio-${mode}-${index}-${item.id}`,
      item,
      mode,
      prompt:
        mode === 'listen_japanese'
          ? 'Ecoute puis choisis la lecture japonaise entendue.'
          : 'Ecoute puis choisis le sens en francais.',
      correctAnswer,
      choices,
      explanation: `${item.japanese} se lit ${item.kana}${item.romaji ? ` (${item.romaji})` : ''}. Sens : ${item.meaningFr}`,
    };
  });
}

function isAudioItemAccessible(item: AudioPackItem, currentCode: CurriculumCode): boolean {
  const writingCode = getJapaneseTextCurriculumCode(`${item.japanese} ${item.kana ?? ''}`);
  if (!writingCode || !isCurriculumAccessible(writingCode, currentCode)) return false;
  const categoryFloor: Partial<Record<AudioPackItem['category'], CurriculumCode>> = {
    greeting: '2C', number: '4A', classroom: '4C', daily: '5C', grammar: '6A', story: '9A', immersion: '10A',
  };
  const floor = categoryFloor[item.category] ?? '1A';
  return isCurriculumAccessible(floor, currentCode);
}

export function createAudioQuizSession(questions: AudioQuizQuestion[]): AudioQuizSession {
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
    startedAt: Date.now(),
  };
}

export function getAudioCategoryLabel(category: AudioPackItem['category']): string {
  if (category === 'kana') return 'Kana';
  if (category === 'number') return 'Nombres';
  if (category === 'greeting') return 'Salutations';
  if (category === 'classroom') return 'Classe';
  if (category === 'daily') return 'Vie quotidienne';
  if (category === 'vocabulary') return 'Vocabulaire';
  if (category === 'grammar') return 'Grammaire';
  if (category === 'story') return 'Dialogues';
  return 'Immersion';
}

function dedupeAudioItems(items: AudioPackItem[]): AudioPackItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.japanese}|${item.meaningFr}`.trim();
    if (!item.japanese || !item.meaningFr || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

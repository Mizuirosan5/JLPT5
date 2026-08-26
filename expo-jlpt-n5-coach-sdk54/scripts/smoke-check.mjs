import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const fail = (message) => {
  throw new Error(message);
};

const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));
const lineCount = (relativePath) => read(relativePath).split(/\r?\n/).length;

const requiredFiles = [
  'App.tsx',
  'appStyles.ts',
  'models.ts',
  'components/DashboardScreen.tsx',
  'components/ExamScreen.tsx',
  'components/AudioQuizScreen.tsx',
  'components/GlobalQuizScreen.tsx',
  'components/GrammarLessonsScreen.tsx',
  'components/GrammarQuizScreen.tsx',
  'components/JapaneseLookup.tsx',
  'components/KanaArcadeQuizScreen.tsx',
  'components/KanaScreen.tsx',
  'components/LearningPathScreen.tsx',
  'components/QuizScreen.tsx',
  'components/SmartCorrectionInsightCard.tsx',
  'components/VocabularyScreen.tsx',
  'services/database.ts',
  'services/curriculum.ts',
  'services/embeddedAudio.ts',
  'services/globalQuizFactory.ts',
  'services/grammarCourse.ts',
  'services/grammarPedagogy.ts',
  'services/grammarProgress.ts',
  'services/grammarQuizFactory.ts',
  'services/kanaArcade.ts',
  'services/kanaVisual.ts',
  'services/srsQueue.ts',
  'services/vocabulary.ts',
  'data/grammarLessons.ts',
  'data/curriculum.ts',
  'data/kanjiReadingCards.ts',
  'data/audioAssetRegistry.ts',
  'assets/audio/audio-pack-manifest.json',
  'scripts/sync-audio-registry.mjs',
  'scripts/validate-audio-pack.mjs',
  'docs/AUDIO_PACK_OFFLINE.md',
  'docs/CURRICULUM_PEDAGOGIQUE_N5.md',
  'scripts/audit-curriculum.ts',
  'data/kanaTables.ts',
  'dist/index.html',
  'dist/metadata.json',
];

for (const file of requiredFiles) {
  if (!exists(file)) fail(`Missing required file: ${file}`);
}

const appSource = read('App.tsx');
for (const screenImport of [
  'DashboardScreen',
  'LearningPathScreen',
  'KanaScreen',
  'VocabularyScreen',
  'GrammarLessonsScreen',
  'QuizScreen',
  'ExamScreen',
]) {
  if (!appSource.includes(screenImport)) fail(`App.tsx no longer references ${screenImport}`);
}
if (appSource.includes('CurriculumGate')) fail('Learning libraries must remain directly accessible from the first day');

const examSource = read('components/ExamScreen.tsx');
if (examSource.includes('examUnlocked') || examSource.includes('se débloque au niveau')) {
  fail('The JLPT exam must remain accessible independently of guided progression');
}

const lineBudgets = {
  'App.tsx': 120,
  'components/QuizScreen.tsx': 450,
  'components/GlobalQuizScreen.tsx': 700,
  'components/GrammarQuizScreen.tsx': 800,
  'components/KanaArcadeQuizScreen.tsx': 650,
};

for (const [file, maxLines] of Object.entries(lineBudgets)) {
  const count = lineCount(file);
  if (count > maxLines) fail(`${file} is ${count} lines; expected <= ${maxLines}`);
}

const databasePath = path.join(root, 'assets/database/jlpt_n5_mobile.db');
const databaseSize = fs.statSync(databasePath).size;
if (databaseSize < 10_000_000 || databaseSize > 25_000_000) {
  fail(`Database asset should be compact mobile DB around 10-25 MB: ${databaseSize} bytes`);
}

const examAssetDir = path.join(root, 'assets/exams/official_2012_questions');
const examPngCount = fs.readdirSync(examAssetDir).filter((name) => name.endsWith('.png')).length;
if (examPngCount < 60) fail(`Expected at least 60 exam PNG assets, found ${examPngCount}`);

const distFiles = fs.readdirSync(path.join(root, 'dist'));
if (!distFiles.includes('index.html')) fail('dist/index.html was not exported');

const distStaticDir = path.join(root, 'dist/_expo/static/js/web');
const webBundles = fs.readdirSync(distStaticDir).filter((name) => name.endsWith('.js'));
if (webBundles.length < 1) fail('No web JavaScript bundle found in dist');

const sourceDirs = ['components', 'services', 'data'];
const suspiciousTextPatterns = [
  /\?\? Quiz/,
  /pr\?tes/,
  /r\?ponse/,
  /entra\?nements/,
  /le\?ons/,
  /\?criture/,
  /d\?fi/,
  /termin\?es/,
  /Pr\?cision/,
  /compl\?tes/,
  /masqu\?/,
  /\uFFFD/,
];

const walk = (directory) => {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    if (!/\.(ts|tsx)$/.test(entry.name)) return [];
    return [fullPath];
  });
};

for (const directory of sourceDirs) {
  for (const file of walk(path.join(root, directory))) {
    const source = fs.readFileSync(file, 'utf8');
    if (/https?:\/\//.test(source) || /\bfetch\s*\(/.test(source)) {
      fail(`Runtime network dependency detected in ${path.relative(root, file)}`);
    }
  }
}

for (const sourceDir of sourceDirs) {
  for (const file of walk(path.join(root, sourceDir))) {
    const content = fs.readFileSync(file, 'utf8');
    for (const pattern of suspiciousTextPatterns) {
      if (pattern.test(content)) {
        fail(`Suspicious broken text pattern ${pattern} in ${path.relative(root, file)}`);
      }
    }
  }
}

const srsQueueSource = read('services/srsQueue.ts');
for (const requiredSrsToken of [
  'calculateSrsRiskScore',
  'getSrsReviewReason',
  'markSrsQueueItemKnown',
  'postponeSrsQueueItem',
  'reviewReason',
  'riskScore',
]) {
  if (!srsQueueSource.includes(requiredSrsToken)) fail(`SRS V2 token missing: ${requiredSrsToken}`);
}

const reviewScreenSource = read('components/ReviewQueueScreen.tsx');
for (const requiredReviewToken of [
  'Risque memoire',
  'Je connais deja',
  'Revoir plus tard',
  'srsReasonBox',
]) {
  if (!reviewScreenSource.includes(requiredReviewToken)) fail(`SRS V2 UI token missing: ${requiredReviewToken}`);
}

const quizFeedbackSource = read('services/quizFeedback.ts');
for (const requiredFeedbackToken of [
  'wrongAnswerExplanations',
  'Piege detecte',
  'detectKnownTrap',
  'Pourquoi ce choix bloque',
]) {
  if (!quizFeedbackSource.includes(requiredFeedbackToken)) fail(`Feedback V2 token missing: ${requiredFeedbackToken}`);
}

const grammarQuizSource = read('services/grammarQuizFactory.ts');
for (const requiredGrammarFeedbackToken of [
  'addGrammarWrongAnswerExplanations',
  'buildGrammarWrongAnswerExplanations',
]) {
  if (!grammarQuizSource.includes(requiredGrammarFeedbackToken)) fail(`Grammar feedback V2 token missing: ${requiredGrammarFeedbackToken}`);
}

const quickSessionSource = read('services/quickSession.ts');
if (!quickSessionSource.includes("q.question_origin != 'exam'")) {
  fail('Quick sessions must exclude image-dependent exam questions');
}

const curriculumSource = read('services/curriculum.ts');
for (const requiredCurriculumToken of [
  'loadCurriculumProfile',
  'filterQuestionsForCurriculum',
  'filterGrammarForCurriculum',
  'applyDiagnosticCurriculumPlacement',
]) {
  if (!curriculumSource.includes(requiredCurriculumToken)) {
    fail(`Curriculum token missing: ${requiredCurriculumToken}`);
  }
}

const grammarLessonScreenSource = read('components/GrammarLessonsScreen.tsx');
if (!grammarLessonScreenSource.includes("buildGrammarQuizQuestions(grammarExerciseSize, 'arcade', guidedExerciseLessons)")) {
  fail('Grammar exercises must use the level-aware lesson pool');
}
const grammarQuizScreenSource = read('components/GrammarQuizScreen.tsx');
if (grammarQuizScreenSource.includes('createGrammarMatchingSession()')) {
  fail('Grammar matching replays must preserve the level-aware lesson pool');
}

const kanjiFlashcardsSource = read('components/KanjiFlashcardsSection.tsx');
for (const requiredKanjiViewerToken of [
  'cards.slice(0, 80)',
  'KanjiFullscreenViewer',
  'Ouvrir les ${deck.length} cartes kanji en plein écran',
  'reading.examples.map',
  'Retourner la carte kanji',
]) {
  if (!kanjiFlashcardsSource.includes(requiredKanjiViewerToken)) {
    fail(`Kanji fullscreen viewer token missing: ${requiredKanjiViewerToken}`);
  }
}
const kanjiDetailScreenSource = read('components/KanjiDetailScreen.tsx');
if (!kanjiDetailScreenSource.includes('<KanjiFlashcardsSection cards={kanjiCards} />')) {
  fail('The 80-card kanji deck must live in the Learn > Kanji screen');
}

console.log('Smoke check passed.');
console.log(`Database: ${(databaseSize / 1024 / 1024).toFixed(1)} MB`);
console.log(`Exam PNG assets: ${examPngCount}`);
console.log(`Web bundles: ${webBundles.length}`);

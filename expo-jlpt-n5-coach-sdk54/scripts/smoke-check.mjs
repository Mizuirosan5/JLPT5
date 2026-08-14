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
  'components/VocabularyScreen.tsx',
  'services/database.ts',
  'services/embeddedAudio.ts',
  'services/globalQuizFactory.ts',
  'services/grammarCourse.ts',
  'services/grammarPedagogy.ts',
  'services/grammarProgress.ts',
  'services/grammarQuizFactory.ts',
  'services/kanaArcade.ts',
  'services/kanaVisual.ts',
  'services/vocabulary.ts',
  'data/grammarLessons.ts',
  'data/audioAssetRegistry.ts',
  'assets/audio/audio-pack-manifest.json',
  'scripts/sync-audio-registry.mjs',
  'scripts/validate-audio-pack.mjs',
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
if (databaseSize < 50_000_000) fail(`Database asset looks too small: ${databaseSize} bytes`);

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

console.log('Smoke check passed.');
console.log(`Database: ${(databaseSize / 1024 / 1024).toFixed(1)} MB`);
console.log(`Exam PNG assets: ${examPngCount}`);
console.log(`Web bundles: ${webBundles.length}`);

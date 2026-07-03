import type { GrammarLesson, GrammarLessonExample, GrammarProgressSummary } from '../models';
import {
  CONSOLIDATED_GRAMMAR_LESSONS,
  GRAMMAR_LESSONS,
  GRAMMAR_MAIN_MENUS,
  SUPPLEMENTAL_GRAMMAR_LESSONS,
  VOCABULARY_ONLY_GRAMMAR_LESSON_ORDERS,
} from '../data/grammarLessons';

export { GRAMMAR_MAIN_MENUS };

export function humanizeGrammarPattern(lesson: GrammarLesson): string {
  const title = lesson.title;
  const pattern = lesson.pattern;
  if (title.includes('は') || pattern.includes(' は ')) return '[ce dont on parle] は [information] です';
  if (title.includes('が好き') || pattern.includes('好き')) return '[chose aimée] が 好きです';
  if (title.includes('が') || pattern.includes(' が ')) return '[qui / quoi exactement] が [ce qui arrive]';
  if (title.includes('を') || pattern.includes(' を ')) return '[chose touchée par l’action] を [action]';
  if (title.includes('に') || pattern.includes(' に ')) return '[moment / destination / cible] に [action ou existence]';
  if (title.includes('で') || pattern.includes(' で ')) return '[lieu de l’action / moyen] で [action]';
  if (title.includes('へ') || pattern.includes(' へ ')) return '[direction] へ [aller / venir / rentrer]';
  if (title.includes('の') || pattern.includes(' の ')) return '[mot qui précise] の [mot principal]';
  if (title.includes('も') || pattern.includes(' も')) return '[élément ajouté] も [même information]';
  if (title.includes('と :') || pattern.includes(' と ')) return '[nom 1] と [nom 2]';
  if (title.includes('や') || pattern.includes(' や ')) return '[exemple 1] や [exemple 2]';
  if (title.includes('か') || pattern.endsWith('か')) return '[phrase polie] か';
  if (pattern.includes('てください')) return '[action en forme て] + ください';
  if (pattern.includes('ています')) return '[action en forme て] + います';
  if (pattern.includes('てもいい')) return '[action en forme て] + もいいです';
  if (pattern.includes('てはいけません')) return '[action en forme て] + はいけません';
  if (pattern.includes('たい')) return '[verbe sans ます] + たいです';
  if (pattern.includes('ほしい')) return '[chose voulue] が ほしいです';
  if (pattern.includes('なければ')) return '[verbe en ない transformé] + なければなりません';
  if (pattern.includes('ことができます')) return '[action en forme dictionnaire] + ことができます';
  if (pattern.includes('たことがあります')) return '[action en forme た] + ことがあります';
  if (pattern.includes('前に')) return '[avant cette action / ce moment] + 前に';
  if (pattern.includes('後で')) return '[après cette action / ce moment] + 後で';
  if (pattern.includes('より')) return '[chose comparée] は [référence] より [qualité]';
  if (pattern.includes('一番')) return '[dans un groupe], [élément] が 一番 [qualité]';
  if (pattern.includes('から') || pattern.includes('ので')) return '[raison] から / ので [résultat]';
  if (pattern.includes('でも') || pattern.includes('けど') || pattern.includes('が')) return '[idée 1] mais [idée 2]';
  if (pattern.includes('と思います')) return '[ce que je pense] と 思います';
  if (pattern.includes('Nom') || pattern.includes('nom')) return pattern.replace(/Nom/g, '[nom]').replace(/nom/g, '[nom]');
  return pattern
    .replace(/\bA\b/g, '[élément A]')
    .replace(/\bB\b/g, '[élément B]')
    .replace(/Phrase/g, '[phrase]')
    .replace(/Verbe/g, '[verbe]')
    .replace(/Nom/g, '[nom]');
}

function normalizeGrammarLessonForTeacherCourse(lesson: GrammarLesson): GrammarLesson {
  const placement = getTeacherGrammarPlacement(lesson);
  const examples = ensureTeacherGrammarExamples(lesson);
  return {
    ...lesson,
    folder: placement.folder,
    subfolder: placement.subfolder,
    explanation: buildTeacherGrammarExplanation(lesson),
    examples,
  };
}

function getTeacherGrammarPlacement(lesson: GrammarLesson): { folder: string; subfolder: string } {
  const text = `${lesson.folder} ${lesson.subfolder} ${lesson.title} ${lesson.pattern}`.toLowerCase();
  const title = lesson.title;

  if (
    text.includes('présentation') ||
    text.includes('écriture') ||
    text.includes('hiragana') ||
    text.includes('katakana') ||
    text.includes('kanji dans une phrase') ||
    text.includes('glossaire grammatical') ||
    text.includes('vue d’ensemble')
  ) {
    return { folder: '01. Fondations JLPT N5', subfolder: 'Comprendre la langue' };
  }
  if (
    text.includes('question') ||
    text.includes('interrogatif') ||
    /誰|何|どこ|いつ|どう|なぜ|いくら|いくつ|どのくらい/.test(text) ||
    text.includes('これ') ||
    text.includes('それ') ||
    text.includes('あれ') ||
    text.includes('この') ||
    text.includes('その') ||
    text.includes('あの') ||
    text.includes('pronom') ||
    text.includes('démonstratif')
  ) {
    return { folder: '03. Phrase et questions', subfolder: 'Identifier et demander' };
  }
  if (
    text.includes('adjectif') ||
    text.includes('description') ||
    text.includes('comparaison') ||
    text.includes('superlatif') ||
    /高い|高くない|静かです|ほうが|一番/.test(text)
  ) {
    return { folder: '06. Adjectifs et descriptions', subfolder: 'Décrire et comparer' };
  }
  if (
    text.includes('connecteur') ||
    text.includes('cause') ||
    text.includes('opposition') ||
    text.includes('condition') ||
    text.includes('hypothèse') ||
    text.includes('but') ||
    text.includes('intention') ||
    /前に|後で|てから|たり/.test(text)
  ) {
    return { folder: '08. Connecteurs et logique', subfolder: 'Relier deux idées' };
  }
  if (
    text.includes('は') ||
    text.includes('が') ||
    text.includes('を') ||
    text.includes('に') ||
    text.includes('で') ||
    text.includes('へ') ||
    text.includes('の') ||
    text.includes('も') ||
    text.includes('particule') ||
    /^(は|が|を|に|で|へ|の|も|と|や|より|か)\s*[:：]/.test(title)
  ) {
    if (text.includes('fin de phrase') || text.includes('ね') || text.includes('よ')) {
      return { folder: '02. Particules', subfolder: 'Nuances de fin de phrase' };
    }
    if (text.includes('avancée') || text.includes('だけ') || text.includes('しか') || text.includes('まで') || text.includes('ほど')) {
      return { folder: '02. Particules', subfolder: 'Nuances et limites' };
    }
    return { folder: '02. Particules', subfolder: 'Particules essentielles' };
  }
  if (
    text.includes('question') ||
    text.includes('interrogatif') ||
    text.includes('これ') ||
    text.includes('それ') ||
    text.includes('あれ') ||
    text.includes('この') ||
    text.includes('その') ||
    text.includes('あの') ||
    text.includes('pronom') ||
    text.includes('démonstratif')
  ) {
    return { folder: '03. Phrase et questions', subfolder: 'Identifier et demander' };
  }
  if (
    text.includes('temps') ||
    text.includes('heure') ||
    text.includes('date') ||
    text.includes('jour') ||
    text.includes('mois') ||
    text.includes('saison') ||
    text.includes('nombre') ||
    text.includes('quantité') ||
    text.includes('compteur') ||
    text.includes('adverbe') ||
    text.includes('fréquence') ||
    text.includes('durée')
  ) {
    if (text.includes('adverbe') || text.includes('fréquence') || text.includes('durée')) {
      return { folder: '04. Temps, nombres et adverbes', subfolder: 'Fréquence, durée et manière' };
    }
    if (text.includes('heure') || text.includes('date') || text.includes('jour') || text.includes('mois') || text.includes('saison')) {
      return { folder: '04. Temps, nombres et adverbes', subfolder: 'Calendrier et heure' };
    }
    return { folder: '04. Temps, nombres et adverbes', subfolder: 'Nombres, quantités et compteurs' };
  }
  if (
    text.includes('verbe') ||
    text.includes('forme') ||
    text.includes('ます') ||
    text.includes('ない') ||
    text.includes('た') ||
    text.includes('て') ||
    text.includes('potentielle') ||
    text.includes('volitive') ||
    text.includes('passif') ||
    text.includes('causatif') ||
    text.includes('impératif') ||
    text.includes('transitif') ||
    text.includes('intransitif') ||
    text.includes('déplacement') ||
    text.includes('なる')
  ) {
    if (text.includes('déplacement') || text.includes('行く') || text.includes('来る') || text.includes('帰る')) {
      return { folder: '05. Verbes et formes', subfolder: 'Déplacement et actions utiles' };
    }
    if (text.includes('avance') || text.includes('passif') || text.includes('causatif') || text.includes('volitive') || text.includes('potentielle')) {
      return { folder: '05. Verbes et formes', subfolder: 'Formes à reconnaître progressivement' };
    }
    return { folder: '05. Verbes et formes', subfolder: 'Formes N5 prioritaires' };
  }
  if (text.includes('adjectif') || text.includes('description') || text.includes('comparaison') || text.includes('superlatif')) {
    return { folder: '06. Adjectifs et descriptions', subfolder: 'Décrire et comparer' };
  }
  if (
    text.includes('expression') ||
    text.includes('permission') ||
    text.includes('interdiction') ||
    text.includes('obligation') ||
    text.includes('désir') ||
    text.includes('capacité') ||
    text.includes('expérience') ||
    text.includes('interaction') ||
    text.includes('salutation')
  ) {
    return { folder: '07. Expressions utiles', subfolder: 'Situations du quotidien' };
  }
  if (
    text.includes('connecteur') ||
    text.includes('cause') ||
    text.includes('opposition') ||
    text.includes('condition') ||
    text.includes('hypothèse') ||
    text.includes('but') ||
    text.includes('intention')
  ) {
    return { folder: '08. Connecteurs et logique', subfolder: 'Relier deux idées' };
  }
  if (
    text.includes('subordonnée') ||
    text.includes('nominalisation') ||
    text.includes('citation') ||
    text.includes('discours')
  ) {
    return { folder: '09. Lecture et phrases complexes', subfolder: 'Comprendre les phrases longues' };
  }
  if (
    text.includes('style') ||
    text.includes('registre') ||
    text.includes('keigo') ||
    text.includes('oral') ||
    text.includes('écrit') ||
    text.includes('conversation') ||
    text.includes('respectueux') ||
    text.includes('humble')
  ) {
    return { folder: '10. Conversation et registres', subfolder: 'Politesse et naturel' };
  }
  if (
    text.includes('vocabulaire') ||
    text.includes('lexique') ||
    text.includes('glossaire') ||
    text.includes('famille') ||
    text.includes('corps') ||
    text.includes('onomatopée') ||
    text.includes('insulte')
  ) {
    return { folder: '11. Lexique grammatical', subfolder: 'Mots utiles en phrase' };
  }
  if (text.includes('jlpt') || text.includes('exercice') || text.includes('correction')) {
    return { folder: '12. Révision JLPT', subfolder: 'Méthode, corrections et niveaux' };
  }
  return { folder: '03. Phrase et questions', subfolder: 'Construire une phrase simple' };
}

function buildTeacherGrammarExplanation(lesson: GrammarLesson): string {
  const simplePattern = humanizeGrammarPattern(lesson);
  const existing = lesson.explanation.trim();
  const teacherSentences = [
    `Règle professeur : cette leçon se lit avec le moule ${simplePattern}.`,
    `Commence par repérer le rôle de chaque morceau : thème, sujet, objet, lieu, temps, qualité ou action.`,
    `Dans une phrase N5, le petit mot grammatical indique souvent la fonction du mot placé juste avant lui.`,
    `Les exemples ci-dessous montrent le cas concret : lis d’abord la phrase en kanji, puis vérifie le romaji et le français seulement après.`,
    `Pour réussir l’exercice, ne traduis pas mot à mot : demande-toi pourquoi cette règle est nécessaire dans cette situation.`,
  ];
  return `${existing}\n\n${teacherSentences.join(' ')}`;
}

function ensureTeacherGrammarExamples(lesson: GrammarLesson): GrammarLessonExample[] {
  const existing = lesson.examples.map((example, index) => ({
    ...example,
    note: buildTeacherExampleNote(lesson, example, example.note, index),
  }));
  const seen = new Set(existing.map((example) => example.kanji || example.kana));
  const additions: GrammarLessonExample[] = [];

  for (const example of getTeacherExampleCandidates(lesson)) {
    if (existing.length + additions.length >= 3) break;
    if (seen.has(example.kanji || example.kana)) continue;
    seen.add(example.kanji || example.kana);
    additions.push({
      ...example,
      id: `${lesson.id}-teacher-ex-${additions.length + 1}`,
      note: buildTeacherExampleNote(lesson, example, example.note, existing.length + additions.length),
    });
  }

  while (existing.length + additions.length < 3) {
    const index = existing.length + additions.length + 1;
    additions.push({
      id: `${lesson.id}-teacher-fallback-${index}`,
      kana: 'まいにちにほんごをべんきょうします。',
      kanji: '毎日日本語を勉強します。',
      romaji: 'Mainichi nihongo o benkyou shimasu.',
      fr: 'J’étudie le japonais tous les jours.',
      note: buildTeacherExampleNote(
        lesson,
        {
          kana: 'まいにちにほんごをべんきょうします。',
          kanji: '毎日日本語を勉強します。',
          romaji: 'Mainichi nihongo o benkyou shimasu.',
          fr: 'J’étudie le japonais tous les jours.',
          note: '',
        },
        'Exemple de secours volontairement simple pour garder une phrase N5 analysable.',
        index - 1
      ),
    });
  }

  return [...existing, ...additions];
}

function buildTeacherExampleNote(
  lesson: GrammarLesson,
  example: Pick<GrammarLessonExample, 'kanji' | 'kana' | 'romaji' | 'fr' | 'note'>,
  originalNote: string,
  index: number
): string {
  const label = index === 0 ? 'Cas de base' : index === 1 ? 'Variation guidée' : 'Cas d’entraînement';
  return `${label} : ${originalNote} Ici, observe comment “${example.kanji || example.kana}” applique la règle “${humanizeGrammarPattern(
    lesson
  )}”. La traduction sert à vérifier le sens après avoir reconnu la structure.`;
}

function getTeacherExampleCandidates(lesson: GrammarLesson): GrammarLessonExample[] {
  const text = `${lesson.folder} ${lesson.subfolder} ${lesson.title} ${lesson.pattern}`.toLowerCase();
  const title = lesson.title;
  const candidates: Array<Omit<GrammarLessonExample, 'id'>> = [];

  const add = (kana: string, kanji: string, romaji: string, fr: string, note: string) => {
    candidates.push({ kana, kanji, romaji, fr, note });
  };

  if (title.includes('は') || text.includes(' は ')) {
    add('あしたはやすみです。', '明日は休みです。', 'Ashita wa yasumi desu.', 'Demain, c’est repos.', 'は annonce 明日 comme thème de conversation.');
  }
  if (title.includes('が') || text.includes(' が ')) {
    add('いぬがいます。', '犬がいます。', 'Inu ga imasu.', 'Il y a un chien.', 'が pointe précisément ce qui existe.');
  }
  if (title.includes('を') || text.includes(' を ')) {
    add('おちゃをのみます。', 'お茶を飲みます。', 'Ocha o nomimasu.', 'Je bois du thé.', 'を marque la chose touchée par boire.');
  }
  if (title.includes('に') || text.includes(' に ')) {
    add('くじにねます。', '九時に寝ます。', 'Ku-ji ni nemasu.', 'Je dors à neuf heures.', 'に fixe un moment précis sur l’horloge.');
  }
  if (title.includes('で') || text.includes(' で ')) {
    add('うちでべんきょうします。', '家で勉強します。', 'Uchi de benkyou shimasu.', 'J’étudie à la maison.', 'で indique le lieu où l’action se passe.');
  }
  if (title.includes('へ') || text.includes(' へ ')) {
    add('あしたえきへいきます。', '明日駅へ行きます。', 'Ashita eki e ikimasu.', 'Demain, je vais à la gare.', 'へ indique la direction du déplacement.');
  }
  if (title.includes('の') || text.includes(' の ')) {
    add('これはともだちのほんです。', 'これは友達の本です。', 'Kore wa tomodachi no hon desu.', 'C’est le livre de mon ami.', 'の relie le possesseur et le nom principal.');
  }
  if (title.includes('も') || text.includes(' も')) {
    add('わたしもにほんごをべんきょうします。', '私も日本語を勉強します。', 'Watashi mo nihongo o benkyou shimasu.', 'Moi aussi, j’étudie le japonais.', 'も ajoute le même type d’information.');
  }
  if (text.includes('question') || title.includes('か')) {
    add('これはなんですか。', 'これは何ですか。', 'Kore wa nan desu ka.', 'Qu’est-ce que c’est ?', 'か transforme la phrase polie en question.');
  }
  if (text.includes('heure') || text.includes('temps') || text.includes('date')) {
    add('まいあさしちじにおきます。', '毎朝七時に起きます。', 'Maiasa shichi-ji ni okimasu.', 'Tous les matins, je me lève à sept heures.', 'Le temps rend la phrase précise et vérifiable.');
  }
  if (text.includes('adverbe') || text.includes('fréquence')) {
    add('いつもはやくおきます。', 'いつも早く起きます。', 'Itsumo hayaku okimasu.', 'Je me lève toujours tôt.', 'L’adverbe précise la fréquence ou la manière.');
  }
  if (text.includes('adjectif') || text.includes('description')) {
    add('このへやはあかるいです。', 'この部屋は明るいです。', 'Kono heya wa akarui desu.', 'Cette pièce est lumineuse.', 'L’adjectif donne une qualité au thème.');
  }
  if (text.includes('verbe') || text.includes('ます')) {
    add('まいにちにほんごをべんきょうします。', '毎日日本語を勉強します。', 'Mainichi nihongo o benkyou shimasu.', 'J’étudie le japonais tous les jours.', 'Le verbe final donne l’action principale.');
  }
  if (text.includes('ない') || text.includes('négation')) {
    add('きょうはテレビをみません。', '今日はテレビを見ません。', 'Kyou wa terebi o mimasen.', 'Aujourd’hui, je ne regarde pas la télévision.', 'La négation change l’action sans changer le reste de la phrase.');
  }
  if (text.includes('た') || text.includes('passé')) {
    add('きのうほんをよみました。', '昨日本を読みました。', 'Kinou hon o yomimashita.', 'Hier, j’ai lu un livre.', 'Le passé est confirmé par 昨日 et par la forme du verbe.');
  }
  if (text.includes('て')) {
    add('ここにすわってください。', 'ここに座ってください。', 'Koko ni suwatte kudasai.', 'Asseyez-vous ici, s’il vous plaît.', 'La forme て accroche le verbe à une demande.');
  }
  if (text.includes('permission')) {
    add('ここでしゃしんをとってもいいです。', 'ここで写真を撮ってもいいです。', 'Koko de shashin o totte mo ii desu.', 'On peut prendre des photos ici.', 'てもいい indique que l’action est autorisée.');
  }
  if (text.includes('interdiction')) {
    add('ここでたばこをすってはいけません。', 'ここでたばこを吸ってはいけません。', 'Koko de tabako o sutte wa ikemasen.', 'Il ne faut pas fumer ici.', 'てはいけません signale une interdiction.');
  }
  if (text.includes('obligation')) {
    add('まいにちべんきょうしなければなりません。', '毎日勉強しなければなりません。', 'Mainichi benkyou shinakereba narimasen.', 'Il faut étudier tous les jours.', 'なければなりません exprime une obligation.');
  }
  if (text.includes('connecteur') || text.includes('cause') || text.includes('opposition')) {
    add('あめですから、いきません。', '雨ですから、行きません。', 'Ame desu kara, ikimasen.', 'Comme il pleut, je n’y vais pas.', 'Le connecteur explique le lien logique entre deux idées.');
  }
  if (text.includes('salutation') || text.includes('conversation')) {
    add('おはようございます。げんきですか。', 'おはようございます。元気ですか。', 'Ohayou gozaimasu. Genki desu ka.', 'Bonjour. Ça va ?', 'La situation sociale détermine la formule naturelle.');
  }
  if (text.includes('famille')) {
    add('父は会社員です。', '父は会社員です。', 'Chichi wa kaishain desu.', 'Mon père est employé de bureau.', 'Les mots de famille se placent dans des phrases très simples.');
  }
  if (text.includes('corps')) {
    add('足が痛いです。', '足が痛いです。', 'Ashi ga itai desu.', 'J’ai mal au pied / à la jambe.', 'が marque la partie du corps concernée.');
  }
  if (text.includes('jlpt') || text.includes('exercice') || text.includes('correction')) {
    add('まちがえたもんだいをもういちどします。', '間違えた問題をもう一度します。', 'Machigaeta mondai o mou ichido shimasu.', 'Je refais encore une fois les questions ratées.', 'La correction sert à transformer une erreur en révision active.');
  }

  add('これはにほんごのほんです。', 'これは日本語の本です。', 'Kore wa nihongo no hon desu.', 'C’est un livre de japonais.', 'Phrase N5 courte pour réviser thème, possession et です.');
  add('あしたがっこうへいきます。', '明日学校へ行きます。', 'Ashita gakkou e ikimasu.', 'Demain, je vais à l’école.', 'Phrase N5 utile pour temps, destination et verbe final.');
  add('ここでみずをのみます。', 'ここで水を飲みます。', 'Koko de mizu o nomimasu.', 'Je bois de l’eau ici.', 'Phrase N5 utile pour lieu, objet et action.');

  return candidates.map((candidate, index) => ({
    ...candidate,
    id: `${lesson.id}-candidate-${index + 1}`,
  }));
}

function isGrammarLessonUsefulForGrammar(lesson: GrammarLesson): boolean {
  return !VOCABULARY_ONLY_GRAMMAR_LESSON_ORDERS.has(lesson.order);
}

export const ALL_GRAMMAR_LESSONS: GrammarLesson[] = [...GRAMMAR_LESSONS, ...CONSOLIDATED_GRAMMAR_LESSONS, ...SUPPLEMENTAL_GRAMMAR_LESSONS]
  .filter(isGrammarLessonUsefulForGrammar)
  .map(normalizeGrammarLessonForTeacherCourse)
  .sort((a, b) => a.order - b.order);

export const emptyGrammarProgressSummary: GrammarProgressSummary = {
  total: ALL_GRAMMAR_LESSONS.length,
  opened: 0,
  completed: 0,
  exerciseAttempts: 0,
  exerciseCorrect: 0,
  exerciseRate: 0,
  menusOpened: 0,
};

export function getGrammarMainMenu(lesson: GrammarLesson): string {
  const text = `${lesson.folder} ${lesson.subfolder} ${lesson.title} ${lesson.pattern}`.toLowerCase();
  const detailText = `${lesson.subfolder} ${lesson.title} ${lesson.pattern}`.toLowerCase();
  if (text.includes('01. fondations')) return 'Écriture et bases';
  if (text.includes('02. particules')) return 'Particules';
  if (text.includes('03. phrase')) {
    if (
      text.includes('question') ||
      text.includes('identifier et demander') ||
      /誰|何|どこ|いつ|どう|なぜ|いくら|いくつ|どれ|どの|どちら/.test(text)
    ) {
      return 'Questions';
    }
    return 'Structure de phrase';
  }
  if (text.includes('04. temps')) return 'Temps et adverbes';
  if (text.includes('05. verbes')) {
    if (
      detailText.includes('formes n5') ||
      detailText.includes('forme') ||
      detailText.includes('conjugaison') ||
      detailText.includes('godan') ||
      detailText.includes('ichidan') ||
      detailText.includes('ます') ||
      detailText.includes('ない') ||
      detailText.includes('passif') ||
      detailText.includes('causatif')
    ) {
      return 'Formes verbales';
    }
    return 'Verbes et actions';
  }
  if (text.includes('06. adjectifs')) return 'Adjectifs';
  if (text.includes('07. expressions')) return 'Expressions pratiques';
  if (text.includes('08. connecteurs')) return 'Connecteurs';
  if (text.includes('09. lecture')) return 'Phrases complexes';
  if (text.includes('10. conversation')) return 'Style et registre';
  if (text.includes('11. lexique')) return 'Lexique en contexte';
  if (text.includes('12. révision')) return 'Méthode et corrections';
  if (
    text.includes('présentation générale') ||
    text.includes('système') ||
    text.includes('écriture') ||
    text.includes('hiragana') ||
    text.includes('katakana') ||
    text.includes('kanji dans une phrase')
  ) {
    return 'Écriture et bases';
  }
  if (
    text.includes('particule') ||
    /^(は|が|を|に|で|へ|の|も|と|や|より|か)\s*[:：]/.test(lesson.title) ||
    lesson.title.includes('Particules de fin')
  ) {
    return 'Particules';
  }
  if (text.includes('adjectif') || text.includes('descriptions') || text.includes('comparaison') || text.includes('superlatif')) {
    return 'Adjectifs';
  }
  if (
    text.includes('forme') ||
    text.includes('conjugaison') ||
    text.includes('potentielle') ||
    text.includes('volitive') ||
    text.includes('passif') ||
    text.includes('causatif') ||
    text.includes('impératif')
  ) {
    return 'Formes verbales';
  }
  if (
    text.includes('verbe') ||
    text.includes('actions') ||
    text.includes('déplacement') ||
    text.includes('transitif') ||
    text.includes('intransitif') ||
    text.includes('donner') ||
    text.includes('recevoir')
  ) {
    return 'Verbes et actions';
  }
  if (text.includes('question') || text.includes('interrogatif') || text.includes('どれ') || text.includes('だれ')) {
    return 'Questions';
  }
  if (
    text.includes('temps') ||
    text.includes('heure') ||
    text.includes('date') ||
    text.includes('jour') ||
    text.includes('mois') ||
    text.includes('saison') ||
    text.includes('nombre') ||
    text.includes('quantité') ||
    text.includes('compteur') ||
    text.includes('adverbe') ||
    text.includes('fréquence') ||
    text.includes('durée')
  ) {
    return 'Temps et adverbes';
  }
  if (text.includes('connecteur') || text.includes('cause') || text.includes('opposition') || text.includes('condition') || text.includes('hypothèse') || text.includes('but')) {
    return 'Connecteurs';
  }
  if (text.includes('subordonnée') || text.includes('nominalisation') || text.includes('citation') || text.includes('discours')) {
    return 'Phrases complexes';
  }
  if (text.includes('style') || text.includes('registre') || text.includes('keigo') || text.includes('oral') || text.includes('écrit') || text.includes('respectueux') || text.includes('humble')) {
    return 'Style et registre';
  }
  if (
    text.includes('vocabulaire') ||
    text.includes('lexique') ||
    text.includes('glossaire') ||
    text.includes('famille') ||
    text.includes('corps') ||
    text.includes('onomatopée') ||
    text.includes('insulte')
  ) {
    return 'Lexique en contexte';
  }
  if (
    text.includes('exercice') ||
    text.includes('correction') ||
    text.includes('erreur') ||
    text.includes('révision') ||
    text.includes('mémoriser')
  ) {
    return 'Méthode et corrections';
  }
  if (text.includes('jlpt')) {
    return 'JLPT';
  }
  if (text.includes('expression') || text.includes('permission') || text.includes('interdiction') || text.includes('obligation') || text.includes('désir') || text.includes('capacité') || text.includes('expérience') || text.includes('interaction') || text.includes('vie courante')) {
    return 'Expressions pratiques';
  }
  return 'Structure de phrase';
}

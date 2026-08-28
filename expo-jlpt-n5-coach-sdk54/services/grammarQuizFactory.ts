import type {
  GrammarExerciseKind,
  GrammarLesson,
  GrammarLessonExample,
  GrammarMatchingRound,
  GrammarMatchingSession,
  GrammarQuizMode,
  GrammarQuizQuestion,
} from '../models';
import { ALL_GRAMMAR_LESSONS, humanizeGrammarPattern } from './grammarCourse';
import { buildExerciseChoices, buildWordOrderDisplay, getGrammarExerciseFormat } from './exerciseFactory';
import { GRAMMAR_KEY_TOKENS, getGrammarKeyword } from './grammarPedagogy';
import { shuffle } from './random';

const GRAMMAR_DIALOGUE_PROMPTS = [
  {
    cue: 'ただいま。',
    romaji: 'Tadaima.',
    cueFr: 'Je suis rentré.',
    situation: 'Quelqu’un rentre à la maison.',
    answer: 'おかえりなさい。',
    answerFr: 'Bon retour à la maison.',
    choices: ['おかえりなさい。', 'いただきます。', 'いってきます。', 'おやすみなさい。'],
    helper: 'À la maison : celui qui rentre dit ただいま, celui qui accueille répond おかえりなさい.',
  },
  {
    cue: 'いってきます。',
    romaji: 'Ittekimasu.',
    cueFr: 'J’y vais / je pars.',
    situation: 'Quelqu’un part de la maison.',
    answer: 'いってらっしゃい。',
    answerFr: 'Bonne route / reviens bien.',
    choices: ['いってらっしゃい。', 'ただいま。', 'ごちそうさまでした。', 'おかえりなさい。'],
    helper: 'Quand quelqu’un part, on l’accompagne avec いってらっしゃい.',
  },
  {
    cue: 'いただきます。',
    romaji: 'Itadakimasu.',
    cueFr: 'Je reçois ce repas avec gratitude.',
    situation: 'On commence à manger.',
    answer: 'どうぞ。',
    answerFr: 'Je t’en prie / vas-y.',
    choices: ['どうぞ。', 'おかえりなさい。', 'いってきます。', 'おやすみなさい。'],
    helper: 'Avant de manger, いただきます est naturel. La réponse courte et polie peut être どうぞ.',
  },
  {
    cue: 'ごちそうさまでした。',
    romaji: 'Gochisousama deshita.',
    cueFr: 'Merci pour le repas.',
    situation: 'Après le repas, on remercie.',
    answer: 'おそまつさまでした。',
    answerFr: 'Ce n’était pas grand-chose.',
    choices: ['おそまつさまでした。', 'いただきます。', 'いってらっしゃい。', 'ただいま。'],
    helper: 'Après un repas offert ou préparé, ごちそうさまでした remercie. Réponse humble : おそまつさまでした.',
  },
  {
    cue: 'おはようございます。',
    romaji: 'Ohayou gozaimasu.',
    cueFr: 'Bonjour, le matin.',
    situation: 'On se salue le matin.',
    answer: 'おはようございます。',
    answerFr: 'Bonjour, le matin.',
    choices: ['おはようございます。', 'こんばんは。', 'おやすみなさい。', 'ただいま。'],
    helper: 'Le matin, on peut répondre avec la même salutation.',
  },
  {
    cue: 'こんばんは。',
    romaji: 'Konbanwa.',
    cueFr: 'Bonsoir.',
    situation: 'On se salue le soir.',
    answer: 'こんばんは。',
    answerFr: 'Bonsoir.',
    choices: ['こんばんは。', 'おはようございます。', 'いってきます。', 'いただきます。'],
    helper: 'Le soir, こんばんは appelle souvent la même réponse.',
  },
  {
    cue: 'おやすみなさい。',
    romaji: 'Oyasuminasai.',
    cueFr: 'Bonne nuit.',
    situation: 'Quelqu’un va dormir.',
    answer: 'おやすみなさい。',
    answerFr: 'Bonne nuit.',
    choices: ['おやすみなさい。', 'おかえりなさい。', 'ごちそうさまでした。', 'どうぞ。'],
    helper: 'Avant de dormir, on répond naturellement おやすみなさい.',
  },
  {
    cue: 'ありがとうございます。',
    romaji: 'Arigatou gozaimasu.',
    cueFr: 'Merci beaucoup.',
    situation: 'Quelqu’un te remercie.',
    answer: 'どういたしまして。',
    answerFr: 'Je vous en prie.',
    choices: ['どういたしまして。', 'すみません。', 'いただきます。', 'いってらっしゃい。'],
    helper: 'Après un remerciement, どういたしまして signifie “je vous en prie”.',
  },
  {
    cue: 'すみません。',
    romaji: 'Sumimasen.',
    cueFr: 'Excusez-moi / pardon.',
    situation: 'Quelqu’un s’excuse ou attire ton attention.',
    answer: 'いいえ。',
    answerFr: 'Non, ce n’est rien.',
    choices: ['いいえ。', 'ただいま。', 'おやすみなさい。', 'ごちそうさまでした。'],
    helper: 'Pour minimiser une petite excuse, いいえ peut répondre “non, ce n’est rien”.',
  },
  {
    cue: 'はじめまして。',
    romaji: 'Hajimemashite.',
    cueFr: 'Enchanté.',
    situation: 'Première rencontre.',
    answer: 'よろしくおねがいします。',
    answerFr: 'Ravi de vous rencontrer / merci d’avance pour cette relation.',
    choices: ['よろしくおねがいします。', 'おかえりなさい。', 'いただきます。', 'いってきます。'],
    helper: 'Lors d’une première rencontre, はじめまして est suivi très naturellement de よろしくおねがいします.',
  },
  {
    cue: 'おげんきですか。',
    romaji: 'Ogenki desu ka.',
    cueFr: 'Comment allez-vous ?',
    situation: 'Quelqu’un demande comment tu vas.',
    answer: 'はい、げんきです。',
    answerFr: 'Oui, je vais bien.',
    choices: ['はい、げんきです。', 'いただきます。', 'いってらっしゃい。', 'ただいま。'],
    helper: 'À おげんきですか, la réponse N5 naturelle est はい、げんきです.',
  },
  {
    cue: 'おなまえはなんですか。',
    romaji: 'Onamae wa nan desu ka.',
    cueFr: 'Comment vous appelez-vous ?',
    situation: 'Quelqu’un demande ton nom.',
    answer: 'わたしはアンです。',
    answerFr: 'Je suis Anne.',
    choices: ['わたしはアンです。', 'いいえ、ちがいます。', 'おやすみなさい。', 'ごちそうさまでした。'],
    helper: 'Pour donner son nom simplement : わたしは + nom + です.',
  },
  {
    cue: 'これはなんですか。',
    romaji: 'Kore wa nan desu ka.',
    cueFr: 'Qu’est-ce que c’est ?',
    situation: 'Quelqu’un montre un objet.',
    answer: 'それはほんです。',
    answerFr: 'C’est un livre.',
    choices: ['それはほんです。', 'どこですか。', 'いってきます。', 'おかえりなさい。'],
    helper: 'Question これはなんですか : on répond souvent それは + nom + です.',
  },
  {
    cue: 'トイレはどこですか。',
    romaji: 'Toire wa doko desu ka.',
    cueFr: 'Où sont les toilettes ?',
    situation: 'Quelqu’un cherche un lieu.',
    answer: 'あそこです。',
    answerFr: 'C’est là-bas.',
    choices: ['あそこです。', 'いただきます。', 'はじめまして。', 'おやすみなさい。'],
    helper: 'Avec どこですか, on répond par un lieu : ここ, そこ, あそこ + です.',
  },
  {
    cue: 'いくらですか。',
    romaji: 'Ikura desu ka.',
    cueFr: 'Combien ça coûte ?',
    situation: 'Dans un magasin.',
    answer: 'さんびゃくえんです。',
    answerFr: 'C’est 300 yens.',
    choices: ['さんびゃくえんです。', 'あそこです。', 'どういたしまして。', 'いってきます。'],
    helper: 'Avec いくらですか, on répond par le prix + です.',
  },
  {
    cue: 'なんじですか。',
    romaji: 'Nanji desu ka.',
    cueFr: 'Quelle heure est-il ?',
    situation: 'Quelqu’un demande l’heure.',
    answer: 'さんじです。',
    answerFr: 'Il est trois heures.',
    choices: ['さんじです。', 'さんびゃくえんです。', 'おかえりなさい。', 'いただきます。'],
    helper: 'Avec なんじですか, on répond nombre + じ + です.',
  },
  {
    cue: 'いっしょにいきませんか。',
    romaji: 'Issho ni ikimasen ka.',
    cueFr: 'On y va ensemble ?',
    situation: 'Invitation polie.',
    answer: 'いいですね。',
    answerFr: 'Bonne idée.',
    choices: ['いいですね。', 'ただいま。', 'ごちそうさまでした。', 'おやすみなさい。'],
    helper: 'Pour accepter naturellement une invitation : いいですね est court et utile.',
  },
  {
    cue: 'もういちどおねがいします。',
    romaji: 'Mou ichido onegai shimasu.',
    cueFr: 'Encore une fois, s’il vous plaît.',
    situation: 'Quelqu’un demande de répéter.',
    answer: 'はい、わかりました。',
    answerFr: 'Oui, compris.',
    choices: ['はい、わかりました。', 'いってらっしゃい。', 'いただきます。', 'こんばんは。'],
    helper: 'Quand on accepte une demande simple : はい、わかりました.',
  },
  {
    cue: 'しゃしんをとってもいいですか。',
    romaji: 'Shashin o totte mo ii desu ka.',
    cueFr: 'Puis-je prendre une photo ?',
    situation: 'Demande de permission.',
    answer: 'はい、いいです。',
    answerFr: 'Oui, c’est possible.',
    choices: ['はい、いいです。', 'おかえりなさい。', 'ごちそうさまでした。', 'はじめまして。'],
    helper: 'Pour répondre à てもいいですか : はい、いいです autorise.',
  },
  {
    cue: 'ここにすわってもいいですか。',
    romaji: 'Koko ni suwatte mo ii desu ka.',
    cueFr: 'Puis-je m’asseoir ici ?',
    situation: 'Demande de permission dans un lieu.',
    answer: 'どうぞ。',
    answerFr: 'Je vous en prie.',
    choices: ['どうぞ。', 'ただいま。', 'いくらですか。', 'おやすみなさい。'],
    helper: 'どうぞ est très utile pour inviter ou autoriser quelqu’un à faire quelque chose.',
  },
  {
    cue: 'ちょっとまってください。',
    romaji: 'Chotto matte kudasai.',
    cueFr: 'Attendez un instant, s’il vous plaît.',
    situation: 'Quelqu’un demande d’attendre.',
    answer: 'はい。',
    answerFr: 'Oui.',
    choices: ['はい。', 'いただきます。', 'いってきます。', 'おかえりなさい。'],
    helper: 'Pour une demande simple avec ください, はい est une réponse minimale naturelle.',
  },
  {
    cue: 'もうすこしゆっくりはなしてください。',
    romaji: 'Mou sukoshi yukkuri hanashite kudasai.',
    cueFr: 'Parlez un peu plus lentement, s’il vous plaît.',
    situation: 'Tu ne comprends pas bien la phrase.',
    answer: 'はい、わかりました。',
    answerFr: 'Oui, compris.',
    choices: ['はい、わかりました。', 'おかえりなさい。', 'いただきます。', 'いくらですか。'],
    helper: 'Avec une demande en てください, une réponse simple est はい、わかりました.',
  },
  {
    cue: 'これはあなたのかばんですか。',
    romaji: 'Kore wa anata no kaban desu ka.',
    cueFr: 'Est-ce votre sac ?',
    situation: 'On te demande si un objet est à toi.',
    answer: 'はい、わたしのです。',
    answerFr: 'Oui, c’est le mien.',
    choices: ['はい、わたしのです。', 'おやすみなさい。', 'いってらっしゃい。', 'ごちそうさまでした。'],
    helper: 'の peut remplacer un nom déjà connu : わたしのです = c’est le mien.',
  },
  {
    cue: 'あした、ひまですか。',
    romaji: 'Ashita, hima desu ka.',
    cueFr: 'Êtes-vous libre demain ?',
    situation: 'Quelqu’un prépare une invitation.',
    answer: 'はい、ひまです。',
    answerFr: 'Oui, je suis libre.',
    choices: ['はい、ひまです。', 'さんじです。', 'あそこです。', 'いただきます。'],
    helper: 'Pour répondre à une question en ですか, on peut reprendre le mot clé + です.',
  },
  {
    cue: 'きょうはなんようびですか。',
    romaji: 'Kyou wa nan youbi desu ka.',
    cueFr: 'Quel jour sommes-nous aujourd’hui ?',
    situation: 'Question de date fréquente N5.',
    answer: 'げつようびです。',
    answerFr: 'C’est lundi.',
    choices: ['げつようびです。', 'さんびゃくえんです。', 'おかえりなさい。', 'いいえ。'],
    helper: 'なんようび demande le jour de la semaine : lundi, mardi, etc. + です.',
  },
  {
    cue: 'どこからきましたか。',
    romaji: 'Doko kara kimashita ka.',
    cueFr: 'D’où venez-vous ?',
    situation: 'Présentation personnelle.',
    answer: 'フランスからきました。',
    answerFr: 'Je viens de France.',
    choices: ['フランスからきました。', 'ここにすわります。', 'どういたしまして。', 'おやすみなさい。'],
    helper: 'から marque le point de départ ou l’origine : France から.',
  },
  {
    cue: 'なにをのみますか。',
    romaji: 'Nani o nomimasu ka.',
    cueFr: 'Que buvez-vous ?',
    situation: 'Restaurant ou café.',
    answer: 'みずをのみます。',
    answerFr: 'Je bois de l’eau.',
    choices: ['みずをのみます。', 'あそこです。', 'いってらっしゃい。', 'はじめまして。'],
    helper: 'を marque l’objet direct : みずをのみます.',
  },
  {
    cue: 'どこでべんきょうしますか。',
    romaji: 'Doko de benkyou shimasu ka.',
    cueFr: 'Où étudiez-vous ?',
    situation: 'Question sur le lieu d’une action.',
    answer: 'うちでべんきょうします。',
    answerFr: 'J’étudie à la maison.',
    choices: ['うちでべんきょうします。', 'うちへかえります。', 'おはようございます。', 'いただきます。'],
    helper: 'で marque le lieu où l’action se passe : うちでべんきょうします.',
  },
  {
    cue: 'どこへいきますか。',
    romaji: 'Doko e ikimasu ka.',
    cueFr: 'Où allez-vous ?',
    situation: 'Question sur une direction.',
    answer: 'がっこうへいきます。',
    answerFr: 'Je vais à l’école.',
    choices: ['がっこうへいきます。', 'がっこうでたべます。', 'どうぞ。', 'おかえりなさい。'],
    helper: 'へ marque la direction avec les verbes de déplacement : がっこうへいきます.',
  },
  {
    cue: 'だれといきますか。',
    romaji: 'Dare to ikimasu ka.',
    cueFr: 'Avec qui y allez-vous ?',
    situation: 'Question sur l’accompagnement.',
    answer: 'ともだちといきます。',
    answerFr: 'J’y vais avec un ami.',
    choices: ['ともだちといきます。', 'さんじです。', 'ほんです。', 'おやすみなさい。'],
    helper: 'と signifie “avec” pour accompagner quelqu’un : ともだちと.',
  },
  {
    cue: 'どちらがすきですか。',
    romaji: 'Dochira ga suki desu ka.',
    cueFr: 'Lequel préférez-vous ?',
    situation: 'On te demande de choisir.',
    answer: 'こちらがすきです。',
    answerFr: 'Je préfère celui-ci.',
    choices: ['こちらがすきです。', 'おかえりなさい。', 'いってきます。', 'さんびゃくえんです。'],
    helper: 'すき prend souvent が pour marquer ce qui est aimé : こちらがすきです.',
  },
  {
    cue: 'にほんごがわかりますか。',
    romaji: 'Nihongo ga wakarimasu ka.',
    cueFr: 'Comprenez-vous le japonais ?',
    situation: 'Quelqu’un vérifie ta compréhension.',
    answer: 'すこしわかります。',
    answerFr: 'Je comprends un peu.',
    choices: ['すこしわかります。', 'いただきます。', 'おかえりなさい。', 'いくらですか。'],
    helper: 'すこし adoucit la réponse : “un peu”. Très utile au N5.',
  },
  {
    cue: 'このでんしゃはとうきょうへいきますか。',
    romaji: 'Kono densha wa Toukyou e ikimasu ka.',
    cueFr: 'Ce train va-t-il à Tokyo ?',
    situation: 'Transport.',
    answer: 'はい、いきます。',
    answerFr: 'Oui, il y va.',
    choices: ['はい、いきます。', 'おやすみなさい。', 'ごちそうさまでした。', 'どういたしまして。'],
    helper: 'Pour confirmer un verbe, on peut répondre はい + verbe.',
  },
  {
    cue: 'ここでたばこをすってはいけません。',
    romaji: 'Koko de tabako o sutte wa ikemasen.',
    cueFr: 'Il est interdit de fumer ici.',
    situation: 'Interdiction dans un lieu public.',
    answer: 'わかりました。',
    answerFr: 'J’ai compris.',
    choices: ['わかりました。', 'いただきます。', 'いってらっしゃい。', 'おはようございます。'],
    helper: 'てはいけません exprime une interdiction. Réponse naturelle : わかりました.',
  },
  {
    cue: 'まどをあけてください。',
    romaji: 'Mado o akete kudasai.',
    cueFr: 'Ouvrez la fenêtre, s’il vous plaît.',
    situation: 'Demande polie.',
    answer: 'はい。',
    answerFr: 'Oui.',
    choices: ['はい。', 'ただいま。', 'ごちそうさまでした。', 'いくらですか。'],
    helper: 'てください sert à demander une action poliment.',
  },
  {
    cue: 'てつだいましょうか。',
    romaji: 'Tetsudaimashou ka.',
    cueFr: 'Je vous aide ?',
    situation: 'Quelqu’un propose son aide.',
    answer: 'おねがいします。',
    answerFr: 'Oui, s’il vous plaît.',
    choices: ['おねがいします。', 'おかえりなさい。', 'いただきます。', 'こんばんは。'],
    helper: 'Quand on accepte une aide, おねがいします est naturel et poli.',
  },
];

function getGrammarExample(lesson: GrammarLesson): GrammarLessonExample {
  return shuffle(lesson.examples)[0] ?? lesson.examples[0];
}

export function maskGrammarKeyword(text: string, keyword: string): string {
  if (!keyword || !text.includes(keyword)) return `${text}  ___`;
  return text.replace(keyword, '___');
}

export function uniqueChoices(values: string[], fallback: string[]): string[] {
  const correctAnswer = values.find((value) => value.trim().length > 0) ?? fallback[0] ?? '';
  return buildExerciseChoices({ correctAnswer, alternatives: [...values.slice(1), ...fallback] });
}

export function buildGrammarQuizQuestions(
  size: 10 | 20,
  mode: Exclude<GrammarQuizMode, 'matching' | 'question_answer'> = 'arcade',
  lessons: GrammarLesson[] = ALL_GRAMMAR_LESSONS,
): GrammarQuizQuestion[] {
  const pool = shuffle(lessons).slice(0, size);
  const exerciseCycle: GrammarExerciseKind[] =
    mode === 'direct_input'
      ? ['blank_input', 'keyword_input']
      : mode === 'blank_qcm'
        ? ['blank_choice']
        : [
            'blank_choice',
            'translation_qcm',
            'blank_input',
            'keyword_input',
            'dialogue_response_qcm',
          ];
  return pool.map<GrammarQuizQuestion>((lesson, index) => {
    const example = getGrammarExample(lesson);
    const keyword = getGrammarKeyword(lesson, example);
    const kind = exerciseCycle[index % exerciseCycle.length];
    const exerciseFormat = getGrammarExerciseFormat(mode, kind);
    const formula = humanizeGrammarPattern(lesson);
    if (kind === 'translation_qcm') {
      return {
        id: `${lesson.id}-translation-${index}`,
        kind,
        exerciseFormat,
        lesson,
        prompt: 'Choisis la bonne traduction française.',
        japanese: buildWordOrderDisplay(example.kanji || example.kana),
        kanaJapanese: example.kana,
        romaji: example.romaji,
        french: example.fr,
        helper: `Indice règle : ${lesson.title}`,
        correctAnswer: example.fr,
        choices: uniqueChoices(
          [example.fr, ...shuffle(lessons).map((item) => item.examples[0]?.fr ?? '')],
          ['Je vais à l’école.', 'C’est un livre.', 'Je mange du riz.', 'Il fait beau.']
        ),
      };
    }
    if (kind === 'blank_choice' || kind === 'blank_input') {
      return {
        id: `${lesson.id}-blank-${index}`,
        kind,
        exerciseFormat,
        lesson,
        prompt: kind === 'blank_choice' ? 'Complète le trou avec la bonne réponse.' : 'Tape la réponse qui manque.',
        japanese: maskGrammarKeyword(example.kanji || example.kana, keyword),
        kanaJapanese: maskGrammarKeyword(example.kana, keyword),
        romaji: example.romaji,
        french: example.fr,
        helper: `Objectif : ${lesson.goal}`,
        correctAnswer: keyword,
        choices: kind === 'blank_choice'
          ? buildExerciseChoices({ correctAnswer: keyword, alternatives: GRAMMAR_KEY_TOKENS })
          : [],
      };
    }
    if (kind === 'keyword_input') {
      return {
        id: `${lesson.id}-keyword-${index}`,
        kind,
        exerciseFormat,
        lesson,
        prompt: `Tape le marqueur ou la forme clé pour : ${lesson.title}`,
        japanese: example.kanji || example.kana,
        kanaJapanese: example.kana,
        romaji: example.romaji,
        french: example.fr,
        helper: `Formule : ${formula}`,
        correctAnswer: keyword,
        choices: [],
      };
    }
    if (kind === 'dialogue_response_qcm') {
      const japanese = example.kanji || example.kana;
      const alternatives = lessons
        .filter((item) => item.id !== lesson.id)
        .map((item) => item.examples[0]?.kanji || item.examples[0]?.kana || '');
      return {
        id: `${lesson.id}-dialogue-${index}`,
        kind,
        exerciseFormat,
        lesson,
        prompt: `Quelle phrase japonaise correspond à : « ${example.fr} » ?`,
        japanese: '',
        kanaJapanese: '',
        romaji: example.romaji,
        french: example.fr,
        helper: `La correction expliquera la structure ${lesson.title}.`,
        correctAnswer: japanese,
        choices: buildExerciseChoices({ correctAnswer: japanese, alternatives }),
      };
    }
    throw new Error(`Type d exercice grammatical non pris en charge : ${kind}`);
  }).map(addGrammarWrongAnswerExplanations);
}

export function buildGrammarQuestionAnswerQuiz(
  size: 10 | 20,
  lessons: GrammarLesson[] = ALL_GRAMMAR_LESSONS,
): GrammarQuizQuestion[] {
  const examples = lessons.flatMap((lesson) => lesson.examples.map((example) => ({ lesson, example })));
  return Array.from<unknown, GrammarQuizQuestion>({ length: size }, (_, index) => {
    const current = examples[index % examples.length];
    const japanese = current.example.kanji || current.example.kana;
    const alternatives = examples
      .filter((item) => item.lesson.id !== current.lesson.id)
      .map((item) => item.example.kanji || item.example.kana);
    return {
      id: `grammar-response-${index}-${current.example.id}`,
      kind: 'dialogue_response_qcm' as const,
      exerciseFormat: getGrammarExerciseFormat('question_answer', 'dialogue_response_qcm'),
      lesson: current.lesson,
      prompt: `Quelle phrase japonaise correspond à : « ${current.example.fr} » ?`,
      japanese: '',
      kanaJapanese: '',
      romaji: current.example.romaji,
      french: current.example.fr,
      helper: `La correction expliquera la structure ${current.lesson.title}.`,
      correctAnswer: japanese,
      choices: buildExerciseChoices({ correctAnswer: japanese, alternatives }),
    };
  }).map(addGrammarWrongAnswerExplanations);
}

function addGrammarWrongAnswerExplanations(question: GrammarQuizQuestion): GrammarQuizQuestion {
  if (question.choices.length === 0) return question;
  return {
    ...question,
    wrongAnswerExplanations: buildGrammarWrongAnswerExplanations(question.correctAnswer, question.choices, question.lesson),
  };
}

function buildGrammarWrongAnswerExplanations(
  correctAnswer: string,
  choices: string[],
  lesson: GrammarLesson
): Record<string, string> {
  return choices.reduce<Record<string, string>>((acc, choice) => {
    if (choice === correctAnswer) return acc;
    acc[choice] = buildWrongGrammarChoiceExplanation(choice, correctAnswer, lesson);
    return acc;
  }, {});
}

function buildWrongGrammarChoiceExplanation(choice: string, correctAnswer: string, lesson: GrammarLesson): string {
  const particleChoices = new Set(['は', 'が', 'を', 'に', 'で', 'へ', 'と', 'も', 'の', 'か']);
  if (particleChoices.has(choice) && particleChoices.has(correctAnswer)) {
    return `La particule ${choice} ne porte pas la meme fonction ici. On attend ${correctAnswer} : ${lesson.explanation}`;
  }
  if (choice.includes('/') || correctAnswer.includes('/')) {
    return `Cette formule appartient a un autre usage. Pour cette phrase, l'indice principal est : ${lesson.goal}`;
  }
  if (hasKanaOrKanji(choice) || hasKanaOrKanji(correctAnswer)) {
    return `Cette reponse ne correspond pas a l'intention de la phrase. Compare le sens francais, puis relis : ${lesson.explanation}`;
  }
  return `Cette option attire l'oeil, mais elle ne respecte pas la regle visee : ${lesson.title}.`;
}

function hasKanaOrKanji(value: string): boolean {
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(value);
}

function buildGrammarMatchingRounds(lessonsSource = ALL_GRAMMAR_LESSONS, roundCount = 3, pairsPerRound = 5): GrammarMatchingRound[] {
  const lessons = shuffle(
    lessonsSource.filter((lesson) => lesson.examples.some((example) => example.fr && (example.kanji || example.kana)))
  );
  return Array.from({ length: roundCount }, (_, roundIndex) => {
    const pairs = Array.from({ length: pairsPerRound }, (_, pairIndex) => {
      const lesson = lessons[(roundIndex * pairsPerRound + pairIndex) % lessons.length];
      const example = lesson.examples[pairIndex % lesson.examples.length] ?? lesson.examples[0];
      return {
        id: `grammar-match-${roundIndex}-${pairIndex}-${lesson.id}`,
        lesson,
        japanese: example.kanji || example.kana,
        french: example.fr,
      };
    });
    return { pairs, rightOrder: shuffle(pairs.map((pair) => pair.id)) };
  });
}

export function createGrammarMatchingSession(lessons: GrammarLesson[] = ALL_GRAMMAR_LESSONS): GrammarMatchingSession {
  return {
    rounds: buildGrammarMatchingRounds(lessons),
    currentRound: 0,
    selectedLeftId: null,
    selectedRightId: null,
    matchedIds: [],
    attempts: 0,
    errors: 0,
    score: 0,
    finished: false,
    locked: false,
  };
}

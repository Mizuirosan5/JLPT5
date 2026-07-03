import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Image, Modal, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { styles } from '../appStyles';
import { OFFICIAL_EXAM_QUESTION_ASSETS } from '../examQuestionAssets';
import type { ExamSegment } from '../models';
import { SegmentButton } from './formControls';
import { EmptyState, LoadingView } from './sharedUi';

export function ExamScreen() {
  const db = useSQLiteContext();
  const [edition, setEdition] = useState<'2012' | '2018'>('2018');
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [segments, setSegments] = useState<ExamSegment[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [zoomVisible, setZoomVisible] = useState(false);

  const segment = useMemo(() => segments[index] ?? null, [segments, index]);
  const questionAsset = segment ? OFFICIAL_EXAM_QUESTION_ASSETS[segment.question_id] : undefined;
  const choices = useMemo(() => {
    if (!segment?.choices_json) return ['1', '2', '3', '4'];
    try {
      const parsed = JSON.parse(segment.choices_json);
      return Array.isArray(parsed) && parsed.length === 4 ? parsed : ['1', '2', '3', '4'];
    } catch {
      return ['1', '2', '3', '4'];
    }
  }, [segment]);
  const examInstruction = useMemo(() => getExamInstruction(segment), [segment]);
  const examExplanation = useMemo(
    () => getExamExplanation(segment, choices),
    [segment, choices]
  );

  useEffect(() => {
    async function load() {
      setLoading(true);
      const rows = await db.getAllAsync<ExamSegment>(`
        SELECT s.question_id, q.source_id, s.section, q.skill_id,
               s.linked_question_source_file, s.problem_number, s.question_number,
               s.page_number, s.image_path, q.correct_choice,
               q.context_ja, q.prompt_ja, q.choices_json, q.display_mode
        FROM app_exam_question_segment s
        JOIN app_exam_question q ON q.id = s.question_id
        WHERE q.source_id = ?
        ORDER BY CASE s.section
          WHEN 'vocabulary' THEN 1
          WHEN 'grammar' THEN 2
          WHEN 'reading' THEN 3
          ELSE 4 END,
          s.problem_number, s.question_number
      `, edition === '2018' ? 'src_jlpt_official_practice_2018' : 'src_jlpt_n5_test_answer_key');
      setSegments(rows);
      setIndex(0);
      setSelected(null);
      setCorrectCount(0);
      setFinished(false);
      setLoading(false);
    }
    load();
  }, [db, edition]);

  const answer = async (value: number) => {
    if (!segment || selected !== null) return;
    setSelected(value);
    if (value === segment.correct_choice) setCorrectCount((count) => count + 1);
    await db.runAsync(
      `
      INSERT INTO app_question_attempt_local (
        id, question_id, source_mode, selected_answer, correct_answer,
        is_correct, skill_id, answered_at
      ) VALUES (?, ?, 'exam_mode', ?, ?, ?, ?, datetime('now'))
    `,
      `${Date.now()}-${Math.random()}`,
      segment.question_id,
      String(value),
      String(segment.correct_choice),
      value === segment.correct_choice ? 1 : 0,
      segment.section
    );
  };

  const next = () => {
    if (index >= segments.length - 1) {
      setFinished(true);
      return;
    }
    setSelected(null);
    setIndex((current) => current + 1);
  };

  if (loading) {
    return <LoadingView />;
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.examHero}>
        <Text style={styles.examEyebrow}>MODE EXAMEN OFFICIEL N5</Text>
        <Text style={styles.examHeroTitle}>Annales JLPT</Text>
        <Text style={styles.examHeroText}>
          Questions authentiques extraites et intégrées dans un quiz interactif.
        </Text>
      </View>

      <View style={styles.segmented}>
        {(['2018', '2012'] as const).map((year) => (
          <SegmentButton
            key={year}
            label={`${year} · ${year === '2018' ? 67 : 65} questions`}
            active={edition === year}
            onPress={() => setEdition(year)}
          />
        ))}
      </View>

      {finished ? (
        <View style={styles.examResultCard}>
          <Text style={styles.examResultKicker}>SESSION {edition} TERMINÉE</Text>
          <Text style={styles.examResultScore}>{correctCount}/{segments.length}</Text>
          <Text style={styles.examResultText}>
            {Math.round((correctCount / Math.max(1, segments.length)) * 100)} % de bonnes réponses
          </Text>
          <Pressable
            style={styles.primaryButton}
            onPress={() => {
              setIndex(0);
              setSelected(null);
              setCorrectCount(0);
              setFinished(false);
            }}
          >
            <Text style={styles.primaryButtonText}>Recommencer cette annale</Text>
          </Pressable>
        </View>
      ) : segment ? (
        <>
      <View style={styles.examProgressRow}>
        <Text style={styles.questionMeta}>{segment.section.toUpperCase()}</Text>
        <Text style={styles.examProgressText}>{index + 1}/{segments.length} · {correctCount} juste{correctCount > 1 ? 's' : ''}</Text>
      </View>
      <Text style={styles.questionTitle}>
        Problème {segment.problem_number} · Question {segment.question_number}
      </Text>
      <View style={styles.examTaskCard}>
        <Text style={styles.examTaskLabel}>QUESTION JLPT · CE QUE L'ON CHERCHE</Text>
        <Text style={styles.examTaskText}>{examInstruction}</Text>
      </View>
      {segment.display_mode === 'native_text' ? (
        <View style={styles.examNativeCard}>
          {!!segment.context_ja && <Text style={styles.examContextText}>{segment.context_ja}</Text>}
          <Text style={styles.examPromptText}>
            {segment.skill_id === 'vocabulary' && segment.problem_number === 1
              ? renderExamKanjiHighlight(segment.prompt_ja ?? '')
              : segment.prompt_ja}
          </Text>
        </View>
      ) : (
      <Pressable style={styles.examPageFrame} onPress={() => setZoomVisible(true)}>
        {questionAsset ? (
          <Image source={questionAsset} style={styles.examQuestionImage} resizeMode="contain" />
        ) : (
          <View style={styles.examBox}>
            <Text style={styles.examBoxTitle}>Question indisponible</Text>
            <Text style={styles.examBoxText}>L'extrait de cette question n'a pas été trouvé.</Text>
          </View>
        )}
        <View style={styles.examZoomBadge}><Text style={styles.examZoomBadgeText}>Agrandir</Text></View>
      </Pressable>
      )}
      <Text style={styles.examPageHint}>
        Choisis la meilleure réponse parmi les quatre propositions.
      </Text>
      <View style={styles.examChoices}>
        {choices.map((choice, choiceIndex) => {
          const value = choiceIndex + 1;
          return (
          <Pressable
            key={value}
            disabled={selected !== null}
            onPress={() => answer(value)}
            style={[
              styles.examChoice,
              selected !== null && value === segment.correct_choice && styles.choiceCorrect,
              selected === value && value !== segment.correct_choice && styles.choiceWrong,
            ]}
          >
            <Text style={styles.examChoiceNumber}>{value}</Text>
            <Text style={styles.examChoiceText}>{choice}</Text>
          </Pressable>
          );
        })}
      </View>
      {selected !== null && (
        <View style={[
          styles.examCorrectionCard,
          selected === segment.correct_choice ? styles.examCorrectionRight : styles.examCorrectionWrong,
        ]}>
          <Text style={styles.examCorrectionVerdict}>
            {selected === segment.correct_choice ? 'VRAI · Bonne réponse' : 'FAUX · À corriger'}
          </Text>
          <Text style={styles.examCorrectionAnswer}>
            Réponse correcte : {segment.correct_choice}. {choices[segment.correct_choice - 1]}
          </Text>
          <Text style={styles.examCorrectionWhyTitle}>Pourquoi ?</Text>
          <Text style={styles.examCorrectionWhy}>{examExplanation}</Text>
        </View>
      )}
      {selected !== null && (
        <Pressable style={styles.primaryButton} onPress={next}>
          <Text style={styles.primaryButtonText}>
            {index === segments.length - 1 ? 'Voir mon résultat' : 'Question suivante'}
          </Text>
        </Pressable>
      )}
        </>
      ) : (
        <EmptyState title="Aucune question JLPT" />
      )}

      <Modal visible={zoomVisible} animationType="fade" onRequestClose={() => setZoomVisible(false)}>
        <SafeAreaView style={styles.examZoomBackdrop}>
          <View style={styles.examZoomHeader}>
            <Text style={styles.examZoomTitle}>JLPT N5 · {edition} · page {segment?.page_number ?? ''}</Text>
            <Pressable style={styles.examZoomClose} onPress={() => setZoomVisible(false)}>
              <Text style={styles.examZoomCloseText}>Fermer</Text>
            </Pressable>
          </View>
          <ScrollView horizontal maximumZoomScale={3} minimumZoomScale={1} contentContainerStyle={styles.examZoomCanvas}>
            {questionAsset && <Image source={questionAsset} style={styles.examZoomQuestionImage} resizeMode="contain" />}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </ScrollView>
  );
}

function getExamInstruction(segment: ExamSegment | null): string {
  if (!segment) return '';
  if (segment.display_mode === 'question_image') {
    return 'Lis la question extraite de l’examen, puis choisis la proposition correcte.';
  }
  if (segment.skill_id === 'reading') {
    return 'Lis le texte, repère l’information demandée et choisis la réponse confirmée par le texte.';
  }
  if (segment.skill_id === 'vocabulary') {
    if (segment.problem_number === 1) return 'Trouve la lecture en hiragana du mot écrit en kanji.';
    if (segment.problem_number === 2) return 'Trouve l’écriture correcte en kanji ou en kana du mot indiqué.';
    if (segment.problem_number === 3) return 'Choisis le mot qui complète naturellement la phrase.';
    return 'Choisis la phrase qui garde le même sens que la phrase proposée.';
  }
  if (segment.problem_number === 1) return 'Choisis la particule ou la forme grammaticale qui complète correctement la phrase.';
  if (segment.problem_number === 2) return 'Remets mentalement les éléments dans l’ordre et trouve celui qui occupe la place marquée ★.';
  return 'Comprends le texte dans son ensemble et choisis l’élément qui assure une phrase logique et grammaticale.';
}

function renderExamKanjiHighlight(text: string): ReactNode[] {
  return text.split(/([\u3400-\u4DBF\u4E00-\u9FFF]+)/g).map((part, index) => {
    const isKanji = /[\u3400-\u4DBF\u4E00-\u9FFF]/.test(part);
    return (
      <Text key={`${part}-${index}`} style={isKanji ? styles.examTargetKanji : undefined}>
        {part}
      </Text>
    );
  });
}

const EXAM_GRAMMAR_EXPLANATIONS_2018: Record<number, string> = {
  1: 'ひこうき signifie « avion » : c’est le moyen utilisé pour rentrer. La particule で marque un moyen de transport, donc ひこうきで signifie « en avion ». 国 signifie « pays » et c’est la destination, déjà marquée par へ dans 国へ. に marquerait une destination, mais le blanc ne se trouve pas après 国.',
  2: 'かばん signifie « sac » et くつ signifie « chaussures ». La particule や relie des exemples d’une liste non complète : « un sac, des chaussures, etc. ». Le mot など, placé après くつ, confirme justement l’idée de « etc. ». と donnerait plutôt une liste complète.',
  3: '家 signifie « maison » et 出ます signifie « sortir ». Avec un verbe de départ, を marque le lieu que l’on quitte : 家を出ます signifie « sortir de la maison ». で marquerait le lieu où une action se déroule, pas le lieu quitté.',
  4: '田中さん est la personne rencontrée et 会いました signifie « j’ai rencontré ». La construction japonaise est 人に会います : に marque la personne vers laquelle la rencontre est dirigée. を ne s’emploie pas avec 会う pour désigner la personne rencontrée.',
  5: '父 signifie « mon père » et 作りました signifie « a fabriqué ». Le père est celui qui réalise l’action : が marque donc le sujet de 作りました. を ferait du père l’objet fabriqué, ce qui n’aurait pas de sens.',
  6: '五つ signifie « cinq objets » et la somme indique le prix de cet ensemble. で sert ici à fixer une quantité totale : 五つで…円 signifie « … yens pour les cinq ». に indiquerait plutôt un prix attribué à chaque unité dans une autre construction.',
  7: 'きのう et 今日 sont les deux thèmes comparés : hier, puis aujourd’hui. は place chacun comme thème, d’où きのうは et 今日は. Cette répétition crée un contraste clair entre les deux jours. も voudrait dire « aussi » et supprimerait ce contraste.',
  8: 'きれい est un adjectif en な. Pour le relier à 静かです dans la même phrase, il prend la forme connective きれいで. きれいと ne sert pas à enchaîner deux descriptions de cette manière.',
  9: 'Le locuteur montre un emplacement proche de son interlocuteur : そこ signifie « là, près de vous ». その et どの doivent être suivis directement d’un nom, tandis qu’ici に arrive juste après le mot choisi.',
  10: 'La question porte sur l’impression de la personne après avoir skié. いかがでしたか est la forme polie de « comment était-ce ? ». いくつ demande un nombre et どなた demande une personne.',
  11: 'Le cours commencera la semaine prochaine : au moment où l’on parle, il n’a donc pas encore commencé. まだ signifie « pas encore » avec cette réponse négative. もう signifierait « déjà » et contredirait 来週始まります.',
  12: 'Le médecin demande au patient de revenir le lundi suivant. また signifie « de nouveau » : また来てください veut dire « revenez ». あまり et たくさん expriment une quantité et ne peuvent pas modifier naturellement 来て ici.',
  13: 'La structure ながら exprime deux actions simultanées. Elle se construit avec la base en ます sans ます : 飲みます devient 飲みながら. 飲むながら et 飲んでながら sont incorrects.',
  14: '小さいとき situe la phrase dans le passé. 好き est un adjectif en な et sa forme négative polie passée est 好きじゃありませんでした. La partie attendue est donc じゃありません avant でした.',
  15: 'Le client commande deux gâteaux : 二つ indique la quantité et ください transforme la demande en « deux, s’il vous plaît ». ありますか demanderait seulement s’il y en a, alors que la réponse du vendeur confirme une commande.',
  16: 'リーさん invite Kim chez lui. 来ませんか est une invitation polie : littéralement « ne viendriez-vous pas ? ». La réponse 行きたいです montre que Kim accepte l’idée de venir.',
  17: 'Dans l’ordre correct, on dit つぎの信号を右にまがってください : « tournez à droite au prochain feu ». を marque 信号 comme point que l’on franchit avant de tourner. ★ correspond donc à を dans la reconstruction.',
  18: '兄 signifie « grand frère » et と signifie « avec ». La construction 兄と出かけました veut dire « je suis sorti avec mon grand frère ». と doit rester juste après la personne qui accompagne.',
  19: 'Dans la phrase reconstruite, が introduit la caractéristique donnée au sujet des gâteaux achetés hier. Il relie le groupe nominal à la description qui suit; son emplacement est donc celui de ★.',
  20: 'ある complète un groupe qui décrit un lieu : 駅の…にある… signifie « qui se trouve dans/près de la gare ». Cette forme précise l’emplacement avant le nom concerné, puis で marque le lieu où le magazine est acheté.',
  21: 'もらった est le passé neutre de もらう, « recevoir ». Placé avant le nom こうちゃ, il signifie « le thé que j’ai reçu ». Une proposition relative japonaise se place directement avant le nom qu’elle décrit.',
  22: 'Le premier passage dit que le jus de pastèque existe dans beaucoup de magasins du pays de Nin, puis oppose la situation au Japon. でも signifie « mais » et marque ce contraste. だから exprimerait une conséquence, ce qui ne correspond pas au texte.',
  23: 'Nin demande aux autres quel jus ils aiment. 教えてください signifie « dites-le-moi / apprenez-le-moi, s’il vous plaît ». C’est une demande adressée aux lecteurs, donc la forme en て + ください convient.',
  24: 'Le texte raconte une action terminée samedi dernier. 入りました est le passé poli de 入ります : « je suis entré dans le café ». 入ります serait au présent ou au futur et ne respecterait pas le récit passé.',
  25: '「はな」 est le nom du café et コーヒー est ce qu’il sert. の relie les deux noms : 「はな」のコーヒー signifie « le café de Hana ». から ou より exprimeraient une origine ou une comparaison inutile ici.',
  26: 'Le but du déplacement est de boire du café. 飲みに行きます suit la règle base en ます sans ます + に行きます : 飲みます devient 飲みに行きます, « aller boire ». 飲んで行きます signifie plutôt boire avant de partir.',
};

const EXAM_READING_EXPLANATIONS_2018: Record<number, string> = {
  27: 'La question demande ce qui a été mangé avant l’école ce matin. Le texte dit clairement けさはなにも食べませんでした : « ce matin, je n’ai rien mangé ». La banane a seulement été emportée à l’école, elle n’a pas été mangée avant le départ.',
  28: 'L’avis dit que le cours du matin n’a pas lieu parce que le professeur est absent jusqu’à midi. Il précise aussi que les devoirs doivent être rendus la semaine suivante. La bonne réponse réunit exactement ces deux informations.',
  29: 'La question demande la toute première action de Bogo. Le mémo lui demande d’abord de recevoir l’argent de Nakanishi, avant de poursuivre avec le colis. 中西さんにお金をもらいます reprend donc la première étape dans le bon ordre.',
  30: 'Chin n’avait pas étudié les kanji la veille et pensait que le contrôle avait lieu ce jour-là. Il s’est donc levé tôt pour étudier avant l’école. La cause est bien かんじテストのべんきょうがしたかったから : « parce qu’il voulait étudier pour le contrôle de kanji ».',
  31: 'À la fin du texte, Chin découvre que le contrôle n’est pas aujourd’hui mais demain. Il ne s’est pas trompé de manuel ni de salle : il s’est trompé sur le jour du contrôle. C’est pourquoi かんじのテストがある日 est la bonne réponse.',
  32: 'Il faut respecter deux conditions : rester dans le budget indiqué et choisir le trajet le plus court parmi ceux qui conviennent. L’itinéraire 4 satisfait la limite de prix et donne le meilleur temps compatible. Un trajet moins cher n’est pas correct s’il est plus long alors qu’une option autorisée est plus rapide.',
};

function getExamExplanation(segment: ExamSegment | null, choices: string[]): string {
  if (!segment) return '';
  const answer = choices[segment.correct_choice - 1] ?? String(segment.correct_choice);
  const prompt = segment.prompt_ja ?? '';

  if (segment.display_mode === 'question_image') {
    return `La proposition ${segment.correct_choice} est celle retenue par le corrigé de cette question. Compare-la avec l’élément demandé dans l’énoncé : lecture, mot, particule ou information du texte.`;
  }
  if (segment.skill_id === 'reading') {
    if (
      segment.source_id === 'src_jlpt_official_practice_2018'
      && EXAM_READING_EXPLANATIONS_2018[segment.question_number]
    ) {
      return EXAM_READING_EXPLANATIONS_2018[segment.question_number];
    }
    return `Le texte donne l’information qui correspond à « ${answer} ». Il faut répondre avec ce qui est réellement écrit, sans ajouter une supposition. Les autres choix contredisent un détail du texte ou répondent à une autre question.`;
  }
  if (segment.skill_id === 'vocabulary') {
    if (segment.problem_number === 1) {
      return `« ${answer} » est la lecture attendue du mot en kanji dans cette phrase. Les autres propositions changent un son ou utilisent la lecture d’un autre mot.`;
    }
    if (segment.problem_number === 2) {
      return `« ${answer} » est l’écriture qui correspond exactement au mot demandé. Les autres choix ont une lecture proche, mais ne représentent pas ce mot.`;
    }
    if (segment.problem_number === 3) {
      return `Dans « ${prompt} », « ${answer} » convient au sens et à la construction de la phrase. Les autres mots peuvent exister, mais ils ne décrivent pas correctement cette situation.`;
    }
    return `« ${answer} » exprime la même idée que la phrase de départ. Il faut conserver le sens, pas seulement reconnaître un mot commun.`;
  }

  if (
    segment.source_id === 'src_jlpt_official_practice_2018'
    && segment.skill_id === 'grammar'
    && EXAM_GRAMMAR_EXPLANATIONS_2018[segment.question_number]
  ) {
    return EXAM_GRAMMAR_EXPLANATIONS_2018[segment.question_number];
  }

  const particleExplanations: Record<string, string> = {
    'に': '「に」 marque ici le point d’arrivée, le moment précis ou la personne vers laquelle l’action se dirige. 「で」 indiquerait plutôt le lieu où une action se déroule.',
    'で': '「で」 marque ici le lieu de l’action ou le moyen utilisé. 「に」 servirait plutôt à indiquer une destination, une présence ou un moment précis.',
    'を': '「を」 marque ici ce que l’action touche directement. Le mot placé avant 「を」 est le complément du verbe.',
    'が': '「が」 désigne ici la personne ou la chose qui accomplit l’action ou possède la caractéristique décrite.',
    'は': '「は」 présente le thème dont on parle. La suite de la phrase donne une information à propos de ce thème.',
    'と': '「と」 relie ici des éléments de façon complète ou marque la personne avec laquelle l’action est faite.',
    'や': '「や」 donne plusieurs exemples sans fermer la liste. Cela correspond à « notamment… et… ».',
    'へ': '「へ」 indique la direction du déplacement. L’idée importante est le mouvement vers ce lieu.',
    'から': '「から」 indique le point de départ, dans l’espace ou dans le temps.',
    'まで': '「まで」 indique la limite ou le point d’arrivée, dans l’espace ou dans le temps.',
    'も': '「も」 ajoute un élément qui partage la même information : « aussi » ou « également ».',
    'の': '「の」 relie deux noms. Le premier précise l’appartenance, l’origine ou la catégorie du second.',
  };
  if (particleExplanations[answer]) {
    return `Dans « ${prompt} », ${particleExplanations[answer]} C’est cette fonction précise qui rend « ${answer} » correct ici.`;
  }
  if (segment.problem_number === 2) {
    return `Dans la phrase correctement reconstruite, « ${answer} » se place exactement à l’endroit de ★. L’ordre japonais conserve le verbe à la fin et place ses compléments avant lui.`;
  }
  return `Dans « ${prompt} », la forme « ${answer} » respecte à la fois le sens, le niveau de politesse et la construction demandée. Les autres formes changent le temps, la fonction ou la relation entre les mots.`;
}

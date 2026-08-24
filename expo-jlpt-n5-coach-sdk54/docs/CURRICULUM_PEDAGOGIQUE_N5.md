# Curriculum pédagogique JLPT N5

## Objet

Ce document définit le référentiel unique utilisé par l'application pour enseigner, réviser, interroger et débloquer les contenus. Les niveaux d'XP restent des récompenses de régularité ; ils ne déterminent jamais le niveau linguistique.

Le curriculum comporte 30 unités séquentielles, de `1A` à `10C`. Une unité combine :

- une compétence observable formulée en « je peux » ;
- un inventaire exact de contenus introduits ;
- les prérequis d'écriture nécessaires ;
- un volume minimal de réponses ;
- un seuil de précision ;
- un nombre de notions à maîtriser avant le passage à la suite.

## Références pédagogiques

Le JLPT ne publie plus de liste officielle fermée de vocabulaire, kanji ou grammaire. Le classement élément par élément de l'application est donc un référentiel éditorial propre, contrôlé par dépendances, et non une prétendue liste officielle.

Le référentiel s'appuie sur :

- le niveau N5 officiel : lecture d'expressions typiques en hiragana, katakana et kanji élémentaires, et compréhension de conversations courtes prononcées lentement ;
- les catégories officielles de questions N5 : lecture des kanji, orthographe, vocabulaire en contexte, paraphrase, formes grammaticales, composition de phrase, grammaire de texte et compréhension de textes courts ;
- le JF Standard, qui définit d'abord un niveau par les tâches que l'apprenant peut accomplir, les connaissances linguistiques servant ces tâches ;
- la progression A1 d'Irodori : salutations, stratégies de non-compréhension, présentation, puis situations quotidiennes ;
- la correspondance de référence JLPT : un N5 réussi correspond au niveau CECR A1 pour les compétences réceptives mesurées.

Sources :

- https://www.jlpt.jp/e/about/levelsummary.html
- https://www.jlpt.jp/e/guideline/pdf/n5_e_revised.pdf
- https://www.jlpt.jp/e/about/cefr_reference.html
- https://www.jfstandard.jpf.go.jp/summaryen/ja/render.do
- https://www.irodori.jpf.go.jp/en/starter/pdf.html

## Progression

| Phase | Unités | Résultat attendu |
| --- | --- | --- |
| 1 | 1A-1C | Reconnaître les premiers hiragana sans introduire de mot illisible |
| 2 | 2A-2C | Terminer les hiragana, lire les sons voisés et combinés |
| 3 | 3A-3C | Lire les katakana puis ouvrir le vocabulaire guidé sans romaji dans les réponses |
| 4 | 4A-4C | Compter, dater, comprendre l'heure et les consignes simples |
| 5 | 5A-5C | Parler de la routine, des goûts, de la famille et des repas |
| 6 | 6A-6C | Décrire, relier, proposer et comprendre les déplacements |
| 7 | 7A-7C | Raconter, comparer et poser des questions précises |
| 8 | 8A-8C | Nuancer, reconnaître les formes courtes, exprimer capacité et obligation |
| 9 | 9A-9C | Parler d'expérience, de changement et d'opinion |
| 10 | 10A-10C | Lire naturellement et réaliser une tâche complète de type N5 |

Les détails exécutables de chaque unité se trouvent dans `data/curriculum.ts`.

## Inventaires guidés

- Kana : 228 entrées canoniques classées par ligne, voisement et combinaison.
- Kanji : 80 kanji, introduits par groupes de huit entre `4A` et `7A`.
- Vocabulaire : 714 entrées guidées. Une entrée n'est disponible que lorsque son thème, tous ses kana et tous ses kanji sont accessibles. Les entrées sans thème exploitable sont ordonnées par priorité éditoriale puis par longueur de lecture ; elles ne sont jamais réparties aléatoirement.
- Grammaire : 119 leçons classées. Les exemples en kanji sont remplacés par leur version kana tant que les kanji nécessaires ne sont pas acquis.
- Référence : 1 398 entrées lexicales complémentaires restent consultables hors parcours guidé.

Les contenus avancés ou éditoriaux qui ne relèvent pas du socle N5, notamment le passif complet, le causatif, le causatif-passif, le keigo détaillé et les chapitres de préparation N4, sont exclus des quiz guidés.

## Règles obligatoires

1. Une leçon ne peut afficher que son niveau courant ou un niveau antérieur.
2. Une question, sa bonne réponse et tous ses distracteurs doivent respecter le même périmètre.
3. Un mot comportant un kana ou un kanji futur est repoussé jusqu'au niveau de ce prérequis.
4. Un exemple grammatical comportant un kanji futur est affiché en kana.
5. Le romaji peut servir de consigne pour découvrir un son, mais n'est pas mélangé à des réponses japonaises.
6. Le SRS révise le niveau courant ou les niveaux antérieurs ; il n'introduit jamais un contenu futur.
7. Les dialogues, l'immersion, l'écriture libre et l'examen blanc sont débloqués seulement lorsque leurs prérequis sont atteints.
8. Le diagnostic peut placer un utilisateur expérimenté plus haut ; l'XP ne le peut pas.
9. Une unité n'est validée qu'avec exposition, précision et maîtrise distincte des notions.
10. Toute donnée non classée est refusée par défaut dans le parcours guidé.
11. Le vocabulaire guidé se débloque en `3C`, lorsque ses kana peuvent être lus ; avant ce seuil, l'application travaille explicitement le décodage et n'affiche pas une bibliothèque vide.

## Contrôles automatiques

La commande `npm run test:curriculum` vérifie notamment :

- l'ordre et l'unicité des 30 unités ;
- l'absence de doublon dans les leçons de grammaire ;
- la couverture exacte des 80 kanji ;
- la taille réaliste du socle lexical ;
- la couverture des kana ;
- l'absence de niveau vide ;
- l'impossibilité d'un seuil supérieur au contenu disponible.

Cette validation fait partie de `npm run test:release` et bloque une publication si le contrat pédagogique est rompu.

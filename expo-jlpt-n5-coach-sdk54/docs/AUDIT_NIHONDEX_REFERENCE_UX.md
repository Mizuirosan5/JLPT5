# Audit de reference UX - NihonDex

## 1. Objet du document

Ce document synthétise l'analyse des 69 captures placées dans
`Support/Nihondex`. Il identifie les mécanismes qui rendent NihonDex fluide,
motivant et lisible, puis définit leur adaptation dans JLPT N5 Coach.

L'objectif n'est pas de reproduire l'identité graphique de NihonDex. JLPT N5
Coach conserve son identité japonaise adulte, son fonctionnement hors ligne,
ses données locales et l'absence de fonctions sociales. Les références servent
à améliorer les parcours, la pédagogie, les animations et la hiérarchie visuelle.

## 2. Principes observés

### 2.1 Une seule action principale par écran

- L'accueil indique la prochaine étape à réaliser.
- Les cartes `Apprendre` et `Réviser` portent des compteurs immédiatement lisibles.
- Les écrans d'exercice ne montrent que la question, la progression, les réponses
  et une sortie secondaire.
- Le bouton principal reste stable et visuellement dominant.

### 2.2 Une boucle d'apprentissage continue

La boucle type observée est la suivante :

1. apprendre un petit lot de notions ;
2. consulter des exemples contextualisés ;
3. terminer le lot ;
4. lancer immédiatement un exercice ;
5. recevoir un bilan court ;
6. refaire les erreurs ou continuer ;
7. envoyer les notions dans la révision SRS.

Cette continuité évite les retours inutiles au menu et réduit la charge mentale.

### 2.3 Des sessions courtes et prévisibles

- Progression visible sous forme de barre et de compteur.
- Quatre réponses maximum sur les exercices à choix.
- Bouton `Je ne sais pas` toujours disponible.
- Retour correct ou incorrect immédiat.
- Fin de session explicite et bilan mesurable.

### 2.4 Une motivation visible mais non bloquante

- Série, objectifs quotidiens, pièces et progression sont visibles.
- Les célébrations renforcent les étapes importantes.
- Le contenu reste accessible indépendamment des récompenses.
- La feuille de route conseille un ordre sans interdire l'exploration libre.

## 3. Inventaire des écrans de référence

### 3.1 Accueil et statistiques

Captures : `IMG_8372`, `IMG_8380`.

- Carte de prochaine étape avec action directe.
- Résumé compact : série, mots appris et révisions.
- Deux grandes entrées : apprendre et réviser.
- Progression quotidienne par domaine.
- Navigation inférieure limitée à cinq destinations.

Adaptation recommandée : conserver les trois destinations principales déjà
définies dans JLPT N5 Coach et utiliser le menu latéral pour l'inventaire complet.
La carte de reprise doit être calculée localement à partir du parcours, des
objectifs du jour et de la file SRS.

### 3.2 Apprentissage quotidien

Captures : `IMG_8373`, `IMG_8384`, `IMG_8385`.

- Lots quotidiens très courts : vocabulaire et grammaire.
- Choix entre parcours guidé et sélection libre par thème.
- Outils complémentaires clairement séparés.
- Indication du nombre de notions restantes.

Adaptation recommandée : proposer le choix `Parcours conseillé` ou
`Choisir un thème`, sans verrouiller le contenu. Le niveau courant filtre
uniquement les recommandations quotidiennes et les quiz automatiques.

### 3.3 Révision SRS

Captures : `IMG_8374`.

- Etat vide valorisant lorsque la file est terminée.
- Séparation entre révision normale, rapide et entraînement libre.
- Explication simple du fonctionnement de la répétition espacée.

Adaptation recommandée : conserver le SRS local actuel, mais harmoniser ses
trois modes avec le même moteur d'exercice et le même bilan de session.

### 3.4 Menu complet

Captures : `IMG_8381`, `IMG_8382`, `IMG_8383`.

- Menu latéral groupé par apprentissage, pratique, progression et réglages.
- Grandes lignes cliquables, icônes cohérentes et sous-titres courts.
- Accès rapide à toutes les fonctions sans surcharger la barre inférieure.

Adaptation recommandée : garder le menu latéral complet déjà demandé, avec des
kanji sémantiques ou des icônes, jamais des abréviations françaises cassées.

### 3.5 Leçon de vocabulaire

Captures : `IMG_8386` à `IMG_8390`.

- Mot japonais très lisible, lecture, traduction et audio.
- Phrase d'exemple avec furigana et traduction.
- Mot étudié mis en évidence dans son contexte.
- Exemple alternatif à la demande.
- Moyen mnémotechnique personnalisable.
- Récapitulatif du lot avant le passage à la pratique.

Adaptation recommandée : utiliser le composant japonais cliquable existant pour
révéler kana et romaji, puis faire suivre chaque lot appris d'un écran résumé et
d'un bouton `Commencer la pratique`.

### 3.6 Leçon de grammaire

Capture : `IMG_8391`.

- Structure grammaticale affichée en tête.
- Registre de langue visible.
- Explication découpée en sections numérotées.
- Exemples japonais, lectures et traductions.

Adaptation recommandée : ajouter systématiquement le registre, la structure,
le sens, les restrictions d'usage et au moins deux exemples traduits. Toutes les
données doivent rester cohérentes en français.

### 3.7 Parcours visuel

Captures : `IMG_8392` à `IMG_8398`.

- Noeuds alternés reliés par une ligne.
- Etat prochain, terminé ou à venir immédiatement identifiable.
- Leçons courtes avec durée et progression.
- Leçons de méthode précédant les contenus complexes.
- Boutons `Terminer` puis `Leçon suivante`.

Adaptation recommandée : afficher les modules 1A, 1B, 1C, etc. comme une ligne
de progression verticale. Chaque noeud ouvre sa fiche détaillée, ses prérequis,
ses objectifs, ses points de passage et ses critères de réussite.

### 3.8 Apprentissage des kana

Captures : `IMG_8399`, `IMG_8419`.

- Séquence : association visuelle, écoute, tracé puis reconnaissance.
- Sélection par groupes avec maîtrise par groupe.
- Nombre de groupes et taille de session visibles avant le départ.

Adaptation recommandée : relier les moyens mnémotechniques et le tracé déjà
présents au quiz kana dans une séquence unique, tout en conservant un mode libre.

### 3.9 Moteur d'exercice

Captures : `IMG_8400`, `IMG_8402` à `IMG_8405`, `IMG_8420`, `IMG_8421`.

- Question isolée au centre de l'écran.
- Cible japonaise très grande.
- Grille stable de deux par deux.
- Réponse au clavier lorsque le type d'exercice l'exige.
- Aucun indice ne révèle la bonne réponse avant le choix.
- Kana et kanji peuvent cohabiter, mais aucun romaji ne doit apparaître parmi
  des réponses japonaises.
- Retour immédiat sans changement brutal de page.
- Confettis légers et message de série à certains paliers seulement.

Adaptation recommandée : construire un shell d'exercice commun utilisé par les
quiz kana, kanji, vocabulaire, grammaire, audio et global.

### 3.10 Bilan et célébration

Captures : `IMG_8401`, `IMG_8418`.

- Quatre métriques : série, récompense, score et durée.
- Détail dépliable des réponses.
- Actions : continuer, refaire les erreurs, recommencer.
- Confettis courts qui n'empêchent pas l'action suivante.

Adaptation recommandée : réutiliser le moteur de célébration existant, mais le
connecter à toutes les fins de session. Remplacer partage et fonctions sociales
par `Voir la progression` et `Réviser les erreurs`.

### 3.11 Centre de pratique par compétence

Captures : `IMG_8424`, `IMG_8425`.

- Catalogue unique regroupé par caractères, grammaire, lecture, écoute et écriture.
- Chaque outil possède un titre d'action et une description concrète.
- Etiquettes `Commencez ici` et `Nouveau` pour orienter sans verrouiller.
- Séparation claire entre apprentissage guidé et entraînement libre.

Adaptation recommandée : ajouter un centre `Pratiquer` dans le sous-menu Quiz,
avec des entrées vers kana, kanji, radicaux, conjugaison, nombres, lecture, écoute
et construction de phrases. Les recommandations doivent venir du niveau et des
faiblesses locales, pas de simples étiquettes fixes.

### 3.12 Radicaux et relations entre kanji

Captures : `IMG_8422`, `IMG_8423`.

- Exercice de reconnaissance d'un radical.
- Bouton contextuel affichant les kanji qui contiennent ce radical.
- Lecture et sens des kanji liés dans une fenêtre secondaire.

Adaptation recommandée : intégrer les radicaux comme aide à la mémorisation des
80 kanji N5, sans en faire un prérequis bloquant. Chaque radical doit conduire
aux cartes kanji correspondantes et réciproquement.

### 3.13 Conjugaison configurable et productive

Captures : `IMG_8426` à `IMG_8428`, `IMG_8446`.

- Parcours d'apprentissage préalable pour les débutants.
- Paramètres : nombre de questions, niveau JLPT, focus, groupe verbal et formes.
- Sélection séparée des formes de base, en て, avancées et spéciales.
- Options de furigana, audio, formes complexes et questions pièges.
- Réponse produite au clavier plutôt que reconnue parmi quatre choix.
- Progression détaillée par forme de conjugaison.

Adaptation recommandée : créer deux préréglages, `Guidé` et `Personnalisé`.
Le mode guidé sélectionne uniquement les formes déjà enseignées. Le mode libre
expose les paramètres avancés, avec un avertissement non bloquant si une forme
dépasse le niveau courant.

### 3.14 Pratique kanji multi-mode

Captures : `IMG_8429` à `IMG_8433`, `IMG_8445`.

- Sélection par niveau, kanji précis, ordre aléatoire ou focus et taille de session.
- Trois modes : classique, lecture et dessin.
- Filtres sur les kanji connus et l'affichage des aides.
- Questions kanji vers lecture et sens vers kanji.
- Recherche et progression individuelle pour chaque caractère.

Adaptation recommandée : rattacher ces modes à `Apprendre > Kanji`, conserver
les deux sens de quiz déjà demandés et ajouter une vue de maîtrise compacte des
80 cartes. Le mode dessin doit réutiliser le moteur de tracé plutôt qu'un second
canvas indépendant.

### 3.15 Construction de phrases

Captures : `IMG_8434`, `IMG_8435`.

- Niveau, furigana, difficulté et mode particules configurables.
- Traduction source suivie de blocs japonais à ordonner.
- Glisser-déposer ou toucher, annulation, indice et validation explicite.
- Lecture au-dessus des mots contenant des kanji.

Adaptation recommandée : utiliser uniquement des phrases dont toutes les notions
sont au niveau choisi. La correction doit expliquer l'ordre, chaque particule,
le sens de chaque bloc et la traduction complète.

### 3.16 Nombres et vitesse kana

Captures : `IMG_8436`, `IMG_8437`.

- Nombres par plages de difficulté et modes saisie ou choix multiple.
- Tailles de session prédéfinies.
- Sprint kana de 15, 30, 60 ou 120 secondes.
- Hiragana, katakana ou mélange.

Adaptation recommandée : classer ces outils comme entraînements facultatifs.
La vitesse ne doit intervenir dans la maîtrise qu'après une précision suffisante,
afin de ne pas pénaliser les vrais débutants.

### 3.17 Fiches pratiques et comparaisons grammaticales

Captures : `IMG_8439` à `IMG_8443`.

- Kits de phrases par situation réelle.
- Structures de phrases réutilisables avec vocabulaire interchangeable.
- Comparaisons directes des points souvent confondus : は/が, に/で/へ,
  ある/いる, adjectifs い/な, connecteurs et expressions temporelles.
- Listes de référence : compteurs, verbes, démonstratifs, pronoms et temps.

Adaptation recommandée : ajouter une bibliothèque hors ligne `Fiches pratiques`
en français. Chaque comparaison doit contenir une règle de décision, des paires
d'exemples minimales, des contre-exemples et un mini-quiz ciblé.

### 3.18 Tableaux de maîtrise granulaires

Captures : `IMG_8438`, `IMG_8444` à `IMG_8447`.

- Maîtrise par point grammatical et date de prochaine révision.
- Kana colorés individuellement dans chaque ligne selon leur score.
- Kanji recherchables avec pourcentage individuel.
- Conjugaisons suivies forme par forme.
- Vocabulaire filtrable avec statut SRS, historique et prochaine révision.

Adaptation recommandée : calculer un même indicateur local de maîtrise pour les
quatre domaines, tout en montrant les preuves qui le composent. Eviter un faux
pourcentage précis lorsqu'il n'existe qu'une tentative : afficher d'abord
`Nouveau`, `En cours`, `Solide` ou `A revoir`, puis le détail des essais.

### 3.19 Lecture interactive et quiz de compréhension

Captures : `IMG_8448` à `IMG_8451`.

- Histoires filtrées par niveau avec durée et pourcentage de vocabulaire connu.
- Furigana et romaji activables séparément.
- Traduction phrase par phrase, jamais imposée avant l'action.
- Mots, conjugaisons et points de grammaire touchables dans le texte.
- Encadrés pédagogiques contextuels.
- Quiz de compréhension court à la fin de l'histoire.

Adaptation recommandée : faire de cette fonctionnalité un chantier prioritaire.
Chaque histoire N5 doit utiliser le dictionnaire local, les composants japonais
cliquables, l'audio embarqué disponible et le moteur de quiz commun. Le taux de
vocabulaire connu doit être calculé depuis le SRS de l'utilisateur.

### 3.20 Défauts observés à ne pas reproduire

- Mélange fréquent du français et de l'anglais dans les menus, leçons et quiz.
- Quelques libellés techniques ou traductions incomplètes.
- Barre de navigation encore visible pendant certains exercices focalisés.
- Ecrans de paramètres très longs avec action principale hors du premier écran.
- Pourcentages de maîtrise trop affirmatifs après très peu de réponses.
- Célébrations qui peuvent masquer une partie de l'interface.

JLPT N5 Coach doit rester intégralement en français, masquer la navigation pendant
les sessions, proposer des préréglages simples et réserver les options avancées à
un panneau secondaire.

## 4. Ecarts actuels de JLPT N5 Coach

### Déjà bien couvert

- SRS local et file de révision.
- Objectifs quotidiens adaptatifs.
- Séries, XP, badges et récompenses.
- Parcours détaillé et niveaux pédagogiques.
- Quiz kana, kanji, vocabulaire, grammaire, audio et examen.
- Moyens mnémotechniques kana.
- Cartes kanji plein écran et contenu local.
- Révélation kana/romaji sur les éléments japonais cliquables.
- Animations de récompense sur le tableau de bord.

### A harmoniser ou compléter

- Les moteurs de quiz utilisent encore des présentations différentes.
- Les célébrations ne sont pas branchées de façon uniforme sur les exercices.
- La transition `apprendre -> résumé -> pratiquer -> SRS` n'est pas universelle.
- Le bilan de session n'offre pas partout `refaire les erreurs`.
- La feuille de route doit gagner une représentation visuelle plus continue.
- Le choix guidé ou libre doit précéder les sessions recommandées.
- Les objectifs et prochaines actions doivent être plus visibles sur l'accueil.
- Les états vides doivent proposer une suite utile.
- Les animations doivent rester fluides sur iPhone et respecter la réduction des
  mouvements configurée par le système.

## 5. Chantiers d'implementation prioritaires

### P0. Shell d'exercice commun

- Créer un composant commun pour l'en-tête, la progression, la question, les
  réponses, `Je ne sais pas`, le retour et la sortie de session.
- Supporter QCM 2x2, choix texte, saisie et écoute.
- Garantir une hauteur stable des réponses et aucun débordement mobile.
- Interdire la révélation de la réponse avant validation.
- Vérifier automatiquement l'homogénéité du système d'écriture des choix.

Critères d'acceptation : tous les quiz utilisent la même hiérarchie, les réponses
ne déplacent pas la page et aucun choix romaji n'est mélangé à des choix japonais.

### P0. Retour immédiat et animations

- Ajouter un retour correct/incorrect inline.
- Déclencher une animation légère sur une bonne réponse.
- Réserver les grandes célébrations aux séries 3, 7, 14, 30 jours, aux badges et
  aux fins de module.
- Utiliser uniquement des motifs japonais adultes : sceau, papier découpé, ruban,
  motifs géométriques et calligraphie.
- Couper son, haptique et animation selon les réglages locaux.

Critères d'acceptation : animation sous 900 ms pour une réponse, aucune action
bloquée, aucune chute visible de fluidité sur mobile.

### P0. Bilan de session universel

- Afficher score, durée, meilleure série et progression gagnée.
- Lister les erreurs et leur explication.
- Ajouter `Refaire mes erreurs`, `Recommencer` et `Continuer`.
- Alimenter automatiquement le cahier d'erreurs et le SRS.

Critères d'acceptation : chaque type de quiz produit le même contrat de résultat
et peut relancer uniquement les éléments échoués.

### P0. Parcours visuel continu

- Transformer les modules en noeuds reliés avec états terminé, courant et futur.
- Préserver l'accès libre à chaque module.
- Afficher la recommandation du jour sans verrou.
- Ouvrir une fiche de détail complète au toucher.

Critères d'acceptation : l'utilisateur identifie son niveau, sa prochaine étape
et les conditions de réussite en moins de cinq secondes.

### P1. Choix parcours ou thème

- Proposer `Parcours conseillé` et `Choisir un thème` avant une nouvelle session.
- Filtrer les recommandations par niveau pédagogique réel.
- Ne jamais injecter une notion d'un niveau supérieur dans une session guidée.
- Autoriser l'exploration libre de tous les contenus depuis les bibliothèques.

### P1. Lot d'apprentissage complet

- Limiter les lots quotidiens à une taille configurable.
- Présenter notion, lecture, sens, exemple, audio et aide mnémotechnique.
- Résumer le lot, puis lancer sa pratique.
- Ajouter les notions réussies à la file SRS.

### P1. Progression kana en quatre phases

- Découverte visuelle et sonore.
- Tracé guidé.
- Reconnaissance à choix.
- Production par saisie.
- Maitrise calculée séparément par groupe.

### P1. Moyens mnémotechniques personnels

- Autoriser une note locale pour vocabulaire, kanji et kana.
- Fournir des suggestions statiques hors ligne.
- Ne jamais appeler un service d'IA ou un serveur externe.

### P1. Lecture interactive graduée

- Constituer un premier corpus d'histoires N5 entièrement françaises.
- Annoter localement mots, lectures, conjugaisons et points de grammaire.
- Calculer le vocabulaire connu depuis la progression SRS.
- Révéler lecture ou traduction uniquement sur action.
- Terminer chaque histoire par trois à cinq questions de compréhension.

### P1. Progression granulaire commune

- Définir un contrat de maîtrise commun aux kana, kanji, vocabulaire, grammaire
  et conjugaison.
- Distinguer statut pédagogique, précision, volume d'essais et prochaine révision.
- Ajouter recherche, filtres et accès direct à une pratique ciblée.

### P2. Sélecteurs de pratique et états vides

- Choisir groupes, thèmes, niveau et longueur de session.
- Afficher la maîtrise avant le lancement.
- Transformer chaque état vide en prochaine action pertinente.

### P2. Outils spécialisés hors ligne

- Pratique des radicaux reliée aux 80 kanji.
- Construction de phrases et mode particules.
- Conjugaison productive avec saisie japonaise.
- Entraînement des nombres par plages.
- Sprint kana chronométré après validation de la précision.
- Fiches comparatives et kits de phrases situationnels.

## 6. Contraintes obligatoires

- Fonctionnement intégral sans connexion Internet.
- Aucune connexion sociale, aucun classement et aucun partage obligatoire.
- Aucun contenu verrouillé par XP, série, badge ou paiement.
- Données, audio, progression et préférences stockés localement.
- Français cohérent dans l'ensemble des leçons et rapports.
- Niveau pédagogique déterministe pour chaque notion.
- Accessibilité : contraste, tailles tactiles, lecteur d'écran, texte dynamique et
  option de réduction des mouvements.
- Performance : listes virtualisées, calculs mémorisés, animations natives et
  chargement différé des données lourdes.

## 7. Ordre d'execution recommande

1. Définir le contrat commun des questions et résultats.
2. Construire le shell d'exercice commun.
3. Migrer le quiz kana comme écran pilote.
4. Ajouter retour immédiat, animations et bilan universel.
5. Migrer kanji, vocabulaire, grammaire, audio puis quiz global.
6. Connecter erreurs et résultats au SRS.
7. Ajouter la lecture interactive et ses quiz de compréhension.
8. Unifier les tableaux de maîtrise par compétence.
9. Refaire le parcours sous forme de noeuds continus.
10. Ajouter le choix guidé ou libre et les lots d'apprentissage.
11. Unifier les aides mnémotechniques et les séquences kana.
12. Ajouter les outils spécialisés : phrases, conjugaison, radicaux et nombres.
13. Réaliser les tests visuels et fonctionnels desktop/mobile.

## 8. Verification finale attendue

- Tests unitaires sur filtrage de niveau, notation, série et SRS.
- Tests de contrat pour chaque générateur de quiz.
- Tests Playwright de tous les menus et parcours web.
- Captures à 390 x 844, 430 x 932, tablette et bureau.
- Vérification réelle iPhone reportée uniquement à la phase mobile autorisée.
- Mesure du temps d'affichage, des rerenders et des listes longues.
- Vérification manuelle des textes japonais, lectures et traductions.

## 9. Decision produit

La meilleure direction n'est pas une copie graphique de NihonDex. Il faut en
reprendre la discipline d'interaction : sessions focalisées, enchaînements courts,
retours instantanés, bilan utile et prochaine étape évidente. JLPT N5 Coach doit
y ajouter ses forces propres : cartes physiques fidèlement adaptées, rapport de
niveau professionnel, contenu français, accès totalement libre et fonctionnement
hors ligne.

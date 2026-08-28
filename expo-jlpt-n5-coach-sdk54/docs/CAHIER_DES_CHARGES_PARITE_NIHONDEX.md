# Cahier des charges d'execution - Reference NihonDex

Le détail exécutable des travaux encore ouverts est maintenu dans
`CAHIER_DES_CHARGES_NIHONDEX_RESTE_A_FAIRE_V3.md`.

## 1. Finalite

Ce document pilote l'integration dans JLPT N5 Coach des mecanismes utiles observes
sur les 69 captures `IMG_8372` a `IMG_8451` du dossier `Support/Nihondex`.

L'objectif est la parite fonctionnelle et qualitative : fluidite, pedagogie,
enchaînement des exercices, densite d'information et richesse des outils. Les
marques, textes, illustrations et compositions propres a NihonDex ne sont pas
copies. JLPT N5 Coach conserve son identite japonaise adulte, son contenu francais,
son fonctionnement hors ligne et son acces libre a tous les contenus.

## 2. Regles produit non negociables

- [x] Application utilisable sans Internet apres installation.
- [x] Aucun reseau social, partage obligatoire ou service distant.
- [x] Aucun contenu verrouille par XP, badge, serie ou niveau.
- [x] Recommandations et quiz guides bornes par niveau pedagogique reel.
- [x] Bibliotheques librement explorables depuis le premier jour.
- [x] Reponses japonaises sans distracteur romaji melange.
- [x] Bonne reponse jamais revelee avant validation.
- [ ] Navigation masquee pendant toutes les sessions focalisees.
- [x] Reduction des mouvements respectee par les transitions et celebrations principales.
- [ ] Contraste, lecteur d'ecran et cibles tactiles verifies sur tous les nouveaux ecrans.

## 3. Matrice des captures

| Lot | Captures | Fonction de reference | Destination JLPT5 |
| --- | --- | --- | --- |
| Accueil | 8372, 8380 | prochaine action, resume, serie | Aujourd'hui |
| Apprendre | 8373, 8384-8385 | guide ou theme, lots courts | Centre d'apprentissage |
| Reviser | 8374 | file SRS et etat vide utile | Revisions |
| Navigation | 8381-8383 | menu groupe complet | Menu lateral |
| Vocabulaire | 8386-8390 | notion, exemple, audio, memo | Lecon vocabulaire |
| Grammaire | 8391 | structure, registre, exemples | Lecon grammaire |
| Parcours | 8392-8398 | noeuds continus et fiches | Parcours 1A-10C |
| Kana | 8399, 8419 | voir, ecouter, tracer, produire | Apprendre Kana |
| Exercices | 8400, 8402-8405, 8420-8421 | shell focalise et retour inline | Moteur commun |
| Bilan | 8401, 8418 | score, serie, erreurs, suite | Bilan universel |
| Radicaux | 8422-8423 | radical vers kanji associes | Pratique kanji |
| Pratique | 8424-8425 | catalogue par competence | Centre Pratiquer |
| Conjugaison | 8426-8428, 8446 | guide, filtres, saisie | Atelier conjugaison |
| Kanji | 8429-8433, 8445 | sens, lecture, dessin, filtres | Pratique kanji |
| Phrases | 8434-8435 | blocs a ordonner et particules | Atelier de phrases |
| Vitesse | 8436-8437 | nombres et sprint kana | Defis facultatifs |
| Maitrise | 8438, 8444-8447 | suivi granulaire et echeance | Tableau de maitrise |
| Fiches | 8439-8443 | situations et comparaisons | Fiches pratiques |
| Lecture | 8448-8451 | texte interactif et comprehension | Histoires N5 |

## 4. Lots d'implementation

### NDX-01 - Accueil oriente action

- [x] Afficher une prochaine session calculee localement.
- [x] Afficher objectifs, serie, progression et revisions dues.
- [x] Ajouter deux entrees stables `Apprendre` et `Reviser` avec compteurs.
- [x] Faire tenir la prochaine action et le resume quotidien dans le premier ecran mobile.

Acceptation : l'utilisateur comprend quoi faire en moins de cinq secondes.

### NDX-02 - Boucle apprendre, pratiquer, reviser

- [ ] Choisir `Parcours conseille` ou `Choisir un theme`.
- [ ] Presenter un lot court avec lecture, sens, audio, exemple et memo.
- [ ] Afficher un recapitulatif avant la pratique.
- [ ] Lancer un exercice limite aux notions du lot.
- [ ] Envoyer les resultats vers SRS et cahier d'erreurs.
- [ ] Proposer directement la prochaine action.

Acceptation : aucune rupture de navigation entre les cinq etapes.

### NDX-03 - Shell d'exercice commun

- [x] Creer les composants communs de question et de resultat.
- [x] Creer l'en-tete focalise : progression et compteur.
- [ ] Supporter dans le shell commun QCM 2x2, saisie, audio, ordre de mots et tracage.
- [x] Ajouter `Je ne sais pas` sans reveler la reponse auparavant dans la session pilote.
- [x] Stabiliser les dimensions des choix sur telephone.
- [ ] Masquer la navigation generale pendant la session.

Acceptation : kana, kanji, vocabulaire, grammaire, audio et global partagent le
meme comportement et la meme hierarchie visuelle.

### NDX-04 - Retour et bilan universels

- [ ] Retour correct ou incorrect affiche dans l'ecran courant.
- [ ] Explication du sens, de chaque mot et de la phrase traduite.
- [ ] Animation courte non bloquante pour une reponse correcte.
- [ ] Bilan : score, duree, meilleure serie et progression.
- [ ] Actions `Continuer`, `Refaire mes erreurs`, `Recommencer`.
- [ ] Detail depliable de toutes les reponses.

Acceptation : toutes les sessions produisent le meme objet de resultat.

### NDX-05 - Centre de pratique

- [x] Ajouter une destination `Pratiquer` accessible depuis Quiz et le menu lateral.
- [x] Regrouper les outils specialises dans un catalogue unique.
- [x] Ajouter radicaux, conjugaison, phrases, nombres et sprint kana.
- [x] Afficher `Recommande` depuis les faiblesses locales.
- [x] Conserver l'acces libre a chaque outil.

### NDX-06 - Parcours continu

- [x] Trente sous-niveaux 1A a 10C avec progression et criteres.
- [x] Fiche detaillee de module.
- [ ] Representer les modules en noeuds verticaux relies.
- [ ] Differencier clairement termine, courant, recommande et futur accessible.
- [ ] Ajouter duree estimee et prochaine lecon.

### NDX-07 - Kana en quatre phases

- [x] Cartes, audio, trace et quiz disponibles.
- [ ] Enchaîner decouverte, ecoute, trace, reconnaissance puis production.
- [ ] Suivre la maitrise par groupe et par caractere.
- [ ] Ajouter sprint 15, 30, 60 et 120 secondes apres precision suffisante.

### NDX-08 - Kanji et radicaux

- [x] 80 cartes N5, plein ecran, lecture et vocabulaire.
- [x] Quiz kanji vers francais et japonais vers kanji.
- [x] Ajouter un premier catalogue des radicaux relies aux kanji N5.
- [ ] Ajouter filtres niveau, choix precis, connus, fragiles et ordre aleatoire.
- [ ] Ajouter modes classique, lecture et dessin dans un selecteur unique.
- [ ] Afficher une maitrise individuelle sobre et justifiee.

### NDX-09 - Conjugaison productive

- [x] Ajouter un premier exercice guide des groupes verbaux.
- [ ] Ajouter un mode personnalise avec formes autorisees.
- [x] Couvrir poli, passe, negatif et forme en て sur un corpus N5 initial.
- [x] Reponse japonaise saisie et correction immediate.
- [ ] Suivi de maitrise par forme et par groupe.

### NDX-10 - Construction de phrases

- [x] Phrase francaise source et blocs japonais a ordonner.
- [x] Interaction par toucher compatible mobile.
- [x] Annulation, indice, validation et audio.
- [ ] Furigana revelable sur les blocs contenant des kanji.
- [x] Explication de l'ordre, des particules et traduction complete.

### NDX-11 - Nombres et compteurs

- [ ] Plages 0-10, 0-100, 0-1 000, dates, heures, prix et compteurs.
- [ ] Modes japonais vers nombre, nombre vers japonais et audio.
- [x] Ajouter une premiere saisie directe des nombres de 0 a 9 999 avec lectures irregulieres.
- [x] Ajouter les deux directions nombre vers japonais et japonais vers nombre.
- [x] Ajouter prix, heures, personnes et compteur generique avec irregularites N5.
- [ ] Ajouter dates, minutes et audio dedie a chaque compteur.

### NDX-12 - Fiches pratiques hors ligne

- [x] Situations : presentation, restaurant, achats, transport, urgence et voyage.
- [x] Comparaisons : は/が, に/で/へ, ある/いる, adjectifs い/な.
- [ ] References : compteurs, demonstratifs, pronoms, temps et verbes.
- [x] Chaque fiche comporte regle de decision, exemples, point d'attention et mini-quiz.

### NDX-13 - Maitrise granulaire

- [ ] Contrat commun `Nouveau`, `En cours`, `Solide`, `A revoir`, `Maitrise`.
- [ ] Afficher volume d'essais, precision et prochaine revision.
- [ ] Recherche et filtres pour kana, kanji, vocabulaire, grammaire et conjugaison.
- [ ] Ne pas afficher un pourcentage affirmatif avec moins de trois essais.
- [ ] Lancer une pratique ciblee depuis chaque ligne.

### NDX-14 - Lecture interactive

- [x] Histoires N5 et quiz de comprehension disponibles.
- [x] Elements japonais touchables et traductions revelables.
- [x] Ajouter filtres de difficulte et de duree.
- [x] Afficher le taux local de vocabulaire deja rencontre.
- [ ] Ajouter le taux de vocabulaire connu comme filtre de liste.
- [x] Annoter les mots touchables et les points grammaticaux.
- [ ] Annoter automatiquement les conjugaisons dans chaque phrase.
- [x] Ajouter lecture kana et romaji avec bascules independantes.
- [x] Ajouter audio local lorsqu'un fichier embarque existe, avec repli vocal hors ligne.

### NDX-15 - Qualite transversale

- [ ] Tous les textes visibles sont en francais correct.
- [ ] Aucune reponse n'est revelee avant le choix.
- [ ] Aucun melange romaji/japonais parmi les reponses.
- [ ] Retour disponible a tout moment.
- [ ] Etats vides accompagnes d'une action utile.
- [ ] Listes longues virtualisees ou paginees.
- [ ] Test 390x844, 430x932, tablette et bureau.
- [x] Zero debordement horizontal et zero erreur console bloquante sur les trois formats mobiles audites.

## 5. Definition de termine

Un lot n'est coche que lorsque le code, la persistance, les contenus, les tests
unitaires et la verification responsive sont termines. Une maquette statique ou
un bouton sans moteur fonctionnel ne suffit pas. Toute limite restante est notee
explicitement dans ce document.

## 6. Etat d'execution verifie

Derniere verification : 28 aout 2026.

- [x] TypeScript sans erreur avec `npm run typecheck`.
- [x] 36 tests unitaires et 7 tests d'integration valides.
- [x] Validation du contenu : 118 fichiers source et 934 declarations audio.
- [x] Pack MP3 physique : 934 fichiers sur 934 presents et inclus dans l'export.
- [x] Export web de production genere.
- [x] Audit Playwright de 66 vues sur 375x667, 390x844 et 430x932.
- [x] Inspection additionnelle sur 402x874, tablette 768x1024 et bureau 1440x900.
- [x] Aucune erreur de frontiere, aucun log console bloquant, aucun debordement horizontal.
- [x] Inspection visuelle des ecrans Aujourd'hui, Pratiquer, Lecture et session rapide.
- [x] Contraste du texte d'aide de la session debutante corrige apres inspection.

Restent explicitement hors statut termine : verification VoiceOver et clavier sur
iPhone reel, migration depuis une vraie base V7 remplie, observation d'un build
TestFlight, validation des droits editoriaux et formalites de boutique. Les
ameliorations non bloquantes encore decrites dans ce cahier restent des evolutions
post-candidate lorsqu'elles ne correspondent pas a une demande produit prioritaire.

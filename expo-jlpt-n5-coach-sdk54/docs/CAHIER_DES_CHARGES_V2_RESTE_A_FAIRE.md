# Cahier des charges V2 - Reste a faire JLPT N5 Coach

> Reference de publication : utiliser desormais `docs/CAHIER_DES_CHARGES_V2_PUBLICATION.md` pour l'ordre d'execution, les validations et la decision Go / No-Go. Le present fichier reste une archive detaillee des evolutions fonctionnelles.

Date d'audit : 2026-08-17

## 1. Objectif du document

Ce document remplace la lecture confuse des anciens cahiers pour la suite du projet. Il liste uniquement ce qui reste a faire pour passer l'application d'un etat MVP+/V1 solide a une V2 vraiment professionnelle, stable, lisible sur iPhone, pedagogiquement profonde et exploitable hors ligne.

Ce cahier est base sur l'audit des fichiers suivants :

- `App.tsx`
- `models.ts`
- `services/database.ts`
- `components/AppNavigation.tsx`
- tous les ecrans `components/*.tsx`
- tous les services `services/*.ts`
- les donnees locales `data/*.ts`
- les scripts `scripts/*.mjs`, `scripts/*.ps1`
- les cahiers existants dans `docs/`

## 2. Etat actuel resume

L'application possede deja une base tres avancee :

- navigation avec dashboard, parcours, diagnostic, revisions SRS, erreurs, apprendre, quiz, examen, preferences ;
- menu lateral avec tous les menus ;
- bouton retour global ;
- SQLite locale ;
- historique de questions ;
- SRS central ;
- file de revisions ;
- objectifs quotidiens adaptatifs ;
- objectifs hebdomadaires/mensuels ;
- badges, XP, assiduite, ligue locale ;
- mode 5 minutes ;
- preferences pedagogiques ;
- vocabulaire et cartes style physique ;
- kanji detail avec composants ;
- grammaire structuree ;
- quiz global multi-domaines ;
- quiz grammaire ;
- quiz audio hybride ;
- test d'aptitude et rapport ;
- immersion texte cliquable ;
- stories/dialogues ;
- journal d'ecriture local ;
- flashcards depuis erreurs ;
- correction enrichie et lookup japonais.

Niveau actuel estime : MVP+/V1 eleve.

Niveau V2 vise : application stable, polie, coherente, verifiee mobile, avec boucle d'apprentissage complete et profondeur pedagogique.

## 3. Principes V2 non negociables

- L'app doit rester 100% offline.
- Aucune API externe.
- Aucun backend.
- Aucun reseau social.
- Pas d'IA distante.
- Pas de contenu telecharge au runtime.
- Tous les contenus critiques doivent etre embarques.
- Toute nouvelle donnee utilisateur doit persister dans SQLite.
- Toute feature liee a une connaissance doit alimenter le SRS.
- Toute feature liee a un effort doit alimenter progression/recompenses.
- Aucun ecran mobile ne doit avoir de texte superpose.
- Les textes japonais doivent rester lisibles et correctement encodes.
- Les validations automatises doivent passer avant cloture.
- La validation iPhone doit etre obligatoire avant declaration V2.

## 4. Registre V2 global

| # | Chantier V2 | Priorite | Etat actuel | Reste a faire V2 |
|---|---|---|---|---|
| 0 | Stabilisation encoding/UI mobile | P0 | Encoding OK | Mojibake app corrige, verifier iPhone et lisibilite globale |
| 1 | SRS intelligent V2 | P0 | MVP/V1 | Prediction d'oubli, stats memoire, cas SRS vide/plein |
| 2 | Corrections intelligentes V2 | P0 | V1 | Wrong answers detaillees par distracteur, profil utilisateur |
| 3 | Diagnostic et rapports V2 | P0 | MVP/V1 | Retest mensuel, comparaison evolution, rapport examen unifie |
| 4 | Parcours pedagogique V2 | P0 | V1 | Verrous plus robustes, remediation auto, sous-parcours dynamiques |
| 5 | QA mobile complete | P0 | Non faite | Tests visuels iPhone ecran par ecran |
| 6 | Cartes vocab/kanji V2 | P1 | V1 | Polish final, mode detail, swipe/flip controle, tests petits ecrans |
| 7 | Grammaire V2 | P1 | V1 | Enrichissement complet, revision croisee, liens erreurs -> lecons |
| 8 | Kanji V2 | P1 | V1 | Traces/ordre visuel, familles, progression par composants |
| 9 | Exercices adaptatifs V2 | P1 | V1 | Format selon maitrise, saisie plus tolerante, stats par format |
| 10 | Immersion V2 | P1 | MVP/V1 | Audit tokens, import local simple, plus de textes controles |
| 11 | Stories V2 | P1 | V1 | Scenes visuelles, progression plus claire, audio quand disponible |
| 12 | Journal V2 | P2 | MVP/V1 | Analyse grammaticale locale plus fine, revision erreurs ecrites |
| 13 | Gamification V2 | P2 | V1 | Historique saisons, historique objectifs, animations calibrees |
| 14 | Preferences V2 | P2 | MVP/V1 | Taille police, profils sauvegardes, propagation exhaustive |
| 15 | Audio embarque V2 | P2/P3 | Partiel hybride | Generer/ajouter WAV, audit strict, fallback final |
| 16 | Documentation et release | P0 | Partiel | Nettoyage docs, checklist release, README final |

## 5. Chantier 0 - Stabilisation encoding et qualite UI

### Probleme constate

Plusieurs fichiers affichent ou contiennent des chaines potentiellement corrompues ou mojibake, notamment dans :

- `App.tsx`
- `models.ts`
- `components/AppNavigation.tsx`
- `components/VocabularyScreen.tsx`
- certains services de quiz/factory

Exemples de patterns a auditer : `Ã`, `Â`, `â`, `æ`, `ã`, `??`.

### Objectif V2

Avoir une application dont tous les textes francais, japonais, kana et icones s'affichent correctement sur web et Expo Go.

### Etapes obligatoires

- [x] Lancer un scan encoding sur `*.ts`, `*.tsx`, `*.md`.
- [x] Lister les occurrences legitimes et illegitimes.
- [x] Corriger les textes UI corrompus visibles.
- [x] Remplacer les icones textuelles corrompues par des libelles ASCII ou vrais caracteres verifies.
- [x] Verifier l'en-tete `日本語を楽しく` dans `App.tsx`.
- [x] Verifier les icones du menu lateral.
- [x] Verifier les libelles des modes quiz.
- [x] Verifier les categories visuelles vocabulaire.
- [x] Verifier que les regex contenant du japonais restent valides.
- [x] Ajouter une note dans le README sur l'encodage UTF-8.

### Journal d'execution

- 2026-08-17 : scan applicatif `*.ts`, `*.tsx`, `*.json` propre apres correction de `services/globalQuizFactory.ts` et `components/VocabularyScreen.tsx`. Les seules sequences mojibake restantes sont documentaires et citees comme exemples de detection.
- 2026-08-17 : `npm run typecheck` OK et `npm run smoke` OK apres correction.

### Criteres d'acceptation

- Aucun mojibake visible dans l'app.
- Aucun `??` parasite dans les boutons ou corrections.
- Les caracteres japonais de donnees ne sont pas detruits.
- `npm run typecheck` OK.
- `npm run smoke` OK.
- `npm run export:web` OK.
- Verification iPhone OK.

## 6. Chantier 1 - SRS intelligent V2

### Etat actuel

Fichiers principaux :

- `services/srs.ts`
- `services/srsQueue.ts`
- `components/ReviewQueueScreen.tsx`
- `components/DashboardScreen.tsx`
- `services/dashboardData.ts`

Le SRS central fonctionne deja avec statuts, due dates, file, filtres et sessions.

### Reste V2

- [ ] Tester explicitement SRS vide.
- [ ] Tester explicitement SRS plein.
- [x] Ajouter scenario "trop d'items dus" avec priorisation claire.
- [x] Ajouter prediction d'oubli simple : score de risque = age + erreurs + wrong streak - correct streak.
- [ ] Afficher un graphique compact de memoire dans Revisions ou Dashboard.
- [x] Ajouter action "je connais deja" dans la file SRS.
- [x] Ajouter action "revoir plus tard".
- [x] Ajouter raisons visibles : "revient car erreur recente", "revient car jamais revu", "revient car fragile".
- [x] Ajouter tests smoke locaux sur l'algorithme SRS.
- [ ] Verifier que toutes les sources alimentent correctement `app_srs_item_state`.

### Journal d'execution

- 2026-08-17 : ajout de `riskScore`, `reviewReason`, tri par risque dans `services/srsQueue.ts`.
- 2026-08-17 : ajout des actions rapides `Je connais deja` et `Revoir plus tard` dans `components/ReviewQueueScreen.tsx`.
- 2026-08-17 : ajout d'une garde smoke SRS V2 dans `scripts/smoke-check.mjs`.

### Criteres d'acceptation

- Une file vide affiche un etat utile et propose une session alternative.
- Une file pleine reste lisible et priorisee.
- L'utilisateur comprend pourquoi un item revient.
- Les items rates reviennent plus vite que les items solides.
- Les changements persistent apres redemarrage.

## 7. Chantier 2 - Corrections intelligentes V2

### Etat actuel

Fichiers principaux :

- `components/JapaneseLookup.tsx`
- `services/quizFeedback.ts`
- `components/QuizScreen.tsx`
- `components/GlobalQuizScreen.tsx`
- `components/GrammarQuizScreen.tsx`
- `components/ExamScreen.tsx`

Les corrections affichent deja phrase, traduction, lecture cliquable selon donnees et explication globale.

### Reste V2

- [ ] Standardiser un seul composant de correction pour tous les quiz.
- [x] Ajouter une structure `wrongAnswerExplanations` pour les distracteurs importants.
- [x] Enrichir les questions de grammaire/particules avec explication de chaque mauvaise option.
- [ ] Enrichir le mode examen avec correction pedagogique par question.
- [ ] Ajouter niveau de detail progressif : resume puis details.
- [x] Ajouter "piege detecte" quand l'erreur correspond a une confusion connue.
- [ ] Ajouter historique d'erreurs par piege.
- [ ] Relier les erreurs recurrentes aux recommandations du parcours.
- [ ] Ajouter bouton "travailler ce point" vers le module exact.
- [ ] Verifier que tout kanji visible dans les corrections reste cliquable.

### Journal d'execution

- 2026-08-17 : ajout de `wrongAnswerExplanations` dans les types de questions grammaire/global.
- 2026-08-17 : enrichissement automatique des QCM grammaire avec explications de distracteurs.
- 2026-08-17 : ajout de la detection de pieges connus dans `services/quizFeedback.ts` et affichage du bloc analyse dans `components/GrammarQuizScreen.tsx`.
- 2026-08-17 : creation du composant partage `components/SmartCorrectionInsightCard.tsx` pour commencer la standardisation des corrections.

### Criteres d'acceptation

- Une mauvaise reponse explique pourquoi elle est fausse.
- La bonne reponse explique pourquoi elle est correcte.
- Les mots/kanji japonais sont cliquables dans question, choix et correction.
- La correction reste lisible sur iPhone.
- Les erreurs utiles peuvent devenir cartes SRS.

## 8. Chantier 3 - Diagnostic et rapports V2

### Etat actuel

Fichiers principaux :

- `services/aptitudeTest.ts`
- `components/AptitudeTestScreen.tsx`
- `components/AptitudeReportScreen.tsx`
- `components/LearningPathScreen.tsx`
- `components/ExamScreen.tsx`

Le diagnostic existe avec 3 niveaux, scoring, rapport local, sauvegarde SQLite et recommandations.

### Reste V2

- [ ] Verifier visuellement le rapport sur iPhone.
- [ ] Ajouter comparaison avec le test precedent.
- [ ] Ajouter retest mensuel propose automatiquement.
- [ ] Ajouter temps par question dans le diagnostic si pertinent.
- [ ] Ajouter analyse "maitrise fragile" quand le score est bon mais lent.
- [ ] Ajouter plan 7 jours et plan 30 jours plus precis.
- [ ] Reutiliser le meme moteur de rapport pour le mode examen.
- [ ] Ajouter bouton "Creer ma session de correction".
- [ ] Ajouter score par format : QCM, saisie, lecture, kanji, grammaire.
- [ ] Ajouter export local du rapport en texte simple si utile.

### Criteres d'acceptation

- Le rapport ne se limite jamais a un score.
- Il donne 3 priorites maximum, claires et actionnables.
- Il compare les progres quand plusieurs tests existent.
- Il relie chaque faiblesse a un module, un quiz ou une revision.

## 9. Chantier 4 - Parcours pedagogique V2

### Etat actuel

Fichiers principaux :

- `services/learningPath.ts`
- `components/LearningPathScreen.tsx`
- `services/dashboardData.ts`
- `data/goalDefinitions.ts`

Le parcours possede modules, sous-etapes 1A/1B, details, checkpoints, recompenses et recommandations.

### Reste V2

- [ ] Rendre les regles de verrouillage/deverrouillage plus explicites.
- [ ] Ajouter remediation automatique si un domaine chute.
- [ ] Ajouter vue "parcours general sans recompense" encore plus lisible.
- [ ] Ajouter vue "recompenses/objectifs" separee et dense mais pas surchargee.
- [ ] Ajouter progression exacte par sous-module avec source des donnees.
- [ ] Ajouter bouton "continuer exactement ici".
- [ ] Ajouter detection de pause longue et plan de reprise.
- [ ] Ajouter recalcul local du parcours apres diagnostic/retest.
- [ ] Ajouter plus de criteres metier pour valider chaque module.
- [ ] Verifier tous les details de modules sur iPhone.

### Criteres d'acceptation

- L'utilisateur sait en 5 secondes quoi faire maintenant.
- Chaque module explique ce qui est attendu.
- Chaque sous-etape possede objectif, point de passage et critere de reussite.
- Les recommandations changent selon progression reelle.

## 10. Chantier 5 - QA mobile complete

### Objectif

Passer d'une app qui compile a une app vraiment utilisable sur telephone.

### Ecrans a verifier un par un

- [ ] Dashboard onglet Resume.
- [ ] Dashboard onglet Quiz.
- [ ] Dashboard onglet Maitrise.
- [ ] Dashboard onglet Progression.
- [ ] Dashboard onglet A travailler.
- [ ] Menu lateral complet.
- [ ] Bouton retour global.
- [ ] Parcours general.
- [ ] Detail module parcours.
- [ ] Recompenses/badges/objectifs.
- [ ] Diagnostic.
- [ ] Rapport diagnostic.
- [ ] Revisions SRS vide.
- [ ] Revisions SRS avec donnees.
- [ ] Mes erreurs vide.
- [ ] Mes erreurs avec cartes.
- [ ] Kana apprendre.
- [ ] Kana exercices.
- [ ] Kana trace.
- [ ] Vocabulaire cartes recto.
- [ ] Vocabulaire cartes verso.
- [ ] Kanji detail.
- [ ] Grammaire liste.
- [ ] Grammaire detail lecon.
- [ ] Grammaire mini-test.
- [ ] Immersion.
- [ ] Stories.
- [ ] Journal.
- [ ] Quiz global.
- [ ] Quiz grammaire.
- [ ] Quiz audio fallback.
- [ ] Mode 5 minutes.
- [ ] Test JLPT.
- [ ] Preferences.

### Criteres d'acceptation

- Aucun texte superpose.
- Aucun bouton trop petit.
- Aucune carte illisible.
- Aucun scroll bloque.
- Aucun panneau de lookup cache la navigation critique.
- Les textes longs passent a la ligne proprement.
- Les cartes gardent des dimensions stables.

## 11. Chantier 6 - Cartes vocabulaire et kanji V2

### Etat actuel

Fichier principal :

- `components/VocabularyScreen.tsx`

Les cartes ont ete rapprochees du style physique : recto plus simple, verso jaune, lectures et exemples.

### Reste V2

- [ ] Verifier toutes les cartes sur iPhone.
- [ ] Garantir taille minimale pour kanji simples : 一, 二, 五, 九, 口, 日.
- [ ] Ajouter un vrai mode detail si le sens est trop long.
- [ ] Ajouter swipe ou navigation carte precedente/suivante.
- [ ] Ajouter mode flip plus fluide.
- [ ] Ajouter indication claire "tap pour retourner".
- [ ] Verifier que les hiragana bas gauche/droite ne se superposent jamais.
- [ ] Ajouter tests de textes longs.
- [ ] Verifier cartes sans kanji ou avec plusieurs sens.
- [ ] Revoir styles apres scan couleur pour eviter surcharge.

### Criteres d'acceptation

- Le recto est minimal et tres lisible.
- Le verso garde le style physique sans sacrifier la lecture.
- Aucun mot n'est coupe de maniere absurde.
- Les lectures restent utilisables sur petit ecran.

## 12. Chantier 7 - Grammaire V2

### Etat actuel

Fichiers principaux :

- `data/grammarLessons.ts`
- `services/grammarCourse.ts`
- `services/grammarPedagogy.ts`
- `services/grammarProgress.ts`
- `components/GrammarLessonsScreen.tsx`
- `components/GrammarQuizScreen.tsx`

Le detail de lecon est integre et riche, mais V2 demande une finition pedagogique complete.

### Reste V2

- [ ] Verifier lisibilite mobile de chaque lecon.
- [ ] Auditer toutes les lecons : formule, objectif, explication, piege, exemples.
- [ ] Ajouter 5 exemples par point important : 3 simples, 2 naturels.
- [ ] Ajouter comparaisons explicites des regles proches.
- [ ] Ajouter renvoi depuis chaque erreur de grammaire vers la lecon exacte.
- [ ] Ajouter "phrases de revision croisee".
- [ ] Ajouter progression par famille grammaticale.
- [ ] Ajouter statut "a revoir" automatique si mini-test echoue.
- [ ] Ajouter SRS par point de grammaire et par phrase exemple.
- [ ] Ajouter controle contenu pour eviter exemples hors N5.

### Criteres d'acceptation

- Une lecon seule suffit a comprendre le point.
- Les erreurs renvoient vers la bonne lecon.
- Les exemples sont cliquables, traduits et expliqués.
- Le mini-test met a jour progression et SRS.

## 13. Chantier 8 - Kanji V2

### Etat actuel

Fichiers principaux :

- `data/kanjiComponents.ts`
- `services/kanjiComponents.ts`
- `components/KanjiDetailScreen.tsx`
- `services/globalQuizFactory.ts`

Les 80 kanji N5 ont composants/mnemoniques et quiz.

### Reste V2

- [ ] Ajouter ordre de trace visuel pour les kanji prioritaires.
- [ ] Ajouter familles de composants.
- [ ] Ajouter progression par composants.
- [ ] Ajouter quiz "composant -> kanji".
- [ ] Ajouter quiz "kanji -> mot japonais" plus systematique.
- [ ] Ajouter confusions visuelles avec entrainement dedie.
- [ ] Ajouter plus de mots lies par kanji.
- [ ] Ajouter option "masquer romaji" strict.
- [ ] Verifier detail mobile pour les 80 kanji.

### Criteres d'acceptation

- Chaque kanji a composant, histoire, lectures, mots lies.
- Un utilisateur comprend comment retenir le kanji.
- Les confusions proches sont entrainees.

## 14. Chantier 9 - Exercices adaptatifs V2

### Etat actuel

Fichiers principaux :

- `services/exerciseFactory.ts`
- `services/globalQuizFactory.ts`
- `services/grammarQuizFactory.ts`
- `components/QuizScreen.tsx`
- `components/GlobalQuizScreen.tsx`

Plusieurs formats existent deja.

### Reste V2

- [ ] Choisir le format selon maitrise SRS.
- [ ] Debutant : QCM/association.
- [ ] Intermediaire : saisie lecture/sens inverse.
- [ ] Avance : phrase a trou, ordre, japonais obligatoire.
- [ ] Ajouter stats par format.
- [ ] Ajouter tolerance intelligente pour saisie libre.
- [ ] Ajouter feedback sur faute de lecture vs faute de sens.
- [ ] Ajouter vrai/faux rapide si utile.
- [ ] Ajouter tests factory pour chaque domaine.

### Criteres d'acceptation

- Un meme item peut apparaitre sous plusieurs formes.
- Plus l'utilisateur progresse, moins le QCM domine.
- Les rapports savent dire "faible en saisie" ou "faible en lecture".

## 15. Chantier 10 - Immersion V2

### Etat actuel

Fichiers principaux :

- `data/immersionTexts.ts`
- `services/immersion.ts`
- `components/ImmersionReaderScreen.tsx`
- `components/JapaneseLookup.tsx`

L'immersion existe avec textes, questions, progression et lookup.

### Reste V2

- [ ] Verifier tous les tokens MVP.
- [ ] Ajouter audit automatique du taux de mots cliquables.
- [ ] Ajouter plus de textes controles par theme.
- [ ] Ajouter difficulte par texte.
- [ ] Ajouter "mots inconnus de ce texte".
- [ ] Ajouter revision directe depuis un texte.
- [ ] Ajouter import local simple de texte court sans internet.
- [ ] Ajouter detection limitee avec dictionnaire local.
- [ ] Ajouter etat "texte termine" plus clair.

### Criteres d'acceptation

- Les textes MVP sont integralement exploitables.
- L'utilisateur peut lire, cliquer, comprendre, reviser.
- Les textes enrichissent progression et SRS.

## 16. Chantier 11 - Stories V2

### Etat actuel

Fichiers principaux :

- `data/storyLessons.ts`
- `services/stories.ts`
- `components/StoryLessonScreen.tsx`

54 dialogues existent avec questions et progression.

### Reste V2

- [ ] Verifier tous les dialogues sur mobile.
- [ ] Ajouter scenes visuelles simples embarquees.
- [ ] Ajouter personnages/lieux coherents.
- [ ] Ajouter "grammaire de la scene".
- [ ] Ajouter "vocabulaire cle de la scene".
- [ ] Ajouter relecture ciblee apres erreur.
- [ ] Ajouter filtre par theme : gare, ecole, restaurant, famille, achats.
- [ ] Connecter audio si fichiers disponibles.
- [ ] Ajouter progression par theme.

### Criteres d'acceptation

- Chaque story enseigne un contexte clair.
- Les dialogues sont lisibles et cliquables.
- Les erreurs deviennent des revisions utiles.

## 17. Chantier 12 - Journal V2

### Etat actuel

Fichiers principaux :

- `data/writingPrompts.ts`
- `services/writingJournal.ts`
- `components/WritingJournalScreen.tsx`

Le journal local existe avec prompts, sauvegarde et analyse simple.

### Reste V2

- [ ] Ajouter correction locale plus avancee sur patterns N5.
- [ ] Detecter particules suspectes selon structures simples.
- [ ] Detecter absence de verbe ou forme polie.
- [ ] Detecter kanji hors N5 si base disponible.
- [ ] Proposer phrase modele proche.
- [ ] Transformer erreur ecrite en flashcard.
- [ ] Ajouter SRS pour erreurs recurrentes d'ecriture.
- [ ] Ajouter historique par theme.
- [ ] Ajouter compteur de jours d'ecriture.
- [ ] Verifier mobile avec clavier ouvert.

### Criteres d'acceptation

- Le journal ne pretend pas corriger parfaitement.
- Les suggestions restent locales et pedagogiques.
- L'utilisateur sait quoi corriger sans etre bloque.

## 18. Chantier 13 - Gamification, ligues et objectifs V2

### Etat actuel

Fichiers principaux :

- `data/goalDefinitions.ts`
- `services/goals.ts`
- `services/dashboardData.ts`
- `services/badges.ts`
- `services/localLeague.ts`
- `components/sharedUi.tsx`
- `components/DashboardScreen.tsx`
- `components/LearningPathScreen.tsx`

Objectifs adaptatifs, badges, XP, assiduite, animations et ligue locale existent.

### Reste V2

- [ ] Ajouter historique simple des saisons de ligue.
- [ ] Afficher objectif hebdomadaire de ligue plus explicitement.
- [ ] Ajouter historique des 3 objectifs par jour.
- [ ] Afficher pourquoi un objectif a ete choisi.
- [ ] Ajouter recap "hier / aujourd'hui / demain".
- [ ] Ajouter animations distinctes : XP jour, 3 jours, 7 jours, badge rare.
- [ ] Ajouter limitation anti-surcharge visuelle.
- [ ] Verifier qu'une recompense importante demande de la maitrise, pas seulement du volume.
- [ ] Ajouter tests sur generation objectifs 6 mois.

### Criteres d'acceptation

- Les objectifs ne sont pas identiques deux jours de suite.
- Les seuils montent avec le niveau.
- Le domaine faible influence vraiment les objectifs.
- Les recompenses restent motivantes mais pas envahissantes.

## 19. Chantier 14 - Preferences V2

### Etat actuel

Fichiers principaux :

- `services/preferences.ts`
- `components/LearningPreferencesScreen.tsx`
- composants quiz/vocab/corrections

Preferences principales presentes.

### Reste V2

- [ ] Ajouter taille police japonaise.
- [ ] Ajouter densite UI : compact / normal.
- [ ] Ajouter mode "sans romaji strict".
- [ ] Ajouter mode "moins de QCM".
- [ ] Ajouter mode "saisie libre prioritaire".
- [ ] Ajouter profils sauvegardes : debutant, revision examen, lecture intensive.
- [ ] Propager preferences a tous les ecrans restants.
- [ ] Verifier persistance apres redemarrage.
- [ ] Ajouter bouton reset preferences.

### Criteres d'acceptation

- Les preferences changent vraiment l'experience.
- Elles ne cassent aucun ecran.
- Elles restent locales.

## 20. Chantier 15 - Audio embarque V2

### Etat actuel

Fichiers principaux :

- `services/audio.ts`
- `services/embeddedAudio.ts`
- `services/audioQuiz.ts`
- `components/OfflineAudioButton.tsx`
- `components/AudioQuizScreen.tsx`
- `data/audioPack.ts`
- `data/audioAssetRegistry.ts`
- `assets/audio/audio-pack-manifest.json`
- `scripts/generate-audio-pack.ps1`
- `scripts/sync-audio-registry.mjs`
- `scripts/validate-audio-pack.mjs`

Le systeme hybride existe, mais les fichiers WAV reels ne sont pas presents.

### Reste V2

- [ ] Installer ou obtenir une voix japonaise locale fiable.
- [ ] Generer les fichiers audio du noyau N5.
- [ ] Verifier qualite, silence, volume, prononciation.
- [ ] Synchroniser `data/audioAssetRegistry.ts`.
- [ ] Lancer `npm run audio:check`.
- [ ] Lancer `npm run audio:check:strict`.
- [ ] Verifier lecture Expo Go iPhone.
- [ ] Verifier fallback TTS.
- [ ] Ajouter politique de taille app.
- [ ] Ajouter pack progressif si le pack complet est trop lourd.

### Criteres d'acceptation

- Le quiz audio peut jouer des fichiers embarques.
- L'app ne casse pas sans voix japonaise.
- Le strict check passe avant release audio.
- Aucun service externe n'est requis.

## 21. Chantier 16 - Documentation, release et maintenance

### Probleme

Les documents existants melangent ancienne roadmap, cahier de handoff, cases historiques et statut reel.

### Reste V2

- [ ] Nettoyer le registre d'avancement dans l'ancien cahier.
- [ ] Garder ce document comme reference "reste a faire".
- [ ] Ajouter un `RELEASE_CHECKLIST.md`.
- [ ] Ajouter un `TEST_PLAN_IPHONE.md`.
- [ ] Mettre a jour README principal.
- [ ] Documenter les commandes Expo Go.
- [ ] Documenter le workflow audio.
- [ ] Documenter le workflow de build web.
- [ ] Documenter comment verifier offline.
- [ ] Ajouter changelog manuel.

### Criteres d'acceptation

- Un agent peut reprendre le projet sans relire tout l'historique de chat.
- Le statut reel est clair.
- Les validations sont reproductibles.

## 22. Ordre d'execution recommande

### Phase A - V2 qualite obligatoire

1. Stabilisation encoding/UI.
2. QA mobile complete.
3. Nettoyage docs.
4. Tests SRS vide/plein.
5. Rapport mobile diagnostic/examen.

### Phase B - V2 pedagogique prioritaire

1. Corrections par mauvaise reponse.
2. Parcours remediation dynamique.
3. SRS prediction d'oubli.
4. Grammaire liens erreurs -> lecons.
5. Exercices adaptatifs selon maitrise.

### Phase C - V2 experience utilisateur

1. Cartes vocab/kanji polish final.
2. Immersion tokens audit + plus de textes.
3. Stories scenes + themes.
4. Preferences police/densite/profils.
5. Journal correction locale avancee.

### Phase D - V2 bonus lourd

1. Audio WAV embarque.
2. Kanji traces/ordre visuel.
3. Historique complet ligues/saisons.
4. Import local texte.

## 23. Definition de fini V2

Une V2 est terminee seulement si :

- [ ] Tous les ecrans principaux ont ete verifies sur iPhone.
- [ ] Aucun texte visible n'est corrompu.
- [ ] Aucun texte visible ne se superpose.
- [ ] Les cartes vocab/kanji sont lisibles.
- [ ] Le SRS fonctionne vide, plein, et avec erreurs.
- [ ] Le diagnostic produit un rapport actionnable.
- [ ] Le parcours indique exactement quoi faire ensuite.
- [ ] Les corrections expliquent les erreurs importantes.
- [ ] Les objectifs journaliers varient sur au moins 6 mois.
- [ ] Les preferences principales sont respectees partout.
- [ ] L'app fonctionne hors ligne.
- [ ] `npm run typecheck` passe.
- [ ] `npm run smoke` passe.
- [ ] `npm run export:web` passe.
- [ ] `git diff --check` passe.
- [ ] Le cahier de release est a jour.

## 24. Commandes de verification

```powershell
cd "C:\Users\snoop\Documents\Logiciel BAB\JLPT5-main\expo-jlpt-n5-coach-sdk54"
$env:Path += ';C:\Program Files\Git\cmd;C:\Program Files\nodejs'
npm run typecheck
npm run smoke
npm run export:web
npm run audio:check
cd ..
git diff --check
git status --short
```

Pour la release audio seulement :

```powershell
cd "C:\Users\snoop\Documents\Logiciel BAB\JLPT5-main\expo-jlpt-n5-coach-sdk54"
npm run audio:check:strict
```

## 25. Notes de risque

- Le plus gros risque actuel n'est pas la logique metier : c'est la qualite mobile et l'encodage de certains textes.
- Le deuxieme risque est la dispersion : beaucoup de features existent, mais V2 demande de les rendre coherentes entre elles.
- Le troisieme risque est l'audio : le systeme est pret, mais la production de fichiers reels depend d'une voix japonaise locale ou d'un processus d'asset separe.
- Le quatrieme risque est la taille des fichiers : `appStyles.ts`, `LearningPathScreen.tsx`, `KanaScreen.tsx`, `GrammarLessonsScreen.tsx` et `DashboardScreen.tsx` sont tres gros. Toute evolution V2 doit rester ciblee et eviter un refactor global non controle.

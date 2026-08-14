# Cahier des charges offline - 15 chantiers d'evolution JLPT N5 Coach

## 0. Cadre general

Ce document decrit les 15 evolutions prioritaires inspirees des meilleures applications d'apprentissage du japonais et des langues, mais adaptees a une contrainte stricte : l'application doit fonctionner sans internet, sans compte, sans reseau social, sans API externe et sans service distant.

L'objectif n'est pas de copier les concurrents. L'objectif est d'extraire les mecanismes pedagogiques les plus efficaces, puis de les convertir en fonctionnalites locales, robustes, maintenables et adaptees a une app JLPT N5.

## Principes non negociables

- Fonctionnement complet hors ligne apres installation.
- Donnees stockees localement dans SQLite.
- Pas de compte utilisateur obligatoire.
- Pas de classement en ligne.
- Pas de reseau social.
- Pas d'appel a une IA externe.
- Pas de dependance a un contenu distant pour apprendre.
- Les contenus essentiels doivent etre embarques dans l'application.
- Les recommandations doivent etre calculees localement.
- Les animations et recompenses doivent rester motivantes, pas intrusives.
- Le romaji doit etre disponible au debut, mais pouvoir etre masque.

## Architecture cible commune

Les 15 chantiers doivent s'appuyer sur quelques briques communes :

- `app_srs_item_state` : memoire par item.
- `app_question_attempt_local` : historique des reponses.
- `app_daily_reward_claim` : recompenses deja obtenues.
- `app_daily_goal_plan` : objectifs locaux journaliers.
- `app_user_learning_preferences` : preferences pedagogiques.
- `app_error_flashcard` : cartes creees depuis les erreurs.
- `app_aptitude_result` : resultats du test initial.
- `app_content_progress` : progression par contenu.

Chaque nouvelle fonctionnalite doit enrichir ces donnees plutot que creer une logique isolee.

---

# 1. File de revision SRS centrale

## Ce que font les concurrents

WaniKani structure la memorisation avec un SRS item par item : radicaux, kanji et vocabulaire reviennent au bon moment selon les reponses. Bunpro applique cette idee a la grammaire et aux phrases. renshuu propose des "schedules" et permet de gerer differents programmes de revision.

## Objectif pour ton app

Creer une page centrale "Revisions" qui dit exactement quoi revoir maintenant, pourquoi, et dans quel ordre. Cette page doit devenir le coeur du retour quotidien.

## Fonctionnalites a integrer

- Compteur "A revoir maintenant".
- Liste priorisee : erreurs recentes, items fragiles, items dus aujourd'hui, items oublies.
- Statuts : nouveau, fragile, en cours, connu, solide, maitrise.
- Revisions par domaine : kana, vocabulaire, kanji, grammaire, phrases, competences quiz.
- Session rapide : 5, 10 ou 20 items.
- Session automatique : l'app choisit les items les plus utiles.
- Bouton "revoir plus tard".
- Bouton "je connais deja".
- Historique local de chaque item.

## Implementation offline

- Utiliser `app_srs_item_state`.
- Chaque item a `due_at`, `interval_days`, `ease`, `status`, `attempts`, `correct`, `wrong_streak`, `correct_streak`.
- Les quiz doivent appeler une fonction unique : `recordSrsReview(itemId, itemType, isCorrect)`.
- La page Revisions charge les items dont `due_at <= now`.
- Aucun calcul serveur n'est necessaire.

## Algorithme MVP

- Nouveau + correct : fragile, revoir demain.
- Fragile + correct : en cours, revoir dans 2 jours.
- En cours + correct : connu, revoir dans 4 jours.
- Connu + correct : solide, revoir dans 9 jours.
- Solide + correct : maitrise, revoir dans 21 jours.
- Toute erreur : retour fragile, revoir dans 30 minutes ou demain selon le contexte.
- Deux erreurs de suite : priorite haute.

## Etapes d'implementation

1. Finaliser les types `SrsItemType` et `SrsStatus`.
2. Creer le service `srsQueue.ts`.
3. Ajouter `recordSrsReview` dans les quiz existants.
4. Ajouter l'ecran `ReviewQueueScreen`.
5. Ajouter un bouton "Revisions" dans le menu Apprendre ou Parcours.
6. Connecter les objectifs du jour aux items dus.
7. Ajouter tests smoke : un item rate doit revenir avant un item reussi.

## Criteres d'acceptation

- Un item rate revient plus vite.
- Un item bien reussi s'espace.
- Les revisions persistent apres fermeture.
- La file fonctionne sans internet.
- Le tableau de bord affiche un nombre coherent d'items dus.

## Difficulte

Moyenne. C'est faisable et prioritaire.

---

# 2. Corrections intelligentes detaillees

## Ce que font les concurrents

Bunpro explique les points de grammaire avec contexte, exemples et nuances. Les bonnes apps ne disent pas seulement "faux" : elles montrent pourquoi la reponse correcte est correcte et pourquoi l'erreur est probable.

## Objectif pour ton app

Transformer chaque erreur en mini-lecon claire. L'utilisateur doit comprendre la phrase, les mots, la lecture, la traduction et le piege.

## Fonctionnalites a integrer

- Traduction complete de toute phrase japonaise.
- Lecture hiragana et romaji optionnel.
- Analyse mot par mot.
- Explication de la reponse correcte.
- Explication des mauvaises reponses principales.
- Bouton "ajouter cette erreur a mes revisions".
- Kanji et mots cliquables dans la question et dans la correction.
- Niveau de detail progressif : resume d'abord, detail au clic.

## Implementation offline

- Enrichir les questions avec des champs fixes :
  - `sentence_ja`
  - `sentence_hiragana`
  - `sentence_romaji`
  - `sentence_fr`
  - `tokens`
  - `wrong_answer_explanations`
- Pour les contenus non enrichis, utiliser un fallback local depuis le dictionnaire interne.
- Ne pas generer de correction avec une API externe.

## UX cible

- Apres reponse :
  - Bandeau vert ou rouge.
  - Phrase japonaise.
  - Traduction francaise.
  - "Pourquoi ?" en 2 a 4 lignes.
  - Bouton "Detail mot par mot".
  - Bouton "Revoir plus tard".

## Etapes d'implementation

1. Standardiser un composant `SmartCorrectionPanel`.
2. L'utiliser dans `QuizScreen`, `GlobalQuizScreen`, `GrammarQuizScreen`, `ExamScreen`.
3. Ajouter `JapaneseLookupText` partout ou une phrase japonaise apparait.
4. Enrichir d'abord 50 questions critiques.
5. Ajouter un fallback lexical local.
6. Ajouter la creation de flashcard depuis erreur.

## Criteres d'acceptation

- Toute question avec phrase affiche une traduction.
- Tout mot japonais peut etre clique si connu par la base locale.
- L'utilisateur comprend pourquoi il s'est trompe.
- Aucun appel internet n'est fait.

## Difficulte

Moyenne a elevee, surtout a cause du contenu.

---

# 3. Lecons de grammaire ultra structurees

## Ce que font les concurrents

Bunpro organise la grammaire par points, niveaux JLPT, exemples, phrases de revision et nuances. LingoDeer met l'accent sur l'explication avant l'exercice.

## Objectif pour ton app

Chaque regle N5 doit devenir une fiche pedagogique stable, pas seulement une description courte.

## Structure obligatoire d'une lecon

- Titre.
- Niveau JLPT.
- Role : particule, conjugaison, phrase, question, temps, comparaison.
- Formule.
- Sens en francais.
- Quand l'utiliser.
- Quand ne pas l'utiliser.
- Pieges frequents.
- 3 exemples tres simples.
- 2 exemples naturels.
- Traduction de chaque exemple.
- Analyse mot par mot.
- Mini quiz de verification.
- Lien vers items SRS associes.

## Implementation offline

- Enrichir `grammarLessons.ts`.
- Ajouter un type `GrammarLessonDetail`.
- Creer `GrammarLessonDetailScreen`.
- Stocker ouverture, comprehension, exercice reussi dans SQLite.

## Etapes

1. Definir le modele complet.
2. Migrer les lecons existantes vers ce modele.
3. Creer un composant de fiche lisible mobile.
4. Ajouter mini-test par lecon.
5. Connecter au SRS.
6. Ajouter "points voisins" : par exemple `は` vs `が`, `に` vs `で`.

## Criteres d'acceptation

- Une lecon suffit pour comprendre la regle.
- Les exemples sont lisibles sur telephone.
- Le mini-test valide la comprehension.
- Les erreurs renvoient vers la lecon.

## Difficulte

Elevee, principalement contenu et qualite pedagogique.

---

# 4. Kanji par composants et mnemoniques

## Ce que font les concurrents

WaniKani enseigne radicaux, puis kanji, puis vocabulaire. Les composants servent a creer une histoire mentale, puis le vocabulaire consolide l'usage.

## Objectif pour ton app

Ne plus presenter les kanji comme des symboles isoles. Chaque kanji N5 doit avoir une decomposition visuelle et une memoire.

## Fonctionnalites

- Fiche kanji avec composants.
- Sens principal.
- Lectures ON/KUN.
- Mnemonique courte.
- Mots N5 contenant le kanji.
- Ordre pedagogique : composants -> kanji -> mots.
- Quiz : composant vers kanji, kanji vers sens, lecture vers kanji, mot vers lecture.

## Donnees

Ajouter ou enrichir :

- `kanji`
- `meaning_fr`
- `onyomi`
- `kunyomi`
- `components`
- `mnemonic_fr`
- `example_words`
- `confusions`

## Etapes

1. Commencer sur 80 kanji N5.
2. Ajouter composants manuels fiables.
3. Creer `KanjiDetailScreen`.
4. Ajouter quiz "composants".
5. Connecter aux cartes vocabulaire.
6. Connecter au SRS.

## Criteres d'acceptation

- Chaque kanji N5 a au moins 1 mnemonique.
- Chaque kanji affiche ses mots lies.
- Les quiz kanji utilisent les lectures et les mots.

## Difficulte

Moyenne a elevee.

---

# 5. Audio local

## Ce que font les concurrents

LingoDeer, renshuu, Busuu et Drops utilisent l'audio pour renforcer lecture, prononciation et comprehension.

## Objectif pour ton app

Ajouter une dimension sonore sans service externe.

## Options offline

- Option A : fichiers audio embarques.
- Option B : utiliser le TTS du telephone si disponible.
- Option C : pack audio progressif embarque par version.

## Fonctionnalites

- Bouton ecouter sur vocabulaire.
- Bouton ecouter sur exemples.
- Quiz audio -> choix.
- Option "audio obligatoire".
- Repetition lente.

## Contraintes

- Le vrai audio natif massif augmente beaucoup la taille de l'app.
- Le TTS depend du systeme, mais ne demande pas internet si la voix est installee.
- Le MVP peut commencer avec kana, nombres, salutations, phrases de base.

## Etapes

1. Ajouter un service `audio.ts`.
2. Ajouter un composant `AudioButton`.
3. Ajouter support audio dans vocabulaire et grammaire.
4. Ajouter 100 premiers fichiers ou TTS local.
5. Ajouter quiz audio.

## Criteres d'acceptation

- L'app reste utilisable sans audio.
- Aucun appel internet.
- Les boutons ne cassent pas si aucun fichier n'existe.

## Difficulte

Elevee si audio natif complet. Moyenne avec TTS/fichiers limites.

---

# 6. Mode immersion texte cliquable

## Ce que font les concurrents

Migaku transforme des textes ou sous-titres en contenu cliquable avec dictionnaire, lecture et cartes. L'idee forte est l'apprentissage en contexte.

## Objectif pour ton app

Creer un lecteur de textes N5 courts ou chaque mot est cliquable.

## Fonctionnalites

- Bibliotheque de textes N5 offline.
- Tokenisation manuelle ou semi-manuelle.
- Mot cliquable.
- Fiche mot : kanji, kana, romaji, sens, exemples.
- Bouton "ajouter aux revisions".
- Questions de comprehension.
- Progression par texte.

## Implementation offline

- Ne pas parser librement tout japonais au debut.
- Creer des textes controles avec tokens prepares.
- Stocker chaque texte en JSON/TS local.

## Etapes

1. Creer type `ImmersionText`.
2. Ajouter 10 textes N5 courts.
3. Creer `ImmersionReaderScreen`.
4. Connecter `JapaneseLookupText`.
5. Ajouter questions comprehension.
6. Ajouter creation SRS depuis mots inconnus.

## Criteres d'acceptation

- Tous les mots des textes MVP sont cliquables.
- L'utilisateur peut lire sans quitter l'ecran.
- Les mots inconnus alimentent les revisions.

## Difficulte

Elevee mais tres rentable.

---

# 7. Diagnostic initial adaptatif

## Ce que font les concurrents

Busuu et d'autres apps utilisent des tests de placement et des checkpoints. L'idee est de ne pas traiter tous les utilisateurs comme debutants absolus.

## Objectif pour ton app

Un seul test initial avec 3 niveaux de difficulte qui mesure kana, vocabulaire, kanji, grammaire, comprehension et reflexes de lecture.

## Fonctionnalites

- Test niveau 1 : bases tres simples.
- Test niveau 2 : phrases N5 standard.
- Test niveau 3 : questions difficiles N5, pieges, lecture, particules.
- Rapport final professionnel.
- Forces.
- Faiblesses.
- Risques d'oubli.
- Parcours recommande.
- Objectifs des 7 prochains jours.

## Donnees

- `app_aptitude_result`
- score global
- scores par domaine
- erreurs par type
- temps moyen
- niveau recommande
- modules conseilles

## Etapes

1. Definir 60 questions de diagnostic.
2. Taguer chaque question par competence.
3. Creer moteur de score.
4. Creer rapport.
5. Connecter au parcours.
6. Permettre de refaire le test plus tard.

## Criteres d'acceptation

- Le test ne ressemble pas a un quiz simple.
- Le rapport donne des actions concretes.
- Le parcours se met a jour apres le test.

## Difficulte

Moyenne a elevee.

---

# 8. Parcours personnalisable

## Ce que font les concurrents

renshuu permet de gerer plusieurs schedules. Beaucoup d'apps proposent des objectifs adaptes au rythme de l'utilisateur.

## Objectif pour ton app

Permettre plusieurs parcours locaux selon le profil.

## Parcours proposes

- JLPT N5 equilibre.
- Kana d'abord.
- Kanji progressif.
- Grammaire intensive.
- 10 minutes par jour.
- Revision avant examen.
- Reprise apres pause.

## Fonctionnalites

- Choix d'objectif.
- Charge quotidienne estimee.
- Modules recommandes.
- Objectifs adaptes.
- Recalcul si l'utilisateur rate plusieurs jours.

## Implementation

- Ajouter `app_user_learning_preferences`.
- Ajouter `learningPlanMode`.
- Modifier la generation d'objectifs.
- Modifier les modules recommandes.

## Etapes

1. Creer ecran Preferences pedagogiques.
2. Ajouter 4 parcours MVP.
3. Adapter objectifs quotidiens.
4. Adapter file SRS.
5. Afficher la raison du choix.

## Criteres d'acceptation

- Deux profils differents recoivent des objectifs differents.
- Le mode peut etre change sans perdre la progression.

## Difficulte

Moyenne.

---

# 9. Exercices varies sur le meme contenu

## Ce que font les concurrents

LingoDeer, renshuu et Duolingo repetent le meme contenu sous plusieurs formats : choix, saisie, association, ordre, ecoute.

## Objectif pour ton app

Eviter que l'utilisateur memorise seulement la forme du quiz.

## Formats

- Japonais -> francais.
- Francais -> japonais.
- Kanji -> kana.
- Kana -> kanji.
- Audio -> sens.
- Phrase a trou.
- Ordre des mots.
- Association.
- Saisie libre simple.
- Correction de particule.

## Implementation

- Creer une factory par item : `buildExercisesForItem`.
- Chaque item peut generer plusieurs questions.
- Le SRS choisit un format selon le niveau.

## Etapes

1. Lister formats par domaine.
2. Ajouter un type `ExerciseFormat`.
3. Adapter `globalQuizFactory`.
4. Ajouter l'ordre des mots.
5. Ajouter saisie libre tolerante.

## Criteres d'acceptation

- Un mot peut etre teste dans au moins 3 formats.
- Un kanji peut etre teste dans au moins 4 formats.
- La difficulte augmente avec la maitrise.

## Difficulte

Moyenne.

---

# 10. Journal de phrases et correction locale

## Ce que font les concurrents

Busuu mise sur les corrections humaines et sociales. Cette partie n'est pas compatible avec ton choix offline, mais l'idee pedagogique reste utile : produire du japonais, pas seulement repondre.

## Version offline pour ton app

Creer un journal local ou l'utilisateur ecrit des phrases N5. L'app corrige avec des regles locales simples.

## Fonctionnalites

- Prompt d'ecriture quotidien.
- Saisie d'une phrase.
- Check local : particules connues, verbes communs, vocab N5.
- Alerte : kanji hors N5, mot inconnu, particule suspecte.
- Historique des phrases.
- Auto-correction guidee avec exemples.

## Limites

- Impossible de garantir une correction humaine sans humain.
- Impossible de corriger toutes les phrases libres parfaitement offline.
- MVP doit etre base sur des patterns controles.

## Etapes

1. Creer `WritingJournalScreen`.
2. Ajouter 100 prompts N5.
3. Ajouter analyse locale par patterns.
4. Ajouter sauvegarde historique.
5. Ajouter suggestions.

## Criteres d'acceptation

- L'utilisateur peut ecrire chaque jour.
- L'app detecte au moins les erreurs simples.
- Le contenu reste local.

## Difficulte

Tres elevee pour correction libre parfaite. Moyenne pour MVP controle.

---

# 11. Mode 5 minutes

## Ce que font les concurrents

Duolingo et Drops excellent dans les sessions courtes. L'utilisateur n'a pas besoin de choisir : il lance, apprend, termine.

## Objectif pour ton app

Un bouton "5 min" qui choisit automatiquement la meilleure mini-session.

## Fonctionnalites

- Bouton visible sur dashboard.
- 8 a 12 questions max.
- Melange : SRS du, faiblesse, nouveaute legere.
- Animation fin de session.
- XP modere.
- Recommandation "reviens demain".

## Regles

- Si SRS du : priorite SRS.
- Si aucune revision : faiblesse principale.
- Si tout va bien : nouveau contenu du parcours.

## Etapes

1. Ajouter `QuickSessionFactory`.
2. Ajouter ecran `QuickSessionScreen`.
3. Ajouter bouton dashboard.
4. Connecter recompense.

## Criteres d'acceptation

- L'utilisateur commence en 1 clic.
- La session dure vraiment moins de 5 minutes.
- Elle s'adapte aux donnees locales.

## Difficulte

Faible a moyenne. Tres prioritaire.

---

# 12. Stories et mini dialogues

## Ce que font les concurrents

Duolingo et LingoDeer contextualisent avec dialogues et petites scenes.

## Objectif pour ton app

Apprendre N5 par situations concretes : gare, ecole, restaurant, famille, temps, achats.

## Fonctionnalites

- Dialogue court.
- Personnages simples.
- Vocabulaire cliquable.
- Traduction masquable.
- Questions de comprehension.
- Grammaire mise en avant.
- Relecture apres erreurs.

## Implementation offline

- Contenu local.
- Images ou scenes simples embarquees.
- Audio optionnel local.

## Etapes

1. Creer type `StoryLesson`.
2. Ajouter 10 stories MVP.
3. Creer lecteur dialogue.
4. Ajouter questions.
5. Connecter SRS.

## Criteres d'acceptation

- Une story enseigne un contexte.
- Les mots sont cliquables.
- Les erreurs alimentent les revisions.

## Difficulte

Moyenne a elevee.

---

# 13. Ligues locales et objectifs solo

## Ce que font les concurrents

Duolingo utilise ligues, series et competition. La partie reseau est exclue pour ton app, mais la progression solo reste utile.

## Objectif pour ton app

Remplacer la competition sociale par des ligues personnelles offline.

## Fonctionnalites

- Bronze, Argent, Or, Platine, etc.
- Division locale.
- Objectif hebdomadaire personnel.
- Promotion si objectif atteint.
- Maintien si activite minimale.
- Retrogradation douce si pause longue.

## Implementation

- Calculer ligue depuis XP, regularite, reussite.
- Stocker saison locale.
- Afficher progression compacte.

## Etapes

1. Clarifier les ligues existantes.
2. Ajouter saison hebdomadaire locale.
3. Ajouter objectif de maintien.
4. Ajouter animation promotion.

## Criteres d'acceptation

- Aucun reseau.
- L'utilisateur comprend comment monter.
- La ligue motive sans punir trop fort.

## Difficulte

Moyenne.

---

# 14. Parametres pedagogiques avances

## Ce que font les concurrents

renshuu est tres personnalisable : formats, affichage, contenus, niveau d'aide. Les apps serieuses laissent l'apprenant ajuster la difficulte.

## Objectif pour ton app

Permettre a l'utilisateur de choisir comment il veut apprendre.

## Parametres

- Afficher/masquer romaji.
- Afficher/masquer traduction immediate.
- Mode kana obligatoire.
- Reponses en japonais.
- Plus de saisie libre.
- Moins de QCM.
- Mode difficile.
- Mode revision douce.
- Taille de police japonaise.
- Duree des sessions.

## Implementation

- Ajouter table preferences.
- Ajouter hook `useLearningPreferences`.
- Propager preferences aux composants.

## Etapes

1. Creer ecran Reglages pedagogiques.
2. Ajouter 5 preferences MVP.
3. Brancher vocabulaire et quiz.
4. Brancher grammaire et corrections.

## Criteres d'acceptation

- Masquer romaji fonctionne partout.
- Mode difficile change les formats de questions.
- Preferences persistent hors ligne.

## Difficulte

Faible a moyenne.

---

# 15. Flashcards automatiques depuis les erreurs

## Ce que font les concurrents

Migaku et Bunpro permettent de transformer du contenu ou des erreurs en revision. L'utilisateur ne doit pas perdre une erreur utile.

## Objectif pour ton app

Chaque erreur importante peut devenir une carte locale de revision.

## Fonctionnalites

- Bouton "Ajouter a mes revisions".
- Carte creee depuis :
  - mot inconnu
  - kanji inconnu
  - phrase ratee
  - point de grammaire
  - particule
- La carte contient :
  - recto
  - verso
  - lecture
  - traduction
  - phrase exemple
  - raison de l'erreur
- Integration SRS.

## Implementation

- Table `app_error_flashcard`.
- Lien vers `app_srs_item_state`.
- Generation locale depuis les donnees de question.

## Etapes

1. Creer type `ErrorFlashcard`.
2. Ajouter bouton dans corrections.
3. Sauvegarder carte.
4. Ajouter filtre "mes erreurs".
5. Integrer dans Revisions.

## Criteres d'acceptation

- Une erreur peut etre transformee en carte.
- La carte revient dans la file SRS.
- L'utilisateur peut supprimer une carte.

## Difficulte

Moyenne.

---

# Plan de livraison recommande

## Phase 1 - Fondations rapides

1. Parametres pedagogiques avances.
2. Mode 5 minutes.
3. Flashcards depuis erreurs MVP.
4. File SRS centrale MVP.

## Phase 2 - Intelligence pedagogique

5. Corrections detaillees.
6. Diagnostic adaptatif.
7. Parcours personnalisable.
8. Exercices varies.

## Phase 3 - Contenu profond

9. Grammaire ultra structuree.
10. Kanji par composants.
11. Stories.
12. Immersion texte cliquable.

## Phase 4 - Motivation durable

13. Ligues locales.
14. Audio local progressif.
15. Journal de phrases.

## Definition globale de fini

Une evolution est terminee seulement si :

- Elle fonctionne sans internet.
- Elle persiste apres fermeture.
- Elle respecte les preferences utilisateur.
- Elle alimente le SRS ou le parcours quand c'est pertinent.
- Elle a un etat vide propre.
- Elle a un etat erreur propre.
- Elle est lisible sur iPhone.
- Elle passe typecheck, smoke, export web.

## Sources de benchmark utilisees

- WaniKani : radicaux, kanji, vocabulaire, mnemoniques, SRS.
- Bunpro : grammaire, phrases, SRS, phrases personnelles.
- renshuu : schedules, gestion des parcours, personnalisation.
- Duolingo : streak, quetes, ligues, sessions courtes.
- LingoDeer : grammaire expliquee, exercices structures, audio.
- Busuu : placement test, checkpoints, correction humaine, adaptee ici en version locale.
- Drops : sessions courtes, vocabulaire visuel.
- Migaku : immersion, texte cliquable, cartes depuis contenu.

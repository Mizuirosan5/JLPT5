# Cahier des charges - Evolutions Coach JLPT N5

## Objectif du document

Ce document transforme les 10 idees prioritaires issues du benchmark concurrent en chantiers implementables dans l'application JLPT N5 Coach.

Chaque chantier doit etre traite comme un module produit complet : valeur utilisateur, UX, donnees, logique metier, criteres d'acceptation, risques et ordre de livraison.

## Principes directeurs

- L'application doit rester un coach d'apprentissage, pas seulement une collection de quiz.
- Chaque fonctionnalite doit aider l'utilisateur a savoir quoi travailler, pourquoi, quand le revoir et comment progresser.
- Les donnees de progression doivent piloter les recommandations, les objectifs, les recompenses et le parcours.
- L'interface mobile doit rester lisible : peu de texte a la fois, mais des details disponibles au clic.
- Les erreurs doivent devenir des opportunites d'apprentissage : lecture, sens, explication, rappel, revision.

## Priorisation globale

1. SRS intelligent par item.
2. Corrections enrichies mot par mot.
3. Roadmap visuelle du parcours.
4. Rapport de niveau professionnel.
5. Dictionnaire contextuel instantane.
6. Quiz multi-formats.
7. Mode examen avec correction pedagogique.
8. Cartes vocabulaire/kanji physiques ameliorees.
9. Ecriture et trace avec feedback.
10. Gamification avancee et utile.

---

# 1. SRS intelligent par item

## Objectif produit

Mettre en place un systeme de repetition espacee pour chaque element appris : kana, vocabulaire, kanji, regle de grammaire et type de question.

L'application doit savoir quand un element doit revenir, selon la reussite, l'erreur, la difficulte et l'anciennete de la derniere revision.

## Probleme utilisateur

Aujourd'hui, un utilisateur peut revoir trop souvent ce qu'il connait deja, ou pas assez ce qu'il oublie. Cela donne une impression de progression, mais pas forcement une memoire durable.

## Fonctionnalites attendues

- Fiche memoire par item avec statut : nouveau, en apprentissage, fragile, connu, solide, maitrise.
- Date de prochaine revision pour chaque item.
- Difficulte adaptee selon les erreurs.
- Revision prioritaire des items faibles.
- Revision legere des items forts.
- Vue "A revoir aujourd'hui".
- Vue "Prochaines revisions".
- Possibilite de marquer manuellement : connu, a revoir, difficile.

## Items concernes

- Kana de base.
- Sons combines.
- Vocabulaire.
- Kanji.
- Regles de grammaire.
- Competences de quiz : particules, lecture, traduction, comprehension, ordre de phrase.

## Regles metier

- Bonne reponse sur item nouveau : prochaine revision demain.
- Bonne reponse sur item connu : prochaine revision dans 3 a 7 jours.
- Bonne reponse sur item solide : prochaine revision dans 14 a 30 jours.
- Erreur sur item connu ou solide : retour au statut fragile.
- Erreur repetee : item prioritaire dans les objectifs du jour.
- Item non revu depuis longtemps : statut diminue progressivement.

## Donnees a ajouter

Table logique recommandee : `app_srs_item_state`.

Champs :

- `item_id`
- `item_type` : kana, vocabulary, kanji, grammar, skill
- `status`
- `ease`
- `interval_days`
- `due_at`
- `last_reviewed_at`
- `attempts`
- `correct`
- `wrong_streak`
- `correct_streak`
- `updated_at`

## UX attendue

- Dans le tableau de bord : carte "A revoir aujourd'hui".
- Dans le parcours : chaque module affiche combien d'elements sont dus.
- Dans les quiz : les questions peuvent etre tirees en priorite depuis les items dus.
- Apres une reponse : message discret "Revu demain", "Solide, revient dans 7 jours", ou "A revoir bientot".

## Criteres d'acceptation

- Un item rate revient plus vite qu'un item reussi.
- Un item reussi plusieurs fois disparait temporairement des revisions.
- Les objectifs du jour peuvent inclure les items dus.
- Le tableau de bord affiche un nombre coherent d'items a revoir.
- Les donnees persistent apres redemarrage de l'app.

## Risques

- Trop de complexite invisible pour l'utilisateur.
- Trop de revisions peut decourager.
- Mauvais parametrage peut rendre le systeme injuste.

## MVP recommande

Commencer avec une logique simple en 5 statuts : nouveau, fragile, connu, solide, maitrise. Ajouter l'algorithme fin plus tard.

---

# 2. Corrections enrichies mot par mot

## Objectif produit

Transformer chaque correction en mini lecon. Quand l'utilisateur se trompe, il doit comprendre la phrase, le role de chaque mot, la bonne reponse et l'erreur.

## Probleme utilisateur

Si l'utilisateur rate une question, ce n'est pas toujours la regle qui pose probleme. Souvent il ne connait pas un mot, une lecture, une particule ou le sens global de la phrase.

## Fonctionnalites attendues

- Traduction complete de la phrase.
- Decoupage mot par mot.
- Lecture hiragana pour les mots avec kanji.
- Romaji optionnel.
- Sens de chaque mot.
- Explication de la bonne reponse.
- Explication des mauvaises reponses.
- Bouton "Ajouter les mots inconnus a revoir".
- Clic sur tout kanji ou mot japonais affiche une fiche instantanee.

## Types de questions concernes

- Quiz global.
- Quiz grammaire.
- Quiz particules.
- Quiz vocabulaire.
- Quiz kanji.
- Mode examen.
- Test d'aptitude.

## Regles metier

- Toute phrase japonaise affichee dans une question ou correction doit etre interactive.
- Si la phrase contient des kanji, la lecture doit etre accessible en un clic.
- Si une mauvaise reponse est choisie, la correction doit expliquer pourquoi elle etait tentante mais fausse.
- Les mots inconnus doivent pouvoir alimenter le SRS.

## Donnees necessaires

Pour chaque question enrichie :

- `sentence_japanese`
- `sentence_hiragana`
- `sentence_romaji`
- `sentence_french`
- `tokens`
- `correct_explanation`
- `wrong_explanations`

Structure token recommandee :

- `surface`
- `reading`
- `romaji`
- `meaning_fr`
- `part_of_speech`
- `grammar_role`
- `linked_item_id`

## UX attendue

- Correction courte visible immediatement.
- Bouton ou zone "Voir le detail".
- Detail affiche :
  - phrase japonaise
  - traduction
  - tableau mot par mot
  - rappel pedagogique
  - mots a revoir

## Criteres d'acceptation

- Une question avec phrase affiche toujours une traduction.
- Les kanji sont cliquables dans la question et la correction.
- L'utilisateur peut comprendre pourquoi sa reponse est fausse.
- Les mots inconnus peuvent etre ajoutes aux revisions.

## Risques

- Trop de texte sur mobile.
- Donnees lexicales incompletes.
- Romaji utile au debut mais a limiter plus tard.

## MVP recommande

Commencer par les phrases de grammaire et particules, puis etendre au mode examen.

---

# 3. Roadmap visuelle du parcours

## Objectif produit

Rendre le parcours lisible comme une progression claire : ou je suis, ce qui est fait, ce qui est bloque, ce qu'il faut faire maintenant, et pourquoi.

## Probleme utilisateur

Un apprenant debutant ne sait pas toujours dans quel ordre travailler. Il peut faire du kanji trop tot, ignorer les kana ou multiplier les quiz sans consolider.

## Fonctionnalites attendues

- Carte de parcours en modules.
- Sous-etapes 1A, 1B, 1C, 2A, 2B, 2C.
- Statut : verrouille, actif, en cours, valide.
- Prerequis visibles.
- Objectifs exacts par module.
- Bouton "Commencer" ou "Continuer".
- Detail de module avec points de passage.
- Recommandation automatique du prochain module.

## Modules recommandes

1. Demarrage intelligent.
2. Hiragana solides.
3. Katakana sans hesitation.
4. Sons combines.
5. Vocabulaire essentiel.
6. Grammaire de base.
7. Kanji N5 essentiels.
8. Phrases mixtes.
9. Simulation JLPT.
10. Consolidation finale.

## Regles metier

- Un module ne se valide pas seulement avec du temps passe.
- Validation selon score, volume, regularite et SRS.
- Si un domaine chute, le parcours propose une remediation.
- Un module peut rester accessible meme apres validation.

## UX attendue

- Vue principale dense mais claire.
- Module actif mis en avant.
- Sous-etapes visibles sans surcharge.
- Detail au clic.
- Pas de gamification dans la partie "Parcours general", seulement progression pedagogique.

## Criteres d'acceptation

- L'utilisateur comprend en moins de 5 secondes son prochain travail.
- Chaque module a une page de detail.
- Chaque sous-etape a un objectif mesurable.
- Les modules verrouilles indiquent pourquoi ils sont verrouilles.

## Risques

- Trop de details dans la vue principale.
- Progression confuse si les regles de validation sont trop nombreuses.

## MVP recommande

Ameliorer la page de detail et ajouter les prerequis visuels avant de creer une carte plus graphique.

---

# 4. Rapport de niveau professionnel

## Objectif produit

Produire un rapport apres le test d'aptitude et apres les examens, avec une analyse claire des forces, faiblesses et axes d'apprentissage.

## Probleme utilisateur

Un score brut ne suffit pas. L'utilisateur doit savoir quoi faire apres.

## Fonctionnalites attendues

- Score global.
- Niveau estime.
- Score par domaine : kana, vocabulaire, kanji, grammaire, comprehension, orthographe.
- Forces reelles.
- Faiblesses prioritaires.
- Risques d'oubli.
- Plan sur 7 jours.
- Plan sur 30 jours.
- Modules recommandes.
- Items a revoir.

## Regles metier

- Un domaine est fort si score >= 85% avec assez de questions.
- Un domaine est fragile entre 60% et 84%.
- Un domaine est prioritaire sous 60%.
- Un domaine non teste ou peu teste doit etre signale comme "donnees insuffisantes".
- Le niveau difficile du test pese plus lourd dans l'analyse.

## Donnees necessaires

- Tentatives par question.
- Domaine de chaque question.
- Difficulte.
- Temps de reponse si disponible.
- Erreurs recurrentes.
- Items inconnus cliques dans les corrections.

## UX attendue

- Resume executive en haut.
- Graphique par domaine.
- Liste de 3 priorites maximum.
- Detail disponible pour les utilisateurs motives.
- Boutons d'action : "Travailler cette faiblesse", "Revoir les mots", "Relancer un test".

## Criteres d'acceptation

- Le rapport ne se limite jamais a un score.
- Il produit au moins 3 recommandations actionnables.
- Il relie les recommandations aux modules existants.
- Il reste lisible sur iPhone.

## Risques

- Rapport trop long.
- Recommandations trop generiques.

## MVP recommande

Commencer avec le rapport du test d'aptitude, puis reutiliser le meme moteur pour les examens blancs.

---

# 5. Dictionnaire contextuel instantane

## Objectif produit

Permettre a l'utilisateur de cliquer sur un mot, un kanji ou une phrase pour obtenir immediatement lecture, romaji, traduction et exemple.

## Probleme utilisateur

Dans une question, un seul mot inconnu peut bloquer toute la comprehension.

## Fonctionnalites attendues

- Clic sur kanji.
- Clic sur mot japonais.
- Popup ou panneau detail.
- Hiragana.
- Romaji.
- Traduction.
- Type grammatical.
- Exemple N5.
- Bouton "A revoir".
- Bouton "Voir la carte".

## Regles metier

- Si le mot est dans la base, utiliser la fiche officielle locale.
- Si plusieurs mots correspondent, afficher les options.
- Si seul le kanji est connu, afficher la fiche kanji.
- Le clic ne doit pas casser la reponse au quiz.

## Donnees necessaires

- Index de vocabulaire.
- Index de kanji.
- Lectures.
- Traductions.
- Exemples.
- Liens item SRS.

## UX attendue

- Popup compacte.
- Texte japonais grand.
- Hiragana tres lisible.
- Romaji secondaire.
- Bouton de fermeture evident.

## Criteres d'acceptation

- Tout kanji visible est cliquable.
- La popup ne masque pas totalement la question.
- L'utilisateur peut ajouter l'item aux revisions.
- La recherche fonctionne hors ligne.

## Risques

- Segmentation japonaise imparfaite.
- Trop de clics accidentels.

## MVP recommande

Conserver le systeme actuel de clic kanji, mais enrichir la fiche et ajouter "a revoir".

---

# 6. Quiz multi-formats

## Objectif produit

Eviter la monotonie et tester des competences differentes avec des formats varies.

## Probleme utilisateur

Le QCM classique peut etre reussi par reconnaissance passive. Il ne garantit pas la lecture active, l'orthographe ou la production.

## Formats a ajouter

- QCM classique.
- Choix multiple.
- Taper la lecture.
- Taper le kana depuis romaji.
- Remettre une phrase dans l'ordre.
- Choisir la particule.
- Associer cartes.
- Kanji vers francais.
- Kanji vers japonais.
- Audio vers choix.
- Vrai/faux rapide.

## Regles metier

- Le format depend du niveau et du domaine.
- Debutant : plus de QCM et association.
- Intermediaire : plus de saisie.
- Avance N5 : phrases mixtes et ordre de phrase.
- Une erreur de saisie doit accepter certaines variantes valides.

## Donnees necessaires

- `question_type`.
- `accepted_answers`.
- `distractors`.
- `difficulty`.
- `domain`.
- `input_mode`.

## UX attendue

- Interface specifique a chaque format.
- Bouton de validation clair.
- Correction immediate.
- Pas de clavier si inutile.
- Sur mobile, zones tactiles larges.

## Criteres d'acceptation

- Au moins 5 formats actifs.
- Chaque format enregistre la progression.
- Les rapports distinguent les faiblesses par format.
- Les formats difficiles apparaissent progressivement.

## Risques

- Complexite technique.
- Formats de saisie frustrants si trop stricts.

## MVP recommande

Ajouter d'abord : saisie kana, phrase a remettre dans l'ordre, association.

---

# 7. Mode examen avec correction pedagogique

## Objectif produit

Faire du mode examen un outil de diagnostic, pas seulement une simulation.

## Probleme utilisateur

Apres un examen blanc, l'utilisateur sait son score mais ne sait pas toujours quoi retravailler.

## Fonctionnalites attendues

- Session chronometree.
- Score global.
- Score par section.
- Temps par question.
- Questions sautees.
- Erreurs par domaine.
- Correction pedagogique.
- Plan de remediation.
- Bouton "Creer ma seance de correction".

## Regles metier

- Les erreurs d'examen alimentent le SRS.
- Les questions ratees peuvent revenir dans une session speciale.
- Le temps trop long sur une question signale une fragilite meme si la reponse est bonne.
- Une section faible doit recommander des modules.

## Donnees necessaires

- Temps de debut et fin.
- Temps par question.
- Reponse selectionnee.
- Domaine.
- Difficulte.
- Statut : correcte, fausse, non repondue.

## UX attendue

- Pendant examen : interface calme, peu distrayante.
- Apres examen : rapport clair, actionnable.
- Correction consultable question par question.

## Criteres d'acceptation

- Le rapport d'examen affiche au moins 5 insights utiles.
- Les erreurs sont ajoutables aux revisions.
- Une seance de correction peut etre lancee depuis le rapport.

## Risques

- Trop lourd si toutes les donnees ne sont pas disponibles.
- Stress utilisateur si feedback trop negatif.

## MVP recommande

Commencer avec score par domaine + liste des erreurs + boutons de remediation.

---

# 8. Cartes vocabulaire et kanji physiques

## Objectif produit

Faire des cartes numeriques qui reprennent le style des cartes physiques de l'utilisateur tout en restant lisibles sur telephone.

## Probleme utilisateur

Les cartes actuelles peuvent vite etre surchargees. Le style physique est fort, mais doit etre adapte au mobile.

## Fonctionnalites attendues

- Recto minimal.
- Verso clair.
- Mode flip.
- Taille adaptative lisible.
- Hiragana non superpose.
- Lectures bien separees.
- Exemple court.
- Boutons : connu, a revoir, favori.

## Recto recommande

- Grand kanji ou mot.
- Fond blanc.
- Bord jaune.
- Aucun logo.
- Aucun chiffre parasite.

## Verso recommande

- Fond jaune.
- Grand kanji en haut.
- Lecture principale.
- Sens francais.
- On-yomi / kun-yomi si utile.
- Hiragana en bas lisible.
- Exemple tres court.

## Regles metier

- Ne jamais afficher trop de texte sur une carte.
- Si texte trop long, afficher "voir detail".
- Les exemples doivent etre N5.
- La carte doit avoir un mode compact mobile.

## UX attendue

- Swipe entre cartes.
- Flip au tap.
- Filtres : tout, a revoir, connu, favori.
- Recherche.

## Criteres d'acceptation

- Aucun texte superpose sur iPhone.
- Les kanji simples comme 二, 五, 一 restent tres grands.
- Le verso reste lisible sans zoom.

## Risques

- Vouloir recopier trop fidelement le physique peut nuire a la lisibilite.

## MVP recommande

Finaliser la carte actuelle, puis ajouter flip et boutons SRS.

---

# 9. Ecriture et trace avec feedback

## Objectif produit

Permettre de pratiquer l'ecriture des kana puis kanji avec guidage.

## Probleme utilisateur

Reconnaitre un caractere ne signifie pas savoir l'ecrire. L'ecriture aide la memoire, surtout pour kana et kanji.

## Fonctionnalites attendues

- Canevas de trace.
- Mode fantome.
- Ordre des traits.
- Direction des traits.
- Evaluation simple.
- Refaire.
- Comparer avec modele.

## Regles metier

- Debut : aide forte avec modele visible.
- Ensuite : modele plus discret.
- Validation : forme approximative acceptee.
- L'objectif est l'apprentissage, pas la calligraphie parfaite.

## Donnees necessaires

- Traits par caractere.
- Ordre.
- Points ou segments.
- Tentatives utilisateur.
- Score approximatif.

## UX attendue

- Zone de dessin grande.
- Bouton effacer.
- Bouton aide.
- Feedback simple : bon ordre, trait manque, recommence.

## Criteres d'acceptation

- Utilisable au doigt sur iPhone.
- Ne bloque pas l'utilisateur pour une petite imperfection.
- Enregistre la pratique dans la progression.

## Risques

- Detection des traits complexe.
- Performance mobile.

## MVP recommande

Commencer par trace guidee sans detection stricte, puis ajouter validation progressive.

---

# 10. Gamification avancee et utile

## Objectif produit

Motiver l'utilisateur a revenir sans transformer l'app en jeu vide. Les recompenses doivent soutenir la progression reelle.

## Probleme utilisateur

L'assiduite est difficile. Mais une simple serie quotidienne ne garantit pas l'apprentissage.

## Fonctionnalites attendues

- Objectifs quotidiens intelligents.
- Objectifs de demain debloques quand les 3 du jour sont faits.
- Badges pedagogiques.
- Quetes longues.
- Ligues ou niveaux.
- Historique jour 1, jour 2, jour 3.
- Recompenses liees aux vrais acquis.

## Regles metier

- Une recompense importante doit demander de la maitrise, pas juste du volume.
- Les objectifs doivent changer chaque jour.
- Les objectifs doivent s'adapter au niveau.
- Les objectifs doivent integrer les points faibles.
- Plus le niveau est haut, plus les seuils sont exigeants.

## Donnees necessaires

- Planning d'objectifs.
- Recompenses obtenues.
- Jours parfaits.
- Jours actifs.
- Niveau utilisateur.
- Domaine prioritaire.

## UX attendue

- Panneau "Plan du jour".
- 3 objectifs maximum.
- Quand fini : "Objectifs de demain debloques".
- Calendrier visible.
- Badges lisibles.

## Criteres d'acceptation

- Les objectifs de deux jours consecutifs ne sont pas identiques.
- Les objectifs montent avec le niveau.
- Le domaine faible influence les objectifs.
- L'historique reste coherent.

## Risques

- Trop d'objectifs peut fatiguer.
- Objectifs trop difficiles peuvent casser la motivation.

## MVP recommande

Le systeme actuel d'objectifs adaptatifs est la base. Prochaine etape : affichage detaille de l'historique jour par jour avec les 3 objectifs exacts realises.

---

# Ordre d'implementation recommande

## Phase 1 - Intelligence pedagogique

1. SRS intelligent par item.
2. Corrections enrichies mot par mot.
3. Dictionnaire contextuel avec ajout a revoir.

## Phase 2 - Parcours et diagnostic

4. Roadmap visuelle.
5. Rapport de niveau professionnel.
6. Mode examen avec correction pedagogique.

## Phase 3 - Experience et retention

7. Quiz multi-formats.
8. Cartes physiques finalisees.
9. Gamification avancee.
10. Ecriture et trace.

## Definition of Done globale

Une fonctionnalite est terminee si :

- Elle est visible et utilisable sur iPhone.
- Elle sauvegarde les donnees necessaires.
- Elle influence au moins un systeme existant : parcours, objectifs, SRS, rapport ou recompenses.
- Elle a une verification TypeScript.
- Elle ne casse pas l'export web.
- Elle reste lisible sur petit ecran.


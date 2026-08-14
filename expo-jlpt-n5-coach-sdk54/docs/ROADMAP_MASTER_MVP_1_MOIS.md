# Roadmap master - MVP premium en 1 mois

## Objectif

Finir une version solide de JLPT N5 Coach en priorisant ce qui donne le plus de valeur utilisateur pour le moins de quota ChatGPT/Codex.

Cette roadmap ne cherche pas a faire les 15 chantiers en version complete. Elle cherche a livrer une app professionnelle, offline, coherentement terminee, avec une boucle d'apprentissage forte.

## Contraintes

- 100% offline.
- Aucun backend.
- Aucune API externe.
- Aucun reseau social.
- Aucun compte obligatoire.
- SQLite local uniquement.
- Compatible Expo Go.
- Lisible sur iPhone.
- Un chantier a la fois.
- Validation apres chaque bloc.
- Mise a jour des cases dans le cahier des charges.

## Documents de reference

- `docs/CAHIER_DES_CHARGES_OFFLINE_15_CHANTIERS.md`
- `docs/CAHIER_DES_CHARGES_TECHNIQUE_OFFLINE_V2_DEVIN.md`
- `docs/ROADMAP_MASTER_MVP_1_MOIS.md`

---

# Traçabilité avec le cahier technique V2

Cette roadmap 1 mois est une version priorisee du cahier technique V2. Elle ne supprime aucune idee : elle indique ce qui est inclus dans le mois, ce qui est reduit au MVP, ce qui devient bonus, et ce qui est reporte.

| Cahier V2 | Statut dans roadmap 1 mois | Decision |
|---|---|---|
| 1. File SRS centrale | Inclus semaine 2 | MVP obligatoire |
| 2. Corrections intelligentes | Inclus semaine 3 | MVP obligatoire |
| 3. Lecons grammaire structurees | Reporte apres 1 mois | Trop consommateur en contenu |
| 4. Kanji composants | Bonus si quota restant | 80 kanji N5 |
| 5. Audio local | Reporte apres 1 mois | Risque taille/assets/TTS |
| 6. Immersion texte cliquable | Bonus si quota restant | Petit lot 5 textes |
| 7. Diagnostic adaptatif | Inclus semaine 4 | MVP obligatoire |
| 8. Parcours personnalisable | Inclus semaine 4 | MVP obligatoire |
| 9. Exercices varies | Bonus si quota restant | MVP si quota disponible |
| 10. Journal phrases | Reporte apres 1 mois | Correction locale trop large |
| 11. Mode 5 minutes | Inclus semaine 1 | MVP obligatoire |
| 12. Stories dialogues | Reporte apres 1 mois | Contenu local a produire |
| 13. Ligues locales | Bonus si quota restant | Version simple possible |
| 14. Parametres pedagogiques | Inclus semaine 1 | MVP obligatoire |
| 15. Flashcards erreurs | Inclus semaine 3 | MVP obligatoire |

## Elements transverses du cahier V2 a respecter dans chaque semaine

- [ ] Respect strict offline : aucune API, aucun backend, aucun reseau social.
- [ ] SQLite local pour toute persistance.
- [ ] Compatibilite Expo Go.
- [ ] Donnees utilisateur existantes preservees.
- [ ] Navigation menu lateral mise a jour si un nouvel ecran est cree.
- [ ] Bouton retour global fonctionnel sur tout nouvel ecran.
- [ ] Etats vides propres.
- [ ] Etats erreur propres.
- [ ] UI lisible sur iPhone.
- [ ] Mise a jour des cases dans le cahier technique V2.
- [ ] Rapport court apres chaque chantier.
- [ ] Validation `typecheck`, `smoke`, `export:web`, `diff-check`.

## Tables et services du cahier V2 a traiter dans le mois

### Inclus obligatoirement

- [ ] `app_user_learning_preferences`
- [ ] `services/preferences.ts`
- [ ] `services/quickSession.ts`
- [ ] `services/srsQueue.ts`
- [x] `app_error_flashcard`
- [x] `services/errorFlashcards.ts`
- [x] `app_aptitude_result`
- [x] `services/aptitudeTest.ts`

### A utiliser si deja present

- [ ] `app_srs_item_state`
- [ ] `app_question_attempt_local`
- [ ] `app_daily_reward_claim`
- [ ] `app_daily_goal_plan`

### Reporte ou bonus

- [x] `app_content_progress` pour immersion/stories si bonus.
- [x] `app_local_league_season` si ligues locales bonus.
- [ ] service audio local reporte.
- [ ] journal d'ecriture reporte.

## Ecrans/composants du cahier V2 a traiter dans le mois

### Inclus obligatoirement

- [ ] `LearningPreferencesScreen`
- [ ] `QuickSessionScreen`
- [ ] `ReviewQueueScreen`
- [x] `SmartCorrectionPanel`
- [x] `FlashcardFromErrorButton`
- [x] vue "Mes erreurs"
- [x] `AptitudeTestScreen`
- [x] `AptitudeReportScreen`

### Bonus si quota restant

- [x] `KanjiDetailScreen`
- [x] `ImmersionReaderScreen`
- [x] `LocalLeagueCard`
- [ ] `ExerciseFormatSwitcher`

### Reporte apres 1 mois

- [ ] `StoryLessonScreen`
- [ ] `WritingJournalScreen`
- [ ] `OfflineAudioButton`
- [ ] `GrammarLessonDetailScreen` complet

---

# Phase 0 - Stabilisation obligatoire

## But

Avant d'ajouter des gros blocs, s'assurer que l'app actuelle est stable.

## A faire

- [x] Lancer `npm run typecheck`.
- [x] Lancer `npm run smoke`.
- [x] Lancer `npm run export:web`.
- [x] Lancer `git diff --check`.
- [ ] Tester navigation principale.
- [ ] Tester menu lateral.
- [ ] Tester bouton retour global.
- [ ] Tester dashboard.
- [ ] Tester vocabulaire/kanji.
- [ ] Tester quiz.
- [ ] Tester mode examen.
- [ ] Verifier visuellement sur mobile les zones surchargees.

## Livrable

App stable avant travaux.

---

# Semaine 1 - Boucle quotidienne rapide

## Chantier 1 - Parametres pedagogiques MVP

### Objectif

Permettre a l'utilisateur d'adapter son apprentissage sans internet.

### Fonctionnalites

- [x] Table locale preferences.
- [x] Service `preferences.ts`.
- [x] Ecran `LearningPreferencesScreen`.
- [x] Preference romaji on/off.
- [x] Preference traduction immediate on/off.
- [x] Preference difficulte : doux, normal, difficile.
- [x] Preference longueur session : 5, 10, 20.
- [x] Preference reponses japonaises.
- [x] Acces depuis menu lateral.
- [x] Persistance SQLite.

### Criteres d'acceptation

- [x] Les preferences restent apres redemarrage.
- [x] Masquer romaji fonctionne au moins sur vocabulaire/corrections MVP.
- [x] Mode difficile peut influencer les futurs quiz.
- [x] Aucun internet requis.

Note : les preferences sont creees, sauvegardees et utilisees par le mode 5 minutes, le vocabulaire et le quiz global. L'application fine du romaji/traduction dans toutes les corrections reste liee au chantier SmartCorrectionPanel.

## Chantier 2 - Mode 5 minutes MVP

### Objectif

L'utilisateur doit pouvoir lancer une session utile en un clic.

### Fonctionnalites

- [x] Service `quickSession.ts`.
- [x] Bouton "5 minutes" sur dashboard ou menu quiz.
- [x] Ecran `QuickSessionScreen`.
- [x] Session 8 a 12 questions.
- [x] Selection locale : revisions dues si disponibles, sinon faiblesses, sinon questions mixtes.
- [x] Ecran resultat.
- [x] XP de fin de session.
- [x] Animation recompense reutilisee.

### Criteres d'acceptation

- [x] Une session peut etre lancee en un clic.
- [x] Elle fonctionne meme sans SRS disponible.
- [x] Elle enregistre les reponses.
- [x] Elle donne une recompense claire.

## Validation semaine 1

- [x] Typecheck OK.
- [x] Smoke OK.
- [x] Export web OK.
- [x] Diff-check OK.
- [ ] Test mobile rapide OK.
- [x] Cahier des charges coche.
- [x] Commit.

---

# Semaine 2 - Memoire durable

## Chantier 3 - SRS moteur MVP

### Objectif

Faire revenir les bons items au bon moment.

### Fonctionnalites

- [x] Verifier table `app_srs_item_state`.
- [x] Creer/ameliorer `srsQueue.ts`.
- [x] Types `SrsQueueItem`, `SrsStatus`, `SrsItemType`.
- [x] Fonction `loadDueSrsItems`.
- [x] Fonction `recordSrsReview`.
- [x] Fonction `buildSrsReviewSession`.
- [x] Algorithme simple : nouveau, fragile, connu, solide, maitrise.
- [x] Erreur = retour plus rapide.
- [x] Bonne reponse repetee = intervalle augmente.

### Criteres d'acceptation

- [x] Un item faux revient plus vite.
- [x] Un item reussi s'espace.
- [x] Les donnees persistent.
- [x] Aucun backend.

## Chantier 4 - Ecran Revisions du jour MVP

### Objectif

Rendre le SRS visible et utilisable.

### Fonctionnalites

- [x] Ecran `ReviewQueueScreen`.
- [x] Compteur items dus.
- [x] Sections : urgent, aujourd'hui, bientot.
- [x] Session 10 items.
- [x] Etat vide propre.
- [x] Acces depuis menu lateral.
- [x] Carte dashboard "A revoir aujourd'hui".
- [x] Branchement vocabulaire/kanji en priorite.

### Criteres d'acceptation

- [x] L'utilisateur voit quoi reviser.
- [x] Il peut lancer une revision.
- [x] Les resultats mettent a jour le SRS.

## Validation semaine 2

- [x] Typecheck OK.
- [x] Smoke OK.
- [x] Export web OK.
- [x] Diff-check OK.
- [ ] Test mobile rapide OK.
- [x] Cahier des charges coche.
- [x] Commit.

---

# Semaine 3 - Erreurs utiles

## Chantier 5 - SmartCorrectionPanel MVP

### Objectif

Chaque erreur doit aider a comprendre, pas seulement sanctionner.

### Fonctionnalites

- [x] Composant `SmartCorrectionPanel`.
- [x] Phrase japonaise.
- [x] Traduction francaise.
- [x] Explication courte.
- [x] Mot/kanji cliquable si donnees disponibles.
- [x] Detail mot par mot si possible.
- [x] Fallback propre si donnees manquantes.
- [x] Integration dans quiz global d'abord.
- [x] Integration dans grammaire ensuite si quota disponible.

### Criteres d'acceptation

- [x] Une mauvaise reponse montre une explication utile.
- [x] Les kanji/mots connus sont cliquables.
- [ ] L'UI reste lisible sur mobile.

## Chantier 6 - Flashcards depuis erreurs MVP

### Objectif

Transformer une erreur en carte de revision.

### Fonctionnalites

- [x] Table `app_error_flashcard`.
- [x] Service `errorFlashcards.ts`.
- [x] Bouton "Ajouter a mes revisions".
- [x] Eviter doublons.
- [x] Vue "Mes erreurs".
- [x] Lien avec SRS.
- [x] Archive/suppression simple.

### Criteres d'acceptation

- [x] Une erreur peut creer une carte.
- [x] La carte revient dans les revisions.
- [x] Elle peut etre archivee.

## Validation semaine 3

- [x] Typecheck OK.
- [x] Smoke OK.
- [x] Export web OK.
- [x] Diff-check OK.
- [ ] Test mobile rapide OK.
- [x] Cahier des charges coche.
- [x] Commit.

---

# Semaine 4 - Coach professionnel

## Chantier 7 - Diagnostic adaptatif MVP

### Objectif

Mesurer le niveau utilisateur et recommander un parcours.

### Fonctionnalites

- [x] Banque diagnostic locale 30 a 45 questions.
- [x] Tags : kana, vocabulaire, kanji, grammaire, comprehension.
- [x] 3 niveaux de difficulte.
- [x] Service `aptitudeTest.ts`.
- [x] Ecran `AptitudeTestScreen`.
- [x] Score global.
- [x] Scores par domaine.
- [x] Rapport forces/faiblesses.
- [x] Recommandation de module.
- [x] Sauvegarde locale.

### Criteres d'acceptation

- [x] Le rapport donne des actions concretes.
- [x] Le parcours recommande est coherent.
- [x] Le test fonctionne offline.

## Chantier 8 - Parcours personnalisable MVP

### Objectif

Adapter les objectifs a la maniere d'apprendre de l'utilisateur.

### Fonctionnalites

- [x] Modes : equilibre, kana d'abord, grammaire intensive, revision examen.
- [x] Preference `learning_plan_mode`.
- [x] Objectifs quotidiens adaptes.
- [x] Module recommande affiche.
- [x] Explication "pourquoi ce module".

### Criteres d'acceptation

- [x] Changer de mode modifie les objectifs futurs.
- [x] La progression existante n'est pas perdue.
- [x] L'utilisateur comprend pourquoi ce parcours est propose.

## Validation semaine 4

- [x] Typecheck OK.
- [x] Smoke OK.
- [x] Export web OK.
- [x] Diff-check OK.
- [ ] Test mobile complet OK.
- [x] Cahier des charges coche.
- [x] Commit.

---

# Bonus si quota restant

## Bonus A - Exercices varies MVP

- [x] QCM standard.
- [x] Japonais vers francais.
- [x] Francais vers japonais.
- [x] Kanji vers kana.
- [x] Phrase a trou.

## Bonus B - Kanji composants N5

- [x] Structure `kanjiComponents.ts`.
- [x] 80 kanji N5 enrichis.
- [x] Mnemonique FR.
- [x] Mots lies.
- [x] Detail kanji.

## Bonus C - Immersion texte petit lot

- [x] 5 textes N5 courts.
- [x] Tokens cliquables.
- [x] Traduction masquable.
- [x] Questions comprehension.

## Bonus D - Ligues locales simples

- [x] Saison locale.
- [x] Maintien/promotion.
- [x] Carte dashboard.
- [x] Animation promotion.

---

# Ce qui est reporte apres 1 mois

- Audio local complet.
- Journal d'ecriture avance.
- Quiz composants kanji avance.
- Toutes les lecons grammaire ultra structurees.
- Stories nombreuses.
- Immersion massive.
- Correction libre avancee.
- Ligues locales avancees.

---

# Commandes de validation

```powershell
cd "C:\Users\snoop\Documents\Logiciel BAB\JLPT5-main\expo-jlpt-n5-coach-sdk54"
$env:Path += ';C:\Program Files\Git\cmd;C:\Program Files\nodejs'
npm run typecheck
npm run smoke
npm run export:web
cd ..
git diff --check
git status --short
```

---

# Regle de travail avec ChatGPT/Codex

Pour economiser le quota :

- un seul chantier par session,
- pas de refactor global,
- pas de contenu massif dans les premieres semaines,
- validations a la fin du bloc,
- commit apres chaque semaine stable,
- mise a jour des cases cochees dans ce document,
- si un chantier grossit trop, couper au MVP et noter V1 restante.

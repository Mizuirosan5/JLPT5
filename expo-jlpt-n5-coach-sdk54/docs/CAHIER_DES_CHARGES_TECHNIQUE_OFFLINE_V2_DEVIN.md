# Cahier des charges technique offline V2 - Handoff implementation Devin

## 1. Mission

Ce document est destine a un agent de developpement charge d'implementer, de A a Z, les evolutions majeures de l'application `JLPT N5 Coach`.

Le but est de transformer l'app en coach d'apprentissage japonais N5 complet, professionnel, autonome, pedagogique, motivant et utilisable hors ligne.

Ce document doit etre traite comme une specification technique et produit. Il contient :

- contraintes globales,
- architecture cible,
- priorites,
- schemas de donnees,
- composants a creer,
- services a creer ou modifier,
- algorithmes,
- criteres d'acceptation,
- tests,
- plan de livraison progressif.

## 2. Contrainte principale

L'application doit fonctionner sans internet.

Interdictions :

- pas de compte utilisateur obligatoire,
- pas de backend,
- pas d'API externe,
- pas de reseau social,
- pas de classement en ligne,
- pas de correction humaine distante,
- pas de dependance a un contenu telecharge au runtime,
- pas d'IA distante.

Autorisations :

- SQLite local,
- donnees embarquees dans le projet,
- assets embarques,
- TTS local du systeme si disponible,
- algorithmes locaux,
- preferences locales,
- progression locale.

## 3. Etat actuel suppose de l'app

L'app possede deja :

- navigation principale avec dashboard, parcours, kana, vocabulaire, grammaire, quiz, JLPT,
- base SQLite locale,
- question bank locale,
- vocabulaire et kanji N5,
- SRS initial dans `services/srs.ts`,
- objectifs quotidiens adaptatifs,
- recompenses XP,
- assiduite binaire `0/1`,
- bonus XP a 1, 3 et 7 jours,
- animation de recompense,
- fiches vocabulaire/kanji style cartes physiques,
- kanji cliquables dans plusieurs zones,
- parcours avec modules et recompenses,
- test/export web/smoke check.

Avant toute implementation, verifier l'etat reel avec :

```powershell
cd "C:\Users\snoop\Documents\Logiciel BAB\JLPT5-main\expo-jlpt-n5-coach-sdk54"
$env:Path += ';C:\Program Files\Git\cmd;C:\Program Files\nodejs'
npm run typecheck
npm run smoke
npm run export:web
```

## 4. Regles de qualite

Chaque chantier doit respecter :

- code TypeScript type-safe,
- composants React Native lisibles,
- styles centralises dans `appStyles.ts` sauf pattern existant contraire,
- aucun texte superpose sur iPhone,
- UI mobile prioritaire,
- etats vides propres,
- etats erreur propres,
- pas de refactor massif inutile,
- compatibilite Expo Go,
- pas de dependance native lourde sans justification,
- tests manuels de navigation,
- persistance apres redemarrage,
- aucune regression sur les ecrans existants.

## 5. Definition de fini globale

Une fonctionnalite est finie seulement si :

- elle fonctionne sans internet,
- elle est accessible depuis la navigation,
- elle persiste localement,
- elle respecte les preferences utilisateur,
- elle alimente SRS/parcours/recompenses quand pertinent,
- elle a un etat vide,
- elle a un etat erreur,
- elle passe `npm run typecheck`,
- elle passe `npm run smoke`,
- elle passe `npm run export:web`,
- elle est verifiee visuellement sur viewport mobile.

## 6. Priorisation globale

Notation :

- Impact : 1 faible, 5 tres fort.
- Difficulte : 1 facile, 5 tres difficile.
- Contenu : 1 peu de contenu, 5 beaucoup de contenu.
- Priorite : P0 essentiel, P1 tres important, P2 important, P3 plus tard.

| # | Chantier | Priorite | Impact | Difficulte | Contenu | Dependances |
|---|----------|----------|--------|------------|---------|-------------|
| 1 | File SRS centrale | P0 | 5 | 3 | 2 | SQLite, quiz |
| 11 | Mode 5 minutes | P0 | 5 | 2 | 1 | SRS, quiz |
| 14 | Parametres pedagogiques | P0 | 4 | 2 | 1 | tous ecrans |
| 15 | Flashcards depuis erreurs | P0 | 5 | 3 | 2 | corrections, SRS |
| 2 | Corrections intelligentes | P1 | 5 | 4 | 4 | lookup, question data |
| 7 | Diagnostic adaptatif | P1 | 5 | 4 | 3 | rapport, parcours |
| 9 | Exercices varies | P1 | 4 | 3 | 2 | factories quiz |
| 8 | Parcours personnalisable | P1 | 4 | 3 | 2 | preferences, objectifs |
| 4 | Kanji composants | P2 | 4 | 4 | 4 | data kanji |
| 3 | Grammaire structuree | P2 | 5 | 4 | 5 | data grammaire |
| 6 | Immersion texte cliquable | P2 | 5 | 4 | 4 | lookup, SRS |
| 12 | Stories dialogues | P2 | 4 | 4 | 5 | contenu local |
| 13 | Ligues locales | P2 | 3 | 3 | 1 | XP, assiduite |
| 5 | Audio local | P3 | 3 | 4 | 5 | assets/TTS |
| 10 | Journal phrases | P3 | 3 | 5 | 3 | parser local |

## 6 bis. Registre d'avancement obligatoire

Ce registre doit etre mis a jour apres chaque session de travail.

Statuts autorises :

- `A faire`
- `En cours`
- `Fait MVP`
- `Fait V1`
- `Fait V2`
- `Bloque`
- `A revoir`

| # | Chantier | Statut | Derniere note | Validation |
|---|----------|--------|---------------|------------|
| 1 | File SRS centrale | A faire | - | - |
| 2 | Corrections intelligentes | A faire | - | - |
| 3 | Lecons grammaire structurees | A faire | - | - |
| 4 | Kanji composants | A faire | - | - |
| 5 | Audio local | A faire | - | - |
| 6 | Immersion texte cliquable | A faire | - | - |
| 7 | Diagnostic adaptatif | A faire | - | - |
| 8 | Parcours personnalisable | A faire | - | - |
| 9 | Exercices varies | A faire | - | - |
| 10 | Journal phrases | A faire | - | - |
| 11 | Mode 5 minutes | A faire | - | - |
| 12 | Stories dialogues | A faire | - | - |
| 13 | Ligues locales | A faire | - | - |
| 14 | Parametres pedagogiques | A faire | - | - |
| 15 | Flashcards depuis erreurs | A faire | - | - |

Format de mise a jour recommande :

```md
| 14 | Parametres pedagogiques | Fait MVP | Preferences creees et branchees vocab/quiz | typecheck OK, smoke OK, export OK |
```

## 7. Roadmap recommandee

Chaque etape de cette roadmap doit etre cochee dans ce document au fur et a mesure de l'implementation.

Convention :

- `[ ]` = a faire.
- `[x]` = termine et verifie.
- Une etape ne peut etre cochee que si les criteres de validation associes sont passes.
- Si une etape est partiellement faite, ne pas la cocher. Ajouter une note courte sous l'etape.
- Ne jamais passer a un chantier dependant si le chantier socle n'est pas stable.

### Sprint 1 - Fondations utilisateur

Objectif : donner plus de controle et une session rapide.

- [x] 1. Parametres pedagogiques MVP.
- [x] 2. Mode 5 minutes MVP.
- [x] 3. Integration preferences dans quiz/vocab/corrections.
  - Preferences branchees dans vocabulaire, quiz global, mode 5 minutes et panneaux de correction principaux.
- [ ] 4. Validation complete Sprint 1.

### Sprint 2 - Memoire durable

Objectif : faire revenir les bons items au bon moment.

- [x] 1. File SRS centrale.
- [x] 2. Queue de revision.
- [x] 3. Hook quiz -> SRS.
- [x] 4. Tableau dashboard "A revoir".
- [ ] 5. Validation complete Sprint 2.

### Sprint 3 - Erreurs utiles

Objectif : transformer les erreurs en apprentissage.

- [x] 1. SmartCorrectionPanel.
- [x] 2. Flashcards depuis erreurs.
- [x] 3. Revisions "mes erreurs".
- [ ] 4. Validation complete Sprint 3.

### Sprint 4 - Diagnostic et parcours

Objectif : savoir ou l'utilisateur en est et adapter le parcours.

- [ ] 1. Test adaptatif complet.
- [ ] 2. Rapport professionnel.
- [ ] 3. Parcours personnalise.
- [ ] 4. Validation complete Sprint 4.

### Sprint 5 - Profondeur pedagogique

Objectif : enrichir contenu et comprehension.

- [ ] 1. Kanji composants.
- [ ] 2. Grammaire structuree.
- [ ] 3. Exercices varies.
- [ ] 4. Validation complete Sprint 5.

### Sprint 6 - Immersion et contexte

Objectif : apprendre en phrases et situations.

- [ ] 1. Immersion reader.
- [ ] 2. Stories/dialogues.
- [ ] 3. Audio local MVP si possible.
- [ ] 4. Validation complete Sprint 6.

## 8. Architecture de donnees cible

### 8.1 Table `app_user_learning_preferences`

But : stocker les choix pedagogiques.

```sql
CREATE TABLE IF NOT EXISTS app_user_learning_preferences (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

Cles recommandees :

- `show_romaji`: `true`/`false`
- `show_translation_first`: `true`/`false`
- `quiz_difficulty`: `soft`/`normal`/`hard`
- `preferred_session_length`: `5`/`10`/`20`
- `learning_plan_mode`: `balanced`/`kana_first`/`kanji_progressive`/`grammar_intensive`/`exam_revision`
- `free_input_enabled`: `true`/`false`
- `audio_enabled`: `true`/`false`
- `japanese_answer_mode`: `true`/`false`

### 8.2 Table `app_error_flashcard`

But : creer des cartes depuis les erreurs.

```sql
CREATE TABLE IF NOT EXISTS app_error_flashcard (
  id TEXT PRIMARY KEY,
  source_question_id TEXT,
  source_mode TEXT NOT NULL,
  item_type TEXT NOT NULL,
  item_id TEXT,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  reading TEXT,
  romaji TEXT,
  meaning_fr TEXT,
  example_ja TEXT,
  example_fr TEXT,
  error_reason TEXT,
  created_at TEXT NOT NULL,
  archived INTEGER NOT NULL DEFAULT 0
);
```

### 8.3 Table `app_aptitude_result`

```sql
CREATE TABLE IF NOT EXISTS app_aptitude_result (
  id TEXT PRIMARY KEY,
  score INTEGER NOT NULL,
  level3_rate INTEGER NOT NULL,
  estimated_level TEXT NOT NULL,
  global_label TEXT NOT NULL,
  recommended_module TEXT,
  weakest_domain TEXT,
  strongest_domain TEXT,
  answers_json TEXT NOT NULL,
  report_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

`report_json` contient :

- scores par domaine,
- forces,
- faiblesses,
- erreurs typiques,
- modules recommandes,
- objectifs 7 jours,
- conseil de revision.

### 8.4 Table `app_content_progress`

```sql
CREATE TABLE IF NOT EXISTS app_content_progress (
  content_id TEXT NOT NULL,
  content_type TEXT NOT NULL,
  opened_count INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  score INTEGER,
  last_opened_at TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (content_id, content_type)
);
```

### 8.5 Table `app_local_league_season`

```sql
CREATE TABLE IF NOT EXISTS app_local_league_season (
  season_key TEXT PRIMARY KEY,
  league_name TEXT NOT NULL,
  division TEXT NOT NULL,
  xp_start INTEGER NOT NULL,
  xp_current INTEGER NOT NULL,
  active_days INTEGER NOT NULL DEFAULT 0,
  promoted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

## 9. Services a creer ou etendre

### 9.1 `services/preferences.ts`

Responsabilites :

- charger preferences,
- sauvegarder preference,
- exposer defaults,
- convertir valeurs SQLite en types.

API :

```ts
export type LearningPreferences = {
  showRomaji: boolean;
  showTranslationFirst: boolean;
  quizDifficulty: 'soft' | 'normal' | 'hard';
  preferredSessionLength: 5 | 10 | 20;
  learningPlanMode: 'balanced' | 'kana_first' | 'kanji_progressive' | 'grammar_intensive' | 'exam_revision';
  freeInputEnabled: boolean;
  audioEnabled: boolean;
  japaneseAnswerMode: boolean;
};

export async function loadLearningPreferences(db): Promise<LearningPreferences>;
export async function saveLearningPreference(db, key, value): Promise<void>;
```

### 9.2 `services/srsQueue.ts`

Responsabilites :

- recuperer les items dus,
- trier par priorite,
- calculer prochaine date,
- enregistrer review,
- produire une session.

API :

```ts
export async function loadDueSrsItems(db, limit): Promise<SrsQueueItem[]>;
export async function recordSrsReview(db, item, isCorrect): Promise<void>;
export async function buildSrsReviewSession(db, options): Promise<ReviewQuestion[]>;
```

### 9.3 `services/quickSession.ts`

Responsabilites :

- creer une session 5 minutes,
- melanger SRS, faiblesse, nouveaute,
- limiter duree et nombre questions.

Regle de selection :

- 60% SRS du si disponible,
- 25% faiblesse principale,
- 15% nouveau contenu du parcours.

### 9.4 `services/errorFlashcards.ts`

Responsabilites :

- creer carte depuis erreur,
- lier carte au SRS,
- archiver carte,
- charger cartes actives.

### 9.5 `services/aptitudeTest.ts`

Responsabilites :

- construire test,
- scorer,
- generer rapport local,
- recommander modules.

### 9.6 `services/exerciseFactory.ts`

Responsabilites :

- produire plusieurs formats pour le meme item,
- appliquer preferences,
- augmenter difficulte selon maitrise.

### 9.7 `services/kanjiComponents.ts`

Responsabilites :

- charger composants,
- fournir mnemoniques,
- lier kanji -> vocabulaire.

### 9.8 `services/localLeague.ts`

Responsabilites :

- calculer saison locale,
- promotion/maintien,
- animation de ligue,
- aucun reseau.

## 10. Composants/ecrans a creer

### Ecrans

- `ReviewQueueScreen.tsx`
- `QuickSessionScreen.tsx`
- `LearningPreferencesScreen.tsx`
- `AptitudeTestScreen.tsx`
- `AptitudeReportScreen.tsx`
- `ImmersionReaderScreen.tsx`
- `StoryLessonScreen.tsx`
- `WritingJournalScreen.tsx`
- `KanjiDetailScreen.tsx`
- `GrammarLessonDetailScreen.tsx`

### Composants partages

- `SmartCorrectionPanel`
- `JapaneseTokenGrid`
- `SrsStatusBadge`
- `ReviewDueCard`
- `QuickSessionButton`
- `PreferenceToggle`
- `ExerciseFormatSwitcher`
- `FlashcardFromErrorButton`
- `RewardCelebrationOverlay`
- `LocalLeagueCard`
- `OfflineAudioButton`

## 11. Navigation cible

Menu lateral :

- Parcours
  - Resume
  - Parcours general
  - Recompenses
  - Diagnostic
  - Revisions
- Apprendre
  - Kana
  - Vocabulaire
  - Kanji
  - Grammaire
  - Immersion
  - Stories
- Quiz
  - Mode 5 minutes
  - Quiz global
  - Quiz grammaire
  - Quiz kanji
  - Test JLPT
- Reglages
  - Preferences pedagogiques
  - Donnees locales

Navigation basse :

- Parcours
- Apprendre
- Quiz

Boutons flottants :

- menu complet,
- retour global.

---

# 11 bis. Protocole obligatoire de progression et de suivi

Cette section est la procedure de travail obligatoire. Elle sert a piloter l'implementation et a rayer/cocher chaque passage valide.

## 11.1 Regle de base

Un chantier ne doit jamais etre considere termine parce que le code "semble" present. Il est termine seulement si :

- l'ecran ou la fonctionnalite est accessible,
- la donnee est persistee si necessaire,
- l'UI est lisible sur mobile,
- le comportement fonctionne sur cas nominal,
- les etats vides sont propres,
- les tests passent,
- le document est mis a jour avec les cases cochees.

## 11.2 Checklist avant de commencer un chantier

- [ ] Lire la section complete du chantier dans ce document.
- [ ] Identifier les fichiers existants concernes.
- [ ] Verifier s'il existe deja une implementation partielle.
- [ ] Lister les donnees SQLite necessaires.
- [ ] Lister les composants a creer ou modifier.
- [ ] Lister les services a creer ou modifier.
- [ ] Verifier les dependances avec les autres chantiers.
- [ ] Definir le MVP exact du chantier.
- [ ] Ne commencer le code qu'apres avoir compris le flux utilisateur complet.

## 11.3 Checklist obligatoire pendant l'implementation

- [ ] Creer ou modifier les types TypeScript.
- [ ] Ajouter les tables SQLite si necessaire.
- [ ] Ajouter les services metier.
- [ ] Ajouter les composants UI.
- [ ] Brancher la navigation.
- [ ] Brancher les donnees reelles, pas de fausse UI statique.
- [ ] Ajouter les etats vides.
- [ ] Ajouter les etats erreur.
- [ ] Verifier les textes longs sur mobile.
- [ ] Connecter au SRS si le chantier concerne une connaissance.
- [ ] Connecter aux recompenses si le chantier valide un effort.
- [ ] Connecter aux preferences si l'affichage ou la difficulte est concerne.

## 11.4 Checklist obligatoire apres implementation

- [ ] Lancer `npm run typecheck`.
- [ ] Lancer `npm run smoke`.
- [ ] Lancer `npm run export:web`.
- [ ] Lancer `git diff --check`.
- [ ] Verifier manuellement le flux principal.
- [ ] Verifier au moins un etat vide.
- [ ] Verifier au moins un etat avec donnees.
- [ ] Verifier qu'aucun service internet n'a ete ajoute.
- [ ] Mettre a jour les cases du chantier dans ce document.
- [ ] Ajouter une note courte "fait / reste / risque".

## 11.5 Mode de marquage

Quand une etape est terminee, remplacer :

```md
- [ ] Etape
```

par :

```md
- [x] Etape
```

Ajouter si utile :

```md
  Note : implementation MVP terminee, V1 restante.
```

## 11.6 Points de passage bloquants

Ces points sont bloquants. Si l'un echoue, ne pas cocher le chantier :

- [ ] TypeScript passe.
- [ ] Smoke check passe.
- [ ] Export web passe.
- [ ] Pas de regression evidente de navigation.
- [ ] Pas de dependance internet.
- [ ] Donnees utilisateur existantes preservees.
- [ ] UI mobile lisible.
- [ ] Le bouton retour global fonctionne apres ajout de l'ecran.
- [ ] Le menu lateral permet d'acceder a la feature si elle a un ecran.

## 11.7 Format de rapport apres chaque chantier

Chaque chantier termine doit etre accompagne d'un rapport court :

```md
## Rapport chantier X

Fait :
- ...

Fichiers modifies :
- ...

Validation :
- typecheck : OK
- smoke : OK
- export web : OK
- diff-check : OK

Reste :
- ...

Risques :
- ...
```

---

# 12. Chantiers detailles

## Chantier 1 - File de revision SRS centrale

### Inspiration concurrente

WaniKani et Bunpro structurent l'apprentissage autour d'un SRS. L'utilisateur ne choisit pas au hasard quoi revoir : le systeme presente les items dus.

### Version cible offline

Une page locale "Revisions" affiche tous les items dus et permet de lancer une session.

### MVP

- Page `ReviewQueueScreen`.
- Compteur total items dus.
- 3 blocs : urgent, aujourd'hui, bientot.
- Session 10 items.
- Statuts couleur.

### V1

- Filtre par domaine.
- Priorite selon erreurs.
- Recommandation dashboard.
- Integration objectifs quotidiens.

### V2

- Prediction d'oubli.
- Ajustement automatique de difficulte.
- Graphique de memoire.

### Implementation

- [x] Verifier `app_srs_item_state`.
- [ ] Ajouter migrations additives si des champs manquent.
- [x] Creer `services/srsQueue.ts`.
- [x] Creer type `SrsQueueItem`.
- [x] Implementer `loadDueSrsItems`.
- [x] Implementer `recordSrsReview`.
- [x] Implementer `buildSrsReviewSession`.
- [x] Ajouter mapping item -> question.
- [x] Brancher kana quiz vers SRS.
- [x] Brancher vocabulaire vers SRS.
- [x] Brancher kanji vers SRS.
- [x] Brancher grammaire vers SRS.
- [x] Creer `ReviewQueueScreen.tsx`.
- [x] Ajouter etat vide "aucune revision".
- [x] Ajouter filtre par domaine.
- [x] Ajouter acces depuis menu lateral.
- [x] Ajouter carte dashboard "A revoir".
- [x] Lancer validations obligatoires.

### Tests

- Item faux -> revient plus vite.
- Item correct 3 fois -> intervalle augmente.
- File vide -> etat vide propre.
- App redemarree -> file identique.

## Chantier 2 - Corrections intelligentes detaillees

### Inspiration concurrente

Bunpro explique la grammaire avec exemples et nuances. Les bonnes corrections montrent le sens, pas seulement la bonne option.

### Version cible offline

Un composant `SmartCorrectionPanel` reutilisable dans tous les quiz.

### MVP

- Phrase japonaise.
- Traduction francaise.
- Explication courte.
- Mots/kanji cliquables.

### V1

- Mauvaises reponses expliquees.
- Bouton creer flashcard.
- Analyse mot par mot.

### V2

- Correction adaptee au profil.
- Historique d'erreurs par piege.

### Implementation

- [x] Creer type `CorrectionInsight`.
- [x] Creer type `CorrectionToken`.
- [x] Creer `SmartCorrectionPanel`.
- [x] Brancher `JapaneseLookupText`.
- [x] Ajouter affichage phrase japonaise.
- [x] Ajouter traduction francaise.
- [x] Ajouter explication courte.
- [x] Ajouter detail mot par mot.
- [ ] Ajouter explication des mauvaises reponses si disponible.
- [x] Ajouter fallback quand les tokens manquent.
- [x] Adapter `QuizScreen`.
- [x] Adapter `GlobalQuizScreen`.
- [x] Adapter `GrammarQuizScreen`.
- [x] Adapter `ExamScreen`.
- [x] Ajouter bouton "creer flashcard" si chantier 15 disponible.
- [x] Lancer validations obligatoires.

### Tests

- Phrase avec kanji -> clic ouvre lecture.
- Reponse fausse -> explication presente.
- Pas de tokens -> fallback propre.

## Chantier 3 - Lecons de grammaire ultra structurees

### Inspiration concurrente

Bunpro et LingoDeer placent l'explication avant l'exercice. L'utilisateur comprend la regle avant d'etre teste.

### Version cible offline

Chaque point de grammaire N5 a une fiche detaillee.

### MVP

- Structure.
- Sens.
- 3 exemples.
- Mini-test.

### V1

- Pieges.
- Comparaisons.
- Mots cliquables.
- SRS grammaire.

### V2

- Parcours de grammaire complet.
- Revision croisee avec phrases.

### Implementation

- [ ] Etendre le type `GrammarLesson`.
- [ ] Ajouter champs structure, usage, pieges, exemples enrichis.
- [ ] Creer `GrammarLessonDetailScreen`.
- [ ] Ajouter navigation depuis liste grammaire.
- [ ] Enrichir 20 lecons prioritaires.
- [ ] Ajouter mini-test par lecon.
- [ ] Sauvegarder ouverture/comprehension.
- [ ] Connecter progression grammaire.
- [ ] Connecter SRS grammaire.
- [ ] Ajouter comparaisons de regles proches.
- [ ] Verifier lisibilite mobile.
- [ ] Lancer validations obligatoires.

### Tests

- Une lecon s'ouvre.
- Mini-test enregistre progression.
- Retour global fonctionne.

## Chantier 4 - Kanji composants et mnemoniques

### Inspiration concurrente

WaniKani enseigne composants -> kanji -> vocabulaire avec mnemoniques.

### Version cible offline

Fiche kanji detaillee avec composants, histoires et mots lies.

### MVP

- 80 kanji N5.
- Composants simples.
- Mnemonique FR.
- Mots lies.

### V1

- Quiz composants.
- Confusions.
- SRS kanji.

### V2

- Traces et ordre visuel.
- Progression par familles.

### Implementation

- [x] Creer `data/kanjiComponents.ts`.
- [x] Ajouter composants pour les 80 kanji N5 prioritaires.
- [x] Ajouter mnemoniques FR.
- [x] Ajouter confusions proches.
- [x] Creer `services/kanjiComponents.ts`.
- [x] Creer `KanjiDetailScreen`.
- [x] Ajouter acces depuis cartes vocab/kanji.
- [x] Lier kanji -> mots vocabulaire.
- [x] Ajouter quiz composants.
- [x] Ajouter quiz lecture kanji.
- [x] Connecter SRS kanji.
- [ ] Lancer validations obligatoires.

### Tests

- Chaque kanji N5 a detail.
- Kanji sans composants -> fallback.
- Quiz composants genere choix valides.

## Chantier 5 - Audio local

### Inspiration concurrente

LingoDeer, renshuu et Drops utilisent l'audio pour memoriser prononciation et comprehension.

### Version cible offline

Audio embarque ou TTS local uniquement.

### MVP

- `OfflineAudioButton`.
- Support TTS local si disponible.
- Pas d'erreur si audio indisponible.

### V1

- Pack audio local pour kana, nombres, salutations.
- Quiz audio.

### V2

- Pack audio complet embarque.

### Implementation

- [ ] Creer `services/audio.ts`.
- [ ] Definir strategie : TTS local ou fichiers embarques.
- [ ] Ajouter detection disponibilite audio.
- [ ] Creer `OfflineAudioButton`.
- [ ] Ajouter bouton vocabulaire.
- [ ] Ajouter bouton grammaire.
- [ ] Ajouter bouton stories/immersion si disponible.
- [ ] Ajouter fallback muet.
- [ ] Respecter preference `audio_enabled`.
- [ ] Verifier que l'app ne casse pas sans audio.
- [ ] Lancer validations obligatoires.

### Tests

- Sans audio -> app ne casse pas.
- Audio desactive -> aucun bouton intrusif.

## Chantier 6 - Immersion texte cliquable

### Inspiration concurrente

Migaku rend textes et sous-titres cliquables pour apprendre en contexte.

### Version cible offline

Lecteur de textes N5 prepares, entierement locaux.

### MVP

- 10 textes courts.
- Tokens prepares.
- Clic mot.
- Traduction masquable.

### V1

- Questions comprehension.
- Ajout aux revisions.
- Progression par texte.

### V2

- Import manuel local de texte simple avec detection limitee.

### Implementation

- [x] Creer type `ImmersionText`.
- [x] Creer `data/immersionTexts.ts`.
- [ ] Ajouter 10 textes N5 tokenises.
- [x] Creer `ImmersionReaderScreen`.
- [x] Utiliser `JapaneseLookupText`.
- [x] Ajouter traduction masquable.
- [x] Ajouter questions comprehension.
- [x] Ajouter progression locale.
- [x] Ajouter bouton ajout SRS.
- [x] Ajouter acces menu Apprendre.
- [ ] Verifier tous les tokens MVP.
- [x] Lancer validations obligatoires.

### Tests

- Tous les tokens MVP cliquables.
- Traduction masque/affiche.
- Ajout SRS fonctionne.

## Chantier 7 - Diagnostic initial adaptatif

### Inspiration concurrente

Busuu utilise placement tests et checkpoints.

### Version cible offline

Test unique avec 3 niveaux de difficulte et rapport local.

### MVP

- 45 questions.
- Score par domaine.
- Rapport court.
- Module recommande.

### V1

- 60 questions.
- Analyse temps.
- Axes 7 jours.
- Recommandation parcours.

### V2

- Re-test mensuel.
- Comparaison progression.

### Implementation

- [x] Creer banque diagnostic taguee.
- [x] Couvrir kana, vocabulaire, kanji, grammaire, comprehension.
- [x] Ajouter 3 niveaux de difficulte.
- [x] Creer `services/aptitudeTest.ts`.
- [x] Creer moteur de scoring.
- [x] Creer rapport local.
- [x] Creer `AptitudeTestScreen`.
- [x] Creer `AptitudeReportScreen`.
- [x] Stocker resultat dans SQLite.
- [x] Connecter recommandations au parcours.
- [x] Ajouter bouton refaire test.
- [ ] Verifier rapport mobile.
- [x] Lancer validations obligatoires.

### Tests

- Profil faible kana -> recommandation kana.
- Profil bon global -> modules avances.
- Rapport lisible mobile.

## Chantier 8 - Parcours personnalisable

### Inspiration concurrente

renshuu propose des schedules adaptes. Les apps modernes personnalisent le rythme.

### Version cible offline

Parcours locaux selon objectif utilisateur.

### MVP

- 4 modes.
- Objectifs quotidiens adaptes.
- Affichage du mode actif.

### V1

- Recalcul si pause.
- Modules recommandes differents.

### V2

- Assistant local de choix de parcours.

### Implementation

- [x] Ajouter preference `learning_plan_mode`.
- [x] Creer modes de parcours.
- [x] Modifier generation objectifs quotidiens.
- [x] Modifier recommandations learning path.
- [x] Ajouter explication "pourquoi ce module".
- [x] Ajouter ecran choix de parcours.
- [x] Garantir que la progression existante reste conservee.
- [x] Tester changement de mode.
- [x] Lancer validations obligatoires.

### Tests

- Changer mode modifie objectifs futurs.
- Progression conservee.

## Chantier 9 - Exercices varies

### Inspiration concurrente

Duolingo, renshuu et LingoDeer multiplient les formats pour eviter la memorisation superficielle.

### Version cible offline

Une factory locale genere plusieurs formats pour chaque contenu.

### MVP

- 4 formats : QCM, inverse, association, phrase a trou.

### V1

- Ordre des mots.
- Saisie libre simple.
- Audio si dispo.

### V2

- Adaptation automatique format selon maitrise.

### Implementation

- [ ] Creer type `ExerciseFormat`.
- [ ] Creer `services/exerciseFactory.ts`.
- [ ] Implementer QCM standard.
- [ ] Implementer sens inverse.
- [ ] Implementer association.
- [ ] Implementer phrase a trou.
- [ ] Implementer ordre des mots si possible MVP+.
- [ ] Brancher global quiz.
- [ ] Brancher grammaire quiz.
- [ ] Brancher SRS.
- [ ] Respecter preferences.
- [ ] Lancer validations obligatoires.

### Tests

- Un item genere plusieurs questions.
- Preferences influencent format.

## Chantier 10 - Journal phrases et correction locale

### Inspiration concurrente

Busuu utilise correction humaine. Hors ligne, on garde l'idee de production ecrite, avec correction locale limitee.

### Version cible offline

Journal d'ecriture avec prompts N5 et controles locaux.

### MVP

- Prompt quotidien.
- Saisie.
- Sauvegarde.
- Detection mots inconnus.

### V1

- Detection patterns.
- Suggestions simples.

### V2

- Analyse grammaticale locale plus avancee.

### Implementation

- [ ] Creer table journal locale.
- [ ] Creer type `WritingPrompt`.
- [ ] Ajouter 100 prompts N5.
- [ ] Creer `WritingJournalScreen`.
- [ ] Sauvegarder phrase utilisateur.
- [ ] Ajouter detection mots inconnus.
- [ ] Ajouter detection particules simples.
- [ ] Ajouter suggestions locales.
- [ ] Ajouter historique.
- [ ] Ajouter acces menu Apprendre ou Parcours.
- [ ] Lancer validations obligatoires.

### Tests

- Saisie sauvegardee.
- Hors N5 detecte si connu.
- Aucun faux blocage.

## Chantier 11 - Mode 5 minutes

### Inspiration concurrente

Duolingo et Drops reduisent le cout d'entree avec une session courte immediate.

### Version cible offline

Un bouton lance la meilleure session selon donnees locales.

### MVP

- Bouton dashboard.
- 8 a 12 questions.
- Mix SRS/faiblesses.
- Recompense fin.

### V1

- Chrono doux.
- Resume des acquis.

### V2

- Mode matin/soir adapte.

### Implementation

- [x] Creer `services/quickSession.ts`.
- [x] Implementer selection SRS/faiblesse/nouveaute.
- [x] Creer `QuickSessionScreen`.
- [ ] Ajouter bouton dashboard.
- [x] Ajouter acces menu Quiz.
- [x] Limiter a 8-12 questions.
- [x] Ajouter ecran resultat.
- [x] Connecter XP.
- [x] Connecter animation recompense.
- [ ] Tester avec SRS vide.
- [ ] Tester avec SRS plein.
- [x] Lancer validations obligatoires.

### Tests

- File SRS vide -> fallback faiblesse.
- Session terminee -> reward.

## Chantier 12 - Stories dialogues

### Inspiration concurrente

Duolingo et LingoDeer placent vocabulaire et grammaire dans de petites scenes.

### Version cible offline

Mini dialogues N5 locaux avec comprehension.

### MVP

- 10 dialogues.
- Texte cliquable.
- 3 questions par dialogue.

### V1

- Scenes illustrees.
- Progression.

### V2

- Audio local.

### Implementation

- [ ] Creer type `StoryLesson`.
- [ ] Creer `data/storyLessons.ts`.
- [ ] Ajouter 10 dialogues MVP.
- [ ] Creer `StoryLessonScreen`.
- [ ] Connecter lookup mot/kanji.
- [ ] Ajouter questions comprehension.
- [ ] Ajouter progression locale.
- [ ] Ajouter acces menu Apprendre.
- [ ] Connecter SRS.
- [ ] Lancer validations obligatoires.

### Tests

- Dialogue complet lisible mobile.
- Questions corrigent.

## Chantier 13 - Ligues locales

### Inspiration concurrente

Duolingo utilise ligues et competition. Version offline : ligues personnelles.

### Version cible offline

Saison hebdomadaire locale sans reseau.

### MVP

- Ligue calculee depuis niveau.
- Progression hebdo.
- Animation promotion.

### V1

- Maintien/promotion.
- Objectif hebdo.

### V2

- Historique saisons.

### Implementation

- [x] Creer table saison locale.
- [x] Creer `services/localLeague.ts`.
- [x] Calculer ligue depuis XP/assiduite.
- [ ] Ajouter objectif hebdomadaire.
- [x] Ajouter carte dashboard.
- [x] Ajouter animation promotion.
- [ ] Ajouter historique simple.
- [x] Garantir aucun reseau.
- [x] Lancer validations obligatoires.

### Tests

- Pas de backend.
- Promotion stable.

## Chantier 14 - Parametres pedagogiques avances

### Inspiration concurrente

renshuu propose une forte personnalisation. C'est essentiel pour ne pas imposer le romaji ou le QCM a tous.

### Version cible offline

Preferences locales persistantes.

### MVP

- Romaji on/off.
- Traduction immediate on/off.
- Mode difficile.
- Longueur session.
- Reponses japonais.

### V1

- Taille police japonaise.
- Moins de QCM.
- Saisie libre.

### V2

- Profils sauvegardes.

### Implementation

- [x] Creer table preferences.
- [x] Creer `services/preferences.ts`.
- [x] Definir preferences par defaut.
- [x] Creer `LearningPreferencesScreen`.
- [x] Ajouter acces menu Reglages.
- [x] Brancher romaji dans vocabulaire.
- [x] Brancher romaji dans quiz/corrections.
- [x] Brancher mode difficile dans factories.
- [x] Brancher longueur session.
- [x] Verifier persistance.
- [x] Lancer validations obligatoires.

### Tests

- Preference persiste.
- Romaji masque partout.

## Chantier 15 - Flashcards automatiques depuis erreurs

### Inspiration concurrente

Migaku transforme contenu et erreurs en cartes. Bunpro fait revenir les points rates.

### Version cible offline

Cartes locales creees depuis les erreurs.

### MVP

- Bouton dans correction.
- Sauvegarde carte.
- Vue "Mes erreurs".
- Integration SRS.

### V1

- Regroupement doublons.
- Edition carte.

### V2

- Suggestions automatiques.

### Implementation

- [x] Creer table `app_error_flashcard`.
- [x] Creer type `ErrorFlashcard`.
- [x] Creer `services/errorFlashcards.ts`.
- [x] Ajouter bouton dans corrections.
- [x] Eviter doublons.
- [x] Creer ecran "Mes erreurs".
- [x] Ajouter suppression/archive.
- [x] Connecter SRS.
- [x] Ajouter filtre par domaine.
- [x] Lancer validations obligatoires.

### Tests

- Une erreur cree une carte.
- Doublon evite.
- Carte revue dans SRS.

---

# 13. Prompt de handoff recommande pour Devin

Utiliser ce prompt avec ce fichier joint :

```text
Tu es charge d'implementer les evolutions du projet Expo React Native JLPT N5 Coach.

Lis integralement le fichier docs/CAHIER_DES_CHARGES_TECHNIQUE_OFFLINE_V2_DEVIN.md.

Contraintes absolues :
- aucune API externe,
- aucun backend,
- aucun reseau social,
- fonctionnement offline,
- SQLite local,
- compatibilite Expo Go,
- UI lisible sur iPhone,
- pas de regression.

Commence par auditer le code existant, puis implemente dans l'ordre de la roadmap :
1. Parametres pedagogiques MVP
2. Mode 5 minutes MVP
3. File SRS centrale MVP
4. Flashcards depuis erreurs MVP

Pour chaque chantier :
- cree ou modifie les services necessaires,
- cree les composants/ecrans,
- connecte navigation,
- ajoute persistance SQLite,
- ajoute etats vides,
- ajoute criteres d'acceptation,
- verifie typecheck/smoke/export web,
- fais un rapport clair des fichiers modifies.

Ne supprime pas les fonctionnalites existantes.
Ne fais pas de refactor massif non necessaire.
Respecte les patterns deja presents dans le code.
```

## 14. Checklist de validation finale

Avant de declarer une phase terminee :

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

Validation manuelle iPhone :

- ouvrir dashboard,
- ouvrir menu lateral,
- lancer parcours,
- lancer apprendre,
- lancer quiz,
- verifier bouton retour global,
- verifier bloc assiduite,
- verifier animation recompense,
- verifier aucune superposition texte,
- verifier lisibilite cartes vocab/kanji,
- verifier mode hors ligne apres chargement.

## 15. Notes importantes pour l'agent implementateur

- Ne pas tout implementer en une seule passe si cela cree trop de risque.
- Livrer par chantiers complets.
- Toujours brancher les donnees locales au lieu de creer une UI factice.
- Toute nouvelle fonctionnalite doit etre utile a la progression.
- Les recompenses doivent soutenir l'apprentissage, pas devenir un simple jeu.
- Les donnees existantes de l'utilisateur ne doivent jamais etre detruites.
- Si une migration est necessaire, elle doit etre additive.
- Toute feature dependante d'internet chez un concurrent doit etre convertie en alternative locale.

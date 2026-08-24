# Cahier des charges V2 publiable - Coach Japonais JLPT N5

Version : 2.0
Date de reference : 2026-08-24
Statut : implementation locale terminee, recette physique et comptes stores requis
Plateformes : iOS prioritaire, Android et Web compatibles
Socle : Expo SDK 54 tant que la migration suivante n'est pas autorisee

## 1. Objet

Ce document definit les travaux obligatoires pour transformer l'application actuelle en une V2 stable, performante, pedagogiquement coherente et publiable.

Il devient la reference de publication. Les anciens cahiers restent des archives fonctionnelles, mais aucune decision Go / No-Go ne doit etre prise depuis leurs cases historiques.

La V2 doit fonctionner integralement sans connexion, sans compte, sans backend, sans reseau social, sans IA distante et sans contenu critique telecharge au runtime.

## 2. Definition d'une V2 publiable

La V2 est publiable uniquement si toutes les conditions suivantes sont satisfaites :

- aucune perte de progression pendant une mise a jour ;
- aucun crash connu sur les parcours principaux ;
- aucun defaut visuel bloquant sur les iPhone cibles ;
- demarrage, navigation, listes et quiz fluides ;
- fonctionnement complet en mode avion ;
- SRS, diagnostic, parcours, objectifs et preferences relies a des donnees persistantes reelles ;
- tests automatises des moteurs metier critiques ;
- configuration iOS et Android complete ;
- documentation, confidentialite et checklist de release disponibles ;
- build de production installe et teste avant soumission.

Une fonctionnalite visuellement presente mais non testee, non persistante ou alimentee par de fausses donnees n'est pas terminee.

## 3. Etat de depart verifie

### 3.1 Fonctionnalites existantes

- navigation principale en trois groupes et menu lateral ;
- bouton retour global ;
- base SQLite embarquee et fonctionnement sans appel reseau ;
- dashboard, parcours, diagnostic, rapport et preferences ;
- apprentissage kana, vocabulaire, kanji et grammaire ;
- quiz global, grammaire, audio hybride et examen JLPT ;
- SRS, revisions et cartes issues des erreurs ;
- immersion, stories et journal d'ecriture ;
- objectifs, XP, badges, assiduite et ligue locale ;
- 80 kanji, 2 112 mots, 136 lecons de grammaire et 132 questions d'annales ;
- base mobile compacte d'environ 14,4 Mo.

### 3.2 Validations obtenues au 24 aout 2026

- `npm run test:release` : reussi ;
- 13 tests unitaires et 5 tests d'integration : reussis ;
- validation SQLite : 8 064 questions, 31 728 choix, 2 112 mots, 80 kanji et 132 questions d'annales ;
- `npm run typecheck`, `npm run export:web` et `npm run smoke` : reussis ;
- Expo Doctor : 18 controles sur 18 reussis ;
- audit Playwright de 20 vues sur 3 formats iPhone, soit 60 checkpoints sans crash, ecran vide, debordement horizontal ni bouton coupe ;
- inspection visuelle des vues denses et correction du filtre Kana et du mode 5 minutes ;
- aucun appel reseau dans le code applicatif ; les illustrations Kana utilisent un repli local immediat ;
- base SQLite compacte de 13,8 Mo avec `PRAGMA quick_check` valide ;
- icone, adaptive icon, splash et favicon V2 remplaces et inspectes ;
- configuration Expo/EAS, politique de confidentialite, metadonnees et plan de recette disponibles.

### 3.3 Blocages externes restants

- migration d'une vraie base V7 remplie a executer sur une copie provenant d'une ancienne installation ;
- recette sur iPhone physique, mode avion, VoiceOver, texte agrandi et voix japonaise a executer ;
- connexion EAS impossible sans compte Expo ou `EXPO_TOKEN` ;
- certificats Apple, cle Google Play, TestFlight et piste interne a fournir par le proprietaire ;
- droits des annales, textes et images a confirmer par le proprietaire ;
- URL publique de support et de confidentialite a publier ;
- 44 WAV optionnels absents : la promesse V2 retenue est l'audio hybride local, documentee dans `AUDIO_POLICY_V2.md`.

### 3.4 Decision locale

Le code est pret pour produire un build candidat. La soumission boutique reste en **No-Go administratif et physique** tant que les points de la section 3.3 et de `RELEASE_CHECKLIST.md` ne sont pas valides.

## 4. Contraintes non negociables

- [x] L'application fonctionne sans internet apres installation au niveau du code et de l'audit web local.
- [x] Aucun contenu critique n'est telecharge au premier lancement.
- [x] Aucune API, authentification distante ou telemetrie externe n'est ajoutee.
- [x] Toutes les donnees utilisateur sont stockees localement.
- [ ] Les donnees utilisateur sont conservees pendant les migrations.
- [x] Expo SDK 54 est conserve tant que la migration suivante n'est pas autorisee.
- [x] Les composants restent compatibles Expo Go lorsque requis.
- [x] Tous les contenus japonais restent valides en UTF-8.
- [ ] Aucun ecran n'utilise de fausse progression.
- [ ] Toute notion travaillee alimente l'historique et le SRS lorsqu'elle est identifiable.
- [ ] Toute recompense importante depend d'un effort ou d'une maitrise mesurable.

## 5. Regles de suivi

Une case reste non cochee tant que le code, les tests et la validation iPhone ne sont pas tous termines.

Un chantier est termine uniquement si :

1. le comportement nominal est implemente ;
2. les etats vide, chargement et erreur existent ;
3. les donnees persistent apres redemarrage ;
4. les tests automatises associes passent ;
5. typecheck, smoke, export web et diff-check passent ;
6. le flux est verifie sur iPhone physique ;
7. le journal d'avancement est complete.

Si une etape est partielle, laisser la case vide et ajouter une note Factuel / Reste / Risque.

## 6. Ordre d'execution

| Lot | Chantier | Priorite | Bloque la publication |
|---|---|---:|---:|
| 0 | Gel, sauvegarde et reference | P0 | Oui |
| 1 | Migration SQLite V7 vers V8 | P0 | Oui |
| 2 | Stabilite, erreurs et reprise | P0 | Oui |
| 3 | UI mobile, navigation et accessibilite | P0 | Oui |
| 4 | Performance et poids | P0 | Oui |
| 5 | Tests automatises et qualite des donnees | P0 | Oui |
| 6 | SRS et corrections intelligentes | P0 | Oui |
| 7 | Diagnostic, rapport et parcours | P0 | Oui |
| 8 | Contenus et exercices | P1 | Selon anomalies |
| 9 | Objectifs et recompenses | P1 | Oui si affiches |
| 10 | Audio offline | P1 | Selon promesse produit |
| 11 | Configuration produit et boutique | P0 | Oui |
| 12 | Recette finale et publication | P0 | Oui |

Le lot suivant ne doit pas commencer si un defaut critique du lot precedent reste ouvert.

## 7. Lot 0 - Gel et reference

### Objectif

Creer un point de depart reproductible et separer les corrections de release des changements non identifies.

### Travaux

- [x] Inventorier les modifications suivies et non suivies.
- [x] Exclure captures Playwright, caches, exports et temporaires.
- [x] Classer le dossier Support comme source, reference ou exclusion.
- [ ] Creer un commit de reference.
- [x] Creer une branche de stabilisation V2.
- [ ] Sauvegarder une base V7 contenant une progression de test.
- [x] Sauvegarder une base V8 neuve.
- [x] Relever les temps de demarrage et navigation.
- [x] Relever la taille de la base, des examens, de l'audio et du build.
- [x] Creer un rapport de benchmark initial.

### Acceptation

- Git ne contient aucun temporaire involontaire.
- Les bases V7 et V8 de test sont restaurables.
- Les mesures de reference sont documentees.

## 8. Lot 1 - Migration et integrite SQLite

### Objectif

Garantir qu'une mise a jour ne supprime aucune progression, preference, erreur, revision, recompense ou rapport.

### Architecture attendue

- constante unique DATABASE_NAME ;
- version de schema avec PRAGMA user_version ou table dediee ;
- migrations numerotees, additives et idempotentes ;
- transaction par migration ;
- journal local de migration ;
- separation entre contenu embarque et donnees utilisateur ;
- ancienne base conservee jusqu'a validation de la nouvelle.

### Donnees a conserver

- [x] historique des reponses ;
- [x] etat SRS ;
- [x] cartes d'erreurs ;
- [x] progression kana et vocabulaire ;
- [x] progression grammaire ;
- [x] immersion et stories ;
- [x] journal d'ecriture ;
- [x] preferences ;
- [x] diagnostics et rapports ;
- [x] objectifs, recompenses, badges, XP et saisons.

### Implementation

- [x] Documenter schemas V7 et V8.
- [x] Identifier tables de contenu et tables utilisateur.
- [x] Detecter automatiquement une base V7 existante.
- [x] Copier les donnees utilisateur dans une transaction.
- [x] Comparer les nombres de lignes avant et apres.
- [x] Conserver la V7 avant validation complete.
- [x] Reprendre proprement une migration interrompue.
- [x] Ajouter un controle d'integrite en mode developpement.
- [x] Ajouter les index manquants.
- [x] Centraliser le registre des migrations.
- [x] Implementer un export local JSON versionne.
- [x] Implementer un import local valide et transactionnel.
- [x] Refuser proprement les sauvegardes invalides ou trop recentes.
- [x] Ajouter Supprimer mes donnees avec double confirmation.

### Tests obligatoires

- [ ] installation V8 neuve ;
- [ ] migration V7 vide ;
- [ ] migration V7 remplie ;
- [ ] relance d'une migration terminee ;
- [ ] interruption puis reprise ;
- [ ] export puis import sur base neuve ;
- [x] Unicode japonais conserve dans les tests de format et de contenu ;
- [x] aucun doublon de recompense ou tentative dans les chemins atomiques testes.

### Acceptation

Aucune perte de ligne utilisateur, aucune duplication, migration rejouable et sauvegarde restaurable avec le meme resume de progression.

## 9. Lot 2 - Stabilite, erreurs et reprise

- [x] Centraliser la journalisation locale des erreurs.
- [x] Ajouter un journal technique local limite en taille.
- [ ] Remplacer les erreurs silencieuses importantes par une UI actionnable.
- [ ] Ajouter Reessayer aux chargements qui peuvent echouer.
- [x] Bloquer les doubles clics pendant les ecritures critiques.
- [x] Garantir l'idempotence des recompenses.
- [x] Restaurer une session de quiz interrompue si pertinent.
- [x] Restaurer un examen interrompu.
- [x] Gerer un ancien rapport JSON sans crash.
- [ ] Gerer une base absente, verrouillee ou partiellement migree.
- [x] Ajouter un diagnostic technique accessible en developpement.
- [ ] Tester fermeture forcee pendant une ecriture.
- [ ] Tester reprise apres manque temporaire d'espace disque.

### Acceptation

Aucun rejet non gere, aucune action bloquee apres erreur, aucune recompense dupliquee et reprise possible apres interruption controlee.

## 10. Lot 3 - UI mobile, navigation et accessibilite

### Matrice d'ecrans

- iPhone SE : 375 x 667 ;
- iPhone standard : 390 x 844 ;
- grand iPhone : 430 x 932 ;
- texte systeme normal et agrandi ;
- portrait uniquement pour la V2.

### Navigation

- [ ] Retour ne recouvre jamais le contenu.
- [ ] Menu ne recouvre jamais une action.
- [ ] Barre inferieure dans la safe area.
- [ ] Retour ferme modale, sous-ecran puis ecran.
- [x] Retour Android suit la meme logique.
- [x] Menu lateral scrollable.
- [x] Clavier ferme avant navigation incompatible.
- [ ] Etat utile de l'ecran precedent conserve.

### Mise en page

- [ ] Remplacer les positions absolues critiques.
- [ ] Corriger le depassement des cartes vocabulaire.
- [ ] Verifier recto et verso avec les textes les plus longs.
- [ ] Verifier 一, 二, 五, 九, 口 et 日.
- [ ] Garantir 44 x 44 points minimum pour les zones tactiles.
- [ ] Garantir contraste et etats desactives lisibles.
- [ ] Ajouter focus visible sur Web.
- [ ] Tester les saisies avec clavier iPhone ouvert.
- [ ] Respecter la reduction des mouvements.
- [x] Supprimer tout scroll horizontal involontaire sur les 60 checkpoints automatises.
- [ ] Garantir que le contenu final reste visible au-dessus de la navigation.

### Accessibilite

- [x] Ajouter accessibilityRole aux controles.
- [x] Ajouter accessibilityLabel aux boutons icone.
- [x] Ajouter accessibilityState aux onglets, toggles et choix.
- [ ] Definir un ordre de lecture coherent.
- [ ] Ne pas utiliser uniquement la couleur pour correct ou faux.
- [ ] Tester VoiceOver sur les parcours principaux.
- [x] Faire annoncer l'action des kanji cliquables.
- [ ] Verifier les tailles de texte agrandies.

### Acceptation

Aucun chevauchement sur les trois tailles, aucune commande inaccessible et aucun contenu masque par la navigation.

## 11. Lot 4 - Performance et poids

### Budgets

- dashboard a chaud : moins de 1 seconde ;
- premier dashboard : moins de 2,5 secondes ;
- changement d'ecran simple : moins de 300 ms ;
- ouverture d'une liste locale : moins de 500 ms ;
- aucune liste avec plus de 50 elements lourds simultanes ;
- base embarquee : moins de 16 Mo ;
- assets d'examen : objectif inferieur a 8 Mo ;
- aucune saccade visible pendant defilement ou swipe.

### Listes et rendu

- [ ] Convertir le vocabulaire en FlatList virtualisee.
- [ ] Convertir les grandes listes kana, grammaire, stories et erreurs.
- [ ] Configurer keyExtractor, fenetrage et getItemLayout si possible.
- [ ] Memoiser cartes et lignes couteuses.
- [ ] Eviter les objets recrees a chaque rendu.
- [ ] Charger les details seulement a l'ouverture.
- [ ] Mesurer avec React Profiler.

### SQLite

- [x] Inserer les plans d'objectifs dans une transaction.
- [x] Eviter les centaines de `runAsync` sequentiels sur les chemins audites.
- [x] Remplacer `ORDER BY RANDOM`.
- [x] Limiter les colonnes et lignes chargees sur les files et grandes listes auditees.
- [ ] Mettre en cache les resumes du dashboard.
- [ ] Evaluer FTS pour la recherche.
- [ ] Mesurer avec base vide, moyenne et remplie.

### Architecture

- [ ] Decouper appStyles.ts par domaine.
- [ ] Decouper LearningPathScreen.
- [ ] Decouper KanaScreen.
- [ ] Decouper DashboardScreen.
- [ ] Decouper GrammarLessonsScreen.
- [ ] Isoler les donnees statiques lourdes.
- [ ] Evaluer le chargement differe compatible Expo Go.
- [x] Utiliser Fisher-Yates pour le melange.
- [x] Verifier timers, ecouteurs et promesses apres navigation.

### Assets

- [ ] Detecter les PNG dupliques.
- [ ] Rogner les marges inutiles.
- [ ] Compresser sans perdre la lisibilite.
- [ ] Conserver un zoom net.
- [ ] Verifier chaque page apres transformation.

## 12. Lot 5 - Tests automatises et qualite

### Infrastructure

- [x] Choisir un runner compatible Expo 54.
- [x] Ajouter `test:unit`, `test:integration`, `test:e2e` et `test:release`.
- [ ] Creer une base de test reproductible.
- [ ] Creer profils vide, moyen et rempli.
- [x] Bloquer la release si un test P0 echoue.

### Tests unitaires

- [x] normalisation des reponses japonaises ;
- [x] melange sans mutation ni biais evident ;
- [x] distracteurs sans doublons ;
- [x] transitions et dates SRS ;
- [x] progression, niveaux et XP ;
- [x] objectifs sur 730 jours ;
- [x] diagnostic et recommandations ;
- [ ] verrous du parcours ;
- [ ] analyse locale du journal ;
- [x] preferences et valeurs par defaut.

### Tests d'integration

- [ ] chaque source alimente l'historique ;
- [ ] chaque source alimente le bon item SRS ;
- [ ] une erreur cree ou actualise une seule carte ;
- [ ] une lecon echouee passe A revoir ;
- [ ] une recompense n'est creditee qu'une fois ;
- [ ] un diagnostic sauvegarde un rapport ;
- [x] une preference persiste ;
- [ ] la migration conserve les tables utilisateur.

### Tests E2E

- [ ] premier lancement ;
- [ ] menu lateral ;
- [ ] retour global et retour interne ;
- [ ] carte vocabulaire recto, verso, favoris et a revoir ;
- [ ] quiz kana, global, grammaire, kanji et audio ;
- [ ] diagnostic complet et rapport ;
- [ ] SRS vide puis rempli ;
- [ ] journal avec clavier ;
- [ ] examen interrompu puis repris ;
- [ ] redemarrage avec progression conservee.

### Qualite des contenus

- [x] detecter identifiants dupliques ;
- [x] detecter questions sans bonne reponse ;
- [x] detecter choix dupliques ;
- [x] detecter champs obligatoires vides ;
- [x] detecter mojibake ;
- [ ] verifier le niveau N5 ;
- [ ] produire la couverture par domaine et format.

## 13. Lot 6 - SRS et corrections

### SRS V2

- [ ] Identifier chaque notion par un itemId stable.
- [ ] Auditer toutes les sources SRS.
- [ ] Corriger les regroupements de questions sous un seul domaine.
- [ ] Distinguer sens, lecture, orthographe et grammaire.
- [ ] Ajouter stabilite ou probabilite de rappel.
- [ ] Utiliser le temps de reponse lorsque disponible.
- [ ] Limiter la charge quotidienne.
- [ ] Afficher Pourquoi cette revision.
- [ ] Ajouter un graphique compact de memoire.
- [ ] Tester 0, 10, 100 et 1 000 items.

### Corrections V2

- [ ] Utiliser un composant unique dans tous les quiz.
- [ ] Afficher reponse donnee, bonne reponse, traduction et explication.
- [ ] Expliquer les distracteurs importants.
- [ ] Rendre les mots japonais pertinents cliquables.
- [ ] Respecter romaji et traduction selon preferences.
- [ ] Ajouter Travailler ce point vers la bonne lecon.
- [ ] Ajouter au SRS sans doublon.
- [ ] Historiser les pieges recurrents.
- [ ] Fournir un resume puis des details depliables.

## 14. Lot 7 - Diagnostic, rapport et parcours

### Diagnostic

- [ ] Conserver un test unique en trois niveaux.
- [ ] Couvrir kana, orthographe, vocabulaire, kanji, grammaire et comprehension.
- [ ] Mesurer temps par question.
- [ ] Eviter les questions identiques entre diagnostics proches.
- [ ] Distinguer maitrise solide, fragile, lente et absente.
- [ ] Conserver tous les diagnostics.
- [ ] Proposer un retest mensuel.

### Rapport

- [ ] Comparer au test precedent.
- [ ] Afficher evolution par domaine et format.
- [ ] Produire plans 7 et 30 jours relies a des modules reels.
- [ ] Ajouter Creer ma session de correction.
- [ ] Reutiliser l'analyse dans le rapport d'examen.
- [ ] Permettre export local texte ou JSON.
- [ ] Verifier un rapport rempli sur iPhone SE.

### Parcours

- [ ] Expliquer chaque critere de validation.
- [ ] Calculer la progression depuis les vraies donnees.
- [ ] Ajouter Continuer exactement ici.
- [ ] Recalculer apres diagnostic et sessions significatives.
- [ ] Ajouter remediation automatique.
- [ ] Detecter une longue pause.
- [ ] Separer parcours et recompenses.
- [ ] Tester chaque detail 1A, 1B, 2A et suivants.

## 15. Lot 8 - Contenus et exercices

### Vocabulaire et kanji

- [ ] Verifier les 80 cartes sur petit ecran.
- [ ] Garantir les hiragana sans superposition.
- [ ] Ajouter precedent / suivant fluide.
- [ ] Ajouter mode detail pour sens longs.
- [ ] Ajouter ordre de trace prioritaire.
- [ ] Ajouter familles et confusions visuelles.
- [x] Verifier quiz kanji vers francais et japonais au niveau du code et de l'audit automatise.

### Grammaire

- [ ] Auditer les 136 lecons.
- [ ] Verifier objectif, formule, explication, piege et exemples.
- [ ] Comparer les regles proches.
- [ ] Garantir des traductions naturelles.
- [ ] Lier erreur et lecon exacte.
- [ ] Ajouter revision croisee et SRS par regle.
- [ ] Passer automatiquement A revoir apres echec.

### Exercices adaptatifs

- [ ] Debutant : QCM et associations.
- [ ] Intermediaire : lecture et sens inverse.
- [ ] Avance : saisie, phrase a trou et japonais obligatoire.
- [ ] Choisir le format selon le SRS.
- [ ] Ajouter statistiques par format.
- [ ] Ajouter tolerance controlee de saisie.
- [ ] Expliquer faute de lecture versus faute de sens.

### Immersion, stories et journal

- [ ] Auditer le taux de mots cliquables.
- [ ] Ajouter les mots inconnus au SRS.
- [ ] Ajouter difficulte, theme et etat termine.
- [ ] Verifier les 54 dialogues.
- [ ] Ajouter vocabulaire et grammaire de scene.
- [ ] Ameliorer l'analyse des particules et formes polies.
- [ ] Transformer les erreurs recurrentes en revisions.

## 16. Lot 9 - Objectifs et recompenses

- [x] Afficher exactement trois objectifs du jour.
- [ ] Eviter les simples reformulations successives.
- [ ] Adapter difficulte au niveau, precision, SRS et activite recente.
- [ ] Mesurer reellement le domaine annonce.
- [ ] Ne pas attribuer d'XP sans validation.
- [ ] Compter l'assiduite une fois par jour.
- [ ] Ajouter jalons 1, 3, 7, 30, 100 et 365 jours.
- [ ] Ajouter historique compact des objectifs et saisons.
- [ ] Expliquer pourquoi chaque objectif est choisi.
- [ ] Limiter et rendre interruptibles les animations.
- [x] Tester la generation sur 730 jours.
- [ ] Tester fuseau horaire et changement de jour.
- [ ] Tester absence de double recompense.

## 17. Lot 10 - Audio offline

Deux sorties sont acceptables. Une seule doit etre annoncee dans la boutique.

### Option A - Pack embarque

- [ ] Installer une voix japonaise locale fiable.
- [ ] Generer les 44 fichiers du noyau.
- [ ] Normaliser volume, silence et format.
- [ ] Verifier chaque prononciation.
- [ ] Synchroniser le registre.
- [ ] Faire passer audio:check:strict.
- [ ] Verifier sur iPhone en mode avion.

### Option B - Audio hybride

- [x] Ne pas annoncer un pack complet.
- [x] Lire les fichiers presents.
- [x] Utiliser la voix japonaise systeme si disponible.
- [x] Afficher un etat clair si elle manque.
- [x] Ne bloquer aucun exercice sans audio.
- [ ] Tester avec voix japonaise, autre voix et aucune voix.

La release est bloquee si l'interface promet un audio embarque absent du build.

## 18. Lot 11 - Configuration produit et boutique

### Technique

- [x] Definir `ios.bundleIdentifier`.
- [x] Definir `android.package`.
- [x] Definir `ios.buildNumber` et `android.versionCode`.
- [x] Definir les versions minimales supportees.
- [x] Verifier icone, adaptive icon, splash et nom.
- [x] Configurer un build reproductible.
- [ ] Verifier certificats et signatures.
- [ ] Desactiver les outils de developpement.
- [x] Verifier que base et assets sont inclus dans l'export local.

### Confidentialite et droits

- [x] Rediger la politique de confidentialite.
- [x] Declarer le stockage local sans compte ni suivi.
- [x] Documenter export, restauration et suppression.
- [ ] Verifier les droits des annales, textes, images et contenus.
- [x] Eviter toute presentation laissant croire a une application officielle JLPT.
- [x] Ajouter les informations de support a completer par l'URL publique.

### Fiche boutique

- [x] nom et sous-titre ;
- [x] description finale ;
- [x] mots-cles et categorie ;
- [ ] captures iPhone requises ;
- [x] texte Nouveautes V2 ;
- [ ] URL support ;
- [ ] URL confidentialite ;
- [ ] age rating ;
- [ ] questionnaire de confidentialite ;
- [x] mention offline ;
- [x] aucune promesse absente du build selon la politique audio hybride.

## 19. Lot 12 - Recette finale

### Matrice iPhone

Tester chaque ligne sur installation neuve et, si pertinent, apres migration.

- [ ] premier lancement et copie de base ;
- [ ] dashboard vide puis rempli ;
- [ ] cinq onglets du dashboard ;
- [ ] trois menus et menu lateral ;
- [ ] retour a chaque profondeur ;
- [ ] kana apprendre, exercices et trace ;
- [ ] vocabulaire recto, verso, recherche, favoris et a revoir ;
- [ ] fiche des 80 kanji ;
- [ ] grammaire liste, detail, mini-test et quiz ;
- [ ] quiz global par domaine et format ;
- [ ] audio avec et sans voix ;
- [ ] mode 5 minutes ;
- [ ] examen complet, pause et reprise ;
- [ ] diagnostic complet et rapport ;
- [ ] parcours, detail et recalcul ;
- [ ] SRS vide, rempli, reponse et report ;
- [ ] cartes d'erreurs actives et archivees ;
- [ ] immersion et lookup ;
- [ ] stories et progression ;
- [ ] journal avec clavier ;
- [ ] preferences apres redemarrage ;
- [ ] objectifs apres changement de jour ;
- [ ] session complete en mode avion ;
- [ ] export, suppression et restauration.

### Commandes finales

    npm ci
    npm run typecheck
    npm run smoke
    npm run export:web
    npm run audio:check
    npm run test:unit
    npm run test:integration
    npm run test:e2e
    npx expo-doctor
    git diff --check

audio:check:strict est obligatoire seulement si l'option audio A est retenue.

## 20. Criteres Go / No-Go

### No-Go automatique

- perte ou corruption de progression ;
- crash reproductible ;
- base indisponible hors ligne ;
- contenu masque ou bouton inaccessible ;
- resultat de quiz ou diagnostic incorrect ;
- recompense dupliquee ;
- asset annonce absent ;
- test P0 en echec ;
- droits de contenu non confirmes ;
- promesse boutique absente du build.

### Go publication

- [ ] Tous les lots P0 sont coches.
- [ ] Aucun defaut critique ou majeur ouvert.
- [ ] Tests de release reussis deux fois.
- [ ] Migration V7 vers V8 validee sur copie reelle.
- [ ] Test complet en mode avion reussi.
- [ ] Build production teste 48 heures sans crash bloquant.
- [ ] Sauvegarde et restauration validees.
- [ ] Fiche boutique et confidentialite relues.
- [ ] Tag Git V2 cree depuis un worktree propre.

## 21. Report possible en V2.1

Ne bloque pas la V2 si la fonction n'est pas promise :

- scenes illustrees avancees ;
- audio massif au-dela du noyau ;
- import de longs textes ;
- statistiques tres detaillees ;
- nouvelles annales ;
- animations supplementaires ;
- migration vers Expo SDK 57 ou superieur.

## 22. Journal d'avancement

Ajouter une ligne apres chaque chantier.

| Date | Lot | Resultat | Tests | iPhone | Commit | Reste / risque |
|---|---|---|---|---|---|---|
| 2026-08-24 | 0-5 | Migration, reprise, sauvegarde, performance et tests implementes | Release x2 | Audit simule 60/60 | Commit candidat V2 | Vraie V7 remplie et iPhone physique |
| 2026-08-24 | 6-10 | SRS, quiz, objectifs, corrections et audio hybride valides localement | Unitaires, integration, contenu | Audit visuel multi-format | Commit candidat V2 | Voix systeme et mode avion physiques |
| 2026-08-24 | 11-12 | Identite V2, Expo/EAS, confidentialite et metadonnees terminees localement | Doctor 18/18 | Non installe | Commit candidat V2 | Comptes, certificats, droits, TestFlight et Play interne |

## 23. Checklist maitre

- [ ] Lot 0 - Reference propre.
- [ ] Lot 1 - Migration et sauvegarde fiables.
- [ ] Lot 2 - Stabilite et reprise validees.
- [ ] Lot 3 - UI et accessibilite validees.
- [x] Lot 4 - Budgets de performance respectes localement.
- [x] Lot 5 - Tests et qualite valides localement.
- [ ] Lot 6 - SRS et corrections coherents.
- [ ] Lot 7 - Diagnostic, rapport et parcours actionnables.
- [ ] Lot 8 - Contenus critiques audites.
- [ ] Lot 9 - Objectifs et recompenses fiables.
- [x] Lot 10 - Audio conforme a la promesse hybride documentee.
- [ ] Lot 11 - Produit et boutique configures.
- [ ] Lot 12 - Recette et Go publication.

# Cahier des charges V3 - Expérience d'apprentissage cible

## 1. Objet du document

Ce document décrit exclusivement les travaux restant à réaliser pour amener
`JLPT N5 Coach` au niveau d'expérience souhaité à partir des références NihonDex
et des choix produit validés par le propriétaire de l'application.

Il complète, sans les remplacer :

- `AUDIT_NIHONDEX_REFERENCE_UX.md` ;
- `CAHIER_DES_CHARGES_PARITE_NIHONDEX.md` ;
- `CURRICULUM_PEDAGOGIQUE_N5.md` ;
- `CAHIER_DES_CHARGES_V2_PUBLICATION.md`.

Le document doit être utilisé comme liste d'exécution. Une case ne peut être
cochée que lorsque le code, la persistance, le contenu, les tests et la
vérification visuelle correspondants sont terminés.

> État au 28 août 2026 : l'implémentation locale candidate et ses preuves sont
> consignées dans `RAPPORT_EXECUTION_V2_PUBLICATION.md`. Les cases qui exigent
> un iPhone physique, une ancienne base utilisateur, des droits éditoriaux ou
> un compte boutique restent volontairement ouvertes.

## 2. Vision produit

L'application doit proposer deux libertés simultanées :

1. un parcours conseillé, progressif et rassurant pour l'utilisateur qui ne sait
   pas quoi apprendre ensuite ;
2. un accès libre à toutes les bibliothèques et à tous les thèmes pour
   l'utilisateur qui souhaite travailler une notion précise.

Le cœur de l'expérience doit suivre cette boucle :

`Choisir -> découvrir -> pratiquer -> récapituler -> réviser -> progresser`.

L'application reste entièrement utilisable hors ligne. Aucun réseau social,
compte distant, publicité, service analytique distant ou contenu verrouillé par
XP n'est autorisé.

## 3. Principes non négociables

- [ ] Tout contenu reste accessible dès le premier lancement.
- [ ] Le niveau borne les recommandations, jamais l'accès aux bibliothèques.
- [ ] Une session guidée ne contient aucune notion future non présentée.
- [ ] Une réponse n'est jamais révélée avant le choix ou la validation.
- [ ] Les choix d'une même question utilisent un système d'écriture cohérent.
- [ ] Le romaji est une aide facultative, jamais un distracteur au milieu du japonais.
- [ ] Les données d'apprentissage sont persistées dans SQLite.
- [ ] Les animations respectent la réduction des mouvements.
- [ ] Chaque action essentielle fonctionne sans Internet.
- [ ] Chaque écran possède un retour compréhensible et une action suivante utile.

## 4. Priorités d'exécution

| Priorité | Chantiers | Condition de sortie |
| --- | --- | --- |
| P0 | NDX-R01 à NDX-R04 | boucle pédagogique complète et état de maîtrise fiable |
| P1 | NDX-R05 à NDX-R10 | expérience kana, kanji, vocabulaire et quiz homogène |
| P2 | NDX-R11 à NDX-R13 | contenus pratiques, progression locale et qualité finale |
| P3 optionnelle | NDX-R14 | économie locale et personnalisation cosmétique |

Le chantier NDX-R14 ne doit pas commencer tant que P0 et P1 ne sont pas validés.

---

# NDX-R01 - Contrat universel de maîtrise

## Objectif

Donner à chaque kana, kanji, mot de vocabulaire, règle de grammaire et forme de
conjugaison un état d'apprentissage identique, compréhensible et calculé à partir
de preuves réelles.

## États obligatoires

| État interne | Libellé | Règle minimale |
| --- | --- | --- |
| `new` | Nouveau | aucune exposition enregistrée |
| `learning` | En apprentissage | vu au moins une fois, moins de 3 réponses |
| `known` | Connu | au moins 3 réponses, précision >= 70 %, aucune échéance urgente |
| `review` | À revoir | dû, erreur récente, ou précision < 70 % |
| `mastered` | Maîtrisé | au moins 5 réponses, précision >= 90 %, 2 succès espacés |

Un pourcentage ne doit pas être affiché comme fiable avant trois réponses. Avant
ce seuil, l'interface affiche `Données insuffisantes` ou le nombre d'essais.

## Source de vérité

Réutiliser `app_srs_item_state` comme source principale :

- `item_id` : identifiant canonique stable ;
- `item_type` : `kana`, `kanji`, `vocabulary`, `grammar`, `conjugation` ;
- `status`, `attempts`, `correct`, `due_at`, séries et intervalle existants.

Ne pas créer une seconde table concurrente de maîtrise. Les anciens états
`app_kana_card_state` et `app_vocabulary_card_state` restent des préférences de
carte (`favorite`, `review`, `seen_count`) et doivent être projetés dans le
contrat commun sans devenir une autre vérité métier.

## Étapes obligatoires

- [ ] Créer `services/mastery.ts` avec un type `MasteryStatus` unique.
- [ ] Créer `getMasteryStatus`, `getMasteryLabel` et `getMasteryColorToken`.
- [ ] Créer une requête groupée évitant une requête SQLite par carte.
- [ ] Migrer les anciennes marques `review` vers le statut SRS correspondant.
- [ ] Connecter toutes les tentatives de quiz à un `item_id` canonique.
- [ ] Connecter les conjugaisons à la clé `verbe:forme`.
- [ ] Ne jamais rétrograder un acquis sur une seule erreur isolée ; utiliser les séries.
- [ ] Ajouter les états vides et données insuffisantes.
- [ ] Ajouter des tests unitaires pour toutes les transitions.

## Critères d'acceptation

- Un même mot possède le même statut dans sa carte, le quiz, le SRS et le tableau
  de bord.
- Une erreur rend une notion révisable sans effacer tout son historique.
- Une réponse correcte modifie immédiatement l'interface concernée.
- Le calcul fonctionne sur plusieurs milliers d'éléments sans ralentissement visible.

---

# NDX-R02 - Bibliothèques Apprendre, Revoir et Tout voir

## Objectif

Appliquer aux kana, kanji et mots de vocabulaire une navigation cohérente avec
trois intentions principales : apprendre du nouveau, revoir les acquis fragiles
et explorer la bibliothèque complète.

## Écrans concernés

- `KanaScreen` ;
- `KanjiDetailScreen` et visionneuse des cartes kanji ;
- `VocabularyScreen`.

## Sous-menu standard

Chaque bibliothèque doit présenter les vues suivantes :

1. `À apprendre` : statut `new`, trié selon le curriculum ;
2. `À revoir` : statut `review`, puis échéance SRS la plus ancienne ;
3. `Connus` : statuts `known` et `mastered` ;
4. `Tout voir` : aucun verrouillage, recherche et filtres complets ;
5. `Favoris` : préférence locale indépendante de la maîtrise.

## Comportement

- [ ] Afficher le nombre d'éléments dans chaque vue.
- [ ] Conserver les filtres durant la navigation interne.
- [ ] Afficher le statut sur chaque carte sans surcharger son contenu.
- [ ] Permettre de démarrer une session avec la vue filtrée.
- [ ] Proposer `Revoir les éléments dus` quand la vue contient des échéances.
- [ ] Ajouter recherche, tri pédagogique, ordre alphabétique et aléatoire.
- [ ] Virtualiser ou paginer les listes dépassant 100 éléments.
- [ ] Rendre les cartes accessibles au lecteur d'écran.

## Critères d'acceptation

- Les trois bibliothèques se comportent de la même façon.
- L'utilisateur peut consulter un contenu futur librement sans qu'il apparaisse
  ensuite automatiquement dans son parcours guidé.
- Une liste de 2 000 mots reste fluide sur iPhone.

---

# NDX-R03 - Double entrée Parcours conseillé ou Thème libre

## Objectif

Faire comprendre explicitement les deux façons d'étudier sans créer deux systèmes
d'apprentissage incompatibles.

## Écran de choix

Ajouter au centre `Apprendre` deux commandes principales :

- `Continuer mon parcours` : prochaine unité calculée depuis le curriculum ;
- `Choisir un thème` : kana, kanji, vocabulaire, grammaire, lecture et situations.

## Parcours conseillé

- utilise le niveau courant `1A` à `10C` ;
- reprend d'abord les révisions dues ;
- présente ensuite un lot de 3 à 7 notions nouvelles ;
- ne contient que les notions de l'unité courante ou déjà acquises ;
- enregistre précisément les notions présentées.

## Thème libre

- laisse sélectionner un domaine, thème et niveau ;
- n'avance pas automatiquement le niveau guidé ;
- alimente néanmoins les statistiques et le SRS ;
- indique clairement `Exploration libre` pendant la session.

## Étapes obligatoires

- [ ] Créer `LearningEntryScreen` ou une section équivalente non marketing.
- [ ] Ajouter les deux commandes avec compteurs et durée estimée.
- [ ] Créer un contrat `LearningSessionSource = guided | theme | review`.
- [ ] Persister la source de chaque session.
- [ ] Empêcher une exploration libre de valider seule une unité complète.
- [ ] Ajouter un retour vers le choix précédent.

## Critères d'acceptation

Un débutant peut appuyer sur `Continuer mon parcours` sans recevoir une notion non
présentée. Un utilisateur avancé peut ouvrir n'importe quel thème immédiatement.

---

# NDX-R04 - Boucle de leçon complète

## Objectif

Transformer chaque lot d'apprentissage en séquence continue, du premier contact
jusqu'à la révision SRS.

## Séquence obligatoire

### 1. Introduction

- titre du lot ;
- objectifs concrets ;
- nombre de notions ;
- durée estimée ;
- prérequis utiles, sans blocage.

### 2. Découverte

Pour chaque notion :

- forme japonaise principale ;
- lecture kana ;
- romaji seulement sur demande ;
- sens français ;
- catégorie ou attribut grammatical ;
- audio ;
- phrase N5 concrète ;
- aide mnémotechnique lorsque pertinente.

### 3. Récapitulatif avant quiz

- liste compacte de toutes les notions vues ;
- possibilité de rouvrir une fiche ;
- commande `Je suis prêt` ;
- commande `Revoir les cartes`.

### 4. Quiz ciblé

- questions limitées au lot et aux prérequis déjà connus ;
- aucun contenu aléatoire futur ;
- minimum deux formats différents ;
- correction immédiate et explicative.

### 5. Bilan et suite

- notions apprises ;
- notions à revoir ;
- durée, score, meilleure série et récompense ;
- `Refaire mes erreurs` ;
- `Réviser ce lot` ;
- `Continuer le parcours`.

## Persistance

Créer ou compléter une session persistée comportant :

```ts
type LearningLotSnapshot = {
  id: string;
  source: 'guided' | 'theme' | 'review';
  curriculumCode?: string;
  itemRefs: Array<{ itemType: string; itemId: string }>;
  phase: 'intro' | 'learn' | 'recap' | 'quiz' | 'summary';
  currentIndex: number;
  answers: Array<{ questionId: string; selected: string; correct: boolean }>;
  startedAt: string;
};
```

## Étapes obligatoires

- [ ] Créer un générateur de lots déterministe et testable.
- [ ] Créer la reprise de session après fermeture de l'application.
- [ ] Créer le récapitulatif avant quiz.
- [ ] Créer le quiz exclusivement depuis les références du lot.
- [ ] Envoyer chaque résultat dans le SRS et le cahier d'erreurs.
- [ ] Créer la page de bilan du lot.
- [ ] Ajouter les trois actions de sortie.

## Critères d'acceptation

L'utilisateur ne quitte jamais la boucle pour chercher manuellement son quiz. Le
lot peut reprendre après un redémarrage sans perte ni duplication de récompense.

---

# NDX-R05 - Bandeau permanent Continuer

## Objectif

Afficher en haut de l'expérience un rappel compact de la position actuelle et
permettre de reprendre en un seul geste.

## Contenu du bandeau

- sous-niveau courant ;
- nom de la prochaine activité ;
- progression compacte ;
- révisions dues, si prioritaires ;
- commande `Continuer`.

## Règles d'affichage

- visible sur Aujourd'hui et dans les centres Parcours, Apprendre et Pratiquer ;
- compact ou masqué pendant un exercice focalisé ;
- non affiché dans une modale plein écran ;
- ne doit pas pousser le contenu hors écran ou recouvrir un titre ;
- actualisé après chaque session sans redémarrage.

## Étapes obligatoires

- [ ] Créer `ContinueLearningBar`.
- [ ] Créer `loadNextLearningAction()` comme seule source de décision.
- [ ] Prioriser SRS dû, erreur récente, unité courante, puis nouvelle notion.
- [ ] Ajouter une variante compacte mobile.
- [ ] Ajouter accessibilité et cible tactile de 44 points minimum.
- [ ] Tester le retour depuis toutes les destinations.

## Critères d'acceptation

Depuis les écrans principaux, une seule pression ouvre la prochaine activité
pertinente et non une simple page intermédiaire.

---

# NDX-R06 - Roadmap visuelle continue

## Objectif

Remplacer la sensation de liste par une route verticale claire, adulte et
japonaise, sans transformer l'application en jeu enfantin.

## Structure visuelle

- nœuds reliés par une ligne verticale ;
- alternance légère gauche/droite sur écran large, axe unique sur petit mobile ;
- jalons de chapitre entre `1A`, `1B`, `1C`, etc. ;
- pictogramme kanji associé au domaine ;
- progression de l'unité sous forme d'anneau ou de contour ;
- prochain nœud mis en évidence sans bloquer les suivants.

## États visuels

| État | Traitement |
| --- | --- |
| Terminé | plein, coche discrète, contraste stable |
| Actuel | accent rouge, libellé `Continuer` |
| Recommandé | accent or, raison affichable |
| Futur accessible | contour neutre, entièrement cliquable |
| À revoir | marque mémoire distincte du statut futur |

## Fiche d'un nœud

- description pédagogique ;
- notions exactes ;
- prérequis ;
- étapes internes ;
- critères de réussite ;
- durée estimée ;
- progression réelle ;
- boutons `Commencer`, `Réviser`, `Explorer le contenu`.

## Étapes obligatoires

- [ ] Créer un composant `PathNode` sans carte imbriquée.
- [ ] Créer les connecteurs accessibles et responsives.
- [ ] Brancher les 30 unités existantes.
- [ ] Ajouter durée et prochain exercice calculés.
- [ ] Préserver l'accès aux unités futures.
- [ ] Vérifier qu'aucun texte ne se superpose à la route.

## Critères d'acceptation

En moins de cinq secondes, l'utilisateur identifie le chemin déjà parcouru, sa
position et la prochaine action. Toute unité reste ouvrable.

---

# NDX-R07 - Centre Kana complet

## Objectif

Organiser les kana par système, famille sonore et niveau de maîtrise, puis offrir
une progression théorie -> reconnaissance -> production -> vitesse.

## Arborescence

### Scripts

- Hiragana ;
- Katakana.

### Familles

- voyelles `あいうえお` ;
- lignes K, S, T, N, H, M, Y, R, W ;
- dakuten G, Z, D, B ;
- handakuten P ;
- petits kana et sons combinés ;
- voyelles longues et petit っ.

Chaque famille affiche :

- total ;
- nouveaux ;
- à revoir ;
- connus ;
- maîtrisés ;
- couleur issue des jetons du contrat NDX-R01.

## Partie théorique

- origine des hiragana et katakana ;
- rôle moderne de chaque script ;
- ordre des traits ;
- dakuten et handakuten ;
- sons contractés ;
- petit っ ;
- voyelles longues ;
- erreurs fréquentes des francophones.

## Parcours d'étude

1. observer ;
2. écouter ;
3. tracer ;
4. reconnaître ;
5. produire ;
6. sprint facultatif.

## Étapes obligatoires

- [ ] Créer le catalogue canonique des familles.
- [ ] Ajouter le sous-menu par famille avec progression.
- [ ] Ajouter les chapitres théoriques illustrés par des exemples textuels.
- [ ] Relier cartes, tracé et quiz sans retour au menu principal.
- [ ] Débloquer le sprint comme recommandation après 80 % de précision, sans le verrouiller.
- [ ] Enregistrer la maîtrise par caractère et par famille.

## Critères d'acceptation

Un utilisateur peut étudier uniquement la ligne K ou tous les dakuten, et voir
immédiatement ce qui est nouveau, fragile ou maîtrisé.

---

# NDX-R08 - Centre Kanji, théorie et graphe des radicaux

## Objectif

Faire du kanji une matière compréhensible et navigable, au-delà d'une collection
de cartes.

## Partie théorique Kanji

- origine pictographique et évolution ;
- idéogrammes simples et composés ;
- différence caractère, mot et lecture ;
- lectures on et kun ;
- okurigana ;
- rôle des radicaux ;
- ordre des traits ;
- méthode réaliste d'apprentissage N5.

## Fiche Kanji

- kanji principal ;
- radical principal cliquable ;
- autres composants ;
- sens ;
- lectures on et kun ;
- vocabulaire par lecture ;
- phrase N5 par vocabulaire retenu ;
- mnémonique ;
- confusions ;
- statut de maîtrise ;
- audio des mots, pas lecture artificielle isolée si elle n'est pas naturelle.

## Fiche Radical

- forme principale et variantes ;
- nom japonais ;
- sens conceptuel ;
- position possible dans le kanji ;
- liste de tous les kanji N5 associés ;
- nombre de kanji connus et à revoir ;
- navigation directe vers chaque kanji.

## Navigation obligatoire

`Kanji -> Radical -> Liste associée -> Autre kanji -> Retour précédent`.

## Étapes obligatoires

- [ ] Valider les radicaux des 80 kanji N5 avec une source éditoriale fiable.
- [ ] Remplacer les composants descriptifs approximatifs par des références structurées.
- [ ] Créer un type `RadicalEntry` et un index `radical -> kanjiIds`.
- [ ] Rendre le radical cliquable dans chaque fiche kanji.
- [ ] Créer la fiche radical et sa progression.
- [ ] Ajouter filtres nouveau, connu, à revoir, maîtrisé et radical.
- [ ] Ajouter mode lecture, sens, écriture et mélange.
- [ ] Ajouter le tracé kanji uniquement avec données d'ordre fiables.

## Critères d'acceptation

Aucun radical n'est une impasse visuelle. Toute relation permet une navigation
aller-retour sans perdre le filtre ou la position de carte.

---

# NDX-R09 - Enrichissement lexical exhaustif

## Objectif

Garantir que chaque mot réellement enseigné possède des informations suffisantes,
fiables, adaptées au N5 et utilisables dans une leçon.

## Contrat de contenu minimal

```ts
type VocabularyLearningEntry = {
  id: string;
  japanese: string;
  kana: string;
  meaningFr: string;
  partOfSpeech: string;
  attributes: string[];
  theme: string;
  curriculumCode: string;
  exampleJa: string;
  exampleKana: string;
  exampleFr: string;
  usageNote?: string;
  counterNote?: string;
  imageAsset?: string;
};
```

## Règles éditoriales

- phrase courte et naturelle ;
- uniquement grammaire du niveau courant ou antérieur ;
- traduction française idiomatique ;
- mot cible clairement identifiable ;
- pas de romaji dans la réponse d'un quiz ;
- aucun exemple généré automatiquement sans validation de contenu ;
- les homonymes et sens distincts restent séparés ;
- les doublons sémantiques sont regroupés ou explicitement différenciés.

## Interaction dans les phrases

- chaque mot japonais connu du dictionnaire est touchable ;
- le panneau indique lecture, sens, nature et statut ;
- les particules sont identifiables sans devenir des liens trompeurs ;
- adjectifs et verbes indiquent leur forme de dictionnaire ;
- l'ouverture du panneau ne révèle pas la réponse d'un quiz non validé.

## Étapes obligatoires

- [ ] Auditer les 2 112 entrées et définir le sous-ensemble réellement enseigné.
- [ ] Éliminer les doublons faux et les chaînes corrompues.
- [ ] Ajouter une phrase validée à 100 % du sous-ensemble enseigné.
- [ ] Ajouter nature grammaticale et attributs.
- [ ] Ajouter les notes spécifiques aux compteurs.
- [ ] Créer un rapport automatique des champs manquants.
- [ ] Ajouter un test interdisant une entrée enseignée sans exemple.
- [ ] Vérifier les images et retirer toute illustration ambiguë.

## Critères d'acceptation

Chaque carte d'une session guidée peut être comprise sans dictionnaire externe et
contient au moins un exemple N5 exploitable.

---

# NDX-R10 - Moteur universel de quiz fluide

## Objectif

Donner aux quiz kana, kanji, vocabulaire, grammaire, audio et lecture le même
comportement, les mêmes réglages et la même qualité de retour.

## Formats à supporter

- QCM 2 x 2 ;
- saisie directe ;
- audio vers japonais ou sens ;
- ordre de mots ;
- association ;
- reconnaissance visuelle ;
- tracé lorsque des données fiables existent.

## Contrat de question

```ts
type ExerciseQuestion = {
  id: string;
  domain: 'kana' | 'kanji' | 'vocabulary' | 'grammar' | 'audio' | 'reading';
  itemRefs: Array<{ itemType: string; itemId: string }>;
  format: string;
  prompt: string;
  displayJa?: string;
  choices?: string[];
  answer: string;
  explanationFr: string;
  sentenceJa?: string;
  sentenceKana?: string;
  sentenceFr?: string;
  audioId?: string;
};
```

## Son et enchaînement

- jouer un son court local après une réponse correcte ;
- jouer un retour distinct, discret et non punitif après une erreur ;
- après une bonne réponse, passer automatiquement à la suivante après 350 à 600 ms ;
- après une erreur, rester sur la correction jusqu'à `Continuer` ;
- permettre de désactiver sons et passage automatique ;
- annuler tout minuteur lors d'un retour ou changement d'écran ;
- ne pas dépendre des 44 fichiers vocaux japonais pour les effets d'interface.

## Réglages

- `Sons de validation` ;
- `Passage automatique` ;
- `Afficher kana après réponse` ;
- `Afficher romaji après réponse` ;
- `Réduire les animations`.

## Étapes obligatoires

- [ ] Étendre `ExerciseShell` à tous les formats.
- [ ] Migrer Kana Arcade, Audio, Examen et anciens quiz.
- [ ] Créer deux effets audio locaux légers et libres de droits.
- [ ] Créer un contrôleur unique d'avance automatique.
- [ ] Ajouter `Je ne sais pas` à tous les formats compatibles.
- [ ] Masquer la navigation générale pendant les sessions focalisées.
- [ ] Conserver un bouton retour permanent avec confirmation si nécessaire.
- [ ] Tester les doubles pressions et réponses simultanées.

## Critères d'acceptation

Une bonne réponse produit un retour immédiat et la question suivante sans attente
inutile. Une mauvaise réponse laisse le temps de comprendre. Aucun timer ne
modifie un écran déjà quitté.

---

# NDX-R11 - Bilan universel, combos et célébrations

## Objectif

Terminer chaque activité par un retour homogène et célébrer les séries sans gêner
l'apprentissage.

## Bilan obligatoire

- score et pourcentage ;
- durée réelle ;
- nombre de notions travaillées ;
- meilleure série ;
- XP obtenue ;
- éventuelles pièces, uniquement après NDX-R14 ;
- notions devenues connues ou maîtrisées ;
- erreurs avec correction ;
- prochaines révisions programmées.

## Actions

- `Continuer` ;
- `Refaire mes erreurs` ;
- `Réviser les notions` ;
- `Recommencer` ;
- retour au menu précédent.

## Combos

- série de 5 : confettis courts et badge `5 justes` lors de la première obtention ;
- série de 10 : célébration renforcée ;
- série de 20 : badge distinct ;
- une série est interrompue par une erreur ou `Je ne sais pas` ;
- aucune animation ne bloque la réponse suivante ;
- la même récompense unique ne peut pas être créditée deux fois.

## Animation

- particules limitées à la zone supérieure ;
- durée recommandée 700 à 1 200 ms ;
- aucun texte recouvert ;
- version réduite : simple changement de couleur et libellé ;
- pas de vibration sans réglage explicite.

## Étapes obligatoires

- [ ] Étendre `SessionSummary` à toutes les activités.
- [ ] Ajouter les notions et échéances SRS au résultat.
- [ ] Corriger les seuils de badges de combo existants.
- [ ] Créer le déclencheur exact aux séries 5, 10 et 20.
- [ ] Ajouter les confettis non bloquants.
- [ ] Persister les récompenses de manière idempotente.
- [ ] Tester le retour, la reprise et les doubles validations.

## Critères d'acceptation

Tous les quiz et toutes les leçons terminent sur le même bilan. Une série de cinq
déclenche exactement une célébration, sans modifier la mise en page ni doubler la
récompense.

---

# NDX-R12 - Kits de phrases et situations pratiques

## Objectif

Transformer les fiches pratiques existantes en véritables mini-parcours de
conversation N5 utilisables hors ligne.

## Kits minimums

- salutations ;
- se présenter ;
- famille ;
- restaurant ;
- achats ;
- demander son chemin ;
- transports ;
- hôtel et voyage ;
- conversation courte ;
- urgence simple ;
- école et travail ;
- date, heure et rendez-vous.

## Structure d'un kit

1. objectif de communication ;
2. 8 à 15 phrases essentielles ;
3. vocabulaire touchable ;
4. audio local ou voix japonaise disponible sur l'appareil ;
5. note de politesse ou contexte ;
6. mini-dialogue ;
7. exercice d'association ;
8. construction de phrase ;
9. mini-quiz final ;
10. récapitulatif et ajout SRS.

## Étapes obligatoires

- [ ] Créer un schéma de kit stable dans `data/`.
- [ ] Convertir les six fiches pratiques actuelles.
- [ ] Ajouter les six kits manquants.
- [ ] Vérifier le niveau grammatical de chaque phrase.
- [ ] Rendre tous les mots japonais touchables après validation des questions.
- [ ] Connecter le résultat au SRS et aux statistiques.

## Critères d'acceptation

Chaque kit peut être suivi de bout en bout sans réseau et se termine par une
activité productive, pas uniquement par de la lecture passive.

---

# NDX-R13 - Progression locale dans chaque menu

## Objectif

Afficher la progression là où l'utilisateur travaille, sans l'obliger à consulter
le tableau de bord général.

## En-tête standard de domaine

Chaque menu Kana, Kanji, Vocabulaire, Grammaire, Lecture et Pratique affiche :

- éléments maîtrisés / total ;
- à revoir aujourd'hui ;
- dernière activité ;
- recommandation locale ;
- barre de progression sobre ;
- commande `Continuer`.

## Détail

- Kana : progression par script et famille ;
- Kanji : progression par kanji et radical ;
- Vocabulaire : progression par thème ;
- Grammaire : progression par point et grand menu ;
- Lecture : textes lus, compréhension moyenne et vocabulaire connu ;
- Pratique : conjugaison par forme, nombres par mode, phrases par thème.

## Étapes obligatoires

- [ ] Créer `DomainProgressHeader`.
- [ ] Créer des agrégats SQLite groupés par domaine.
- [ ] Ne pas calculer les agrégats lourds à chaque rendu.
- [ ] Rafraîchir après une session ou au retour de l'écran.
- [ ] Afficher `Données insuffisantes` avant trois essais.
- [ ] Ajouter une action ciblée depuis chaque faiblesse.

## Critères d'acceptation

Chaque menu répond immédiatement à trois questions : où j'en suis, que dois-je
revoir et quelle est ma prochaine action ?

---

# NDX-R14 - Pièces et magasin cosmétique, optionnel

## Objectif

Ajouter une économie locale légère destinée uniquement à la personnalisation,
sans effet sur l'accès pédagogique.

## Règles

- les pièces ne remplacent pas l'XP ;
- aucune pièce achetable avec de l'argent réel dans cette version ;
- aucun contenu pédagogique vendu ;
- aucun mécanisme aléatoire ou coffre ;
- aucun système de rareté anxiogène ;
- solde et achats entièrement locaux ;
- les objets sont cosmétiques : personnage, couleur, cadre, fond ou accessoire.

## Gains possibles

- première session du jour ;
- objectifs quotidiens ;
- série de 5, 10 ou 20 ;
- fin d'une unité ;
- badge nouvellement obtenu.

Les gains doivent être plafonnés et idempotents.

## Schéma proposé

```sql
CREATE TABLE app_wallet (
  currency TEXT PRIMARY KEY,
  balance INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE app_reward_ledger (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(source_type, source_id)
);

CREATE TABLE app_cosmetic_inventory (
  cosmetic_id TEXT PRIMARY KEY,
  acquired_at TEXT NOT NULL,
  equipped INTEGER NOT NULL DEFAULT 0
);
```

## Catalogue initial conseillé

- 3 petits personnages originaux ;
- 6 palettes de couleurs ;
- 6 cadres de profil ;
- 8 accessoires simples.

Les visuels doivent être originaux et cohérents avec l'identité adulte japonaise.

## Étapes obligatoires

- [ ] Valider que P0 et P1 sont terminés avant démarrage.
- [ ] Créer le portefeuille et le registre idempotent.
- [ ] Créer le catalogue local de cosmétiques.
- [ ] Créer le magasin avec aperçu avant achat.
- [ ] Créer l'inventaire et l'équipement.
- [ ] Appliquer le cosmétique sans modifier la lisibilité.
- [ ] Tester sauvegarde, restauration et absence de solde négatif.

## Critères d'acceptation

Un achat ne peut jamais être facturé deux fois et aucun objet cosmétique ne
modifie les résultats, le niveau ou l'accès au contenu.

---

# NDX-R15 - Qualité, performance et publication

## Objectif

Garantir que les nouveaux chantiers restent fiables sur Expo SDK 56, Web et iOS.

## Tests automatiques obligatoires

- [x] `npm run typecheck`.
- [x] `npm run test:unit`.
- [x] `npm run test:integration`.
- [x] `npm run test:content`.
- [x] `npm run test:curriculum`.
- [x] `npm run db:validate`.
- [x] `npm run smoke`.
- [x] `npm run export:web`.
- [x] `npm run audit:mobile`.

## Viewports obligatoires

- 375 x 667 ;
- 390 x 844 ;
- 430 x 932 ;
- tablette portrait ;
- bureau 1280 x 800.

## Scénarios E2E

- [ ] première session débutante complète ;
- [ ] lot de vocabulaire puis quiz ciblé ;
- [ ] erreur puis reprise depuis le SRS ;
- [ ] série de cinq et célébration ;
- [ ] fermeture puis reprise d'une session ;
- [ ] parcours conseillé et thème libre ;
- [ ] navigation kanji -> radical -> kanji ;
- [ ] filtres nouveaux, connus et à revoir ;
- [ ] mode hors ligne ;
- [ ] réduction des animations ;
- [ ] restauration d'une sauvegarde antérieure.

## Performance

- aucune requête SQLite par élément dans une liste ;
- aucune liste de plusieurs centaines d'éléments rendue sans virtualisation ;
- images dimensionnées et mises en cache ;
- timers annulés au démontage ;
- calculs lourds mémorisés ;
- aucune modification de taille lors d'un retour de quiz ;
- aucune erreur console bloquante ;
- aucun débordement horizontal.

## Accessibilité

- cibles tactiles de 44 x 44 points minimum ;
- contraste AA ;
- libellés de lecteur d'écran ;
- état sélectionné annoncé ;
- navigation sans dépendre uniquement d'une couleur ;
- texte dynamique sans chevauchement ;
- animations réduites lorsque demandé.

## Vérification réelle

- [ ] Tester au minimum sur un iPhone physique avec Expo Go SDK 56.
- [ ] Tester le mode avion après premier chargement.
- [ ] Vérifier la voix japonaise disponible sur l'appareil.
- [ ] Vérifier les gestes, le clavier et les zones sûres iOS.
- [ ] Documenter toute différence Web / iOS restante.

---

# 5. Ordre détaillé de réalisation

## Phase A - Fondation de données

- [ ] A01 Auditer les identifiants canoniques de chaque domaine.
- [ ] A02 Implémenter NDX-R01.
- [ ] A03 Migrer les anciens états sans perte.
- [ ] A04 Ajouter les tests de transition SRS.
- [ ] A05 Valider les agrégats de progression.

## Phase B - Bibliothèques et boucle d'apprentissage

- [ ] B01 Implémenter NDX-R02.
- [ ] B02 Implémenter NDX-R03.
- [ ] B03 Implémenter le générateur de lot NDX-R04.
- [ ] B04 Ajouter récapitulatif et quiz ciblé.
- [ ] B05 Ajouter reprise de session et bilan.
- [ ] B06 Ajouter le bandeau NDX-R05.

## Phase C - Domaines pédagogiques

- [ ] C01 Transformer le parcours avec NDX-R06.
- [ ] C02 Terminer le centre Kana NDX-R07.
- [ ] C03 Terminer le centre Kanji NDX-R08.
- [ ] C04 Auditer et enrichir le vocabulaire NDX-R09.
- [ ] C05 Transformer les fiches en kits NDX-R12.

## Phase D - Exercices et récompenses

- [ ] D01 Migrer les quiz vers NDX-R10.
- [ ] D02 Ajouter sons et avance automatique.
- [ ] D03 Généraliser le bilan NDX-R11.
- [ ] D04 Ajouter combos, confettis et badges exacts.
- [ ] D05 Ajouter la progression locale NDX-R13.

## Phase E - Option cosmétique

- [ ] E01 Réévaluer l'intérêt du magasin après tests utilisateurs.
- [ ] E02 Implémenter NDX-R14 uniquement si confirmé.

## Phase F - Stabilisation

- [x] F01 Exécuter tous les tests NDX-R15.
- [x] F02 Corriger tous les défauts visuels détectés par l'audit local.
- [ ] F03 Tester sur iPhone réel et hors ligne.
- [x] F04 Mettre à jour documentation, captures et notes de version.
- [ ] F05 Geler le contenu et produire la candidate de publication.

# 6. Définition globale de terminé

La V3 est considérée terminée seulement lorsque :

- [ ] les chantiers NDX-R01 à NDX-R13 et NDX-R15 sont validés ;
- [ ] aucun contenu pédagogique n'est verrouillé ;
- [ ] les deux chemins d'étude sont disponibles ;
- [ ] chaque notion possède un statut cohérent ;
- [ ] chaque lot guidé possède découverte, récapitulatif, quiz et bilan ;
- [ ] tous les quiz partagent le comportement validé ;
- [ ] les séries de cinq déclenchent le retour prévu ;
- [ ] chaque menu affiche sa progression et sa prochaine action ;
- [ ] les tests automatiques sont verts ;
- [ ] l'audit visuel ne détecte aucun chevauchement ;
- [ ] l'application fonctionne en mode avion ;
- [ ] le test sur iPhone physique est validé ;
- [ ] toutes les limites restantes sont documentées.

NDX-R14 reste optionnel et ne bloque pas la publication si le produit pédagogique
est complet, fluide et stable.

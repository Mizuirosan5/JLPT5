# Rapport Lot 0 - Reference V2

Date : 2026-08-21 16:44:33 +02:00
Branche : stabilisation-v2
Commit de depart : f1d053a
SDK Expo : 54.0.35

## Etat Git

Le worktree etait initialement en HEAD detache. Une branche locale `stabilisation-v2` a ete creee depuis `f1d053a`.

Les captures `playwright-v2-*.png` sont des sorties d'audit et sont maintenant ignorees par `expo-jlpt-n5-coach-sdk54/.gitignore`.

Le dossier `Support/` contient 20 captures utilisateur, environ 38,47 Mo. Il est classe comme source de reference visuelle et ne doit pas etre supprime.

## Sauvegardes locales

Une copie de la base V8 embarquee a ete creee hors Git :

`expo-jlpt-n5-coach-sdk54/.release-local/lot0/jlpt_n5_mobile_v8_reference.db`

La base V7 reelle avec progression utilisateur n'est pas presente dans ce worktree. Elle devra etre recuperee depuis un appareil ou une sauvegarde locale Expo avant de valider la migration V7 vers V8.

## Mesures de reference

Base embarquee : 13,77 Mo.
Assets examens : 65 PNG, environ 12,84 Mo.
Audio embarque : 3 fichiers, environ 0,0028 Mo.
Export web `dist` : 72 fichiers, environ 28,91 Mo.

Validation :

- `npm test` : reussi.
- `npm run typecheck` : reussi.
- `npm run audit:mobile` : reussi apres demarrage du serveur local.

Audit mobile web :

- URL : `http://localhost:8081/JLPT5`.
- 20 checkpoints ouverts.
- Aucun checkpoint en echec.
- Aucun ecran vide detecte.
- Aucun log React critique apres correction du mode rapide.
- Warnings restants : props de style React Native Web deprecies (`textShadow*`, `shadow*`, `pointerEvents`).

## Correction appliquee pendant Lot 0

Le mode rapide pouvait afficher des choix dupliques, par exemple plusieurs fois `3`, ce qui provoquait des cles React dupliquees et un risque de rendu incorrect. La generation des choix dedoublonne maintenant les propositions et la cle de rendu inclut l'index de choix.

Fichiers modifies :

- `services/quickSession.ts`
- `components/QuickSessionScreen.tsx`

## Decisions

- Les temporaires Playwright restent exclus du suivi Git.
- Les sauvegardes lourdes restent dans `.release-local/`, ignore par Git.
- Le commit de reference ne doit etre cree qu'apres validation du perimetre exact a versionner, car le worktree contient de nombreux changements applicatifs anterieurs non separes.

## Reste Lot 0

- Obtenir une vraie base V7 avec progression de test.
- Creer le commit de reference quand le perimetre de fichiers a versionner est stabilise.
- Eventuellement taguer ce commit comme point de depart release.

# Checklist de publication V2

## Code et donnees

- [x] Worktree propre et commit candidat V2 identifie sur `stabilisation-v2`.
- [x] `npm ci` termine sans erreur le 24 aout 2026.
- [x] `npm run test:release` passe deux fois consecutivement.
- [x] `npx expo-doctor` passe, 18/18.
- [ ] Migration V7 remplie vers V8 verifiee sans perte.
- [ ] Sauvegarde, suppression et restauration verifiees.
- [ ] Droits des contenus confirmes par le proprietaire.

## iPhone physique

- [ ] Installation neuve et mise a jour depuis V7 testees.
- [ ] Parcours complet du plan `TEST_PLAN_IPHONE.md`.
- [ ] Session complete en mode avion.
- [ ] Voix japonaise presente, absente et desactivee testee.
- [ ] VoiceOver et texte agrandi testes.
- [ ] Build production observe pendant 48 heures sans crash bloquant.

## Build et boutiques

- [ ] Projet EAS relie au compte Expo du proprietaire.
- [ ] Certificats Apple et cle Google Play valides.
- [ ] Build iOS production installe via TestFlight.
- [ ] Build Android AAB installe via piste interne.
- [ ] Captures, description, age rating et confidentialite relus.
- [ ] URLs support et confidentialite accessibles publiquement.
- [ ] Tag Git `v2.0.0` cree depuis le commit soumis.

## Preuves locales

- Audit Playwright : 60 checkpoints, 20 vues x 3 formats iPhone, aucun echec.
- SQLite : `PRAGMA quick_check` valide, 8 064 questions, 2 112 mots, 80 kanji et 132 questions d'annales.
- Reseau applicatif : aucun URL HTTP, `fetch` ou service distant dans `components`, `services` et `data`.
- Audio : option hybride retenue; 44 WAV optionnels absents, voix japonaise locale et etat indisponible geres.
- EAS CLI : configuration locale presente, mais verification distante bloquee tant que le compte Expo n'est pas connecte.

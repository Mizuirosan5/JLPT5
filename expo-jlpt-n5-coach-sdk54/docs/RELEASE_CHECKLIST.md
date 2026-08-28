# Checklist de publication V2

Derniere mise a jour : 28 aout 2026.

## Code et donnees

- [x] `npm run test:release` reussi deux fois avec 36 tests unitaires et 7 integration.
- [x] `npx expo-doctor` reussi, 18/18.
- [x] SQLite, contenus, curriculum, diagnostic et visuels valides.
- [x] Pack audio strict : 934/934 MP3 embarques.
- [x] Export Web de production genere.
- [x] Audit responsive automatise sans echec sur trois formats iPhone.
- [x] Inspection 402x874, tablette et bureau sans debordement.
- [ ] Migration d'une vraie base V7 remplie vers V8 verifiee sans perte.
- [ ] Droits des contenus confirmes par le proprietaire.

## iPhone physique

- [ ] Installation neuve et mise a jour depuis V7 testees.
- [ ] Parcours complet du plan `TEST_PLAN_IPHONE.md`.
- [ ] Session complete en mode avion.
- [ ] Audio embarque, audio desactive et interruptions testes.
- [ ] VoiceOver, reduction des mouvements et texte agrandi testes.
- [ ] Saisie directe avec clavier reel testee.
- [ ] Build production observe pendant 48 heures sans crash bloquant.

## Build et boutiques

- [ ] Projet EAS relie au compte Expo du proprietaire.
- [ ] Certificats Apple et cle Google Play valides.
- [ ] Build iOS production installe via TestFlight.
- [ ] Build Android AAB installe via piste interne.
- [ ] Captures, description, age rating et confidentialite relus.
- [ ] URL support et confidentialite accessibles publiquement.
- [ ] Tag Git `v2.0.0` cree depuis le commit effectivement soumis.

## Regle de sortie

Ne pas annoncer la publication terminee tant que les sections iPhone physique et
boutiques ne sont pas validees par le proprietaire. Le code peut etre qualifie
de candidat publiable, pas de version deja soumise.

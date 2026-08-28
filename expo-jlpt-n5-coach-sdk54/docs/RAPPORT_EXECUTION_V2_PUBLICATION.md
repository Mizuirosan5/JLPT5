# Rapport d'execution V2 publication

Date : 28 aout 2026
Version : 2.0.0
Branche : `stabilisation-v2`

## Resultat local

Le candidat V2 est valide localement : compilation, base, contenus, audio,
export Web, navigation responsive et principaux flux pedagogiques passent les
controles automatises. La soumission boutique reste conditionnee aux essais sur
iPhone physique, aux comptes de publication et aux droits editoriaux.

## Couverture actuelle

- curriculum progressif de 30 sous-niveaux, de 1A a 10C ;
- 119 points de grammaire, 80 kanji, 612 mots guides et 228 kana indexes ;
- bibliotheques librement accessibles, recommandations et quiz bornes au niveau ;
- 934 MP3 japonais embarques avec repli vocal local ;
- SRS, erreurs, favoris, objectifs quotidiens, recompenses et economie locale ;
- diagnostic de 30 questions, 3 niveaux, 6 domaines et rapport pondere ;
- cartes kanji recto-verso, audio et plein ecran pour les 80 caracteres ;
- objectifs adaptatifs : 3 par jour, identifiants uniques sur au moins 186 jours ;
- reduction des mouvements appliquee aux transitions et celebrations principales.

## Preuves du 28 aout 2026

- `npm run test:release` : reussi deux fois consecutivement ;
- tests : 36 unitaires et 7 integration, aucun echec ;
- `npx expo-doctor` : 18/18 ;
- audit Playwright : 66 vues sur 375x667, 390x844 et 430x932, aucun echec ;
- inspection additionnelle : 402x874, tablette 768x1024 et bureau 1440x900 ;
- aucun crash, ecran vide, debordement horizontal ou bouton coupe ;
- SQLite : integrite valide, 80 kanji et 132 questions d'annales ;
- audio strict : 934/934 fichiers, 0 manquant ;
- visuels de vocabulaire guide : 612/612 semantiques, 0 generique ;
- `git diff --check` : reussi.

## Limites externes restantes

1. Tester une migration avec une vraie base V7 remplie issue d'une ancienne installation.
2. Executer `TEST_PLAN_IPHONE.md`, notamment mode avion, audio, VoiceOver, texte agrandi et clavier reel.
3. Relier EAS au compte Expo et fournir les certificats Apple/Google.
4. Installer les builds TestFlight et piste interne, puis observer le candidat 48 heures.
5. Confirmer les droits des annales, textes et images.
6. Publier les URL de support et confidentialite, puis finaliser les captures stores.

Ces operations exigent l'appareil, les comptes ou une decision du proprietaire ;
elles ne doivent pas etre cochees a partir d'une simulation locale.

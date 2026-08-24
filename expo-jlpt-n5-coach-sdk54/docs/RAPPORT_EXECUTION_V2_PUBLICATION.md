# Rapport d'execution V2 publication

Date : 24 aout 2026
Version : 2.0.0
Branche : `stabilisation-v2`

## Resultat

L'implementation locale necessaire a un build candidat V2 est terminee. Le code compile, les donnees critiques sont controlees, l'export Web fonctionne et la configuration mobile est presente.

La publication boutique ne doit pas encore etre declaree terminee : les comptes, certificats, droits de contenu et essais sur appareils physiques appartiennent au proprietaire du produit.

## Travaux valides

- migration V7 vers V8 additive avec inventaire des tables utilisateur, transactions, comptages et controle d'integrite ;
- sauvegarde JSON versionnee, restauration validee, suppression locale et diagnostic technique ;
- reprise des principaux quiz et des annales, protection contre les doubles appuis et recompenses idempotentes ;
- base compacte de 13,8 Mo et suppression des tris SQL aleatoires ;
- pagination des 2 112 cartes de vocabulaire et chargements bornes des files SRS ;
- retour Android, fermeture du clavier, menu lateral scrollable et accessibilite des controles principaux ;
- suppression de la derniere illustration distante Kana et garde-fou contre toute dependance HTTP applicative ;
- exclusion des annales dependantes d'une image dans le mode 5 minutes ;
- identite visuelle V2 pour iOS, Android, splash et favicon ;
- version 2.0.0, identifiants mobile, versions de build, profils EAS et politique de confidentialite.

## Preuves

- `npm ci` : reussi ;
- `npm run test:release` : reussi deux fois consecutivement ;
- tests : 13 unitaires et 5 integration ;
- `npx expo-doctor` : 18/18 ;
- Playwright : 60/60 checkpoints, aucun crash, ecran vide, debordement horizontal, bouton coupe ou question rapide invalide ;
- SQLite : integrite valide, 8 064 questions, 31 728 choix, 2 112 mots, 80 kanji, 132 annales ;
- `git diff --check` : reussi.

## Blocages externes

1. Tester une migration avec une vraie base V7 remplie provenant d'une ancienne installation.
2. Executer `TEST_PLAN_IPHONE.md`, notamment mode avion, voix japonaise, VoiceOver, texte agrandi et clavier.
3. Connecter EAS au compte Expo; fournir certificats Apple et cle Google Play.
4. Installer les builds via TestFlight et piste interne, puis observer le candidat pendant 48 heures.
5. Confirmer les droits des annales, textes et images.
6. Publier les URLs de support et de confidentialite, puis preparer les captures stores.

Ces six points ne peuvent pas etre remplaces par une simulation locale.

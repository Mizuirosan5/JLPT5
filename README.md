# Coach Japonais JLPT N5

Application Expo destinée à l’apprentissage du japonais et à la préparation du JLPT N5.

Version web : `https://mizuirosan5.github.io/JLPT5/`

## Prérequis

- Node.js 20 à 24.
- npm.
- Expo Go SDK 54 pour les tests mobiles.

## Développement

```powershell
cd expo-jlpt-n5-coach-sdk54
npm ci
npm run web
```

## Validation locale

```powershell
cd expo-jlpt-n5-coach-sdk54
npm run typecheck
npm run export:web
```

Ou en une seule commande :

```powershell
cd expo-jlpt-n5-coach-sdk54
npm run validate
```

Recette V2 complete :

```powershell
cd expo-jlpt-n5-coach-sdk54
npm run test:release
npx expo-doctor
```

## Test sur Expo Go

Le telephone et le PC doivent etre sur le meme reseau :

```powershell
cd expo-jlpt-n5-coach-sdk54
npx expo start --lan --clear
```

Scanner ensuite le QR code du terminal avec Expo Go. La V2 reste sur Expo SDK 54.

## Publication mobile V2

- Configuration Expo : `expo-jlpt-n5-coach-sdk54/app.json`
- Profils EAS : `expo-jlpt-n5-coach-sdk54/eas.json`
- Checklist : `expo-jlpt-n5-coach-sdk54/docs/RELEASE_CHECKLIST.md`
- Plan iPhone : `expo-jlpt-n5-coach-sdk54/docs/TEST_PLAN_IPHONE.md`
- Confidentialite : `expo-jlpt-n5-coach-sdk54/PRIVACY_POLICY.md`

## Publication web

Chaque envoi sur la branche `main` déclenche automatiquement l’export Expo et le déploiement sur GitHub Pages.

## Encodage

Tous les fichiers source et documents doivent rester en UTF-8. Avant une release, vérifier qu'aucune séquence mojibake de type `Ã`, `Â`, `ã€`, `ï¼` ou `â€` n'est visible dans l'interface ou la documentation.

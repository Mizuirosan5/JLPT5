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

## Publication web

Chaque envoi sur la branche `main` déclenche automatiquement l’export Expo et le déploiement sur GitHub Pages.

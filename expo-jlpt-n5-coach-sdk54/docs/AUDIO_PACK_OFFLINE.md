# Pack audio offline

## Objectif

L'app utilise un mode hybride :

- fichiers WAV embarques quand ils existent dans `assets/audio/n5_core`;
- fallback TTS japonais local avec `expo-speech`;
- fallback texte si aucune voix japonaise locale n'est disponible.

## Commandes

```powershell
npm run audio:check
npm run audio:sync
npm run audio:generate
```

`audio:check` audite le manifest, les fichiers WAV et le registre Expo.
`audio:sync` relie les WAV presents a `data/audioAssetRegistry.ts`.
`audio:generate` genere les WAV avec une voix japonaise Windows compatible, puis synchronise le registre.

Avant un build final avec pack audio complet :

```powershell
npm run audio:check:strict
```

## Etat attendu

Sans WAV, l'app fonctionne encore grace au fallback TTS/texte.
Avec WAV, le quiz audio lit d'abord le fichier embarque via `expo-audio`.

## Blocage actuel

Sur cette machine, aucune voix japonaise Windows SAPI compatible n'est accessible.
La generation locale de fichiers WAV est donc bloquee tant qu'une voix japonaise n'est pas installee.

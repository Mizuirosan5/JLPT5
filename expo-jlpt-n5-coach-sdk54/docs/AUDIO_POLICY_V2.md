# Politique audio V2

La V2 utilise officiellement le mode **audio hybride**, sans promesse de pack vocal complet embarque.

Ordre de lecture :

1. fichier embarque lorsqu'il est present dans `data/audioAssetRegistry.ts` ;
2. voix japonaise locale du systeme avec `expo-speech` ;
3. fallback texte explicite si aucune voix japonaise n'est installee.

Le quiz n'est jamais bloque par l'absence de voix. L'application ne telecharge aucun fichier, n'utilise aucun service vocal distant et ne demande pas le microphone. Les 44 entrees du manifeste constituent le noyau de prompts attendu, mais aucun fichier WAV n'est annonce comme present tant que `audio:check:strict` ne passe pas.

Tests physiques encore obligatoires avant soumission : iPhone avec voix japonaise, sans voix japonaise, audio desactive et mode avion.

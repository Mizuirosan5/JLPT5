# Pack audio hors ligne

## Etat valide le 28 aout 2026

L'application embarque un pack hybride de 934 fichiers MP3 japonais :

- noyau de phrases usuelles et de classe ;
- 225 prononciations kana ;
- 80 lectures principales de kanji N5 ;
- 585 prononciations de vocabulaire prioritaire.

Tous les fichiers sont declares statiquement dans `data/audioAssetRegistry.ts`,
inclus par Metro et lisibles sans connexion. Le repli `expo-speech` reste actif
pour un texte qui ne figure pas encore dans le pack. L'absence de voix japonaise
sur le telephone ne bloque donc plus les 934 contenus couverts.

## Commandes

```powershell
npm run audio:manifest
npm run audio:generate
npm run audio:sync
npm run audio:check:strict
```

`audio:manifest` reconstruit la couverture attendue depuis la base locale.
`audio:generate` produit les MP3 manquants et conserve les fichiers valides.
`audio:sync` regenere le registre Expo. `audio:check:strict` refuse tout fichier
absent, trop petit ou non declare.

## Preuve locale

`npm run audio:check:strict` : 934 fichiers attendus, 934 presents, 0 manquant.
L'export Web de production reference 934 ressources audio embarquees.

## Validation physique restante

Tester sur iPhone le volume, le mode silencieux, les interruptions audio et une
session complete en mode avion. Cette verification materielle ne peut pas etre
remplacee par l'audit Web.

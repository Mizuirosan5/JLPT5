# Tester l'app SDK 54 sur iPhone depuis Windows

Cette version est compatible avec Expo Go SDK 54.

## Lancement

Depuis PowerShell :

```powershell
cd C:\Users\djcle\Documents\JLPT5\expo-jlpt-n5-coach-sdk54
npx expo start --lan --clear
```

Scanne le QR code avec Expo Go.

Si le QR code ne fonctionne pas, ouvre Expo Go et saisis l'adresse LAN affichée par Expo. Sur ce PC, l'adresse Wi-Fi détectée est généralement :

```text
exp://192.168.1.8:8081
```

## Contenu du prototype

- Expo SDK 54.
- Base SQLite JLPT N5 intégrée : `assets/database/jlpt_n5_mobile.db`.
- Dashboard statistiques.
- Quiz adaptatif.
- Enregistrement local des réponses.
- Mode JLPT simplifié.

## Important

Utilise ce dossier, pas l'ancien prototype SDK 56 :

```text
C:\Users\djcle\Documents\JLPT5\expo-jlpt-n5-coach-sdk54
```

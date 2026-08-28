# Politique audio V2

La V2 utilise un mode audio hybride entierement compatible hors ligne.

Ordre de lecture :

1. MP3 japonais embarque lorsqu'une correspondance existe dans le registre ;
2. voix japonaise locale avec `expo-speech` pour les contenus hors pack ;
3. retour texte explicite si aucune voix locale n'est disponible.

Le quiz n'est jamais bloque par l'absence de voix. L'application ne telecharge
aucun son en fonctionnement, ne demande pas le microphone et n'utilise aucun
service vocal distant. Le pack actuel couvre 934 contenus et passe la validation
stricte.

Restent obligatoires avant soumission : essai iPhone avec audio active et coupe,
interruption par appel ou casque, et session en mode avion.

# Audit dependances V2

Date : 24 aout 2026

`npm audit --omit=dev` signale 16 alertes transitives : 7 moderees et 9 elevees, aucune critique. Elles concernent principalement la chaine de build Expo/Metro (`@expo/cli`, Metro, PostCSS, `image-size`, `xcode` et `uuid`).

La correction automatique propose Expo SDK 57. Cette migration est volontairement exclue de la V2 car la cible iOS de test reste Expo Go SDK 54. `npm audit fix --force` ne doit donc pas etre execute : il provoquerait une migration majeure non validee.

Mesures de reduction :

- aucune entree reseau ni contenu distant n'est traite par Metro dans l'application publiee ;
- aucune API, WebView distante, authentification ou telemetrie n'est integree ;
- les contenus et bases sont controles localement avant build ;
- `expo-doctor` doit rester a 18/18 ;
- la migration vers un SDK corrige doit etre traitee en V2.1 des que la cible iOS l'autorise.

Cette dette n'est pas un crash applicatif connu, mais elle reste une reserve de securite de la chaine de build a suivre avant chaque nouvelle soumission.

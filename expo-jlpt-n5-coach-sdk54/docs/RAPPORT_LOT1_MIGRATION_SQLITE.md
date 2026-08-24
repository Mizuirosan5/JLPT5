# Rapport Lot 1 - Migration et integrite SQLite

Date : 2026-08-21
Branche : stabilisation-v2

## Travaux implementes

- Nom de base centralise dans `DATABASE_NAME`.
- Ancienne base cible declaree : `jlpt_n5_mobile_v7.db`.
- Version de schema cible : `PRAGMA user_version = 8` et metadata `schema_version = 8`.
- Registre central des tables utilisateur : `USER_DATA_TABLES`.
- Table de journalisation : `app_migration_log`.
- Migration idempotente V7 vers V8 :
  - ouverture locale de la base V7 ;
  - detection des tables utilisateur presentes ;
  - comptage des lignes avant migration ;
  - attachement de la base V7 a la base V8 ;
  - copie en transaction avec `INSERT OR IGNORE` ;
  - comptage avant / legacy / apres ;
  - journalisation `complete`, `skipped_no_user_data` ou `failed`.
- La base V7 n'est pas supprimee apres migration.
- Sauvegarde locale JSON versionnee.
- Restauration locale transactionnelle.
- Refus des sauvegardes invalides, corrompues ou trop recentes.
- Suppression des donnees utilisateur avec double confirmation dans l'ecran Preferences.

## Fichiers principaux

- `services/database.ts`
- `services/localBackup.ts`
- `components/LearningPreferencesScreen.tsx`
- `App.tsx`

## Validations executees

- `npm run typecheck` : reussi.
- `npm run audit:mobile` : reussi, 20 checkpoints.
- `npm test` : reussi.

## Limites ouvertes

- La vraie base V7 remplie n'est pas disponible dans ce worktree. La migration a ete codee, mais la validation "V7 remplie reelle" reste impossible sans une copie extraite d'un appareil ou d'une ancienne installation.
- Les tests automatises dedies aux cas migration interrompue, export/import et Unicode seront ajoutes dans Lot 5.
- Le controle d'integrite developpement et l'audit complet des index restent ouverts.

# Migration SQLite V7 vers V8

## Fichiers

- V7 historique : `jlpt_n5_mobile_v7.db`.
- V8 courante : `jlpt_n5_mobile_v8.db`.
- Contenu embarque initial : `assets/database/jlpt_n5_mobile.db`.

La base embarquee contient les tables `canonical_*`, les questions, les choix et les annales. Les donnees utilisateur sont creees dans la base locale au premier lancement et ne doivent jamais etre remplacees par une nouvelle copie de l'asset.

## Tables utilisateur migrees

`app_question_attempt_local`, `app_kana_card_state`, `app_kana_mnemonic_local`, `app_vocabulary_card_state`, `app_kana_time_record`, `app_kana_arcade_score`, `app_daily_goal_plan`, `app_daily_reward_claim`, `app_user_learning_preferences`, `app_srs_item_state`, `app_error_flashcard`, `app_aptitude_result`, `app_content_progress`, `app_local_league_season`, `app_grammar_lesson_state`, `app_writing_journal_entry` et `app_session_state`.

## Procedure V8

1. Creer les tables V8 de facon additive.
2. Detecter les tables utilisateur presentes dans la V7.
3. Compter chaque table V7 avant copie.
4. Attacher la V7 en lecture et copier uniquement les colonnes communes dans une transaction.
5. Compter la V8 apres copie et refuser toute valeur inferieure au maximum des compteurs V7 et V8 initiaux.
6. Detacher et conserver physiquement la V7.
7. Ecrire le resultat dans `app_migration_log` et `app_local_metadata`.
8. Ecrire `PRAGMA user_version = 8`, puis executer `PRAGMA quick_check`.

Une migration echouee n'est jamais marquee complete. Elle est donc reprise au prochain lancement. Une migration deja complete est idempotente et n'est pas rejouee.

## Limite de recette

La validation definitive exige une copie reelle de V7 contenant une progression utilisateur. Une base V7 synthetique valide la logique technique, mais ne peut pas prouver que toutes les anciennes variantes de donnees presentes sur un appareil reel ont ete couvertes.

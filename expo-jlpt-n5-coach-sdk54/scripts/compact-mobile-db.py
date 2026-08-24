import os
import shutil
import sqlite3
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATABASE_PATH = ROOT / "assets" / "database" / "jlpt_n5_mobile.db"
COMPACT_PATH = ROOT / "assets" / "database" / "jlpt_n5_mobile.compact.db"

CORE_TABLES = [
    "canonical_vocabulary",
    "canonical_grammar",
    "canonical_kana",
    "canonical_kanji",
    "app_generated_question",
    "app_generated_choice",
    "app_adaptive_question_priority",
    "app_exam_question",
    "app_exam_question_segment",
    "app_exam_answer_key",
    "app_exam_page",
    "app_mobile_export_info",
]

CORE_VIEWS = ["app_question_bank"]


def quote_identifier(value: str) -> str:
    return '"' + value.replace('"', '""') + '"'


def copy_table(source: sqlite3.Connection, target: sqlite3.Connection, table_name: str) -> None:
    source_schema = source.execute(
        "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?",
        (table_name,),
    ).fetchone()
    if not source_schema:
        raise RuntimeError(f"Missing table in source database: {table_name}")

    target.execute(source_schema[0])
    columns = [row[1] for row in source.execute(f"PRAGMA table_info({quote_identifier(table_name)})")]
    column_list = ", ".join(quote_identifier(column) for column in columns)
    placeholders = ", ".join("?" for _ in columns)
    rows = source.execute(f"SELECT {column_list} FROM {quote_identifier(table_name)}").fetchall()
    target.executemany(
        f"INSERT INTO {quote_identifier(table_name)} ({column_list}) VALUES ({placeholders})",
        rows,
    )
    print(f"{table_name}: {len(rows)} rows")


def copy_indexes(source: sqlite3.Connection, target: sqlite3.Connection) -> None:
    kept_tables = set(CORE_TABLES)
    for name, sql, table_name in source.execute(
        """
        SELECT name, sql, tbl_name
        FROM sqlite_master
        WHERE type = 'index'
          AND sql IS NOT NULL
        ORDER BY name
        """
    ):
        if table_name not in kept_tables:
            continue
        target.execute(sql)
        print(f"index: {name}")


def copy_views(source: sqlite3.Connection, target: sqlite3.Connection) -> None:
    for view_name in CORE_VIEWS:
        row = source.execute(
            "SELECT sql FROM sqlite_master WHERE type = 'view' AND name = ?",
            (view_name,),
        ).fetchone()
        if not row:
            raise RuntimeError(f"Missing view in source database: {view_name}")
        target.execute(row[0])
        print(f"view: {view_name}")


def main() -> None:
    if not DATABASE_PATH.exists():
        raise RuntimeError(f"Database asset not found: {DATABASE_PATH}")
    if COMPACT_PATH.exists():
        COMPACT_PATH.unlink()

    source_size = DATABASE_PATH.stat().st_size
    source = sqlite3.connect(f"file:{DATABASE_PATH}?mode=ro", uri=True)
    target = sqlite3.connect(COMPACT_PATH)
    target.execute("PRAGMA foreign_keys = OFF")
    target.execute("PRAGMA journal_mode = OFF")
    target.execute("PRAGMA synchronous = OFF")

    try:
        for table_name in CORE_TABLES:
            copy_table(source, target, table_name)
        copy_indexes(source, target)
        copy_views(source, target)
        target.commit()
        target.execute("VACUUM")
    finally:
        source.close()
        target.close()

    compact_size = COMPACT_PATH.stat().st_size
    os.replace(COMPACT_PATH, DATABASE_PATH)
    print(f"Replaced {DATABASE_PATH.name}: {source_size:,} bytes -> {compact_size:,} bytes")


if __name__ == "__main__":
    main()

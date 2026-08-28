import re
import sqlite3
from pathlib import Path

DATABASE = Path(__file__).resolve().parents[1] / "assets" / "database" / "jlpt_n5_mobile.db"
MOJIBAKE = re.compile(r"(?:Ã[\x80-\xbf]|Â[\x80-\xbf]|â(?:€|€™))")


def scalar(connection: sqlite3.Connection, query: str) -> int | str:
    return connection.execute(query).fetchone()[0]


def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


connection = sqlite3.connect(f"file:{DATABASE.as_posix()}?mode=ro", uri=True)
try:
    require(scalar(connection, "PRAGMA quick_check") == "ok", "SQLite quick_check failed")
    require(scalar(connection, "SELECT COUNT(*) FROM app_question_bank") >= 8_000, "Question bank is unexpectedly small")
    require(scalar(connection, "SELECT COUNT(*) FROM canonical_vocabulary") >= 2_000, "Vocabulary bank is unexpectedly small")
    require(scalar(connection, "SELECT COUNT(*) FROM canonical_kanji") >= 80, "Kanji bank must contain at least 80 items")
    require(scalar(connection, "SELECT COUNT(*) FROM app_exam_question") >= 130, "Exam bank is unexpectedly small")
    require(scalar(connection, "SELECT COUNT(*) FROM app_question_bank WHERE trim(coalesce(correct_answer, '')) = ''") == 0, "Questions with blank answers")
    require(scalar(connection, "SELECT COUNT(*) FROM app_question_bank WHERE question_origin != 'exam'") >= 1000, "Too few autonomous questions for quick sessions")
    require(scalar(connection, "SELECT COUNT(*) FROM (SELECT question_id FROM app_question_bank GROUP BY question_id HAVING COUNT(*) > 1)") == 0, "Duplicate question identifiers")
    require(scalar(connection, "SELECT COUNT(*) FROM (SELECT question_id, SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) total FROM app_generated_choice GROUP BY question_id HAVING total != 1)") == 0, "Questions must have exactly one correct generated choice")
    require(scalar(connection, "SELECT COUNT(*) FROM (SELECT question_id, lower(trim(choice_text)) value FROM app_generated_choice GROUP BY question_id, value HAVING COUNT(*) > 1)") == 0, "Duplicate choices within a question")
    require(scalar(connection, "SELECT COUNT(*) FROM canonical_vocabulary WHERE trim(coalesce(meaning_fr, '')) = ''") == 0, "Vocabulary items with blank meanings")
    require(scalar(connection, "SELECT COUNT(*) FROM canonical_vocabulary WHERE trim(coalesce(romaji, '')) = ''") == 0, "Vocabulary items with blank romaji")
    require(scalar(connection, "SELECT COUNT(*) FROM canonical_vocabulary WHERE theme LIKE '%?%'") == 0, "Vocabulary themes with broken accents")
    require(scalar(connection, "SELECT COUNT(*) FROM (SELECT japanese, kana, meaning_fr FROM canonical_vocabulary GROUP BY japanese, kana, meaning_fr HAVING COUNT(*) > 1)") == 0, "Strict duplicate vocabulary items")

    english_meaning = re.compile(
        r"\b(?:to\s+|at once|western style|stove|heater|slipper|shopping|enterprise|lively|woman|girl|music|matches|envelope|number of months)\b",
        re.IGNORECASE,
    )
    for item_id, meaning in connection.execute("SELECT id, meaning_fr FROM canonical_vocabulary"):
        if english_meaning.search(meaning or ""):
            raise RuntimeError(f"English vocabulary meaning remains in {item_id}: {meaning}")

    text_columns = {
        "canonical_vocabulary": ["japanese", "kana", "kanji", "romaji", "meaning_fr", "theme"],
        "canonical_kanji": ["character", "meaning_fr", "onyomi", "kunyomi", "n5_readings"],
        "canonical_grammar": ["pattern", "title_fr", "explanation_fr", "example_ja", "example_fr"],
        "app_question_bank": ["prompt_fr", "prompt_ja", "correct_answer", "explanation_fr"],
    }
    for table, columns in text_columns.items():
        rows = connection.execute(f"SELECT {', '.join(columns)} FROM {table}")
        for row_number, row in enumerate(rows, start=1):
            for column, value in zip(columns, row):
                if isinstance(value, str) and ("\ufffd" in value or MOJIBAKE.search(value)):
                    raise RuntimeError(f"Broken UTF-8 in {table}.{column}, row {row_number}")
finally:
    connection.close()

print("Mobile database validation passed: integrity, identifiers, choices, required content and UTF-8.")

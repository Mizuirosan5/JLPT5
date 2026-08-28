import re
import sqlite3
from pathlib import Path


DATABASE = Path(__file__).resolve().parents[1] / "assets" / "database" / "jlpt_n5_mobile.db"

THEME_REPAIRS = {
    "Vocabulaire g?n?ral": "Vocabulaire général",
    "D?placements": "Déplacements",
    "?cole et ?tude": "École et étude",
    "Corps et sant?": "Corps et santé",
    "Nature et m?t?o": "Nature et météo",
}

ROW_REPAIRS = {
    "cvocab_0486dcfbdfa590": {
        "japanese": "明るい",
        "kana": "あかるい",
        "meaning_fr": "clair, lumineux",
        "theme": "Couleurs et descriptions",
    },
    "cvocab_7151567d9db486": {
        "meaning_fr": "comment ; que pensez-vous de… ?",
        "theme": "Expressions",
    },
    "cvocab_3f43b8d3de5066": {
        "meaning_fr": "ensemble",
    },
    "cvocab_fe9ab4b673918f": {
        "meaning_fr": "ascenseur",
        "theme": "Maison et quotidien",
    },
    "cvocab_0a7129c6432ca9": {
        "japanese": "伯父・叔父",
        "kana": "おじ",
        "meaning_fr": "oncle",
        "theme": "Famille",
    },
}

LEXICAL_REPAIRS = {
    ("おんがく", "music"): "musique",
    ("すぐに", "at once"): "immédiatement",
    ("かえる", "to return home"): "rentrer chez soi",
    ("かえす", "to return an object"): "rendre un objet",
    ("ようふく", "western style clothing"): "vêtements occidentaux",
    ("いけ", "pond"): "étang",
    ("ストーブ", "stove, heater"): "poêle, chauffage",
    ("おんなのこ", "girl"): "fille",
    ("～すぎ", "past, over"): "passé, au-delà de",
    ("かいもの", "shopping"): "achats, courses",
    ("かいしゃ", "enterprise"): "entreprise",
    ("にぎやか", "lively"): "animé, vivant",
    ("～かげつ", "~ number of months"): "compteur pour les mois",
    ("～がります", "3rd person wants to"): "exprime le désir d’une autre personne",
    ("おんな", "woman"): "femme",
    ("すずしい", "cool"): "frais (temps agréable)",
    ("おわる", "to end"): "finir, se terminer",
    ("かす", "to lend"): "prêter",
    ("かかる", "to take time, money"): "prendre, coûter (temps ou argent)",
    ("スリッパ", "slipper"): "pantoufles",
    ("マッチ", "matches"): "allumettes",
    ("ふうとう", "envelope"): "enveloppe",
    ("レッズ", "The Reds (équipe de football)"): "les Reds (équipe de football)",
    ("かるい", "lumière"): "léger",
    ("きる", "porte"): "porter (un vêtement)",
    ("ぺん", "style"): "stylo",
    ("ズボン", "poches"): "pantalon",
    ("のみもの", "verres"): "boisson",
    ("なく", "chanter"): "pleurer, crier (animal)",
    ("まるい", "tour"): "rond",
    ("むこう", "par ici"): "en face, de l’autre côté",
    ("きって", "tempon"): "timbre",
    ("おさら", "asiette"): "assiette",
    ("じびき", "dictionaire"): "dictionnaire",
    ("きたない", "sâle"): "sale",
    ("エレベータ", "ascenceur"): "ascenseur",
    ("おととし", "l’avant année dernière"): "il y a deux ans",
    ("さらいねん", "l’année d’après après"): "dans deux ans",
    ("じゅう", "100"): "dix",
}

BASIC = {
    "あ": "a", "い": "i", "う": "u", "え": "e", "お": "o",
    "か": "ka", "き": "ki", "く": "ku", "け": "ke", "こ": "ko",
    "さ": "sa", "し": "shi", "す": "su", "せ": "se", "そ": "so",
    "た": "ta", "ち": "chi", "つ": "tsu", "て": "te", "と": "to",
    "な": "na", "に": "ni", "ぬ": "nu", "ね": "ne", "の": "no",
    "は": "ha", "ひ": "hi", "ふ": "fu", "へ": "he", "ほ": "ho",
    "ま": "ma", "み": "mi", "む": "mu", "め": "me", "も": "mo",
    "や": "ya", "ゆ": "yu", "よ": "yo",
    "ら": "ra", "り": "ri", "る": "ru", "れ": "re", "ろ": "ro",
    "わ": "wa", "を": "o", "ん": "n",
    "が": "ga", "ぎ": "gi", "ぐ": "gu", "げ": "ge", "ご": "go",
    "ざ": "za", "じ": "ji", "ず": "zu", "ぜ": "ze", "ぞ": "zo",
    "だ": "da", "ぢ": "ji", "づ": "zu", "で": "de", "ど": "do",
    "ば": "ba", "び": "bi", "ぶ": "bu", "べ": "be", "ぼ": "bo",
    "ぱ": "pa", "ぴ": "pi", "ぷ": "pu", "ぺ": "pe", "ぽ": "po",
    "ゔ": "vu", "ぁ": "a", "ぃ": "i", "ぅ": "u", "ぇ": "e", "ぉ": "o",
}

DIGRAPHS = {
    "きゃ": "kya", "きゅ": "kyu", "きょ": "kyo",
    "しゃ": "sha", "しゅ": "shu", "しょ": "sho",
    "ちゃ": "cha", "ちゅ": "chu", "ちょ": "cho",
    "にゃ": "nya", "にゅ": "nyu", "にょ": "nyo",
    "ひゃ": "hya", "ひゅ": "hyu", "ひょ": "hyo",
    "みゃ": "mya", "みゅ": "myu", "みょ": "myo",
    "りゃ": "rya", "りゅ": "ryu", "りょ": "ryo",
    "ぎゃ": "gya", "ぎゅ": "gyu", "ぎょ": "gyo",
    "じゃ": "ja", "じゅ": "ju", "じょ": "jo",
    "びゃ": "bya", "びゅ": "byu", "びょ": "byo",
    "ぴゃ": "pya", "ぴゅ": "pyu", "ぴょ": "pyo",
    "てぃ": "ti", "でぃ": "di", "ふぁ": "fa", "ふぃ": "fi", "ふぇ": "fe", "ふぉ": "fo",
    "うぃ": "wi", "うぇ": "we", "うぉ": "wo", "しぇ": "she", "ちぇ": "che", "じぇ": "je",
}


def katakana_to_hiragana(value: str) -> str:
    return "".join(chr(ord(char) - 0x60) if "ァ" <= char <= "ヶ" else char for char in value)


def romanize_segment(value: str) -> str:
    source = katakana_to_hiragana(value.strip())
    output: list[str] = []
    geminate = False
    index = 0
    while index < len(source):
        char = source[index]
        if char == "っ":
            geminate = True
            index += 1
            continue
        if char == "ー":
            if output:
                vowels = re.findall(r"[aeiou]", output[-1])
                if vowels:
                    output.append(vowels[-1])
            index += 1
            continue
        pair = source[index:index + 2]
        syllable = DIGRAPHS.get(pair)
        if syllable:
            index += 2
        else:
            syllable = BASIC.get(char, char)
            index += 1
        if geminate and syllable and syllable[0].isalpha():
            output.append("t" if syllable.startswith("ch") else syllable[0])
        output.append(syllable)
        geminate = False
    return "".join(output)


def romanize(value: str) -> str:
    parts = re.split(r"([/・,;、]|\s+)", value)
    converted: list[str] = []
    for part in parts:
        if not part:
            continue
        if re.fullmatch(r"[/・,;、]", part):
            converted.append(" / ")
        elif part.isspace():
            converted.append(" ")
        else:
            converted.append(romanize_segment(part))
    return re.sub(r"\s+", " ", "".join(converted)).strip(" /,;")


def table_columns(connection: sqlite3.Connection, table: str) -> set[str]:
    return {row[1] for row in connection.execute(f'PRAGMA table_info("{table}")')}


def redirect_item_id(connection: sqlite3.Connection, old_id: str, new_id: str) -> None:
    tables = [row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type='table'")]
    for table in tables:
        columns = table_columns(connection, table)
        for column in ("item_id", "vocabulary_id", "card_id"):
            if column in columns:
                connection.execute(f'UPDATE OR IGNORE "{table}" SET "{column}" = ? WHERE "{column}" = ?', (new_id, old_id))


def repair() -> None:
    connection = sqlite3.connect(DATABASE)
    try:
        connection.execute("BEGIN IMMEDIATE")
        for broken, repaired in THEME_REPAIRS.items():
            connection.execute("UPDATE canonical_vocabulary SET theme = ? WHERE theme = ?", (repaired, broken))

        for item_id, values in ROW_REPAIRS.items():
            assignments = ", ".join(f"{column} = ?" for column in values)
            connection.execute(
                f"UPDATE canonical_vocabulary SET {assignments} WHERE id = ?",
                (*values.values(), item_id),
            )

        for (kana, old_meaning), repaired_meaning in LEXICAL_REPAIRS.items():
            connection.execute(
                "UPDATE canonical_vocabulary SET meaning_fr = ? WHERE kana = ? AND meaning_fr = ?",
                (repaired_meaning, kana, old_meaning),
            )

        missing = connection.execute(
            "SELECT id, kana, japanese FROM canonical_vocabulary WHERE trim(coalesce(romaji, '')) = ''"
        ).fetchall()
        for item_id, kana, japanese in missing:
            source = (kana or japanese or "").strip()
            value = romanize(source)
            if value and not re.search(r"[ぁ-んァ-ヶ一-龯]", value):
                connection.execute("UPDATE canonical_vocabulary SET romaji = ? WHERE id = ?", (value, item_id))

        duplicates = connection.execute(
            """
            SELECT japanese, kana, meaning_fr, group_concat(id)
            FROM canonical_vocabulary
            GROUP BY japanese, kana, meaning_fr
            HAVING COUNT(*) > 1
            """
        ).fetchall()
        for _japanese, _kana, _meaning, ids_text in duplicates:
            ids = ids_text.split(",")
            keeper = sorted(ids, key=lambda value: ("?" in value, len(value), value))[0]
            for duplicate in ids:
                if duplicate == keeper:
                    continue
                redirect_item_id(connection, duplicate, keeper)
                connection.execute("DELETE FROM canonical_vocabulary WHERE id = ?", (duplicate,))

        connection.execute("PRAGMA optimize")
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


if __name__ == "__main__":
    repair()
    print("Vocabulary database repaired: themes, lexical fixes, romaji and strict duplicates.")

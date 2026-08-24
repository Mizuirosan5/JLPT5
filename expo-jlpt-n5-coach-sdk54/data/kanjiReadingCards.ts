export type KanjiReadingExample = {
  word: string;
  kana: string;
  romaji: string;
  meaningFr: string;
};

export type KanjiReadingGroup = {
  priority: number;
  kana: string;
  romaji: string;
  examples: KanjiReadingExample[];
};

export type KanjiReadingCard = {
  meaningFr: string;
  readings: KanjiReadingGroup[];
};

export const KANJI_READING_CARDS: Record<string, KanjiReadingCard> = {
  "日": {
    "meaningFr": "jour, soleil",
    "readings": [
      {
        "priority": 3,
        "kana": "ひ / -び",
        "romaji": "hi / -bi",
        "examples": [
          {
            "word": "日",
            "kana": "ひ",
            "romaji": "hi",
            "meaningFr": "jour"
          },
          {
            "word": "誕生日",
            "kana": "たんじょうび",
            "romaji": "tanjōbi",
            "meaningFr": "anniversaire"
          }
        ]
      },
      {
        "priority": 3,
        "kana": "にち",
        "romaji": "nichi",
        "examples": [
          {
            "word": "毎日",
            "kana": "まいにち",
            "romaji": "mainichi",
            "meaningFr": "tous les jours"
          },
          {
            "word": "日曜日",
            "kana": "にちようび",
            "romaji": "nichiyōbi",
            "meaningFr": "dimanche"
          }
        ]
      },
      {
        "priority": 2,
        "kana": "か",
        "romaji": "ka",
        "examples": [
          {
            "word": "三日",
            "kana": "みっか",
            "romaji": "mikka",
            "meaningFr": "trois jours/le 3"
          },
          {
            "word": "七日",
            "kana": "なのか",
            "romaji": "nanoka",
            "meaningFr": "sept jours/le 7"
          }
        ]
      }
    ]
  },
  "一": {
    "meaningFr": "un",
    "readings": [
      {
        "priority": 3,
        "kana": "いち",
        "romaji": "ichi",
        "examples": [
          {
            "word": "一時",
            "kana": "いちじ",
            "romaji": "ichiji",
            "meaningFr": "une heure"
          },
          {
            "word": "一年",
            "kana": "いちねん",
            "romaji": "ichinen",
            "meaningFr": "un an"
          }
        ]
      },
      {
        "priority": 3,
        "kana": "ひとつ",
        "romaji": "hitotsu",
        "examples": [
          {
            "word": "一つ",
            "kana": "ひとつ",
            "romaji": "hitotsu",
            "meaningFr": "une chose"
          }
        ]
      }
    ]
  },
  "国": {
    "meaningFr": "pays",
    "readings": [
      {
        "priority": 3,
        "kana": "くに",
        "romaji": "kuni",
        "examples": [
          {
            "word": "国",
            "kana": "くに",
            "romaji": "kuni",
            "meaningFr": "pays"
          }
        ]
      },
      {
        "priority": 3,
        "kana": "こく",
        "romaji": "koku",
        "examples": [
          {
            "word": "外国",
            "kana": "がいこく",
            "romaji": "gaikoku",
            "meaningFr": "étranger"
          },
          {
            "word": "中国",
            "kana": "ちゅうごく",
            "romaji": "chūgoku",
            "meaningFr": "Chine"
          }
        ]
      }
    ]
  },
  "人": {
    "meaningFr": "personne",
    "readings": [
      {
        "priority": 3,
        "kana": "ひと",
        "romaji": "hito",
        "examples": [
          {
            "word": "人",
            "kana": "ひと",
            "romaji": "hito",
            "meaningFr": "personne"
          }
        ]
      },
      {
        "priority": 3,
        "kana": "じん",
        "romaji": "jin",
        "examples": [
          {
            "word": "日本人",
            "kana": "にほんじん",
            "romaji": "nihonjin",
            "meaningFr": "Japonais"
          },
          {
            "word": "外国人",
            "kana": "がいこくじん",
            "romaji": "gaikokujin",
            "meaningFr": "étranger"
          }
        ]
      },
      {
        "priority": 3,
        "kana": "にん",
        "romaji": "nin",
        "examples": [
          {
            "word": "三人",
            "kana": "さんにん",
            "romaji": "sannin",
            "meaningFr": "trois personnes"
          }
        ]
      }
    ]
  },
  "年": {
    "meaningFr": "année",
    "readings": [
      {
        "priority": 3,
        "kana": "ねん",
        "romaji": "nen",
        "examples": [
          {
            "word": "一年",
            "kana": "いちねん",
            "romaji": "ichinen",
            "meaningFr": "un an"
          },
          {
            "word": "来年",
            "kana": "らいねん",
            "romaji": "rainen",
            "meaningFr": "année prochaine"
          }
        ]
      },
      {
        "priority": 2,
        "kana": "とし",
        "romaji": "toshi",
        "examples": [
          {
            "word": "年",
            "kana": "とし",
            "romaji": "toshi",
            "meaningFr": "année"
          },
          {
            "word": "今年",
            "kana": "ことし",
            "romaji": "kotoshi",
            "meaningFr": "cette année"
          }
        ]
      }
    ]
  },
  "大": {
    "meaningFr": "grand",
    "readings": [
      {
        "priority": 3,
        "kana": "おおきい",
        "romaji": "ōkii",
        "examples": [
          {
            "word": "大きい",
            "kana": "おおきい",
            "romaji": "ōkii",
            "meaningFr": "grand"
          }
        ]
      },
      {
        "priority": 3,
        "kana": "だい",
        "romaji": "dai",
        "examples": [
          {
            "word": "大学",
            "kana": "だいがく",
            "romaji": "daigaku",
            "meaningFr": "université"
          },
          {
            "word": "大丈夫",
            "kana": "だいじょうぶ",
            "romaji": "daijōbu",
            "meaningFr": "ça va"
          }
        ]
      }
    ]
  },
  "十": {
    "meaningFr": "dix",
    "readings": [
      {
        "priority": 3,
        "kana": "じゅう",
        "romaji": "jū",
        "examples": [
          {
            "word": "十",
            "kana": "じゅう",
            "romaji": "jū",
            "meaningFr": "dix"
          },
          {
            "word": "十時",
            "kana": "じゅうじ",
            "romaji": "jūji",
            "meaningFr": "dix heures"
          }
        ]
      },
      {
        "priority": 2,
        "kana": "とお",
        "romaji": "tō",
        "examples": [
          {
            "word": "十",
            "kana": "とお",
            "romaji": "tō",
            "meaningFr": "dix choses (forme traditionnelle)"
          }
        ]
      }
    ]
  },
  "二": {
    "meaningFr": "deux",
    "readings": [
      {
        "priority": 3,
        "kana": "に",
        "romaji": "ni",
        "examples": [
          {
            "word": "二時",
            "kana": "にじ",
            "romaji": "niji",
            "meaningFr": "deux heures"
          },
          {
            "word": "二月",
            "kana": "にがつ",
            "romaji": "nigatsu",
            "meaningFr": "février"
          }
        ]
      },
      {
        "priority": 3,
        "kana": "ふたつ",
        "romaji": "futatsu",
        "examples": [
          {
            "word": "二つ",
            "kana": "ふたつ",
            "romaji": "futatsu",
            "meaningFr": "deux choses"
          }
        ]
      }
    ]
  },
  "本": {
    "meaningFr": "livre; compteur objets longs",
    "readings": [
      {
        "priority": 3,
        "kana": "ほん / ぼん / ぽん",
        "romaji": "hon / bon / pon",
        "examples": [
          {
            "word": "本",
            "kana": "ほん",
            "romaji": "hon",
            "meaningFr": "livre"
          },
          {
            "word": "一本",
            "kana": "いっぽん",
            "romaji": "ippon",
            "meaningFr": "un objet long"
          },
          {
            "word": "三本",
            "kana": "さんぼん",
            "romaji": "sanbon",
            "meaningFr": "trois"
          }
        ]
      }
    ]
  },
  "中": {
    "meaningFr": "dedans, milieu",
    "readings": [
      {
        "priority": 3,
        "kana": "なか",
        "romaji": "naka",
        "examples": [
          {
            "word": "中",
            "kana": "なか",
            "romaji": "naka",
            "meaningFr": "intérieur"
          },
          {
            "word": "家の中",
            "kana": "いえのなか",
            "romaji": "ienonaka",
            "meaningFr": "dans la maison"
          }
        ]
      },
      {
        "priority": 3,
        "kana": "ちゅう",
        "romaji": "chū",
        "examples": [
          {
            "word": "中国",
            "kana": "ちゅうごく",
            "romaji": "chūgoku",
            "meaningFr": "Chine"
          },
          {
            "word": "午前中",
            "kana": "ごぜんちゅう",
            "romaji": "gozenchū",
            "meaningFr": "dans la matinée"
          }
        ]
      }
    ]
  },
  "長": {
    "meaningFr": "long",
    "readings": [
      {
        "priority": 3,
        "kana": "ながい",
        "romaji": "nagai",
        "examples": [
          {
            "word": "長い",
            "kana": "ながい",
            "romaji": "nagai",
            "meaningFr": "long"
          }
        ]
      },
      {
        "priority": 2,
        "kana": "ちょう",
        "romaji": "chō",
        "examples": [
          {
            "word": "校長",
            "kana": "こうちょう",
            "romaji": "kōchō",
            "meaningFr": "directeur d’école"
          }
        ]
      }
    ]
  },
  "出": {
    "meaningFr": "sortir",
    "readings": [
      {
        "priority": 3,
        "kana": "でる",
        "romaji": "deru",
        "examples": [
          {
            "word": "出る",
            "kana": "でる",
            "romaji": "deru",
            "meaningFr": "sortir"
          }
        ]
      },
      {
        "priority": 3,
        "kana": "だす",
        "romaji": "dasu",
        "examples": [
          {
            "word": "出す",
            "kana": "だす",
            "romaji": "dasu",
            "meaningFr": "sortir / envoyer / remettre"
          }
        ]
      }
    ]
  },
  "三": {
    "meaningFr": "trois",
    "readings": [
      {
        "priority": 3,
        "kana": "さん",
        "romaji": "san",
        "examples": [
          {
            "word": "三時",
            "kana": "さんじ",
            "romaji": "sanji",
            "meaningFr": "trois heures"
          },
          {
            "word": "三人",
            "kana": "さんにん",
            "romaji": "sannin",
            "meaningFr": "trois personnes"
          }
        ]
      },
      {
        "priority": 3,
        "kana": "みっつ",
        "romaji": "mittsu",
        "examples": [
          {
            "word": "三つ",
            "kana": "みっつ",
            "romaji": "mittsu",
            "meaningFr": "trois choses"
          }
        ]
      }
    ]
  },
  "時": {
    "meaningFr": "heure, temps",
    "readings": [
      {
        "priority": 3,
        "kana": "じ",
        "romaji": "ji",
        "examples": [
          {
            "word": "一時",
            "kana": "いちじ",
            "romaji": "ichiji",
            "meaningFr": "une heure"
          },
          {
            "word": "七時",
            "kana": "しちじ",
            "romaji": "shichiji",
            "meaningFr": "sept heures"
          }
        ]
      },
      {
        "priority": 3,
        "kana": "とき",
        "romaji": "toki",
        "examples": [
          {
            "word": "時",
            "kana": "とき",
            "romaji": "toki",
            "meaningFr": "moment / quand"
          }
        ]
      }
    ]
  },
  "行": {
    "meaningFr": "aller",
    "readings": [
      {
        "priority": 3,
        "kana": "いく",
        "romaji": "iku",
        "examples": [
          {
            "word": "行く",
            "kana": "いく",
            "romaji": "iku",
            "meaningFr": "aller"
          }
        ]
      },
      {
        "priority": 2,
        "kana": "こう",
        "romaji": "kō",
        "examples": [
          {
            "word": "銀行",
            "kana": "ぎんこう",
            "romaji": "ginkō",
            "meaningFr": "banque"
          },
          {
            "word": "旅行",
            "kana": "りょこう",
            "romaji": "ryokō",
            "meaningFr": "voyage"
          }
        ]
      }
    ]
  },
  "見": {
    "meaningFr": "voir, regarder",
    "readings": [
      {
        "priority": 3,
        "kana": "みる",
        "romaji": "miru",
        "examples": [
          {
            "word": "見る",
            "kana": "みる",
            "romaji": "miru",
            "meaningFr": "voir / regarder"
          }
        ]
      },
      {
        "priority": 2,
        "kana": "みせる",
        "romaji": "miseru",
        "examples": [
          {
            "word": "見せる",
            "kana": "みせる",
            "romaji": "miseru",
            "meaningFr": "montrer"
          }
        ]
      }
    ]
  },
  "月": {
    "meaningFr": "mois, lune",
    "readings": [
      {
        "priority": 3,
        "kana": "つき",
        "romaji": "tsuki",
        "examples": [
          {
            "word": "月",
            "kana": "つき",
            "romaji": "tsuki",
            "meaningFr": "lune"
          }
        ]
      },
      {
        "priority": 3,
        "kana": "がつ",
        "romaji": "gatsu",
        "examples": [
          {
            "word": "一月",
            "kana": "いちがつ",
            "romaji": "ichigatsu",
            "meaningFr": "janvier"
          },
          {
            "word": "五月",
            "kana": "ごがつ",
            "romaji": "gogatsu",
            "meaningFr": "mai"
          }
        ]
      },
      {
        "priority": 3,
        "kana": "げつ",
        "romaji": "getsu",
        "examples": [
          {
            "word": "月曜日",
            "kana": "げつようび",
            "romaji": "getsuyōbi",
            "meaningFr": "lundi"
          },
          {
            "word": "来月",
            "kana": "らいげつ",
            "romaji": "raigetsu",
            "meaningFr": "mois prochain"
          }
        ]
      }
    ]
  },
  "分": {
    "meaningFr": "minute, partie, comprendre",
    "readings": [
      {
        "priority": 3,
        "kana": "ふん / ぷん",
        "romaji": "fun / pun",
        "examples": [
          {
            "word": "五分",
            "kana": "ごふん",
            "romaji": "gofun",
            "meaningFr": "cinq minutes"
          },
          {
            "word": "十分",
            "kana": "じゅっぷん",
            "romaji": "juppun",
            "meaningFr": "dix minutes"
          }
        ]
      },
      {
        "priority": 3,
        "kana": "わかる",
        "romaji": "wakaru",
        "examples": [
          {
            "word": "分かる",
            "kana": "わかる",
            "romaji": "wakaru",
            "meaningFr": "comprendre"
          }
        ]
      },
      {
        "priority": 2,
        "kana": "ぶん",
        "romaji": "bun",
        "examples": [
          {
            "word": "半分",
            "kana": "はんぶん",
            "romaji": "hanbun",
            "meaningFr": "moitié"
          }
        ]
      }
    ]
  },
  "後": {
    "meaningFr": "après, derrière",
    "readings": [
      {
        "priority": 3,
        "kana": "あと",
        "romaji": "ato",
        "examples": [
          {
            "word": "後",
            "kana": "あと",
            "romaji": "ato",
            "meaningFr": "après"
          }
        ]
      },
      {
        "priority": 3,
        "kana": "うしろ",
        "romaji": "ushiro",
        "examples": [
          {
            "word": "後ろ",
            "kana": "うしろ",
            "romaji": "ushiro",
            "meaningFr": "derrière"
          }
        ]
      },
      {
        "priority": 3,
        "kana": "ご",
        "romaji": "go",
        "examples": [
          {
            "word": "午後",
            "kana": "ごご",
            "romaji": "gogo",
            "meaningFr": "après-midi"
          }
        ]
      }
    ]
  },
  "前": {
    "meaningFr": "avant, devant",
    "readings": [
      {
        "priority": 3,
        "kana": "まえ",
        "romaji": "mae",
        "examples": [
          {
            "word": "前",
            "kana": "まえ",
            "romaji": "mae",
            "meaningFr": "devant / avant"
          }
        ]
      },
      {
        "priority": 3,
        "kana": "ぜん",
        "romaji": "zen",
        "examples": [
          {
            "word": "午前",
            "kana": "ごぜん",
            "romaji": "gozen",
            "meaningFr": "matin / AM"
          }
        ]
      }
    ]
  },
  "生": {
    "meaningFr": "vie, naissance",
    "readings": [
      {
        "priority": 3,
        "kana": "せい",
        "romaji": "sei",
        "examples": [
          {
            "word": "学生",
            "kana": "がくせい",
            "romaji": "gakusei",
            "meaningFr": "étudiant"
          },
          {
            "word": "先生",
            "kana": "せんせい",
            "romaji": "sensei",
            "meaningFr": "professeur"
          }
        ]
      },
      {
        "priority": 2,
        "kana": "うまれる",
        "romaji": "umareru",
        "examples": [
          {
            "word": "生まれる",
            "kana": "うまれる",
            "romaji": "umareru",
            "meaningFr": "naître"
          }
        ]
      },
      {
        "priority": 2,
        "kana": "なま",
        "romaji": "nama",
        "examples": [
          {
            "word": "生",
            "kana": "なま",
            "romaji": "nama",
            "meaningFr": "cru / frais"
          }
        ]
      }
    ]
  },
  "五": {
    "meaningFr": "cinq",
    "readings": [
      {
        "priority": 3,
        "kana": "ご",
        "romaji": "go",
        "examples": [
          {
            "word": "五時",
            "kana": "ごじ",
            "romaji": "goji",
            "meaningFr": "cinq heures"
          },
          {
            "word": "五月",
            "kana": "ごがつ",
            "romaji": "gogatsu",
            "meaningFr": "mai"
          }
        ]
      },
      {
        "priority": 3,
        "kana": "いつつ",
        "romaji": "itsutsu",
        "examples": [
          {
            "word": "五つ",
            "kana": "いつつ",
            "romaji": "itsutsu",
            "meaningFr": "cinq choses"
          }
        ]
      }
    ]
  },
  "間": {
    "meaningFr": "intervalle, entre",
    "readings": [
      {
        "priority": 3,
        "kana": "あいだ",
        "romaji": "aida",
        "examples": [
          {
            "word": "間",
            "kana": "あいだ",
            "romaji": "aida",
            "meaningFr": "entre / pendant"
          }
        ]
      },
      {
        "priority": 3,
        "kana": "かん",
        "romaji": "kan",
        "examples": [
          {
            "word": "時間",
            "kana": "じかん",
            "romaji": "jikan",
            "meaningFr": "temps"
          },
          {
            "word": "一時間",
            "kana": "いちじかん",
            "romaji": "ichijikan",
            "meaningFr": "une heure"
          }
        ]
      }
    ]
  },
  "上": {
    "meaningFr": "dessus, monter",
    "readings": [
      {
        "priority": 3,
        "kana": "うえ",
        "romaji": "ue",
        "examples": [
          {
            "word": "上",
            "kana": "うえ",
            "romaji": "ue",
            "meaningFr": "dessus"
          }
        ]
      },
      {
        "priority": 3,
        "kana": "あげる / あがる",
        "romaji": "ageru / agaru",
        "examples": [
          {
            "word": "上げる",
            "kana": "あげる",
            "romaji": "ageru",
            "meaningFr": "lever"
          },
          {
            "word": "上がる",
            "kana": "あがる",
            "romaji": "agaru",
            "meaningFr": "monter"
          }
        ]
      },
      {
        "priority": 2,
        "kana": "じょう",
        "romaji": "jō",
        "examples": [
          {
            "word": "上手",
            "kana": "じょうず",
            "romaji": "jōzu",
            "meaningFr": "habile"
          }
        ]
      }
    ]
  },
  "東": {
    "meaningFr": "est",
    "readings": [
      {
        "priority": 3,
        "kana": "ひがし",
        "romaji": "higashi",
        "examples": [
          {
            "word": "東",
            "kana": "ひがし",
            "romaji": "higashi",
            "meaningFr": "est"
          }
        ]
      },
      {
        "priority": 2,
        "kana": "とう",
        "romaji": "tō",
        "examples": [
          {
            "word": "東京",
            "kana": "とうきょう",
            "romaji": "tōkyō",
            "meaningFr": "Tokyo"
          }
        ]
      }
    ]
  },
  "四": {
    "meaningFr": "quatre",
    "readings": [
      {
        "priority": 3,
        "kana": "よん",
        "romaji": "yon",
        "examples": [
          {
            "word": "四人",
            "kana": "よにん",
            "romaji": "yonin",
            "meaningFr": "quatre personnes"
          },
          {
            "word": "四時",
            "kana": "よじ",
            "romaji": "yoji",
            "meaningFr": "quatre heures"
          }
        ]
      },
      {
        "priority": 2,
        "kana": "し",
        "romaji": "shi",
        "examples": [
          {
            "word": "四月",
            "kana": "しがつ",
            "romaji": "shigatsu",
            "meaningFr": "avril"
          }
        ]
      },
      {
        "priority": 3,
        "kana": "よっつ",
        "romaji": "yottsu",
        "examples": [
          {
            "word": "四つ",
            "kana": "よっつ",
            "romaji": "yottsu",
            "meaningFr": "quatre choses"
          }
        ]
      }
    ]
  },
  "今": {
    "meaningFr": "maintenant",
    "readings": [
      {
        "priority": 3,
        "kana": "いま",
        "romaji": "ima",
        "examples": [
          {
            "word": "今",
            "kana": "いま",
            "romaji": "ima",
            "meaningFr": "maintenant"
          }
        ]
      },
      {
        "priority": 3,
        "kana": "こん",
        "romaji": "kon",
        "examples": [
          {
            "word": "今月",
            "kana": "こんげつ",
            "romaji": "kongetsu",
            "meaningFr": "ce mois-ci"
          }
        ]
      }
    ]
  },
  "金": {
    "meaningFr": "or, argent",
    "readings": [
      {
        "priority": 3,
        "kana": "かね / おかね",
        "romaji": "kane / okane",
        "examples": [
          {
            "word": "お金",
            "kana": "おかね",
            "romaji": "okane",
            "meaningFr": "argent"
          }
        ]
      },
      {
        "priority": 3,
        "kana": "きん",
        "romaji": "kin",
        "examples": [
          {
            "word": "金曜日",
            "kana": "きんようび",
            "romaji": "kinyōbi",
            "meaningFr": "vendredi"
          }
        ]
      }
    ]
  },
  "九": {
    "meaningFr": "neuf",
    "readings": [
      {
        "priority": 3,
        "kana": "きゅう / く",
        "romaji": "kyū / ku",
        "examples": [
          {
            "word": "九時",
            "kana": "くじ",
            "romaji": "kuji",
            "meaningFr": "neuf heures"
          },
          {
            "word": "九人",
            "kana": "きゅうにん",
            "romaji": "kyūnin",
            "meaningFr": "neuf personnes"
          }
        ]
      },
      {
        "priority": 3,
        "kana": "ここのつ",
        "romaji": "kokonotsu",
        "examples": [
          {
            "word": "九つ",
            "kana": "ここのつ",
            "romaji": "kokonotsu",
            "meaningFr": "neuf choses"
          }
        ]
      }
    ]
  },
  "入": {
    "meaningFr": "entrer, mettre dedans",
    "readings": [
      {
        "priority": 3,
        "kana": "はいる",
        "romaji": "hairu",
        "examples": [
          {
            "word": "入る",
            "kana": "はいる",
            "romaji": "hairu",
            "meaningFr": "entrer"
          }
        ]
      },
      {
        "priority": 3,
        "kana": "いれる",
        "romaji": "ireru",
        "examples": [
          {
            "word": "入れる",
            "kana": "いれる",
            "romaji": "ireru",
            "meaningFr": "mettre / insérer"
          }
        ]
      }
    ]
  },
  "学": {
    "meaningFr": "étudier",
    "readings": [
      {
        "priority": 3,
        "kana": "がく",
        "romaji": "gaku",
        "examples": [
          {
            "word": "学生",
            "kana": "がくせい",
            "romaji": "gakusei",
            "meaningFr": "étudiant"
          },
          {
            "word": "学校",
            "kana": "がっこう",
            "romaji": "gakkō",
            "meaningFr": "école"
          }
        ]
      },
      {
        "priority": 2,
        "kana": "まなぶ",
        "romaji": "manabu",
        "examples": [
          {
            "word": "学ぶ",
            "kana": "まなぶ",
            "romaji": "manabu",
            "meaningFr": "apprendre"
          }
        ]
      }
    ]
  },
  "高": {
    "meaningFr": "haut, cher",
    "readings": [
      {
        "priority": 3,
        "kana": "たかい",
        "romaji": "takai",
        "examples": [
          {
            "word": "高い",
            "kana": "たかい",
            "romaji": "takai",
            "meaningFr": "haut / cher"
          }
        ]
      },
      {
        "priority": 2,
        "kana": "こう",
        "romaji": "kō",
        "examples": [
          {
            "word": "高校",
            "kana": "こうこう",
            "romaji": "kōkō",
            "meaningFr": "lycée"
          }
        ]
      }
    ]
  },
  "円": {
    "meaningFr": "yen, rond",
    "readings": [
      {
        "priority": 3,
        "kana": "えん",
        "romaji": "en",
        "examples": [
          {
            "word": "百円",
            "kana": "ひゃくえん",
            "romaji": "hyakuen",
            "meaningFr": "100 yens"
          }
        ]
      },
      {
        "priority": 2,
        "kana": "まるい",
        "romaji": "marui",
        "examples": [
          {
            "word": "円い",
            "kana": "まるい",
            "romaji": "marui",
            "meaningFr": "rond"
          }
        ]
      }
    ]
  },
  "子": {
    "meaningFr": "enfant",
    "readings": [
      {
        "priority": 3,
        "kana": "こ",
        "romaji": "ko",
        "examples": [
          {
            "word": "子ども",
            "kana": "こども",
            "romaji": "kodomo",
            "meaningFr": "enfant"
          },
          {
            "word": "女の子",
            "kana": "おんなのこ",
            "romaji": "onnanoko",
            "meaningFr": "fille"
          }
        ]
      },
      {
        "priority": 2,
        "kana": "し",
        "romaji": "shi",
        "examples": [
          {
            "word": "帽子",
            "kana": "ぼうし",
            "romaji": "bōshi",
            "meaningFr": "chapeau"
          }
        ]
      }
    ]
  },
  "外": {
    "meaningFr": "dehors, extérieur",
    "readings": [
      {
        "priority": 3,
        "kana": "そと",
        "romaji": "soto",
        "examples": [
          {
            "word": "外",
            "kana": "そと",
            "romaji": "soto",
            "meaningFr": "dehors"
          }
        ]
      },
      {
        "priority": 3,
        "kana": "がい",
        "romaji": "gai",
        "examples": [
          {
            "word": "外国",
            "kana": "がいこく",
            "romaji": "gaikoku",
            "meaningFr": "pays étranger"
          },
          {
            "word": "外国人",
            "kana": "がいこくじん",
            "romaji": "gaikokujin",
            "meaningFr": "étranger"
          }
        ]
      }
    ]
  },
  "八": {
    "meaningFr": "huit",
    "readings": [
      {
        "priority": 3,
        "kana": "はち",
        "romaji": "hachi",
        "examples": [
          {
            "word": "八時",
            "kana": "はちじ",
            "romaji": "hachiji",
            "meaningFr": "huit heures"
          },
          {
            "word": "八月",
            "kana": "はちがつ",
            "romaji": "hachigatsu",
            "meaningFr": "août"
          }
        ]
      },
      {
        "priority": 3,
        "kana": "やっつ",
        "romaji": "yattsu",
        "examples": [
          {
            "word": "八つ",
            "kana": "やっつ",
            "romaji": "yattsu",
            "meaningFr": "huit choses"
          }
        ]
      }
    ]
  },
  "六": {
    "meaningFr": "six",
    "readings": [
      {
        "priority": 3,
        "kana": "ろく",
        "romaji": "roku",
        "examples": [
          {
            "word": "六時",
            "kana": "ろくじ",
            "romaji": "rokuji",
            "meaningFr": "six heures"
          },
          {
            "word": "六月",
            "kana": "ろくがつ",
            "romaji": "rokugatsu",
            "meaningFr": "juin"
          }
        ]
      },
      {
        "priority": 3,
        "kana": "むっつ",
        "romaji": "muttsu",
        "examples": [
          {
            "word": "六つ",
            "kana": "むっつ",
            "romaji": "muttsu",
            "meaningFr": "six choses"
          }
        ]
      }
    ]
  },
  "下": {
    "meaningFr": "dessous, descendre",
    "readings": [
      {
        "priority": 3,
        "kana": "した",
        "romaji": "shita",
        "examples": [
          {
            "word": "下",
            "kana": "した",
            "romaji": "shita",
            "meaningFr": "dessous"
          }
        ]
      },
      {
        "priority": 3,
        "kana": "さげる",
        "romaji": "sageru",
        "examples": [
          {
            "word": "下げる",
            "kana": "さげる",
            "romaji": "sageru",
            "meaningFr": "baisser"
          }
        ]
      },
      {
        "priority": 3,
        "kana": "ください",
        "romaji": "kudasai",
        "examples": [
          {
            "word": "下さい",
            "kana": "ください",
            "romaji": "kudasai",
            "meaningFr": "s’il vous plaît"
          }
        ]
      }
    ]
  },
  "来": {
    "meaningFr": "venir",
    "readings": [
      {
        "priority": 3,
        "kana": "くる",
        "romaji": "kuru",
        "examples": [
          {
            "word": "来る",
            "kana": "くる",
            "romaji": "kuru",
            "meaningFr": "venir"
          }
        ]
      },
      {
        "priority": 3,
        "kana": "らい",
        "romaji": "rai",
        "examples": [
          {
            "word": "来年",
            "kana": "らいねん",
            "romaji": "rainen",
            "meaningFr": "année prochaine"
          },
          {
            "word": "来月",
            "kana": "らいげつ",
            "romaji": "raigetsu",
            "meaningFr": "mois prochain"
          }
        ]
      }
    ]
  },
  "気": {
    "meaningFr": "esprit, humeur, météo",
    "readings": [
      {
        "priority": 3,
        "kana": "き",
        "romaji": "ki",
        "examples": [
          {
            "word": "元気",
            "kana": "げんき",
            "romaji": "genki",
            "meaningFr": "en forme"
          },
          {
            "word": "天気",
            "kana": "てんき",
            "romaji": "tenki",
            "meaningFr": "météo"
          }
        ]
      }
    ]
  },
  "小": {
    "meaningFr": "petit",
    "readings": [
      {
        "priority": 3,
        "kana": "ちいさい",
        "romaji": "chiisai",
        "examples": [
          {
            "word": "小さい",
            "kana": "ちいさい",
            "romaji": "chiisai",
            "meaningFr": "petit"
          }
        ]
      },
      {
        "priority": 3,
        "kana": "しょう",
        "romaji": "shō",
        "examples": [
          {
            "word": "小学校",
            "kana": "しょうがっこう",
            "romaji": "shōgakkō",
            "meaningFr": "école primaire"
          }
        ]
      }
    ]
  },
  "七": {
    "meaningFr": "sept",
    "readings": [
      {
        "priority": 3,
        "kana": "なな",
        "romaji": "nana",
        "examples": [
          {
            "word": "七人",
            "kana": "ななにん",
            "romaji": "nananin",
            "meaningFr": "sept personnes"
          },
          {
            "word": "七つ",
            "kana": "ななつ",
            "romaji": "nanatsu",
            "meaningFr": "sept choses"
          }
        ]
      },
      {
        "priority": 3,
        "kana": "しち",
        "romaji": "shichi",
        "examples": [
          {
            "word": "七時",
            "kana": "しちじ",
            "romaji": "shichiji",
            "meaningFr": "sept heures"
          },
          {
            "word": "七月",
            "kana": "しちがつ",
            "romaji": "shichigatsu",
            "meaningFr": "juillet"
          }
        ]
      },
      {
        "priority": 2,
        "kana": "なの",
        "romaji": "nano",
        "examples": [
          {
            "word": "七日",
            "kana": "なのか",
            "romaji": "nanoka",
            "meaningFr": "le 7 / sept jours"
          }
        ]
      }
    ]
  },
  "山": {
    "meaningFr": "montagne",
    "readings": [
      {
        "priority": 3,
        "kana": "やま",
        "romaji": "yama",
        "examples": [
          {
            "word": "山",
            "kana": "やま",
            "romaji": "yama",
            "meaningFr": "montagne"
          }
        ]
      },
      {
        "priority": 2,
        "kana": "さん",
        "romaji": "san",
        "examples": [
          {
            "word": "富士山",
            "kana": "ふじさん",
            "romaji": "fujisan",
            "meaningFr": "mont Fuji"
          }
        ]
      }
    ]
  },
  "話": {
    "meaningFr": "parler, histoire",
    "readings": [
      {
        "priority": 3,
        "kana": "はなす",
        "romaji": "hanasu",
        "examples": [
          {
            "word": "話す",
            "kana": "はなす",
            "romaji": "hanasu",
            "meaningFr": "parler"
          }
        ]
      },
      {
        "priority": 3,
        "kana": "はなし",
        "romaji": "hanashi",
        "examples": [
          {
            "word": "話",
            "kana": "はなし",
            "romaji": "hanashi",
            "meaningFr": "histoire / conversation"
          }
        ]
      },
      {
        "priority": 2,
        "kana": "わ",
        "romaji": "wa",
        "examples": [
          {
            "word": "電話",
            "kana": "でんわ",
            "romaji": "denwa",
            "meaningFr": "téléphone"
          }
        ]
      }
    ]
  },
  "女": {
    "meaningFr": "femme",
    "readings": [
      {
        "priority": 3,
        "kana": "おんな",
        "romaji": "onna",
        "examples": [
          {
            "word": "女",
            "kana": "おんな",
            "romaji": "onna",
            "meaningFr": "femme"
          },
          {
            "word": "女の人",
            "kana": "おんなのひと",
            "romaji": "onnanohito",
            "meaningFr": "femme"
          }
        ]
      }
    ]
  },
  "北": {
    "meaningFr": "nord",
    "readings": [
      {
        "priority": 3,
        "kana": "きた",
        "romaji": "kita",
        "examples": [
          {
            "word": "北",
            "kana": "きた",
            "romaji": "kita",
            "meaningFr": "nord"
          }
        ]
      },
      {
        "priority": 2,
        "kana": "ほく",
        "romaji": "hoku",
        "examples": [
          {
            "word": "北海道",
            "kana": "ほっかいどう",
            "romaji": "hokkaidō",
            "meaningFr": "Hokkaidō"
          }
        ]
      }
    ]
  },
  "午": {
    "meaningFr": "midi",
    "readings": [
      {
        "priority": 3,
        "kana": "ご",
        "romaji": "go",
        "examples": [
          {
            "word": "午前",
            "kana": "ごぜん",
            "romaji": "gozen",
            "meaningFr": "matin/AM"
          },
          {
            "word": "午後",
            "kana": "ごご",
            "romaji": "gogo",
            "meaningFr": "après-midi/PM"
          }
        ]
      }
    ]
  },
  "百": {
    "meaningFr": "cent",
    "readings": [
      {
        "priority": 3,
        "kana": "ひゃく / びゃく / ぴゃく",
        "romaji": "hyaku / byaku / pyaku",
        "examples": [
          {
            "word": "百円",
            "kana": "ひゃくえん",
            "romaji": "hyakuen",
            "meaningFr": "100 yens"
          },
          {
            "word": "三百",
            "kana": "さんびゃく",
            "romaji": "sanbyaku",
            "meaningFr": "300"
          }
        ]
      }
    ]
  },
  "書": {
    "meaningFr": "écrire",
    "readings": [
      {
        "priority": 3,
        "kana": "かく",
        "romaji": "kaku",
        "examples": [
          {
            "word": "書く",
            "kana": "かく",
            "romaji": "kaku",
            "meaningFr": "écrire"
          }
        ]
      },
      {
        "priority": 2,
        "kana": "しょ",
        "romaji": "sho",
        "examples": [
          {
            "word": "図書館",
            "kana": "としょかん",
            "romaji": "toshokan",
            "meaningFr": "bibliothèque"
          }
        ]
      }
    ]
  },
  "先": {
    "meaningFr": "avant, précédent",
    "readings": [
      {
        "priority": 3,
        "kana": "せん",
        "romaji": "sen",
        "examples": [
          {
            "word": "先生",
            "kana": "せんせい",
            "romaji": "sensei",
            "meaningFr": "professeur"
          },
          {
            "word": "先週",
            "kana": "せんしゅう",
            "romaji": "senshū",
            "meaningFr": "semaine dernière"
          }
        ]
      },
      {
        "priority": 2,
        "kana": "さき",
        "romaji": "saki",
        "examples": [
          {
            "word": "先",
            "kana": "さき",
            "romaji": "saki",
            "meaningFr": "avant / devant"
          }
        ]
      }
    ]
  },
  "名": {
    "meaningFr": "nom",
    "readings": [
      {
        "priority": 3,
        "kana": "な",
        "romaji": "na",
        "examples": [
          {
            "word": "名前",
            "kana": "なまえ",
            "romaji": "namae",
            "meaningFr": "nom"
          }
        ]
      },
      {
        "priority": 2,
        "kana": "めい",
        "romaji": "mei",
        "examples": [
          {
            "word": "有名",
            "kana": "ゆうめい",
            "romaji": "yūmei",
            "meaningFr": "célèbre"
          }
        ]
      }
    ]
  },
  "川": {
    "meaningFr": "rivière",
    "readings": [
      {
        "priority": 3,
        "kana": "かわ",
        "romaji": "kawa",
        "examples": [
          {
            "word": "川",
            "kana": "かわ",
            "romaji": "kawa",
            "meaningFr": "rivière"
          }
        ]
      }
    ]
  },
  "千": {
    "meaningFr": "mille",
    "readings": [
      {
        "priority": 3,
        "kana": "せん",
        "romaji": "sen",
        "examples": [
          {
            "word": "千円",
            "kana": "せんえん",
            "romaji": "senen",
            "meaningFr": "1000 yens"
          }
        ]
      }
    ]
  },
  "水": {
    "meaningFr": "eau",
    "readings": [
      {
        "priority": 3,
        "kana": "みず",
        "romaji": "mizu",
        "examples": [
          {
            "word": "水",
            "kana": "みず",
            "romaji": "mizu",
            "meaningFr": "eau"
          }
        ]
      },
      {
        "priority": 3,
        "kana": "すい",
        "romaji": "sui",
        "examples": [
          {
            "word": "水曜日",
            "kana": "すいようび",
            "romaji": "suiyōbi",
            "meaningFr": "mercredi"
          }
        ]
      }
    ]
  },
  "半": {
    "meaningFr": "moitié, demi",
    "readings": [
      {
        "priority": 3,
        "kana": "はん",
        "romaji": "han",
        "examples": [
          {
            "word": "半分",
            "kana": "はんぶん",
            "romaji": "hanbun",
            "meaningFr": "moitié"
          },
          {
            "word": "三時半",
            "kana": "さんじはん",
            "romaji": "sanjihan",
            "meaningFr": "3 h 30"
          }
        ]
      }
    ]
  },
  "男": {
    "meaningFr": "homme",
    "readings": [
      {
        "priority": 3,
        "kana": "おとこ",
        "romaji": "otoko",
        "examples": [
          {
            "word": "男",
            "kana": "おとこ",
            "romaji": "otoko",
            "meaningFr": "homme"
          },
          {
            "word": "男の人",
            "kana": "おとこのひと",
            "romaji": "otokonohito",
            "meaningFr": "homme"
          }
        ]
      }
    ]
  },
  "西": {
    "meaningFr": "ouest",
    "readings": [
      {
        "priority": 3,
        "kana": "にし",
        "romaji": "nishi",
        "examples": [
          {
            "word": "西",
            "kana": "にし",
            "romaji": "nishi",
            "meaningFr": "ouest"
          }
        ]
      }
    ]
  },
  "電": {
    "meaningFr": "électricité",
    "readings": [
      {
        "priority": 3,
        "kana": "でん",
        "romaji": "den",
        "examples": [
          {
            "word": "電話",
            "kana": "でんわ",
            "romaji": "denwa",
            "meaningFr": "téléphone"
          },
          {
            "word": "電車",
            "kana": "でんしゃ",
            "romaji": "densha",
            "meaningFr": "train"
          }
        ]
      }
    ]
  },
  "校": {
    "meaningFr": "école",
    "readings": [
      {
        "priority": 3,
        "kana": "こう",
        "romaji": "kō",
        "examples": [
          {
            "word": "学校",
            "kana": "がっこう",
            "romaji": "gakkō",
            "meaningFr": "école"
          },
          {
            "word": "高校",
            "kana": "こうこう",
            "romaji": "kōkō",
            "meaningFr": "lycée"
          }
        ]
      }
    ]
  },
  "語": {
    "meaningFr": "langue, mot",
    "readings": [
      {
        "priority": 3,
        "kana": "ご",
        "romaji": "go",
        "examples": [
          {
            "word": "日本語",
            "kana": "にほんご",
            "romaji": "nihongo",
            "meaningFr": "japonais"
          },
          {
            "word": "英語",
            "kana": "えいご",
            "romaji": "eigo",
            "meaningFr": "anglais"
          }
        ]
      }
    ]
  },
  "土": {
    "meaningFr": "terre, samedi",
    "readings": [
      {
        "priority": 3,
        "kana": "ど",
        "romaji": "do",
        "examples": [
          {
            "word": "土曜日",
            "kana": "どようび",
            "romaji": "doyōbi",
            "meaningFr": "samedi"
          }
        ]
      },
      {
        "priority": 2,
        "kana": "つち",
        "romaji": "tsuchi",
        "examples": [
          {
            "word": "土",
            "kana": "つち",
            "romaji": "tsuchi",
            "meaningFr": "terre / sol"
          }
        ]
      }
    ]
  },
  "木": {
    "meaningFr": "arbre, bois",
    "readings": [
      {
        "priority": 3,
        "kana": "き",
        "romaji": "ki",
        "examples": [
          {
            "word": "木",
            "kana": "き",
            "romaji": "ki",
            "meaningFr": "arbre / bois"
          }
        ]
      },
      {
        "priority": 3,
        "kana": "もく",
        "romaji": "moku",
        "examples": [
          {
            "word": "木曜日",
            "kana": "もくようび",
            "romaji": "mokuyōbi",
            "meaningFr": "jeudi"
          }
        ]
      }
    ]
  },
  "聞": {
    "meaningFr": "écouter, demander",
    "readings": [
      {
        "priority": 3,
        "kana": "きく",
        "romaji": "kiku",
        "examples": [
          {
            "word": "聞く",
            "kana": "きく",
            "romaji": "kiku",
            "meaningFr": "écouter / demander"
          }
        ]
      },
      {
        "priority": 2,
        "kana": "ぶん",
        "romaji": "bun",
        "examples": [
          {
            "word": "新聞",
            "kana": "しんぶん",
            "romaji": "shinbun",
            "meaningFr": "journal"
          }
        ]
      }
    ]
  },
  "食": {
    "meaningFr": "manger, nourriture",
    "readings": [
      {
        "priority": 3,
        "kana": "たべる",
        "romaji": "taberu",
        "examples": [
          {
            "word": "食べる",
            "kana": "たべる",
            "romaji": "taberu",
            "meaningFr": "manger"
          }
        ]
      },
      {
        "priority": 3,
        "kana": "しょく",
        "romaji": "shoku",
        "examples": [
          {
            "word": "食事",
            "kana": "しょくじ",
            "romaji": "shokuji",
            "meaningFr": "repas"
          }
        ]
      }
    ]
  },
  "車": {
    "meaningFr": "voiture, véhicule",
    "readings": [
      {
        "priority": 3,
        "kana": "くるま",
        "romaji": "kuruma",
        "examples": [
          {
            "word": "車",
            "kana": "くるま",
            "romaji": "kuruma",
            "meaningFr": "voiture"
          }
        ]
      },
      {
        "priority": 3,
        "kana": "しゃ",
        "romaji": "sha",
        "examples": [
          {
            "word": "電車",
            "kana": "でんしゃ",
            "romaji": "densha",
            "meaningFr": "train"
          },
          {
            "word": "自転車",
            "kana": "じてんしゃ",
            "romaji": "jitensha",
            "meaningFr": "vélo"
          }
        ]
      }
    ]
  },
  "何": {
    "meaningFr": "quoi, quel",
    "readings": [
      {
        "priority": 3,
        "kana": "なに",
        "romaji": "nani",
        "examples": [
          {
            "word": "何",
            "kana": "なに",
            "romaji": "nani",
            "meaningFr": "quoi"
          }
        ]
      },
      {
        "priority": 3,
        "kana": "なん",
        "romaji": "nan",
        "examples": [
          {
            "word": "何時",
            "kana": "なんじ",
            "romaji": "nanji",
            "meaningFr": "quelle heure"
          },
          {
            "word": "何人",
            "kana": "なんにん",
            "romaji": "nannin",
            "meaningFr": "combien de personnes"
          }
        ]
      }
    ]
  },
  "南": {
    "meaningFr": "sud",
    "readings": [
      {
        "priority": 3,
        "kana": "みなみ",
        "romaji": "minami",
        "examples": [
          {
            "word": "南",
            "kana": "みなみ",
            "romaji": "minami",
            "meaningFr": "sud"
          }
        ]
      }
    ]
  },
  "万": {
    "meaningFr": "dix mille",
    "readings": [
      {
        "priority": 3,
        "kana": "まん",
        "romaji": "man",
        "examples": [
          {
            "word": "一万",
            "kana": "いちまん",
            "romaji": "ichiman",
            "meaningFr": "10 000"
          },
          {
            "word": "一万円",
            "kana": "いちまんえん",
            "romaji": "ichimanen",
            "meaningFr": "10 000 yens"
          }
        ]
      }
    ]
  },
  "毎": {
    "meaningFr": "chaque",
    "readings": [
      {
        "priority": 3,
        "kana": "まい",
        "romaji": "mai",
        "examples": [
          {
            "word": "毎日",
            "kana": "まいにち",
            "romaji": "mainichi",
            "meaningFr": "chaque jour"
          },
          {
            "word": "毎週",
            "kana": "まいしゅう",
            "romaji": "maishū",
            "meaningFr": "chaque semaine"
          }
        ]
      }
    ]
  },
  "白": {
    "meaningFr": "blanc",
    "readings": [
      {
        "priority": 3,
        "kana": "しろ / しろい",
        "romaji": "shiro / shiroi",
        "examples": [
          {
            "word": "白",
            "kana": "しろ",
            "romaji": "shiro",
            "meaningFr": "blanc"
          },
          {
            "word": "白い",
            "kana": "しろい",
            "romaji": "shiroi",
            "meaningFr": "blanc"
          }
        ]
      }
    ]
  },
  "天": {
    "meaningFr": "ciel, météo",
    "readings": [
      {
        "priority": 3,
        "kana": "てん",
        "romaji": "ten",
        "examples": [
          {
            "word": "天気",
            "kana": "てんき",
            "romaji": "tenki",
            "meaningFr": "météo"
          }
        ]
      }
    ]
  },
  "母": {
    "meaningFr": "mère",
    "readings": [
      {
        "priority": 3,
        "kana": "はは",
        "romaji": "haha",
        "examples": [
          {
            "word": "母",
            "kana": "はは",
            "romaji": "haha",
            "meaningFr": "ma mère"
          }
        ]
      },
      {
        "priority": 3,
        "kana": "かあ",
        "romaji": "kā",
        "examples": [
          {
            "word": "お母さん",
            "kana": "おかあさん",
            "romaji": "okaasan",
            "meaningFr": "mère / maman (poli)"
          }
        ]
      }
    ]
  },
  "火": {
    "meaningFr": "feu, mardi",
    "readings": [
      {
        "priority": 3,
        "kana": "ひ",
        "romaji": "hi",
        "examples": [
          {
            "word": "火",
            "kana": "ひ",
            "romaji": "hi",
            "meaningFr": "feu"
          }
        ]
      },
      {
        "priority": 3,
        "kana": "か",
        "romaji": "ka",
        "examples": [
          {
            "word": "火曜日",
            "kana": "かようび",
            "romaji": "kayōbi",
            "meaningFr": "mardi"
          }
        ]
      }
    ]
  },
  "右": {
    "meaningFr": "droite",
    "readings": [
      {
        "priority": 3,
        "kana": "みぎ",
        "romaji": "migi",
        "examples": [
          {
            "word": "右",
            "kana": "みぎ",
            "romaji": "migi",
            "meaningFr": "droite"
          }
        ]
      }
    ]
  },
  "読": {
    "meaningFr": "lire",
    "readings": [
      {
        "priority": 3,
        "kana": "よむ",
        "romaji": "yomu",
        "examples": [
          {
            "word": "読む",
            "kana": "よむ",
            "romaji": "yomu",
            "meaningFr": "lire"
          }
        ]
      },
      {
        "priority": 2,
        "kana": "どく",
        "romaji": "doku",
        "examples": [
          {
            "word": "読書",
            "kana": "どくしょ",
            "romaji": "dokusho",
            "meaningFr": "lecture"
          }
        ]
      }
    ]
  },
  "友": {
    "meaningFr": "ami",
    "readings": [
      {
        "priority": 3,
        "kana": "とも",
        "romaji": "tomo",
        "examples": [
          {
            "word": "友だち",
            "kana": "ともだち",
            "romaji": "tomodachi",
            "meaningFr": "ami"
          }
        ]
      }
    ]
  },
  "左": {
    "meaningFr": "gauche",
    "readings": [
      {
        "priority": 3,
        "kana": "ひだり",
        "romaji": "hidari",
        "examples": [
          {
            "word": "左",
            "kana": "ひだり",
            "romaji": "hidari",
            "meaningFr": "gauche"
          }
        ]
      }
    ]
  },
  "休": {
    "meaningFr": "repos, se reposer",
    "readings": [
      {
        "priority": 3,
        "kana": "やすむ",
        "romaji": "yasumu",
        "examples": [
          {
            "word": "休む",
            "kana": "やすむ",
            "romaji": "yasumu",
            "meaningFr": "se reposer"
          },
          {
            "word": "休み",
            "kana": "やすみ",
            "romaji": "yasumi",
            "meaningFr": "repos"
          }
        ]
      }
    ]
  },
  "父": {
    "meaningFr": "père",
    "readings": [
      {
        "priority": 3,
        "kana": "ちち",
        "romaji": "chichi",
        "examples": [
          {
            "word": "父",
            "kana": "ちち",
            "romaji": "chichi",
            "meaningFr": "mon père"
          }
        ]
      },
      {
        "priority": 3,
        "kana": "とう",
        "romaji": "tō",
        "examples": [
          {
            "word": "お父さん",
            "kana": "おとうさん",
            "romaji": "otōsan",
            "meaningFr": "père / papa (poli)"
          }
        ]
      }
    ]
  },
  "雨": {
    "meaningFr": "pluie",
    "readings": [
      {
        "priority": 3,
        "kana": "あめ",
        "romaji": "ame",
        "examples": [
          {
            "word": "雨",
            "kana": "あめ",
            "romaji": "ame",
            "meaningFr": "pluie"
          }
        ]
      }
    ]
  }
};

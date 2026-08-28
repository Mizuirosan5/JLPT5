import type { KanaCard } from '../models';

export type KanaFamilyId = 'vowels' | 'k' | 's' | 't' | 'n' | 'h' | 'm' | 'y' | 'r' | 'w' | 'dakuten' | 'handakuten' | 'combined' | 'special';
export type KanaFamily = { id: KanaFamilyId; label: string; hint: string };

export const KANA_FAMILIES: KanaFamily[] = [
  { id: 'vowels', label: 'A I U E O', hint: 'Voyelles' },
  { id: 'k', label: 'K', hint: 'か き く け こ' },
  { id: 's', label: 'S', hint: 'さ し す せ そ' },
  { id: 't', label: 'T', hint: 'た ち つ て と' },
  { id: 'n', label: 'N', hint: 'な に ぬ ね の' },
  { id: 'h', label: 'H', hint: 'は ひ ふ へ ほ' },
  { id: 'm', label: 'M', hint: 'ま み む め も' },
  { id: 'y', label: 'Y', hint: 'や ゆ よ' },
  { id: 'r', label: 'R', hint: 'ら り る れ ろ' },
  { id: 'w', label: 'W / N', hint: 'わ を ん' },
  { id: 'dakuten', label: '゛', hint: 'G Z D B' },
  { id: 'handakuten', label: '゜', hint: 'P' },
  { id: 'combined', label: 'ゃゅょ', hint: 'Sons combinés' },
  { id: 'special', label: 'っ / ー', hint: 'Petits kana et longueur' },
];

export const KANA_THEORY = [
  { title: 'Deux écritures phonétiques', text: 'Les hiragana servent aux mots japonais et aux éléments grammaticaux. Les katakana servent surtout aux mots étrangers, aux noms scientifiques et à l’emphase.' },
  { title: 'Dakuten et handakuten', text: 'Les signes ゛ et ゜ transforment une consonne: か devient が, は devient ば ou ぱ. Le rythme du mot reste régulier.' },
  { title: 'Sons contractés', text: 'Un petit ゃ, ゅ ou ょ suit un kana en i: きゃ se lit kya en une seule unité rythmique, jamais ki-ya.' },
  { title: 'Consonnes doublées avec っ', text: 'Le petit っ bloque brièvement la voix et double la consonne suivante : きて se lit kite, mais きって se lit kitte. Dans がっこう (gakkou), っ double le k. Il ne se prononce jamais tsu dans ce cas.' },
  { title: 'Voyelles longues', text: 'Une voyelle longue compte deux temps : おばさん (obasan, tante) et おばあさん (obaasan, grand-mère) ne sont pas le même mot. En katakana, ー prolonge la voyelle précédente, comme dans ケーキ (keeki).' },
  { title: 'Méthode de travail', text: 'Observe, écoute, trace, reconnais puis produis. Le romaji est une aide temporaire: vise une lecture directe du signe vers le son.' },
];

const SMALL_OR_LONG = new Set(Array.from('っッぁぃぅぇぉゃゅょァィゥェォャュョー'));

export function getKanaFamily(card: Pick<KanaCard, 'character' | 'romaji'>): KanaFamilyId {
  if (Array.from(card.character).some((character) => SMALL_OR_LONG.has(character)) && Array.from(card.character).length === 1) return 'special';
  if (Array.from(card.character).length > 1) return 'combined';
  const romaji = card.romaji.toLowerCase().replace(/[^a-z]/g, '');
  if (/^[gzdb]/.test(romaji)) return 'dakuten';
  if (/^p/.test(romaji)) return 'handakuten';
  if (/^[aiueo]$/.test(romaji)) return 'vowels';
  if (/^k/.test(romaji)) return 'k';
  if (/^(s|sh)/.test(romaji)) return 's';
  if (/^(t|ch|ts)/.test(romaji)) return 't';
  if (/^n/.test(romaji) && romaji !== 'n') return 'n';
  if (/^(h|f)/.test(romaji)) return 'h';
  if (/^m/.test(romaji)) return 'm';
  if (/^y/.test(romaji)) return 'y';
  if (/^r/.test(romaji)) return 'r';
  if (/^w/.test(romaji) || romaji === 'n') return 'w';
  return 'special';
}

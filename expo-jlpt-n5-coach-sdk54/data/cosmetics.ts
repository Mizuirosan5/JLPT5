export type CosmeticCategory = 'character' | 'palette' | 'frame' | 'accessory';

export type CosmeticItem = {
  id: string;
  category: CosmeticCategory;
  name: string;
  description: string;
  price: number;
  symbol: string;
  colors: [string, string, string];
};

export const COSMETIC_CATEGORY_LABELS: Record<CosmeticCategory, string> = {
  character: 'Personnages',
  palette: 'Couleurs',
  frame: 'Cadres',
  accessory: 'Accessoires',
};

export const COSMETIC_CATALOG: CosmeticItem[] = [
  { id: 'character-sumi', category: 'character', name: 'Sumi', description: 'Compagnon inspiré de l’encre japonaise.', price: 180, symbol: '墨', colors: ['#152B3A', '#F6C85F', '#FFFDF8'] },
  { id: 'character-hikari', category: 'character', name: 'Hikari', description: 'Compagnon calme associé à la lumière.', price: 220, symbol: '光', colors: ['#C83543', '#FFF4D6', '#152B3A'] },
  { id: 'character-michi', category: 'character', name: 'Michi', description: 'Compagnon du parcours et de la régularité.', price: 260, symbol: '道', colors: ['#1B776F', '#F6C85F', '#FFFDF8'] },
  { id: 'palette-sakura', category: 'palette', name: 'Sakura', description: 'Rouge floral, charbon et papier.', price: 90, symbol: '桜', colors: ['#C83543', '#152B3A', '#FFF7F2'] },
  { id: 'palette-fuji', category: 'palette', name: 'Fuji', description: 'Bleu minéral, neige et or.', price: 100, symbol: '富', colors: ['#325B67', '#F8F5EE', '#D4A72C'] },
  { id: 'palette-matcha', category: 'palette', name: 'Matcha', description: 'Vert profond, ivoire et vermillon.', price: 100, symbol: '茶', colors: ['#44634A', '#FFFDF8', '#B83A3F'] },
  { id: 'palette-indigo', category: 'palette', name: 'Indigo', description: 'Indigo, gris brume et cuivre.', price: 110, symbol: '藍', colors: ['#243C5A', '#E8ECE9', '#A46B3C'] },
  { id: 'palette-ume', category: 'palette', name: 'Ume', description: 'Prune, rose pâle et encre.', price: 110, symbol: '梅', colors: ['#7B3448', '#F6DDE1', '#202B31'] },
  { id: 'palette-yuzu', category: 'palette', name: 'Yuzu', description: 'Jaune vif, vert feuille et papier.', price: 120, symbol: '柚', colors: ['#E4B92E', '#3E6247', '#FFFDF8'] },
  { id: 'frame-enso', category: 'frame', name: 'Ensō', description: 'Contour circulaire inspiré du geste d’encre.', price: 120, symbol: '円', colors: ['#152B3A', '#FFFDF8', '#C83543'] },
  { id: 'frame-asanoha', category: 'frame', name: 'Asanoha', description: 'Cadre géométrique discret.', price: 140, symbol: '麻', colors: ['#325B67', '#E8D7C4', '#FFFDF8'] },
  { id: 'frame-seigaiha', category: 'frame', name: 'Seigaiha', description: 'Rythme de vagues stylisé.', price: 140, symbol: '海', colors: ['#1B776F', '#CDE3DF', '#FFFDF8'] },
  { id: 'frame-torii', category: 'frame', name: 'Torii', description: 'Lignes vermillon et charbon.', price: 150, symbol: '門', colors: ['#C83543', '#152B3A', '#FFFDF8'] },
  { id: 'frame-bambou', category: 'frame', name: 'Bambou', description: 'Contour vert à angles calmes.', price: 150, symbol: '竹', colors: ['#44634A', '#DDE8D9', '#FFFDF8'] },
  { id: 'frame-kintsugi', category: 'frame', name: 'Kintsugi', description: 'Filet doré sur fond encre.', price: 180, symbol: '金', colors: ['#D4A72C', '#152B3A', '#FFFDF8'] },
  { id: 'accessory-fan', category: 'accessory', name: 'Éventail', description: 'Petit éventail de profil.', price: 70, symbol: '扇', colors: ['#C83543', '#F6C85F', '#FFFDF8'] },
  { id: 'accessory-brush', category: 'accessory', name: 'Pinceau', description: 'Pinceau de calligraphie.', price: 80, symbol: '筆', colors: ['#152B3A', '#8A5A3B', '#FFFDF8'] },
  { id: 'accessory-bell', category: 'accessory', name: 'Clochette', description: 'Clochette dorée discrète.', price: 80, symbol: '鈴', colors: ['#D4A72C', '#C83543', '#FFFDF8'] },
  { id: 'accessory-maple', category: 'accessory', name: 'Érable', description: 'Feuille d’automne stylisée.', price: 90, symbol: '楓', colors: ['#B84A32', '#D4A72C', '#FFFDF8'] },
  { id: 'accessory-moon', category: 'accessory', name: 'Lune', description: 'Croissant nocturne minimal.', price: 90, symbol: '月', colors: ['#F6C85F', '#243C5A', '#FFFDF8'] },
  { id: 'accessory-koi', category: 'accessory', name: 'Carpe', description: 'Motif de persévérance.', price: 100, symbol: '鯉', colors: ['#C83543', '#FFFDF8', '#152B3A'] },
  { id: 'accessory-mountain', category: 'accessory', name: 'Mont Fuji', description: 'Silhouette de montagne.', price: 100, symbol: '山', colors: ['#325B67', '#E8ECE9', '#C83543'] },
  { id: 'accessory-star', category: 'accessory', name: 'Étoile', description: 'Repère pour une série réussie.', price: 110, symbol: '星', colors: ['#D4A72C', '#152B3A', '#FFFDF8'] },
];

export function getCosmetic(id: string): CosmeticItem | undefined {
  return COSMETIC_CATALOG.find((item) => item.id === id);
}

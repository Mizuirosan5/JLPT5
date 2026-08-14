export type KanjiComponentDetail = {
  character: string;
  components: string[];
  mnemonicFr: string;
  confusions: string[];
};

export const KANJI_COMPONENT_DETAILS: KanjiComponentDetail[] = [
  { character: '日', components: ['soleil', 'jour'], mnemonicFr: 'Une fenetre de lumiere : le soleil marque le jour.', confusions: ['目', '月'] },
  { character: '月', components: ['lune', 'mois'], mnemonicFr: 'La lune revient chaque mois dans le calendrier.', confusions: ['日', '用'] },
  { character: '火', components: ['flamme'], mnemonicFr: 'Des petites flammes partent du centre.', confusions: ['水'] },
  { character: '水', components: ['eau', 'courant'], mnemonicFr: 'Un courant central avec des gouttes sur les cotes.', confusions: ['氷', '火'] },
  { character: '木', components: ['arbre'], mnemonicFr: 'Un tronc, des branches, des racines : un arbre debout.', confusions: ['本', '休'] },
  { character: '山', components: ['montagne'], mnemonicFr: 'Trois pics simples pour retenir montagne.', confusions: ['出'] },
  { character: '川', components: ['riviere'], mnemonicFr: 'Trois lignes verticales comme un cours d eau qui descend.', confusions: ['州'] },
  { character: '田', components: ['riziere', 'champ'], mnemonicFr: 'Un champ vu du dessus, coupe en quatre parcelles.', confusions: ['日', '口'] },
  { character: '人', components: ['personne'], mnemonicFr: 'Deux jambes en appui : une personne qui avance.', confusions: ['入', '八'] },
  { character: '口', components: ['bouche'], mnemonicFr: 'Un carre ouvert dans l idee : la bouche qui parle.', confusions: ['日', '田'] },
  { character: '目', components: ['oeil'], mnemonicFr: 'Un oeil stylise avec ses lignes internes.', confusions: ['日', '耳'] },
  { character: '耳', components: ['oreille'], mnemonicFr: 'La forme allongee rappelle une oreille vue de cote.', confusions: ['目'] },
  { character: '手', components: ['main'], mnemonicFr: 'Des doigts et une paume simplifies.', confusions: ['牛'] },
  { character: '足', components: ['pied', 'jambe'], mnemonicFr: 'Une bouche au-dessus du mouvement : le pied avance.', confusions: ['走'] },
  { character: '大', components: ['grand', 'bras ouverts'], mnemonicFr: 'Une personne ouvre grand les bras.', confusions: ['犬', '天'] },
  { character: '小', components: ['petit'], mnemonicFr: 'Une ligne centrale et deux petits points : petit et resserre.', confusions: ['少'] },
  { character: '中', components: ['centre'], mnemonicFr: 'Une ligne traverse la boite pile au centre.', confusions: ['申'] },
  { character: '上', components: ['haut'], mnemonicFr: 'Le trait court est au-dessus de la ligne de base.', confusions: ['下'] },
  { character: '下', components: ['bas'], mnemonicFr: 'Le trait court descend sous la ligne de base.', confusions: ['上'] },
  { character: '本', components: ['arbre', 'origine'], mnemonicFr: 'Un trait a la racine de 木 : l origine, puis le livre.', confusions: ['木', '体'] },
];

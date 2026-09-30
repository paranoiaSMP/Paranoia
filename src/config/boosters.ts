export type BoosterPackId = "standard" | "premium" | "legendary" | "mythic";

export type RarityKey =
  | "COMMON"
  | "UNCOMMON"
  | "RARE"
  | "EPIC"
  | "LEGENDARY"
  | "MYTHIC";

export interface CardRarityDef {
  key: RarityKey;
  label: string;
  colorClass: string;
}

export const CARD_RARITIES: readonly CardRarityDef[] = [
  { key: "COMMON", label: "Commune", colorClass: "text-slate-300" },
  { key: "UNCOMMON", label: "Peu commune", colorClass: "text-emerald-400" },
  { key: "RARE", label: "Rare", colorClass: "text-blue-400" },
  { key: "EPIC", label: "Épique", colorClass: "text-purple-400" },
  { key: "LEGENDARY", label: "Légendaire", colorClass: "text-amber-400" },
  { key: "MYTHIC", label: "Mythique", colorClass: "text-rose-500" },
] as const;

export interface BoosterRate {
  rarity: string;
  percent: string;
  rateNum: number;
  colorClass: string;
  r: string;
  p: string;
  c: string;
}

export interface BoosterPackConfig {
  id: BoosterPackId;
  name: string;
  image: string;
  price: number;
  cardsPerPack: number;
  glow: string;
  text: string;
  ringColor: string;
  rates: BoosterRate[];
}

export const BOOSTER_PRICES: Record<BoosterPackId, number> = {
  standard: 150,
  premium: 250,
  legendary: 400,
  mythic: 750,
};

export const BOOSTER_CARDS_PER_PACK: Record<BoosterPackId, number> = {
  standard: 3,
  premium: 4,
  legendary: 4,
  mythic: 5,
};

export const BOOSTER_DROP_RATES: Record<BoosterPackId, Record<RarityKey, number>> = {
  standard: {
    COMMON: 40,
    UNCOMMON: 30,
    RARE: 20,
    EPIC: 7.8,
    LEGENDARY: 2,
    MYTHIC: 0.2,
  },
  premium: {
    COMMON: 20,
    UNCOMMON: 25,
    RARE: 35,
    EPIC: 14.5,
    LEGENDARY: 5,
    MYTHIC: 0.5,
  },
  legendary: {
    COMMON: 10,
    UNCOMMON: 15,
    RARE: 40,
    EPIC: 23,
    LEGENDARY: 10,
    MYTHIC: 2,
  },
  mythic: {
    COMMON: 0,
    UNCOMMON: 0,
    RARE: 0,
    EPIC: 75,
    LEGENDARY: 20,
    MYTHIC: 5,
  },
};

export const BOOSTER_PACKS: Record<BoosterPackId, BoosterPackConfig> = {
  standard: {
    id: "standard",
    name: "Standard",
    image: "/StandardB.png",
    price: BOOSTER_PRICES.standard,
    cardsPerPack: BOOSTER_CARDS_PER_PACK.standard,
    glow: "bg-blue-500",
    text: "text-blue-400",
    ringColor: "rgba(59,130,246,0.35)",
    rates: [
      { rarity: "Commune", percent: "40%", rateNum: 40, colorClass: "text-slate-300", r: "Commune", p: "40%", c: "text-slate-300" },
      { rarity: "Peu Commune", percent: "30%", rateNum: 30, colorClass: "text-emerald-400", r: "Peu Commune", p: "30%", c: "text-emerald-400" },
      { rarity: "Rare", percent: "20%", rateNum: 20, colorClass: "text-blue-400", r: "Rare", p: "20%", c: "text-blue-400" },
      { rarity: "Épique", percent: "7.8%", rateNum: 7.8, colorClass: "text-purple-400", r: "Épique", p: "7.8%", c: "text-purple-400" },
      { rarity: "Légendaire", percent: "2%", rateNum: 2, colorClass: "text-amber-400", r: "Légendaire", p: "2%", c: "text-amber-400" },
      { rarity: "Mythique", percent: "0.2%", rateNum: 0.2, colorClass: "text-rose-500", r: "Mythique", p: "0.2%", c: "text-rose-500" },
    ],
  },
  premium: {
    id: "premium",
    name: "Premium",
    image: "/PreniumB.png",
    price: BOOSTER_PRICES.premium,
    cardsPerPack: BOOSTER_CARDS_PER_PACK.premium,
    glow: "bg-purple-500",
    text: "text-purple-400",
    ringColor: "rgba(168,85,247,0.35)",
    rates: [
      { rarity: "Commune", percent: "20%", rateNum: 20, colorClass: "text-slate-300", r: "Commune", p: "20%", c: "text-slate-300" },
      { rarity: "Peu Commune", percent: "25%", rateNum: 25, colorClass: "text-emerald-400", r: "Peu Commune", p: "25%", c: "text-emerald-400" },
      { rarity: "Rare", percent: "35%", rateNum: 35, colorClass: "text-blue-400", r: "Rare", p: "35%", c: "text-blue-400" },
      { rarity: "Épique", percent: "14.5%", rateNum: 14.5, colorClass: "text-purple-400", r: "Épique", p: "14.5%", c: "text-purple-400" },
      { rarity: "Légendaire", percent: "5%", rateNum: 5, colorClass: "text-amber-400", r: "Légendaire", p: "5%", c: "text-amber-400" },
      { rarity: "Mythique", percent: "0.5%", rateNum: 0.5, colorClass: "text-rose-500", r: "Mythique", p: "0.5%", c: "text-rose-500" },
    ],
  },
  legendary: {
    id: "legendary",
    name: "Légendaire",
    image: "/LegendaireB.png",
    price: BOOSTER_PRICES.legendary,
    cardsPerPack: BOOSTER_CARDS_PER_PACK.legendary,
    glow: "bg-amber-500",
    text: "text-amber-400",
    ringColor: "rgba(245,158,11,0.35)",
    rates: [
      { rarity: "Commune", percent: "10%", rateNum: 10, colorClass: "text-slate-300", r: "Commune", p: "10%", c: "text-slate-300" },
      { rarity: "Peu Commune", percent: "15%", rateNum: 15, colorClass: "text-emerald-400", r: "Peu Commune", p: "15%", c: "text-emerald-400" },
      { rarity: "Rare", percent: "40%", rateNum: 40, colorClass: "text-blue-400", r: "Rare", p: "40%", c: "text-blue-400" },
      { rarity: "Épique", percent: "23%", rateNum: 23, colorClass: "text-purple-400", r: "Épique", p: "23%", c: "text-purple-400" },
      { rarity: "Légendaire", percent: "10%", rateNum: 10, colorClass: "text-amber-400", r: "Légendaire", p: "10%", c: "text-amber-400" },
      { rarity: "Mythique", percent: "2%", rateNum: 2, colorClass: "text-rose-500", r: "Mythique", p: "2%", c: "text-rose-500" },
    ],
  },
  mythic: {
    id: "mythic",
    name: "Mythique",
    image: "/MythiqueB.png",
    price: BOOSTER_PRICES.mythic,
    cardsPerPack: BOOSTER_CARDS_PER_PACK.mythic,
    glow: "bg-red-600",
    text: "text-rose-500",
    ringColor: "rgba(239,68,68,0.45)",
    rates: [
      { rarity: "Épique", percent: "75%", rateNum: 75, colorClass: "text-purple-400", r: "Épique", p: "75%", c: "text-purple-400" },
      { rarity: "Légendaire", percent: "20%", rateNum: 20, colorClass: "text-amber-400", r: "Légendaire", p: "20%", c: "text-amber-400" },
      { rarity: "Mythique", percent: "5%", rateNum: 5, colorClass: "text-rose-500", r: "Mythique", p: "5%", c: "text-rose-500" },
    ],
  },
};

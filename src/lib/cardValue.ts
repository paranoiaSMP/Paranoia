// Valeurs en Paracoin (voir ECHANGES_TCG.md). Sans dépendance : serveur et navigateur.
const BASE: Record<string, number> = { COMMON: 15, UNCOMMON: 35, RARE: 70, EPIC: 150, LEGENDARY: 350, MYTHIC: 1200 };
export const FESTIVE = ["Noël", "Halloween", "Pâques", "Saint-Valentin", "Nouvel An"];
export const GIFT_EFFECTS = ["Holo", "Glitch", "Cosmic", "Saison", ...FESTIVE];
const EFFECT: Record<string, number> = { Holo: 1.5, Glitch: 2.5, Cosmic: 4, Saison: 1.5 };

export const TCG_DEFAULTS = { evolveCount: 4 };
export type TcgConfig = typeof TCG_DEFAULTS;

function baseOf(rarity: string) {
  const r = rarity.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
  if (r === "MYTHIC" || r === "MYTHIQUE") return BASE.MYTHIC;
  if (r === "LEGENDARY" || r === "LEGENDAIRE") return BASE.LEGENDARY;
  if (r === "EPIC" || r === "EPIQUE") return BASE.EPIC;
  if (r === "RARE") return BASE.RARE;
  if (r === "UNCOMMON" || r === "PEU COMMUNE") return BASE.UNCOMMON;
  return BASE.COMMON;
}

export function cardValue(rarity: string, effect: string | null | undefined, customBase?: number | null) {
  const base = typeof customBase === "number" && customBase > 0 ? customBase : baseOf(rarity);
  const name = (effect ?? "").replace(/ \d{4}$/, "");
  const mult = FESTIVE.includes(name) ? 5 : EFFECT[name] ?? 1;
  return Math.round(base * mult);
}

export const sellPrice = cardValue;

const LADDER = [null, "Holo", "Glitch", "Cosmic"];
export function nextEffect(effect: string | null | undefined): string | null {
  const i = LADDER.indexOf(effect ?? null);
  return i < 0 ? null : (LADDER[i + 1] ?? null);
}

// Pas de booster Épique ni Peu commune : on prend le plus proche.
const COSMIC_BOOSTER: Record<string, string> = { COMMON: "standard", UNCOMMON: "standard", RARE: "premium", EPIC: "legendary", LEGENDARY: "mythic" };
export const BOOSTER_NAME: Record<string, string> = { standard: "Standard", premium: "Premium", legendary: "Légendaire", mythic: "Mythique" };
export function cosmicBooster(rarity: string): string | null {
  const k = Object.keys(BASE).find((x) => BASE[x] === baseOf(rarity));
  return (k && COSMIC_BOOSTER[k]) || null;
}
export const canEvolve = (rarity: string, effect: string | null | undefined) =>
  effect === "Cosmic" ? cosmicBooster(rarity) !== null : nextEffect(effect) !== null;

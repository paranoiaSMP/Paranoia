import type { BoosterPackConfig, BoosterPackId } from "@/config/boosters";

// price/stock null = valeur par défaut de la config / illimité
export type BoosterState = { visible: boolean; stock: number | null; price: number | null };
export type BoosterStates = Record<BoosterPackId, BoosterState>;

export const priceOf = (pack: BoosterPackConfig, state?: BoosterState) => state?.price ?? pack.price;

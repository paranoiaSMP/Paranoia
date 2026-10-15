import type { BoosterPackId } from "@/config/boosters";

export type BoosterState = { visible: boolean; stock: number | null };
export type BoosterStates = Record<BoosterPackId, BoosterState>;

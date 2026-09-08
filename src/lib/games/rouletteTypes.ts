export type RouletteColor = "red" | "green" | "black";
export type RoulettePhase = "BETTING" | "SPINNING" | "RESOLVED";
export type RouletteListener = (event: { type: string; data: any }) => void;

export interface RouletteBet {
  id: string;
  userId: string;
  name: string;
  image?: string | null;
  minecraftName?: string | null;
  color: RouletteColor;
  amount: number;
}

export interface RoulettePublicState {
  roundId: string;
  phase: RoulettePhase;
  countdown: number;
  winningNumber: number | null;
  winningOffset: number | null;
  bets: RouletteBet[];
  history: number[];
}

export const ROULETTE_ORDER = [0, 1, 8, 2, 9, 3, 10, 4, 11, 5, 12, 6, 13, 7, 14];

export function getNumberColor(num: number): RouletteColor {
  if (num === 0) return "green";
  if (num >= 1 && num <= 7) return "red";
  return "black";
}

export function getMultiplier(color: RouletteColor): number {
  if (color === "green") return 14;
  return 2;
}

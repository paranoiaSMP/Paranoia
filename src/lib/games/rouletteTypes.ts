export type RouletteColor = "red" | "green" | "black";
export type RoulettePhase = "BETTING" | "SPINNING" | "RESOLVED";

export type BetType = 
  | "red" 
  | "black" 
  | "green" 
  | "even" 
  | "odd" 
  | "low" 
  | "high" 
  | "dozen_1" 
  | "dozen_2" 
  | "dozen_3" 
  | `num_${number}`;

export interface RouletteBet {
  id: string;
  userId: string;
  name: string;
  image?: string | null;
  minecraftName?: string | null;
  betType: BetType;
  color?: RouletteColor;
  amount: number;
}

export type RouletteListener = (event: { type: string; data: any }) => void;

export interface RoulettePublicState {
  roundId: string;
  phase: RoulettePhase;
  countdown: number;
  winningNumber: number | null;
  winningAngle: number | null;
  bets: RouletteBet[];
  history: number[];
}

export const EUROPEAN_WHEEL = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

export const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36
]);

export function getNumberColor(num: number): RouletteColor {
  if (num === 0) return "green";
  if (RED_NUMBERS.has(num)) return "red";
  return "black";
}

export function isBetWinning(betType: BetType, winningNumber: number): boolean {
  const winColor = getNumberColor(winningNumber);

  if (betType === "red") return winColor === "red";
  if (betType === "black") return winColor === "black";
  if (betType === "green") return winningNumber === 0;

  if (winningNumber === 0) return false;

  if (betType === "even") return winningNumber % 2 === 0;
  if (betType === "odd") return winningNumber % 2 === 1;
  if (betType === "low") return winningNumber >= 1 && winningNumber <= 18;
  if (betType === "high") return winningNumber >= 19 && winningNumber <= 36;
  if (betType === "dozen_1") return winningNumber >= 1 && winningNumber <= 12;
  if (betType === "dozen_2") return winningNumber >= 13 && winningNumber <= 24;
  if (betType === "dozen_3") return winningNumber >= 25 && winningNumber <= 36;

  if (betType.startsWith("num_")) {
    const num = parseInt(betType.replace("num_", ""), 10);
    return num === winningNumber;
  }

  return false;
}

export function getBetMultiplier(betType: BetType): number {
  if (betType === "green") return 36;
  if (betType.startsWith("num_")) return 36;
  if (betType.startsWith("dozen_")) return 3;
  return 2;
}

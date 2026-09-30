export interface Card {
  suit: string;
  rank: string;
  hidden?: boolean;
}

export interface HistoryRow {
  n: number;
  label: string;
  color: string;
  score: string;
  delta: string;
}

export type RoundPhase = "BETTING" | "PLAYER_TURN" | "DEALER_TURN" | "FINISHED";

export function calculateHand(cards: Card[]): number {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (!c || c.hidden || c.rank === "?" || c.suit === "?") continue;
    if (c.rank === "A") {
      aces++;
      total += 11;
    } else if (["K", "Q", "J", "10"].includes(c.rank)) {
      total += 10;
    } else {
      total += parseInt(c.rank, 10);
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

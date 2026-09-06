import crypto from "crypto";
import { prisma } from "@/lib/db";
import { 
  RouletteColor, 
  RoulettePhase, 
  RouletteBet, 
  RoulettePublicState, 
  ROULETTE_ORDER, 
  getNumberColor, 
  getMultiplier 
} from "./rouletteTypes";

export * from "./rouletteTypes";

class RouletteEngine {
  private roundId: string = crypto.randomUUID();
  private phase: RoulettePhase = "BETTING";
  private countdown: number = 12.0;
  private winningNumber: number | null = null;
  private winningOffset: number | null = null;
  private bets: Map<string, RouletteBet> = new Map();
  private history: number[] = [2, 11, 0, 7, 14, 3, 5, 8, 1];
  private listeners: Set<RouletteListener> = new Set();
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    this.startBettingPhase();
  }

  private broadcast(type: string, data: any) {
    for (const listener of this.listeners) {
      try {
        listener({ type, data });
      } catch {}
    }
  }

  public subscribe(listener: RouletteListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(isInternal = false): RoulettePublicState {
    return {
      roundId: this.roundId,
      phase: this.phase,
      countdown: parseFloat(this.countdown.toFixed(1)),
      winningNumber: (this.phase !== "BETTING" || isInternal) ? this.winningNumber : null,
      winningOffset: (this.phase !== "BETTING" || isInternal) ? this.winningOffset : null,
      bets: Array.from(this.bets.values()),
      history: this.history,
    };
  }

  private startBettingPhase() {
    if (this.timer) clearInterval(this.timer);

    this.roundId = crypto.randomUUID();
    this.phase = "BETTING";
    this.countdown = 12.0;
    this.winningNumber = null;
    this.winningOffset = null;
    this.bets.clear();

    this.broadcast("PHASE_CHANGE", this.getState());

    this.timer = setInterval(() => {
      this.countdown = Math.max(0, this.countdown - 0.1);
      this.broadcast("TICK", { countdown: parseFloat(this.countdown.toFixed(1)) });

      if (this.countdown <= 0.05) {
        if (this.timer) clearInterval(this.timer);
        this.startSpinningPhase();
      }
    }, 100);
  }

  private startSpinningPhase() {
    this.phase = "SPINNING";
    this.winningNumber = crypto.randomInt(0, 15);
    this.winningOffset = crypto.randomInt(-28, 29);

    this.broadcast("SPIN", {
      roundId: this.roundId,
      winningNumber: this.winningNumber,
      winningOffset: this.winningOffset,
      winningColor: getNumberColor(this.winningNumber),
    });

    this.timer = setTimeout(() => {
      this.startResolvedPhase();
    }, 5500);
  }

  private async startResolvedPhase() {
    if (this.timer) clearTimeout(this.timer);

    this.phase = "RESOLVED";
    const winColor = getNumberColor(this.winningNumber!);
    const mult = getMultiplier(winColor);

    this.history = [this.winningNumber!, ...this.history.slice(0, 14)];

    const payouts: { userId: string; payout: number; profit: number }[] = [];

    for (const bet of this.bets.values()) {
      if (bet.color === winColor) {
        const payout = bet.amount * mult;
        payouts.push({
          userId: bet.userId,
          payout,
          profit: payout - bet.amount,
        });

        try {
          await prisma.user.update({
            where: { id: bet.userId },
            data: { paraCoins: { increment: payout } },
          });
        } catch {}
      }
    }

    this.broadcast("RESOLVED", {
      roundId: this.roundId,
      winningNumber: this.winningNumber,
      winningColor: winColor,
      history: this.history,
      payouts,
    });

    this.timer = setTimeout(() => {
      this.startBettingPhase();
    }, 4000);
  }

  public placeBet(bet: Omit<RouletteBet, "id">): { success: boolean; error?: string } {
    if (this.phase !== "BETTING" || this.countdown < 0.2) {
      return { success: false, error: "Les paris sont fermés pour ce tour" };
    }

    const betId = crypto.randomUUID();
    const newBet: RouletteBet = {
      ...bet,
      id: betId,
    };

    this.bets.set(betId, newBet);
    this.broadcast("BET_PLACED", newBet);
    return { success: true };
  }
}

declare global {
  var __rouletteEngine: RouletteEngine | undefined;
}

if (!globalThis.__rouletteEngine) {
  globalThis.__rouletteEngine = new RouletteEngine();
}

export const rouletteEngine = globalThis.__rouletteEngine;

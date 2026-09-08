import crypto from "crypto";
import { prisma } from "@/lib/db";
import { 
  RouletteColor, 
  RoulettePhase, 
  RouletteBet, 
  RoulettePublicState, 
  RouletteListener,
  BetType,
  EUROPEAN_WHEEL,
  RED_NUMBERS,
  getNumberColor, 
  isBetWinning,
  getBetMultiplier 
} from "./rouletteTypes";

export * from "./rouletteTypes";

class RouletteEngine {
  private roundId: string = crypto.randomUUID();
  private phase: RoulettePhase = "BETTING";
  private countdown: number = 12.0;
  private winningNumber: number | null = null;
  private winningAngle: number | null = null;
  private bets: Map<string, RouletteBet> = new Map();
  private history: number[] = [26, 3, 35, 12, 0, 32, 15, 19, 4];
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
      winningAngle: (this.phase !== "BETTING" || isInternal) ? this.winningAngle : null,
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
    this.winningAngle = null;
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
    const RED_ARRAY = Array.from(RED_NUMBERS);
    const BLACK_ARRAY = EUROPEAN_WHEEL.filter((n) => n !== 0 && !RED_NUMBERS.has(n));

    const roll = crypto.randomInt(0, 110);
    if (roll < 10) {
      this.winningNumber = 0;
    } else if (roll < 60) {
      this.winningNumber = RED_ARRAY[crypto.randomInt(0, RED_ARRAY.length)];
    } else {
      this.winningNumber = BLACK_ARRAY[crypto.randomInt(0, BLACK_ARRAY.length)];
    }

    const pocketIndex = EUROPEAN_WHEEL.indexOf(this.winningNumber);
    const pocketAngle = (360 - (pocketIndex * (360 / 37))) % 360;
    const jitter = (crypto.randomInt(0, 70) - 35) / 10;
    this.winningAngle = pocketAngle + jitter;

    this.broadcast("SPIN", {
      roundId: this.roundId,
      winningNumber: this.winningNumber,
      winningAngle: this.winningAngle,
      winningColor: getNumberColor(this.winningNumber),
    });

    this.timer = setTimeout(() => {
      this.startResolvedPhase();
    }, 8000);
  }

  private async startResolvedPhase() {
    if (this.timer) clearTimeout(this.timer);

    this.phase = "RESOLVED";
    const winNum = this.winningNumber!;
    const winColor = getNumberColor(winNum);

    this.history = [winNum, ...this.history.slice(0, 14)];

    const userPayoutMap = new Map<string, number>();

    for (const bet of this.bets.values()) {
      if (isBetWinning(bet.betType, winNum)) {
        const mult = getBetMultiplier(bet.betType);
        const payout = bet.amount * mult;
        userPayoutMap.set(bet.userId, (userPayoutMap.get(bet.userId) || 0) + payout);
      }
    }

    const payouts: { userId: string; payout: number }[] = [];

    for (const [userId, totalPayout] of userPayoutMap.entries()) {
      payouts.push({ userId, payout: totalPayout });
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { paraCoins: { increment: totalPayout } },
        });
      } catch {}
    }

    this.broadcast("RESOLVED", {
      roundId: this.roundId,
      winningNumber: winNum,
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

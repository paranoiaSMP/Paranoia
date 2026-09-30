import crypto from "crypto";

export interface CrashPlayer {
  userId: string;
  name: string;
  image?: string | null;
  minecraftName?: string | null;
  bet: number;
  cashedOut: boolean;
  cashoutMultiplier?: number;
  payout?: number;
}

export type CrashPhase = "BETTING" | "FLYING" | "CRASHED";

export interface CrashPublicState {
  roundId: string;
  phase: CrashPhase;
  countdown: number;
  multiplier: number;
  startedAt: number | null;
  crashPoint: number | null;
  players: CrashPlayer[];
  history: number[];
}

type CrashListener = (event: { type: string; data: any }) => void;

function generateCrashPoint(): number {
  const randInt = crypto.randomInt(0, 1000);
  if (randInt < 35) {
    return 1.00;
  }
  const raw = crypto.randomBytes(4).readUInt32BE(0) / 0xffffffff;
  const multiplier = (1 - 0.04) / (1 - raw);
  return Math.max(1.01, Math.min(1000, Math.floor(multiplier * 100) / 100));
}

class CrashEngine {
  private roundId: string = crypto.randomUUID();
  private phase: CrashPhase = "BETTING";
  private countdown: number = 5.0;
  private startedAt: number | null = null;
  private crashPoint: number = 1.00;
  private players: Map<string, CrashPlayer> = new Map();
  private history: number[] = [1.42, 2.15, 1.10, 5.80, 1.95, 12.40, 1.05];
  private listeners: Set<CrashListener> = new Set();
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

  public subscribe(listener: CrashListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(isInternal = false): CrashPublicState {
    const elapsed = this.startedAt ? (Date.now() - this.startedAt) / 1000 : 0;
    const currentM = this.phase === "FLYING"
      ? Math.max(1.00, Math.floor(Math.pow(Math.E, 0.075 * elapsed) * 100) / 100)
      : this.phase === "CRASHED"
      ? this.crashPoint
      : 1.00;

    return {
      roundId: this.roundId,
      phase: this.phase,
      countdown: parseFloat(this.countdown.toFixed(1)),
      multiplier: currentM,
      startedAt: this.startedAt,
      crashPoint: (this.phase === "CRASHED" || isInternal) ? this.crashPoint : null,
      players: Array.from(this.players.values()),
      history: this.history,
    };
  }

  private startBettingPhase() {
    if (this.timer) clearInterval(this.timer);

    this.roundId = crypto.randomUUID();
    this.phase = "BETTING";
    this.countdown = 5.0;
    this.startedAt = null;
    this.crashPoint = generateCrashPoint();
    this.players.clear();

    this.broadcast("PHASE_CHANGE", this.getState());

    this.timer = setInterval(() => {
      this.countdown = Math.max(0, this.countdown - 0.1);
      this.broadcast("TICK", { countdown: parseFloat(this.countdown.toFixed(1)) });

      if (this.countdown <= 0.05) {
        if (this.timer) clearInterval(this.timer);
        this.startFlyingPhase();
      }
    }, 100);
  }

  private startFlyingPhase() {
    this.phase = "FLYING";
    this.startedAt = Date.now();

    this.broadcast("PHASE_CHANGE", this.getState());

    const flightMs = (Math.log(this.crashPoint) / 0.075) * 1000;

    this.timer = setTimeout(() => {
      this.startCrashedPhase();
    }, Math.min(flightMs, 120000));
  }

  private startCrashedPhase() {
    if (this.timer) clearTimeout(this.timer);

    this.phase = "CRASHED";
    this.history = [this.crashPoint, ...this.history.slice(0, 9)];

    this.broadcast("CRASHED", {
      roundId: this.roundId,
      crashPoint: this.crashPoint,
      history: this.history,
    });

    this.timer = setTimeout(() => {
      this.startBettingPhase();
    }, 3500);
  }

  public placeBet(player: Omit<CrashPlayer, "cashedOut" | "cashoutMultiplier" | "payout">): { success: boolean; error?: string } {
    if (this.phase !== "BETTING" || this.countdown < 0.2) {
      return { success: false, error: "La manche a déjà commencé" };
    }
    if (this.players.has(player.userId)) {
      return { success: false, error: "Mise déjà effectuée pour cette manche" };
    }

    const newPlayer: CrashPlayer = {
      ...player,
      cashedOut: false,
    };

    this.players.set(player.userId, newPlayer);
    this.broadcast("BET_PLACED", newPlayer);
    return { success: true };
  }

  public cashout(userId: string): { success: boolean; payout?: number; multiplier?: number; error?: string } {
    if (this.phase !== "FLYING" || !this.startedAt) {
      return { success: false, error: "La manche n'est pas en cours de vol" };
    }

    const player = this.players.get(userId);
    if (!player) {
      return { success: false, error: "Aucune mise trouvée" };
    }
    if (player.cashedOut) {
      return { success: false, error: "Déjà encaissé" };
    }

    const elapsed = (Date.now() - this.startedAt) / 1000;
    const currentM = Math.max(1.00, Math.floor(Math.pow(Math.E, 0.075 * elapsed) * 100) / 100);

    if (currentM > this.crashPoint) {
      return { success: false, error: "La fusée s'est déjà écrasée" };
    }

    player.cashedOut = true;
    player.cashoutMultiplier = currentM;
    player.payout = Math.floor(player.bet * currentM);

    this.broadcast("PLAYER_CASHOUT", {
      userId,
      multiplier: currentM,
      payout: player.payout,
    });

    return {
      success: true,
      payout: player.payout,
      multiplier: currentM,
    };
  }
}

declare global {
  var __crashEngine: CrashEngine | undefined;
}

if (!globalThis.__crashEngine) {
  globalThis.__crashEngine = new CrashEngine();
}

export const crashEngine = globalThis.__crashEngine;

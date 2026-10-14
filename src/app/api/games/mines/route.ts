import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import crypto from "crypto";
import { seal, openOnce } from "@/lib/games/sealedState";
import { debit, credit, recordBet, recordWin } from "@/lib/games/wallet";
import { authOptions } from "@/lib/auth";

interface MinesGameState {
  userId: string;
  gameId: string;
  bet: number;
  minesCount: number;
  minePositions: number[];
  revealedTiles: number[];
  status: "playing" | "cashed_out" | "busted";
  createdAt: number;
}

function calculateMultiplier(minesCount: number, revealedCount: number): number {
  if (revealedCount <= 0) return 1.00;
  let prob = 1.0;
  for (let i = 0; i < revealedCount; i++) {
    prob *= (25 - minesCount - i) / (25 - i);
  }
  if (prob <= 0) return 1.00;
  const raw = (1 - 0.03) / prob;
  return Math.max(1.01, Math.floor(raw * 100) / 100);
}

function generateMinePositions(minesCount: number): number[] {
  const pool = Array.from({ length: 25 }, (_, i) => i);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, minesCount);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { action, bet, minesCount, token, tileIndex } = body;

  if (action === "start") {
    const betAmount = parseInt(bet, 10);
    const mines = parseInt(minesCount, 10);

    if (isNaN(betAmount) || betAmount < 10 || betAmount > 5000) {
      return NextResponse.json({ error: "Mise invalide (min: 10, max: 5 000 PC)" }, { status: 400 });
    }

    if (isNaN(mines) || mines < 1 || mines > 24) {
      return NextResponse.json({ error: "Nombre de mines invalide (entre 1 et 24)" }, { status: 400 });
    }

    const newBalance = await debit(userId, betAmount);
    if (newBalance === null) {
      return NextResponse.json({ error: "Solde insuffisant" }, { status: 400 });
    }
    await recordBet(userId, betAmount);

    const minePositions = generateMinePositions(mines);
    const state: MinesGameState = {
      userId,
      gameId: crypto.randomUUID(),
      bet: betAmount,
      minesCount: mines,
      minePositions,
      revealedTiles: [],
      status: "playing",
      createdAt: Date.now(),
    };

    const nextMult = calculateMultiplier(mines, 1);

    return NextResponse.json({
      success: true,
      token: seal(state),
      minesCount: mines,
      bet: betAmount,
      nextMultiplier: nextMult,
      currentMultiplier: 1.00,
      currentPayout: betAmount,
      paraCoins: newBalance,
    });
  }

  if (action === "reveal") {
    if (!token || typeof tileIndex !== "number") {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    const state = openOnce<MinesGameState>(token);
    if (!state || state.userId !== userId || state.status !== "playing") {
      return NextResponse.json({ error: "Partie invalide ou expirée" }, { status: 400 });
    }

    if (tileIndex < 0 || tileIndex > 24 || state.revealedTiles.includes(tileIndex)) {
      return NextResponse.json({ error: "Case déjà révélée ou invalide", token: seal(state) }, { status: 400 });
    }

    if (state.minePositions.includes(tileIndex)) {
      state.status = "busted";
      return NextResponse.json({
        status: "busted",
        hitTile: tileIndex,
        minePositions: state.minePositions,
        revealedTiles: state.revealedTiles,
      });
    }

    state.revealedTiles.push(tileIndex);
    const revealedCount = state.revealedTiles.length;
    const currentMult = calculateMultiplier(state.minesCount, revealedCount);
    const maxSafe = 25 - state.minesCount;

    if (revealedCount >= maxSafe) {
      state.status = "cashed_out";
      const payout = Math.floor(state.bet * currentMult);

      const newBalance = await credit(userId, payout);
      await recordWin(userId, payout);

      return NextResponse.json({
        status: "cashed_out",
        autoCashout: true,
        payout,
        multiplier: currentMult,
        minePositions: state.minePositions,
        revealedTiles: state.revealedTiles,
        paraCoins: newBalance,
      });
    }

    const nextMult = calculateMultiplier(state.minesCount, revealedCount + 1);
    const currentPayout = Math.floor(state.bet * currentMult);

    return NextResponse.json({
      status: "playing",
      token: seal(state),
      revealedTiles: state.revealedTiles,
      currentMultiplier: currentMult,
      nextMultiplier: nextMult,
      currentPayout,
    });
  }

  if (action === "cashout") {
    if (!token) {
      return NextResponse.json({ error: "Token manquant" }, { status: 400 });
    }

    const state = openOnce<MinesGameState>(token);
    if (!state || state.userId !== userId || state.status !== "playing") {
      return NextResponse.json({ error: "Partie invalide ou déjà terminée" }, { status: 400 });
    }

    if (state.revealedTiles.length === 0) {
      return NextResponse.json({ error: "Aucune case découverte", token: seal(state) }, { status: 400 });
    }

    state.status = "cashed_out";
    const currentMult = calculateMultiplier(state.minesCount, state.revealedTiles.length);
    const payout = Math.floor(state.bet * currentMult);

    const newBalance = await credit(userId, payout);
      await recordWin(userId, payout);

    return NextResponse.json({
      status: "cashed_out",
      payout,
      multiplier: currentMult,
      minePositions: state.minePositions,
      revealedTiles: state.revealedTiles,
      paraCoins: newBalance,
    });
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}

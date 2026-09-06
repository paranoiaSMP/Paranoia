import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";

interface CrashState {
  gameId: string;
  userId: string;
  bet: number;
  crashPoint: number;
  startedAt: number;
  status: "running" | "cashed_out" | "crashed";
}

function getSecretKey(): string {
  return process.env.NEXTAUTH_SECRET || "paranoia-crash-secret-fallback";
}

function signState(state: CrashState): string {
  const payload = Buffer.from(JSON.stringify(state)).toString("base64url");
  const signature = crypto.createHmac("sha256", getSecretKey()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function verifyState(token: string): CrashState | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  const expected = crypto.createHmac("sha256", getSecretKey()).update(payload).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
  } catch {
    return null;
  }
}

function generateCrashPoint(): number {
  const randInt = crypto.randomInt(0, 1000);
  if (randInt < 35) {
    return 1.00;
  }
  const raw = crypto.randomBytes(4).readUInt32BE(0) / 0xffffffff;
  const multiplier = (1 - 0.04) / (1 - raw);
  return Math.max(1.01, Math.min(1000, Math.floor(multiplier * 100) / 100));
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { action, bet, token, multiplier } = body;

  if (action === "start") {
    const betAmount = parseInt(bet, 10);
    if (isNaN(betAmount) || betAmount < 10 || betAmount > 50000) {
      return NextResponse.json({ error: "Mise invalide (min: 10, max: 50 000)" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { paraCoins: true },
    });

    if (!user || user.paraCoins < betAmount) {
      return NextResponse.json({ error: "Solde insuffisant" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { paraCoins: { decrement: betAmount } },
      select: { paraCoins: true },
    });

    const crashPoint = generateCrashPoint();
    const state: CrashState = {
      gameId: crypto.randomUUID(),
      userId,
      bet: betAmount,
      crashPoint,
      startedAt: Date.now(),
      status: "running",
    };

    const nextToken = signState(state);

    return NextResponse.json({
      success: true,
      token: nextToken,
      paraCoins: updatedUser.paraCoins,
    });
  }

  if (!token) {
    return NextResponse.json({ error: "Token manquant" }, { status: 400 });
  }

  const state = verifyState(token);
  if (!state || state.userId !== userId || state.status !== "running") {
    return NextResponse.json({ error: "Partie invalide ou terminée" }, { status: 400 });
  }

  if (action === "cashout") {
    const claimMultiplier = parseFloat(multiplier);
    if (isNaN(claimMultiplier) || claimMultiplier < 1.01) {
      return NextResponse.json({ error: "Multiplicateur invalide" }, { status: 400 });
    }

    if (claimMultiplier > state.crashPoint) {
      state.status = "crashed";
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { paraCoins: true },
      });

      return NextResponse.json({
        success: false,
        crashed: true,
        crashPoint: state.crashPoint,
        payout: 0,
        paraCoins: user?.paraCoins ?? 0,
      });
    }

    state.status = "cashed_out";
    const payout = Math.floor(state.bet * claimMultiplier);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { paraCoins: { increment: payout } },
      select: { paraCoins: true },
    });

    return NextResponse.json({
      success: true,
      crashed: false,
      payout,
      cashoutMultiplier: claimMultiplier,
      crashPoint: state.crashPoint,
      paraCoins: updatedUser.paraCoins,
    });
  }

  if (action === "reveal") {
    state.status = "crashed";
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { paraCoins: true },
    });

    return NextResponse.json({
      success: true,
      crashPoint: state.crashPoint,
      paraCoins: user?.paraCoins ?? 0,
    });
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}

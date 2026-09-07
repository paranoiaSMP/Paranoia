import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { rouletteEngine, BetType } from "@/lib/games/rouletteEngine";

const VALID_BET_TYPES = new Set([
  "red", "black", "green",
  "even", "odd",
  "low", "high",
  "dozen_1", "dozen_2", "dozen_3"
]);

function isValidBetType(betType: any): betType is BetType {
  if (typeof betType !== "string") return false;
  if (VALID_BET_TYPES.has(betType)) return true;
  if (betType.startsWith("num_")) {
    const num = parseInt(betType.replace("num_", ""), 10);
    return !isNaN(num) && num >= 0 && num <= 36;
  }
  return false;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { action, amount } = body;
  const betType = body.betType || body.color;

  if (action === "bet") {
    const betAmount = parseInt(amount, 10);
    if (isNaN(betAmount) || betAmount < 10 || betAmount > 50000) {
      return NextResponse.json({ error: "Mise invalide (min: 10, max: 50 000)" }, { status: 400 });
    }

    if (!isValidBetType(betType)) {
      return NextResponse.json({ error: "Type de mise invalide" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, image: true, minecraftName: true, paraCoins: true },
    });

    if (!user || user.paraCoins < betAmount) {
      return NextResponse.json({ error: "Solde insuffisant" }, { status: 400 });
    }

    const placeResult = rouletteEngine.placeBet({
      userId,
      name: user.minecraftName || user.name || "Joueur",
      image: user.image,
      minecraftName: user.minecraftName,
      betType,
      color: (betType === "red" || betType === "black" || betType === "green") ? betType : undefined,
      amount: betAmount,
    });

    if (!placeResult.success) {
      return NextResponse.json({ error: placeResult.error }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { paraCoins: { decrement: betAmount } },
      select: { paraCoins: true },
    });

    return NextResponse.json({
      success: true,
      paraCoins: updatedUser.paraCoins,
    });
  }

  if (action === "state") {
    return NextResponse.json(rouletteEngine.getState());
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}

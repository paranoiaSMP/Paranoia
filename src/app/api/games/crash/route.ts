import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { crashEngine } from "@/lib/games/crashEngine";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { action, bet } = body;

  if (action === "bet") {
    const betAmount = parseInt(bet, 10);
    if (isNaN(betAmount) || betAmount < 10 || betAmount > 50000) {
      return NextResponse.json({ error: "Mise invalide (min: 10, max: 50 000)" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, image: true, minecraftName: true, paraCoins: true },
    });

    if (!user || user.paraCoins < betAmount) {
      return NextResponse.json({ error: "Solde insuffisant" }, { status: 400 });
    }

    const placeResult = crashEngine.placeBet({
      userId,
      name: user.minecraftName || user.name || "Joueur",
      image: user.image,
      minecraftName: user.minecraftName,
      bet: betAmount,
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

  if (action === "cashout") {
    const cashoutResult = crashEngine.cashout(userId);
    if (!cashoutResult.success) {
      return NextResponse.json({ error: cashoutResult.error }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { paraCoins: { increment: cashoutResult.payout! } },
      select: { paraCoins: true },
    });

    return NextResponse.json({
      success: true,
      payout: cashoutResult.payout,
      multiplier: cashoutResult.multiplier,
      paraCoins: updatedUser.paraCoins,
    });
  }

  if (action === "state") {
    return NextResponse.json(crashEngine.getState());
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}

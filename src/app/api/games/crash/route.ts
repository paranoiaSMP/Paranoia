import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { debit, credit, recordBet, recordWin } from "@/lib/games/wallet";
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
      select: { name: true, image: true, minecraftName: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Compte introuvable" }, { status: 400 });
    }

    const afterDebit = await debit(userId, betAmount);
    if (afterDebit === null) {
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
      await credit(userId, betAmount);
      return NextResponse.json({ error: placeResult.error }, { status: 400 });
    }
    await recordBet(userId, betAmount);

    return NextResponse.json({
      success: true,
      paraCoins: afterDebit,
    });
  }

  if (action === "cashout") {
    const cashoutResult = crashEngine.cashout(userId);
    if (!cashoutResult.success) {
      return NextResponse.json({ error: cashoutResult.error }, { status: 400 });
    }

    const paraCoins = await credit(userId, cashoutResult.payout!);
    await recordWin(userId, cashoutResult.payout!);

    return NextResponse.json({
      success: true,
      payout: cashoutResult.payout,
      multiplier: cashoutResult.multiplier,
      paraCoins,
    });
  }

  if (action === "state") {
    return NextResponse.json(crashEngine.getState());
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}

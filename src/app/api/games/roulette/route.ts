import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { debit, credit, recordBet, recordWin } from "@/lib/games/wallet";
import { rouletteEngine, RouletteColor } from "@/lib/games/rouletteEngine";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { action, color, amount } = body;

  if (action === "bet") {
    const betAmount = parseInt(amount, 10);
    if (isNaN(betAmount) || betAmount < 10 || betAmount > 50000) {
      return NextResponse.json({ error: "Mise invalide (min: 10, max: 50 000)" }, { status: 400 });
    }

    if (!["red", "green", "black"].includes(color)) {
      return NextResponse.json({ error: "Couleur invalide" }, { status: 400 });
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

    const placeResult = rouletteEngine.placeBet({
      userId,
      name: user.minecraftName || user.name || "Joueur",
      image: user.image,
      minecraftName: user.minecraftName,
      color: color as RouletteColor,
      amount: betAmount,
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

  if (action === "state") {
    return NextResponse.json(rouletteEngine.getState());
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}

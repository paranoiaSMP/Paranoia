import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { notifyWallet } from "@/lib/realtime/emit";

import { BOOSTER_PRICES, type BoosterPackId } from "@/config/boosters";
import { boosterStates, takeStock } from "@/lib/boosters";

const PRICES: Record<string, number> = BOOSTER_PRICES;
class OutOfStock extends Error {}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const boxType: unknown = body?.boxType;

    if (typeof boxType !== "string" || !Object.hasOwn(PRICES, boxType)) {
      return NextResponse.json({ error: "Type de booster invalide." }, { status: 400 });
    }

    const price = PRICES[boxType];
    const state = (await boosterStates())[boxType as BoosterPackId];
    if (!state.visible) {
      return NextResponse.json({ error: "Ce booster n'est pas disponible." }, { status: 400 });
    }

    const remainingCoins = await prisma.$transaction(async (tx) => {
      if (!(await takeStock(tx, boxType as BoosterPackId, state))) throw new OutOfStock();
      const debited = await tx.user.updateMany({
        where: { id: userId, paraCoins: { gte: price } },
        data: { paraCoins: { decrement: price } },
      });
      if (debited.count === 0) throw new Error("FUNDS");

      await tx.userBox.upsert({
        where: { userId_boxType: { userId, boxType } },
        update: { amount: { increment: 1 } },
        create: { userId, boxType, amount: 1 },
      });
      const u = await tx.user.findUnique({ where: { id: userId }, select: { paraCoins: true } });
      return u?.paraCoins ?? 0;
    });


    notifyWallet(userId);
    return NextResponse.json({ success: true, remainingCoins });
  } catch (error) {
    if (error instanceof OutOfStock) return NextResponse.json({ error: "Rupture de stock." }, { status: 409 });
    if (error instanceof Error && error.message === "FUNDS") return NextResponse.json({ error: "Fonds insuffisants" }, { status: 400 });
    console.error("Erreur achat booster:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
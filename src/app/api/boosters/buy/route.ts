import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";

const PRICES: Record<string, number> = {
  standard: 150,
  premium: 250,
  legendary: 400,
  mythic: 750
};

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { boxType } = body;

    if (!boxType || !PRICES[boxType]) {
      return NextResponse.json({ error: "Type de booster invalide." }, { status: 400 });
    }

    const price = PRICES[boxType];

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    if (user.paraCoins < price) {
      return NextResponse.json({ error: "Fonds insuffisants" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { paraCoins: { decrement: price } }
      });

      await tx.userBox.upsert({
        where: { userId_boxType: { userId, boxType } },
        update: { amount: { increment: 1 } },
        create: {
          userId,
          boxType,
          amount: 1
        }
      });
    });

    return NextResponse.json({ success: true, remainingCoins: user.paraCoins - price });
  } catch (error: any) {
    console.error("Erreur achat booster:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
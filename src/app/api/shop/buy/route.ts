import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Temporary: Block all payments
    return NextResponse.json({ error: "Les achats sont temporairement désactivés." }, { status: 403 });

    const { amount } = await req.json();

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }

    const userDB = await prisma.user.update({
      where: { id: userId },
      data: {
        paraCoins: {
          increment: amount
        }
      }
    });

    return NextResponse.json({ success: true, newBalance: userDB.paraCoins });
  } catch (error) {
    console.error("[SHOP_BUY_ERROR]", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
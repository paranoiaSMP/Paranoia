import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";
import { notifyWallet } from "@/lib/realtime/emit";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId || !isAdmin(session.user.role)) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { paraCoins: { increment: 1000 } }
    });

    notifyWallet(userId);
    return NextResponse.json({ success: true, coins: user.paraCoins });
  } catch (error) {
    console.error("Erreur add coins:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
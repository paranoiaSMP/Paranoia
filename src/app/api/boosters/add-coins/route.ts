import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { paraCoins: { increment: 1000 } }
    });

    return NextResponse.json({ success: true, coins: user.paraCoins });
  } catch (error: any) {
    console.error("Erreur add coins:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  try {
    const [owned, total] = await Promise.all([
      prisma.userCard.findMany({
        where: { userId: session.user.id },
        orderBy: { obtainedAt: "desc" },
        select: {
          id: true,
          obtainedAt: true,
          specialEffect: true,
          tradingCard: { include: { player: { select: { id: true, minecraftName: true, uuid: true } } } },
        },
      }),
      prisma.tradingCard.count({ where: { isPublished: true } }),
    ]);
    return NextResponse.json({ owned, total });
  } catch (error) {
    console.error("[COLLECTION_GET]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

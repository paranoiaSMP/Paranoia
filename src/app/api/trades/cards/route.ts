import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const name = (new URL(req.url).searchParams.get("name") ?? "").trim().slice(0, 16);
  if (!name) return NextResponse.json({ error: "Pseudo manquant" }, { status: 400 });

  try {
    const user = await prisma.user.findFirst({
      where: { minecraftName: { equals: name, mode: "insensitive" } },
      select: { id: true, minecraftName: true, showcase: true },
    });
    if (!user) return NextResponse.json({ error: "Joueur introuvable." }, { status: 404 });
    if (user.id === session.user.id) return NextResponse.json({ error: "Tu ne peux pas échanger avec toi-même." }, { status: 400 });

    const cards = await prisma.userCard.findMany({
      where: { userId: user.id, marketListing: null },
      orderBy: { obtainedAt: "desc" },
      select: { id: true, specialEffect: true, tradingCard: { include: { player: { select: { id: true, minecraftName: true, uuid: true } } } } },
    });
    return NextResponse.json({ name: user.minecraftName, cards });
  } catch (error) {
    console.error("[TRADES_CARDS]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

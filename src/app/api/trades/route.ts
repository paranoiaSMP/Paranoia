import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";
import { TRADE_MAX_CARDS, TRADE_MAX_PENDING } from "@/lib/trades";

export const dynamic = "force-dynamic";

const Body = z.object({
  to: z.string().trim().min(1).max(16),
  offered: z.array(z.string().min(1)).min(1).max(TRADE_MAX_CARDS),
  requested: z.array(z.string().min(1)).min(1).max(TRADE_MAX_CARDS),
});

const cardSelect = { id: true, specialEffect: true, tradingCard: { include: { player: { select: { id: true, minecraftName: true, uuid: true } } } } } as const;

export async function GET() {
  const session = await getServerSession(authOptions);
  const me = session?.user?.id;
  if (!me) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  try {
    const trades = await prisma.cardTrade.findMany({
      where: { OR: [{ fromId: me }, { toId: me }] },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    const userIds = [...new Set(trades.flatMap((t) => [t.fromId, t.toId]))];
    const cardIds = [...new Set(trades.flatMap((t) => [...t.offered, ...t.requested]))];
    const [users, cards] = await Promise.all([
      prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, minecraftName: true } }),
      prisma.userCard.findMany({ where: { id: { in: cardIds } }, select: cardSelect }),
    ]);
    const name = new Map(users.map((u) => [u.id, u.minecraftName ?? "Joueur"]));
    const byId = new Map(cards.map((c) => [c.id, c]));
    const pick = (ids: string[]) => ids.map((id) => byId.get(id)).filter((c) => !!c);

    return NextResponse.json({
      me,
      trades: trades.map((t) => ({
        id: t.id,
        status: t.status,
        createdAt: t.createdAt,
        from: name.get(t.fromId),
        to: name.get(t.toId),
        mine: t.fromId === me,
        offered: pick(t.offered),
        requested: pick(t.requested),
      })),
    });
  } catch (error) {
    console.error("[TRADES_GET]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const me = session?.user?.id;
  if (!me) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  if (!rateLimit(`trade:${me}`, 10, 60_000)) return NextResponse.json({ error: "Trop de propositions, attends un peu." }, { status: 429 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  const offered = [...new Set(parsed.data.offered)];
  const requested = [...new Set(parsed.data.requested)];

  try {
    const target = await prisma.user.findFirst({
      where: { minecraftName: { equals: parsed.data.to, mode: "insensitive" } },
      select: { id: true },
    });
    if (!target) return NextResponse.json({ error: "Joueur introuvable." }, { status: 404 });
    if (target.id === me) return NextResponse.json({ error: "Tu ne peux pas échanger avec toi-même." }, { status: 400 });

    const [mine, theirs, pending] = await Promise.all([
      prisma.userCard.count({ where: { id: { in: offered }, userId: me, marketListing: null } }),
      prisma.userCard.count({ where: { id: { in: requested }, userId: target.id, marketListing: null } }),
      prisma.cardTrade.count({ where: { fromId: me, status: "PENDING" } }),
    ]);
    if (mine !== offered.length || theirs !== requested.length) return NextResponse.json({ error: "Une des cartes n'est plus disponible." }, { status: 400 });
    if (pending >= TRADE_MAX_PENDING) return NextResponse.json({ error: `Déjà ${TRADE_MAX_PENDING} propositions en attente.` }, { status: 400 });

    const trade = await prisma.cardTrade.create({ data: { fromId: me, toId: target.id, offered, requested } });
    return NextResponse.json({ success: true, id: trade.id });
  } catch (error) {
    console.error("[TRADES_POST]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

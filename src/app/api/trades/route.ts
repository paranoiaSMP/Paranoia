import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ready } from "@/lib/tradeRoom";
import { rateLimit } from "@/lib/rateLimit";
import { dmUser } from "@/lib/discord-dm";
import { notifyTrade } from "@/lib/realtime/emit";
import { siteConfig } from "@/config/site";
import { TRADE_MAX_PENDING } from "@/lib/trades";

export const dynamic = "force-dynamic";

const Body = z.object({
  to: z.string().trim().min(1).max(16),
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
        fromOk: !!ready.get(t.id)?.from,
        toOk: !!ready.get(t.id)?.to,
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

  try {
    const target = await prisma.user.findFirst({
      where: { minecraftName: { equals: parsed.data.to, mode: "insensitive" } },
      select: { id: true },
    });
    if (!target) return NextResponse.json({ error: "Joueur introuvable." }, { status: 404 });
    if (target.id === me) return NextResponse.json({ error: "Tu ne peux pas échanger avec toi-même." }, { status: 400 });

    // Le destinataire choisit ce qu'il donne en retour au moment d'accepter.
    // Une seule table ouverte entre deux joueurs : on la rouvre au lieu d'en créer une autre.
    const existing = await prisma.cardTrade.findFirst({
      where: { status: "PENDING", OR: [{ fromId: me, toId: target.id }, { fromId: target.id, toId: me }] },
      select: { id: true },
    });
    if (existing) return NextResponse.json({ success: true, id: existing.id });
    const pending = await prisma.cardTrade.count({ where: { fromId: me, status: "PENDING" } });
    if (pending >= TRADE_MAX_PENDING) return NextResponse.json({ error: `Déjà ${TRADE_MAX_PENDING} échanges ouverts.` }, { status: 400 });

    const trade = await prisma.cardTrade.create({ data: { fromId: me, toId: target.id, offered: [], requested: [] } });
    notifyTrade(me, target.id);
    const sender = await prisma.user.findUnique({ where: { id: me }, select: { minecraftName: true } });
    // Pas de await : le MP ne doit pas ralentir ni faire échouer l'ouverture de la table.
    void dmUser(target.id, `🔄 **${sender?.minecraftName ?? "Un joueur"}** veut échanger avec toi. Rejoins la table : ${siteConfig.siteUrl}/jeux/echanges?salle=${trade.id}`);
    return NextResponse.json({ success: true, id: trade.id });
  } catch (error) {
    console.error("[TRADES_POST]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

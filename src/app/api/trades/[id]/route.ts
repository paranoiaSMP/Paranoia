import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notifyTrade } from "@/lib/realtime/emit";
import { ready } from "@/lib/tradeRoom";
import { TRADE_DAILY_LIMIT, TRADE_MAX_CARDS } from "@/lib/trades";

class Refused extends Error {}

async function session() {
  return (await getServerSession(authOptions))?.user?.id;
}

/** PUT : chacun édite sa propre moitié de la table, en direct. Toute modification annule les validations. */
export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  const me = await session();
  if (!me) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  const parsed = z.object({ cards: z.array(z.string().min(1)).max(TRADE_MAX_CARDS) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  const cards = [...new Set(parsed.data.cards)];
  const { id } = await props.params;

  try {
    const trade = await prisma.cardTrade.findUnique({ where: { id } });
    if (!trade || trade.status !== "PENDING" || (trade.fromId !== me && trade.toId !== me)) return NextResponse.json({ error: "Échange introuvable." }, { status: 404 });
    const owned = await prisma.userCard.count({ where: { id: { in: cards }, userId: me, marketListing: null } });
    if (owned !== cards.length) return NextResponse.json({ error: "Une des cartes n'est plus disponible." }, { status: 400 });

    await prisma.cardTrade.update({ where: { id }, data: trade.fromId === me ? { offered: cards } : { requested: cards } });
    ready.delete(id);
    notifyTrade(trade.fromId, trade.toId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[TRADES_PUT]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/** confirm : je valide la table (l'échange part quand les deux ont validé). unconfirm : je retire ma validation. cancel : je ferme la table. */
export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const me = await session();
  if (!me) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  const parsed = z.object({ action: z.enum(["confirm", "unconfirm", "cancel"]) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  const { id } = await props.params;
  const { action } = parsed.data;

  try {
    const trade = await prisma.cardTrade.findUnique({ where: { id } });
    if (!trade || trade.status !== "PENDING" || (trade.fromId !== me && trade.toId !== me)) throw new Refused("Échange introuvable.");
    const side = trade.fromId === me ? "from" : "to";

    if (action === "cancel") {
      await prisma.cardTrade.updateMany({ where: { id, status: "PENDING" }, data: { status: "CANCELLED", resolvedAt: new Date() } });
      ready.delete(id);
    } else if (action === "unconfirm") {
      ready.set(id, { from: false, to: false, ...ready.get(id), [side]: false });
    } else {
      if (trade.offered.length === 0 || trade.requested.length === 0) throw new Refused("Il faut des cartes des deux côtés.");
      const state = { from: false, to: false, ...ready.get(id), [side]: true };
      ready.set(id, state);
      if (state.from && state.to) await swap(id);
    }
    notifyTrade(trade.fromId, trade.toId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Refused) {
      ready.delete(id);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[TRADES_PATCH]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/** Échange atomique : tout passe ou rien. */
async function swap(id: string) {
  await prisma.$transaction(async (tx) => {
    const trade = await tx.cardTrade.findUnique({ where: { id } });
    if (!trade) throw new Refused("Échange introuvable.");
    // Le passage PENDING → ACCEPTED est le verrou : un seul appel peut le gagner.
    const claimed = await tx.cardTrade.updateMany({ where: { id, status: "PENDING" }, data: { status: "ACCEPTED", resolvedAt: new Date() } });
    if (claimed.count === 0) throw new Refused("Cet échange n'est plus en attente.");

    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const done = (userId: string) =>
      tx.cardTrade.count({ where: { status: "ACCEPTED", resolvedAt: { gte: since }, OR: [{ fromId: userId }, { toId: userId }], NOT: { id } } });
    const [a, b] = await Promise.all([done(trade.fromId), done(trade.toId)]);
    if (a >= TRADE_DAILY_LIMIT || b >= TRADE_DAILY_LIMIT) throw new Refused(`Limite de ${TRADE_DAILY_LIMIT} échanges par jour atteinte.`);

    const [fromCards, toCards] = await Promise.all([
      tx.userCard.count({ where: { id: { in: trade.offered }, userId: trade.fromId, marketListing: null } }),
      tx.userCard.count({ where: { id: { in: trade.requested }, userId: trade.toId, marketListing: null } }),
    ]);
    if (fromCards !== trade.offered.length || toCards !== trade.requested.length) throw new Refused("Une des cartes n'est plus disponible.");

    await tx.userCard.updateMany({ where: { id: { in: trade.offered } }, data: { userId: trade.toId } });
    await tx.userCard.updateMany({ where: { id: { in: trade.requested } }, data: { userId: trade.fromId } });

    // Une carte échangée quitte la vitrine de son ancien propriétaire.
    const moved = new Set([...trade.offered, ...trade.requested]);
    for (const userId of [trade.fromId, trade.toId]) {
      const u = await tx.user.findUnique({ where: { id: userId }, select: { showcase: true } });
      if (u?.showcase.some((c) => moved.has(c))) {
        await tx.user.update({ where: { id: userId }, data: { showcase: u.showcase.filter((c) => !moved.has(c)) } });
      }
    }
  });
  ready.delete(id);
}

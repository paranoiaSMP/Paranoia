import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TRADE_DAILY_LIMIT } from "@/lib/trades";

const Body = z.object({ action: z.enum(["accept", "decline", "cancel"]) });
class Refused extends Error {}

/** accept / decline : le destinataire. cancel : l'auteur. L'échange est atomique : tout passe ou rien. */
export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const me = session?.user?.id;
  if (!me) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  const { id } = await props.params;
  const { action } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      const trade = await tx.cardTrade.findUnique({ where: { id } });
      if (!trade || (action === "cancel" ? trade.fromId : trade.toId) !== me) throw new Refused("Échange introuvable.");

      // Le passage PENDING → résolu est le verrou : un seul appel peut le gagner.
      const status = action === "accept" ? "ACCEPTED" : action === "decline" ? "DECLINED" : "CANCELLED";
      const claimed = await tx.cardTrade.updateMany({ where: { id, status: "PENDING" }, data: { status, resolvedAt: new Date() } });
      if (claimed.count === 0) throw new Refused("Cet échange n'est plus en attente.");
      if (action !== "accept") return;

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
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Refused) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("[TRADES_PATCH]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

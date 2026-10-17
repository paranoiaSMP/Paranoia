import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { notifyWallet } from "@/lib/realtime/emit";
import { sellPrice } from "@/lib/cardValue";

const Body = z.union([z.object({ ids: z.array(z.string().min(1)).min(1).max(50) }), z.object({ all: z.literal(true) })]);

class Refused extends Error {}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  const body = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const [user, mine] = await Promise.all([
        tx.user.findUnique({ where: { id: userId }, select: { showcase: true } }),
        tx.userCard.findMany({
          where: { userId },
          select: { id: true, tradingCardId: true, specialEffect: true, marketListing: { select: { id: true } }, tradingCard: { select: { rarity: true } } },
        }),
      ]);
      const inShowcase = (id: string) => !!user?.showcase.includes(id);
      const sellable = (c: (typeof mine)[number]) => !inShowcase(c.id) && !c.marketListing;

      let selected: typeof mine;
      if ("all" in body) {
        // Par carte, on garde un exemplaire (celui de la vitrine ou du marché, sinon le plus précieux) et on vend le reste.
        const byCard = new Map<string, typeof mine>();
        for (const c of mine) byCard.set(c.tradingCardId, [...(byCard.get(c.tradingCardId) ?? []), c]);
        selected = [];
        const worth = (c: (typeof mine)[number]) => sellPrice(c.tradingCard.rarity, c.specialEffect);
        for (const copies of byCard.values()) {
          copies.sort((a, b) => worth(b) - worth(a));
          const keep = copies.find((c) => !sellable(c)) ?? copies[0];
          selected.push(...copies.filter((c) => c !== keep && sellable(c)));
        }
        if (selected.length === 0) throw new Refused("Aucun doublon à vendre.");
      } else {
        const ids = new Set(body.ids);
        selected = mine.filter((c) => ids.has(c.id));
        if (selected.length !== ids.size) throw new Refused("Carte introuvable.");
        if (selected.some((c) => inShowcase(c.id))) throw new Refused("Retire d'abord cette carte de ta vitrine.");
        if (selected.some((c) => c.marketListing)) throw new Refused("Cette carte est en vente sur le marché.");

        // On garde toujours au moins un exemplaire de chaque carte.
        const owned = new Map<string, number>();
        for (const c of mine) owned.set(c.tradingCardId, (owned.get(c.tradingCardId) ?? 0) + 1);
        for (const c of selected) owned.set(c.tradingCardId, owned.get(c.tradingCardId)! - 1);
        if ([...owned.values()].some((n) => n < 1)) throw new Refused("Tu dois garder un exemplaire de chaque carte.");
      }

      const total = selected.reduce((sum, c) => sum + sellPrice(c.tradingCard.rarity, c.specialEffect), 0);
      const { count } = await tx.userCard.deleteMany({ where: { id: { in: selected.map((c) => c.id) }, userId } });
      if (count !== selected.length) throw new Refused("Tes cartes ont changé, réessaie.");
      const u = await tx.user.update({ where: { id: userId }, data: { paraCoins: { increment: total } }, select: { paraCoins: true } });
      return { gained: total, sold: count, paraCoins: u.paraCoins };
    });

    notifyWallet(userId);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof Refused) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("[CARDS_SELL]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { notifyWallet } from "@/lib/realtime/emit";
import { sellPrice } from "@/lib/cardValue";
import { getTcgConfig } from "@/lib/tcgConfig";

const Body = z.object({ ids: z.array(z.string().min(1)).min(1).max(50) });

class Refused extends Error {}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  const ids = [...new Set(parsed.data.ids)];

  try {
    const cfg = await getTcgConfig();
    const SELL_DAILY_CAP = cfg.sellDailyCap;
    const result = await prisma.$transaction(async (tx) => {
      const [user, mine] = await Promise.all([
        tx.user.findUnique({ where: { id: userId }, select: { showcase: true } }),
        tx.userCard.findMany({
          where: { userId },
          select: { id: true, tradingCardId: true, specialEffect: true, marketListing: { select: { id: true } }, tradingCard: { select: { rarity: true } } },
        }),
      ]);
      const selected = mine.filter((c) => ids.includes(c.id));
      if (selected.length !== ids.length) throw new Refused("Carte introuvable.");
      if (selected.some((c) => user?.showcase.includes(c.id))) throw new Refused("Retire d'abord cette carte de ta vitrine.");
      if (selected.some((c) => c.marketListing)) throw new Refused("Cette carte est en vente sur le marché.");

      // On garde toujours au moins un exemplaire de chaque carte.
      const owned = new Map<string, number>();
      for (const c of mine) owned.set(c.tradingCardId, (owned.get(c.tradingCardId) ?? 0) + 1);
      for (const c of selected) owned.set(c.tradingCardId, owned.get(c.tradingCardId)! - 1);
      if ([...owned.values()].some((n) => n < 1)) throw new Refused("Tu dois garder un exemplaire de chaque carte.");

      const total = selected.reduce((sum, c) => sum + sellPrice(c.tradingCard.rarity, c.specialEffect, cfg.sellRate), 0);
      if (total > SELL_DAILY_CAP) throw new Refused(`Plafond de ${SELL_DAILY_CAP} Paracoin par jour.`);

      // Compteur du jour incrémenté atomiquement : la ligne est verrouillée, le plafond ne peut pas être dépassé en parallèle.
      const key = `sell:${userId}:${new Date().toISOString().slice(0, 10)}`;
      const counted = await tx.$queryRaw<{ value: string }[]>`
        INSERT INTO "SystemSetting" ("key", "value", "updatedAt") VALUES (${key}, ${String(total)}, now())
        ON CONFLICT ("key") DO UPDATE SET "value" = ("SystemSetting"."value"::int + ${total})::text, "updatedAt" = now()
        WHERE "SystemSetting"."value"::int + ${total} <= ${SELL_DAILY_CAP}
        RETURNING "value"`;
      if (counted.length === 0) throw new Refused(`Plafond de ${SELL_DAILY_CAP} Paracoin par jour atteint.`);

      await tx.userCard.deleteMany({ where: { id: { in: ids }, userId } });
      const u = await tx.user.update({ where: { id: userId }, data: { paraCoins: { increment: total } }, select: { paraCoins: true } });
      return { gained: total, paraCoins: u.paraCoins, soldToday: Number(counted[0].value) };
    });

    notifyWallet(userId);
    return NextResponse.json({ success: true, ...result, dailyCap: SELL_DAILY_CAP });
  } catch (error) {
    if (error instanceof Refused) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("[CARDS_SELL]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

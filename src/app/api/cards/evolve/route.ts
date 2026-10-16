import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { notifyWallet } from "@/lib/realtime/emit";
import { getTcgConfig } from "@/lib/tcgConfig";
import { canEvolve, cosmicBooster, nextEffect } from "@/lib/cardValue";

const Body = z.object({ ids: z.array(z.string().min(1)).min(2).max(50) });

class Refused extends Error {}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  const ids = parsed.success ? [...new Set(parsed.data.ids)] : [];
  const EVOLVE_COUNT = (await getTcgConfig()).evolveCount;
  if (ids.length !== EVOLVE_COUNT) return NextResponse.json({ error: `Choisis ${EVOLVE_COUNT} cartes différentes.` }, { status: 400 });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const [user, cards] = await Promise.all([
        tx.user.findUnique({ where: { id: userId }, select: { showcase: true } }),
        tx.userCard.findMany({
          where: { id: { in: ids }, userId },
          select: { id: true, tradingCardId: true, specialEffect: true, marketListing: { select: { id: true } }, tradingCard: { select: { rarity: true } } },
        }),
      ]);
      if (cards.length !== EVOLVE_COUNT) throw new Refused("Carte introuvable.");
      if (cards.some((c) => user?.showcase.includes(c.id))) throw new Refused("Retire d'abord cette carte de ta vitrine.");
      if (cards.some((c) => c.marketListing)) throw new Refused("Une de ces cartes est en vente sur le marché.");

      const same = cards.every((c) => c.specialEffect === cards[0].specialEffect && c.tradingCardId === cards[0].tradingCardId);
      if (!same || !canEvolve(cards[0].tradingCard.rarity, cards[0].specialEffect)) throw new Refused(`Il faut ${EVOLVE_COUNT} exemplaires de la même carte avec le même effet, évolutifs (ni Mythique Cosmic, ni Saison, ni fête).`);

      // deleteMany sert de verrou : si une carte a bougé entre-temps, le compte ne tombe pas juste.
      const del = await tx.userCard.deleteMany({ where: { id: { in: ids }, userId } });
      if (del.count !== EVOLVE_COUNT) throw new Refused("Les cartes ont changé, réessaie.");
      if (cards[0].specialEffect === "Cosmic") {
        const boxType = cosmicBooster(cards[0].tradingCard.rarity)!;
        await tx.userBox.upsert({ where: { userId_boxType: { userId, boxType } }, update: { amount: { increment: 1 } }, create: { userId, boxType, amount: 1 } });
        return { booster: boxType };
      }
      const kept = cards[0];
      return tx.userCard.create({
        data: { userId, tradingCardId: kept.tradingCardId, specialEffect: nextEffect(cards[0].specialEffect) },
        select: { id: true, specialEffect: true, tradingCard: { include: { player: { select: { id: true, minecraftName: true, uuid: true } } } } },
      });
    });
    notifyWallet(userId);
    return NextResponse.json({ success: true, ...("booster" in result ? { booster: result.booster } : { card: result }) });
  } catch (error) {
    if (error instanceof Refused) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("[CARDS_EVOLVE]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

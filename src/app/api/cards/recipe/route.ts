import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { getRecipes } from "@/lib/tcgConfig";

const Body = z.object({ recipeId: z.string().min(1) });

class Refused extends Error {}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  try {
    const recipe = (await getRecipes()).find((r) => r.id === parsed.data.recipeId);
    if (!recipe) return NextResponse.json({ error: "Recette introuvable." }, { status: 404 });

    const card = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId }, select: { showcase: true } });
      const used: string[] = [];
      for (const ing of recipe.ingredients) {
        const copies = await tx.userCard.findMany({
          where: { userId, tradingCardId: ing.cardId, marketListing: null, id: { notIn: [...used, ...(user?.showcase ?? [])] } },
          orderBy: [{ specialEffect: { sort: "asc", nulls: "first" } }, { obtainedAt: "asc" }],
          take: ing.qty,
          select: { id: true },
        });
        if (copies.length < ing.qty) throw new Refused("Il te manque des cartes pour cette recette.");
        used.push(...copies.map((c) => c.id));
      }
      // deleteMany sert de verrou : si une carte a bougé entre-temps, le compte ne tombe pas juste.
      const del = await tx.userCard.deleteMany({ where: { id: { in: used }, userId } });
      if (del.count !== used.length) throw new Refused("Les cartes ont changé, réessaie.");
      return tx.userCard.create({
        data: { userId, tradingCardId: recipe.resultId },
        select: { id: true, specialEffect: true, tradingCard: { include: { player: { select: { id: true, minecraftName: true, uuid: true } } } } },
      });
    });
    return NextResponse.json({ success: true, card });
  } catch (error) {
    if (error instanceof Refused) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("[CARDS_RECIPE]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

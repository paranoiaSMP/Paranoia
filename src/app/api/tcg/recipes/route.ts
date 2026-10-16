import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { getRecipes } from "@/lib/tcgConfig";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const recipes = await getRecipes();
  const ids = [...new Set(recipes.flatMap((r) => [r.resultId, ...r.ingredients.map((i) => i.cardId)]))];
  const [cards, user, mine] = await Promise.all([
    prisma.tradingCard.findMany({ where: { id: { in: ids } }, include: { player: { select: { id: true, minecraftName: true, uuid: true } } } }),
    prisma.user.findUnique({ where: { id: userId }, select: { showcase: true } }),
    prisma.userCard.findMany({ where: { userId, tradingCardId: { in: ids }, marketListing: null }, select: { id: true, tradingCardId: true } }),
  ]);
  const byId = new Map(cards.map((c) => [c.id, c]));
  const owned = new Map<string, number>();
  for (const c of mine) if (!user?.showcase.includes(c.id)) owned.set(c.tradingCardId, (owned.get(c.tradingCardId) ?? 0) + 1);

  return NextResponse.json({
    recipes: recipes
      .filter((r) => byId.has(r.resultId) && r.ingredients.every((i) => byId.has(i.cardId)))
      .map((r) => ({
        id: r.id,
        name: r.name,
        result: byId.get(r.resultId),
        ingredients: r.ingredients.map((i) => ({ card: byId.get(i.cardId), qty: i.qty, owned: owned.get(i.cardId) ?? 0 })),
      })),
  });
}

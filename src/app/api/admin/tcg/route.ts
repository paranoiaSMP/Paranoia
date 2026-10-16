import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { getRecipes, getTcgConfig, saveRecipes, saveTcgConfig } from "@/lib/tcgConfig";

async function guard() {
  const session = await getServerSession(authOptions);
  return !!session?.user && isAdmin(session.user.role);
}

const Config = z.object({
  sellRate: z.number().min(0.01).max(1),
  sellDailyCap: z.number().int().min(0).max(1_000_000),
  evolveCount: z.number().int().min(2).max(20),
});
const Recipes = z
  .array(
    z.object({
      id: z.string().min(1).max(40),
      name: z.string().trim().min(1).max(60),
      resultId: z.string().min(1),
      ingredients: z.array(z.object({ cardId: z.string().min(1), qty: z.number().int().min(1).max(20) })).min(1).max(6),
    })
  )
  .max(100);

export async function GET() {
  if (!(await guard())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ config: await getTcgConfig(), recipes: await getRecipes() });
}

export async function PUT(req: Request) {
  if (!(await guard())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = z.object({ config: Config.optional(), recipes: Recipes.optional() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Valeurs invalides." }, { status: 400 });
  const { config, recipes } = parsed.data;
  if (recipes) {
    const ids = [...new Set(recipes.flatMap((r) => [r.resultId, ...r.ingredients.map((i) => i.cardId)]))];
    const known = await prisma.tradingCard.count({ where: { id: { in: ids } } });
    if (known !== ids.length) return NextResponse.json({ error: "Une carte de recette n'existe plus." }, { status: 400 });
    if (new Set(recipes.map((r) => r.id)).size !== recipes.length) return NextResponse.json({ error: "Identifiants de recette en double." }, { status: 400 });
    await saveRecipes(recipes);
  }
  if (config) await saveTcgConfig(config);
  return NextResponse.json({ success: true });
}

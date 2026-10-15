import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { levelOf } from "@/lib/levels";

const PER_PAGE = 24;
const SORTS = {
  xp: [{ xp: "desc" }, { createdAt: "asc" }],
  cartes: [{ inventory: { _count: "desc" } }, { xp: "desc" }],
  recents: [{ createdAt: "desc" }],
} as const;

/** Annuaire public des joueurs (pseudo, niveau, nombre de cartes uniquement). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 16);
  const sortKey = (url.searchParams.get("tri") ?? "xp") as keyof typeof SORTS;
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const where = { minecraftName: q ? { contains: q, mode: "insensitive" as const } : { not: null } };

  try {
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: [...(SORTS[sortKey] ?? SORTS.xp)] as never,
        skip: (page - 1) * PER_PAGE,
        take: PER_PAGE,
        select: { minecraftName: true, minecraftUuid: true, customSkinUrl: true, xp: true, _count: { select: { inventory: true } } },
      }),
    ]);
    return NextResponse.json({
      total,
      pages: Math.max(1, Math.ceil(total / PER_PAGE)),
      players: users.map((u) => ({
        name: u.minecraftName,
        uuid: u.minecraftUuid,
        customSkinUrl: u.customSkinUrl,
        level: levelOf(u.xp).level,
        cards: u._count.inventory,
      })),
    });
  } catch (error) {
    console.error("[JOUEURS_GET]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isVip } from "@/lib/vip";

const RANK: Record<string, number> = { MYTHIC: 6, LEGENDARY: 5, EPIC: 4, RARE: 3, UNCOMMON: 2, COMMON: 1 };

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) return NextResponse.json({ error: "Pseudo invalide" }, { status: 400 });

  try {
    const user = await prisma.user.findFirst({
      where: { minecraftName: { equals: name, mode: "insensitive" } },
      select: {
        minecraftName: true,
        minecraftUuid: true,
        role: true,
        createdAt: true,
        xp: true,
        showcase: true,
        profileAccent: true,
        vipUntil: true,
        profileBio: true,
        profileBanner: true,
        profileHidden: true,
        profileTagline: true,
        profileLinks: true,
        cosmetics: { select: { itemId: true } },
        inventory: {
          select: {
            id: true,
            specialEffect: true,
            tradingCard: { include: { player: { select: { id: true, minecraftName: true, uuid: true } } } },
          },
        },
      },
    });
    if (!user) return NextResponse.json({ error: "Joueur introuvable" }, { status: 404 });

    const cards = user.inventory;
    const distinct = new Set(cards.map((c) => c.tradingCard.id)).size;
    const byRarity: Record<string, number> = {};
    for (const c of cards) byRarity[c.tradingCard.rarity] = (byRarity[c.tradingCard.rarity] ?? 0) + 1;
    // Sélection du joueur si elle existe encore, sinon les plus rares.
    const picked = user.showcase.map((id) => cards.find((c) => c.id === id)).filter((c): c is (typeof cards)[number] => !!c);
    const best = picked.length ? picked : [...cards]
      .sort((a, b) => (RANK[b.tradingCard.rarity] ?? 0) - (RANK[a.tradingCard.rarity] ?? 0) || Number(!!b.specialEffect) - Number(!!a.specialEffect))
      .slice(0, 5);
    const total = await prisma.tradingCard.count({ where: { isPublished: true } });

    const cosmetics = await prisma.launcherShopItem.findMany({
      where: { itemId: { in: user.cosmetics.map((c) => c.itemId) } },
      select: { itemId: true, name: true, category: true, imageUrl: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      cosmetics,
      tagline: user.profileTagline,
      links: user.profileLinks,
      minecraftName: user.minecraftName,
      uuid: user.minecraftUuid,
      role: user.role,
      vip: isVip(user.vipUntil),
      createdAt: user.createdAt,
      xp: user.xp,
      cards: cards.length,
      distinct,
      total,
      byRarity,
      best,
      custom: picked.length > 0,
      accent: user.profileAccent,
      bio: user.profileBio,
      banner: user.profileBanner,
      hidden: user.profileHidden,
    });
  } catch (error) {
    console.error("[PROFILE_GET]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

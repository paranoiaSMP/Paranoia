import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import ShopClient from "@/features/shop/ShopClient";
import type { ShopCosmetic, UserShopProfile } from "@/features/shop/types";

export const metadata: Metadata = {
  title: "Boutique Officielle | Cosmétiques & Grade VIP | Paranoia Studio",
  description:
    "Découvre les cosmétiques exclusifs pour le Launcher Minecraft Paranoia et souscris au grade VIP pour débloquer des privilèges réservés aux membres premium.",
};

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const session = await getServerSession(authOptions);

  const rawCosmetics = await prisma.launcherShopItem.findMany({
    orderBy: { price: "asc" },
  });

  const cosmetics: ShopCosmetic[] = rawCosmetics.map((item) => ({
    id: item.id,
    itemId: item.itemId,
    name: item.name,
    description: item.description,
    price: item.price,
    currency: item.currency,
    imageUrl: item.imageUrl,
    modelUrl: item.modelUrl,
    category: item.category,
  }));

  let userProfile: UserShopProfile | null = null;

  if (session?.user?.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        image: true,
        role: true,
        paraCoins: true,
        minecraftName: true,
        minecraftUuid: true,
        cosmetics: {
          select: { itemId: true },
        },
      },
    });

    if (dbUser) {
      userProfile = {
        id: dbUser.id,
        name: dbUser.name,
        image: dbUser.image,
        role: dbUser.role,
        paraCoins: dbUser.paraCoins,
        minecraftName: dbUser.minecraftName,
        minecraftUuid: dbUser.minecraftUuid,
        ownedItemIds: dbUser.cosmetics.map((c) => c.itemId),
      };
    }
  }

  return <ShopClient initialCosmetics={cosmetics} user={userProfile} />;
}

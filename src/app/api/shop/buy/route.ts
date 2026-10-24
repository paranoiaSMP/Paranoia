import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notifyWallet } from "@/lib/realtime/emit";
import { SHOP_OPEN } from "@/lib/shop";
import { grantCosmeticToPlayer } from "@/lib/syncCosmetics";

export async function POST(req: Request) {
  if (!SHOP_OPEN) return NextResponse.json({ error: "La boutique est fermée." }, { status: 403 });
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Connecte-toi pour acheter un cosmétique." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const itemId = typeof body?.itemId === "string" ? body.itemId.trim() : "";
    if (!itemId) {
      return NextResponse.json({ error: "Identifiant du cosmétique manquant." }, { status: 400 });
    }

    const item = await prisma.launcherShopItem.findUnique({
      where: { itemId },
    });
    if (!item) {
      return NextResponse.json({ error: "Cosmétique introuvable." }, { status: 404 });
    }

    const alreadyOwned = await prisma.userCosmetic.findUnique({
      where: { userId_itemId: { userId, itemId } },
    });
    if (alreadyOwned) {
      return NextResponse.json({ error: "Tu possèdes déjà ce cosmétique." }, { status: 400 });
    }

    const price = item.price;
    const remainingResult = await prisma.$transaction(async (tx) => {
      const debited = await tx.user.updateMany({
        where: { id: userId, paraCoins: { gte: price } },
        data: { paraCoins: { decrement: price } },
      });
      if (debited.count === 0) {
        throw new Error("FUNDS");
      }

      await tx.userCosmetic.create({
        data: {
          userId,
          itemId,
        },
      });

      const u = await tx.user.findUnique({
        where: { id: userId },
        select: { paraCoins: true, minecraftUuid: true, minecraftName: true },
      });
      return {
        coins: u?.paraCoins ?? 0,
        uuid: u?.minecraftUuid,
        name: u?.minecraftName,
      };
    });

    if (remainingResult.uuid) {
      await grantCosmeticToPlayer(remainingResult.uuid, itemId);
    } else if (remainingResult.name) {
      await grantCosmeticToPlayer(remainingResult.name, itemId);
    }

    notifyWallet(userId);

    return NextResponse.json({
      success: true,
      remainingCoins: remainingResult.coins,
      itemId,
      name: item.name,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "FUNDS") {
      return NextResponse.json({ error: "Fonds insuffisants en ParaCoins." }, { status: 400 });
    }
    console.error("[SHOP_BUY_ERROR]", error);
    return NextResponse.json({ error: "Erreur lors du traitement de l'achat." }, { status: 500 });
  }
}

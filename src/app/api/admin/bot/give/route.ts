import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { identifier, rewardType, amount, boxType = "standard" } = await req.json();

    if (!identifier || !amount || amount <= 0) {
      return new NextResponse("Paramètres invalides", { status: 400 });
    }

    const cleanId = identifier.trim();
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { discordId: cleanId },
          { minecraftName: { equals: cleanId, mode: "insensitive" } },
          { id: cleanId },
        ],
      },
    });

    if (!user) {
      return new NextResponse("Joueur introuvable", { status: 404 });
    }

    if (rewardType === "coins") {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          paraCoins: { increment: amount },
        },
        select: {
          id: true,
          name: true,
          minecraftName: true,
          paraCoins: true,
        },
      });

      return NextResponse.json({ success: true, user: updated, message: `+${amount} ParaCoins attribués !` });
    } else if (rewardType === "box") {
      const userBox = await prisma.userBox.upsert({
        where: {
          userId_boxType: {
            userId: user.id,
            boxType: boxType,
          },
        },
        update: {
          amount: { increment: amount },
        },
        create: {
          userId: user.id,
          boxType: boxType,
          amount: amount,
        },
      });

      return NextResponse.json({
        success: true,
        userBox,
        message: `+${amount} Boîte(s) [${boxType.toUpperCase()}] attribuée(s) !`,
      });
    }

    return new NextResponse("Type de récompense invalide", { status: 400 });
  } catch (error) {
    console.error("Failed to give reward:", error);
    return new NextResponse("Erreur interne", { status: 500 });
  }
}

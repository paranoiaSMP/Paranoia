import Link from "next/link";
import { Sparkles, Layers } from "lucide-react";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import PackOpenerClient from "./PackOpenerClient";

export const revalidate = 0;

export const metadata = {
  title: "Trading Cards | PARANOIA",
  description: "Collectionnez les cartes des joueurs du serveur PARANOIA. Achetez des boosters, découvrez des cartes animées 3D rares et complétez votre collection.",
};

export default async function CardsPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  let inventory: any[] = [];
  let userBoxes: any[] = [];
  let paraCoins = 0;
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { paraCoins: true }
    });
    paraCoins = user?.paraCoins || 0;

    inventory = await prisma.userCard.findMany({
      where: { userId },
      include: {
        tradingCard: {
          include: {
            player: true,
            motherLinks: {
              include: { variantProfile: true }
            },
            asVariantLinks: { include: { variantProfile: true } }
          }
        }
      },
      orderBy: { obtainedAt: 'desc' }
    });
    userBoxes = await prisma.userBox.findMany({
      where: { userId }
    });
  }

  const allCards = await prisma.tradingCard.findMany({
    include: {
      player: true,
      motherLinks: {
        include: { variantProfile: true }
      },
      asVariantLinks: { include: { variantProfile: true } }
    },
    orderBy: { rarity: 'desc' }
  });

  const allEditions = await prisma.edition.findMany({
    orderBy: { createdAt: 'asc' }
  });

  const allUsers = await prisma.user.findMany({
    select: { minecraftName: true, id: true }
  });
  const serverPlayers = allUsers
    .map(u => u.minecraftName)
    .filter(Boolean) as string[];

  const currentUserMCName = allUsers.find(u => u.id === userId)?.minecraftName || "";

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Noise & Grid */}
      <div className="absolute inset-0 bg-noise opacity-20 mix-blend-overlay pointer-events-none -z-10"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-12 md:py-16 relative">
        <PackOpenerClient
          initialInventory={inventory}
          initialBoxes={userBoxes}
          initialCoins={paraCoins}
          isLoggedIn={!!userId}
          allCards={allCards}
          allEditions={allEditions}
          serverPlayers={serverPlayers}
          currentUserMCName={currentUserMCName}
        />
      </div>
    </div>
  );
}
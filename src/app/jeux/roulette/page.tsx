import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import RouletteClient from "./RouletteClient";

export const revalidate = 0;

export const metadata = {
  title: "Roulette | Jeux PARANOIA",
  description: "Placez vos paris sur la roue de la fortune et multipliez vos gains par 2 ou par 14 sur le vert.",
};

export default async function RoulettePage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  let paraCoins = 0;
  let minecraftName: string | null = null;
  let userName: string | null = null;

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { paraCoins: true, minecraftName: true, name: true },
    });
    paraCoins = user?.paraCoins || 0;
    minecraftName = user?.minecraftName || null;
    userName = user?.name || null;
  }

  return (
    <RouletteClient
      initialCoins={paraCoins}
      isAuthenticated={!!userId}
      currentUserId={userId || null}
      currentMinecraftName={minecraftName}
      currentUserName={userName}
    />
  );
}

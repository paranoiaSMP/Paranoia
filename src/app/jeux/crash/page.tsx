import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import CrashClient from "./CrashClient";

export const revalidate = 0;

export const metadata = {
  title: "Crash | Jeux PARANOIA",
  description: "Jouez au Crash avec vos ParaCoins. Encaissez avant que la courbe n'explose.",
};

export default async function CrashPage() {
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
    <CrashClient
      initialCoins={paraCoins}
      isAuthenticated={!!userId}
      currentUserId={userId || null}
      currentMinecraftName={minecraftName}
      currentUserName={userName}
    />
  );
}

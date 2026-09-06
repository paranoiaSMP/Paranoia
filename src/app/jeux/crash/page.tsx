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
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { paraCoins: true },
    });
    paraCoins = user?.paraCoins || 0;
  }

  return <CrashClient initialCoins={paraCoins} isAuthenticated={!!userId} />;
}

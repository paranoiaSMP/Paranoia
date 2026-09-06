import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import BlackjackClient from "./BlackjackClient";

export const revalidate = 0;

export const metadata = {
  title: "Blackjack | Jeux PARANOIA",
  description: "Jouez au Blackjack avec vos ParaCoins. Tentez d'atteindre 21 et battez le croupier.",
};

export default async function BlackjackPage() {
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

  return <BlackjackClient initialCoins={paraCoins} isAuthenticated={!!userId} />;
}

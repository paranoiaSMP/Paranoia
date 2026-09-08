import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import MinesClient from "./MinesClient";

export const revalidate = 0;

export const metadata = {
  title: "Mines 5×5 | Jeux PARANOIA",
  description: "Démineur à gains Paranoia Studio. Révélez les émeraudes et évitez la TNT pour multiplier vos ParaCoins.",
};

export default async function MinesPage() {
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

  return <MinesClient initialCoins={paraCoins} isAuthenticated={!!userId} />;
}

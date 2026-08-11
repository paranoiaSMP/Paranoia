import ShopClient from "./ShopClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Boutique & Éditions | PARANOIA",
  description: "Découvrez les éditions de cartes PARANOIA. Achetez des boosters spéciaux, cosmétiques et soutenez le serveur.",
};

export const revalidate = 60;

export default async function ShopPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  let balance = 0;
  if (userId) {
    const userDB = await prisma.user.findUnique({
      where: { id: userId },
      select: { paraCoins: true }
    });
    balance = userDB?.paraCoins || 0;
  }

  let activeEditions: any[] = [];
  try {
    activeEditions = await prisma.edition.findMany({
      where: { showInShop: true }
    });
  } catch (error) {
    console.error("Failed to fetch active editions:", error);
  }

  return (
    <div className="max-w-7xl mx-auto py-12 animate-slide-up relative">
      {/* Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 rounded-full blur-[150px] opacity-10 pointer-events-none"
        style={{ background: 'var(--accent-purple)' }}></div>

      <div className="text-center mb-20 relative z-10 px-4">
        <h1 className="text-3xl sm:text-5xl md:text-7xl font-outfit font-black mb-6 drop-shadow-2xl" style={{ color: 'var(--text-color)' }}>
          Boutique <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-purple-600">PARANOIA</span>
        </h1>
        <p className="text-xl max-w-2xl mx-auto font-medium" style={{ color: 'var(--muted-text)' }}>
          Obtenez des PARA Coins pour ouvrir des boosters exclusifs et dominer la collection de cartes.
        </p>
      </div>

      <ShopClient initialBalance={balance} isLoggedIn={!!userId} editions={activeEditions} />
    </div>
  );
}
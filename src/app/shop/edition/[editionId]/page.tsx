import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { ChevronLeft, Sparkles, PackageOpen } from "lucide-react";
import EditionDetailClient from "./EditionDetailClient";

export default async function EditionPage({ params }: { params: { editionId: string } }) {
  const { editionId } = params;

  const edition = await prisma.edition.findUnique({
    where: { id: editionId }
  });

  if (!edition) {
    return notFound();
  }

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

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {}
      <div className="relative w-full h-[60vh] overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-[20s] hover:scale-110" 
          style={{ backgroundImage: `url(${edition.bannerUrl || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=2000'})` }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-black/40 to-transparent"></div>
        <div className="absolute inset-0 bg-indigo-900/20 mix-blend-overlay"></div>

        <div className="absolute top-8 left-4 sm:left-8 z-20">
          <Link href="/shop" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 group">
            <ChevronLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            Retour à la Boutique
          </Link>
        </div>

        <div className="absolute bottom-12 left-4 sm:left-12 right-4 sm:right-12 z-10">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 bg-indigo-500 text-white font-black text-xs px-4 py-1.5 rounded-full uppercase tracking-widest mb-6 shadow-[0_0_20px_rgba(99,102,241,0.5)] border border-white/20">
              <Sparkles className="w-4 h-4" /> Édition Spéciale
            </div>
            <h1 className="text-5xl md:text-8xl font-outfit font-black text-white mb-6 drop-shadow-2xl uppercase tracking-tighter flex items-center gap-6">
              {edition.iconUrl && <img src={edition.iconUrl} alt={edition.name} className="w-16 h-16 md:w-24 md:h-24 object-contain" />}
              {edition.name}
            </h1>
            {edition.description && (
              <p className="text-white/80 text-xl md:text-2xl max-w-3xl font-medium leading-relaxed drop-shadow-md">
                {edition.description}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <EditionDetailClient 
            edition={edition} 
            isLoggedIn={!!userId} 
            initialBalance={balance} 
        />
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { PackageOpen, Sparkles, Loader2, ShoppingCart, Zap, LayoutGrid, Info } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import CardDisplay from "@/features/binder/components/CardDisplay";

export default function EditionDetailClient({ 
  edition, 
  isLoggedIn, 
  initialBalance 
}: { 
  edition: any, 
  isLoggedIn: boolean, 
  initialBalance: number 
}) {
  const [balance, setBalance] = useState(initialBalance);
  const [loadingBox, setLoadingBox] = useState<string | null>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const router = useRouter();

  const boxes = [
    { id: "standard", name: "Booster Standard", price: 150, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
    { id: "premium", name: "Booster Premium", price: 250, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30" },
    { id: "mythic", name: "Booster Mythique", price: 750, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" }
  ];

  useEffect(() => {
    async function fetchCards() {
      try {
        const res = await fetch(`/api/cards?edition=${edition.name}`);
        if (res.ok) {
          const data = await res.json();
          setCards(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingCards(false);
      }
    }
    fetchCards();
  }, [edition.name]);

  const handleBuyBox = async (boxType: string) => {
    if (!isLoggedIn) {
      toast.error("Veuillez vous connecter pour acheter un booster.");
      return;
    }

    setLoadingBox(boxType);
    try {
      const res = await fetch("/api/boosters/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boxType })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Erreur lors de l'achat");

      setBalance(data.remainingCoins);
      toast.success(`Booster ${boxType} acheté ! Retrouvez-le dans votre inventaire.`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoadingBox(null);
    }
  };

  return (
    <div className="space-y-20">
      
      {/* Economy Overview */}
      {isLoggedIn && (
        <div className="flex justify-center mb-12">
            <div className="bg-[#111118]/80 backdrop-blur-xl border border-white/10 px-8 py-4 rounded-3xl flex items-center gap-6 shadow-2xl">
                <span className="text-white/50 font-bold uppercase tracking-widest text-xs">PARA Coins disponibles</span>
                <div className="flex items-center gap-3">
                    <img src="/Paracoin.png" className="w-8 h-8 object-contain animate-pulse-glow" alt="" />
                    <span className="text-4xl font-outfit font-black text-white">{balance.toLocaleString()}</span>
                </div>
            </div>
        </div>
      )}

      {/* Purchase Boosters Section */}
      {edition.isPurchasable && (
        <section className="space-y-10">
            <div className="text-center">
                <h2 className="text-3xl md:text-5xl font-outfit font-black text-white mb-4 flex items-center justify-center gap-4">
                    <PackageOpen className="w-10 h-10 text-indigo-400" /> Acheter des Boosters
                </h2>
                <p className="text-[var(--color-text-secondary)] text-lg max-w-2xl mx-auto">
                    Tentez votre chance d'obtenir les cartes exclusives de cette édition.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {boxes.map((box) => (
                    <div key={box.id} className={`group relative p-8 rounded-[2rem] border ${box.border} ${box.bg} backdrop-blur-md transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]`}>
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-[2rem]"></div>
                        
                        <div className={`mb-6 text-center ${box.color}`}>
                            <Zap className="w-12 h-12 mx-auto mb-2 drop-shadow-[0_0_10px_currentColor]" />
                            <span className="font-outfit font-black text-xl uppercase tracking-widest">{box.name}</span>
                        </div>

                        <div className="flex flex-col items-center gap-6 relative z-10">
                            <div className="flex items-center gap-2">
                                <img src="/Paracoin.png" className="w-6 h-6 object-contain" alt="" />
                                <span className="text-3xl font-outfit font-black text-white">{box.price}</span>
                            </div>

                            <button 
                                onClick={() => handleBuyBox(box.id)}
                                disabled={loadingBox !== null}
                                className="w-full py-4 bg-white text-black font-black rounded-2xl flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                            >
                                {loadingBox === box.id ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <ShoppingCart className="w-5 h-5" />
                                        ACHETER
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </section>
      )}

      {/* Collection Section */}
      <section className="space-y-10">
        <div className="text-center">
            <h2 className="text-3xl md:text-5xl font-outfit font-black text-white mb-4 flex items-center justify-center gap-4">
                <LayoutGrid className="w-10 h-10 text-fuchsia-400" /> Collection de l'Édition
            </h2>
            <p className="text-[var(--color-text-secondary)] text-lg max-w-2xl mx-auto">
                Explorez l'intégralité des cartes disponibles dans cette série.
            </p>
        </div>

        {loadingCards ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                <span className="text-indigo-200 font-bold animate-pulse">Récupération des cartes...</span>
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {cards.map((card) => (
                    <div key={card.id} className="flex justify-center transform transition-all duration-500 hover:scale-105 hover:z-20">
                        <CardDisplay card={card} size="md" disableTilt={false} />
                    </div>
                ))}
                {cards.length === 0 && (
                    <div className="col-span-full py-32 flex flex-col items-center gap-6 bg-white/5 rounded-3xl border border-white/10 border-dashed">
                        <Info className="w-16 h-16 text-white/20" />
                        <p className="text-[var(--color-text-secondary)] text-xl font-medium">
                            Aucune carte n'a encore été assignée à cette édition.
                        </p>
                    </div>
                )}
            </div>
        )}
      </section>

    </div>
  );
}

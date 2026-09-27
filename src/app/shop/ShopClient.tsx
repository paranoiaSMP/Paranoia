"use client";

import { useState } from "react";
import { Loader2, ShoppingCart, Sparkles, AlertCircle, Zap, ShieldCheck, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from 'react-hot-toast';
import { PricingCards } from "@/components/ui/pricing-cards";

export default function ShopClient({ initialBalance, isLoggedIn, editions = [] }: { initialBalance: number, isLoggedIn: boolean, editions?: any[] }) {
  const [balance, setBalance] = useState(initialBalance);
  const [loadingPkg, setLoadingPkg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const router = useRouter();

  const packages = [
    {
      id: "pkg_100",
      amount: 100,
      price: "2,99€",
      popular: false,
      title: "Pack Débutant",
      baseAmount: 100,
      bonusAmount: 0,
      bgVar: "var(--feature-blue-bg)",
      textVar: "var(--feature-blue-text)",
      borderVar: "var(--feature-blue-border)",
      buttonBg: "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-[0_0_15px_rgba(59,130,246,0.4)] hover:shadow-[0_0_25px_rgba(59,130,246,0.6)] text-white"
    },
    {
      id: "pkg_500",
      amount: 500,
      price: "5,99€",
      popular: true,
      title: "Pack Épique",
      baseAmount: 450,
      bonusAmount: 50,
      bgVar: "var(--feature-purple-bg)",
      textVar: "var(--feature-purple-text)",
      borderVar: "var(--feature-purple-border)",
      buttonBg: "bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 shadow-[0_0_20px_rgba(168,85,247,0.5)] hover:shadow-[0_0_30px_rgba(168,85,247,0.7)] text-white"
    },
    {
      id: "pkg_1000",
      amount: 1000,
      price: "9,99€",
      popular: false,
      title: "Pack Légendaire",
      baseAmount: 850,
      bonusAmount: 150,
      bgVar: "var(--feature-amber-bg)",
      textVar: "var(--feature-amber-text)",
      borderVar: "var(--feature-amber-border)",
      buttonBg: "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-[0_0_15px_rgba(245,158,11,0.4)] hover:shadow-[0_0_25px_rgba(245,158,11,0.6)] text-black"
    }
  ];

  const handleBuy = async (pkgId: string, amount: number) => {
    toast("La boutique est temporairement fermée pour maintenance.", { icon: '🔒' });
    return;

    if (!isLoggedIn) {
      toast("Vous devez être connecté pour faire un achat.", { icon: '⚠️' });
      return;
    }

    setLoadingPkg(pkgId);
    setSuccessMsg(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const res = await fetch("/api/shop/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'achat");

      setBalance(data.newBalance);
      setSuccessMsg(`Succès ! Vous avez reçu ${amount} PARA Coins.`);
      router.refresh();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoadingPkg(null);
    }
  };

  return (
    <div className="w-full relative z-10">

      {editions.length > 0 && (
        <div className="mb-20 space-y-12">
          {editions.map((ed, idx) => (
            <div key={ed.id} className="relative w-full rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl group min-h-[400px]">
              <div className="absolute inset-0 bg-cover bg-center transition-transform duration-[15s] group-hover:scale-110" style={{ backgroundImage: `url(${ed.bannerUrl || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=2000'})` }}></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
              <div className="absolute inset-0 bg-indigo-900/30 mix-blend-overlay"></div>

              <div className="relative z-10 p-5 md:p-16 h-full flex flex-col justify-end">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 bg-indigo-500 text-white font-black text-xs px-4 py-1.5 rounded-full uppercase tracking-widest mb-4 shadow-[0_0_20px_rgba(99,102,241,0.5)] border border-white/20">
                    <Sparkles className="w-4 h-4" /> Édition Spéciale
                  </div>
                  <h2 className="text-3xl md:text-6xl font-outfit font-black text-white mb-4 drop-shadow-lg uppercase tracking-tighter flex items-center gap-4">
                    {ed.iconUrl && <img src={ed.iconUrl} alt={ed.name} className="w-12 h-12 md:w-16 md:h-16 object-contain" />}
                    {ed.name}
                  </h2>

                  <div className="flex flex-wrap gap-4">
                    <button 
                      onClick={() => router.push(`/shop/edition/${ed.id}`)}
                      className="bg-white text-black font-black px-8 py-4 rounded-2xl flex items-center gap-3 transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] uppercase tracking-wider"
                    >
                      Explorer l'Édition <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {successMsg && (
        <div className="mb-12 p-6 bg-green-500/10 border border-green-500/30 rounded-2xl text-green-400 flex items-center justify-center gap-3 animate-fade-in shadow-[0_0_30px_rgba(34,197,94,0.15)] backdrop-blur-md">
          <Sparkles className="w-6 h-6 animate-pulse" />
          <span className="font-bold text-lg">{successMsg}</span>
        </div>
      )}

      {/* HUD Balance (Top on Mobile) */}
      {isLoggedIn && (
        <div className="flex justify-center md:justify-end mb-8 md:mb-12 px-4 md:px-0">
          <div className="relative group cursor-default w-full sm:w-auto">
            <div className="relative flex items-center justify-between sm:justify-start gap-4 px-6 py-4 rounded-xl w-full bg-[var(--color-bg-elevated)] border-2 border-[var(--color-border-color)] shadow-[4px_4px_0px_0px_var(--color-border-color)] transition-transform duration-200 group-hover:-translate-y-1 group-hover:shadow-[6px_6px_0px_0px_var(--color-border-color)]">
              <span className="font-bold uppercase tracking-widest text-xs sm:text-sm text-[var(--color-text-secondary)]">
                Votre Banque
              </span>
              <div className="h-8 w-px hidden sm:block bg-[var(--color-border-color)]"></div>
              <div className="flex items-center gap-2 sm:gap-3">
                <img src="/Paracoin.png" alt="PARA Coins" className="w-6 h-6 sm:w-8 sm:h-8 object-contain" />
                <span className="font-black text-2xl sm:text-3xl tracking-tight text-[var(--color-text-primary)]">
                  {balance.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Packages Pricing (Neo-Brutalist Layout) */}
      <PricingCards 
        plans={packages.map(pkg => ({
          name: pkg.title,
          price: pkg.price,
          isFeatured: pkg.popular,
          buttonText: `Acheter ${pkg.title}`,
          features: [
            `${pkg.baseAmount} PARA Coins`,
            ...(pkg.bonusAmount > 0 ? [`+${pkg.bonusAmount} Coins Bonus`] : []),
            "Achat instantané",
            "Soutient le serveur"
          ],
          extraFeatures: pkg.popular ? ["Avantage Exclusif"] : undefined
        }))} 
      />

      {/* Info Section */}
      <div className="mt-20 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 backdrop-blur-md border border-blue-500/20 rounded-3xl p-8 flex items-start gap-6 max-w-4xl mx-auto shadow-[0_0_30px_rgba(59,130,246,0.05)]">
        <div className="bg-blue-500/20 p-4 rounded-full shrink-0 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
          <ShieldCheck className="w-8 h-8 text-blue-400" />
        </div>
        <div>
          <h4 className="text-xl font-outfit font-bold mb-3" style={{ color: 'var(--text-color)' }}>Paiement 100% Sécurisé</h4>
          <p className="leading-relaxed font-medium" style={{ color: 'var(--muted-text)' }}>
            Les PARA Coins sont une monnaie virtuelle exclusive au serveur PARANOIA, conçue pour l'ouverture de Boosters de Trading Cards.
            Aucun remboursement n'est possible après l'achat. Ce module est actuellement en phase de test (simulateur).
          </p>
        </div>
      </div>
    </div>
  );
}
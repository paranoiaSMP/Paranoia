"use client";

import { useState } from "react";
import { Loader2, ShoppingCart, Sparkles, AlertCircle, Zap, ShieldCheck, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from 'react-hot-toast';

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
        <div className="flex justify-center md:justify-end mb-8 md:mb-12">
          <div className="relative group cursor-default w-full sm:w-auto">
            <div className="absolute -inset-1 bg-gradient-to-r from-[var(--color-accent-purple)] to-[var(--color-accent-red)] rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
            <div className="relative flex items-center justify-between sm:justify-start gap-4 backdrop-blur-xl px-6 py-4 rounded-2xl w-full" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
              <span className="font-medium uppercase tracking-widest text-xs sm:text-sm" style={{ color: 'var(--muted-text)' }}>Votre Banque</span>
              <div className="h-8 w-px hidden sm:block" style={{ background: 'var(--card-border)' }}></div>
              <div className="flex items-center gap-2 sm:gap-3">
                <img src="/Paracoin.png" alt="PARA Coins" className="w-6 h-6 sm:w-8 sm:h-8 object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] animate-pulse-glow" />
                <span className="font-outfit font-black text-2xl sm:text-3xl tracking-tight" style={{ color: 'var(--text-color)' }}>{balance.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Packages (Scroll horizontal sur mobile) */}
      <div className="flex md:grid md:grid-cols-3 gap-6 md:gap-8 lg:gap-12 max-w-6xl mx-auto overflow-x-auto snap-x snap-mandatory pb-8 px-4 md:px-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {packages.map((pkg, i) => (
          <div
            key={pkg.id}
            className="relative group backdrop-blur-xl border rounded-2xl md:rounded-[2rem] p-4 md:p-8 flex flex-col items-center text-center transition-all duration-500 md:hover:scale-[1.02] md:hover:-translate-y-4 shadow-xl shrink-0 snap-center w-[85vw] md:w-auto"
            style={{ background: 'var(--card-bg)', borderColor: pkg.borderVar }}
          >
            {/* Background Glow */}
            <div className="absolute inset-0 blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-2xl md:rounded-[2rem]" style={{ background: pkg.bgVar }}></div>
            {pkg.popular && (
              <div className="absolute -top-4 md:-top-5 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white text-xs md:text-sm font-black px-4 md:px-6 py-1 md:py-1.5 rounded-full uppercase tracking-widest shadow-[0_0_20px_rgba(168,85,247,0.6)] animate-pulse-glow border border-white/20 z-10 flex items-center gap-1.5 md:gap-2">
                <Zap className="w-3.5 h-3.5 md:w-4 md:h-4 fill-white" />
                Populaire
              </div>
            )}
            <div className="mb-2 md:mb-6 mt-2">
              <h3 className="text-lg md:text-xl font-bold uppercase tracking-widest" style={{ color: 'var(--muted-text)' }}>{pkg.title}</h3>
            </div>

            <div className="w-16 h-16 md:w-32 md:h-32 mb-2 md:mb-4 relative flex items-center justify-center">
              <div className="absolute inset-0 rounded-full blur-xl md:blur-2xl opacity-50 group-hover:opacity-100 group-hover:scale-150 transition-all duration-700" style={{ background: pkg.bgVar }}></div>
              <img
                src="/Paracoin.png"
                alt="PARA Coins"
                className="relative z-10 w-full h-full object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.4)] md:drop-shadow-[0_20px_30px_rgba(0,0,0,0.6)] transition-transform duration-700 group-hover:scale-110 group-hover:rotate-12"
              />
            </div>
            {pkg.bonusAmount > 0 && (
              <div className="bg-gradient-to-r from-red-600 to-red-500 border border-red-400/50 text-white font-black text-[10px] md:text-sm px-2 md:px-4 py-0.5 md:py-1 rounded shadow-[0_0_15px_rgba(239,68,68,0.5)] mb-3 md:mb-6 transform -rotate-2 group-hover:scale-110 transition-transform duration-300">
                {pkg.baseAmount} + {pkg.bonusAmount} EN PLUS
              </div>
            )}
            {pkg.bonusAmount === 0 && (
              <div className="hidden md:block h-6 md:h-8 mb-3 md:mb-6"></div> // spacer
            )}
            <h3 className="text-3xl md:text-5xl font-outfit font-black mb-3 md:mb-2 flex items-baseline gap-1 md:gap-2 relative z-10 drop-shadow-lg" style={{ color: 'var(--text-color)' }}>
              {pkg.amount}
              <span className="text-sm md:text-lg font-bold uppercase tracking-widest" style={{ color: pkg.textVar }}>Coins</span>
            </h3>
            <p className="hidden md:block mb-6 md:mb-10 flex-1 relative z-10 font-medium px-4 text-sm md:text-base" style={{ color: 'var(--muted-text)' }}>
              Idéal pour agrandir rapidement votre collection de Trading Cards.
            </p>
            <button
              onClick={() => handleBuy(pkg.id, pkg.amount)}
              disabled={loadingPkg !== null}
              className={`w-full py-3 md:py-4 rounded-xl font-bold flex items-center justify-center gap-2 md:gap-3 transition-all duration-300 relative overflow-hidden group/btn z-10 ${
                loadingPkg === pkg.id
                  ? 'bg-white/10 text-white/50 cursor-not-allowed border border-white/10'
                  : `${pkg.buttonBg} text-white`
              }`}
            >
              {loadingPkg !== pkg.id && (
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 ease-out"></div>
              )}
              <span className="relative z-10 flex items-center gap-1.5 md:gap-2 text-sm md:text-lg">
                {loadingPkg === pkg.id ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Validation...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5" />
                    Acheter {pkg.price}
                  </>
                )}
              </span>
            </button>
          </div>
        ))}
      </div>

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
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Coins, 
  ArrowLeft, 
  RefreshCw, 
  ShieldCheck, 
  HelpCircle, 
  Trophy,
  Sparkles,
  Zap,
  RotateCcw
} from "lucide-react";
import toast from "react-hot-toast";

interface Card {
  suit: string;
  rank: string;
}

const CHIP_VALUES = [10, 25, 50, 100, 250, 500, 1000];

export default function BlackjackClient({
  initialCoins,
  isAuthenticated,
}: {
  initialCoins: number;
  isAuthenticated: boolean;
}) {
  const [coins, setCoins] = useState(initialCoins);
  const [bet, setBet] = useState(50);
  const [token, setToken] = useState<string | null>(null);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [playerScore, setPlayerScore] = useState(0);
  const [dealerScore, setDealerScore] = useState(0);
  const [status, setStatus] = useState<"idle" | "playing" | "dealer_won" | "player_won" | "push" | "player_blackjack">("idle");
  const [canDouble, setCanDouble] = useState(false);
  const [loading, setLoading] = useState(false);
  const [payout, setPayout] = useState(0);

  const isGameActive = status === "playing";

  const handleDeal = async () => {
    if (!isAuthenticated) {
      toast.error("Veuillez vous connecter pour jouer.");
      return;
    }
    if (bet > coins) {
      toast.error("Solde insuffisant.");
      return;
    }
    if (bet < 10) {
      toast.error("Mise minimum : 10 PC.");
      return;
    }

    setLoading(true);
    setPayout(0);
    try {
      const res = await fetch("/api/games/blackjack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deal", bet }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erreur de distribution.");
        return;
      }

      setToken(data.token);
      setPlayerHand(data.playerHand);
      setDealerHand(data.dealerHand);
      setPlayerScore(data.playerScore);
      setDealerScore(data.dealerScore);
      setStatus(data.status);
      setCanDouble(data.status === "playing");
      setCoins(data.paraCoins);
      setPayout(data.payout || 0);

      if (data.status === "player_blackjack") {
        toast.success(`BLACKJACK ! +${data.payout} PC`, { icon: "🃏" });
      } else if (data.status === "push") {
        toast("Égalité ! Mise remboursée.", { icon: "🤝" });
      }
    } catch {
      toast.error("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  };

  const handleHit = async () => {
    if (!token || loading || !isGameActive) return;
    setLoading(true);
    try {
      const res = await fetch("/api/games/blackjack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "hit", token }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erreur.");
        return;
      }

      setToken(data.token);
      setPlayerHand(data.playerHand);
      setDealerHand(data.dealerHand);
      setPlayerScore(data.playerScore);
      setDealerScore(data.dealerScore);
      setStatus(data.status);
      setCanDouble(false);

      if (data.paraCoins !== undefined) setCoins(data.paraCoins);

      if (data.status === "dealer_won") {
        toast.error("Bust (> 21) ! Vous perdez votre mise.");
      }
    } catch {
      toast.error("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  };

  const handleStand = async () => {
    if (!token || loading || !isGameActive) return;
    setLoading(true);
    try {
      const res = await fetch("/api/games/blackjack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stand", token }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erreur.");
        return;
      }

      setToken(null);
      setPlayerHand(data.playerHand);
      setDealerHand(data.dealerHand);
      setPlayerScore(data.playerScore);
      setDealerScore(data.dealerScore);
      setStatus(data.status);
      setCoins(data.paraCoins);
      setPayout(data.payout || 0);

      if (data.status === "player_won") {
        toast.success(`Victoire ! +${data.payout} PC`);
      } else if (data.status === "push") {
        toast("Égalité ! Mise restituée.", { icon: "🤝" });
      } else {
        toast.error("La banque gagne.");
      }
    } catch {
      toast.error("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  };

  const handleDouble = async () => {
    if (!token || loading || !canDouble || !isGameActive) return;
    if (coins < bet) {
      toast.error("Solde insuffisant pour doubler.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/games/blackjack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "double", token }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erreur.");
        return;
      }

      setToken(null);
      setPlayerHand(data.playerHand);
      setDealerHand(data.dealerHand);
      setPlayerScore(data.playerScore);
      setDealerScore(data.dealerScore);
      setStatus(data.status);
      setCanDouble(false);
      setCoins(data.paraCoins);
      setPayout(data.payout || 0);

      if (data.status === "player_won") {
        toast.success(`Victoire doublée ! +${data.payout} PC`);
      } else if (data.status === "push") {
        toast("Égalité ! Double mise rendue.", { icon: "🤝" });
      } else {
        toast.error("Battu par la banque.");
      }
    } catch {
      toast.error("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen text-[var(--text-color)] px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto pt-6 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--card-border)] mb-8">
        <div className="flex items-center gap-3">
          <Link
            href="/jeux"
            className="w-10 h-10 rounded-xl border border-[var(--card-border)] bg-[var(--surface-bg)] flex items-center justify-center hover:bg-white/5 transition-colors text-[var(--nav-item-color)] hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-outfit font-black tracking-tight flex items-center gap-2">
              Blackjack <span className="text-gradient">21</span>
            </h1>
            <p className="text-xs sm:text-sm font-inter text-[var(--nav-item-color)]">
              Table classique • Croupier s'arrête à 17 • Blackjack 3:2
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl border-2 border-[var(--card-border)] bg-[var(--surface-bg)] shadow-sm">
            <Coins className="w-5 h-5 text-purple-400" />
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--nav-item-color)] block">
                Solde
              </span>
              <span className="text-lg font-outfit font-black text-purple-400">
                {coins.toLocaleString("fr-FR")} <span className="text-xs text-[var(--nav-item-color)]">PC</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative rounded-3xl border-2 sm:border-4 border-[var(--card-border)] bg-gradient-to-b from-[#14141e] to-[#0d0d14] p-5 sm:p-10 shadow-2xl overflow-hidden min-h-[500px] flex flex-col justify-between">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--nav-item-color)]">
              Croupier
            </span>
            {dealerScore > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {status === "playing" ? `${dealerScore} + ?` : dealerScore}
              </span>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 sm:gap-3 min-h-[110px] sm:min-h-[135px]">
            {dealerHand.length === 0 ? (
              <div className="w-20 h-28 sm:w-24 sm:h-34 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center text-white/20 text-xs font-bold">
                Croupier
              </div>
            ) : (
              dealerHand.map((card, i) => (
                <PlayingCard key={i} card={card} />
              ))
            )}
          </div>
        </div>

        <div className="relative z-10 my-6 flex flex-col items-center justify-center text-center">
          {status === "player_blackjack" && (
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/40 text-emerald-300 font-outfit font-black text-xl animate-bounce shadow-lg">
              <Sparkles className="w-5 h-5" />
              <span>BLACKJACK NATUREL ! +{payout} PC</span>
            </div>
          )}
          {status === "player_won" && (
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/40 text-emerald-300 font-outfit font-black text-xl shadow-lg">
              <Trophy className="w-5 h-5" />
              <span>VOUS GAGNEZ ! +{payout} PC</span>
            </div>
          )}
          {status === "push" && (
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-2xl bg-blue-500/20 border-2 border-blue-500/40 text-blue-300 font-outfit font-black text-xl shadow-lg">
              <span>ÉGALITÉ (Mise rendue)</span>
            </div>
          )}
          {status === "dealer_won" && (
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-2xl bg-red-500/20 border-2 border-red-500/40 text-red-300 font-outfit font-black text-xl shadow-lg">
              <span>LA BANQUE GAGNE</span>
            </div>
          )}
          {status === "playing" && (
            <div className="text-xs font-bold uppercase tracking-widest text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
              Mise en jeu : {bet} PC
            </div>
          )}
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="flex items-center justify-center gap-2 sm:gap-3 min-h-[110px] sm:min-h-[135px]">
            {playerHand.length === 0 ? (
              <div className="w-20 h-28 sm:w-24 sm:h-34 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center text-white/20 text-xs font-bold">
                Vos Cartes
              </div>
            ) : (
              playerHand.map((card, i) => (
                <PlayingCard key={i} card={card} />
              ))
            )}
          </div>

          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--nav-item-color)]">
              Votre Main
            </span>
            {playerScore > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-black border ${playerScore === 21 ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : playerScore > 21 ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-purple-500/20 text-purple-300 border-purple-500/30'}`}>
                {playerScore} {playerScore > 21 ? "(Bust)" : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 p-5 sm:p-6 rounded-2xl border-2 border-[var(--card-border)] bg-[var(--surface-bg)] shadow-md">
        {isGameActive ? (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <button
              onClick={handleHit}
              disabled={loading}
              className="btn-neo-primary w-full sm:w-auto min-w-[140px] flex items-center justify-center gap-2 py-3.5"
            >
              <Zap className="w-5 h-5" />
              <span>Tirer (Hit)</span>
            </button>

            <button
              onClick={handleStand}
              disabled={loading}
              className="btn-neo-secondary w-full sm:w-auto min-w-[140px] flex items-center justify-center gap-2 py-3.5"
            >
              <RotateCcw className="w-5 h-5 -rotate-90" />
              <span>Rester (Stand)</span>
            </button>

            {canDouble && (
              <button
                onClick={handleDouble}
                disabled={loading || coins < bet}
                className="relative flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-outfit font-bold text-lg border-2 text-white bg-amber-600 border-amber-800 hover:bg-amber-500 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md w-full sm:w-auto"
              >
                <span>Doubler (x2)</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--nav-item-color)]">
                  Mise :
                </span>
                <input
                  type="number"
                  min={10}
                  max={50000}
                  step={10}
                  value={bet}
                  onChange={(e) => setBet(Math.max(10, parseInt(e.target.value) || 10))}
                  className="w-28 px-3 py-1.5 rounded-lg border-2 border-[var(--card-border)] bg-black/30 font-outfit font-black text-purple-400 text-base focus:outline-none focus:border-purple-500"
                />
                <span className="text-xs font-bold text-[var(--nav-item-color)]">PC</span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {CHIP_VALUES.map((val) => (
                  <button
                    key={val}
                    onClick={() => setBet(val)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${bet === val ? 'bg-purple-600 text-white border-purple-400' : 'bg-black/20 border-white/10 hover:border-purple-500/50 text-[var(--text-color)]'}`}
                  >
                    {val}
                  </button>
                ))}
                <button
                  onClick={() => setBet((b) => Math.max(10, Math.floor(b / 2)))}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg border bg-black/20 border-white/10 hover:border-purple-500/50 text-[var(--text-color)]"
                >
                  ½
                </button>
                <button
                  onClick={() => setBet((b) => Math.min(coins, b * 2))}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg border bg-black/20 border-white/10 hover:border-purple-500/50 text-[var(--text-color)]"
                >
                  2×
                </button>
                <button
                  onClick={() => setBet(Math.min(50000, coins))}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg border bg-purple-500/10 border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
                >
                  Max
                </button>
              </div>
            </div>

            <button
              onClick={handleDeal}
              disabled={loading || bet > coins || bet < 10}
              className="btn-neo-primary w-full py-4 text-center justify-center disabled:opacity-50 disabled:cursor-not-allowed text-lg font-black tracking-wide"
            >
              {loading ? "Mélange des cartes..." : `Distribuer • Miser ${bet} PC`}
            </button>
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[var(--nav-item-color)] gap-4 px-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Calculs & tirages sécurisés côté serveur (Provably Fair)</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Blackjack rapporte 3:2</span>
          <span>•</span>
          <span>Gain classique 1:1</span>
          <span>•</span>
          <span>Égalité = Mise restituée</span>
        </div>
      </div>
    </div>
  );
}

function PlayingCard({ card }: { card: Card }) {
  if (card.rank === "?" || card.suit === "?") {
    return (
      <div className="w-20 h-28 sm:w-24 sm:h-34 rounded-xl border-2 border-purple-500/40 bg-gradient-to-br from-purple-900/60 to-black flex items-center justify-center shadow-xl select-none animate-pulse">
        <div className="w-10 h-10 rounded-lg border border-purple-400/30 bg-purple-500/10 flex items-center justify-center text-purple-300 font-outfit font-black text-sm">
          P
        </div>
      </div>
    );
  }

  const isRed = card.suit === "H" || card.suit === "D";
  const suitSymbol = 
    card.suit === "S" ? "♠" :
    card.suit === "H" ? "♥" :
    card.suit === "D" ? "♦" : "♣";

  return (
    <div className="w-20 h-28 sm:w-24 sm:h-34 rounded-xl border-2 border-white/20 bg-white text-zinc-900 flex flex-col justify-between p-2 shadow-2xl select-none transition-transform hover:-translate-y-1">
      <div className="flex items-center justify-between leading-none">
        <span className={`text-base sm:text-lg font-black font-outfit ${isRed ? 'text-red-600' : 'text-zinc-900'}`}>
          {card.rank}
        </span>
        <span className={`text-sm sm:text-base font-black ${isRed ? 'text-red-600' : 'text-zinc-900'}`}>
          {suitSymbol}
        </span>
      </div>

      <div className={`text-2xl sm:text-4xl text-center leading-none ${isRed ? 'text-red-600' : 'text-zinc-900'}`}>
        {suitSymbol}
      </div>

      <div className="flex items-center justify-between leading-none rotate-180">
        <span className={`text-base sm:text-lg font-black font-outfit ${isRed ? 'text-red-600' : 'text-zinc-900'}`}>
          {card.rank}
        </span>
        <span className={`text-sm sm:text-base font-black ${isRed ? 'text-red-600' : 'text-zinc-900'}`}>
          {suitSymbol}
        </span>
      </div>
    </div>
  );
}

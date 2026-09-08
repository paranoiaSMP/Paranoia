"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Volume2, 
  VolumeX, 
  ShieldCheck, 
  Keyboard, 
  HelpCircle,
  Coins,
  ArrowLeft
} from "lucide-react";
import toast from "react-hot-toast";

interface Card {
  suit: string;
  rank: string;
}

type RoundPhase = "BETTING" | "PLAYER_TURN" | "DEALER_TURN" | "FINISHED";

const QUICK_CHIPS = [10, 50, 100, 250, 500, 1000];

function calculateHand(cards: Card[]): number {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.rank === "?" || c.suit === "?") continue;
    if (c.rank === "A") {
      aces++;
      total += 11;
    } else if (["K", "Q", "J", "10"].includes(c.rank)) {
      total += 10;
    } else {
      total += parseInt(c.rank, 10);
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

export default function BlackjackClient({
  initialCoins,
  isAuthenticated,
}: {
  initialCoins: number;
  isAuthenticated: boolean;
}) {
  const [coins, setCoins] = useState(initialCoins);
  const [bet, setBet] = useState(50);
  const [phase, setPhase] = useState<RoundPhase>("BETTING");
  const [outcome, setOutcome] = useState<"dealer_won" | "player_won" | "push" | "player_blackjack" | null>(null);

  const [token, setToken] = useState<string | null>(null);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [canDouble, setCanDouble] = useState(false);
  const [loading, setLoading] = useState(false);
  const [payout, setPayout] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showHelp, setShowHelp] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) audioCtxRef.current = new AudioCtx();
    }
  };

  const playCardSound = () => {
    if (!soundEnabled) return;
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(360, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  };

  const playWinSound = () => {
    if (!soundEnabled) return;
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.07);

      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.07);
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + i * 0.07 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.07 + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.07);
      osc.stop(ctx.currentTime + i * 0.07 + 0.35);
    });
  };

  const playLoseSound = () => {
    if (!soundEnabled) return;
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(160, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  };

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
    setOutcome(null);
    playCardSound();

    try {
      const res = await fetch("/api/games/blackjack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deal", bet }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erreur de distribution.");
        setLoading(false);
        return;
      }

      setToken(data.token);
      setPlayerHand(data.playerHand);
      setDealerHand(data.dealerHand);
      setCoins(data.paraCoins);
      setPayout(data.payout || 0);

      if (data.status === "player_blackjack") {
        setPhase("FINISHED");
        setOutcome("player_blackjack");
        playWinSound();
        toast.success(`BLACKJACK ! +${data.payout} PC`, { icon: "🃏" });
      } else if (data.status === "push") {
        setPhase("FINISHED");
        setOutcome("push");
        toast("Égalité ! Mise remboursée.", { icon: "🤝" });
      } else {
        setPhase("PLAYER_TURN");
        setCanDouble(true);
      }
    } catch {
      toast.error("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  };

  const handleHit = async () => {
    if (!token || loading || phase !== "PLAYER_TURN") return;
    setLoading(true);
    playCardSound();

    try {
      const res = await fetch("/api/games/blackjack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "hit", token }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erreur.");
        setLoading(false);
        return;
      }

      setToken(data.token);
      setPlayerHand(data.playerHand);
      setCanDouble(false);

      if (data.status === "dealer_won") {
        setDealerHand(data.dealerHand);
        setPhase("FINISHED");
        setOutcome("dealer_won");
        playLoseSound();
        toast.error("Bust (> 21) ! Vous perdez.");
      } else {
        const score = calculateHand(data.playerHand);
        if (score === 21) {
          executeDealerTurn("stand", data.token);
          return;
        }
      }
    } catch {
      toast.error("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  };

  const executeDealerTurn = async (actionType: "stand" | "double", currentToken: string) => {
    setPhase("DEALER_TURN");
    setLoading(true);

    try {
      const res = await fetch("/api/games/blackjack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionType, token: currentToken }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erreur.");
        setPhase("PLAYER_TURN");
        setLoading(false);
        return;
      }

      setToken(null);
      setPlayerHand(data.playerHand);

      const finalDealerHand: Card[] = data.dealerHand;
      const initialDealerCards: Card[] = [finalDealerHand[0], finalDealerHand[1]];

      setDealerHand(initialDealerCards);
      playCardSound();

      let delay = 700;
      for (let i = 2; i < finalDealerHand.length; i++) {
        const nextCard = finalDealerHand[i];
        await new Promise((resolve) => setTimeout(resolve, delay));
        setDealerHand((prev) => [...prev, nextCard]);
        playCardSound();
      }

      await new Promise((resolve) => setTimeout(resolve, 500));

      setCoins(data.paraCoins);
      setPayout(data.payout || 0);
      setOutcome(data.status);
      setPhase("FINISHED");

      if (data.status === "player_won") {
        playWinSound();
        toast.success(`Victoire ! +${data.payout} PC`);
      } else if (data.status === "push") {
        toast("Égalité ! Mise restituée.", { icon: "🤝" });
      } else {
        playLoseSound();
        toast.error("La banque gagne.");
      }
    } catch {
      toast.error("Erreur réseau.");
      setPhase("FINISHED");
    } finally {
      setLoading(false);
    }
  };

  const handleStand = () => {
    if (!token || loading || phase !== "PLAYER_TURN") return;
    executeDealerTurn("stand", token);
  };

  const handleDouble = () => {
    if (!token || loading || !canDouble || phase !== "PLAYER_TURN") return;
    if (coins < bet) {
      toast.error("Solde insuffisant pour doubler.");
      return;
    }
    executeDealerTurn("double", token);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === "Space") {
        e.preventDefault();
        if (phase === "BETTING" || phase === "FINISHED") {
          if (!loading) handleDeal();
        }
      } else if (e.code === "KeyH") {
        e.preventDefault();
        if (phase === "PLAYER_TURN" && !loading) handleHit();
      } else if (e.code === "KeyS") {
        e.preventDefault();
        if (phase === "PLAYER_TURN" && !loading) handleStand();
      } else if (e.code === "KeyD") {
        e.preventDefault();
        if (phase === "PLAYER_TURN" && canDouble && !loading) handleDouble();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, loading, canDouble, bet, coins]);

  const playerScore = calculateHand(playerHand);
  const dealerScore = calculateHand(dealerHand);
  const hasHiddenDealerCard = dealerHand.some((c) => c.rank === "?" || c.suit === "?");

  return (
    <div className="min-h-screen text-[var(--text-color)] pt-4 pb-20 px-2 sm:px-6 max-w-7xl mx-auto">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/jeux"
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--nav-item-color)] hover:text-white transition-colors bg-[var(--surface-bg)] hover:bg-white/5 px-3.5 py-2 rounded-xl border-2 border-[var(--card-border)]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Salle des jeux</span>
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 bg-[var(--surface-bg)] border-2 border-[var(--card-border)] px-4 py-1.5 rounded-xl shadow-sm">
            <Coins className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold text-[var(--nav-item-color)]">Solde:</span>
            <span className="text-sm font-black font-mono text-purple-300">
              {coins.toLocaleString("fr-FR")} <span className="text-xs text-[var(--nav-item-color)]">PC</span>
            </span>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="w-10 h-10 rounded-xl bg-[var(--surface-bg)] border-2 border-[var(--card-border)] flex items-center justify-center text-[var(--nav-item-color)] hover:text-white transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-red-400" />}
          </button>

          <button
            onClick={() => setShowHelp(!showHelp)}
            className="w-10 h-10 rounded-xl bg-[var(--surface-bg)] border-2 border-[var(--card-border)] flex items-center justify-center text-[var(--nav-item-color)] hover:text-white transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden border-2 sm:border-4 border-[var(--card-border)] bg-[var(--surface-bg)] shadow-2xl flex flex-col lg:flex-row">
        <div className="w-full lg:w-80 bg-[#0d0d14] p-5 flex flex-col justify-between border-b lg:border-b-0 lg:border-r-2 border-[var(--card-border)] shrink-0">
          <div className="flex flex-col gap-5">
            <div className="flex rounded-xl bg-black/40 p-1 border border-[var(--card-border)]">
              <button className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-purple-600/20 text-purple-300 border border-purple-500/30">
                Manuel
              </button>
              <button disabled className="flex-1 py-1.5 text-xs font-bold text-[var(--nav-item-color)] opacity-50">
                Auto
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-[var(--nav-item-color)]">
                <span>Montant de la mise</span>
                <span>Max: 50 000 PC</span>
              </div>

              <div className="relative flex items-center rounded-xl bg-black/40 border-2 border-[var(--card-border)] focus-within:border-purple-500 transition-colors">
                <input
                  type="number"
                  min={10}
                  max={50000}
                  step={10}
                  value={bet}
                  disabled={phase === "PLAYER_TURN" || phase === "DEALER_TURN"}
                  onChange={(e) => setBet(Math.max(10, parseInt(e.target.value) || 10))}
                  className="w-full bg-transparent px-3.5 py-2.5 text-sm font-black font-mono text-purple-300 focus:outline-none disabled:opacity-50"
                />
                <div className="flex items-center gap-1 pr-2 shrink-0">
                  <button
                    disabled={phase === "PLAYER_TURN" || phase === "DEALER_TURN"}
                    onClick={() => setBet((b) => Math.max(10, Math.floor(b / 2)))}
                    className="px-2 py-1 text-xs font-bold bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 border border-purple-500/20 rounded-lg transition-colors disabled:opacity-40"
                  >
                    ½
                  </button>
                  <button
                    disabled={phase === "PLAYER_TURN" || phase === "DEALER_TURN"}
                    onClick={() => setBet((b) => Math.min(coins, b * 2))}
                    className="px-2 py-1 text-xs font-bold bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 border border-purple-500/20 rounded-lg transition-colors disabled:opacity-40"
                  >
                    2×
                  </button>
                  <button
                    disabled={phase === "PLAYER_TURN" || phase === "DEALER_TURN"}
                    onClick={() => setBet(Math.min(50000, coins))}
                    className="px-2 py-1 text-xs font-bold bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 border border-purple-500/20 rounded-lg transition-colors disabled:opacity-40"
                  >
                    Max
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip}
                  disabled={phase === "PLAYER_TURN" || phase === "DEALER_TURN"}
                  onClick={() => setBet(chip)}
                  className={`py-2 text-xs font-bold rounded-xl border-2 transition-all ${bet === chip ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]' : 'bg-black/40 border-[var(--card-border)] hover:border-purple-500/40 text-[var(--nav-item-color)] hover:text-white'} disabled:opacity-40`}
                >
                  {chip} PC
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[var(--card-border)]">
            {phase === "PLAYER_TURN" ? (
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={handleHit}
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl font-outfit font-black uppercase tracking-wider text-sm bg-purple-600 hover:bg-purple-500 text-white border-2 border-purple-400/40 shadow-[0_4px_15px_rgba(168,85,247,0.3)] flex items-center justify-between px-4 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  <span>Tirer (Hit)</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/30 text-purple-200">H</span>
                </button>

                <button
                  onClick={handleStand}
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl font-outfit font-black uppercase tracking-wider text-sm bg-[#181824] hover:bg-[#222232] text-white border-2 border-[var(--card-border)] flex items-center justify-between px-4 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  <span>Rester (Stand)</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/30 text-zinc-400">S</span>
                </button>

                {canDouble && (
                  <button
                    onClick={handleDouble}
                    disabled={loading || coins < bet}
                    className="w-full py-3 rounded-xl font-outfit font-black uppercase tracking-wider text-xs bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black border-2 border-amber-300/40 flex items-center justify-between px-4 transition-all active:scale-[0.98] disabled:opacity-40 cursor-pointer shadow-md"
                  >
                    <span>Doubler (x2)</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/20 text-black">D</span>
                  </button>
                )}
              </div>
            ) : phase === "DEALER_TURN" ? (
              <div className="w-full py-4 text-center justify-center text-sm font-black tracking-wide text-purple-300 bg-purple-950/40 border-2 border-purple-500/30 rounded-xl animate-pulse">
                Le croupier joue...
              </div>
            ) : (
              <button
                onClick={handleDeal}
                disabled={loading || bet > coins || bet < 10}
                className="btn-neo-primary w-full py-4 text-center justify-center disabled:opacity-50 disabled:cursor-not-allowed text-base font-black tracking-wide"
              >
                <span>{loading ? "Distribution..." : "Parier"}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-black/30 text-purple-200">Espace</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 bg-gradient-to-b from-[#0e0c18] via-[#090810] to-[#05040a] relative p-6 sm:p-10 flex flex-col justify-between min-h-[540px] overflow-hidden select-none">
          <div className="absolute inset-x-8 top-12 bottom-12 rounded-full border-2 border-purple-500/15 shadow-[inset_0_0_60px_rgba(122,10,173,0.08)] pointer-events-none" />

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
            <span className="font-outfit font-black tracking-[0.25em] text-[11px] sm:text-xs text-purple-400/20 uppercase block">
              PARANOIA BLACKJACK • PAYS 3 TO 2
            </span>
            <span className="font-outfit font-bold tracking-[0.15em] text-[10px] text-purple-400/15 uppercase block mt-1">
              DEALER STANDS ON 17
            </span>
          </div>

          <div className="absolute top-6 right-6 flex items-center gap-1 opacity-70">
            <div className="w-14 h-20 rounded-xl border-2 border-purple-500/30 bg-purple-950/40 shadow-md transform rotate-6" />
            <div className="w-14 h-20 rounded-xl border-2 border-purple-500/30 bg-purple-950/40 shadow-md -ml-10 transform -rotate-3" />
            <div className="w-14 h-20 rounded-xl border-2 border-purple-500/30 bg-purple-950/40 shadow-md -ml-10 flex items-center justify-center text-purple-400 text-xs font-black font-outfit">
              P
            </div>
          </div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold text-[var(--nav-item-color)] uppercase tracking-wider">
                Croupier
              </span>
              {dealerScore > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {hasHiddenDealerCard ? `${dealerScore} + ?` : dealerScore}
                </span>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 sm:gap-3 min-h-[110px] sm:min-h-[135px]">
              {dealerHand.length === 0 ? (
                <div className="w-20 h-28 sm:w-24 sm:h-34 rounded-xl border-2 border-purple-500/20 border-dashed flex items-center justify-center text-purple-500/30 text-xs font-bold">
                  Sabot
                </div>
              ) : (
                dealerHand.map((card, i) => (
                  <ParanoiaCard key={i} card={card} index={i} />
                ))
              )}
            </div>
          </div>

          <div className="relative z-20 my-4 flex flex-col items-center justify-center text-center">
            <AnimatePresence>
              {phase === "FINISHED" && outcome === "player_blackjack" && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-6 py-2 rounded-full bg-purple-500/20 border-2 border-purple-400 text-purple-200 font-outfit font-black text-xl shadow-[0_0_30px_rgba(168,85,247,0.5)]"
                >
                  BLACKJACK ! +{payout} PC
                </motion.div>
              )}
              {phase === "FINISHED" && outcome === "player_won" && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-6 py-2 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300 font-outfit font-black text-xl shadow-[0_0_30px_rgba(16,185,129,0.4)]"
                >
                  GAGNÉ ! +{payout} PC
                </motion.div>
              )}
              {phase === "FINISHED" && outcome === "push" && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-6 py-2 rounded-full bg-purple-900/30 border-2 border-purple-500/40 text-purple-200 font-outfit font-black text-lg"
                >
                  ÉGALITÉ (Mise restituée)
                </motion.div>
              )}
              {phase === "FINISHED" && outcome === "dealer_won" && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-6 py-2 rounded-full bg-red-500/20 border-2 border-red-500 text-red-300 font-outfit font-black text-lg shadow-[0_0_25px_rgba(239,68,68,0.4)]"
                >
                  PERDU
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="flex items-center justify-center gap-2 sm:gap-3 min-h-[110px] sm:min-h-[135px]">
              {playerHand.length === 0 ? (
                <div className="w-20 h-28 sm:w-24 sm:h-34 rounded-xl border-2 border-purple-500/20 border-dashed flex items-center justify-center text-purple-500/30 text-xs font-bold">
                  Vos Cartes
                </div>
              ) : (
                playerHand.map((card, i) => (
                  <ParanoiaCard key={i} card={card} index={i} />
                ))
              )}
            </div>

            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs font-bold text-[var(--nav-item-color)] uppercase tracking-wider">
                Joueur
              </span>
              {playerScore > 0 && (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${playerScore === 21 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : playerScore > 21 ? 'bg-red-500/20 text-red-300 border-red-500/40' : 'bg-purple-500/20 text-purple-300 border-purple-500/30'}`}>
                  {playerScore} {playerScore > 21 ? "(Bust)" : ""}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 px-2 flex flex-col sm:flex-row items-center justify-between text-xs text-[var(--nav-item-color)] gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-purple-400" />
          <span>Provably Fair • Résultat certifié côté serveur</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Keyboard className="w-3.5 h-3.5" />
            <span>Raccourcis : [Espace] Parier • [H] Tirer • [S] Rester • [D] Doubler</span>
          </div>
        </div>
      </div>

      {showHelp && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--surface-bg)] border-2 border-[var(--card-border)] rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-outfit font-black text-white mb-3">
              Règles du Blackjack Paranoia
            </h3>
            <ul className="text-xs text-[var(--nav-item-color)] space-y-2 leading-relaxed">
              <li>• L'objectif est d'avoir un total plus proche de 21 que le croupier sans dépasser 21.</li>
              <li>• Les figures (Valet, Dame, Roi) valent 10. L'As vaut 1 ou 11.</li>
              <li>• Un <strong>Blackjack naturel</strong> (As + carte de valeur 10 dès la donne) paie <strong>3:2</strong>.</li>
              <li>• <strong>Tirer (Hit) :</strong> recevez une carte supplémentaire.</li>
              <li>• <strong>Rester (Stand) :</strong> gardez votre main actuelle.</li>
              <li>• <strong>Doubler (Double) :</strong> doublez votre mise, recevez exactement une carte puis passez la main.</li>
              <li>• Le croupier tire obligatoirement jusqu'à atteindre au moins 17 avec suspense tour par tour.</li>
              <li>• En cas d'égalité, votre mise est intégralement remboursée.</li>
            </ul>
            <button
              onClick={() => setShowHelp(false)}
              className="mt-6 w-full py-2.5 rounded-xl btn-neo-primary text-xs font-bold"
            >
              Compris
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ParanoiaCard({ card, index }: { card: Card; index: number }) {
  if (card.rank === "?" || card.suit === "?") {
    return (
      <motion.div
        initial={{ y: -20, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, delay: index * 0.08 }}
        className="w-20 h-28 sm:w-24 sm:h-34 rounded-xl border-2 border-purple-500/40 bg-gradient-to-br from-[#7a0aad]/80 via-[#3b0764] to-[#120520] flex items-center justify-center shadow-[0_4px_20px_rgba(122,10,173,0.3)] relative overflow-hidden select-none"
      >
        <div className="absolute inset-1.5 rounded-lg border border-purple-400/20 bg-black/40 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border border-purple-400/40 bg-purple-500/20 flex items-center justify-center font-outfit font-black text-xs text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.4)]">
            P
          </div>
        </div>
      </motion.div>
    );
  }

  const isRed = card.suit === "H" || card.suit === "D";
  const suitSymbol = 
    card.suit === "S" ? "♠" :
    card.suit === "H" ? "♥" :
    card.suit === "D" ? "♦" : "♣";

  return (
    <motion.div
      initial={{ y: -25, opacity: 0, rotate: -4, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, rotate: 0, scale: 1 }}
      transition={{ duration: 0.25, delay: index * 0.08, ease: "easeOut" }}
      className="w-20 h-28 sm:w-24 sm:h-34 rounded-xl bg-white text-zinc-900 border border-zinc-200 shadow-2xl flex flex-col justify-between p-2.5 select-none relative transform-gpu hover:-translate-y-1 transition-transform"
    >
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
    </motion.div>
  );
}

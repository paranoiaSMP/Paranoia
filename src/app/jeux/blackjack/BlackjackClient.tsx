"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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

const QUICK_CHIPS = [10, 50, 100, 250, 500, 1000];

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
    osc.frequency.setValueAtTime(350, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.08);

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
        playWinSound();
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
        playLoseSound();
        toast.error("Bust (> 21) ! Vous perdez.");
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
    playCardSound();

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
    playCardSound();

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
        playWinSound();
        toast.success(`Victoire doublée ! +${data.payout} PC`);
      } else if (data.status === "push") {
        toast("Égalité ! Double mise rendue.", { icon: "🤝" });
      } else {
        playLoseSound();
        toast.error("Battu par la banque.");
      }
    } catch {
      toast.error("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === "Space") {
        e.preventDefault();
        if (!isGameActive && !loading) handleDeal();
      } else if (e.code === "KeyH") {
        e.preventDefault();
        if (isGameActive && !loading) handleHit();
      } else if (e.code === "KeyS") {
        e.preventDefault();
        if (isGameActive && !loading) handleStand();
      } else if (e.code === "KeyD") {
        e.preventDefault();
        if (isGameActive && canDouble && !loading) handleDouble();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isGameActive, loading, canDouble, bet, coins]);

  return (
    <div className="min-h-screen bg-[#07131b] text-white pt-6 pb-20 px-2 sm:px-6">
      <div className="max-w-7xl mx-auto mb-4 flex items-center justify-between">
        <Link
          href="/jeux"
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#b1bad3] hover:text-white transition-colors bg-[#1a2c38] hover:bg-[#213743] px-3.5 py-2 rounded-lg border border-[#2f4553]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Salle des jeux</span>
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#0f212e] border border-[#2f4553] px-3.5 py-1.5 rounded-lg">
            <Coins className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold text-[#b1bad3]">Solde:</span>
            <span className="text-sm font-black font-mono text-purple-300">
              {coins.toLocaleString("fr-FR")} <span className="text-xs text-[#557086]">PC</span>
            </span>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="w-9 h-9 rounded-lg bg-[#1a2c38] border border-[#2f4553] flex items-center justify-center text-[#b1bad3] hover:text-white transition-colors"
            title="Activer/Couper le son"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-red-400" />}
          </button>

          <button
            onClick={() => setShowHelp(!showHelp)}
            className="w-9 h-9 rounded-lg bg-[#1a2c38] border border-[#2f4553] flex items-center justify-center text-[#b1bad3] hover:text-white transition-colors"
            title="Règles du Blackjack"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto rounded-xl overflow-hidden border border-[#2f4553] bg-[#1a2c38] shadow-2xl flex flex-col lg:flex-row">
        <div className="w-full lg:w-80 bg-[#1a2c38] p-5 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#2f4553] shrink-0">
          <div className="flex flex-col gap-4">
            <div className="flex rounded-lg bg-[#0f212e] p-1 border border-[#2f4553]">
              <button className="flex-1 py-1.5 text-xs font-bold rounded-md bg-[#213743] text-white">
                Manuel
              </button>
              <button disabled className="flex-1 py-1.5 text-xs font-bold text-[#557086] opacity-60">
                Auto
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-[#b1bad3]">
                <span>Montant de la mise</span>
                <span>Max: 50 000 PC</span>
              </div>

              <div className="relative flex items-center rounded-md bg-[#0f212e] border border-[#2f4553] focus-within:border-purple-500 transition-colors">
                <input
                  type="number"
                  min={10}
                  max={50000}
                  step={10}
                  value={bet}
                  disabled={isGameActive}
                  onChange={(e) => setBet(Math.max(10, parseInt(e.target.value) || 10))}
                  className="w-full bg-transparent px-3 py-2.5 text-sm font-bold font-mono text-white focus:outline-none disabled:opacity-60"
                />
                <div className="flex items-center gap-1 pr-1.5 shrink-0">
                  <button
                    disabled={isGameActive}
                    onClick={() => setBet((b) => Math.max(10, Math.floor(b / 2)))}
                    className="px-2 py-1 text-xs font-bold bg-[#213743] hover:bg-[#2f4553] text-[#b1bad3] hover:text-white rounded transition-colors disabled:opacity-50"
                  >
                    ½
                  </button>
                  <button
                    disabled={isGameActive}
                    onClick={() => setBet((b) => Math.min(coins, b * 2))}
                    className="px-2 py-1 text-xs font-bold bg-[#213743] hover:bg-[#2f4553] text-[#b1bad3] hover:text-white rounded transition-colors disabled:opacity-50"
                  >
                    2×
                  </button>
                  <button
                    disabled={isGameActive}
                    onClick={() => setBet(Math.min(50000, coins))}
                    className="px-2 py-1 text-xs font-bold bg-[#213743] hover:bg-[#2f4553] text-[#b1bad3] hover:text-white rounded transition-colors disabled:opacity-50"
                  >
                    Max
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip}
                  disabled={isGameActive}
                  onClick={() => setBet(chip)}
                  className={`py-1.5 text-xs font-bold rounded-md border transition-all ${bet === chip ? 'bg-purple-600 border-purple-400 text-white' : 'bg-[#0f212e] border-[#2f4553] hover:border-[#557086] text-[#b1bad3]'} disabled:opacity-40`}
                >
                  {chip} PC
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#2f4553]">
            {isGameActive ? (
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={handleHit}
                  disabled={loading}
                  className="w-full py-3.5 rounded-md font-black uppercase tracking-wider text-sm bg-[#2f4553] hover:bg-[#3d596c] text-white flex items-center justify-between px-4 transition-all shadow-md active:scale-[0.98] disabled:opacity-50"
                >
                  <span>Tirer (Hit)</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-[#0f212e] text-[#b1bad3]">H</span>
                </button>

                <button
                  onClick={handleStand}
                  disabled={loading}
                  className="w-full py-3.5 rounded-md font-black uppercase tracking-wider text-sm bg-[#e9113c] hover:bg-[#ff2451] text-white flex items-center justify-between px-4 transition-all shadow-md active:scale-[0.98] disabled:opacity-50"
                >
                  <span>Rester (Stand)</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-[#0f212e] text-[#b1bad3]">S</span>
                </button>

                {canDouble && (
                  <button
                    onClick={handleDouble}
                    disabled={loading || coins < bet}
                    className="w-full py-3 rounded-md font-black uppercase tracking-wider text-xs bg-[#f59e0b] hover:bg-[#fbbf24] text-black flex items-center justify-between px-4 transition-all shadow-md active:scale-[0.98] disabled:opacity-40"
                  >
                    <span>Doubler (x2)</span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-black/20 text-black">D</span>
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={handleDeal}
                disabled={loading || bet > coins || bet < 10}
                className="w-full py-4 rounded-md font-black uppercase tracking-wider text-base bg-[#00e701] hover:bg-[#1fff20] text-[#013e01] shadow-[0_4px_18px_rgba(0,231,1,0.35)] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>{loading ? "Mélange..." : "Parier"}</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-black/20 text-[#013e01]">Espace</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 bg-[#0f212e] relative p-6 sm:p-10 flex flex-col justify-between min-h-[540px] overflow-hidden select-none">
          <div className="absolute inset-x-8 top-12 bottom-12 rounded-full border border-[#213743]/50 pointer-events-none" />

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
            <span className="font-outfit font-black tracking-[0.25em] text-[11px] sm:text-xs text-[#213743] uppercase block">
              BLACKJACK PAYS 3 TO 2
            </span>
            <span className="font-outfit font-bold tracking-[0.15em] text-[10px] text-[#213743]/80 uppercase block mt-1">
              DEALER MUST STAND ON 17
            </span>
          </div>

          <div className="absolute top-6 right-6 flex items-center gap-1 opacity-70">
            <div className="w-14 h-20 rounded-md border border-[#2f4553] bg-[#1a2c38] shadow-md transform rotate-6" />
            <div className="w-14 h-20 rounded-md border border-[#2f4553] bg-[#1a2c38] shadow-md -ml-10 transform -rotate-3" />
            <div className="w-14 h-20 rounded-md border border-[#2f4553] bg-[#1a2c38] shadow-md -ml-10" />
          </div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold text-[#b1bad3] uppercase tracking-wider">
                Croupier
              </span>
              {dealerScore > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#213743] text-white border border-[#2f4553]">
                  {status === "playing" ? `${dealerScore}` : dealerScore}
                </span>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 sm:gap-3 min-h-[110px] sm:min-h-[135px]">
              {dealerHand.length === 0 ? (
                <div className="w-20 h-28 sm:w-24 sm:h-34 rounded-xl border border-[#213743] border-dashed flex items-center justify-center text-[#2f4553] text-xs font-bold">
                  Sabot
                </div>
              ) : (
                dealerHand.map((card, i) => (
                  <StakeCard key={i} card={card} index={i} />
                ))
              )}
            </div>
          </div>

          <div className="relative z-20 my-4 flex flex-col items-center justify-center text-center">
            <AnimatePresence>
              {status === "player_blackjack" && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-6 py-2 rounded-full bg-[#00e701]/20 border border-[#00e701] text-[#00e701] font-outfit font-black text-xl shadow-[0_0_25px_rgba(0,231,1,0.4)]"
                >
                  BLACKJACK ! +{payout} PC
                </motion.div>
              )}
              {status === "player_won" && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-6 py-2 rounded-full bg-[#00e701]/20 border border-[#00e701] text-[#00e701] font-outfit font-black text-xl shadow-[0_0_25px_rgba(0,231,1,0.4)]"
                >
                  GAGNÉ ! +{payout} PC
                </motion.div>
              )}
              {status === "push" && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-6 py-2 rounded-full bg-[#2f4553] border border-[#557086] text-white font-outfit font-black text-lg"
                >
                  ÉGALITÉ (Mise restituée)
                </motion.div>
              )}
              {status === "dealer_won" && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-6 py-2 rounded-full bg-[#e9113c]/20 border border-[#e9113c] text-[#e9113c] font-outfit font-black text-lg shadow-[0_0_20px_rgba(233,17,60,0.3)]"
                >
                  PERDU
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="flex items-center justify-center gap-2 sm:gap-3 min-h-[110px] sm:min-h-[135px]">
              {playerHand.length === 0 ? (
                <div className="w-20 h-28 sm:w-24 sm:h-34 rounded-xl border border-[#213743] border-dashed flex items-center justify-center text-[#2f4553] text-xs font-bold">
                  Vos Cartes
                </div>
              ) : (
                playerHand.map((card, i) => (
                  <StakeCard key={i} card={card} index={i} />
                ))
              )}
            </div>

            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs font-bold text-[#b1bad3] uppercase tracking-wider">
                Joueur
              </span>
              {playerScore > 0 && (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${playerScore === 21 ? 'bg-[#00e701]/20 text-[#00e701] border-[#00e701]/40' : playerScore > 21 ? 'bg-[#e9113c]/20 text-[#e9113c] border-[#e9113c]/40' : 'bg-[#213743] text-white border-[#2f4553]'}`}>
                  {playerScore} {playerScore > 21 ? "(Bust)" : ""}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-4 px-2 flex flex-col sm:flex-row items-center justify-between text-xs text-[#557086] gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#00e701]" />
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1a2c38] border border-[#2f4553] rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-outfit font-black text-white mb-3">
              Règles du Blackjack (Stake Style)
            </h3>
            <ul className="text-xs text-[#b1bad3] space-y-2 leading-relaxed">
              <li>• L'objectif est d'avoir un total plus proche de 21 que le croupier sans dépasser 21.</li>
              <li>• Les figures (Valet, Dame, Roi) valent 10. L'As vaut 1 ou 11.</li>
              <li>• Un <strong>Blackjack naturel</strong> (As + carte de valeur 10 dès la donne) paie <strong>3:2</strong>.</li>
              <li>• <strong>Tirer (Hit) :</strong> recevez une carte supplémentaire.</li>
              <li>• <strong>Rester (Stand) :</strong> gardez votre main actuelle.</li>
              <li>• <strong>Doubler (Double) :</strong> doublez votre mise, recevez exactement une carte puis passez la main.</li>
              <li>• Le croupier tire obligatoirement jusqu'à atteindre au moins 17.</li>
              <li>• En cas d'égalité, votre mise est intégralement remboursée.</li>
            </ul>
            <button
              onClick={() => setShowHelp(false)}
              className="mt-6 w-full py-2.5 rounded-lg bg-[#2f4553] hover:bg-[#3d596c] text-white font-bold text-xs"
            >
              Compris
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StakeCard({ card, index }: { card: Card; index: number }) {
  if (card.rank === "?" || card.suit === "?") {
    return (
      <motion.div
        initial={{ y: -20, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, delay: index * 0.08 }}
        className="w-20 h-28 sm:w-24 sm:h-34 rounded-xl border-2 border-[#2f4553] bg-[#1a2c38] flex items-center justify-center shadow-2xl relative overflow-hidden select-none"
      >
        <div className="absolute inset-1.5 rounded-lg border border-[#2f4553]/60 bg-[#0f212e] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border border-purple-500/30 bg-purple-500/10 flex items-center justify-center font-outfit font-black text-xs text-purple-400">
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
        <span className={`text-base sm:text-lg font-black font-outfit ${isRed ? 'text-[#eb0400]' : 'text-[#0f212e]'}`}>
          {card.rank}
        </span>
        <span className={`text-sm sm:text-base font-black ${isRed ? 'text-[#eb0400]' : 'text-[#0f212e]'}`}>
          {suitSymbol}
        </span>
      </div>

      <div className={`text-2xl sm:text-4xl text-center leading-none ${isRed ? 'text-[#eb0400]' : 'text-[#0f212e]'}`}>
        {suitSymbol}
      </div>

      <div className="flex items-center justify-between leading-none rotate-180">
        <span className={`text-base sm:text-lg font-black font-outfit ${isRed ? 'text-[#eb0400]' : 'text-[#0f212e]'}`}>
          {card.rank}
        </span>
        <span className={`text-sm sm:text-base font-black ${isRed ? 'text-[#eb0400]' : 'text-[#0f212e]'}`}>
          {suitSymbol}
        </span>
      </div>
    </motion.div>
  );
}

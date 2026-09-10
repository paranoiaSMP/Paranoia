"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, HelpCircle } from "lucide-react";
import toast from "react-hot-toast";

import { Card, HistoryRow, RoundPhase, calculateHand } from "./types";
import BlackjackTable from "./components/BlackjackTable";
import BlackjackControls from "./components/BlackjackControls";
import BlackjackSidebar from "./components/BlackjackSidebar";
import BlackjackRulesModal from "./components/BlackjackRulesModal";

export default function BlackjackClient({
  initialCoins,
  userName = "Joueur",
  isAuthenticated,
}: {
  initialCoins: number;
  userName?: string;
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

  const [handsPlayed, setHandsPlayed] = useState(0);
  const [handsWon, setHandsWon] = useState(0);
  const [net, setNet] = useState(0);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [showHelp, setShowHelp] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) audioCtxRef.current = new AudioCtx();
    }
  };

  const playCardSound = () => {
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(360, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {}
  };

  const playWinSound = () => {
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [440, 554, 659, 880].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.1, now + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.25);
      });
    } catch {}
  };

  const setValidBet = (val: number) => {
    if (phase === "PLAYER_TURN" || phase === "DEALER_TURN" || loading) return;
    setBet(Math.min(50000, Math.max(10, Math.round(val) || 10)));
  };

  const handleDeal = async () => {
    if (loading) return;
    if (!isAuthenticated) {
      toast.error("Connectez-vous pour jouer au Blackjack");
      return;
    }
    if (bet < 10) {
      toast.error("La mise minimale est de 10 PC");
      return;
    }
    if (coins < bet) {
      toast.error("Solde insuffisant de ParaCoins");
      return;
    }

    setLoading(true);
    playCardSound();

    try {
      const res = await fetch("/api/games/blackjack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deal", bet }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || "Impossible de démarrer la partie");
        setLoading(false);
        return;
      }

      setCoins(data.paraCoins);
      setPlayerHand(data.playerHand);
      setDealerHand(data.dealerHand);
      setCanDouble(data.status === "playing");
      setToken(data.token);

      if (data.status === "playing") {
        setPhase("PLAYER_TURN");
        setOutcome(null);
        setPayout(0);
      } else {
        finishRound(data.status, data.payout, data.playerHand, data.dealerHand, bet);
      }
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  const handleHit = async () => {
    if (loading || phase !== "PLAYER_TURN" || !token) return;
    setLoading(true);
    playCardSound();

    try {
      const res = await fetch("/api/games/blackjack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "hit", token }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || "Erreur de pioche");
        setLoading(false);
        return;
      }

      setPlayerHand(data.playerHand);
      setDealerHand(data.dealerHand);
      setCanDouble(false);
      setToken(data.token);

      if (data.status === "playing") {
        setPhase("PLAYER_TURN");
      } else {
        finishRound(data.status, data.payout, data.playerHand, data.dealerHand, bet);
      }
    } catch {
      toast.error("Erreur de communication");
    } finally {
      setLoading(false);
    }
  };

  const handleStand = async () => {
    if (loading || phase !== "PLAYER_TURN" || !token) return;
    setLoading(true);
    setPhase("DEALER_TURN");

    try {
      const res = await fetch("/api/games/blackjack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stand", token }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || "Erreur d'action");
        setLoading(false);
        return;
      }

      setPlayerHand(data.playerHand);
      setDealerHand(data.dealerHand);
      finishRound(data.status, data.payout, data.playerHand, data.dealerHand, bet);
    } catch {
      toast.error("Erreur de communication");
    } finally {
      setLoading(false);
    }
  };

  const handleDouble = async () => {
    if (loading || phase !== "PLAYER_TURN" || !token || !canDouble) return;
    if (coins < bet) {
      toast.error("Solde insuffisant pour doubler");
      return;
    }

    setLoading(true);
    playCardSound();
    setPhase("DEALER_TURN");

    try {
      const res = await fetch("/api/games/blackjack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "double", token }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || "Erreur de doublage");
        setLoading(false);
        return;
      }

      setPlayerHand(data.playerHand);
      setDealerHand(data.dealerHand);
      finishRound(data.status, data.payout, data.playerHand, data.dealerHand, bet * 2);
    } catch {
      toast.error("Erreur de communication");
    } finally {
      setLoading(false);
    }
  };

  const finishRound = (
    finalStatus: "dealer_won" | "player_won" | "push" | "player_blackjack",
    finalPayout: number,
    finalPlayerHand: Card[],
    finalDealerHand: Card[],
    stake: number
  ) => {
    setPhase("FINISHED");
    setOutcome(finalStatus);
    setPayout(finalPayout);
    setToken(null);

    const delta = finalPayout - stake;
    if (finalStatus === "player_won" || finalStatus === "player_blackjack") {
      playWinSound();
    }

    const labels: Record<string, [string, string]> = {
      player_blackjack: ["Blackjack", "#d8b4fe"],
      player_won: ["Gagné", "#34d399"],
      push: ["Égalité", "#94a3b8"],
      dealer_won: ["Perdu", "#fca5a5"],
    };

    setHandsPlayed((prev) => prev + 1);
    if (finalStatus === "player_won" || finalStatus === "player_blackjack") {
      setHandsWon((prev) => prev + 1);
    }
    setNet((prev) => prev + delta);

    const pScore = calculateHand(finalPlayerHand);
    const dScore = calculateHand(finalDealerHand);

    setHistory((prev) => [
      {
        n: handsPlayed + 1,
        label: labels[finalStatus][0],
        color: labels[finalStatus][1],
        score: `${pScore} / ${dScore}`,
        delta: (delta > 0 ? "+" : "") + delta.toLocaleString("fr-FR"),
      },
      ...prev.slice(0, 11),
    ]);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.code === "Space") {
        e.preventDefault();
        if (phase === "BETTING" || phase === "FINISHED") handleDeal();
      } else if (e.code === "KeyH") {
        e.preventDefault();
        if (phase === "PLAYER_TURN") handleHit();
      } else if (e.code === "KeyS") {
        e.preventDefault();
        if (phase === "PLAYER_TURN") handleStand();
      } else if (e.code === "KeyD") {
        e.preventDefault();
        if (phase === "PLAYER_TURN" && canDouble) handleDouble();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, canDouble, bet, coins, token, loading]);

  return (
    <main className="relative z-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pt-4 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10 mb-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <Link
            href="/jeux"
            className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Salle des jeux
          </Link>
          <span className="w-px h-4 bg-white/15" />
          <h1 className="font-outfit text-xl sm:text-2xl font-black text-white">Blackjack</h1>
        </div>

        <div className="flex items-center gap-4 font-mono text-xs text-zinc-400">
          <span>
            Limites <strong className="text-white font-bold">10 – 50 000</strong>
          </span>
          <button
            type="button"
            onClick={() => setShowHelp(true)}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer bg-transparent border-0"
          >
            <HelpCircle className="w-4 h-4" />
            Règles
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-stretch">
        <section className="flex-[1_1_560px] min-w-[320px] flex flex-col border border-white/10 rounded-2xl overflow-hidden bg-[#0b0a12] shadow-2xl">
          <BlackjackTable
            phase={phase}
            handsPlayed={handsPlayed}
            bet={bet}
            userName={userName}
            playerHand={playerHand}
            dealerHand={dealerHand}
            outcome={outcome}
            payout={payout}
          />
          <BlackjackControls
            phase={phase}
            bet={bet}
            coins={coins}
            canDouble={canDouble}
            loading={loading}
            onSetBet={setValidBet}
            onDeal={handleDeal}
            onHit={handleHit}
            onStand={handleStand}
            onDouble={handleDouble}
          />
        </section>

        <BlackjackSidebar
          coins={coins}
          handsPlayed={handsPlayed}
          handsWon={handsWon}
          net={net}
          history={history}
        />
      </div>

      {showHelp && <BlackjackRulesModal onClose={() => setShowHelp(false)} />}
    </main>
  );
}

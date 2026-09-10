"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, HelpCircle, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";

interface Card {
  suit: string;
  rank: string;
  hidden?: boolean;
}

interface HistoryRow {
  n: number;
  label: string;
  color: string;
  score: string;
  delta: string;
}

type RoundPhase = "BETTING" | "PLAYER_TURN" | "DEALER_TURN" | "FINISHED";

function calculateHand(cards: Card[]): number {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (!c || c.hidden || c.rank === "?" || c.suit === "?") continue;
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

  const pScore = calculateHand(playerHand);
  const dScore = calculateHand(dealerHand);
  const hasHiddenDealerCard = dealerHand.some((c) => c.hidden || c.rank === "?" || c.suit === "?");

  const phaseLabels: Record<RoundPhase, string> = {
    BETTING: "Placez votre mise",
    PLAYER_TURN: "À vous de jouer",
    DEALER_TURN: "Tour du croupier",
    FINISHED: "Main terminée",
  };

  const renderCard = (card: Card, index: number) => {
    const isHidden = card.hidden || card.rank === "?" || card.suit === "?";
    if (isHidden) {
      return (
        <div
          key={`hidden-${index}`}
          className="w-[clamp(58px,6.4vw,88px)] h-[clamp(82px,9.1vw,126px)] shrink-0 rounded-[6px] border border-purple-500/40 bg-[repeating-linear-gradient(45deg,#3b0764_0_5px,#2a0a45_5px_10px)] flex items-center justify-center animate-[deal-in_0.22s_ease-out_both]"
          style={{ animationDelay: `${index * 0.07}s` }}
        >
          <span className="font-outfit font-black text-sm text-purple-300/80 tracking-widest">P</span>
        </div>
      );
    }

    const isRed = card.suit === "H" || card.suit === "D";
    const symbolMap: Record<string, string> = { S: "♠", H: "♥", D: "♦", C: "♣" };
    const sym = symbolMap[card.suit] || card.suit;
    const inkClass = isRed ? "text-[#c0121a]" : "text-[#131318]";

    return (
      <div
        key={`${card.rank}-${card.suit}-${index}`}
        className="w-[clamp(58px,6.4vw,88px)] h-[clamp(82px,9.1vw,126px)] shrink-0 rounded-[6px] bg-[#f7f6f2] border border-[#d4d4d8] shadow-[0_14px_22px_rgba(0,0,0,0.5)] flex flex-col justify-between p-2 relative animate-[deal-in_0.22s_ease-out_both]"
        style={{ animationDelay: `${index * 0.07}s` }}
      >
        <div className={`flex flex-col items-start leading-[0.95] ${inkClass}`}>
          <span className="text-sm sm:text-base font-extrabold font-outfit">{card.rank}</span>
          <span className="text-xs">{sym}</span>
        </div>
        <div className={`text-2xl sm:text-3xl text-center leading-none ${inkClass}`}>{sym}</div>
        <div className={`flex flex-col items-end leading-[0.95] rotate-180 ${inkClass}`}>
          <span className="text-sm sm:text-base font-extrabold font-outfit">{card.rank}</span>
          <span className="text-xs">{sym}</span>
        </div>
      </div>
    );
  };

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
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-white/10 bg-[#0d0d14] font-mono text-xs text-zinc-400">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-[soft-pulse_1.6s_infinite]" />
              {phaseLabels[phase]}
            </span>
            <span className="flex items-center gap-3">
              <span>
                Main <strong className="text-white">{handsPlayed + 1}</strong>
              </span>
              <span>
                Mise <strong className="text-white">{bet.toLocaleString("fr-FR")} PC</strong>
              </span>
            </span>
          </div>

          <div className="relative flex-1 p-6 sm:p-7 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(122,10,173,0.18),transparent_60%),linear-gradient(#0a0912,#06050b)] overflow-hidden min-h-[430px] flex flex-col justify-between">
            <div className="absolute -left-[8%] -right-[8%] top-24 h-[520px] border border-purple-500/20 rounded-[50%] pointer-events-none" />
            <div className="absolute -left-[4%] -right-[4%] top-28 h-[520px] border border-purple-500/10 rounded-[50%] pointer-events-none" />

            <div className="relative z-10 flex items-start justify-between gap-4">
              <div className="flex items-center gap-2.5 font-mono text-xs uppercase tracking-widest text-zinc-400">
                <span>Croupier</span>
                <span className="text-white font-bold text-sm">
                  {dealerHand.length
                    ? hasHiddenDealerCard
                      ? `${dScore} + ?`
                      : dScore > 21
                      ? `${dScore} · BUST`
                      : dScore
                    : "—"}
                </span>
              </div>

              <div className="flex items-center -space-x-4 opacity-60 shrink-0">
                <span className="w-7 h-10 rounded border border-purple-500/35 bg-purple-950/50" />
                <span className="w-7 h-10 rounded border border-purple-500/35 bg-purple-950/50" />
                <span className="w-7 h-10 rounded border border-purple-500/35 bg-purple-950/50 flex items-center justify-center font-outfit text-[10px] font-black text-purple-400">
                  P
                </span>
              </div>
            </div>

            <div className="relative z-10 flex items-start gap-2.5 min-h-[136px] my-3 flex-wrap">
              {dealerHand.length > 0 ? (
                dealerHand.map(renderCard)
              ) : (
                <div className="w-[clamp(58px,6.4vw,88px)] h-[clamp(82px,9.1vw,126px)] rounded-[6px] border border-dashed border-purple-500/30 flex items-center justify-center text-[10px] font-mono text-purple-400/40">
                  SABOT
                </div>
              )}
            </div>

            <div className="relative z-10 flex items-center gap-3 my-2">
              <span className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/25 to-transparent" />
              <span className="font-mono text-[10px] tracking-widest text-purple-300/50 text-center">
                BLACKJACK PAIE 3:2 — LE CROUPIER RESTE À 17
              </span>
              <span className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/25 to-transparent" />
            </div>

            <div className="relative z-10 flex items-end justify-between gap-5 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-end gap-2.5 min-h-[136px] mb-2.5 flex-wrap">
                  {playerHand.length > 0 ? (
                    playerHand.map(renderCard)
                  ) : (
                    <div className="w-[clamp(58px,6.4vw,88px)] h-[clamp(82px,9.1vw,126px)] rounded-[6px] border border-dashed border-purple-500/30 flex items-center justify-center text-[10px] font-mono text-purple-400/40">
                      MAIN
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2.5 font-mono text-xs uppercase tracking-widest text-zinc-400">
                  <span>{userName}</span>
                  <span
                    className={`font-bold text-sm ${
                      pScore === 21
                        ? "text-amber-400"
                        : pScore > 21
                        ? "text-red-400"
                        : "text-white"
                    }`}
                  >
                    {playerHand.length ? (pScore > 21 ? `${pScore} · BUST` : pScore) : "—"}
                  </span>
                </div>
              </div>

              <div className="shrink-0 flex flex-col items-center gap-1.5">
                <div className="w-[88px] h-[88px] rounded-full border-2 border-dashed border-purple-500/40 flex flex-col items-center justify-center bg-purple-950/20 shadow-inner">
                  <span className="font-outfit text-xl font-black text-white leading-none">
                    {bet.toLocaleString("fr-FR")}
                  </span>
                  <span className="font-mono text-[9px] tracking-widest text-zinc-400 mt-1">MISE PC</span>
                </div>
                <span className="font-mono text-[10px] text-zinc-400">
                  Gain max{" "}
                  <strong className="text-purple-400 font-bold">
                    {Math.round(bet * 2.5).toLocaleString("fr-FR")}
                  </strong>
                </span>
              </div>
            </div>

            {phase === "FINISHED" && outcome && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <div
                  className={`px-5 py-2 bg-[#06050b]/90 border font-outfit font-black text-base sm:text-lg tracking-wider rounded-lg shadow-2xl animate-[pop-in_0.2s_ease-out_both] ${
                    outcome === "player_blackjack"
                      ? "border-purple-400 text-purple-300"
                      : outcome === "player_won"
                      ? "border-emerald-400 text-emerald-400"
                      : outcome === "push"
                      ? "border-zinc-400 text-zinc-300"
                      : "border-red-500 text-red-400"
                  }`}
                >
                  {outcome === "player_blackjack"
                    ? `BLACKJACK · +${payout.toLocaleString("fr-FR")} PC`
                    : outcome === "player_won"
                    ? `GAGNÉ · +${payout.toLocaleString("fr-FR")} PC`
                    : outcome === "push"
                    ? "ÉGALITÉ · MISE RENDUE"
                    : "PERDU"}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-white/10 bg-[#0d0d14] p-3.5 flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-[220px]">
              <span className="font-mono text-[10px] tracking-widest text-zinc-500 mr-1">JETONS</span>
              <button
                type="button"
                onClick={() => setValidBet(bet + 10)}
                className="w-9 h-9 rounded-full border-2 border-dashed border-white/30 bg-[#1c1c26] text-slate-200 font-outfit text-xs font-black hover:border-purple-400 hover:text-white cursor-pointer"
              >
                10
              </button>
              <button
                type="button"
                onClick={() => setValidBet(bet + 50)}
                className="w-9 h-9 rounded-full border-2 border-dashed border-purple-400/50 bg-[#2a1040] text-purple-200 font-outfit text-xs font-black hover:border-purple-300 hover:text-white cursor-pointer"
              >
                50
              </button>
              <button
                type="button"
                onClick={() => setValidBet(bet + 100)}
                className="w-9 h-9 rounded-full border-2 border-dashed border-purple-400/70 bg-[#3b0764] text-purple-200 font-outfit text-xs font-black hover:border-purple-300 hover:text-white cursor-pointer"
              >
                100
              </button>
              <button
                type="button"
                onClick={() => setValidBet(bet + 250)}
                className="w-9 h-9 rounded-full border-2 border-dashed border-purple-500 bg-[#4c0f78] text-white font-outfit text-xs font-black hover:border-purple-300 cursor-pointer"
              >
                250
              </button>
              <button
                type="button"
                onClick={() => setValidBet(bet + 1000)}
                className="w-9 h-9 rounded-full border-2 border-dashed border-red-500/60 bg-[#4a0f14] text-red-200 font-outfit text-[11px] font-black hover:border-red-400 hover:text-white cursor-pointer"
              >
                1K
              </button>
              <button
                type="button"
                onClick={() => setValidBet(Math.floor(bet / 2))}
                className="px-2.5 h-9 rounded border border-white/10 bg-transparent text-zinc-400 font-mono text-xs hover:text-white hover:border-white/25 cursor-pointer"
              >
                ½
              </button>
              <button
                type="button"
                onClick={() => setValidBet(Math.min(coins, bet * 2))}
                className="px-2.5 h-9 rounded border border-white/10 bg-transparent text-zinc-400 font-mono text-xs hover:text-white hover:border-white/25 cursor-pointer"
              >
                2×
              </button>
              <button
                type="button"
                onClick={() => setValidBet(Math.min(50000, coins))}
                className="px-2.5 h-9 rounded border border-white/10 bg-transparent text-zinc-400 font-mono text-xs hover:text-white hover:border-white/25 cursor-pointer"
              >
                MAX
              </button>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {phase === "PLAYER_TURN" ? (
                <>
                  <button
                    type="button"
                    onClick={handleHit}
                    disabled={loading}
                    className="h-10 px-5 rounded border-0 bg-[#7a0aad] hover:bg-[#9333ea] text-white font-outfit font-black text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Tirer <span className="opacity-60 text-[10px] ml-1">H</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleStand}
                    disabled={loading}
                    className="h-10 px-5 rounded border border-white/20 hover:bg-white/5 text-white font-outfit font-black text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Rester <span className="opacity-50 text-[10px] ml-1">S</span>
                  </button>
                  {canDouble && (
                    <button
                      type="button"
                      onClick={handleDouble}
                      disabled={loading || coins < bet}
                      className="h-10 px-4 rounded border border-amber-400/50 hover:bg-amber-400/10 text-amber-400 font-outfit font-black text-xs uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-40"
                    >
                      Doubler <span className="opacity-60 text-[10px] ml-1">D</span>
                    </button>
                  )}
                </>
              ) : phase === "DEALER_TURN" ? (
                <span className="h-10 flex items-center px-5 font-mono text-xs text-purple-300 border border-purple-500/30 rounded animate-[soft-pulse_1.6s_infinite]">
                  Le croupier joue…
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleDeal}
                  disabled={loading}
                  className="h-10 px-6 rounded border-0 bg-[#b366ff] hover:bg-[#c084fc] text-[#0a0a0a] font-outfit font-black text-sm uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
                >
                  {phase === "FINISHED" ? "Rejouer" : "Distribuer"}{" "}
                  <span className="opacity-60 text-[10px] ml-1 font-mono">ESPACE</span>
                </button>
              )}
            </div>
          </div>
        </section>

        <aside className="flex-[0_1_288px] min-w-[260px] flex flex-col gap-3">
          <div className="border border-white/10 rounded-2xl bg-[#0d0d14] p-4">
            <div className="flex items-baseline justify-between mb-3">
              <span className="font-mono text-[10px] tracking-widest text-zinc-400">SOLDE</span>
              <span className="font-outfit text-2xl font-black text-white">
                {coins.toLocaleString("fr-FR")}
                <span className="text-xs text-zinc-400 ml-1">PC</span>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-px bg-white/10 border border-white/10 rounded-lg overflow-hidden">
              <div className="bg-[#0d0d14] p-2">
                <span className="block font-mono text-[9px] tracking-wider text-zinc-400">MAINS</span>
                <span className="font-mono text-sm font-bold text-white">{handsPlayed}</span>
              </div>
              <div className="bg-[#0d0d14] p-2">
                <span className="block font-mono text-[9px] tracking-wider text-zinc-400">GAGNÉES</span>
                <span className="font-mono text-sm font-bold text-white">{handsWon}</span>
              </div>
              <div className="bg-[#0d0d14] p-2">
                <span className="block font-mono text-[9px] tracking-wider text-zinc-400">NET</span>
                <span
                  className={`font-mono text-sm font-bold ${
                    net > 0 ? "text-emerald-400" : net < 0 ? "text-red-400" : "text-white"
                  }`}
                >
                  {(net > 0 ? "+" : "") + net.toLocaleString("fr-FR")}
                </span>
              </div>
            </div>
          </div>

          <div className="border border-white/10 rounded-2xl bg-[#0d0d14] flex-1 min-h-[220px] flex flex-col overflow-hidden">
            <div className="px-4 py-2.5 border-b border-white/10 flex items-baseline justify-between">
              <span className="font-mono text-[10px] tracking-widest text-zinc-400">HISTORIQUE</span>
              <span className="font-mono text-[10px] text-zinc-500">{history.length} mains</span>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[240px]">
              {history.length === 0 ? (
                <p className="p-4 font-mono text-xs text-zinc-500 leading-relaxed">
                  Aucune main jouée.
                  <br />
                  Placez une mise et distribuez.
                </p>
              ) : (
                history.map((row, idx) => (
                  <div
                    key={`hist-${idx}`}
                    className="flex items-center gap-2 px-4 py-2 border-b border-white/5 font-mono text-xs"
                  >
                    <span className="text-zinc-500 w-7 shrink-0">#{row.n}</span>
                    <span
                      className="font-bold flex-1 min-w-0 truncate"
                      style={{ color: row.color }}
                    >
                      {row.label}
                    </span>
                    <span className="text-zinc-400 shrink-0">{row.score}</span>
                    <span
                      className="font-bold w-16 text-right shrink-0"
                      style={{ color: row.color }}
                    >
                      {row.delta}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="border border-white/10 rounded-2xl bg-[#0d0d14] p-3.5 flex flex-col gap-2 font-mono text-xs text-zinc-400">
            <div className="flex justify-between">
              <span>Blackjack</span>
              <span className="text-white font-bold">3:2</span>
            </div>
            <div className="flex justify-between">
              <span>Victoire</span>
              <span className="text-white font-bold">1:1</span>
            </div>
            <div className="flex justify-between">
              <span>Croupier</span>
              <span className="text-white font-bold">reste à 17</span>
            </div>
            <div className="flex justify-between">
              <span>Égalité</span>
              <span className="text-white font-bold">remboursée</span>
            </div>
            <div className="flex items-center gap-1.5 pt-2 border-t border-white/10 text-purple-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="text-zinc-400">Provably fair · serveur</span>
            </div>
            <span className="text-zinc-500 text-[11px] leading-relaxed pt-1">
              Espace parier · H tirer · S rester · D doubler
            </span>
          </div>
        </aside>
      </div>

      {showHelp && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-[#0d0d14] border border-white/15 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="font-outfit text-xl font-black text-white mb-3">
              Règles du Blackjack Paranoia
            </h3>
            <ul className="text-xs text-zinc-400 leading-relaxed list-none flex flex-col gap-2">
              <li>• Approchez-vous de 21 sans dépasser, et battez le total du croupier.</li>
              <li>• Les figures valent 10, l&apos;As vaut 1 ou 11.</li>
              <li>• Blackjack naturel (As + 10 dès la donne) : paie <strong className="text-white">3:2</strong>.</li>
              <li>• <strong className="text-white">Tirer</strong> : une carte de plus. <strong className="text-white">Rester</strong> : vous gardez la main.</li>
              <li>• <strong className="text-white">Doubler</strong> : mise doublée, une seule carte, puis passage au croupier.</li>
              <li>• Le croupier tire jusqu&apos;à 17 minimum.</li>
              <li>• Égalité : mise intégralement remboursée.</li>
            </ul>
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="mt-5 w-full h-10 rounded border-0 bg-[#b366ff] hover:bg-[#c084fc] text-[#0a0a0a] font-outfit font-black text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Compris
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

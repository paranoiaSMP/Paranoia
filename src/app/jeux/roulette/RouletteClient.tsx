"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { 
  Volume2, 
  VolumeX, 
  HelpCircle, 
  Coins, 
  ArrowLeft,
  Disc,
  CheckCircle2,
  Sparkles,
  History
} from "lucide-react";
import toast from "react-hot-toast";
import { 
  ROULETTE_ORDER, 
  getNumberColor, 
  getMultiplier, 
  RouletteColor, 
  RouletteBet 
} from "@/lib/games/rouletteTypes";

const QUICK_CHIPS = [10, 50, 100, 250, 500, 1000];
const REPEATS = 60;
const TILE_WIDTH = 84;
const TILE_GAP = 8;
const TILE_STEP = TILE_WIDTH + TILE_GAP;

const FULL_STRIP: { num: number; color: RouletteColor }[] = [];
for (let r = 0; r < REPEATS; r++) {
  for (const num of ROULETTE_ORDER) {
    FULL_STRIP.push({ num, color: getNumberColor(num) });
  }
}

interface RouletteClientProps {
  initialCoins: number;
  isAuthenticated: boolean;
  currentUserId: string | null;
  currentMinecraftName: string | null;
  currentUserName: string | null;
}

export default function RouletteClient({
  initialCoins,
  isAuthenticated,
  currentUserId,
  currentMinecraftName,
  currentUserName,
}: RouletteClientProps) {
  const [coins, setCoins] = useState(initialCoins);
  const [betAmount, setBetAmount] = useState(50);
  const [phase, setPhase] = useState<"BETTING" | "SPINNING" | "RESOLVED">("BETTING");
  const [countdown, setCountdown] = useState(12.0);
  const [winningNumber, setWinningNumber] = useState<number | null>(null);
  const [bets, setBets] = useState<RouletteBet[]>([]);
  const [history, setHistory] = useState<number[]>([2, 11, 0, 7, 14, 3, 5, 8, 1]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [translateX, setTranslateX] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [resolvedWin, setResolvedWin] = useState<{ amount: number; color: RouletteColor } | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastTickIndexRef = useRef<number>(-1);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameId = useRef<number | null>(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) audioCtxRef.current = new AudioCtx();
    }
  };

  const playTickSound = () => {
    if (!soundEnabled) return;
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(850, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.025);

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.025);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.028);
    } catch {}
  };

  const playWinSound = () => {
    if (!soundEnabled) return;
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(f, ctx.currentTime + i * 0.07);

      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.07);
      gain.gain.linearRampToValueAtTime(0.14, ctx.currentTime + i * 0.07 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.07 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.07);
      osc.stop(ctx.currentTime + i * 0.07 + 0.38);
    });
  };

  const spinToNumber = useCallback((targetNum: number, offset: number) => {
    const container = containerRef.current;
    if (!container) return;

    const viewportW = container.clientWidth || 800;
    const baseCycle = 30;
    const orderIndex = ROULETTE_ORDER.indexOf(targetNum);
    const targetTileIndex = baseCycle * 15 + orderIndex;

    const tileCenter = targetTileIndex * TILE_STEP + TILE_WIDTH / 2;
    const finalTranslateX = tileCenter + offset - viewportW / 2;

    setIsTransitioning(true);
    setTranslateX(finalTranslateX);

    const startTime = performance.now();
    const duration = 5500;
    lastTickIndexRef.current = -1;

    const trackClicks = () => {
      const elapsed = performance.now() - startTime;
      if (elapsed < duration) {
        const progress = elapsed / duration;
        const eased = 1 - Math.pow(1 - progress, 3.5);
        const currentX = finalTranslateX * eased;
        const currentTile = Math.floor((currentX + viewportW / 2) / TILE_STEP);

        if (currentTile !== lastTickIndexRef.current) {
          lastTickIndexRef.current = currentTile;
          playTickSound();
        }

        animFrameId.current = requestAnimationFrame(trackClicks);
      }
    };

    animFrameId.current = requestAnimationFrame(trackClicks);
  }, [soundEnabled]);

  const resetWheelPosition = useCallback((lastNum: number, lastOffset: number) => {
    const container = containerRef.current;
    if (!container) return;

    const viewportW = container.clientWidth || 800;
    const resetCycle = 5;
    const orderIndex = ROULETTE_ORDER.indexOf(lastNum);
    const resetTileIndex = resetCycle * 15 + orderIndex;
    const tileCenter = resetTileIndex * TILE_STEP + TILE_WIDTH / 2;
    const resetTranslateX = tileCenter + lastOffset - viewportW / 2;

    setIsTransitioning(false);
    setTranslateX(resetTranslateX);
  }, []);

  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connectSSE = () => {
      eventSource = new EventSource("/api/games/roulette/events");

      eventSource.addEventListener("INIT", (e) => {
        const data = JSON.parse(e.data);
        setPhase(data.phase);
        setCountdown(data.countdown);
        setBets(data.bets);
        setHistory(data.history);

        if (data.winningNumber !== null) {
          setWinningNumber(data.winningNumber);
          resetWheelPosition(data.winningNumber, data.winningOffset || 0);
        } else if (data.history.length > 0) {
          resetWheelPosition(data.history[0], 0);
        }
      });

      eventSource.addEventListener("PHASE_CHANGE", (e) => {
        const data = JSON.parse(e.data);
        setPhase(data.phase);
        setCountdown(data.countdown);
        setBets(data.bets);
        setResolvedWin(null);

        if (data.phase === "BETTING" && data.history.length > 0) {
          resetWheelPosition(data.history[0], 0);
        }
      });

      eventSource.addEventListener("TICK", (e) => {
        const data = JSON.parse(e.data);
        setCountdown(data.countdown);
      });

      eventSource.addEventListener("BET_PLACED", (e) => {
        const newBet: RouletteBet = JSON.parse(e.data);
        setBets((prev) => [...prev, newBet]);
      });

      eventSource.addEventListener("SPIN", (e) => {
        const data = JSON.parse(e.data);
        setPhase("SPINNING");
        setWinningNumber(data.winningNumber);
        spinToNumber(data.winningNumber, data.winningOffset);
      });

      eventSource.addEventListener("RESOLVED", (e) => {
        const data = JSON.parse(e.data);
        setPhase("RESOLVED");
        setHistory(data.history);

        const myPayout = data.payouts.find((p: any) => p.userId === currentUserId);
        if (myPayout && myPayout.payout > 0) {
          setCoins((c) => c + myPayout.payout);
          setResolvedWin({ amount: myPayout.payout, color: data.winningColor });
          playWinSound();
          toast.success(`GAGNÉ ! +${myPayout.payout} PC (${data.winningColor.toUpperCase()})`);
        }
      });

      eventSource.onerror = () => {
        eventSource?.close();
        setTimeout(connectSSE, 3000);
      };
    };

    connectSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [currentUserId, resetWheelPosition, spinToNumber]);

  const placeBet = async (color: RouletteColor) => {
    if (!isAuthenticated) {
      toast.error("Veuillez vous connecter pour jouer.");
      return;
    }
    if (betAmount > coins) {
      toast.error("Solde insuffisant.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/games/roulette", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bet", color, amount: betAmount }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erreur de mise");
        setIsSubmitting(false);
        return;
      }

      setCoins(data.paraCoins);
      toast.success(`+${betAmount} PC sur ${color.toUpperCase()}`);
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setIsSubmitting(false);
    }
  };

  const redBets = bets.filter((b) => b.color === "red");
  const greenBets = bets.filter((b) => b.color === "green");
  const blackBets = bets.filter((b) => b.color === "black");

  const totalRed = redBets.reduce((sum, b) => sum + b.amount, 0);
  const totalGreen = greenBets.reduce((sum, b) => sum + b.amount, 0);
  const totalBlack = blackBets.reduce((sum, b) => sum + b.amount, 0);

  const myRedBet = redBets.filter((b) => b.userId === currentUserId).reduce((sum, b) => sum + b.amount, 0);
  const myGreenBet = greenBets.filter((b) => b.userId === currentUserId).reduce((sum, b) => sum + b.amount, 0);
  const myBlackBet = blackBets.filter((b) => b.userId === currentUserId).reduce((sum, b) => sum + b.amount, 0);

  const last100 = history.slice(0, 50);
  const countRed = last100.filter((n) => n >= 1 && n <= 7).length;
  const countGreen = last100.filter((n) => n === 0).length;
  const countBlack = last100.filter((n) => n >= 8 && n <= 14).length;
  const totalCounts = countRed + countGreen + countBlack || 1;

  return (
    <div className="min-h-screen text-[var(--text-color)] pt-4 pb-20 px-2 sm:px-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
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

      <div className="rounded-2xl border-2 sm:border-4 border-[var(--card-border)] bg-[var(--surface-bg)] p-4 sm:p-6 shadow-2xl space-y-5 overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[var(--card-border)] pb-4">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto scrollbar-none pb-1 sm:pb-0">
            <span className="text-xs font-bold text-[var(--nav-item-color)] flex items-center gap-1 shrink-0 mr-2">
              <History className="w-3.5 h-3.5" />
              Historique :
            </span>
            {history.slice(0, 10).map((num, i) => {
              const col = getNumberColor(num);
              return (
                <span
                  key={i}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black font-mono shrink-0 shadow-md border ${
                    col === 'green'
                      ? 'bg-emerald-500 text-black border-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                      : col === 'red'
                      ? 'bg-red-600 text-white border-red-400'
                      : 'bg-zinc-800 text-zinc-100 border-zinc-600'
                  }`}
                >
                  {num}
                </span>
              );
            })}
          </div>

          <div className="flex items-center gap-3 text-xs font-mono font-bold shrink-0 self-end sm:self-center">
            <span className="flex items-center gap-1 text-red-400">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              {Math.round((countRed / totalCounts) * 100)}%
            </span>
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              {Math.round((countGreen / totalCounts) * 100)}%
            </span>
            <span className="flex items-center gap-1 text-zinc-400">
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
              {Math.round((countBlack / totalCounts) * 100)}%
            </span>
          </div>
        </div>

        <div className="relative w-full rounded-2xl bg-[#090810] border-2 border-[var(--card-border)] overflow-hidden shadow-inner py-6">
          <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 via-yellow-300 to-amber-500 shadow-[0_0_20px_rgba(245,158,11,1)] z-30 pointer-events-none" />
          <div className="absolute left-1/2 -translate-x-1/2 top-0 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[12px] border-t-amber-400 z-30 pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
          <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[12px] border-b-amber-400 z-30 pointer-events-none drop-shadow-[0_-2px_4px_rgba(0,0,0,0.8)]" />

          <div
            ref={containerRef}
            className="w-full overflow-hidden select-none relative"
            style={{ height: "96px" }}
          >
            <div
              className="flex items-center absolute left-0 top-0 h-full"
              style={{
                gap: `${TILE_GAP}px`,
                transform: `translateX(-${translateX}px)`,
                transition: isTransitioning ? "transform 5.5s cubic-bezier(0.12, 0.8, 0.38, 1)" : "none",
                willChange: "transform",
              }}
            >
              {FULL_STRIP.map((item, idx) => {
                const isGreen = item.color === "green";
                const isRed = item.color === "red";

                return (
                  <div
                    key={idx}
                    className={`w-[84px] h-[88px] rounded-xl flex flex-col items-center justify-center font-outfit font-black shrink-0 border-2 select-none shadow-md ${
                      isGreen
                        ? 'bg-gradient-to-b from-emerald-500 to-emerald-700 text-black border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                        : isRed
                        ? 'bg-gradient-to-b from-red-600 to-red-800 text-white border-red-500'
                        : 'bg-gradient-to-b from-zinc-800 to-zinc-950 text-white border-zinc-700'
                    }`}
                  >
                    <span className="text-2xl font-black font-mono tracking-tight">
                      {item.num}
                    </span>
                    <span className="text-[9px] uppercase tracking-widest opacity-80 mt-0.5">
                      {isGreen ? 'x14' : 'x2'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between py-2 px-1">
          <div className="flex items-center gap-2">
            {phase === "BETTING" ? (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                <span className="font-outfit font-black text-sm uppercase tracking-wider text-amber-300">
                  Faites vos jeux : <span className="font-mono text-white text-base">{countdown.toFixed(1)}s</span>
                </span>
              </div>
            ) : phase === "SPINNING" ? (
              <div className="flex items-center gap-2">
                <Disc className="w-4 h-4 text-purple-400 animate-spin" />
                <span className="font-outfit font-black text-sm uppercase tracking-wider text-purple-300">
                  Les jeux sont faits... Ça tourne !
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="font-outfit font-black text-sm uppercase tracking-wider text-emerald-300">
                  Numéro gagnant : <span className="font-mono text-white text-base font-black">{winningNumber}</span> ({getNumberColor(winningNumber || 0).toUpperCase()})
                </span>
              </div>
            )}
          </div>

          {resolvedWin && (
            <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs animate-bounce shadow-[0_0_15px_rgba(16,185,129,0.5)]">
              <CheckCircle2 className="w-4 h-4" />
              <span>+{resolvedWin.amount} PC !</span>
            </div>
          )}
        </div>

        <div className="bg-black/30 rounded-xl p-3 border border-[var(--card-border)] flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-bold text-[var(--nav-item-color)] shrink-0">Mise :</span>
            <div className="relative flex items-center rounded-xl bg-black/50 border-2 border-[var(--card-border)] focus-within:border-purple-500 transition-colors w-full md:w-48">
              <input
                type="number"
                min={10}
                max={50000}
                step={10}
                value={betAmount}
                disabled={phase !== "BETTING"}
                onChange={(e) => setBetAmount(Math.max(10, parseInt(e.target.value) || 10))}
                className="w-full bg-transparent px-3 py-1.5 text-sm font-black font-mono text-purple-300 focus:outline-none disabled:opacity-50"
              />
              <span className="pr-3 text-xs font-bold text-[var(--nav-item-color)]">PC</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip}
                disabled={phase !== "BETTING"}
                onClick={() => setBetAmount(chip)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                  betAmount === chip
                    ? 'bg-purple-600 border-purple-400 text-white shadow-sm'
                    : 'bg-black/40 border-[var(--card-border)] text-[var(--nav-item-color)] hover:text-white'
                } disabled:opacity-40`}
              >
                +{chip}
              </button>
            ))}
            <button
              disabled={phase !== "BETTING"}
              onClick={() => setBetAmount((b) => Math.max(10, Math.floor(b / 2)))}
              className="px-2 py-1 text-xs font-bold bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 border border-purple-500/20 rounded-lg transition-colors disabled:opacity-40"
            >
              ½
            </button>
            <button
              disabled={phase !== "BETTING"}
              onClick={() => setBetAmount((b) => Math.min(coins, b * 2))}
              className="px-2 py-1 text-xs font-bold bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 border border-purple-500/20 rounded-lg transition-colors disabled:opacity-40"
            >
              2×
            </button>
            <button
              disabled={phase !== "BETTING"}
              onClick={() => setBetAmount(Math.min(50000, coins))}
              className="px-2 py-1 text-xs font-bold bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 border border-purple-500/20 rounded-lg transition-colors disabled:opacity-40"
            >
              Max
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border-2 border-red-500/30 bg-gradient-to-b from-red-950/30 to-black/40 p-4 flex flex-col justify-between gap-4 shadow-lg hover:border-red-500/50 transition-colors">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-outfit font-black text-lg text-red-400 uppercase tracking-wide">
                  Rouge (1-7)
                </span>
                <span className="px-2 py-0.5 rounded-md text-xs font-black bg-red-500/20 border border-red-500/40 text-red-300 font-mono">
                  PAIE 2×
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-[var(--nav-item-color)]">
                <span>{redBets.length} joueur(s)</span>
                <span className="font-mono font-bold text-red-300">{totalRed.toLocaleString("fr-FR")} PC</span>
              </div>

              {myRedBet > 0 && (
                <div className="text-xs font-bold text-red-300 bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/30">
                  Votre mise : <span className="font-mono font-black">{myRedBet} PC</span> (Gain potentiel : +{myRedBet * 2} PC)
                </div>
              )}
            </div>

            <button
              onClick={() => placeBet("red")}
              disabled={isSubmitting || phase !== "BETTING" || betAmount > coins || betAmount < 10}
              className="w-full py-3 rounded-xl font-outfit font-black uppercase tracking-wider text-sm bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white border border-red-400/30 shadow-[0_0_15px_rgba(220,38,38,0.4)] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Miser sur Rouge
            </button>

            <div className="space-y-1.5 pt-2 border-t border-red-500/20 max-h-36 overflow-y-auto scrollbar-none">
              {redBets.map((b) => (
                <div key={b.id} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-red-950/20">
                  <div className="flex items-center gap-1.5">
                    <img
                      src={`https://mc-heads.net/avatar/${b.minecraftName || b.name}/20`}
                      alt={b.name}
                      className="w-5 h-5 rounded border border-red-500/30 bg-black/40 shrink-0"
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                    <span className="font-mono truncate max-w-[100px] text-white">{b.name}</span>
                  </div>
                  <span className="font-mono font-bold text-red-300">{b.amount} PC</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-b from-emerald-950/30 to-black/40 p-4 flex flex-col justify-between gap-4 shadow-[0_0_25px_rgba(16,185,129,0.15)] hover:border-emerald-500/70 transition-colors">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-outfit font-black text-lg text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-300" />
                  Vert (0)
                </span>
                <span className="px-2 py-0.5 rounded-md text-xs font-black bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                  PAIE 14×
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-[var(--nav-item-color)]">
                <span>{greenBets.length} joueur(s)</span>
                <span className="font-mono font-bold text-emerald-300">{totalGreen.toLocaleString("fr-FR")} PC</span>
              </div>

              {myGreenBet > 0 && (
                <div className="text-xs font-bold text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                  Votre mise : <span className="font-mono font-black">{myGreenBet} PC</span> (Gain potentiel : +{myGreenBet * 14} PC)
                </div>
              )}
            </div>

            <button
              onClick={() => placeBet("green")}
              disabled={isSubmitting || phase !== "BETTING" || betAmount > coins || betAmount < 10}
              className="w-full py-3 rounded-xl font-outfit font-black uppercase tracking-wider text-sm bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black border border-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.6)] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Miser sur Vert (14×)
            </button>

            <div className="space-y-1.5 pt-2 border-t border-emerald-500/20 max-h-36 overflow-y-auto scrollbar-none">
              {greenBets.map((b) => (
                <div key={b.id} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-emerald-950/20">
                  <div className="flex items-center gap-1.5">
                    <img
                      src={`https://mc-heads.net/avatar/${b.minecraftName || b.name}/20`}
                      alt={b.name}
                      className="w-5 h-5 rounded border border-emerald-500/30 bg-black/40 shrink-0"
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                    <span className="font-mono truncate max-w-[100px] text-white">{b.name}</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-300">{b.amount} PC</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border-2 border-zinc-700/40 bg-gradient-to-b from-zinc-900/30 to-black/40 p-4 flex flex-col justify-between gap-4 shadow-lg hover:border-zinc-500/50 transition-colors">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-outfit font-black text-lg text-zinc-300 uppercase tracking-wide">
                  Noir (8-14)
                </span>
                <span className="px-2 py-0.5 rounded-md text-xs font-black bg-zinc-700/30 border border-zinc-600 text-zinc-300 font-mono">
                  PAIE 2×
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-[var(--nav-item-color)]">
                <span>{blackBets.length} joueur(s)</span>
                <span className="font-mono font-bold text-zinc-300">{totalBlack.toLocaleString("fr-FR")} PC</span>
              </div>

              {myBlackBet > 0 && (
                <div className="text-xs font-bold text-zinc-300 bg-zinc-700/20 px-2.5 py-1 rounded-lg border border-zinc-600/30">
                  Votre mise : <span className="font-mono font-black">{myBlackBet} PC</span> (Gain potentiel : +{myBlackBet * 2} PC)
                </div>
              )}
            </div>

            <button
              onClick={() => placeBet("black")}
              disabled={isSubmitting || phase !== "BETTING" || betAmount > coins || betAmount < 10}
              className="w-full py-3 rounded-xl font-outfit font-black uppercase tracking-wider text-sm bg-gradient-to-r from-zinc-700 to-zinc-900 hover:from-zinc-600 hover:to-zinc-800 text-white border border-zinc-500/30 shadow-[0_0_15px_rgba(39,39,42,0.6)] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Miser sur Noir
            </button>

            <div className="space-y-1.5 pt-2 border-t border-zinc-700/20 max-h-36 overflow-y-auto scrollbar-none">
              {blackBets.map((b) => (
                <div key={b.id} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-zinc-900/30">
                  <div className="flex items-center gap-1.5">
                    <img
                      src={`https://mc-heads.net/avatar/${b.minecraftName || b.name}/20`}
                      alt={b.name}
                      className="w-5 h-5 rounded border border-zinc-600 bg-black/40 shrink-0"
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                    <span className="font-mono truncate max-w-[100px] text-white">{b.name}</span>
                  </div>
                  <span className="font-mono font-bold text-zinc-300">{b.amount} PC</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {showHelp && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--surface-bg)] border-2 border-[var(--card-border)] rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-outfit font-black text-white mb-3">
              Règles de la Roulette
            </h3>
            <ul className="text-xs text-[var(--nav-item-color)] space-y-2 leading-relaxed">
              <li>• La roue est composée de 15 cases : 7 Rouges, 7 Noires et 1 Verte.</li>
              <li>• Vous avez 12 secondes pour placer vos paris avant le lancement.</li>
              <li>• <strong>Rouge (1 à 7)</strong> : Double votre mise (2×).</li>
              <li>• <strong>Noir (8 à 14)</strong> : Double votre mise (2×).</li>
              <li>• <strong>Vert (0)</strong> : Multiplie votre mise par <strong>14×</strong> !</li>
              <li>• Vous pouvez cumuler des paris sur plusieurs couleurs simultanément.</li>
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

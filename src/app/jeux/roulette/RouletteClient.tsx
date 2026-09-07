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
  History,
  TrendingUp
} from "lucide-react";
import toast from "react-hot-toast";
import { 
  EUROPEAN_WHEEL,
  RED_NUMBERS,
  getNumberColor, 
  RouletteColor, 
  RouletteBet,
  BetType
} from "@/lib/games/rouletteTypes";

const QUICK_CHIPS = [10, 50, 100, 250, 500, 1000];

const NUMBER_GRID_ROWS = [
  [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
  [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
  [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]
];

const NUMBERS_RADIUS_PCT = 0.562;

function getPocketCoordinates(num: number, rPct: number = NUMBERS_RADIUS_PCT): { x: number; y: number } {
  const idx = EUROPEAN_WHEEL.indexOf(num);
  const deg = (idx >= 0 ? idx : 0) * (360 / 37);
  const rad = (deg * Math.PI) / 180;
  return {
    x: 50 + (rPct * 50) * Math.sin(rad),
    y: 50 - (rPct * 50) * Math.cos(rad),
  };
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
}: RouletteClientProps) {
  const [coins, setCoins] = useState(initialCoins);
  const [betAmount, setBetAmount] = useState(50);
  const [phase, setPhase] = useState<"BETTING" | "SPINNING" | "RESOLVED">("BETTING");
  const [countdown, setCountdown] = useState(12.0);
  const [winningNumber, setWinningNumber] = useState<number | null>(null);
  const [bets, setBets] = useState<RouletteBet[]>([]);
  const [history, setHistory] = useState<number[]>([26, 3, 35, 12, 0, 32, 15, 19, 4]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resolvedWin, setResolvedWin] = useState<{ amount: number; num: number; color: RouletteColor } | null>(null);

  const [ballPos, setBallPos] = useState<{ x: number; y: number }>(() => getPocketCoordinates(26));
  const [isBallSpinning, setIsBallSpinning] = useState(false);
  const [activeHighlightNum, setActiveHighlightNum] = useState<number | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameId = useRef<number | null>(null);
  const ballAngleRef = useRef<number>(EUROPEAN_WHEEL.indexOf(26) * (360 / 37));
  const lastTickAngleRef = useRef<number>(0);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) audioCtxRef.current = new AudioCtx();
    }
  };

  const playRollingTick = (isSlow: boolean, progress: number) => {
    if (!soundEnabled) return;
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = isSlow ? "triangle" : "sine";

      const freq = isSlow ? Math.max(220, 520 - progress * 300) : 850;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(Math.max(120, freq * 0.4), ctx.currentTime + 0.025);

      const vol = isSlow ? Math.min(0.12, 0.04 + progress * 0.08) : 0.035;
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.025);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.028);
    } catch {}
  };

  const playBallLandingThud = () => {
    if (!soundEnabled) return;
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(340, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.095);
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

  const launchBall = useCallback((targetNum: number) => {
    if (animFrameId.current) cancelAnimationFrame(animFrameId.current);

    const targetIdx = EUROPEAN_WHEEL.indexOf(targetNum);
    const targetFinalAngle = (targetIdx >= 0 ? targetIdx : 0) * (360 / 37);

    const startAngle = ballAngleRef.current;
    const turns = 6;
    const normalizedDelta = ((targetFinalAngle - (startAngle % 360)) % 360 + 360) % 360;
    const totalDelta = turns * 360 + normalizedDelta;
    const finalAngle = startAngle + totalDelta;

    const duration = 8000;
    const startTime = performance.now();
    lastTickAngleRef.current = startAngle;
    setIsBallSpinning(true);
    setActiveHighlightNum(null);

    const step = () => {
      const elapsed = performance.now() - startTime;
      const p = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - p, 4.2);
      const currentAngle = startAngle + totalDelta * eased;
      ballAngleRef.current = currentAngle;

      const fretBump = (p > 0.55 && p < 0.98) 
        ? 0.012 * Math.abs(Math.sin((currentAngle * 37 / 2) * Math.PI / 180)) * (1 - p) 
        : 0;
      const rPct = NUMBERS_RADIUS_PCT + fretBump;

      const rad = (currentAngle * Math.PI) / 180;
      const x = 50 + (rPct * 50) * Math.sin(rad);
      const y = 50 - (rPct * 50) * Math.cos(rad);
      setBallPos({ x, y });

      if (Math.abs(currentAngle - lastTickAngleRef.current) >= (360 / 37)) {
        lastTickAngleRef.current = currentAngle;
        playRollingTick(p > 0.55, p);
      }

      if (p < 1) {
        animFrameId.current = requestAnimationFrame(step);
      } else {
        ballAngleRef.current = finalAngle;
        setBallPos(getPocketCoordinates(targetNum, NUMBERS_RADIUS_PCT));
        setIsBallSpinning(false);
        setActiveHighlightNum(targetNum);
        playBallLandingThud();
      }
    };

    animFrameId.current = requestAnimationFrame(step);
  }, [soundEnabled]);

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

        const initialNum = data.winningNumber !== null ? data.winningNumber : (data.history[0] ?? 0);
        setWinningNumber(data.winningNumber);
        setBallPos(getPocketCoordinates(initialNum));
        ballAngleRef.current = EUROPEAN_WHEEL.indexOf(initialNum) * (360 / 37);
        setActiveHighlightNum(initialNum);
      });

      eventSource.addEventListener("PHASE_CHANGE", (e) => {
        const data = JSON.parse(e.data);
        setPhase(data.phase);
        setCountdown(data.countdown);
        setBets(data.bets);
        setResolvedWin(null);

        if (data.phase === "BETTING" && data.history.length > 0) {
          const lastNum = data.history[0];
          setActiveHighlightNum(lastNum);
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
        launchBall(data.winningNumber);
      });

      eventSource.addEventListener("RESOLVED", (e) => {
        const data = JSON.parse(e.data);
        setPhase("RESOLVED");
        setHistory(data.history);
        setActiveHighlightNum(data.winningNumber);

        const myPayout = data.payouts?.find((p: any) => p.userId === currentUserId);
        if (myPayout && myPayout.payout > 0) {
          setCoins((c) => c + myPayout.payout);
          setResolvedWin({ 
            amount: myPayout.payout, 
            num: data.winningNumber, 
            color: data.winningColor 
          });
          playWinSound();
          toast.success(`GAGNÉ ! +${myPayout.payout.toLocaleString("fr-FR")} PC (N°${data.winningNumber})`);
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
  }, [currentUserId, launchBall]);

  const placeBet = async (betType: BetType) => {
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
        body: JSON.stringify({ action: "bet", betType, amount: betAmount }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erreur de mise");
        setIsSubmitting(false);
        return;
      }

      setCoins(data.paraCoins);
      toast.success(`+${betAmount} PC sur ${formatBetName(betType)}`);
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setIsSubmitting(false);
    }
  };

  function formatBetName(bType: BetType): string {
    if (bType === "red") return "ROUGE (2×)";
    if (bType === "black") return "NOIR (2×)";
    if (bType === "green") return "VERT (36×)";
    if (bType === "even") return "PAIR (2×)";
    if (bType === "odd") return "IMPAIR (2×)";
    if (bType === "low") return "1-18 (2×)";
    if (bType === "high") return "19-36 (2×)";
    if (bType === "dozen_1") return "1-12 (3×)";
    if (bType === "dozen_2") return "13-24 (3×)";
    if (bType === "dozen_3") return "25-36 (3×)";
    if (bType.startsWith("num_")) {
      return `N°${bType.replace("num_", "")} (36×)`;
    }
    return bType;
  }

  const myBets = bets.filter((b) => b.userId === currentUserId);
  const totalMyBet = myBets.reduce((sum, b) => sum + b.amount, 0);

  const getBetAmountFor = (bType: BetType) => {
    return myBets.filter((b) => b.betType === bType).reduce((sum, b) => sum + b.amount, 0);
  };

  const countRed = history.filter((n) => RED_NUMBERS.has(n)).length;
  const countGreen = history.filter((n) => n === 0).length;
  const countBlack = history.filter((n) => n !== 0 && !RED_NUMBERS.has(n)).length;
  const totalCounts = countRed + countGreen + countBlack || 1;

  const highlightCoords = activeHighlightNum !== null ? getPocketCoordinates(activeHighlightNum) : null;
  const highlightColor = activeHighlightNum !== null ? getNumberColor(activeHighlightNum) : null;

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
            className="w-10 h-10 rounded-xl bg-[var(--surface-bg)] border-2 border-[var(--card-border)] flex items-center justify-center text-[var(--nav-item-color)] hover:text-white transition-colors cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-red-400" />}
          </button>

          <button
            onClick={() => setShowHelp(!showHelp)}
            className="w-10 h-10 rounded-xl bg-[var(--surface-bg)] border-2 border-[var(--card-border)] flex items-center justify-center text-[var(--nav-item-color)] hover:text-white transition-colors cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="rounded-2xl border-2 sm:border-4 border-[var(--card-border)] bg-[var(--surface-bg)] p-4 sm:p-6 shadow-2xl space-y-6 overflow-hidden">
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

        <div className="flex flex-col items-center justify-center py-2 relative">
          <div className="relative flex items-center justify-center">
            <div className="relative w-72 h-72 sm:w-88 sm:h-88 md:w-[420px] md:h-[420px] rounded-full p-2 bg-gradient-to-b from-[#2a1d3b] via-[#161224] to-[#090810] border-4 border-amber-500/30 shadow-[0_0_50px_rgba(0,0,0,0.8),inset_0_0_30px_rgba(0,0,0,0.9)] flex items-center justify-center select-none">
              
              <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center relative">
                <img
                  src="/images/roulette-wheel.png"
                  alt="Roulette Wheel"
                  className="w-full h-full object-contain pointer-events-none select-none"
                />

                {highlightCoords && (
                  <div
                    className={`absolute w-6 h-6 sm:w-7 sm:h-7 rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2 border-2 animate-pulse ${
                      highlightColor === 'green'
                        ? 'border-emerald-400 bg-emerald-400/25 shadow-[0_0_15px_rgba(52,211,153,0.9)]'
                        : highlightColor === 'red'
                        ? 'border-red-400 bg-red-400/25 shadow-[0_0_15px_rgba(248,113,113,0.9)]'
                        : 'border-zinc-300 bg-white/15 shadow-[0_0_15px_rgba(255,255,255,0.7)]'
                    }`}
                    style={{
                      left: `${highlightCoords.x}%`,
                      top: `${highlightCoords.y}%`,
                    }}
                  />
                )}

                <div
                  className="absolute pointer-events-none select-none z-30"
                  style={{
                    left: `${ballPos.x}%`,
                    top: `${ballPos.y}%`,
                    transform: 'translate(-50%, -50%)',
                    willChange: 'left, top',
                  }}
                >
                  <div className="relative w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center">
                    <div className="absolute w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-black/80 blur-[1px] translate-y-0.5 translate-x-0.5" />
                    
                    <div className={`w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 rounded-full bg-gradient-to-br from-white via-slate-100 to-slate-400 shadow-[0_0_8px_rgba(255,255,255,0.9),inset_-1px_-1px_3px_rgba(0,0,0,0.5),inset_1px_1px_2px_rgba(255,255,255,1)] border border-white/90 ${
                      isBallSpinning ? 'shadow-[0_0_14px_rgba(255,255,255,1)] scale-105' : ''
                    }`} />
                  </div>
                </div>
              </div>

              <div className="absolute inset-0 rounded-full border-2 border-amber-400/20 pointer-events-none" />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            {phase === "BETTING" ? (
              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-4 py-1.5 rounded-xl shadow-sm">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <span className="font-outfit font-black text-sm uppercase tracking-wider text-amber-300">
                  Faites vos jeux : <span className="font-mono text-white text-base">{countdown.toFixed(1)}s</span>
                </span>
              </div>
            ) : phase === "SPINNING" ? (
              <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 px-4 py-1.5 rounded-xl shadow-sm">
                <Disc className="w-4 h-4 text-purple-400 animate-spin" />
                <span className="font-outfit font-black text-sm uppercase tracking-wider text-purple-300">
                  La boule ralentit sur les numéros...
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-4 py-1.5 rounded-xl shadow-sm">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="font-outfit font-black text-sm uppercase tracking-wider text-emerald-300">
                  La boule s&apos;arrête sur : <span className="font-mono text-white text-lg font-black">{winningNumber}</span> ({getNumberColor(winningNumber || 0).toUpperCase()})
                </span>
              </div>
            )}

            {resolvedWin && (
              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black text-sm animate-bounce shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                <CheckCircle2 className="w-4 h-4" />
                <span>+{resolvedWin.amount.toLocaleString("fr-FR")} PC !</span>
              </div>
            )}
          </div>
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
            {totalMyBet > 0 && (
              <span className="text-xs text-[var(--nav-item-color)] ml-2">
                Total engagé : <span className="font-mono font-black text-purple-300">{totalMyBet.toLocaleString("fr-FR")} PC</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip}
                disabled={phase !== "BETTING"}
                onClick={() => setBetAmount(chip)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
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
              className="px-2 py-1 text-xs font-bold bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 border border-purple-500/20 rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
            >
              ½
            </button>
            <button
              disabled={phase !== "BETTING"}
              onClick={() => setBetAmount((b) => Math.min(coins, b * 2))}
              className="px-2 py-1 text-xs font-bold bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 border border-purple-500/20 rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
            >
              2×
            </button>
            <button
              disabled={phase !== "BETTING"}
              onClick={() => setBetAmount(Math.min(50000, coins))}
              className="px-2 py-1 text-xs font-bold bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 border border-purple-500/20 rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
            >
              Max
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <button
              onClick={() => placeBet("red")}
              disabled={isSubmitting || phase !== "BETTING" || betAmount > coins || betAmount < 10}
              className="py-3 px-2 rounded-xl font-outfit font-black uppercase tracking-wider text-xs sm:text-sm bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white border border-red-400/40 shadow-[0_0_15px_rgba(220,38,38,0.3)] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex flex-col items-center justify-center gap-1"
            >
              <span>ROUGE (2×)</span>
              {getBetAmountFor("red") > 0 && (
                <span className="text-[10px] font-mono bg-black/40 px-2 py-0.5 rounded-full border border-red-300/40">
                  {getBetAmountFor("red")} PC
                </span>
              )}
            </button>

            <button
              onClick={() => placeBet("green")}
              disabled={isSubmitting || phase !== "BETTING" || betAmount > coins || betAmount < 10}
              className="py-3 px-2 rounded-xl font-outfit font-black uppercase tracking-wider text-xs sm:text-sm bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black border border-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.5)] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex flex-col items-center justify-center gap-1"
            >
              <span className="flex items-center gap-1 font-black">
                <Sparkles className="w-3.5 h-3.5" />
                VERT 0 (36×)
              </span>
              {getBetAmountFor("green") > 0 && (
                <span className="text-[10px] font-mono bg-black/30 text-white px-2 py-0.5 rounded-full border border-emerald-200/40">
                  {getBetAmountFor("green")} PC
                </span>
              )}
            </button>

            <button
              onClick={() => placeBet("black")}
              disabled={isSubmitting || phase !== "BETTING" || betAmount > coins || betAmount < 10}
              className="py-3 px-2 rounded-xl font-outfit font-black uppercase tracking-wider text-xs sm:text-sm bg-gradient-to-r from-zinc-800 to-zinc-950 hover:from-zinc-700 hover:to-zinc-900 text-white border border-zinc-600/50 shadow-[0_0_15px_rgba(39,39,42,0.5)] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex flex-col items-center justify-center gap-1"
            >
              <span>NOIR (2×)</span>
              {getBetAmountFor("black") > 0 && (
                <span className="text-[10px] font-mono bg-black/40 px-2 py-0.5 rounded-full border border-zinc-500/40">
                  {getBetAmountFor("black")} PC
                </span>
              )}
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              { type: "low" as BetType, label: "1 - 18", mult: "2×" },
              { type: "even" as BetType, label: "PAIR", mult: "2×" },
              { type: "odd" as BetType, label: "IMPAIR", mult: "2×" },
              { type: "high" as BetType, label: "19 - 36", mult: "2×" },
            ].map((item) => (
              <button
                key={item.type}
                onClick={() => placeBet(item.type)}
                disabled={isSubmitting || phase !== "BETTING" || betAmount > coins || betAmount < 10}
                className="py-2 px-1 rounded-xl font-outfit font-bold text-xs bg-purple-950/30 hover:bg-purple-900/40 text-purple-200 border border-purple-500/20 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer flex flex-col items-center justify-center"
              >
                <span>{item.label} ({item.mult})</span>
                {getBetAmountFor(item.type) > 0 && (
                  <span className="text-[10px] font-mono text-amber-300 font-bold mt-0.5">
                    {getBetAmountFor(item.type)} PC
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { type: "dozen_1" as BetType, label: "1ère 12 (1-12)", mult: "3×" },
              { type: "dozen_2" as BetType, label: "2ème 12 (13-24)", mult: "3×" },
              { type: "dozen_3" as BetType, label: "3ème 12 (25-36)", mult: "3×" },
            ].map((item) => (
              <button
                key={item.type}
                onClick={() => placeBet(item.type)}
                disabled={isSubmitting || phase !== "BETTING" || betAmount > coins || betAmount < 10}
                className="py-2 px-1 rounded-xl font-outfit font-bold text-xs bg-indigo-950/30 hover:bg-indigo-900/40 text-indigo-200 border border-indigo-500/20 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer flex flex-col items-center justify-center"
              >
                <span>{item.label} ({item.mult})</span>
                {getBetAmountFor(item.type) > 0 && (
                  <span className="text-[10px] font-mono text-amber-300 font-bold mt-0.5">
                    {getBetAmountFor(item.type)} PC
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="bg-black/40 rounded-xl p-2.5 border border-[var(--card-border)] overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-1.5 min-w-[700px]">
              <button
                onClick={() => placeBet("num_0")}
                disabled={isSubmitting || phase !== "BETTING" || betAmount > coins || betAmount < 10}
                className="w-12 h-[100px] rounded-lg bg-emerald-600 hover:bg-emerald-500 text-black font-black font-mono text-sm border border-emerald-300 flex flex-col items-center justify-center shrink-0 transition-all active:scale-95 disabled:opacity-50 cursor-pointer relative shadow-sm"
              >
                <span>0</span>
                <span className="text-[9px] font-sans font-bold">36×</span>
                {getBetAmountFor("num_0") > 0 && (
                  <span className="absolute bottom-1 bg-black/80 text-emerald-300 font-mono text-[9px] px-1 rounded border border-emerald-400">
                    {getBetAmountFor("num_0")}
                  </span>
                )}
              </button>

              <div className="flex-1 grid grid-rows-3 gap-1">
                {NUMBER_GRID_ROWS.map((row, rIdx) => (
                  <div key={rIdx} className="grid grid-cols-12 gap-1">
                    {row.map((n) => {
                      const isRed = RED_NUMBERS.has(n);
                      const betTypeKey: BetType = `num_${n}`;
                      const myAmount = getBetAmountFor(betTypeKey);

                      return (
                        <button
                          key={n}
                          onClick={() => placeBet(betTypeKey)}
                          disabled={isSubmitting || phase !== "BETTING" || betAmount > coins || betAmount < 10}
                          className={`h-7 rounded-md font-mono font-black text-xs flex items-center justify-center relative transition-all active:scale-90 disabled:opacity-50 cursor-pointer border ${
                            isRed 
                              ? 'bg-red-700/80 hover:bg-red-600 text-white border-red-500/40 shadow-sm' 
                              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-zinc-600/50 shadow-sm'
                          }`}
                        >
                          <span>{n}</span>
                          {myAmount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-400 text-black text-[9px] font-mono font-bold flex items-center justify-center border border-amber-200 shadow">
                              •
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--card-border)] pt-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-[var(--nav-item-color)]">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
              Paris en direct ({bets.length})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto scrollbar-none">
            {bets.map((b) => {
              const isMine = b.userId === currentUserId;
              return (
                <div 
                  key={b.id} 
                  className={`flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl border ${
                    isMine
                      ? 'bg-purple-950/30 border-purple-500/40 text-purple-200 shadow-sm'
                      : 'bg-black/30 border-[var(--card-border)] text-[var(--nav-item-color)]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <img
                      src={`https://mc-heads.net/avatar/${b.minecraftName || b.name}/20`}
                      alt={b.name}
                      className="w-5 h-5 rounded border border-[var(--card-border)] bg-black/40 shrink-0"
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                    <span className="font-mono truncate font-bold text-white text-[11px]">{b.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 border border-white/10">
                      {formatBetName(b.betType)}
                    </span>
                    <span className="font-mono font-bold text-purple-300">{b.amount} PC</span>
                  </div>
                </div>
              );
            })}
            {bets.length === 0 && (
              <div className="col-span-full py-6 text-center text-xs text-[var(--nav-item-color)]">
                Aucun pari placé pour ce tour. Soyez le premier !
              </div>
            )}
          </div>
        </div>
      </div>

      {showHelp && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--surface-bg)] border-2 border-[var(--card-border)] rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-outfit font-black text-white mb-3">
              Règles de la Roulette Européenne
            </h3>
            <ul className="text-xs text-[var(--nav-item-color)] space-y-2 leading-relaxed">
              <li>• La roue européenne comprend 37 cases (0 à 36).</li>
              <li>• <strong>Numéro plein (0 à 36)</strong> : Multiplie votre mise par <strong>36×</strong>.</li>
              <li>• <strong>Vert (0)</strong> : Multiplie votre mise par <strong>36×</strong>.</li>
              <li>• <strong>Rouge / Noir</strong> : Double votre mise (2×).</li>
              <li>• <strong>Pair / Impair</strong> : Double votre mise (2×).</li>
              <li>• <strong>1-18 / 19-36</strong> : Double votre mise (2×).</li>
              <li>• <strong>Douzaines (1-12, 13-24, 25-36)</strong> : Triple votre mise (3×).</li>
              <li>• Vous pouvez cumuler plusieurs paris différents sur le même tour.</li>
            </ul>
            <button
              onClick={() => setShowHelp(false)}
              className="mt-6 w-full py-2.5 rounded-xl btn-neo-primary text-xs font-bold cursor-pointer"
            >
              Compris
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

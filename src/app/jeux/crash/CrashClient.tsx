"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { 
  Volume2, 
  VolumeX, 
  ShieldCheck, 
  HelpCircle, 
  Coins, 
  ArrowLeft,
  Rocket,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Users,
  Radio
} from "lucide-react";
import toast from "react-hot-toast";

const QUICK_CHIPS = [10, 50, 100, 250, 500, 1000];

interface CrashPlayer {
  userId: string;
  name: string;
  image?: string | null;
  minecraftName?: string | null;
  bet: number;
  cashedOut: boolean;
  cashoutMultiplier?: number;
  payout?: number;
}

interface CrashClientProps {
  initialCoins: number;
  isAuthenticated: boolean;
  currentUserId: string | null;
  currentMinecraftName: string | null;
  currentUserName: string | null;
}

export default function CrashClient({
  initialCoins,
  isAuthenticated,
  currentUserId,
  currentMinecraftName,
  currentUserName,
}: CrashClientProps) {
  const [coins, setCoins] = useState(initialCoins);
  const [bet, setBet] = useState(50);
  const [autoCashout, setAutoCashout] = useState<string>("2.00");
  const [autoCashoutEnabled, setAutoCashoutEnabled] = useState(false);
  const [phase, setPhase] = useState<"BETTING" | "FLYING" | "CRASHED">("BETTING");
  const [countdown, setCountdown] = useState(5.0);
  const [multiplier, setMultiplier] = useState(1.00);
  const [crashPoint, setCrashPoint] = useState<number | null>(null);
  const [players, setPlayers] = useState<CrashPlayer[]>([]);
  const [history, setHistory] = useState<number[]>([1.42, 2.15, 1.10, 5.80, 1.95, 12.40, 1.05]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [queuedForNextRound, setQueuedForNextRound] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const playersRef = useRef(players);
  playersRef.current = players;
  const queuedRef = useRef(queuedForNextRound);
  queuedRef.current = queuedForNextRound;
  const betRef = useRef(bet);
  betRef.current = bet;
  const multiplierRef = useRef(multiplier);
  multiplierRef.current = multiplier;
  const autoCashoutRef = useRef({ enabled: autoCashoutEnabled, value: parseFloat(autoCashout) });
  autoCashoutRef.current = { enabled: autoCashoutEnabled, value: parseFloat(autoCashout) };

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);
  const flightStartTimeRef = useRef<number>(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const engineOscRef = useRef<OscillatorNode | null>(null);
  const engineGainRef = useRef<GainNode | null>(null);

  const currentPlayer = players.find((p) => p.userId === currentUserId);
  const hasPlacedBet = !!currentPlayer;
  const hasCashedOut = !!currentPlayer?.cashedOut;

  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) audioCtxRef.current = new AudioCtx();
    }
  };

  const startEngineSound = () => {
    if (!soundEnabled) return;
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(80, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      engineOscRef.current = osc;
      engineGainRef.current = gain;
    } catch {}
  };

  const updateEngineSound = (mult: number) => {
    if (!soundEnabled || !engineOscRef.current || !audioCtxRef.current) return;
    try {
      const freq = Math.min(600, 80 + (mult - 1) * 70);
      engineOscRef.current.frequency.setValueAtTime(freq, audioCtxRef.current.currentTime);
    } catch {}
  };

  const stopEngineSound = () => {
    if (engineOscRef.current) {
      try {
        engineOscRef.current.stop();
        engineOscRef.current.disconnect();
      } catch {}
      engineOscRef.current = null;
    }
  };

  const playCashoutSound = () => {
    if (!soundEnabled) return;
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    [587.33, 880.0, 1174.66].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(f, ctx.currentTime + i * 0.06);

      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.06);
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + i * 0.06 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.06);
      osc.stop(ctx.currentTime + i * 0.06 + 0.28);
    });
  };

  const playCrashSound = () => {
    if (!soundEnabled) return;
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(120, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.35);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  };

  const submitBet = async (amount: number) => {
    if (!isAuthenticated) {
      toast.error("Veuillez vous connecter pour jouer.");
      return;
    }
    if (amount > coins) {
      toast.error("Solde insuffisant.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/games/crash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bet", bet: amount }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erreur lors de la mise");
        setIsSubmitting(false);
        return;
      }

      setCoins(data.paraCoins);
      toast.success(`Mise de ${amount} PC validée !`);
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCashout = async () => {
    if (phaseRef.current !== "FLYING" || !hasPlacedBet || hasCashedOut) return;

    try {
      const res = await fetch("/api/games/crash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cashout" }),
      });
      const data = await res.json();

      if (data.success) {
        setCoins(data.paraCoins);
        playCashoutSound();
        toast.success(`Encaissé ! +${data.payout} PC (${data.multiplier}×)`);
      } else {
        toast.error(data.error || "Erreur d'encaissement");
      }
    } catch {
      toast.error("Erreur réseau");
    }
  };

  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connectSSE = () => {
      eventSource = new EventSource("/api/games/crash/events");

      eventSource.addEventListener("INIT", (e) => {
        const data = JSON.parse(e.data);
        setPhase(data.phase);
        setCountdown(data.countdown);
        setMultiplier(data.multiplier);
        setCrashPoint(data.crashPoint);
        setPlayers(data.players);
        setHistory(data.history);

        if (data.phase === "FLYING" && data.startedAt) {
          flightStartTimeRef.current = performance.now() - Math.max(0, Date.now() - data.startedAt);
          startEngineSound();
        }
      });

      eventSource.addEventListener("PHASE_CHANGE", (e) => {
        const data = JSON.parse(e.data);
        setPhase(data.phase);
        setCountdown(data.countdown);
        setPlayers(data.players);

        if (data.phase === "FLYING") {
          flightStartTimeRef.current = performance.now() - Math.max(0, Date.now() - (data.startedAt || Date.now()));
          setMultiplier(1.00);
          setCrashPoint(null);
          startEngineSound();
        } else if (data.phase === "BETTING") {
          stopEngineSound();
          setCrashPoint(null);
          setMultiplier(1.00);

          if (queuedRef.current) {
            setQueuedForNextRound(false);
            submitBet(betRef.current);
          }
        }
      });

      eventSource.addEventListener("TICK", (e) => {
        const data = JSON.parse(e.data);
        setCountdown(data.countdown);
      });

      eventSource.addEventListener("BET_PLACED", (e) => {
        const newPlayer: CrashPlayer = JSON.parse(e.data);
        setPlayers((prev) => {
          const idx = prev.findIndex((p) => p.userId === newPlayer.userId);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = newPlayer;
            return next;
          }
          return [...prev, newPlayer];
        });
      });

      eventSource.addEventListener("PLAYER_CASHOUT", (e) => {
        const data = JSON.parse(e.data);
        setPlayers((prev) =>
          prev.map((p) => {
            if (p.userId === data.userId) {
              return {
                ...p,
                cashedOut: true,
                cashoutMultiplier: data.multiplier,
                payout: data.payout,
              };
            }
            return p;
          })
        );

        if (data.userId !== currentUserId && soundEnabled) {
          playCashoutSound();
        }
      });

      eventSource.addEventListener("CRASHED", (e) => {
        const data = JSON.parse(e.data);
        setPhase("CRASHED");
        setCrashPoint(data.crashPoint);
        setMultiplier(data.crashPoint);
        setHistory(data.history);
        stopEngineSound();
        playCrashSound();

        const player = playersRef.current.find((p) => p.userId === currentUserId);
        if (player && !player.cashedOut) {
          toast.error(`Crashé @ ${data.crashPoint.toFixed(2)}× - Mise perdue`);
        }
      });

      eventSource.onerror = () => {
        eventSource?.close();
        setTimeout(connectSSE, 3000);
      };
    };

    connectSSE();

    return () => {
      stopEngineSound();
      if (eventSource) eventSource.close();
    };
  }, [currentUserId, soundEnabled]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = [];

    const render = () => {
      const w = (canvas.width = canvas.parentElement?.clientWidth || 600);
      const h = (canvas.height = canvas.parentElement?.clientHeight || 450);

      ctx.clearRect(0, 0, w, h);

      ctx.strokeStyle = "rgba(168, 85, 247, 0.07)";
      ctx.lineWidth = 1;
      for (let y = h - 40; y >= 40; y -= 50) {
        ctx.beginPath();
        ctx.moveTo(50, y);
        ctx.lineTo(w - 20, y);
        ctx.stroke();
      }
      for (let x = 50; x <= w - 20; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, 40);
        ctx.lineTo(x, h - 40);
        ctx.stroke();
      }

      ctx.strokeStyle = "rgba(168, 85, 247, 0.25)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(50, 40);
      ctx.lineTo(50, h - 40);
      ctx.lineTo(w - 20, h - 40);
      ctx.stroke();

      if (phaseRef.current === "FLYING" || phaseRef.current === "CRASHED") {
        const elapsed = Math.max(0, (performance.now() - flightStartTimeRef.current) / 1000);
        const currentM = Math.max(1.00, Math.pow(Math.E, 0.075 * elapsed));

        if (phaseRef.current === "FLYING") {
          setMultiplier(parseFloat(currentM.toFixed(2)));
          updateEngineSound(currentM);

          const curP = playersRef.current.find((p) => p.userId === currentUserId);
          if (
            curP &&
            !curP.cashedOut &&
            autoCashoutRef.current.enabled &&
            !isNaN(autoCashoutRef.current.value) &&
            currentM >= autoCashoutRef.current.value
          ) {
            handleCashout();
          }
        }

        const plotW = w - 90;
        const plotH = h - 90;
        const maxTime = Math.max(8, elapsed * 1.15);
        const maxMult = Math.max(2, currentM * 1.25);

        ctx.beginPath();
        ctx.moveTo(50, h - 40);

        const steps = 60;
        for (let i = 1; i <= steps; i++) {
          const t = (elapsed * i) / steps;
          const m = Math.max(1.00, Math.pow(Math.E, 0.075 * t));
          const px = 50 + (t / maxTime) * plotW;
          const py = h - 40 - ((m - 1) / (maxMult - 1)) * plotH;
          ctx.lineTo(px, py);
        }

        ctx.strokeStyle = phaseRef.current === "CRASHED" ? "#ef4444" : "#a855f7";
        ctx.lineWidth = 4;
        ctx.shadowColor = phaseRef.current === "CRASHED" ? "rgba(239, 68, 68, 0.6)" : "rgba(168, 85, 247, 0.8)";
        ctx.shadowBlur = 15;
        ctx.stroke();
        ctx.shadowBlur = 0;

        const lastX = 50 + (elapsed / maxTime) * plotW;
        const lastY = h - 40 - ((currentM - 1) / (maxMult - 1)) * plotH;

        if (phaseRef.current !== "CRASHED") {
          ctx.fillStyle = "#ec4899";
          ctx.shadowColor = "rgba(236, 72, 153, 1)";
          ctx.shadowBlur = 20;
          ctx.beginPath();
          ctx.arc(lastX, lastY, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          if (Math.random() < 0.7) {
            particles.push({
              x: lastX,
              y: lastY,
              vx: (Math.random() - 0.7) * 2.5,
              vy: Math.random() * 2.5,
              life: 1.0,
              color: Math.random() > 0.5 ? "#a855f7" : "#ec4899",
            });
          }
        } else {
          if (particles.length === 0) {
            for (let p = 0; p < 35; p++) {
              particles.push({
                x: lastX,
                y: lastY,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 1.0,
                color: Math.random() > 0.5 ? "#ef4444" : "#f97316",
              });
            }
          }
        }
      } else {
        ctx.fillStyle = "rgba(168, 85, 247, 0.5)";
        ctx.beginPath();
        ctx.arc(50, h - 40, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.03;

        if (p.life <= 0) {
          particles.splice(i, 1);
        } else {
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.life;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3 * p.life, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1.0;
        }
      }

      animFrameId.current = requestAnimationFrame(render);
    };

    animFrameId.current = requestAnimationFrame(render);

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [currentUserId]);

  const totalPool = players.reduce((sum, p) => sum + p.bet, 0);

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
          <div className="flex items-center gap-2 bg-purple-600/10 border border-purple-500/30 px-3 py-1.5 rounded-xl text-purple-300 text-xs font-bold">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">Salle Multijoueur</span>
            <span className="font-mono text-white">({players.length})</span>
          </div>

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
                  disabled={hasPlacedBet && phase === "BETTING"}
                  onChange={(e) => setBet(Math.max(10, parseInt(e.target.value) || 10))}
                  className="w-full bg-transparent px-3.5 py-2.5 text-sm font-black font-mono text-purple-300 focus:outline-none disabled:opacity-50"
                />
                <div className="flex items-center gap-1 pr-2 shrink-0">
                  <button
                    disabled={hasPlacedBet && phase === "BETTING"}
                    onClick={() => setBet((b) => Math.max(10, Math.floor(b / 2)))}
                    className="px-2 py-1 text-xs font-bold bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 border border-purple-500/20 rounded-lg transition-colors disabled:opacity-40"
                  >
                    ½
                  </button>
                  <button
                    disabled={hasPlacedBet && phase === "BETTING"}
                    onClick={() => setBet((b) => Math.min(coins, b * 2))}
                    className="px-2 py-1 text-xs font-bold bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 border border-purple-500/20 rounded-lg transition-colors disabled:opacity-40"
                  >
                    2×
                  </button>
                  <button
                    disabled={hasPlacedBet && phase === "BETTING"}
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
                  disabled={hasPlacedBet && phase === "BETTING"}
                  onClick={() => setBet(chip)}
                  className={`py-2 text-xs font-bold rounded-xl border-2 transition-all ${bet === chip ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]' : 'bg-black/40 border-[var(--card-border)] hover:border-purple-500/40 text-[var(--nav-item-color)] hover:text-white'} disabled:opacity-40`}
                >
                  {chip} PC
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--card-border)]">
              <div className="flex items-center justify-between text-xs font-bold text-[var(--nav-item-color)]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoCashoutEnabled}
                    onChange={(e) => setAutoCashoutEnabled(e.target.checked)}
                    className="accent-purple-600 w-4 h-4 rounded cursor-pointer"
                  />
                  <span>Auto Cashout</span>
                </label>
                <span>Ex: 2.00×</span>
              </div>

              <div className="relative flex items-center rounded-xl bg-black/40 border-2 border-[var(--card-border)] focus-within:border-purple-500 transition-colors">
                <input
                  type="number"
                  min="1.01"
                  step="0.05"
                  value={autoCashout}
                  disabled={!autoCashoutEnabled}
                  onChange={(e) => setAutoCashout(e.target.value)}
                  className="w-full bg-transparent px-3.5 py-2.5 text-sm font-black font-mono text-purple-300 focus:outline-none disabled:opacity-40"
                />
                <span className="pr-3 text-xs font-bold text-[var(--nav-item-color)]">×</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[var(--card-border)]">
            {phase === "BETTING" ? (
              hasPlacedBet ? (
                <div className="w-full py-3.5 px-4 rounded-xl bg-emerald-500/20 border-2 border-emerald-500/40 text-emerald-300 flex items-center justify-center gap-2 font-bold text-sm shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Mise validée : {currentPlayer?.bet} PC</span>
                </div>
              ) : (
                <button
                  onClick={() => submitBet(bet)}
                  disabled={isSubmitting || bet > coins || bet < 10}
                  className="btn-neo-primary w-full py-4 text-center justify-center disabled:opacity-50 disabled:cursor-not-allowed text-base font-black tracking-wide cursor-pointer"
                >
                  <Rocket className="w-5 h-5 mr-1" />
                  <span>Parier • {bet} PC</span>
                </button>
              )
            ) : phase === "FLYING" ? (
              hasPlacedBet && !hasCashedOut ? (
                <button
                  onClick={handleCashout}
                  className="w-full py-4 rounded-xl font-outfit font-black uppercase tracking-wider text-base bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black border-2 border-amber-300/40 shadow-[0_4px_25px_rgba(245,158,11,0.5)] active:scale-[0.98] transition-all cursor-pointer flex flex-col items-center justify-center leading-tight"
                >
                  <span>Encaisser</span>
                  <span className="text-xs font-mono font-black mt-0.5">
                    +{Math.floor((currentPlayer?.bet || bet) * multiplier)} PC ({multiplier.toFixed(2)}×)
                  </span>
                </button>
              ) : hasCashedOut ? (
                <div className="w-full py-3.5 px-4 rounded-xl bg-emerald-500/20 border-2 border-emerald-500/40 text-emerald-300 flex items-center justify-center gap-2 font-bold text-sm shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Encaissé : +{currentPlayer?.payout} PC</span>
                </div>
              ) : (
                <button
                  onClick={() => setQueuedForNextRound(!queuedForNextRound)}
                  className={`w-full py-3.5 rounded-xl text-xs font-bold border-2 transition-all cursor-pointer ${
                    queuedForNextRound
                      ? 'bg-purple-600/30 border-purple-400 text-purple-200'
                      : 'bg-black/50 border-[var(--card-border)] hover:border-purple-500/40 text-[var(--nav-item-color)] hover:text-white'
                  }`}
                >
                  {queuedForNextRound ? `Pari prévu pour le tour suivant (${bet} PC)` : `Parier pour le tour suivant • ${bet} PC`}
                </button>
              )
            ) : (
              hasPlacedBet && !hasCashedOut ? (
                <div className="w-full py-3.5 px-4 rounded-xl bg-red-500/20 border-2 border-red-500/40 text-red-300 flex items-center justify-center gap-2 font-bold text-sm">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                  <span>Perdu (-{currentPlayer?.bet} PC)</span>
                </div>
              ) : hasCashedOut ? (
                <div className="w-full py-3.5 px-4 rounded-xl bg-emerald-500/20 border-2 border-emerald-500/40 text-emerald-300 flex items-center justify-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Gagné : +{currentPlayer?.payout} PC</span>
                </div>
              ) : (
                <button
                  onClick={() => setQueuedForNextRound(!queuedForNextRound)}
                  className={`w-full py-3.5 rounded-xl text-xs font-bold border-2 transition-all cursor-pointer ${
                    queuedForNextRound
                      ? 'bg-purple-600/30 border-purple-400 text-purple-200'
                      : 'bg-black/50 border-[var(--card-border)] hover:border-purple-500/40 text-[var(--nav-item-color)] hover:text-white'
                  }`}
                >
                  {queuedForNextRound ? `Pari prévu pour le tour suivant (${bet} PC)` : `Parier pour le tour suivant • ${bet} PC`}
                </button>
              )
            )}
          </div>
        </div>

        <div className="flex-1 bg-gradient-to-b from-[#0e0c18] via-[#090810] to-[#05040a] relative p-4 sm:p-6 flex flex-col justify-between min-h-[520px] overflow-hidden select-none">
          <div className="relative z-10 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {history.map((h, i) => {
              const isHigh = h >= 10;
              const isMid = h >= 2;
              return (
                <span
                  key={i}
                  className={`px-3 py-1 rounded-lg text-xs font-black font-mono shrink-0 border ${isHigh ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : isMid ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' : 'bg-white/5 text-[var(--nav-item-color)] border-white/10'}`}
                >
                  {h.toFixed(2)}×
                </span>
              );
            })}
          </div>

          <div className="relative w-full flex-1 flex items-center justify-center min-h-[360px]">
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

            <div className="relative z-20 flex flex-col items-center justify-center text-center">
              {phase === "BETTING" && (
                <div className="flex flex-col items-center gap-3">
                  <div className="relative flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl sm:text-3xl font-black font-mono text-white">
                        {countdown.toFixed(1)}s
                      </span>
                    </div>
                  </div>
                  <span className="font-outfit font-black text-sm uppercase tracking-widest text-purple-300">
                    Décollage imminent
                  </span>
                  {hasPlacedBet ? (
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full">
                      ✓ Mise de {currentPlayer?.bet} PC validée
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--nav-item-color)]">
                      Placez votre mise avant le compte à rebours
                    </span>
                  )}
                </div>
              )}

              {phase === "FLYING" && (
                <div className="flex flex-col items-center">
                  <span className="font-outfit font-black text-6xl sm:text-7xl lg:text-8xl tracking-tight text-white drop-shadow-[0_0_35px_rgba(168,85,247,0.7)]">
                    {multiplier.toFixed(2)}×
                  </span>
                  {hasPlacedBet && !hasCashedOut ? (
                    <span className="text-xs font-bold font-mono uppercase tracking-widest text-purple-300 mt-2 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/30">
                      Gain actuel : +{Math.floor((currentPlayer?.bet || bet) * multiplier)} PC
                    </span>
                  ) : hasCashedOut ? (
                    <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-sm mt-3 shadow-lg">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>ENCAISSÉ ! +{currentPlayer?.payout} PC</span>
                    </div>
                  ) : (
                    <span className="text-xs font-bold uppercase tracking-widest text-[var(--nav-item-color)] mt-2">
                      Mode Spectateur
                    </span>
                  )}
                </div>
              )}

              {phase === "CRASHED" && (
                <div className="flex flex-col items-center">
                  <span className="font-outfit font-black text-5xl sm:text-6xl text-red-500 drop-shadow-[0_0_30px_rgba(239,68,68,0.8)]">
                    {multiplier.toFixed(2)}×
                  </span>
                  <span className="text-xs font-black uppercase tracking-widest text-red-300 mt-3 bg-red-500/20 px-4 py-1.5 rounded-full border border-red-500/40 shadow-lg">
                    CRASHÉ
                  </span>
                  <span className="text-[11px] text-[var(--nav-item-color)] mt-2">
                    Prochaine manche dans un instant...
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between text-xs text-[var(--nav-item-color)] px-2 pt-2 border-t border-[var(--card-border)]">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span>Multiplayer Synchronisé • Provably Fair</span>
            </div>
            <span>House Edge : 4%</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-[var(--card-border)] bg-[var(--surface-bg)] overflow-hidden shadow-xl">
        <div className="p-4 border-b border-[var(--card-border)] flex items-center justify-between bg-black/30">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-purple-400" />
            <h3 className="font-outfit font-black text-sm uppercase tracking-wider text-white">
              Joueurs en direct
            </h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              {players.length}
            </span>
          </div>

          <div className="text-xs font-bold text-[var(--nav-item-color)]">
            Total en jeu :{" "}
            <span className="font-mono text-purple-300 font-black">
              {totalPool.toLocaleString("fr-FR")} PC
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          {players.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--nav-item-color)] flex flex-col items-center gap-2">
              <Rocket className="w-8 h-8 text-purple-500/30 animate-pulse" />
              <span>Aucun joueur n'a encore misé pour cette manche. Placez la première mise !</span>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--card-border)] bg-black/20 text-[var(--nav-item-color)] font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Joueur</th>
                  <th className="py-3 px-4">Mise</th>
                  <th className="py-3 px-4">Multiplicateur</th>
                  <th className="py-3 px-4 text-right">Gain</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--card-border)]/50">
                {players.map((p) => {
                  const isMe = p.userId === currentUserId;
                  const mcHeadUrl = `https://mc-heads.net/avatar/${p.minecraftName || p.name || 'MHF_Steve'}/28`;

                  return (
                    <tr
                      key={p.userId}
                      className={`transition-colors ${isMe ? 'bg-purple-900/15 font-bold' : 'hover:bg-white/5'} ${
                        p.cashedOut ? 'bg-emerald-950/15' : ''
                      }`}
                    >
                      <td className="py-3 px-4 flex items-center gap-2.5">
                        <img
                          src={mcHeadUrl}
                          alt={p.name}
                          className="w-7 h-7 rounded-lg border border-purple-500/30 bg-black/40 shrink-0"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <div className="flex items-center gap-1.5">
                          <span className={`font-mono ${isMe ? 'text-purple-200 font-black' : 'text-white'}`}>
                            {p.name}
                          </span>
                          {isMe && (
                            <span className="text-[10px] bg-purple-600/40 text-purple-200 px-1.5 py-0.5 rounded border border-purple-400/40 font-sans uppercase">
                              Vous
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-purple-300 font-bold">
                        {p.bet.toLocaleString("fr-FR")} PC
                      </td>
                      <td className="py-3 px-4 font-mono font-bold">
                        {p.cashedOut ? (
                          <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                            {p.cashoutMultiplier?.toFixed(2)}×
                          </span>
                        ) : phase === "CRASHED" ? (
                          <span className="text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/30">
                            Crashé
                          </span>
                        ) : phase === "FLYING" ? (
                          <span className="text-amber-400 animate-pulse">En vol...</span>
                        ) : (
                          <span className="text-[var(--nav-item-color)]">Prêt</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black">
                        {p.cashedOut ? (
                          <span className="text-emerald-400">+{p.payout?.toLocaleString("fr-FR")} PC</span>
                        ) : phase === "CRASHED" ? (
                          <span className="text-red-400/70">0 PC</span>
                        ) : (
                          <span className="text-[var(--nav-item-color)]">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showHelp && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--surface-bg)] border-2 border-[var(--card-border)] rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-outfit font-black text-white mb-3">
              Règles du jeu Crash Multijoueur
            </h3>
            <ul className="text-xs text-[var(--nav-item-color)] space-y-2 leading-relaxed">
              <li>• Vous jouez dans la <strong>même salle en temps réel</strong> avec tous les joueurs de Paranoia.</li>
              <li>• Compte à rebours de 5 secondes pour placer votre mise.</li>
              <li>• La fusée décolle avec un multiplicateur démarrant à <strong>1.00×</strong>.</li>
              <li>• Tous les joueurs voient la même courbe monter et les encaissements en direct.</li>
              <li>• Cliquez sur <strong>Encaisser</strong> avant l'explosion pour remporter votre mise multipliée.</li>
              <li>• Vous pouvez définir un <strong>Auto Cashout</strong> pour sécuriser vos gains automatiquement.</li>
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

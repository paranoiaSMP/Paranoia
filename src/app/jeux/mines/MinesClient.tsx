"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Coins, 
  Volume2, 
  VolumeX, 
  Bomb, 
  Sparkles, 
  CheckCircle2, 
  Flame, 
  RotateCcw,
  ShieldCheck
} from "lucide-react";
import toast from "react-hot-toast";

interface MinesClientProps {
  initialCoins: number;
  isAuthenticated: boolean;
}

const QUICK_BETS = [10, 50, 100, 250, 500, 1000];
const QUICK_MINES = [1, 3, 5, 10, 15, 20, 24];

export default function MinesClient({ initialCoins, isAuthenticated }: MinesClientProps) {
  const [coins, setCoins] = useState(initialCoins);
  const [bet, setBet] = useState(50);
  const [minesCount, setMinesCount] = useState(3);
  const [gameStatus, setGameStatus] = useState<"idle" | "playing" | "cashed_out" | "busted">("idle");
  const [token, setToken] = useState<string | null>(null);
  const [revealedTiles, setRevealedTiles] = useState<number[]>([]);
  const [minePositions, setMinePositions] = useState<number[]>([]);
  const [hitTile, setHitTile] = useState<number | null>(null);
  const [currentMultiplier, setCurrentMultiplier] = useState(1.00);
  const [nextMultiplier, setNextMultiplier] = useState(1.10);
  const [currentPayout, setCurrentPayout] = useState(50);
  const [isLoading, setIsLoading] = useState(false);
  const [revealingIndex, setRevealingIndex] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const audioCtxRef = useRef<AudioContext | null>(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) audioCtxRef.current = new AudioCtx();
    }
  };

  const playGemSound = () => {
    if (!soundEnabled) return;
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    try {
      const step = revealedTiles.length;
      const baseFreq = 520 + Math.min(step * 60, 800);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } catch {}
  };

  const playExplosionSound = () => {
    if (!soundEnabled) return;
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    try {
      const bufferSize = ctx.sampleRate * 0.4;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(800, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.38);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.38);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      whiteNoise.start();
    } catch {}
  };

  const playWinSound = () => {
    if (!soundEnabled) return;
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    try {
      [440, 554.37, 659.25, 880].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

        gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.32);
      });
    } catch {}
  };

  const handleStart = async () => {
    if (!isAuthenticated) {
      toast.error("Veuillez vous connecter pour jouer.");
      return;
    }
    if (bet > coins) {
      toast.error("Solde insuffisant.");
      return;
    }

    setIsLoading(true);
    setHitTile(null);
    setMinePositions([]);
    setRevealedTiles([]);

    try {
      const res = await fetch("/api/games/mines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", bet, minesCount }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erreur de démarrage");
        setIsLoading(false);
        return;
      }

      setCoins(data.paraCoins);
      setToken(data.token);
      setCurrentMultiplier(data.currentMultiplier);
      setNextMultiplier(data.nextMultiplier);
      setCurrentPayout(data.currentPayout);
      setGameStatus("playing");
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReveal = async (index: number) => {
    if (gameStatus !== "playing" || isLoading || revealedTiles.includes(index)) return;

    setRevealingIndex(index);
    try {
      const res = await fetch("/api/games/mines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reveal", token, tileIndex: index }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erreur");
        return;
      }

      if (data.status === "busted") {
        setHitTile(data.hitTile);
        setMinePositions(data.minePositions);
        setGameStatus("busted");
        playExplosionSound();
        toast.error("BOOM ! Une bombe a explosé.");
      } else if (data.status === "cashed_out") {
        setRevealedTiles(data.revealedTiles);
        setMinePositions(data.minePositions);
        setCurrentMultiplier(data.multiplier);
        setCurrentPayout(data.payout);
        setCoins(data.paraCoins);
        setGameStatus("cashed_out");
        playWinSound();
        toast.success(`Grille terminée ! + ${data.payout} PC !`);
      } else {
        setRevealedTiles(data.revealedTiles);
        setToken(data.token);
        setCurrentMultiplier(data.currentMultiplier);
        setNextMultiplier(data.nextMultiplier);
        setCurrentPayout(data.currentPayout);
        playGemSound();
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setRevealingIndex(null);
    }
  };

  const handleCashout = async () => {
    if (gameStatus !== "playing" || isLoading || revealedTiles.length === 0) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/games/mines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cashout", token }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erreur d'encaissement");
        setIsLoading(false);
        return;
      }

      setCoins(data.paraCoins);
      setMinePositions(data.minePositions);
      setCurrentMultiplier(data.multiplier);
      setCurrentPayout(data.payout);
      setGameStatus("cashed_out");
      playWinSound();
      toast.success(`Encaissé : +${data.payout} PC (${data.multiplier}×) !`);
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-[var(--text-color)] pt-4 pb-20 px-2 sm:px-6 max-w-6xl mx-auto space-y-6">
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
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-5 rounded-2xl border-2 border-[var(--card-border)] bg-[var(--surface-bg)] p-5 shadow-2xl flex flex-col justify-between">
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                  <Bomb className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-outfit font-black text-base text-white">MINES 5×5</h2>
                  <p className="text-[11px] text-[var(--nav-item-color)]">Évitez la TNT, trouvez les émeraudes</p>
                </div>
              </div>
              <div className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] font-bold">
                PROVABLY FAIR
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--nav-item-color)]">Mise en ParaCoins</label>
              <div className="relative flex items-center rounded-xl bg-black/40 border-2 border-[var(--card-border)] focus-within:border-purple-500 transition-colors">
                <input
                  type="number"
                  min={10}
                  max={5000}
                  step={10}
                  value={bet}
                  disabled={gameStatus === "playing"}
                  onChange={(e) => setBet(Math.max(10, Math.min(5000, parseInt(e.target.value) || 10)))}
                  className="w-full bg-transparent px-3 py-2 text-sm font-black font-mono text-purple-300 focus:outline-none disabled:opacity-50"
                />
                <span className="pr-3 text-xs font-bold text-[var(--nav-item-color)]">PC</span>
              </div>

              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {QUICK_BETS.slice(0, 4).map((amt) => (
                  <button
                    key={amt}
                    disabled={gameStatus === "playing"}
                    onClick={() => setBet(amt)}
                    className="px-2 py-1 text-xs font-mono font-bold rounded-lg border border-[var(--card-border)] bg-black/30 hover:bg-white/5 text-[var(--nav-item-color)] hover:text-white transition-colors disabled:opacity-40"
                  >
                    {amt}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  disabled={gameStatus === "playing"}
                  onClick={() => setBet((b) => Math.max(10, Math.floor(b / 2)))}
                  className="px-2 py-1 text-xs font-bold rounded-lg border border-[var(--card-border)] bg-black/30 hover:bg-white/5 text-[var(--nav-item-color)] disabled:opacity-40"
                >
                  ½
                </button>
                <button
                  disabled={gameStatus === "playing"}
                  onClick={() => setBet((b) => Math.min(5000, Math.min(coins, b * 2)))}
                  className="px-2 py-1 text-xs font-bold rounded-lg border border-[var(--card-border)] bg-black/30 hover:bg-white/5 text-[var(--nav-item-color)] disabled:opacity-40"
                >
                  2×
                </button>
                <button
                  disabled={gameStatus === "playing"}
                  onClick={() => setBet(Math.min(5000, coins))}
                  className="px-2 py-1 text-xs font-bold rounded-lg border border-purple-500/30 bg-purple-950/30 hover:bg-purple-900/40 text-purple-300 disabled:opacity-40"
                >
                  Max
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[var(--nav-item-color)]">Nombre de Mines</label>
                <span className="text-xs font-mono font-black text-red-400">{minesCount} TNT</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={1}
                  max={24}
                  value={minesCount}
                  disabled={gameStatus === "playing"}
                  onChange={(e) => setMinesCount(parseInt(e.target.value))}
                  className="w-full accent-red-500 cursor-pointer disabled:opacity-50"
                />
              </div>

              <div className="flex items-center gap-1 flex-wrap pt-1">
                {QUICK_MINES.map((m) => (
                  <button
                    key={m}
                    disabled={gameStatus === "playing"}
                    onClick={() => setMinesCount(m)}
                    className={`px-2 py-1 text-xs font-mono font-bold rounded-lg border transition-all ${
                      minesCount === m
                        ? 'bg-red-600/30 border-red-500 text-white shadow-sm'
                        : 'bg-black/30 border-[var(--card-border)] text-[var(--nav-item-color)] hover:text-white'
                    } disabled:opacity-40`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 space-y-3">
            {gameStatus === "playing" ? (
              <div className="space-y-3">
                <div className="bg-black/50 border-2 border-emerald-500/30 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-[var(--nav-item-color)] block">Multiplicateur</span>
                    <span className="text-xl font-black font-mono text-emerald-400">{currentMultiplier.toFixed(2)}×</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] uppercase tracking-wider text-[var(--nav-item-color)] block">Suivant</span>
                    <span className="text-xs font-black font-mono text-emerald-300/70">{nextMultiplier.toFixed(2)}×</span>
                  </div>
                </div>

                <button
                  onClick={handleCashout}
                  disabled={isLoading || revealedTiles.length === 0}
                  className="w-full py-3.5 rounded-xl font-outfit font-black uppercase tracking-wider text-base bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black border border-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.5)] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {revealedTiles.length === 0 ? "Cliquez sur une case" : `Encaisser ${currentPayout} PC`}
                </button>
              </div>
            ) : (
              <button
                onClick={handleStart}
                disabled={isLoading || bet > coins || bet < 10}
                className="w-full py-3.5 rounded-xl font-outfit font-black uppercase tracking-wider text-base bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border border-purple-400/30 shadow-[0_0_20px_rgba(168,85,247,0.4)] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? "Préparation..." : "Lancer la partie"}
              </button>
            )}

            <div className="flex items-center justify-between text-[11px] text-[var(--nav-item-color)] px-1">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Avantage maison : 3%
              </span>
              <span>25 cases • 5×5</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 rounded-2xl border-2 border-[var(--card-border)] bg-[var(--surface-bg)] p-4 sm:p-6 shadow-2xl flex flex-col justify-center items-center relative overflow-hidden min-h-[440px]">
          {gameStatus === "cashed_out" && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black text-xs animate-bounce shadow-lg">
              <CheckCircle2 className="w-4 h-4" />
              <span>Gagné : +{currentPayout} PC ({currentMultiplier.toFixed(2)}×)</span>
            </div>
          )}

          {gameStatus === "busted" && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 font-black text-xs shadow-lg">
              <Flame className="w-4 h-4 text-red-400" />
              <span>Partie terminée - Bombe explosée</span>
            </div>
          )}

          <div className="grid grid-cols-5 gap-2.5 sm:gap-3.5 w-full max-w-[480px] aspect-square p-2">
            {Array.from({ length: 25 }, (_, i) => {
              const isRevealed = revealedTiles.includes(i);
              const isHit = hitTile === i;
              const isMine = minePositions.includes(i);
              const isGameOver = gameStatus === "cashed_out" || gameStatus === "busted";

              let content = null;
              let tileClass = "bg-[#14141e] border-[#2b2b3d] hover:border-purple-500/60 hover:bg-[#1a1a28]";

              if (isRevealed) {
                tileClass = "bg-gradient-to-b from-emerald-900/60 to-[#0b2416] border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]";
                content = (
                  <div className="flex flex-col items-center justify-center animate-in zoom-in-75 duration-200">
                    <img src="/Emerald.png" alt="Émeraude" className="w-8 h-8 sm:w-10 sm:h-10 object-contain drop-shadow-[0_2px_8px_rgba(16,185,129,0.6)]" />
                  </div>
                );
              } else if (isHit) {
                tileClass = "bg-gradient-to-b from-red-600 to-red-800 border-red-300 shadow-[0_0_20px_rgba(239,68,68,0.8)] animate-pulse";
                content = (
                  <div className="flex flex-col items-center justify-center animate-in zoom-in-90 duration-150">
                    <Bomb className="w-8 h-8 sm:w-10 sm:h-10 text-white drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]" />
                  </div>
                );
              } else if (isGameOver && isMine) {
                tileClass = "bg-red-950/40 border-red-800/40 opacity-50";
                content = (
                  <div className="flex flex-col items-center justify-center">
                    <Bomb className="w-6 h-6 sm:w-7 sm:h-7 text-red-400/70" />
                  </div>
                );
              } else if (isGameOver && !isMine) {
                tileClass = "bg-[#121b16]/60 border-emerald-900/40 opacity-40";
                content = (
                  <div className="flex flex-col items-center justify-center">
                    <img src="/Emerald.png" alt="Émeraude" className="w-6 h-6 sm:w-7 sm:h-7 object-contain opacity-50" />
                  </div>
                );
              } else {
                tileClass = `bg-[#161622] border-[#2c2c40] shadow-inner ${
                  gameStatus === 'playing' ? 'hover:border-purple-400 hover:bg-[#1f1f30] cursor-pointer active:scale-95' : 'cursor-default'
                }`;
              }

              return (
                <button
                  key={i}
                  disabled={gameStatus !== "playing" || isRevealed || isLoading}
                  onClick={() => handleReveal(i)}
                  className={`w-full aspect-square rounded-xl border-2 flex items-center justify-center transition-all select-none ${tileClass}`}
                >
                  {content}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

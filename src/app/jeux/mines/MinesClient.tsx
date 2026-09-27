"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Coins, Volume2, VolumeX, Bomb } from "lucide-react";
import toast from "react-hot-toast";

interface MinesClientProps {
  initialCoins: number;
  isAuthenticated: boolean;
}

const QUICK_BETS = [10, 50, 100, 250, 500, 1000];
const QUICK_MINES = [1, 3, 5, 10, 20];

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
  const [soundEnabled, setSoundEnabled] = useState(true);

  const audioCtxRef = useRef<AudioContext | null>(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) audioCtxRef.current = new AudioCtx();
    }
  };

  const playTileSound = () => {
    if (!soundEnabled) return;
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    try {
      const step = revealedTiles.length;
      const freq = 400 + Math.min(step * 50, 600);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.3, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch {}
  };

  const playBombSound = () => {
    if (!soundEnabled) return;
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.25);

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.28);
    } catch {}
  };

  const playCashoutSound = () => {
    if (!soundEnabled) return;
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    try {
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.06);

        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.06);
        gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + i * 0.06 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.06);
        osc.stop(ctx.currentTime + i * 0.06 + 0.22);
      });
    } catch {}
  };

  const handleStart = async () => {
    if (!isAuthenticated) {
      toast.error("Connexion requise pour jouer.");
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
        toast.error(data.error || "Erreur");
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
        playBombSound();
      } else if (data.status === "cashed_out") {
        setRevealedTiles(data.revealedTiles);
        setMinePositions(data.minePositions);
        setCurrentMultiplier(data.multiplier);
        setCurrentPayout(data.payout);
        setCoins(data.paraCoins);
        setGameStatus("cashed_out");
        playCashoutSound();
        toast.success(`+${data.payout} PC (${data.multiplier.toFixed(2)}×)`);
      } else {
        setRevealedTiles(data.revealedTiles);
        setToken(data.token);
        setCurrentMultiplier(data.currentMultiplier);
        setNextMultiplier(data.nextMultiplier);
        setCurrentPayout(data.currentPayout);
        playTileSound();
      }
    } catch {
      toast.error("Erreur réseau");
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
        toast.error(data.error || "Erreur");
        setIsLoading(false);
        return;
      }

      setCoins(data.paraCoins);
      setMinePositions(data.minePositions);
      setCurrentMultiplier(data.multiplier);
      setCurrentPayout(data.payout);
      setGameStatus("cashed_out");
      playCashoutSound();
      toast.success(`+${data.payout} PC (${data.multiplier.toFixed(2)}×)`);
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-[var(--text-color)] pt-4 pb-20 px-3 sm:px-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/jeux"
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--nav-item-color)] hover:text-white transition-colors bg-[var(--surface-bg)] hover:bg-white/5 px-3.5 py-2 rounded-xl border border-[var(--card-border)]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Salle des jeux</span>
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[var(--surface-bg)] border border-[var(--card-border)] px-3.5 py-1.5 rounded-xl">
            <Coins className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-mono font-bold text-white">
              {coins.toLocaleString("fr-FR")} <span className="text-[var(--nav-item-color)] text-xs">PC</span>
            </span>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="w-9 h-9 rounded-xl bg-[var(--surface-bg)] border border-[var(--card-border)] flex items-center justify-center text-[var(--nav-item-color)] hover:text-white transition-colors cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-4 rounded-2xl border border-[var(--card-border)] bg-[var(--surface-bg)] p-5 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[var(--nav-item-color)]">Mise</label>
            <div className="flex items-center rounded-xl bg-black/40 border border-[var(--card-border)] focus-within:border-purple-500/70 transition-colors px-3 py-2">
              <input
                type="number"
                min={10}
                max={5000}
                step={10}
                value={bet}
                disabled={gameStatus === "playing"}
                onChange={(e) => setBet(Math.max(10, Math.min(5000, parseInt(e.target.value) || 10)))}
                className="w-full bg-transparent text-sm font-mono font-bold text-white focus:outline-none disabled:opacity-50"
              />
              <span className="text-xs font-mono text-zinc-400">PC</span>
            </div>

            <div className="grid grid-cols-4 gap-1 pt-1">
              {QUICK_BETS.slice(0, 4).map((amt) => (
                <button
                  key={amt}
                  disabled={gameStatus === "playing"}
                  onClick={() => setBet(amt)}
                  className="py-1 text-xs font-mono font-semibold rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 text-zinc-300 transition-colors disabled:opacity-40 cursor-pointer"
                >
                  {amt}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-1">
              <button
                disabled={gameStatus === "playing"}
                onClick={() => setBet((b) => Math.max(10, Math.floor(b / 2)))}
                className="py-1 text-xs font-semibold rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 text-zinc-300 disabled:opacity-40 cursor-pointer"
              >
                ½
              </button>
              <button
                disabled={gameStatus === "playing"}
                onClick={() => setBet((b) => Math.min(5000, Math.min(coins, b * 2)))}
                className="py-1 text-xs font-semibold rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 text-zinc-300 disabled:opacity-40 cursor-pointer"
              >
                2×
              </button>
              <button
                disabled={gameStatus === "playing"}
                onClick={() => setBet(Math.min(5000, coins))}
                className="py-1 text-xs font-semibold rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 disabled:opacity-40 cursor-pointer"
              >
                Max
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-[var(--nav-item-color)]">Mines</span>
              <span className="font-mono text-zinc-300">{minesCount} TNT</span>
            </div>

            <select
              value={minesCount}
              disabled={gameStatus === "playing"}
              onChange={(e) => setMinesCount(parseInt(e.target.value))}
              className="w-full py-2 px-3 rounded-xl bg-black/40 border border-[var(--card-border)] text-sm font-mono font-bold text-white focus:outline-none disabled:opacity-50 cursor-pointer"
            >
              {Array.from({ length: 24 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m} className="bg-[#12131a] text-white">
                  {m} {m === 1 ? "mine" : "mines"}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-5 gap-1 pt-1">
              {QUICK_MINES.map((m) => (
                <button
                  key={m}
                  disabled={gameStatus === "playing"}
                  onClick={() => setMinesCount(m)}
                  className={`py-1 text-xs font-mono font-semibold rounded-lg border transition-colors cursor-pointer ${
                    minesCount === m
                      ? 'bg-purple-600/30 border-purple-500 text-white'
                      : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/5 text-zinc-400'
                  } disabled:opacity-40`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            {gameStatus === "playing" ? (
              <div className="space-y-3">
                <div className="bg-black/30 border border-white/5 rounded-xl p-3 flex items-center justify-between font-mono">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 block">Gain actuel</span>
                    <span className="text-lg font-bold text-emerald-400">{currentPayout} PC</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 block">Cote</span>
                    <span className="text-sm font-bold text-zinc-300">{currentMultiplier.toFixed(2)}×</span>
                  </div>
                </div>

                <button
                  onClick={handleCashout}
                  disabled={isLoading || revealedTiles.length === 0}
                  className="w-full py-3 rounded-xl font-bold uppercase tracking-wider text-sm bg-emerald-500 hover:bg-emerald-400 text-black shadow-md active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {revealedTiles.length === 0 ? "Ouvrir une case" : `Encaisser ${currentPayout} PC`}
                </button>
              </div>
            ) : (
              <button
                onClick={handleStart}
                disabled={isLoading || bet > coins || bet < 10}
                className="w-full py-3 rounded-xl font-bold uppercase tracking-wider text-sm bg-purple-600 hover:bg-purple-500 text-white active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? "Chargement..." : "Parier"}
              </button>
            )}
          </div>
        </div>

        <div className="lg:col-span-8 rounded-2xl border border-[var(--card-border)] bg-[#0b0c11] p-5 sm:p-8 flex flex-col items-center justify-center min-h-[440px]">
          <div className="grid grid-cols-5 gap-2.5 sm:gap-3 w-full max-w-[420px] aspect-square">
            {Array.from({ length: 25 }, (_, i) => {
              const isRevealed = revealedTiles.includes(i);
              const isHit = hitTile === i;
              const isMine = minePositions.includes(i);
              const isGameOver = gameStatus === "cashed_out" || gameStatus === "busted";

              let content = null;
              let tileClass = "bg-[#181a24] hover:bg-[#202331] border-[#252838]";

              if (isRevealed) {
                tileClass = "bg-[#14121d] border-purple-500/50";
                content = (
                  <img
                    src="/netherite.png"
                    alt="Netherite"
                    className="w-8 h-8 sm:w-9 sm:h-9 object-contain"
                  />
                );
              } else if (isHit) {
                tileClass = "bg-[#2d1216] border-red-500";
                content = (
                  <Bomb className="w-7 h-7 text-red-400" />
                );
              } else if (isGameOver && isMine) {
                tileClass = "bg-[#1a1215] border-red-950 opacity-40";
                content = (
                  <Bomb className="w-6 h-6 text-red-400" />
                );
              } else if (isGameOver && !isMine) {
                tileClass = "bg-[#14121d] border-purple-950 opacity-30";
                content = (
                  <img
                    src="/netherite.png"
                    alt="Netherite"
                    className="w-6 h-6 object-contain"
                  />
                );
              }

              return (
                <button
                  key={i}
                  disabled={gameStatus !== "playing" || isRevealed || isLoading}
                  onClick={() => handleReveal(i)}
                  className={`w-full aspect-square rounded-xl border flex items-center justify-center select-none transition-all ${tileClass} ${
                    gameStatus === 'playing' && !isRevealed ? 'cursor-pointer active:scale-95' : 'cursor-default'
                  }`}
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

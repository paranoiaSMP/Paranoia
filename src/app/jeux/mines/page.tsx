"use client";

import { useEffect, useState } from "react";
import { motion, useAnimationControls, useReducedMotion } from "framer-motion";
import toast from "react-hot-toast";
import GameShell from "@/features/games/GameShell";
import BetInput from "@/features/games/BetInput";
import { fmt, useBalance } from "@/features/games/useBalance";
import { EASE_OUT } from "@/lib/motion";

type Phase = "idle" | "playing" | "over";
type Saved = { token: string; bet: number; mines: number; revealed: number[]; cur: number; next: number; payout: number };

const KEY = "ps-mines-game";

function Gem() {
  return (
    <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" aria-hidden>
      <path d="M12 2 21 9 12 22 3 9Z" fill="var(--color-accent-purple-soft)" />
      <path d="M12 2 16 9 12 22 8 9Z" fill="var(--color-violet-300)" />
      <path d="M3 9h18" stroke="var(--color-accent-purple)" strokeWidth="1" />
    </svg>
  );
}

function Mine() {
  return (
    <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" aria-hidden>
      <circle cx="12" cy="13" r="7" fill="#fafafa" />
      <path d="M12 2v4M4 13H2M22 13h-2M5.6 6.6 7 8M18.4 6.6 17 8" stroke="#fafafa" strokeWidth="2" strokeLinecap="round" />
      <circle cx="9.5" cy="10.5" r="1.6" fill="#000" opacity=".5" />
    </svg>
  );
}

export default function MinesPage() {
  const wallet = useBalance();
  const reduce = useReducedMotion();
  const grid = useAnimationControls();

  const [phase, setPhase] = useState<Phase>("idle");
  const [bet, setBet] = useState(100);
  const [mines, setMines] = useState(3);
  const [token, setToken] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [minePositions, setMinePositions] = useState<number[]>([]);
  const [hit, setHit] = useState<number | null>(null);
  const [cur, setCur] = useState(1);
  const [next, setNext] = useState(1);
  const [payout, setPayout] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ won: boolean; amount: number; mult?: number } | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return;
    const t = setTimeout(() => {
      try {
        const s: Saved = JSON.parse(raw);
        setToken(s.token);
        setBet(s.bet);
        setMines(s.mines);
        setRevealed(s.revealed);
        setCur(s.cur);
        setNext(s.next);
        setPayout(s.payout);
        setPhase("playing");
      } catch {
        sessionStorage.removeItem(KEY);
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase === "playing" && token) {
      const s: Saved = { token, bet, mines, revealed, cur, next, payout };
      sessionStorage.setItem(KEY, JSON.stringify(s));
    } else if (phase !== "playing") {
      sessionStorage.removeItem(KEY);
    }
  }, [phase, token, bet, mines, revealed, cur, next, payout]);

  const call = async (body: object) => {
    const res = await fetch("/api/games/mines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (data.token) setToken(data.token);
      throw new Error(data.error ?? "Erreur du serveur.");
    }
    return data;
  };

  const start = async () => {
    setBusy(true);
    try {
      const d = await call({ action: "start", bet, minesCount: mines });
      setToken(d.token);
      setRevealed([]);
      setMinePositions([]);
      setHit(null);
      setCur(1);
      setNext(d.nextMultiplier);
      setPayout(d.currentPayout);
      setResult(null);
      setPhase("playing");
      wallet.set(d.paraCoins);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const reveal = async (i: number) => {
    if (phase !== "playing" || busy || revealed.includes(i)) return;
    setBusy(true);
    try {
      const d = await call({ action: "reveal", token, tileIndex: i });
      if (d.status === "busted") {
        setHit(i);
        setMinePositions(d.minePositions);
        setRevealed(d.revealedTiles);
        setPhase("over");
        setToken(null);
        setResult({ won: false, amount: bet });
        if (!reduce) {
          grid.start({
            transform: ["translateX(0px)", "translateX(-10px)", "translateX(8px)", "translateX(-5px)", "translateX(0px)"],
            transition: { duration: 0.35, ease: EASE_OUT },
          });
        }
      } else if (d.status === "cashed_out") {
        setRevealed(d.revealedTiles);
        setMinePositions(d.minePositions);
        setPhase("over");
        setToken(null);
        setResult({ won: true, amount: d.payout, mult: d.multiplier });
        wallet.set(d.paraCoins);
      } else {
        setToken(d.token);
        setRevealed(d.revealedTiles);
        setCur(d.currentMultiplier);
        setNext(d.nextMultiplier);
        setPayout(d.currentPayout);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const cashout = async () => {
    setBusy(true);
    try {
      const d = await call({ action: "cashout", token });
      setMinePositions(d.minePositions);
      setRevealed(d.revealedTiles);
      setPhase("over");
      setToken(null);
      setResult({ won: true, amount: d.payout, mult: d.multiplier });
      wallet.set(d.paraCoins);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const playing = phase === "playing";

  return (
    <GameShell
      title="Mines"
      rules="25 cases, des mines cachées. Chaque case sûre fait monter le multiplicateur. Encaisse avant de tomber sur une mine."
      wallet={wallet}
    >
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-4">
          <BetInput value={bet} onChange={setBet} max={5000} balance={wallet.coins} disabled={playing || busy} />

          <div className="flex flex-col gap-2">
            <label htmlFor="mines" className="flex justify-between text-sm text-zinc-300">
              Mines
              <span className="tabular-nums text-white">{mines}</span>
            </label>
            <input
              id="mines"
              type="range"
              min={1}
              max={24}
              value={mines}
              disabled={playing || busy}
              onChange={(e) => setMines(Number(e.target.value))}
              className="h-11 w-full accent-violet-500 disabled:opacity-50"
            />
            <div className="flex gap-2">
              {[1, 3, 5, 10, 24].map((m) => (
                <button
                  key={m}
                  type="button"
                  disabled={playing || busy}
                  onClick={() => setMines(m)}
                  className={`press min-h-11 flex-1 rounded-md border text-sm font-medium disabled:opacity-40 ${
                    mines === m ? "border-violet-400 text-white" : "border-zinc-800 text-zinc-300 hover:border-white"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {playing ? (
            <div className="flex flex-col gap-3">
              <dl className="grid grid-cols-2 gap-4 rounded-md border border-zinc-900 p-4">
                <div>
                  <dt className="text-sm text-zinc-400">Multiplicateur</dt>
                  <dd className="text-2xl font-bold tabular-nums text-white">×{cur.toFixed(2)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-zinc-400">Prochaine case</dt>
                  <dd className="text-2xl font-bold tabular-nums text-violet-400">×{next.toFixed(2)}</dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={cashout}
                disabled={busy || revealed.length === 0}
                className="btn-solid disabled:opacity-40"
              >
                {revealed.length === 0 ? "Découvre une case" : `Encaisser ${fmt(payout)} PC`}
              </button>
            </div>
          ) : (
            <button type="button" onClick={start} disabled={busy || wallet.coins === null} className="btn-violet disabled:opacity-50">
              {busy ? "…" : `Jouer ${fmt(bet)} PC`}
            </button>
          )}

          <div aria-live="polite" className="min-h-16">
            {result && (
              <motion.p
                key={`${result.won}-${result.amount}`}
                initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(8px)" }}
                animate={{ opacity: 1, transform: "translateY(0px)" }}
                transition={{ duration: 0.3, ease: EASE_OUT }}
                className={`text-2xl font-bold ${result.won ? "text-violet-400" : "text-red-400"}`}
              >
                {result.won ? `+${fmt(result.amount)} PC (×${result.mult?.toFixed(2)})` : `Mine ! −${fmt(result.amount)} PC`}
              </motion.p>
            )}
          </div>
        </div>

        <motion.div animate={grid} className="lg:col-span-8">
          <div role="grid" aria-label="Grille de mines" className="mx-auto grid max-w-[34rem] grid-cols-5 gap-2 sm:gap-3">
            {Array.from({ length: 25 }, (_, i) => {
              const isRevealed = revealed.includes(i);
              const isMine = minePositions.includes(i);
              const shown = isRevealed || (phase === "over" && minePositions.length > 0);
              const isHit = hit === i;
              return (
                <button
                  key={i}
                  type="button"
                  role="gridcell"
                  onClick={() => reveal(i)}
                  disabled={!playing || busy || isRevealed}
                  aria-label={shown ? (isMine ? `Case ${i + 1} : mine` : `Case ${i + 1} : sûre`) : `Case ${i + 1}`}
                  className={`relative aspect-square rounded-md border transition-[transform,background-color,border-color] duration-150 ease-out ${
                    shown
                      ? isHit
                        ? "border-red-500 bg-red-600"
                        : isRevealed
                        ? "border-violet-500/60 bg-violet-950/60"
                        : "border-zinc-900 bg-zinc-950"
                      : "border-zinc-500 bg-zinc-900 enabled:cursor-pointer enabled:active:scale-95 [@media(hover:hover)_and_(pointer:fine)]:enabled:hover:-translate-y-1 [@media(hover:hover)_and_(pointer:fine)]:enabled:hover:border-white"
                  }`}
                >
                  {shown && (
                    <motion.span
                      className="absolute inset-0 flex items-center justify-center"
                      initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "scale(0.6) rotate(-12deg)" }}
                      animate={{ opacity: !isRevealed && !isHit ? 0.4 : 1, transform: "scale(1) rotate(0deg)" }}
                      transition={
                        reduce
                          ? { duration: 0.15 }
                          : { type: "spring", bounce: 0.35, duration: 0.45, delay: isRevealed || isHit ? 0 : 0.15 + (i % 5) * 0.03 }
                      }
                    >
                      {isMine ? <Mine /> : <Gem />}
                    </motion.span>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>
      </div>
    </GameShell>
  );
}

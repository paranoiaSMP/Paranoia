"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import toast from "react-hot-toast";
import GameShell from "@/features/games/GameShell";
import BetInput from "@/features/games/BetInput";
import { fmt, useBalance } from "@/features/games/useBalance";
import { EASE_OUT } from "@/lib/motion";

type Phase = "BETTING" | "FLYING" | "CRASHED";
type Player = { userId: string; name: string; bet: number; cashedOut: boolean; cashoutMultiplier?: number; payout?: number };
type State = {
  roundId: string;
  phase: Phase;
  countdown: number;
  multiplier: number;
  startedAt: number | null;
  crashPoint: number | null;
  players: Player[];
  history: number[];
};

const RATE = 0.075;
const multAt = (seconds: number) => Math.max(1, Math.floor(Math.exp(RATE * seconds) * 100) / 100);

const W = 600;
const H = 300;

export default function CrashPage() {
  const wallet = useBalance();
  const authed = wallet.status === "authenticated";
  const { data: session } = useSession();
  const me = session?.user?.id;
  const reduce = useReducedMotion();

  const [state, setState] = useState<State | null>(null);
  const [connected, setConnected] = useState(false);
  const [bet, setBet] = useState(100);
  const [busy, setBusy] = useState(false);

  const flightStart = useRef<number | null>(null);
  const multRef = useRef<HTMLSpanElement>(null);
  const cashRef = useRef<HTMLSpanElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const es = new EventSource("/api/games/crash/events");
    const full = (e: MessageEvent) => {
      const s: State = JSON.parse(e.data);
      setState(s);
      if (s.phase === "FLYING" && s.startedAt) {
        flightStart.current = performance.now() - Math.max(0, Date.now() - s.startedAt);
      }
    };
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.addEventListener("INIT", full);
    es.addEventListener("PHASE_CHANGE", full);
    es.addEventListener("TICK", (e) => {
      const { countdown } = JSON.parse((e as MessageEvent).data);
      setState((s) => (s ? { ...s, countdown } : s));
    });
    es.addEventListener("BET_PLACED", (e) => {
      const p: Player = JSON.parse((e as MessageEvent).data);
      setState((s) => (s ? { ...s, players: [...s.players.filter((x) => x.userId !== p.userId), p] } : s));
    });
    es.addEventListener("PLAYER_CASHOUT", (e) => {
      const c = JSON.parse((e as MessageEvent).data);
      setState((s) =>
        s
          ? {
              ...s,
              players: s.players.map((p) =>
                p.userId === c.userId ? { ...p, cashedOut: true, cashoutMultiplier: c.multiplier, payout: c.payout } : p
              ),
            }
          : s
      );
    });
    es.addEventListener("CRASHED", (e) => {
      const c = JSON.parse((e as MessageEvent).data);
      flightStart.current = null;
      setState((s) => (s ? { ...s, phase: "CRASHED", crashPoint: c.crashPoint, multiplier: c.crashPoint, history: c.history } : s));
    });
    return () => es.close();
  }, []);

  const phase = state?.phase;
  const mine = state?.players.find((p) => p.userId === me);

  const draw = useCallback(
    (seconds: number, m: number) => {
      const xMax = Math.max(8, seconds * 1.15);
      const yMax = Math.max(2, m * 1.2);
      const pts: string[] = [];
      const steps = 60;
      for (let i = 0; i <= steps; i++) {
        const t = (seconds * i) / steps;
        const x = (t / xMax) * W;
        const y = H - ((Math.exp(RATE * t) - 1) / (yMax - 1)) * H;
        pts.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`);
      }
      pathRef.current?.setAttribute("d", pts.join(" "));
      const ex = (seconds / xMax) * W;
      const ey = H - ((Math.exp(RATE * seconds) - 1) / (yMax - 1)) * H;
      dotRef.current?.setAttribute("cx", ex.toFixed(1));
      dotRef.current?.setAttribute("cy", ey.toFixed(1));
      if (multRef.current) multRef.current.textContent = `×${m.toFixed(2)}`;
      if (cashRef.current && mine) cashRef.current.textContent = `${fmt(Math.floor(mine.bet * m))} PC`;
    },
    [mine]
  );

  useEffect(() => {
    if (phase !== "FLYING") return;
    let raf = 0;
    const loop = () => {
      if (flightStart.current !== null) {
        const sec = (performance.now() - flightStart.current) / 1000;
        draw(sec, multAt(sec));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, draw]);

  const post = async (body: object) => {
    setBusy(true);
    try {
      const res = await fetch("/api/games/crash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Erreur du serveur.");
      if (typeof d.paraCoins === "number") wallet.set(d.paraCoins);
      if (d.payout) toast.success(`+${fmt(d.payout)} PC à ×${d.multiplier.toFixed(2)}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const canBet = authed && phase === "BETTING" && !mine && (state?.countdown ?? 0) > 0.3;
  const canCash = phase === "FLYING" && mine && !mine.cashedOut;

  return (
    <GameShell
      title="Crash"
      rules="Mise pendant le compte à rebours. Le multiplicateur grimpe jusqu'au crash : encaisse avant, ou tu perds ta mise."
      wallet={wallet}
      spectate
    >
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-4">
          <BetInput value={bet} onChange={setBet} max={50000} balance={wallet.coins} disabled={!canBet || busy} />
          {canCash ? (
            <button type="button" onClick={() => post({ action: "cashout" })} disabled={busy} className="btn-solid min-h-14 text-base">
              Encaisser <span ref={cashRef} className="ml-2 tabular-nums" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => post({ action: "bet", bet })}
              disabled={!canBet || busy || wallet.coins === null}
              className="btn-violet min-h-14 text-base disabled:opacity-50"
            >
              {mine
                ? mine.cashedOut
                  ? `Encaissé à ×${mine.cashoutMultiplier?.toFixed(2)}`
                  : phase === "CRASHED"
                  ? "Perdu cette manche"
                  : `Mise placée : ${fmt(mine.bet)} PC`
                : phase === "BETTING"
                ? `Miser ${fmt(bet)} PC`
                : "Attends la prochaine manche"}
            </button>
          )}

          <div>
            <p className="mb-3 text-sm text-zinc-400">Joueurs de la manche</p>
            {!state || state.players.length === 0 ? (
              <p className="text-sm text-zinc-400">Personne pour l&apos;instant.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-zinc-900 text-sm">
                {state.players.map((p) => (
                  <li key={p.userId} className="flex min-h-10 items-center justify-between gap-3">
                    <span className={`truncate ${p.userId === me ? "font-semibold text-white" : "text-zinc-300"}`}>{p.name}</span>
                    <span className="shrink-0 tabular-nums text-zinc-400">{fmt(p.bet)} PC</span>
                    <span className={`w-20 shrink-0 text-right tabular-nums ${p.cashedOut ? "text-violet-400" : "text-zinc-400"}`}>
                      {p.cashedOut ? `×${p.cashoutMultiplier?.toFixed(2)}` : "-"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="mb-4 flex min-h-8 flex-wrap gap-2" aria-label="Derniers crashs">
            {(state?.history ?? []).map((h, i) => (
              <span
                key={`${state?.roundId}-${i}`}
                className={`rounded-sm px-2 py-1 text-xs font-semibold tabular-nums ${h >= 2 ? "bg-violet-950 text-violet-300" : "bg-zinc-900 text-zinc-300"}`}
              >
                ×{h.toFixed(2)}
              </span>
            ))}
          </div>

          <div className="relative aspect-[2/1] overflow-hidden rounded-md border border-zinc-900 bg-[#0b0b0d]">
            {phase === "FLYING" && (
              <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
                <path ref={pathRef} fill="none" stroke="var(--color-accent-purple-soft)" strokeWidth="3" vectorEffect="non-scaling-stroke" />
                <circle ref={dotRef} r="6" fill="#fafafa" />
              </svg>
            )}

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center" aria-live="polite">
              {!state && <p className="text-zinc-400">{connected ? "Chargement…" : "Connexion à la partie…"}</p>}

              {phase === "BETTING" && state && (
                <>
                  <p className="text-sm text-zinc-400">Départ dans</p>
                  <p className="text-6xl font-extrabold tabular-nums tracking-[-0.04em] text-white md:text-8xl">
                    {state.countdown.toFixed(1)}s
                  </p>
                  <div className="mt-6 h-1 w-48 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full origin-left bg-violet-400 transition-transform duration-100 ease-linear"
                      style={{ transform: `scaleX(${Math.min(1, state.countdown / 5)})` }}
                    />
                  </div>
                </>
              )}

              {phase === "FLYING" && (
                <p className="text-6xl font-extrabold tabular-nums tracking-[-0.04em] text-white md:text-8xl">
                  <span ref={multRef}>×1.00</span>
                </p>
              )}

              <AnimatePresence>
                {phase === "CRASHED" && state?.crashPoint && (
                  <motion.div
                    initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "scale(1.08)" }}
                    animate={{ opacity: 1, transform: "scale(1)" }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, ease: EASE_OUT }}
                  >
                    <p className="text-sm font-semibold text-red-400">Crash</p>
                    <p className="text-6xl font-extrabold tabular-nums tracking-[-0.04em] text-red-400 md:text-8xl">
                      ×{state.crashPoint.toFixed(2)}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          {!connected && state && <p className="mt-3 text-sm text-zinc-400">Connexion perdue, reconnexion…</p>}
        </div>
      </div>
    </GameShell>
  );
}

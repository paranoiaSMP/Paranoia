"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { animate, useReducedMotion } from "framer-motion";
import toast from "react-hot-toast";
import GameShell from "@/features/games/GameShell";
import BetInput from "@/features/games/BetInput";
import { fmt, useBalance } from "@/features/games/useBalance";
import { ROULETTE_ORDER, getNumberColor, getMultiplier, type RouletteColor } from "@/lib/games/rouletteTypes";

type Phase = "BETTING" | "SPINNING" | "RESOLVED";
type Bet = { id: string; userId: string; name: string; color: RouletteColor; amount: number };
type State = {
  roundId: string;
  phase: Phase;
  countdown: number;
  winningNumber: number | null;
  winningOffset: number | null;
  bets: Bet[];
  history: number[];
};

const TILE = 72;
const CYCLE = ROULETTE_ORDER.length * TILE;
const CYCLES = 12;
const TILE_BG: Record<RouletteColor, string> = {
  red: "bg-red-600 text-white",
  black: "bg-zinc-800 text-white",
  green: "bg-emerald-700 text-white",
};
const LABEL: Record<RouletteColor, string> = { red: "Rouge", black: "Noir", green: "Vert" };

export default function RoulettePage() {
  const wallet = useBalance();
  const authed = wallet.status === "authenticated";
  const { data: session } = useSession();
  const me = session?.user?.id;
  const reduce = useReducedMotion();

  const [state, setState] = useState<State | null>(null);
  const [connected, setConnected] = useState(false);
  const [bet, setBet] = useState(100);
  const [busy, setBusy] = useState(false);

  const viewport = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const pos = useRef(0);

  const placeAt = (x: number) => {
    pos.current = x;
    if (strip.current) strip.current.style.transform = `translateX(${x}px)`;
  };

  const xFor = (num: number, cycle: number, offset = 0) => {
    const w = viewport.current?.clientWidth ?? 600;
    const idx = ROULETTE_ORDER.indexOf(num);
    return -(cycle * CYCLE + idx * TILE + TILE / 2 + (offset / 64) * (TILE / 2) * 0.8) + w / 2;
  };

  useLayoutEffect(() => {
    placeAt(xFor(0, 2));
  }, []);

  useEffect(() => {
    const es = new EventSource("/api/games/roulette/events");
    const full = (e: MessageEvent) => {
      const s: State = JSON.parse(e.data);
      setState(s);
      if (s.phase === "BETTING") {
        const shifted = pos.current + Math.floor((-pos.current) / CYCLE - 2) * CYCLE;
        placeAt(shifted);
      } else if (s.winningNumber !== null) {
        placeAt(xFor(s.winningNumber, CYCLES - 3, s.winningOffset ?? 0));
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
      const b: Bet = JSON.parse((e as MessageEvent).data);
      setState((s) => (s ? { ...s, bets: [...s.bets, b] } : s));
    });
    es.addEventListener("SPIN", (e) => {
      const d = JSON.parse((e as MessageEvent).data);
      setState((s) => (s ? { ...s, phase: "SPINNING", winningNumber: d.winningNumber, winningOffset: d.winningOffset } : s));
      const target = xFor(d.winningNumber, CYCLES - 3, d.winningOffset);
      if (reduce || !strip.current) {
        placeAt(target);
        return;
      }
      animate(pos.current, target, {
        duration: 5,
        ease: [0.12, 0.8, 0.2, 1],
        onUpdate: (v) => placeAt(v),
      });
    });
    es.addEventListener("RESOLVED", (e) => {
      const d = JSON.parse((e as MessageEvent).data);
      setState((s) => (s ? { ...s, phase: "RESOLVED", history: d.history } : s));
      const win = (d.payouts as { userId: string; payout: number }[]).find((p) => p.userId === me);
      if (win) toast.success(`${LABEL[d.winningColor as RouletteColor]} ! +${fmt(win.payout)} PC`);
      wallet.refresh();
    });
    return () => es.close();
  }, [me, reduce]);

  const place = async (color: RouletteColor) => {
    setBusy(true);
    try {
      const res = await fetch("/api/games/roulette", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bet", color, amount: bet }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Erreur du serveur.");
      wallet.set(d.paraCoins);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const open = authed && state?.phase === "BETTING" && state.countdown > 0.3;
  const winColor = state?.phase === "RESOLVED" && state.winningNumber !== null ? getNumberColor(state.winningNumber) : null;

  return (
    <GameShell
      title="Roulette"
      rules="Choisis une couleur pendant le compte à rebours. Rouge ou Noir paie ×2, Vert (le 0) paie ×14."
      wallet={wallet}
      spectate
    >
      <div className="flex flex-col gap-10">
        <div>
          <div className="mb-4 flex min-h-8 flex-wrap gap-1.5" aria-label="Derniers tirages">
            {(state?.history ?? []).map((n, i) => (
              <span key={`${i}-${n}`} className={`flex h-8 w-8 items-center justify-center rounded-sm text-xs font-bold ${TILE_BG[getNumberColor(n)]}`}>
                {n}
                <span className="sr-only"> {LABEL[getNumberColor(n)]}</span>
              </span>
            ))}
          </div>

          <div ref={viewport} className="relative overflow-hidden rounded-md border border-zinc-900 bg-[#0b0b0d] py-4">
            <div
              ref={(el) => {
                strip.current = el;
                if (el) el.style.transform = `translateX(${pos.current}px)`;
              }}
              className="flex will-change-transform"
              aria-hidden
            >
              {Array.from({ length: CYCLES }).flatMap((_, c) =>
                ROULETTE_ORDER.map((n) => (
                  <div key={`${c}-${n}`} className="shrink-0 px-1" style={{ width: TILE }}>
                    <div className={`flex h-16 items-center justify-center rounded-md text-xl font-bold ${TILE_BG[getNumberColor(n)]}`}>{n}</div>
                  </div>
                ))
              )}
            </div>
            <div className="pointer-events-none absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-white" />
            <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#0b0b0d] to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#0b0b0d] to-transparent" />
          </div>

          <p className="mt-4 min-h-8 text-center text-lg font-semibold text-white" aria-live="polite">
            {!state && (connected ? "Chargement…" : "Connexion à la table…")}
            {state?.phase === "BETTING" && <>Tirage dans <span className="tabular-nums">{state.countdown.toFixed(1)}s</span></>}
            {state?.phase === "SPINNING" && "La roue tourne…"}
            {winColor && state?.winningNumber !== null && (
              <>
                Sorti : {state?.winningNumber} ({LABEL[winColor]})
              </>
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <BetInput value={bet} onChange={setBet} max={50000} balance={wallet.coins} disabled={!open || busy} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-8">
            {(["red", "green", "black"] as RouletteColor[]).map((color) => {
              const bets = state?.bets.filter((b) => b.color === color) ?? [];
              const total = bets.reduce((a, b) => a + b.amount, 0);
              const mineTotal = bets.filter((b) => b.userId === me).reduce((a, b) => a + b.amount, 0);
              const won = winColor === color;
              return (
                <div
                  key={color}
                  className={`flex flex-col gap-3 rounded-md border p-4 transition-colors duration-200 ${
                    won ? "border-white" : "border-zinc-900"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => place(color)}
                    disabled={!open || busy || wallet.coins === null}
                    className={`press flex min-h-14 items-center justify-between rounded-md px-4 text-base font-bold disabled:opacity-50 ${TILE_BG[color]}`}
                  >
                    <span>{LABEL[color]}</span>
                    <span>×{getMultiplier(color)}</span>
                  </button>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">{bets.length} mise{bets.length > 1 ? "s" : ""}</span>
                    <span className="tabular-nums text-white">{fmt(total)} PC</span>
                  </div>
                  {mineTotal > 0 && <p className="text-sm text-violet-400">Ta mise : {fmt(mineTotal)} PC</p>}
                  <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto text-sm" data-lenis-prevent>
                    {bets.map((b) => (
                      <li key={b.id} className="flex justify-between gap-2">
                        <span className={`truncate ${b.userId === me ? "text-white" : "text-zinc-400"}`}>{b.name}</span>
                        <span className="tabular-nums text-zinc-400">{fmt(b.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </GameShell>
  );
}

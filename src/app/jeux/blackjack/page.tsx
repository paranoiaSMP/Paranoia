"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import toast from "react-hot-toast";
import GameShell from "@/features/games/GameShell";
import BetInput from "@/features/games/BetInput";
import { fmt, useBalance } from "@/features/games/useBalance";
import { EASE_OUT } from "@/lib/motion";

type Card = { suit: string; rank: string };
type Status = "playing" | "dealer_won" | "player_won" | "push" | "player_blackjack";
type Round = {
  token: string | null;
  playerHand: Card[];
  dealerHand: Card[];
  playerScore: number;
  dealerScore: number;
  status: Status;
  payout: number;
  bet: number;
};

const KEY = "ps-blackjack-game";
const SUIT: Record<string, { s: string; red: boolean; label: string }> = {
  S: { s: "♠", red: false, label: "pique" },
  H: { s: "♥", red: true, label: "cœur" },
  D: { s: "♦", red: true, label: "carreau" },
  C: { s: "♣", red: false, label: "trèfle" },
};
const RESULT: Record<Exclude<Status, "playing">, { text: string; win: boolean | null }> = {
  player_won: { text: "Gagné", win: true },
  player_blackjack: { text: "Blackjack !", win: true },
  dealer_won: { text: "Perdu", win: false },
  push: { text: "Égalité", win: null },
};

function PlayingCard({ card, index }: { card: Card; index: number }) {
  const reduce = useReducedMotion();
  const hidden = card.rank === "?";
  const suit = SUIT[card.suit];
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translate(160px, -120px) rotate(18deg)" }}
      animate={{ opacity: 1, transform: "translate(0px, 0px) rotate(0deg)" }}
      transition={reduce ? { duration: 0.15 } : { duration: 0.45, ease: EASE_OUT, delay: Math.min(index, 3) * 0.12 }}
      className="relative -ml-10 first:ml-0 sm:-ml-8"
      style={{ perspective: 800 }}
    >
      <motion.div
        className="relative h-36 w-24 sm:h-44 sm:w-32"
        style={{ transformStyle: "preserve-3d" }}
        initial={false}
        animate={{ rotateY: hidden ? 180 : 0 }}
        transition={reduce ? { duration: 0.01 } : { type: "spring", bounce: 0.15, duration: 0.6 }}
      >
        <div
          className={`absolute inset-0 flex flex-col justify-between rounded-lg border border-zinc-300 bg-white p-2 shadow-[0_8px_24px_rgba(0,0,0,0.5)] ${
            suit?.red ? "text-red-600" : "text-black"
          }`}
          style={{ backfaceVisibility: "hidden" }}
          aria-label={hidden ? "Carte cachée" : `${card.rank} de ${suit?.label}`}
        >
          <span className="text-xl font-extrabold leading-none sm:text-2xl">
            {card.rank}
            <br />
            {suit?.s}
          </span>
          <span className="self-center text-4xl sm:text-5xl" aria-hidden>
            {suit?.s}
          </span>
          <span className="rotate-180 text-xl font-extrabold leading-none sm:text-2xl" aria-hidden>
            {card.rank}
            <br />
            {suit?.s}
          </span>
        </div>
        <div
          className="absolute inset-0 flex items-center justify-center rounded-lg border border-violet-500/50 bg-[#0b0b0d]"
          style={{ transform: "rotateY(180deg)", backfaceVisibility: "hidden" }}
          aria-hidden
        >
          <span className="text-sm font-bold text-violet-400">PS</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Hand({ label, cards, score }: { label: string; cards: Card[]; score: number | null }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-400">
        {label}
        {score !== null && <span className="ml-3 text-lg font-bold tabular-nums text-white">{score}</span>}
      </p>
      <div className="flex min-h-36 items-center sm:min-h-44">
        {cards.length === 0 ? (
          <div className="h-36 w-24 rounded-lg border border-dashed border-zinc-800 sm:h-44 sm:w-32" />
        ) : (
          cards.map((c, i) => <PlayingCard key={i} card={c} index={i} />)
        )}
      </div>
    </div>
  );
}

export default function BlackjackPage() {
  const wallet = useBalance();
  const reduce = useReducedMotion();
  const [bet, setBet] = useState(100);
  const [round, setRound] = useState<Round | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return;
    const t = setTimeout(() => {
      try {
        setRound(JSON.parse(raw));
      } catch {
        sessionStorage.removeItem(KEY);
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (round?.status === "playing" && round.token) sessionStorage.setItem(KEY, JSON.stringify(round));
    else sessionStorage.removeItem(KEY);
  }, [round]);

  const act = async (action: "deal" | "hit" | "stand" | "double") => {
    setBusy(true);
    try {
      const res = await fetch("/api/games/blackjack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "deal" ? { action, bet } : { action, token: round?.token }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (d.token && round) setRound({ ...round, token: d.token });
        throw new Error(d.error ?? "Erreur du serveur.");
      }
      const roundBet = action === "deal" ? bet : action === "double" ? (round?.bet ?? bet) * 2 : round?.bet ?? bet;
      setRound({ ...d, bet: roundBet });
      if (typeof d.paraCoins === "number") wallet.set(d.paraCoins);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const playing = round?.status === "playing";
  const over = round && round.status !== "playing" ? RESULT[round.status] : null;
  const canDouble = playing && round.playerHand.length === 2 && (wallet.coins ?? 0) >= round.bet;

  return (
    <GameShell
      title="Blackjack"
      rules="Approche-toi de 21 sans le dépasser. Le croupier tire jusqu'à 17. Blackjack payé 3 pour 2."
      wallet={wallet}
    >
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-4">
          <BetInput value={bet} onChange={setBet} max={50000} balance={wallet.coins} disabled={playing || busy} />

          {playing ? (
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => act("hit")} disabled={busy} className="btn-violet disabled:opacity-50">
                Tirer
              </button>
              <button type="button" onClick={() => act("stand")} disabled={busy} className="btn-solid disabled:opacity-50">
                Rester
              </button>
              <button
                type="button"
                onClick={() => act("double")}
                disabled={busy || !canDouble}
                className="btn-line col-span-2 disabled:opacity-40"
              >
                Doubler ({fmt(round.bet)} PC)
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => act("deal")} disabled={busy || wallet.coins === null} className="btn-violet disabled:opacity-50">
              {busy ? "…" : `Distribuer, ${fmt(bet)} PC`}
            </button>
          )}

          <div aria-live="polite" className="min-h-16">
            <AnimatePresence mode="wait">
              {over && round && (
                <motion.p
                  key={round.status + round.payout}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(8px)" }}
                  animate={{ opacity: 1, transform: "translateY(0px)" }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: EASE_OUT, delay: reduce ? 0 : 0.4 }}
                  className={`text-2xl font-bold ${over.win === true ? "text-violet-400" : over.win === false ? "text-red-400" : "text-white"}`}
                >
                  {over.text}
                  {round.payout > 0 && ` · ${fmt(round.payout)} PC`}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex flex-col gap-10 rounded-md border border-zinc-900 bg-[#0b0b0d] p-6 sm:p-10 lg:col-span-8">
          <Hand label="Croupier" cards={round?.dealerHand ?? []} score={round ? round.dealerScore : null} />
          <div className="h-px bg-zinc-900" />
          <Hand label="Toi" cards={round?.playerHand ?? []} score={round ? round.playerScore : null} />
        </div>
      </div>
    </GameShell>
  );
}

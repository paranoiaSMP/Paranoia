import React from "react";
import PlayingCard from "./PlayingCard";
import { Card, RoundPhase, calculateHand } from "../types";

interface BlackjackTableProps {
  phase: RoundPhase;
  handsPlayed: number;
  bet: number;
  userName: string;
  playerHand: Card[];
  dealerHand: Card[];
  outcome: "dealer_won" | "player_won" | "push" | "player_blackjack" | null;
  payout: number;
}

const PHASE_LABELS: Record<RoundPhase, string> = {
  BETTING: "Placez votre mise",
  PLAYER_TURN: "À vous de jouer",
  DEALER_TURN: "Tour du croupier",
  FINISHED: "Main terminée",
};

export default function BlackjackTable({
  phase,
  handsPlayed,
  bet,
  userName,
  playerHand,
  dealerHand,
  outcome,
  payout,
}: BlackjackTableProps) {
  const pScore = calculateHand(playerHand);
  const dScore = calculateHand(dealerHand);
  const hasHiddenDealerCard = dealerHand.some((c) => c.hidden || c.rank === "?" || c.suit === "?");

  return (
    <div className="flex flex-col flex-1">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-white/10 bg-[#0d0d14] font-mono text-xs text-zinc-400">
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-[soft-pulse_1.6s_infinite]" />
          {PHASE_LABELS[phase]}
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
            dealerHand.map((card, i) => <PlayingCard key={`dealer-${i}`} card={card} index={i} />)
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
                playerHand.map((card, i) => <PlayingCard key={`player-${i}`} card={card} index={i} />)
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
    </div>
  );
}

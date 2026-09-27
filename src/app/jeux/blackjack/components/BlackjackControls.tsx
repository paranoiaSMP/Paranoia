import React from "react";
import { RoundPhase } from "../types";

interface BlackjackControlsProps {
  phase: RoundPhase;
  bet: number;
  coins: number;
  canDouble: boolean;
  loading: boolean;
  onSetBet: (val: number) => void;
  onDeal: () => void;
  onHit: () => void;
  onStand: () => void;
  onDouble: () => void;
}

export default function BlackjackControls({
  phase,
  bet,
  coins,
  canDouble,
  loading,
  onSetBet,
  onDeal,
  onHit,
  onStand,
  onDouble,
}: BlackjackControlsProps) {
  return (
    <div className="border-t border-white/10 bg-[#0d0d14] p-3.5 flex flex-wrap items-center gap-2.5">
      <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-[220px]">
        <span className="font-mono text-[10px] tracking-widest text-zinc-500 mr-1">JETONS</span>
        <button
          type="button"
          onClick={() => onSetBet(bet + 10)}
          className="w-9 h-9 rounded-full border-2 border-dashed border-white/30 bg-[#1c1c26] text-slate-200 font-outfit text-xs font-black hover:border-purple-400 hover:text-white cursor-pointer"
        >
          10
        </button>
        <button
          type="button"
          onClick={() => onSetBet(bet + 50)}
          className="w-9 h-9 rounded-full border-2 border-dashed border-purple-400/50 bg-[#2a1040] text-purple-200 font-outfit text-xs font-black hover:border-purple-300 hover:text-white cursor-pointer"
        >
          50
        </button>
        <button
          type="button"
          onClick={() => onSetBet(bet + 100)}
          className="w-9 h-9 rounded-full border-2 border-dashed border-purple-400/70 bg-[#3b0764] text-purple-200 font-outfit text-xs font-black hover:border-purple-300 hover:text-white cursor-pointer"
        >
          100
        </button>
        <button
          type="button"
          onClick={() => onSetBet(bet + 250)}
          className="w-9 h-9 rounded-full border-2 border-dashed border-purple-500 bg-[#4c0f78] text-white font-outfit text-xs font-black hover:border-purple-300 cursor-pointer"
        >
          250
        </button>
        <button
          type="button"
          onClick={() => onSetBet(bet + 1000)}
          className="w-9 h-9 rounded-full border-2 border-dashed border-red-500/60 bg-[#4a0f14] text-red-200 font-outfit text-[11px] font-black hover:border-red-400 hover:text-white cursor-pointer"
        >
          1K
        </button>
        <button
          type="button"
          onClick={() => onSetBet(Math.floor(bet / 2))}
          className="px-2.5 h-9 rounded border border-white/10 bg-transparent text-zinc-400 font-mono text-xs hover:text-white hover:border-white/25 cursor-pointer"
        >
          ½
        </button>
        <button
          type="button"
          onClick={() => onSetBet(Math.min(coins, bet * 2))}
          className="px-2.5 h-9 rounded border border-white/10 bg-transparent text-zinc-400 font-mono text-xs hover:text-white hover:border-white/25 cursor-pointer"
        >
          2×
        </button>
        <button
          type="button"
          onClick={() => onSetBet(Math.min(50000, coins))}
          className="px-2.5 h-9 rounded border border-white/10 bg-transparent text-zinc-400 font-mono text-xs hover:text-white hover:border-white/25 cursor-pointer"
        >
          MAX
        </button>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {phase === "PLAYER_TURN" ? (
          <>
            <button
              type="button"
              onClick={onHit}
              disabled={loading}
              className="h-10 px-5 rounded border-0 bg-[#7a0aad] hover:bg-[#9333ea] text-white font-outfit font-black text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Tirer <span className="opacity-60 text-[10px] ml-1">H</span>
            </button>
            <button
              type="button"
              onClick={onStand}
              disabled={loading}
              className="h-10 px-5 rounded border border-white/20 hover:bg-white/5 text-white font-outfit font-black text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Rester <span className="opacity-50 text-[10px] ml-1">S</span>
            </button>
            {canDouble && (
              <button
                type="button"
                onClick={onDouble}
                disabled={loading || coins < bet}
                className="h-10 px-4 rounded border border-amber-400/50 hover:bg-amber-400/10 text-amber-400 font-outfit font-black text-xs uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-40"
              >
                Doubler <span className="opacity-60 text-[10px] ml-1">D</span>
              </button>
            )}
          </>
        ) : phase === "DEALER_TURN" ? (
          <span className="h-10 flex items-center px-5 font-mono text-xs text-purple-300 border border-purple-500/30 rounded animate-[soft-pulse_1.6s_infinite]">
            Le croupier joue…
          </span>
        ) : (
          <button
            type="button"
            onClick={onDeal}
            disabled={loading}
            className="h-10 px-6 rounded border-0 bg-[#b366ff] hover:bg-[#c084fc] text-[#0a0a0a] font-outfit font-black text-sm uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
          >
            {phase === "FINISHED" ? "Rejouer" : "Distribuer"}{" "}
            <span className="opacity-60 text-[10px] ml-1 font-mono">ESPACE</span>
          </button>
        )}
      </div>
    </div>
  );
}

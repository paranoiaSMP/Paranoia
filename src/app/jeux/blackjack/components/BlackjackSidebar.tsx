import React from "react";
import { ShieldCheck } from "lucide-react";
import { HistoryRow } from "../types";

interface BlackjackSidebarProps {
  coins: number;
  handsPlayed: number;
  handsWon: number;
  net: number;
  history: HistoryRow[];
}

export default function BlackjackSidebar({
  coins,
  handsPlayed,
  handsWon,
  net,
  history,
}: BlackjackSidebarProps) {
  return (
    <aside className="flex-[0_1_288px] min-w-[260px] flex flex-col gap-3">
      <div className="border border-white/10 rounded-2xl bg-[#0d0d14] p-4">
        <div className="flex items-baseline justify-between mb-3">
          <span className="font-mono text-[10px] tracking-widest text-zinc-400">SOLDE</span>
          <span className="font-outfit text-2xl font-black text-white">
            {coins.toLocaleString("fr-FR")}
            <span className="text-xs text-zinc-400 ml-1">PC</span>
          </span>
        </div>

        <div className="grid grid-cols-3 gap-px bg-white/10 border border-white/10 rounded-lg overflow-hidden">
          <div className="bg-[#0d0d14] p-2">
            <span className="block font-mono text-[9px] tracking-wider text-zinc-400">MAINS</span>
            <span className="font-mono text-sm font-bold text-white">{handsPlayed}</span>
          </div>
          <div className="bg-[#0d0d14] p-2">
            <span className="block font-mono text-[9px] tracking-wider text-zinc-400">GAGNÉES</span>
            <span className="font-mono text-sm font-bold text-white">{handsWon}</span>
          </div>
          <div className="bg-[#0d0d14] p-2">
            <span className="block font-mono text-[9px] tracking-wider text-zinc-400">NET</span>
            <span
              className={`font-mono text-sm font-bold ${
                net > 0 ? "text-emerald-400" : net < 0 ? "text-red-400" : "text-white"
              }`}
            >
              {(net > 0 ? "+" : "") + net.toLocaleString("fr-FR")}
            </span>
          </div>
        </div>
      </div>

      <div className="border border-white/10 rounded-2xl bg-[#0d0d14] flex-1 min-h-[220px] flex flex-col overflow-hidden">
        <div className="px-4 py-2.5 border-b border-white/10 flex items-baseline justify-between">
          <span className="font-mono text-[10px] tracking-widest text-zinc-400">HISTORIQUE</span>
          <span className="font-mono text-[10px] text-zinc-500">{history.length} mains</span>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[240px]">
          {history.length === 0 ? (
            <p className="p-4 font-mono text-xs text-zinc-500 leading-relaxed">
              Aucune main jouée.
              <br />
              Placez une mise et distribuez.
            </p>
          ) : (
            history.map((row, idx) => (
              <div
                key={`hist-${idx}`}
                className="flex items-center gap-2 px-4 py-2 border-b border-white/5 font-mono text-xs"
              >
                <span className="text-zinc-500 w-7 shrink-0">#{row.n}</span>
                <span className="font-bold flex-1 min-w-0 truncate" style={{ color: row.color }}>
                  {row.label}
                </span>
                <span className="text-zinc-400 shrink-0">{row.score}</span>
                <span className="font-bold w-16 text-right shrink-0" style={{ color: row.color }}>
                  {row.delta}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="border border-white/10 rounded-2xl bg-[#0d0d14] p-3.5 flex flex-col gap-2 font-mono text-xs text-zinc-400">
        <div className="flex justify-between">
          <span>Blackjack</span>
          <span className="text-white font-bold">3:2</span>
        </div>
        <div className="flex justify-between">
          <span>Victoire</span>
          <span className="text-white font-bold">1:1</span>
        </div>
        <div className="flex justify-between">
          <span>Croupier</span>
          <span className="text-white font-bold">reste à 17</span>
        </div>
        <div className="flex justify-between">
          <span>Égalité</span>
          <span className="text-white font-bold">remboursée</span>
        </div>
        <div className="flex items-center gap-1.5 pt-2 border-t border-white/10 text-purple-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="text-zinc-400">Provably fair · serveur</span>
        </div>
        <span className="text-zinc-500 text-[11px] leading-relaxed pt-1">
          Espace parier · H tirer · S rester · D doubler
        </span>
      </div>
    </aside>
  );
}

"use client";

import { X, Search } from "lucide-react";
import { BOOSTER_PACKS, CARD_RARITIES, type BoosterPackId } from "@/config/boosters";

interface RatesModalProps {
  onClose: () => void;
  onSelectMythic: () => void;
}

const PACK_ORDER: BoosterPackId[] = ["standard", "premium", "legendary", "mythic"];

export default function RatesModal({ onClose, onSelectMythic }: RatesModalProps) {
  const mythicChance =
    BOOSTER_PACKS.mythic.rates.find((r) => r.rarity === "Mythique")?.percent || "5%";

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-8 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="panel-matte p-12 lg:p-16 rounded-3xl overflow-hidden relative shadow-2xl w-full max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/10 via-transparent to-transparent pointer-events-none" />
        <button
          onClick={onClose}
          className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors z-50 bg-white/5 hover:bg-purple-500/20 p-3 rounded-full border border-white/10"
        >
          <X className="w-6 h-6" />
        </button>
        <h3 className="text-3xl font-outfit font-black text-white mb-2 relative z-10 flex items-center gap-3">
          <Search className="w-8 h-8 text-indigo-400" /> Taux d&apos;Obtention (Drop Rates)
        </h3>
        <p className="text-white/50 mb-10 relative z-10">
          Consultez vos chances d&apos;obtenir les cartes les plus rares.
        </p>
        <div className="relative z-10 overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-black/60 uppercase text-white/50 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 font-bold">Rareté</th>
                <th className="px-6 py-4 font-bold text-blue-400">{BOOSTER_PACKS.standard.name}</th>
                <th className="px-6 py-4 font-bold text-purple-400">{BOOSTER_PACKS.premium.name}</th>
                <th className="px-6 py-4 font-bold text-yellow-400">{BOOSTER_PACKS.legendary.name}</th>
                <th className="px-6 py-4 font-bold text-red-400">{BOOSTER_PACKS.mythic.name}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-black/30 font-medium text-white">
              {CARD_RARITIES.map((rarity) => {
                const isMythic = rarity.key === "MYTHIC";
                return (
                  <tr
                    key={rarity.key}
                    className={`hover:bg-white/5 transition-colors ${isMythic ? "bg-red-900/10" : ""}`}
                  >
                    <td className={`px-6 py-4 ${rarity.colorClass} ${isMythic ? "font-black text-red-500" : ""}`}>
                      {rarity.label}
                    </td>
                    {PACK_ORDER.map((packKey) => {
                      const pack = BOOSTER_PACKS[packKey];
                      const rate = pack.rates.find(
                        (r) => r.rarity.toLowerCase() === rarity.label.toLowerCase()
                      );
                      const percentStr = rate ? rate.percent : "0%";
                      const isZero = percentStr === "0%";

                      return (
                        <td
                          key={packKey}
                          className={`px-6 py-4 ${isZero ? "opacity-30" : ""} ${
                            isMythic && !isZero ? "text-red-500 font-black" : ""
                          }`}
                        >
                          {percentStr}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-8 text-center relative z-10">
          <button
            onClick={() => {
              onClose();
              onSelectMythic();
            }}
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-[0_0_20px_rgba(147,51,234,0.4)] hover:shadow-[0_0_30px_rgba(147,51,234,0.7)] hover:-translate-y-1"
          >
            Tenter la Mythique ({mythicChance} !)
          </button>
        </div>
      </div>
    </div>
  );
}

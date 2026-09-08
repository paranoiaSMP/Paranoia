"use client";

import { X, Search } from "lucide-react";

interface RatesModalProps {
  onClose: () => void;
  onSelectMythic: () => void;
}

export default function RatesModal({ onClose, onSelectMythic }: RatesModalProps) {
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
          <Search className="w-8 h-8 text-indigo-400" /> Taux d'Obtention (Drop Rates)
        </h3>
        <p className="text-white/50 mb-10 relative z-10">
          Consultez vos chances d'obtenir les cartes les plus rares.
        </p>
        <div className="relative z-10 overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-black/60 uppercase text-white/50 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 font-bold">Rareté</th>
                <th className="px-6 py-4 font-bold text-blue-400">Standard</th>
                <th className="px-6 py-4 font-bold text-purple-400">Premium</th>
                <th className="px-6 py-4 font-bold text-yellow-400">Légendaire</th>
                <th className="px-6 py-4 font-bold text-red-400">Mythique</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-black/30 font-medium text-white">
              <tr className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 text-gray-400">Commune</td>
                <td className="px-6 py-4">70%</td>
                <td className="px-6 py-4">45%</td>
                <td className="px-6 py-4">25%</td>
                <td className="px-6 py-4 opacity-30">0%</td>
              </tr>
              <tr className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 text-blue-400">Rare</td>
                <td className="px-6 py-4">20%</td>
                <td className="px-6 py-4">35%</td>
                <td className="px-6 py-4">40%</td>
                <td className="px-6 py-4 opacity-30">0%</td>
              </tr>
              <tr className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 text-purple-400">Épique</td>
                <td className="px-6 py-4">8%</td>
                <td className="px-6 py-4">15%</td>
                <td className="px-6 py-4">25%</td>
                <td className="px-6 py-4">75%</td>
              </tr>
              <tr className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 text-yellow-400 font-bold">Légendaire</td>
                <td className="px-6 py-4">2%</td>
                <td className="px-6 py-4">5%</td>
                <td className="px-6 py-4 text-yellow-400">10%</td>
                <td className="px-6 py-4 text-yellow-400">20%</td>
              </tr>
              <tr className="hover:bg-white/5 transition-colors bg-red-900/10">
                <td className="px-6 py-4 text-red-500 font-black">Mythique</td>
                <td className="px-6 py-4 opacity-30">0%</td>
                <td className="px-6 py-4 opacity-30">0%</td>
                <td className="px-6 py-4 opacity-30">0%</td>
                <td className="px-6 py-4 text-red-500 font-black">5%</td>
              </tr>
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
            Tenter la Mythique (5% !)
          </button>
        </div>
      </div>
    </div>
  );
}

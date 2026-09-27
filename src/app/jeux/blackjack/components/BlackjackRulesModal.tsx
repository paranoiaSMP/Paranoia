import React from "react";

export default function BlackjackRulesModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
      <div className="bg-[#0d0d14] border border-white/15 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <h3 className="font-outfit text-xl font-black text-white mb-3">
          Règles du Blackjack Paranoia
        </h3>
        <ul className="text-xs text-zinc-400 leading-relaxed list-none flex flex-col gap-2">
          <li>• Approchez-vous de 21 sans dépasser, et battez le total du croupier.</li>
          <li>• Les figures valent 10, l&apos;As vaut 1 ou 11.</li>
          <li>• Blackjack naturel (As + 10 dès la donne) : paie <strong className="text-white">3:2</strong>.</li>
          <li>• <strong className="text-white">Tirer</strong> : une carte de plus. <strong className="text-white">Rester</strong> : vous gardez la main.</li>
          <li>• <strong className="text-white">Doubler</strong> : mise doublée, une seule carte, puis passage au croupier.</li>
          <li>• Le croupier tire jusqu&apos;à 17 minimum.</li>
          <li>• Égalité : mise intégralement remboursée.</li>
        </ul>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full h-10 rounded border-0 bg-[#b366ff] hover:bg-[#c084fc] text-[#0a0a0a] font-outfit font-black text-xs uppercase tracking-wider transition-colors cursor-pointer"
        >
          Compris
        </button>
      </div>
    </div>
  );
}

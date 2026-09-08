"use client";

import { Sparkles } from "lucide-react";
import FlippableCard from "./FlippableCard";
import { TradingCard } from "@/types/cards";

interface RevealOverlayProps {
  showReveal: boolean;
  drawnCards: TradingCard[];
  openingGlow: string | null;
  activeBox: any;
  forceFlipAll: boolean;
  setForceFlipAll: (val: boolean) => void;
  selectedBoxType: string;
  allCards: any[];
  ownedVariantIds: Set<string>;
  boxes: any[];
  onOpenAnother: () => void;
  onClose: () => void;
}

export default function RevealOverlay({
  showReveal,
  drawnCards,
  openingGlow,
  activeBox,
  forceFlipAll,
  setForceFlipAll,
  selectedBoxType,
  allCards,
  ownedVariantIds,
  boxes,
  onOpenAnother,
  onClose,
}: RevealOverlayProps) {
  if (!showReveal || drawnCards.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[2000] bg-[#06060c]/98 overflow-y-auto custom-scrollbar flex flex-col items-center justify-between p-6 sm:p-10 lg:p-16 animate-in fade-in duration-500">
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[70vw] rounded-full blur-[120px] opacity-30 ${
            openingGlow === "MYTHIC"
              ? "bg-gradient-to-tr from-rose-700 via-red-600 to-amber-600"
              : "bg-gradient-to-tr from-purple-900 via-indigo-900 to-slate-900"
          }`}
        />
        {openingGlow === "MYTHIC" &&
          Array.from({ length: 12 }).map((_, i) => (
            <Sparkles
              key={i}
              className="absolute animate-particle opacity-40 text-rose-400"
              style={
                {
                  "--tx": `${(Math.random() - 0.5) * 1200}px`,
                  "--ty": `${(Math.random() - 0.5) * 1200}px`,
                  animationDelay: `${Math.random() * 0.5}s`,
                  width: `${Math.random() * 20 + 10}px`,
                  height: `${Math.random() * 20 + 10}px`,
                } as React.CSSProperties
              }
            />
          ))}
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mt-4 sm:mt-6">
        <span className="text-xs sm:text-sm font-light uppercase tracking-[0.4em] text-slate-400 mb-2">
          {activeBox.name} • {drawnCards.length} CARTES RÉVÉLÉES
        </span>
        <h2 className="text-4xl sm:text-6xl font-outfit font-black text-white tracking-tight drop-shadow-md mb-2">
          VOTRE TIRAGE
        </h2>
        <p className="text-slate-400 text-xs sm:text-sm font-light tracking-[0.15em] mb-6">
          Cliquez sur chaque carte pour la découvrir, ou révélez tout en une fois.
        </p>

        <button
          onClick={() => setForceFlipAll(true)}
          className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white font-normal text-xs sm:text-sm uppercase tracking-[0.25em] rounded-xl border border-white/10 hover:border-white/30 transition-all duration-300 shadow-lg"
        >
          Tout Révéler
        </button>
      </div>

      <div className="relative z-10 my-10 flex flex-row justify-center items-center gap-6 md:gap-10 px-2 flex-wrap max-w-7xl mx-auto w-full">
        {drawnCards.map((card, i) => (
          <FlippableCard
            key={i}
            card={card}
            index={i}
            boxType={selectedBoxType}
            allCards={allCards}
            ownedVariantIds={ownedVariantIds}
            forceFlip={forceFlipAll}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mt-6 mb-4 w-full max-w-xl">
        <button
          onClick={onOpenAnother}
          className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 hover:from-purple-500 hover:via-fuchsia-500 hover:to-indigo-500 text-white font-bold text-sm uppercase tracking-[0.2em] rounded-2xl shadow-[0_0_30px_rgba(168,85,247,0.4)] hover:shadow-[0_0_40px_rgba(168,85,247,0.7)] transition-all transform hover:-translate-y-0.5"
        >
          Ouvrir un autre booster ({boxes.find((b) => b.boxType === selectedBoxType)?.amount || 0})
        </button>
        <button
          onClick={onClose}
          className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-medium text-sm uppercase tracking-[0.2em] rounded-2xl border border-white/10 hover:border-white/20 transition-all backdrop-blur-md"
        >
          Terminer & Retour
        </button>
      </div>
    </div>
  );
}

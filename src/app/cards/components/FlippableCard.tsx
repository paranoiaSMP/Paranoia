"use client";

import { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import CardDisplay from "@/features/binder/components/CardDisplay";
import { TradingCard } from "@/types/cards";

interface FlippableCardProps {
  card: TradingCard;
  index: number;
  boxType: string;
  allCards: any[];
  ownedVariantIds: Set<string>;
  forceFlip?: boolean;
}

export default function FlippableCard({
  card,
  index,
  ownedVariantIds,
  forceFlip = false,
}: FlippableCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showWow, setShowWow] = useState(false);

  useEffect(() => {
    if (forceFlip && !isFlipped) {
      const timer = setTimeout(() => {
        setIsFlipped(true);
        if (card.rarity === "MYTHIC") {
          triggerWow();
        }
      }, index * 200);
      return () => clearTimeout(timer);
    }
  }, [forceFlip, isFlipped, index, card.rarity]);

  const triggerWow = () => {
    setShowWow(true);
    confetti({
      particleCount: 80,
      spread: 90,
      origin: { y: 0.6 },
      zIndex: 4000,
      colors: ["#ef4444", "#dc2626", "#b91c1c", "#ffffff"],
    });
    setTimeout(() => setShowWow(false), 2800);
  };

  const handleFlip = () => {
    if (isFlipped) return;
    setIsFlipped(true);
    if (card.rarity === "MYTHIC") {
      triggerWow();
    }
  };

  return (
    <>
      {showWow && (
        <div className="fixed inset-0 z-[3000] flex flex-col items-center justify-center pointer-events-none p-4 text-center">
          <div className="absolute inset-0 animate-flash-fade bg-red-600/30 mix-blend-screen" />
          <div className="animate-huge-reveal flex flex-col items-center">
            <h2 className="text-6xl sm:text-7xl md:text-8xl font-outfit font-black uppercase tracking-tight my-2 text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-red-500 to-amber-400 drop-shadow-[0_0_60px_rgba(239,68,68,0.9)]">
              MYTHIQUE
            </h2>
            <p className="text-white text-xl md:text-3xl font-light tracking-[0.2em] uppercase mt-1 drop-shadow-lg">
              {card.player ? card.player.minecraftName : card.title}
            </p>
          </div>
        </div>
      )}
      <div
        className="relative z-10 animate-epic-card-reveal cursor-pointer group shrink-0"
        style={{
          animationDelay: `${index * 0.25}s`,
          animationFillMode: "both",
          perspective: "1200px",
          width: "16rem",
          height: "22.4rem",
          minWidth: "16rem",
        }}
        onClick={handleFlip}
      >
        {!isFlipped && card.rarity === "MYTHIC" && (
          <div className="absolute -inset-2 bg-gradient-to-r from-rose-600/50 via-red-500/50 to-amber-500/50 rounded-3xl blur-lg animate-pulse -z-10 transition-all duration-500" />
        )}

        <div className="w-full h-full transition-transform duration-500 group-hover:-translate-y-2">
          <div
            className="w-full h-full relative transition-transform duration-700 ease-out"
            style={{
              transformStyle: "preserve-3d",
              transform: isFlipped ? "rotateY(0deg)" : "rotateY(180deg)",
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.5)] rounded-2xl"
              style={{ backfaceVisibility: "hidden" }}
            >
              <CardDisplay card={card} size="md" ownedVariantIds={ownedVariantIds} />
            </div>
            <div
              className="absolute inset-0 w-full h-full rounded-2xl border border-purple-500/40 flex items-center justify-center overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.8)]"
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                background: "radial-gradient(circle at center, #181432 0%, #08060c 100%)",
              }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(168,85,247,0.25)_0%,_transparent_70%)] pointer-events-none" />
              <div className="relative z-10 flex flex-col items-center justify-center pointer-events-none w-full px-6">
                <img
                  src="/Paranoia_logo.png"
                  fetchPriority="high"
                  className="w-4/5 h-auto drop-shadow-[0_0_20px_rgba(168,85,247,0.5)] group-hover:scale-105 transition-transform duration-500"
                  alt="Paranoia Card Back"
                />
              </div>
              <div className="absolute inset-2 border border-white/5 rounded-xl pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-purple-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

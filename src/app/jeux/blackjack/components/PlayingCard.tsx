import React from "react";
import { Card } from "../types";

export default function PlayingCard({ card, index }: { card: Card; index: number }) {
  const isHidden = card.hidden || card.rank === "?" || card.suit === "?";

  if (isHidden) {
    return (
      <div
        className="w-[clamp(58px,6.4vw,88px)] h-[clamp(82px,9.1vw,126px)] shrink-0 rounded-[6px] border border-purple-500/40 bg-[repeating-linear-gradient(45deg,#3b0764_0_5px,#2a0a45_5px_10px)] flex items-center justify-center animate-[deal-in_0.22s_ease-out_both]"
        style={{ animationDelay: `${index * 0.07}s` }}
      >
        <span className="font-outfit font-black text-sm text-purple-300/80 tracking-widest">P</span>
      </div>
    );
  }

  const isRed = card.suit === "H" || card.suit === "D";
  const symbolMap: Record<string, string> = { S: "♠", H: "♥", D: "♦", C: "♣" };
  const sym = symbolMap[card.suit] || card.suit;
  const inkClass = isRed ? "text-[#c0121a]" : "text-[#131318]";

  return (
    <div
      className="w-[clamp(58px,6.4vw,88px)] h-[clamp(82px,9.1vw,126px)] shrink-0 rounded-[6px] bg-[#f7f6f2] border border-[#d4d4d8] shadow-[0_14px_22px_rgba(0,0,0,0.5)] flex flex-col justify-between p-2 relative animate-[deal-in_0.22s_ease-out_both]"
      style={{ animationDelay: `${index * 0.07}s` }}
    >
      <div className={`flex flex-col items-start leading-[0.95] ${inkClass}`}>
        <span className="text-sm sm:text-base font-extrabold font-outfit">{card.rank}</span>
        <span className="text-xs">{sym}</span>
      </div>
      <div className={`text-2xl sm:text-3xl text-center leading-none ${inkClass}`}>{sym}</div>
      <div className={`flex flex-col items-end leading-[0.95] rotate-180 ${inkClass}`}>
        <span className="text-sm sm:text-base font-extrabold font-outfit">{card.rank}</span>
        <span className="text-xs">{sym}</span>
      </div>
    </div>
  );
}

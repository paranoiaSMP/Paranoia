"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Sparkles, Lock } from "lucide-react";

interface BoosterCarouselProps {
  selectedBoxType: string;
  setSelectedBoxType: (type: string) => void;
  boxesData: Record<string, any>;
  isOpening: boolean;
  isBuying: boolean;
  isLoggedIn: boolean;
  coins: number;
  onOpenPack: () => void;
  onBuyBooster: (type: string, price: number) => void;
}

const BOX_KEYS = ["standard", "premium", "legendary", "mythic"];

export default function BoosterCarousel({
  selectedBoxType,
  setSelectedBoxType,
  boxesData,
  isOpening,
  isBuying,
  isLoggedIn,
  coins,
  onOpenPack,
  onBuyBooster,
}: BoosterCarouselProps) {
  const router = useRouter();
  const currentIndex = Math.max(0, BOX_KEYS.indexOf(selectedBoxType));
  const activeBox = boxesData[selectedBoxType] || boxesData["standard"];

  const prevIndex = (currentIndex - 1 + BOX_KEYS.length) % BOX_KEYS.length;
  const nextIndex = (currentIndex + 1) % BOX_KEYS.length;

  const prevKey = BOX_KEYS[prevIndex];
  const nextKey = BOX_KEYS[nextIndex];

  const prevBox = boxesData[prevKey];
  const nextBox = boxesData[nextKey];

  const handlePrev = () => {
    if (isOpening) return;
    setSelectedBoxType(prevKey);
  };

  const handleNext = () => {
    if (isOpening) return;
    setSelectedBoxType(nextKey);
  };

  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl p-6 sm:p-10 text-center bg-[#12111a]/85 border border-white/10 backdrop-blur-2xl shadow-[0_0_35px_rgba(122,10,173,0.25)]">
      <h2 className="text-3xl sm:text-4xl font-outfit font-black tracking-widest text-white uppercase mb-2">
        {activeBox.name}
      </h2>

      <div className="mb-8">
        {activeBox.owned > 0 ? (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            STOCK: {activeBox.owned}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold tracking-wider bg-rose-500/10 text-rose-500 border border-rose-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            STOCK: 0
          </span>
        )}
      </div>

      <div className="flex items-center justify-center gap-4 sm:gap-8 mb-10">
        <button
          onClick={handlePrev}
          disabled={isOpening}
          className="w-11 h-11 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-slate-300 hover:bg-[#7a0aad] hover:text-white hover:scale-110 hover:border-transparent transition-all duration-200 cursor-pointer disabled:opacity-40"
          aria-label="Booster précédent"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-4 sm:gap-8">
          <div
            onClick={() => !isOpening && setSelectedBoxType(prevKey)}
            className="hidden md:flex flex-col items-center justify-center w-[150px] h-[230px] rounded-xl relative overflow-hidden cursor-pointer select-none opacity-25 hover:opacity-60 transition-all duration-300 scale-85 hover:scale-90"
          >
            <Image
              src={prevBox.image}
              alt={prevBox.name}
              width={150}
              height={230}
              className="w-full h-full object-contain filter drop-shadow-lg"
              unoptimized
            />
          </div>

          <div
            onClick={() => {
              if (!isOpening && activeBox.owned > 0) {
                onOpenPack();
              }
            }}
            className={`relative flex flex-col items-center justify-center w-[200px] h-[300px] sm:w-[220px] sm:h-[320px] rounded-2xl overflow-hidden select-none transition-all duration-300 z-10 ${
              activeBox.owned > 0 ? "cursor-pointer hover:scale-105" : ""
            }`}
            style={{
              boxShadow: `0 15px 35px ${activeBox.ringColor || "rgba(122, 10, 173, 0.35)"}`,
            }}
          >
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl z-20">
              <div
                className="absolute w-[200%] h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-[25deg] left-[-150%]"
                style={{ animation: "boosterShine 5s infinite" }}
              />
            </div>

            <Image
              src={activeBox.image}
              alt={activeBox.name}
              width={220}
              height={320}
              priority
              className="w-full h-full object-contain filter drop-shadow-2xl z-10 hover:brightness-110 transition-all duration-300"
              unoptimized
            />
          </div>

          <div
            onClick={() => !isOpening && setSelectedBoxType(nextKey)}
            className="hidden md:flex flex-col items-center justify-center w-[150px] h-[230px] rounded-xl relative overflow-hidden cursor-pointer select-none opacity-25 hover:opacity-60 transition-all duration-300 scale-85 hover:scale-90"
          >
            <Image
              src={nextBox.image}
              alt={nextBox.name}
              width={150}
              height={230}
              className="w-full h-full object-contain filter drop-shadow-lg"
              unoptimized
            />
          </div>
        </div>

        <button
          onClick={handleNext}
          disabled={isOpening}
          className="w-11 h-11 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-slate-300 hover:bg-[#7a0aad] hover:text-white hover:scale-110 hover:border-transparent transition-all duration-200 cursor-pointer disabled:opacity-40"
          aria-label="Booster suivant"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
        {activeBox.owned > 0 && !isOpening && (
          <button
            onClick={onOpenPack}
            disabled={isOpening || isBuying}
            className="px-8 py-4 rounded-full font-outfit font-black text-base text-white tracking-wider uppercase bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 shadow-[0_0_25px_rgba(168,85,247,0.5)] hover:shadow-[0_0_35px_rgba(168,85,247,0.8)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center gap-2.5 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-5 h-5 text-purple-200 animate-pulse" />
            <span>OUVRIR ({activeBox.owned})</span>
          </button>
        )}

        {!isLoggedIn ? (
          <button
            onClick={() => router.push("/api/auth/signin")}
            className="px-8 py-4 rounded-full font-outfit font-bold text-sm tracking-wider uppercase text-white bg-white/10 border border-white/15 hover:bg-white/15 transition-all duration-200 flex items-center gap-2 cursor-pointer"
          >
            <Lock className="w-4 h-4 text-slate-400" />
            <span>SE CONNECTER POUR ACHETER</span>
          </button>
        ) : coins < activeBox.price ? (
          <button
            onClick={() => router.push("/shop")}
            className="px-8 py-4 rounded-full font-outfit font-bold text-sm tracking-wider uppercase text-rose-400 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 transition-all duration-200 flex items-center gap-2 cursor-pointer"
          >
            <Lock className="w-4 h-4 text-rose-500" />
            <span>SOLDE INSUFFISANT ({coins}/{activeBox.price}) — RECHARGER</span>
          </button>
        ) : (
          <button
            onClick={() => onBuyBooster(selectedBoxType, activeBox.price)}
            disabled={isBuying || isOpening}
            className="px-8 py-4 rounded-full font-outfit font-extrabold text-base tracking-wider uppercase text-white bg-[#7a0aad] hover:bg-[#9213cc] shadow-[0_0_20px_rgba(122,10,173,0.4)] hover:shadow-[0_0_30px_rgba(122,10,173,0.6)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isBuying ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ACHAT EN COURS...
              </span>
            ) : (
              <>
                <span>ACHETER POUR</span>
                <span className="w-5 h-5 rounded-full bg-white/20 text-white font-black text-xs inline-flex items-center justify-center ml-0.5">
                  P
                </span>
                <span>{activeBox.price}</span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="flex items-center mb-5">
          <div className="flex-1 h-px bg-white/10" />
          <span className="px-4 text-xs font-black text-slate-400 tracking-widest uppercase">
            PROBABILITÉS D'OBTENTION
          </span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {activeBox.rates.map((rate: any, idx: number) => (
            <div
              key={idx}
              className="bg-black/30 border border-white/10 rounded-xl p-3.5 flex items-center justify-between text-xs font-bold"
            >
              <span className={rate.c || "text-slate-300"}>{rate.r.toUpperCase()}</span>
              <span className="font-mono font-black text-white/90">{rate.p}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

interface BoosterModalProps {
  isOpening: boolean;
  boosterStep: "idle" | "fetching" | "waiting_click" | "charging" | "exploding";
  openingGlow: string | null;
  selectedBoxType: string;
  activeBox: {
    glow: string;
    [key: string]: any;
  };
  onBoosterClick: () => void;
}

export default function BoosterModal({
  isOpening,
  boosterStep,
  openingGlow,
  selectedBoxType,
  activeBox,
  onBoosterClick,
}: BoosterModalProps) {
  if (!isOpening) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center backdrop-blur-3xl bg-[#05050a]/95 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[90vw] rounded-full blur-[180px] transition-all duration-1000 ${
            boosterStep === "charging"
              ? openingGlow === "MYTHIC"
                ? "bg-red-600/40 scale-125"
                : openingGlow === "LEGENDARY"
                ? "bg-yellow-500/40 scale-125"
                : "bg-purple-600/40 scale-125"
              : "bg-indigo-600/20 scale-100"
          }`}
        />
        {Array.from({ length: 35 }).map((_, i) => (
          <div
            key={i}
            className={`absolute rounded-full transition-colors duration-1000 ${
              boosterStep === "charging"
                ? openingGlow === "MYTHIC"
                  ? "bg-red-400/50"
                  : openingGlow === "LEGENDARY"
                  ? "bg-yellow-300/50"
                  : "bg-white/40"
                : "bg-white/20"
            }`}
            style={{
              width: `${Math.random() * 4 + 1}px`,
              height: `${Math.random() * 4 + 1}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <AnimatePresence>
        {boosterStep !== "idle" && (
          <motion.div
            className="relative flex flex-col items-center justify-center z-10"
            initial={{ y: -600, opacity: 0, scale: 0.5 }}
            animate={
              boosterStep === "waiting_click" || boosterStep === "fetching"
                ? {
                    y: [0, -12, 0],
                    opacity: 1,
                    scale: 1,
                    transition: {
                      y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                      opacity: { duration: 0.6 },
                      scale: { type: "spring", stiffness: 80, damping: 15 },
                    },
                  }
                : boosterStep === "charging"
                ? {
                    y: 0,
                    opacity: 1,
                    scale: 1,
                    rotate: 0,
                    transition: { duration: 1.6, ease: "easeInOut" },
                  }
                : {
                    scale: [1.2, 4],
                    opacity: [1, 0],
                    transition: { duration: 0.6, ease: "easeOut" },
                  }
            }
            exit={{ opacity: 0, scale: 0, transition: { duration: 0.3 } }}
            onClick={onBoosterClick}
            style={{ cursor: boosterStep === "waiting_click" ? "pointer" : "default" }}
          >
            <motion.div
              className="absolute w-[500px] h-[500px] rounded-full pointer-events-none -z-10"
              style={{
                background: `radial-gradient(circle, ${
                  boosterStep === "charging"
                    ? openingGlow === "MYTHIC"
                      ? "rgba(239,68,68,0.5)"
                      : "rgba(168,85,247,0.3)"
                    : activeBox.glow.includes("blue")
                    ? "rgba(59,130,246,0.25)"
                    : activeBox.glow.includes("purple")
                    ? "rgba(168,85,247,0.25)"
                    : activeBox.glow.includes("yellow")
                    ? "rgba(250,204,21,0.25)"
                    : "rgba(239,68,68,0.25)"
                } 0%, transparent 70%)`,
              }}
              animate={
                boosterStep === "charging"
                  ? { scale: [1, 1.4], opacity: [0.5, 1], transition: { duration: 1.6 } }
                  : { opacity: 0.4 }
              }
            />

            {boosterStep === "charging" && openingGlow === "MYTHIC" && (
              <>
                {Array.from({ length: 8 }).map((_, i) => (
                  <motion.div
                    key={`ray-${i}`}
                    className="absolute w-[2px] h-[300px] pointer-events-none -z-10 bg-gradient-to-t from-transparent via-red-500/80 to-transparent"
                    style={{ transformOrigin: "center center" }}
                    initial={{ opacity: 0, scaleY: 0, rotate: i * 45 }}
                    animate={{ opacity: [0, 1, 0.2], scaleY: [0, 1.5, 2], rotate: i * 45 + 30 }}
                    transition={{ duration: 1.6, ease: "easeOut" }}
                  />
                ))}
              </>
            )}

            <motion.div
              className="relative w-72 h-[430px] md:w-80 md:h-[480px] z-10 drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)] filter transition-transform duration-500 group-hover:scale-105"
              animate={
                boosterStep === "charging"
                  ? {
                      scale: [1, 0.95, 1.08, 0.95, 1.12, 1.2],
                      rotate: [0, -3, 3, -5, 5, -8, 8, 0],
                      transition: { duration: 1.6, ease: "easeInOut" },
                    }
                  : {}
              }
            >
              <Image
                src={
                  selectedBoxType === "standard"
                    ? "/StandardB.png"
                    : selectedBoxType === "premium"
                    ? "/PreniumB.png"
                    : selectedBoxType === "legendary"
                    ? "/LegendaireB.png"
                    : "/MythiqueB.png"
                }
                alt="Booster Pack"
                priority
                fill
                className="object-contain"
                sizes="320px"
                unoptimized
              />
            </motion.div>

            {boosterStep === "fetching" && (
              <div className="mt-10 text-slate-400 font-light tracking-[0.3em] text-xs sm:text-sm uppercase whitespace-nowrap animate-pulse">
                Chargement...
              </div>
            )}
            {boosterStep === "waiting_click" && (
              <div className="mt-10 flex flex-col items-center gap-2 pointer-events-none">
                <span className="text-white font-light uppercase tracking-[0.3em] text-base sm:text-lg whitespace-nowrap drop-shadow-md animate-pulse">
                  Toucher le booster pour l&apos;ouvrir
                </span>
                <span className="text-[11px] uppercase tracking-[0.4em] text-slate-400 font-light">
                  Cliquez pour l&apos;ouvrir
                </span>
              </div>
            )}
            {boosterStep === "charging" && (
              <div
                className={`mt-10 font-bold uppercase tracking-[0.5em] text-xs sm:text-sm whitespace-nowrap animate-pulse ${
                  openingGlow === "MYTHIC"
                    ? "text-red-400 drop-shadow-[0_0_20px_rgba(239,68,68,0.9)]"
                    : "text-purple-300 drop-shadow-[0_0_20px_rgba(168,85,247,0.9)]"
                }`}
              >
                Ouverture en cours...
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {boosterStep === "exploding" && (
        <motion.div
          className="fixed inset-0 z-[2010] bg-white pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.9, 0] }}
          transition={{ duration: 0.8, times: [0, 0.2, 0.5, 1], ease: "easeOut" }}
        />
      )}
    </div>
  );
}

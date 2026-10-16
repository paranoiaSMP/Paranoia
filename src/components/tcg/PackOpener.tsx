"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type PanInfo,
} from "framer-motion";
import { BoosterPackConfig } from "@/config/boosters";
import { TradingCard } from "@/types/cards";
import CardDisplay, { rarityKey } from "@/features/binder/components/CardDisplay";
import MythicFx from "./MythicFx";
import CardZoom from "./CardZoom";

export type OpenedCard = { card: TradingCard; effect: string | null };

interface PackOpenerProps {
  pack: BoosterPackConfig;
  load: () => Promise<OpenedCard[]>;
  onClose: () => void;
  onReplay?: () => void;
  replayLabel?: string;
  simulated: boolean;
}

type Phase = "intro" | "loading" | "deal" | "summary" | "error";

const RARITY_LABEL: Record<string, string> = {
  COMMON: "Commune",
  UNCOMMON: "Peu commune",
  RARE: "Rare",
  EPIC: "Épique",
  LEGENDARY: "Légendaire",
  MYTHIC: "Mythique",
};

const RARITY_FLASH: Record<string, string> = {
  EPIC: "#a855f7",
  LEGENDARY: "#f59e0b",
  MYTHIC: "#ef4444",
};

const SPRING = { type: "spring", bounce: 0, duration: 0.45 } as const;
const SPRING_THROW = { type: "spring", bounce: 0.15, duration: 0.5 } as const;

export function PackOpener({ pack, load, onClose, onReplay, replayLabel, simulated }: PackOpenerProps) {
  const reduce = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cardAreaRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<OpenedCard[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [exitDir, setExitDir] = useState(1);
  const [zoom, setZoom] = useState<OpenedCard | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const open = useCallback(async () => {
    if (phase !== "intro") return;
    setPhase("loading");
    try {
      const result = await load();
      if (result.length === 0) throw new Error("Aucune carte n'a été tirée.");
      setCards(result);
      setIndex(0);
      setFlipped(false);
      setPhase("deal");
    } catch (e) {
      setError(e instanceof Error ? e.message : "L'ouverture a échoué.");
      setPhase("error");
    }
  }, [phase, load]);

  const next = useCallback(
    (dir = 1) => {
      setExitDir(dir);
      if (index >= cards.length - 1) {
        setPhase("summary");
        return;
      }
      setIndex((i) => i + 1);
      setFlipped(false);
    },
    [index, cards.length]
  );

  const actOnTop = useCallback(() => {
    if (phase !== "deal") return;
    if (!flipped) {
      setFlipped(true);
      if (!reduce && cards[index] && rarityKey(cards[index].card.rarity) === "MYTHIC") navigator.vibrate?.([30, 50, 90]);
    }
    else next(1);
  }, [phase, flipped, next, reduce, cards, index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      const el = document.activeElement;
      const onControl = el && (el.tagName === "BUTTON" || el.tagName === "A");
      if ((e.key === " " || e.key === "Enter") && !onControl) {
        e.preventDefault();
        if (phase === "intro") open();
        else actOnTop();
      }
      if (e.key === "ArrowRight" && phase === "deal" && flipped) next(1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [phase, flipped, open, actOnTop, next, onClose]);

  const onPackDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y < -110 || info.velocity.y < -600) open();
  };

  const onCardDragEnd = (_: unknown, info: PanInfo) => {
    if (!flipped) return;
    const { offset, velocity } = info;
    if (Math.abs(offset.x) > 110 || Math.abs(velocity.x) > 500) {
      next(offset.x + velocity.x * 0.2 >= 0 ? 1 : -1);
    }
  };

  const current = cards[index];
  const currentRarity = current ? rarityKey(current.card.rarity) : "COMMON";
  const dramatic = currentRarity === "LEGENDARY" || currentRarity === "MYTHIC";
  const flash = RARITY_FLASH[currentRarity];
  const mythic = phase === "deal" && currentRarity === "MYTHIC" && !reduce;

  return (
    <motion.div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Ouverture du booster ${pack.name}`}
      tabIndex={-1}
      data-lenis-prevent
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[200] flex flex-col overflow-y-auto bg-black outline-none"
    >
      <div className="flex shrink-0 items-center justify-between px-5 py-4 md:px-10">
        <p className="text-sm text-zinc-400">
          Booster {pack.name}
          {simulated && <span className="text-violet-400"> · simulation</span>}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="press flex min-h-11 items-center rounded-md border border-zinc-800 px-4 text-sm font-medium text-white hover:border-white"
        >
          Fermer
        </button>
      </div>

      {mythic && <MythicFx key={`b-${index}`} layer="back" anchor={cardAreaRef} revealed={flipped} />}
      <div className="relative flex flex-1 flex-col items-center justify-center px-5 pb-10">
        <AnimatePresence mode="wait">
          {(phase === "intro" || phase === "loading") && (
            <motion.div
              key="pack"
              className="flex flex-col items-center gap-8"
              exit={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(-60vh) rotate(-6deg)" }}
              transition={SPRING}
            >
              <motion.div
                drag={phase === "intro" && !reduce ? "y" : false}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0.6, bottom: 0.1 }}
                onDragEnd={onPackDragEnd}
                animate={
                  phase === "loading" && !reduce
                    ? { y: -24, rotate: [0, -1.5, 1.5, -1, 0] }
                    : { y: 0, rotate: 0 }
                }
                transition={
                  phase === "loading"
                    ? { y: SPRING, rotate: { duration: 0.6, repeat: Infinity, ease: "easeInOut" } }
                    : SPRING
                }
                whileTap={phase === "intro" ? { scale: 0.98 } : undefined}
                className="relative aspect-[3/4] w-56 cursor-grab touch-none active:cursor-grabbing sm:w-72"
              >
                <Image src={pack.image} alt="" fill sizes="288px" className="pointer-events-none object-contain" priority draggable={false} />
              </motion.div>

              <div className="flex flex-col items-center gap-3 text-center">
                <p className="text-sm text-zinc-400" aria-live="polite">
                  {phase === "loading" ? "Ouverture…" : "Glisse le booster vers le haut pour l'ouvrir."}
                </p>
                <button type="button" onClick={open} disabled={phase === "loading"} className="btn-violet disabled:opacity-60">
                  {phase === "loading" ? "Ouverture…" : "Ouvrir"}
                </button>
              </div>
            </motion.div>
          )}

          {phase === "deal" && current && (
            <motion.div
              key="deal"
              className={`flex w-full flex-col items-center gap-8 ${mythic && flipped ? "mythic-shake" : ""}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <p className="text-sm tabular-nums text-zinc-400">
                Carte {index + 1} sur {cards.length}
              </p>

              <div ref={cardAreaRef} className="relative aspect-[2.5/3.5] w-[min(72vw,300px)]">
                {cards.slice(index + 1, index + 4).map((c, k) => (
                  <div
                    key={`${c.card.id}-${index + 1 + k}`}
                    aria-hidden
                    className="absolute inset-0 rounded-xl border border-zinc-800 bg-[#0b0b0d] transition-transform duration-300"
                    style={{
                      transform: `translateY(${(k + 1) * 10}px) scale(${1 - (k + 1) * 0.04})`,
                      zIndex: 3 - k,
                      transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
                    }}
                  />
                ))}

                {flipped && flash && !reduce && (
                  <motion.div
                    key={`flash-${index}`}
                    aria-hidden
                    className="pointer-events-none absolute -inset-10 z-0 rounded-[2rem]"
                    style={{ background: `radial-gradient(closest-side, ${flash}, transparent)` }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: [0, 0.9, 0.35], scale: [0.8, 1.1, 1] }}
                    transition={{ duration: 0.7, delay: dramatic ? 0.3 : 0.1, ease: [0.23, 1, 0.32, 1] }}
                  />
                )}

                <AnimatePresence custom={exitDir} initial={false}>
                  <motion.div
                    key={`${current.card.id}-${index}`}
                    custom={exitDir}
                    className="absolute inset-0 z-10 touch-none"
                    drag={flipped ? "x" : false}
                    dragSnapToOrigin
                    dragElastic={0.7}
                    onDragEnd={onCardDragEnd}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={
                      reduce
                        ? { opacity: 0 }
                        : {
                            x: exitDir * (typeof window !== "undefined" ? window.innerWidth : 800),
                            rotate: exitDir * 18,
                            opacity: 0,
                            transition: SPRING_THROW,
                          }
                    }
                    transition={SPRING}
                  >
                    <motion.button
                      type="button"
                      onClick={actOnTop}
                      aria-label={
                        flipped
                          ? `${current.card.title}, ${RARITY_LABEL[currentRarity]}. Carte suivante`
                          : `Retourner la carte ${index + 1}`
                      }
                      className="relative block h-full w-full cursor-pointer"
                      style={{ transformStyle: "preserve-3d", perspective: 1600 }}
                      animate={{ rotateY: flipped ? 0 : 180, scale: flipped ? 1 : dramatic ? 0.97 : 1 }}
                      initial={{ rotateY: 180 }}
                      transition={
                        reduce
                          ? { duration: 0.01 }
                          : { type: "spring", bounce: 0.12, duration: dramatic ? 0.9 : 0.6, delay: flipped && dramatic ? 0.25 : 0 }
                      }
                    >
                      <span
                        className="absolute inset-0 flex items-center justify-center rounded-xl border border-zinc-700 bg-[#0b0b0d]"
                        style={{ transform: "rotateY(180deg)", backfaceVisibility: "hidden" }}
                      >
                        <span className="text-lg font-bold tracking-tight text-zinc-300">Paranoia Studio</span>
                      </span>
                      <span className="absolute inset-0 block" style={{ backfaceVisibility: "hidden" }}>
                        <CardDisplay card={current.card} size="lg" specialEffect={current.effect} />
                      </span>
                    </motion.button>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="flex min-h-16 flex-col items-center gap-2 text-center" aria-live="polite">
                {flipped ? (
                  <>
                    <p className="text-lg font-semibold text-white">
                      {current.card.title} · <span className="text-violet-400">{RARITY_LABEL[currentRarity]}</span>
                      {current.effect && <span className="text-zinc-300"> · {current.effect}</span>}
                    </p>
                    <p className="text-sm text-zinc-400">Touche ou glisse la carte pour passer à la suivante.</p>
                  </>
                ) : (
                  <p className="text-sm text-zinc-400">Touche la carte pour la retourner.</p>
                )}
              </div>

              <button type="button" onClick={() => setPhase("summary")} className="text-sm text-zinc-400 underline-offset-4 hover:text-white hover:underline min-h-11">
                Tout révéler
              </button>
            </motion.div>
          )}

          {phase === "summary" && (
            <motion.div
              key="summary"
              className="flex w-full max-w-6xl flex-col items-center gap-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="text-3xl font-bold tracking-[-0.03em] text-white md:text-4xl">Ton tirage</h2>
              <ul className="grid w-full grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
                {cards.map((c, i) => (
                  <motion.li
                    key={`${c.card.id}-${i}`}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(16px)" }}
                    animate={{ opacity: 1, transform: "translateY(0px)" }}
                    transition={{ ...SPRING, delay: reduce ? 0 : i * 0.05 }}
                  >
                    <button type="button" onClick={() => setZoom(c)} aria-label={`Agrandir ${c.card.title}`} className="block w-full text-left">
                      <CardDisplay card={c.card} size="md" specialEffect={c.effect} />
                    </button>
                    <p className="mt-3 text-center text-sm text-zinc-300">
                      {RARITY_LABEL[rarityKey(c.card.rarity)]}
                      {c.effect && ` · ${c.effect}`}
                    </p>
                  </motion.li>
                ))}
              </ul>
              {simulated && (
                <p className="text-sm text-zinc-400">Simulation : ces cartes ne sont pas ajoutées à ta collection.</p>
              )}
              <div className="flex flex-col gap-3 sm:flex-row">
                {onReplay && (
                  <button type="button" onClick={onReplay} className="btn-violet">
                    {replayLabel ?? "Rouvrir"}
                  </button>
                )}
                <button type="button" onClick={onClose} className="btn-line">
                  Terminer
                </button>
              </div>
            </motion.div>
          )}

          {phase === "error" && (
            <motion.div
              key="error"
              role="alert"
              className="flex max-w-md flex-col items-center gap-6 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p className="text-2xl font-bold text-white">L&apos;ouverture n&apos;a pas marché.</p>
              <p className="text-zinc-300">{error}</p>
              <button type="button" onClick={onClose} className="btn-line">
                Fermer
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>{zoom && <CardZoom card={zoom.card} effect={zoom.effect} onClose={() => setZoom(null)} />}</AnimatePresence>
      {mythic && <MythicFx key={`f-${index}`} layer="front" anchor={cardAreaRef} revealed={flipped} />}
    </motion.div>
  );
}

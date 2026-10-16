"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import CardDisplay, { rarityKey } from "@/features/binder/components/CardDisplay";
import type { TradingCard } from "@/types/cards";
import { cardValue } from "@/lib/cardValue";

export const RARITY_LABEL: Record<string, string> = {
  COMMON: "Commune",
  UNCOMMON: "Peu commune",
  RARE: "Rare",
  EPIC: "Épique",
  LEGENDARY: "Légendaire",
  MYTHIC: "Mythique",
};

// Teinte du halo derrière la carte, par rareté.
const TINT: Record<string, string> = { COMMON: "#71717a", UNCOMMON: "#22c55e", RARE: "#3b82f6", EPIC: "#a855f7", LEGENDARY: "#f59e0b", MYTHIC: "#ef4444" };

type Props = {
  card: TradingCard;
  effect?: string | null;
  count?: number;
  obtainedAt?: string;
  onClose: () => void;
  sell?: { price: number; onSell: () => Promise<string | null> };
};

export default function CardZoom({ card, effect, count, obtainedAt, onClose, sell }: Props) {
  const reduce = useReducedMotion();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sellError, setSellError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus();
    };
  }, [onClose]);

  const key = rarityKey(card.rarity);
  const tint = TINT[key] ?? TINT.COMMON;
  const rows: [string, string][] = [
    ["Édition", card.edition],
    ["Niveau", card.level],
    ["Valeur", `${cardValue(card.rarity, effect)} Paracoin`],
    ...(effect ? ([["Effet", effect]] as [string, string][]) : []),
    ...(card.player?.minecraftName ? ([["Joueur", card.player.minecraftName]] as [string, string][]) : []),
    ...(count && count > 1 ? ([["Exemplaires", `×${count}`]] as [string, string][]) : []),
    ...(obtainedAt ? ([["Obtenue le", new Date(obtainedAt).toLocaleDateString("fr-FR")]] as [string, string][]) : []),
  ];
  const ease = [0.23, 1, 0.32, 1] as const;

  return (
    <motion.div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={card.title}
      tabIndex={-1}
      data-lenis-prevent
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[220] flex items-start justify-center overflow-y-auto bg-black/90 p-4 outline-none md:items-center md:p-8"
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "scale(0.96) translateY(12px)" }}
        animate={{ opacity: 1, transform: "scale(1) translateY(0px)" }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.28, ease }}
        className="relative grid w-full max-w-5xl overflow-hidden rounded-xl border border-zinc-800 bg-[#09090b] md:grid-cols-[minmax(0,26rem)_1fr]"
      >
        <button type="button" onClick={onClose} aria-label="Fermer" className="absolute right-3 top-3 z-10 grid size-11 place-items-center rounded-full bg-black/60 text-xl text-white hover:bg-black focus-visible:outline-2 focus-visible:outline-white">
          <span aria-hidden>×</span>
        </button>

        <div className="relative flex items-center justify-center px-8 py-10 md:py-14" style={{ background: `radial-gradient(ellipse at 50% 45%, ${tint}55 0%, ${tint}14 45%, transparent 75%)` }}>
          <motion.div
            initial={reduce ? false : { opacity: 0, transform: "scale(0.9) rotate(-2deg)" }}
            animate={{ opacity: 1, transform: "scale(1) rotate(0deg)" }}
            transition={{ type: "spring", bounce: 0.18, duration: 0.6, delay: 0.05 }}
            className="w-[min(70vw,320px)]"
          >
            <CardDisplay card={card} size="lg" specialEffect={effect ?? null} />
          </motion.div>
        </div>

        <div className="flex flex-col gap-6 p-6 md:p-10">
          <div className="pr-12">
            <p className="text-sm font-semibold" style={{ color: tint }}>{RARITY_LABEL[key]}</p>
            <h2 className="mt-1 text-4xl font-extrabold tracking-[-0.04em] text-white md:text-5xl">{card.title}</h2>
          </div>
          {card.description && <p className="max-w-prose text-base leading-relaxed text-zinc-300">{card.description}</p>}
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-zinc-800 bg-zinc-800">
            {rows.map(([k, v]) => (
              <div key={k} className="bg-[#09090b] p-4">
                <dt className="text-sm text-zinc-400">{k}</dt>
                <dd className="mt-0.5 break-words text-lg font-semibold text-white">{v}</dd>
              </div>
            ))}
          </dl>
          {sell && (
            <div className="flex flex-col items-start gap-3 rounded-lg border border-zinc-800 p-4">
              <p className="text-sm text-zinc-300">Tu en as plusieurs : le serveur rachète ce doublon {sell.price} Paracoin.</p>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  if (!confirming) return setConfirming(true);
                  setBusy(true);
                  const err = await sell.onSell();
                  setBusy(false);
                  if (err) { setSellError(err); setConfirming(false); } else onClose();
                }}
                className={confirming ? "btn-violet disabled:opacity-60" : "btn-line"}
              >
                {busy ? "Vente en cours…" : confirming ? `Confirmer la vente : +${sell.price} Paracoin` : `Vendre ce doublon, +${sell.price}`}
              </button>
              {sellError && <p role="alert" className="text-sm text-red-400">{sellError}</p>}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

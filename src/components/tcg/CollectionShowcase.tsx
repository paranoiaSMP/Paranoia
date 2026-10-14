"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import CardDisplay from "@/features/binder/components/CardDisplay";
import type { TradingCard } from "@/types/cards";
import { EASE_OUT } from "@/lib/motion";
import { useRealtime } from "@/lib/realtime/client";

type State = { status: "loading" } | { status: "error" } | { status: "ready"; cards: TradingCard[] };

export default function CollectionShowcase() {
  const reduce = useReducedMotion();
  const [state, setState] = useState<State>({ status: "loading" });

  const load = useCallback(() => {
    let alive = true;
    fetch("/api/cards")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((cards: TradingCard[]) => {
        if (alive) setState({ status: "ready", cards: cards.filter((c) => c.isPublished !== false).slice(0, 12) });
      })
      .catch(() => alive && setState((s) => (s.status === "ready" ? s : { status: "error" })));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => load(), [load]);
  useRealtime("cards", load);

  return (
    <section className="border-b border-zinc-900">
      <div className="mx-auto max-w-7xl px-5 pt-16 md:px-10 md:pt-24">
        <h2 className="text-4xl font-bold tracking-[-0.03em] md:text-5xl">La collection</h2>
        <p className="mt-4 max-w-lg text-zinc-300">Les cartes que tu peux tirer. Passe la souris dessus.</p>
      </div>

      {state.status === "loading" && (
        <div role="status" className="flex gap-6 overflow-hidden px-5 py-12 md:px-10">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-[2.5/3.5] w-56 shrink-0 animate-pulse rounded-xl bg-zinc-900" />
          ))}
          <span className="sr-only">Chargement de la collection</span>
        </div>
      )}

      {state.status === "error" && (
        <p role="alert" className="mx-auto max-w-7xl px-5 py-12 text-zinc-400 md:px-10">
          Impossible de charger la collection pour l&apos;instant.
        </p>
      )}

      {state.status === "ready" && state.cards.length === 0 && (
        <p className="mx-auto max-w-7xl px-5 py-12 text-zinc-400 md:px-10">Aucune carte publiée pour le moment.</p>
      )}

      {state.status === "ready" && state.cards.length > 0 && (
        <ul
          data-lenis-prevent
          className="flex snap-x snap-mandatory gap-6 overflow-x-auto px-5 py-12 [scrollbar-width:none] md:px-10"
        >
          {state.cards.map((card, i) => (
            <motion.li
              key={card.id}
              className="w-56 shrink-0 snap-start sm:w-64"
              initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(24px)" }}
              whileInView={{ opacity: 1, transform: "translateY(0px)" }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: reduce ? 0.2 : 0.6, ease: EASE_OUT, delay: reduce ? 0 : Math.min(i, 6) * 0.06 }}
            >
              <CardDisplay card={card} size="md" />
            </motion.li>
          ))}
        </ul>
      )}
    </section>
  );
}

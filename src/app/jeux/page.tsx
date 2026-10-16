"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import SplitReveal from "@/components/motion/SplitReveal";
import Reveal from "@/components/common/Reveal";
import { getNumberColor } from "@/lib/games/rouletteTypes";

type Live = { phase: string; countdown: number; startedAt: number | null; history: number[]; crashPoint?: number | null };

function useLive(url: string) {
  const [live, setLive] = useState<Live | null>(null);
  useEffect(() => {
    const es = new EventSource(url);
    const full = (e: MessageEvent) => setLive(JSON.parse(e.data));
    es.addEventListener("INIT", full);
    es.addEventListener("PHASE_CHANGE", full);
    es.addEventListener("TICK", (e) => {
      const { countdown } = JSON.parse((e as MessageEvent).data);
      setLive((l) => (l ? { ...l, countdown } : l));
    });
    const end = (e: Event) => {
      const d = JSON.parse((e as MessageEvent).data);
      setLive((l) => (l ? { ...l, phase: e.type === "CRASHED" ? "CRASHED" : "RESOLVED", history: d.history, crashPoint: d.crashPoint } : l));
    };
    es.addEventListener("CRASHED", end);
    es.addEventListener("RESOLVED", end);
    es.addEventListener("SPIN", () => setLive((l) => (l ? { ...l, phase: "SPINNING" } : l)));
    return () => es.close();
  }, [url]);
  return live;
}

function LiveDot() {
  return (
    <span className="relative flex h-2.5 w-2.5" aria-hidden>
      <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-violet-400" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-violet-400" />
    </span>
  );
}

const lift = { transform: "translateY(-6px)" };

export default function GamesHub() {
  const reduce = useReducedMotion();
  const crash = useLive("/api/games/crash/events");
  const roulette = useLive("/api/games/roulette/events");

  const crashStatus = !crash
    ? "Connexion…"
    : crash.phase === "BETTING"
    ? `Départ dans ${crash.countdown.toFixed(1)}s`
    : crash.phase === "FLYING"
    ? "En vol"
    : `Crash à ×${(crash.crashPoint ?? crash.history[0] ?? 1).toFixed(2)}`;

  const rouletteStatus = !roulette
    ? "Connexion…"
    : roulette.phase === "BETTING"
    ? `Tirage dans ${roulette.countdown.toFixed(1)}s`
    : roulette.phase === "SPINNING"
    ? "La roue tourne"
    : `Sorti : ${roulette.history[0]}`;

  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-16 md:px-10 md:pt-24">
      <SplitReveal
        lines={[<>Jeux<span key="d" className="text-violet-400">.</span></>]}
        className="text-[clamp(3.5rem,12vw,9rem)] font-extrabold leading-[0.9] tracking-[-0.045em] text-white"
      />
      <p className="mt-8 max-w-xl text-lg leading-relaxed text-zinc-300">
        Joue tes ParaCoins. Deux tables en direct avec toute la communauté, deux parties en solo.
      </p>

      <h2 className="mt-20 flex items-center gap-3 text-sm font-semibold text-zinc-300">
        <LiveDot /> En direct
      </h2>
      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
        {[
          { href: "/jeux/crash", title: "Crash", text: "Le multiplicateur grimpe. Encaisse avant le crash.", status: crashStatus, history: (crash?.history ?? []).slice(0, 6).map((h) => ({ k: `${h}`, label: `×${h.toFixed(2)}`, cls: h >= 2 ? "bg-violet-950 text-violet-300" : "bg-zinc-900 text-zinc-300" })) },
          { href: "/jeux/roulette", title: "Roulette", text: "Rouge, noir ou vert. Le vert paie ×14.", status: rouletteStatus, history: (roulette?.history ?? []).slice(0, 8).map((n) => ({ k: `${n}`, label: `${n}`, cls: getNumberColor(n) === "red" ? "bg-red-600 text-white" : getNumberColor(n) === "green" ? "bg-emerald-700 text-white" : "bg-zinc-800 text-white" })) },
        ].map((g, i) => (
          <Reveal key={g.href} delay={i * 0.06}>
            <motion.div whileHover={reduce ? undefined : lift} transition={{ type: "spring", bounce: 0, duration: 0.3 }}>
              <Link href={g.href} className="flex min-h-72 flex-col justify-between rounded-md border border-zinc-800 bg-[#0b0b0d] p-6 transition-colors duration-200 hover:border-zinc-600 md:p-8">
                <div>
                  <p className="text-sm font-medium tabular-nums text-violet-400" aria-live="off">
                    {g.status}
                  </p>
                  <h3 className="mt-3 text-5xl font-extrabold tracking-[-0.04em] text-white md:text-6xl">{g.title}</h3>
                  <p className="mt-3 max-w-sm text-zinc-300">{g.text}</p>
                </div>
                <div className="mt-8 flex min-h-7 flex-wrap gap-1.5">
                  {g.history.map((h, j) => (
                    <span key={`${h.k}-${j}`} className={`rounded-sm px-2 py-1 text-xs font-semibold tabular-nums ${h.cls}`}>
                      {h.label}
                    </span>
                  ))}
                </div>
              </Link>
            </motion.div>
          </Reveal>
        ))}
      </div>

      <h2 className="mt-20 text-sm font-semibold text-zinc-300">En solo</h2>
      <ul className="mt-6 divide-y divide-zinc-900 border-y border-zinc-900">
        {[
          { href: "/jeux/mines", title: "Mines", text: "Grille de 25 cases. Évite les mines, encaisse quand tu veux.", meta: "Mise jusqu'à 5 000 PC" },
          { href: "/jeux/blackjack", title: "Blackjack", text: "Toi contre le croupier. Blackjack payé 3 pour 2.", meta: "Mise jusqu'à 50 000 PC" },
        ].map((g, i) => (
          <li key={g.href}>
            <Reveal delay={i * 0.06}>
              <Link href={g.href} className="group flex min-h-28 flex-col justify-center gap-2 py-6 sm:flex-row sm:items-center sm:gap-10">
                <span className="w-56 shrink-0 text-4xl font-extrabold tracking-[-0.04em] text-white transition-transform duration-200 ease-out [@media(hover:hover)_and_(pointer:fine)]:group-hover:translate-x-2">
                  {g.title}
                </span>
                <span className="flex-1 text-zinc-300">{g.text}</span>
                <span className="text-sm text-zinc-400">{g.meta}</span>
                <span aria-hidden className="hidden text-2xl text-violet-400 transition-transform duration-200 ease-out sm:block [@media(hover:hover)_and_(pointer:fine)]:group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </Reveal>
          </li>
        ))}
      </ul>

      <h2 className="mt-20 text-sm font-semibold text-zinc-300">Entre joueurs</h2>
      <div className="mt-6 border-y border-zinc-900">
        <Link href="/jeux/echanges" className="group flex min-h-28 flex-col justify-center gap-2 py-6 sm:flex-row sm:items-center sm:gap-10">
          <span className="w-56 shrink-0 text-4xl font-extrabold tracking-[-0.04em] text-white transition-transform duration-200 ease-out [@media(hover:hover)_and_(pointer:fine)]:group-hover:translate-x-2">Échanges</span>
          <span className="flex-1 text-zinc-300">Échange tes cartes TCG avec les autres joueurs.</span>
          <span className="text-sm text-zinc-400">Cartes contre cartes</span>
          <span aria-hidden className="hidden text-2xl text-violet-400 transition-transform duration-200 ease-out sm:block [@media(hover:hover)_and_(pointer:fine)]:group-hover:translate-x-1">→</span>
        </Link>
        <Link href="/jeux/fusion" className="group flex min-h-28 flex-col justify-center gap-2 py-6 sm:flex-row sm:items-center sm:gap-10">
          <span className="w-56 shrink-0 text-4xl font-extrabold tracking-[-0.04em] text-white transition-transform duration-200 ease-out [@media(hover:hover)_and_(pointer:fine)]:group-hover:translate-x-2">Fusion</span>
          <span className="flex-1 text-zinc-300">Monte l'effet de tes cartes et fabrique des cartes exclusives.</span>
          <span className="text-sm text-zinc-400">Effets et recettes</span>
          <span aria-hidden className="hidden text-2xl text-violet-400 transition-transform duration-200 ease-out sm:block [@media(hover:hover)_and_(pointer:fine)]:group-hover:translate-x-1">→</span>
        </Link>
      </div>
    </div>
  );
}

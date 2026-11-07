"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { getPlayerSkinUrl } from "@/lib/skin";
import SkinPose from "@/features/profile/SkinPose";
import { EASE_OUT } from "@/lib/motion";

type Row = { name: string; uuid: string | null; customSkinUrl: string | null; level: number; cards: number };
type Result = { total: number; pages: number; players: Row[] };

const PER_PAGE = 24;
const MEDAL = ["#fbbf24", "#d4d4d8", "#d97706"];
const SORTS = [
  { key: "xp", label: "Niveau" },
  { key: "cartes", label: "Cartes" },
  { key: "recents", label: "Récents" },
];

export default function Players() {
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("xp");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Result | null>(null);
  const [error, setError] = useState(false);
  const reduce = useReducedMotion();

  // Recherche différée pour ne pas interroger l'API à chaque frappe.
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let alive = true;
    setError(false);
    fetch(`/api/joueurs?q=${encodeURIComponent(query)}&tri=${sort}&page=${page}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Result) => alive && setData(d))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [query, sort, page]);

  const href = (p: Row) => `/joueur/${encodeURIComponent(p.name)}`;
  const skin = (p: Row) => getPlayerSkinUrl({ uuid: p.uuid, minecraftName: p.name, customSkinUrl: p.customSkinUrl });
  // Le podium montre le corps entier ; un pseudo sans compte Mojang retombe sur Steve au lieu d'une image cassée.
  const steve = (e: React.SyntheticEvent<HTMLImageElement>, t: "full" | "bust") => {
    if (!e.currentTarget.src.includes("/Steve.png")) e.currentTarget.src = `https://vzge.me/${t}/512/Steve.png`;
  };
  const showPodium = !!data && sort === "xp" && page === 1 && !query && data.players.length >= 3;
  const podium = showPodium ? data.players.slice(0, 3) : [];
  const rest = data ? data.players.slice(podium.length) : [];

  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-12 md:px-10 md:pt-16">
      <h1 className="text-5xl font-extrabold tracking-[-0.045em] text-white md:text-7xl">Joueurs.</h1>
      <p className="mt-3 text-zinc-300">{data ? `${data.total} profil${data.total > 1 ? "s" : ""} dans la communauté.` : "Chargement…"}</p>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Chercher un pseudo"
          aria-label="Chercher un pseudo"
          maxLength={16}
          className="min-h-11 w-full rounded-sm border border-zinc-800 bg-zinc-950 px-4 text-white placeholder:text-zinc-500 focus:border-violet-400 focus:outline-none sm:max-w-sm"
        />
        <div role="group" aria-label="Trier par" className="flex gap-2">
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              aria-pressed={sort === s.key}
              onClick={() => {
                setSort(s.key);
                setPage(1);
              }}
              className={`min-h-11 rounded-sm border px-4 text-sm transition-colors ${sort === s.key ? "border-violet-400 text-white" : "border-zinc-800 text-zinc-400 hover:text-white"}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p role="alert" className="mt-10 text-zinc-300">Impossible de charger les joueurs. Réessaie dans un instant.</p>}
      {data && data.players.length === 0 && <p className="mt-10 text-zinc-300">Aucun joueur ne correspond à « {query} ».</p>}
      {!data && !error && (
        <div aria-hidden className="mt-10">
          {/* Podium : 2e, 1er, 3e avec leur socle */}
          <div className="flex items-end justify-center gap-3">
            {[{ h: "h-24", sock: "h-20" }, { h: "h-32", sock: "h-32" }, { h: "h-20", sock: "h-14" }].map((c, i) => (
              <div key={i} className="flex w-28 flex-col items-center gap-2 sm:w-36">
                <div className="h-3 w-3/4 animate-pulse rounded bg-zinc-900" />
                <div className={`${c.h} w-14 animate-pulse rounded-md bg-zinc-900`} />
                <div className={`${c.sock} w-full animate-pulse rounded-t-md bg-zinc-900`} />
              </div>
            ))}
          </div>
          <ul className="mt-8 flex flex-col gap-2">
            {Array.from({ length: 6 }, (_, i) => (
              <li key={i} className="flex h-16 items-center gap-4 rounded-xl border border-zinc-900 bg-zinc-950 px-4" style={{ opacity: 1 - i * 0.14 }}>
                <div className="size-4 animate-pulse rounded bg-zinc-900" />
                <div className="size-10 animate-pulse rounded bg-zinc-900" />
                <div className="flex flex-1 flex-col gap-2">
                  <div className="h-3 w-32 animate-pulse rounded bg-zinc-900" />
                  <div className="h-2 w-20 animate-pulse rounded bg-zinc-900" />
                </div>
                <div className="h-6 w-16 animate-pulse rounded-md bg-zinc-900" />
              </li>
            ))}
          </ul>
        </div>
      )}

      {podium.length > 0 && (
        <div className="mt-12">
          {/* Podium : 2e, 1er, 3e ; le socle le plus haut porte le premier. */}
          <ol className="flex items-end justify-center gap-2 sm:gap-4">
            {[1, 0, 2].map((i) => {
              const p = podium[i];
              const block = ["h-28 sm:h-36", "h-20 sm:h-24", "h-14 sm:h-16"][i];
              return (
                <motion.li
                  key={p.name}
                  className="w-28 sm:w-44"
                  // Le 3e arrive d'abord, le 1er en dernier ; le 1er flotte ensuite doucement.
                  initial={reduce ? false : { opacity: 0, transform: "translateY(48px)" }}
                  animate={{ opacity: 1, transform: "translateY(0px)" }}
                  transition={{ duration: 0.6, ease: EASE_OUT, delay: [0.5, 0.8, 0.2][i] }}
                >
                  <Link href={href(p)} className="group flex flex-col items-center">
                    <span className="max-w-full truncate text-sm font-bold text-white sm:text-lg">{p.name}</span>
                    <span className="text-xs text-zinc-400">Niv. {p.level}</span>
                    <SkinPose skinUrl={p.customSkinUrl ?? `https://mc-heads.net/skin/${encodeURIComponent(p.uuid ?? p.name)}`} pose={i === 0 ? "winner" : "cheering"} className={`mt-2 h-auto -mb-[40%] transition-transform duration-300 group-hover:-translate-y-1 ${i === 0 ? "w-28 sm:w-44" : "w-24 sm:w-40"}`} />
                    <span
                      className={`flex w-full items-start justify-center rounded-t-md border border-b-0 border-zinc-800 pt-2 text-3xl font-extrabold tabular-nums sm:text-5xl ${block}`}
                      style={{ color: MEDAL[i], background: "linear-gradient(to bottom, #16161a, #0b0b0d)" }}
                    >
                      {i + 1}
                    </span>
                  </Link>
                </motion.li>
              );
            })}
          </ol>
          {/* Plateau en perspective sous le podium */}
          <motion.div aria-hidden initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} className="mx-auto h-10 max-w-5xl border-t border-zinc-800 bg-gradient-to-b from-zinc-900 to-transparent [clip-path:polygon(4%_0,96%_0,100%_100%,0_100%)]" />
        </div>
      )}

      <div className="mt-6 hidden grid-cols-[3rem_minmax(0,1fr)_6rem_6rem] gap-4 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-400 sm:grid">
        <span>#</span>
        <span>Joueur</span>
        <span className="text-right">Niveau</span>
        <span className="text-right">Cartes</span>
      </div>
      <ul className="mt-2 flex flex-col gap-2">
        {rest.map((p, i) => (
          <motion.li
            key={p.name}
            initial={reduce ? false : { opacity: 0, transform: "translateY(8px)" }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            transition={{ duration: 0.25, ease: EASE_OUT, delay: Math.min(i, 12) * 0.03 }}
          >
            <Link href={href(p)} className="group grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 transition-colors hover:border-violet-400 sm:grid-cols-[3rem_minmax(0,1fr)_6rem_6rem] sm:gap-4">
              <span className="text-sm font-semibold tabular-nums text-zinc-400">{(page - 1) * PER_PAGE + podium.length + i + 1}</span>
              <span className="flex min-w-0 items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={skin(p)} onError={(e) => steve(e, "bust")} alt="" loading="lazy" className="size-12 shrink-0 object-contain transition-transform duration-200 group-hover:scale-110" />
                <span className="truncate font-semibold text-white">{p.name}</span>
              </span>
              <span className="text-right text-sm font-semibold tabular-nums text-white">Niv. {p.level}</span>
              <span className="hidden text-right text-sm tabular-nums text-zinc-300 sm:block">{p.cards}</span>
            </Link>
          </motion.li>
        ))}
      </ul>

      {data && data.pages > 1 && (
        <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-4">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="btn-line disabled:opacity-40">
            Précédent
          </button>
          <span className="text-sm text-zinc-400">
            Page {page} sur {data.pages}
          </span>
          <button type="button" disabled={page >= data.pages} onClick={() => setPage(page + 1)} className="btn-line disabled:opacity-40">
            Suivant
          </button>
        </nav>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { getPlayerSkinUrl } from "@/lib/skin";
import { EASE_OUT } from "@/lib/motion";

type Row = { name: string; uuid: string | null; customSkinUrl: string | null; level: number; cards: number };
type Result = { total: number; pages: number; players: Row[] };

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
        <ul aria-hidden className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }, (_, i) => <li key={i} className="h-20 animate-pulse rounded-xl bg-zinc-900" />)}
        </ul>
      )}

      {podium.length > 0 && (
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {podium.map((p, i) => (
            <li key={p.name} className={i === 0 ? "md:order-2" : i === 1 ? "md:order-1" : "md:order-3"}>
              <Link href={href(p)} className={`group relative flex h-full flex-col items-center overflow-hidden rounded-2xl border bg-[#09090b] px-5 pb-5 pt-8 transition-colors hover:border-white/40 ${i === 0 ? "border-amber-400/60 md:pt-12" : "border-zinc-800"}`}>
                <div aria-hidden className="absolute inset-x-8 top-6 h-32 rounded-full blur-3xl" style={{ background: MEDAL[i], opacity: 0.22 }} />
                <span className="absolute left-4 top-3 text-5xl font-extrabold tracking-[-0.05em] tabular-nums" style={{ color: MEDAL[i] }}>{i + 1}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={skin(p)} alt="" className={`relative object-contain transition-transform duration-300 group-hover:scale-105 ${i === 0 ? "size-40" : "size-32"}`} />
                <span className="mt-3 max-w-full truncate text-xl font-bold text-white">{p.name}</span>
                <span className="text-sm text-zinc-400">Niveau {p.level} · {p.cards} carte{p.cards > 1 ? "s" : ""}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}

      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((p, i) => (
          <motion.li
            key={p.name}
            initial={reduce ? false : { opacity: 0, transform: "translateY(8px)" }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            transition={{ duration: 0.25, ease: EASE_OUT, delay: Math.min(i, 12) * 0.03 }}
          >
            <Link href={href(p)} className="group flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-950 p-3 transition-colors hover:border-violet-400">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={skin(p)} alt="" loading="lazy" className="size-14 shrink-0 object-contain transition-transform duration-200 group-hover:scale-110" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-white">{p.name}</span>
                <span className="text-xs text-zinc-400">{p.cards} carte{p.cards > 1 ? "s" : ""}</span>
              </span>
              <span className="shrink-0 rounded-md bg-zinc-900 px-2.5 py-1 text-sm font-semibold tabular-nums text-white">Niv. {p.level}</span>
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

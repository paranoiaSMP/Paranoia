"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getPlayerSkinUrl } from "@/lib/skin";

type Row = { name: string; uuid: string | null; customSkinUrl: string | null; level: number; cards: number };
type Result = { total: number; pages: number; players: Row[] };

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

      <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {data?.players.map((p) => (
          <li key={p.name}>
            <Link href={`/joueur/${encodeURIComponent(p.name)}`} className="group flex flex-col items-center gap-3 rounded-sm border border-zinc-800 bg-zinc-950 p-4 transition-colors hover:border-violet-400">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={getPlayerSkinUrl({ uuid: p.uuid, minecraftName: p.name, customSkinUrl: p.customSkinUrl })} alt="" loading="lazy" className="h-24 w-24 object-contain" />
              <span className="max-w-full truncate font-semibold text-white">{p.name}</span>
              <span className="text-xs text-zinc-400">
                Niv. {p.level} · {p.cards} carte{p.cards > 1 ? "s" : ""}
              </span>
            </Link>
          </li>
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

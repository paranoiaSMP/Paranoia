"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import CardZoom from "@/components/tcg/CardZoom";
import CardDisplay, { rarityKey } from "@/features/binder/components/CardDisplay";
import AnimatedNumber from "@/components/motion/AnimatedNumber";
import type { TradingCard } from "@/types/cards";
import { EASE_OUT } from "@/lib/motion";
import { sellPrice } from "@/lib/cardValue";

type Owned = { id: string; obtainedAt: string; specialEffect: string | null; tradingCard: TradingCard };
type Data = { owned: Owned[]; total: number; showcase: string[] };

const RARITIES = [
  { key: "MYTHIC", label: "Mythique" },
  { key: "LEGENDARY", label: "Légendaire" },
  { key: "EPIC", label: "Épique" },
  { key: "RARE", label: "Rare" },
  { key: "UNCOMMON", label: "Peu commune" },
  { key: "COMMON", label: "Commune" },
];
const RANK: Record<string, number> = { MYTHIC: 6, LEGENDARY: 5, EPIC: 4, RARE: 3, UNCOMMON: 2, COMMON: 1 };

export default function CollectionPage() {
  const { data: session, status } = useSession();
  const reduce = useReducedMotion();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(false);
  const [rarity, setRarity] = useState("ALL");
  const [edition, setEdition] = useState("ALL");
  const [sort, setSort] = useState<"recent" | "rarity">("recent");
  const [zoom, setZoom] = useState<{ card: TradingCard; effect: string | null; count: number; last: string; ids: string[] } | null>(null);

  const load = async () => {
    setError(false);
    try {
      const res = await fetch("/api/user/collection", { cache: "no-store" });
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      setError(true);
    }
  };

  useEffect(() => {
    if (status !== "authenticated") return;
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [status]);

  const groups = useMemo(() => {
    const map = new Map<string, { card: TradingCard; effect: string | null; count: number; last: string; ids: string[] }>();
    for (const o of data?.owned ?? []) {
      const k = `${o.tradingCard.id}:${o.specialEffect ?? ""}`;
      const g = map.get(k);
      if (g) {
        g.count++;
        g.ids.push(o.id);
        if (o.obtainedAt > g.last) g.last = o.obtainedAt;
      } else map.set(k, { card: o.tradingCard, effect: o.specialEffect, count: 1, last: o.obtainedAt, ids: [o.id] });
    }
    return [...map.values()];
  }, [data]);

  const copies = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of data?.owned ?? []) m.set(o.tradingCard.id, (m.get(o.tradingCard.id) ?? 0) + 1);
    return m;
  }, [data]);

  const dupes = useMemo(() => {
    const by = new Map<string, number[]>();
    for (const o of data?.owned ?? []) by.set(o.tradingCard.id, [...(by.get(o.tradingCard.id) ?? []), sellPrice(o.tradingCard.rarity, o.specialEffect)]);
    let n = 0, gold = 0;
    for (const v of by.values()) {
      v.sort((a, b) => b - a);
      n += v.length - 1;
      gold += v.slice(1).reduce((a, b) => a + b, 0);
    }
    return { n, gold };
  }, [data]);
  const [sellAll, setSellAll] = useState<"idle" | "confirm" | "busy">("idle");
  const [sellMsg, setSellMsg] = useState<string | null>(null);
  const doSellAll = async () => {
    setSellAll("busy");
    const res = await fetch("/api/cards/sell", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) });
    const j = (await res.json().catch(() => null)) as { error?: string; sold?: number; gained?: number } | null;
    setSellMsg(res.ok ? `${j?.sold} doublons vendus, +${j?.gained} Paracoin.` : (j?.error ?? "La vente a échoué."));
    setSellAll("idle");
    if (res.ok) await load();
  };

  const sellZoom = async (id: string): Promise<string | null> => {
    const res = await fetch("/api/cards/sell", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [id] }) });
    if (!res.ok) return ((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "La vente a échoué.";
    await load();
    return null;
  };

  const editions = useMemo(() => [...new Set(groups.map((g) => g.card.edition))].sort(), [groups]);
  const distinct = useMemo(() => new Set(groups.map((g) => g.card.id)).size, [groups]);

  const shown = groups
    .filter((g) => (rarity === "ALL" || rarityKey(g.card.rarity) === rarity) && (edition === "ALL" || g.card.edition === edition))
    .sort((a, b) =>
      sort === "rarity"
        ? (RANK[rarityKey(b.card.rarity)] ?? 0) - (RANK[rarityKey(a.card.rarity)] ?? 0) || b.last.localeCompare(a.last)
        : b.last.localeCompare(a.last)
    );

  if (status === "loading") return <div role="status" className="mx-auto h-96 max-w-7xl animate-pulse px-5 md:px-10" />;

  if (!session) {
    return (
      <div className="mx-auto flex min-h-[70svh] max-w-7xl flex-col justify-center gap-6 px-5 md:px-10">
        <h1 className="text-5xl font-extrabold tracking-[-0.045em] text-white md:text-7xl">Ma collection</h1>
        <p className="max-w-md text-lg text-zinc-300">Connecte-toi pour voir les cartes que tu as tirées.</p>
        <button type="button" onClick={() => signIn("discord")} className="btn-violet self-start">
          Connexion Discord
        </button>
      </div>
    );
  }

  const pct = data && data.total > 0 ? Math.min(1, distinct / data.total) : 0;
  const chip = (active: boolean) =>
    `press min-h-11 shrink-0 rounded-md px-3 text-sm ${active ? "bg-zinc-900 text-white ring-1 ring-zinc-700" : "text-zinc-400 hover:text-white"}`;

  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-12 md:px-10 md:pt-16">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <h1 className="text-5xl font-extrabold tracking-[-0.045em] text-white md:text-7xl">Ma collection</h1>
        {session.user?.minecraftName && (
          <Link href={`/joueur/${session.user.minecraftName}`} className="btn-line">
            Voir mon profil public
          </Link>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-10 text-zinc-300">
          Impossible de charger ta collection.{" "}
          <button type="button" onClick={load} className="min-h-11 underline underline-offset-4">
            Réessayer
          </button>
        </p>
      )}

      {!data && !error && (
        <div role="status" className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-[2.5/3.5] animate-pulse rounded-xl bg-zinc-950" />
          ))}
          <span className="sr-only">Chargement</span>
        </div>
      )}

      {data && (
        <>
          <div className="mt-10 max-w-xl">
            <p className="text-lg text-zinc-200">
              <span className="text-3xl font-extrabold tabular-nums text-white">
                <AnimatedNumber value={distinct} />
              </span>{" "}
              sur {data.total} cartes découvertes
              <span className="text-zinc-400"> · {data.owned.length} au total, doublons compris</span>
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-900" role="progressbar" aria-valuemin={0} aria-valuemax={data.total} aria-valuenow={distinct} aria-label="Progression de la collection">
              <motion.div
                className="h-full origin-left rounded-full bg-violet-400"
                initial={{ transform: "scaleX(0)" }}
                animate={{ transform: `scaleX(${pct})` }}
                transition={{ duration: reduce ? 0 : 0.8, ease: EASE_OUT }}
              />
            </div>
          </div>

          {data.owned.length === 0 ? (
            <div className="mt-16 flex flex-col items-start gap-5">
              <p className="text-2xl font-semibold text-white">Aucune carte pour l&apos;instant.</p>
              <Link href="/cards" className="btn-violet">
                Ouvrir un booster
              </Link>
            </div>
          ) : (
            <>
              <div className="mt-10 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex gap-1 overflow-x-auto" role="group" aria-label="Filtrer par rareté">
                  <button type="button" onClick={() => setRarity("ALL")} aria-pressed={rarity === "ALL"} className={chip(rarity === "ALL")}>
                    Toutes
                  </button>
                  {RARITIES.map((r) => (
                    <button key={r.key} type="button" onClick={() => setRarity(r.key)} aria-pressed={rarity === r.key} className={chip(rarity === r.key)}>
                      {r.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 text-sm text-zinc-300">
                    Édition
                    <select value={edition} onChange={(e) => setEdition(e.target.value)} className="min-h-11 rounded-md border border-zinc-500 bg-black px-3 text-sm text-white">
                      <option value="ALL">Toutes</option>
                      {editions.map((e) => (
                        <option key={e}>{e}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-zinc-300">
                    Tri
                    <select value={sort} onChange={(e) => setSort(e.target.value as "recent" | "rarity")} className="min-h-11 rounded-md border border-zinc-500 bg-black px-3 text-sm text-white">
                      <option value="recent">Plus récentes</option>
                      <option value="rarity">Plus rares</option>
                    </select>
                  </label>
                </div>
              </div>

              {(dupes.n > 0 || sellMsg) && (
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  {dupes.n > 0 && (
                    <button
                      type="button"
                      disabled={sellAll === "busy"}
                      onClick={() => (sellAll === "confirm" ? doSellAll() : setSellAll("confirm"))}
                      onBlur={() => sellAll === "confirm" && setSellAll("idle")}
                      className="btn-violet disabled:opacity-50"
                    >
                      {sellAll === "busy" ? "Vente en cours…" : sellAll === "confirm" ? `Confirmer : vendre ${dupes.n} doublons, +${dupes.gold}` : `Vendre tous mes doublons (${dupes.n})`}
                    </button>
                  )}
                  {sellMsg && <p role="status" className="text-sm text-zinc-300">{sellMsg}</p>}
                </div>
              )}

              {shown.length === 0 ? (
                <p className="mt-10 text-zinc-400">Aucune carte avec ces filtres.</p>
              ) : (
                <ul className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
                  {shown.map((g, i) => (
                    <motion.li
                      key={`${g.card.id}:${g.effect ?? ""}`}
                      initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(16px)" }}
                      animate={{ opacity: 1, transform: "translateY(0px)" }}
                      transition={{ duration: reduce ? 0.15 : 0.45, ease: EASE_OUT, delay: reduce ? 0 : Math.min(i, 10) * 0.03 }}
                      className="relative"
                    >
                      <button type="button" onClick={() => setZoom(g)} aria-label={`Agrandir ${g.card.title}`} className="block w-full text-left">
                        <CardDisplay card={g.card} size="md" specialEffect={g.effect} />
                      </button>
                      <p className="mt-3 flex justify-between gap-2 text-sm text-zinc-300">
                        <span className="truncate">
                          {g.card.title}
                          {g.effect && <span className="text-violet-400"> · {g.effect}</span>}
                        </span>
                        {g.count > 1 && <span className="shrink-0 tabular-nums text-white">×{g.count}</span>}
                      </p>
                    </motion.li>
                  ))}
                </ul>
              )}
            </>
          )}
        </>
      )}
      <AnimatePresence>
        {zoom && (() => {
          const id = zoom.ids.find((i) => !data?.showcase.includes(i));
          const sell = id && (copies.get(zoom.card.id) ?? 0) > 1 ? { price: sellPrice(zoom.card.rarity, zoom.effect), onSell: () => sellZoom(id) } : undefined;
          return <CardZoom card={zoom.card} effect={zoom.effect} count={zoom.count} obtainedAt={zoom.last} onClose={() => setZoom(null)} sell={sell} />;
        })()}
      </AnimatePresence>
    </div>
  );
}

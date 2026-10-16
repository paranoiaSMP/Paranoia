"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import CardDisplay, { rarityKey } from "@/features/binder/components/CardDisplay";
import CardZoom, { RARITY_LABEL } from "@/components/tcg/CardZoom";
import type { TradingCard } from "@/types/cards";
import { BOOSTER_NAME, TCG_DEFAULTS, type TcgConfig, canEvolve, cosmicBooster, nextEffect } from "@/lib/cardValue";

type RecipeView = { id: string; name: string; result: TradingCard; ingredients: { card: TradingCard; qty: number; owned: number }[] };
type Owned = { id: string; specialEffect: string | null; tradingCard: TradingCard };
type Stack = { key: string; card: TradingCard; effect: string | null; ids: string[] };

const label = (r: string) => RARITY_LABEL[rarityKey(r)];
const reveal = { initial: { opacity: 0, scale: 0.96 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0.28, ease: [0.23, 1, 0.32, 1] as const } };

function Progress({ have, need }: { have: number; need: number }) {
  const ok = have >= need;
  return (
    <div className="mt-2" role="img" aria-label={`${Math.min(have, need)} sur ${need}`}>
      <div className="h-1 overflow-hidden rounded-full bg-zinc-800">
        <div className={`h-full ${ok ? "bg-emerald-400" : "bg-amber-400"}`} style={{ width: `${Math.min(100, (have / need) * 100)}%` }} />
      </div>
    </div>
  );
}

export default function Fusion() {
  const { data: session, status } = useSession();
  const [owned, setOwned] = useState<Owned[]>([]);
  const [showcase, setShowcase] = useState<string[]>([]);
  const [selKey, setSelKey] = useState<string | null>(null);
  const [mode, setMode] = useState<"effect" | "recipe">("effect");
  const [cfg, setCfg] = useState<TcgConfig>(TCG_DEFAULTS);
  const [recipes, setRecipes] = useState<RecipeView[]>([]);
  const [won, setWon] = useState<Owned | null>(null);
  const [boosterWon, setBoosterWon] = useState<string | null>(null);
  const [zoom, setZoom] = useState<Owned | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/user/collection", { cache: "no-store" });
    if (!r.ok) return setReady(true);
    const d = await r.json();
    setOwned(d.owned);
    setShowcase(d.showcase ?? []);
    const [c, rc] = await Promise.all([fetch("/api/tcg/config", { cache: "no-store" }), fetch("/api/tcg/recipes", { cache: "no-store" })]);
    if (c.ok) setCfg(await c.json());
    if (rc.ok) setRecipes((await rc.json()).recipes);
    setReady(true);
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [status, load]);

  const need = cfg.evolveCount;

  const stacks = useMemo(() => {
    const m = new Map<string, Stack>();
    for (const c of owned) {
      if (showcase.includes(c.id) || !canEvolve(c.tradingCard.rarity, c.specialEffect)) continue;
      const key = `${c.tradingCard.id}|${c.specialEffect ?? ""}`;
      const s = m.get(key) ?? { key, card: c.tradingCard, effect: c.specialEffect, ids: [] };
      s.ids.push(c.id);
      m.set(key, s);
    }
    return [...m.values()].sort((a, b) => Number(b.ids.length >= need) - Number(a.ids.length >= need) || b.ids.length - a.ids.length);
  }, [owned, showcase, need]);

  const sel = stacks.find((s) => s.key === selKey) ?? null;
  const picked = sel ? sel.ids.slice(0, need) : [];
  const outEffect = sel ? nextEffect(sel.effect) : null;
  const outBooster = sel && sel.effect === "Cosmic" ? cosmicBooster(sel.card.rarity) : null;

  const switchMode = (m: typeof mode) => {
    setMode(m);
    setSelKey(null);
    setWon(null);
    setBoosterWon(null);
    setErr(null);
  };

  const post = async (url: string, body: object) => {
    setBusy(true);
    setErr(null);
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      setErr(data.error ?? "L'opération a échoué.");
      return null;
    }
    setWon(data.card ?? null);
    setBoosterWon(data.booster ?? null);
    setSelKey(null);
    load();
    return data;
  };

  if (status === "loading") return <div role="status" aria-label="Chargement" className="mx-auto h-96 max-w-6xl px-5 md:px-10" />;
  if (!session) {
    return (
      <div className="mx-auto flex min-h-[70svh] max-w-6xl flex-col justify-center gap-6 px-5 md:px-10">
        <h1 className="text-5xl font-extrabold tracking-[-0.045em] text-white md:text-7xl">Fusion</h1>
        <p className="max-w-md text-lg text-zinc-300">Connecte-toi pour fusionner tes cartes.</p>
        <button type="button" onClick={() => signIn("discord")} className="btn-violet self-start">Connexion Discord</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[90rem] px-5 pb-24 pt-12 md:px-10 md:pt-16">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="text-5xl font-extrabold tracking-[-0.045em] text-white md:text-7xl">Fusion</h1>
          <p className="mt-4 max-w-xl text-lg text-zinc-300">
            {mode === "effect"
              ? `Rassemble ${need} exemplaires identiques d'une carte pour lui donner l'effet suivant : Holo, Glitch, puis Cosmic.`
              : "Des cartes introuvables en booster, à fabriquer avec les bonnes cartes."}
          </p>
        </div>
        <div role="group" aria-label="Type de fusion" className="flex rounded-md border border-zinc-800 p-1">
          {([["effect", "Effets"], ["recipe", "Recettes"]] as const).map(([m, t]) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => switchMode(m)} className={`min-h-11 rounded px-5 text-sm font-semibold transition-colors ${mode === m ? "bg-violet-600 text-white" : "text-zinc-300 hover:text-white"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {(won || boosterWon) && (
          <motion.section key="won" aria-live="polite" {...reveal} exit={{ opacity: 0 }} className="mt-10 flex flex-wrap items-center gap-6 rounded-lg border border-violet-500/50 bg-violet-950/40 p-5">
            {won && (
              <div className="w-48 shrink-0">
                <CardDisplay card={won.tradingCard} size="md" specialEffect={won.specialEffect} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-bold text-white">
                {won ? `${won.tradingCard.title}${won.specialEffect ? ` ${won.specialEffect}` : ""}` : `Booster ${BOOSTER_NAME[boosterWon!]}`}
              </h2>
              <p className="mt-1 text-zinc-300">{won ? "Ajoutée à ta collection." : "Ajouté à tes boosters, ouvre-le sur la page Cartes."}</p>
              <button type="button" onClick={() => { setWon(null); setBoosterWon(null); }} className="mt-4 min-h-11 text-sm text-zinc-300 underline underline-offset-4 hover:text-white">Fermer</button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {err && <p role="alert" className="mt-6 text-sm text-red-400">{err}</p>}

      {!ready ? (
        <p role="status" className="mt-12 text-zinc-400">Chargement de ta collection…</p>
      ) : mode === "recipe" ? (
        recipes.length === 0 ? (
          <p className="mt-12 max-w-md text-zinc-300">Aucune recette n'est disponible pour le moment. Elles apparaissent ici dès que le staff en ajoute.</p>
        ) : (
          <ul className="mt-10 space-y-6">
            {recipes.map((r) => {
              const ok = r.ingredients.every((i) => i.owned >= i.qty);
              return (
                <li key={r.id} className={`rounded-lg border p-5 md:p-6 ${ok ? "border-emerald-500/60 bg-emerald-950/20" : "border-zinc-800 bg-[#0b0b0d]"}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-xl font-bold text-white">{r.name}</h2>
                    <p className={`text-sm ${ok ? "text-emerald-300" : "text-zinc-400"}`}>{ok ? "Tu as tout ce qu'il faut" : "Il te manque des cartes"}</p>
                  </div>
                  <div className="mt-5 flex flex-wrap items-end gap-x-8 gap-y-6">
                    <ul className="flex flex-wrap gap-4">
                      {r.ingredients.map((i) => (
                        <li key={i.card.id} className="w-40">
                          <div className={i.owned >= i.qty ? "" : "opacity-60"}>
                            <CardDisplay card={i.card} size="md" disableTilt />
                          </div>
                          <p className="mt-2 truncate text-sm text-zinc-200">{i.card.title}</p>
                          <p className={`text-sm tabular-nums ${i.owned >= i.qty ? "text-emerald-300" : "text-amber-300"}`}>{Math.min(i.owned, i.qty)} sur {i.qty}</p>
                          <Progress have={i.owned} need={i.qty} />
                        </li>
                      ))}
                    </ul>
                    <p className="pb-24 text-sm text-zinc-400">donnent</p>
                    <div className="w-52">
                      <CardDisplay card={r.result} size="md" disableTilt />
                      <p className="mt-2 truncate text-sm font-semibold text-white">{r.result.title}</p>
                      <p className="text-sm text-zinc-300">{label(r.result.rarity)}</p>
                    </div>
                  </div>
                  <button type="button" disabled={busy || !ok} onClick={() => post("/api/cards/recipe", { recipeId: r.id })} className="btn-violet mt-6 disabled:opacity-50">
                    Fabriquer {r.result.title}
                  </button>
                </li>
              );
            })}
          </ul>
        )
      ) : (
        <div className="mt-10 grid gap-10 lg:grid-cols-[34rem_1fr] lg:items-start">
          <aside aria-label="Atelier" className="rounded-lg border border-zinc-800 bg-[#0b0b0d] p-6 lg:sticky lg:top-24">
            <div className="flex gap-3" aria-label={`${picked.length} cartes sur ${need}`} role="img">
              {Array.from({ length: need }, (_, i) => (
                <div key={i} className="min-w-0 flex-1">
                  {sel && i < picked.length ? (
                    <motion.div key={sel.key} {...reveal} transition={{ ...reveal.transition, delay: i * 0.04 }}>
                      <CardDisplay card={sel.card} size="md" specialEffect={sel.effect} disableTilt />
                    </motion.div>
                  ) : (
                    <div className="aspect-[2.5/3.5] rounded-md border border-dashed border-zinc-700" />
                  )}
                </div>
              ))}
            </div>

            <div className="mt-5 border-t border-zinc-800 pt-5">
              {!sel ? (
                <p className="text-sm text-zinc-300">Choisis une carte dans ta collection. Les {need} exemplaires se placent tout seuls.</p>
              ) : outBooster ? (
                <>
                  <p className="text-sm text-zinc-300">{need} {sel.card.title} Cosmic donnent</p>
                  <p className="mt-1 text-2xl font-bold text-white">1 booster {BOOSTER_NAME[outBooster]}</p>
                </>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="w-44 shrink-0">
                    <motion.div key={outEffect} {...reveal}>
                      <CardDisplay card={sel.card} size="md" specialEffect={outEffect} disableTilt />
                    </motion.div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-zinc-300">Tu obtiens</p>
                    <p className="text-xl font-bold text-white">{sel.card.title}</p>
                    <p className="text-violet-300">{outEffect}</p>
                  </div>
                </div>
              )}
            </div>

            <button type="button" disabled={busy || !sel || picked.length !== need} onClick={() => post("/api/cards/evolve", { ids: picked })} className="btn-violet mt-5 w-full disabled:opacity-50">
              {busy ? "Fusion en cours…" : sel ? `Fusionner ${need} cartes` : "Fusionner"}
            </button>
            <p className="mt-3 text-xs text-zinc-400">Les cartes en vitrine, Saison, de fête et la Mythique Cosmic ne peuvent pas être fusionnées.</p>
          </aside>

          <section aria-label="Ta collection">
            {stacks.length === 0 ? (
              <p className="max-w-md text-zinc-300">Aucune carte à fusionner pour l'instant. Ouvre des boosters sur la page Cartes pour en obtenir.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-3 xl:grid-cols-5">
                {stacks.map((s) => {
                  const n = s.ids.length;
                  const can = n >= need;
                  const on = s.key === selKey;
                  return (
                    <li key={s.key} className="relative">
                      <button
                        type="button"
                        disabled={!can}
                        aria-pressed={on}
                        aria-label={`${s.card.title}${s.effect ? ` ${s.effect}` : ""}, ${n} sur ${need}`}
                        onClick={() => { setSelKey(on ? null : s.key); setErr(null); }}
                        className={`block w-full rounded-lg p-1.5 text-left transition-colors ${on ? "bg-violet-950 ring-2 ring-violet-400" : can ? "hover:bg-zinc-900" : "opacity-55"}`}
                      >
                        <CardDisplay card={s.card} size="md" specialEffect={s.effect} disableTilt />
                      </button>
                      <button type="button" onClick={() => setZoom({ id: s.ids[0], specialEffect: s.effect, tradingCard: s.card })} aria-label={`Détails de ${s.card.title}`} className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-black/75 text-sm text-white hover:bg-black">
                        <span aria-hidden>⤢</span>
                      </button>
                      <div className="px-1.5">
                        <p className="mt-2 truncate text-sm font-semibold text-zinc-100">{s.card.title}</p>
                        <p className="truncate text-sm text-zinc-400">
                          {label(s.card.rarity)}{s.effect ? `, ${s.effect}` : ""}
                        </p>
                        <p className={`mt-1 text-sm tabular-nums ${can ? "text-emerald-300" : "text-amber-300"}`}>
                          {can ? `${n} exemplaires, prête` : `${n} sur ${need}, il en manque ${need - n}`}
                        </p>
                        <Progress have={n} need={need} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}
      <AnimatePresence>{zoom && <CardZoom card={zoom.tradingCard} effect={zoom.specialEffect} onClose={() => setZoom(null)} />}</AnimatePresence>
    </div>
  );
}

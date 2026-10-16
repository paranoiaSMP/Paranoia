"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { TCG_DEFAULTS, type TcgConfig } from "@/lib/cardValue";
import type { Recipe } from "@/lib/tcgConfig";
import { useResource, send } from "./useResource";
import { PanelHeader, ListState, inputCls } from "./ui";
import { Boosters } from "./Gifts";

type Card = { id: string; title: string; rarity: string; edition: string };
type Data = { config: TcgConfig; recipes: Recipe[] };

const box = "flex flex-col gap-4 rounded-md border border-zinc-900 p-5";
const field = "flex flex-col gap-1.5 text-sm text-zinc-300";

function Settings({ initial, onSaved }: { initial: TcgConfig; onSaved: () => void }) {
  const [v, setV] = useState({ ...initial, sellRate: Math.round(initial.sellRate * 100) });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: Number(e.target.value) });
  const save = async () => {
    setBusy(true);
    try {
      await send("/api/admin/tcg", "PUT", { config: { ...v, sellRate: v.sellRate / 100 } });
      toast.success("Réglages enregistrés.");
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const num = (label: string, k: keyof typeof v, hint: string, min = 1) => (
    <label className={field}>
      {label}
      <input type="number" min={min} inputMode="numeric" value={v[k]} onChange={set(k)} className={`${inputCls} w-32 tabular-nums`} />
      <span className="text-xs text-zinc-400">{hint}</span>
    </label>
  );
  return (
    <section className={box}>
      <h3 className="text-lg font-semibold text-white">Règles</h3>
      <div className="flex flex-wrap gap-6">
        {num("Rachat des doublons (%)", "sellRate", "Part de la valeur versée au joueur.")}
        {num("Plafond de rachat par jour", "sellDailyCap", "En ParaCoins, par joueur. 0 = rachat bloqué.", 0)}
        {num("Montée d'effet", "evolveCount", "Exemplaires identiques pour l'effet suivant.", 2)}
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={save} disabled={busy} className="btn-violet disabled:opacity-50">Enregistrer</button>
        <button type="button" onClick={() => setV({ ...TCG_DEFAULTS, sellRate: TCG_DEFAULTS.sellRate * 100 })} className="btn-line">Valeurs par défaut</button>
      </div>
    </section>
  );
}

function Recipes({ initial, cards, onSaved }: { initial: Recipe[]; cards: Card[]; onSaved: () => void }) {
  const [list, setList] = useState<Recipe[]>(initial);
  const [busy, setBusy] = useState(false);
  const patch = (i: number, r: Recipe) => setList(list.map((x, j) => (j === i ? r : x)));
  const opts = cards.map((c) => (
    <option key={c.id} value={c.id}>{c.title} · {c.rarity} · {c.edition}</option>
  ));
  const add = () => cards[0] && setList([...list, { id: crypto.randomUUID().slice(0, 8), name: "Nouvelle recette", resultId: cards[0].id, ingredients: [{ cardId: cards[0].id, qty: 2 }] }]);
  const save = async () => {
    setBusy(true);
    try {
      await send("/api/admin/tcg", "PUT", { recipes: list });
      toast.success("Recettes enregistrées.");
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className={box}>
      <h3 className="text-lg font-semibold text-white">Recettes de fusion</h3>
      <p className="text-sm text-zinc-400">
        Une carte obtenue uniquement en fusionnant d&apos;autres cartes. Crée d&apos;abord la carte résultat dans l&apos;éditeur (elle peut rester non publiée : elle ne sort alors pas des boosters).
      </p>
      {list.length === 0 && <p className="text-sm text-zinc-400">Aucune recette.</p>}
      <ul className="space-y-5">
        {list.map((r, i) => (
          <li key={r.id} className="space-y-3 rounded-md border border-zinc-800 p-4">
            <div className="flex flex-wrap items-end gap-4">
              <label className={field}>
                Nom
                <input value={r.name} maxLength={60} onChange={(e) => patch(i, { ...r, name: e.target.value })} className={`${inputCls} w-56`} />
              </label>
              <label className={field}>
                Carte obtenue
                <select value={r.resultId} onChange={(e) => patch(i, { ...r, resultId: e.target.value })} className={`${inputCls} w-72`}>{opts}</select>
              </label>
              <button type="button" onClick={() => setList(list.filter((_, j) => j !== i))} className="btn-line">Supprimer la recette</button>
            </div>
            <ul className="space-y-2">
              {r.ingredients.map((g, k) => (
                <li key={k} className="flex flex-wrap items-center gap-3">
                  <span className="text-sm text-zinc-400">Ingrédient</span>
                  <select aria-label="Carte ingrédient" value={g.cardId} onChange={(e) => patch(i, { ...r, ingredients: r.ingredients.map((x, j) => (j === k ? { ...x, cardId: e.target.value } : x)) })} className={`${inputCls} w-72`}>{opts}</select>
                  <label className="flex items-center gap-2 text-sm text-zinc-300">
                    Quantité
                    <input type="number" min={1} max={20} value={g.qty} onChange={(e) => patch(i, { ...r, ingredients: r.ingredients.map((x, j) => (j === k ? { ...x, qty: Math.max(1, Number(e.target.value) || 1) } : x)) })} className={`${inputCls} w-20 tabular-nums`} />
                  </label>
                  {r.ingredients.length > 1 && (
                    <button type="button" onClick={() => patch(i, { ...r, ingredients: r.ingredients.filter((_, j) => j !== k) })} className="min-h-11 text-sm underline underline-offset-4">Retirer</button>
                  )}
                </li>
              ))}
            </ul>
            {r.ingredients.length < 6 && (
              <button type="button" onClick={() => patch(i, { ...r, ingredients: [...r.ingredients, { cardId: cards[0].id, qty: 1 }] })} className="min-h-11 text-sm underline underline-offset-4">Ajouter un ingrédient</button>
            )}
          </li>
        ))}
      </ul>
      <div className="flex gap-3">
        <button type="button" onClick={add} disabled={cards.length === 0} className="btn-line disabled:opacity-50">Ajouter une recette</button>
        <button type="button" onClick={save} disabled={busy} className="btn-violet disabled:opacity-50">Enregistrer les recettes</button>
      </div>
    </section>
  );
}

export default function Tcg() {
  const data = useResource<Data>("/api/admin/tcg");
  const cards = useResource<Card[]>("/api/cards");
  return (
    <section>
      <PanelHeader
        title="TCG"
        text="Règles de rachat et de montée d'effet, recettes, boosters. Les changements s'appliquent tout de suite."
        actions={<Link href="/admin/cartes" className="btn-line">Éditeur de cartes</Link>}
      />
      <ListState loading={(data.loading && !data.data) || (cards.loading && !cards.data)} error={data.error ?? cards.error} empty={false} emptyText="" onRetry={() => { data.reload(); cards.reload(); }} />
      <div className="mt-6 flex flex-col gap-6">
        {data.data && <Settings key={JSON.stringify(data.data.config)} initial={data.data.config} onSaved={data.reload} />}
        {data.data && cards.data && <Recipes key={JSON.stringify(data.data.recipes)} initial={data.data.recipes} cards={cards.data} onSaved={data.reload} />}
        <Boosters />
      </div>
    </section>
  );
}

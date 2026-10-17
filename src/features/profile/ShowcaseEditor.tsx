"use client";

import { useEffect, useState } from "react";
import CardDisplay from "@/features/binder/components/CardDisplay";
import type { TradingCard } from "@/types/cards";
import { cardValue } from "@/lib/cardValue";

type Owned = { id: string; specialEffect: string | null; tradingCard: TradingCard };
const MAX = 5;

/** Choix des cartes mises en avant sur son propre profil (l'ordre des clics = l'ordre d'affichage). */
export default function ShowcaseEditor({ initial, onSaved, onClose }: { initial: string[]; onSaved: () => void; onClose: () => void }) {
  const [owned, setOwned] = useState<Owned[] | null>(null);
  const [picked, setPicked] = useState<string[]>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/api/user/collection")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { owned: Owned[] }) => alive && setOwned([...d.owned].sort((a, b) => cardValue(b.tradingCard.rarity, b.specialEffect) - cardValue(a.tradingCard.rarity, a.specialEffect))))
      .catch(() => alive && setError("Impossible de charger ta collection."));
    return () => {
      alive = false;
    };
  }, []);

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < MAX ? [...p, id] : p));

  const save = async (ids: string[]) => {
    setBusy(true);
    setError("");
    const res = await fetch("/api/user/showcase", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return setError("Enregistrement impossible, réessaie.");
    onSaved();
    onClose();
  };

  return (
    <div className="mt-6 rounded-2xl border border-zinc-800 bg-[#09090b] p-4 md:p-5">
      <p className="text-sm text-zinc-300">
        Choisis jusqu&apos;à {MAX} cartes, dans l&apos;ordre où elles seront affichées. <span className="tabular-nums text-white">{picked.length}/{MAX}</span>
      </p>
      {!owned && !error && <p className="mt-4 text-zinc-400">Chargement…</p>}
      {owned?.length === 0 && <p className="mt-4 text-zinc-400">Tu n&apos;as pas encore de carte.</p>}
      <ul data-lenis-prevent className="mt-5 grid max-h-[32rem] grid-cols-2 gap-3 overflow-y-auto p-1 sm:grid-cols-3 lg:grid-cols-4">
        {owned?.map((c) => {
          const rank = picked.indexOf(c.id);
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => toggle(c.id)}
                aria-pressed={rank >= 0}
                className={`relative block w-full rounded-xl outline-offset-2 transition-opacity ${rank >= 0 ? "outline outline-2 outline-violet-400" : "opacity-70 hover:opacity-100"}`}
              >
                <CardDisplay card={c.tradingCard} size="md" specialEffect={c.specialEffect} disableTilt />
                {rank >= 0 && (
                  <span className="absolute left-2 top-2 z-[100] flex h-7 w-7 items-center justify-center rounded-full bg-violet-400 text-sm font-bold text-black">{rank + 1}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" disabled={busy} onClick={() => save(picked)} className="btn-line disabled:opacity-40">
          Enregistrer
        </button>
        <button type="button" disabled={busy} onClick={() => save([])} className="btn-line disabled:opacity-40">
          Remettre automatique
        </button>
        <button type="button" onClick={onClose} className="min-h-11 px-3 text-sm text-zinc-400 hover:text-white">
          Annuler
        </button>
      </div>
    </div>
  );
}

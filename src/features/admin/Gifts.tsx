"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { BOOSTER_PACKS } from "@/config/boosters";
import { GIFT_EFFECTS } from "@/lib/cardValue";
import { useResource, send } from "./useResource";
import { PanelHeader, ListState, inputCls } from "./ui";
import type { BoosterStates } from "@/lib/boosters-types";

type Card = { id: string; title: string; rarity: string; edition: string };
type User = { id: string; name: string | null; minecraftName: string | null };

const PACKS = Object.values(BOOSTER_PACKS);
const box = "flex flex-col gap-4 rounded-md border border-zinc-900 p-5";
const label = "flex flex-col gap-1.5 text-sm text-zinc-300";

function Reward() {
  const [identifier, setIdentifier] = useState("");
  const [type, setType] = useState<"coins" | "box">("coins");
  const [boxType, setBoxType] = useState("standard");
  const [amount, setAmount] = useState(100);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const d = await send("/api/admin/bot/give", "POST", { identifier: identifier.trim(), rewardType: type, amount, boxType });
      toast.success(d.message ?? "Récompense attribuée.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className={box}>
      <h3 className="text-lg font-semibold text-white">Récompense</h3>
      <label className={label}>
        Joueur (pseudo Minecraft ou identifiant Discord)
        <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} required className={inputCls} />
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className={label}>
          Type
          <select value={type} onChange={(e) => setType(e.target.value as "coins" | "box")} className={inputCls}>
            <option value="coins">ParaCoins</option>
            <option value="box">Boosters</option>
          </select>
        </label>
        {type === "box" && (
          <label className={label}>
            Booster
            <select value={boxType} onChange={(e) => setBoxType(e.target.value)} className={inputCls}>
              {PACKS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className={label}>
          Quantité
          <input type="number" min={1} value={amount} onChange={(e) => setAmount(Math.max(1, Number(e.target.value)))} className={`${inputCls} tabular-nums`} />
        </label>
      </div>
      <button type="submit" disabled={busy || !identifier.trim()} className="btn-violet self-start disabled:opacity-50">
        {busy ? "…" : type === "coins" ? `Donner ${amount} PC` : `Donner ${amount} booster${amount > 1 ? "s" : ""}`}
      </button>
    </form>
  );
}

function CardGift({ cards }: { cards: Card[] }) {
  const [cardId, setCardId] = useState("");
  const [name, setName] = useState("");
  const [effect, setEffect] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (action: "GIVE" | "REMOVE") => {
    setBusy(true);
    try {
      const d = await send("/api/admin/cards/manage", "POST", { action, cardId, minecraftName: name.trim(), ...(action === "GIVE" && effect ? { specialEffect: effect } : {}) });
      toast.success(d.message ?? "Fait.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={box}>
      <h3 className="text-lg font-semibold text-white">Carte à un joueur</h3>
      <label className={label}>
        Carte
        <select value={cardId} onChange={(e) => setCardId(e.target.value)} className={inputCls}>
          <option value="">Choisir une carte</option>
          {cards.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title} · {c.rarity} · {c.edition}
            </option>
          ))}
        </select>
      </label>
      <label className={label}>
        Effet (donné uniquement avec « Donner la carte »)
        <select value={effect} onChange={(e) => setEffect(e.target.value)} className={inputCls}>
          <option value="">Aucun</option>
          {GIFT_EFFECTS.map((fx) => (
            <option key={fx} value={fx}>
              {fx}
            </option>
          ))}
        </select>
      </label>
      <label className={label}>
        Pseudo Minecraft du joueur (compte lié sur le site)
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
      </label>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => run("GIVE")} disabled={busy || !cardId || !name.trim()} className="btn-violet disabled:opacity-50">
          Donner la carte
        </button>
        <button type="button" onClick={() => run("REMOVE")} disabled={busy || !cardId || !name.trim()} className="btn-line disabled:opacity-50">
          Retirer une copie
        </button>
      </div>
    </div>
  );
}

function BoosterRow({ id, initial, onSaved }: { id: string; initial: { visible: boolean; stock: number | null; price: number | null }; onSaved: () => void }) {
  const pack = BOOSTER_PACKS[id as keyof typeof BOOSTER_PACKS];
  const [visible, setVisible] = useState(initial.visible);
  const [stock, setStock] = useState(initial.stock === null ? "" : String(initial.stock));
  const [price, setPrice] = useState(String(initial.price ?? pack.price));
  const [busy, setBusy] = useState(false);

  const save = async (nextStock: string = stock) => {
    setBusy(true);
    try {
      await send("/api/admin/boosters", "PUT", { id, visible, price: Math.max(1, Math.floor(Number(price)) || pack.price), stock: nextStock === "" ? null : Math.max(0, Math.floor(Number(nextStock))) });
      toast.success(`${pack.name} mis à jour.`);
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="flex flex-wrap items-center gap-4 py-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={pack.image} alt="" className="h-16 w-12 shrink-0 object-contain" />
      <div className="min-w-32 flex-1">
        <p className="font-semibold text-white">{pack.name}</p>
        <p className="text-sm text-zinc-400">
          {pack.seasonal ? "Fête, masqué par défaut" : "Permanent"} · prix de base {pack.price} PARA
        </p>
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm text-zinc-300">
        <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="size-5 accent-violet-500" />
        Affiché
      </label>
      <label className="flex items-center gap-2 text-sm text-zinc-300">
        Prix
        <input type="number" min={1} inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} className={`${inputCls} w-24 tabular-nums`} />
      </label>
      <label className="flex items-center gap-2 text-sm text-zinc-300">
        Stock
        <input
          type="number"
          min={0}
          inputMode="numeric"
          placeholder="illimité"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          className={`${inputCls} w-28 tabular-nums`}
        />
      </label>
      <button type="button" onClick={() => save()} disabled={busy} className="btn-violet disabled:opacity-50">
        Enregistrer
      </button>
      <button
        type="button"
        onClick={() => {
          setStock("0");
          save("0");
        }}
        disabled={busy}
        className="btn-line disabled:opacity-50"
      >
        Rupture de stock
      </button>
    </li>
  );
}

export function Boosters() {
  const { data, error, loading, reload } = useResource<BoosterStates>("/api/admin/boosters");
  const shown = data ? Object.values(data).filter((b) => b.visible).length : 0;
  return (
    <details className={`${box} group`}>
      <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center justify-between gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-violet-400">
        <h3 className="text-lg font-semibold text-white">Boosters en boutique</h3>
        <span className="text-sm text-zinc-400">
          {data ? `${shown} affiché${shown > 1 ? "s" : ""} sur ${Object.keys(data).length} · ` : ""}
          <span className="group-open:hidden">Développer</span>
          <span className="hidden group-open:inline">Réduire</span>
        </span>
      </summary>
      <p className="text-sm text-zinc-400">
        Un booster masqué disparaît de la boutique et de l&apos;accueil (les boosters déjà possédés restent ouvrables). Stock vide = illimité, 0 = rupture.
      </p>
      <ListState loading={loading && !data} error={error} empty={false} emptyText="" onRetry={reload} />
      {data && (
        <ul className="divide-y divide-zinc-900">
          {Object.values(BOOSTER_PACKS).map((p) => (
            <BoosterRow key={`${p.id}-${JSON.stringify(data[p.id])}`} id={p.id} initial={data[p.id]} onSaved={reload} />
          ))}
        </ul>
      )}
    </details>
  );
}

function Danger({ cards, users }: { cards: Card[]; users: User[] }) {
  const [action, setAction] = useState<"GIVE_ALL" | "WIPE_ALL" | "WIPE_PLAYER">("GIVE_ALL");
  const [cardId, setCardId] = useState("");
  const [userId, setUserId] = useState("");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  const needsCard = action !== "WIPE_PLAYER";
  const ready = typed === "CONFIRMER" && (needsCard ? !!cardId : !!userId);

  const run = async () => {
    setBusy(true);
    try {
      const d = await send("/api/admin/cards/manage", "POST", needsCard ? { action, cardId } : { action, userId });
      toast.success(d.message ?? "Fait.");
      setTyped("");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const desc = {
    GIVE_ALL: "Donne une copie de la carte à tous les comptes du site.",
    WIPE_ALL: "Supprime toutes les copies de la carte chez tous les joueurs.",
    WIPE_PLAYER: "Vide toute la collection de cartes d'un joueur.",
  }[action];

  return (
    <div className={`${box} border-red-500/30`}>
      <h3 className="text-lg font-semibold text-red-300">Actions massives</h3>
      <label className={label}>
        Action
        <select value={action} onChange={(e) => { setAction(e.target.value as typeof action); setTyped(""); }} className={inputCls}>
          <option value="GIVE_ALL">Donner une carte à tout le monde</option>
          <option value="WIPE_ALL">Supprimer une carte chez tout le monde</option>
          <option value="WIPE_PLAYER">Vider la collection d&apos;un joueur</option>
        </select>
      </label>
      <p className="text-sm text-zinc-400">{desc} Irréversible.</p>
      {needsCard ? (
        <label className={label}>
          Carte
          <select value={cardId} onChange={(e) => setCardId(e.target.value)} className={inputCls}>
            <option value="">Choisir une carte</option>
            {cards.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} · {c.rarity}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <label className={label}>
          Joueur
          <select value={userId} onChange={(e) => setUserId(e.target.value)} className={inputCls}>
            <option value="">Choisir un compte</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.minecraftName ?? u.name ?? u.id}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className={label}>
        Tape CONFIRMER pour valider
        <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" className={inputCls} />
      </label>
      <button
        type="button"
        onClick={run}
        disabled={busy || !ready}
        className="press min-h-12 self-start rounded-md bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40"
      >
        {busy ? "…" : "Exécuter"}
      </button>
    </div>
  );
}

export default function Gifts() {
  const cards = useResource<Card[]>("/api/cards");
  const users = useResource<User[]>("/api/admin/users");

  return (
    <section>
      <PanelHeader title="Dons" text="ParaCoins, boosters et cartes (les prix et le stock des boosters sont dans TCG). Chaque action est immédiate et notifie le joueur." />
      {(cards.error || users.error) && (
        <p role="alert" className="mt-4 text-sm text-red-400">
          Liste {cards.error ? "des cartes" : "des comptes"} indisponible.{" "}
          <button type="button" onClick={() => { cards.reload(); users.reload(); }} className="min-h-11 underline underline-offset-4">
            Réessayer
          </button>
        </p>
      )}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Reward />
        <CardGift cards={cards.data ?? []} />
        <div className="xl:col-span-2">
          <Danger cards={cards.data ?? []} users={users.data ?? []} />
        </div>
      </div>
    </section>
  );
}

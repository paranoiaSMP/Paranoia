"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRealtime } from "@/lib/realtime/client";
import CardDisplay from "@/features/binder/components/CardDisplay";
import CardZoom from "@/components/tcg/CardZoom";
import type { TradingCard } from "@/types/cards";
import { cardValue } from "@/lib/cardValue";
import { TRADE_MAX_CARDS, TRADE_TOLERANCE, balanced } from "@/lib/trades";

type Card = { id: string; specialEffect: string | null; tradingCard: TradingCard };
type Trade = { id: string; status: string; from: string; to: string; mine: boolean; fromOk: boolean; toOk: boolean; offered: Card[]; requested: Card[] };

const value = (c: Card) => cardValue(c.tradingCard.rarity, c.specialEffect);
const total = (cs: Card[]) => cs.reduce((s, c) => s + value(c), 0);
const STATUS: Record<string, string> = { PENDING: "En attente", ACCEPTED: "Accepté", DECLINED: "Refusé", CANCELLED: "Annulé" };

function Tile({ c, on, disabled, onToggle, onOpen }: { c: Card; on?: boolean; disabled?: boolean; onToggle?: () => void; onOpen: () => void }) {
  const reduce = useReducedMotion();
  return (
    <div className={`relative min-w-0 rounded-xl p-2 transition-[background-color,opacity] duration-200 ${on ? "bg-violet-950/70" : "hover:bg-zinc-900/60"} ${disabled ? "opacity-40" : ""}`}>
      <button type="button" onClick={onToggle ?? onOpen} disabled={disabled} aria-pressed={onToggle ? !!on : undefined} aria-label={`${onToggle ? (on ? "Retirer" : "Choisir") : "Agrandir"} ${c.tradingCard.title}`} className={`block w-full rounded-lg text-left transition-transform duration-150 active:scale-[0.98] ${on ? "ring-2 ring-violet-400" : ""}`}>
        <CardDisplay card={c.tradingCard} size="md" specialEffect={c.specialEffect} disableTilt />
      </button>
      <p className="mt-2 flex items-baseline justify-between gap-2 text-xs text-zinc-300">
        <span className="truncate">{c.tradingCard.title}{c.specialEffect && <span className="text-violet-400"> · {c.specialEffect}</span>}</span>
        <span className="shrink-0 tabular-nums text-white">{value(c)} PC</span>
      </p>
      <AnimatePresence>
        {on && (
          <motion.span
            aria-hidden
            initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "scale(0.6)" }}
            animate={{ opacity: 1, transform: "scale(1)" }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0.25 }}
            className="pointer-events-none absolute left-4 top-4 grid size-7 place-items-center rounded-full bg-violet-400 text-sm font-bold text-black"
          >
            ✓
          </motion.span>
        )}
      </AnimatePresence>
      {onToggle && (
        <button type="button" onClick={onOpen} aria-label={`Détails de ${c.tradingCard.title}`} className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-black/70 text-sm text-white hover:bg-black">
          <span aria-hidden>⤢</span>
        </button>
      )}
    </div>
  );
}

function Sheet({ title, cards, picked, onToggle, onOpen, onClose }: { title: string; cards: Card[]; picked: Set<string>; onToggle: (id: string) => void; onOpen: (c: Card) => void; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  // Du plus rare au moins rare : la valeur suit la rareté puis l'effet.
  const sorted = [...cards].sort((x, y) => value(y) - value(x) || x.tradingCard.title.localeCompare(y.tradingCard.title));
  return (
    <motion.div role="dialog" aria-modal="true" aria-label={title} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="fixed inset-0 z-[200] flex flex-col bg-black/90 backdrop-blur-sm">
      <header className="flex items-center justify-between gap-4 border-b border-zinc-800 px-5 py-4 md:px-10">
        <h2 className="text-xl font-bold text-white md:text-2xl">{title} <span className="text-base font-normal tabular-nums text-zinc-400">{picked.size}/{TRADE_MAX_CARDS}</span></h2>
        <button type="button" onClick={onClose} className="btn-violet">Terminé</button>
      </header>
      <div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto px-5 py-6 md:px-10">
        {sorted.length === 0 && <p className="text-zinc-400">Aucune carte disponible.</p>}
        <div className="mx-auto grid max-w-[90rem] grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
          {sorted.map((c) => (
            <Tile key={c.id} c={c} on={picked.has(c.id)} disabled={!picked.has(c.id) && picked.size >= TRADE_MAX_CARDS} onToggle={() => onToggle(c.id)} onOpen={() => onOpen(c)} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function Balance({ a, b }: { a: number; b: number }) {
  const both = a > 0 && b > 0;
  const ok = !both || balanced(a, b);
  const share = a + b === 0 ? 50 : (a / (a + b)) * 100;
  return (
    <div aria-live="polite" className="min-w-0">
      <div className="flex items-baseline justify-between gap-4 text-sm tabular-nums">
        <span className="text-zinc-300">Tu donnes <strong className="text-white">{a} PC</strong></span>
        <span className="text-zinc-300">Tu reçois <strong className="text-white">{b} PC</strong></span>
      </div>
      <div aria-hidden className="mt-2 flex h-2 overflow-hidden rounded-full bg-zinc-900">
        <span className={`h-full transition-[width,background-color] duration-300 ${ok ? "bg-emerald-400" : "bg-amber-400"}`} style={{ width: `${share}%` }} />
        <span className="h-full flex-1 bg-violet-400/60" />
      </div>
      {both && (
        <p className={`mt-1.5 text-xs ${ok ? "text-emerald-400" : "text-amber-400"}`}>
          {ok ? "Échange équilibré" : `Écart de plus de ${TRADE_TOLERANCE * 100} % entre les deux côtés.`}
        </p>
      )}
    </div>
  );
}

function Slots({ title, cards, ok, onAdd, onRemove, onOpen }: { title: string; cards: Card[]; ok?: boolean; onAdd?: () => void; onRemove?: (id: string) => void; onOpen: (c: Card) => void }) {
  return (
    <section aria-label={title} className={`min-w-0 rounded-2xl border bg-[#09090b] p-4 transition-colors duration-300 md:p-5 ${ok ? "border-emerald-500/70" : "border-zinc-800"}`}>
      <h3 className="flex items-baseline justify-between gap-3">
        <span className="text-lg font-bold text-white">{title}{ok && <span className="ml-2 text-sm font-semibold text-emerald-400">Prêt</span>}</span>
        <span className="text-sm tabular-nums text-zinc-400">{total(cards)} PC · {cards.length}/{TRADE_MAX_CARDS}</span>
      </h3>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {Array.from({ length: TRADE_MAX_CARDS }, (_, i) => {
          const c = cards[i];
          if (!c) {
            const cls = "grid aspect-[2.5/3.5] place-items-center rounded-lg border-2 border-dashed text-3xl";
            return onAdd ? (
              <button key={i} type="button" onClick={onAdd} aria-label={`Ajouter une carte : ${title}`} className={`${cls} border-zinc-700 text-zinc-500 transition-colors duration-150 hover:border-violet-400 hover:text-violet-300 active:scale-[0.98]`}>+</button>
            ) : (
              <div key={i} aria-hidden className={`${cls} border-zinc-800 text-zinc-800`}>+</div>
            );
          }
          return (
            <div key={c.id} className="relative min-w-0">
              <button type="button" onClick={() => onOpen(c)} aria-label={`Agrandir ${c.tradingCard.title}`} className="block w-full">
                <CardDisplay card={c.tradingCard} size="md" specialEffect={c.specialEffect} disableTilt />
              </button>
              {onRemove && (
                <button type="button" onClick={() => onRemove(c.id)} aria-label={`Retirer ${c.tradingCard.title}`} className="absolute -right-2 -top-2 grid size-8 place-items-center rounded-full bg-zinc-900 text-sm text-white ring-1 ring-zinc-600 hover:bg-red-600">
                  <span aria-hidden>×</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function History({ t, onZoom }: { t: Trade; onZoom: (c: Card) => void }) {
  const [mineSide, theirSide] = t.mine ? [t.offered, t.requested] : [t.requested, t.offered];
  return (
    <li className="rounded-xl border border-zinc-800 bg-[#0b0b0d] p-5">
      <p className="text-sm text-zinc-400">Avec {t.mine ? t.to : t.from} · {STATUS[t.status]}</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {[["Tu as donné", mineSide], ["Tu as reçu", theirSide]].map(([label, cards]) => (
          <div key={label as string}>
            <p className="text-sm font-semibold text-zinc-300">{label as string} · {total(cards as Card[])} PC</p>
            <div className="mt-2 grid grid-cols-3 gap-1 sm:grid-cols-5">
              {(cards as Card[]).map((c) => <Tile key={c.id} c={c} onOpen={() => onZoom(c)} />)}
            </div>
          </div>
        ))}
      </div>
    </li>
  );
}

export default function Echanges() {
  const { data: session, status } = useSession();
  const [mine, setMine] = useState<Card[]>([]);
  const [trades, setTrades] = useState<Trade[] | null>(null);
  const [name, setName] = useState("");
  const [room, setRoom] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState<Card | null>(null);
  const [sheet, setSheet] = useState(false);
  const closeSheet = useCallback(() => setSheet(false), []);

  const loadTrades = useCallback(async () => {
    const r = await fetch("/api/trades", { cache: "no-store" });
    if (r.ok) setTrades((await r.json()).trades);
  }, []);
  const loadMine = useCallback(async () => {
    const r = await fetch("/api/user/collection", { cache: "no-store" });
    if (r.ok) setMine(((await r.json()).owned as Card[]).map((o) => ({ id: o.id, specialEffect: o.specialEffect, tradingCard: o.tradingCard })));
  }, []);
  const refresh = useCallback(() => { loadTrades(); loadMine(); }, [loadTrades, loadMine]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const j = q.get("joueur");
    if (j) setName(j.slice(0, 16));
    const salle = q.get("salle");
    if (salle) setRoom(salle);
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    const t = setTimeout(refresh, 0);
    return () => clearTimeout(t);
  }, [status, refresh]);

  // La table se met à jour dès que l'autre joueur touche à ses cartes ou valide.
  useRealtime("trade", refresh, status === "authenticated");

  const t = trades?.find((x) => x.id === room && x.status === "PENDING") ?? null;
  const closed = room && trades ? trades.find((x) => x.id === room && x.status !== "PENDING") : null;
  useEffect(() => {
    if (!closed) return;
    const text = closed.status === "ACCEPTED" ? "Échange effectué." : "La table a été fermée.";
    const id = setTimeout(() => { setMsg({ ok: closed.status === "ACCEPTED", text }); setRoom(null); }, 0);
    return () => clearTimeout(id);
  }, [closed]);

  const call = async (url: string, method: string, body: unknown) => {
    setBusy(true);
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) setMsg({ ok: false, text: data.error ?? "L'action a échoué." });
    else setMsg(null);
    refresh();
    return r.ok ? data : null;
  };

  const openRoom = async () => {
    const data = await call("/api/trades", "POST", { to: name.trim() });
    if (data) {
      setRoom(data.id);
      setName("");
    }
  };

  if (status === "loading") return <div role="status" className="mx-auto h-96 max-w-5xl px-5 md:px-10" />;
  if (!session) {
    return (
      <div className="mx-auto flex min-h-[70svh] max-w-5xl flex-col justify-center gap-6 px-5 md:px-10">
        <h1 className="text-5xl font-extrabold tracking-[-0.045em] text-white md:text-7xl">Échanges</h1>
        <p className="max-w-md text-lg text-zinc-300">Connecte-toi pour échanger des cartes avec les autres joueurs.</p>
        <button type="button" onClick={() => signIn("discord")} className="btn-violet self-start">Connexion Discord</button>
      </div>
    );
  }

  const myCards = t ? (t.mine ? t.offered : t.requested) : [];
  const theirCards = t ? (t.mine ? t.requested : t.offered) : [];
  const other = t ? (t.mine ? t.to : t.from) : "";
  const myOk = t ? (t.mine ? t.fromOk : t.toOk) : false;
  const theirOk = t ? (t.mine ? t.toOk : t.fromOk) : false;
  const setMyCards = (ids: string[]) => call(`/api/trades/${t!.id}`, "PUT", { cards: ids });
  const toggle = (id: string) => {
    const ids = myCards.map((c) => c.id);
    setMyCards(ids.includes(id) ? ids.filter((x) => x !== id) : ids.length < TRADE_MAX_CARDS ? [...ids, id] : ids);
  };
  const open = (trades ?? []).filter((x) => x.status === "PENDING" && x.id !== t?.id);
  const past = (trades ?? []).filter((x) => x.status !== "PENDING");

  return (
    <div className="mx-auto max-w-[90rem] px-5 pb-32 pt-12 md:px-10 md:pt-16">
      <h1 className="text-5xl font-extrabold tracking-[-0.045em] text-white md:text-7xl">Échanges</h1>
      <p className="mt-6 max-w-xl text-lg text-zinc-300">Une table pour deux. Chacun pose ses cartes, tout se voit en direct, l'échange part quand vous avez validé tous les deux.</p>

      {msg && <p role={msg.ok ? "status" : "alert"} className={`mt-6 text-sm ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</p>}

      {t ? (
        <section className="mt-12" aria-label={`Table avec ${other}`}>
          <div className="grid items-stretch gap-4 lg:grid-cols-[1fr_17rem_1fr]">
            <Slots title="Toi" cards={myCards} ok={myOk} onAdd={() => setSheet(true)} onRemove={toggle} onOpen={setZoom} />
            <div className="order-last flex flex-col justify-center gap-5 rounded-2xl border border-zinc-800 bg-[#0b0b0d] p-5 lg:order-none">
              <span aria-hidden className="hidden text-center text-4xl text-violet-400 lg:block">⇄</span>
              <Balance a={total(myCards)} b={total(theirCards)} />
              <button
                type="button"
                disabled={busy || (!myOk && (myCards.length === 0 || theirCards.length === 0))}
                onClick={() => call(`/api/trades/${t.id}`, "PATCH", { action: myOk ? "unconfirm" : "confirm" })}
                className={`${myOk ? "btn-line" : "btn-violet"} disabled:opacity-60`}
              >
                {myOk ? "Retirer ma validation" : "Valider l'échange"}
              </button>
              <p role="status" className="text-xs text-zinc-400">
                {myCards.length === 0 || theirCards.length === 0
                  ? "Il faut des cartes des deux côtés."
                  : myOk ? `En attente de ${other}…` : theirOk ? `${other} a validé, à toi.` : "Toute modification annule les validations."}
              </p>
              <button type="button" disabled={busy} onClick={() => call(`/api/trades/${t.id}`, "PATCH", { action: "cancel" })} className="text-sm text-zinc-400 underline hover:text-white">Fermer la table</button>
            </div>
            <Slots title={other} cards={theirCards} ok={theirOk} onOpen={setZoom} />
          </div>
          <AnimatePresence>
            {sheet && <Sheet title="Choisis tes cartes" cards={mine} picked={new Set(myCards.map((c) => c.id))} onToggle={toggle} onOpen={setZoom} onClose={closeSheet} />}
          </AnimatePresence>
        </section>
      ) : (
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-white">Ouvrir une table</h2>
          <form onSubmit={(e) => { e.preventDefault(); openRoom(); }} className="mt-4 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm text-zinc-300">
              Pseudo du joueur
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={16} className="min-h-11 rounded-md border border-zinc-500 bg-black px-3 text-white" />
            </label>
            <button type="submit" disabled={busy || !name.trim()} className="btn-violet disabled:opacity-60">Échanger</button>
          </form>
          <p className="mt-3 max-w-md text-sm text-zinc-400">Il reçoit un message Discord avec le lien de la table.</p>
        </section>
      )}

      {open.length > 0 && (
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-white">Tables ouvertes ({open.length})</h2>
          <ul className="mt-4 space-y-3">
            {open.map((x) => (
              <li key={x.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-[#0b0b0d] p-4">
                <span className="text-white">{x.mine ? x.to : x.from} <span className="text-sm text-zinc-400">· {x.offered.length + x.requested.length} carte{x.offered.length + x.requested.length > 1 ? "s" : ""} sur la table</span></span>
                <span className="flex gap-3">
                  <button type="button" onClick={() => setRoom(x.id)} className="btn-violet">Rejoindre</button>
                  <button type="button" disabled={busy} onClick={() => call(`/api/trades/${x.id}`, "PATCH", { action: "cancel" })} className="btn-line disabled:opacity-60">Fermer</button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {past.length > 0 && (
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-white">Historique</h2>
          <ul className="mt-4 space-y-4">{past.map((x) => <History key={x.id} t={x} onZoom={setZoom} />)}</ul>
        </section>
      )}
      <AnimatePresence>{zoom && <CardZoom card={zoom.tradingCard} effect={zoom.specialEffect} onClose={() => setZoom(null)} />}</AnimatePresence>
    </div>
  );
}

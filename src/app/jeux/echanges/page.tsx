"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import CardDisplay from "@/features/binder/components/CardDisplay";
import CardZoom from "@/components/tcg/CardZoom";
import type { TradingCard } from "@/types/cards";
import { cardValue } from "@/lib/cardValue";
import { TRADE_MAX_CARDS, TRADE_TOLERANCE, balanced } from "@/lib/trades";

type Card = { id: string; specialEffect: string | null; tradingCard: TradingCard };
type Trade = { id: string; status: string; from: string; to: string; mine: boolean; offered: Card[]; requested: Card[] };

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

function Picker({ title, cards, picked, onToggle, onOpen }: { title: string; cards: Card[]; picked: Set<string>; onToggle: (id: string) => void; onOpen: (c: Card) => void }) {
  return (
    <fieldset className="min-w-0">
      <legend className="text-sm font-semibold text-zinc-300">
        {title} <span className="font-normal text-zinc-400">({picked.size}/{TRADE_MAX_CARDS})</span>
      </legend>
      <div data-lenis-prevent className="mt-3 grid max-h-[42rem] grid-cols-2 gap-1 overflow-y-auto rounded-xl border border-zinc-800 bg-[#09090b] p-2 xl:grid-cols-3">
        {cards.length === 0 && <p className="col-span-full p-2 text-sm text-zinc-400">Aucune carte.</p>}
        {cards.map((c) => (
          <Tile key={c.id} c={c} on={picked.has(c.id)} disabled={!picked.has(c.id) && picked.size >= TRADE_MAX_CARDS} onToggle={() => onToggle(c.id)} onOpen={() => onOpen(c)} />
        ))}
      </div>
    </fieldset>
  );
}

function Balance({ give, get }: { give: Card[]; get: Card[] }) {
  const a = total(give), b = total(get);
  const both = a > 0 && b > 0;
  const ok = !both || balanced(a, b);
  const share = a + b === 0 ? 50 : (a / (a + b)) * 100;
  return (
    <div aria-live="polite" className="min-w-0 flex-1">
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
          {ok ? "Échange équilibré" : `Écart de plus de ${TRADE_TOLERANCE * 100} % : l'autre joueur le verra.`}
        </p>
      )}
    </div>
  );
}

function Slots({ title, cards, onRemove, onOpen }: { title: string; cards: Card[]; onRemove: (id: string) => void; onOpen: (c: Card) => void }) {
  return (
    <section aria-label={title} className="min-w-0 rounded-2xl border border-zinc-800 bg-[#09090b] p-4 md:p-5">
      <h3 className="flex items-baseline justify-between gap-3">
        <span className="text-lg font-bold text-white">{title}</span>
        <span className="text-sm tabular-nums text-zinc-400">{total(cards)} PC · {cards.length}/{TRADE_MAX_CARDS}</span>
      </h3>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {Array.from({ length: TRADE_MAX_CARDS }, (_, i) => {
          const c = cards[i];
          if (!c) return <div key={i} aria-hidden className="grid aspect-[2.5/3.5] place-items-center rounded-lg border-2 border-dashed border-zinc-800 text-2xl text-zinc-700">+</div>;
          return (
            <div key={c.id} className="group relative min-w-0">
              <button type="button" onClick={() => onOpen(c)} aria-label={`Agrandir ${c.tradingCard.title}`} className="block w-full">
                <CardDisplay card={c.tradingCard} size="md" specialEffect={c.specialEffect} disableTilt />
              </button>
              <button type="button" onClick={() => onRemove(c.id)} aria-label={`Retirer ${c.tradingCard.title}`} className="absolute -right-2 -top-2 grid size-8 place-items-center rounded-full bg-zinc-900 text-sm text-white ring-1 ring-zinc-600 hover:bg-red-600">
                <span aria-hidden>×</span>
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TradeItem({ t, busy, onZoom, onRespond }: { t: Trade; busy: boolean; onZoom: (c: Card) => void; onRespond: (id: string, action: string) => void }) {
  const left = { label: t.mine ? "Tu donnes" : "Tu reçois", cards: t.offered };
  const right = { label: t.mine ? "Tu reçois" : "Tu donnes", cards: t.requested };
  return (
    <li className="rounded-xl border border-zinc-800 bg-[#0b0b0d] p-5">
      <p className="text-sm text-zinc-400">{t.mine ? `Pour ${t.to}` : `De ${t.from}`} · {STATUS[t.status]}</p>
      <div className="mt-4 grid items-start gap-4 md:grid-cols-[1fr_auto_1fr]">
        {[left, right].map((side, i) => (
          <div key={side.label} className={i === 1 ? "md:col-start-3" : ""}>
            <p className="text-sm font-semibold text-zinc-300">{side.label} · {total(side.cards)} PC</p>
            <div className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-3">
              {side.cards.map((c) => <Tile key={c.id} c={c} onOpen={() => onZoom(c)} />)}
            </div>
          </div>
        ))}
        <span aria-hidden className="hidden self-center text-3xl text-violet-400 md:col-start-2 md:row-start-1 md:block">⇄</span>
      </div>
      {t.status === "PENDING" && (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {!t.mine && <button type="button" disabled={busy} onClick={() => onRespond(t.id, "accept")} className="btn-violet disabled:opacity-60">Accepter</button>}
          <button type="button" disabled={busy} onClick={() => onRespond(t.id, t.mine ? "cancel" : "decline")} className="btn-line disabled:opacity-60">{t.mine ? "Annuler" : "Refuser"}</button>
          {!t.mine && !balanced(total(t.offered), total(t.requested)) && <span className="text-sm text-amber-400">Écart de plus de {TRADE_TOLERANCE * 100} % entre les deux côtés.</span>}
        </div>
      )}
    </li>
  );
}

export default function Echanges() {
  const { data: session, status } = useSession();
  const [mine, setMine] = useState<Card[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [name, setName] = useState("");
  const [target, setTarget] = useState<{ name: string; cards: Card[] } | null>(null);
  const [give, setGive] = useState<Set<string>>(new Set());
  const [get, setGet] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState<Card | null>(null);

  const loadTrades = useCallback(async () => {
    const r = await fetch("/api/trades", { cache: "no-store" });
    if (r.ok) setTrades((await r.json()).trades);
  }, []);
  const loadMine = useCallback(async () => {
    const r = await fetch("/api/user/collection", { cache: "no-store" });
    if (r.ok) setMine(((await r.json()).owned as Card[]).map((o) => ({ id: o.id, specialEffect: o.specialEffect, tradingCard: o.tradingCard })));
  }, []);

  useEffect(() => {
    const j = new URLSearchParams(window.location.search).get("joueur");
    if (j) setName(j.slice(0, 16));
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    const t = setTimeout(() => { loadTrades(); loadMine(); }, 0);
    return () => clearTimeout(t);
  }, [status, loadTrades, loadMine]);

  const post = async (url: string, method: string, body: unknown) => {
    setBusy(true);
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await r.json().catch(() => ({}));
    setBusy(false);
    setMsg({ ok: r.ok, text: r.ok ? "C'est fait." : data.error ?? "L'action a échoué." });
    return r.ok;
  };

  const find = async () => {
    setMsg(null);
    const r = await fetch(`/api/trades/cards?name=${encodeURIComponent(name.trim())}`);
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return setMsg({ ok: false, text: data.error ?? "Recherche impossible." });
    setTarget(data);
    setGive(new Set());
    setGet(new Set());
  };

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void) => (id: string) => {
    const n = new Set(set);
    if (!n.delete(id)) n.add(id);
    setter(n);
  };

  const send = async () => {
    if (!target) return;
    if (await post("/api/trades", "POST", { to: target.name, offered: [...give], requested: [...get] })) {
      setMsg({ ok: true, text: `Proposition envoyée à ${target.name}.` });
      setTarget(null);
      setName("");
      loadTrades();
    }
  };

  const respond = async (id: string, action: string) => {
    if (await post(`/api/trades/${id}`, "PATCH", { action })) {
      setMsg({ ok: true, text: action === "accept" ? "Échange effectué." : "C'est fait." });
      loadTrades();
      loadMine();
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

  const giveCards = mine.filter((c) => give.has(c.id));
  const getCards = (target?.cards ?? []).filter((c) => get.has(c.id));
  const incoming = trades.filter((t) => !t.mine && t.status === "PENDING");
  const outgoing = trades.filter((t) => t.mine && t.status === "PENDING");
  const past = trades.filter((t) => t.status !== "PENDING");

  return (
    <div className="mx-auto max-w-[90rem] px-5 pb-32 pt-12 md:px-10 md:pt-16">
      <h1 className="text-5xl font-extrabold tracking-[-0.045em] text-white md:text-7xl">Échanges</h1>
      <p className="mt-6 max-w-xl text-lg text-zinc-300">Cartes contre cartes. La valeur en ParaCoins sert à équilibrer, pas à payer.</p>

      {msg && <p role={msg.ok ? "status" : "alert"} className={`mt-6 text-sm ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</p>}

      {incoming.length > 0 && (
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-white">Reçus ({incoming.length})</h2>
          <ul className="mt-4 space-y-4">{incoming.map((t) => <TradeItem key={t.id} t={t} busy={busy} onZoom={setZoom} onRespond={respond} />)}</ul>
        </section>
      )}

      <section className="mt-12">
        <h2 className="text-2xl font-bold text-white">Proposer un échange</h2>
        <form onSubmit={(e) => { e.preventDefault(); find(); }} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm text-zinc-300">
            Pseudo du joueur
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={16} className="min-h-11 rounded-md border border-zinc-500 bg-black px-3 text-white" />
          </label>
          <button type="submit" disabled={!name.trim()} className="btn-line disabled:opacity-60">Voir ses cartes</button>
        </form>

        {target && (
          <div className="mt-8 space-y-10">
            <div className="grid items-stretch gap-4 lg:grid-cols-[1fr_17rem_1fr]">
              <Slots title="Tu donnes" cards={giveCards} onRemove={(id) => toggle(give, setGive)(id)} onOpen={setZoom} />
              <div className="order-last flex flex-col justify-center gap-5 rounded-2xl border border-zinc-800 bg-[#0b0b0d] p-5 lg:order-none">
                <span aria-hidden className="hidden text-center text-4xl text-violet-400 lg:block">⇄</span>
                <Balance give={giveCards} get={getCards} />
                <button type="button" disabled={busy || give.size === 0 || get.size === 0} onClick={send} className="btn-violet disabled:opacity-60">
                  Envoyer la proposition
                </button>
                <p className="text-xs text-zinc-400">{give.size === 0 || get.size === 0 ? "Choisis au moins une carte de chaque côté." : `Proposition pour ${target.name}.`}</p>
              </div>
              <Slots title={`${target.name} donne`} cards={getCards} onRemove={(id) => toggle(get, setGet)(id)} onOpen={setZoom} />
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <Picker title="Ta collection" cards={mine} picked={give} onToggle={toggle(give, setGive)} onOpen={setZoom} />
              <Picker title={`Collection de ${target.name}`} cards={target.cards} picked={get} onToggle={toggle(get, setGet)} onOpen={setZoom} />
            </div>
          </div>
        )}
      </section>

      {outgoing.length > 0 && (
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-white">Envoyés ({outgoing.length})</h2>
          <ul className="mt-4 space-y-4">{outgoing.map((t) => <TradeItem key={t.id} t={t} busy={busy} onZoom={setZoom} onRespond={respond} />)}</ul>
        </section>
      )}

      {past.length > 0 && (
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-white">Historique</h2>
          <ul className="mt-4 space-y-4">{past.map((t) => <TradeItem key={t.id} t={t} busy={busy} onZoom={setZoom} onRespond={respond} />)}</ul>
        </section>
      )}
      <AnimatePresence>{zoom && <CardZoom card={zoom.tradingCard} effect={zoom.specialEffect} onClose={() => setZoom(null)} />}</AnimatePresence>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import toast from "react-hot-toast";
import { isStaff } from "@/lib/roles";

type Message = { id: string; authorName: string; authorRole: "USER" | "STAFF" | "SYSTEM"; authorImage?: string; content: string; createdAt: string };
type Ticket = {
  id: string;
  ticketId: string;
  userId?: string;
  userName: string;
  minecraftName?: string;
  category: string;
  description: string;
  status: "OPEN" | "CLAIMED" | "CLOSED";
  claimedBy?: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
};

const CATEGORIES = ["Aide", "Bug sur le site", "Launcher", "ParaCoins ou boosters", "Signaler un joueur", "Autre"];
const STATUS: Record<Ticket["status"], { label: string; cls: string }> = {
  OPEN: { label: "Ouvert", cls: "text-violet-400" },
  CLAIMED: { label: "Pris en charge", cls: "text-white" },
  CLOSED: { label: "Fermé", cls: "text-zinc-400" },
};
const input = "min-h-11 w-full rounded-md border border-zinc-500 bg-black px-3 text-sm text-white placeholder:text-zinc-400 focus-visible:border-violet-400";
const when = (d: string) =>
  new Date(d).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

async function call(url: string, method = "GET", body?: unknown) {
  const res = await fetch(url, {
    method,
    cache: "no-store",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error((await res.text()) || `Erreur ${res.status}`);
  return res.json();
}

function NewTicket({ onCreated }: { onCreated: (t: Ticket) => void }) {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim().length < 10) {
      toast.error("Décris ton problème en quelques mots de plus.");
      return;
    }
    setBusy(true);
    try {
      const t: Ticket = await call("/api/tickets", "POST", { category, description: description.trim() });
      setDescription("");
      toast.success(`Ticket ${t.ticketId} ouvert.`);
      onCreated(t);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-md border border-zinc-900 p-5">
      <h2 className="text-xl font-semibold text-white">Nouveau ticket</h2>
      <label className="flex flex-col gap-1.5 text-sm text-zinc-300">
        Sujet
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={input}>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm text-zinc-300">
        Ton problème
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          maxLength={5000}
          placeholder="Que s'est-il passé ? Sur quelle page, à quel moment ?"
          className={`${input} py-2`}
        />
      </label>
      <button type="submit" disabled={busy} className="btn-violet self-start disabled:opacity-50">
        {busy ? "Envoi…" : "Ouvrir le ticket"}
      </button>
      <p className="text-xs text-zinc-400">L&apos;équipe répond ici ou dans le salon du ticket sur Discord.</p>
    </form>
  );
}

function Thread({ ticket, staff, onChange }: { ticket: Ticket; staff: boolean; onChange: (t: Ticket) => void }) {
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLLIElement>(null);
  const closed = ticket.status === "CLOSED";

  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [ticket.messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setBusy(true);
    try {
      onChange(await call(`/api/tickets/${ticket.id}/messages`, "POST", { content: reply.trim() }));
      setReply("");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const action = async (a: "claim" | "close") => {
    try {
      onChange(await call(`/api/tickets/${ticket.id}`, "PATCH", { action: a }));
      toast.success(a === "claim" ? "Ticket pris en charge." : "Ticket fermé.");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="flex flex-col rounded-md border border-zinc-900">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-900 p-5">
        <div>
          <p className="font-mono text-xs text-zinc-400">{ticket.ticketId}</p>
          <h2 className="mt-1 text-xl font-semibold text-white">{ticket.category}</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Ouvert le {when(ticket.createdAt)}
            {staff && ` par ${ticket.userName}${ticket.minecraftName ? ` (${ticket.minecraftName})` : ""}`}
            {ticket.claimedBy && ` · suivi par ${ticket.claimedBy}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-medium ${STATUS[ticket.status].cls}`}>{STATUS[ticket.status].label}</span>
          {staff && ticket.status === "OPEN" && (
            <button type="button" onClick={() => action("claim")} className="btn-line min-h-11 px-3">
              Prendre en charge
            </button>
          )}
          {staff && !closed && (
            <button type="button" onClick={() => action("close")} className="btn-line min-h-11 px-3">
              Fermer
            </button>
          )}
        </div>
      </div>

      <ol className="flex max-h-[55svh] flex-col gap-4 overflow-y-auto p-5" data-lenis-prevent aria-label="Messages du ticket">
        <li className="rounded-md bg-zinc-950 p-4">
          <p className="text-xs text-zinc-400">Demande initiale</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-100">{ticket.description}</p>
        </li>
        {ticket.messages.map((m) => {
          const fromStaff = m.authorRole === "STAFF";
          const system = m.authorRole === "SYSTEM";
          return (
            <li key={m.id} className={`flex flex-col gap-1 ${system ? "items-center" : fromStaff ? "items-start" : "items-end"}`}>
              {system ? (
                <p className="text-xs text-zinc-400">{m.content}</p>
              ) : (
                <>
                  <p className="text-xs text-zinc-400">
                    <span className={fromStaff ? "font-semibold text-violet-400" : "font-semibold text-zinc-200"}>{m.authorName}</span>
                    {fromStaff && " · équipe"} · {when(m.createdAt)}
                  </p>
                  <p className={`max-w-[85%] whitespace-pre-wrap rounded-md px-4 py-3 text-sm ${fromStaff ? "bg-zinc-900 text-white" : "bg-violet-950 text-white"}`}>
                    {m.content}
                  </p>
                </>
              )}
            </li>
          );
        })}
        <li ref={end} aria-hidden />
      </ol>

      {closed ? (
        <p className="border-t border-zinc-900 p-5 text-sm text-zinc-400">Ce ticket est fermé. Ouvre-en un nouveau si besoin.</p>
      ) : (
        <form onSubmit={send} className="flex flex-col gap-3 border-t border-zinc-900 p-5 sm:flex-row">
          <label htmlFor="reply" className="sr-only">
            Ta réponse
          </label>
          <textarea
            id="reply"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send(e);
            }}
            rows={2}
            maxLength={4000}
            placeholder="Écris ta réponse (Ctrl + Entrée pour envoyer)"
            className={`${input} flex-1 py-2`}
          />
          <button type="submit" disabled={busy || !reply.trim()} className="btn-violet self-end disabled:opacity-50">
            {busy ? "…" : "Envoyer"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function SupportPage() {
  const { data: session, status } = useSession();
  const staff = isStaff(session?.user?.role as string | undefined);
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [error, setError] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"active" | "all">("active");

  const load = useCallback(async () => {
    try {
      const list: Ticket[] = await call("/api/tickets");
      list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      setTickets(list);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    const first = setTimeout(load, 0);
    const every = setInterval(() => document.visibilityState === "visible" && load(), 15_000);
    return () => {
      clearTimeout(first);
      clearInterval(every);
    };
  }, [status, load]);

  const upsert = (t: Ticket) => {
    setTickets((all) => [t, ...(all ?? []).filter((x) => x.id !== t.id)]);
    setOpenId(t.id);
  };

  if (status === "loading") {
    return <div role="status" className="mx-auto h-96 max-w-7xl animate-pulse px-5 md:px-10" />;
  }

  if (!session) {
    return (
      <div className="mx-auto flex min-h-[70svh] max-w-7xl flex-col justify-center gap-6 px-5 md:px-10">
        <h1 className="text-5xl font-extrabold tracking-[-0.045em] text-white md:text-7xl">Support</h1>
        <p className="max-w-md text-lg text-zinc-300">Connecte-toi pour ouvrir un ticket et suivre les réponses de l&apos;équipe.</p>
        <button type="button" onClick={() => signIn("discord")} className="btn-violet self-start">
          Connexion Discord
        </button>
      </div>
    );
  }

  const shown = (tickets ?? []).filter((t) => filter === "all" || t.status !== "CLOSED");
  const current = (tickets ?? []).find((t) => t.id === openId) ?? null;

  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-12 md:px-10 md:pt-16">
      <h1 className="text-5xl font-extrabold tracking-[-0.045em] text-white md:text-7xl">Support</h1>
      <p className="mt-4 max-w-xl text-lg text-zinc-300">
        {staff ? "Tous les tickets des joueurs. Prends-en un en charge pour répondre." : "Un souci sur le site ou le launcher ? Ouvre un ticket, l'équipe te répond ici."}
      </p>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-6">
          {!staff && <NewTicket onCreated={upsert} />}
          <div>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-zinc-300">{staff ? "Tickets" : "Mes tickets"}</h2>
              <div className="flex gap-1" role="group" aria-label="Filtre">
                {(["active", "all"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    aria-pressed={filter === f}
                    className={`press min-h-11 rounded-md px-3 text-sm ${filter === f ? "bg-zinc-900 text-white ring-1 ring-zinc-700" : "text-zinc-400 hover:text-white"}`}
                  >
                    {f === "active" ? "En cours" : "Tous"}
                  </button>
                ))}
              </div>
            </div>
            {error && (
              <p role="alert" className="mt-4 text-sm text-zinc-300">
                Impossible de charger les tickets.{" "}
                <button type="button" onClick={load} className="min-h-11 underline underline-offset-4">
                  Réessayer
                </button>
              </p>
            )}
            {!tickets && !error && (
              <div role="status" className="mt-4 flex flex-col gap-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-md bg-zinc-950" />
                ))}
                <span className="sr-only">Chargement</span>
              </div>
            )}
            {tickets && shown.length === 0 && <p className="mt-4 text-sm text-zinc-400">Aucun ticket {filter === "active" ? "en cours" : ""}.</p>}
            {tickets && shown.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1" data-lenis-prevent>
                {shown.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setOpenId(t.id)}
                      aria-current={t.id === openId ? "true" : undefined}
                      className={`press flex min-h-16 w-full flex-col justify-center rounded-md px-3 text-left ${t.id === openId ? "bg-zinc-900 ring-1 ring-zinc-700" : "hover:bg-zinc-950"}`}
                    >
                      <span className="flex w-full justify-between gap-2 text-sm">
                        <span className="truncate font-semibold text-white">{staff ? t.userName : t.category}</span>
                        <span className={STATUS[t.status].cls}>{STATUS[t.status].label}</span>
                      </span>
                      <span className="truncate text-xs text-zinc-400">
                        {staff ? `${t.category} · ` : ""}
                        {when(t.updatedAt)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        <section aria-label="Ticket sélectionné">
          {current ? (
            <Thread ticket={current} staff={staff} onChange={upsert} />
          ) : (
            <div className="flex min-h-64 items-center justify-center rounded-md border border-dashed border-zinc-800 p-8 text-center text-zinc-400">
              {staff ? "Choisis un ticket dans la liste." : "Ouvre un ticket ou choisis-en un dans la liste."}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

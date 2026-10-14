"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import toast from "react-hot-toast";
import { useResource, send } from "@/features/admin/useResource";
import { ListState, inputCls } from "@/features/admin/ui";
import { SettingsForm, type BotModule } from "@/features/admin/BotModules";
import { Announce, Appeals, Tiktoks, type BotOverview } from "@/features/admin/Bot";
import { isAdmin, isStaff } from "@/lib/roles";
import { EASE_OUT } from "@/lib/motion";

const TOOLS = [
  { key: "appeals", label: "Appels et sanctions", admin: false },
  { key: "announce", label: "Annonce", admin: false },
  { key: "tiktok", label: "Alertes TikTok", admin: true },
] as const;
type ToolKey = (typeof TOOLS)[number]["key"];

function Switch({ mod, onToggle, size = "md" }: { mod: BotModule; onToggle: (m: BotModule) => void; size?: "md" | "lg" }) {
  const lg = size === "lg";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={mod.enabled}
      aria-label={`${mod.enabled ? "Couper" : "Activer"} ${mod.name}`}
      onClick={() => onToggle(mod)}
      className="press inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md"
    >
      <span
        aria-hidden
        className={`relative inline-flex items-center rounded-full ring-1 transition-colors duration-200 ${lg ? "h-8 w-14" : "h-6 w-11"} ${
          mod.enabled ? "bg-violet-600 ring-violet-400" : "bg-zinc-900 ring-zinc-400"
        }`}
      >
        <span
          className={`absolute rounded-full transition-transform duration-200 ease-out ${lg ? "left-1 h-6 w-6" : "left-0.5 h-5 w-5"} ${
            mod.enabled ? `bg-white ${lg ? "translate-x-6" : "translate-x-5"}` : "translate-x-0 bg-zinc-300"
          }`}
        />
      </span>
    </button>
  );
}

function Commands({ list }: { list: string[] }) {
  if (list.length === 0) return null;
  return (
    <p className="flex flex-wrap gap-1.5">
      {list.map((c) => (
        <span key={c} className="rounded-sm bg-zinc-900 px-1.5 py-0.5 font-mono text-xs text-zinc-300">
          /{c}
        </span>
      ))}
    </p>
  );
}

export default function BotDashboard() {
  const { data: session, status } = useSession();
  const role = session?.user?.role as string | undefined;
  const canAdmin = isAdmin(role);
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [query, setQuery] = useState("");

  const overview = useResource<BotOverview>("/api/admin/bot");
  const modules = useResource<BotModule[]>(canAdmin ? "/api/admin/bot/modules" : null);
  const list = useMemo(() => modules.data ?? [], [modules.data]);

  const selectedId = canAdmin ? params.get("m") : null;
  const tool = TOOLS.find((t) => t.key === params.get("v") && (canAdmin || !t.admin))?.key as ToolKey | undefined;
  const selected = list.find((m) => m.id === selectedId);
  const go = (q: string) => router.push(q ? `${pathname}?${q}` : pathname, { scroll: false });

  const replace = (m: BotModule) => modules.setData((all) => (all ? all.map((x) => (x.id === m.id ? m : x)) : all));
  const toggle = async (m: BotModule) => {
    replace({ ...m, enabled: !m.enabled });
    try {
      replace(await send("/api/admin/bot/modules", "PUT", { id: m.id, enabled: !m.enabled }));
      toast.success(m.enabled ? `${m.name} coupé.` : `${m.name} activé.`);
    } catch (e) {
      replace(m);
      toast.error((e as Error).message);
    }
  };

  const q = query.trim().toLowerCase();
  const shown = q ? list.filter((m) => `${m.name} ${m.description} ${m.commands.join(" ")}`.toLowerCase().includes(q)) : list;
  const categories = [...new Set(shown.map((m) => m.category))];
  const active = list.filter((m) => m.enabled).length;
  const d = overview.data;

  if (status === "loading") return <div role="status" className="mx-auto h-96 max-w-7xl animate-pulse px-5 md:px-10" />;
  if (!isStaff(role)) {
    return (
      <div className="mx-auto flex min-h-[60svh] max-w-7xl flex-col justify-center px-5 md:px-10">
        <h1 className="text-4xl font-bold tracking-[-0.03em] text-white">Accès réservé au staff</h1>
      </div>
    );
  }

  const navBtn = (isOn: boolean) =>
    `press flex min-h-11 w-full items-center gap-2.5 rounded-md px-3 text-left text-sm ${isOn ? "bg-zinc-900 text-white ring-1 ring-zinc-700" : "text-zinc-400 hover:text-white"}`;
  const groupTitle = "px-3 text-sm font-semibold text-zinc-300";
  const viewKey = selectedId ? `m-${selectedId}` : tool ? `v-${tool}` : "home";

  const moduleView = () => {
    if (!selected) {
      if (modules.loading || (!modules.data && !modules.error)) {
        return <div role="status" aria-label="Chargement du module" className="h-64 animate-pulse rounded-md bg-zinc-950" />;
      }
      if (modules.error) return <ListState loading={false} error={modules.error} empty={false} emptyText="" onRetry={modules.reload} />;
      return (
        <div className="flex flex-col items-start gap-4 py-8">
          <h2 className="text-3xl font-bold tracking-[-0.03em] text-white">Module introuvable</h2>
          <p className="text-zinc-400">Aucun module ne porte l&apos;identifiant « {selectedId} ». Il a peut-être été renommé ou retiré du bot.</p>
          <button type="button" onClick={() => go("")} className="btn-line min-h-11">
            Voir tous les modules
          </button>
        </div>
      );
    }
    return (
      <section className="flex flex-col gap-8">
        <div className="flex flex-wrap items-start justify-between gap-6 border-b border-zinc-900 pb-8">
          <div className="max-w-2xl">
            <p className="text-sm text-zinc-400">{selected.category}</p>
            <h2 className="mt-1 text-4xl font-bold tracking-[-0.03em] text-white md:text-5xl">{selected.name}</h2>
            <p className="mt-4 text-zinc-300">{selected.description}</p>
            <div className="mt-4">
              <Commands list={selected.commands} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm ${selected.enabled ? "text-violet-400" : "text-zinc-400"}`}>{selected.enabled ? "Activé" : "Coupé"}</span>
            <Switch mod={selected} onToggle={toggle} size="lg" />
          </div>
        </div>
        {selected.settings.length > 0 ? (
          <div className="overflow-hidden rounded-md border border-zinc-900">
            <h3 className="border-b border-zinc-900 px-4 py-3 text-sm font-semibold text-white">Réglages</h3>
            <SettingsForm key={selected.id} mod={selected} onSaved={replace} />
          </div>
        ) : (
          <p className="text-sm text-zinc-400">Ce module n&apos;a pas de réglage : il suffit de l&apos;activer.</p>
        )}
      </section>
    );
  };

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-5 pb-24 pt-10 md:px-10 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
      <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100svh-7rem)] lg:self-start lg:overflow-y-auto lg:pr-2">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-white">Bot Discord</h1>
          {d && (
            <span className={`flex items-center gap-1.5 text-sm ${d.status.online ? "text-violet-400" : "text-red-400"}`}>
              <span aria-hidden className={`h-2 w-2 rounded-full ${d.status.online ? "bg-violet-400" : "bg-red-400"}`} />
              {d.status.online ? "En ligne" : "Hors ligne"}
            </span>
          )}
        </div>
        <Link href="/admin" className="inline-flex min-h-11 items-center text-sm text-zinc-400 hover:text-white">
          ← Admin
        </Link>

        <nav aria-label="Panel du bot" className="mt-3 flex flex-col gap-6">
          <ul className="-mx-1 flex gap-1 overflow-x-auto px-1 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0">
            <li className="shrink-0">
              <button type="button" onClick={() => go("")} aria-current={viewKey === "home" ? "page" : undefined} className={navBtn(viewKey === "home")}>
                Vue d&apos;ensemble
              </button>
            </li>
            {TOOLS.filter((t) => canAdmin || !t.admin).map((t) => (
              <li key={t.key} className="shrink-0">
                <button type="button" onClick={() => go(`v=${t.key}`)} aria-current={tool === t.key ? "page" : undefined} className={navBtn(tool === t.key)}>
                  <span className="flex-1 whitespace-nowrap">{t.label}</span>
                  {t.key === "appeals" && d && d.stats.pendingAppeals > 0 && <span className="tabular-nums text-violet-400">{d.stats.pendingAppeals}</span>}
                </button>
              </li>
            ))}
          </ul>

          {canAdmin && list.length > 0 && (
            <>
              <label className="flex flex-col gap-1.5 text-sm text-zinc-300 lg:hidden">
                Aller à un module
                <select value={selected?.id ?? ""} onChange={(e) => go(e.target.value ? `m=${e.target.value}` : "")} className={inputCls}>
                  <option value="">Choisir un module</option>
                  {[...new Set(list.map((m) => m.category))].map((cat) => (
                    <optgroup key={cat} label={cat}>
                      {list
                        .filter((m) => m.category === cat)
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                            {m.enabled ? "" : " (coupé)"}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </label>

              <div className="hidden lg:block">
                <label htmlFor="bot-search" className="sr-only">
                  Chercher un module
                </label>
                <input
                  id="bot-search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Chercher un module ou une commande"
                  className={`${inputCls} w-full`}
                />
                {categories.map((cat) => (
                  <div key={cat} className="mt-5">
                    <p className={groupTitle}>{cat}</p>
                    <ul className="mt-1.5 flex flex-col gap-0.5">
                      {shown
                        .filter((m) => m.category === cat)
                        .map((m) => (
                          <li key={m.id}>
                            <button type="button" onClick={() => go(`m=${m.id}`)} aria-current={selected?.id === m.id ? "page" : undefined} className={navBtn(selected?.id === m.id)}>
                              <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${m.enabled ? "bg-violet-400" : "ring-1 ring-zinc-400"}`} />
                              <span className="truncate">{m.name}</span>
                              <span className="sr-only">{m.enabled ? "(activé)" : "(coupé)"}</span>
                            </button>
                          </li>
                        ))}
                    </ul>
                  </div>
                ))}
                {q && shown.length === 0 && <p className="mt-4 px-3 text-sm text-zinc-400">Aucun module trouvé.</p>}
              </div>
            </>
          )}
        </nav>
      </aside>

      <AnimatePresence mode="wait">
        <motion.main
          key={viewKey}
          initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(8px)" }}
          animate={{ opacity: 1, transform: "translateY(0px)", transitionEnd: { transform: "none" } }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: EASE_OUT }}
          className="min-w-0"
        >
          {selectedId ? (
            moduleView()
          ) : tool === "appeals" ? (
            d ? (
              <Appeals data={d} onChange={(appeals) => overview.setData({ ...d, appeals, stats: { ...d.stats, pendingAppeals: appeals.filter((a) => a.status === "pending").length } })} />
            ) : (
              <ListState loading={overview.loading} error={overview.error} empty={false} emptyText="" onRetry={overview.reload} />
            )
          ) : tool === "announce" ? (
            <Announce />
          ) : tool === "tiktok" ? (
            d ? (
              <Tiktoks data={d} onChange={(tiktokTargets) => overview.setData({ ...d, tiktokTargets, stats: { ...d.stats, monitoredTiktoks: tiktokTargets.length } })} />
            ) : (
              <ListState loading={overview.loading} error={overview.error} empty={false} emptyText="" onRetry={overview.reload} />
            )
          ) : (
            <section className="flex flex-col gap-10">
              <div className="border-b border-zinc-900 pb-8">
                <h2 className="text-4xl font-bold tracking-[-0.03em] text-white md:text-5xl">Vue d&apos;ensemble</h2>
                <p className="mt-3 max-w-2xl text-zinc-400">
                  {canAdmin
                    ? "Active les modules et règle leurs salons, rôles et messages. Un module coupé arrête ses actions automatiques et ses commandes sont retirées du serveur."
                    : "Appels de sanctions et annonces. Les modules du bot se règlent par un admin."}
                </p>
              </div>

              <ListState loading={overview.loading && !d} error={overview.error} empty={false} emptyText="" onRetry={overview.reload} />
              {d && (
                <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {[
                    ...(canAdmin && modules.data ? [{ label: "Modules actifs", value: `${active} / ${list.length}` }] : []),
                    { label: "Appels en attente", value: d.stats.pendingAppeals },
                    { label: "Sanctions récentes", value: d.stats.totalSanctions },
                    { label: "TikTok suivis", value: d.stats.monitoredTiktoks },
                  ].map((s) => (
                    <div key={s.label} className="rounded-md border border-zinc-900 p-4">
                      <dt className="text-sm text-zinc-400">{s.label}</dt>
                      <dd className="mt-1 text-2xl font-bold tabular-nums text-white">{s.value}</dd>
                    </div>
                  ))}
                  {d.status.error && <p className="col-span-full text-sm text-red-400">Connexion Discord : {d.status.error}</p>}
                </dl>
              )}

              {canAdmin && (
                <>
                  <ListState
                    loading={modules.loading && !modules.data}
                    error={modules.error}
                    empty={!!modules.data && list.length === 0}
                    emptyText="Aucun module : le bot n'a pas encore démarré avec le système de modules. Lance-le une fois et ils apparaîtront ici."
                    onRetry={modules.reload}
                  />
                  {[...new Set(list.map((m) => m.category))].map((cat) => (
                    <div key={cat}>
                      <h3 className="text-lg font-semibold text-white">{cat}</h3>
                      <ul className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                        {list
                          .filter((m) => m.category === cat)
                          .map((m) => (
                            <li key={m.id} className={`flex flex-col gap-3 rounded-md border p-4 transition-colors ${m.enabled ? "border-zinc-800" : "border-zinc-900"}`}>
                              <div className="flex items-start justify-between gap-3">
                                <p className={`pt-2.5 font-semibold ${m.enabled ? "text-white" : "text-zinc-400"}`}>{m.name}</p>
                                <Switch mod={m} onToggle={toggle} />
                              </div>
                              <p className="line-clamp-2 text-sm text-zinc-400">{m.description}</p>
                              <div className="mt-auto flex items-end justify-between gap-3">
                                <Commands list={m.commands} />
                                <button type="button" onClick={() => go(`m=${m.id}`)} className="btn-line ml-auto min-h-11 shrink-0 px-3 text-sm">
                                  {m.settings.length > 0 ? "Configurer" : "Détails"}
                                </button>
                              </div>
                            </li>
                          ))}
                      </ul>
                    </div>
                  ))}
                </>
              )}
            </section>
          )}
        </motion.main>
      </AnimatePresence>
    </div>
  );
}

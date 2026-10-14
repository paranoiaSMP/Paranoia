"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useResource, send } from "./useResource";
import { ListState, PanelHeader, inputCls, date } from "./ui";

type Report = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  accountName?: string | null;
  profileName?: string | null;
  minecraftVersion?: string | null;
  gpu?: string | null;
  cpu?: string | null;
  ramSystem?: string | null;
  ramAllocated?: string | null;
  osInfo?: string | null;
  screenResolution?: string | null;
  javaPath?: string | null;
  jvmArgs?: string | null;
  logs?: string | null;
  createdAt: string;
};

const STATUSES = [
  { key: "OPEN", label: "Ouvert" },
  { key: "IN_PROGRESS", label: "En cours" },
  { key: "RESOLVED", label: "Résolu" },
];
const label = (s: string) => STATUSES.find((x) => x.key === s)?.label ?? s;

const SPECS: [keyof Report, string][] = [
  ["accountName", "Compte"],
  ["profileName", "Profil"],
  ["minecraftVersion", "Version"],
  ["osInfo", "Système"],
  ["cpu", "Processeur"],
  ["gpu", "Carte graphique"],
  ["ramSystem", "RAM système"],
  ["ramAllocated", "RAM allouée"],
  ["screenResolution", "Écran"],
  ["javaPath", "Java"],
];

export default function Reports() {
  const { data, setData, error, loading, reload } = useResource<Report[]>("/api/admin/reports");
  const [filter, setFilter] = useState("OPEN");
  const [open, setOpen] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const list = (data ?? []).filter((r) => filter === "ALL" || r.status === filter);

  const setStatus = async (r: Report, status: string) => {
    try {
      await send(`/api/admin/reports/${r.id}`, "PATCH", { status });
      setData((all) => (all ? all.map((x) => (x.id === r.id ? { ...x, status } : x)) : all));
      toast.success(`Signalement : ${label(status)}`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const remove = async (r: Report) => {
    try {
      await send(`/api/admin/reports/${r.id}`, "DELETE");
      setData((all) => (all ? all.filter((x) => x.id !== r.id) : all));
      setConfirm(null);
      toast.success("Signalement supprimé.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const count = (s: string) => (data ?? []).filter((r) => r.status === s).length;

  return (
    <section>
      <PanelHeader title="Signalements" text="Rapports de crash et de bug envoyés par le launcher (100 derniers)." />
      <div className="mt-6 flex gap-1 overflow-x-auto" role="group" aria-label="Filtrer par statut">
        {[...STATUSES, { key: "ALL", label: "Tous" }].map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setFilter(s.key)}
            aria-pressed={filter === s.key}
            className={`press min-h-11 shrink-0 rounded-md px-3 text-sm ${filter === s.key ? "bg-zinc-900 text-white ring-1 ring-zinc-700" : "text-zinc-400 hover:text-white"}`}
          >
            {s.label}
            {s.key !== "ALL" && data && <span className="ml-2 tabular-nums text-zinc-400">{count(s.key)}</span>}
          </button>
        ))}
      </div>

      <ListState
        loading={loading && !data}
        error={error}
        empty={!!data && list.length === 0}
        emptyText={filter === "OPEN" ? "Aucun signalement ouvert." : "Rien ici."}
        onRetry={reload}
      />

      {data && list.length > 0 && (
        <ul className="mt-6 divide-y divide-zinc-900 rounded-md border border-zinc-900">
          {list.map((r) => (
            <li key={r.id}>
              <div className="flex flex-wrap items-center gap-4 p-4">
                <button
                  type="button"
                  onClick={() => setOpen(open === r.id ? null : r.id)}
                  aria-expanded={open === r.id}
                  className="min-h-11 min-w-0 flex-1 text-left"
                >
                  <p className="truncate font-semibold text-white">{r.title}</p>
                  <p className="text-sm text-zinc-400">
                    {r.category} · {date(r.createdAt)} {r.accountName && `· ${r.accountName}`}
                  </p>
                </button>
                <select value={r.status} onChange={(e) => setStatus(r, e.target.value)} aria-label="Statut" className={`${inputCls} w-36`}>
                  {STATUSES.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
                {confirm === r.id ? (
                  <span className="flex gap-2">
                    <button type="button" onClick={() => remove(r)} className="press min-h-11 rounded-md bg-red-600 px-3 text-sm font-semibold text-white hover:bg-red-700">
                      Supprimer
                    </button>
                    <button type="button" onClick={() => setConfirm(null)} className="btn-line min-h-11 px-3">
                      Annuler
                    </button>
                  </span>
                ) : (
                  <button type="button" onClick={() => setConfirm(r.id)} aria-label={`Supprimer ${r.title}`} className="btn-line min-h-11 px-3 text-red-300">
                    Supprimer
                  </button>
                )}
              </div>
              {open === r.id && (
                <div className="flex flex-col gap-4 border-t border-zinc-900 bg-[#0b0b0d] p-4">
                  <p className="whitespace-pre-wrap text-sm text-zinc-200">{r.description}</p>
                  <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                    {SPECS.filter(([k]) => r[k]).map(([k, l]) => (
                      <div key={k} className="flex gap-3">
                        <dt className="w-32 shrink-0 text-zinc-400">{l}</dt>
                        <dd className="min-w-0 break-words text-zinc-200">{String(r[k])}</dd>
                      </div>
                    ))}
                  </dl>
                  {r.jvmArgs && (
                    <p className="break-words font-mono text-xs text-zinc-400">JVM : {r.jvmArgs}</p>
                  )}
                  {r.logs && (
                    <pre data-lenis-prevent className="max-h-80 overflow-auto rounded-md border border-zinc-900 bg-black p-3 font-mono text-xs text-zinc-300">
                      {r.logs}
                    </pre>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

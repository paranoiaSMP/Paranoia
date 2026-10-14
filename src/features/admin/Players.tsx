"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useResource, send } from "./useResource";
import { ListState, PanelHeader, inputCls, date } from "./ui";

type Player = {
  id: string;
  minecraftName: string;
  uuid: string | null;
  status: string;
  createdAt: string;
  hwid?: string | null;
};

function BanForm({ player, onDone, onCancel }: { player: Player; onDone: () => void; onCancel: () => void }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setBusy(true);
    try {
      await send("/api/admin/moderation/ban", "POST", { playerId: player.id, reason: reason.trim() });
      toast.success(`${player.minecraftName} banni.`);
      onDone();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 border-t border-zinc-900 bg-[#0b0b0d] p-4">
      <label htmlFor={`reason-${player.id}`} className="text-sm text-zinc-300">
        Raison du bannissement de {player.minecraftName}
      </label>
      <textarea
        id={`reason-${player.id}`}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        required
        className={`${inputCls} py-2`}
      />
      <div className="flex gap-3">
        <button type="submit" disabled={busy || !reason.trim()} className="press min-h-11 rounded-md bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
          {busy ? "…" : "Confirmer le bannissement"}
        </button>
        <button type="button" onClick={onCancel} className="btn-line min-h-11">
          Annuler
        </button>
      </div>
    </form>
  );
}

export default function Players() {
  const { data, setData, error, loading, reload } = useResource<Player[]>("/api/players");
  const [query, setQuery] = useState("");
  const [onlyBanned, setOnlyBanned] = useState(false);
  const [banning, setBanning] = useState<string | null>(null);

  const list = (data ?? []).filter((p) => {
    const q = query.trim().toLowerCase();
    return (!onlyBanned || p.status === "BANNED") && (!q || p.minecraftName.toLowerCase().includes(q) || p.uuid?.includes(q));
  });

  const setStatus = (id: string, status: string) =>
    setData((all) => (all ? all.map((p) => (p.id === id ? { ...p, status } : p)) : all));

  const unban = async (p: Player) => {
    try {
      await send("/api/admin/moderation/unban", "POST", { playerId: p.id });
      setStatus(p.id, "ACTIVE");
      toast.success(`${p.minecraftName} débanni.`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <section>
      <PanelHeader title="Joueurs et bans" text="Fiches joueur Minecraft (identifiées par UUID). Bannir bloque le joueur sur le launcher." />
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Chercher un pseudo ou un UUID"
          aria-label="Chercher un joueur"
          className={`${inputCls} flex-1`}
        />
        <label className="flex min-h-11 items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" checked={onlyBanned} onChange={(e) => setOnlyBanned(e.target.checked)} className="h-5 w-5 accent-violet-500" />
          Bannis seulement
        </label>
      </div>

      <ListState loading={loading && !data} error={error} empty={!!data && list.length === 0} emptyText="Aucun joueur ne correspond." onRetry={reload} />

      {data && list.length > 0 && (
        <ul className="mt-6 divide-y divide-zinc-900 rounded-md border border-zinc-900">
          {list.map((p) => {
            const banned = p.status === "BANNED";
            return (
              <li key={p.id}>
                <div className="flex flex-wrap items-center gap-4 p-4">
                  <img
                    src={`https://vzge.me/face/64/${p.uuid ?? p.minecraftName}.png`}
                    alt=""
                    className="h-10 w-10 rounded-sm bg-zinc-900"
                    loading="lazy"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white">{p.minecraftName}</p>
                    <p className="truncate font-mono text-xs text-zinc-400">{p.uuid ?? "UUID inconnu"} · ajouté le {date(p.createdAt)}</p>
                  </div>
                  <span className={`text-sm font-medium ${banned ? "text-red-400" : "text-zinc-400"}`}>{banned ? "Banni" : "Actif"}</span>
                  {banned ? (
                    <button type="button" onClick={() => unban(p)} className="btn-line min-h-11 px-4">
                      Débannir
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setBanning(banning === p.id ? null : p.id)}
                      aria-expanded={banning === p.id}
                      className="press min-h-11 rounded-md border border-red-500/40 px-4 text-sm font-semibold text-red-300 hover:border-red-400"
                    >
                      Bannir
                    </button>
                  )}
                </div>
                {banning === p.id && (
                  <BanForm
                    player={p}
                    onCancel={() => setBanning(null)}
                    onDone={() => {
                      setStatus(p.id, "BANNED");
                      setBanning(null);
                    }}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

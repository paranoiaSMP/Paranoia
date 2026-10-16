"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { BOOSTER_PACKS } from "@/config/boosters";
import { isAdmin } from "@/lib/roles";
import { useResource, send } from "./useResource";
import { ListState, PanelHeader, inputCls, fmt, date } from "./ui";

type Box = { boxType: string; amount: number };
type User = {
  id: string;
  name: string | null;
  minecraftName: string | null;
  role: string;
  createdAt: string;
  image: string | null;
  paraCoins: number;
  boxes: Box[];
};

const ROLES = ["MEMBER", "MODERATOR", "ADMIN", "DEV"];
const ROLE_LABEL: Record<string, string> = { MEMBER: "Membre", MODERATOR: "Modérateur", ADMIN: "Admin", DEV: "Dev" };
const PACKS = Object.values(BOOSTER_PACKS);

function McLink({ user, onSaved }: { user: User; onSaved: (u: User) => void }) {
  const [name, setName] = useState(user.minecraftName ?? "");
  const [busy, setBusy] = useState(false);

  const run = async (minecraftName: string | null) => {
    setBusy(true);
    try {
      const r = await send("/api/admin/users", "PATCH", { userId: user.id, minecraftName });
      onSaved({ ...user, minecraftName: r.minecraftName });
      setName(r.minecraftName ?? "");
      toast.success(r.minecraftName ? `Lié à ${r.minecraftName}.` : "Compte Minecraft délié.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-3 border-t border-zinc-900 bg-[#09090b] p-4">
      <label className="flex flex-col gap-1 text-sm text-zinc-300">
        Pseudo Minecraft
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={16} className={`${inputCls} w-56`} />
      </label>
      <button type="button" disabled={busy || !name.trim() || name.trim() === user.minecraftName} onClick={() => run(name.trim())} className="btn-violet disabled:opacity-60">Lier ce pseudo</button>
      {user.minecraftName && <button type="button" disabled={busy} onClick={() => run(null)} className="btn-line disabled:opacity-60">Délier {user.minecraftName}</button>}
    </div>
  );
}

function Economy({ user, onSaved }: { user: User; onSaved: (u: User) => void }) {
  const [coins, setCoins] = useState(user.paraCoins);
  const [boxes, setBoxes] = useState<Record<string, number>>(
    Object.fromEntries(PACKS.map((p) => [p.id, user.boxes.find((b) => b.boxType === p.id)?.amount ?? 0]))
  );
  const [busy, setBusy] = useState<string | null>(null);

  const saveCoins = async () => {
    setBusy("coins");
    try {
      await send("/api/admin/users/economy", "POST", { userId: user.id, action: "set_coins", amount: coins });
      onSaved({ ...user, paraCoins: coins });
      toast.success("Solde mis à jour.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const saveBox = async (boxType: string) => {
    setBusy(boxType);
    try {
      await send("/api/admin/users/economy", "POST", { userId: user.id, action: "set_booster", boxType, amount: boxes[boxType] });
      const others = user.boxes.filter((b) => b.boxType !== boxType);
      onSaved({ ...user, boxes: [...others, { boxType, amount: boxes[boxType] }] });
      toast.success("Boosters mis à jour.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 border-t border-zinc-900 bg-[#0b0b0d] p-4 md:grid-cols-2">
      <div className="flex flex-col gap-2">
        <label htmlFor={`coins-${user.id}`} className="text-sm text-zinc-300">
          ParaCoins
        </label>
        <div className="flex gap-2">
          <input
            id={`coins-${user.id}`}
            type="number"
            min={0}
            value={coins}
            onChange={(e) => setCoins(Math.max(0, Number(e.target.value)))}
            className={`${inputCls} flex-1 tabular-nums`}
          />
          <button type="button" onClick={saveCoins} disabled={busy !== null || coins === user.paraCoins} className="btn-violet min-h-11 px-4 disabled:opacity-40">
            {busy === "coins" ? "…" : "Enregistrer"}
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm text-zinc-300">Boosters</span>
        {PACKS.map((p) => {
          const current = user.boxes.find((b) => b.boxType === p.id)?.amount ?? 0;
          return (
            <div key={p.id} className="flex items-center gap-2">
              <label htmlFor={`box-${user.id}-${p.id}`} className="w-24 text-sm text-zinc-400">
                {p.name}
              </label>
              <input
                id={`box-${user.id}-${p.id}`}
                type="number"
                min={0}
                value={boxes[p.id]}
                onChange={(e) => setBoxes((b) => ({ ...b, [p.id]: Math.max(0, Number(e.target.value)) }))}
                className={`${inputCls} w-24 tabular-nums`}
              />
              <button
                type="button"
                onClick={() => saveBox(p.id)}
                disabled={busy !== null || boxes[p.id] === current}
                className="btn-line min-h-11 px-3 disabled:opacity-40"
              >
                {busy === p.id ? "…" : "OK"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Users() {
  const { data: session } = useSession();
  const myRole = session?.user?.role as string | undefined;
  const { data, setData, error, loading, reload } = useResource<User[]>("/api/admin/users");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<string>("ALL");
  const [open, setOpen] = useState<string | null>(null);
  const [mc, setMc] = useState<string | null>(null);

  const list = (data ?? []).filter((u) => {
    const q = query.trim().toLowerCase();
    return (
      (role === "ALL" || u.role === role) &&
      (!q || u.name?.toLowerCase().includes(q) || u.minecraftName?.toLowerCase().includes(q))
    );
  });

  const replace = (u: User) => setData((all) => (all ? all.map((x) => (x.id === u.id ? u : x)) : all));

  const changeRole = async (u: User, next: string) => {
    try {
      await send("/api/admin/users", "PUT", { userId: u.id, role: next });
      replace({ ...u, role: next });
      toast.success(`${u.name ?? "Utilisateur"} : ${ROLE_LABEL[next]}`);
    } catch (e) {
      toast.error((e as Error).message === "Forbidden" ? "Seul un Dev peut donner ce rôle." : (e as Error).message);
    }
  };

  return (
    <section>
      <PanelHeader title="Utilisateurs" text="Comptes du site : rôle, solde de ParaCoins et boosters." />
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Chercher un pseudo Discord ou Minecraft"
          aria-label="Chercher un utilisateur"
          className={`${inputCls} flex-1`}
        />
        <div className="flex gap-1 overflow-x-auto" role="group" aria-label="Filtrer par rôle">
          {["ALL", ...ROLES].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              aria-pressed={role === r}
              className={`press min-h-11 shrink-0 rounded-md px-3 text-sm ${role === r ? "bg-zinc-900 text-white ring-1 ring-zinc-700" : "text-zinc-400 hover:text-white"}`}
            >
              {r === "ALL" ? "Tous" : ROLE_LABEL[r]}
            </button>
          ))}
        </div>
      </div>

      <ListState loading={loading && !data} error={error} empty={!!data && list.length === 0} emptyText="Aucun utilisateur ne correspond." onRetry={reload} />

      {data && list.length > 0 && (
        <ul className="mt-6 divide-y divide-zinc-900 rounded-md border border-zinc-900">
          {list.map((u) => {
            const self = u.id === session?.user?.id;
            const canPromote = myRole === "DEV";
            return (
              <li key={u.id}>
                <div className="flex flex-wrap items-center gap-4 p-4">
                  <img src={u.image || "https://cdn.discordapp.com/embed/avatars/0.png"} alt="" className="h-10 w-10 rounded-md object-cover" referrerPolicy="no-referrer" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white">
                      {u.name ?? "Sans nom"} {self && <span className="text-xs font-normal text-violet-400">(toi)</span>}
                    </p>
                    <p className="truncate text-sm text-zinc-400">
                      {u.minecraftName ?? "Minecraft non lié"} · inscrit le {date(u.createdAt)}
                    </p>
                  </div>
                  <p className="w-32 text-right text-sm tabular-nums text-zinc-200">{fmt(u.paraCoins)} PC</p>
                  <select
                    value={u.role}
                    disabled={self || !isAdmin(myRole)}
                    title={!isAdmin(myRole) ? "Seuls les admins changent les rôles" : undefined}
                    onChange={(e) => changeRole(u, e.target.value)}
                    aria-label={`Rôle de ${u.name ?? "l'utilisateur"}`}
                    className={`${inputCls} w-36 disabled:opacity-50`}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r} disabled={(r === "ADMIN" || r === "DEV") && !canPromote && u.role !== r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setOpen(open === u.id ? null : u.id)}
                    aria-expanded={open === u.id}
                    className="btn-line min-h-11 px-4"
                  >
                    {open === u.id ? "Fermer" : "Économie"}
                  </button>
                  {isAdmin(myRole) && (
                    <button type="button" onClick={() => setMc(mc === u.id ? null : u.id)} aria-expanded={mc === u.id} className="btn-line min-h-11 px-4">
                      {mc === u.id ? "Fermer" : "Pseudo MC"}
                    </button>
                  )}
                </div>
                {open === u.id && <Economy user={u} onSaved={replace} />}
                {mc === u.id && <McLink user={u} onSaved={replace} />}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

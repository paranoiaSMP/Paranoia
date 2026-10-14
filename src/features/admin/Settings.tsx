"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useResource, send } from "./useResource";
import { ListState, PanelHeader, inputCls } from "./ui";

function Maintenance() {
  const { data, setData, error, loading, reload } = useResource<{ value: string | null }>("/api/admin/settings?key=maintenance");
  const [busy, setBusy] = useState(false);
  const closed = data?.value === "on";

  const toggle = async () => {
    setBusy(true);
    try {
      const value = closed ? "off" : "on";
      await send("/api/admin/settings", "POST", { key: "maintenance", value });
      setData({ value });
      toast.success(value === "on" ? "Site fermé : les visiteurs voient /ferme." : "Site rouvert.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <ListState loading={loading} error={error} empty={false} emptyText="" onRetry={reload} />;
  return (
    <div className={`flex max-w-xl flex-col gap-3 rounded-md border p-5 ${closed ? "border-red-500/50" : "border-zinc-900"}`}>
      <p className="text-lg font-semibold text-white">{closed ? "Le site est fermé" : "Le site est ouvert"}</p>
      <p className="text-sm text-zinc-400">
        Fermé, chaque page renvoie les visiteurs vers /ferme. Le staff connecté continue de voir le site normalement. Les API (launcher, bot) restent actives.
      </p>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={closed ? "btn-violet self-start disabled:opacity-50" : "press min-h-12 self-start rounded-md bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"}
      >
        {busy ? "…" : closed ? "Rouvrir le site" : "Fermer le site"}
      </button>
      <a href="/ferme" target="_blank" rel="noopener noreferrer" className="min-h-11 self-start text-sm text-zinc-400 underline underline-offset-4 hover:text-white">
        Voir la page /ferme
      </a>
    </div>
  );
}

const EVENTS = [
  { value: "auto", label: "Automatique", text: "Halloween du 15 octobre au 2 novembre, Noël du 1er décembre au 6 janvier." },
  { value: "off", label: "Aucun", text: "Le site garde son thème violet toute l'année." },
  { value: "halloween", label: "Halloween", text: "Accent orange, brume et chauves-souris." },
  { value: "noel", label: "Noël", text: "Accent rouge et neige qui tombe." },
];

function SeasonalEvent() {
  const { data, setData, error, loading, reload } = useResource<{ value: string | null }>("/api/admin/settings?key=event");
  const [busy, setBusy] = useState(false);
  const current = data?.value || "auto";

  const choose = async (value: string) => {
    setBusy(true);
    try {
      await send("/api/admin/settings", "POST", { key: "event", value });
      setData({ value });
      toast.success("Événement enregistré. Recharge une page du site pour le voir.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <ListState loading={loading} error={error} empty={false} emptyText="" onRetry={reload} />;
  return (
    <fieldset className="flex max-w-xl flex-col gap-3 rounded-md border border-zinc-900 p-5" disabled={busy}>
      <legend className="px-1 text-lg font-semibold text-white">Événement du site</legend>
      <p className="text-sm text-zinc-400">Change la couleur d&apos;accent de tout le site et ajoute un décor animé. Le décor est masqué dans l&apos;admin, sur /bot et pour les visiteurs qui réduisent les animations.</p>
      {EVENTS.map((e) => (
        <label key={e.value} className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-md border p-3 ${current === e.value ? "border-violet-500" : "border-zinc-800 hover:border-zinc-600"}`}>
          <input type="radio" name="event" value={e.value} checked={current === e.value} onChange={() => choose(e.value)} className="mt-1 h-4 w-4 accent-violet-500" />
          <span>
            <span className="block text-sm font-semibold text-white">{e.label}</span>
            <span className="block text-sm text-zinc-400">{e.text}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

export default function Settings() {
  const { data, error, loading, reload } = useResource<{ value: string | null }>("/api/admin/settings?key=discord_url");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    const t = setTimeout(() => setUrl(data.value ?? ""), 0);
    return () => clearTimeout(t);
  }, [data]);

  const valid = /^https:\/\/(discord\.gg|discord\.com\/invite)\/[A-Za-z0-9-]+\/?$/.test(url.trim());

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await send("/api/admin/settings", "POST", { key: "discord_url", value: url.trim() });
      toast.success("Lien Discord mis à jour sur tout le site.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <PanelHeader title="Paramètres" text="Réglages globaux du site. Réservé au rôle Dev." />
      <div className="mt-6">
        <Maintenance />
      </div>
      <div className="mt-6">
        <SeasonalEvent />
      </div>
      <ListState loading={loading && !data} error={error} empty={false} emptyText="" onRetry={reload} />
      {data && (
        <form onSubmit={save} className="mt-6 flex max-w-xl flex-col gap-3 rounded-md border border-zinc-900 p-5">
          <label htmlFor="discord-url" className="text-sm text-zinc-300">
            Lien d&apos;invitation Discord (boutons « Rejoindre le Discord », navbar, footer)
          </label>
          <input
            id="discord-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://discord.gg/…"
            aria-invalid={!!url && !valid}
            className={`${inputCls} ${url && !valid ? "border-red-500" : ""}`}
          />
          {url && !valid && <p className="text-sm text-red-400">Format attendu : https://discord.gg/code</p>}
          <button type="submit" disabled={busy || !valid || url.trim() === (data.value ?? "")} className="btn-violet self-start disabled:opacity-50">
            {busy ? "Enregistrement…" : "Enregistrer"}
          </button>
        </form>
      )}
    </section>
  );
}

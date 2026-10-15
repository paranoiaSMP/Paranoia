"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { send } from "./useResource";
import { inputCls, date } from "./ui";

export type Sanction = { id: number | string; user_id: string; mod_id: string; sanction_type: string; duration: string | null; reason: string; created_at: string; appealed: boolean };
export type Appeal = { id: number | string; pseudo_mc: string; arguments: string; status: string; created_at: string; sanction_type: string; sanction_reason: string; user_id: string };
export type Tiktok = { username: string; channel_id: string; role_id: string | null; is_live: boolean };
export type BotOverview = {
  status: { online: boolean; configured: boolean; error: string | null; framework: string };
  stats: { totalSanctions: number; pendingAppeals: number; monitoredTiktoks: number; liveTiktoks: number };
  tiktokTargets: Tiktok[];
  sanctions: Sanction[];
  appeals: Appeal[];
};

const field = "flex flex-col gap-1.5 text-sm text-zinc-300";
const snowflake = (v: string) => /^\d{17,20}$/.test(v.trim());

export function Appeals({ data, onChange }: { data: BotOverview; onChange: (a: Appeal[]) => void }) {
  const decide = async (a: Appeal, status: "accepted" | "rejected") => {
    try {
      await send("/api/admin/bot/appeals", "POST", { appealId: a.id, status });
      onChange(data.appeals.map((x) => (x.id === a.id ? { ...x, status } : x)));
      toast.success(status === "accepted" ? "Appel accepté." : "Appel refusé.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const label: Record<string, string> = { pending: "En attente", accepted: "Accepté", rejected: "Refusé" };
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h3 className="text-lg font-semibold text-white">Appels</h3>
        {data.appeals.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-400">Aucun appel.</p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-900 rounded-md border border-zinc-900">
            {data.appeals.map((a) => (
              <li key={a.id} className="flex flex-col gap-3 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-white">
                    {a.pseudo_mc} <span className="text-sm font-normal text-zinc-400">· {a.sanction_type} · {date(a.created_at)}</span>
                  </p>
                  <span className={`text-sm ${a.status === "pending" ? "text-violet-400" : "text-zinc-400"}`}>{label[a.status] ?? a.status}</span>
                </div>
                <p className="text-sm text-zinc-400">Sanction : {a.sanction_reason}</p>
                <p className="whitespace-pre-wrap text-sm text-zinc-200">{a.arguments}</p>
                {a.status === "pending" && (
                  <div className="flex gap-3">
                    <button type="button" onClick={() => decide(a, "accepted")} className="btn-violet min-h-11">
                      Accepter
                    </button>
                    <button type="button" onClick={() => decide(a, "rejected")} className="btn-line min-h-11">
                      Refuser
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white">Dernières sanctions</h3>
        {data.sanctions.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-400">Aucune sanction.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-md border border-zinc-900">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="border-b border-zinc-900 text-zinc-400">
                <tr>
                  <th scope="col" className="p-3 font-medium">Type</th>
                  <th scope="col" className="p-3 font-medium">Membre</th>
                  <th scope="col" className="p-3 font-medium">Raison</th>
                  <th scope="col" className="p-3 font-medium">Durée</th>
                  <th scope="col" className="p-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {data.sanctions.map((s) => (
                  <tr key={s.id}>
                    <td className="p-3 font-semibold text-white">{s.sanction_type}</td>
                    <td className="p-3 font-mono text-xs text-zinc-300">{s.user_id}</td>
                    <td className="p-3 text-zinc-300">{s.reason}</td>
                    <td className="p-3 text-zinc-400">{s.duration ?? "-"}</td>
                    <td className="p-3 text-zinc-400">{date(s.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export function Announce() {
  const [channelId, setChannelId] = useState("");
  const [content, setContent] = useState("");
  const [pingRole, setPingRole] = useState("");
  const [messageId, setMessageId] = useState("");
  const [useEmbed, setUseEmbed] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#7c3aed");
  const [image, setImage] = useState("");
  const [busy, setBusy] = useState(false);

  const valid = snowflake(channelId) && (!pingRole || snowflake(pingRole)) && (!messageId || snowflake(messageId)) && (content.trim() || (useEmbed && (title.trim() || description.trim())));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await send("/api/admin/bot/announce", "POST", {
        channelId: channelId.trim(),
        content: content.trim() || undefined,
        pingRole: pingRole.trim() || undefined,
        messageId: messageId.trim() || undefined,
        embed: useEmbed ? { title, description, color, image: image ? { url: image } : undefined, timestamp: true } : undefined,
      });
      toast.success(messageId ? "Message modifié." : "Annonce envoyée.");
      setContent("");
      setTitle("");
      setDescription("");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-4 rounded-md border border-zinc-900 p-5 md:grid-cols-2">
      <label className={field}>
        Identifiant du salon
        <input value={channelId} onChange={(e) => setChannelId(e.target.value)} inputMode="numeric" placeholder="123456789012345678" className={`${inputCls} font-mono`} />
      </label>
      <label className={field}>
        Rôle à mentionner (facultatif)
        <input value={pingRole} onChange={(e) => setPingRole(e.target.value)} inputMode="numeric" className={`${inputCls} font-mono`} />
      </label>
      <label className={`${field} md:col-span-2`}>
        Identifiant du message à modifier (facultatif)
        <input value={messageId} onChange={(e) => setMessageId(e.target.value)} inputMode="numeric" placeholder="Vide : un nouveau message est envoyé" className={`${inputCls} font-mono`} />
      </label>
      <label className={`${field} md:col-span-2`}>
        Message
        <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={2} className={`${inputCls} py-2`} />
      </label>
      <label className="flex min-h-11 items-center gap-3 text-sm text-zinc-200 md:col-span-2">
        <input type="checkbox" checked={useEmbed} onChange={(e) => setUseEmbed(e.target.checked)} className="h-5 w-5 accent-violet-500" />
        Ajouter un encadré (embed)
      </label>
      {useEmbed && (
        <>
          <label className={field}>
            Titre
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
          </label>
          <label className={field}>
            Couleur
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-11 w-20 cursor-pointer rounded-md border border-zinc-500 bg-black" />
          </label>
          <label className={`${field} md:col-span-2`}>
            Texte
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={`${inputCls} py-2`} />
          </label>
          <label className={`${field} md:col-span-2`}>
            Image (URL, facultatif)
            <input type="url" value={image} onChange={(e) => setImage(e.target.value)} className={inputCls} />
          </label>
        </>
      )}
      <p className="text-xs text-zinc-400 md:col-span-2">
        Identifiants : Discord en mode développeur, clic droit sur le salon ou le rôle, puis « Copier l&apos;identifiant ».
      </p>
      <button type="submit" disabled={busy || !valid} className="btn-violet self-start disabled:opacity-50">
        {busy ? "Envoi…" : messageId ? "Modifier le message" : "Envoyer l'annonce"}
      </button>
    </form>
  );
}

export function Tiktoks({ data, onChange }: { data: BotOverview; onChange: (t: Tiktok[]) => void }) {
  const [username, setUsername] = useState("");
  const [channelId, setChannelId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = username.trim().replace(/^@/, "");
      await send("/api/admin/bot/tiktok", "POST", { username: u, channelId: channelId.trim(), roleId: roleId.trim() || undefined });
      onChange([...data.tiktokTargets.filter((t) => t.username !== u), { username: u, channel_id: channelId.trim(), role_id: roleId.trim() || null, is_live: false }]);
      setUsername("");
      toast.success(`@${u} suivi.`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (u: string) => {
    try {
      await send(`/api/admin/bot/tiktok?username=${encodeURIComponent(u)}`, "DELETE");
      onChange(data.tiktokTargets.filter((t) => t.username !== u));
      toast.success(`@${u} retiré.`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={add} className="grid grid-cols-1 gap-4 rounded-md border border-zinc-900 p-5 md:grid-cols-3">
        <label className={field}>
          Compte TikTok
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@pseudo" className={inputCls} />
        </label>
        <label className={field}>
          Salon des alertes (identifiant)
          <input value={channelId} onChange={(e) => setChannelId(e.target.value)} inputMode="numeric" className={`${inputCls} font-mono`} />
        </label>
        <label className={field}>
          Rôle à mentionner (facultatif)
          <input value={roleId} onChange={(e) => setRoleId(e.target.value)} inputMode="numeric" className={`${inputCls} font-mono`} />
        </label>
        <button type="submit" disabled={busy || !username.trim() || !snowflake(channelId) || (!!roleId && !snowflake(roleId))} className="btn-violet self-start disabled:opacity-50">
          {busy ? "…" : "Suivre"}
        </button>
      </form>
      {data.tiktokTargets.length === 0 ? (
        <p className="text-sm text-zinc-400">Aucun compte suivi.</p>
      ) : (
        <ul className="divide-y divide-zinc-900 rounded-md border border-zinc-900">
          {data.tiktokTargets.map((t) => (
            <li key={t.username} className="flex flex-wrap items-center gap-4 p-4">
              <p className="flex-1 font-semibold text-white">@{t.username}</p>
              <span className={`text-sm ${t.is_live ? "text-violet-400" : "text-zinc-400"}`}>{t.is_live ? "En live" : "Hors live"}</span>
              <span className="font-mono text-xs text-zinc-400">#{t.channel_id}</span>
              <button type="button" onClick={() => remove(t.username)} className="btn-line min-h-11 px-3 text-red-300">
                Retirer
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

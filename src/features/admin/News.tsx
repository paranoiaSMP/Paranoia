"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useResource, send } from "./useResource";
import { ListState, PanelHeader, inputCls, date } from "./ui";

type Topic = { id: string; title: string; content: string; category: string; createdAt: string };

const CATEGORIES = [
  { key: "news", label: "Actualité" },
  { key: "announcement", label: "Annonce" },
];

export default function News() {
  const { data, setData, error, loading, reload } = useResource<Topic[]>("/api/admin/news");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("news");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);

  const publish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setBusy(true);
    try {
      const topic: Topic = await send("/api/admin/news", "POST", { title: title.trim(), content: content.trim(), category });
      setData((all) => [topic, ...(all ?? [])]);
      setTitle("");
      setContent("");
      toast.success("Publié.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (t: Topic) => {
    try {
      await send(`/api/admin/news?id=${encodeURIComponent(t.id)}`, "DELETE");
      setData((all) => (all ? all.filter((x) => x.id !== t.id) : all));
      setConfirm(null);
      toast.success("Supprimé.");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <section>
      <PanelHeader title="Actualités" text="Annonces et actualités du studio." />

      <form onSubmit={publish} className="mt-6 flex flex-col gap-3 rounded-md border border-zinc-900 p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-sm text-zinc-300">Titre</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required className={inputCls} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-zinc-300">Type</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${inputCls} sm:w-40`}>
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-zinc-300">Contenu</span>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} required className={`${inputCls} py-2`} />
        </label>
        <button type="submit" disabled={busy || !title.trim() || !content.trim()} className="btn-violet self-start disabled:opacity-50">
          {busy ? "Publication…" : "Publier"}
        </button>
      </form>

      <ListState loading={loading && !data} error={error} empty={!!data && data.length === 0} emptyText="Aucune actualité publiée." onRetry={reload} />

      {data && data.length > 0 && (
        <ul className="mt-6 divide-y divide-zinc-900 rounded-md border border-zinc-900">
          {data.map((t) => (
            <li key={t.id} className="flex flex-wrap items-start gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-violet-400">
                  {CATEGORIES.find((c) => c.key === t.category)?.label ?? t.category} · {date(t.createdAt)}
                </p>
                <p className="mt-1 font-semibold text-white">{t.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{t.content}</p>
              </div>
              {confirm === t.id ? (
                <span className="flex gap-2">
                  <button type="button" onClick={() => remove(t)} className="press min-h-11 rounded-md bg-red-600 px-3 text-sm font-semibold text-white hover:bg-red-700">
                    Supprimer
                  </button>
                  <button type="button" onClick={() => setConfirm(null)} className="btn-line min-h-11 px-3">
                    Annuler
                  </button>
                </span>
              ) : (
                <button type="button" onClick={() => setConfirm(t.id)} aria-label={`Supprimer ${t.title}`} className="btn-line min-h-11 px-3 text-red-300">
                  Supprimer
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

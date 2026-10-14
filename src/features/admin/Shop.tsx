"use client";

import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { useResource, send } from "./useResource";
import { ListState, PanelHeader, inputCls, fmt } from "./ui";

type Item = {
  id: string;
  itemId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  imageUrl: string | null;
  modelUrl: string | null;
  category: string;
};

const CATEGORIES = [
  { key: "cape", label: "Cape" },
  { key: "wings", label: "Ailes" },
  { key: "halo", label: "Halo" },
  { key: "hat", label: "Chapeau" },
  { key: "particle", label: "Particules" },
  { key: "emote", label: "Emote" },
];
const EMPTY = { itemId: "", name: "", description: "", price: 500, category: "cape", imageUrl: "", modelUrl: "" };
type Draft = typeof EMPTY & { id?: string };

function UploadUrl({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const upload = async (file: File) => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.text()) || "Envoi impossible.");
      onChange((await res.json()).url);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };
  return (
    <label className="flex flex-col gap-1.5 text-sm text-zinc-300">
      {label}
      <span className="flex gap-2">
        <input type="url" value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://…" className={`${inputCls} flex-1`} />
        <button type="button" onClick={() => ref.current?.click()} disabled={busy} className="btn-line min-h-11 px-3 disabled:opacity-50">
          {busy ? "…" : "Fichier"}
        </button>
      </span>
      <input ref={ref} type="file" accept="image/png,image/webp,image/gif,image/jpeg" className="sr-only" tabIndex={-1} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
    </label>
  );
}

export default function Shop() {
  const { data, setData, error, loading, reload } = useResource<Item[]>("/api/admin/shop/items");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    setBusy(true);
    try {
      const body = { ...draft, itemId: draft.itemId.trim(), name: draft.name.trim(), imageUrl: draft.imageUrl || null, modelUrl: draft.modelUrl || null };
      const item: Item = await send("/api/admin/shop/items", draft.id ? "PUT" : "POST", body);
      setData((all) => (draft.id ? (all ?? []).map((x) => (x.id === item.id ? item : x)) : [item, ...(all ?? [])]));
      toast.success(draft.id ? "Article mis à jour." : "Article créé.");
      setDraft(null);
    } catch (err) {
      toast.error((err as Error).message === "Internal error" ? "Enregistrement impossible (identifiant déjà pris ?)." : (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item: Item) => {
    try {
      await send(`/api/admin/shop/items?id=${encodeURIComponent(item.id)}`, "DELETE");
      setData((all) => (all ? all.filter((x) => x.id !== item.id) : all));
      setConfirm(null);
      toast.success("Article supprimé.");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <section>
      <PanelHeader
        title="Boutique"
        text="Cosmétiques du launcher. Chaque modification met à jour le catalogue du launcher."
        actions={
          !draft && (
            <button type="button" onClick={() => setDraft({ ...EMPTY })} className="btn-violet">
              Nouvel article
            </button>
          )
        }
      />

      {draft && (
        <form onSubmit={save} className="mt-6 grid grid-cols-1 gap-4 rounded-md border border-zinc-900 p-5 md:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm text-zinc-300">
            Nom
            <input value={draft.name} onChange={(e) => set("name", e.target.value)} required className={inputCls} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-zinc-300">
            Identifiant (utilisé par le launcher)
            <input
              value={draft.itemId}
              onChange={(e) => set("itemId", e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
              required
              placeholder="cape_violette"
              className={`${inputCls} font-mono`}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-zinc-300">
            Catégorie
            <select value={draft.category} onChange={(e) => set("category", e.target.value)} className={inputCls}>
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-zinc-300">
            Prix (ParaCoins)
            <input type="number" min={0} value={draft.price} onChange={(e) => set("price", Math.max(0, Number(e.target.value)))} className={`${inputCls} tabular-nums`} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-zinc-300 md:col-span-2">
            Description
            <textarea value={draft.description} onChange={(e) => set("description", e.target.value)} rows={3} required className={`${inputCls} py-2`} />
          </label>
          <UploadUrl label="Aperçu (image)" value={draft.imageUrl} onChange={(v) => set("imageUrl", v)} />
          <UploadUrl label="Texture (fichier du modèle)" value={draft.modelUrl} onChange={(v) => set("modelUrl", v)} />
          <div className="flex gap-3 md:col-span-2">
            <button type="submit" disabled={busy} className="btn-violet disabled:opacity-50">
              {busy ? "Enregistrement…" : draft.id ? "Enregistrer" : "Créer l'article"}
            </button>
            <button type="button" onClick={() => setDraft(null)} className="btn-line">
              Annuler
            </button>
          </div>
        </form>
      )}

      <ListState loading={loading && !data} error={error} empty={!!data && data.length === 0} emptyText="Aucun article en boutique." onRetry={reload} />

      {data && data.length > 0 && (
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((item) => (
            <li key={item.id} className="flex flex-col gap-3 rounded-md border border-zinc-900 p-4">
              <div className="flex aspect-video items-center justify-center overflow-hidden rounded-md bg-[#0b0b0d]">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt="" className="h-full w-full object-contain" loading="lazy" />
                ) : (
                  <span className="text-sm text-zinc-400">Pas d&apos;aperçu</span>
                )}
              </div>
              <div>
                <p className="text-xs text-violet-400">{CATEGORIES.find((c) => c.key === item.category)?.label ?? item.category}</p>
                <p className="font-semibold text-white">{item.name}</p>
                <p className="font-mono text-xs text-zinc-400">{item.itemId}</p>
              </div>
              <p className="text-sm tabular-nums text-zinc-200">{fmt(item.price)} PC</p>
              <div className="mt-auto flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setDraft({
                      id: item.id,
                      itemId: item.itemId,
                      name: item.name,
                      description: item.description,
                      price: item.price,
                      category: item.category,
                      imageUrl: item.imageUrl ?? "",
                      modelUrl: item.modelUrl ?? "",
                    })
                  }
                  className="btn-line min-h-11 px-3"
                >
                  Modifier
                </button>
                {confirm === item.id ? (
                  <>
                    <button type="button" onClick={() => remove(item)} className="press min-h-11 rounded-md bg-red-600 px-3 text-sm font-semibold text-white hover:bg-red-700">
                      Supprimer
                    </button>
                    <button type="button" onClick={() => setConfirm(null)} className="btn-line min-h-11 px-3">
                      Annuler
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => setConfirm(item.id)} className="btn-line min-h-11 px-3 text-red-300">
                    Supprimer
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

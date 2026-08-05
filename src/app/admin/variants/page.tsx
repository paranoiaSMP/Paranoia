"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Layers, Loader2, UploadCloud } from "lucide-react";
import toast from 'react-hot-toast';

export default function AdminVariantsPage() {
  const [variants, setVariants] = useState<any[]>([]);
  const [newVariantName, setNewVariantName] = useState("");
  const [newVariantIcon, setNewVariantIcon] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchVariants = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/variants");
      if (res.ok) setVariants(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVariants();
  }, []);

  const handleCreateVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVariantName) return;
    try {
      const res = await fetch("/api/variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newVariantName, iconUrl: newVariantIcon })
      });
      if (res.ok) {
        setNewVariantName("");
        setNewVariantIcon("");
        fetchVariants();
        toast.success("Type de variante créé !");
      }
    } catch (e) {
      toast.error("Erreur de création");
    }
  };

  const handleDeleteVariant = (id: string) => {
    if (!window.confirm("Supprimer ce type de variante ?")) return;
    const execute = async () => {
        try {
          const res = await fetch(`/api/variants?id=${id}`, { method: "DELETE" });
          if (res.ok) {
            toast.success("Variante supprimée");
            fetchVariants();
          }
        } catch (e) { console.error(e); }
    };
    execute();
  };

  return (
    <div className="space-y-10">
      <div className="flex items-center gap-4 border-b border-[var(--card-border)] pb-8">
        <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400">
          <Layers className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-3xl font-bold font-outfit text-[var(--text-color)] tracking-tight uppercase">Registre Variantes</h2>
          <p className="text-[var(--color-text-secondary)]">Définissez les types de variantes globales (Holo, Boosté, etc.)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-12 items-start">
        {/* Creation Form */}
        <div className="xl:col-span-4 bg-[var(--card-bg)] p-8 rounded-3xl border border-[var(--card-border)] space-y-6">
          <h3 className="text-xl font-bold text-[var(--text-color)] flex items-center gap-2">
            <Plus className="w-5 h-5 text-indigo-400" /> Nouveau Type
          </h3>
          
          <form onSubmit={handleCreateVariant} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest mb-2 ml-1">Nom du type</label>
              <input
                type="text"
                value={newVariantName}
                onChange={(e) => setNewVariantName(e.target.value)}
                className="w-full bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-[var(--text-color)] outline-none focus:border-indigo-500 shadow-inner"
                placeholder="Ex: Boosté"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest mb-2 ml-1">Icône (Badge)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newVariantIcon}
                  onChange={(e) => setNewVariantIcon(e.target.value)}
                  className="flex-1 bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-[var(--text-color)] outline-none focus:border-indigo-500 text-sm shadow-inner"
                  placeholder="https://..."
                />
                <label className="p-3 bg-indigo-600 rounded-xl cursor-pointer hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20">
                  <UploadCloud className="w-5 h-5 text-white" />
                  <input type="file" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if(!file) return;
                    const fd = new FormData();
                    fd.append("file", file);
                    try {
                      const res = await fetch("/api/upload", {method: "POST", body: fd});
                      if(res.ok) {
                        const data = await res.json();
                        setNewVariantIcon(data.url);
                        toast.success("Icône envoyée !");
                      }
                    } catch(err) { toast.error("Upload échoué"); }
                  }} />
                </label>
              </div>
            </div>

            {newVariantIcon && (
                <div className="p-4 bg-[var(--icon-bg)] rounded-2xl border border-[var(--card-border)] flex items-center gap-4 animate-slide-up">
                    <div className="w-12 h-12 bg-[var(--surface-bg)] rounded-xl flex items-center justify-center border border-[var(--card-border)]">
                        <img src={newVariantIcon} className="w-8 h-8 object-contain" alt="Preview" />
                    </div>
                    <span className="text-xs font-bold text-[var(--color-text-secondary)]">Aperçu du badge</span>
                </div>
            )}

            <button type="submit" disabled={!newVariantName} className="w-full btn-primary py-4 uppercase font-black tracking-widest">
                Enregistrer le type
            </button>
          </form>
        </div>

        {/* Variants List */}
        <div className="xl:col-span-8 bg-[var(--card-bg)] p-8 rounded-3xl border border-[var(--card-border)]">
          <h3 className="text-xl font-bold text-[var(--text-color)] mb-8">Types Enregistrés ({variants.length})</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {variants.map(v => (
              <div key={v.id} className="flex items-center justify-between bg-[var(--card-bg)] border border-[var(--card-border)] p-4 rounded-2xl group hover:border-indigo-500/40 transition-all hover:bg-[var(--surface-bg)]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[var(--surface-bg)] rounded-xl flex items-center justify-center border border-[var(--card-border)]">
                    <img src={v.iconUrl} className="w-8 h-8 object-contain" alt="" />
                  </div>
                  <span className="font-black text-[var(--text-color)] uppercase tracking-tight">{v.name}</span>
                </div>
                <button onClick={() => handleDeleteVariant(v.id)} className="p-3 text-[var(--color-text-secondary)] hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 hover:bg-red-500/10 rounded-xl">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
            {variants.length === 0 && !loading && (
              <div className="col-span-full py-16 text-center border border-dashed border-[var(--card-border)] rounded-3xl">
                <p className="text-[var(--color-text-secondary)] italic">Aucun type de variante défini.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

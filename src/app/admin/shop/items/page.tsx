"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Loader2, Package, Tag, Save, X, Upload } from "lucide-react";
import toast from 'react-hot-toast';
import { cn } from "@/lib/utils";

export default function AdminShopItemsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    itemId: "",
    name: "",
    description: "",
    price: "",
    currency: "paracoins",
    imageUrl: "",
    modelUrl: "",
    category: ""
  });

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/shop/items");
      if (res.ok) {
        setItems(await res.json());
      }
    } catch (e) { 
      console.error(e); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'imageUrl' | 'modelUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingField(field);
    try {
      const fd = new FormData();
      fd.append("file", file);
      
      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd
      });
      
      if (res.ok) {
        const data = await res.json();
        setFormData(prev => ({ ...prev, [field]: data.url }));
        toast.success("Fichier uploadé avec succès !");
      } else {
        toast.error("Erreur lors de l'upload");
      }
    } catch (err) {
      toast.error("Erreur réseau");
    } finally {
      setUploadingField(null);
      e.target.value = '';
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.itemId || !formData.name || !formData.price || !formData.category) {
      toast.error("Veuillez remplir les champs obligatoires (ID, Nom, Prix, Catégorie)");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/shop/items", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...formData } : formData)
      });
      
      if (res.ok) {
        toast.success(editingId ? "Objet modifié !" : "Objet créé !");
        cancelEdit();
        fetchItems();
      } else {
        toast.error("Erreur lors de l'enregistrement");
      }
    } catch (e) { 
      toast.error("Erreur réseau"); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setFormData({
      itemId: item.itemId,
      name: item.name,
      description: item.description || "",
      price: item.price.toString(),
      currency: item.currency || "paracoins",
      imageUrl: item.imageUrl || "",
      modelUrl: item.modelUrl || "",
      category: item.category
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({
      itemId: "",
      name: "",
      description: "",
      price: "",
      currency: "paracoins",
      imageUrl: "",
      modelUrl: "",
      category: ""
    });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet objet de la boutique ?")) return;
    try {
      const res = await fetch(`/api/admin/shop/items?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Objet supprimé");
        fetchItems();
      } else {
        toast.error("Erreur lors de la suppression");
      }
    } catch (e) { 
      console.error(e); 
    }
  };

  return (
    <div className="space-y-12">
      <div className="flex items-center gap-4 border-b border-[var(--card-border)] pb-8">
        <div className="p-3 bg-fuchsia-500/20 rounded-2xl text-fuchsia-400">
          <Package className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-3xl font-bold font-outfit text-[var(--text-color)] tracking-tight uppercase">Objets du Launcher</h2>
          <p className="text-[var(--color-text-secondary)]">Gérez les cosmétiques, grades et objets virtuels affichés dans la boutique du launcher.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        
        {/* Form */}
        <div className="xl:col-span-4 space-y-8">
          <div className="bg-[var(--card-bg)] p-8 rounded-[2.5rem] border border-[var(--card-border)] space-y-8 sticky top-24">
            <h3 className="text-xl font-black text-[var(--text-color)] uppercase tracking-tighter flex items-center gap-3">
              <Tag className="w-5 h-5 text-indigo-400" /> 
              {editingId ? "Modifier l'objet" : "Nouvel Objet"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest ml-1">ID Launcher (ex: cape_dragon) *</label>
                <input type="text" value={formData.itemId} onChange={e => setFormData({...formData, itemId: e.target.value})} className="w-full bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-2xl px-4 py-3 text-[var(--text-color)] outline-none focus:border-indigo-500" required />
              </div>
              
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest ml-1">Nom Affiché *</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-2xl px-4 py-3 text-[var(--text-color)] outline-none focus:border-indigo-500" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest ml-1">Prix *</label>
                  <input type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-2xl px-4 py-3 text-[var(--text-color)] outline-none focus:border-indigo-500" required />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest ml-1">Devise</label>
                  <input type="text" value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="w-full bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-2xl px-4 py-3 text-[var(--text-color)] outline-none focus:border-indigo-500" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest ml-1">Catégorie *</label>
                <input type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-2xl px-4 py-3 text-[var(--text-color)] outline-none focus:border-indigo-500" placeholder="ex: Capes, Grades..." required />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest ml-1">URL de l'Image</label>
                <div className="flex gap-2">
                  <input type="text" value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} className="flex-1 bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-2xl px-4 py-3 text-[var(--text-color)] outline-none focus:border-indigo-500" />
                  <label className="flex-none p-3 bg-[var(--icon-bg)] border border-[var(--card-border)] rounded-2xl text-[var(--color-text-secondary)] hover:text-[var(--text-color)] cursor-pointer transition-colors relative overflow-hidden flex items-center justify-center min-w-[3rem]">
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'imageUrl')} disabled={uploadingField !== null} />
                    {uploadingField === 'imageUrl' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest ml-1">URL du Modèle 3D ou Texture (Optionnel)</label>
                <div className="flex gap-2">
                  <input type="text" value={formData.modelUrl} onChange={e => setFormData({...formData, modelUrl: e.target.value})} className="flex-1 bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-2xl px-4 py-3 text-xs text-indigo-400 outline-none focus:border-indigo-500" placeholder="ex: cape_dragon.png ou modèle.bbmodel" />
                  <label className="flex-none p-3 bg-[var(--icon-bg)] border border-[var(--card-border)] rounded-2xl text-[var(--color-text-secondary)] hover:text-[var(--text-color)] cursor-pointer transition-colors relative overflow-hidden flex items-center justify-center min-w-[3rem]">
                    <input type="file" className="hidden" onChange={(e) => handleUpload(e, 'modelUrl')} disabled={uploadingField !== null} />
                    {uploadingField === 'modelUrl' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest ml-1">Description</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-2xl px-4 py-3 text-sm text-[var(--text-color)] outline-none min-h-[80px] resize-none" />
              </div>

              <div className="flex gap-4 pt-4">
                <button type="submit" disabled={isSubmitting} className="flex-1 btn-primary py-4 font-black uppercase tracking-widest flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingId ? <><Save className="w-5 h-5"/> Enregistrer</> : <><Plus className="w-5 h-5"/> Créer</>)}
                </button>
                {editingId && (
                  <button type="button" onClick={cancelEdit} className="px-6 bg-[var(--icon-bg)] border border-[var(--card-border)] rounded-2xl text-[var(--text-color)] hover:bg-red-500/20 hover:text-red-400 transition-all">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* List */}
        <div className="xl:col-span-8">
          {loading ? (
            <div className="flex justify-center p-20">
              <Loader2 className="w-10 h-10 animate-spin text-fuchsia-500" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {items.length === 0 ? (
                <div className="col-span-full p-10 text-center text-[var(--color-text-secondary)] bg-[var(--surface-bg)] rounded-3xl border border-dashed border-[var(--card-border)]">
                  Aucun objet dans la boutique pour le moment.
                </div>
              ) : (
                items.map(item => (
                  <div key={item.id} className="group bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[2rem] p-6 hover:border-indigo-500/30 transition-all relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 right-0 p-4 flex gap-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all z-10">
                      <button onClick={() => startEdit(item)} className="p-2 bg-[var(--icon-bg)] rounded-xl text-indigo-400 hover:bg-indigo-600 hover:text-[var(--text-color)] transition-all shadow-lg"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(item.id)} className="p-2 bg-red-500/10 rounded-xl text-red-500 hover:bg-red-600 hover:text-[var(--text-color)] transition-all shadow-lg"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="w-20 h-20 shrink-0 bg-[var(--surface-bg)] rounded-2xl border border-[var(--card-border)] flex items-center justify-center p-2 overflow-hidden">
                        {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-contain" /> : <Package className="w-8 h-8 text-gray-700" />}
                      </div>
                      <div>
                        <h4 className="text-[var(--text-color)] font-black uppercase tracking-tight text-lg leading-tight">{item.name}</h4>
                        <p className="text-[10px] font-mono text-[var(--color-text-secondary)] mb-2">{item.itemId}</p>
                        <div className="flex gap-2">
                          <span className="text-[9px] font-black bg-fuchsia-500/10 text-fuchsia-400 px-2 py-0.5 rounded-full border border-fuchsia-500/20 uppercase tracking-widest">{item.category}</span>
                          <span className="text-[9px] font-black bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-500/20 uppercase tracking-widest">{item.price} {item.currency}</span>
                        </div>
                      </div>
                    </div>
                    
                    {item.description && (
                      <p className="mt-4 text-xs text-[var(--color-text-secondary)] line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

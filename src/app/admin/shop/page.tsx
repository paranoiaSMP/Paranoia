"use client";

import { useState, useEffect } from "react";
import { ImagePlus, Plus, Trash2, Sparkles, Loader2, Upload, ExternalLink, Megaphone } from "lucide-react";
import toast from 'react-hot-toast';
import { cn } from "@/lib/utils";

export default function AdminShopPage() {
  const [editions, setEditions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Edition Form State
  const [editingEdition, setEditingEdition] = useState<string | null>(null);
  const [newEditionName, setNewEditionName] = useState("");
  const [newEditionIconUrl, setNewEditionIconUrl] = useState("");
  const [newEditionBannerUrl, setNewEditionBannerUrl] = useState("");
  const [newEditionDescription, setNewEditionDescription] = useState("");
  const [newEditionShowInShop, setNewEditionShowInShop] = useState(false);
  const [newEditionIsPurchasable, setNewEditionIsPurchasable] = useState(false);

  // Promo State
  const [promoActive, setPromoActive] = useState(false);
  const [promoTitle, setPromoTitle] = useState("");
  const [promoYear, setPromoYear] = useState("");
  const [promoSubtitle, setPromoSubtitle] = useState("");
  const [promoDescription, setPromoDescription] = useState("");
  const [promoButtonText, setPromoButtonText] = useState("");
  const [promoTargetUrl, setPromoTargetUrl] = useState("");
  const [promoBgUrl, setPromoBgUrl] = useState("");
  const [isSavingPromo, setIsSavingPromo] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const resE = await fetch("/api/editions");
      if (resE.ok) setEditions(await resE.json());
      
      const resS = await fetch("/api/admin/settings?key=shop_promotion");
      if (resS.ok) {
        const data = await resS.json();
        if (data) {
          setPromoActive(data.isActive);
          setPromoTitle(data.title);
          setPromoYear(data.year);
          setPromoSubtitle(data.subtitle);
          setPromoDescription(data.description);
          setPromoButtonText(data.buttonText);
          setPromoTargetUrl(data.targetUrl);
          setPromoBgUrl(data.bgUrl);
        }
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateEdition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEditionName) return;
    setLoading(true);
    try {
      const payload = {
        name: newEditionName.trim(),
        iconUrl: newEditionIconUrl.trim(),
        bannerUrl: newEditionBannerUrl.trim(),
        description: newEditionDescription.trim(),
        showInShop: newEditionShowInShop,
        isPurchasable: newEditionIsPurchasable
      };
      const res = await fetch("/api/editions", {
        method: editingEdition ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingEdition ? { id: editingEdition, ...payload } : payload)
      });
      if (res.ok) {
        toast.success("Édition enregistrée !");
        cancelEditEdition();
        fetchData();
      }
    } catch (e) { toast.error("Erreur"); }
    finally { setLoading(false); }
  };

  const startEditEdition = (ed: any) => {
    setEditingEdition(ed.id);
    setNewEditionName(ed.name);
    setNewEditionIconUrl(ed.iconUrl || "");
    setNewEditionBannerUrl(ed.bannerUrl || "");
    setNewEditionDescription(ed.description || "");
    setNewEditionShowInShop(ed.showInShop || false);
    setNewEditionIsPurchasable(ed.isPurchasable || false);
  };

  const cancelEditEdition = () => {
    setEditingEdition(null);
    setNewEditionName("");
    setNewEditionIconUrl("");
    setNewEditionBannerUrl("");
    setNewEditionDescription("");
    setNewEditionShowInShop(false);
    setNewEditionIsPurchasable(false);
  };

  const handleDeleteEdition = async (id: string) => {
    if (!window.confirm("Supprimer cette édition ?")) return;
    try {
      const res = await fetch(`/api/editions?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Édition supprimée");
        fetchData();
      }
    } catch (e) { console.error(e); }
  };

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPromo(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "shop_promotion",
          value: {
            isActive: promoActive, title: promoTitle, year: promoYear,
            subtitle: promoSubtitle, description: promoDescription,
            buttonText: promoButtonText, targetUrl: promoTargetUrl, bgUrl: promoBgUrl
          }
        })
      });
      if (res.ok) toast.success("Promotion mise à jour !");
    } catch (e) { toast.error("Erreur"); }
    finally { setIsSavingPromo(false); }
  };

  return (
    <div className="space-y-12">
      <div className="flex items-center gap-4 border-b border-[var(--card-border)] pb-8">
        <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400">
          <ImagePlus className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-3xl font-bold font-outfit text-[var(--text-color)] tracking-tight uppercase">Boutique & Éditions</h2>
          <p className="text-[var(--color-text-secondary)]">Gérez les vitrines, les bannières et les séries de cartes.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
          {/* Edition Management */}
          <div className="xl:col-span-7 space-y-8">
              <div className="bg-[var(--card-bg)] p-8 rounded-[2.5rem] border border-[var(--card-border)] space-y-8">
                  <h3 className="text-xl font-black text-[var(--text-color)] uppercase tracking-tighter flex items-center gap-3">
                      <Sparkles className="w-5 h-5 text-fuchsia-500" /> 
                      {editingEdition ? "Modifier l'Édition" : "Nouvelle Édition de Cartes"}
                  </h3>

                  <form onSubmit={handleCreateEdition} className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="space-y-2">
                              <label className="block text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest ml-1">Nom de la collection</label>
                              <input type="text" value={newEditionName} onChange={e => setNewEditionName(e.target.value)} className="w-full bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-2xl px-4 py-3 text-[var(--text-color)] outline-none focus:border-fuchsia-500" placeholder="Ex: Horizon 2026" />
                          </div>
                          <div className="space-y-2">
                              <label className="block text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest ml-1">Badge Icône (URL)</label>
                              <div className="flex gap-2">
                                  <input type="text" value={newEditionIconUrl} onChange={e => setNewEditionIconUrl(e.target.value)} className="flex-1 bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-2xl px-4 py-3 text-sm text-[var(--text-color)] outline-none" placeholder="https://..." />
                                  <button type="button" className="p-3 bg-[var(--icon-bg)] border border-[var(--card-border)] rounded-2xl text-[var(--color-text-secondary)] hover:text-[var(--text-color)]"><Upload className="w-5 h-5" /></button>
                              </div>
                          </div>
                      </div>

                      <div className="space-y-2">
                          <label className="block text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest ml-1">Bannière de Vitrine (Panoramique)</label>
                          <div className="flex gap-2">
                              <input type="text" value={newEditionBannerUrl} onChange={e => setNewEditionBannerUrl(e.target.value)} className="flex-1 bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-2xl px-4 py-3 text-sm text-[var(--text-color)] outline-none" placeholder="Lien vers l'image de fond..." />
                              <button type="button" className="p-3 bg-[var(--icon-bg)] border border-[var(--card-border)] rounded-2xl text-[var(--color-text-secondary)] hover:text-[var(--text-color)]"><Upload className="w-5 h-5" /></button>
                          </div>
                      </div>

                      <div className="space-y-2">
                          <label className="block text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest ml-1">Description</label>
                          <textarea value={newEditionDescription} onChange={e => setNewEditionDescription(e.target.value)} className="w-full bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-2xl px-4 py-3 text-sm text-[var(--text-color)] outline-none min-h-[100px] resize-none" placeholder="Racontez l'histoire de cette édition..." />
                      </div>

                      <div className="flex flex-wrap gap-6 p-4 bg-[var(--surface-bg)] rounded-2xl border border-[var(--card-border)]">
                          <label className="flex items-center gap-3 cursor-pointer group">
                              <input type="checkbox" className="custom-checkbox" checked={newEditionShowInShop} onChange={e => setNewEditionShowInShop(e.target.checked)} />
                              <span className="text-xs font-bold text-[var(--color-text-secondary)] group-hover:text-[var(--text-color)] transition-colors uppercase tracking-widest">Afficher Boutique</span>
                          </label>
                          <label className="flex items-center gap-3 cursor-pointer group">
                              <input type="checkbox" className="custom-checkbox" checked={newEditionIsPurchasable} onChange={e => setNewEditionIsPurchasable(e.target.checked)} />
                              <span className="text-xs font-bold text-[var(--color-text-secondary)] group-hover:text-[var(--text-color)] transition-colors uppercase tracking-widest">Achetable</span>
                          </label>
                      </div>

                      <div className="flex gap-4">
                          <button type="submit" disabled={loading} className="flex-1 btn-primary py-4 font-black uppercase tracking-widest">
                              {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : (editingEdition ? "Mettre à jour" : "Créer la Collection")}
                          </button>
                          {editingEdition && <button type="button" onClick={cancelEditEdition} className="px-8 bg-[var(--icon-bg)] border border-[var(--card-border)] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[var(--icon-bg)] transition-all">Annuler</button>}
                      </div>
                  </form>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {editions.map(ed => (
                      <div key={ed.id} className="group bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[2rem] p-6 hover:border-fuchsia-500/30 transition-all relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-4 flex gap-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                              <button onClick={() => startEditEdition(ed)} className="p-2 bg-[var(--icon-bg)] rounded-xl text-indigo-400 hover:bg-indigo-600 hover:text-[var(--text-color)] transition-all"><Plus className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteEdition(ed.id)} className="p-2 bg-red-500/10 rounded-xl text-red-500 hover:bg-red-600 hover:text-[var(--text-color)] transition-all"><Trash2 className="w-4 h-4" /></button>
                          </div>
                          <div className="flex items-center gap-4 mb-4">
                              <div className="w-14 h-14 bg-[var(--surface-bg)] rounded-2xl border border-[var(--card-border)] flex items-center justify-center p-2">
                                  {ed.iconUrl ? <img src={ed.iconUrl} className="w-full h-full object-contain" /> : <Sparkles className="w-6 h-6 text-gray-700" />}
                              </div>
                              <div>
                                  <h4 className="text-[var(--text-color)] font-black uppercase tracking-tight text-lg">{ed.name}</h4>
                                  <div className="flex gap-2 mt-1">
                                      {ed.showInShop && <span className="text-[8px] font-black bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-widest">Public</span>}
                                      {ed.isPurchasable && <span className="text-[8px] font-black bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded-full border border-yellow-500/20 uppercase tracking-widest">Shop</span>}
                                  </div>
                              </div>
                          </div>
                          <p className="text-[10px] text-[var(--color-text-secondary)] line-clamp-2 italic">"{ed.description || "Aucune description..."}"</p>
                      </div>
                  ))}
              </div>
          </div>

          {/* Shop Promotion Sidebar */}
          <div className="xl:col-span-5 space-y-8">
              <div className="bg-emerald-950/10 border border-emerald-500/20 p-8 rounded-[2.5rem] space-y-8 sticky top-24">
                  <h3 className="text-xl font-black text-[var(--text-color)] uppercase tracking-tighter flex items-center gap-3">
                      <Megaphone className="w-5 h-5 text-emerald-400" /> Promotion Globale
                  </h3>
                  
                  <form onSubmit={handleSavePromo} className="space-y-6">
                      <label className="flex items-center gap-3 cursor-pointer p-4 bg-[var(--surface-bg)] rounded-2xl border border-[var(--card-border)] w-fit group">
                          <input type="checkbox" className="custom-checkbox" checked={promoActive} onChange={e => setPromoActive(e.target.checked)} />
                          <span className="text-xs font-black text-[var(--color-text-secondary)] group-hover:text-[var(--text-color)] transition-colors uppercase tracking-widest">Activer la bannière principale</span>
                      </label>

                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                              <label className="block text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest ml-1">Titre</label>
                              <input type="text" value={promoTitle} onChange={e => setPromoTitle(e.target.value)} className="w-full bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-xl px-4 py-2.5 text-[var(--text-color)] outline-none" placeholder="Ex: ÉTÉ" />
                          </div>
                          <div className="space-y-2">
                              <label className="block text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest ml-1">Année</label>
                              <input type="text" value={promoYear} onChange={e => setPromoYear(e.target.value)} className="w-full bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-xl px-4 py-2.5 text-[var(--text-color)] outline-none" placeholder="2026" />
                          </div>
                      </div>

                      <div className="space-y-2">
                          <label className="block text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest ml-1">Lien de redirection</label>
                          <input type="text" value={promoTargetUrl} onChange={e => setPromoTargetUrl(e.target.value)} className="w-full bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-xl px-4 py-2.5 text-xs text-indigo-400 outline-none" placeholder="/shop/edition/..." />
                      </div>

                      <button type="submit" disabled={isSavingPromo} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-[var(--text-color)] font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-emerald-600/20">
                          {isSavingPromo ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Sauvegarder la Promotion"}
                      </button>
                  </form>

                  <div className="pt-8 border-t border-[var(--card-border)]">
                      <h4 className="text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest mb-4">Aperçu rapide</h4>
                      <div className="aspect-video w-full rounded-2xl bg-black border border-[var(--card-border)] overflow-hidden relative group">
                          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${promoBgUrl})` }}></div>
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                          <div className="absolute inset-0 flex flex-col justify-end p-4">
                              <p className="text-[8px] font-black text-yellow-400 uppercase tracking-widest mb-1">{promoSubtitle}</p>
                              <h5 className="text-lg font-black text-[var(--text-color)] uppercase leading-none">{promoTitle} {promoYear}</h5>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
}

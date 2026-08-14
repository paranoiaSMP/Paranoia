"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Loader2, Save, X, Newspaper } from "lucide-react";
import toast from 'react-hot-toast';
import { cn } from "@/lib/utils";

export default function AdminNewsPage() {
  const [newsList, setNewsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "news"
  });

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/news");
      if (res.ok) {
        const data = await res.json();
        setNewsList(data);
      }
    } catch (error) {
      console.error("Error fetching news:", error);
      toast.error("Erreur lors de la récupération des actualités");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.content) {
      toast.error("Veuillez remplir le titre et le contenu");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/news", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        toast.success("Actualité créée avec succès !");
        setIsEditing(false);
        setFormData({ title: "", content: "", category: "news" });
        fetchNews();
      } else {
        toast.error("Erreur lors de la création");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erreur de connexion");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette actualité ?")) return;
    
    try {
      const res = await fetch(`/api/admin/news?id=${id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        toast.success("Actualité supprimée");
        fetchNews();
      } else {
        toast.error("Erreur lors de la suppression");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erreur de connexion");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-fuchsia-500/20 rounded-2xl text-fuchsia-400">
            <Newspaper className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-3xl font-bold font-outfit text-[var(--text-color)] tracking-tight uppercase">Actualités</h2>
            <p className="text-[var(--color-text-secondary)]">Gérez les actualités affichées sur le Launcher.</p>
          </div>
        </div>

        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)]"
          >
            <Plus className="w-5 h-5" />
            Nouvelle Actualité
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-[var(--text-color)]">Rédiger une actualité</h3>
            <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Titre</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Mise à jour 0.5.0..."
                  className="w-full bg-[var(--icon-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-fuchsia-500 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Catégorie</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-[var(--icon-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-fuchsia-500 transition-colors appearance-none"
                >
                  <option value="news">Actualité</option>
                  <option value="announcement">Annonce / Important</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-400 uppercase tracking-wider flex justify-between">
                <span>Contenu (HTML / Markdown supporté par le site)</span>
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Rédigez le contenu de l'actualité ici..."
                rows={10}
                className="w-full bg-[var(--icon-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-fuchsia-500 transition-colors resize-y font-mono text-sm"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--card-border)]">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-6 py-3 rounded-xl font-bold bg-[var(--icon-bg)] hover:bg-white/10 text-white transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {saving ? "Création..." : "Publier l'actualité"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-fuchsia-500" />
              <p>Chargement des actualités...</p>
            </div>
          ) : newsList.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Newspaper className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">Aucune actualité publiée</p>
              <p className="text-sm">Cliquez sur "Nouvelle Actualité" pour créer votre premier article.</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--card-border)]">
              {newsList.map((news) => (
                <div key={news.id} className="p-4 sm:p-6 hover:bg-[var(--icon-bg)] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider",
                        news.category === 'announcement' ? "bg-red-500/20 text-red-400" : "bg-fuchsia-500/20 text-fuchsia-400"
                      )}>
                        {news.category === 'announcement' ? 'Annonce' : 'Actualité'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(news.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'long', year: 'numeric'
                        })}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white">{news.title}</h3>
                    <p className="text-sm text-gray-400 line-clamp-2 mt-1">
                      {news.content.replace(/<[^>]*>?/gm, '')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      onClick={() => handleDelete(news.id)}
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors group"
                      title="Supprimer"
                    >
                      <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

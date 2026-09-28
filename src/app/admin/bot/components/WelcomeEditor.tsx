"use client";

import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { cn } from "@/lib/utils";

export default function WelcomeEditor() {
  const [data, setData] = useState({
    welcomeChannelId: "",
    welcomeTitle: "",
    welcomeDesc: "",
    welcomeColor: "#a855f7",
    welcomeImage: ""
  });
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/admin/bot/welcome")
      .then(r => r.json())
      .then(d => { setData(d); setLoaded(true); })
      .catch(console.error);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/admin/bot/welcome", {
      method: "PUT",
      body: JSON.stringify(data)
    });
    setSaving(false);
    alert("Configuration sauvegardÃ©e !");
  };

  if (!loaded) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-xl font-bold text-white tracking-tight">Ã‰diteur de Bienvenue</h3>
        <p className="text-sm text-[var(--color-text-secondary)]">Personnalisez l'embed de bienvenue automatique.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-neutral-400 font-medium mb-1 block">ID du salon de bienvenue</label>
            <input type="text" value={data.welcomeChannelId} onChange={e => setData({...data, welcomeChannelId: e.target.value})} className="w-full bg-black/40 border border-neutral-800 rounded-lg p-2 text-sm text-white" placeholder="ex: 1234567890" />
          </div>
          <div>
            <label className="text-xs text-neutral-400 font-medium mb-1 block">Titre de l'embed</label>
            <input type="text" value={data.welcomeTitle} onChange={e => setData({...data, welcomeTitle: e.target.value})} className="w-full bg-black/40 border border-neutral-800 rounded-lg p-2 text-sm text-white" />
          </div>
          <div>
            <label className="text-xs text-neutral-400 font-medium mb-1 block">Description (Markdown, variables: {user}, {server})</label>
            <textarea value={data.welcomeDesc} onChange={e => setData({...data, welcomeDesc: e.target.value})} className="w-full bg-black/40 border border-neutral-800 rounded-lg p-2 text-sm text-white h-24" />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs text-neutral-400 font-medium mb-1 block">Couleur (Hex)</label>
              <input type="color" value={data.welcomeColor} onChange={e => setData({...data, welcomeColor: e.target.value})} className="w-full h-10 rounded-lg cursor-pointer bg-black/40 border border-neutral-800 p-1" />
            </div>
            <div className="flex-[3]">
              <label className="text-xs text-neutral-400 font-medium mb-1 block">URL de l'image (optionnel)</label>
              <input type="text" value={data.welcomeImage} onChange={e => setData({...data, welcomeImage: e.target.value})} className="w-full bg-black/40 border border-neutral-800 rounded-lg p-2 text-sm text-white" placeholder="https://..." />
            </div>
          </div>
          <button onClick={handleSave} disabled={saving} className="flex items-center justify-center gap-2 w-full p-2 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition-all">
            <Save className="w-4 h-4" /> {saving ? "Sauvegarde..." : "Enregistrer l'Embed"}
          </button>
        </div>

        <div className="p-4 rounded-xl border border-neutral-800 bg-[#313338] h-max relative overflow-hidden shadow-xl">
          <div className="flex gap-4">
            <div className="w-1 rounded-full shrink-0" style={{ backgroundColor: data.welcomeColor }} />
            <div className="flex flex-col gap-2 py-2 w-full">
              {data.welcomeTitle && <span className="font-bold text-white text-base">{data.welcomeTitle.replace("{user}", "Leoo955")}</span>}
              <span className="text-sm text-neutral-200 whitespace-pre-wrap">{data.welcomeDesc.replace("{user}", "<@123>").replace("{server}", "Paranoia SMP")}</span>
              {data.welcomeImage && (
                <div className="mt-2 w-full rounded-lg overflow-hidden border border-neutral-700 max-h-[150px]">
                  <img src={data.welcomeImage} alt="Welcome" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Settings, Save, Loader2, Upload, Link2, Bug, ExternalLink, Clock } from "lucide-react";
import toast from 'react-hot-toast';

type BugReportSummary = {
  id: string;
  title: string;
  category: string;
  status: string;
  accountName: string | null;
  profileName: string | null;
  minecraftVersion: string | null;
  createdAt: string;
};

export default function AdminDevPage() {
  const { data: session } = useSession();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [reports, setReports] = useState<BugReportSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const s: Record<string, string> = {};
          data.forEach(item => { s[item.key] = item.value });
          setSettings(s);
        }
      });

    fetch("/api/admin/reports")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setReports(data);
      })
      .catch(() => setReports([]));
  }, []);

  const handleSave = async (key: string, value: string) => {
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value })
      });
      if (res.ok) toast.success("Sauvegardé !");
      else toast.error("Erreur serveur");
    } catch {
      toast.error("Erreur réseau");
    }
  };

  const handleUploadLauncher = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const toastId = toast.loading("Upload du Launcher en cours (R2)...");
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        const { url } = await res.json();
        setSettings(s => ({ ...s, launcher_download_url: url }));
        handleSave("launcher_download_url", url);
        toast.success("Nouveau Launcher disponible !", { id: toastId });
      } else {
        toast.error("Échec de l'upload", { id: toastId });
      }
    } catch {
      toast.error("Erreur réseau", { id: toastId });
    }
  };

  if ((session?.user as any)?.role !== "DEV") {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-red-500">Accès Refusé</h2>
        <p className="text-[var(--color-text-secondary)]">Vous n'avez pas les autorisations DEV.</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="flex items-center gap-4 border-b border-[var(--card-border)] pb-6">
        <div className="p-3 bg-cyan-500/20 rounded-2xl">
          <Settings className="w-8 h-8 text-cyan-400" />
        </div>
        <div>
          <h2 className="text-3xl font-bold font-outfit text-[var(--text-color)]">Configuration DEV</h2>
          <p className="text-[var(--color-text-secondary)]">Paramètres techniques et liens du site.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-[var(--card-bg)] p-8 rounded-3xl border border-[var(--card-border)]">
          <h3 className="text-xl font-bold text-[var(--text-color)] mb-6 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-cyan-400" /> Liens Dynamiques
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-[var(--color-text-secondary)] mb-2 uppercase">Lien Discord</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={settings.discord_url || ""}
                  onChange={e => setSettings({ ...settings, discord_url: e.target.value })}
                  className="w-full bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-xl px-4 py-2 text-[var(--text-color)] outline-none"
                  placeholder="https://discord.gg/..."
                />
                <button onClick={() => handleSave("discord_url", settings.discord_url)} className="bg-cyan-500/20 text-cyan-400 px-4 rounded-xl hover:bg-cyan-500 hover:text-white transition-all"><Save className="w-5 h-5" /></button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-[var(--color-text-secondary)] mb-2 uppercase">Lien Boutique</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={settings.store_url || ""}
                  onChange={e => setSettings({ ...settings, store_url: e.target.value })}
                  className="w-full bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-xl px-4 py-2 text-[var(--text-color)] outline-none"
                />
                <button onClick={() => handleSave("store_url", settings.store_url)} className="bg-cyan-500/20 text-cyan-400 px-4 rounded-xl hover:bg-cyan-500 hover:text-white transition-all"><Save className="w-5 h-5" /></button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[var(--card-bg)] p-8 rounded-3xl border border-[var(--card-border)]">
          <h3 className="text-xl font-bold text-[var(--text-color)] mb-6 flex items-center gap-2">
            <Upload className="w-5 h-5 text-fuchsia-400" /> Upload Launcher
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)] mb-4">Téléversez une nouvelle version du Launcher. L'URL de téléchargement sera automatiquement mise à jour.</p>
          
          <div className="space-y-4">
            <div className="relative overflow-hidden w-full">
              <input type="file" onChange={handleUploadLauncher} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".exe,.dmg,.zip" />
              <div className="w-full bg-[var(--surface-bg)] border-2 border-dashed border-[var(--card-border)] rounded-xl p-6 flex flex-col items-center justify-center gap-2 text-[var(--color-text-secondary)] hover:border-fuchsia-500/50 hover:bg-fuchsia-500/5 transition-all">
                <Upload className="w-8 h-8 text-fuchsia-400" />
                <p className="font-bold">Cliquez pour choisir un fichier</p>
                <p className="text-xs">(.exe, .dmg, .zip)</p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--color-text-secondary)] mb-1 uppercase">URL de téléchargement actuelle :</label>
              <input 
                type="text" 
                value={settings.launcher_download_url || "Aucun launcher uploadé"}
                onChange={e => setSettings({ ...settings, launcher_download_url: e.target.value })}
                className="w-full bg-black/20 border border-[var(--card-border)] rounded-lg px-3 py-2 text-xs text-fuchsia-400 outline-none"
              />
              <button onClick={() => handleSave("launcher_download_url", settings.launcher_download_url)} className="w-full mt-2 bg-cyan-500/10 text-cyan-400 text-xs py-2 rounded-lg hover:bg-cyan-500 hover:text-white transition-all">Sauvegarder l'URL manuellement</button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[var(--card-bg)] p-8 rounded-3xl border border-[var(--card-border)] space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl">
              <Bug className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[var(--text-color)]">
                Crashs & Signalements du Launcher
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Rapports transmis par les joueurs depuis le Paranoia Client
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Total : {reports.length}
            </span>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
              Ouverts : {reports.filter((r) => r.status === "OPEN").length}
            </span>
          </div>
        </div>

        {reports.length === 0 ? (
          <div className="text-center py-12 text-[var(--color-text-secondary)] text-sm border border-dashed border-[var(--card-border)] rounded-2xl">
            Aucun signalement ou crash enregistré pour le moment.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)] text-xs text-[var(--color-text-secondary)] uppercase">
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4">Titre / Problème</th>
                  <th className="py-3 px-4">Joueur</th>
                  <th className="py-3 px-4">Instance</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--card-border)]">
                {reports.map((r) => {
                  const isCrash = r.category.toLowerCase().includes("crash");
                  return (
                    <tr key={r.id} className="hover:bg-[var(--surface-bg)] transition-colors">
                      <td className="py-3 px-4">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                            r.status === "RESOLVED"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : r.status === "IN_PROGRESS"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : r.status === "CLOSED"
                              ? "bg-neutral-500/20 text-neutral-400"
                              : isCrash
                              ? "bg-red-500/20 text-red-400"
                              : "bg-cyan-500/20 text-cyan-400"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-[var(--text-color)] max-w-xs truncate">
                        {r.title}
                      </td>
                      <td className="py-3 px-4 text-[var(--color-text-secondary)] font-medium">
                        {r.accountName || "Anonyme"}
                      </td>
                      <td className="py-3 px-4 text-xs text-[var(--color-text-secondary)]">
                        {r.profileName || "Défaut"} ({r.minecraftVersion || "—"})
                      </td>
                      <td className="py-3 px-4 text-xs text-[var(--color-text-secondary)] whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/admin/dev/${r.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500 hover:text-white transition-colors"
                        >
                          <span>Voir</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

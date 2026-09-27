"use client";

import { use, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Cpu,
  Download,
  HardDrive,
  Loader2,
  Monitor,
  Terminal,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";

type BugReport = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  accountName: string | null;
  profileName: string | null;
  minecraftVersion: string | null;
  profileType: string | null;
  graphicsMode: string | null;
  gpu: string | null;
  screenResolution: string | null;
  cpu: string | null;
  ramSystem: string | null;
  ramAllocated: string | null;
  osInfo: string | null;
  jvmArgs: string | null;
  javaPath: string | null;
  logs: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function AdminDevReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const [report, setReport] = useState<BugReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/admin/reports")
      .then((res) => res.json())
      .then((data: BugReport[]) => {
        const found = Array.isArray(data) ? data.find((r) => r.id === id) : null;
        setReport(found || null);
      })
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!report) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setReport({ ...report, status: newStatus });
        toast.success("Statut mis à jour !");
      } else {
        toast.error("Erreur de mise à jour");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Supprimer définitivement ce rapport ?")) return;
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Rapport supprimé");
        router.push("/admin/dev");
      } else {
        toast.error("Erreur lors de la suppression");
      }
    } catch {
      toast.error("Erreur réseau");
    }
  };

  const handleCopyLogs = () => {
    if (!report?.logs) return;
    navigator.clipboard.writeText(report.logs);
    setCopied(true);
    toast.success("Logs copiés dans le presse-papier !");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadLogs = () => {
    if (!report?.logs) return;
    const blob = new Blob([report.logs], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logs-${report.accountName || "joueur"}-${report.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const role = (session?.user as any)?.role;
  if (role !== "DEV" && role !== "ADMIN") {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-red-500">Accès Refusé</h2>
        <p className="text-[var(--color-text-secondary)]">
          Vous n'avez pas les autorisations nécessaires.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center gap-3 text-[var(--color-text-secondary)]">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
        <span>Chargement du rapport...</span>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-20 space-y-4">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto" />
        <h2 className="text-2xl font-bold text-[var(--text-color)]">Rapport introuvable</h2>
        <p className="text-[var(--color-text-secondary)]">
          Ce signalement n'existe pas ou a été supprimé.
        </p>
        <Link
          href="/admin/dev"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-400 font-bold hover:bg-cyan-500/30 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Retour à la section DEV
        </Link>
      </div>
    );
  }

  const isCrash = report.category.toLowerCase().includes("crash");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--card-border)] pb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/dev"
            className="p-2.5 rounded-xl bg-[var(--surface-bg)] border border-[var(--card-border)] text-[var(--color-text-secondary)] hover:text-[var(--text-color)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase ${
                  isCrash
                    ? "bg-red-500/20 text-red-400 border border-red-500/30"
                    : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                }`}
              >
                {report.category}
              </span>
              <span className="text-xs text-[var(--color-text-secondary)] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {new Date(report.createdAt).toLocaleString("fr-FR")}
              </span>
            </div>
            <h1 className="text-2xl font-black text-[var(--text-color)] font-outfit mt-1">
              {report.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={report.status}
            disabled={updating}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="bg-[var(--surface-bg)] border border-[var(--card-border)] text-[var(--text-color)] rounded-xl px-4 py-2 text-sm font-bold outline-none cursor-pointer"
          >
            <option value="OPEN">🔴 Ouvert</option>
            <option value="IN_PROGRESS">🟡 En cours</option>
            <option value="RESOLVED">🟢 Résolu</option>
            <option value="CLOSED">⚪ Fermé</option>
          </select>

          <button
            type="button"
            onClick={handleDelete}
            className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
            title="Supprimer le rapport"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-2xl p-5 space-y-3">
          <div className="text-xs font-bold text-[var(--color-text-secondary)] uppercase">
            Joueur & Instance
          </div>
          <div className="space-y-1.5 text-sm">
            <p className="text-[var(--text-color)]">
              <span className="text-[var(--color-text-secondary)]">Joueur :</span>{" "}
              <strong className="text-cyan-400">{report.accountName || "Anonyme"}</strong>
            </p>
            <p className="text-[var(--text-color)]">
              <span className="text-[var(--color-text-secondary)]">Instance :</span>{" "}
              <strong>{report.profileName || "Défaut"}</strong>
            </p>
            <p className="text-[var(--text-color)]">
              <span className="text-[var(--color-text-secondary)]">Minecraft :</span>{" "}
              {report.minecraftVersion || "—"}
            </p>
            {report.profileType && (
              <p className="text-[var(--text-color)]">
                <span className="text-[var(--color-text-secondary)]">Profil :</span>{" "}
                {report.profileType}
              </p>
            )}
            {report.graphicsMode && (
              <p className="text-[var(--text-color)]">
                <span className="text-[var(--color-text-secondary)]">Mode Graphique :</span>{" "}
                {report.graphicsMode}
              </p>
            )}
          </div>
        </div>

        <div className="bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-2xl p-5 space-y-3">
          <div className="text-xs font-bold text-[var(--color-text-secondary)] uppercase flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-cyan-400" /> Config Matérielle (PC)
          </div>
          <div className="space-y-1.5 text-sm">
            <p className="text-[var(--text-color)]">
              <span className="text-[var(--color-text-secondary)]">CPU :</span>{" "}
              {report.cpu || "Non spécifié"}
            </p>
            <p className="text-[var(--text-color)]">
              <span className="text-[var(--color-text-secondary)]">GPU :</span>{" "}
              <span className="text-emerald-400 font-medium">{report.gpu || "Non détecté"}</span>
            </p>
            <p className="text-[var(--text-color)]">
              <span className="text-[var(--color-text-secondary)]">RAM Système :</span>{" "}
              {report.ramSystem || "—"}
            </p>
            <p className="text-[var(--text-color)]">
              <span className="text-[var(--color-text-secondary)]">OS :</span>{" "}
              {report.osInfo || "—"}
            </p>
            {report.screenResolution && (
              <p className="text-[var(--text-color)]">
                <span className="text-[var(--color-text-secondary)]">Écran :</span>{" "}
                {report.screenResolution}
              </p>
            )}
          </div>
        </div>

        <div className="bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-2xl p-5 space-y-3">
          <div className="text-xs font-bold text-[var(--color-text-secondary)] uppercase flex items-center gap-1.5">
            <HardDrive className="w-4 h-4 text-cyan-400" /> Réglages Launcher & Jeu
          </div>
          <div className="space-y-1.5 text-sm">
            <p className="text-[var(--text-color)]">
              <span className="text-[var(--color-text-secondary)]">RAM Allouée :</span>{" "}
              <span className="text-yellow-400 font-bold">{report.ramAllocated || "Défaut"}</span>
            </p>
            <p className="text-[var(--text-color)]">
              <span className="text-[var(--color-text-secondary)]">Java :</span>{" "}
              <code className="text-xs bg-black/30 px-2 py-0.5 rounded text-[var(--color-text-secondary)]">
                {report.javaPath || "Runtime Paranoia"}
              </code>
            </p>
            {report.jvmArgs && (
              <p className="text-[var(--text-color)]">
                <span className="text-[var(--color-text-secondary)]">JVM Args :</span>{" "}
                <code className="text-xs bg-black/30 px-2 py-0.5 rounded text-[var(--color-text-secondary)] block truncate mt-1">
                  {report.jvmArgs}
                </code>
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-2xl p-6 space-y-3">
        <h3 className="text-sm font-bold text-[var(--color-text-secondary)] uppercase">
          Description du joueur
        </h3>
        <p className="text-sm text-[var(--text-color)] whitespace-pre-wrap leading-relaxed">
          {report.description}
        </p>
      </div>

      {report.logs ? (
        <div className="bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-[var(--text-color)] uppercase">
                Logs du jeu / crash
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyLogs}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-color)] hover:border-cyan-500 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copié" : "Copier"}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadLogs}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger</span>
              </button>
            </div>
          </div>

          <pre className="p-4 rounded-xl bg-black/60 border border-[var(--card-border)] font-mono text-xs text-neutral-300 max-h-[500px] overflow-auto whitespace-pre leading-relaxed select-text">
            {report.logs}
          </pre>
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-[var(--surface-bg)] border border-[var(--card-border)] text-center text-sm text-[var(--color-text-secondary)]">
          Aucun log n'a été joint à ce signalement.
        </div>
      )}
    </div>
  );
}

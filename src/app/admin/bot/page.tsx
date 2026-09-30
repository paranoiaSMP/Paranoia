"use client";

import { useState, useEffect } from "react";
import {
  Bot,
  Activity,
  Radio,
  Video,
  Scale,
  Gift,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Shield,
  Coins,
  Package,
  ExternalLink,
  Sparkles,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import DiscordEmbedBuilder from "./components/DiscordEmbedBuilder";
import BotModulesConfig from "./components/BotModulesConfig";
import BotSanctions from "./components/BotSanctions";
import WelcomeEditor from "./components/WelcomeEditor";

export default function AdminBotPage() {
  const [activeTab, setActiveTab] = useState<"modules" | "builder" | "overview" | "tiktok" | "appeals" | "give">("modules");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // TikTok target state
  const [tiktokForm, setTiktokForm] = useState({
    username: "",
    channelId: "",
    roleId: "",
  });

  // Give reward state
  const [giveForm, setGiveForm] = useState({
    identifier: "",
    rewardType: "coins",
    amount: 100,
    boxType: "standard",
  });

  async function loadData() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/bot");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function showFeedback(type: "success" | "error", message: string) {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  }

  async function handleAddTiktok(e: React.FormEvent) {
    e.preventDefault();
    if (!tiktokForm.username || !tiktokForm.channelId) return;

    try {
      setActionLoading(true);
      const res = await fetch("/api/admin/bot/tiktok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tiktokForm),
      });

      if (res.ok) {
        showFeedback("success", `@${tiktokForm.username} ajoutÀƒÂ© ÀƒÂ  la surveillance !`);
        setTiktokForm({ username: "", channelId: "", roleId: "" });
        loadData();
      } else {
        showFeedback("error", "Impossible d'ajouter ce compte");
      }
    } catch {
      showFeedback("error", "Erreur rÀƒÂ©seau");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteTiktok(username: string) {
    try {
      const res = await fetch(`/api/admin/bot/tiktok?username=${encodeURIComponent(username)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showFeedback("success", `@${username} retirÀƒÂ©.`);
        loadData();
      }
    } catch {
      showFeedback("error", "Erreur lors de la suppression");
    }
  }

  async function handleAppealDecision(appealId: string, status: "accepted" | "rejected") {
    try {
      const res = await fetch("/api/admin/bot/appeals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appealId, status }),
      });

      if (res.ok) {
        showFeedback("success", `Appel ${status === "accepted" ? "acceptÀƒÂ©" : "rejetÀƒÂ©"} !`);
        loadData();
      } else {
        showFeedback("error", "Erreur lors de la mise ÀƒÂ  jour");
      }
    } catch {
      showFeedback("error", "Erreur rÀƒÂ©seau");
    }
  }

  async function handleGiveReward(e: React.FormEvent) {
    e.preventDefault();
    if (!giveForm.identifier || giveForm.amount <= 0) return;

    try {
      setActionLoading(true);
      const res = await fetch("/api/admin/bot/give", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(giveForm),
      });

      if (res.ok) {
        const json = await res.json();
        showFeedback("success", json.message || "RÀƒÂ©compense attribuÀƒÂ©e !");
        setGiveForm({ ...giveForm, identifier: "", amount: 100 });
      } else {
        const err = await res.text();
        showFeedback("error", err || "Joueur introuvable ou erreur");
      }
    } catch {
      showFeedback("error", "Erreur rÀƒÂ©seau");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--card-border)] pb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-fuchsia-500/20 border border-fuchsia-500/30 rounded-2xl text-fuchsia-400">
            <Bot className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-black font-outfit text-[var(--text-color)] tracking-tight uppercase">
                Console Bot Discord
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-400">
                Rust / Twilight
              </span>
            </div>
            <p className="text-[var(--color-text-secondary)] text-sm">
              Supervision temps rÀƒÂ©el, surveillance TikTok, appels & modÀƒÂ©ration Discord.
            </p>
          </div>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-[var(--icon-bg)] hover:bg-[var(--card-border)] text-[var(--text-color)] transition-all"
        >
          <RefreshCw className={cn("w-4 h-4", loading ? "animate-spin" : "")} />
          Actualiser
        </button>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={cn(
            "p-4 rounded-xl flex items-center gap-3 font-semibold text-sm border animate-in fade-in",
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          )}
        >
          {feedback.type === "success" ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl">
        <button
          onClick={() => setActiveTab("modules")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all",
            activeTab === "modules"
              ? "bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-600/30"
              : "text-[var(--color-text-secondary)] hover:text-white"
          )}
        >
          <Settings className="w-4 h-4" />
          Modules
        </button>

        <button
          onClick={() => setActiveTab("overview")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all",
            activeTab === "overview"
              ? "bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-600/30"
              : "text-[var(--color-text-secondary)] hover:text-white"
          )}
        >
          <Activity className="w-4 h-4" />
          Statut & MÀƒÂ©triques
        </button>

        <button
          onClick={() => setActiveTab("builder")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all",
            activeTab === "builder"
              ? "bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-600/30"
              : "text-[var(--color-text-secondary)] hover:text-white"
          )}
        >
          <Sparkles className="w-4 h-4" />
          CrÀƒÂ©ateur d&apos;Embeds V2
        </button>

        <button
          onClick={() => setActiveTab("tiktok")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all",
            activeTab === "tiktok"
              ? "bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-600/30"
              : "text-[var(--color-text-secondary)] hover:text-white"
          )}
        >
          <Video className="w-4 h-4" />
          Surveillance TikTok ({data?.stats?.monitoredTiktoks ?? 0})
        </button>

        <button
          onClick={() => setActiveTab("appeals")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all",
            activeTab === "appeals"
              ? "bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-600/30"
              : "text-[var(--color-text-secondary)] hover:text-white"
          )}
        >
          <Scale className="w-4 h-4" />
          Contestations ({data?.stats?.pendingAppeals ?? 0})
        </button>

        <button
          onClick={() => setActiveTab("give")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all",
            activeTab === "give"
              ? "bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-600/30"
              : "text-[var(--color-text-secondary)] hover:text-white"
          )}
        >
          <Gift className="w-4 h-4" />
          RÀƒÂ©compenses Joueurs
        </button>
      </div>

      {/* TAB 0: MODULES */}
      {activeTab === "modules" && <BotModulesConfig />}

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-[var(--icon-bg)] border border-[var(--card-border)] flex items-center gap-4">
              <div
                className={cn(
                  "p-3 rounded-xl",
                  data?.status?.online ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                )}
              >
                <Radio className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--color-text-secondary)]">Passerelle Discord</p>
                <p className="text-xl font-black text-white">
                  {data?.status?.online ? "ConnectÀƒÂ© (OK)" : "Inaccessible"}
                </p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {data?.status?.gateway?.url
                    ? "WSS Ready"
                    : (data?.status?.error || "VÀƒÂ©rifier le token")}
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[var(--icon-bg)] border border-[var(--card-border)] flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--color-text-secondary)]">Sanctions Actives</p>
                <p className="text-xl font-black text-white">{data?.stats?.totalSanctions ?? 0}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">Bans, Mutes & Kicks</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[var(--icon-bg)] border border-[var(--card-border)] flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
                <Scale className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--color-text-secondary)]">Appels en Attente</p>
                <p className="text-xl font-black text-white">{data?.stats?.pendingAppeals ?? 0}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">Àƒâ‚¬ modÀƒÂ©rer</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[var(--icon-bg)] border border-[var(--card-border)] flex items-center gap-4">
              <div className="p-3 bg-fuchsia-500/10 text-fuchsia-400 rounded-xl">
                <Video className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--color-text-secondary)]">Comptes TikTok</p>
                <p className="text-xl font-black text-white">
                  {data?.stats?.monitoredTiktoks ?? 0}
                  {data?.stats?.liveTiktoks > 0 && (
                    <span className="text-xs text-red-400 ml-2 font-bold animate-pulse">
                      À°Å¸â€Â´ {data.stats.liveTiktoks} Live
                    </span>
                  )}
                </p>
                <p className="text-xs text-[var(--color-text-secondary)]">Surveillance 90s</p>
              </div>
            </div>
          </div>

          {/* Technical Specs Card */}
          <div className="p-6 rounded-2xl bg-[var(--icon-bg)] border border-[var(--card-border)]">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Bot className="w-5 h-5 text-fuchsia-400" />
              Environnement & SpÀƒÂ©cifications Techniques
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-4 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)]">
                <p className="text-xs text-[var(--color-text-secondary)] uppercase font-semibold">Moteur ExÀƒÂ©cution</p>
                <p className="text-base font-bold text-white mt-1">Rust natif (tokio async)</p>
                <p className="text-xs text-emerald-400 mt-1">ZÀƒÂ©ro fuite mÀƒÂ©moire / Haute vÀƒÂ©locitÀƒÂ©</p>
              </div>
              <div className="p-4 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)]">
                <p className="text-xs text-[var(--color-text-secondary)] uppercase font-semibold">Librairie Discord</p>
                <p className="text-base font-bold text-white mt-1">Twilight 0.17</p>
                <p className="text-xs text-fuchsia-400 mt-1">Gateway Shard + Cache In-Memory</p>
              </div>
              <div className="p-4 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)]">
                <p className="text-xs text-[var(--color-text-secondary)] uppercase font-semibold">Base de DonnÀƒÂ©es</p>
                <p className="text-base font-bold text-white mt-1">PostgreSQL (sqlx pool)</p>
                <p className="text-xs text-indigo-400 mt-1">Sanctions, TikTok & Appeals en DB</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: EMBED BUILDER V2 */}
      {activeTab === "builder" && <DiscordEmbedBuilder />}

      {/* TAB 3: TIKTOK */}
      {activeTab === "tiktok" && (
        <div className="space-y-6">
          {/* Add creator form */}
          <div className="p-6 rounded-2xl bg-[var(--icon-bg)] border border-[var(--card-border)]">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-fuchsia-400" />
              Ajouter un crÀƒÂ©ateur ÀƒÂ  surveiller
            </h3>

            <form onSubmit={handleAddTiktok} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[var(--color-text-secondary)] mb-1">
                  Pseudo TikTok
                </label>
                <input
                  type="text"
                  placeholder="Ex: paranoia_smp"
                  value={tiktokForm.username}
                  onChange={(e) => setTiktokForm({ ...tiktokForm, username: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-white text-sm focus:outline-none focus:border-fuchsia-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[var(--color-text-secondary)] mb-1">
                  ID Salon Discord
                </label>
                <input
                  type="text"
                  placeholder="Ex: 151610653..."
                  value={tiktokForm.channelId}
                  onChange={(e) => setTiktokForm({ ...tiktokForm, channelId: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-white text-sm focus:outline-none focus:border-fuchsia-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[var(--color-text-secondary)] mb-1">
                  ID RÀƒÂ´le Notification (opt.)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 15161065..."
                  value={tiktokForm.roleId}
                  onChange={(e) => setTiktokForm({ ...tiktokForm, roleId: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-white text-sm focus:outline-none focus:border-fuchsia-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-2.5 rounded-xl font-bold bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-600/30 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter
                </button>
              </div>
            </form>
          </div>

          {/* Creators List */}
          <div className="p-6 rounded-2xl bg-[var(--icon-bg)] border border-[var(--card-border)]">
            <h3 className="text-lg font-bold text-white mb-4">Comptes actuellement surveillÀƒÂ©s</h3>

            {data?.tiktokTargets?.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)] italic">Aucun crÀƒÂ©ateur dans la liste.</p>
            ) : (
              <div className="divide-y divide-[var(--card-border)]">
                {data?.tiktokTargets?.map((t: any) => (
                  <div key={t.username} className="py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-3 h-3 rounded-full flex-shrink-0",
                          t.is_live ? "bg-red-500 animate-ping" : "bg-neutral-600"
                        )}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-white text-base">@{t.username}</p>
                          <a
                            href={`https://www.tiktok.com/@${t.username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--color-text-secondary)] hover:text-white"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          Salon : <span className="font-mono text-fuchsia-400">{t.channel_id}</span>
                          {t.role_id && (
                            <>
                              {" "}À‚Â· RÀƒÂ´le notifiÀƒÂ© : <span className="font-mono text-indigo-400">{t.role_id}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "px-2.5 py-1 rounded-full text-xs font-bold uppercase",
                          t.is_live
                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                            : "bg-neutral-800 text-neutral-400"
                        )}
                      >
                        {t.is_live ? "En Live" : "Hors-ligne"}
                      </span>

                      <button
                        onClick={() => handleDeleteTiktok(t.username)}
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Supprimer de la surveillance"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: APPEALS & SANCTIONS */}
      {activeTab === "appeals" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[var(--icon-bg)] border border-[var(--card-border)]">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Scale className="w-5 h-5 text-amber-400" />
              Contestations de Sanction
            </h3>

            {data?.appeals?.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)] italic">Aucun appel enregistrÀƒÂ©.</p>
            ) : (
              <div className="space-y-4">
                {data?.appeals?.map((a: any) => (
                  <div
                    key={a.id}
                    className="p-4 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--card-border)] pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-fuchsia-400">#{a.sanction_id}</span>
                        <span className="font-bold text-white">Pseudo : {a.pseudo_mc || "Non renseignÀƒÂ©"}</span>
                        {a.sanction_type && (
                          <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-red-500/10 text-red-400 border border-red-500/20">
                            {a.sanction_type}
                          </span>
                        )}
                      </div>

                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide",
                          a.status === "accepted"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : a.status === "rejected"
                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                            : "bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse"
                        )}
                      >
                        {a.status === "pending" ? "En attente" : a.status === "accepted" ? "AcceptÀƒÂ©" : "RejetÀƒÂ©"}
                      </span>
                    </div>

                    <div className="text-sm text-[var(--text-color)] bg-black/30 p-3 rounded-lg border border-white/5 font-mono text-xs">
                      {a.arguments}
                    </div>

                    {a.status === "pending" && (
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleAppealDecision(a.id, "accepted")}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Accepter l'appel
                        </button>
                        <button
                          onClick={() => handleAppealDecision(a.id, "rejected")}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Rejeter l'appel
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: GIVE REWARDS */}
      {activeTab === "give" && (
        <div className="p-6 rounded-2xl bg-[var(--icon-bg)] border border-[var(--card-border)] max-w-xl">
          <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <Gift className="w-5 h-5 text-fuchsia-400" />
            Attribuer des RÀƒÂ©compenses
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)] mb-6">
            CrÀƒÂ©ditez instantanÀƒÂ©ment des ParaCoins ou des BoÀƒÂ®tes ÀƒÂ  un joueur (par pseudo Minecraft ou ID Discord).
          </p>

          <form onSubmit={handleGiveReward} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-[var(--color-text-secondary)] mb-1">
                Pseudo Minecraft ou ID Discord du joueur
              </label>
              <input
                type="text"
                placeholder="Ex: Leoo955 ou 15161065..."
                value={giveForm.identifier}
                onChange={(e) => setGiveForm({ ...giveForm, identifier: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-white text-sm focus:outline-none focus:border-fuchsia-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[var(--color-text-secondary)] mb-1">
                  Type de rÀƒÂ©compense
                </label>
                <select
                  value={giveForm.rewardType}
                  onChange={(e) => setGiveForm({ ...giveForm, rewardType: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-white text-sm focus:outline-none focus:border-fuchsia-500"
                >
                  <option value="coins">À°Å¸Âªâ„¢ ParaCoins</option>
                  <option value="box">À°Å¸â€œÂ¦ BoÀƒÂ®te / Booster</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[var(--color-text-secondary)] mb-1">
                  QuantitÀƒÂ©
                </label>
                <input
                  type="number"
                  min="1"
                  value={giveForm.amount}
                  onChange={(e) => setGiveForm({ ...giveForm, amount: parseInt(e.target.value, 10) || 1 })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-white text-sm focus:outline-none focus:border-fuchsia-500"
                  required
                />
              </div>
            </div>

            {giveForm.rewardType === "box" && (
              <div>
                <label className="block text-xs font-bold uppercase text-[var(--color-text-secondary)] mb-1">
                  Type de BoÀƒÂ®te
                </label>
                <select
                  value={giveForm.boxType}
                  onChange={(e) => setGiveForm({ ...giveForm, boxType: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-white text-sm focus:outline-none focus:border-fuchsia-500"
                >
                  <option value="standard">BoÀƒÂ®te Standard</option>
                  <option value="premium">BoÀƒÂ®te Premium</option>
                  <option value="mythic">BoÀƒÂ®te Mythique</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full py-3 rounded-xl font-bold bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-600/30 transition-all flex items-center justify-center gap-2"
            >
              <Gift className="w-4 h-4" />
              {actionLoading ? "Attribution en cours..." : "Attribuer la rÀƒÂ©compense"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}




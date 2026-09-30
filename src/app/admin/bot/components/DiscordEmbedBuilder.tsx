"use client";

import { useState, useEffect, useRef } from "react";
import {
  Eye,
  Paintbrush,
  Copy,
  Trash2,
  Plus,
  Link as LinkIcon,
  Smile,
  Image as ImageIcon,
  Clock,
  Send,
  Save,
  FolderOpen,
  Check,
  Globe,
  Lock,
  ExternalLink,
  ChevronDown,
  X,
  Code2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";

interface EmbedField {
  id: string;
  name: string;
  value: string;
  inline: boolean;
}

interface DiscordButton {
  id: string;
  label: string;
  style: number; // 1: Primary, 2: Secondary, 3: Success, 4: Danger, 5: Link
  url?: string;
  custom_id?: string;
  emoji?: string;
  disabled?: boolean;
}

interface EmbedData {
  color: string;
  author: {
    name: string;
    icon_url: string;
    url: string;
  };
  title: string;
  url: string;
  description: string;
  fields: EmbedField[];
  thumbnail: {
    url: string;
  };
  image: {
    url: string;
  };
  footer: {
    text: string;
    icon_url: string;
  };
  timestamp: boolean;
}

const DEFAULT_EMBED: EmbedData = {
  color: "#f43f5e",
  author: { name: "", icon_url: "", url: "" },
  title: "",
  url: "",
  description: "",
  fields: [],
  thumbnail: { url: "" },
  image: { url: "" },
  footer: { text: "Paranoia Studio · Annonce Officielle", icon_url: "" },
  timestamp: true,
};

const DISCORD_COLORS = [
  "#f43f5e", // Rose / Red Paranoia
  "#5865f2", // Discord Blurple
  "#22c55e", // Success Green
  "#facc15", // Warning Gold
  "#ef4444", // Danger Red
  "#a855f7", // Purple Paranoia
  "#06b6d4", // Cyan
  "#1e1f22", // Discord Dark
];

export default function DiscordEmbedBuilder() {
  const { data: session } = useSession();
  const [embed, setEmbed] = useState<EmbedData>(DEFAULT_EMBED);
  const [buttons, setButtons] = useState<DiscordButton[]>([]);
  const [channelId, setChannelId] = useState("");
  const [pingRole, setPingRole] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Color picker popover
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateScope, setTemplateScope] = useState<"local" | "public">("local");

  // Presets
  const [localPresets, setLocalPresets] = useState<any[]>([]);
  const [publicPresets, setPublicPresets] = useState<any[]>([]);
  const [showPresetsMenu, setShowPresetsMenu] = useState(false);
  const [showJsonModal, setShowJsonModal] = useState(false);

  // Field editing
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    // Load local presets
    try {
      const saved = localStorage.getItem("paranoia_embed_presets_local");
      if (saved) setLocalPresets(JSON.parse(saved));
    } catch {}

    // Load public presets from API
    loadPublicPresets();
  }, []);

  async function loadPublicPresets() {
    try {
      const res = await fetch("/api/admin/bot/embeds");
      if (res.ok) {
        const data = await res.json();
        setPublicPresets(data);
      }
    } catch {}
  }

  function notify(type: "success" | "error", text: string) {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  }

  function handleFillSelf() {
    const user = session?.user;
    if (!user) return;
    setEmbed((prev) => ({
      ...prev,
      author: {
        ...prev.author,
        name: user.name || "Modérateur Paranoia",
        icon_url: user.image || "",
      },
    }));
    notify("success", "Auteur renseigné avec votre profil !");
  }

  function addField() {
    setEmbed((prev) => ({
      ...prev,
      fields: [
        ...prev.fields,
        {
          id: `f_${Date.now()}`,
          name: "Nouveau Champ",
          value: "Contenu du champ...",
          inline: false,
        },
      ],
    }));
  }

  function updateField(id: string, updates: Partial<EmbedField>) {
    setEmbed((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    }));
  }

  function removeField(id: string) {
    setEmbed((prev) => ({
      ...prev,
      fields: prev.fields.filter((f) => f.id !== id),
    }));
  }

  function addButton() {
    if (buttons.length >= 25) {
      notify("error", "Maximum 25 boutons autorisés par Discord (5 lignes de 5)");
      return;
    }
    setButtons((prev) => [
      ...prev,
      {
        id: `btn_${Date.now()}`,
        label: `Bouton ${prev.length + 1}`,
        style: 1, // Primary Blurple
        custom_id: `action_${Date.now()}`,
        emoji: "✨",
      },
    ]);
  }

  function updateButton(id: string, updates: Partial<DiscordButton>) {
    setButtons((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  }

  function removeButton(id: string) {
    setButtons((prev) => prev.filter((b) => b.id !== id));
  }

  function handleSavePreset() {
    if (!templateName.trim()) {
      notify("error", "Veuillez entrer un nom pour le template");
      return;
    }

    const payload = {
      name: templateName.trim(),
      embed,
      components: buttons,
    };

    if (templateScope === "local") {
      const updated = [
        ...localPresets.filter((p) => p.name.toLowerCase() !== templateName.trim().toLowerCase()),
        { ...payload, id: `local_${Date.now()}`, author: "Moi", createdAt: new Date().toISOString() },
      ];
      setLocalPresets(updated);
      localStorage.setItem("paranoia_embed_presets_local", JSON.stringify(updated));
      notify("success", `Template local "${templateName}" enregistré !`);
      setShowSaveModal(false);
      setTemplateName("");
    } else {
      // Public / shared via DB
      fetch("/api/admin/bot/embeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then((res) => {
          if (res.ok) {
            notify("success", `Template partagé "${templateName}" enregistré pour toute l'équipe !`);
            loadPublicPresets();
            setShowSaveModal(false);
            setTemplateName("");
          } else {
            notify("error", "Erreur lors de la sauvegarde sur la base de données");
          }
        })
        .catch(() => notify("error", "Erreur réseau"));
    }
  }

  function loadPreset(preset: any) {
    if (preset.embed) setEmbed(preset.embed);
    if (preset.components) setButtons(preset.components);
    setShowPresetsMenu(false);
    notify("success", `Template "${preset.name}" chargé !`);
  }

  function deletePreset(id: string, scope: "local" | "public", e: React.MouseEvent) {
    e.stopPropagation();
    if (scope === "local") {
      const updated = localPresets.filter((p) => p.id !== id);
      setLocalPresets(updated);
      localStorage.setItem("paranoia_embed_presets_local", JSON.stringify(updated));
      notify("success", "Template local supprimé.");
    } else {
      fetch(`/api/admin/bot/embeds?id=${encodeURIComponent(id)}`, { method: "DELETE" })
        .then((res) => {
          if (res.ok) {
            notify("success", "Template partagé supprimé.");
            loadPublicPresets();
          }
        })
        .catch(() => notify("error", "Erreur réseau"));
    }
  }

  async function handleSendToDiscord() {
    if (!channelId.trim()) {
      notify("error", "Veuillez renseigner un ID de salon Discord cible !");
      return;
    }

    try {
      setSending(true);
      const res = await fetch("/api/admin/bot/announce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: channelId.trim(),
          pingRole: pingRole.trim() || undefined,
          embed,
          components: buttons,
        }),
      });

      if (res.ok) {
        notify("success", "🚀 Embed V2 et boutons envoyés sur Discord avec succès !");
      } else {
        const err = await res.text();
        notify("error", err || "Erreur lors de l'envoi");
      }
    } catch {
      notify("error", "Erreur de connexion");
    } finally {
      setSending(false);
    }
  }

  const fullPayloadJson = JSON.stringify(
    {
      embeds: [embed],
      components: buttons,
    },
    null,
    2
  );

  return (
    <div className="space-y-6">
      {/* Top Bar Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[var(--icon-bg)] border border-[var(--card-border)]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setShowPresetsMenu(!showPresetsMenu)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-[var(--card-bg)] hover:bg-[var(--card-border)] text-white border border-[var(--card-border)] transition-all"
            >
              <FolderOpen className="w-4 h-4 text-fuchsia-400" />
              Templates ({localPresets.length + publicPresets.length})
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {/* Presets dropdown */}
            {showPresetsMenu && (
              <div className="absolute left-0 mt-2 w-80 max-h-96 overflow-y-auto p-2 bg-[#1e1f22] border border-[var(--card-border)] rounded-2xl shadow-2xl z-50 space-y-2 animate-in fade-in">
                <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-amber-400" /> Mon compte (Local)
                </div>
                {localPresets.length === 0 ? (
                  <p className="px-3 py-1 text-xs text-neutral-500 italic">Aucun template local</p>
                ) : (
                  localPresets.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => loadPreset(p)}
                      className="px-3 py-2 rounded-xl bg-neutral-900/60 hover:bg-fuchsia-600/20 border border-white/5 hover:border-fuchsia-500/40 cursor-pointer flex items-center justify-between text-xs text-white transition-all group"
                    >
                      <span className="font-semibold truncate">{p.name}</span>
                      <button
                        onClick={(e) => deletePreset(p.id, "local", e)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}

                <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5 border-t border-white/5 pt-2">
                  <Globe className="w-3 h-3 text-indigo-400" /> Partagés (Public / Équipe)
                </div>
                {publicPresets.length === 0 ? (
                  <p className="px-3 py-1 text-xs text-neutral-500 italic">Aucun template partagé</p>
                ) : (
                  publicPresets.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => loadPreset(p)}
                      className="px-3 py-2 rounded-xl bg-neutral-900/60 hover:bg-indigo-600/20 border border-white/5 hover:border-indigo-500/40 cursor-pointer flex items-center justify-between text-xs text-white transition-all group"
                    >
                      <div>
                        <p className="font-semibold truncate">{p.name}</p>
                        <p className="text-[10px] text-neutral-400">par {p.author || "Admin"}</p>
                      </div>
                      <button
                        onClick={(e) => deletePreset(p.id, "public", e)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowSaveModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-fuchsia-600/20 hover:bg-fuchsia-600/30 text-fuchsia-300 border border-fuchsia-500/30 transition-all"
          >
            <Save className="w-4 h-4" />
            Sauvegarder
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowJsonModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-all"
            title="Exporter Payload JSON"
          >
            <Code2 className="w-4 h-4" />
            JSON
          </button>

          <button
            onClick={() => {
              setEmbed(DEFAULT_EMBED);
              setButtons([]);
              notify("success", "Éditeur réinitialisé.");
            }}
            className="p-2 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
            title="Effacer tout"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Global Notification Banner */}
      {feedback && (
        <div
          className={cn(
            "p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 border animate-in fade-in",
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          )}
        >
          {feedback.type === "success" ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* MAIN BUILDER CANVAS (faithful Discord WYSIWYG replica) */}
      <div className="flex flex-col lg:flex-row items-start gap-4">
        {/* Left Vertical Tools */}
        <div className="flex lg:flex-col gap-2 p-2 bg-[#1e1f22] border border-[#313338] rounded-2xl shadow-xl">
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 transition-colors text-white"
              title="Couleur de l'embed"
            >
              <Paintbrush className="w-5 h-5" style={{ color: embed.color }} />
            </button>

            {showColorPicker && (
              <div className="absolute left-12 top-0 p-3 bg-[#1e1f22] border border-[#313338] rounded-2xl shadow-2xl z-50 space-y-2 w-48 animate-in fade-in">
                <p className="text-xs font-bold text-neutral-400 uppercase">Couleur bordure</p>
                <div className="grid grid-cols-4 gap-2">
                  {DISCORD_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        setEmbed({ ...embed, color: c });
                        setShowColorPicker(false);
                      }}
                      className="w-7 h-7 rounded-lg border border-white/20 transition-transform hover:scale-110"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <div className="pt-2 border-t border-white/10 flex items-center gap-2">
                  <input
                    type="color"
                    value={embed.color}
                    onChange={(e) => setEmbed({ ...embed, color: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={embed.color}
                    onChange={(e) => setEmbed({ ...embed, color: e.target.value })}
                    className="flex-1 px-2 py-1 text-xs rounded bg-neutral-900 border border-neutral-700 text-white font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              navigator.clipboard.writeText(fullPayloadJson);
              notify("success", "JSON Discord copié dans le presse-papier !");
            }}
            className="p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 transition-colors text-neutral-300 hover:text-white"
            title="Copier le payload JSON"
          >
            <Copy className="w-5 h-5" />
          </button>
        </div>

        {/* The Discord Message / Embed Box */}
        <div className="flex-1 w-full bg-[#313338] border border-[#1e1f22] rounded-2xl p-5 shadow-2xl space-y-4 text-neutral-200">
          {/* Discord Embed Container with Left Colored Bar */}
          <div
            className="relative bg-[#2b2d31] rounded-lg border-l-4 p-4 space-y-3.5 shadow-md transition-all"
            style={{ borderLeftColor: embed.color }}
          >
            {/* Top row: Author & Thumbnail */}
            <div className="flex items-start justify-between gap-4">
              {/* Author Section */}
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="relative group">
                    <input
                      type="text"
                      placeholder="Icon URL"
                      value={embed.author.icon_url}
                      onChange={(e) =>
                        setEmbed({ ...embed, author: { ...embed.author, icon_url: e.target.value } })
                      }
                      className="w-7 h-7 rounded-full bg-[#1e1f22] border border-neutral-700 text-[10px] text-center text-white focus:w-44 focus:px-2 transition-all"
                      title="URL de l'avatar de l'auteur"
                    />
                    {!embed.author.icon_url && (
                      <ImageIcon className="w-3.5 h-3.5 text-neutral-500 absolute top-2 left-2 pointer-events-none" />
                    )}
                  </div>

                  <input
                    type="text"
                    placeholder="Nom de l'auteur..."
                    value={embed.author.name}
                    onChange={(e) => setEmbed({ ...embed, author: { ...embed.author, name: e.target.value } })}
                    className="bg-transparent text-sm font-bold text-neutral-300 placeholder:text-neutral-500 focus:outline-none focus:text-white flex-1"
                  />

                  <button
                    onClick={handleFillSelf}
                    className="px-2.5 py-1 rounded bg-[#383a40] hover:bg-[#404249] text-[11px] font-bold text-fuchsia-400 flex items-center gap-1 transition-colors"
                  >
                    👤 MOI-MÊME
                  </button>
                </div>
              </div>

              {/* Thumbnail Section */}
              <div className="w-20 h-20 rounded-lg border border-dashed border-neutral-600 hover:border-neutral-400 bg-[#1e1f22] flex flex-col items-center justify-center p-1 text-center cursor-pointer transition-colors relative overflow-hidden group">
                {embed.thumbnail.url ? (
                  <>
                    <img
                      src={embed.thumbnail.url}
                      alt="Thumbnail"
                      className="w-full h-full object-cover rounded"
                    />
                    <button
                      onClick={() => setEmbed({ ...embed, thumbnail: { url: "" } })}
                      className="absolute top-1 right-1 p-1 bg-black/70 rounded text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <div className="space-y-1">
                    <Plus className="w-4 h-4 mx-auto text-neutral-400" />
                    <span className="text-[10px] text-neutral-400 font-bold block leading-tight">
                      Miniature
                    </span>
                    <input
                      type="text"
                      placeholder="URL"
                      value={embed.thumbnail.url}
                      onChange={(e) => setEmbed({ ...embed, thumbnail: { url: e.target.value } })}
                      className="opacity-0 absolute inset-0 cursor-pointer"
                      title="Collez l'URL de la miniature"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Title Section */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Titre de l'embed..."
                value={embed.title}
                onChange={(e) => setEmbed({ ...embed, title: e.target.value })}
                className="bg-transparent text-lg font-bold text-white placeholder:text-neutral-500 focus:outline-none flex-1 tracking-tight"
              />
              <input
                type="text"
                placeholder="Lien URL (ex: https://...)"
                value={embed.url}
                onChange={(e) => setEmbed({ ...embed, url: e.target.value })}
                className="bg-[#1e1f22] px-2 py-1 rounded text-xs text-indigo-400 placeholder:text-neutral-600 focus:outline-none w-40"
                title="Lien cliquable sur le titre"
              />
            </div>

            {/* Description Section */}
            <div className="relative">
              <textarea
                rows={4}
                placeholder="Description de l'embed (Markdown supporté: **gras**, *italique*, [liens](https://), listes...)"
                value={embed.description}
                onChange={(e) => setEmbed({ ...embed, description: e.target.value })}
                className="w-full bg-transparent text-sm text-neutral-300 placeholder:text-neutral-500 focus:outline-none focus:text-white resize-y font-sans leading-relaxed"
              />
            </div>

            {/* Dynamic Fields Section */}
            {embed.fields.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                {embed.fields.map((f) => (
                  <div
                    key={f.id}
                    className={cn(
                      "p-3 rounded-lg bg-[#1e1f22] border border-neutral-700 space-y-1.5 relative group",
                      f.inline ? "col-span-1" : "col-span-full"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        placeholder="Nom du champ..."
                        value={f.name}
                        onChange={(e) => updateField(f.id, { name: e.target.value })}
                        className="bg-transparent text-xs font-bold text-neutral-300 placeholder:text-neutral-500 focus:outline-none flex-1"
                      />
                      <div className="flex items-center gap-1.5">
                        <label className="text-[10px] text-neutral-400 flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={f.inline}
                            onChange={(e) => updateField(f.id, { inline: e.target.checked })}
                            className="rounded bg-neutral-800"
                          />
                          Aligné
                        </label>
                        <button
                          onClick={() => removeField(f.id)}
                          className="text-neutral-500 hover:text-red-400 p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Valeur du champ..."
                      value={f.value}
                      onChange={(e) => updateField(f.id, { value: e.target.value })}
                      className="w-full bg-transparent text-xs text-neutral-400 placeholder:text-neutral-600 focus:outline-none focus:text-neutral-200 resize-none font-sans"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Button to add field */}
            <button
              onClick={addField}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e1f22] hover:bg-[#383a40] text-xs font-bold text-neutral-300 border border-dashed border-neutral-600 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-fuchsia-400" />
              + Champ
            </button>

            {/* Banner / Large Image Section */}
            <div className="rounded-lg border border-dashed border-neutral-600 hover:border-neutral-400 bg-[#1e1f22] min-h-[90px] flex items-center justify-center p-3 text-center cursor-pointer transition-colors relative overflow-hidden group">
              {embed.image.url ? (
                <>
                  <img
                    src={embed.image.url}
                    alt="Banner"
                    className="w-full max-h-64 object-cover rounded"
                  />
                  <button
                    onClick={() => setEmbed({ ...embed, image: { url: "" } })}
                    className="absolute top-2 right-2 p-1.5 bg-black/70 rounded text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <div className="space-y-1">
                  <Plus className="w-5 h-5 mx-auto text-neutral-400" />
                  <span className="text-xs text-neutral-400 font-bold block">
                    Ajouter une grande image (Bannière)
                  </span>
                  <input
                    type="text"
                    placeholder="URL de la bannière"
                    value={embed.image.url}
                    onChange={(e) => setEmbed({ ...embed, image: { url: e.target.value } })}
                    className="opacity-0 absolute inset-0 cursor-pointer"
                    title="Collez l'URL de la bannière"
                  />
                </div>
              )}
            </div>

            {/* Footer & Horodatage Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs border-t border-neutral-700/60">
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  placeholder="URL Icon Footer"
                  value={embed.footer.icon_url}
                  onChange={(e) =>
                    setEmbed({ ...embed, footer: { ...embed.footer, icon_url: e.target.value } })
                  }
                  className="w-6 h-6 rounded-full bg-[#1e1f22] border border-neutral-700 text-[10px] text-center text-white focus:w-36 focus:px-2 transition-all"
                  title="URL icône pied de page"
                />
                <input
                  type="text"
                  placeholder="Texte de bas de page (Footer)..."
                  value={embed.footer.text}
                  onChange={(e) =>
                    setEmbed({ ...embed, footer: { ...embed.footer, text: e.target.value } })
                  }
                  className="bg-transparent text-xs text-neutral-400 placeholder:text-neutral-600 focus:outline-none focus:text-neutral-200 flex-1 font-sans"
                />
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-neutral-400 font-medium">Horodatage</span>
                <button
                  onClick={() => setEmbed({ ...embed, timestamp: !embed.timestamp })}
                  className={cn(
                    "w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out relative",
                    embed.timestamp ? "bg-fuchsia-600" : "bg-neutral-700"
                  )}
                >
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full bg-white transition-transform duration-200 ease-in-out shadow",
                      embed.timestamp ? "translate-x-4" : "translate-x-0"
                    )}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* DISCORD V2 INTERACTIVE BUTTONS SECTION */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                <span>Composants Discord V2 (Boutons interactifs & liens)</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  {buttons.length}/25
                </span>
              </p>

              <button
                onClick={addButton}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/20"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter un Bouton
              </button>
            </div>

            {/* Render Buttons Grid / Action Rows */}
            {buttons.length === 0 ? (
              <p className="text-xs text-neutral-500 italic p-3 rounded-lg bg-[#2b2d31] border border-neutral-700">
                Aucun bouton. Cliquez sur "+ Ajouter un Bouton" pour ajouter des boutons d'interaction V2 ou des liens sous l'embed.
              </p>
            ) : (
              <div className="space-y-2">
                {buttons.map((btn, index) => {
                  const isLink = btn.style === 5;
                  return (
                    <div
                      key={btn.id}
                      className="p-3 rounded-xl bg-[#2b2d31] border border-neutral-700 flex flex-wrap items-center gap-3 animate-in fade-in"
                    >
                      {/* Emoji */}
                      <input
                        type="text"
                        placeholder="Emoji"
                        value={btn.emoji || ""}
                        onChange={(e) => updateButton(btn.id, { emoji: e.target.value })}
                        className="w-14 px-2 py-1.5 text-center text-sm rounded bg-[#1e1f22] border border-neutral-600 text-white font-mono"
                        title="Emoji Discord ou Unicode"
                      />

                      {/* Label */}
                      <input
                        type="text"
                        placeholder="Texte du bouton..."
                        value={btn.label}
                        onChange={(e) => updateButton(btn.id, { label: e.target.value })}
                        className="flex-1 min-w-[140px] px-3 py-1.5 text-xs font-bold rounded bg-[#1e1f22] border border-neutral-600 text-white"
                      />

                      {/* Style Selector */}
                      <select
                        value={btn.style}
                        onChange={(e) => updateButton(btn.id, { style: Number(e.target.value) })}
                        className="px-3 py-1.5 text-xs font-semibold rounded bg-[#1e1f22] border border-neutral-600 text-white"
                      >
                        <option value={1}>🟦 Blurple (Primary)</option>
                        <option value={2}>⬛ Gris (Secondary)</option>
                        <option value={3}>🟩 Vert (Success)</option>
                        <option value={4}>🟥 Rouge (Danger)</option>
                        <option value={5}>🔗 Lien URL (Link)</option>
                      </select>

                      {/* Custom ID or URL */}
                      {isLink ? (
                        <input
                          type="url"
                          placeholder="https://paranoia-smp.fr/..."
                          value={btn.url || ""}
                          onChange={(e) => updateButton(btn.id, { url: e.target.value })}
                          className="flex-1 min-w-[180px] px-3 py-1.5 text-xs font-mono rounded bg-[#1e1f22] border border-neutral-600 text-indigo-300"
                        />
                      ) : (
                        <input
                          type="text"
                          placeholder="custom_id d'interaction..."
                          value={btn.custom_id || ""}
                          onChange={(e) => updateButton(btn.id, { custom_id: e.target.value })}
                          className="flex-1 min-w-[180px] px-3 py-1.5 text-xs font-mono rounded bg-[#1e1f22] border border-neutral-600 text-neutral-400"
                        />
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => removeButton(btn.id)}
                        className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DISPATCH TO DISCORD PANEL */}
      <div className="p-6 rounded-2xl bg-[var(--icon-bg)] border border-[var(--card-border)] space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Send className="w-5 h-5 text-fuchsia-400" />
          Publication Immédiate sur Discord
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase text-[var(--color-text-secondary)] mb-1">
              ID du Salon Discord
            </label>
            <input
              type="text"
              placeholder="Ex: 1516106534122426433 (Salon d'annonce ou d'accueil)"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-white text-sm font-mono focus:outline-none focus:border-fuchsia-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-[var(--color-text-secondary)] mb-1">
              Mention de Rôle (Optionnel)
            </label>
            <input
              type="text"
              placeholder="ID du rôle (ex: 15161065...)"
              value={pingRole}
              onChange={(e) => setPingRole(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-white text-sm font-mono focus:outline-none focus:border-fuchsia-500"
            />
          </div>
        </div>

        <button
          onClick={handleSendToDiscord}
          disabled={sending}
          className="w-full py-3.5 rounded-xl font-bold bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-xl shadow-fuchsia-600/30 transition-all flex items-center justify-center gap-2 text-base"
        >
          <Send className={cn("w-5 h-5", sending ? "animate-bounce" : "")} />
          {sending ? "Diffusion sur Discord en cours..." : "Diffuser l'Embed V2 sur Discord"}
        </button>
      </div>

      {/* SAVE MODAL (LOCAL VS PUBLIC) */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e1f22] border border-[#313338] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-bold text-white flex items-center gap-2">
                <Save className="w-5 h-5 text-fuchsia-400" />
                Sauvegarder ce Template
              </h4>
              <button
                onClick={() => setShowSaveModal(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">
                Nom du Template
              </label>
              <input
                type="text"
                placeholder="Ex: Annonce Tournoi, Bienvenue, Recrutement..."
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-white text-sm focus:outline-none focus:border-fuchsia-500"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-neutral-400 mb-2">
                Portée de Sauvegarde
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTemplateScope("local")}
                  className={cn(
                    "p-3 rounded-xl border text-left space-y-1 transition-all",
                    templateScope === "local"
                      ? "bg-amber-500/10 border-amber-500 text-white"
                      : "bg-neutral-900 border-neutral-700 text-neutral-400"
                  )}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-amber-400">
                    <Lock className="w-3.5 h-3.5" />
                    Mon compte (Local)
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-tight">
                    Visible uniquement dans ce navigateur.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setTemplateScope("public")}
                  className={cn(
                    "p-3 rounded-xl border text-left space-y-1 transition-all",
                    templateScope === "public"
                      ? "bg-indigo-500/10 border-indigo-500 text-white"
                      : "bg-neutral-900 border-neutral-700 text-neutral-400"
                  )}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-400">
                    <Globe className="w-3.5 h-3.5" />
                    Pour tout le monde
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-tight">
                    Partagé avec tous les membres du staff / admin.
                  </p>
                </button>
              </div>
            </div>

            <button
              onClick={handleSavePreset}
              className="w-full py-3 rounded-xl font-bold bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-600/30 transition-all"
            >
              Enregistrer le Template
            </button>
          </div>
        </div>
      )}

      {/* JSON PAYLOAD MODAL */}
      {showJsonModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e1f22] border border-[#313338] rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-bold text-white flex items-center gap-2">
                <Code2 className="w-5 h-5 text-fuchsia-400" />
                Payload Discord JSON (V2 API)
              </h4>
              <button
                onClick={() => setShowJsonModal(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <textarea
              readOnly
              rows={16}
              value={fullPayloadJson}
              className="w-full p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-emerald-400 font-mono text-xs focus:outline-none"
            />

            <button
              onClick={() => {
                navigator.clipboard.writeText(fullPayloadJson);
                notify("success", "Payload copié !");
                setShowJsonModal(false);
              }}
              className="w-full py-2.5 rounded-xl font-bold bg-neutral-800 hover:bg-neutral-700 text-white transition-all"
            >
              Copier le JSON
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

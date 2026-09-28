"use client";

import { useState, useEffect } from "react";
import { Check, X, Shield, Users, Mic, Coins, Layers, MessageSquare, ShieldAlert, FileText, ToggleLeft, ToggleRight } from "lucide-react";
import { cn } from "@/lib/utils";

type ModuleConfig = {
  guildId: string;
  moduleTickets: boolean;
  moduleWelcome: boolean;
  moduleSecurity: boolean;
  moduleAutoMod: boolean;
  moduleAuditLogs: boolean;
  moduleTempVoice: boolean;
  moduleEconomy: boolean;
  moduleXp: boolean;
  moduleTcg: boolean;
};

export default function BotModulesConfig() {
  const [config, setConfig] = useState<ModuleConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/bot/modules")
      .then((res) => res.json())
      .then((data) => {
        setConfig(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load modules config", err);
        setLoading(false);
      });
  }, []);

  const handleToggle = async (key: keyof ModuleConfig) => {
    if (!config) return;

    const newConfig = { ...config, [key]: !config[key] };
    setConfig(newConfig);
    setSaving(true);

    try {
      await fetch("/api/admin/bot/modules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConfig),
      });
    } catch (error) {
      console.error("Failed to save module config", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-[var(--color-text-secondary)] text-sm">Chargement des modules...</div>;
  }

  if (!config) {
    return <div className="text-red-400 text-sm">Erreur de chargement.</div>;
  }

  const modulesList = [
    { key: "moduleTickets", title: "Système de Tickets", desc: "Support, candidatures, contact", icon: MessageSquare },
    { key: "moduleWelcome", title: "Accueil & Captcha", desc: "Vérification des nouveaux membres", icon: Users },
    { key: "moduleSecurity", title: "Sécurité Avancée", desc: "Anti-Raid, Anti-Spam", icon: Shield },
    { key: "moduleAutoMod", title: "Auto-Modération", desc: "Filtres, mots interdits", icon: ShieldAlert },
    { key: "moduleAuditLogs", title: "Logs & Traces", desc: "Suivi des actions du serveur", icon: FileText },
    { key: "moduleTempVoice", title: "Vocaux Temporaires", desc: "Création automatique de salons", icon: Mic },
    { key: "moduleEconomy", title: "Economie", desc: "Monnaie virtuelle, boutique", icon: Coins },
    { key: "moduleXp", title: "Système d'XP", desc: "Niveaux et rôles automatiques", icon: Layers },
    { key: "moduleTcg", title: "Cartes (TCG)", desc: "Trading Card Game intégré", icon: Layers },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-xl font-bold text-white tracking-tight">Modules du Bot</h3>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Activez ou désactivez les fonctionnalités principales du bot.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {modulesList.map((m) => {
          const isActive = config[m.key as keyof ModuleConfig] as boolean;
          const Icon = m.icon;
          return (
            <div
              key={m.key}
              onClick={() => handleToggle(m.key)}
              className={cn(
                "group cursor-pointer p-5 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-4",
                isActive
                  ? "bg-[var(--icon-bg)] border-fuchsia-500/30 hover:border-fuchsia-500/50"
                  : "bg-black/20 border-[var(--card-border)] hover:bg-black/30 opacity-75 hover:opacity-100"
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-3 rounded-xl transition-colors",
                  isActive ? "bg-fuchsia-500/10 text-fuchsia-400" : "bg-neutral-800 text-neutral-400"
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className={cn("text-base font-bold transition-colors", isActive ? "text-white" : "text-neutral-400")}>
                    {m.title}
                  </h4>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{m.desc}</p>
                </div>
              </div>
              <div className={cn("transition-colors", isActive ? "text-fuchsia-400" : "text-neutral-500")}>
                {isActive ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Zap, Link, MessageSquareOff, Type, Smile, AtSign, Image as ImageIcon, Ghost, ShieldAlert, Settings } from "lucide-react";

export default function BotModerationPage() {
  const [modules, setModules] = useState([
    { id: "anti_spam", title: "Anti-Spam", icon: <Zap className="w-5 h-5 text-red-500" />, desc: "Contrôle la vélocité des messages pour bloquer le flood.", badge: "5 msgs / 5s", enabled: true, sanction: "Avertissement" },
    { id: "anti_links", title: "Liens Bannis", icon: <Link className="w-5 h-5 text-red-500" />, desc: "Bloque les invitations Discord et URLs non autorisées.", badge: "", enabled: true, sanction: "Suppression" },
    { id: "bad_words", title: "Mots Bannis", icon: <MessageSquareOff className="w-5 h-5 text-red-500" />, desc: "Dictionnaire de mots et expressions interdits.", badge: "0 mots dans le dictionnaire", enabled: true, sanction: "Suppression" },
    { id: "caps_spam", title: "Spam Majuscules", icon: <Type className="w-5 h-5 text-red-500" />, desc: "Détecte les messages écrits majoritairement en MAJUSCULES.", badge: "70% / Longueur minimale 10", enabled: true, sanction: "Avertissement" },
    { id: "emoji_spam", title: "Spam d'Emojis", icon: <Smile className="w-5 h-5 text-red-500" />, desc: "Limite le nombre d'emojis autorisés par message.", badge: "max 10 emojis", enabled: true, sanction: "Avertissement" },
    { id: "mention_spam", title: "Anti-Spam Mentions", icon: <AtSign className="w-5 h-5 text-red-500" />, desc: "Empêche les membres de mentionner trop d'utilisateurs ou de rôles.", badge: "max 5 pings", enabled: true, sanction: "Avertissement" },
    { id: "image_spam", title: "Images / GIFs", icon: <ImageIcon className="w-5 h-5 text-red-500" />, desc: "Filtre les images et GIFs indésirables.", badge: "max 5 / 60s", enabled: true, sanction: "Avertissement" },
    { id: "ghost_ping", title: "Anti-Ghost Ping", icon: <Ghost className="w-5 h-5 text-red-500" />, desc: "Détecte et supprime les pings fantômes lorsque des mentions sont envoyées puis retirées.", badge: "Avertissement", enabled: true, sanction: "Avertissement" },
    { id: "anti_dox", title: "Anti-Dox", icon: <ShieldAlert className="w-5 h-5 text-red-500" />, desc: "Bloque la divulgation d'informations sensibles (IP, numéros de téléphone) en utilisant des règles Regex.", badge: "IP · Email · Tel", enabled: true, sanction: "Suppression" }
  ]);

  const [globalEnabled, setGlobalEnabled] = useState(true);

  const toggleModule = (id: string) => {
    setModules(modules.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m));
  };

  const changeSanction = (id: string, newSanction: string) => {
    setModules(modules.map(m => m.id === id ? { ...m, sanction: newSanction } : m));
  };

  return (
    <div className="space-y-8 bg-[#0a0a0a] min-h-screen text-white p-6 md:p-8 font-sans rounded-3xl">
      
      {/* Header Bar */}
      <div className="flex flex-col xl:flex-row items-center justify-between bg-[#111] border border-red-900/30 rounded-2xl p-4 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-red-500 font-black tracking-widest uppercase italic px-4">
            <ShieldAlert className="w-6 h-6" />
            MODÉRATION
          </div>
          <div className="hidden lg:flex bg-black/50 rounded-xl p-1">
            <button className="px-6 py-2 bg-white text-red-600 font-bold rounded-lg text-sm uppercase tracking-wider">Filtres</button>
            <button className="px-6 py-2 text-zinc-400 hover:text-white font-bold rounded-lg text-sm uppercase tracking-wider transition-colors">Escalade</button>
            <button className="px-6 py-2 text-zinc-400 hover:text-white font-bold rounded-lg text-sm uppercase tracking-wider transition-colors">Commandes & Sanctions</button>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-black/50 p-1 rounded-xl mt-4 xl:mt-0">
          <button onClick={() => setGlobalEnabled(false)} className={`px-6 py-2 font-bold rounded-lg text-sm uppercase tracking-wider transition-colors ${!globalEnabled ? "bg-red-950 text-red-500" : "text-zinc-500 hover:text-white"}`}>Désactivé</button>
          <button onClick={() => setGlobalEnabled(true)} className={`px-6 py-2 font-bold rounded-lg text-sm uppercase tracking-wider transition-colors ${globalEnabled ? "bg-white text-black" : "text-zinc-500 hover:text-white"}`}>Activé</button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
        {modules.map((mod) => (
          <div key={mod.id} className="bg-[#111] border border-red-900/20 rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden group hover:border-red-500/50 transition-all duration-300">
            <div className={`absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-opacity ${mod.enabled ? 'opacity-100' : 'opacity-0'}`}></div>
            
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-950/40 rounded-xl border border-red-900/50">
                    {mod.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg tracking-wide">{mod.title}</h3>
                    {mod.badge && <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider">{mod.badge}</span>}
                  </div>
                </div>
                
                <button 
                  onClick={() => toggleModule(mod.id)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${mod.enabled ? 'bg-red-600' : 'bg-zinc-800'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${mod.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <p className="text-zinc-400 text-sm mb-8">
                {mod.desc}
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-white/5 pt-4 z-10 relative">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Sanction</span>
              <div className="flex items-center gap-2">
                <select 
                  value={mod.sanction}
                  onChange={(e) => changeSanction(mod.id, e.target.value)}
                  className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-white outline-none cursor-pointer hover:border-red-500/50 transition-colors"
                >
                  <option value="Avertissement">⚠️ Avertissement</option>
                  <option value="Suppression">🗑️ Suppression</option>
                  <option value="Mute">🔇 Mute</option>
                  <option value="Kick">👢 Kick</option>
                  <option value="Ban">🔨 Ban</option>
                </select>
                <button className="p-2 bg-[#1a1a1a] border border-white/10 rounded-lg hover:border-red-500/50 text-zinc-400 hover:text-white transition-colors">
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

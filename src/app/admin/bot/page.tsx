"use client";

import { useState } from "react";
import { Zap, Link, MessageSquareOff, Type, Smile, AtSign, Image as ImageIcon, Ghost, ShieldAlert, Settings, Eye } from "lucide-react";

export default function BotModerationPage() {
  const [modules, setModules] = useState([
    { id: "anti_spam", title: "Anti-Spam", icon: <Zap className="w-5 h-5 text-purple-400" />, desc: "Contrôle la vélocité des messages pour bloquer le flood.", badge: "5 msgs / 5s", enabled: true, sanction: "Avertissement" },
    { id: "anti_links", title: "Liens Bannis", icon: <Link className="w-5 h-5 text-purple-400" />, desc: "Bloque les invitations Discord et URLs non autorisées.", badge: "", enabled: true, sanction: "Suppression" },
    { id: "bad_words", title: "Mots Bannis", icon: <MessageSquareOff className="w-5 h-5 text-purple-400" />, desc: "Dictionnaire de mots et expressions interdits.", badge: "0 mots dans le dictionnaire", enabled: true, sanction: "Suppression" },
    { id: "caps_spam", title: "Spam Majuscules", icon: <Type className="w-5 h-5 text-purple-400" />, desc: "Détecte les messages écrits majoritairement en MAJUSCULES.", badge: "70% / Longueur minimale 10", enabled: true, sanction: "Avertissement" },
    { id: "emoji_spam", title: "Spam d'Emojis", icon: <Smile className="w-5 h-5 text-purple-400" />, desc: "Limite le nombre d'emojis autorisés par message.", badge: "max 10 emojis", enabled: true, sanction: "Avertissement" },
    { id: "mention_spam", title: "Anti-Spam Mentions", icon: <AtSign className="w-5 h-5 text-purple-400" />, desc: "Empêche les membres de mentionner trop d'utilisateurs ou de rôles.", badge: "max 5 pings", enabled: true, sanction: "Avertissement" },
    { id: "image_spam", title: "Images / GIFs", icon: <ImageIcon className="w-5 h-5 text-purple-400" />, desc: "Filtre les images et GIFs indésirables.", badge: "max 5 / 60s", enabled: true, sanction: "Avertissement" },
    { id: "ghost_ping", title: "Anti-Ghost Ping", icon: <Ghost className="w-5 h-5 text-purple-400" />, desc: "Détecte et supprime les pings fantômes lorsque des mentions sont envoyées puis retirées.", badge: "Avertissement", enabled: true, sanction: "Avertissement" },
    { id: "anti_dox", title: "Anti-Dox", icon: <ShieldAlert className="w-5 h-5 text-purple-400" />, desc: "Bloque la divulgation d'informations sensibles (IP, numéros de téléphone).", badge: "IP · Email · Tel", enabled: true, sanction: "Ban" }
  ]);

  const [globalEnabled, setGlobalEnabled] = useState(true);

  const toggleModule = (id: string) => {
    setModules(modules.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m));
  };

  const changeSanction = (id: string, newSanction: string) => {
    setModules(modules.map(m => m.id === id ? { ...m, sanction: newSanction } : m));
  };

  return (
    <div className="space-y-12 bg-[#050505] min-h-screen text-white p-6 md:p-10 font-sans relative overflow-hidden">
      
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Header Bar */}
      <div className="relative flex flex-col xl:flex-row items-center justify-between bg-black/60 backdrop-blur-xl border border-purple-500/20 rounded-[2rem] p-4 shadow-2xl">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 text-purple-400 font-black tracking-[0.2em] uppercase px-6">
            <Eye className="w-7 h-7 animate-pulse" />
            <span className="bg-gradient-to-r from-white to-purple-400 bg-clip-text text-transparent">PARANOIA BOT</span>
          </div>
          <div className="hidden lg:flex bg-black/80 rounded-2xl p-1.5 border border-white/5">
            <button className="px-8 py-2.5 bg-white text-purple-900 font-black rounded-xl text-[11px] uppercase tracking-widest shadow-[0_0_20px_rgba(168,85,247,0.3)]">Filtres</button>
            <button className="px-8 py-2.5 text-zinc-500 hover:text-white font-bold rounded-xl text-[11px] uppercase tracking-widest transition-colors">Escalade</button>
            <button className="px-8 py-2.5 text-zinc-500 hover:text-white font-bold rounded-xl text-[11px] uppercase tracking-widest transition-colors">Sanctions</button>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-black/80 p-1.5 rounded-2xl mt-4 xl:mt-0 border border-white/5">
          <button onClick={() => setGlobalEnabled(false)} className={`px-8 py-2.5 font-black rounded-xl text-[11px] uppercase tracking-widest transition-all ${!globalEnabled ? "bg-red-950/50 text-red-500 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]" : "text-zinc-600 hover:text-zinc-300"}`}>Désactivé</button>
          <button onClick={() => setGlobalEnabled(true)} className={`px-8 py-2.5 font-black rounded-xl text-[11px] uppercase tracking-widest transition-all ${globalEnabled ? "bg-purple-600 text-white border border-purple-400/50 shadow-[0_0_20px_rgba(147,51,234,0.4)]" : "text-zinc-600 hover:text-zinc-300"}`}>Activé</button>
        </div>
      </div>

      {/* Grid */}
      <div className="relative grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
        {modules.map((mod) => (
          <div key={mod.id} className="bg-black/40 backdrop-blur-md border border-purple-900/30 rounded-[2rem] p-8 flex flex-col justify-between relative overflow-hidden group hover:border-purple-500/50 transition-all duration-500 hover:shadow-[0_0_40px_rgba(147,51,234,0.1)]">
            
            {/* Glow effect behind icon */}
            <div className={`absolute top-0 right-0 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl -mr-16 -mt-16 transition-opacity duration-700 ${mod.enabled ? 'opacity-100' : 'opacity-0'}`}></div>
            
            <div>
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-5">
                  <div className={`p-4 rounded-2xl border transition-colors duration-500 ${mod.enabled ? 'bg-purple-950/40 border-purple-500/30' : 'bg-zinc-900/50 border-zinc-800'}`}>
                    <div className={`transition-all duration-500 ${mod.enabled ? 'scale-110 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]' : 'grayscale opacity-50 scale-100'}`}>
                      {mod.icon}
                    </div>
                  </div>
                  <div>
                    <h3 className={`font-black text-xl tracking-tight transition-colors ${mod.enabled ? 'text-white' : 'text-zinc-500'}`}>{mod.title}</h3>
                    {mod.badge && <span className={`text-[9px] font-black uppercase tracking-[0.2em] transition-colors ${mod.enabled ? 'text-purple-400' : 'text-zinc-700'}`}>{mod.badge}</span>}
                  </div>
                </div>
                
                {/* Custom Animated Switch */}
                <button 
                  onClick={() => toggleModule(mod.id)}
                  className={`relative inline-flex h-7 w-14 items-center rounded-full transition-all duration-300 ease-in-out border ${mod.enabled ? 'bg-purple-600 border-purple-400 shadow-[0_0_15px_rgba(147,51,234,0.5)]' : 'bg-[#0f0f0f] border-zinc-800'}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-all duration-300 ease-in-out shadow-lg ${mod.enabled ? 'translate-x-8 scale-100' : 'translate-x-1 scale-90 opacity-60'}`} />
                </button>
              </div>

              <p className={`text-sm mb-10 leading-relaxed transition-colors ${mod.enabled ? 'text-zinc-400' : 'text-zinc-700'}`}>
                {mod.desc}
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-white/5 pt-6 z-10 relative">
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${mod.enabled ? 'text-zinc-500' : 'text-zinc-800'}`}>Sanction</span>
              <div className="flex items-center gap-3">
                <select 
                  value={mod.sanction}
                  onChange={(e) => changeSanction(mod.id, e.target.value)}
                  disabled={!mod.enabled}
                  className="bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-[11px] font-bold text-white outline-none cursor-pointer hover:border-purple-500/50 transition-colors focus:ring-2 focus:ring-purple-500/20 disabled:opacity-30"
                >
                  <option value="Avertissement">⚠️ Avertissement</option>
                  <option value="Suppression">🗑️ Suppression</option>
                  <option value="Mute">🔇 Mute</option>
                  <option value="Kick">👢 Kick</option>
                  <option value="Ban">🔨 Ban</option>
                </select>
                <button disabled={!mod.enabled} className="p-2.5 bg-black/50 border border-white/10 rounded-xl hover:border-purple-500/50 text-zinc-400 hover:text-white transition-colors disabled:opacity-30 group">
                  <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

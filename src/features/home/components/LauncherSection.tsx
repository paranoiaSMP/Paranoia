"use client";

import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Shirt,
  Box,
  Layers,
  Settings,
  ShoppingBag,
  Menu,
  Newspaper,
  Play,
  Pickaxe,
  Terminal,
  Plus,
  Minus,
  Square,
  X
} from 'lucide-react';

export default function LauncherSection() {
  return (
    <section className="relative max-w-6xl mx-auto px-4 sm:px-6 mt-16 sm:mt-24 mb-24">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-white/10 mb-6">
        <h2 className="font-outfit text-2xl sm:text-4xl font-black text-white tracking-tight">
          PARANOIA <span className="text-[#b366ff]">Launcher</span>
        </h2>
        <span className="font-mono text-xs font-bold tracking-wider text-amber-400 px-2.5 py-1 border border-amber-500/30 rounded-md bg-amber-500/5">
          EN DÉVELOPPEMENT
        </span>
      </div>

      <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0b0a12] shadow-[0_25px_50px_rgba(0,0,0,0.7)]">
        <div className="flex items-center gap-2 px-3.5 py-2 bg-[#0a0a0f] border-b border-white/5">
          <span className="w-4 h-4 rounded bg-[#7a0aad] flex items-center justify-center text-[9px] font-black text-white">
            P
          </span>
          <span className="text-xs text-zinc-300 font-medium font-sans">Paranoia Client</span>
          <div className="ml-auto flex items-center gap-3.5 text-zinc-400">
            <Minus className="w-3.5 h-3.5 cursor-pointer hover:text-white" />
            <Square className="w-3 h-3 cursor-pointer hover:text-white" />
            <X className="w-3.5 h-3.5 cursor-pointer hover:text-rose-400" />
          </div>
        </div>

        <div className="p-4 sm:p-6 bg-[radial-gradient(ellipse_90%_70%_at_50%_0%,_rgba(122,10,173,0.3),_transparent_65%),_#0a0910]">
          <div className="flex items-center gap-2 p-2 rounded-2xl bg-[#14141e]/70 border border-white/5 mb-5 flex-wrap">
            <ChevronLeft className="w-4 h-4 text-slate-400 shrink-0 cursor-pointer" />
            <div className="flex gap-2 flex-wrap flex-1 min-w-0">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#151520] border border-white/5 text-xs font-semibold text-slate-200">
                <Shirt className="w-3.5 h-3.5 text-purple-400" /> Cosmétiques...
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#151520] border border-white/5 text-xs font-semibold text-slate-200">
                <Box className="w-3.5 h-3.5 text-purple-400" /> Mods
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                  47
                </span>
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#151520] border border-white/5 text-xs font-semibold text-slate-200">
                <Layers className="w-3.5 h-3.5 text-purple-400" /> Instances
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                  12
                </span>
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#151520] border border-white/5 text-xs font-semibold text-slate-200">
                <Settings className="w-3.5 h-3.5 text-purple-400" /> Paramètres
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400 self-center shrink-0 cursor-pointer" />
            </div>
            <div className="flex items-center gap-2.5 ml-auto shrink-0">
              <span className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#2a1a3e] border border-purple-500/35 text-xs font-extrabold text-white">
                <ShoppingBag className="w-3.5 h-3.5 text-purple-400" /> BOUTIQUE
              </span>
              <span className="w-9 h-8 rounded-lg bg-[#b366ff] flex items-center justify-center text-[#1a0a24]">
                <Menu className="w-4 h-4 text-black font-bold" />
              </span>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-5 items-stretch">
            <div className="flex-1 flex flex-col gap-3.5">
              <div className="flex gap-1.5 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
              </div>

              <div className="rounded-xl bg-[#14141e]/80 border border-purple-500/20 p-4">
                <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold tracking-wider text-purple-400 mb-1.5">
                  <Newspaper className="w-3.5 h-3.5" /> ACTUALITÉS
                </span>
                <h3 className="font-outfit text-base font-extrabold text-white mb-1">
                  Saison 3 · Les cartes mythiques
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Nouvelle édition de cartes, deux boosters inédits et le retour des événements du samedi soir.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-auto">
                <div className="rounded-xl bg-gradient-to-b from-[#181826] to-[#101018] border border-white/5 p-2.5 flex flex-col justify-end min-h-[96px]">
                  <span className="text-xs font-bold text-white truncate">Lunar - PVP MAIN</span>
                  <span className="text-[11px] text-slate-400 mt-0.5 mb-1.5">fabric</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-zinc-300 self-start">
                    1.21.1
                  </span>
                </div>

                <div className="rounded-xl bg-gradient-to-b from-[#181826] to-[#101018] border border-white/5 p-2.5 flex flex-col justify-end min-h-[96px]">
                  <span className="text-xs font-bold text-white truncate">Survie</span>
                  <span className="text-[11px] text-slate-400 mt-0.5 mb-1.5">fabric</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-zinc-300 self-start">
                    1.21.1
                  </span>
                </div>

                <div className="rounded-xl bg-gradient-to-b from-[#7a1fa2]/60 to-[#1e0a2d]/90 border border-[#b366ff] p-2.5 flex flex-col justify-end min-h-[96px] shadow-[0_0_20px_rgba(179,102,255,0.25)]">
                  <span className="text-xs font-bold text-white">MAIN</span>
                  <span className="text-[11px] text-purple-300 mt-0.5 mb-1.5">pvp</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-purple-500/25 border border-purple-500/50 text-purple-200 self-start">
                    1.21.1
                  </span>
                </div>

                <div className="rounded-xl bg-[#101018] border border-dashed border-purple-500/40 min-h-[96px] flex items-center justify-center text-purple-400 hover:text-white cursor-pointer transition-colors">
                  <Plus className="w-5 h-5" />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                <button
                  disabled
                  className="flex-1 min-w-[160px] h-12 rounded-full bg-gradient-to-r from-[#b366ff] to-[#9333ea] flex items-center justify-center gap-2 font-outfit font-black text-sm tracking-wider text-[#1a0a24] cursor-not-allowed opacity-90"
                >
                  <Play className="w-4 h-4 fill-current" /> JOUER
                </button>
                <div className="w-12 h-12 rounded-xl bg-[#151520] border border-white/5 flex flex-col items-center justify-center gap-0.5 text-slate-400 shrink-0">
                  <Pickaxe className="w-3.5 h-3.5" />
                  <span className="font-mono text-[9px]">47</span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-[#151520] border border-white/5 flex flex-col items-center justify-center gap-0.5 text-slate-400 shrink-0">
                  <Terminal className="w-3.5 h-3.5" />
                  <span className="font-mono text-[9px]">Logs</span>
                </div>
              </div>
            </div>

            <div className="w-full lg:w-64 rounded-xl bg-gradient-to-b from-[#0e0d16] to-[#080710] border border-white/5 flex flex-col items-center justify-center gap-3 p-5 min-h-[300px] relative overflow-hidden shrink-0">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,_rgba(122,10,173,0.25),_transparent_65%)] pointer-events-none" />
              <img
                src="https://vzge.me/full/512/Leoo955.png"
                alt="Skin Leoo955"
                className="relative max-w-[140px] sm:max-w-[160px] w-full h-auto object-contain image-rendering-pixelated drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)] z-10"
              />
              <div className="relative text-center z-10">
                <span className="block font-outfit text-base font-black text-white">Leoo955</span>
                <span className="font-mono text-[11px] text-slate-400">skin · cape saison 3</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";
import { Layers, Dice5, Download, ShieldCheck, Database, Cpu } from "lucide-react";
import { siteConfig } from "@/config/site";

export default function HomePage() {
  return (
    <div className="relative min-h-[85vh] flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12 max-w-6xl mx-auto text-center">
      {/* Badge statut de l'environnement */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-mono font-semibold mb-8">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        Environnement Propre · Paranoia v2.0
      </div>

      {/* Titre principal */}
      <h1 className="font-outfit text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tight uppercase mb-4 text-balance">
        Paranoia <span className="text-[#b366ff] drop-shadow-[0_0_25px_rgba(179,102,255,0.4)]">Studio</span>
      </h1>

      <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto mb-12 leading-relaxed font-medium text-balance">
        Plateforme autonome dédiée aux cartes à collectionner TCG et aux mini-jeux de l'univers Paranoia.
      </p>

      {/* Grille des 3 piliers à construire */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left mb-14">
        {/* Pilier 1 : TCG Cartes */}
        <div className="rounded-2xl border-2 border-white/10 bg-[#12111a] p-6 hover:border-purple-500/50 transition-colors flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4">
              <Layers className="w-6 h-6" />
            </div>
            <h2 className="font-outfit text-xl font-bold text-white mb-2">Cartes TCG</h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              Moteur d'affichage 3D multi-calques, brillance holographique et ouverture de boosters.
            </p>
          </div>
          <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono text-purple-400 font-bold">
            <span>Raretés : Commune à Mythique</span>
            <span>0.2%</span>
          </div>
        </div>

        {/* Pilier 2 : Mini-Jeux */}
        <div className="rounded-2xl border-2 border-white/10 bg-[#12111a] p-6 hover:border-purple-500/50 transition-colors flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4">
              <Dice5 className="w-6 h-6" />
            </div>
            <h2 className="font-outfit text-xl font-bold text-white mb-2">Salle des Jeux</h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              4 mini-jeux autonomes alimentés par la monnaie virtuelle : Mines, Crash, Roulette et Blackjack.
            </p>
          </div>
          <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono text-indigo-400 font-bold">
            <span>Moteur SSE & API Next.js</span>
            <span>Temps réel</span>
          </div>
        </div>

        {/* Pilier 3 : Autonomie & Sécurité */}
        <div className="rounded-2xl border-2 border-white/10 bg-[#12111a] p-6 hover:border-purple-500/50 transition-colors flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="font-outfit text-xl font-bold text-white mb-2">100% Autonome</h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              Liaison directe via l'API officielle Mojang sans serveur de jeu en ligne requis.
            </p>
          </div>
          <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono text-emerald-400 font-bold">
            <span>Base PostgreSQL</span>
            <span>Docker Natif</span>
          </div>
        </div>
      </div>

      {/* Indicateurs techniques */}
      <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-mono text-slate-400">
        <span className="flex items-center gap-2">
          <Database className="w-4 h-4 text-purple-400" /> PostgreSQL 15
        </span>
        <span className="text-white/20">·</span>
        <span className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-indigo-400" /> Next.js 16 (App Router)
        </span>
        <span className="text-white/20">·</span>
        <span className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" /> Anti-Slop Actif
        </span>
      </div>
    </div>
  );
}

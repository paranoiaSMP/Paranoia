import React from 'react';
import { BoldGradient, GlowText, EasyBox, EasyBadge } from "@/components/easy-tags";
import { Download, Rocket, Shield, Zap } from "lucide-react";

export default function LauncherPage() {
  return (
    <div className="min-h-screen pt-24 pb-12 px-4 relative overflow-hidden flex flex-col items-center justify-center">
      {/* Effets de fond */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--color-accent-purple,#9d0df2)]/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="text-center mb-12 relative z-10 max-w-3xl">
        
        <h1 className="text-3xl md:text-7xl font-bold mb-6">
          Le  <BoldGradient> PARANOIA SMP</BoldGradient> Launcher.
        </h1>
        
        <p className="text-xl text-[var(--muted-text)] mb-8 leading-relaxed">
          Téléchargez et lancez Paranoia SMP en toute simplicité. Profitez d'une expérience optimisée, sécurisée et prête à jouer, avec une liberté totale.
        </p>
        
        <div className="relative inline-block group">
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-accent-purple)] to-fuchsia-500 rounded-xl blur-xl opacity-30 group-hover:opacity-70 transition-opacity duration-500"></div>
          <button className="relative flex items-center gap-3 px-6 md:px-8 py-3 md:py-4 bg-[var(--surface-bg)] border-2 border-[var(--card-border)] rounded-xl text-lg md:text-xl font-bold text-[var(--muted-text)] cursor-not-allowed overflow-hidden shadow-lg">
            <Download className="w-5 h-5 md:w-6 md:h-6" />
            <span>Télécharger (Bientôt)</span>
          </button>
        </div>
      </div>

      {/* Avantages */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full relative z-10">
        <EasyBox className="flex flex-col items-center text-center group card-hover">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-accent-purple)]/10 border border-[var(--color-accent-purple)]/30 flex items-center justify-center mb-6 text-[var(--color-accent-purple)] group-hover:scale-110 transition-transform">
            <Zap className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold mb-3"><GlowText color="var(--accent-purple)">Ultra Rapide</GlowText></h2>
          <p className="text-[var(--muted-text)]">Téléchargement optimisé des mods et lancement instantané du jeu.</p>
        </EasyBox>

        <EasyBox className="flex flex-col items-center text-center group card-hover">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mb-6 text-indigo-400 group-hover:scale-110 transition-transform">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold mb-3"><GlowText color="#818cf8">100% Sécurisé</GlowText></h2>
          <p className="text-[var(--muted-text)]">Connexion directe et sécurisée avec votre compte Microsoft officiel.</p>
        </EasyBox>

        <EasyBox className="flex flex-col items-center text-center group card-hover">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-6 text-emerald-400 group-hover:scale-110 transition-transform">
            <Rocket className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold mb-3"><GlowText color="#34d399">Prêt à jouer</GlowText></h2>
          <p className="text-[var(--muted-text)]">Aucune configuration requise. Tout est géré pour vous automatiquement.</p>
        </EasyBox>
      </div>
    </div>
  );
}

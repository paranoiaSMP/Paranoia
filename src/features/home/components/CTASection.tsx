import React from 'react';
import Link from 'next/link';
import { Download, Monitor, Zap, Settings, ShieldCheck, Hammer, Cog, Calendar, Sparkles, Terminal, Cpu, Play } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CTASection() {
  return (
    <section className="relative z-10 max-w-6xl mx-auto px-6 mt-16 mb-20">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="relative rounded-3xl overflow-hidden flex flex-col md:flex-row items-stretch border-4 shadow-2xl"
        style={{ backgroundColor: 'var(--surface-bg)', borderColor: 'var(--card-border)' }}
      >
        {/* Subtle noise texture */}
        <div className="absolute inset-0 bg-noise opacity-20 pointer-events-none"></div>
        
        {/* Text Content */}
        <div className="relative z-10 p-12 md:p-16 flex-1 text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6 border-2 shadow-sm" style={{ backgroundColor: 'var(--feature-purple-bg)', borderColor: 'var(--feature-purple-border)', color: 'var(--feature-purple-text)' }}>
            <Sparkles className="w-3.5 h-3.5" /> En cours de développement - v1.0
          </div>
          
          <h2 className="text-3xl sm:text-4xl md:text-6xl font-outfit font-black mb-6 text-balance" style={{ color: 'var(--text-color)' }}>
            PARANOIA <span style={{ color: 'var(--logo-end)' }}>Launcher</span>
          </h2>
          
          <p className="text-base sm:text-lg mb-8 font-inter max-w-md leading-relaxed text-balance" style={{ color: 'var(--nav-item-color)' }}>
            Profitez d'une expérience de jeu fluide et sans compromis. Notre launcher personnalisé vous permet de rejoindre le serveur instantanément avec des performances maximales, sans aucune configuration préalable.
          </p>
          
          <ul className="flex flex-col gap-4 mb-10 font-inter">
            <li className="flex items-center gap-3 font-medium" style={{ color: 'var(--text-color)' }}>
              <div className="p-1 rounded-md" style={{ backgroundColor: 'var(--feature-emerald-bg)' }}>
                <Zap className="w-4 h-4" style={{ color: 'var(--feature-emerald-text)' }} />
              </div>
              Lancement ultra-rapide
            </li>
            <li className="flex items-center gap-3 font-medium" style={{ color: 'var(--text-color)' }}>
              <div className="p-1 rounded-md" style={{ backgroundColor: 'var(--feature-purple-bg)' }}>
                <Settings className="w-4 h-4" style={{ color: 'var(--feature-purple-text)' }} />
              </div>
              Optimisation native des FPS
            </li>
            <li className="flex items-center gap-3 font-medium" style={{ color: 'var(--text-color)' }}>
              <div className="p-1 rounded-md" style={{ backgroundColor: 'var(--feature-amber-bg)' }}>
                <ShieldCheck className="w-4 h-4" style={{ color: 'var(--feature-amber-text)' }} />
              </div>
              Installation automatique des ressources
            </li>
            <li className="flex items-center gap-3 font-medium" style={{ color: 'var(--text-color)' }}>
              <div className="p-1 rounded-md" style={{ backgroundColor: 'var(--feature-purple-bg)' }}>
                <Calendar className="w-4 h-4" style={{ color: 'var(--feature-purple-text)' }} />
              </div>
              Accès direct aux événements en jeu
            </li>
          </ul>
          
          <div className="flex flex-col sm:flex-row items-start gap-4">
            {/* Disabled Coming Soon Button */}
            <div className="btn-neo-secondary cursor-not-allowed opacity-70 pointer-events-none">
              <Monitor className="w-5 h-5" />
              Bientôt Disponible
            </div>
          </div>
        </div>
        
        {/* Visual Content (Stylized Futuristic Launcher Preview) */}
        <div className="relative w-full md:w-2/5 min-h-[350px] flex items-stretch border-t-4 md:border-t-0 md:border-l-4 overflow-hidden" style={{ backgroundColor: 'var(--navbar-bg)', borderColor: 'var(--card-border)' }}>
          {/* Ambient Purple Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full blur-[80px] opacity-30 bg-[var(--color-accent-purple,#9d0df2)] pointer-events-none"></div>
          <div className="absolute inset-0 bg-noise opacity-30 pointer-events-none"></div>
          
          <div className="relative flex-1 flex items-center justify-center p-4 sm:p-8">
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="relative z-10 w-full max-w-[280px] rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-between border-2 shadow-2xl backdrop-blur-xl bg-[#14141c]/90 text-white border-purple-500/30 overflow-hidden"
            >
              {/* Top Bar Decoration */}
              <div className="w-full flex items-center justify-between pb-3 mb-4 border-b border-purple-500/20 text-xs text-purple-300 font-mono">
                <span className="flex items-center gap-1.5 font-bold">
                  <Terminal className="w-3.5 h-3.5 text-purple-400" /> PARANOIA_CLIENT_v1
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              </div>

              {/* Center Logo & Status */}
              <div className="my-4 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7a0aad] to-[#d946ef] flex items-center justify-center shadow-lg shadow-purple-500/30 mb-4 border border-white/20">
                  <Play className="w-8 h-8 text-white translate-x-0.5" />
                </div>
                <h4 className="font-outfit font-black text-xl tracking-tight text-white mb-1">
                  PARANOIA <span className="text-fuchsia-400">SMP</span>
                </h4>
                <span className="text-[11px] uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-500/30 font-semibold">
                  Moteur Optimisé • 60+ FPS
                </span>
              </div>

              {/* Bottom Simulated Progress / Readiness */}
              <div className="w-full mt-4 pt-3 border-t border-purple-500/20">
                <div className="flex justify-between text-[11px] text-purple-300 font-medium mb-1.5">
                  <span>État du serveur</span>
                  <span className="text-emerald-400 font-bold">Prête au déploiement</span>
                </div>
                <div className="w-full h-1.5 bg-purple-950 rounded-full overflow-hidden">
                  <div className="w-4/5 h-full bg-gradient-to-r from-[#7a0aad] to-[#d946ef] rounded-full"></div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

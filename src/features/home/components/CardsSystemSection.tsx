import React from 'react';
import Link from 'next/link';
import { Layers, Sparkles, ArrowRight, Award, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';

export default function CardsSystemSection() {
  return (
    <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 mt-16 mb-24 lg:mb-32">
      <div className="flex flex-col lg:flex-row items-center gap-16">
        
        {/* Left Side: Text Content */}
        <div className="flex-1 text-center sm:text-left flex flex-col items-center sm:items-start">
          <div className="inline-flex items-center gap-2 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-4 sm:mb-6 border-2" style={{ backgroundColor: 'var(--feature-purple-bg)', borderColor: 'var(--feature-purple-border)', color: 'var(--feature-purple-text)' }}>
            <Sparkles className="w-3 h-3" /> Exclusivité Paranoia
          </div>
          
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-outfit font-black mb-4 sm:mb-6 leading-tight text-balance" style={{ color: 'var(--text-color)' }}>
            Collectionne.<br />
            Échange.<br />
            <span style={{ color: 'var(--logo-end)' }}>Domine.</span>
          </h2>
          
          <p className="text-sm sm:text-lg md:text-xl mb-6 sm:mb-8 font-inter max-w-xl leading-relaxed text-balance px-2 sm:px-0" style={{ color: 'var(--nav-item-color)' }}>
            Découvrez un système de cartes à collectionner intégré directement dans le jeu. Ouvrez des boosters, obtenez des cartes de différentes raretés et profitez d'avantages uniques.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 mb-8 sm:mb-10 w-full text-left">
            <div className="p-3 sm:p-5 rounded-2xl border-2 flex flex-col gap-1.5 sm:gap-2 shadow-lg transition-transform hover:-translate-y-1" style={{ backgroundColor: 'var(--feature-purple-bg)', borderColor: 'var(--feature-purple-border)' }}>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  <Award className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h4 className="font-outfit font-black text-lg sm:text-xl" style={{ color: 'var(--text-color)' }}>4 Raretés</h4>
              </div>
              <p className="font-inter text-xs sm:text-sm font-medium leading-relaxed" style={{ color: 'var(--nav-item-color)' }}>De Standard à Légendaire, chaque carte possède un taux de drop unique.</p>
            </div>
            <div className="p-3 sm:p-5 rounded-2xl border-2 flex flex-col gap-1.5 sm:gap-2 shadow-lg transition-transform hover:-translate-y-1" style={{ backgroundColor: 'var(--feature-emerald-bg)', borderColor: 'var(--feature-emerald-border)' }}>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Zap className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h4 className="font-outfit font-black text-lg sm:text-xl" style={{ color: 'var(--text-color)' }}>Avantages</h4>
              </div>
              <p className="font-inter text-xs sm:text-sm font-medium leading-relaxed" style={{ color: 'var(--nav-item-color)' }}>Débloquez des bonus en jeu, des titres de prestige et des cosmétiques.</p>
            </div>
          </div>
          
          <Link href="/cards" className="btn-neo-secondary flex justify-center items-center w-full sm:w-auto group mt-2 sm:mt-4">
            <Layers className="w-5 h-5 mr-2" style={{ color: 'var(--logo-end)' }} />
            Découvrir les boosters
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        
        {/* Right Side: Visual / Floating Boosters */}
        <div className="flex-1 w-full relative h-[250px] sm:h-[450px] lg:h-[600px] flex items-center justify-center mt-12 sm:mt-16 lg:mt-0">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-noise opacity-30 rounded-full blur-3xl mix-blend-overlay"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 sm:w-64 h-48 sm:h-64 rounded-full blur-[100px] opacity-40 pointer-events-none" style={{ backgroundColor: 'var(--logo-end)' }}></div>
          
          {/* Floating Booster 1 (Legendary) */}
          <motion.div 
            animate={{ y: [-10, 10, -10], rotateZ: [-2, 2, -2] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute z-20 drop-shadow-2xl w-[90px] sm:w-[200px] lg:w-[280px]"
          >
            <Image 
              src="/LegendaireB.png" 
              alt="Booster Légendaire" 
              width={280} 
              height={380} 
              className="object-contain w-full h-auto"
              sizes="(max-width: 640px) 90px, (max-width: 1024px) 200px, 280px"
            />
          </motion.div>
          
          {/* Floating Booster 2 (Standard) */}
          <motion.div 
            animate={{ y: [10, -10, 10], rotateZ: [5, 1, 5] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute z-10 -ml-16 sm:-ml-24 lg:-ml-40 -mt-6 sm:-mt-10 lg:-mt-20 opacity-90 drop-shadow-xl w-[60px] sm:w-[140px] lg:w-[200px]"
          >
            <Image 
              src="/StandardB.png" 
              alt="Booster Standard" 
              width={200} 
              height={280} 
              className="object-contain filter blur-[1px] w-full h-auto"
              sizes="(max-width: 640px) 60px, (max-width: 1024px) 140px, 200px"
            />
          </motion.div>
          
          {/* Floating Booster 3 (Mythic) */}
          <motion.div 
            animate={{ y: [-5, 15, -5], rotateZ: [-6, -2, -6] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute z-30 ml-20 sm:ml-28 lg:ml-48 mt-12 sm:mt-16 lg:mt-32 opacity-95 drop-shadow-2xl w-[70px] sm:w-[160px] lg:w-[220px]"
          >
            <Image 
              src="/MythiqueB.png" 
              alt="Booster Mythique" 
              width={220} 
              height={300} 
              className="object-contain w-full h-auto"
              sizes="(max-width: 640px) 70px, (max-width: 1024px) 160px, 220px"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

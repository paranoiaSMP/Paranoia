import React from 'react';
import Link from 'next/link';
import { Layers } from 'lucide-react';
import { motion } from 'framer-motion';

export default function HeroSection() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] } }
  };

  return (
    <section className="relative z-10 flex flex-col items-center justify-center min-h-[90vh] text-center px-4 pt-20">
      {/* Ambient background glowing orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-gradient-to-tr from-[#7a0aad]/20 to-[#d946ef]/15 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="absolute top-2/3 left-1/4 w-[300px] h-[300px] bg-[#9d0df2]/10 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="absolute top-1/3 right-1/4 w-[250px] h-[250px] bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none -z-10"></div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-4xl mx-auto relative z-10"
      >
        <motion.h1 variants={itemVariants} className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-outfit font-black mb-6 tracking-tight leading-[1.1] text-balance" style={{ color: 'var(--text-color)' }}>
          Bienvenue sur le <span style={{ color: 'var(--logo-end)' }}>Paranoia SMP</span>
        </motion.h1>
        
        <motion.p variants={itemVariants} className="text-lg sm:text-xl md:text-2xl max-w-2xl mx-auto mb-10 leading-relaxed font-inter font-medium text-balance px-2" style={{ color: 'var(--nav-item-color)' }}>
          Venez découvrir l'univers du Paranoia SMP. 
          Faites vous des Amis ou collectionnez des boosters.
        </motion.p>
        
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 mt-8 w-full sm:w-auto px-1 sm:px-0">
          <a href="https://discord.gg/paranoiasmp" target="_blank" rel="noopener noreferrer" className="btn-neo-primary group flex justify-center w-full sm:w-auto">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="group-hover:scale-110 transition-transform"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
            Rejoindre le Discord
          </a>

          <Link href="/cards" className="btn-neo-secondary group flex justify-center w-full sm:w-auto">
             <Layers className="w-5 h-5 group-hover:-rotate-12 transition-transform" style={{ color: 'var(--logo-end)' }} />
             Découvrir les Boosters
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}

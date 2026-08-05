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
    <section className="relative z-10 flex flex-col items-center justify-center min-h-[90vh] text-center px-4 pt-20 overflow-hidden">
      {/* Ambient background glowing orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-[#7a0aad]/30 to-[#d946ef]/20 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse-slow"></div>
      <div className="absolute top-2/3 left-1/4 w-[400px] h-[400px] bg-[#9d0df2]/15 rounded-full blur-[100px] pointer-events-none -z-10"></div>
      <div className="absolute top-1/3 right-1/4 w-[350px] h-[350px] bg-fuchsia-600/15 rounded-full blur-[100px] pointer-events-none -z-10"></div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-4xl mx-auto relative z-10"
      >
        <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl lg:text-8xl font-outfit font-black mb-6 tracking-tight" style={{ color: 'var(--text-color)' }}>
          Bienvenue sur le <span style={{ color: 'var(--logo-end)' }}>Paranoia SMP</span>
        </motion.h1>
        
        <motion.p variants={itemVariants} className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-inter font-medium" style={{ color: 'var(--nav-item-color)' }}>
          Venez découvrir l'univers du Paranoia SMP. 
          Faites vous des Amis ou collectionnez des boosters.
        </motion.p>
        
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-8">
          {/* Main Action Button (Discord) - Asymmetrical, chunky, organic but PURPLE */}
          <Link href="https://discord.gg/kqP5wz3uM" target="_blank" className="group relative inline-block">
            <div className="absolute inset-0 rounded-xl translate-y-1.5 translate-x-1.5 transition-all duration-150" style={{ backgroundColor: 'var(--color-accent-purple-dark, #7a1fa2)' }}></div>
            <div className="relative flex items-center gap-3 px-8 py-4 rounded-xl font-outfit font-bold text-white text-lg border-2 transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:-translate-x-0.5 group-active:translate-y-1.5 group-active:translate-x-1.5" style={{ backgroundColor: 'var(--color-accent-purple, #b366ff)', borderColor: 'var(--color-accent-purple-dark, #7a1fa2)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
              </svg>
              Rejoindre le Discord
            </div>
          </Link>
          
          {/* Secondary Action (Cards) - Solid, blocky, adapting to light/dark */}
          <Link href="/cards" className="group relative inline-block">
             <div className="absolute inset-0 rounded-xl translate-y-1.5 translate-x-1.5 transition-all duration-150" style={{ backgroundColor: 'var(--card-border)' }}></div>
             <div className="relative flex items-center gap-2 px-8 py-4 rounded-xl font-outfit font-bold text-lg border-2 transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:-translate-x-0.5 group-active:translate-y-1.5 group-active:translate-x-1.5" style={{ backgroundColor: 'var(--btn-secondary-bg)', borderColor: 'var(--btn-secondary-border)', color: 'var(--text-color)' }}>
              <Layers className="w-5 h-5 group-hover:-rotate-12 transition-transform" /> 
              Découvrir les Boosters
            </div>
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BackgroundGradientAnimation = dynamic(
  () => import('@/components/ui/background-gradient-animation').then(m => m.BackgroundGradientAnimation),
  { ssr: false }
);

const FLIP_WORDS = ["SMP", "STUDIO", "TCG", "Launcher"];

export default function HeroSection() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % FLIP_WORDS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative z-10 flex flex-col items-center justify-center min-h-[85vh] text-center px-4 pt-20">
      <BackgroundGradientAnimation
        gradientBackgroundStart="var(--hero-grad-start)"
        gradientBackgroundEnd="var(--hero-grad-end)"
        firstColor="var(--hero-color-1)"
        secondColor="var(--hero-color-2)"
        thirdColor="var(--hero-color-3)"
        fourthColor="var(--hero-color-4)"
        fifthColor="var(--hero-color-5)"
        pointerColor="var(--hero-color-ptr)"
        containerClassName="absolute inset-0 -z-10 opacity-40 [mask-image:linear-gradient(to_bottom,transparent,white_10%,white_80%,transparent)]"
      />

      <div className="max-w-4xl mx-auto relative z-10">
        <h1 className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-outfit font-black mb-4 sm:mb-6 tracking-tight leading-[1.1] text-balance flex flex-col items-center justify-center sm:block" style={{ color: 'var(--text-color)' }}>
          Bienvenue sur Paranoia{" "}
          <span className="inline-grid [grid-template-areas:'stack'] overflow-visible pt-2 sm:pt-0" style={{ color: 'var(--logo-end)', perspective: '1000px' }}>
            <AnimatePresence mode="popLayout">
              <motion.span
                key={FLIP_WORDS[index]}
                className="[grid-area:stack] inline-block text-left origin-center"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
              >
                {FLIP_WORDS[index]}
              </motion.span>
            </AnimatePresence>
          </span>
        </h1>
        
        <p className="text-base sm:text-xl md:text-2xl max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed font-inter font-medium text-balance px-2" style={{ color: 'var(--nav-item-color)' }}>
          Venez découvrir l'univers du Paranoia SMP. 
          Faites vous des Amis ou collectionnez des boosters.
        </p>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 mt-6 w-full sm:w-auto px-1 sm:px-0">
          <a href="https://discord.gg/paranoiasmp" target="_blank" rel="noopener noreferrer" className="btn-neo-primary group flex justify-center w-full sm:w-auto">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="group-hover:scale-110 transition-transform"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
            Rejoindre le Discord
          </a>

          <Link href="/cards" className="btn-neo-secondary group flex justify-center w-full sm:w-auto">
             <Layers className="w-5 h-5 group-hover:-rotate-12 transition-transform" style={{ color: 'var(--logo-end)' }} />
             Découvrir les Boosters
          </Link>
        </div>
      </div>
    </section>
  );
}

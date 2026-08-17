"use client";

import { useState, useEffect } from "react";
import { GtaViPoster } from "@/components/ui/gta-vi-poster";
import { motion, AnimatePresence } from "framer-motion";

export default function SplashScreen({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // On vérifie si le splash screen a déjà été vu pendant cette session
    const hasSeenSplash = sessionStorage.getItem("hasSeenSplash");
    
    if (hasSeenSplash) {
      setShowSplash(false);
      return;
    }

    // Le poster dure environ 2.5s. On laisse l'écran pendant 3.2s pour l'effet.
    const timer = setTimeout(() => {
      setShowSplash(false);
      sessionStorage.setItem("hasSeenSplash", "true");
    }, 3200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <AnimatePresence>
        {showSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-black"
          >
            <GtaViPoster 
              duration={2.5}
              showReplay={false}
              background="var(--bg-color)"
            />
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </>
  );
}

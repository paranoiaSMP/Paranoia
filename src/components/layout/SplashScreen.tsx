"use client";

import { useState, useEffect } from "react";
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

    // Durée totale de l'animation Apple-style
    const timer = setTimeout(() => {
      setShowSplash(false);
      sessionStorage.setItem("hasSeenSplash", "true");
    }, 4200);

    return () => clearTimeout(timer);
  }, []);

  // Courbe de bézier très douce style Apple
  const ease = [0.16, 1, 0.3, 1];

  return (
    <>
      <AnimatePresence>
        {showSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, filter: "blur(10px)", scale: 1.05 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-black text-white"
          >
            {/* Conteneur principal qui scale légèrement vers le haut */}
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 3, ease }}
              className="flex flex-col items-center justify-center font-black font-outfit"
            >
              {/* PARANOIA avec effet de masque (overflow-hidden) */}
              <div className="overflow-hidden pb-4 px-4">
                <motion.h1
                  initial={{ y: 120, opacity: 0, filter: "blur(12px)" }}
                  animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                  transition={{ duration: 1.4, ease, delay: 0.3 }}
                  className="text-6xl md:text-8xl lg:text-[10rem] leading-none tracking-[0.15em] uppercase bg-clip-text text-transparent bg-gradient-to-b from-white to-neutral-400 drop-shadow-2xl"
                >
                  PARANOIA
                </motion.h1>
              </div>

              {/* STUDIO */}
              <div className="overflow-hidden mt-2 px-4">
                <motion.div
                  initial={{ y: 80, opacity: 0, filter: "blur(12px)" }}
                  animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                  transition={{ duration: 1.4, ease, delay: 0.9 }}
                >
                  <motion.h2
                    initial={{ color: "#ffffff", fontStyle: "normal", skewX: 0 }}
                    animate={{ color: "#a855f7", fontStyle: "italic" }}
                    transition={{ duration: 0.8, ease: "easeInOut", delay: 2.2 }}
                    className="text-3xl md:text-5xl lg:text-7xl leading-none tracking-[0.3em] uppercase drop-shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                  >
                    STUDIO
                  </motion.h2>
                </motion.div>
              </div>
            </motion.div>

            {/* Glow ambiant violet en bas de l'écran qui apparaît doucement */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ duration: 2.5, delay: 1.2, ease }}
              className="absolute bottom-[-20%] left-1/2 -translate-x-1/2 w-[70vw] h-[50vh] bg-purple-600/30 blur-[100px] rounded-full pointer-events-none"
            />
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </>
  );
}

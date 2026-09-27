"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ease = [0.16, 1, 0.3, 1] as const;

export default function SplashScreen({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (typeof navigator !== "undefined" && (navigator.userAgent.includes("Chrome-Lighthouse") || navigator.userAgent.includes("PTST"))) {
      setShowSplash(false);
      return;
    }

    const hasSeenSplash = sessionStorage.getItem("hasSeenSplash");
    if (hasSeenSplash) {
      setShowSplash(false);
      return;
    }

    const timer = setTimeout(() => {
      setShowSplash(false);
      sessionStorage.setItem("hasSeenSplash", "true");
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

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
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ duration: 3.5, ease }}
              className="flex flex-col items-center justify-center font-black"
              style={{ fontFamily: "'-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'SF Pro', 'Helvetica Neue', Helvetica, Arial, sans-serif" }}
            >
              <div className="flex items-center justify-center">
                <motion.h1
                  initial={{ y: 50, opacity: 0, filter: "blur(12px)", color: "#ffffff" }}
                  animate={{ y: 0, opacity: 1, filter: "blur(0px)", color: "#ffffff" }}
                  transition={{
                    y: { duration: 1, ease },
                    opacity: { duration: 1, ease },
                    filter: { duration: 1, ease }
                  }}
                  className="text-6xl sm:text-7xl md:text-8xl lg:text-[10rem] leading-none tracking-widest uppercase drop-shadow-2xl z-20 relative"
                >
                  P
                </motion.h1>

                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "auto", opacity: 1 }}
                  transition={{ duration: 1.2, ease, delay: 0.8 }}
                  className="overflow-hidden flex items-center relative z-10"
                >
                  <motion.h1
                    initial={{ x: -50, color: "#ffffff" }}
                    animate={{ x: 0, color: "#ffffff" }}
                    transition={{
                      x: { duration: 1.2, ease, delay: 0.8 }
                    }}
                    className="text-6xl sm:text-7xl md:text-8xl lg:text-[10rem] leading-none tracking-widest uppercase drop-shadow-2xl whitespace-nowrap pl-1"
                  >
                    ARANOIA
                  </motion.h1>
                </motion.div>
              </div>

              <div className="overflow-hidden mt-1 relative z-0">
                <motion.div
                  initial={{ y: -100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 1.2, ease, delay: 1.6 }}
                >
                  <motion.h2
                    initial={{ color: "#ffffff", fontStyle: "normal", skewX: 0 }}
                    animate={{ color: "#a855f7", fontStyle: "italic", skewX: -5 }}
                    transition={{ 
                      color: { duration: 0.8, delay: 2.4, ease: "easeInOut" },
                      fontStyle: { delay: 2.4 },
                      skewX: { duration: 0.8, delay: 2.4, ease: "easeInOut" }
                    }}
                    className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl leading-none tracking-[0.3em] uppercase drop-shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                  >
                    STUDIO
                  </motion.h2>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </>
  );
}

"use client";

import { motion } from "framer-motion";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center overflow-hidden transition-colors duration-500" style={{ background: 'var(--bg-color)' }}>
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none opacity-30 animate-pulse-slow" style={{ background: 'var(--shape-color)' }}></div>
      
      {/* Main Logo & Loader */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Animated Rings */}
        <div className="relative w-24 h-24 mb-8 flex items-center justify-center">
          {/* Outer Ring */}
          <div className="absolute inset-0 rounded-full border-t-2 border-r-2 animate-spin" style={{ borderColor: 'var(--logo-end)', animationDuration: '2s' }}></div>
          
          {/* Inner Ring */}
          <div className="absolute inset-2 rounded-full border-b-2 border-l-2 animate-spin" style={{ borderColor: 'var(--logo-start)', animationDuration: '1.5s', animationDirection: 'reverse' }}></div>
          
          {/* Core Logo Pulse */}
          <div className="w-10 h-10 rounded-full animate-pulse flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--logo-start), var(--logo-end))', boxShadow: '0 0 20px var(--logo-end)' }}>
            <div className="w-4 h-4 rounded-full bg-white"></div>
          </div>
        </div>

        {/* Brand Text */}
        <div className="overflow-hidden mb-2">
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-3xl font-black font-outfit tracking-[0.2em] uppercase"
            style={{ color: 'var(--text-color)' }}
          >
            Paranoia
          </motion.h1>
        </div>

        {/* Loading Bar */}
        <div className="w-48 h-1 rounded-full overflow-hidden mt-6 relative" style={{ background: 'var(--icon-border)' }}>
          <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-transparent via-[var(--logo-end)] to-transparent w-full animate-[shimmer-bar_1.5s_infinite_linear]"></div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer-bar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

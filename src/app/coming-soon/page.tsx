"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { LogIn, Sparkles } from "lucide-react";
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";

export default function ComingSoonPage() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX,
        y: e.clientY,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen bg-[#050508] text-white flex flex-col items-center justify-center relative overflow-hidden px-4">
      
      {/* Dynamic Mouse Gradient Follower */}
      <motion.div 
        className="absolute w-[800px] h-[800px] rounded-full pointer-events-none z-0"
        style={{
          background: "radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 60%)",
        }}
        animate={{
          x: mousePosition.x - 400,
          y: mousePosition.y - 400,
        }}
        transition={{ type: "tween", ease: "backOut", duration: 1 }}
      />

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20 z-0"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center w-full max-w-4xl"
      >
        {/* Logo Container */}
        <motion.div 
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="relative mb-12"
        >
          <div className="absolute inset-0 bg-fuchsia-600 blur-[80px] opacity-30 rounded-full"></div>
          <Image 
            src="/Paranoia_no_effect.png" 
            alt="PARANOIA SMP" 
            width={400} 
            height={150} 
            unoptimized
            className="w-full max-w-[280px] md:max-w-[400px] object-contain relative z-10 drop-shadow-[0_0_20px_rgba(168,85,247,0.5)]"
            priority
          />
        </motion.div>

        {/* Text Content */}
        <div className="text-center space-y-6 mb-16 relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 0, scale: 0 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-400 text-xs font-black uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(168,85,247,0.2)] mb-4"
          >
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-5xl md:text-7xl font-black font-outfit tracking-tighter"
          >
            OUVERTURE <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-600">PROCHAINE</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 1 }}
            className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto font-light leading-relaxed"
          >
            Le Site du PARANOIA SMP est en cours de préparation. 
            Il sera Bientot disponible.
          </motion.p>
        </div>

        {/* Action Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="h-[1px] w-32 bg-gradient-to-r from-transparent via-gray-700 to-transparent mb-4"></div>
          
          <button 
            onClick={() => signIn("discord")}
            className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-black border border-gray-800 rounded-2xl overflow-hidden hover:border-fuchsia-500/50 transition-all duration-300 shadow-[0_0_0_rgba(168,85,247,0)] hover:shadow-[0_0_40px_rgba(168,85,247,0.3)] hover:-translate-y-1"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-600/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <LogIn className="w-5 h-5 text-gray-400 group-hover:text-fuchsia-400 transition-colors" />
            <span className="font-bold text-sm tracking-widest uppercase text-gray-300 group-hover:text-white transition-colors">
              Connexion Staff
            </span>
          </button>
        </motion.div>
      </motion.div>
      
    </div>
  );
}

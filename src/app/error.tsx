"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[PARANOIA_ERROR]", error);
  }, [error]);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 text-center relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500 rounded-full blur-[150px] opacity-10 pointer-events-none"></div>

      <div className="relative z-10">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-red-500/10 border border-red-500/20 mb-8 shadow-2xl">
          <AlertTriangle className="w-12 h-12 text-red-500 animate-pulse" />
        </div>

        <h1 className="text-6xl md:text-7xl font-outfit font-black text-[var(--text-color)] mb-4 tracking-tighter drop-shadow-2xl">
          Oops
        </h1>

        <div className="h-1 w-24 bg-gradient-to-r from-red-500 to-orange-500 mx-auto mb-8 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.5)]"></div>

        <h2 className="text-2xl md:text-3xl font-outfit font-bold text-[var(--text-color)] mb-4 uppercase tracking-widest">
          Une erreur est survenue
        </h2>

        <p className="text-[var(--color-text-secondary)] text-lg max-w-md mx-auto mb-10 font-medium leading-relaxed">
          Quelque chose s&apos;est mal passé. Pas de panique, essayez de recharger la page.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-3 bg-[var(--text-color)] text-[var(--bg-color)] font-black px-8 py-4 rounded-2xl transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] uppercase tracking-wider group"
          >
            <RotateCcw className="w-5 h-5 transition-transform group-hover:-rotate-180 duration-500" />
            Réessayer
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-3 bg-[var(--text-color)]/5 border border-[var(--text-color)]/10 text-[var(--text-color)] font-bold px-8 py-4 rounded-2xl transition-all hover:bg-[var(--text-color)]/10 uppercase tracking-wider"
          >
            <Home className="w-5 h-5" />
            Accueil
          </Link>
        </div>
      </div>

      {/* Decorative Text */}
      <div className="absolute bottom-10 left-10 text-[10vw] font-black text-white/[0.02] select-none pointer-events-none uppercase">
        Crash
      </div>
      <div className="absolute top-10 right-10 text-[10vw] font-black text-white/[0.02] select-none pointer-events-none uppercase">
        Error
      </div>
    </div>
  );
}

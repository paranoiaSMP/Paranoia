import Link from "next/link";
import { Home, AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 text-center animate-slide-up relative overflow-hidden">
      {/* Background Decorative Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--logo-end)] rounded-full blur-[150px] opacity-10 pointer-events-none"></div>
      
      <div className="relative z-10">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-white/5 border border-white/10 mb-8 shadow-2xl">
          <AlertCircle className="w-12 h-12 text-fuchsia-500 animate-pulse" />
        </div>
        
        <h1 className="text-8xl md:text-9xl font-outfit font-black text-[var(--text-color)] mb-4 tracking-tighter drop-shadow-2xl">
          404
        </h1>
        
        <div className="h-1 w-24 bg-gradient-to-r from-fuchsia-500 to-purple-600 mx-auto mb-8 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.5)]"></div>
        
        <h2 className="text-2xl md:text-4xl font-outfit font-bold text-[var(--text-color)] mb-6 uppercase tracking-widest">
          Zone Inconnue
        </h2>
        
        <p className="text-[var(--nav-item-color)] text-lg md:text-xl max-w-md mx-auto mb-12 font-medium leading-relaxed">
          Il semblerait que vous vous soyez aventuré un peu trop loin dans les entrailles de Paranoïa. Cette page n&apos;existe pas ou a été déplacée.
        </p>
        
        <Link 
          href="/" 
          className="inline-flex items-center gap-3 bg-white text-black font-black px-8 py-4 rounded-2xl transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] uppercase tracking-wider group"
        >
          <Home className="w-5 h-5 transition-transform group-hover:-translate-y-0.5" />
          Retourner au SMP
        </Link>
      </div>

      {/* Decorative Text in background */}
      <div className="absolute bottom-10 left-10 text-[10vw] font-black text-white/[0.02] select-none pointer-events-none uppercase">
        Lost
      </div>
      <div className="absolute top-10 right-10 text-[10vw] font-black text-white/[0.02] select-none pointer-events-none uppercase">
        Error
      </div>
    </div>
  );
}

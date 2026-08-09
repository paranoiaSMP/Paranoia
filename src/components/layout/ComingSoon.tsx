import { Lock } from "lucide-react";
import Image from "next/image";

export default function ComingSoon() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-fuchsia-600/10 rounded-full blur-[100px] mix-blend-screen" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] mix-blend-screen" />
      </div>

      <div className="relative z-10 w-full max-w-2xl text-center flex flex-col items-center">
        {/* Logo or Icon */}
        <div className="w-24 h-24 bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-fuchsia-900/20 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/20 to-purple-600/20 rounded-3xl opacity-50" />
          <Lock className="w-10 h-10 text-fuchsia-400 relative z-10" />
        </div>

        {/* Title */}
        <h1 className="text-5xl md:text-7xl font-black font-outfit text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-purple-400 to-fuchsia-400 mb-6 tracking-tight drop-shadow-sm uppercase">
          Paranoia
        </h1>
        
        <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-[var(--surface-bg)] border border-[var(--card-border)] mb-8">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          <span className="font-bold text-gray-300 tracking-wider text-sm uppercase">Bientôt disponible</span>
        </div>

        {/* Message */}
        <p className="text-lg md:text-xl text-[var(--color-text-secondary)] max-w-lg mx-auto mb-12 leading-relaxed">
          Le serveur est actuellement en maintenance ou en préparation. Seuls les administrateurs ont accès au site pour le moment.
        </p>

        {/* Footer/Discord */}
        <div className="p-6 rounded-[2rem] bg-[var(--card-bg)] border border-[var(--card-border)] w-full max-w-md mx-auto relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-[#5865F2]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <p className="text-sm text-gray-400 mb-4 relative z-10">Rejoignez le discord pour être alerté de l'ouverture</p>
          <a 
            href="#" 
            className="inline-flex items-center justify-center w-full px-6 py-4 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-[#5865F2]/20 relative z-10"
          >
            Rejoindre le Discord
          </a>
        </div>
      </div>
    </div>
  );
}

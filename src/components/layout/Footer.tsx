import Link from "next/link";
import Image from "next/image";
import { MessageSquare, Shield, FileText } from "lucide-react";

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <path d="m10 15 5-3-5-3v6Z" />
    </svg>
  );
}

function TwitchIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M21 2H3v16h5v4l4-4h5l4-4V2z" />
      <path d="M11 11V7" />
      <path d="M16 11V7" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="relative mt-auto pt-16 overflow-hidden bg-[var(--color-bg-secondary)] border-t-4" style={{ borderColor: 'var(--card-border)' }}>
      {/* Background Noise & Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-32 bg-[var(--color-accent-purple,#9d0df2)]/10 blur-[80px] pointer-events-none"></div>
      <div className="absolute inset-0 bg-noise opacity-30 mix-blend-overlay pointer-events-none"></div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          
          {/* Brand Column */}
          <div className="md:col-span-2 text-center md:text-left">
            <Link href="/" className="inline-flex items-center gap-3 group mb-4">
              <div className="relative w-12 h-12 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                <Image 
                  src="/Paranoia_logo.png" 
                  alt="Paranoia SMP Logo" 
                  fill 
                  unoptimized={true} 
                  className="object-contain drop-shadow-[0_0_8px_rgba(179,102,255,0.4)]"
                />
              </div>
              <span className="font-outfit font-black text-2xl tracking-tight text-[var(--text-color)]">PARANOIA SMP</span>
            </Link>
            <p className="text-base font-inter font-medium leading-relaxed max-w-sm mx-auto md:mx-0 opacity-90" style={{ color: 'var(--nav-item-color)' }}>
              Le serveur Minecraft SMP qui redéfinit la survie en multijoueur. Rejoignez une communauté passionnée, ouvrez des boosters, et participez à des événements inédits.
            </p>

            {/* Social Icons Row */}
            <div className="flex items-center justify-center md:justify-start gap-3 mt-6">
              <a href="https://discord.gg/paranoiasmp" target="_blank" rel="noopener noreferrer" className="p-3 rounded-xl border-2 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg flex items-center gap-2 bg-[#5865F2] border-[#5865F2]/40 text-white font-bold text-sm">
                <MessageSquare className="w-5 h-5 fill-current" />
                Discord
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="p-3 rounded-xl border-2 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg bg-red-600/20 border-red-500/30 text-red-400 hover:bg-red-600 hover:text-white flex items-center gap-2 font-bold text-sm">
                <YoutubeIcon className="w-5 h-5" />
                YouTube
              </a>
              <a href="https://twitch.tv" target="_blank" rel="noopener noreferrer" className="p-3 rounded-xl border-2 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg bg-purple-600/20 border-purple-500/30 text-purple-400 hover:bg-purple-600 hover:text-white flex items-center gap-2 font-bold text-sm">
                <TwitchIcon className="w-5 h-5" />
                Twitch
              </a>
            </div>
          </div>
          
          {/* Links Column 1 */}
          <div className="text-center md:text-left">
            <h4 className="font-outfit font-black text-lg mb-5 uppercase tracking-wider text-[var(--text-color)] border-l-4 pl-3" style={{ borderColor: 'var(--color-accent-purple,#b366ff)' }}>Navigation</h4>
            <ul className="flex flex-col gap-3.5 text-base font-bold">
              <li><Link href="/" className="hover:text-[var(--logo-end)] transition-colors opacity-95" style={{ color: 'var(--text-color)' }}>Accueil</Link></li>
              <li><Link href="/cards" className="hover:text-[var(--logo-end)] transition-colors opacity-95" style={{ color: 'var(--text-color)' }}>Système de Cartes (TCG)</Link></li>
              <li><Link href="/shop" className="hover:text-[var(--logo-end)] transition-colors opacity-95" style={{ color: 'var(--text-color)' }}>Boutique Officielle</Link></li>
              <li><Link href="/launcher" className="hover:text-[var(--logo-end)] transition-colors opacity-95" style={{ color: 'var(--text-color)' }}>Launcher Custom</Link></li>
            </ul>
          </div>
          
          {/* Links Column 2 & Legal */}
          <div className="text-center md:text-left">
            <h4 className="font-outfit font-black text-lg mb-5 uppercase tracking-wider text-[var(--text-color)] border-l-4 pl-3" style={{ borderColor: 'var(--feature-emerald-text,#10b981)' }}>Communauté & Infos</h4>
            <ul className="flex flex-col gap-3.5 text-base font-bold">
              <li><Link href="/videastes" className="hover:text-[var(--feature-emerald-text)] transition-colors opacity-95" style={{ color: 'var(--text-color)' }}>Nos Vidéastes & Partenaires</Link></li>
              <li><Link href="/candidature" className="hover:text-[var(--feature-amber-text)] transition-colors opacity-95" style={{ color: 'var(--text-color)' }}>Nous Rejoindre (Recrutement)</Link></li>
              <li><span className="cursor-pointer hover:text-purple-400 transition-colors opacity-80 font-medium text-sm flex items-center justify-center md:justify-start gap-1.5 pt-2" style={{ color: 'var(--nav-item-color)' }}><Shield className="w-4 h-4" /> Mentions Légales & CGV</span></li>
              <li><span className="cursor-pointer hover:text-purple-400 transition-colors opacity-80 font-medium text-sm flex items-center justify-center md:justify-start gap-1.5" style={{ color: 'var(--nav-item-color)' }}><FileText className="w-4 h-4" /> Charte de Confidentialité</span></li>
            </ul>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="pt-8 border-t-2 text-center md:flex md:justify-between md:items-center text-sm font-bold opacity-90" style={{ borderColor: 'var(--card-border)', color: 'var(--text-color)' }}>
          <p>
            &copy; {new Date().getFullYear()} <span className="text-[var(--color-accent-purple,#b366ff)]">PARANOIA SMP</span>. Tous droits réservés.
          </p>
          <p className="mt-3 md:mt-0 opacity-75 font-medium text-xs md:text-sm">
            Serveur Minecraft privé — Non affilié ni soutenu officiellement par Mojang AB ou Microsoft.
          </p>
        </div>
      </div>
    </footer>
  );
}
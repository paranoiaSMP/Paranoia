import { ShieldCheck, Server, Sparkles, ExternalLink } from "lucide-react";
import { siteConfig } from "@/config/site";

export default function CommunitySection() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto mb-16">
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#12111a] via-[#100f18] to-[#181224] p-8 sm:p-12 relative overflow-hidden">
        <div className="max-w-2xl text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-mono font-bold mb-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            Infrastructure & Communauté
          </div>

          <h2 className="font-outfit text-2xl sm:text-4xl font-black text-white uppercase tracking-tight mb-4">
            Un écosystème pensé pour durer
          </h2>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-medium mb-8">
            La plateforme web fonctionne de manière totalement indépendante. Votre progression, vos cartes rares et votre banque sont hébergées de manière sécurisée en base de données PostgreSQL.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="p-4 rounded-2xl bg-black/30 border border-white/5">
              <span className="text-xs font-mono text-purple-400 font-bold uppercase block mb-1">
                Liaison Mojang
              </span>
              <p className="text-xs text-slate-400 leading-relaxed">
                Résolution instantanée du skin et de l'UUID officiel via l'API Mojang. Zéro commande en jeu nécessaire.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/30 border border-white/5">
              <span className="text-xs font-mono text-emerald-400 font-bold uppercase block mb-1">
                Serveur SMP
              </span>
              <p className="text-xs text-slate-400 leading-relaxed">
                Le serveur survie est actuellement privé. Les annonces et ouvertures sont communiquées sur Discord.
              </p>
            </div>
          </div>

          <a
            href={siteConfig.discordUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 min-h-[48px] px-6 py-3 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-outfit font-black text-sm uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(88,101,242,0.35)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
            </svg>
            <span>Rejoindre notre Discord</span>
            <ExternalLink className="w-4 h-4 opacity-80" />
          </a>
        </div>
      </div>
    </section>
  );
}

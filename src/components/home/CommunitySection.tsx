import { ExternalLink } from "lucide-react";
import { siteConfig } from "@/config/site";

export default function CommunitySection() {
  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto mb-12">
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-left">
        <div className="max-w-xl">
          <h2 className="font-outfit text-xl sm:text-2xl font-black text-white uppercase tracking-tight mb-2">
            Rejoignez la Communauté
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed font-normal">
            Le serveur SMP est privé et en développement. Les annonces, les concours et les ouvertures de whitelist sont partagés sur notre Discord.
          </p>
        </div>

        <a
          href={siteConfig.discordUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-outfit font-bold text-sm tracking-wide transition-colors flex items-center justify-center gap-2 shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
          </svg>
          <span>Discord</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-70" />
        </a>
      </div>
    </section>
  );
}

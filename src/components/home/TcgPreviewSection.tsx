import Link from "next/link";
import Image from "next/image";
import { Sparkles, Layers, ChevronRight, Eye } from "lucide-react";
import { CARD_RARITIES } from "@/config/boosters";

export default function TcgPreviewSection() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      <div className="rounded-3xl border border-white/10 bg-[#12111a] p-8 sm:p-12 relative overflow-hidden">
        {/* Halo décoratif discret en arrière-plan */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
          {/* Colonne Gauche : Explications & Raretés */}
          <div className="max-w-xl text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-mono font-bold mb-4">
              <Layers className="w-3.5 h-3.5" />
              Jeu de Cartes à Collectionner
            </div>

            <h2 className="font-outfit text-2xl sm:text-4xl font-black text-white uppercase tracking-tight mb-4">
              Collectionnez les cartes des joueurs
            </h2>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-medium mb-6">
              Chaque carte est générée à partir du skin officiel d'un joueur du SMP, déclinée en 6 raretés et sublimée par des shaders holographiques interactifs.
            </p>

            {/* Badges de raretés unifiés */}
            <div className="mb-8">
              <span className="text-xs font-mono text-slate-400 font-bold uppercase tracking-wider block mb-3">
                Taux de drop des raretés :
              </span>
              <div className="flex flex-wrap gap-2">
                {CARD_RARITIES.map((rarity) => (
                  <span
                    key={rarity.key}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-mono font-bold bg-white/5 border-white/10 ${rarity.colorClass}`}
                  >
                    <span className="w-2 h-2 rounded-full bg-current" />
                    <span>{rarity.label}</span>
                    <span className="opacity-60 text-[10px]">
                      {rarity.key === "MYTHIC" ? "0.2%" : rarity.key === "LEGENDARY" ? "2.0%" : ""}
                    </span>
                  </span>
                ))}
              </div>
            </div>

            <Link
              href="/cards"
              className="inline-flex items-center gap-2.5 min-h-[48px] px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-outfit font-black text-sm uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(168,85,247,0.35)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500"
            >
              <Sparkles className="w-4 h-4" />
              <span>Explorer la Collection</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Colonne Droite : Visuel des 3 Boosters en éventail */}
          <div className="relative flex items-center justify-center shrink-0 w-full lg:w-auto py-6 sm:py-0">
            {/* Booster Standard (Gauche) */}
            <div className="relative w-28 sm:w-36 h-40 sm:h-52 -rotate-12 translate-x-6 sm:translate-x-8 opacity-75 hover:opacity-100 hover:rotate-0 hover:scale-105 transition-all duration-300 drop-shadow-xl cursor-pointer">
              <Image
                src="/StandardB.png"
                alt="Booster Standard"
                fill
                className="object-contain"
                unoptimized
              />
            </div>

            {/* Booster Légendaire (Centre mis en avant) */}
            <div className="relative w-36 sm:w-48 h-52 sm:h-64 z-20 hover:scale-105 transition-transform duration-300 drop-shadow-2xl cursor-pointer">
              <Image
                src="/LegendaireB.png"
                alt="Booster Légendaire"
                fill
                className="object-contain"
                unoptimized
              />
            </div>

            {/* Booster Mythique (Droite) */}
            <div className="relative w-28 sm:w-36 h-40 sm:h-52 rotate-12 -translate-x-6 sm:-translate-x-8 opacity-75 hover:opacity-100 hover:rotate-0 hover:scale-105 transition-all duration-300 drop-shadow-xl cursor-pointer">
              <Image
                src="/MythiqueB.png"
                alt="Booster Mythique"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

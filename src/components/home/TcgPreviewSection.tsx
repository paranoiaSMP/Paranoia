import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";

export default function TcgPreviewSection() {
  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-6 sm:p-10">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
          {/* Colonne gauche : présentation sobre */}
          <div className="max-w-lg text-left">
            <h2 className="font-outfit text-2xl sm:text-3xl font-black text-white uppercase tracking-tight mb-3">
              Cartes à Collectionner
            </h2>

            <p className="text-sm text-zinc-400 leading-relaxed mb-6 font-normal">
              Ouvrez des paquets et complétez votre binder numérique. Chaque carte est générée avec le skin officiel d'un joueur, avec ses variantes et ses reflets holographiques.
            </p>

            <div className="flex items-center gap-6 mb-8 text-xs font-mono text-zinc-400">
              <div>
                <span className="text-white font-bold block text-sm">6 Raretés</span>
                <span>Commune à Mythique</span>
              </div>
              <div className="w-px h-8 bg-zinc-800" />
              <div>
                <span className="text-white font-bold block text-sm">3 Shaders</span>
                <span>Holo · Glitch · Cosmic</span>
              </div>
            </div>

            <Link
              href="/cards"
              className="inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 text-white font-outfit font-bold text-sm tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500"
            >
              <span>Accéder aux Boosters</span>
              <ChevronRight className="w-4 h-4 text-purple-400" />
            </Link>
          </div>

          {/* Colonne droite : visuels des packs */}
          <div className="relative flex items-center justify-center shrink-0 w-full lg:w-auto py-4 sm:py-0">
            <div className="relative w-24 sm:w-32 h-36 sm:h-48 -rotate-6 translate-x-4 opacity-80 hover:opacity-100 transition-opacity">
              <Image
                src="/StandardB.png"
                alt="Booster Standard"
                fill
                className="object-contain"
                unoptimized
              />
            </div>

            <div className="relative w-32 sm:w-40 h-44 sm:h-56 z-10 hover:scale-105 transition-transform duration-200">
              <Image
                src="/LegendaireB.png"
                alt="Booster Légendaire"
                fill
                className="object-contain"
                unoptimized
              />
            </div>

            <div className="relative w-24 sm:w-32 h-36 sm:h-48 rotate-6 -translate-x-4 opacity-80 hover:opacity-100 transition-opacity">
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

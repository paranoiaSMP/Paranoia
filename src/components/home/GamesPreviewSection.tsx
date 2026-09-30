import Link from "next/link";
import { Bomb, TrendingUp, Disc, Layers, ChevronRight, Dice5 } from "lucide-react";

const GAMES_LIST = [
  {
    id: "mines",
    title: "Démineur (Mines 5x5)",
    tag: "Grille 5x5 · Multiplicateur progressif",
    description: "Révélez un maximum de diamants sans tomber sur une mine. Cashout disponible à tout moment.",
    badgeColor: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    icon: Bomb,
    href: "/jeux/mines",
  },
  {
    id: "crash",
    title: "Crash Multiplier",
    tag: "Courbe Live · Temps réel SSE",
    description: "La courbe s'envole en direct vers les sommets. Encaissez vos gains avant l'explosion.",
    badgeColor: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30",
    icon: TrendingUp,
    href: "/jeux/crash",
  },
  {
    id: "roulette",
    title: "Roulette 14x",
    tag: "Rouge x2 · Noir x2 · Vert x14",
    description: "Misez sur votre couleur préférée et observez le ruban défiler à chaque tour.",
    badgeColor: "text-rose-400 bg-rose-500/10 border-rose-500/30",
    icon: Disc,
    href: "/jeux/roulette",
  },
  {
    id: "blackjack",
    title: "Blackjack 21",
    tag: "Table classique · Versus Croupier",
    description: "Tirez, doublez ou assurez vos cartes. Rapprochez-vous de 21 sans jamais le dépasser.",
    badgeColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    icon: Layers,
    href: "/jeux/blackjack",
  },
];

export default function GamesPreviewSection() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 pb-4 border-b border-white/10 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-mono font-bold mb-3">
            <Dice5 className="w-3.5 h-3.5" />
            4 Mini-Jeux Disponibles
          </div>
          <h2 className="font-outfit text-2xl sm:text-4xl font-black text-white uppercase tracking-tight">
            La Salle des Jeux
          </h2>
        </div>

        <Link
          href="/jeux"
          className="text-sm font-outfit font-black text-purple-400 hover:text-purple-300 flex items-center gap-1.5 transition-colors shrink-0"
        >
          <span>Voir tous les jeux</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Grille des 4 jeux */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {GAMES_LIST.map((game) => {
          const Icon = game.icon;

          return (
            <Link
              key={game.id}
              href={game.href}
              className="group rounded-3xl border border-white/10 bg-[#12111a] hover:bg-[#161522] hover:border-purple-500/40 p-6 sm:p-8 transition-all duration-150 flex flex-col justify-between focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500"
            >
              <div>
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-purple-400 group-hover:scale-105 group-hover:bg-purple-600/20 group-hover:border-purple-500/40 transition-all">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${game.badgeColor}`}>
                    {game.tag}
                  </span>
                </div>

                <h3 className="font-outfit text-xl font-black text-white mb-2 group-hover:text-purple-300 transition-colors">
                  {game.title}
                </h3>

                <p className="text-sm text-slate-400 leading-relaxed font-medium mb-6">
                  {game.description}
                </p>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono font-bold text-slate-400 group-hover:text-white transition-colors">
                <span>Jouer avec vos PARA Coins</span>
                <span className="flex items-center gap-1 text-purple-400 group-hover:translate-x-1 transition-transform">
                  Entrer dans la salle <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

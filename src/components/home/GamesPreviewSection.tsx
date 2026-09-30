import Link from "next/link";
import { Bomb, TrendingUp, Disc, Layers, ChevronRight } from "lucide-react";

const GAMES_LIST = [
  {
    id: "mines",
    title: "Démineur 5x5",
    tag: "Multiplicateur progressif",
    description: "Trouvez un maximum d'étoiles sans toucher de mine. Cashout possible à tout moment.",
    icon: Bomb,
    href: "/jeux/mines",
  },
  {
    id: "crash",
    title: "Crash Multiplier",
    tag: "Courbe en direct",
    description: "La courbe s'élève en continu. Encaissez avant l'interruption pour multiplier votre mise.",
    icon: TrendingUp,
    href: "/jeux/crash",
  },
  {
    id: "roulette",
    title: "Roulette 14x",
    tag: "Rouge / Noir / Vert",
    description: "Choisissez votre camp et observez le ruban horizontal se synchroniser à chaque rotation.",
    icon: Disc,
    href: "/jeux/roulette",
  },
  {
    id: "blackjack",
    title: "Blackjack 21",
    tag: "Versus Croupier",
    description: "Tirez, doublez ou restez pour battre la main du croupier selon les règles classiques.",
    icon: Layers,
    href: "/jeux/blackjack",
  },
];

export default function GamesPreviewSection() {
  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <div className="flex items-end justify-between gap-4 pb-3 border-b border-zinc-800 mb-6">
        <div>
          <h2 className="font-outfit text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
            Salle des Jeux
          </h2>
        </div>

        <Link
          href="/jeux"
          className="text-xs font-mono font-bold text-zinc-400 hover:text-white flex items-center gap-1 transition-colors shrink-0"
        >
          <span>Tous les jeux</span>
          <ChevronRight className="w-3.5 h-3.5 text-purple-400" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {GAMES_LIST.map((game) => {
          const Icon = game.icon;

          return (
            <Link
              key={game.id}
              href={game.href}
              className="group rounded-2xl border border-zinc-800/80 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-900/40 p-5 transition-all flex flex-col justify-between focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500"
            >
              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 group-hover:text-purple-400 group-hover:border-zinc-700 transition-colors">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500">
                    {game.tag}
                  </span>
                </div>

                <h3 className="font-outfit font-bold text-white text-base mb-1.5 group-hover:text-purple-300 transition-colors">
                  {game.title}
                </h3>

                <p className="text-xs text-zinc-400 leading-relaxed mb-4 font-normal">
                  {game.description}
                </p>
              </div>

              <div className="pt-3 border-t border-zinc-900 flex items-center justify-between text-xs font-mono text-zinc-500 group-hover:text-zinc-300 transition-colors">
                <span>Jouer avec des PARA Coins</span>
                <ChevronRight className="w-3.5 h-3.5 text-purple-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

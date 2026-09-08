import Link from "next/link";
import { getServerSession } from "next-auth";
import { 
  Coins, 
  Bomb, 
  Rocket, 
  Dices, 
  Layers, 
  Disc, 
  CircleDot, 
  Spade, 
  Sparkles, 
  ArrowRight,
  ShieldCheck,
  Gamepad2
} from "lucide-react";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";

export const revalidate = 0;

export const metadata = {
  title: "Jeux & Casino | PARANOIA",
  description: "Salle de jeux du serveur Paranoia SMP. TCG, Coinflip, Mines, Crash, Dice et plus.",
};

const GAMES = [
  {
    id: "tcg",
    title: "Trading Cards (TCG)",
    tagline: "Boosters & Collection",
    desc: "Ouvrez des boosters, collectionnez les cartes animées des joueurs et complétez votre deck.",
    href: "/cards",
    icon: Layers,
    badge: "Disponible",
    badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    color: "from-purple-500/20 to-fuchsia-500/10",
    borderColor: "hover:border-purple-500/50",
    ratio: "Cartes & Boosters",
    isReady: true,
  },
  {
    id: "coinflip",
    title: "Coinflip",
    tagline: "Pile ou Face",
    desc: "Choisissez votre côté, misez des ParaCoins et tentez le x2.00 instantané en solo ou PvP.",
    href: "/jeux/coinflip",
    icon: Coins,
    badge: "Bientôt",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    color: "from-amber-500/20 to-yellow-500/10",
    borderColor: "hover:border-amber-500/50",
    ratio: "50% • x2.00",
    isReady: false,
  },
  {
    id: "mines",
    title: "Mines",
    tagline: "Démineur à gains",
    desc: "Révélez les émeraudes sur une grille 5×5 sans sauter sur la TNT. Encaissez à tout moment.",
    href: "/jeux/mines",
    icon: Bomb,
    badge: "Disponible",
    badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    color: "from-red-500/20 to-orange-500/10",
    borderColor: "hover:border-red-500/50",
    ratio: "Multiplicateur évolutif",
    isReady: true,
  },
  {
    id: "crash",
    title: "Crash",
    tagline: "Fusée & Multiplicateur",
    desc: "Regardez le multiplicateur s'envoler en direct. Cliquez sur Encaisser avant le crash.",
    href: "/jeux/crash",
    icon: Rocket,
    badge: "Disponible",
    badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    color: "from-blue-500/20 to-indigo-500/10",
    borderColor: "hover:border-blue-500/50",
    ratio: "Jusqu'à x100+",
    isReady: true,
  },
  {
    id: "dice",
    title: "Dice",
    tagline: "Jeu de Dés",
    desc: "Réglez votre niveau de risque avec la jauge et défiez les probabilités pour remporter la mise.",
    href: "/jeux/dice",
    icon: Dices,
    badge: "Bientôt",
    badgeColor: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
    color: "from-cyan-500/20 to-teal-500/10",
    borderColor: "hover:border-cyan-500/50",
    ratio: "Risque personnalisable",
    isReady: false,
  },
  {
    id: "plinko",
    title: "Plinko",
    tagline: "Pyramide de Clous",
    desc: "Faites tomber des billes à travers les piquets et visez les multiplicateurs extrêmes sur les ailes.",
    href: "/jeux/plinko",
    icon: CircleDot,
    badge: "Bientôt",
    badgeColor: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
    color: "from-pink-500/20 to-rose-500/10",
    borderColor: "hover:border-pink-500/50",
    ratio: "Jusqu'à x1000",
    isReady: false,
  },
  {
    id: "roulette",
    title: "Roulette",
    tagline: "Rouge, Noir ou Vert",
    desc: "Placez vos paris sur la roue de la fortune et multipliez vos gains par 2 ou par 14 sur le vert.",
    href: "/jeux/roulette",
    icon: Disc,
    badge: "Disponible",
    badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    color: "from-violet-500/20 to-purple-500/10",
    borderColor: "hover:border-violet-500/50",
    ratio: "Rouge x2 • Vert x14",
    isReady: true,
  },
  {
    id: "blackjack",
    title: "Blackjack 21",
    tagline: "Battez le Croupier",
    desc: "Approchez-vous au maximum de 21 sans dépasser. Tirez, restez ou doublez votre mise.",
    href: "/jeux/blackjack",
    icon: Spade,
    badge: "Disponible",
    badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    color: "from-amber-500/20 to-purple-500/10",
    borderColor: "hover:border-purple-500/50",
    ratio: "1:1 • Blackjack 3:2",
    isReady: true,
  },
];

export default async function JeuxPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  let paraCoins = 0;
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { paraCoins: true },
    });
    paraCoins = user?.paraCoins || 0;
  }

  return (
    <div className="relative min-h-screen text-[var(--text-color)] px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pt-6 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-[var(--card-border)] mb-10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-wider mb-3">
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Salle des Jeux & Casino</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-outfit font-black tracking-tight leading-tight">
            Jeux <span className="text-gradient">Paranoia</span>
          </h1>
          <p className="text-sm sm:text-base font-inter text-[var(--nav-item-color)] mt-1.5 max-w-xl">
            Misez vos ParaCoins, collectionnez les cartes TCG et défiez la chance sur nos mini-jeux.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl border-2 border-[var(--card-border)] bg-[var(--surface-bg)] shadow-md">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--nav-item-color)] block">
                Votre Solde
              </span>
              <span className="text-xl sm:text-2xl font-outfit font-black text-purple-400">
                {paraCoins.toLocaleString("fr-FR")}{" "}
                <span className="text-xs font-semibold text-[var(--nav-item-color)]">PC</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
        {GAMES.map((game) => {
          const Icon = game.icon;
          const CardInner = (
            <div
              className={`h-full rounded-2xl border-2 border-[var(--card-border)] ${game.borderColor} bg-[var(--surface-bg)] p-5 flex flex-col justify-between transition-all duration-200 group-hover:-translate-y-1 shadow-sm relative overflow-hidden`}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${game.color} opacity-30 pointer-events-none`}
              />

              <div className="relative z-10">
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="w-12 h-12 rounded-xl border border-[var(--card-border)] bg-black/20 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${game.badgeColor}`}
                  >
                    {game.badge}
                  </span>
                </div>

                <div className="mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 block mb-0.5">
                    {game.tagline}
                  </span>
                  <h3 className="text-xl font-outfit font-black text-[var(--text-color)] group-hover:text-purple-400 transition-colors">
                    {game.title}
                  </h3>
                </div>

                <p className="text-xs sm:text-sm font-inter text-[var(--nav-item-color)] leading-relaxed mb-4">
                  {game.desc}
                </p>
              </div>

              <div className="relative z-10 pt-3 border-t border-[var(--card-border)] flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--nav-item-color)]">
                  {game.ratio}
                </span>
                <span className="font-bold text-purple-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  {game.isReady ? "Jouer" : "Bientôt"}
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );

          if (game.isReady) {
            return (
              <Link key={game.id} href={game.href} className="group block h-full">
                {CardInner}
              </Link>
            );
          }

          return (
            <div key={game.id} className="group block h-full opacity-85 hover:opacity-100 cursor-pointer">
              <Link href={game.href} className="block h-full">
                {CardInner}
              </Link>
            </div>
          );
        })}
      </div>

      <div className="mt-14 p-6 sm:p-8 rounded-3xl border-2 border-[var(--card-border)] bg-[var(--surface-bg)] flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-outfit font-black text-lg text-[var(--text-color)]">
              Système Provably Fair & ParaCoins
            </h4>
            <p className="text-xs sm:text-sm font-inter text-[var(--nav-item-color)] max-w-xl">
              Tous les tirages et calculs de probabilités sont validés côté serveur. Les ParaCoins sont la monnaie virtuelle interne du serveur Paranoia.
            </p>
          </div>
        </div>
        <Link href="/cards" className="btn-neo-secondary shrink-0 text-sm py-2.5 px-5">
          <Sparkles className="w-4 h-4 text-purple-400 mr-2" />
          Ouvrir des Boosters TCG
        </Link>
      </div>
    </div>
  );
}

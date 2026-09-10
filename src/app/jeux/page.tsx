import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { 
  Gamepad2, 
  Coins, 
  Plus, 
  Sparkles, 
  BookOpen, 
  PackageOpen, 
  Layers, 
  Rocket, 
  Bomb, 
  Disc, 
  Spade, 
  ArrowRight, 
  ShieldCheck, 
  Dices, 
  CircleDot 
} from "lucide-react";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";

export const revalidate = 0;

export const metadata = {
  title: "Jeux & Casino | PARANOIA",
  description: "Salle de jeux du serveur Paranoia SMP. TCG, Mines, Crash, Roulette, Blackjack et plus.",
};

const AVAILABLE_GAMES = [
  {
    id: "tcg",
    title: "Trading Cards",
    tagline: "Boosters & Collection",
    href: "/cards",
    icon: Layers,
    badge: "Populaire",
    badgeColor: "text-[#34d399]",
    color: "from-purple-500/20 to-fuchsia-500/10",
    hoverBorder: "hover:border-purple-500/50",
    ratio: "Commune → Mythique",
    iconBg: "bg-purple-500/15 border-purple-500/30 text-purple-400",
  },
  {
    id: "mines",
    title: "Mines",
    tagline: "Démineur à gains",
    href: "/jeux/mines",
    icon: Bomb,
    color: "from-red-500/20 to-orange-500/10",
    hoverBorder: "hover:border-red-500/50",
    ratio: "Grille 5×5",
    iconBg: "bg-red-500/15 border-red-500/30 text-red-300",
    extraAsset: "/netherite.png",
  },
  {
    id: "crash",
    title: "Crash",
    tagline: "Fusée & Multiplicateur",
    href: "/jeux/crash",
    icon: Rocket,
    badge: "Live",
    livePulse: true,
    badgeColor: "text-red-300",
    color: "from-blue-500/20 to-indigo-500/10",
    hoverBorder: "hover:border-blue-500/50",
    ratio: "Jusqu'à x100+",
    iconBg: "bg-blue-500/15 border-blue-500/30 text-blue-400",
  },
  {
    id: "roulette",
    title: "Roulette",
    tagline: "Rouge, Noir ou Vert",
    href: "/jeux/roulette",
    icon: Disc,
    badge: "x14 max",
    badgeColor: "text-[#34d399]",
    color: "from-violet-500/20 to-purple-500/10",
    hoverBorder: "hover:border-violet-500/50",
    ratio: "Rouge x2 • Vert x14",
    iconBg: "bg-violet-500/15 border-violet-500/30 text-violet-400",
  },
  {
    id: "blackjack",
    title: "Blackjack 21",
    tagline: "Battez le Croupier",
    href: "/jeux/blackjack",
    icon: Spade,
    badge: "3:2",
    badgeColor: "text-zinc-400",
    color: "from-amber-500/20 to-purple-500/10",
    hoverBorder: "hover:border-amber-500/50",
    ratio: "1:1 • Blackjack 3:2",
    iconBg: "bg-amber-500/15 border-amber-500/30 text-amber-400",
  },
];

const UPCOMING_GAMES = [
  {
    id: "coinflip",
    title: "Coinflip",
    desc: "Pile ou face en solo ou PvP · 50% · x2.00",
    icon: Coins,
    iconColor: "text-amber-400",
    badge: "Bientôt",
    badgeStyle: "border-purple-500/30 bg-purple-500/15 text-purple-200",
  },
  {
    id: "dice",
    title: "Dice",
    desc: "Jauge de risque personnalisable",
    icon: Dices,
    iconColor: "text-cyan-400",
    badge: "Bientôt",
    badgeStyle: "border-zinc-700 bg-zinc-800 text-zinc-400",
  },
  {
    id: "plinko",
    title: "Plinko",
    desc: "Pyramide de clous · jusqu'à x1000",
    icon: CircleDot,
    iconColor: "text-pink-400",
    badge: "Bientôt",
    badgeStyle: "border-zinc-700 bg-zinc-800 text-zinc-400",
  },
];

interface ActivityItem {
  id: string;
  name: string;
  game: string;
  detail: string;
  amount: string;
  icon: typeof Rocket;
  iconBg: string;
  textColor: string;
}

export default async function JeuxPage() {
  let paraCoins = 0;
  let userCardsCount = 0;
  let catalogCount = 0;
  let editionsCount = 4;
  let boostersLastHour = 0;
  let recentActivities: ActivityItem[] = [];

  try {
    const session = await getServerSession(authOptions).catch(() => null);
    const userId = session?.user?.id;

    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          paraCoins: true,
          inventory: { select: { id: true } },
        },
      }).catch(() => null);

      paraCoins = user?.paraCoins || 0;
      userCardsCount = user?.inventory?.length || 0;
    }

    const [publishedCards, editions, hourCards, latestPacks] = await Promise.all([
      prisma.tradingCard.count({ where: { isPublished: true } }).catch(() => 0),
      prisma.edition.count().catch(() => 4),
      prisma.userCard.count({
        where: { obtainedAt: { gte: new Date(Date.now() - 3600 * 1000) } },
      }).catch(() => 0),
      prisma.userCard.findMany({
        take: 4,
        orderBy: { obtainedAt: "desc" },
        include: {
          user: { select: { minecraftName: true, name: true } },
          tradingCard: { select: { title: true, rarity: true } },
        },
      }).catch(() => []),
    ]);

    catalogCount = publishedCards;
    editionsCount = editions || 4;
    boostersLastHour = hourCards;

    if (latestPacks && latestPacks.length > 0) {
      recentActivities = latestPacks.map((pack, idx) => ({
        id: `pack-${pack.id || idx}`,
        name: pack.user?.minecraftName || pack.user?.name || "Joueur",
        game: "Booster TCG",
        detail: pack.tradingCard?.title || "Carte obtenue",
        amount: pack.tradingCard?.rarity || "COMMUNE",
        icon: Layers,
        iconBg: "bg-purple-500/15 border-purple-500/30 text-purple-400",
        textColor: pack.tradingCard?.rarity === "MYTHIC" ? "text-red-400" : "text-purple-300",
      }));
    }
  } catch {}

  if (recentActivities.length === 0) {
    recentActivities = [
      {
        id: "default-1",
        name: "Crash",
        game: "Multiplicateur",
        detail: "Fusée en temps réel",
        amount: "x100+",
        icon: Rocket,
        iconBg: "bg-blue-500/15 border-blue-500/30 text-blue-400",
        textColor: "text-emerald-400",
      },
      {
        id: "default-2",
        name: "Mines",
        game: "Grille 5×5",
        detail: "Netherite vs TNT",
        amount: "Évolutif",
        icon: Bomb,
        iconBg: "bg-red-500/15 border-red-500/30 text-red-400",
        textColor: "text-emerald-400",
      },
      {
        id: "default-3",
        name: "Roulette",
        game: "Roue de la chance",
        detail: "Rouge, Noir ou Vert",
        amount: "x14 max",
        icon: Disc,
        iconBg: "bg-violet-500/15 border-violet-500/30 text-violet-400",
        textColor: "text-purple-300",
      },
      {
        id: "default-4",
        name: "Blackjack",
        game: "Table 21",
        detail: "Battez le Croupier",
        amount: "3:2",
        icon: Spade,
        iconBg: "bg-amber-500/15 border-amber-500/30 text-amber-400",
        textColor: "text-amber-300",
      },
    ];
  }

  return (
    <div className="relative min-h-screen text-white px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pt-6 pb-24">
      <div className="flex flex-wrap items-end justify-between gap-5 mb-8 pb-6 border-b border-white/5">
        <div className="min-w-[280px]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-wider mb-3">
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Salle des Jeux & Casino</span>
          </div>
          <h1 className="font-outfit text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-none text-white">
            Jeux <span className="bg-gradient-to-r from-[#ff4d4d] to-[#b366ff] bg-clip-text text-transparent">Paranoia</span>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-white/5 bg-[#111118]">
            <Image src="/Paracoin.png" alt="ParaCoin" width={36} height={36} className="object-contain" />
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">Votre Solde</span>
              <span className="font-outfit text-2xl font-black text-purple-400">
                {paraCoins.toLocaleString("fr-FR")} <span className="text-xs font-semibold text-zinc-400">PC</span>
              </span>
            </div>
          </div>
          <Link
            href="/shop"
            className="flex items-center justify-center gap-2 px-6 h-[56px] rounded-xl font-outfit font-bold text-[15px] border-2 border-[#7a1fa2] bg-[#b366ff] text-white shadow-[6px_6px_0px_0px_#7a1fa2] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0px_0px_#7a1fa2] hover:bg-purple-400 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Recharger
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <div className="lg:col-span-2 relative overflow-hidden rounded-3xl border-2 border-purple-500/35 bg-[#111118] p-7 sm:p-8 shadow-[0_0_40px_rgba(122,10,173,0.25)] flex flex-col justify-between">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-transparent to-fuchsia-500/10 pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_50%,rgba(168,85,247,0.25)_0%,transparent_60%)] pointer-events-none" />

          <div className="relative z-10 flex flex-wrap gap-8 items-center justify-between">
            <div className="min-w-[260px] flex-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/35 text-purple-300 text-[11px] font-black uppercase tracking-wider mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                Le jeu phare du serveur
              </div>

              <h2 className="font-outfit text-3xl sm:text-4xl font-black leading-tight text-white mb-2">
                Trading Cards{" "}
                <span className="bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-500 bg-clip-text text-transparent">
                  TCG
                </span>
              </h2>

              <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-md mb-5">
                Ouvrez des boosters, collectionnez les cartes animées des joueurs et complétez votre deck.
              </p>

              <div className="flex flex-wrap gap-2.5 mb-6">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/35 border border-white/5 text-xs font-bold text-slate-200">
                  <BookOpen className="w-4 h-4 text-purple-400" />
                  {catalogCount > 0 ? `${catalogCount} cartes publiées` : "Collection TCG"}
                </span>
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/35 border border-white/5 text-xs font-bold text-slate-200">
                  <PackageOpen className="w-4 h-4 text-purple-400" />
                  {editionsCount} types de boosters
                </span>
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/35 border border-white/5 text-xs font-bold text-slate-200">
                  <span className="text-red-400 font-black">Mythique</span> jusqu&apos;à 5%
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/cards"
                  className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-outfit font-bold text-base border-2 border-[#7a1fa2] bg-[#b366ff] text-white shadow-[6px_6px_0px_0px_#7a1fa2] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0px_0px_#7a1fa2] hover:bg-purple-400 transition-all"
                >
                  <PackageOpen className="w-5 h-5" />
                  Ouvrir des boosters
                </Link>
                <Link
                  href="/cards"
                  className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-outfit font-bold text-[15px] border-2 border-white/10 bg-black/40 text-white hover:border-[#7a1fa2] transition-colors"
                >
                  <Layers className="w-4 h-4 text-purple-400" />
                  Ma collection · {userCardsCount}
                </Link>
                {boostersLastHour > 0 && (
                  <span className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 ml-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-[pulse-dot_1.4s_infinite_ease-in-out]" />
                    {boostersLastHour} carte{boostersLastHour > 1 ? "s" : ""} tirée{boostersLastHour > 1 ? "s" : ""} cette heure
                  </span>
                )}
              </div>
            </div>

            <div className="hidden sm:flex min-w-[220px] items-center justify-center -space-x-12 shrink-0">
              <div className="w-[110px] h-[158px] relative -rotate-12 translate-x-6 drop-shadow-[0_18px_22px_rgba(0,0,0,0.6)]">
                <Image src="/StandardB.png" alt="Booster Standard" fill className="object-contain" />
              </div>
              <div className="w-[150px] h-[215px] relative z-10 drop-shadow-[0_22px_26px_rgba(0,0,0,0.7)] animate-[float-soft_6s_ease-in-out_infinite]">
                <Image src="/LegendaireB.png" alt="Booster Légendaire" fill className="object-contain" />
              </div>
              <div className="w-[110px] h-[158px] relative rotate-12 -translate-x-6 drop-shadow-[0_18px_22px_rgba(0,0,0,0.6)]">
                <Image src="/MythiqueB.png" alt="Booster Mythique" fill className="object-contain" />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border-2 border-white/5 bg-[#111118] p-6 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <h3 className="font-outfit text-lg font-black text-white">Activité du serveur</h3>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-[pulse-dot_1.4s_infinite_ease-in-out]" />
                Live
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              {recentActivities.map((act) => {
                const Icon = act.icon;
                return (
                  <div key={act.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-black/30 border border-white/5">
                    <span className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${act.iconBg}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">{act.name} · {act.game}</p>
                      <p className="text-[11px] font-medium text-zinc-400 truncate">{act.detail}</p>
                    </div>
                    <span className={`font-outfit text-xs sm:text-sm font-black tracking-wider ${act.textColor}`}>
                      {act.amount}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <Link
            href="/cards"
            className="flex items-center justify-between pt-3 border-t border-white/5 text-xs font-black text-purple-400 hover:text-purple-300 transition-colors"
          >
            <span>Voir le catalogue des cartes</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="font-outfit text-xl sm:text-2xl font-black text-white">Disponibles maintenant</h2>
        <span className="text-xs font-bold text-zinc-400">{AVAILABLE_GAMES.length} jeux</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-12">
        {AVAILABLE_GAMES.map((game) => {
          const Icon = game.icon;
          return (
            <Link key={game.id} href={game.href} className="group block h-full">
              <div
                className={`relative overflow-hidden h-full rounded-2xl border-2 border-white/5 ${game.hoverBorder} bg-[#111118] p-5 flex flex-col justify-between gap-4 transition-all duration-200 group-hover:-translate-y-1 shadow-sm`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${game.color} opacity-35 pointer-events-none`} />

                <div className="relative z-10 flex items-center justify-between">
                  <span className={`w-11 h-11 rounded-xl border border-white/5 flex items-center justify-center ${game.iconBg}`}>
                    <Icon className="w-5 h-5" />
                  </span>

                  {game.extraAsset ? (
                    <Image src={game.extraAsset} alt="Asset" width={26} height={26} className="object-contain opacity-90" />
                  ) : game.badge ? (
                    <span className={`font-outfit text-xs font-black flex items-center gap-1.5 ${game.badgeColor}`}>
                      {game.livePulse && (
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-[pulse-dot_1.4s_infinite]" />
                      )}
                      {game.badge}
                    </span>
                  ) : null}
                </div>

                <div className="relative z-10">
                  <h3 className="font-outfit text-lg font-black text-white group-hover:text-purple-300 transition-colors">
                    {game.title}
                  </h3>
                  <p className="text-xs font-bold text-purple-400 uppercase tracking-wider mt-0.5">
                    {game.tagline}
                  </p>
                </div>

                <div className="relative z-10 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-400">{game.ratio}</span>
                  <span className="font-bold text-purple-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Jouer
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="font-outfit text-xl sm:text-2xl font-black text-white">Bientôt disponible</h2>
        <span className="text-xs font-bold text-zinc-400">{UPCOMING_GAMES.length} jeux en préparation</span>
      </div>

      <div className="flex flex-col gap-3 mb-12">
        {UPCOMING_GAMES.map((game) => {
          const Icon = game.icon;
          return (
            <div
              key={game.id}
              className="flex flex-wrap items-center gap-4 p-4 sm:px-5 rounded-2xl border-2 border-white/5 bg-[#111118]/60"
            >
              <span className="w-10 h-10 rounded-xl border border-white/5 bg-black/30 flex items-center justify-center shrink-0">
                <Icon className={`w-5 h-5 ${game.iconColor}`} />
              </span>
              <div className="min-w-[180px] flex-1">
                <h4 className="font-outfit text-base font-black text-white">{game.title}</h4>
                <p className="text-xs sm:text-sm text-zinc-400 font-medium">{game.desc}</p>
              </div>
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${game.badgeStyle}`}
              >
                {game.badge}
              </span>
              <button
                type="button"
                className="px-4 py-2 rounded-xl border-2 border-white/10 bg-black/35 text-slate-200 font-outfit font-bold text-xs hover:border-[#7a1fa2] hover:text-white transition-colors cursor-pointer"
              >
                Me prévenir
              </button>
            </div>
          );
        })}
      </div>

      <div className="p-6 sm:p-8 rounded-3xl border-2 border-white/5 bg-[#111118] flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4 min-w-[280px] flex-1">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-outfit font-black text-lg text-white">Système Provably Fair & ParaCoins</h4>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl leading-relaxed mt-0.5">
              Tous les tirages et calculs de probabilités sont validés côté serveur. Les ParaCoins sont la monnaie virtuelle interne du serveur Paranoia.
            </p>
          </div>
        </div>

        <Link
          href="/cards"
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-outfit font-bold text-sm border-2 border-[#7a1fa2] bg-[#111118] text-white shadow-[6px_6px_0px_0px_#7a1fa2] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[#7a1fa2] transition-all shrink-0"
        >
          <Sparkles className="w-4 h-4 text-purple-400" />
          Ouvrir des Boosters TCG
        </Link>
      </div>
    </div>
  );
}

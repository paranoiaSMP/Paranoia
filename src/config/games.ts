import {
  Layers,
  Bomb,
  Rocket,
  Disc,
  Spade,
  Coins,
  Dices,
  CircleDot,
  type LucideIcon,
} from "lucide-react";

export interface GameDef {
  id: string;
  title: string;
  tagline: string;
  href: string;
  ratio: string;
  shortRatio: string;
  icon: LucideIcon;
  color: string;
  hoverBorder: string;
  iconBg: string;
  badge?: string;
  badgeColor?: string;
  extraAsset?: string;
  livePulse?: boolean;
}

export const AVAILABLE_GAMES: GameDef[] = [
  {
    id: "tcg",
    title: "Trading Cards",
    tagline: "Boosters & Collection",
    href: "/cards",
    ratio: "Commune → Mythique",
    shortRatio: "TCG",
    badge: "Populaire",
    badgeColor: "text-[#34d399]",
    icon: Layers,
    color: "from-purple-500/20 to-fuchsia-500/10",
    hoverBorder: "hover:border-purple-500/50",
    iconBg: "bg-purple-500/15 border-purple-500/30 text-purple-400",
  },
  {
    id: "mines",
    title: "Mines",
    tagline: "Démineur à gains",
    href: "/jeux/mines",
    ratio: "Grille 5×5",
    shortRatio: "5×5",
    icon: Bomb,
    color: "from-red-500/20 to-orange-500/10",
    hoverBorder: "hover:border-red-500/50",
    iconBg: "bg-red-500/15 border-red-500/30 text-red-300",
    extraAsset: "/netherite.png",
  },
  {
    id: "crash",
    title: "Crash",
    tagline: "Fusée & Multiplicateur",
    href: "/jeux/crash",
    ratio: "Jusqu'à x100+",
    shortRatio: "x100+",
    badge: "Live",
    livePulse: true,
    badgeColor: "text-red-300",
    icon: Rocket,
    color: "from-blue-500/20 to-indigo-500/10",
    hoverBorder: "hover:border-blue-500/50",
    iconBg: "bg-blue-500/15 border-blue-500/30 text-blue-400",
  },
  {
    id: "roulette",
    title: "Roulette",
    tagline: "Rouge, Noir ou Vert",
    href: "/jeux/roulette",
    ratio: "Rouge x2 • Vert x14",
    shortRatio: "x14",
    badge: "x14 max",
    badgeColor: "text-[#34d399]",
    icon: Disc,
    color: "from-violet-500/20 to-purple-500/10",
    hoverBorder: "hover:border-violet-500/50",
    iconBg: "bg-violet-500/15 border-violet-500/30 text-violet-400",
  },
  {
    id: "blackjack",
    title: "Blackjack 21",
    tagline: "Battez le Croupier",
    href: "/jeux/blackjack",
    ratio: "1:1 • Blackjack 3:2",
    shortRatio: "3:2",
    badge: "3:2",
    badgeColor: "text-zinc-400",
    icon: Spade,
    color: "from-amber-500/20 to-purple-500/10",
    hoverBorder: "hover:border-amber-500/50",
    iconBg: "bg-amber-500/15 border-amber-500/30 text-amber-400",
  },
];

export interface UpcomingGameDef {
  id: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  iconColor: string;
  badge: string;
  badgeStyle: string;
}

export const UPCOMING_GAMES: UpcomingGameDef[] = [
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

export const QUICK_BET_CHIPS = [10, 50, 100, 250, 500, 1000] as const;
export type QuickBetChip = (typeof QUICK_BET_CHIPS)[number];

export const QUICK_MINES = [1, 3, 5, 10, 20] as const;

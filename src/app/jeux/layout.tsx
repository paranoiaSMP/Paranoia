import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Jeux",
  description: "Le casino de Paranoia Studio en ParaCoins : Crash et Roulette en direct avec la communauté, Mines et Blackjack en solo.",
  path: "/jeux",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

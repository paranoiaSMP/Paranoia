import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Blackjack",
  description: "Toi contre le croupier, blackjack payé 3 pour 2. Partie en solo sur Paranoia Studio, en ParaCoins.",
  path: "/jeux/blackjack",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

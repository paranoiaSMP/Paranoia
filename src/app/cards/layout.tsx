import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Cartes et boosters",
  description: "Quatre boosters, six raretés : ouvre des boosters avec tes ParaCoins et collectionne les cartes aux couleurs des joueurs de Paranoia Studio.",
  path: "/cards",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

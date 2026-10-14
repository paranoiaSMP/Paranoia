import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Mines",
  description: "Une grille de 25 cases : évite les mines et encaisse quand tu veux. Partie en solo sur Paranoia Studio, en ParaCoins.",
  path: "/jeux/mines",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

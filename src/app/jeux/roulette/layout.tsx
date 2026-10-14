import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Roulette",
  description: "Rouge, noir ou vert : le vert paie ×14. Roulette en direct avec la communauté Paranoia Studio, en ParaCoins.",
  path: "/jeux/roulette",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

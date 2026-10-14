import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Support",
  description: "Ouvre un ticket auprès du staff de Paranoia Studio : aide, bug sur le site, launcher, ParaCoins et boosters, signalement d'un joueur.",
  path: "/support",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

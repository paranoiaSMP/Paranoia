import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Crash",
  description: "Le multiplicateur grimpe, encaisse avant le crash. Une partie en direct avec toute la communauté Paranoia Studio, en ParaCoins.",
  path: "/jeux/crash",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

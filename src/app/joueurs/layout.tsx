import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Joueurs",
  description: "Parcours les profils de la communauté Paranoia Studio : niveaux, collections de cartes et pseudos.",
  path: "/joueurs",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

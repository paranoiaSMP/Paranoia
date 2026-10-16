import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Échanges",
  description: "Échange des cartes TCG avec les autres joueurs de Paranoia Studio. Cartes contre cartes, valeur affichée en ParaCoins.",
  path: "/jeux/echanges",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

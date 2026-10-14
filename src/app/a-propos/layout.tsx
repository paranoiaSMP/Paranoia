import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Qui sommes-nous",
  description: "Paranoia Studio, une communauté Minecraft et ses projets : des cartes, un casino, un launcher et bientôt un serveur. L'équipe et comment nous contacter.",
  path: "/a-propos",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

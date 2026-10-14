import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Paranoia Client, le launcher Minecraft",
  description: "Le launcher Minecraft du studio : il installe le jeu, les mods et tes cosmétiques, puis te lance en jeu. Bientôt sur Windows et Linux.",
  path: "/launcher",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

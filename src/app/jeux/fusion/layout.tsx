import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Fusion",
  description: "Fusionne tes cartes TCG pour monter leur effet ou fabriquer des cartes exclusives sur Paranoia Studio.",
  path: "/jeux/fusion",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

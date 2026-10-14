import { privateMeta } from "@/lib/seo";

export const metadata = privateMeta("Page introuvable");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

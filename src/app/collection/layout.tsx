import { privateMeta } from "@/lib/seo";

export const metadata = privateMeta("Ma collection");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

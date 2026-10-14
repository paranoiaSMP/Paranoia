import { privateMeta } from "@/lib/seo";

export const metadata = privateMeta("Admin");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

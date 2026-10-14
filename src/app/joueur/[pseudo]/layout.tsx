import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { pageMeta, privateMeta } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ pseudo: string }> }): Promise<Metadata> {
  const { pseudo } = await params;
  const name = decodeURIComponent(pseudo);
  try {
    const user = await prisma.user.findFirst({
      where: { minecraftName: { equals: name, mode: "insensitive" } },
      select: { minecraftName: true, _count: { select: { inventory: true } } },
    });
    if (!user?.minecraftName) return privateMeta("Joueur introuvable");
    const cards = user._count.inventory;
    return pageMeta({
      title: user.minecraftName,
      description: `Profil de ${user.minecraftName} sur Paranoia Studio : niveau sur le Discord et collection de cartes (${cards} carte${cards > 1 ? "s" : ""}).`,
      path: `/joueur/${encodeURIComponent(user.minecraftName)}`,
    });
  } catch {
    return { title: name };
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { SITE_URL } from "@/lib/seo";

const PAGES: { path: string; priority: number; freq: "daily" | "weekly" | "monthly" }[] = [
  { path: "", priority: 1, freq: "weekly" },
  { path: "/cards", priority: 0.9, freq: "weekly" },
  { path: "/jeux", priority: 0.9, freq: "weekly" },
  { path: "/joueurs", priority: 0.6, freq: "daily" },
  { path: "/jeux/crash", priority: 0.7, freq: "monthly" },
  { path: "/jeux/roulette", priority: 0.7, freq: "monthly" },
  { path: "/jeux/mines", priority: 0.7, freq: "monthly" },
  { path: "/jeux/blackjack", priority: 0.7, freq: "monthly" },
  { path: "/launcher", priority: 0.8, freq: "monthly" },
  { path: "/a-propos", priority: 0.6, freq: "monthly" },
  { path: "/support", priority: 0.5, freq: "monthly" },
  { path: "/privacy", priority: 0.3, freq: "monthly" },
  { path: "/cgu", priority: 0.3, freq: "monthly" },
  { path: "/mentions-legales", priority: 0.3, freq: "monthly" },
];

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = PAGES.map((p) => ({
    url: `${SITE_URL}${p.path}`,
    changeFrequency: p.freq,
    priority: p.priority,
  }));

  let players: MetadataRoute.Sitemap = [];
  try {
    const users = await prisma.user.findMany({
      where: { minecraftName: { not: null } },
      select: { minecraftName: true },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });
    players = users.map((u) => ({
      url: `${SITE_URL}/joueur/${encodeURIComponent(u.minecraftName!)}`,
      changeFrequency: "weekly" as const,
      priority: 0.4,
    }));
  } catch {
  }
  return [...pages, ...players];
}

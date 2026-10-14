export const siteConfig = {
  name: "Paranoia Studio",
  description: "Studio de création de jeux, TCG et expériences immersives.",
  serverIp: "play.paranoiastudio.fr",
  founder: "Nozaii_TV",
  founderUuid: "831daffb63e543fbb4abaa81c1daea39",
  discordUrl: "https://discord.gg/FP8rYZYRe7",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://paranoiastudio.fr",
  skinCdn: "https://vzge.me",
  discordAvatarFallback: "https://cdn.discordapp.com/embed/avatars/0.png",
} as const;

export type SiteConfig = typeof siteConfig;

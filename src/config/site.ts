export const siteConfig = {
  name: "PARANOIA SMP",
  description: "Serveur Survie Multijoueur Minecraft Privé.",
  serverIp: "play.paranoiasmp.fr",
  discordUrl: "https://discord.gg/paranoiasmp",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://paranoiasmp.fr",
  skinCdn: "https://vzge.me",
  discordAvatarFallback: "https://cdn.discordapp.com/embed/avatars/0.png",
} as const;

export type SiteConfig = typeof siteConfig;

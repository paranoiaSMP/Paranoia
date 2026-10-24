export const SECTIONS = [
  { key: "level", label: "Niveau et XP" },
  { key: "stats", label: "Chiffres de collection" },
  { key: "rarity", label: "Cartes par rareté" },
  { key: "cards", label: "Meilleures cartes" },
  { key: "cosmetics", label: "Cosmétiques du launcher" },
] as const;

export const BIO_MAX = 200;
export const DEFAULT_ACCENT = "#a78bfa";

/** Luminance relative WCAG d'un `#RRGGBB`. */
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Accent accepté : `#RRGGBB` lisible en texte sur fond noir (contraste >= 4.5). */
export function validAccent(hex: unknown): hex is string {
  return typeof hex === "string" && /^#[0-9a-fA-F]{6}$/.test(hex) && (luminance(hex) + 0.05) / 0.05 >= 4.5;
}

export const TAGLINE_MAX = 40;
export const MAX_LINKS = 4;
const LINK_HOSTS: Record<string, string> = {
  "discord.gg": "Discord", "discord.com": "Discord", "twitch.tv": "Twitch", "youtube.com": "YouTube", "youtu.be": "YouTube",
  "tiktok.com": "TikTok", "x.com": "X", "twitter.com": "X", "instagram.com": "Instagram", "github.com": "GitHub",
};

/** Lien accepté : https vers un réseau connu. Renvoie l'URL normalisée, sinon null. */
export function cleanLink(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length > 200) return null;
  try {
    const u = new URL(raw.trim());
    const host = u.hostname.replace(/^www\./, "");
    return u.protocol === "https:" && !u.username && !u.password && LINK_HOSTS[host] ? u.toString() : null;
  } catch {
    return null;
  }
}

export const linkLabel = (url: string) => LINK_HOSTS[new URL(url).hostname.replace(/^www\./, "")] ?? url;

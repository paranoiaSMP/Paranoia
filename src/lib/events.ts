export const EVENT_MODES = ["auto", "off", "halloween", "noel", "valentin", "paques", "nouvel-an"] as const;
export type EventMode = (typeof EVENT_MODES)[number];
export type SiteEvent = Exclude<EventMode, "auto" | "off"> | null;

// Autonome : sérialisée telle quelle dans le script d'en-tête (eventScript), donc aucune référence externe.
export function eventFor(mode: string | null | undefined, date: Date): SiteEvent {
  if (mode === "halloween" || mode === "noel" || mode === "valentin" || mode === "paques" || mode === "nouvel-an") return mode;
  if (mode === "off") return null;
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const a = y % 19, b = Math.floor(y / 100), c = y % 100;
  const g = Math.floor((b - Math.floor((b + 8) / 25) + 1) / 3);
  const h = (19 * a + b - Math.floor(b / 4) - g + 15) % 30;
  const l = (32 + 2 * (b % 4) + 2 * Math.floor(c / 4) - h - (c % 4)) % 7;
  const k = h + l - 7 * Math.floor((a + 11 * h + 22 * l) / 451);
  const easter = new Date(y, Math.floor((k + 114) / 31) - 1, ((k + 114) % 31) + 1).getTime();
  if (Math.abs(new Date(y, m - 1, d).getTime() - easter) <= 7 * 864e5) return "paques";
  if ((m === 12 && d >= 31) || (m === 1 && d <= 2)) return "nouvel-an";
  if ((m === 10 && d >= 15) || (m === 11 && d <= 2)) return "halloween";
  if (m === 12 || (m === 1 && d <= 6)) return "noel";
  if (m === 2 && d >= 7 && d <= 14) return "valentin";
  return null;
}

export const eventScript = (mode: string) =>
  `try{var e=(${eventFor.toString()})(${JSON.stringify(mode)},new Date());if(e)document.documentElement.setAttribute("data-event",e)}catch(e){}`;

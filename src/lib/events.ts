export const EVENT_MODES = ["auto", "off", "halloween", "noel"] as const;
export type EventMode = (typeof EVENT_MODES)[number];
export type SiteEvent = "halloween" | "noel" | null;

export function eventFor(mode: string | null | undefined, date: Date): SiteEvent {
  if (mode === "halloween" || mode === "noel") return mode;
  if (mode === "off") return null;
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if ((m === 10 && d >= 15) || (m === 11 && d <= 2)) return "halloween";
  if (m === 12 || (m === 1 && d <= 6)) return "noel";
  return null;
}

export const eventScript = (mode: string) =>
  `try{var e=(${eventFor.toString()})(${JSON.stringify(mode)},new Date());if(e)document.documentElement.setAttribute("data-event",e)}catch(e){}`;

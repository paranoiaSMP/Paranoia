import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date))
}

export function formatRelativeTime(date: Date | string) {
  const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
  const timeMs = typeof date === "string" ? new Date(date).getTime() : date.getTime();
  const deltaDays = Math.round((timeMs - Date.now()) / (1000 * 3600 * 24));
  if (Math.abs(deltaDays) > 7) {
    return formatDate(date);
  }
  return rtf.format(deltaDays, "day");
}
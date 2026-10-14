import { prisma } from "@/lib/db";

const TTL_MS = 10_000;

declare global {
  var __maintenanceCache: { value: boolean; at: number } | undefined;
}

export async function isSiteClosed(): Promise<boolean> {
  const c = globalThis.__maintenanceCache;
  if (c && Date.now() - c.at < TTL_MS) return c.value;
  let value = false;
  try {
    const s = await prisma.systemSetting.findUnique({ where: { key: "maintenance" } });
    value = s?.value === "on";
  } catch {
    value = c?.value ?? false;
  }
  globalThis.__maintenanceCache = { value, at: Date.now() };
  return value;
}

export function clearMaintenanceCache() {
  globalThis.__maintenanceCache = undefined;
}

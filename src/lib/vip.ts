export const isVip = (until: Date | string | null | undefined) =>
  !!until && new Date(until).getTime() > Date.now();

// Prolonge depuis l'expiration en cours si le VIP est encore actif.
export function extendVip(until: Date | null, days: number) {
  const base = until && until.getTime() > Date.now() ? until.getTime() : Date.now();
  return new Date(base + days * 86_400_000);
}

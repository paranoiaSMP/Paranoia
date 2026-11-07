declare global {
  var __rateBuckets: Map<string, number[]> | undefined;
}
const buckets = (globalThis.__rateBuckets ??= new Map<string, number[]>());

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
  }
  return true;
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}

/** Anti-scrap des GET publics : renvoie une réponse 429 si l'IP dépasse `max` appels par minute, sinon null. */
export function scrapeGuard(req: Request, name: string, max = 60): Response | null {
  if (rateLimit(`scrape:${name}:${clientIp(req)}`, max, 60_000)) return null;
  return Response.json({ error: "Trop de requêtes, ralentis." }, { status: 429, headers: { "Retry-After": "60" } });
}

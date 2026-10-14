import crypto from "crypto";

const BOOT = Date.now();
const MAX_AGE_MS = 60 * 60 * 1000;

function key(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET manquant : impossible de sceller l'état de jeu.");
  return crypto.createHash("sha256").update(`games:${secret}`).digest();
}

declare global {
  var __consumedGameNonces: Map<string, number> | undefined;
}
const consumed = (globalThis.__consumedGameNonces ??= new Map<string, number>());

function sweep() {
  const limit = Date.now() - MAX_AGE_MS;
  for (const [n, t] of consumed) if (t < limit) consumed.delete(n);
}

type Envelope<T> = { s: T; n: string; t: number };

export function seal<T>(state: T): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const env: Envelope<T> = { s: state, n: crypto.randomUUID(), t: Date.now() };
  const data = Buffer.concat([cipher.update(JSON.stringify(env), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64url");
}

export function openOnce<T>(token: unknown): T | null {
  if (typeof token !== "string" || token.length < 40) return null;
  try {
    const raw = Buffer.from(token, "base64url");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key(), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const json = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
    const env = JSON.parse(json) as Envelope<T>;
    if (env.t < BOOT || Date.now() - env.t > MAX_AGE_MS) return null;
    if (consumed.has(env.n)) return null;
    consumed.set(env.n, env.t);
    if (consumed.size > 5000) sweep();
    return env.s;
  } catch {
    return null;
  }
}

import crypto from "crypto";

export function safeEqual(received: unknown, expected: string | undefined): boolean {
  if (!expected || typeof received !== "string" || !received) return false;
  const a = crypto.createHash("sha256").update(received).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

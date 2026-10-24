import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif" };
const ROOT = path.join(process.cwd(), "public", "uploads");

// Next ne sert pas les fichiers ajoutés à public/ après le démarrage : on lit le disque nous-mêmes.
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const file = path.resolve(ROOT, ...(await params).path);
  const type = TYPES[path.extname(file).toLowerCase()];
  if (!file.startsWith(ROOT + path.sep) || !type || !fs.existsSync(file)) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(fs.readFileSync(file)), { headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable" } });
}

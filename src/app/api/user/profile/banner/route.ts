import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadBufferToR2 } from "@/lib/r2";

const ALLOWED: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const MAX_BYTES = 2 * 1024 * 1024;

/** Envoie sa bannière de profil (image fixe, 2 Mo max). */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const file = (await req.formData().catch(() => null))?.get("file");
  if (!file || typeof file === "string") return NextResponse.json({ error: "Aucun fichier" }, { status: 400 });
  if (!ALLOWED[file.type]) return NextResponse.json({ error: "PNG, JPEG ou WebP uniquement" }, { status: 415 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image trop lourde (2 Mo maximum)" }, { status: 413 });

  try {
    const url = await uploadBufferToR2(Buffer.from(await file.arrayBuffer()), `banner.${ALLOWED[file.type]}`, file.type, `banner-${session.user.id}`);
    if (!url) return NextResponse.json({ error: "Le serveur ne peut pas enregistrer l'image" }, { status: 500 });
    await prisma.user.update({ where: { id: session.user.id }, data: { profileBanner: url } });
    return NextResponse.json({ url });
  } catch (error) {
    console.error("[BANNER_POST]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  await prisma.user.update({ where: { id: session.user.id }, data: { profileBanner: null } });
  return NextResponse.json({ ok: true });
}

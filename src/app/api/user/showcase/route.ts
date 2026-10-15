import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const MAX_SHOWCASE = 5;

/** Choisit les cartes mises en avant sur son profil (liste vide = tri automatique par rareté). */
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const ids: unknown = body?.ids;
  if (!Array.isArray(ids) || ids.some((i) => typeof i !== "string")) {
    return NextResponse.json({ error: "Liste invalide" }, { status: 400 });
  }
  const unique = [...new Set(ids as string[])].slice(0, MAX_SHOWCASE);

  try {
    // Seules les cartes que le joueur possède sont acceptées.
    const owned = await prisma.userCard.findMany({ where: { userId: session.user.id, id: { in: unique } }, select: { id: true } });
    const ok = new Set(owned.map((c) => c.id));
    const showcase = unique.filter((id) => ok.has(id));
    await prisma.user.update({ where: { id: session.user.id }, data: { showcase } });
    return NextResponse.json({ showcase });
  } catch (error) {
    console.error("[SHOWCASE_PUT]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

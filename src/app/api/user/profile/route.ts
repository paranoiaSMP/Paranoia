import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BIO_MAX, MAX_LINKS, SECTIONS, TAGLINE_MAX, cleanLink, validAccent } from "@/lib/profile";

/** Personnalisation de son propre profil : accent, bio, sections masquées. Les champs absents ne changent pas. */
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const data: { profileAccent?: string | null; profileBio?: string | null; profileHidden?: string[]; profileTagline?: string | null; profileLinks?: string[] } = {};

  if ("accent" in (body ?? {})) {
    if (body.accent !== null && !validAccent(body.accent)) {
      return NextResponse.json({ error: "Couleur invalide ou trop sombre pour un fond noir" }, { status: 400 });
    }
    data.profileAccent = body.accent;
  }
  if ("bio" in (body ?? {})) {
    const bio = typeof body.bio === "string" ? body.bio.trim() : "";
    if (bio.length > BIO_MAX) return NextResponse.json({ error: `Bio limitée à ${BIO_MAX} caractères` }, { status: 400 });
    data.profileBio = bio || null;
  }
  if ("tagline" in (body ?? {})) {
    const t = typeof body.tagline === "string" ? body.tagline.trim() : "";
    if (t.length > TAGLINE_MAX) return NextResponse.json({ error: `Titre limité à ${TAGLINE_MAX} caractères` }, { status: 400 });
    data.profileTagline = t || null;
  }
  if ("links" in (body ?? {})) {
    const links = Array.isArray(body.links) ? (body.links as unknown[]).map(cleanLink) : null;
    if (!links || links.length > MAX_LINKS || links.some((l: string | null) => !l)) {
      return NextResponse.json({ error: "Liens invalides : https vers Discord, Twitch, YouTube, TikTok, X, Instagram ou GitHub" }, { status: 400 });
    }
    data.profileLinks = [...new Set(links as string[])];
  }
  if ("hidden" in (body ?? {})) {
    const keys: string[] = SECTIONS.map((s) => s.key);
    if (!Array.isArray(body.hidden) || body.hidden.some((k: unknown) => typeof k !== "string" || !keys.includes(k))) {
      return NextResponse.json({ error: "Sections invalides" }, { status: 400 });
    }
    data.profileHidden = [...new Set(body.hidden as string[])];
  }

  try {
    await prisma.user.update({ where: { id: session.user.id }, data });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PROFILE_PUT]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

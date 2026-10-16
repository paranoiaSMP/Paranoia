import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fetchProfileByName, linkUserToProfile, uuidForms } from "@/lib/mojang";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Non autorisé", { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const minecraftName = typeof body.minecraftName === "string" ? body.minecraftName.trim() : "";

    if (!/^[A-Za-z0-9_]{3,16}$/.test(minecraftName)) {
      return new NextResponse("Pseudo invalide : 3 à 16 caractères, lettres, chiffres ou _.", { status: 400 });
    }

    const profile = await fetchProfileByName(minecraftName);
    if (!profile) {
      return new NextResponse("Pseudo Minecraft introuvable chez Mojang.", { status: 404 });
    }

    const result = await linkUserToProfile(session.user.id, profile);
    if (result === "taken") {
      return new NextResponse("Ce compte Minecraft est déjà lié à un autre compte du site.", { status: 409 });
    }

    return NextResponse.json({ success: true, minecraftName: profile.name, uuid: profile.id });
  } catch (error) {
    if ((error as { code?: string })?.code === "P2002") {
      return new NextResponse("Ce compte Minecraft est déjà lié à un autre compte du site.", { status: 409 });
    }
    console.error("[SETUP_POST]", error);
    return new NextResponse("Erreur interne, réessaie dans un instant.", { status: 500 });
  }
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse("Non autorisé", { status: 401 });
  }
  try {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { minecraftUuid: true } });
    if (!user?.minecraftUuid) {
      return new NextResponse("Aucun compte Minecraft n'est lié.", { status: 400 });
    }
    // Délier ne doit pas servir à échapper à un ban en cours.
    const banned = await prisma.ban.findFirst({ where: { isActive: true, player: { uuid: { in: uuidForms(user.minecraftUuid) } } }, select: { id: true } });
    if (banned) {
      return new NextResponse("Ce compte Minecraft est banni : impossible de le délier.", { status: 403 });
    }
    await prisma.user.update({ where: { id: session.user.id }, data: { minecraftName: null, minecraftUuid: null, isMcVerified: false } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SETUP_DELETE]", error);
    return new NextResponse("Erreur interne, réessaie dans un instant.", { status: 500 });
  }
}

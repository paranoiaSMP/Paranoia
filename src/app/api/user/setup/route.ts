import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { fetchProfileByName, linkUserToProfile } from "@/lib/mojang";

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

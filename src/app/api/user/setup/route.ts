import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return new NextResponse("Non autorisé", { status: 401 });
    }

    const body = await req.json();
    const { minecraftName } = body;

    if (!minecraftName || minecraftName.length < 3) {
      return new NextResponse("Pseudo invalide", { status: 400 });
    }

    // Fetch the UUID from Mojang API
    const mojangRes = await fetch(`https://api.mojang.com/users/profiles/minecraft/${minecraftName}`);
    if (!mojangRes.ok) {
      return new NextResponse("Pseudo Minecraft introuvable", { status: 404 });
    }
    
    const mojangData = await mojangRes.json();
    let uuid = mojangData.id;
    
    // Format the UUID with dashes
    if (uuid && uuid.length === 32) {
      uuid = `${uuid.slice(0, 8)}-${uuid.slice(8, 12)}-${uuid.slice(12, 16)}-${uuid.slice(16, 20)}-${uuid.slice(20)}`;
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { 
        minecraftName: mojangData.name,
        minecraftUuid: uuid,
        isMcVerified: true
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SETUP_POST]", error);
    return new NextResponse("Erreur interne", { status: 500 });
  }
}
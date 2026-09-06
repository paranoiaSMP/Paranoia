import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // 1. Sécurité : Vérifier que c'est bien le vrai Launcher qui parle
    const authHeader = req.headers.get("x-launcher-secret");
    if (authHeader !== process.env.LAUNCHER_API_SECRET) {
      return new NextResponse("Unauthorized Launcher", { status: 401 });
    }

    const body = await req.json();
    const { hwid, username, uuid } = body;

    if (!hwid || !username) {
      return new NextResponse("Missing hwid or username", { status: 400 });
    }

    // 2. Trouver ou Créer le joueur
    const player = await prisma.player.upsert({
      where: { minecraftName: username },
      update: { 
        hwid: hwid, // Mettre à jour l'HWID à chaque connexion
        ...(uuid && { uuid: uuid }) // Mettre à jour l'UUID s'il est fourni
      },
      create: {
        minecraftName: username,
        hwid: hwid,
        uuid: uuid || null,
        status: "ACTIVE",
      },
    });

    // 3. Vérification des Bans (par Player ID ou par HWID)
    const activeBan = await prisma.ban.findFirst({
      where: {
        isActive: true,
        OR: [
          { playerId: player.id },
          { hwid: hwid }
        ]
      }
    });

    // Cas 3A: Le joueur est banni !
    if (activeBan) {
      // S'assurer que le status global est bien à jour
      if (player.status !== "BANNED") {
        await prisma.player.update({ where: { id: player.id }, data: { status: "BANNED" } });
      }
      
      return NextResponse.json({ 
        banned: true, 
        reason: activeBan.reason,
        bannedAt: activeBan.bannedAt,
        bannedBy: activeBan.bannedBy
      }, { status: 403 });
    }

    // Cas 3B: Le joueur est autorisé !
    // Si on a retiré un ban, on remet le statut ACTIVE
    if (player.status === "BANNED") {
      await prisma.player.update({ where: { id: player.id }, data: { status: "ACTIVE" } });
    }

    // Génération d'un token WSS (Pour l'instant un placeholder en attendant le serveur Socket)
    const wssToken = `WSS_${player.id}_${Date.now()}`;

    return NextResponse.json({ 
      banned: false, 
      token: wssToken,
      wssUrl: "ws://localhost:8080" // À remplacer par l'URL de ton serveur WebSocket plus tard
    });

  } catch (error) {
    console.error("[LAUNCHER_VERIFY_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

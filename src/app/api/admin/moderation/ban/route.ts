import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "MODERATOR")) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { playerId, reason } = await req.json();

    if (!playerId || !reason) {
      return new NextResponse("Missing data", { status: 400 });
    }

    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) return new NextResponse("Player not found", { status: 404 });

    // Enregistrer le ban
    const ban = await prisma.ban.create({
      data: {
        playerId: player.id,
        hwid: player.hwid, // On ban la machine associée
        reason: reason,
        bannedBy: session.user.name || "Staff Inconnu"
      }
    });

    await prisma.player.update({
      where: { id: player.id },
      data: { status: "BANNED" }
    });

    // TODO: Envoi du Packet Kick (RCON au serveur Minecraft)
    // TODO: Envoi de l'event WSS "FORCE_TERMINATE" au Launcher

    return NextResponse.json({ success: true, ban });
  } catch (error) {
    console.error("[BAN_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

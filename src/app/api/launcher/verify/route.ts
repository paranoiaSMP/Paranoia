import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {

    const authHeader = req.headers.get("x-launcher-secret");
    if (authHeader !== process.env.LAUNCHER_API_SECRET) {
      return new NextResponse("Unauthorized Launcher", { status: 401 });
    }

    const body = await req.json();
    const { hwid, username, uuid } = body;

    if (!hwid || !username) {
      return new NextResponse("Missing hwid or username", { status: 400 });
    }

    const player = await prisma.player.upsert({
      where: { minecraftName: username },
      update: { 
        hwid: hwid, 
        ...(uuid && { uuid: uuid }) 
      },
      create: {
        minecraftName: username,
        hwid: hwid,
        uuid: uuid || null,
        status: "ACTIVE",
      },
    });

    const activeBan = await prisma.ban.findFirst({
      where: {
        isActive: true,
        OR: [
          { playerId: player.id },
          { hwid: hwid }
        ]
      }
    });

    if (activeBan) {

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

    if (player.status === "BANNED") {
      await prisma.player.update({ where: { id: player.id }, data: { status: "ACTIVE" } });
    }

    const wssToken = `WSS_${player.id}_${Date.now()}`;

    return NextResponse.json({ 
      banned: false, 
      token: wssToken,
      wssUrl: "ws://localhost:8080" 
    });

  } catch (error) {
    console.error("[LAUNCHER_VERIFY_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

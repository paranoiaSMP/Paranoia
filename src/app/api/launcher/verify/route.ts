import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { safeEqual } from "@/lib/secrets";
import { normalizeUuid, uuidForms } from "@/lib/mojang";

export async function POST(req: Request) {
  try {
    if (!safeEqual(req.headers.get("x-launcher-secret"), process.env.LAUNCHER_API_SECRET)) {
      return new NextResponse("Unauthorized Launcher", { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const hwid = typeof body.hwid === "string" ? body.hwid.slice(0, 200) : "";
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const rawUuid = typeof body.uuid === "string" && /^[0-9a-fA-F-]{32,36}$/.test(body.uuid) ? body.uuid : null;

    if (!hwid || !/^[A-Za-z0-9_]{3,16}$/.test(username)) {
      return new NextResponse("Missing hwid or username", { status: 400 });
    }

    const uuid = rawUuid ? normalizeUuid(rawUuid) : null;
    let player = uuid ? await prisma.player.findFirst({ where: { uuid: { in: uuidForms(uuid) } } }) : null;
    if (!player) player = await prisma.player.findUnique({ where: { minecraftName: username } });

    if (player) {
      const uuidConflict = !!(uuid && player.uuid && normalizeUuid(player.uuid) !== uuid);
      if (uuidConflict) {
        return new NextResponse("UUID mismatch", { status: 409 });
      }
      player = await prisma.player.update({
        where: { id: player.id },
        data: { hwid, ...(uuid && !player.uuid ? { uuid } : {}) },
      });
    } else {
      player = await prisma.player.create({
        data: { minecraftName: username, hwid, uuid, status: "ACTIVE" },
      });
    }

    const activeBan = await prisma.ban.findFirst({
      where: { isActive: true, OR: [{ playerId: player.id }, { hwid }] },
    });

    if (activeBan) {
      if (player.status !== "BANNED") {
        await prisma.player.update({ where: { id: player.id }, data: { status: "BANNED" } });
      }
      return NextResponse.json(
        { banned: true, reason: activeBan.reason, bannedAt: activeBan.bannedAt, bannedBy: activeBan.bannedBy },
        { status: 403 }
      );
    }

    if (player.status === "BANNED") {
      await prisma.player.update({ where: { id: player.id }, data: { status: "ACTIVE" } });
    }

    const wssToken = `WSS_${player.id}_${Date.now()}`;
    return NextResponse.json({ banned: false, token: wssToken, wssUrl: "ws://localhost:8080" });
  } catch (error) {
    console.error("[LAUNCHER_VERIFY_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

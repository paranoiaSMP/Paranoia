import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { normalizeUuid, uuidForms } from "@/lib/mojang";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const hwid = typeof body.hwid === "string" ? body.hwid.slice(0, 200) : "";
    const accessToken = typeof body.accessToken === "string" ? body.accessToken : "";

    if (!hwid || !accessToken) {
      return new NextResponse("Missing hwid or accessToken", { status: 400 });
    }

    // L'identite vient de Mojang, jamais du client: un launcher modifie ne peut
    // ni usurper un compte ni contourner un ban en changeant son UUID.
    const profileRes = await fetch("https://api.minecraftservices.com/minecraft/profile", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!profileRes.ok) {
      return new NextResponse("Invalid Minecraft session", { status: 401 });
    }
    const profile = (await profileRes.json()) as { id?: string; name?: string };
    if (!profile.id || !profile.name) {
      return new NextResponse("Invalid Minecraft profile", { status: 401 });
    }
    const uuid = normalizeUuid(profile.id);
    const username = profile.name;
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
        // `permanent` vient du choix de l'admin: seul un ban definitif desinstalle le launcher.
        { banned: true, permanent: activeBan.permanent, reason: activeBan.reason, bannedAt: activeBan.bannedAt, bannedBy: activeBan.bannedBy },
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

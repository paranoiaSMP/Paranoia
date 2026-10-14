import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { normalizeUuid, uuidForms } from "@/lib/mojang";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const uuid = url.searchParams.get("uuid") ?? "";
    const username = url.searchParams.get("username") ?? "";

    if (!/^[0-9a-fA-F-]{32,36}$/.test(uuid) || !/^[A-Za-z0-9_]{3,16}$/.test(username)) {
      return new NextResponse("Missing uuid or username", { status: 400 });
    }

    const player =
      (await prisma.player.findFirst({ where: { uuid: { in: uuidForms(normalizeUuid(uuid)) } }, select: { status: true } })) ??
      (await prisma.player.findFirst({ where: { minecraftName: username, uuid: null }, select: { status: true } }));

    if (player?.status === "BANNED") {
      return NextResponse.json({ banned: true, reason: "Banni par un administrateur." });
    }
    return NextResponse.json({ banned: false });
  } catch (error) {
    console.error("[BAN_CHECK]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

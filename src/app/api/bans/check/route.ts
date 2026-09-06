import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const uuid = url.searchParams.get("uuid");
    const username = url.searchParams.get("username");

    if (!uuid || !username) {
      return new NextResponse("Missing uuid or username", { status: 400 });
    }

    const authHeader = req.headers.get("x-launcher-secret");
    if (authHeader !== process.env.LAUNCHER_API_SECRET) {
      return new NextResponse("Unauthorized Launcher", { status: 401 });
    }

    // Upsert the Player table directly with the username
    // This way, every time someone launches the game, they are saved in the admin panel
    let player = null;
    if (uuid) {
      player = await prisma.player.findFirst({
        where: { uuid: String(uuid) }
      });
    }

    if (player) {
      if (player.minecraftName !== username) {
        player = await prisma.player.update({
          where: { id: player.id },
          data: { minecraftName: String(username) }
        });
      }
    } else {
      player = await prisma.player.upsert({
        where: { minecraftName: String(username) },
        update: { uuid: uuid ? String(uuid) : undefined },
        create: {
          minecraftName: String(username),
          uuid: uuid ? String(uuid) : undefined,
          status: "ACTIVE",
        },
      });
    }

    // Optionally update the User table if they exist, but we only really need the Player table for bans
    // We can just rely on the Player status for the ban check.

    if (!player) {
      return NextResponse.json({ banned: false });
    }

    if (player.status === "BANNED") {
      return NextResponse.json({ 
        banned: true, 
        reason: "Banni par un administrateur." 
      });
    }

    return NextResponse.json({ banned: false });
  } catch (error) {
    console.error("[BAN_CHECK]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

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

    // Upsert the Player table directly with the username
    // This way, every time someone launches the game, they are saved in the admin panel
    const player = await prisma.player.upsert({
      where: {
        minecraftName: username,
      },
      update: {}, // Don't change anything if they exist
      create: {
        minecraftName: username,
        status: "ACTIVE",
      },
    });

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

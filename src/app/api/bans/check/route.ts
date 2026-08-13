import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const uuid = url.searchParams.get("uuid");

    if (!uuid) {
      return new NextResponse("Missing uuid", { status: 400 });
    }

    // Step 1: Find the user by minecraftUuid to get their minecraftName
    const user = await prisma.user.findUnique({
      where: {
        minecraftUuid: uuid,
      },
    });

    if (!user || !user.minecraftName) {
      // If we don't know this user, they are not banned by our system yet
      return NextResponse.json({ banned: false });
    }

    // Step 2: Check the Player table for ban status
    const player = await prisma.player.findUnique({
      where: {
        minecraftName: user.minecraftName,
      },
    });

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

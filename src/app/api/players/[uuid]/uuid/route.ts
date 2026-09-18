import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest, context: { params: Promise<{ uuid: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "DEV") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { uuid: playerId } = await context.params;
    const body = await req.json();
    const { uuid } = body;

    const player = await prisma.player.findFirst({
      where: {
        OR: [
          { id: playerId },
          { minecraftName: playerId }
        ]
      }
    });

    if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

    await prisma.player.update({
      where: { id: player.id },
      data: { uuid: uuid || null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update UUID error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


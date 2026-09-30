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
    const { playerId } = await req.json();

    if (!playerId) {
      return new NextResponse("Missing data", { status: 400 });
    }

    await prisma.ban.updateMany({
      where: { playerId: playerId, isActive: true },
      data: {
        isActive: false,
        unbannedAt: new Date(),
        unbannedBy: session.user.name || "Staff Inconnu"
      }
    });

    await prisma.player.update({
      where: { id: playerId },
      data: { status: "ACTIVE" }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[UNBAN_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

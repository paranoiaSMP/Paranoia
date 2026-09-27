import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { username, channelId, roleId } = await req.json();

    if (!username || !channelId) {
      return new NextResponse("Paramètres manquants", { status: 400 });
    }

    const cleanUsername = username.trim().replace(/^@/, "");
    const cleanChanId = BigInt(channelId.trim());
    const cleanRoleId = roleId ? BigInt(roleId.trim()) : null;

    await prisma.$executeRaw`
      INSERT INTO tiktok_targets (username, channel_id, role_id, is_live)
      VALUES (${cleanUsername}, ${cleanChanId}, ${cleanRoleId}, FALSE)
      ON CONFLICT (username) DO UPDATE
      SET channel_id = EXCLUDED.channel_id, role_id = EXCLUDED.role_id
    `;

    return NextResponse.json({ success: true, username: cleanUsername });
  } catch (error) {
    console.error("Failed to add TikTok target:", error);
    return new NextResponse("Erreur lors de l'enregistrement", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");

    if (!username) {
      return new NextResponse("Username manquant", { status: 400 });
    }

    await prisma.$executeRaw`
      DELETE FROM tiktok_targets WHERE username = ${username}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete TikTok target:", error);
    return new NextResponse("Erreur lors de la suppression", { status: 500 });
  }
}

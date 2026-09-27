import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "MODERATOR")) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    let discordGatewayInfo = null;
    let isDiscordReachable = false;

    const token = process.env.DISCORD_TOKEN;
    if (token) {
      try {
        const res = await fetch("https://discord.com/api/v10/gateway/bot", {
          headers: {
            Authorization: `Bot ${token}`,
          },
          next: { revalidate: 0 },
        });
        if (res.ok) {
          discordGatewayInfo = await res.json();
          isDiscordReachable = true;
        }
      } catch (err) {
        console.error("Failed to ping Discord Gateway:", err);
      }
    }

    let tiktokTargets: any[] = [];
    try {
      tiktokTargets = await prisma.$queryRaw`
        SELECT username, channel_id::text, role_id::text, last_video_id, is_live
        FROM tiktok_targets
        ORDER BY username ASC
      `;
    } catch {
      tiktokTargets = [];
    }

    let sanctions: any[] = [];
    try {
      sanctions = await prisma.$queryRaw`
        SELECT id, guild_id::text, user_id::text, mod_id::text, sanction_type, duration, reason, created_at, appealed
        FROM sanctions
        ORDER BY created_at DESC
        LIMIT 50
      `;
    } catch {
      sanctions = [];
    }

    let appeals: any[] = [];
    try {
      appeals = await prisma.$queryRaw`
        SELECT a.id, a.sanction_id, a.pseudo_mc, a.arguments, a.status, a.created_at,
               s.sanction_type, s.reason as sanction_reason, s.user_id::text
        FROM appeals a
        LEFT JOIN sanctions s ON a.sanction_id = s.id
        ORDER BY a.created_at DESC
        LIMIT 50
      `;
    } catch {
      appeals = [];
    }

    const pendingAppealsCount = appeals.filter((a) => a.status === "pending").length;
    const liveTiktoksCount = tiktokTargets.filter((t) => t.is_live).length;

    return NextResponse.json({
      status: {
        online: isDiscordReachable,
        gateway: discordGatewayInfo,
        configured: Boolean(token),
        framework: "Rust Twilight 0.17",
      },
      stats: {
        totalSanctions: sanctions.length,
        pendingAppeals: pendingAppealsCount,
        monitoredTiktoks: tiktokTargets.length,
        liveTiktoks: liveTiktoksCount,
      },
      tiktokTargets,
      sanctions,
      appeals,
    });
  } catch (error) {
    console.error("Failed to load bot admin data:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

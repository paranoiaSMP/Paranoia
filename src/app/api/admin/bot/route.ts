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
    let gatewayError: string | null = null;

    const rawToken = process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN;
    const token = rawToken?.trim().replace(/^["']|["']$/g, "").trim();
    const cleanToken = token ? (token.toLowerCase().startsWith("bot ") ? token.slice(4).trim() : token) : "";

    if (cleanToken) {
      try {
        const res = await fetch("https://discord.com/api/v10/gateway/bot", {
          headers: {
            Authorization: `Bot ${cleanToken}`,
          },
          cache: "no-store",
        });
        if (res.ok) {
          discordGatewayInfo = await res.json();
          isDiscordReachable = true;
        } else {
          const errText = await res.text();
          console.error("Discord Gateway ping returned status:", res.status, errText);
          gatewayError = `Erreur ${res.status}: ${res.statusText || errText.slice(0, 50)}`;
        }
      } catch (err: any) {
        console.error("Failed to ping Discord Gateway:", err);
        gatewayError = err?.message || "Erreur réseau";
      }
    } else {
      gatewayError = "DISCORD_TOKEN manquant dans .env";
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
        configured: Boolean(cleanToken),
        error: gatewayError,
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

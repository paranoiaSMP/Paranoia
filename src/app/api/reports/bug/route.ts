import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { siteConfig } from "@/config/site";
import { rateLimit, clientIp } from "@/lib/rateLimit";

const DISCORD_API = "https://discord.com/api/v10";

export async function POST(req: Request) {
  try {
    if (!rateLimit(`bug:${clientIp(req)}`, 5, 10 * 60 * 1000)) {
      return new NextResponse("Trop de rapports, réessaie plus tard.", { status: 429 });
    }
    const body = await req.json().catch(() => ({}));
    const { title, description, category, accountName, logs } = body;
    const systemInfo = typeof body.systemInfo === "object" && body.systemInfo !== null ? body.systemInfo : {};
    const s = (v: unknown, max = 300) => (v ? String(v).slice(0, max) : null);

    if (!title || !description) {
      return new NextResponse("Titre et description requis", { status: 400 });
    }

    const report = await prisma.bugReport.create({
      data: {
        title: String(title).slice(0, 200),
        description: String(description).slice(0, 8000),
        category: s(category, 60) ?? "Crash",
        accountName: s(accountName, 100),
        profileName: s(systemInfo.profileName),
        minecraftVersion: s(systemInfo.minecraftVersion),
        profileType: s(systemInfo.profileType),
        graphicsMode: s(systemInfo.graphicsMode),
        gpu: s(systemInfo.gpu),
        screenResolution: s(systemInfo.screenResolution),
        cpu: s(systemInfo.cpu),
        ramSystem: s(systemInfo.ramSystem),
        ramAllocated: s(systemInfo.ramAllocated),
        osInfo: s(systemInfo.osInfo),
        jvmArgs: s(systemInfo.jvmArgs, 2000),
        javaPath: s(systemInfo.javaPath),
        logs: s(logs, 200_000),
      },
    });

    const isCrash = (category || "").toLowerCase().includes("crash");
    const reportUrl = `${siteConfig.siteUrl}/admin/dev/${report.id}`;

    const discordEmbed = {
      title: isCrash ? "🚨 Une instance a crash !" : "🐛 Nouveau signalement de bug",
      description: `**${report.title}**\n\n${report.description.slice(0, 500)}`,
      color: isCrash ? 0xef4444 : 0x06b6d4,
      fields: [
        {
          name: "👤 Joueur",
          value: report.accountName || "Anonyme",
          inline: true,
        },
        {
          name: "🎮 Instance",
          value: `${report.profileName || "Défaut"} (${report.minecraftVersion || "N/A"})`,
          inline: true,
        },
        {
          name: "🏷️ Catégorie",
          value: report.category,
          inline: true,
        },
        {
          name: "🔗 Rapport DEV",
          value: `[Accéder au rapport](${reportUrl})`,
          inline: false,
        },
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: `Paranoia Client • ID: ${report.id}`,
      },
    };

    const webhookUrl = process.env.BUG_REPORT_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;
    if (webhookUrl && webhookUrl.startsWith("http")) {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embeds: [discordEmbed], allowed_mentions: { parse: [] } }),
      }).catch(() => null);
    } else if (process.env.DISCORD_TOKEN) {
      const channelId =
        process.env.CRASH_CHANNEL_ID ||
        process.env.BUG_REPORT_CHANNEL_ID ||
        process.env.TICKET_LOG_CHANNEL_ID;

      if (channelId) {
        await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ embeds: [discordEmbed] }),
        }).catch(() => null);
      }
    }

    return NextResponse.json({ success: true, id: report.id });
  } catch (error) {
    console.error("[BUG_REPORT_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

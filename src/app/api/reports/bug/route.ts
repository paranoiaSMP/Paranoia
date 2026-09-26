import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { siteConfig } from "@/config/site";

const DISCORD_API = "https://discord.com/api/v10";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, description, category, accountName, systemInfo, logs } = body;

    if (!title || !description) {
      return new NextResponse("Titre et description requis", { status: 400 });
    }

    const report = await prisma.bugReport.create({
      data: {
        title: String(title).slice(0, 200),
        description: String(description).slice(0, 8000),
        category: category ? String(category) : "Crash",
        accountName: accountName ? String(accountName) : null,
        profileName: systemInfo?.profileName ? String(systemInfo.profileName) : null,
        minecraftVersion: systemInfo?.minecraftVersion ? String(systemInfo.minecraftVersion) : null,
        profileType: systemInfo?.profileType ? String(systemInfo.profileType) : null,
        graphicsMode: systemInfo?.graphicsMode ? String(systemInfo.graphicsMode) : null,
        gpu: systemInfo?.gpu ? String(systemInfo.gpu) : null,
        screenResolution: systemInfo?.screenResolution ? String(systemInfo.screenResolution) : null,
        cpu: systemInfo?.cpu ? String(systemInfo.cpu) : null,
        ramSystem: systemInfo?.ramSystem ? String(systemInfo.ramSystem) : null,
        ramAllocated: systemInfo?.ramAllocated ? String(systemInfo.ramAllocated) : null,
        osInfo: systemInfo?.osInfo ? String(systemInfo.osInfo) : null,
        jvmArgs: systemInfo?.jvmArgs ? String(systemInfo.jvmArgs) : null,
        javaPath: systemInfo?.javaPath ? String(systemInfo.javaPath) : null,
        logs: logs ? String(logs) : null,
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
          value: `${report.profileName || "Défaut"} (${report.minecraftVersion || "—"})`,
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
        body: JSON.stringify({ embeds: [discordEmbed] }),
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

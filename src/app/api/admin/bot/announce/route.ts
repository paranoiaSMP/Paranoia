import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "MODERATOR")) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const { channelId, content, pingRole, embed, components } = body;

    if (!channelId) {
      return new NextResponse("Salon manquant", { status: 400 });
    }

    const token = process.env.DISCORD_TOKEN;
    if (!token) {
      return new NextResponse("DISCORD_TOKEN non configuré", { status: 500 });
    }

    let finalContent = content || undefined;
    if (pingRole) {
      finalContent = finalContent ? `<@&${pingRole}> ${finalContent}` : `<@&${pingRole}>`;
    }

    let embedsToSend: any[] = [];

    if (embed) {
      const colorVal =
        typeof embed.color === "string"
          ? parseInt(embed.color.replace("#", ""), 16) || 0x5865f2
          : embed.color || 0x5865f2;

      const formattedEmbed: any = {
        title: embed.title || undefined,
        description: embed.description || undefined,
        url: embed.url || undefined,
        color: colorVal,
        timestamp: embed.timestamp ? new Date().toISOString() : undefined,
      };

      if (embed.author?.name) {
        formattedEmbed.author = {
          name: embed.author.name,
          icon_url: embed.author.icon_url || undefined,
          url: embed.author.url || undefined,
        };
      }

      if (embed.thumbnail?.url) {
        formattedEmbed.thumbnail = { url: embed.thumbnail.url };
      }

      if (embed.image?.url) {
        formattedEmbed.image = { url: embed.image.url };
      }

      if (embed.footer?.text) {
        formattedEmbed.footer = {
          text: embed.footer.text,
          icon_url: embed.footer.icon_url || undefined,
        };
      }

      if (Array.isArray(embed.fields) && embed.fields.length > 0) {
        formattedEmbed.fields = embed.fields
          .filter((f: any) => f.name?.trim() && f.value?.trim())
          .map((f: any) => ({
            name: f.name.trim(),
            value: f.value.trim(),
            inline: Boolean(f.inline),
          }));
      }

      embedsToSend.push(formattedEmbed);
    } else if (body.message) {
      // Legacy fallback
      embedsToSend.push({
        title: body.title || undefined,
        description: body.message,
        color: typeof body.color === "string" ? parseInt(body.color.replace("#", ""), 16) : 0xa855f7,
        footer: { text: "Annonce Officielle · Paranoia Studio" },
        timestamp: new Date().toISOString(),
      });
    }

    // Process V2 Discord Button Components
    let formattedComponents: any[] = [];
    if (Array.isArray(components) && components.length > 0) {
      // Chunk buttons into action rows (max 5 per row, max 5 rows)
      const validButtons = components.filter((b: any) => b.label?.trim() || b.emoji?.trim());
      
      const rows: any[][] = [];
      let currentRow: any[] = [];

      for (const btn of validButtons) {
        if (currentRow.length >= 5) {
          rows.push(currentRow);
          currentRow = [];
        }

        const isLink = btn.style === 5 || btn.style === "link";
        const btnObj: any = {
          type: 2,
          style: isLink ? 5 : Number(btn.style) || 1,
          label: btn.label?.trim() || undefined,
          disabled: Boolean(btn.disabled),
        };

        if (btn.emoji) {
          btnObj.emoji = { name: btn.emoji.trim() };
        }

        if (isLink) {
          btnObj.url = btn.url || "https://paranoia-smp.fr";
        } else {
          btnObj.custom_id = btn.custom_id?.trim() || `btn_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        }

        currentRow.push(btnObj);
      }

      if (currentRow.length > 0) {
        rows.push(currentRow);
      }

      formattedComponents = rows.slice(0, 5).map((r) => ({
        type: 1,
        components: r,
      }));
    }

    const payload: any = {
      content: finalContent,
      embeds: embedsToSend.length > 0 ? embedsToSend : undefined,
      components: formattedComponents.length > 0 ? formattedComponents : undefined,
    };

    const res = await fetch(`https://discord.com/api/v10/channels/${channelId.trim()}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Discord API error:", err);
      return new NextResponse(`Erreur Discord: ${err}`, { status: res.status });
    }

    const sentMessage = await res.json();
    return NextResponse.json({ success: true, messageId: sentMessage.id });
  } catch (error) {
    console.error("Failed to send Discord message:", error);
    return new NextResponse("Erreur interne", { status: 500 });
  }
}

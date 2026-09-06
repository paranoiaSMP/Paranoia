const DISCORD_API = "https://discord.com/api/v10";

function getHeaders() {
  const token = process.env.DISCORD_TOKEN;
  if (!token) return null;
  return {
    Authorization: `Bot ${token}`,
    "Content-Type": "application/json",
  };
}

export async function createDiscordTicketChannel(ticket: {
  id: string;
  ticketId: string;
  userName: string;
  minecraftName?: string;
  category: string;
  description: string;
  details?: string;
}): Promise<string | null> {
  const headers = getHeaders();
  const categoryId = process.env.TICKET_CATEGORY_ID;
  const staffRoleId = process.env.ROLE_STAFF_ID;
  if (!headers || !categoryId) return null;

  try {
    const catRes = await fetch(`${DISCORD_API}/channels/${categoryId}`, { headers });
    if (!catRes.ok) return null;
    const catData = await catRes.json();
    const guildId = catData.guild_id;
    if (!guildId) return null;

    const safeName = (ticket.userName || "ticket")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 16);

    const suffix = ticket.ticketId.slice(-4).toLowerCase();
    const channelName = `ticket-${safeName}-${suffix}`;

    const permissionOverwrites: any[] = [
      {
        id: guildId,
        type: 0,
        deny: "1024",
      },
    ];

    if (staffRoleId) {
      permissionOverwrites.push({
        id: staffRoleId,
        type: 0,
        allow: "3072",
      });
    }

    const createRes = await fetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: channelName,
        type: 0,
        parent_id: categoryId,
        topic: `Ticket ${ticket.ticketId} - ${ticket.category} | ${ticket.userName}`,
        permission_overwrites: permissionOverwrites,
      }),
    });

    if (!createRes.ok) return null;
    const channel = await createRes.json();
    const channelId = channel.id;

    const fields: any[] = [
      { name: "ID Ticket", value: `\`${ticket.ticketId}\``, inline: true },
      { name: "Demandeur", value: ticket.userName, inline: true },
      { name: "Type de demande", value: `\`${ticket.category}\``, inline: true },
      {
        name: "Pseudo Minecraft",
        value: ticket.minecraftName ? `\`${ticket.minecraftName}\`` : "*Non renseigné*",
        inline: true,
      },
      { name: "Provenance", value: "🌐 Site Web (paranoiasmp.fr)", inline: true },
      { name: "Description", value: ticket.description, inline: false },
    ];

    if (ticket.details) {
      fields.push({
        name: "Informations complémentaires",
        value: ticket.details,
        inline: false,
      });
    }

    const embed: any = {
      title: `📩 Nouveau Ticket Web — ${ticket.ticketId}`,
      description: `Ticket ouvert depuis le site web.\nLes réponses écrites ici seront synchronisées sur le site.`,
      color: 0xa855f7,
      fields,
      footer: { text: "Paranoia Studio — Ticket Sync" },
      timestamp: new Date().toISOString(),
    };

    if (ticket.minecraftName) {
      embed.thumbnail = {
        url: `https://vzge.me/face/512/${encodeURIComponent(ticket.minecraftName)}.png`,
      };
    }

    const pingContent = staffRoleId ? `<@&${staffRoleId}>` : "";

    await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        content: pingContent,
        embeds: [embed],
      }),
    });

    return channelId;
  } catch {
    return null;
  }
}

export async function sendDiscordTicketMessage(
  channelId: string,
  authorName: string,
  authorRole: string,
  content: string
): Promise<boolean> {
  const headers = getHeaders();
  if (!headers || !channelId) return false;

  try {
    const roleIcon = authorRole === "STAFF" ? "🛡️ [Staff]" : "👤 [Joueur]";
    const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        content: `${roleIcon} **${authorName}** *(sur le site)* :\n${content}`,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function closeDiscordTicketChannel(channelId: string, closedBy: string): Promise<boolean> {
  const headers = getHeaders();
  if (!headers || !channelId) return false;

  try {
    await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        content: `🔒 **Ticket fermé** sur le site web par **${closedBy}**.\nSuppression du salon dans 5 secondes...`,
      }),
    });

    setTimeout(async () => {
      try {
        await fetch(`${DISCORD_API}/channels/${channelId}`, {
          method: "DELETE",
          headers,
        });
      } catch {}
    }, 5000);

    return true;
  } catch {
    return false;
  }
}

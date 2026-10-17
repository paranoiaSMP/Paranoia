import { getHeaders } from "@/lib/discord-ticket";
import { prisma } from "@/lib/db";

const API = "https://discord.com/api/v10";

/** Envoie un MP Discord à un utilisateur du site. Silencieux si le bot, le compte Discord ou les MP sont indisponibles. */
export async function dmUser(userId: string, content: string) {
  const headers = getHeaders();
  if (!headers) return;
  try {
    const acc = await prisma.account.findFirst({ where: { userId, provider: "discord" }, select: { providerAccountId: true } });
    if (!acc) return;
    const ch = await fetch(`${API}/users/@me/channels`, { method: "POST", headers, body: JSON.stringify({ recipient_id: acc.providerAccountId }) });
    if (!ch.ok) return;
    const { id } = await ch.json();
    await fetch(`${API}/channels/${id}/messages`, { method: "POST", headers, body: JSON.stringify({ content, allowed_mentions: { parse: [] } }) });
  } catch {}
}

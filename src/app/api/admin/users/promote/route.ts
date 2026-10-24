import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAdmin, isOwner } from "@/lib/roles";
import { getHeaders } from "@/lib/discord-ticket";

export const dynamic = "force-dynamic";

const API = "https://discord.com/api/v10";
const ADMINISTRATOR = BigInt(8);

type DiscordRole = { id: string; name: string; color: number; position: number; managed: boolean; permissions: string };

async function guildRoles(headers: Record<string, string>, guildId: string): Promise<DiscordRole[] | null> {
  const res = await fetch(`${API}/guilds/${guildId}/roles`, { headers, cache: "no-store" });
  return res.ok ? res.json() : null;
}

// Rôles attribuables : ni @everyone, ni rôle de bot, ni rôle Administrateur (sauf pour un owner).
function assignable(roles: DiscordRole[], guildId: string, owner: boolean) {
  return roles
    .filter((r) => r.id !== guildId && !r.managed && (owner || (BigInt(r.permissions) & ADMINISTRATOR) === BigInt(0)))
    .sort((a, b) => b.position - a.position);
}

function setup() {
  const headers = getHeaders();
  const guildId = process.env.DISCORD_GUILD_ID?.trim();
  return headers && guildId ? { headers, guildId } : null;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !isAdmin(session.user.role)) return new NextResponse("Unauthorized", { status: 401 });
  const cfg = setup();
  if (!cfg) return new NextResponse("DISCORD_TOKEN ou DISCORD_GUILD_ID manquant", { status: 500 });
  const roles = await guildRoles(cfg.headers, cfg.guildId);
  if (!roles) return new NextResponse("Impossible de lire les rôles Discord", { status: 502 });
  return NextResponse.json(
    assignable(roles, cfg.guildId, isOwner(session.user.role)).map(({ id, name, color }) => ({ id, name, color }))
  );
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !isAdmin(session.user.role)) return new NextResponse("Unauthorized", { status: 401 });
  const cfg = setup();
  if (!cfg) return new NextResponse("DISCORD_TOKEN ou DISCORD_GUILD_ID manquant", { status: 500 });

  const { userId, promote, roleId, otherRoleId, reason } = await req.json();
  if (!userId || !roleId || typeof promote !== "boolean") return new NextResponse("Paramètres invalides", { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { discordId: true, role: true } });
  if (!user?.discordId) return new NextResponse("Ce compte n'a pas de Discord lié", { status: 404 });
  if (isAdmin(user.role) && !isOwner(session.user.role)) {
    return new NextResponse("Seul un owner peut modifier un Admin ou un DEV", { status: 403 });
  }

  const roles = await guildRoles(cfg.headers, cfg.guildId);
  if (!roles) return new NextResponse("Impossible de lire les rôles Discord", { status: 502 });
  const ok = new Set(assignable(roles, cfg.guildId, isOwner(session.user.role)).map((r) => r.id));
  if (!ok.has(roleId) || (otherRoleId && !ok.has(otherRoleId))) return new NextResponse("Rôle non autorisé", { status: 403 });

  // Même ordre que /promote : on retire avant d'ajouter, la première erreur s'arrête là.
  const [add, remove] = promote ? [roleId, otherRoleId] : [otherRoleId, roleId];
  const audit = encodeURIComponent(`${promote ? "Promotion" : "Rétrogradation"} depuis le site par ${session.user.name ?? session.user.id}`).slice(0, 400);
  const call = (method: "PUT" | "DELETE", role: string) =>
    fetch(`${API}/guilds/${cfg.guildId}/members/${user.discordId}/roles/${role}`, {
      method,
      headers: { ...cfg.headers, "X-Audit-Log-Reason": audit },
    });

  for (const [method, role] of [["DELETE", remove], ["PUT", add]] as const) {
    if (!role) continue;
    const res = await call(method, role);
    if (!res.ok) {
      return new NextResponse(`Discord a refusé (${res.status}). Mon rôle doit être au-dessus des rôles concernés.`, { status: 502 });
    }
  }

  // Annonce facultative : seulement si un salon est configuré.
  const channel = process.env.PROMOTION_CHANNEL_ID?.trim();
  if (channel) {
    await fetch(`${API}/channels/${channel}/messages`, {
      method: "POST",
      headers: cfg.headers,
      body: JSON.stringify({
        embeds: [{
          title: promote ? "Promotion au sein du Staff !" : "Changement au sein du Staff",
          description: `<@${user.discordId}> · <@&${roleId}>\n\n*${String(reason || (promote ? "Félicitations pour ton investissement au sein du staff !" : "Merci pour ton aide et bonne continuation.")).slice(0, 500)}*`,
          color: promote ? 0x22c55e : 0xef4444,
        }],
        allowed_mentions: { users: [user.discordId], roles: [] },
      }),
    }).catch(() => {});
  }

  return NextResponse.json({ success: true });
}

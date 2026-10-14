import { prisma } from "@/lib/db";

interface MojangProfileResponse {
  id: string;
  name: string;
}

export function isValidMinecraftSkin(buffer: Buffer): boolean {
  if (buffer.length < 24) return false;

  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;

  if (!isPng) return false;

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);

  return width === 64 && height === 64;
}

export function normalizeUuid(raw: string): string {
  return raw.replace(/-/g, "").toLowerCase();
}

export function uuidForms(raw: string): string[] {
  const u = normalizeUuid(raw);
  const dashed = `${u.slice(0, 8)}-${u.slice(8, 12)}-${u.slice(12, 16)}-${u.slice(16, 20)}-${u.slice(20)}`;
  return [u, dashed];
}

export async function fetchProfileByName(name: string): Promise<MojangProfileResponse | null> {
  try {
    const res = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(name)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data: MojangProfileResponse = await res.json();
    return data?.id && data?.name ? { id: normalizeUuid(data.id), name: data.name } : null;
  } catch {
    return null;
  }
}

export async function fetchNameByUuid(uuid: string): Promise<string | null> {
  try {
    const res = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${normalizeUuid(uuid)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data: MojangProfileResponse = await res.json();
    return data?.name ?? null;
  } catch {
    return null;
  }
}

async function freeName(name: string, keepUuidForms: string[]) {
  const holder = await prisma.player.findUnique({ where: { minecraftName: name } });
  if (holder && !(holder.uuid && keepUuidForms.includes(holder.uuid))) {
    await prisma.player.update({
      where: { id: holder.id },
      data: { minecraftName: `${name}~${holder.id.slice(-6)}`, mcNameCheckedAt: null },
    });
  }
}

export async function syncMojangUsername(rawUuid: string): Promise<string | null> {
  const forms = uuidForms(rawUuid);
  const name = await fetchNameByUuid(rawUuid);
  if (!name) {
    await prisma.player.updateMany({ where: { uuid: { in: forms } }, data: { mcNameCheckedAt: new Date() } });
    return null;
  }
  try {
    await freeName(name, forms);
    await prisma.player.updateMany({
      where: { uuid: { in: forms } },
      data: { minecraftName: name, uuid: forms[0], mcNameCheckedAt: new Date() },
    });
    await prisma.user.updateMany({
      where: { minecraftUuid: { in: forms } },
      data: { minecraftName: name, minecraftUuid: forms[0] },
    });
    return name;
  } catch (e) {
    console.error("[MOJANG_SYNC]", forms[0], e);
    return null;
  }
}

export async function linkUserToProfile(userId: string, profile: MojangProfileResponse): Promise<"ok" | "taken"> {
  const forms = uuidForms(profile.id);

  const other = await prisma.user.findFirst({
    where: { minecraftUuid: { in: forms }, NOT: { id: userId } },
    select: { id: true },
  });
  if (other) return "taken";

  await prisma.user.update({
    where: { id: userId },
    data: { minecraftName: profile.name, minecraftUuid: forms[0], isMcVerified: true },
  });

  const byUuid = await prisma.player.findFirst({ where: { uuid: { in: forms } } });
  const byNameNoUuid = byUuid
    ? null
    : await prisma.player.findFirst({ where: { minecraftName: profile.name, uuid: null } });
  const target = byUuid ?? byNameNoUuid;

  await freeName(profile.name, forms.concat(target?.uuid ? [target.uuid] : []));
  if (target) {
    await prisma.player.update({
      where: { id: target.id },
      data: { minecraftName: profile.name, uuid: forms[0], status: "ACTIVE", mcNameCheckedAt: new Date() },
    });
  } else {
    await prisma.player.create({
      data: { minecraftName: profile.name, uuid: forms[0], status: "ACTIVE", mcNameCheckedAt: new Date() },
    });
  }
  return "ok";
}

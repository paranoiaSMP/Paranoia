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

  // IHDR width and height (big-endian 32-bit uints at bytes 16 and 20)
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);

  return width === 64 && height === 64;
}

export async function syncMojangUsername(rawUuid: string): Promise<string | null> {
  const cleanUuid = rawUuid.replace(/-/g, "").toLowerCase();

  try {
    const res = await fetch(
      `https://sessionserver.mojang.com/session/minecraft/profile/${cleanUuid}`,
      { cache: "no-store" }
    );

    if (!res.ok) return null;

    const data: MojangProfileResponse = await res.json();
    if (!data?.name) return null;

    // Update Player record if present
    await prisma.player.updateMany({
      where: { uuid: cleanUuid },
      data: { minecraftName: data.name },
    });

    // Update User record if present
    await prisma.user.updateMany({
      where: { minecraftUuid: cleanUuid },
      data: { minecraftName: data.name },
    });

    return data.name;
  } catch {
    return null;
  }
}

export function getPlayerSkinUrl(
  player: {
    uuid?: string | null;
    minecraftName?: string | null;
    customSkinUrl?: string | null;
  },
  type: "bust" | "face" | "body" = "bust"
): string {
  if (player.customSkinUrl) {
    return player.customSkinUrl;
  }

  const identifier = player.uuid ? player.uuid.replace(/-/g, "") : player.minecraftName || "Steve";
  return `https://vzge.me/${type}/512/${identifier}.png`;
}

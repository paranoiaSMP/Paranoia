// Pure URL builder: lives apart from mojang.ts, which pulls in Prisma and cannot reach client components.
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

import fs from "fs";
import { prisma } from "./db";

export async function syncCosmeticsJson() {
  const jsonPath = process.env.COSMETICS_JSON_PATH;
  if (!jsonPath) {
    console.log("[SYNC] COSMETICS_JSON_PATH not defined, skipping JSON sync.");
    return;
  }

  try {
    let data: any = { items: [], players: {}, admins: [] };
    if (fs.existsSync(jsonPath)) {
      const fileContent = fs.readFileSync(jsonPath, "utf8");
      data = JSON.parse(fileContent);
    }

    const prismaItems = await prisma.launcherShopItem.findMany();

    // Map Prisma items to the expected JSON format
    const items = prismaItems.map((item) => {
      // Map category to the accepted types: "cape", "wings", "halo", "hat", "particle", "emote"
      let type = "cape";
      if (item.category) {
        const cat = item.category.toLowerCase();
        if (["cape", "wings", "halo", "hat", "particle", "emote"].includes(cat)) {
          type = cat;
        }
      }

      return {
        id: item.itemId,
        type: type,
        name: item.name,
        previewUrl: item.imageUrl,
        ...(item.modelUrl ? { textureUrl: item.modelUrl } : {}),
        rarity: "common", // default rarity
        price: item.price,
      };
    });

    data.items = items;

    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), "utf8");
    console.log(`[SYNC] Synced ${items.length} items to ${jsonPath}`);
  } catch (error) {
    console.error("[SYNC_ERROR] Failed to sync cosmetics json", error);
  }
}

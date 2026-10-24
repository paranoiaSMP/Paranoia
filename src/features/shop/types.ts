export type CosmeticCategory = "all" | "cape" | "wings" | "halo" | "hat" | "particle" | "emote";

export interface ShopCosmetic {
  id: string;
  itemId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  imageUrl: string | null;
  modelUrl: string | null;
  category: string;
}

export interface UserShopProfile {
  id: string;
  name: string | null;
  image: string | null;
  role: string;
  paraCoins: number;
  minecraftName: string | null;
  minecraftUuid: string | null;
  ownedItemIds: string[];
  vipUntil: string | null;
}

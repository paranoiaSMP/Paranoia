export type Player = {
  id: string;
  minecraftName: string;
};

export type TradingCard = {
  id: string;
  title: string;
  rarity: string;
  level: string;
  edition: string;
  description: string | null;
  player: Player | null;
  attributes?: string;
  imageUrl?: string | null;
  asVariantLinks?: any[];
  isVariant?: boolean;
};

export type UserCard = {
  id: string;
  obtainedAt: Date;
  tradingCard: TradingCard;
  specialEffect?: string | null;
};

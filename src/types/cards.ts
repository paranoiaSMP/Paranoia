export type Player = {
  id: string;
  minecraftName: string;
  hwid?: string | null;
  uuid?: string | null;
  customSkinUrl?: string | null;
  status?: string;
};

export type VariantProfile = {
  id: string;
  name: string;
  iconUrl?: string | null;
};

export type CardVariantLink = {
  id: string;
  motherCardId: string;
  motherCard?: TradingCard;
  variantProfileId: string;
  variantProfile?: VariantProfile;
  targetCardId: string;
  targetCard?: TradingCard;
};

export type ElementPosition = {
  x: number;
  y: number;
  scale: number | string;
};

export type CustomBadge = {
  id?: string;
  url?: string;
  x?: number;
  y?: number;
  scale?: number;
  size?: number;
};

export type TradingCard = {
  id: string;
  title: string;
  playerId?: string | null;
  player: Player | null;
  description: string | null;
  imageUrl?: string | null;
  layer1Url?: string | null;
  layer2Url?: string | null;
  layer3Url?: string | null;
  renderedImageUrl?: string | null;
  customBackground?: string | null;
  customBadges?: string | CustomBadge[];
  characterPosition?: string | ElementPosition;
  rarity: string;
  level: string;
  edition: string;
  proba?: number;
  attributes?: string;
  template?: string;
  isPublished?: boolean;
  isVariant?: boolean;
  specialEffect?: string | null;
  motherLinks?: CardVariantLink[];
  asVariantLinks?: CardVariantLink[];
  createdAt?: Date;
  updatedAt?: Date;
};

export type UserCard = {
  id: string;
  userId?: string;
  obtainedAt: Date;
  tradingCardId?: string;
  tradingCard: TradingCard;
  specialEffect?: string | null;
};

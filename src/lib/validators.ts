import { z } from "zod";

export const sanitizeText = (text: string) => {
  return text.replace(/<[^>]*>?/gm, '');
};

export const createTopicSchema = z.object({
  title: z.string().min(3).max(100),
  content: z.string().min(10).max(10000),
  category: z.string(),
});

export const createCommentSchema = z.object({
  content: z.string().min(1).max(5000),
  topicId: z.string(),
  parentId: z.string().optional(),
});

export const createApplicationSchema = z.object({
  minecraftName: z.string().min(3).max(16).regex(/^[a-zA-Z0-9_]+$/),
  age: z.coerce.number().min(13).max(99),
  motivation: z.string().min(50).max(2000),
  experience: z.string().min(20).max(2000),
  referral: z.string().optional(),
});

export const createTradingCardSchema = z.object({
  title: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
  rarity: z.enum(["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"]),
  attributes: z.record(z.string(), z.number()),
  imageUrl: z.string().url().optional(),
  template: z.string().default("classic"),
});

export const saveTierListSchema = z.object({
  title: z.string().min(1).max(100),
  data: z.string(),
  isPublic: z.boolean(),
});
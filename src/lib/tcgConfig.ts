import { prisma } from "@/lib/db";
import { TCG_DEFAULTS, type TcgConfig } from "@/lib/cardValue";

const CONFIG_KEY = "tcg:config";
const RECIPES_KEY = "tcg:recipes";

export type Recipe = { id: string; name: string; resultId: string; ingredients: { cardId: string; qty: number }[] };

async function read<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.systemSetting.findUnique({ where: { key } });
  try {
    return row ? (JSON.parse(row.value) as T) : fallback;
  } catch {
    return fallback;
  }
}
const write = (key: string, value: unknown) => {
  const v = JSON.stringify(value);
  return prisma.systemSetting.upsert({ where: { key }, update: { value: v }, create: { key, value: v } });
};

export async function getTcgConfig(): Promise<TcgConfig> {
  return { ...TCG_DEFAULTS, ...(await read<Partial<TcgConfig>>(CONFIG_KEY, {})) };
}
export const saveTcgConfig = (c: TcgConfig) => write(CONFIG_KEY, c);
export const getRecipes = () => read<Recipe[]>(RECIPES_KEY, []);
export const saveRecipes = (r: Recipe[]) => write(RECIPES_KEY, r);

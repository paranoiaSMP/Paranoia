import { prisma } from "@/lib/db";
import { BOOSTER_PACKS, type BoosterPackId } from "@/config/boosters";

import type { BoosterState, BoosterStates } from "@/lib/boosters-types";

const key = (id: string) => `booster:${id}`;

// Les boosters de fête sont masqués tant qu'un admin ne les affiche pas ; stock null = illimité.
export async function boosterStates(): Promise<BoosterStates> {
  const rows = await prisma.systemSetting.findMany({ where: { key: { startsWith: "booster:" } } });
  const saved = new Map(rows.map((r) => [r.key, r.value]));
  const out = {} as BoosterStates;
  for (const pack of Object.values(BOOSTER_PACKS)) {
    let v: Partial<BoosterState> = {};
    try {
      v = JSON.parse(saved.get(key(pack.id)) ?? "{}");
    } catch {}
    out[pack.id] = {
      visible: v.visible ?? !pack.seasonal,
      stock: typeof v.stock === "number" ? v.stock : null,
    };
  }
  return out;
}

export async function saveBooster(id: BoosterPackId, state: BoosterState) {
  const value = JSON.stringify(state);
  await prisma.systemSetting.upsert({ where: { key: key(id) }, update: { value }, create: { key: key(id), value } });
}

// Retire 1 au stock de façon atomique ; false si rupture. Sans stock défini, rien à décrémenter.
export async function takeStock(
  tx: Pick<typeof prisma, "$executeRaw">,
  id: BoosterPackId,
  state: BoosterState
): Promise<boolean> {
  if (state.stock === null) return true;
  const n = await tx.$executeRaw`
    UPDATE "SystemSetting"
    SET value = jsonb_set(value::jsonb, '{stock}', to_jsonb((value::jsonb->>'stock')::int - 1))::text
    WHERE key = ${key(id)} AND (value::jsonb->>'stock') ~ '^[0-9]+$' AND (value::jsonb->>'stock')::int > 0`;
  return n > 0;
}

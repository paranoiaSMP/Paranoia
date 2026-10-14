import { prisma } from "@/lib/db";
import { syncMojangUsername } from "@/lib/mojang";

const DAY_MS = 24 * 60 * 60 * 1000;
const EVERY_MS = 15 * 60 * 1000;
const BATCH = 60;
const PAUSE_MS = 400;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function syncDuePlayers(): Promise<number> {
  const due = await prisma.player.findMany({
    where: {
      uuid: { not: null },
      OR: [{ mcNameCheckedAt: null }, { mcNameCheckedAt: { lt: new Date(Date.now() - DAY_MS) } }],
    },
    select: { uuid: true },
    orderBy: { mcNameCheckedAt: { sort: "asc", nulls: "first" } },
    take: BATCH,
  });
  for (const p of due) {
    await syncMojangUsername(p.uuid!);
    await sleep(PAUSE_MS);
  }
  return due.length;
}

declare global {
  var __mojangSyncStarted: boolean | undefined;
}

export function startMojangSync() {
  if (globalThis.__mojangSyncStarted) return;
  globalThis.__mojangSyncStarted = true;

  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const n = await syncDuePlayers();
      if (n > 0) console.log(`[MOJANG_SYNC] ${n} pseudo(s) vérifié(s)`);
    } catch (e) {
      console.error("[MOJANG_SYNC]", e);
    } finally {
      running = false;
    }
  };

  setTimeout(tick, 30_000);
  setInterval(tick, EVERY_MS);
}

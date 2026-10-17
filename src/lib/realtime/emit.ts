import { prisma } from "@/lib/db";
import { invalidateCache } from "@/lib/cache";
import { bus, PUBLIC_TOPIC, userTopic } from "./bus";

export async function walletSnapshot(userId: string) {
  const [boxes, user] = await Promise.all([
    prisma.userBox.findMany({ where: { userId }, select: { boxType: true, amount: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { paraCoins: true } }),
  ]);
  return {
    boxes: Object.fromEntries(boxes.map((b) => [b.boxType, b.amount])),
    paraCoins: user?.paraCoins ?? 0,
  };
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();

export function notifyWallet(userId: string) {
  const topic = userTopic(userId);
  if (!bus.hasSubscribers(topic)) return;
  clearTimeout(timers.get(userId));
  timers.set(
    userId,
    setTimeout(async () => {
      timers.delete(userId);
      try {
        bus.publish(topic, { event: "wallet", data: await walletSnapshot(userId) });
      } catch {}
    }, 40)
  );
}

export function notifyCards() {
  invalidateCache();
  bus.publish(PUBLIC_TOPIC, { event: "cards", data: { at: Date.now() } });
}

export function notifyShop() {
  bus.publish(PUBLIC_TOPIC, { event: "shop", data: { at: Date.now() } });
}

export function notifyNews() {
  bus.publish(PUBLIC_TOPIC, { event: "news", data: { at: Date.now() } });
}

export function notifyTrade(...userIds: string[]) {
  for (const id of userIds) bus.publish(userTopic(id), { event: "trade", data: { at: Date.now() } });
}

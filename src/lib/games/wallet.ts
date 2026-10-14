import { prisma } from "@/lib/db";
import { notifyWallet } from "@/lib/realtime/emit";

export async function debit(userId: string, amount: number): Promise<number | null> {
  const res = await prisma.user.updateMany({
    where: { id: userId, paraCoins: { gte: amount } },
    data: { paraCoins: { decrement: amount } },
  });
  if (res.count === 0) return null;
  notifyWallet(userId);
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { paraCoins: true } });
  return u?.paraCoins ?? 0;
}

export async function credit(userId: string, amount: number): Promise<number> {
  const u = await prisma.user.update({
    where: { id: userId },
    data: { paraCoins: { increment: amount } },
    select: { paraCoins: true },
  });
  notifyWallet(userId);
  return u.paraCoins;
}

export async function balance(userId: string): Promise<number> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { paraCoins: true } });
  return u?.paraCoins ?? 0;
}

export async function recordBet(userId: string, amount: number, newGame = true) {
  const games = newGame ? 1 : 0;
  await prisma.casinoStat
    .upsert({
      where: { userId },
      create: { userId, wagered: amount, games },
      update: { wagered: { increment: amount }, games: { increment: games }, updatedAt: new Date() },
    })
    .catch(() => {});
}

export async function recordWin(userId: string, payout: number) {
  if (payout <= 0) return;
  await prisma.$executeRaw`
    INSERT INTO "CasinoStat" ("userId", won, "biggestWin", "updatedAt") VALUES (${userId}, ${payout}, ${payout}, NOW())
    ON CONFLICT ("userId") DO UPDATE SET won = "CasinoStat".won + ${payout},
      "biggestWin" = GREATEST("CasinoStat"."biggestWin", ${payout}), "updatedAt" = NOW()`.catch(() => {});
}

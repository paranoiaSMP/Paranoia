import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const manageSchema = z.object({
  action: z.string().min(1),
  cardId: z.string().optional(),
  userId: z.string().optional(),
  minecraftName: z.string().optional(),
  boxType: z.string().optional(),
  amount: z.number().int().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const admin = session?.user as any;
    if (!session || !admin || admin.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const rawBody = await req.json();
    const parsed = manageSchema.safeParse(rawBody);

    if (!parsed.success) {
      return new NextResponse("Invalid request payload", { status: 400 });
    }

    const { action, cardId, userId, minecraftName, boxType, amount } = parsed.data;

    if (!action) {
      return new NextResponse("Missing action parameter", { status: 400 });
    }

    if (action === "GIVE_BOX") {
      if (!userId || !boxType || !amount) return new NextResponse("Missing parameters for giving box", { status: 400 });
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return new NextResponse("User not found", { status: 404 });

      await prisma.userBox.upsert({
        where: { userId_boxType: { userId: user.id, boxType } },
        update: { amount: { increment: amount } },
        create: { userId: user.id, boxType, amount }
      });
      return NextResponse.json({ success: true, message: `${amount} Box ${boxType} donnée avec succès` });
    }

    if (action === "GIVE") {
      if (!cardId) return new NextResponse("Missing cardId", { status: 400 });
      if (!minecraftName) return new NextResponse("Missing minecraftName", { status: 400 });
      const user = await prisma.user.findFirst({ where: { minecraftName } });
      if (!user) return new NextResponse("Ce joueur n'est pas inscrit sur le site web", { status: 404 });
      await prisma.userCard.create({
        data: {
          userId: user.id,
          tradingCardId: cardId
        }
      });
      return NextResponse.json({ success: true, message: "Carte donnée avec succès" });
    }

    if (action === "REMOVE") {
      if (!cardId) return new NextResponse("Missing cardId", { status: 400 });
      if (!minecraftName) return new NextResponse("Missing minecraftName", { status: 400 });
      const user = await prisma.user.findFirst({ where: { minecraftName } });
      if (!user) return new NextResponse("Ce joueur n'est pas inscrit sur le site web", { status: 404 });

      const userCard = await prisma.userCard.findFirst({
        where: { userId: user.id, tradingCardId: cardId }
      });
      if (!userCard) return new NextResponse("L'utilisateur ne possède pas cette carte", { status: 404 });
      await prisma.userCard.delete({
        where: { id: userCard.id }
      });
      return NextResponse.json({ success: true, message: "Carte retirée avec succès" });
    }

    if (action === "GIVE_ALL") {
      if (!cardId) return new NextResponse("Missing cardId", { status: 400 });
      const users = await prisma.user.findMany();
      const userCardsData = users.map(u => ({
        userId: u.id,
        tradingCardId: cardId
      }));
      await prisma.userCard.createMany({
        data: userCardsData
      });
      return NextResponse.json({ success: true, message: `Carte donnée à ${users.length} joueurs` });
    }

    if (action === "WIPE_ALL") {
      if (!cardId) return new NextResponse("Missing cardId", { status: 400 });
      const deleted = await prisma.userCard.deleteMany({
        where: { tradingCardId: cardId }
      });
      return NextResponse.json({ success: true, message: `${deleted.count} copies de la carte ont été supprimées` });
    }

    if (action === "WIPE_PLAYER") {
      if (!userId) return new NextResponse("Missing userId", { status: 400 });
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return new NextResponse("Utilisateur introuvable", { status: 404 });
      const deleted = await prisma.userCard.deleteMany({
        where: { userId: user.id }
      });
      return NextResponse.json({ success: true, message: `L'inventaire de ${user.minecraftName || user.name || 'ce joueur'} a été entièrement réinitialisé (${deleted.count} cartes supprimées).` });
    }

    return new NextResponse("Invalid action", { status: 400 });

  } catch (error) {
    console.error("Error managing cards:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
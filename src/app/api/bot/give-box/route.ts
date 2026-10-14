import { NextResponse } from 'next/server';
import { prisma } from "@/lib/db";
import { notifyWallet } from "@/lib/realtime/emit";
import { safeEqual } from "@/lib/secrets";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { discordId, boxType, amount, secret } = body;

    if (!safeEqual(secret, process.env.BOT_API_SECRET)) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const qty = Number(amount);
    if (!discordId || typeof boxType !== "string" || !boxType || !Number.isInteger(qty) || qty < 1 || qty > 1000) {
      return new NextResponse("Missing parameters", { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { discordId }
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    const userBox = await prisma.userBox.upsert({
      where: {
        userId_boxType: {
          userId: user.id,
          boxType: boxType
        }
      },
      update: {
        amount: {
          increment: qty
        }
      },
      create: {
        userId: user.id,
        boxType: boxType,
        amount: qty
      }
    });

    notifyWallet(user.id);
    return NextResponse.json({ success: true, userBox });
  } catch (error) {
    console.error("Error in give-box API:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
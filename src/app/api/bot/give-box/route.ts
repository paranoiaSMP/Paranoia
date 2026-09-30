import { NextResponse } from 'next/server';
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { discordId, boxType, amount, secret } = body;

    if (!secret || secret !== process.env.BOT_API_SECRET) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!discordId || !boxType || !amount) {
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
          increment: parseInt(amount, 10)
        }
      },
      create: {
        userId: user.id,
        boxType: boxType,
        amount: parseInt(amount, 10)
      }
    });

    return NextResponse.json({ success: true, userBox });
  } catch (error) {
    console.error("Error in give-box API:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
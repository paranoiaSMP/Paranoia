import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "MODERATOR")) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const { userId, action, amount, boxType } = body;

    if (!userId || !action || amount === undefined || amount < 0) {
      return new NextResponse("Missing data", { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { boxes: true }
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    if (action === "set_coins") {
      await prisma.user.update({
        where: { id: userId },
        data: { paraCoins: amount }
      });
    } else if (action === "set_booster") {
      if (!boxType) return new NextResponse("Missing boxType", { status: 400 });
      const existingBox = user.boxes.find(b => b.boxType === boxType);
      if (existingBox) {
        await prisma.userBox.update({
          where: { id: existingBox.id },
          data: { amount: amount }
        });
      } else {
        await prisma.userBox.create({
          data: {
            userId,
            boxType,
            amount
          }
        });
      }
    } else {
      return new NextResponse("Invalid action", { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update user economy", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
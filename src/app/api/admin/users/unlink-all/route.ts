import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== "ADMIN") {
      return new NextResponse("Non autorisé", { status: 401 });
    }

    await prisma.user.updateMany({
      data: {
        minecraftName: null,
        minecraftUuid: null,
        isMcVerified: false,
      },
    });

    return NextResponse.json({ success: true, message: "Tous les utilisateurs ont été déliés." });
  } catch (error) {
    console.error("[UNLINK_ALL_POST]", error);
    return new NextResponse("Erreur interne", { status: 500 });
  }
}

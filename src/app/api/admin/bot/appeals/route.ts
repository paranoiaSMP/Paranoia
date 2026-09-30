import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "MODERATOR")) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { appealId, status } = await req.json();

    if (!appealId || !["accepted", "rejected"].includes(status)) {
      return new NextResponse("Paramètres invalides", { status: 400 });
    }

    await prisma.$executeRaw`
      UPDATE appeals
      SET status = ${status}
      WHERE id = ${appealId}
    `;

    return NextResponse.json({ success: true, appealId, status });
  } catch (error) {
    console.error("Failed to update appeal status:", error);
    return new NextResponse("Erreur lors de la mise à jour", { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "MODERATOR")) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        minecraftName: true,
        role: true,
        createdAt: true,
        image: true,
        paraCoins: true,
        boxes: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Failed to fetch users", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return new NextResponse("Seul un ADMIN peut modifier les rôles", { status: 401 });
  }

  try {
    const body = await req.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return new NextResponse("Missing data", { status: 400 });
    }

    if (!["MEMBER", "MODERATOR", "ADMIN"].includes(role)) {
      return new NextResponse("Invalid role", { status: 400 });
    }

    if (userId === session.user.id && role !== "ADMIN") {
      return new NextResponse("Vous ne pouvez pas retirer votre propre rôle Admin", { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        name: true,
        role: true,
      }
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Failed to update user role", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return new NextResponse("Seul un ADMIN peut supprimer des comptes", { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return new NextResponse("userId requis", { status: 400 });
    }

    if (userId === session.user.id) {
      return new NextResponse("Vous ne pouvez pas supprimer votre propre compte", { status: 400 });
    }

    // Delete all related data first, then the user
    await prisma.$transaction([
      prisma.userCard.deleteMany({ where: { userId } }),
      prisma.userBox.deleteMany({ where: { userId } }),
      prisma.session.deleteMany({ where: { userId } }),
      prisma.account.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete user", error);
    return new NextResponse("Erreur lors de la suppression", { status: 500 });
  }
}
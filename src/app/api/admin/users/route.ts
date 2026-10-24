import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAdmin, isFounderUuid, isOwner } from "@/lib/roles";
import { fetchProfileByName, linkUserToProfile, uuidForms } from "@/lib/mojang";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["OWNER", "ADMIN", "DEV", "MODERATOR"].includes(session.user.role as string)) {
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
        vipUntil: true,
        staffTitle: true,
        staffBio: true,
        staffColor: true,
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
  if (!session?.user || !["OWNER", "ADMIN", "DEV"].includes(session.user.role as string)) {
    return new NextResponse("Seul un admin peut modifier les rôles", { status: 401 });
  }

  try {
    const body = await req.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return new NextResponse("Missing data", { status: 400 });
    }

    if (!["MEMBER", "MODERATOR", "ADMIN", "DEV", "OWNER"].includes(role)) {
      return new NextResponse("Invalid role", { status: 400 });
    }

    if ((role === "DEV" || role === "ADMIN" || role === "OWNER") && !isOwner(session.user.role)) {
      return new NextResponse("Seul un owner peut attribuer ce rôle", { status: 403 });
    }

    const target = await prisma.user.findUnique({ where: { id: userId }, select: { minecraftUuid: true, role: true } });
    if (isAdmin(target?.role) && !isOwner(session.user.role)) {
      return new NextResponse("Seul un owner peut modifier le rôle d'un Admin ou d'un DEV", { status: 403 });
    }

    if (!isAdmin(role)) {
      if (isFounderUuid(target?.minecraftUuid)) {
        return new NextResponse("Le fondateur reste Admin.", { status: 400 });
      }
    }

    if (userId === session.user.id && role !== session.user.role) {
      return new NextResponse("Vous ne pouvez pas modifier votre propre rôle", { status: 400 });
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

// Lie un autre compte Minecraft (minecraftName) ou délie le compte actuel (minecraftName absent).
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["OWNER", "ADMIN", "DEV"].includes(session.user.role as string)) {
    return new NextResponse("Seul un admin peut modifier le compte Minecraft", { status: 401 });
  }
  try {
    const { userId, minecraftName } = await req.json();
    if (!userId) return new NextResponse("userId requis", { status: 400 });

    const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, minecraftUuid: true } });
    if (!target) return new NextResponse("Utilisateur introuvable", { status: 404 });
    if (isAdmin(target.role) && !isOwner(session.user.role)) {
      return new NextResponse("Seul un owner peut modifier un Admin ou un DEV", { status: 403 });
    }

    if (minecraftName) {
      if (!/^[A-Za-z0-9_]{3,16}$/.test(String(minecraftName))) {
        return new NextResponse("Pseudo invalide : 3 à 16 caractères, lettres, chiffres ou _.", { status: 400 });
      }
      const profile = await fetchProfileByName(String(minecraftName));
      if (!profile) return new NextResponse("Pseudo Minecraft introuvable chez Mojang.", { status: 404 });
      if ((await linkUserToProfile(userId, profile)) === "taken") {
        return new NextResponse("Ce compte Minecraft est déjà lié à un autre compte.", { status: 409 });
      }
      return NextResponse.json({ minecraftName: profile.name });
    }

    if (target.minecraftUuid) {
      const banned = await prisma.ban.findFirst({ where: { isActive: true, player: { uuid: { in: uuidForms(target.minecraftUuid) } } }, select: { id: true } });
      if (banned) return new NextResponse("Ce compte Minecraft est banni : impossible de le délier.", { status: 403 });
    }
    await prisma.user.update({ where: { id: userId }, data: { minecraftName: null, minecraftUuid: null, isMcVerified: false } });
    return NextResponse.json({ minecraftName: null });
  } catch (error) {
    console.error("Failed to update minecraft link", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["OWNER", "ADMIN", "DEV"].includes(session.user.role as string)) {
    return new NextResponse("Seul un admin peut supprimer des comptes", { status: 401 });
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

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (isOwner(targetUser?.role) && !isOwner(session.user.role)) {
      return new NextResponse("Impossible de supprimer un owner", { status: 403 });
    }

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
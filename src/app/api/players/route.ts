import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { isAdmin, isStaff } from "@/lib/roles";
import { normalizeUuid } from "@/lib/mojang";
import { notifyCards } from "@/lib/realtime/emit";

const PUBLIC_FIELDS = { id: true, minecraftName: true, uuid: true, customSkinUrl: true, status: true, createdAt: true } as const;

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const staff = isStaff(session?.user?.role);
    const select = staff ? { ...PUBLIC_FIELDS, hwid: true, _count: { select: { bans: { where: { isActive: true } } } } } : PUBLIC_FIELDS;

    const url = new URL(req.url);
    const search = url.searchParams.get("search");

    if (search) {
      const player = await prisma.player.findFirst({
        where: {
          OR: [
            { minecraftName: { contains: search, mode: "insensitive" } },
            { uuid: search }
          ]
        },
        select,
      });
      return NextResponse.json(player ? [player] : []);
    }

    const players = await prisma.player.findMany({
      orderBy: { createdAt: "desc" },
      select,
    });
    return NextResponse.json(players);
  } catch {
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (!isAdmin(session.user.role))) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { minecraftName } = await req.json();
    if (!minecraftName) {
      return new NextResponse("Missing minecraftName", { status: 400 });
    }

    let uuid: string | null = null;
    let exactName = minecraftName;

    try {
      const mojangRes = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(minecraftName)}`);
      if (mojangRes.ok) {
        const mojangData = await mojangRes.json();
        if (mojangData.id) {
          uuid = normalizeUuid(mojangData.id);
          exactName = mojangData.name || minecraftName;
        }
      }
    } catch (e) {
      console.error("Mojang API fetch error:", e);
    }

    const player = await prisma.player.upsert({
      where: { minecraftName: exactName },
      update: {
        uuid: uuid || undefined,
        status: "ACTIVE"
      },
      create: {
        minecraftName: exactName,
        uuid,
        status: "ACTIVE",
      },
    });

    notifyCards();
    return NextResponse.json(player);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return new NextResponse("Ce joueur existe déjà", { status: 400 });
    }
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (!isAdmin(session.user.role))) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return new NextResponse("Missing ID", { status: 400 });
    }

    await prisma.player.delete({
      where: { id }
    });

    notifyCards();
    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (!isAdmin(session.user.role))) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id, status } = await req.json();
    if (!id || status !== "ACTIVE") {
      return new NextResponse("Seul le statut ACTIVE peut être posé ici ; pour bannir, utilise la modération.", { status: 400 });
    }

    const player = await prisma.player.update({
      where: { id },
      data: { status },
    });

    notifyCards();
    return NextResponse.json(player);
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
}
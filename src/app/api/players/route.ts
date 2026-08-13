import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const players = await prisma.player.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(players);
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { minecraftName } = await req.json();
    if (!minecraftName) {
      return new NextResponse("Missing minecraftName", { status: 400 });
    }

    const player = await prisma.player.create({
      data: {
        minecraftName,
        status: "ACTIVE",
      },
    });

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
    if (!session || session.user.role !== "ADMIN") {
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

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id, status } = await req.json();
    if (!id || !status) {
      return new NextResponse("Missing id or status", { status: 400 });
    }

    const player = await prisma.player.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(player);
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
}
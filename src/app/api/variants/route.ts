import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notifyCards } from "@/lib/realtime/emit";
import { isAdmin } from "@/lib/roles";

export async function GET() {
  try {
    const variants = await prisma.variantProfile.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(variants);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdmin(session.user.role)) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { name, iconUrl } = await req.json();
    if (!name) return new NextResponse("Name is required", { status: 400 });

    const variant = await prisma.variantProfile.create({
      data: { name, iconUrl },
    });

    notifyCards();
    return NextResponse.json(variant);
  } catch (error) {
    console.error("Error creating variant profile:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdmin(session.user.role)) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return new NextResponse("Missing id", { status: 400 });

    await prisma.variantProfile.delete({ where: { id } });
    notifyCards();
    return new NextResponse("Deleted", { status: 200 });
  } catch (error) {
    console.error("Error deleting variant profile:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
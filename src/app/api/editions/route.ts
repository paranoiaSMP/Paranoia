import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const editionSchema = z.object({
  name: z.string().min(1),
  iconUrl: z.string().optional().nullable(),
  bannerUrl: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  showInShop: z.boolean().optional(),
  isPurchasable: z.boolean().optional()
});

export async function GET() {
  try {
    const editions = await prisma.edition.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(editions);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const parsed = editionSchema.safeParse(body);
    if (!parsed.success) return new NextResponse("Invalid input", { status: 400 });

    const { name, iconUrl, bannerUrl, description, showInShop, isPurchasable } = parsed.data;

    const edition = await prisma.edition.create({
      data: { 
        name, 
        iconUrl,
        bannerUrl,
        description,
        showInShop: !!showInShop,
        isPurchasable: !!isPurchasable
      },
    });

    return NextResponse.json(edition);
  } catch (error) {
    console.error("Error creating edition:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const putSchema = editionSchema.partial().extend({ id: z.string().min(1) });
    const parsed = putSchema.safeParse(body);
    if (!parsed.success) return new NextResponse("Invalid input", { status: 400 });

    const { id, name, iconUrl, bannerUrl, description, showInShop, isPurchasable } = parsed.data;

    const edition = await prisma.edition.update({
      where: { id },
      data: { 
        name, 
        iconUrl,
        bannerUrl,
        description,
        showInShop: !!showInShop,
        isPurchasable: !!isPurchasable
      },
    });

    return NextResponse.json(edition);
  } catch (error) {
    console.error("Error updating edition:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return new NextResponse("Missing id", { status: 400 });

    await prisma.edition.delete({ where: { id } });
    return new NextResponse("Deleted", { status: 200 });
  } catch (error) {
    console.error("Error deleting edition:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!session || !user || user.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const templates = await prisma.cardTemplate.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!session || !user || user.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { name, customBackground, customBadges, characterPosition, level, attributes } = await req.json();

    const template = await prisma.cardTemplate.create({
      data: {
        name: name || "Template sans nom",
        customBackground: customBackground || null,
        customBadges: Array.isArray(customBadges) ? JSON.stringify(customBadges) : "[]",
        characterPosition: typeof characterPosition === 'object' && characterPosition !== null ? JSON.stringify(characterPosition) : '{"x":50,"y":50,"scale":100}',
        level: level || "Normal",
        attributes: typeof attributes === 'object' && attributes !== null ? JSON.stringify(attributes) : "{}"
      }
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error creating template:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!session || !user || user.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return new NextResponse("Missing ID", { status: 400 });
    }

    await prisma.cardTemplate.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting template:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const motherCardId = searchParams.get("motherCardId");
    if (!motherCardId) {
      return new NextResponse("Missing motherCardId", { status: 400 });
    }

    const links = await prisma.cardVariantLink.findMany({
      where: { motherCardId },
      include: {
        variantProfile: true,
        targetCard: {
          include: { player: true }
        }
      }
    });

    return NextResponse.json(links);
  } catch (error) {
    console.error("[VARIANT_LINKS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const admin = session?.user as any;
    if (!session || !admin || admin.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { motherCardId, variantProfileId, targetCardId } = await req.json();

    if (!motherCardId || !variantProfileId || !targetCardId) {
      return new NextResponse("Missing parameters", { status: 400 });
    }

    const link = await prisma.cardVariantLink.upsert({
      where: {
        motherCardId_variantProfileId: {
          motherCardId,
          variantProfileId
        }
      },
      update: { targetCardId },
      create: {
        motherCardId,
        variantProfileId,
        targetCardId
      }
    });

    return NextResponse.json(link);
  } catch (error) {
    console.error("[VARIANT_LINKS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const admin = session?.user as any;
    if (!session || !admin || admin.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return new NextResponse("Missing id", { status: 400 });

    await prisma.cardVariantLink.delete({
      where: { id }
    });

    return new NextResponse("Deleted", { status: 200 });
  } catch (error) {
    console.error("[VARIANT_LINKS_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
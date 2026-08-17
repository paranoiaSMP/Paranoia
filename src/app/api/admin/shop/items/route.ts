import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const items = await prisma.launcherShopItem.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("[SHOP_ITEMS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { itemId, name, description, price, currency, imageUrl, modelUrl, category } = body;

    const item = await prisma.launcherShopItem.create({
      data: {
        itemId,
        name,
        description,
        price: parseInt(price),
        currency: currency || "paracoins",
        imageUrl,
        modelUrl,
        category,
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("[SHOP_ITEMS_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { id, itemId, name, description, price, currency, imageUrl, modelUrl, category } = body;

    const item = await prisma.launcherShopItem.update({
      where: { id },
      data: {
        itemId,
        name,
        description,
        price: parseInt(price),
        currency: currency || "paracoins",
        imageUrl,
        modelUrl,
        category,
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("[SHOP_ITEMS_PUT]", error);
    return new NextResponse("Internal error", { status: 500 });
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
      return new NextResponse("Missing id", { status: 400 });
    }

    const item = await prisma.launcherShopItem.delete({
      where: { id },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("[SHOP_ITEMS_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

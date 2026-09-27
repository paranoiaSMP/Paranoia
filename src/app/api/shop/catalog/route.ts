import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const dbItems = await prisma.launcherShopItem.findMany({
      orderBy: { createdAt: "desc" }
    });

    const catalog = dbItems.map(item => ({
      id: item.itemId,
      name: item.name,
      description: item.description,
      price: item.price,
      currency: item.currency,
      imageUrl: item.imageUrl || "",
      modelUrl: item.modelUrl || "",
      category: item.category,
      checkoutUrl: `https://paranoiastudio.fr/shop/checkout?item=${item.itemId}`
    }));

    return NextResponse.json(catalog, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  } catch (error) {
    console.error("Erreur lors de la récupération du catalogue:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}

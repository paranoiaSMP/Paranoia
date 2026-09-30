import { NextResponse } from 'next/server';
import { prisma } from "@/lib/db";

export async function GET() {
  const cards = await prisma.tradingCard.findMany({
    where: {
      asVariantLinks: { some: {} }
    },
    include: {
      asVariantLinks: { include: { variantProfile: true } }
    }
  });
  return NextResponse.json(cards.map(c => ({
    title: c.title,
    edition: c.edition,
    isVariant: c.isVariant,
    variants: c.asVariantLinks.map(l => l.variantProfile.name)
  })));
}

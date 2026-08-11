import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const cardSchema = z.object({
  title: z.string().optional().nullable(),
  playerName: z.string().optional().nullable(),
  playerId: z.string(),
  rarity: z.string(),
  level: z.string(),
  edition: z.string().optional().nullable(),
  proba: z.union([z.string(), z.number()]).optional().nullable(),
  description: z.string().optional().nullable(),
  customBackground: z.string().optional().nullable(),
  customBadges: z.any().optional().nullable(),
  characterPosition: z.any().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  layer1Url: z.string().optional().nullable(),
  layer2Url: z.string().optional().nullable(),
  layer3Url: z.string().optional().nullable(),
  renderedImageUrl: z.string().optional().nullable(),
  attributes: z.any().optional().nullable(),
  isVariant: z.boolean().optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    if (!session || !user || user.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const body = await req.json();
    const parsed = cardSchema.safeParse(body);
    if (!parsed.success) {
      return new NextResponse("Invalid input", { status: 400 });
    }
    const { title, playerName, playerId, rarity, level, edition, proba, description, customBackground, customBadges, characterPosition, imageUrl, layer1Url, layer2Url, layer3Url, renderedImageUrl, attributes, isVariant } = parsed.data;


    const parsedProba = parseFloat(proba);
    const validProba = isNaN(parsedProba) ? 100 : parsedProba;
    const parsedBadges = Array.isArray(customBadges) ? JSON.stringify(customBadges) : "[]";
    const parsedCharPos = typeof characterPosition === 'object' && characterPosition !== null ? JSON.stringify(characterPosition) : '{"x":50,"y":50,"scale":100}';
    const parsedAttributes = typeof attributes === 'object' && attributes !== null ? JSON.stringify(attributes) : "{}";

    const card = await prisma.tradingCard.create({
      data: {
        title: title || playerName || "Inconnu",
        playerId,
        rarity,
        level,
        edition: edition || "Standard",
        proba: validProba,
        description: description || "",
        imageUrl: imageUrl || null,
        layer1Url: layer1Url || null,
        layer2Url: layer2Url || null,
        layer3Url: layer3Url || null,
        renderedImageUrl: renderedImageUrl || null,
        customBackground: customBackground || null,
        customBadges: parsedBadges,
        characterPosition: parsedCharPos,
        attributes: parsedAttributes,
        authorId: user.id as string,
        isPublished: true,
        isVariant: !!isVariant,
      },
    });

    return NextResponse.json(card);
  } catch (error) {
    console.error("[CARDS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const edition = searchParams.get("edition");

    const where: any = {};
    if (edition) {
      where.edition = edition;
    }

    const cards = await prisma.tradingCard.findMany({
      where,
      include: {
        player: true,
        motherLinks: {
          include: { variantProfile: true }
        }
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(cards);
  } catch (error) {
    console.error("[CARDS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    if (!session || !user || user.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    
    // Partial validation for PUT since sometimes it's just an image update
    const putSchema = cardSchema.partial().extend({ id: z.string() });
    const parsed = putSchema.safeParse(body);
    if (!parsed.success) {
      return new NextResponse("Invalid input", { status: 400 });
    }
    
    const { id, title, playerName, playerId, rarity, level, edition, proba, description, customBackground, customBadges, characterPosition, imageUrl, layer1Url, layer2Url, layer3Url, renderedImageUrl, attributes, isVariant } = parsed.data;

    if (renderedImageUrl !== undefined && !playerId && !rarity) {
      const card = await prisma.tradingCard.update({
        where: { id },
        data: { renderedImageUrl },
      });
      return NextResponse.json(card);
    }

    if (!playerId || !rarity || !level) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const parsedProba = parseFloat(proba);
    const validProba = isNaN(parsedProba) ? 100 : parsedProba;

    const parsedBadges = Array.isArray(customBadges) ? JSON.stringify(customBadges) : "[]";
    const parsedCharPos = typeof characterPosition === 'object' && characterPosition !== null ? JSON.stringify(characterPosition) : '{"x":50,"y":50,"scale":100}';
    const parsedAttributes = typeof attributes === 'object' && attributes !== null ? JSON.stringify(attributes) : "{}";

    const card = await prisma.tradingCard.update({
      where: { id },
      data: {
        title: title || playerName || "Inconnu",
        playerId,
        rarity,
        level,
        edition: edition || "Standard",
        proba: validProba,
        description: description || "",
        imageUrl: imageUrl || null,
        layer1Url: layer1Url || null,
        layer2Url: layer2Url || null,
        layer3Url: layer3Url || null,
        renderedImageUrl: renderedImageUrl !== undefined ? renderedImageUrl : undefined,
        customBackground: customBackground || null,
        customBadges: parsedBadges,
        characterPosition: parsedCharPos,
        attributes: parsedAttributes,
        isPublished: true,
        isVariant: !!isVariant,
      },
    });

    return NextResponse.json(card);
  } catch (error) {
    console.error("[CARDS_PUT]", error);
    return new NextResponse("Internal Error", { status: 500 });
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

    if (!id || typeof id !== 'string') {
      return new NextResponse("Missing ID", { status: 400 });
    }

    const stringId = String(id);

    await prisma.userCard.deleteMany({
      where: { tradingCardId: stringId }
    });

    await prisma.cardVariantLink.deleteMany({
      where: {
        OR: [
          { motherCardId: stringId },
          { targetCardId: stringId }
        ]
      }
    });

    await prisma.tradingCard.delete({
      where: { id: stringId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CARDS_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
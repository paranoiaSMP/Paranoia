import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { memo } from "@/lib/cache";
import { notifyWallet, walletSnapshot } from "@/lib/realtime/emit";
import { eventFor } from "@/lib/events";

const getCardPool = () =>
  memo("card-pool", () =>
    prisma.tradingCard.findMany({
      include: {
        player: true,
        motherLinks: { include: { variantProfile: true } },
        asVariantLinks: { include: { variantProfile: true } },
      },
    })
  );

const packSchema = z.object({
  boxType: z.string().optional().default("standard")
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Non connecté" }, { status: 401 });
    }
    return NextResponse.json(await walletSnapshot(userId));
  } catch (error) {
    console.error("Pack inventory error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    let body;
    try { body = await req.json(); } catch { body = {}; }
    const parsed = packSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const boxType = parsed.data.boxType;

    const cards = await getCardPool();

    if (cards.length === 0) {
      return NextResponse.json({ error: "No cards available in the database yet!" }, { status: 404 });
    }

    const DROP_RATES: Record<string, Record<string, number>> = {
      standard: { COMMON: 40, UNCOMMON: 30, RARE: 20, EPIC: 7.8, LEGENDARY: 2, MYTHIC: 0.2 },
      premium: { COMMON: 20, UNCOMMON: 25, RARE: 35, EPIC: 14.5, LEGENDARY: 5, MYTHIC: 0.5 },
      legendary: { COMMON: 10, UNCOMMON: 15, RARE: 40, EPIC: 23, LEGENDARY: 10, MYTHIC: 2 },
      mythic: { COMMON: 0, UNCOMMON: 0, RARE: 0, EPIC: 75, LEGENDARY: 20, MYTHIC: 5 }
    };

    const CARDS_PER_PACK: Record<string, number> = {
      standard: 3,
      premium: 4,
      legendary: 4,
      mythic: 5
    };

    const currentType = boxType || "standard";
    const rates = DROP_RATES[currentType] || DROP_RATES["standard"];
    const numCards = CARDS_PER_PACK[currentType] || 3;

    const cardsByRarity: Record<string, typeof cards> = {
      COMMON: cards.filter(c => c.rarity === "COMMON"),
      UNCOMMON: cards.filter(c => c.rarity === "UNCOMMON"),
      RARE: cards.filter(c => c.rarity === "RARE"),
      EPIC: cards.filter(c => c.rarity === "EPIC"),
      LEGENDARY: cards.filter(c => c.rarity === "LEGENDARY"),
      MYTHIC: cards.filter(c => c.rarity === "MYTHIC")
    };

    const drawCard = () => {
      let rand = Math.random() * 100;
      let selectedRarity = "COMMON";
      for (const [rarity, prob] of Object.entries(rates)) {
        if (rand < prob) {
          selectedRarity = rarity;
          break;
        }
        rand -= prob;
      }

      const fallbackOrder = ['MYTHIC', 'LEGENDARY', 'EPIC', 'RARE', 'UNCOMMON', 'COMMON'];
      let startIndex = fallbackOrder.indexOf(selectedRarity);
      if (startIndex === -1) startIndex = fallbackOrder.length - 1;

      let pool = cardsByRarity[selectedRarity];
      if (!pool || pool.length === 0) {
        for (let i = startIndex + 1; i < fallbackOrder.length; i++) {
          if (cardsByRarity[fallbackOrder[i]] && cardsByRarity[fallbackOrder[i]].length > 0) {
            pool = cardsByRarity[fallbackOrder[i]];
            break;
          }
        }
        if (!pool || pool.length === 0) pool = cards;
      }

      return pool[Math.floor(Math.random() * pool.length)];
    };

    const drawnCards = [];
    for (let i = 0; i < numCards; i++) {
      drawnCards.push(drawCard());
    }

    const rarityWeight: Record<string, number> = {
      'COMMON': 1,
      'UNCOMMON': 2,
      'RARE': 3,
      'EPIC': 4,
      'LEGENDARY': 5,
      'MYTHIC': 6
    };

    drawnCards.sort((a, b) => (rarityWeight[a.rarity] || 0) - (rarityWeight[b.rarity] || 0));

    const EFFECTS_PROBABILITY = [
      { name: "Holo", prob: 0.05 }, 
      { name: "Glitch", prob: 0.02 }, 
      { name: "Cosmic", prob: 0.005 }, 
    ];
    const eventSetting = await prisma.systemSetting.findUnique({ where: { key: "event" } });
    const season = eventFor(eventSetting?.value, new Date());
    if (season) EFFECTS_PROBABILITY.push({ name: season === "halloween" ? "Hot" : "Cold", prob: 0.03 });

    const drawEffect = () => {
      let rand = Math.random();
      for (const effect of EFFECTS_PROBABILITY) {
        if (rand < effect.prob) return effect.name;
        rand -= effect.prob;
      }
      return null;
    };

    const drawn = drawnCards.map((card) => ({ card, specialEffect: drawEffect() }));

    const created = await prisma.$transaction(async (tx) => {
      const dec = await tx.userBox.updateMany({
        where: { userId, boxType: currentType, amount: { gt: 0 } },
        data: { amount: { decrement: 1 } },
      });
      if (dec.count === 0) return null;
      return tx.userCard.createManyAndReturn({
        data: drawn.map((d) => ({ userId, tradingCardId: d.card.id, specialEffect: d.specialEffect })),
      });
    });

    if (!created) {
      return NextResponse.json({ error: `Vous n'avez pas de Box ${currentType}.` }, { status: 400 });
    }

    notifyWallet(userId);

    const byId = new Map(cards.map((c) => [c.id, c]));
    const userCards = created.map((uc) => ({ ...uc, tradingCard: byId.get(uc.tradingCardId)! }));

    return NextResponse.json({
      drawnCards: userCards.map((uc) => uc.tradingCard),
      userCards,
    });
  } catch (error) {
    console.error("Pack Opening Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
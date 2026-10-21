import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { FESTIVE_CHANCE, BOOSTER_CARDS_PER_PACK, BOOSTER_DROP_RATES, BOOSTER_PACKS, type BoosterPackId } from "@/config/boosters";
import { memo } from "@/lib/cache";
import { notifyWallet, walletSnapshot } from "@/lib/realtime/emit";

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

    const currentType = Object.hasOwn(BOOSTER_PACKS, boxType) ? (boxType as BoosterPackId) : "standard";
    const rates: Record<string, number> = BOOSTER_DROP_RATES[currentType];
    const numCards = BOOSTER_CARDS_PER_PACK[currentType];

    // Une carte avec attributes.boosters ({ standard: 10 }) ne sort que dans ces boosters, avec cette chance (%) par carte tirée.
    const pins = (card: { attributes: string }): Record<string, number> | null => {
      try {
        const b = JSON.parse(card.attributes || "{}").boosters;
        return b && typeof b === "object" && Object.keys(b).length ? b : null;
      } catch {
        return null;
      }
    };
    const pinned = cards.filter((c) => Number(pins(c)?.[currentType]) > 0);
    const open = cards.filter((c) => !pins(c));
    const pool0 = open.length ? open : cards;

    const cardsByRarity: Record<string, typeof cards> = {
      COMMON: pool0.filter(c => c.rarity === "COMMON"),
      UNCOMMON: pool0.filter(c => c.rarity === "UNCOMMON"),
      RARE: pool0.filter(c => c.rarity === "RARE"),
      EPIC: pool0.filter(c => c.rarity === "EPIC"),
      LEGENDARY: pool0.filter(c => c.rarity === "LEGENDARY"),
      MYTHIC: pool0.filter(c => c.rarity === "MYTHIC")
    };

    const drawCard = () => {
      for (const c of pinned) if (Math.random() * 100 < Number(pins(c)![currentType])) return c;
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
        if (!pool || pool.length === 0) pool = pool0;
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

    const drawEffect = () => {
      let rand = Math.random();
      for (const effect of EFFECTS_PROBABILITY) {
        if (rand < effect.prob) return effect.name;
        rand -= effect.prob;
      }
      return null;
    };

    // Les effets de fête ne sortent que dans leur booster de fête, avec priorité sur les effets normaux.
    const festive = BOOSTER_PACKS[currentType].effect;
    const festiveChance = (card: { attributes: string }) => {
      try {
        const v = Number(JSON.parse(card.attributes || "{}").festiveChance);
        return Number.isFinite(v) && v >= 0 && v <= 100 ? v : FESTIVE_CHANCE;
      } catch {
        return FESTIVE_CHANCE;
      }
    };
    const drawn = drawnCards.map((card) => ({
      card,
      specialEffect: festive && Math.random() * 100 < festiveChance(card) ? `${festive} ${new Date().getFullYear()}` : drawEffect(),
    }));

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
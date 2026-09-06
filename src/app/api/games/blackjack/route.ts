import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";

type Suit = "S" | "H" | "D" | "C";
type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";

interface Card {
  suit: Suit;
  rank: Rank;
}

interface GameState {
  userId: string;
  bet: number;
  deck: Card[];
  playerHand: Card[];
  dealerHand: Card[];
  status: "playing" | "dealer_won" | "player_won" | "push" | "player_blackjack";
  canDouble: boolean;
  gameId: string;
}

const SUITS: Suit[] = ["S", "H", "D", "C"];
const RANKS: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (let d = 0; d < 2; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ suit, rank });
      }
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function calculateHand(cards: Card[]): number {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.rank === "A") {
      aces++;
      total += 11;
    } else if (["K", "Q", "J", "10"].includes(c.rank)) {
      total += 10;
    } else {
      total += parseInt(c.rank, 10);
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function getSecretKey(): string {
  return process.env.NEXTAUTH_SECRET || "paranoia-blackjack-secret-key-fallback";
}

function signState(state: GameState): string {
  const payload = Buffer.from(JSON.stringify(state)).toString("base64url");
  const signature = crypto.createHmac("sha256", getSecretKey()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function verifyState(token: string): GameState | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  const expected = crypto.createHmac("sha256", getSecretKey()).update(payload).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { action, bet, token } = body;

  if (action === "deal") {
    const betAmount = parseInt(bet, 10);
    if (isNaN(betAmount) || betAmount < 10 || betAmount > 50000) {
      return NextResponse.json({ error: "Mise invalide (min: 10, max: 50 000)" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { paraCoins: true },
    });

    if (!user || user.paraCoins < betAmount) {
      return NextResponse.json({ error: "Solde insuffisant de ParaCoins" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { paraCoins: { decrement: betAmount } },
      select: { paraCoins: true },
    });

    const deck = createDeck();
    const playerHand: Card[] = [deck.pop()!, deck.pop()!];
    const dealerHand: Card[] = [deck.pop()!, deck.pop()!];

    const playerScore = calculateHand(playerHand);
    const dealerScore = calculateHand(dealerHand);
    const isPlayerBJ = playerScore === 21;
    const isDealerBJ = dealerScore === 21;

    let status: GameState["status"] = "playing";
    let payout = 0;

    if (isPlayerBJ) {
      if (isDealerBJ) {
        status = "push";
        payout = betAmount;
      } else {
        status = "player_blackjack";
        payout = Math.floor(betAmount * 2.5);
      }
    }

    let finalCoins = updatedUser.paraCoins;
    if (payout > 0) {
      const credited = await prisma.user.update({
        where: { id: userId },
        data: { paraCoins: { increment: payout } },
        select: { paraCoins: true },
      });
      finalCoins = credited.paraCoins;
    }

    const gameState: GameState = {
      userId,
      bet: betAmount,
      deck,
      playerHand,
      dealerHand,
      status,
      canDouble: !isPlayerBJ,
      gameId: crypto.randomUUID(),
    };

    const nextToken = status === "playing" ? signState(gameState) : null;

    return NextResponse.json({
      success: true,
      token: nextToken,
      playerHand,
      dealerHand: status === "playing" ? [dealerHand[0], { suit: "?", rank: "?" }] : dealerHand,
      playerScore,
      dealerScore: status === "playing" ? calculateHand([dealerHand[0]]) : dealerScore,
      status,
      payout,
      paraCoins: finalCoins,
    });
  }

  if (!token) {
    return NextResponse.json({ error: "Token de partie manquant" }, { status: 400 });
  }

  const gameState = verifyState(token);
  if (!gameState || gameState.userId !== userId || gameState.status !== "playing") {
    return NextResponse.json({ error: "Partie invalide ou expirée" }, { status: 400 });
  }

  if (action === "hit") {
    const card = gameState.deck.pop();
    if (!card) {
      return NextResponse.json({ error: "Erreur de paquet" }, { status: 500 });
    }

    gameState.playerHand.push(card);
    gameState.canDouble = false;
    const playerScore = calculateHand(gameState.playerHand);

    if (playerScore > 21) {
      gameState.status = "dealer_won";
      const dealerScore = calculateHand(gameState.dealerHand);
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { paraCoins: true },
      });

      return NextResponse.json({
        success: true,
        token: null,
        playerHand: gameState.playerHand,
        dealerHand: gameState.dealerHand,
        playerScore,
        dealerScore,
        status: "dealer_won",
        payout: 0,
        paraCoins: user?.paraCoins ?? 0,
      });
    }

    const nextToken = signState(gameState);

    return NextResponse.json({
      success: true,
      token: nextToken,
      playerHand: gameState.playerHand,
      dealerHand: [gameState.dealerHand[0], { suit: "?", rank: "?" }],
      playerScore,
      dealerScore: calculateHand([gameState.dealerHand[0]]),
      status: "playing",
      payout: 0,
    });
  }

  if (action === "double") {
    if (!gameState.canDouble) {
      return NextResponse.json({ error: "Impossible de doubler maintenant" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { paraCoins: true },
    });

    if (!user || user.paraCoins < gameState.bet) {
      return NextResponse.json({ error: "Solde insuffisant pour doubler" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { paraCoins: { decrement: gameState.bet } },
    });

    gameState.bet *= 2;
    gameState.canDouble = false;

    const card = gameState.deck.pop();
    if (!card) {
      return NextResponse.json({ error: "Erreur de paquet" }, { status: 500 });
    }

    gameState.playerHand.push(card);
    const playerScore = calculateHand(gameState.playerHand);

    if (playerScore > 21) {
      const dealerScore = calculateHand(gameState.dealerHand);
      const updatedUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { paraCoins: true },
      });
      return NextResponse.json({
        success: true,
        token: null,
        playerHand: gameState.playerHand,
        dealerHand: gameState.dealerHand,
        playerScore,
        dealerScore,
        status: "dealer_won",
        payout: 0,
        paraCoins: updatedUser?.paraCoins ?? 0,
      });
    }

    let dealerScore = calculateHand(gameState.dealerHand);
    while (dealerScore < 17) {
      const dCard = gameState.deck.pop();
      if (!dCard) break;
      gameState.dealerHand.push(dCard);
      dealerScore = calculateHand(gameState.dealerHand);
    }

    let status: GameState["status"] = "dealer_won";
    let payout = 0;

    if (dealerScore > 21 || playerScore > dealerScore) {
      status = "player_won";
      payout = gameState.bet * 2;
    } else if (playerScore === dealerScore) {
      status = "push";
      payout = gameState.bet;
    }

    let finalCoins = 0;
    if (payout > 0) {
      const credited = await prisma.user.update({
        where: { id: userId },
        data: { paraCoins: { increment: payout } },
        select: { paraCoins: true },
      });
      finalCoins = credited.paraCoins;
    } else {
      const current = await prisma.user.findUnique({
        where: { id: userId },
        select: { paraCoins: true },
      });
      finalCoins = current?.paraCoins ?? 0;
    }

    return NextResponse.json({
      success: true,
      token: null,
      playerHand: gameState.playerHand,
      dealerHand: gameState.dealerHand,
      playerScore,
      dealerScore,
      status,
      payout,
      paraCoins: finalCoins,
    });
  }

  if (action === "stand") {
    const playerScore = calculateHand(gameState.playerHand);
    let dealerScore = calculateHand(gameState.dealerHand);

    while (dealerScore < 17) {
      const card = gameState.deck.pop();
      if (!card) break;
      gameState.dealerHand.push(card);
      dealerScore = calculateHand(gameState.dealerHand);
    }

    let status: GameState["status"] = "dealer_won";
    let payout = 0;

    if (dealerScore > 21 || playerScore > dealerScore) {
      status = "player_won";
      payout = gameState.bet * 2;
    } else if (playerScore === dealerScore) {
      status = "push";
      payout = gameState.bet;
    }

    let finalCoins = 0;
    if (payout > 0) {
      const credited = await prisma.user.update({
        where: { id: userId },
        data: { paraCoins: { increment: payout } },
        select: { paraCoins: true },
      });
      finalCoins = credited.paraCoins;
    } else {
      const current = await prisma.user.findUnique({
        where: { id: userId },
        select: { paraCoins: true },
      });
      finalCoins = current?.paraCoins ?? 0;
    }

    return NextResponse.json({
      success: true,
      token: null,
      playerHand: gameState.playerHand,
      dealerHand: gameState.dealerHand,
      playerScore,
      dealerScore,
      status,
      payout,
      paraCoins: finalCoins,
    });
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}

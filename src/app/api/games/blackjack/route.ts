import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import crypto from "crypto";
import { authOptions } from "@/lib/auth";
import { seal, openOnce } from "@/lib/games/sealedState";
import { debit, credit, balance, recordBet, recordWin } from "@/lib/games/wallet";

type Suit = "S" | "H" | "D" | "C";
type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";

interface Card {
  suit: Suit;
  rank: Rank;
}

type Status = "playing" | "dealer_won" | "player_won" | "push" | "player_blackjack";

interface GameState {
  userId: string;
  bet: number;
  deck: Card[];
  playerHand: Card[];
  dealerHand: Card[];
  status: Status;
  canDouble: boolean;
  gameId: string;
}

const SUITS: Suit[] = ["S", "H", "D", "C"];
const RANKS: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const HIDDEN = { suit: "?", rank: "?" } as const;

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (let d = 0; d < 2; d++) for (const suit of SUITS) for (const rank of RANKS) deck.push({ suit, rank });
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
    } else if (["K", "Q", "J", "10"].includes(c.rank)) total += 10;
    else total += parseInt(c.rank, 10);
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function playing(state: GameState) {
  return {
    success: true,
    token: seal(state),
    playerHand: state.playerHand,
    dealerHand: [state.dealerHand[0], HIDDEN],
    playerScore: calculateHand(state.playerHand),
    dealerScore: calculateHand([state.dealerHand[0]]),
    status: "playing" as const,
    payout: 0,
  };
}

async function finish(userId: string, state: GameState, status: Status, payout: number) {
  const paraCoins = payout > 0 ? await credit(userId, payout) : await balance(userId);
  await recordWin(userId, payout);
  return {
    success: true,
    token: null,
    playerHand: state.playerHand,
    dealerHand: state.dealerHand,
    playerScore: calculateHand(state.playerHand),
    dealerScore: calculateHand(state.dealerHand),
    status,
    payout,
    paraCoins,
  };
}

function dealerPlays(state: GameState) {
  while (calculateHand(state.dealerHand) < 17) {
    const card = state.deck.pop();
    if (!card) break;
    state.dealerHand.push(card);
  }
  const p = calculateHand(state.playerHand);
  const d = calculateHand(state.dealerHand);
  if (d > 21 || p > d) return { status: "player_won" as const, payout: state.bet * 2 };
  if (p === d) return { status: "push" as const, payout: state.bet };
  return { status: "dealer_won" as const, payout: 0 };
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { action, bet, token } = body;

  if (action === "deal") {
    const betAmount = parseInt(bet, 10);
    if (isNaN(betAmount) || betAmount < 10 || betAmount > 50000) {
      return NextResponse.json({ error: "Mise invalide (min: 10, max: 50 000)" }, { status: 400 });
    }
    const afterDebit = await debit(userId, betAmount);
    if (afterDebit === null) {
      return NextResponse.json({ error: "Solde insuffisant de ParaCoins" }, { status: 400 });
    }
    await recordBet(userId, betAmount);

    const deck = createDeck();
    const state: GameState = {
      userId,
      bet: betAmount,
      deck,
      playerHand: [deck.pop()!, deck.pop()!],
      dealerHand: [deck.pop()!, deck.pop()!],
      status: "playing",
      canDouble: true,
      gameId: crypto.randomUUID(),
    };

    const playerBJ = calculateHand(state.playerHand) === 21;
    const dealerBJ = calculateHand(state.dealerHand) === 21;
    if (playerBJ) {
      return NextResponse.json(
        dealerBJ
          ? await finish(userId, state, "push", betAmount)
          : await finish(userId, state, "player_blackjack", Math.floor(betAmount * 2.5))
      );
    }
    return NextResponse.json({ ...playing(state), paraCoins: afterDebit });
  }

  const state = openOnce<GameState>(token);
  if (!state || state.userId !== userId || state.status !== "playing") {
    return NextResponse.json({ error: "Partie invalide ou expirée" }, { status: 400 });
  }

  if (action === "hit") {
    const card = state.deck.pop();
    if (!card) return NextResponse.json({ error: "Erreur de paquet" }, { status: 500 });
    state.playerHand.push(card);
    state.canDouble = false;
    if (calculateHand(state.playerHand) > 21) {
      return NextResponse.json(await finish(userId, state, "dealer_won", 0));
    }
    return NextResponse.json(playing(state));
  }

  if (action === "double") {
    if (!state.canDouble) {
      return NextResponse.json({ error: "Impossible de doubler maintenant", token: seal(state) }, { status: 400 });
    }
    if ((await debit(userId, state.bet)) === null) {
      return NextResponse.json({ error: "Solde insuffisant pour doubler", token: seal(state) }, { status: 400 });
    }
    await recordBet(userId, state.bet, false);
    state.bet *= 2;
    state.canDouble = false;
    const card = state.deck.pop();
    if (!card) return NextResponse.json({ error: "Erreur de paquet" }, { status: 500 });
    state.playerHand.push(card);
    if (calculateHand(state.playerHand) > 21) {
      return NextResponse.json(await finish(userId, state, "dealer_won", 0));
    }
    const { status, payout } = dealerPlays(state);
    return NextResponse.json(await finish(userId, state, status, payout));
  }

  if (action === "stand") {
    const { status, payout } = dealerPlays(state);
    return NextResponse.json(await finish(userId, state, status, payout));
  }

  return NextResponse.json({ error: "Action inconnue", token: seal(state) }, { status: 400 });
}

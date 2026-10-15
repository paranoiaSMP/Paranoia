import { NextResponse } from "next/server";
import { boosterStates } from "@/lib/boosters";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await boosterStates());
  } catch (error) {
    console.error("Booster state error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

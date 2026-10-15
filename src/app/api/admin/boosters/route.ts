import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";
import { BOOSTER_PACKS, type BoosterPackId } from "@/config/boosters";
import { boosterStates, saveBooster } from "@/lib/boosters";
import { z } from "zod";

const body = z.object({
  id: z.string().refine((v) => Object.hasOwn(BOOSTER_PACKS, v)),
  visible: z.boolean(),
  stock: z.number().int().min(0).max(1_000_000).nullable(),
});

async function guard() {
  const session = await getServerSession(authOptions);
  return session?.user && isAdmin(session.user.role);
}

export async function GET() {
  if (!(await guard())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await boosterStates());
}

export async function PUT(req: Request) {
  if (!(await guard())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Valeurs invalides." }, { status: 400 });
  const { id, visible, stock } = parsed.data;
  await saveBooster(id as BoosterPackId, { visible, stock });
  return NextResponse.json({ success: true, message: "Booster mis à jour." });
}

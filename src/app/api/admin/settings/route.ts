import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { clearMaintenanceCache } from "@/lib/maintenance";
import { EVENT_MODES } from "@/lib/events";
import { isOwner } from "@/lib/roles";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isOwner((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (key) {
      const setting = await prisma.systemSetting.findUnique({ where: { key } });
      return NextResponse.json({ value: setting?.value || null });
    }

    const settings = await prisma.systemSetting.findMany();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("GET /api/admin/settings Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isOwner((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ error: "Missing key or value" }, { status: 400 });
    }

    if (key === "maintenance" && !["on", "off"].includes(String(value))) {
      return NextResponse.json({ error: "Valeur attendue : on ou off." }, { status: 400 });
    }
    if (key === "event" && !(EVENT_MODES as readonly string[]).includes(String(value))) {
      return NextResponse.json({ error: "Valeur attendue : auto, off ou un événement connu." }, { status: 400 });
    }
    if (key === "discord_url" && !/^https:\/\/(discord\.gg|discord\.com\/invite)\/[A-Za-z0-9-]+\/?$/.test(String(value))) {
      return NextResponse.json({ error: "Lien invalide : https://discord.gg/… attendu." }, { status: 400 });
    }

    const setting = await prisma.systemSetting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    });

    if (key === "maintenance") clearMaintenanceCache();
    const { revalidatePath } = require("next/cache");
    revalidatePath("/", "layout");

    return NextResponse.json(setting);
  } catch (error) {
    console.error("POST /api/admin/settings Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

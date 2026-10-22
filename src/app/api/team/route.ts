import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { siteConfig } from "@/config/site";
import { uuidForms } from "@/lib/mojang";

export const revalidate = 300;

export async function GET() {
  try {
    const staff = await prisma.user.findMany({
      where: {
        minecraftName: { not: null },
        OR: [
          { role: { in: ["OWNER", "DEV", "ADMIN", "MODERATOR"] } },
          { minecraftUuid: { in: uuidForms(siteConfig.founderUuid) } },
        ],
      },
      select: { minecraftName: true, minecraftUuid: true, role: true, createdAt: true, staffTitle: true, staffBio: true, staffColor: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(staff);
  } catch (error) {
    console.error("[TEAM_GET]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

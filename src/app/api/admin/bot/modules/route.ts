import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const config = await prisma.guildConfig.findFirst();
    if (!config) {
      const newConfig = await prisma.guildConfig.create({
        data: {
          guildId: "default",
        },
      });
      return NextResponse.json(newConfig);
    }
    return NextResponse.json(config);
  } catch (error) {
    console.error("GET Modules Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const config = await prisma.guildConfig.findFirst();

    if (!config) {
      return NextResponse.json({ error: "Configuration introuvable" }, { status: 404 });
    }

    const updatedConfig = await prisma.guildConfig.update({
      where: { guildId: config.guildId },
      data: {
        moduleTickets: body.moduleTickets,
        moduleWelcome: body.moduleWelcome,
        moduleSecurity: body.moduleSecurity,
        moduleAutoMod: body.moduleAutoMod,
        moduleAuditLogs: body.moduleAuditLogs,
        moduleTempVoice: body.moduleTempVoice,
        moduleEconomy: body.moduleEconomy,
        moduleXp: body.moduleXp,
        moduleTcg: body.moduleTcg,
      },
    });

    return NextResponse.json(updatedConfig);
  } catch (error) {
    console.error("PUT Modules Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}



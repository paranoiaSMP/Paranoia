import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const SETTING_KEY = "shared_embed_templates";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "MODERATOR")) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: SETTING_KEY },
    });

    const templates = setting ? JSON.parse(setting.value) : [];
    return NextResponse.json(templates);
  } catch (error) {
    console.error("Failed to fetch embed templates:", error);
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "MODERATOR")) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, embed, components } = body;

    if (!name?.trim()) {
      return new NextResponse("Nom de template requis", { status: 400 });
    }

    const setting = await prisma.systemSetting.findUnique({
      where: { key: SETTING_KEY },
    });

    let templates: any[] = setting ? JSON.parse(setting.value) : [];

    const newTemplate = {
      id: `tmpl_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      name: name.trim(),
      author: session.user.name || "Admin",
      createdAt: new Date().toISOString(),
      embed,
      components: components || [],
    };

    // Replace if same name, or prepend
    const existingIndex = templates.findIndex((t) => t.name.toLowerCase() === name.trim().toLowerCase());
    if (existingIndex >= 0) {
      templates[existingIndex] = newTemplate;
    } else {
      templates.unshift(newTemplate);
    }

    await prisma.systemSetting.upsert({
      where: { key: SETTING_KEY },
      update: { value: JSON.stringify(templates) },
      create: { key: SETTING_KEY, value: JSON.stringify(templates) },
    });

    return NextResponse.json({ success: true, template: newTemplate });
  } catch (error) {
    console.error("Failed to save embed template:", error);
    return new NextResponse("Erreur lors de la sauvegarde", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return new NextResponse("ID manquant", { status: 400 });
    }

    const setting = await prisma.systemSetting.findUnique({
      where: { key: SETTING_KEY },
    });

    if (setting) {
      let templates: any[] = JSON.parse(setting.value);
      templates = templates.filter((t) => t.id !== id && t.name !== id);

      await prisma.systemSetting.update({
        where: { key: SETTING_KEY },
        data: { value: JSON.stringify(templates) },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete embed template:", error);
    return new NextResponse("Erreur lors de la suppression", { status: 500 });
  }
}

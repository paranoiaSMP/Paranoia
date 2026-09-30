import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { isValidMinecraftSkin } from "@/lib/mojang";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { uuid } = await params;
    const cleanUuid = uuid.replace(/-/g, "").toLowerCase();

    const formData = await req.formData();
    const file = formData.get("skin") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (!isValidMinecraftSkin(buffer)) {
      return NextResponse.json(
        { error: "Le skin doit être un PNG valide de dimensions 64x64 pixels." },
        { status: 400 }
      );
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "skins");
    await fs.mkdir(uploadDir, { recursive: true });

    const existingPlayer = await prisma.player.findFirst({
      where: {
        OR: [
          { uuid: cleanUuid },
          { id: uuid },
          { minecraftName: uuid },
        ],
      },
    });

    if (existingPlayer?.customSkinUrl) {
      const oldPath = path.join(process.cwd(), "public", existingPlayer.customSkinUrl);
      await fs.unlink(oldPath).catch(() => null);
    }

    const fileName = `${cleanUuid}-${Date.now()}.png`;
    const filePath = path.join(uploadDir, fileName);
    await fs.writeFile(filePath, buffer);

    const customSkinUrl = `/uploads/skins/${fileName}`;

    if (existingPlayer) {
      await prisma.player.update({
        where: { id: existingPlayer.id },
        data: { customSkinUrl },
      });
    }

    return NextResponse.json({ success: true, customSkinUrl });
  } catch (error) {
    console.error("Skin upload error:", error);
    return NextResponse.json({ error: "Erreur lors de l'upload du skin" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { uuid } = await params;
    const cleanUuid = uuid.replace(/-/g, "").toLowerCase();

    const player = await prisma.player.findFirst({
      where: {
        OR: [
          { uuid: cleanUuid },
          { id: uuid },
          { minecraftName: uuid },
        ],
      },
    });

    if (player?.customSkinUrl) {
      const localPath = path.join(process.cwd(), "public", player.customSkinUrl);
      await fs.unlink(localPath).catch(() => null);

      await prisma.player.update({
        where: { id: player.id },
        data: { customSkinUrl: null },
      });
    }

    return NextResponse.json({ success: true, customSkinUrl: null });
  } catch {
    return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
  }
}

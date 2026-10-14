import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadBufferToR2 } from "@/lib/r2";
import { isAdmin } from "@/lib/roles";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    if (!session || !user || !isAdmin(user.role)) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const playerName = formData.get('playerName') as string | null;

    if (!file || typeof file === "string") {
      return new NextResponse("No file received.", { status: 400 });
    }

    const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif", "video/mp4", "video/webm"];
    if (!ALLOWED.includes(file.type)) {
      return new NextResponse("Type de fichier refusé (PNG, JPEG, WebP, GIF, MP4 ou WebM).", { status: 415 });
    }
    if (file.size > 25 * 1024 * 1024) {
      return new NextResponse("Fichier trop lourd (25 Mo maximum).", { status: 413 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const publicUrl = await uploadBufferToR2(buffer, file.name, file.type, playerName);

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error("Error uploading file to R2:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadBufferToR2 } from "@/lib/r2";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    if (!session || !user || user.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const playerName = formData.get('playerName') as string | null;

    if (!file) {
      return new NextResponse("No file received.", { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const publicUrl = await uploadBufferToR2(buffer, file.name, file.type || "image/png", playerName);

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error("Error uploading file to R2:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

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

    if (!process.env.R2_ACCOUNT_ID || !process.env.R2_BUCKET_NAME || !process.env.R2_PUBLIC_URL) {
      return new NextResponse("Cloudflare R2 is not configured on this server.", { status: 500 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = file.name.split('.').pop() || 'png';
    const folder = playerName ? `cards/${playerName}` : 'cards/general';
    const uniqueFilename = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: uniqueFilename,
        Body: buffer,
        ContentType: file.type || "image/png",
      })
    );

    const baseUrl = process.env.R2_PUBLIC_URL.endsWith('/') ? process.env.R2_PUBLIC_URL : `${process.env.R2_PUBLIC_URL}/`;
    const publicUrl = `${baseUrl}${uniqueFilename}`;

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error("Error uploading file to R2:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
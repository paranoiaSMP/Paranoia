import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

export async function uploadBufferToR2(
  buffer: Buffer,
  filename: string,
  contentType: string = "image/png",
  playerName?: string | null
): Promise<string> {
  const folder = playerName ? `cards/${playerName}` : "cards/general";
  const ext = filename.split(".").pop() || "png";
  const uniqueKey = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

  if (
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_BUCKET_NAME &&
    process.env.R2_PUBLIC_URL &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY
  ) {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: uniqueKey,
        Body: buffer,
        ContentType: contentType,
      })
    );

    const baseUrl = process.env.R2_PUBLIC_URL.endsWith("/")
      ? process.env.R2_PUBLIC_URL
      : `${process.env.R2_PUBLIC_URL}/`;
    return `${baseUrl}${uniqueKey}`;
  }

  try {
    const localDir = path.join(process.cwd(), "public", "uploads", folder);
    fs.mkdirSync(localDir, { recursive: true });
    const localFileName = path.basename(uniqueKey);
    const localPath = path.join(localDir, localFileName);
    fs.writeFileSync(localPath, buffer);
    return `/uploads/${folder}/${localFileName}`;
  } catch (err) {
    console.error("Local write error in r2 fallback:", err);
    return "";
  }
}

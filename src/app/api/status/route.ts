import { NextResponse } from "next/server";
import { isSiteClosed } from "@/lib/maintenance";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ closed: await isSiteClosed() });
}

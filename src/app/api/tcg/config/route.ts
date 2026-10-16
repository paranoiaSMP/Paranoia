import { NextResponse } from "next/server";
import { getTcgConfig } from "@/lib/tcgConfig";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getTcgConfig());
}

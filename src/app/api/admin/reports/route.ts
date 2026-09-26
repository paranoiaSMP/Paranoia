import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (role !== "DEV" && role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const reports = await prisma.bugReport.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(reports);
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
}

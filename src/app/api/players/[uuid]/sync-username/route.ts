import { NextResponse } from "next/server";
import { syncMojangUsername } from "@/lib/mojang";
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
    const newName = await syncMojangUsername(uuid);

    if (!newName) {
      return NextResponse.json(
        { error: "Impossible de récupérer le pseudo depuis Mojang" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, username: newName });
  } catch {
    return new NextResponse("Internal Error", { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllTickets, createTicket } from "@/lib/tickets";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const url = new URL(req.url);
    const userIdQuery = url.searchParams.get("userId");
    const tickets = await getAllTickets();

    const isAdmin = (session?.user as any)?.role === "ADMIN";

    if (isAdmin && !userIdQuery) {
      return NextResponse.json(tickets);
    }

    const targetUserId = userIdQuery || (session?.user as any)?.id;
    if (targetUserId) {
      return NextResponse.json(tickets.filter(t => t.userId === targetUserId));
    }

    return NextResponse.json(tickets);
  } catch (error) {
    console.error("GET /api/tickets error:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { category, description, details, minecraftName, userName } = body;

    if (!category || !description) {
      return new NextResponse("Champs obligatoires manquants", { status: 400 });
    }

    const effectiveUserName = session?.user?.name || userName || "Visiteur";
    const effectiveUserId = (session?.user as any)?.id;
    const effectiveUserImage = session?.user?.image || undefined;
    const effectiveUserEmail = session?.user?.email || undefined;

    const ticket = await createTicket({
      userName: effectiveUserName,
      userId: effectiveUserId,
      userEmail: effectiveUserEmail,
      userImage: effectiveUserImage,
      minecraftName: minecraftName || undefined,
      category,
      description,
      details,
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch {
    return new NextResponse("Internal Error", { status: 500 });
  }
}

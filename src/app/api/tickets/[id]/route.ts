import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isStaff } from "@/lib/roles";
import { getTicketById, claimTicket, closeTicket } from "@/lib/tickets";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse("Non connecté", { status: 401 });

    const { id } = await params;
    const ticket = await getTicketById(id);
    if (!ticket || (!isStaff(session.user.role) && ticket.userId !== session.user.id)) {
      return new NextResponse("Ticket introuvable", { status: 404 });
    }
    return NextResponse.json(ticket);
  } catch {
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !isStaff(session.user.role)) {
      return new NextResponse("Non autorisé", { status: 401 });
    }
    const { id } = await params;
    const { action } = await req.json().catch(() => ({}));
    const staffName = session.user.name || "Staff";

    if (action === "claim") {
      const ticket = await claimTicket(id, staffName);
      if (!ticket) return new NextResponse("Ticket introuvable", { status: 404 });
      return NextResponse.json(ticket);
    }
    if (action === "close") {
      const ticket = await closeTicket(id, staffName);
      if (!ticket) return new NextResponse("Ticket introuvable", { status: 404 });
      return NextResponse.json(ticket);
    }
    return new NextResponse("Action non reconnue", { status: 400 });
  } catch {
    return new NextResponse("Internal Error", { status: 500 });
  }
}

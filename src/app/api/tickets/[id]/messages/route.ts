import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isStaff } from "@/lib/roles";
import { addMessageToTicket, getTicketById } from "@/lib/tickets";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse("Non connecté", { status: 401 });

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const content = typeof body.content === "string" ? body.content.trim().slice(0, 4000) : "";
    if (!content) {
      return new NextResponse("Le message ne peut pas être vide", { status: 400 });
    }

    const staff = isStaff(session.user.role);
    const ticket = await getTicketById(id);
    if (!ticket || (!staff && ticket.userId !== session.user.id)) {
      return new NextResponse("Ticket introuvable", { status: 404 });
    }
    if (ticket.status === "CLOSED") {
      return new NextResponse("Ce ticket est fermé", { status: 400 });
    }

    const updated = await addMessageToTicket(id, {
      authorName: session.user.name || "Membre",
      authorRole: staff ? "STAFF" : "USER",
      authorImage: session.user.image || undefined,
      content,
    });

    return NextResponse.json(updated);
  } catch {
    return new NextResponse("Internal Error", { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { addMessageToTicket, getTicketById } from "@/lib/tickets";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { content, authorName } = body;

    if (!content || !content.trim()) {
      return new NextResponse("Le message ne peut pas être vide", { status: 400 });
    }

    const ticket = await getTicketById(id);
    if (!ticket) {
      return new NextResponse("Ticket introuvable", { status: 404 });
    }

    if (ticket.status === "CLOSED") {
      return new NextResponse("Ce ticket est fermé", { status: 400 });
    }

    const isAdmin = (session?.user as any)?.role === "ADMIN";
    const authorRole = isAdmin ? "STAFF" : "USER";
    const name = session?.user?.name || authorName || "Utilisateur";
    const image = session?.user?.image || undefined;

    const updated = await addMessageToTicket(id, {
      authorName: name,
      authorRole,
      authorImage: image,
      content: content.trim(),
    });

    return NextResponse.json(updated);
  } catch {
    return new NextResponse("Internal Error", { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getAllTickets, addMessageToTicket, closeTicket } from "@/lib/tickets";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const expectedToken = process.env.DISCORD_TOKEN;

    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { channelId, authorName, authorRole, authorImage, content, action } = body;

    if (!channelId) {
      return new NextResponse("channelId required", { status: 400 });
    }

    const tickets = await getAllTickets();
    const ticket = tickets.find(t => t.discordChannelId === channelId);

    if (!ticket) {
      return new NextResponse("Ticket not found for this channel", { status: 404 });
    }

    if (action === "close") {
      const closed = await closeTicket(ticket.id, authorName || "Staff Discord");
      return NextResponse.json({ success: true, ticket: closed });
    }

    if (!content || !content.trim()) {
      return new NextResponse("Content empty", { status: 400 });
    }

    const updated = await addMessageToTicket(
      ticket.id,
      {
        authorName: authorName || "Staff Discord",
        authorRole: (authorRole as any) || "STAFF",
        authorImage: authorImage || undefined,
        content: content.trim(),
      },
      { skipDiscord: true }
    );

    return NextResponse.json({ success: true, ticket: updated });
  } catch (err) {
    console.error("sync-discord error:", err);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

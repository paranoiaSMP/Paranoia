import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isStaff } from "@/lib/roles";
import { getAllTickets, createTicket } from "@/lib/tickets";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse("Non connecté", { status: 401 });

    const tickets = await getAllTickets();
    if (isStaff(session.user.role)) {
      const userId = new URL(req.url).searchParams.get("userId");
      return NextResponse.json(userId ? tickets.filter((t) => t.userId === userId) : tickets);
    }
    return NextResponse.json(tickets.filter((t) => t.userId === session.user.id));
  } catch (error) {
    console.error("GET /api/tickets error:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Connecte-toi pour ouvrir un ticket.", { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const category = str(body.category, 60);
    const description = str(body.description, 5000);
    const details = str(body.details, 2000) || undefined;

    if (!category || !description) {
      return new NextResponse("Champs obligatoires manquants", { status: 400 });
    }

    const ticket = await createTicket({
      userName: session.user.name || "Membre",
      userId: session.user.id,
      userEmail: session.user.email || undefined,
      userImage: session.user.image || undefined,
      minecraftName: session.user.minecraftName || undefined,
      category,
      description,
      details,
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch {
    return new NextResponse("Internal Error", { status: 500 });
  }
}

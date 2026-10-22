import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/roles";

// Profil public d'un membre du staff (titre, bio, couleur) affiché sur la page équipe.
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !isAdmin(session.user.role)) return new NextResponse("Unauthorized", { status: 401 });

  const { userId, staffTitle, staffBio, staffColor } = await req.json();
  if (!userId) return new NextResponse("userId requis", { status: 400 });
  const color = String(staffColor ?? "").trim();
  if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) return new NextResponse("Couleur invalide (format #RRGGBB).", { status: 400 });

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      staffTitle: String(staffTitle ?? "").trim().slice(0, 40) || null,
      staffBio: String(staffBio ?? "").trim().slice(0, 280) || null,
      staffColor: color || null,
    },
    select: { id: true, staffTitle: true, staffBio: true, staffColor: true },
  });
  return NextResponse.json(user);
}

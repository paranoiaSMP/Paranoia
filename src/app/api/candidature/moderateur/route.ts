import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Connecte-toi pour envoyer une candidature." }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const s = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
    const discordName = s(body.discordName, 100);
    const minecraftName = s(body.minecraftName, 16);
    const platform = s(body.platform, 100);
    const experience = s(body.experience, 4000);
    const motivation = s(body.motivation, 4000);
    const additions = s(body.additions, 4000);
    const other = s(body.other, 4000);

    if (!discordName || !platform || !experience || !motivation || !additions) {
      return NextResponse.json({ error: 'Veuillez remplir tous les champs obligatoires.' }, { status: 400 });
    }

    const application = await prisma.modApplication.create({
      data: {
        discordName,
        minecraftName: minecraftName || null,
        platform,
        experience,
        motivation,
        additions,
        other: other || null,
        applicantId: session.user.id,
      }
    });

    return NextResponse.json({ success: true, id: application.id });
  } catch (error: any) {
    console.error('Mod Application Error:', error);
    return NextResponse.json({ error: 'Erreur lors de la soumission de la candidature.' }, { status: 500 });
  }
}

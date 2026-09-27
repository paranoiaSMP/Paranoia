import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const {
      discordName,
      minecraftName,
      platform,
      experience,
      motivation,
      additions,
      other
    } = body;

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
        applicantId: session?.user?.id || null,
      }
    });

    return NextResponse.json({ success: true, id: application.id });
  } catch (error: any) {
    console.error('Mod Application Error:', error);
    return NextResponse.json({ error: 'Erreur lors de la soumission de la candidature.' }, { status: 500 });
  }
}

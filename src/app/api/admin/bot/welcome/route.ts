import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 });

    const config = await prisma.guildConfig.upsert({
      where: { guildId: 'default' },
      update: {},
      create: { guildId: 'default' }
    });

    return NextResponse.json({
      welcomeChannelId: config.welcomeChannelId || '',
      welcomeTitle: config.welcomeTitle || 'Bienvenue sur Paranoia !',
      welcomeDesc: config.welcomeDesc || 'Salut {user}, bienvenue sur le serveur !',
      welcomeColor: config.welcomeColor || '#a855f7',
      welcomeImage: config.welcomeImage || ''
    });
  } catch (error) {
    console.error(error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 });

    const body = await req.json();
    await prisma.guildConfig.update({
      where: { guildId: 'default' },
      data: {
        welcomeChannelId: body.welcomeChannelId || null,
        welcomeTitle: body.welcomeTitle || null,
        welcomeDesc: body.welcomeDesc || null,
        welcomeColor: body.welcomeColor || null,
        welcomeImage: body.welcomeImage || null,
      }
    });

    return new NextResponse('OK');
  } catch (error) {
    console.error(error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

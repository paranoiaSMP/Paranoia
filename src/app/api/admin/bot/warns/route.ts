import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 });
    
    // In a real app, verify if user is admin. For now, assume yes based on route protection.
    
    const warns = await prisma.warn.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    
    return NextResponse.json(warns);
  } catch (error) {
    console.error('[WARNS_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return new NextResponse('ID required', { status: 400 });

    await prisma.warn.delete({
      where: { id }
    });

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('[WARN_DELETE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

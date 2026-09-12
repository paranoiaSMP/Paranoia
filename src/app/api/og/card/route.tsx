import { ImageResponse } from 'next/og';
import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { uploadBufferToR2 } from '@/lib/r2';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cardId = searchParams.get('id');

    if (!cardId) {
      return new Response('Missing id', { status: 400 });
    }

    const card = await prisma.tradingCard.findUnique({
      where: { id: cardId },
      include: { player: true }
    });

    if (!card) {
      return new Response('Not found', { status: 404 });
    }

    if (card.renderedImageUrl && !searchParams.get('force')) {
      const target = card.renderedImageUrl.startsWith('http')
        ? card.renderedImageUrl
        : new URL(card.renderedImageUrl, req.url).toString();
      return NextResponse.redirect(target);
    }

    const rarityColors: Record<string, string> = {
      'MYTHIC': '#dc2626',
      'LEGENDARY': '#facc15',
      'EPIC': '#a855f7',
      'RARE': '#3b82f6',
      'UNCOMMON': '#22c55e',
      'COMMON': '#94a3b8'
    };

    const color = rarityColors[card.rarity] || '#94a3b8';

    const mcName = card.player?.minecraftName || card.title || 'Steve';
    let bgImage = `https://vzge.me/bust/512/${mcName}.png`;

    if (card.imageUrl) {
      if (card.imageUrl.startsWith('http://') || card.imageUrl.startsWith('https://')) {
        try {
          const res = await fetch(card.imageUrl, {
            headers: { 'User-Agent': 'ParanoiaStudio/1.0 (+https://paranoiasmp.fr)' },
            signal: AbortSignal.timeout(4000)
          });
          if (res.ok) {
            const buf = Buffer.from(await res.arrayBuffer());
            const ct = res.headers.get('content-type') || 'image/png';
            if (ct.startsWith('image/')) {
              bgImage = `data:${ct};base64,${buf.toString('base64')}`;
            }
          }
        } catch {}
      } else {
        try {
          const fs = await import('fs');
          const path = await import('path');
          const localPath = path.join(process.cwd(), 'public', card.imageUrl.replace(/^\//, ''));
          if (fs.existsSync(localPath)) {
            const fileData = fs.readFileSync(localPath);
            const ext = path.extname(localPath).slice(1) || 'png';
            bgImage = `data:image/${ext};base64,${fileData.toString('base64')}`;
          }
        } catch {}
      }
    }

    if (!bgImage.startsWith('data:image/')) {
      try {
        const vzgeUrl = `https://vzge.me/bust/512/${mcName}.png`;
        const res = await fetch(vzgeUrl, {
          headers: { 'User-Agent': 'ParanoiaStudio/1.0 (+https://paranoiasmp.fr)' },
          signal: AbortSignal.timeout(4000)
        });
        if (res.ok) {
          const buf = Buffer.from(await res.arrayBuffer());
          const ct = res.headers.get('content-type') || 'image/png';
          if (ct.startsWith('image/')) {
            bgImage = `data:${ct};base64,${buf.toString('base64')}`;
          }
        }
      } catch {}
    }

    const imageResponse = new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            backgroundColor: '#0a0510',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            fontFamily: 'sans-serif',
            position: 'relative',
          }}
        >
          {}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: 320,
              height: 480,
              backgroundColor: '#1f2937',
              borderRadius: 16,
              border: `6px solid ${color}`,
              overflow: 'hidden',
              position: 'relative',
              boxShadow: `0 0 40px ${color}80`,
            }}
          >
            {}
            <img
              src={bgImage}
              width={320}
              height={480}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                position: 'absolute',
                top: 0,
                left: 0,
              }}
            />
            {}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '100%',
                height: '50%',
                background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
                display: 'flex',
              }}
            />

            {}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                alignItems: 'center',
                width: '100%',
                height: '100%',
                position: 'absolute',
                top: 0,
                left: 0,
                padding: 20,
              }}
            >
              <h1
                style={{
                  fontSize: 32,
                  fontWeight: 'bold',
                  color: 'white',
                  margin: 0,
                  marginBottom: 8,
                  textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                  textAlign: 'center',
                }}
              >
                {card.title}
              </h1>

              <div
                style={{
                  display: 'flex',
                  backgroundColor: `${color}40`,
                  border: `2px solid ${color}`,
                  padding: '4px 12px',
                  borderRadius: 20,
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: 16,
                }}
              >
                {card.rarity}
              </div>

              {card.level && (
                <div
                  style={{
                    display: 'flex',
                    position: 'absolute',
                    top: 10,
                    left: 10,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    padding: '4px 8px',
                    borderRadius: 8,
                    color: 'white',
                    fontSize: 14,
                    fontWeight: 'bold',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                >
                  Niv. {card.level}
                </div>
              )}
            </div>
          </div>
        </div>
      ),
      {
        width: 400,
        height: 600,
      }
    );

    let buffer: Buffer | null = null;
    try {
      const arrayBuffer = await imageResponse.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      const publicUrl = await uploadBufferToR2(buffer, `card_${card.id}.png`, 'image/png', card.player?.minecraftName);
      if (publicUrl) {
        await prisma.tradingCard.update({
          where: { id: card.id },
          data: { renderedImageUrl: publicUrl }
        });
      }
    } catch (uploadErr) {
      console.error("Auto upload to CDN error:", uploadErr);
    }

    if (buffer) {
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

  } catch (e: any) {
    console.error("Card OG error:", e);
    return NextResponse.json(
      { error: e?.message || String(e), stack: e?.stack },
      { status: 500 }
    );
  }
}
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const { uuid } = await params;

    if (!uuid) {
      return NextResponse.json({ error: "UUID is required" }, { status: 400 });
    }

    // Format the UUID with dashes if it doesn't have them
    let formattedUuid = uuid;
    if (formattedUuid.length === 32) {
      formattedUuid = `${formattedUuid.slice(0, 8)}-${formattedUuid.slice(8, 12)}-${formattedUuid.slice(12, 16)}-${formattedUuid.slice(16, 20)}-${formattedUuid.slice(20)}`;
    }

    // On cherche l'utilisateur par son UUID Minecraft
    const user = await prisma.user.findUnique({
      where: {
        minecraftUuid: formattedUuid,
      },
      select: {
        paraCoins: true,
      },
    });

    if (!user) {
      // Si l'utilisateur n'est pas trouvé (pas encore lié ou inscrit)
      // On retourne un solde de 0 par défaut pour ne pas casser la boutique
      return NextResponse.json(
        { paracoins: 0 },
        {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        }
      );
    }

    return NextResponse.json(
      { paracoins: user.paraCoins },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    );
  } catch (error) {
    console.error("Erreur lors de la récupération de la balance:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}

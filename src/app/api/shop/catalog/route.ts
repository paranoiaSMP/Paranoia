import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  // Pour l'instant, c'est un catalogue statique.
  // Tu pourras le relier à ta base de données (Prisma) plus tard quand tu auras créé un modèle pour les articles de la boutique.
  const catalog = [
    {
      id: "cape_dragon",
      name: "Cape du Dragon",
      description: "Une cape flamboyante avec des effets de feu.",
      price: 500,
      currency: "paracoins",
      imageUrl: "https://paranoiastudio.fr/images/shop/cape_dragon.png",
      category: "Capes",
      checkoutUrl: "https://paranoiastudio.fr/shop/checkout?item=cape_dragon"
    },
    {
      id: "ailes_ange",
      name: "Ailes d'Ange",
      description: "Des ailes blanches éclatantes.",
      price: 800,
      currency: "paracoins",
      imageUrl: "https://paranoiastudio.fr/images/shop/ailes_ange.png",
      category: "Ailes",
      checkoutUrl: "https://paranoiastudio.fr/shop/checkout?item=ailes_ange"
    }
  ];

  return NextResponse.json(catalog, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
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

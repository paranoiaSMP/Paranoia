import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  // Pour l'instant, c'est un catalogue statique.
  // Tu pourras le relier à ta base de données (Prisma) plus tard quand tu auras créé un modèle pour les articles de la boutique.
  const catalog = [
    {
      id: "grade_vip",
      name: "Grade VIP",
      description: "Accès prioritaire et kits exclusifs.",
      price: 500,
      currency: "paracoins",
      imageUrl: "https://paranoiastudio.fr/images/shop/vip.png",
      category: "Grades",
      checkoutUrl: "https://paranoiastudio.fr/shop/checkout?item=grade_vip"
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

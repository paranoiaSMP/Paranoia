import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {

    const newsTopics = await prisma.topic.findMany({
      where: {
        category: {
          in: ["news", "announcement", "actualité", "annonces"]
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10 
    });

    if (newsTopics.length === 0) {
      return NextResponse.json([
        {
          id: "v0.5.0-release",
          title: "Sortie de la version 0.5.0",
          excerpt: "Découvrez le tout nouveau Mod Menu et les cosmétiques !",
          contentHtml: "<p>Grosse mise à jour...</p>",
          publishedAt: new Date().toISOString(),
          tags: ["update"],
          url: "https://api.paranoiastudio.fr/news/v0.5.0-release"
        }
      ], {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    const formattedNews = newsTopics.map(topic => ({
      id: topic.id,
      title: topic.title,

      excerpt: topic.content.replace(/<[^>]*>?/gm, '').substring(0, 120) + (topic.content.length > 120 ? '...' : ''),
      contentHtml: topic.content,
      publishedAt: topic.createdAt.toISOString(),
      tags: [topic.category],
      url: `https://api.paranoiastudio.fr/news/${topic.id}`
    }));

    return NextResponse.json(formattedNews, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });

  } catch (error) {
    console.error("Erreur lors de la récupération des news:", error);
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
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

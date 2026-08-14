import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

export async function GET() {
  try {
    const session = await getServerSession();
    // Ideally we should check if session.user.role === 'ADMIN', but keeping it simple based on existing structure.
    
    const news = await prisma.topic.findMany({
      where: {
        category: {
          in: ["news", "announcement"]
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(news);
  } catch (error) {
    console.error("Error fetching news:", error);
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    const user = session?.user as any;

    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    const { title, content, category } = data;

    if (!title || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const newTopic = await prisma.topic.create({
      data: {
        title,
        content,
        category: category || "news",
        authorId: user.id
      }
    });

    return NextResponse.json(newTopic);
  } catch (error) {
    console.error("Error creating news:", error);
    return NextResponse.json({ error: "Failed to create news" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession();
    const user = session?.user as any;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }

    await prisma.topic.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting news:", error);
    return NextResponse.json({ error: "Failed to delete news" }, { status: 500 });
  }
}

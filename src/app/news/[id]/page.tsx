import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Calendar, Tag } from "lucide-react";

interface NewsPageProps {
  params: Promise<{ id: string }>;
}

export default async function NewsPage({ params }: NewsPageProps) {
  // Await the params promise before destructuring (Next.js 15+ App Router requirement)
  const { id } = await params;

  if (id === "v0.5.0-release") {
    return (
      <div className="relative min-h-screen flex flex-col items-center px-6 pt-24 pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-noise opacity-20 mix-blend-overlay pointer-events-none"></div>
        <div className="relative z-10 w-full max-w-4xl mx-auto">
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl p-8 md:p-12 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <span className="px-3 py-1 rounded-full bg-fuchsia-500/20 text-fuchsia-400 text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                <Tag className="w-3 h-3" /> Update
              </span>
              <span className="text-[var(--color-text-secondary)] text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" /> {new Date().toLocaleDateString("fr-FR")}
              </span>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-outfit font-black text-[var(--text-color)] mb-8 tracking-tight">
              Sortie de la version 0.5.0
            </h1>
            
            <div className="prose prose-invert max-w-none text-[var(--text-color)] prose-headings:font-outfit prose-headings:font-bold prose-a:text-indigo-400">
              <p>Grosse mise à jour...</p>
              <p>Découvrez le tout nouveau Mod Menu et les cosmétiques !</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const topic = await prisma.topic.findUnique({
    where: { id }
  });

  if (!topic || !["news", "announcement", "actualité", "annonces"].includes(topic.category)) {
    notFound();
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center px-6 pt-24 pb-12 overflow-hidden">
      <div className="absolute inset-0 bg-noise opacity-20 mix-blend-overlay pointer-events-none"></div>
      
      <div className="relative z-10 w-full max-w-4xl mx-auto">
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl p-8 md:p-12 shadow-2xl">
          
          <div className="flex items-center gap-3 mb-6">
            <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest flex items-center gap-1">
              <Tag className="w-3 h-3" /> {topic.category === 'announcement' ? 'Annonce' : 'Actualité'}
            </span>
            <span className="text-[var(--color-text-secondary)] text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4" /> {new Date(topic.createdAt).toLocaleDateString("fr-FR")}
            </span>
          </div>
          
          <h1 className="text-3xl md:text-5xl font-outfit font-black text-[var(--text-color)] mb-8 tracking-tight">
            {topic.title}
          </h1>
          
          {/* Affiche le contenu de l'actualité */}
          <div 
            className="prose prose-invert max-w-none text-[var(--text-color)] prose-headings:font-outfit prose-headings:font-bold prose-a:text-indigo-400 prose-img:rounded-2xl"
            dangerouslySetInnerHTML={{ __html: topic.content }}
          />
        </div>
      </div>
    </div>
  );
}

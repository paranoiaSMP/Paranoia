"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Users, Sparkles, Layers, ShieldAlert, ImagePlus, LayoutDashboard, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";

const adminLinks = [
  { name: "Vue d'ensemble", href: "/admin", icon: LayoutDashboard },
  { name: "Actualités", href: "/admin/news", icon: Newspaper },
  { name: "Joueurs", href: "/admin/players", icon: Users },
  { name: "Cartes", href: "/admin/cards", icon: Sparkles },
  { name: "Variantes", href: "/admin/variants", icon: Layers },
  { name: "Modération", href: "/admin/moderation", icon: ShieldAlert },
  { name: "Boutique & Éditions", href: "/admin/shop", icon: ImagePlus },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-12 animate-slide-up">
      <div className="mb-10">
        <h1 className="text-6xl font-outfit font-black text-[var(--text-color)] mb-2 tracking-tighter">
          Espace <span className="text-fuchsia-500">ADMINISTRATION</span>
        </h1>
        <p className="text-[var(--color-text-secondary)] text-xl">Gestion centralisée de l'écosystème Paranoïa.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        {/* Sidebar Navigation */}
        <aside className="lg:w-64 flex-shrink-0">
          <nav className="flex flex-col gap-2 p-2 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl backdrop-blur-md sticky top-24">
            {adminLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-300",
                    isActive 
                      ? "bg-fuchsia-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] translate-x-1" 
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--icon-bg)] hover:text-[var(--text-color)]"
                  )}
                >
                  <link.icon className={cn("w-5 h-5", isActive ? "animate-pulse" : "")} />
                  {link.name}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          <div className="panel-matte rounded-[2.5rem] p-6 sm:p-10 border-[var(--card-border)] shadow-2xl relative overflow-hidden bg-[var(--card-bg)]">
            {/* Decorative background for the panel */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-600/10 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none"></div>
            
            <div className="relative z-10">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

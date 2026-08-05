"use client";

import { useState, useEffect } from "react";
import { Users, Sparkles, Layers, ShieldAlert, ImagePlus, ChevronRight, Activity, Database, TrendingUp, Cpu, Server, Wifi } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    players: 0,
    cards: 0,
    variants: 0,
    editions: 0,
    users: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [resP, resC, resV, resE, resU] = await Promise.all([
          fetch("/api/players"),
          fetch("/api/cards"),
          fetch("/api/variants"),
          fetch("/api/editions"),
          fetch("/api/admin/users")
        ]);
        setStats({
          players: (await resP.json()).length,
          cards: (await resC.json()).length,
          variants: (await resV.json()).length,
          editions: (await resE.json()).length,
          users: (await resU.json()).length
        });
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    fetchStats();
  }, []);

  const statCards = [
    { name: "Joueurs", value: stats.players, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10", href: "/admin/players" },
    { name: "Cartes", value: stats.cards, icon: Sparkles, color: "text-purple-400", bg: "bg-purple-500/10", href: "/admin/cards" },
    { name: "Variantes", value: stats.variants, icon: Layers, color: "text-indigo-400", bg: "bg-indigo-500/10", href: "/admin/variants" },
    { name: "Éditions", value: stats.editions, icon: ImagePlus, color: "text-emerald-400", bg: "bg-emerald-500/10", href: "/admin/shop" },
    { name: "Utilisateurs", value: stats.users, icon: ShieldAlert, color: "text-red-400", bg: "bg-red-500/10", href: "/admin/moderation" },
  ];

  return (
    <div className="space-y-12">
      <div className="flex items-center gap-4 border-b border-[var(--card-border)] pb-8">
        <div className="p-3 bg-fuchsia-500/20 rounded-2xl text-fuchsia-400">
          <Activity className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-3xl font-bold font-outfit text-[var(--text-color)] tracking-tight uppercase">Tableau de Bord</h2>
          <p className="text-[var(--color-text-secondary)]">Aperçu global de l'activité du serveur.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {statCards.map((stat) => (
              <Link 
                key={stat.name} 
                href={stat.href}
                className="group p-6 rounded-[2rem] bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-fuchsia-500/50 transition-all hover:-translate-y-1"
              >
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110", stat.bg, stat.color)}>
                      <stat.icon className="w-6 h-6" />
                  </div>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">{stat.name}</p>
                  <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-[var(--text-color)] font-outfit">
                          {loading ? "..." : stat.value}
                      </span>
                      <TrendingUp className="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
              </Link>
          ))}
      </div>

      <div className="grid grid-cols-1 gap-8">
          {/* Quick Access Links */}
          <div className="bg-[var(--card-bg)] p-8 rounded-[2.5rem] border border-[var(--card-border)] space-y-6">
              <h3 className="text-xl font-bold text-[var(--text-color)] flex items-center gap-3">
                  <Database className="w-5 h-5 text-indigo-400" /> Actions Rapides
              </h3>
              <div className="space-y-3">
                  {[
                      { name: "Créer une nouvelle carte", href: "/admin/cards", desc: "Ajoutez un nouveau talent à la collection." },
                      { name: "Lancer une promotion", href: "/admin/shop", desc: "Mettez en avant une édition dans la boutique." },
                      { name: "Gérer les permissions", href: "/admin/moderation", desc: "Modifiez les rôles des membres." },
                  ].map((item) => (
                      <Link 
                        key={item.name} 
                        href={item.href}
                        className="flex items-center justify-between p-4 rounded-2xl bg-[var(--surface-bg)] border border-[var(--card-border)] hover:bg-[var(--icon-bg)] hover:border-fuchsia-500/30 transition-all group"
                      >
                          <div>
                              <p className="font-bold text-[var(--text-color)] group-hover:text-fuchsia-400 transition-colors">{item.name}</p>
                              <p className="text-xs text-gray-500">{item.desc}</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-[var(--color-text-secondary)] group-hover:text-fuchsia-400 transition-all group-hover:translate-x-1" />
                      </Link>
                  ))}
              </div>
          </div>
      </div>
    </div>
  );
}

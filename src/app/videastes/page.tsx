"use client";

import React from 'react';
import { BoldGradient, GlowText, EasyBox, EasyBadge } from "@/components/easy-tags";
import { Video, ExternalLink, MonitorPlay } from "lucide-react";
import Link from 'next/link';

// Liste des créateurs (tu peux facilement ajouter ou modifier des créateurs ici)
const createurs = [
  {
    id: 1,
    nom: "LOREM",
    plateforme: "youtube",
    role: "LORE%",
    lien: "https://youtube.com/@leoo955",
    pseudoMinecraft: "Leoo955"
  },
  {
    id: 2,
    nom: "LOREM",
    plateforme: "twitch",
    role: "Streamer lorem",
    lien: "https://twitch.tv/",
    pseudoMinecraft: "1sans_nom"
  },
  {
    id: 3,
    nom: "ExempleYoutuber",
    plateforme: "youtube",
    role: "LOREM",
    lien: "https://youtube.com/",
    pseudoMinecraft: "Steve"
  }
];

export default function VideastesPage() {
  return (
    <div className="min-h-screen pt-24 pb-12 px-4 relative overflow-hidden">
      {/* Effets de fond */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-fuchsia-600/10 rounded-full blur-[150px] pointer-events-none"></div>
      
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-16">
         
          <h1 className="text-5xl md:text-6xl font-bold mb-4">
            Nos <BoldGradient from="from-fuchsia-500" to="to-purple-600">Vidéastes</BoldGradient>
          </h1>
          <p className="text-xl text-[var(--muted-text)] max-w-2xl mx-auto">
            Découvrez les créateurs de contenu officiels de Paranoia SMP. Suivez leurs aventures et soutenez-les sur leurs chaînes !
          </p>
        </div>

        {/* Grille des créateurs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {createurs.map((createur) => (
            <Link key={createur.id} href={createur.lien} target="_blank" rel="noopener noreferrer">
              <EasyBox className="h-full flex flex-col items-center text-center group cursor-pointer card-hover p-8 relative overflow-hidden">
                {/* Petit effet de fond au hover */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-fuchsia-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                {/* Icône de la plateforme dans le coin */}
                <div className="absolute top-4 right-4 text-[var(--muted-text)] group-hover:text-[var(--text-color)] transition-colors">
                  {createur.plateforme === 'youtube' ? (
                    <Video className="w-6 h-6 group-hover:text-red-500 transition-colors" />
                  ) : (
                    <MonitorPlay className="w-6 h-6 group-hover:text-purple-500 transition-colors" />
                  )}
                </div>

                {/* Avatar (Tête Minecraft) */}
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-fuchsia-500/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300 opacity-0 group-hover:opacity-100"></div>
                  <img 
                    src={`https://vzge.me/face/512/${createur.pseudoMinecraft}.png`} 
                    alt={`Avatar de ${createur.nom}`}
                    className="w-24 h-24 rounded-xl shadow-lg relative z-10 group-hover:-translate-y-2 transition-transform duration-300"
                    onError={(e) => { e.currentTarget.src = 'https://minotar.net/helm/Steve/512.png'; }}
                  />
                </div>

                {/* Infos */}
                <h2 className="text-2xl font-bold mb-1 group-hover:text-fuchsia-400 transition-colors">
                  {createur.nom}
                </h2>
                <p className="text-sm font-medium text-[var(--color-text-muted)] mb-4 uppercase tracking-wider">
                  {createur.role}
                </p>

                {/* Bouton Voir la chaîne */}
                <div className="mt-auto pt-4 flex items-center justify-center gap-2 text-sm font-bold text-fuchsia-500 opacity-80 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                  Voir la chaîne <ExternalLink className="w-4 h-4" />
                </div>
              </EasyBox>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

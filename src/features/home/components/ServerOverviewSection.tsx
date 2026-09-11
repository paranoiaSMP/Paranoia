"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

export default function ServerOverviewSection() {

  return (
    <section className="relative max-w-6xl mx-auto px-4 sm:px-6 mt-16 sm:mt-24">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-white/10 mb-6">
        <h2 className="font-outfit text-2xl sm:text-4xl font-black text-white tracking-tight max-w-xl">
          Un SMP, un <span className="text-[#b366ff]">plugin maison</span> et une salle de jeux.
        </h2>
        <Link
          href="https://discord.gg/paranoiasmp"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs sm:text-sm font-extrabold text-purple-400 hover:text-purple-300 flex items-center gap-1.5 transition-colors shrink-0"
        >
          Le wiki du serveur <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="md:col-span-4 relative overflow-hidden rounded-2xl bg-[#111118] border-2 border-white/5 p-6 flex flex-col sm:flex-row gap-6 items-center justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_30%,_rgba(168,85,247,0.18),_transparent_62%)] pointer-events-none" />
          
          <div className="relative z-10 min-w-[220px] flex-1">
            <span className="font-mono text-[11px] tracking-widest text-purple-400 font-bold uppercase">
              TCG · CARTES À COLLECTIONNER
            </span>
            <h3 className="font-outfit text-xl sm:text-2xl font-black text-white mt-1.5 mb-2">
              Collectionne les joueurs du serveur
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md">
              Chaque carte est le skin d'un joueur, en six raretés. Les mythiques tombent à 0,2%.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-4">
              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded text-slate-400 border border-slate-700">
                Commune
              </span>
              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded text-emerald-400 border border-emerald-500/30">
                Peu commune
              </span>
              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded text-blue-400 border border-blue-500/30">
                Rare
              </span>
              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded text-purple-400 border border-purple-500/30">
                Épique
              </span>
              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded text-amber-400 border border-amber-500/30">
                Légendaire
              </span>
              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded text-rose-400 border border-rose-500/35">
                Mythique 0.2%
              </span>
            </div>
          </div>

          <div className="relative flex items-center shrink-0 pr-2">
            <Image
              src="/StandardB.png"
              alt="Booster Standard"
              width={75}
              height={108}
              className="object-contain -rotate-12 translate-x-5 drop-shadow-xl"
              unoptimized
            />
            <Image
              src="/LegendaireB.png"
              alt="Booster Légendaire"
              width={105}
              height={150}
              className="object-contain relative z-10 drop-shadow-2xl scale-105"
              unoptimized
            />
            <Image
              src="/MythiqueB.png"
              alt="Booster Mythique"
              width={75}
              height={108}
              className="object-contain rotate-12 -translate-x-5 drop-shadow-xl"
              unoptimized
            />
          </div>
        </div>

        <div className="md:col-span-2 rounded-2xl bg-[#111118] border-2 border-white/5 p-5 flex flex-col justify-between">
          <div>
            <span className="font-mono text-[11px] tracking-widest text-slate-400 font-bold uppercase">
              SALLE DES JEUX
            </span>
            <h3 className="font-outfit text-xl font-black text-white mt-1.5 mb-3">
              5 jeux en ligne
            </h3>
            <div className="flex flex-col gap-1 border border-white/5 font-mono text-xs rounded-lg overflow-hidden">
              <div className="bg-[#151520] px-3 py-1.5 flex justify-between">
                <span className="text-slate-200">Crash</span>
                <span className="text-emerald-400 font-bold">x100+</span>
              </div>
              <div className="bg-[#151520] px-3 py-1.5 flex justify-between">
                <span className="text-slate-200">Mines</span>
                <span className="text-slate-400">5×5</span>
              </div>
              <div className="bg-[#151520] px-3 py-1.5 flex justify-between">
                <span className="text-slate-200">Roulette</span>
                <span className="text-slate-400">x14</span>
              </div>
              <div className="bg-[#151520] px-3 py-1.5 flex justify-between">
                <span className="text-slate-200">Blackjack</span>
                <span className="text-slate-400">3:2</span>
              </div>
              <div className="bg-[#151520] px-3 py-1.5 flex justify-between">
                <span className="text-slate-200">Boosters</span>
                <span className="text-purple-400 font-bold">TCG</span>
              </div>
            </div>
          </div>
          <Link
            href="/jeux"
            className="mt-4 pt-3 text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center justify-between transition-colors border-t border-white/5"
          >
            <span>Jouer maintenant</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="md:col-span-3 rounded-2xl bg-[#111118] border-2 border-white/5 p-5 flex flex-col justify-between">
          <div>
            <span className="font-mono text-[11px] tracking-widest text-emerald-400 font-bold uppercase">
              COMMUNAUTÉ
            </span>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mt-2">
              Événements chaque semaine, staff présent et un Discord actif où tout se décide.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 flex flex-col gap-2 font-mono text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Événement</span>
              <span className="text-white font-bold">Soon</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Discord</span>
              <span className="text-white font-bold">Soon</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Version</span>
              <span className="text-white font-bold">Soon</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-3 rounded-2xl bg-[#111118] border-2 border-white/5 p-5 flex flex-col justify-between gap-4">
          <div>
            <span className="font-mono text-[11px] tracking-widest text-slate-400 font-bold uppercase">
              REJOINDRE LE SERVEUR
            </span>
            <p className="font-mono text-base font-bold text-white mt-2 tracking-widest">
              XXXXX
            </p>
          </div>
          <button
            disabled
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-outfit font-bold text-sm text-white bg-[#111118] border-2 border-[#7a1fa2] shadow-[5px_5px_0px_0px_#7a1fa2] cursor-not-allowed opacity-80"
          >
            Soon
          </button>
        </div>
      </div>
    </section>
  );
}

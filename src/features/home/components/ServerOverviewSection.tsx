import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { AVAILABLE_GAMES } from '@/config/games';
import { CARD_RARITIES } from '@/config/boosters';
import CopyIpButton from '@/components/common/CopyIpButton';

export default function ServerOverviewSection() {
  return (
    <section className="relative max-w-6xl mx-auto px-4 sm:px-6 mt-16 sm:mt-24">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-white/10 mb-6">
        <h2 className="font-outfit text-2xl sm:text-4xl font-black text-white tracking-tight max-w-xl">
          Un SMP, un <span className="text-[#b366ff]">plugin maison</span> et une salle de jeux.
        </h2>
        <a
          href={siteConfig.discordUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs sm:text-sm font-extrabold text-purple-400 hover:text-purple-300 flex items-center gap-1.5 transition-colors shrink-0"
        >
          Rejoindre le Discord <ArrowRight className="w-4 h-4" />
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="col-span-1 md:col-span-2 lg:col-span-4 relative overflow-hidden rounded-2xl bg-[#111118] border-2 border-white/5 p-6 flex flex-col sm:flex-row gap-6 items-center justify-between">
          <div className="relative z-10 min-w-0 sm:min-w-[220px] flex-1">
            <span className="font-mono text-[11px] tracking-widest text-purple-400 font-bold uppercase">
              TCG · CARTES À COLLECTIONNER
            </span>
            <h3 className="font-outfit text-xl sm:text-2xl font-black text-white mt-1.5 mb-2">
              Collectionne les joueurs du serveur
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md">
              Chaque carte est le skin d&apos;un joueur, en six raretés. Les mythiques tombent à 0,2%.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-4">
              {CARD_RARITIES.map((rarity) => (
                <span
                  key={rarity.key}
                  className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded border border-white/10 ${rarity.colorClass}`}
                >
                  {rarity.key === "MYTHIC" ? `${rarity.label} 0.2%` : rarity.label}
                </span>
              ))}
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

        <div className="col-span-1 md:col-span-2 lg:col-span-2 rounded-2xl bg-[#111118] border-2 border-white/5 p-5 flex flex-col justify-between">
          <div>
            <span className="font-mono text-[11px] tracking-widest text-slate-400 font-bold uppercase">
              SALLE DES JEUX
            </span>
            <h3 className="font-outfit text-xl font-black text-white mt-1.5 mb-3">
              {AVAILABLE_GAMES.length} jeux en ligne
            </h3>
            <div className="flex flex-col gap-1 border border-white/5 font-mono text-xs rounded-lg overflow-hidden">
              {AVAILABLE_GAMES.map((game) => (
                <Link
                  key={game.id}
                  href={game.href}
                  className="bg-[#151520] hover:bg-[#1a1a26] px-3 py-1.5 flex justify-between transition-colors group"
                >
                  <span className="text-slate-200 group-hover:text-white transition-colors">
                    {game.title === "Trading Cards" ? "Boosters" : game.title === "Blackjack 21" ? "Blackjack" : game.title}
                  </span>
                  <span className={game.badgeColor ? `${game.badgeColor} font-bold` : game.shortRatio === "TCG" ? "text-purple-400 font-bold" : "text-slate-400"}>
                    {game.shortRatio}
                  </span>
                </Link>
              ))}
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

        <div className="col-span-1 md:col-span-1 lg:col-span-3 rounded-2xl bg-[#111118] border-2 border-white/5 p-5 flex flex-col justify-between">
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
              <span className="text-emerald-400 font-bold">Samedi 21h</span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Discord</span>
              <a
                href={siteConfig.discordUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 transition-colors"
              >
                Rejoindre <ArrowRight className="w-3 h-3" />
              </a>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Version</span>
              <span className="text-white font-bold">1.21.1</span>
            </div>
          </div>
        </div>

        <div className="col-span-1 md:col-span-1 lg:col-span-3 rounded-2xl bg-[#111118] border-2 border-white/5 p-5 flex flex-col justify-between gap-4">
          <div>
            <span className="font-mono text-[11px] tracking-widest text-slate-400 font-bold uppercase">
              REJOINDRE LE SERVEUR
            </span>
            <p className="font-mono text-base font-bold text-white mt-2 tracking-wide">
              {siteConfig.serverIp}
            </p>
          </div>
          <CopyIpButton variant="badge" className="w-full justify-between" />
        </div>
      </div>
    </section>
  );
}

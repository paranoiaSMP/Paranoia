"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SplitReveal from "@/components/motion/SplitReveal";
import Reveal from "@/components/common/Reveal";
import { useSettings } from "@/components/providers/SettingsProvider";
import { siteConfig } from "@/config/site";
import { isFounderUuid } from "@/lib/roles";

type Member = { minecraftName: string; minecraftUuid: string | null; role: string; staffTitle?: string | null; staffBio?: string | null; staffColor?: string | null };

const ROLE: Record<string, string> = { OWNER: "Owner", DEV: "Dev", ADMIN: "Admin", MODERATOR: "Modérateur" };
const isFounder = (m: Member) => isFounderUuid(m.minecraftUuid);
const ORDER: Record<string, number> = { OWNER: 0, DEV: 0, ADMIN: 1, MODERATOR: 2 };

const UNIVERS = [
  { name: "TCG", text: "Des cartes à collectionner aux couleurs des joueurs, à tirer dans quatre boosters.", href: "/cards" },
  { name: "Casino", text: "Crash, Roulette, Mines et Blackjack, joués avec les ParaCoins.", href: "/jeux" },
  { name: "Launcher", text: "Paranoia Client, le launcher Minecraft du studio, écrit en Rust.", href: "/launcher" },
  { name: "SMP", text: "Le serveur Minecraft du studio, en préparation.", href: null },
];

export default function AboutPage() {
  const { discordUrl } = useSettings();
  const [team, setTeam] = useState<Member[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/team")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((list: Member[]) =>
        alive &&
        setTeam([...list].sort((a, b) => Number(isFounder(b)) - Number(isFounder(a)) || (ORDER[a.role] ?? 9) - (ORDER[b.role] ?? 9)))
      )
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="text-white">
      <section className="border-b border-zinc-900">
        <div className="mx-auto max-w-7xl px-5 pb-16 pt-16 md:px-10 md:pb-24 md:pt-24">
          <SplitReveal
            lines={["Qui sommes-", <span key="n" className="text-violet-400">nous.</span>]}
            className="text-[clamp(3.5rem,12vw,9rem)] font-extrabold leading-[0.9] tracking-[-0.045em]"
          />
          <p className="mt-10 max-w-xl text-lg leading-relaxed text-zinc-300">
            Paranoia Studio, c&apos;est une communauté Minecraft et les projets qu&apos;elle construit autour : des cartes, un casino, un launcher, et bientôt un serveur.
          </p>
        </div>
      </section>

      <section className="border-b border-zinc-900 bg-[#0b0b0d]">
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
          <Reveal>
            <h2 className="text-4xl font-bold tracking-[-0.03em] md:text-5xl">Ce qu&apos;on fait</h2>
          </Reveal>
          <ul className="mt-12 grid grid-cols-1 gap-x-10 gap-y-10 sm:grid-cols-2">
            {UNIVERS.map((u, i) => (
              <li key={u.name} className="border-t border-zinc-800 pt-6">
                <Reveal delay={(i % 2) * 0.06}>
                  <h3 className="text-3xl font-extrabold tracking-[-0.04em]">{u.name}</h3>
                  <p className="mt-3 max-w-md leading-relaxed text-zinc-300">{u.text}</p>
                  {u.href ? (
                    <Link href={u.href} className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-violet-400 underline-offset-4 hover:underline">
                      Découvrir
                    </Link>
                  ) : (
                    <a href={discordUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-violet-400 underline-offset-4 hover:underline">
                      Suivre sur Discord
                    </a>
                  )}
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-b border-zinc-900">
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
          <Reveal>
            <h2 className="text-4xl font-bold tracking-[-0.03em] md:text-5xl">L&apos;équipe</h2>
          </Reveal>
          <p className="mt-4 max-w-xl text-zinc-300">Le studio a été lancé par {team?.find(isFounder)?.minecraftName ?? siteConfig.founder}.</p>

          {error && <p className="mt-10 text-zinc-400">L&apos;équipe n&apos;a pas pu être chargée.</p>}
          {!team && !error && (
            <div role="status" className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="aspect-[3/4] animate-pulse rounded-md bg-zinc-950" />
              ))}
              <span className="sr-only">Chargement</span>
            </div>
          )}
          {team && team.length === 0 && <p className="mt-10 text-zinc-400">Aucun membre de l&apos;équipe n&apos;a encore lié son compte Minecraft.</p>}
          {team && team.length > 0 && (
            <ul className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
              {team.map((m, i) => (
                <li key={m.minecraftName}>
                  <Reveal delay={Math.min(i, 7) * 0.05}>
                    <Link href={`/joueur/${m.minecraftName}`} className="group flex flex-col items-center rounded-md border border-zinc-900 bg-[#0b0b0d] p-5 transition-colors duration-200 hover:border-zinc-600">
                      <img
                        src={`https://vzge.me/bust/256/${encodeURIComponent(m.minecraftUuid ?? m.minecraftName)}.png`}
                        alt=""
                        loading="lazy"
                        className="h-32 w-auto transition-transform duration-200 ease-out [@media(hover:hover)_and_(pointer:fine)]:group-hover:-translate-y-1"
                        style={{ imageRendering: "pixelated" }}
                      />
                      <p className="mt-4 font-semibold text-white">{m.minecraftName}</p>
                      <p className="text-sm text-violet-400" style={m.staffColor ? { color: m.staffColor } : undefined}>
                        {m.staffTitle || (isFounder(m) ? "Fondateur" : ROLE[m.role] ?? m.role)}
                      </p>
                      {m.staffBio && <p className="mt-2 text-center text-sm text-zinc-400">{m.staffBio}</p>}
                    </Link>
                  </Reveal>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section>
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-20 md:flex-row md:items-end md:justify-between md:px-10 md:py-28">
          <div>
            <h2 className="text-4xl font-bold tracking-[-0.03em] md:text-5xl">Nous contacter</h2>
            <p className="mt-4 max-w-md text-zinc-300">Pour une question, un bug ou un signalement : un ticket au support, ou directement sur Discord.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/support" className="btn-violet">
              Ouvrir un ticket
            </Link>
            <a href={discordUrl} target="_blank" rel="noopener noreferrer" className="btn-line">
              Rejoindre le Discord
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

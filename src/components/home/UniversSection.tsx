"use client";

import Link from "next/link";
import Reveal from "@/components/common/Reveal";
import { useSettings } from "@/components/providers/SettingsProvider";
import { LAUNCHER } from "@/config/launcher";

export default function UniversSection() {
  const { discordUrl } = useSettings();
  const launcherReady = LAUNCHER.platforms.some((p) => p.url);

  const items = [
    { name: "TCG", text: "Quatre boosters, six raretés, des cartes aux couleurs des joueurs.", href: "/cards", status: "Ouvert", external: false },
    { name: "Casino", text: "Crash et Roulette en direct, Mines et Blackjack en solo. Avec tes ParaCoins.", href: "/jeux", status: "En direct", external: false },
    { name: "Launcher", text: "Le client Minecraft du studio : mods, Java et cosmétiques installés pour toi.", href: "/launcher", status: launcherReady ? "Disponible" : "Bientôt", external: false },
    { name: "SMP", text: "Le serveur Minecraft du studio, en préparation. Les nouvelles passent sur Discord.", href: discordUrl, status: "Bientôt", external: true },
  ];

  return (
    <section className="border-b border-zinc-900">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-5 py-20 md:grid-cols-12 md:px-10 md:py-28">
        <Reveal className="md:col-span-4">
          <h2 className="text-4xl font-bold tracking-[-0.03em] text-white md:text-5xl">Quatre univers, un compte.</h2>
          <p className="mt-6 max-w-sm text-zinc-300">Ton compte Discord et ton pseudo Minecraft te suivent partout sur le site.</p>
        </Reveal>
        <ul className="divide-y divide-zinc-900 border-y border-zinc-900 md:col-span-8">
          {items.map((item, i) => {
            const inner = (
              <>
                <span className="w-40 shrink-0 text-3xl font-extrabold tracking-[-0.04em] text-white transition-transform duration-200 ease-out [@media(hover:hover)_and_(pointer:fine)]:group-hover:translate-x-2">
                  {item.name}
                </span>
                <span className="flex-1 text-zinc-300">{item.text}</span>
                <span className="text-sm font-medium text-violet-400">{item.status}</span>
              </>
            );
            const cls = "group flex min-h-24 flex-col justify-center gap-2 py-6 sm:flex-row sm:items-center sm:gap-8";
            return (
              <li key={item.name}>
                <Reveal delay={i * 0.06}>
                  {item.external ? (
                    <a href={item.href} target="_blank" rel="noopener noreferrer" className={cls}>
                      {inner}
                    </a>
                  ) : (
                    <Link href={item.href} className={cls}>
                      {inner}
                    </Link>
                  )}
                </Reveal>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

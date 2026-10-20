"use client";

import Link from "next/link";
import { ChevronDown, Globe } from "lucide-react";
import { useSettings } from "@/components/providers/SettingsProvider";

const SOCIALS = [
  {
    name: "Discord",
    href: "https://discord.gg/FP8rYZYRe7",
    icon: (
      <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
      </svg>
    ),
  },
  {
    name: "X (Twitter)",
    href: "https://x.com",
    icon: (
      <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    name: "TikTok",
    href: "https://tiktok.com",
    icon: (
      <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.89 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.11V9.41a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 0 0 0 6.34-6.34V8.71a8.18 8.18 0 0 0 5.06 1.76V7.02a4.8 4.8 0 0 1-1.3-.33z" />
      </svg>
    ),
  },
  {
    name: "YouTube",
    href: "https://youtube.com",
    icon: (
      <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    name: "Instagram",
    href: "https://instagram.com",
    icon: (
      <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
  },
];

const NAV_GROUPS = [
  {
    title: "Univers",
    links: [
      { name: "Cartes TCG", href: "/cards" },
      { name: "Ma Collection", href: "/collection" },
      { name: "Joueurs", href: "/joueurs" },
      { name: "Mini-Jeux", href: "/jeux" },
      { name: "Boutique & VIP", href: "/shop" },
      { name: "Launcher SMP", href: "/launcher" },
    ],
  },
  {
    title: "Studio",
    links: [
      { name: "Qui sommes-nous", href: "/a-propos" },
      { name: "Équipe du Studio", href: "/a-propos" },
      { name: "Serveur Minecraft", href: "/launcher" },
    ],
  },
  {
    title: "Ressources",
    links: [
      { name: "Centre de Support", href: "/support" },
      { name: "Ouvrir un Ticket", href: "/support" },
      { name: "Bot Discord", href: "/support" },
    ],
  },
  {
    title: "Légal",
    links: [
      { name: "Conditions d'utilisation", href: "/cgu" },
      { name: "Politique de confidentialité", href: "/privacy" },
      { name: "Règlement communautaire", href: "/cgu#reglement" },
      { name: "Mentions légales", href: "/mentions-legales" },
    ],
  },
];

export default function Footer() {
  const { discordUrl } = useSettings();
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-zinc-900 bg-[#090812] text-white">
      <div className="relative z-10 mx-auto max-w-7xl px-5 pt-16 pb-12 md:px-10 md:pt-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-8">
          
          <div className="flex flex-col gap-6 lg:col-span-4">
            <Link
              href="/"
              className="inline-flex items-center gap-3 text-xl font-black tracking-tight text-white hover:text-violet-300 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white font-extrabold shadow-lg shadow-violet-600/30">
                P
              </div>
              <span className="font-outfit uppercase tracking-wider text-lg">Paranoia</span>
            </Link>

            <div className="flex flex-col gap-2 pt-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Langue
              </span>
              <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-200">
                <Globe className="h-3.5 w-3.5 text-zinc-400" />
                <span>Français</span>
                <ChevronDown className="h-3 w-3 text-zinc-400 ml-1" />
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Réseaux sociaux
              </span>
              <div className="-ml-3 flex flex-wrap items-center text-zinc-400">
                {SOCIALS.map((s) => (
                  <a
                    key={s.name}
                    href={s.name === "Discord" ? (discordUrl || s.href) : s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="grid size-11 place-items-center transition-colors hover:text-white"
                    aria-label={s.name}
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-8">
            {NAV_GROUPS.map((group) => (
              <div key={group.title} className="flex flex-col gap-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  {group.title}
                </h3>
                <ul className="flex flex-col gap-0 text-sm text-zinc-400 md:gap-2">
                  {group.links.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="inline-flex min-h-11 items-center transition-colors hover:text-white md:min-h-0 md:py-1"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 sm:flex-row text-xs text-zinc-500">
          <p>© {year} Paranoia Studio. Non affilié à Mojang Studios.</p>
          <a
            href={discordUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-violet-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-violet-500"
          >
            Rejoindre le Discord
          </a>
        </div>
      </div>

      <div aria-hidden="true" className="pointer-events-none relative -mb-4 select-none md:-mb-10 lg:-mb-16">
        {/* Dépose l'image dans public/footer-model.png ; elle reste masquée tant que le fichier n'existe pas. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/footer-model.png"
          alt=""
          loading="lazy"
          onError={(e) => { e.currentTarget.hidden = true; }}
          className="absolute right-[10%] z-10 h-[clamp(7rem,18vw,18rem)] w-auto"
          style={{ bottom: "calc(clamp(4.5rem,19vw,22rem) * 0.72)" }}
        />
        <div className="flex w-full justify-center overflow-hidden leading-none">
          <span className="whitespace-nowrap font-outfit text-[clamp(4.5rem,19vw,22rem)] font-black tracking-[-0.05em] text-white/90 transition-colors">
            Paranoia
          </span>
        </div>
      </div>
    </footer>
  );
}

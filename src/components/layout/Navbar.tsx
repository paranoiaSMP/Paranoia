"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import UserMenu from "@/components/common/UserMenu";
import { useSettings } from "@/components/providers/SettingsProvider";

const NAV_LINKS = [
  { name: "Accueil", href: "/" },
  { name: "Cartes", href: "/cards" },
  { name: "Joueurs", href: "/joueurs" },
  { name: "Jeux", href: "/jeux" },
  { name: "Boutique", href: "/shop" },
  { name: "Launcher", href: "/launcher" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { discordUrl } = useSettings();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-black/70 backdrop-blur-xl border-b border-white/10">
      <nav
        aria-label="Navigation principale"
        className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 md:px-10"
      >
        <Link
          href="/"
          className="flex min-h-11 items-center text-lg font-bold tracking-tight text-white"
        >
          Paranoia Studio
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 items-center px-4 text-sm font-medium transition-colors ${
                    active ? "text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {item.name}
                </Link>
              </li>
            );
          })}
          <li>
            <a
              href={discordUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center px-4 text-sm font-medium text-zinc-400 transition-colors hover:text-white"
            >
              Discord
            </a>
          </li>
        </ul>

        <div className="flex items-center gap-2">
          <UserMenu />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="menu-mobile"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            className="flex h-11 w-11 items-center justify-center rounded-md border border-zinc-800 text-white md:hidden"
          >
            <span className="relative block h-3 w-5">
              <span
                className={`absolute left-0 h-px w-5 bg-white transition-all duration-150 ${
                  open ? "top-1.5 rotate-45" : "top-0"
                }`}
              />
              <span
                className={`absolute left-0 top-1.5 h-px w-5 bg-white transition-opacity duration-150 ${
                  open ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`absolute left-0 h-px w-5 bg-white transition-all duration-150 ${
                  open ? "top-1.5 -rotate-45" : "top-3"
                }`}
              />
            </span>
          </button>
        </div>
      </nav>

      {open && (
        <div
          id="menu-mobile"
          ref={menuRef}
          className="border-t border-zinc-900 bg-black px-5 pb-6 pt-2 md:hidden"
        >
          <ul className="flex flex-col">
            {NAV_LINKS.map((item) => (
              <li key={item.href} className="border-b border-zinc-900">
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-14 items-center text-2xl font-semibold text-white"
                >
                  {item.name}
                </Link>
              </li>
            ))}
            <li>
              <a
                href={discordUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex min-h-14 items-center text-2xl font-semibold text-white"
              >
                Discord
              </a>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}

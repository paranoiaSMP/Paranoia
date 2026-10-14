"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { siteConfig } from "@/config/site";

export default function UserMenu({ className = "" }: { className?: string }) {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (status === "loading") {
    return <div aria-hidden className={`h-11 w-28 animate-pulse rounded-md bg-zinc-900 ${className}`} />;
  }

  if (!session) {
    return (
      <button
        type="button"
        onClick={() => signIn("discord")}
        className={`min-h-11 rounded-md bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-zinc-200 ${className}`}
      >
        Connexion Discord
      </button>
    );
  }

  const avatarUrl = session.user?.image || siteConfig.discordAvatarFallback;

  return (
    <div ref={menuRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex min-h-11 items-center gap-2 rounded-md px-2 transition-colors hover:bg-zinc-900"
      >
        <img
          src={avatarUrl}
          alt=""
          className="h-7 w-7 rounded-sm object-cover"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.src = siteConfig.discordAvatarFallback;
          }}
        />
        <span className="hidden max-w-[120px] truncate text-sm font-medium text-zinc-200 sm:block">
          {session.user?.name}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 rounded-md border border-zinc-800 bg-[#0b0b0d] p-1"
        >
          <div className="border-b border-zinc-900 px-3 py-2">
            <p className="text-xs text-zinc-400">Connecté en tant que</p>
            <p className="truncate text-sm font-medium text-white">{session.user?.name}</p>
          </div>
          <Link href="/collection" role="menuitem" onClick={() => setOpen(false)} className="mt-1 flex min-h-11 w-full items-center rounded-sm px-3 text-sm text-zinc-200 transition-colors hover:bg-zinc-900 hover:text-white">
            Ma collection
          </Link>
          {session.user?.minecraftName && (
            <Link href={`/joueur/${session.user.minecraftName}`} role="menuitem" onClick={() => setOpen(false)} className="flex min-h-11 w-full items-center rounded-sm px-3 text-sm text-zinc-200 transition-colors hover:bg-zinc-900 hover:text-white">
              Mon profil
            </Link>
          )}
          <Link href="/support" role="menuitem" onClick={() => setOpen(false)} className="flex min-h-11 w-full items-center rounded-sm px-3 text-sm text-zinc-200 transition-colors hover:bg-zinc-900 hover:text-white">
            Support
          </Link>
          {["ADMIN", "DEV", "MODERATOR"].includes(session.user?.role as string) && (
            <>
              <Link
                href="/admin"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="mt-1 flex min-h-11 w-full items-center rounded-sm px-3 text-sm text-zinc-200 transition-colors hover:bg-zinc-900 hover:text-white"
              >
                Administration
              </Link>
              <Link
                href="/bot"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex min-h-11 w-full items-center rounded-sm px-3 text-sm text-zinc-200 transition-colors hover:bg-zinc-900 hover:text-white"
              >
                Bot Discord
              </Link>
              {session.user?.role !== "MODERATOR" && (
                <Link
                  href="/admin/cartes"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 w-full items-center rounded-sm px-3 text-sm text-zinc-200 transition-colors hover:bg-zinc-900 hover:text-white"
                >
                  Éditeur de cartes
                </Link>
              )}
            </>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              signOut({ callbackUrl: "/" });
            }}
            className="mt-1 flex min-h-11 w-full items-center rounded-sm px-3 text-left text-sm text-zinc-200 transition-colors hover:bg-zinc-900 hover:text-white"
          >
            Déconnexion
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { ChevronDown, LayoutDashboard, LogOut } from "lucide-react";
import { siteConfig } from "@/config/site";

interface UserMenuProps {
  className?: string;
}

export default function UserMenu({ className = "" }: UserMenuProps) {
  const { data: session, status } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dropdownOpen]);

  if (status === "loading") {
    return <div className={`nav-btn opacity-50 cursor-wait min-h-[44px] flex items-center justify-center ${className}`.trim()}>Chargement...</div>;
  }

  if (!session) {
    return (
      <button onClick={() => signIn("discord")} className={`nav-btn min-h-[44px] ${className}`.trim()}>
        Se connecter
      </button>
    );
  }

  const avatarUrl = session.user?.image || siteConfig.discordAvatarFallback;

  return (
    <div ref={menuRef} className={`relative ${className}`.trim()}>
      <button 
        type="button"
        aria-expanded={dropdownOpen}
        aria-haspopup="true"
        aria-label="Menu utilisateur"
        onClick={() => setDropdownOpen((prev) => !prev)}
        className="flex items-center gap-2 nav-btn px-3 py-2 min-h-[44px] bg-[var(--surface-bg)] text-[var(--text-color)] border border-[var(--card-border)] cursor-pointer"
      >
        <img 
          src={avatarUrl} 
          alt="Avatar utilisateur" 
          className="w-6 h-6 rounded-full"
          referrerPolicy="no-referrer"
          onError={(e) => { e.currentTarget.src = siteConfig.discordAvatarFallback; }}
        />
        <span className="font-bold text-sm max-w-[100px] truncate">{session.user?.name}</span>
        <ChevronDown className={`w-4 h-4 opacity-50 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
      </button>

      {dropdownOpen && (
        <div className="absolute left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:right-0 mt-2 w-48 bg-[#09090b] border border-zinc-800 rounded-2xl shadow-xl overflow-hidden z-50 animate-slide-up">
          <div className="p-3 border-b border-[var(--card-border)]">
            <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider font-bold">Connecté en tant que</p>
            <p className="font-bold text-[var(--text-color)] truncate">{session.user?.name}</p>
          </div>
          <div className="p-2">
            {["ADMIN", "DEV"].includes(session.user?.role as string) && (
              <Link 
                href="/admin" 
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2 w-full p-2 text-sm font-bold text-fuchsia-500 hover:bg-fuchsia-500/10 rounded-xl transition-colors mt-1"
              >
                <LayoutDashboard className="w-4 h-4" />
                Administration
              </Link>
            )}
            <button 
              onClick={() => {
                setDropdownOpen(false);
                signOut({ callbackUrl: "/" });
              }}
              className="flex items-center gap-2 w-full p-2 text-sm font-bold text-red-500 hover:bg-red-500/10 rounded-xl transition-colors mt-1"
            >
              <LogOut className="w-4 h-4" />
              Se déconnecter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

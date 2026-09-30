"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { ChevronDown, LayoutDashboard, LogOut, LogIn } from "lucide-react";
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
    return (
      <div className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-mono text-zinc-500 flex items-center justify-center border border-zinc-800/80 bg-zinc-900/40 ${className}`.trim()}>
        ...
      </div>
    );
  }

  if (!session) {
    return (
      <button 
        type="button"
        onClick={() => signIn("discord")} 
        className={`min-h-[44px] px-4 py-2 rounded-xl bg-[#9d0df2] hover:bg-[#8508cf] text-white font-outfit font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 cursor-pointer ${className}`.trim()}
      >
        <LogIn className="w-3.5 h-3.5" />
        <span>Connexion</span>
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
        className="flex items-center gap-2.5 px-3 py-1.5 min-h-[44px] rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-100 border border-zinc-800 hover:border-zinc-700 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 cursor-pointer"
      >
        <img 
          src={avatarUrl} 
          alt="Avatar utilisateur" 
          className="w-7 h-7 rounded-lg object-cover border border-zinc-700"
          referrerPolicy="no-referrer"
          onError={(e) => { e.currentTarget.src = siteConfig.discordAvatarFallback; }}
        />
        <span className="font-outfit font-bold text-sm max-w-[110px] truncate">{session.user?.name}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-50 p-1.5 animate-in fade-in slide-in-from-top-2">
          <div className="px-3 py-2.5 border-b border-zinc-800/80 mb-1">
            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Connecté en tant que</p>
            <p className="font-outfit font-bold text-white text-sm truncate">{session.user?.name}</p>
          </div>
          <div className="space-y-0.5">
            {["ADMIN", "DEV"].includes(session.user?.role as string) && (
              <Link 
                href="/admin" 
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2.5 w-full min-h-[40px] px-3 py-2 text-xs font-semibold text-purple-300 hover:bg-purple-500/10 rounded-xl transition-colors"
              >
                <LayoutDashboard className="w-4 h-4 text-purple-400" />
                <span>Administration</span>
              </Link>
            )}
            <button 
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                signOut({ callbackUrl: "/" });
              }}
              className="flex items-center gap-2.5 w-full min-h-[40px] px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>Se déconnecter</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

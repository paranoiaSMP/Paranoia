"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, Layers, Dice5, ShoppingBag, Gamepad2, Home } from "lucide-react";
import UserMenu from "@/components/common/UserMenu";

const NAV_LINKS = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/cards", label: "Cartes TCG", icon: Layers },
  { href: "/jeux", label: "Mini-Jeux", icon: Dice5 },
  { href: "/shop", label: "Boutique", icon: ShoppingBag },
  { href: "/launcher", label: "Launcher", icon: Gamepad2 },
];

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#090810]/85 backdrop-blur-md border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo / Brand */}
        <Link 
          href="/" 
          className="flex items-center gap-2.5 min-h-[44px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 rounded-lg"
          aria-label="Retour à l'accueil"
        >
          <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-[#7a0aad] flex items-center justify-center text-white font-black text-sm shadow-md">
            P
          </div>
          <span className="font-outfit font-black text-lg text-white tracking-wider uppercase">
            Paranoia <span className="text-[#b366ff]">Studio</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Navigation principale">
          {NAV_LINKS.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 ${
                  isActive
                    ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                    : "text-slate-300 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4 text-purple-400" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Account & Mobile Toggle */}
        <div className="flex items-center gap-3">
          <UserMenu />

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            className="md:hidden min-w-[44px] min-h-[44px] p-2 rounded-xl bg-white/5 border border-white/10 text-white flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#090810]/95 backdrop-blur-xl px-4 py-4 space-y-1 animate-in fade-in slide-in-from-top-2">
          {NAV_LINKS.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`min-h-[44px] w-full px-4 py-3 rounded-xl text-sm font-semibold transition-colors flex items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 ${
                  isActive
                    ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                    : "text-slate-300 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="w-5 h-5 text-purple-400" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}

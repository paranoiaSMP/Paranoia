"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Sun, Moon, ChevronDown, Video, FileText, Ticket, Menu, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { FloatingDock } from '@/components/ui/floating-dock';
import { IconHome, IconShoppingCart, IconDice, IconDeviceGamepad2, IconUsers } from '@tabler/icons-react';
import UserMenu from '@/components/common/UserMenu';
import './Navbar.css';

export default function Navbar() {
  const [theme, setTheme] = useState('dark');
  const [commOpen, setCommOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const dockItems = [
    { title: "Accueil", icon: <IconHome className="h-full w-full" />, href: "/" },
    { title: "Boutique", icon: <IconShoppingCart className="h-full w-full" />, href: "/shop" },
    { title: "Jeux", icon: <IconDice className="h-full w-full" />, href: "/jeux" },
    { title: "Launcher", icon: <IconDeviceGamepad2 className="h-full w-full" />, href: "/launcher" },
    { title: "Communauté", icon: <IconUsers className="h-full w-full" />, href: "/videastes" },
  ];

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setCommOpen(false); 
  }, [pathname]);

  const toggleTheme = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTheme = e.target.checked ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <>
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 z-[1000] bg-[#09090b]/85 backdrop-blur-md border-b border-white/10 px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center shrink-0">
          <div className="relative w-28 h-9">
            <Image 
              src="/Paranoia_logo.png" 
              alt="Paranoia SMP Logo" 
              fill 
              priority
              className="object-contain drop-shadow-[0_0_8px_rgba(179,102,255,0.4)]"
            />
          </div>
        </Link>
        <div className="flex items-center gap-2.5">
          <div className="theme-switch-container flex items-center scale-90" title="Changer de thème">
            <input 
              type="checkbox" 
              id="theme-toggle-mobile" 
              className="theme-toggle-input" 
              checked={theme === 'dark'}
              onChange={toggleTheme}
            />
            <label htmlFor="theme-toggle-mobile" className="theme-toggle-label flex items-center justify-between w-full h-full px-1 cursor-pointer border border-white/10 shadow-inner">
              <Sun className="sun w-3.5 h-3.5 text-yellow-400" />
              <Moon className="moon w-3.5 h-3.5 text-purple-200" />
            </label>
          </div>
          <UserMenu className="scale-95" />
          <button 
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Menu"
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-[1001]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="md:hidden fixed top-0 right-0 bottom-0 w-[280px] bg-[#09090b] border-l border-zinc-800 p-6 z-[1002] shadow-2xl flex flex-col justify-between overflow-y-auto"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80 mb-6">
                  <span className="font-outfit font-black text-white text-lg tracking-wide">
                    Navigation
                  </span>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    aria-label="Fermer le menu"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <nav className="flex flex-col gap-2">
                  <Link 
                    href="/" 
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-colors ${pathname === '/' ? 'bg-purple-500/15 text-purple-300 font-bold' : 'text-zinc-300 hover:bg-white/5'}`}
                  >
                    Accueil
                  </Link>
                  <Link 
                    href="/shop" 
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-colors ${pathname === '/shop' ? 'bg-purple-500/15 text-purple-300 font-bold' : 'text-zinc-300 hover:bg-white/5'}`}
                  >
                    Boutique
                  </Link>
                  <Link 
                    href="/jeux" 
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-colors ${pathname === '/jeux' ? 'bg-purple-500/15 text-purple-300 font-bold' : 'text-zinc-300 hover:bg-white/5'}`}
                  >
                    <span className="text-purple-400 font-bold">Jeux</span>
                    <span className="px-1.5 py-0.5 text-[9px] uppercase font-black bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">New</span>
                  </Link>
                  <Link 
                    href="/launcher" 
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-colors ${pathname === '/launcher' ? 'bg-purple-500/15 text-purple-300 font-bold' : 'text-zinc-300 hover:bg-white/5'}`}
                  >
                    Launcher
                  </Link>
                  <div className="pt-4 mt-2 border-t border-zinc-800/80">
                    <span className="px-3.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      Communauté
                    </span>
                    <div className="flex flex-col gap-1 mt-2">
                      <Link 
                        href="/videastes" 
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${pathname === '/videastes' ? 'bg-fuchsia-500/15 text-fuchsia-300 font-bold' : 'text-zinc-300 hover:bg-white/5'}`}
                      >
                        <Video className="w-4 h-4 text-fuchsia-400 shrink-0" />
                        <span>Vidéastes</span>
                      </Link>
                      <Link 
                        href="/candidature" 
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${pathname === '/candidature' ? 'bg-purple-500/15 text-purple-300 font-bold' : 'text-zinc-300 hover:bg-white/5'}`}
                      >
                        <FileText className="w-4 h-4 opacity-70 shrink-0" />
                        <span>Candidature</span>
                      </Link>
                      <Link 
                        href="/tickets" 
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${pathname === '/tickets' ? 'bg-purple-500/15 text-purple-300 font-bold' : 'text-zinc-300 hover:bg-white/5'}`}
                      >
                        <Ticket className="w-4 h-4 text-purple-400 shrink-0" />
                        <span>Support / Tickets</span>
                      </Link>
                    </div>
                  </div>
                </nav>
              </div>

              <div className="pt-6 border-t border-zinc-800/80 text-xs text-zinc-500 flex items-center justify-between">
                <span>Paranoia SMP</span>
                <span className="font-mono text-[11px] text-zinc-600">v1.21.1</span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav className="navbar hidden md:block">
        <div className="nav-container">
          <Link href="/" className="nav-logo flex items-center group shrink-0">
            <div className="relative w-28 h-10 sm:w-32 sm:h-12 transition-transform duration-300 group-hover:scale-105">
              <Image 
                src="/Paranoia_logo.png" 
                alt="Paranoia SMP Logo" 
                fill 
                priority={true}
                className="object-contain drop-shadow-[0_0_8px_rgba(179,102,255,0.4)]"
              />
            </div>
          </Link>

          <ul className={`nav-links hidden md:flex`}>
          <li className="nav-link-first"><Link href="/" className="nav-item font-medium">Accueil</Link></li>
          <li><Link href="/shop" className="nav-item font-semibold">Boutique</Link></li>
          <li>
            <Link href="/jeux" className="nav-item font-black text-purple-400 hover:text-purple-300 flex items-center gap-1.5 transition-transform hover:scale-105">
              <span>Jeux</span>
              <span className="px-1.5 py-0.5 text-[9px] uppercase font-black bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30 shadow-[0_0_8px_rgba(168,85,247,0.4)]">New</span>
            </Link>
          </li>
          <li><Link href="/launcher" className="nav-item font-bold">Launcher</Link></li>

          <li className="relative">
            <button 
              onClick={() => setCommOpen(!commOpen)} 
              className="nav-item flex items-center gap-1 font-medium bg-transparent border-0 cursor-pointer text-[var(--nav-item-color)] hover:text-purple-400"
            >
              <span>Communauté</span>
              <ChevronDown className={`w-3.5 h-3.5 opacity-70 transition-transform duration-200 ${commOpen ? 'rotate-180 text-purple-400' : ''}`} />
            </button>
            {commOpen && (
              <div className="relative sm:absolute mt-2 sm:left-1/2 sm:-translate-x-1/2 sm:-left-4 w-full sm:w-44 bg-[#09090b] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-50 p-2 animate-slide-up">
                <Link 
                  href="/videastes" 
                  onClick={() => setCommOpen(false)}
                  className="flex items-center gap-2.5 p-2.5 text-xs font-bold text-fuchsia-400 hover:bg-fuchsia-500/10 rounded-xl transition-colors"
                >
                  <Video className="w-4 h-4 text-fuchsia-400 shrink-0" />
                  <span>Vidéastes</span>
                </Link>
                <Link 
                  href="/candidature" 
                  onClick={() => setCommOpen(false)}
                  className="flex items-center gap-2.5 p-2.5 text-xs font-semibold text-[var(--text-color)] hover:bg-white/5 rounded-xl transition-colors mt-1"
                >
                  <FileText className="w-4 h-4 opacity-70 shrink-0" />
                  <span>Candidature</span>
                </Link>
                <Link 
                  href="/tickets" 
                  onClick={() => setCommOpen(false)}
                  className="flex items-center gap-2.5 p-2.5 text-xs font-semibold text-[var(--text-color)] hover:bg-white/5 rounded-xl transition-colors mt-1"
                >
                  <Ticket className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Support / Tickets</span>
                </Link>
              </div>
            )}
          </li>

          <li className="theme-switch-container flex items-center" title="Changer de thème">
            <input 
              type="checkbox" 
              id="theme-toggle" 
              className="theme-toggle-input" 
              checked={theme === 'dark'}
              onChange={toggleTheme}
            />
            <label htmlFor="theme-toggle" className="theme-toggle-label flex items-center justify-between w-full h-full px-1 cursor-pointer border border-white/10 shadow-inner">
              <Sun className="sun w-3.5 h-3.5 text-yellow-400" />
              <Moon className="moon w-3.5 h-3.5 text-purple-200" />
            </label>
          </li>

          <li>
            <UserMenu />
          </li>
        </ul>
      </div>
    </nav>
    <FloatingDock 
      items={dockItems} 
      desktopClassName="hidden"
      mobileClassName="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] w-max"
    />
    </>
  );
}
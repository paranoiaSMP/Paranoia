"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Sun, Moon, ChevronDown, Video, FileText } from 'lucide-react';
import './Navbar.css';

export default function Navbar() {
  const [theme, setTheme] = useState('dark');
  const [commOpen, setCommOpen] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTheme = e.target.checked ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link href="/" className="nav-logo flex items-center group">
          <div className="relative w-14 h-14 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
            <Image 
              src="/Paranoia_logo.png" 
              alt="Paranoia SMP Logo" 
              fill 
              priority={true}
              unoptimized={true} 
              className="object-contain drop-shadow-[0_0_8px_rgba(179,102,255,0.4)]"
            />
          </div>
        </Link>
        
        <input type="checkbox" id="menu-toggle" className="menu-toggle" />
        <label htmlFor="menu-toggle" className="burger-icon" aria-label="Toggle navigation">
          <span></span>
          <span></span>
          <span></span>
        </label>
        
        <ul className="nav-links">
          <li className="nav-link-first"><Link href="/" className="nav-item font-medium">Accueil</Link></li>
          <li><Link href="/shop" className="nav-item font-semibold">Boutique</Link></li>
          <li>
            <Link href="/cards" className="nav-item font-black text-purple-400 hover:text-purple-300 flex items-center gap-1.5 transition-transform hover:scale-105">
              <span>TCG</span>
              <span className="px-1.5 py-0.5 text-[9px] uppercase font-black bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30 shadow-[0_0_8px_rgba(168,85,247,0.4)]">New</span>
            </Link>
          </li>
          <li><Link href="/launcher" className="nav-item font-bold">Launcher</Link></li>
          
          <li className="relative" onMouseLeave={() => setCommOpen(false)}>
            <button 
              onClick={() => setCommOpen(!commOpen)} 
              className="nav-item flex items-center gap-1 font-medium bg-transparent border-0 cursor-pointer text-[var(--nav-item-color)] hover:text-purple-400"
            >
              <span>Communauté</span>
              <ChevronDown className={`w-3.5 h-3.5 opacity-70 transition-transform duration-200 ${commOpen ? 'rotate-180 text-purple-400' : ''}`} />
            </button>
            {commOpen && (
              <div className="absolute left-0 sm:-left-4 mt-2 w-44 bg-[var(--navbar-bg)] backdrop-blur-2xl border border-[var(--card-border)] rounded-2xl shadow-2xl overflow-hidden z-50 p-2 animate-slide-up">
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
  );
}

import { useSession, signIn, signOut } from "next-auth/react";
import { LogOut, LayoutDashboard } from "lucide-react";

function UserMenu() {
  const { data: session, status } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  if (status === "loading") {
    return <div className="nav-btn opacity-50 cursor-wait">Chargement...</div>;
  }

  if (!session) {
    return (
      <button onClick={() => signIn("discord")} className="nav-btn">
        Se connecter
      </button>
    );
  }

  return (
    <div className="relative">
      <button 
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 nav-btn !px-3 !py-2 !bg-[var(--surface-bg)] !text-[var(--text-color)] border border-[var(--card-border)]"
      >
        <img 
          src={session.user?.image || "https://cdn.discordapp.com/embed/avatars/0.png"} 
          alt="Avatar" 
          className="w-6 h-6 rounded-full"
          referrerPolicy="no-referrer"
          onError={(e) => { e.currentTarget.src = "https://cdn.discordapp.com/embed/avatars/0.png" }}
        />
        <span className="font-bold text-sm max-w-[100px] truncate">{session.user?.name}</span>
        <ChevronDown className="w-4 h-4 opacity-50" />
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-[var(--navbar-bg)] backdrop-blur-xl border border-[var(--card-border)] rounded-2xl shadow-xl overflow-hidden z-50 animate-slide-up">
          <div className="p-3 border-b border-[var(--card-border)]">
            <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider font-bold">Connecté en tant que</p>
            <p className="font-bold text-[var(--text-color)] truncate">{session.user?.name}</p>
          </div>
          <div className="p-2">
            {(session.user as any)?.role === "ADMIN" && (
              <Link href="/admin" className="flex items-center gap-2 w-full p-2 text-sm font-bold text-fuchsia-500 hover:bg-fuchsia-500/10 rounded-xl transition-colors">
                <LayoutDashboard className="w-4 h-4" />
                Administration
              </Link>
            )}
            <button 
              onClick={() => signOut({ callbackUrl: "/" })}
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
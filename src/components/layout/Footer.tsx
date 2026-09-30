"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Disc, ShieldAlert, FileText, ExternalLink } from 'lucide-react';
import { useSettings } from '@/components/providers/SettingsProvider';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { discordUrl } = useSettings();

  return (
    <footer className="w-full bg-[#09090b] border-t border-zinc-800 text-zinc-400 mt-20">
      <div className="max-w-6xl mx-auto px-6 pt-12 pb-28 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Logo & Intro */}
          <div className="md:col-span-2">
            <Link href="/" className="inline-block mb-4">
              <div className="relative w-32 h-12 grayscale hover:grayscale-0 transition-all duration-300">
                <Image 
                  src="/logo.png" 
                  alt="Paranoia SMP Logo" 
                  fill 
                  className="object-contain"
                />
              </div>
            </Link>
            <p className="text-sm text-zinc-500 max-w-sm">
              Serveur Survie Multijoueur Minecraft Privé. Explorez, collectionnez des boosters TCG, jouez aux mini-jeux et rejoignez une communauté active.
            </p>
            <p className="text-xs text-zinc-600 mt-4">
              Non affilié ou approuvé par Mojang AB.
            </p>
          </div>

          {/* Navigation Rapide */}
          <div>
            <h3 className="text-white font-bold mb-4 font-outfit tracking-wide">Navigation</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/shop" className="hover:text-purple-400 transition-colors flex items-center gap-2">
                  Boutique
                </Link>
              </li>
              <li>
                <Link href="/launcher" className="hover:text-purple-400 transition-colors flex items-center gap-2">
                  Launcher
                </Link>
              </li>
              <li>
                <Link href="/jeux" className="hover:text-purple-400 transition-colors flex items-center gap-2">
                  Jeux & TCG
                </Link>
              </li>
              <li>
                <a href={discordUrl} target="_blank" rel="noopener noreferrer" className="hover:text-purple-400 transition-colors flex items-center gap-2">
                  Discord <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>

          {/* Légal & Support */}
          <div>
            <h3 className="text-white font-bold mb-4 font-outfit tracking-wide">Légal & Aide</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/cgu" className="hover:text-purple-400 transition-colors flex items-center gap-2">
                  <FileText className="w-4 h-4" /> CGV / CGU
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-purple-400 transition-colors flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" /> Confidentialité
                </Link>
              </li>
              <li>
                <Link href="/tickets" className="hover:text-purple-400 transition-colors flex items-center gap-2">
                  <Disc className="w-4 h-4" /> Support
                </Link>
              </li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-zinc-800/50 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-zinc-600">
          <p>© {currentYear} Paranoia SMP. Tous droits réservés.</p>
          <div className="flex gap-4">
            <span>Made with passion by the Dev Team</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signIn } from "next-auth/react";
import { Sparkles, Dice5, Check, Plus, LogIn } from "lucide-react";
import { siteConfig } from "@/config/site";

export default function HeroSection() {
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";

  return (
    <section className="pt-12 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
      {/* Titre & Sous-titre direct sans badge superflu */}
      <h1 className="font-outfit text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tight uppercase mb-4 text-balance">
        Paranoia <span className="text-[#b366ff]">Studio</span>
      </h1>

      <p className="text-base sm:text-lg text-zinc-400 max-w-xl mx-auto mb-10 leading-relaxed font-normal text-balance">
        Ouvrez des boosters de cartes exclusives et jouez avec vos jetons dans notre salle de jeux en temps réel.
      </p>

      {/* Deux boutons d'action majeurs (CTA) avec palette unifiée */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
        <Link
          href="/cards"
          className="w-full sm:w-auto min-h-[48px] px-7 py-3 rounded-xl bg-[#9d0df2] hover:bg-[#8508cf] text-white font-outfit font-bold text-sm uppercase tracking-wider transition-colors flex items-center justify-center gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500"
        >
          <Sparkles className="w-4 h-4" />
          <span>Ouvrir des Boosters</span>
        </Link>

        <Link
          href="/jeux"
          className="w-full sm:w-auto min-h-[48px] px-7 py-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 text-zinc-200 font-outfit font-bold text-sm tracking-wider transition-colors flex items-center justify-center gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500"
        >
          <Dice5 className="w-4 h-4 text-purple-400" />
          <span>Salle des Jeux</span>
        </Link>
      </div>

      {/* HUD de profil sobre et unifié */}
      <div className="max-w-xl mx-auto rounded-2xl border border-zinc-800/80 bg-zinc-950/80 p-4 sm:p-5">
        {isLoggedIn ? (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-left">
              <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 shrink-0">
                <Image
                  src={session.user?.image || siteConfig.discordAvatarFallback}
                  alt="Avatar"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-outfit font-bold text-white text-sm">
                    {session.user?.name}
                  </span>
                  {session.user?.isMcVerified && (
                    <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1">
                      <Check className="w-3 h-3 text-purple-400" /> Vérifié
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 font-mono">
                  {session.user?.minecraftName ? session.user.minecraftName : "Pseudo non lié"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-zinc-900/60 border border-zinc-800 px-3.5 py-1.5 rounded-xl shrink-0">
              <div className="relative w-5 h-5 shrink-0">
                <Image
                  src="/Paracoin.png"
                  alt="Coins"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
              <div className="text-left leading-tight">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Solde</span>
                <span className="font-mono font-bold text-white text-sm">
                  {(session.user?.paraCoins ?? 100).toLocaleString("fr-FR")} <span className="text-zinc-500">PC</span>
                </span>
              </div>
              <Link
                href="/shop"
                className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition-colors ml-1"
                title="Boutique"
                aria-label="Recharger mon solde"
              >
                <Plus className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
            <div>
              <p className="font-outfit font-bold text-white text-sm mb-0.5">
                Connectez-vous pour jouer et collectionner
              </p>
              <p className="text-xs text-zinc-500">
                Votre progression et vos cartes sont sauvegardées sur votre compte.
              </p>
            </div>
            <button
              type="button"
              onClick={() => signIn("discord")}
              className="w-full sm:w-auto min-h-[40px] px-5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500"
            >
              <LogIn className="w-3.5 h-3.5 text-purple-400" />
              <span>Connexion Discord</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

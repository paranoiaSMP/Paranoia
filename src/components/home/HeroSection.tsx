"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signIn } from "next-auth/react";
import { Layers, Dice5, Sparkles, ArrowRight, ShieldCheck, Plus, LogIn } from "lucide-react";
import { siteConfig } from "@/config/site";

export default function HeroSection() {
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";

  return (
    <section className="relative pt-8 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto text-center">
      {/* Badge statut environnement */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-mono font-bold mb-6">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        Écosystème Autonome · Paranoia v2.0
      </div>

      {/* Titre & Sous-titre */}
      <h1 className="font-outfit text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tight uppercase mb-4 text-balance">
        Paranoia <span className="text-[#b366ff] drop-shadow-[0_0_30px_rgba(179,102,255,0.4)]">Studio</span>
      </h1>

      <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed font-medium text-balance">
        Collectionnez les cartes TCG exclusives des joueurs du SMP et défiez le destin dans notre salle de jeux temps réel.
      </p>

      {/* Deux boutons d'action majeurs (CTA) */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
        <Link
          href="/cards"
          className="w-full sm:w-auto min-h-[52px] px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-[#9d0df2] to-[#b366ff] hover:from-purple-500 hover:to-fuchsia-500 text-white font-outfit font-black text-base uppercase tracking-wider shadow-[0_0_25px_rgba(168,85,247,0.45)] hover:shadow-[0_0_35px_rgba(168,85,247,0.7)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 flex items-center justify-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500"
        >
          <Sparkles className="w-5 h-5 text-purple-200" />
          <span>Ouvrir des Boosters</span>
          <ArrowRight className="w-4 h-4 opacity-80" />
        </Link>

        <Link
          href="/jeux"
          className="w-full sm:w-auto min-h-[52px] px-8 py-3.5 rounded-2xl bg-[#141320] border-2 border-white/10 hover:border-purple-500/50 hover:bg-[#1a192a] text-white font-outfit font-bold text-base tracking-wider hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 flex items-center justify-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500"
        >
          <Dice5 className="w-5 h-5 text-purple-400" />
          <span>Salle des Jeux</span>
        </Link>
      </div>

      {/* HUD de profil joueur interactif */}
      <div className="max-w-2xl mx-auto rounded-3xl border border-white/10 bg-[#12111a]/90 backdrop-blur-xl p-5 sm:p-6 shadow-2xl">
        {isLoggedIn ? (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Identité joueur */}
            <div className="flex items-center gap-3 text-left">
              <div className="relative w-12 h-12 rounded-2xl overflow-hidden border-2 border-purple-500/30 bg-purple-500/10 shrink-0">
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
                  <span className="font-outfit font-black text-white text-base">
                    {session.user?.name}
                  </span>
                  {session.user?.isMcVerified && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      <ShieldCheck className="w-3 h-3" /> Vérifié
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 font-mono">
                  {session.user?.minecraftName ? `Minecraft : ${session.user.minecraftName}` : "Pseudo Minecraft non lié"}
                </p>
              </div>
            </div>

            {/* Solde PARA Coins & Rechargement */}
            <div className="flex items-center gap-3 bg-black/40 border border-white/10 px-4 py-2 rounded-2xl shrink-0">
              <div className="relative w-7 h-7 shrink-0">
                <Image
                  src="/Paracoin.png"
                  alt="Coins"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
              <div className="text-left leading-tight">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Solde</span>
                <span className="font-mono font-black text-white text-lg">
                  {(session.user?.paraCoins ?? 100).toLocaleString("fr-FR")} <span className="text-xs text-purple-400">PC</span>
                </span>
              </div>
              <Link
                href="/shop"
                className="w-9 h-9 rounded-xl bg-purple-600/30 hover:bg-purple-600 border border-purple-500/40 text-purple-200 hover:text-white flex items-center justify-center transition-all ml-1"
                title="Boutique & Rechargement"
                aria-label="Recharger mon solde"
              >
                <Plus className="w-4 h-4 font-bold" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
            <div>
              <h2 className="font-outfit font-black text-white text-base mb-1">
                Connectez-vous pour jouer et collectionner
              </h2>
              <p className="text-xs text-slate-400">
                Vos cartes TCG et votre solde de PARA Coins sont sauvegardés automatiquement sur votre profil.
              </p>
            </div>
            <button
              type="button"
              onClick={() => signIn("discord")}
              className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors shrink-0 shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              <LogIn className="w-4 h-4" />
              <span>Connexion Discord</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

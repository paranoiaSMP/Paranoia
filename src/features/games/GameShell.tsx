"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { signIn } from "next-auth/react";
import AnimatedNumber from "@/components/motion/AnimatedNumber";
import { useBalance } from "./useBalance";

type Balance = ReturnType<typeof useBalance>;

export default function GameShell({
  title,
  rules,
  wallet,
  spectate = false,
  children,
}: {
  title: string;
  rules: string;
  wallet: Balance;
  spectate?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-7xl px-5 pb-20 pt-8 md:px-10">
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-zinc-900 pb-6">
        <div>
          <Link href="/jeux" className="inline-flex min-h-11 items-center text-sm text-zinc-400 hover:text-white">
            ← Jeux
          </Link>
          <h1 className="text-5xl font-extrabold tracking-[-0.045em] text-white md:text-7xl">{title}</h1>
          <p className="mt-3 max-w-xl text-zinc-300">{rules}</p>
        </div>
        {wallet.status === "authenticated" && (
          <div className="text-right" aria-live="polite">
            <p className="text-sm text-zinc-400">Solde</p>
            <p className="text-3xl font-bold text-white">
              {wallet.coins === null ? (
                wallet.error ? (
                  <button type="button" onClick={wallet.refresh} className="min-h-11 text-base text-zinc-300 underline underline-offset-4">
                    Réessayer
                  </button>
                ) : (
                  <span className="inline-block h-8 w-24 animate-pulse rounded-sm bg-zinc-900 align-middle" />
                )
              ) : (
                <>
                  <AnimatedNumber value={wallet.coins} />
                  <span className="ml-2 text-base font-semibold text-violet-400">PC</span>
                </>
              )}
            </p>
          </div>
        )}
      </div>

      {wallet.status === "loading" && <div className="mt-10 h-96 animate-pulse rounded-md bg-zinc-950" />}

      {wallet.status === "unauthenticated" && spectate && (
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-md border border-zinc-800 p-4">
          <p className="text-zinc-200">Tu regardes la table. Connecte-toi pour miser.</p>
          <button type="button" onClick={() => signIn("discord")} className="btn-violet min-h-11">
            Connexion Discord
          </button>
        </div>
      )}

      {wallet.status === "unauthenticated" && !spectate && (
        <div className="mt-16 flex flex-col items-start gap-5">
          <p className="text-2xl font-semibold text-white">Connecte-toi pour jouer avec tes ParaCoins.</p>
          <button type="button" onClick={() => signIn("discord")} className="btn-violet">
            Connexion Discord
          </button>
        </div>
      )}

      {(wallet.status === "authenticated" || (spectate && wallet.status === "unauthenticated")) && (
        <div className="mt-10">{children}</div>
      )}
    </div>
  );
}

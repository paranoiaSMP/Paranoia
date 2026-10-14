"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[PARANOIA_ERROR]", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[calc(100svh-4rem)] max-w-7xl flex-col justify-center px-5 py-16 md:px-10">
      <p className="text-sm font-medium text-violet-400">Erreur</p>
      <h1 className="mt-4 text-5xl font-extrabold leading-none tracking-tighter text-white md:text-8xl">
        Une erreur est survenue.
      </h1>
      <p className="mt-8 max-w-md text-lg text-zinc-300">
        Rechargez la page. Si le problème continue, prévenez-nous sur Discord.
      </p>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={reset} className="btn-violet">
          Réessayer
        </button>
        <Link href="/" className="btn-line">
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}

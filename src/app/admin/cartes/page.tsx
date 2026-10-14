"use client";

import { useSession, signIn } from "next-auth/react";
import CardEditor from "@/features/editor/CardEditor";

export default function CardEditorPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div role="status" className="mx-auto max-w-7xl px-5 py-20 md:px-10">
        <div className="h-10 w-64 animate-pulse rounded-sm bg-zinc-900" />
        <span className="sr-only">Chargement</span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto flex min-h-[60svh] max-w-7xl flex-col justify-center gap-6 px-5 md:px-10">
        <h1 className="text-4xl font-bold tracking-[-0.03em] text-white">Éditeur de cartes</h1>
        <p className="text-zinc-300">Connecte-toi pour y accéder.</p>
        <button type="button" onClick={() => signIn("discord")} className="btn-violet self-start">
          Connexion Discord
        </button>
      </div>
    );
  }

  if (!["ADMIN", "DEV"].includes(session.user?.role as string)) {
    return (
      <div className="mx-auto flex min-h-[60svh] max-w-7xl flex-col justify-center gap-4 px-5 md:px-10">
        <h1 className="text-4xl font-bold tracking-[-0.03em] text-white">Accès réservé</h1>
        <p className="text-zinc-300">L&apos;éditeur de cartes est réservé à l&apos;équipe du studio.</p>
      </div>
    );
  }

  return <CardEditor />;
}

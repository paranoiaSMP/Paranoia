"use client";

import Link from "next/link";
import AnimatedNumber from "@/components/motion/AnimatedNumber";
import { useResource } from "./useResource";
import { PanelHeader } from "./ui";

type Tab = "users" | "players" | "reports" | "news";

function Tile({ label, value, hint, onClick }: { label: string; value: number | null; hint?: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="press flex min-h-36 flex-col justify-between rounded-md border border-zinc-900 bg-[#0b0b0d] p-5 text-left hover:border-zinc-700"
    >
      <span className="text-sm text-zinc-400">{label}</span>
      <span className="text-4xl font-extrabold tracking-[-0.04em] text-white">
        {value === null ? <span className="inline-block h-9 w-20 animate-pulse rounded-sm bg-zinc-900 align-middle" /> : <AnimatedNumber value={value} />}
      </span>
      {hint && <span className="text-xs text-zinc-400">{hint}</span>}
    </button>
  );
}

export default function Overview({ go }: { go: (t: Tab) => void }) {
  const users = useResource<{ paraCoins: number; minecraftName: string | null }[]>("/api/admin/users");
  const players = useResource<{ status: string }[]>("/api/players");
  const reports = useResource<{ status: string }[]>("/api/admin/reports");
  const news = useResource<unknown[]>("/api/admin/news");

  const failed = [users, players, reports, news].filter((r) => r.error).length;

  return (
    <section>
      <PanelHeader title="Vue d'ensemble" text="Chiffres tirés directement de la base." />
      {failed > 0 && <p role="alert" className="mt-4 text-sm text-red-400">{failed} source(s) n&apos;ont pas pu être chargées.</p>}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Tile label="Comptes" value={users.data?.length ?? null} hint={users.data ? `${users.data.filter((u) => !u.minecraftName).length} sans Minecraft lié` : undefined} onClick={() => go("users")} />
        <Tile label="ParaCoins en circulation" value={users.data ? users.data.reduce((a, u) => a + u.paraCoins, 0) : null} onClick={() => go("users")} />
        <Tile label="Signalements ouverts" value={reports.data ? reports.data.filter((r) => r.status === "OPEN").length : null} onClick={() => go("reports")} />
        <Tile label="Joueurs" value={players.data?.length ?? null} onClick={() => go("players")} />
        <Tile label="Joueurs bannis" value={players.data ? players.data.filter((p) => p.status === "BANNED").length : null} onClick={() => go("players")} />
        <Tile label="Actualités publiées" value={news.data?.length ?? null} onClick={() => go("news")} />
      </div>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/admin/cartes" className="btn-line">
          Éditeur de cartes
        </Link>
      </div>
    </section>
  );
}

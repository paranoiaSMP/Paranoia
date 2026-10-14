"use client";

import type { ReactNode } from "react";

export const inputCls =
  "min-h-11 rounded-md border border-zinc-500 bg-black px-3 text-sm text-white placeholder:text-zinc-400 focus-visible:border-violet-400";

export function PanelHeader({ title, text, actions }: { title: string; text?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-900 pb-6">
      <div>
        <h2 className="text-3xl font-bold tracking-[-0.03em] text-white md:text-4xl">{title}</h2>
        {text && <p className="mt-2 max-w-xl text-sm text-zinc-400">{text}</p>}
      </div>
      {actions}
    </div>
  );
}

export function ListState({
  loading,
  error,
  empty,
  emptyText,
  onRetry,
}: {
  loading: boolean;
  error: string | null;
  empty: boolean;
  emptyText: string;
  onRetry: () => void;
}) {
  if (loading)
    return (
      <div role="status" className="flex flex-col gap-2 py-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-md bg-zinc-950" />
        ))}
        <span className="sr-only">Chargement</span>
      </div>
    );
  if (error)
    return (
      <div role="alert" className="flex flex-col items-start gap-3 py-8 text-zinc-300">
        {error}
        <button type="button" onClick={onRetry} className="btn-line min-h-11">
          Réessayer
        </button>
      </div>
    );
  if (empty) return <p className="py-8 text-zinc-400">{emptyText}</p>;
  return null;
}

export const fmt = (n: number) => n.toLocaleString("fr-FR");
export const date = (d: string) =>
  new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

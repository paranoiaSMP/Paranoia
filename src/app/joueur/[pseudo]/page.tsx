"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import ShowcaseEditor from "@/features/profile/ShowcaseEditor";
import ProfileEditor from "@/features/profile/ProfileEditor";
import { DEFAULT_ACCENT, cleanLink, linkLabel, validAccent } from "@/lib/profile";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import CardZoom from "@/components/tcg/CardZoom";
import CardDisplay from "@/features/binder/components/CardDisplay";
import SplitReveal from "@/components/motion/SplitReveal";
import type { TradingCard } from "@/types/cards";
import { EASE_OUT } from "@/lib/motion";
import { isFounderUuid } from "@/lib/roles";
import { levelOf } from "@/lib/levels";

type Profile = {
  minecraftName: string;
  uuid: string | null;
  role: string;
  vip: boolean;
  tagline: string | null;
  links: string[];
  cosmetics: { itemId: string; name: string; category: string; imageUrl: string | null }[];
  createdAt: string;
  xp: number;
  cards: number;
  distinct: number;
  total: number;
  byRarity: Record<string, number>;
  custom?: boolean;
  accent: string | null;
  bio: string | null;
  banner: string | null;
  hidden: string[];
  best: { id: string; specialEffect: string | null; tradingCard: TradingCard }[];
};

const ROLE: Record<string, string> = { DEV: "Dev", ADMIN: "Admin", MODERATOR: "Modérateur" };
const RARITIES = [
  { key: "MYTHIC", label: "Mythique", tint: "#ef4444" },
  { key: "LEGENDARY", label: "Légendaire", tint: "#f59e0b" },
  { key: "EPIC", label: "Épique", tint: "#a855f7" },
  { key: "RARE", label: "Rare", tint: "#3b82f6" },
  { key: "UNCOMMON", label: "Peu commune", tint: "#22c55e" },
  { key: "COMMON", label: "Commune", tint: "#71717a" },
];

export default function PlayerProfile() {
  const { pseudo } = useParams<{ pseudo: string }>();
  const reduce = useReducedMotion();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const { data: session } = useSession();
  const [editing, setEditing] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  // Brouillon de l'éditeur : le profil se met à jour en direct avant l'enregistrement.
  const [draft, setDraft] = useState<{ accent: string; bio: string; hidden: string[]; tagline: string; links: string[] } | null>(null);
  const [reload, setReload] = useState(0);
  const [zoom, setZoom] = useState<Profile["best"][number] | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/profile/${encodeURIComponent(pseudo)}`)
      .then(async (res) => {
        if (!alive) return;
        if (res.status === 404 || res.status === 400) return setState("missing");
        if (!res.ok) return setState("error");
        setProfile(await res.json());
        setState("ready");
      })
      .catch(() => alive && setState("error"));
    return () => {
      alive = false;
    };
  }, [pseudo, reload]);

  if (state === "loading") {
    return (
      <div role="status" className="mx-auto max-w-7xl px-5 py-16 md:px-10">
        <div className="h-20 w-2/3 animate-pulse rounded-sm bg-zinc-900" />
        <span className="sr-only">Chargement du profil</span>
      </div>
    );
  }

  if (state !== "ready" || !profile) {
    return (
      <div className="mx-auto flex min-h-[60svh] max-w-7xl flex-col justify-center gap-5 px-5 md:px-10">
        <h1 className="text-5xl font-extrabold tracking-[-0.045em] text-white md:text-7xl">
          {state === "missing" ? "Joueur introuvable." : "Profil indisponible."}
        </h1>
        <p className="text-zinc-300">
          {state === "missing" ? `Aucun compte du site n'est lié au pseudo « ${pseudo} ».` : "Réessaie dans un instant."}
        </p>
        <Link href="/joueurs" className="btn-line self-start">
          Voir tous les joueurs
        </Link>
      </div>
    );
  }

  const skinId = profile.uuid ?? profile.minecraftName;
  const founder = isFounderUuid(profile.uuid);
  const lvl = levelOf(profile.xp ?? 0);
  const max = Math.max(1, ...Object.values(profile.byRarity));
  const isMe = session?.user?.minecraftName?.toLowerCase() === profile.minecraftName.toLowerCase();
  const grow = (n: number) => ({
    initial: reduce ? false : { transform: "scaleX(0)" },
    animate: { transform: `scaleX(${n})` },
    transition: { duration: 0.8, ease: EASE_OUT, delay: 0.3 },
  });
  const live = customizing ? draft : null;
  const accent = live && validAccent(live.accent) ? live.accent : (profile.accent ?? DEFAULT_ACCENT);
  const bio = live ? live.bio : profile.bio;
  const tagline = live ? live.tagline : profile.tagline;
  const links = live ? live.links.map(cleanLink).filter((l): l is string => !!l) : profile.links;
  const hidden = live?.hidden ?? profile.hidden;
  const show = (k: string) => !hidden.includes(k);
  const since = new Date(profile.createdAt).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-12 md:px-10 md:pt-16" style={{ "--accent": accent } as React.CSSProperties}>
      {profile.banner && <img src={profile.banner} alt="" className="mb-8 h-36 w-full rounded-xl object-cover md:h-56" />}
      <Link href="/joueurs" className="mb-6 inline-flex min-h-11 items-center text-sm text-zinc-400 transition-colors hover:text-white">
        ← Tous les joueurs
      </Link>
      <div className="grid grid-cols-1 items-end gap-10 lg:grid-cols-12">
        <div className="lg:col-span-8">
          {profile.vip && <p className="text-sm font-medium text-[var(--accent)]">VIP</p>}
          {(founder || ROLE[profile.role]) && (
            <p className="text-sm font-medium text-[var(--accent)]">Équipe · {founder ? "Fondateur" : ROLE[profile.role]}</p>
          )}
          <SplitReveal
            lines={[profile.minecraftName]}
            className="mt-3 break-all text-[clamp(3rem,10vw,8rem)] font-extrabold leading-[0.9] tracking-[-0.045em] text-white"
          />
          {tagline && <p className="mt-4 text-xl font-medium text-[var(--accent)]">{tagline}</p>}
          <p className="mt-4 text-zinc-300">Membre depuis {since}</p>
          {bio && <p className="mt-3 max-w-xl whitespace-pre-line break-words text-zinc-200">{bio}</p>}
          {links.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-x-5">
              {links.map((l) => (
                <li key={l}>
                  <a href={l} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex min-h-11 items-center text-sm text-zinc-300 underline underline-offset-4 hover:text-white">
                    {linkLabel(l)}
                  </a>
                </li>
              ))}
            </ul>
          )}
          {isMe && (
            <button type="button" onClick={() => setCustomizing((v) => !v)} aria-expanded={customizing} className="btn-line mt-6 mr-3">
              Personnaliser le profil
            </button>
          )}
          {!isMe && (
            <Link href={`/jeux/echanges?joueur=${encodeURIComponent(profile.minecraftName)}`} className="btn-violet mt-6 inline-flex">
              Proposer un échange
            </Link>
          )}

          {show("level") && <div className="mt-8 max-w-md">
            <p className="flex items-baseline justify-between gap-4">
              <span className="text-2xl font-bold text-white">Niveau {lvl.level}</span>
              <span className="text-sm tabular-nums text-zinc-400">
                {lvl.into} / {lvl.need} XP
              </span>
            </p>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-900"
              role="progressbar"
              aria-label={`Progression vers le niveau ${lvl.level + 1}`}
              aria-valuemin={0}
              aria-valuemax={lvl.need}
              aria-valuenow={lvl.into}
            >
              <motion.div className="h-full origin-left rounded-full bg-[var(--accent)]" {...grow(lvl.into / lvl.need)} />
            </div>
            <p className="mt-2 text-xs text-zinc-400">XP gagnée en discutant sur le Discord.</p>
          </div>}

          {show("stats") && <dl className="mt-10 grid max-w-xl grid-cols-3 gap-6">
            <div>
              <dt className="text-sm text-zinc-400">Cartes</dt>
              <dd className="mt-1 text-3xl font-bold tabular-nums text-white">{profile.cards}</dd>
            </div>
            <div>
              <dt className="text-sm text-zinc-400">Différentes</dt>
              <dd className="mt-1 text-3xl font-bold tabular-nums text-white">{profile.distinct}</dd>
            </div>
            <div>
              <dt className="text-sm text-zinc-400">Collection</dt>
              <dd className="mt-1 text-3xl font-bold tabular-nums text-white">
                {profile.total > 0 ? Math.round((profile.distinct / profile.total) * 100) : 0} %
              </dd>
            </div>
          </dl>}
        </div>
        <motion.div
          className="flex justify-center lg:col-span-4"
          initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(24px)" }}
          animate={{ opacity: 1, transform: "translateY(0px)" }}
          transition={{ duration: reduce ? 0.2 : 0.7, ease: EASE_OUT, delay: reduce ? 0 : 0.2 }}
        >
          <div className="relative">
          <div aria-hidden className="absolute inset-x-0 bottom-0 top-1/4 -z-10 rounded-full blur-3xl" style={{ background: "color-mix(in srgb, var(--accent) 25%, transparent)" }} />
          <img
            src={`https://vzge.me/full/512/${encodeURIComponent(skinId)}.png`}
            alt={`Skin de ${profile.minecraftName}`}
            className="h-[42svh] max-h-96 w-auto"
            style={{ imageRendering: "pixelated" }}
          />
          </div>
        </motion.div>
      </div>

      {customizing && (
        <ProfileEditor accent={profile.accent} bio={profile.bio} tagline={profile.tagline} links={profile.links} banner={profile.banner} hidden={profile.hidden} onDraft={setDraft} onSaved={() => setReload((n) => n + 1)} onClose={() => setCustomizing(false)} />
      )}

      <section className="mt-20 grid grid-cols-1 gap-12 lg:grid-cols-12">
        {show("rarity") && <div className="lg:col-span-4">
          <h2 className="text-2xl font-bold tracking-[-0.03em] text-white">Par rareté</h2>
          <ul className="mt-6 flex flex-col gap-3">
            {RARITIES.map((r) => {
              const n = profile.byRarity[r.key] ?? 0;
              return (
                <li key={r.key} className="grid grid-cols-[7rem_minmax(0,1fr)_2.5rem] items-center gap-3 text-sm">
                  <span className="text-zinc-300">{r.label}</span>
                  <span aria-hidden className="h-1.5 overflow-hidden rounded-full bg-zinc-900">
                    <motion.span className="block h-full origin-left rounded-full" style={{ background: r.tint }} {...grow(n / max)} />
                  </span>
                  <span className="text-right tabular-nums text-white">{n}</span>
                </li>
              );
            })}
          </ul>
        </div>}
        {show("cards") && <div className="lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-bold tracking-[-0.03em] text-white">Ses meilleures cartes</h2>
            {isMe && !editing && (
              <button type="button" onClick={() => setEditing(true)} className="btn-line">
                Choisir les cartes
              </button>
            )}
          </div>
          {editing && <ShowcaseEditor initial={profile.custom ? profile.best.map((c) => c.id) : []} onSaved={() => setReload((n) => n + 1)} onClose={() => setEditing(false)} />}
          {profile.best.length === 0 ? (
            <p className="mt-6 text-zinc-400">Pas encore de carte.</p>
          ) : (
            <ul className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3">
              {profile.best.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => setZoom(c)} aria-label={`Agrandir ${c.tradingCard.title}`} className="block w-full text-left">
                    <CardDisplay card={c.tradingCard} size="md" specialEffect={c.specialEffect} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>}
      </section>
      {show("cosmetics") && profile.cosmetics.length > 0 && (
        <section className="mt-20">
          <h2 className="text-2xl font-bold tracking-[-0.03em] text-white">Cosmétiques du launcher</h2>
          <ul className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {profile.cosmetics.map((c) => (
              <li key={c.itemId}>
                <div className="aspect-square overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
                  {c.imageUrl && <img src={c.imageUrl} alt="" loading="lazy" className="size-full object-cover" />}
                </div>
                <p className="mt-2 text-sm text-white">{c.name}</p>
                <p className="text-xs capitalize text-zinc-400">{c.category}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      <AnimatePresence>{zoom && <CardZoom card={zoom.tradingCard} effect={zoom.specialEffect} onClose={() => setZoom(null)} />}</AnimatePresence>
    </div>
  );
}

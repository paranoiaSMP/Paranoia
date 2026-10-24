"use client";

import { useEffect, useRef, useState } from "react";
import { BIO_MAX, DEFAULT_ACCENT, MAX_LINKS, SECTIONS, TAGLINE_MAX, cleanLink, validAccent } from "@/lib/profile";

const PRESETS = ["#a78bfa", "#f472b6", "#fb923c", "#facc15", "#4ade80", "#38bdf8"];

type Props = {
  accent: string | null;
  bio: string | null;
  tagline: string | null;
  links: string[];
  banner: string | null;
  hidden: string[];
  onDraft: (d: { accent: string; bio: string; hidden: string[]; tagline: string; links: string[] }) => void;
  onSaved: () => void;
  onClose: () => void;
};

/** Personnalisation de son profil, avec aperçu en direct sur la page. Rien n'est enregistré avant « Enregistrer ». */
export default function ProfileEditor(p: Props) {
  const [accent, setAccent] = useState(p.accent ?? DEFAULT_ACCENT);
  const [bio, setBio] = useState(p.bio ?? "");
  const [tagline, setTagline] = useState(p.tagline ?? "");
  const [links, setLinks] = useState<string[]>(p.links);
  const [hidden, setHidden] = useState<string[]>(p.hidden);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const accentOk = validAccent(accent);
  const linksOk = links.every((l) => !l.trim() || cleanLink(l));
  const { onDraft } = p;
  useEffect(() => onDraft({ accent, bio, hidden, tagline, links }), [accent, bio, hidden, tagline, links, onDraft]);

  const call = async (url: string, init: RequestInit) => {
    setBusy(true);
    setError("");
    const res = await fetch(url, init).catch(() => null);
    setBusy(false);
    if (res?.ok) return true;
    const msg = await res?.json().then((d) => d.error).catch(() => null);
    setError(msg ?? "Enregistrement impossible, réessaie.");
    return false;
  };

  const save = async () => {
    const ok = await call("/api/user/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accent, bio, hidden, tagline, links: links.filter((l) => l.trim()).map((l) => cleanLink(l)) }),
    });
    if (ok) {
      p.onSaved();
      p.onClose();
    }
  };

  const upload = async (f: File) => {
    const body = new FormData();
    body.set("file", f);
    if (await call("/api/user/profile/banner", { method: "POST", body })) p.onSaved();
  };

  const toggle = (key: string) => setHidden((h) => (h.includes(key) ? h.filter((k) => k !== key) : [...h, key]));

  return (
    <div className="mt-8 rounded-2xl border border-zinc-800 bg-[#09090b] p-4 transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] starting:translate-y-2 starting:opacity-0 motion-reduce:starting:translate-y-0 md:p-6">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <fieldset>
            <legend className="text-sm font-semibold text-white">Couleur d&apos;accent</legend>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setAccent(c)}
                  aria-label={`Accent ${c}`}
                  aria-pressed={accent.toLowerCase() === c}
                  className="h-11 w-11 rounded-md outline-offset-2 aria-pressed:outline aria-pressed:outline-2 aria-pressed:outline-white"
                  style={{ background: c }}
                />
              ))}
              <label className="flex min-h-11 items-center gap-2 text-sm text-zinc-300">
                Autre
                <input type="color" value={validAccent(accent) ? accent : DEFAULT_ACCENT} onChange={(e) => setAccent(e.target.value)} className="h-11 w-14 cursor-pointer rounded-md bg-transparent" />
              </label>
            </div>
            {!accentOk && <p role="alert" className="mt-2 text-sm text-red-300">Trop sombre pour un fond noir, choisis une couleur plus claire.</p>}
          </fieldset>

          <div>
            <label htmlFor="tagline" className="text-sm font-semibold text-white">Titre</label>
            <input id="tagline" value={tagline} maxLength={TAGLINE_MAX} onChange={(e) => setTagline(e.target.value)} placeholder="Collectionneur, bâtisseur…" className="mt-3 min-h-11 w-full rounded-md border border-zinc-700 bg-black px-3 text-white outline-offset-2 placeholder:text-zinc-500 focus:border-white" />
          </div>

          <div>
            <label htmlFor="bio" className="text-sm font-semibold text-white">Bio</label>
            <textarea
              id="bio"
              value={bio}
              maxLength={BIO_MAX}
              rows={3}
              onChange={(e) => setBio(e.target.value)}
              className="mt-3 w-full rounded-md border border-zinc-700 bg-black p-3 text-white outline-offset-2 focus:border-white"
            />
            <p className="mt-1 text-right text-xs tabular-nums text-zinc-400">{bio.length}/{BIO_MAX}</p>
          </div>

          <fieldset>
            <legend className="text-sm font-semibold text-white">Liens</legend>
            <p className="mt-1 text-xs text-zinc-400">https vers Discord, Twitch, YouTube, TikTok, X, Instagram ou GitHub.</p>
            <ul className="mt-3 flex flex-col gap-2">
              {links.map((l, i) => (
                <li key={i} className="flex gap-2">
                  <input
                    aria-label={`Lien ${i + 1}`}
                    value={l}
                    inputMode="url"
                    placeholder="https://twitch.tv/…"
                    aria-invalid={!!l.trim() && !cleanLink(l)}
                    onChange={(e) => setLinks((ls) => ls.map((x, j) => (j === i ? e.target.value : x)))}
                    className="min-h-11 min-w-0 flex-1 rounded-md border border-zinc-700 bg-black px-3 text-white outline-offset-2 placeholder:text-zinc-500 focus:border-white aria-[invalid=true]:border-red-400"
                  />
                  <button type="button" aria-label={`Retirer le lien ${i + 1}`} onClick={() => setLinks((ls) => ls.filter((_, j) => j !== i))} className="min-h-11 min-w-11 text-zinc-400 hover:text-white">×</button>
                </li>
              ))}
            </ul>
            {!linksOk && <p role="alert" className="mt-2 text-sm text-red-300">Un lien n&apos;est pas accepté.</p>}
            {links.length < MAX_LINKS && (
              <button type="button" onClick={() => setLinks((ls) => [...ls, ""])} className="mt-2 min-h-11 text-sm text-zinc-300 hover:text-white">Ajouter un lien</button>
            )}
          </fieldset>

          <div>
            <p className="text-sm font-semibold text-white">Bannière</p>
            <p className="mt-1 text-xs text-zinc-400">PNG, JPEG ou WebP, 2 Mo maximum. Affichée en bandeau large.</p>
            <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            <div className="mt-3 flex flex-wrap gap-3">
              <button type="button" disabled={busy} onClick={() => file.current?.click()} className="btn-line disabled:opacity-40">
                {p.banner ? "Changer la bannière" : "Ajouter une bannière"}
              </button>
              {p.banner && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => (await call("/api/user/profile/banner", { method: "DELETE" })) && p.onSaved()}
                  className="min-h-11 px-3 text-sm text-zinc-400 hover:text-white"
                >
                  Retirer
                </button>
              )}
            </div>
          </div>
        </div>

        <fieldset>
          <legend className="text-sm font-semibold text-white">Sections affichées</legend>
          <ul className="mt-3 flex flex-col">
            {SECTIONS.map((s) => (
              <li key={s.key}>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 text-zinc-200">
                  <input type="checkbox" checked={!hidden.includes(s.key)} onChange={() => toggle(s.key)} className="h-5 w-5 accent-violet-500" />
                  {s.label}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      </div>

      {error && <p role="alert" className="mt-5 text-sm text-red-300">{error}</p>}
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" disabled={busy || !accentOk || !linksOk} onClick={save} className="btn-violet disabled:opacity-40">
          Enregistrer
        </button>
        <button type="button" onClick={p.onClose} className="min-h-11 px-3 text-sm text-zinc-400 hover:text-white">
          Fermer
        </button>
      </div>
    </div>
  );
}

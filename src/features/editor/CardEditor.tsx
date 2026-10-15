"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import CardDisplay, { CARD_EFFECTS } from "@/features/binder/components/CardDisplay";
import type { CustomBadge, Player, TradingCard } from "@/types/cards";
import { BOOSTER_PACKS } from "@/config/boosters";

const RARITIES = [
  { key: "COMMON", label: "Commune" },
  { key: "UNCOMMON", label: "Peu commune" },
  { key: "RARE", label: "Rare" },
  { key: "EPIC", label: "Épique" },
  { key: "LEGENDARY", label: "Légendaire" },
  { key: "MYTHIC", label: "Mythique" },
];
const EFFECTS = ["", ...CARD_EFFECTS];
const DISPLAY_TOGGLES: [string, string][] = [
  ["Masquer le bandeau de rareté", "hideRarityBox"],
  ["Masquer la description", "hideDescription"],
  ["Masquer la plaque du nom", "hideNameplate"],
  ["Masquer l'étiquette d'édition", "hideRole"],
  ["Masquer le titre", "hideTitle"],
  ["Masquer le texte du bas", "hideBottomText"],
  ["Guide vertical", "showVGuide"],
  ["Guide horizontal", "showHGuide"],
];
const EDITION_BADGE = { x: 85, y: 73, scale: 100 };

type Pos = { x: number; y: number; scale: number };

type Draft = {
  id?: string;
  title: string;
  playerId: string;
  rarity: string;
  level: string;
  edition: string;
  proba: number;
  description: string;
  imageUrl: string;
  layer1Url: string;
  layer2Url: string;
  layer3Url: string;
  customBackground: string;
  characterPosition: Pos;
  customBadges: CustomBadge[];
  attributes: Record<string, any>;
  isVariant: boolean;
};

const EMPTY: Draft = {
  title: "",
  playerId: "",
  rarity: "COMMON",
  level: "Normal",
  edition: "Standard",
  proba: 100,
  description: "",
  imageUrl: "",
  layer1Url: "",
  layer2Url: "",
  layer3Url: "",
  customBackground: "",
  characterPosition: { x: 50, y: 50, scale: 100 },
  customBadges: [],
  attributes: {},
  isVariant: false,
};

const parseJSON = <T,>(v: unknown, fallback: T): T => {
  if (v == null) return fallback;
  if (typeof v !== "string") return v as T;
  try {
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
};

const fromCard = (c: TradingCard): Draft => ({
  id: c.id,
  title: c.title ?? "",
  playerId: c.playerId ?? c.player?.id ?? "",
  rarity: c.rarity ?? "COMMON",
  level: c.level ?? "Normal",
  edition: c.edition ?? "Standard",
  proba: c.proba ?? 100,
  description: c.description ?? "",
  imageUrl: c.imageUrl ?? "",
  layer1Url: c.layer1Url ?? "",
  layer2Url: c.layer2Url ?? "",
  layer3Url: c.layer3Url ?? "",
  customBackground: c.customBackground ?? "",
  characterPosition: { ...EMPTY.characterPosition, ...parseJSON(c.characterPosition, {}) } as Pos,
  customBadges: parseJSON<CustomBadge[]>(c.customBadges, []),
  attributes: parseJSON<Record<string, any>>(c.attributes, {}),
  isVariant: !!c.isVariant,
});

const toPreview = (d: Draft, players: Player[]): TradingCard => ({
  id: d.id ?? "draft",
  title: d.title || players.find((p) => p.id === d.playerId)?.minecraftName || "Titre",
  playerId: d.playerId || null,
  player: players.find((p) => p.id === d.playerId) ?? null,
  description: d.description || null,
  imageUrl: d.imageUrl || null,
  layer1Url: d.layer1Url || null,
  layer2Url: d.layer2Url || null,
  layer3Url: d.layer3Url || null,
  customBackground: d.customBackground || null,
  customBadges: JSON.stringify(d.customBadges),
  characterPosition: JSON.stringify(d.characterPosition),
  rarity: d.rarity,
  level: d.level,
  edition: d.edition,
  attributes: JSON.stringify(d.attributes),
  isVariant: d.isVariant,
});

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const newId = () => Math.random().toString(36).slice(2, 10);

const inputCls =
  "min-h-11 w-full rounded-md border border-zinc-500 bg-black px-3 text-sm text-white placeholder:text-zinc-400 focus-visible:border-violet-400";

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-zinc-200">{label}</span>
      {children}
      {hint && <span className="text-xs text-zinc-400">{hint}</span>}
    </label>
  );
}

function Section({ title, children, open = false }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group border-b border-zinc-900">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-sm font-semibold text-white">
        {title}
        <span aria-hidden className="text-zinc-400 transition-transform duration-200 group-open:rotate-45">+</span>
      </summary>
      <div className="flex flex-col gap-4 pb-6">{children}</div>
    </details>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex justify-between text-xs text-zinc-300">
        {label}
        <span className="tabular-nums text-zinc-400">
          {Math.round(value)}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-11 w-full accent-violet-500"
      />
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm text-zinc-200">
      {label}
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 accent-violet-500" />
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value?: string; onChange: (v?: string) => void }) {
  const on = !!value;
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <label className="flex cursor-pointer items-center gap-3 text-sm text-zinc-200">
        <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked ? "#7c3aed" : undefined)} className="h-5 w-5 accent-violet-500" />
        {label}
      </label>
      <input
        type="color"
        aria-label={`${label} : couleur`}
        disabled={!on}
        value={value ?? "#7c3aed"}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-14 cursor-pointer rounded border border-zinc-500 bg-black disabled:opacity-30"
      />
    </div>
  );
}

function UrlField({
  label,
  value,
  onChange,
  playerName,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  playerName?: string;
  hint?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (playerName) fd.append("playerName", playerName);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error(res.status === 401 ? "Non autorisé." : "Envoi impossible.");
      const { url } = await res.json();
      onChange(url);
      toast.success("Image envoyée.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Envoi impossible.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Field label={label} hint={hint}>
      <div className="flex gap-2">
        <input type="url" value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://…" className={inputCls} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="press min-h-11 shrink-0 rounded-md border border-zinc-800 px-3 text-sm text-white hover:border-white disabled:opacity-50"
        >
          {busy ? "Envoi…" : "Fichier"}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label={`Retirer : ${label}`}
            className="press min-h-11 shrink-0 rounded-md border border-zinc-800 px-3 text-sm text-zinc-300 hover:border-white"
          >
            ×
          </button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/mp4,video/webm"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
    </Field>
  );
}

type DragState = { type: string; id: string; startX: number; startY: number; orig: { x: number; y: number } };

export default function CardEditor() {
  const [cards, setCards] = useState<TradingCard[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [editions, setEditions] = useState<string[]>([]);
  const [listState, setListState] = useState<"loading" | "error" | "ready">("loading");
  const [query, setQuery] = useState("");

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saved, setSaved] = useState<string>(JSON.stringify(EMPTY));
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [effect, setEffect] = useState("");
  const [newPlayer, setNewPlayer] = useState("");
  const [addingPlayer, setAddingPlayer] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);
  const drag = useRef<DragState | null>(null);

  const dirty = JSON.stringify(draft) !== saved;

  const load = useCallback(async () => {
    setListState("loading");
    try {
      const [c, p, e] = await Promise.all([
        fetch("/api/cards").then((r) => (r.ok ? r.json() : Promise.reject())),
        fetch("/api/players").then((r) => (r.ok ? r.json() : Promise.reject())),
        fetch("/api/editions").then((r) => (r.ok ? r.json() : [])).catch(() => []),
      ]);
      setCards(c);
      setPlayers(p);
      setEditions(Array.isArray(e) ? e.map((x: { name: string }) => x.name) : []);
      setListState("ready");
    } catch {
      setListState("error");
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    if (!dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [dirty]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const setAttr = (key: string, value: any) =>
    setDraft((d) => {
      const attributes = { ...d.attributes };
      if (value === undefined || value === "" || value === false) delete attributes[key];
      else attributes[key] = value;
      return { ...d, attributes };
    });

  const select = (next: Draft) => {
    if (dirty && !window.confirm("Les modifications en cours seront perdues. Continuer ?")) return;
    setDraft(next);
    setSaved(JSON.stringify(next));
    setConfirmDelete(false);
  };

  const currentPos = (type: string, id: string): { x: number; y: number } => {
    if (type === "character") return { x: draft.characterPosition.x, y: draft.characterPosition.y };
    if (type === "editionBadge") {
      const p = draft.attributes.editionBadgePos ?? EDITION_BADGE;
      return { x: p.x, y: p.y };
    }
    const b = draft.customBadges.find((b, i) => (b.id || String(i)) === id);
    return { x: b?.x ?? 50, y: b?.y ?? 50 };
  };

  const applyPos = (type: string, id: string, x: number, y: number) => {
    setDraft((d) => {
      if (type === "character") return { ...d, characterPosition: { ...d.characterPosition, x, y } };
      if (type === "editionBadge") {
        const prev = d.attributes.editionBadgePos ?? EDITION_BADGE;
        return { ...d, attributes: { ...d.attributes, editionBadgePos: { ...prev, x, y } } };
      }
      return {
        ...d,
        customBadges: d.customBadges.map((b, i) => ((b.id || String(i)) === id ? { ...b, x, y } : b)),
      };
    });
  };

  const applyWheel = (type: string, id: string, deltaY: number) => {
    const step = deltaY > 0 ? -5 : 5;
    setDraft((d) => {
      if (type === "character")
        return { ...d, characterPosition: { ...d.characterPosition, scale: clamp(d.characterPosition.scale + step, 20, 300) } };
      if (type === "editionBadge") {
        const prev = d.attributes.editionBadgePos ?? EDITION_BADGE;
        return { ...d, attributes: { ...d.attributes, editionBadgePos: { ...prev, scale: clamp(prev.scale + step, 20, 400) } } };
      }
      return {
        ...d,
        customBadges: d.customBadges.map((b, i) =>
          (b.id || String(i)) === id ? { ...b, size: clamp((b.size ?? 48) + step, 10, 300) } : b
        ),
      };
    });
  };

  const onUpdateElement = (type: string, id: string, data: any) => {
    if (data.action === "wheel") {
      applyWheel(type, id, data.deltaY);
      return;
    }
    if (data.action !== "drag_start") return;
    drag.current = { type, id, startX: data.clientX, startY: data.clientY, orig: currentPos(type, id) };

    const onMove = (e: MouseEvent) => {
      const s = drag.current;
      const rect = previewRef.current?.getBoundingClientRect();
      if (!s || !rect) return;
      let dx = ((e.clientX - s.startX) / rect.width) * 100;
      let dy = ((e.clientY - s.startY) / rect.height) * 100;
      if (s.type === "character") {
        dx /= 1.2;
        dy /= 0.85;
      }
      applyPos(s.type, s.id, clamp(s.orig.x + dx, -50, 150), clamp(s.orig.y + dy, -50, 150));
    };
    const onUp = () => {
      drag.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const save = async () => {
    if (!draft.playerId) {
      toast.error("Choisis un joueur avant d'enregistrer.");
      return;
    }
    setSaving(true);
    try {
      const player = players.find((p) => p.id === draft.playerId);
      const body = {
        ...draft,
        playerName: player?.minecraftName,
        title: draft.title || player?.minecraftName,
      };
      const res = await fetch("/api/cards", {
        method: draft.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(res.status === 401 ? "Non autorisé." : "Enregistrement impossible.");
      const card: TradingCard = await res.json();
      const next = fromCard({ ...card, player: player ?? null });
      setDraft(next);
      setSaved(JSON.stringify(next));
      toast.success(draft.id ? "Carte mise à jour." : "Carte créée.");
      setCards((list) => {
        const merged = { ...card, player: player ?? null };
        return draft.id ? list.map((c) => (c.id === card.id ? merged : c)) : [merged, ...list];
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!draft.id) return;
    try {
      const res = await fetch(`/api/cards?id=${encodeURIComponent(draft.id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setCards((list) => list.filter((c) => c.id !== draft.id));
      setDraft(EMPTY);
      setSaved(JSON.stringify(EMPTY));
      setConfirmDelete(false);
      toast.success("Carte supprimée.");
    } catch {
      toast.error("Suppression impossible.");
    }
  };

  const addPlayer = async () => {
    const name = newPlayer.trim();
    if (!name) return;
    setAddingPlayer(true);
    try {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minecraftName: name }),
      });
      if (!res.ok) throw new Error(await res.text());
      const p: Player = await res.json();
      setPlayers((list) => [p, ...list.filter((x) => x.id !== p.id)]);
      set("playerId", p.id);
      setNewPlayer("");
      toast.success(`Joueur ${p.minecraftName} ajouté.`);
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Ajout impossible.");
    } finally {
      setAddingPlayer(false);
    }
  };

  const preview = useMemo(() => toPreview(draft, players), [draft, players]);
  const playerName = players.find((p) => p.id === draft.playerId)?.minecraftName;
  const filtered = cards.filter((c) => {
    const q = query.trim().toLowerCase();
    return !q || c.title?.toLowerCase().includes(q) || c.edition?.toLowerCase().includes(q);
  });
  const editionOptions = Array.from(new Set([...Object.values(BOOSTER_PACKS).map((p) => p.name), ...editions]));
  const ebPos = draft.attributes.editionBadgePos ?? EDITION_BADGE;
  const a = draft.attributes;

  return (
    <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-8 px-5 py-10 md:px-10 lg:grid-cols-[260px_minmax(0,1fr)_400px]">
      <aside className="flex flex-col gap-4 lg:max-h-[calc(100svh-8rem)] lg:sticky lg:top-24">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-[-0.03em] text-white">Cartes</h1>
          <button type="button" onClick={() => select(EMPTY)} className="btn-violet min-h-11 px-4">
            Nouvelle
          </button>
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Chercher un titre, une édition"
          aria-label="Chercher une carte"
          className={inputCls}
        />
        <div className="max-h-[40vh] overflow-y-auto lg:max-h-none lg:flex-1" data-lenis-prevent>
          {listState === "loading" && (
            <ul aria-label="Chargement" className="flex flex-col gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <li key={i} className="h-12 animate-pulse rounded-md bg-zinc-900" />
              ))}
            </ul>
          )}
          {listState === "error" && (
            <div role="alert" className="flex flex-col items-start gap-3 text-sm text-zinc-300">
              Impossible de charger les cartes.
              <button type="button" onClick={load} className="btn-line min-h-11">
                Réessayer
              </button>
            </div>
          )}
          {listState === "ready" && filtered.length === 0 && (
            <p className="text-sm text-zinc-400">
              {cards.length === 0 ? "Aucune carte pour l'instant. Crée la première." : "Aucun résultat."}
            </p>
          )}
          {listState === "ready" && filtered.length > 0 && (
            <ul className="flex flex-col gap-1">
              {filtered.map((c) => {
                const active = c.id === draft.id;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => select(fromCard(c))}
                      aria-current={active ? "true" : undefined}
                      className={`press flex min-h-12 w-full items-center justify-between gap-3 rounded-md px-3 text-left ${
                        active ? "bg-zinc-900 text-white ring-1 ring-zinc-700" : "text-zinc-300 hover:bg-zinc-950"
                      }`}
                    >
                      <span className="truncate text-sm font-medium">{c.title}</span>
                      <span className="shrink-0 text-xs text-zinc-400">
                        {RARITIES.find((r) => r.key === c.rarity)?.label ?? c.rarity}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      <section aria-label="Aperçu" className="flex flex-col items-center gap-6 lg:sticky lg:top-24 lg:self-start">
        <div className="flex w-full items-center justify-between gap-4">
          <p className="text-sm text-zinc-400" aria-live="polite">
            {draft.id ? "Modification" : "Nouvelle carte"}
            {dirty && <span className="text-violet-400"> · non enregistrée</span>}
          </p>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            Effet
            <select value={effect} onChange={(e) => setEffect(e.target.value)} className={`${inputCls} w-auto`}>
              {EFFECTS.map((fx) => (
                <option key={fx} value={fx}>
                  {fx || "Aucun"}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div ref={previewRef} className="w-full max-w-[22rem] select-none">
          <CardDisplay card={preview} size="md" isEditing specialEffect={effect || null} onUpdateElement={onUpdateElement} />
        </div>
        <p className="max-w-sm text-center text-xs text-zinc-400">
          Glisse le personnage ou les badges pour les placer, molette pour la taille. Les curseurs à droite font la même chose au clavier.
          L&apos;effet ne sert qu&apos;à l&apos;aperçu : il est tiré à l&apos;ouverture.
        </p>

        <div className="flex w-full max-w-[22rem] flex-col gap-3">
          <button type="button" onClick={save} disabled={saving || !dirty} className="btn-violet w-full disabled:opacity-50">
            {saving ? "Enregistrement…" : draft.id ? "Enregistrer les modifications" : "Créer la carte"}
          </button>
          {draft.id &&
            (confirmDelete ? (
              <div className="flex gap-3">
                <button type="button" onClick={remove} className="press min-h-12 flex-1 rounded-md bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700">
                  Confirmer la suppression
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="btn-line flex-1">
                  Annuler
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} className="btn-line w-full text-red-300">
                Supprimer la carte
              </button>
            ))}
        </div>
      </section>

      <section aria-label="Propriétés" className="flex flex-col">
        <Section title="Identité" open>
          <Field label="Joueur" hint="Obligatoire. Le skin vient de son pseudo si aucune image n'est fournie.">
            <select value={draft.playerId} onChange={(e) => set("playerId", e.target.value)} className={inputCls}>
              <option value="">Choisir un joueur</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.minecraftName}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex gap-2">
            <input
              value={newPlayer}
              onChange={(e) => setNewPlayer(e.target.value)}
              placeholder="Ajouter un pseudo Minecraft"
              aria-label="Pseudo Minecraft à ajouter"
              className={inputCls}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPlayer())}
            />
            <button type="button" onClick={addPlayer} disabled={addingPlayer || !newPlayer.trim()} className="btn-line min-h-11 shrink-0 px-4 disabled:opacity-50">
              {addingPlayer ? "Ajout…" : "Ajouter"}
            </button>
          </div>
          <Field label="Titre" hint="Vide : le pseudo du joueur.">
            <input value={draft.title} onChange={(e) => set("title", e.target.value)} placeholder={playerName ?? ""} className={inputCls} />
          </Field>
          <Field label="Rareté">
            <select value={draft.rarity} onChange={(e) => set("rarity", e.target.value)} className={inputCls}>
              {RARITIES.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Édition">
            <input list="editions" value={draft.edition} onChange={(e) => set("edition", e.target.value)} className={inputCls} />
            <datalist id="editions">
              {editionOptions.map((e) => (
                <option key={e} value={e} />
              ))}
            </datalist>
          </Field>
          <Field label="Description">
            <textarea
              value={draft.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              className={`${inputCls} py-2`}
            />
          </Field>
          <Field label="Texte du bas" hint="Par défaut : PARANOIA STUDIO.">
            <input value={a.faction ?? ""} onChange={(e) => setAttr("faction", e.target.value)} className={inputCls} />
          </Field>
        </Section>

        <Section title="Personnage">
          <UrlField label="Image ou vidéo" value={draft.imageUrl} onChange={(v) => set("imageUrl", v)} playerName={playerName} hint="Vide : buste du skin Minecraft." />
          <UrlField label="Calque arrière" value={draft.layer1Url} onChange={(v) => set("layer1Url", v)} playerName={playerName} />
          <UrlField label="Calque milieu" value={draft.layer2Url} onChange={(v) => set("layer2Url", v)} playerName={playerName} />
          <UrlField label="Calque avant" value={draft.layer3Url} onChange={(v) => set("layer3Url", v)} playerName={playerName} />
          <Slider label="Position horizontale" value={draft.characterPosition.x} min={-50} max={150} unit="%" onChange={(x) => set("characterPosition", { ...draft.characterPosition, x })} />
          <Slider label="Position verticale" value={draft.characterPosition.y} min={-50} max={150} unit="%" onChange={(y) => set("characterPosition", { ...draft.characterPosition, y })} />
          <Slider label="Taille" value={draft.characterPosition.scale} min={20} max={300} unit="%" onChange={(scale) => set("characterPosition", { ...draft.characterPosition, scale })} />
          <Toggle label="Masquer le personnage" checked={!!a.hideCharacter} onChange={(v) => setAttr("hideCharacter", v)} />
        </Section>

        <Section title="Fond et couleurs">
          <UrlField label="Fond (image ou vidéo)" value={draft.customBackground} onChange={(v) => set("customBackground", v)} playerName={playerName} hint="Vide : fond de la rareté." />
          {draft.customBackground && (
            <>
              <Slider label="Zoom du fond" value={a.bgScale ?? 100} min={50} max={300} unit="%" onChange={(v) => setAttr("bgScale", v)} />
              <Slider label="Fond horizontal" value={a.bgPosX ?? 50} min={0} max={100} unit="%" onChange={(v) => setAttr("bgPosX", v)} />
              <Slider label="Fond vertical" value={a.bgPosY ?? 50} min={0} max={100} unit="%" onChange={(v) => setAttr("bgPosY", v)} />
            </>
          )}
          <ColorField label="Fond uni" value={a.cardBgColor} onChange={(v) => setAttr("cardBgColor", v)} />
          <ColorField label="Bordure" value={a.borderColor} onChange={(v) => setAttr("borderColor", v)} />
          <ColorField label="Plaque du nom" value={a.factionColor} onChange={(v) => setAttr("factionColor", v)} />
          <ColorField label="Aura" value={a.cardGlowColor} onChange={(v) => setAttr("cardGlowColor", v)} />
          <Toggle label="Reflet holographique" checked={!!a.isHolo} onChange={(v) => setAttr("isHolo", v)} />
          <Field label="Effet permanent" hint="Toujours visible sur cette carte, en plus de l'effet tiré à l'ouverture d'un booster.">
            <select value={a.cardEffect ?? ""} onChange={(e) => setAttr("cardEffect", e.target.value)} className={inputCls}>
              {EFFECTS.map((fx) => (
                <option key={fx} value={fx}>
                  {fx || "Aucun"}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Carte saisonnière" hint="Ajoute un décor derrière le personnage, visible en permanence.">
            <select value={a.season ?? ""} onChange={(e) => setAttr("season", e.target.value)} className={inputCls}>
              <option value="">Aucune</option>
              <option value="halloween">Halloween (citrouilles, lune, toile)</option>
              <option value="noel">Noël (sapins, boules, neige)</option>
              <option value="paques">Pâques (pelouse, œufs, fleurs)</option>
              <option value="valentin">Saint-Valentin (cœurs)</option>
              <option value="nouvelan">Nouvel An (ballons, étoiles)</option>
            </select>
          </Field>
          <Toggle label="Pleine illustration (bordure épaisse)" checked={!!a.isFullArt} onChange={(v) => setAttr("isFullArt", v)} />
          <UrlField label="Cadre (image par-dessus)" value={a.frameUrl ?? ""} onChange={(v) => setAttr("frameUrl", v)} />
        </Section>

        <Section title="Badges">
          <UrlField label="Badge d'édition" value={a.editionBadgeUrl ?? ""} onChange={(v) => setAttr("editionBadgeUrl", v)} />
          {a.editionBadgeUrl && (
            <>
              <Slider label="Badge d'édition : horizontal" value={ebPos.x} min={0} max={100} unit="%" onChange={(x) => setAttr("editionBadgePos", { ...ebPos, x })} />
              <Slider label="Badge d'édition : vertical" value={ebPos.y} min={0} max={100} unit="%" onChange={(y) => setAttr("editionBadgePos", { ...ebPos, y })} />
              <Slider label="Badge d'édition : taille" value={ebPos.scale} min={20} max={400} unit="%" onChange={(scale) => setAttr("editionBadgePos", { ...ebPos, scale })} />
            </>
          )}
          <UrlField label="Badge de variante (coin haut gauche)" value={a.variantBadgeUrl ?? ""} onChange={(v) => setAttr("variantBadgeUrl", v)} />

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-200">Badges libres</span>
              <button
                type="button"
                onClick={() => set("customBadges", [...draft.customBadges, { id: newId(), url: "", x: 50, y: 50, size: 48 }])}
                className="btn-line min-h-11 px-4"
              >
                Ajouter
              </button>
            </div>
            {draft.customBadges.length === 0 && <p className="text-xs text-zinc-400">Aucun badge libre.</p>}
            {draft.customBadges.map((b, i) => {
              const update = (patch: Partial<CustomBadge>) =>
                set("customBadges", draft.customBadges.map((x, j) => (j === i ? { ...x, ...patch } : x)));
              return (
                <div key={b.id ?? i} className="flex flex-col gap-3 rounded-md border border-zinc-900 p-3">
                  <UrlField label={`Badge ${i + 1}`} value={b.url ?? ""} onChange={(url) => update({ url })} />
                  <Slider label="Horizontal" value={b.x ?? 50} min={0} max={100} unit="%" onChange={(x) => update({ x })} />
                  <Slider label="Vertical" value={b.y ?? 50} min={0} max={100} unit="%" onChange={(y) => update({ y })} />
                  <Slider label="Taille" value={b.size ?? 48} min={10} max={300} unit="px" onChange={(size) => update({ size })} />
                  <button
                    type="button"
                    onClick={() => set("customBadges", draft.customBadges.filter((_, j) => j !== i))}
                    className="min-h-11 self-start text-sm text-red-300 underline-offset-4 hover:underline"
                  >
                    Retirer ce badge
                  </button>
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="Affichage">
          {DISPLAY_TOGGLES.map(([label, key]) => (
            <Toggle key={key} label={label} checked={!!a[key]} onChange={(v) => setAttr(key, v)} />
          ))}
          <Toggle label="Carte variante" checked={draft.isVariant} onChange={(v) => set("isVariant", v)} />
        </Section>
      </section>
    </div>
  );
}

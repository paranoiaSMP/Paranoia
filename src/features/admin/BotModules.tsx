"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { send } from "./useResource";
import { inputCls } from "./ui";
import EmbedEditor, { type EmbedData } from "./EmbedEditor";

export type Setting = {
  key: string;
  label: string;
  kind: "text" | "textarea" | "channel" | "role" | "roles" | "color" | "url" | "embed" | "number" | "choice";
  help?: string;
  default?: string;
  options?: [string, string][];
};
export type BotModule = {
  id: string;
  name: string;
  description: string;
  category: string;
  commands: string[];
  settings: Setting[];
  enabled: boolean;
  config: Record<string, unknown>;
  declaredAt: string;
};

const snowflake = /^\d{17,20}$/;

function initialEmbed(mod: BotModule, s: Setting): EmbedData {
  const saved = mod.config?.[s.key];
  if (saved && typeof saved === "object") return saved as EmbedData;
  const c = mod.config ?? {};
  if (typeof c.title === "string" || typeof c.description === "string") {
    return { title: c.title as string, description: c.description as string, color: c.color as string, image: c.image as string };
  }
  try {
    return s.default ? (JSON.parse(s.default) as EmbedData) : {};
  } catch {
    return {};
  }
}

function valid(s: Setting, v: string) {
  if (!v || s.kind === "embed" || s.kind === "choice") return true;
  if (s.kind === "number") return /^\d{1,6}$/.test(v);
  if (s.kind === "channel" || s.kind === "role") return snowflake.test(v);
  if (s.kind === "roles") { const ids = v.split(/[\s,]+/).filter(Boolean); return ids.length <= 25 && ids.every((id) => snowflake.test(id)); }
  if (s.kind === "color") return /^#[0-9a-fA-F]{6}$/.test(v);
  if (s.kind === "url") return /^https:\/\/\S+$/.test(v);
  return true;
}

export function SettingsForm({ mod, onSaved }: { mod: BotModule; onSaved: (m: BotModule) => void }) {
  const [form, setForm] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(
      mod.settings.map((s) => [s.key, s.kind === "embed" ? initialEmbed(mod, s) : typeof mod.config?.[s.key] === "string" ? mod.config[s.key] : ""])
    )
  );
  const [busy, setBusy] = useState(false);
  const text = (k: string) => (typeof form[k] === "string" ? (form[k] as string) : "");
  const invalid = mod.settings.filter((s) => !valid(s, text(s.key).trim()));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      onSaved(await send("/api/admin/bot/modules", "PUT", { id: mod.id, config: form }));
      toast.success(`Réglages de « ${mod.name} » enregistrés.`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="grid grid-cols-1 gap-4 border-t border-zinc-900 bg-[#0b0b0d] p-4 md:grid-cols-2">
      {mod.settings.map((s) => {
        if (s.kind === "embed") {
          return (
            <div key={s.key} className="flex flex-col gap-3 md:col-span-2">
              <p className="text-sm font-semibold text-white">{s.label}</p>
              <EmbedEditor value={form[s.key] as EmbedData} onChange={(v) => setForm((f) => ({ ...f, [s.key]: v }))} help={s.help} />
            </div>
          );
        }
        const v = text(s.key);
        const bad = !valid(s, v.trim());
        const set = (val: string) => setForm((f) => ({ ...f, [s.key]: val }));
        const id = `${mod.id}-${s.key}`;
        const wide = s.kind === "textarea" || s.kind === "url" || s.kind === "roles";
        return (
          <div key={s.key} className={`flex flex-col gap-1.5 ${wide ? "md:col-span-2" : ""}`}>
            <label htmlFor={id} className="text-sm text-zinc-300">
              {s.label}
            </label>
            {s.kind === "choice" ? (
              <select id={id} value={v || s.default || ""} onChange={(e) => set(e.target.value)} className={inputCls}>
                {(s.options ?? []).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            ) : s.kind === "number" ? (
              <input id={id} type="number" min={0} max={999999} value={v} onChange={(e) => set(e.target.value)} placeholder={s.default} aria-invalid={bad} className={`${inputCls} w-40 tabular-nums ${bad ? "border-red-500" : ""}`} />
            ) : s.kind === "roles" ? (
              <textarea id={id} value={v} onChange={(e) => set(e.target.value)} rows={2} placeholder="Identifiants de rôles, séparés par une virgule" aria-invalid={bad} className={`${inputCls} py-2 font-mono ${bad ? "border-red-500" : ""}`} />
            ) : s.kind === "textarea" ? (
              <textarea id={id} value={v} onChange={(e) => set(e.target.value)} rows={3} placeholder={s.default} className={`${inputCls} py-2`} />
            ) : s.kind === "color" ? (
              <input id={id} type="color" value={v || s.default || "#7c3aed"} onChange={(e) => set(e.target.value)} className="h-11 w-20 cursor-pointer rounded-md border border-zinc-500 bg-black" />
            ) : (
              <input
                id={id}
                type={s.kind === "url" ? "url" : "text"}
                inputMode={s.kind === "channel" || s.kind === "role" ? "numeric" : undefined}
                value={v}
                onChange={(e) => set(e.target.value)}
                placeholder={s.kind === "channel" || s.kind === "role" ? "Identifiant Discord" : s.default}
                aria-invalid={bad}
                className={`${inputCls} ${s.kind === "channel" || s.kind === "role" ? "font-mono" : ""} ${bad ? "border-red-500" : ""}`}
              />
            )}
            {(s.help || bad) && (
              <span className={`text-xs ${bad ? "text-red-400" : "text-zinc-400"}`}>
                {bad
                  ? s.kind === "color"
                    ? "Couleur au format #rrggbb."
                    : s.kind === "url"
                    ? "Lien en https://."
                    : s.kind === "number"
                    ? "Nombre entier positif."
                    : s.kind === "roles"
                    ? "Identifiants de rôles (17 à 20 chiffres), séparés par une virgule."
                    : "Identifiant Discord (17 à 20 chiffres)."
                  : s.help}
              </span>
            )}
          </div>
        );
      })}
      <div className="md:col-span-2">
        <button type="submit" disabled={busy || invalid.length > 0} className="btn-violet disabled:opacity-50">
          {busy ? "Enregistrement…" : "Enregistrer les réglages"}
        </button>
      </div>
    </form>
  );
}

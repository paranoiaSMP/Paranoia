"use client";

import { inputCls } from "./ui";

export type EmbedField = { name: string; value: string; inline: boolean };
export type EmbedData = {
  content?: string;
  title?: string;
  url?: string;
  description?: string;
  color?: string;
  author?: { name?: string; icon?: string };
  thumbnail?: string;
  image?: string;
  footer?: { text?: string; icon?: string };
  fields?: EmbedField[];
  timestamp?: boolean;
};

const SAMPLE: Record<string, string> = {
  user: "@NouveauMembre",
  username: "NouveauMembre",
  avatar: "https://cdn.discordapp.com/embed/avatars/2.png",
  server: "Paranoia Studio",
  memberCount: "1 234",
};
const fill = (s?: string) => (s ?? "").replace(/\{(\w+)\}/g, (m, k) => SAMPLE[k] ?? m);

function Markdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|`[^`]+`|@\w+)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") ? (
          <strong key={i}>{p.slice(2, -2)}</strong>
        ) : p.startsWith("__") ? (
          <u key={i}>{p.slice(2, -2)}</u>
        ) : p.startsWith("*") && p.length > 2 ? (
          <em key={i}>{p.slice(1, -1)}</em>
        ) : p.startsWith("`") ? (
          <code key={i} className="rounded bg-[#1e1f22] px-1 text-[0.85em]">{p.slice(1, -1)}</code>
        ) : p.startsWith("@") ? (
          <span key={i} className="rounded bg-[#5865f2]/30 px-0.5 text-[#c9cdfb]">{p}</span>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

const safeImg = (u?: string) => {
  const v = fill(u);
  return /^https:\/\//.test(v) ? v : undefined;
};

function Preview({ e }: { e: EmbedData }) {
  const fields = (e.fields ?? []).filter((f) => f.name || f.value);
  const hasEmbed = e.title || e.description || e.author?.name || e.thumbnail || e.image || fields.length || e.footer?.text;
  const thumb = safeImg(e.thumbnail);
  const image = safeImg(e.image);
  return (
    <div className="rounded-md bg-[#313338] p-4 font-sans text-[15px] leading-snug text-[#dbdee1]">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white" aria-hidden>
          PS
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px]">
            <span className="font-medium text-white">Paranoia Bot</span>{" "}
            <span className="rounded bg-[#5865f2] px-1 py-px text-[10px] font-semibold uppercase text-white">App</span>{" "}
            <span className="text-xs text-[#949ba4]">Aujourd&apos;hui</span>
          </p>
          {e.content && (
            <p className="mt-1 whitespace-pre-wrap">
              <Markdown text={fill(e.content)} />
            </p>
          )}
          {hasEmbed ? (
            <div className="mt-2 max-w-[520px] rounded border-l-4 bg-[#2b2d31] p-4" style={{ borderColor: e.color || "#7c3aed" }}>
              <div className="flex gap-4">
                <div className="min-w-0 flex-1">
                  {e.author?.name && (
                    <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                      {safeImg(e.author.icon) && <img src={safeImg(e.author.icon)} alt="" className="h-6 w-6 rounded-full" />}
                      {fill(e.author.name)}
                    </p>
                  )}
                  {e.title && (
                    <p className={`font-semibold ${e.url ? "text-[#00a8fc]" : "text-white"}`}>
                      <Markdown text={fill(e.title)} />
                    </p>
                  )}
                  {e.description && (
                    <p className="mt-2 whitespace-pre-wrap text-sm">
                      <Markdown text={fill(e.description)} />
                    </p>
                  )}
                  {fields.length > 0 && (
                    <div className="mt-2 grid grid-cols-3 gap-x-4 gap-y-2">
                      {fields.map((f, i) => (
                        <div key={i} className={f.inline ? "col-span-1" : "col-span-3"}>
                          <p className="text-sm font-semibold text-white">{fill(f.name)}</p>
                          <p className="whitespace-pre-wrap text-sm">
                            <Markdown text={fill(f.value)} />
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {thumb && <img src={thumb} alt="" className="h-20 w-20 shrink-0 rounded object-cover" />}
              </div>
              {image && <img src={image} alt="" className="mt-4 max-h-72 w-full rounded object-cover" />}
              {(e.footer?.text || e.timestamp) && (
                <p className="mt-2 flex items-center gap-2 text-xs text-[#b5bac1]">
                  {safeImg(e.footer?.icon) && <img src={safeImg(e.footer?.icon)} alt="" className="h-5 w-5 rounded-full" />}
                  {fill(e.footer?.text)}
                  {e.footer?.text && e.timestamp && " • "}
                  {e.timestamp && "Aujourd'hui à 18:42"}
                </p>
              )}
            </div>
          ) : (
            !e.content && <p className="mt-1 text-sm italic text-[#949ba4]">Message vide : remplis au moins un champ.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, max, placeholder, area }: { label: string; value?: string; onChange: (v: string) => void; max: number; placeholder?: string; area?: boolean }) {
  const n = value?.length ?? 0;
  return (
    <label className="flex flex-col gap-1.5 text-sm text-zinc-300">
      <span className="flex justify-between">
        {label}
        <span className={`tabular-nums text-xs ${n > max ? "text-red-400" : "text-zinc-400"}`}>
          {n} / {max}
        </span>
      </span>
      {area ? (
        <textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} rows={4} placeholder={placeholder} className={`${inputCls} py-2`} />
      ) : (
        <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
      )}
    </label>
  );
}

export default function EmbedEditor({ value, onChange, help }: { value: EmbedData; onChange: (v: EmbedData) => void; help?: string }) {
  const set = <K extends keyof EmbedData>(k: K, v: EmbedData[K]) => onChange({ ...value, [k]: v });
  const fields = value.fields ?? [];
  const setField = (i: number, patch: Partial<EmbedField>) => set("fields", fields.map((f, j) => (j === i ? { ...f, ...patch } : f)));

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <div className="flex flex-col gap-4">
        {help && <p className="rounded-md border border-zinc-800 p-3 text-xs leading-relaxed text-zinc-300">Variables : {help}</p>}
        <Input label="Texte au-dessus de l'embed" value={value.content} onChange={(v) => set("content", v)} max={2000} placeholder="Ex. : {user} vient d'arriver !" area />
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
          <Input label="Titre" value={value.title} onChange={(v) => set("title", v)} max={256} />
          <label className="flex flex-col gap-1.5 text-sm text-zinc-300">
            Couleur
            <input type="color" value={value.color || "#7c3aed"} onChange={(e) => set("color", e.target.value)} className="h-11 w-16 cursor-pointer rounded-md border border-zinc-500 bg-black" />
          </label>
        </div>
        <Input label="Lien du titre (https)" value={value.url} onChange={(v) => set("url", v)} max={500} />
        <Input label="Description" value={value.description} onChange={(v) => set("description", v)} max={4096} area placeholder="**gras**, *italique*, __souligné__, `code`" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Auteur" value={value.author?.name} onChange={(v) => set("author", { ...value.author, name: v })} max={256} />
          <Input label="Icône de l'auteur (https ou {avatar})" value={value.author?.icon} onChange={(v) => set("author", { ...value.author, icon: v })} max={500} />
          <Input label="Vignette (https ou {avatar})" value={value.thumbnail} onChange={(v) => set("thumbnail", v)} max={500} />
          <Input label="Grande image (https)" value={value.image} onChange={(v) => set("image", v)} max={500} />
          <Input label="Pied de page" value={value.footer?.text} onChange={(v) => set("footer", { ...value.footer, text: v })} max={2048} />
          <Input label="Icône du pied de page" value={value.footer?.icon} onChange={(v) => set("footer", { ...value.footer, icon: v })} max={500} />
        </div>
        <label className="flex min-h-11 items-center gap-3 text-sm text-zinc-200">
          <input type="checkbox" checked={!!value.timestamp} onChange={(e) => set("timestamp", e.target.checked)} className="h-5 w-5 accent-violet-500" />
          Afficher la date d&apos;envoi
        </label>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-200">Champs ({fields.length} / 25)</span>
            <button
              type="button"
              disabled={fields.length >= 25}
              onClick={() => set("fields", [...fields, { name: "", value: "", inline: false }])}
              className="btn-line min-h-11 px-3 disabled:opacity-40"
            >
              Ajouter un champ
            </button>
          </div>
          {fields.map((f, i) => (
            <div key={i} className="flex flex-col gap-3 rounded-md border border-zinc-900 p-3">
              <Input label={`Champ ${i + 1} : nom`} value={f.name} onChange={(v) => setField(i, { name: v })} max={256} />
              <Input label="Valeur" value={f.value} onChange={(v) => setField(i, { value: v })} max={1024} area />
              <div className="flex items-center justify-between">
                <label className="flex min-h-11 items-center gap-3 text-sm text-zinc-200">
                  <input type="checkbox" checked={f.inline} onChange={(e) => setField(i, { inline: e.target.checked })} className="h-5 w-5 accent-violet-500" />
                  Sur la même ligne
                </label>
                <button type="button" onClick={() => set("fields", fields.filter((_, j) => j !== i))} className="min-h-11 text-sm text-red-300 underline-offset-4 hover:underline">
                  Retirer
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="xl:sticky xl:top-24 xl:self-start">
        <p className="mb-2 text-sm text-zinc-400">Aperçu (variables remplacées par des exemples)</p>
        <Preview e={value} />
      </div>
    </div>
  );
}

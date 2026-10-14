import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/roles";

type Setting = {
  key: string;
  label: string;
  kind: "text" | "textarea" | "channel" | "role" | "roles" | "color" | "url" | "embed" | "number" | "choice";
  options?: [string, string][];
};

const LIMITS = { content: 2000, title: 256, description: 4096, author: 256, footer: 2048, fieldName: 256, fieldValue: 1024, fields: 25, total: 6000 };

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : undefined);
const img = (v: unknown) => {
  const s = typeof v === "string" ? v.trim() : "";
  return /^https:\/\/\S+$/.test(s) || /^\{[a-zA-Z]+\}$/.test(s) ? s.slice(0, 500) : undefined;
};

function cleanEmbed(raw: unknown): { embed?: Record<string, unknown>; error?: string } {
  if (!raw || typeof raw !== "object") return { error: "Embed invalide." };
  const e = raw as Record<string, unknown>;
  const author = (e.author ?? {}) as Record<string, unknown>;
  const footer = (e.footer ?? {}) as Record<string, unknown>;
  const fields = Array.isArray(e.fields) ? e.fields.slice(0, LIMITS.fields) : [];
  const out = {
    content: str(e.content, LIMITS.content),
    title: str(e.title, LIMITS.title),
    url: typeof e.url === "string" && /^https:\/\/\S+$/.test(e.url) ? e.url.slice(0, 500) : undefined,
    description: str(e.description, LIMITS.description),
    color: typeof e.color === "string" && /^#[0-9a-fA-F]{6}$/.test(e.color) ? e.color : undefined,
    author: { name: str(author.name, LIMITS.author), icon: img(author.icon) },
    thumbnail: img(e.thumbnail),
    image: img(e.image),
    footer: { text: str(footer.text, LIMITS.footer), icon: img(footer.icon) },
    fields: fields.map((f) => {
      const x = (f ?? {}) as Record<string, unknown>;
      return { name: str(x.name, LIMITS.fieldName) ?? "", value: str(x.value, LIMITS.fieldValue) ?? "", inline: x.inline === true };
    }),
    timestamp: e.timestamp === true,
  };
  const total = [out.title, out.description, out.author.name, out.footer.text, ...out.fields.flatMap((f) => [f.name, f.value])].join("").length;
  if (total > LIMITS.total) return { error: `Embed trop long : ${total} caractères sur ${LIMITS.total} autorisés par Discord.` };
  return { embed: out };
}

const NOTIFY_CHANNEL = "bot_modules";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return isAdmin(session?.user?.role);
}

export async function GET() {
  if (!(await requireAdmin())) return new NextResponse("Unauthorized", { status: 401 });
  try {
    const modules = await prisma.botModule.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
    return NextResponse.json(modules);
  } catch (error) {
    console.error("GET bot modules:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

function validate(settings: Setting[], input: Record<string, unknown>): { config?: Record<string, unknown>; error?: string } {
  const config: Record<string, unknown> = {};
  for (const s of settings) {
    const raw = input[s.key];
    if (raw === undefined || raw === null || raw === "") continue;
    if (s.kind === "embed") {
      const { embed, error } = cleanEmbed(raw);
      if (error) return { error: `${s.label} : ${error}` };
      config[s.key] = embed;
      continue;
    }
    if (typeof raw !== "string") return { error: `${s.label} : valeur invalide.` };
    const v = raw.trim();
    if (s.kind === "roles") {
      const ids = v.split(/[\s,]+/).filter(Boolean);
      if (ids.length > 25 || !ids.every((id) => /^\d{17,20}$/.test(id))) return { error: `${s.label} : identifiants de rôles (17 à 20 chiffres), 25 au maximum.` };
      config[s.key] = [...new Set(ids)].join(",");
      continue;
    }
    const ok =
      s.kind === "number"
        ? /^\d{1,6}$/.test(v)
        : s.kind === "choice"
        ? (s.options ?? []).some(([value]) => value === v)
        : s.kind === "channel" || s.kind === "role"
        ? /^\d{17,20}$/.test(v)
        : s.kind === "color"
        ? /^#[0-9a-fA-F]{6}$/.test(v)
        : s.kind === "url"
        ? /^https:\/\/\S+$/.test(v) && v.length <= 500
        : v.length <= (s.kind === "textarea" ? 8000 : 200);
    if (!ok) return { error: `${s.label} : format invalide.` };
    config[s.key] = v;
  }
  return { config };
}

export async function PUT(req: Request) {
  if (!(await requireAdmin())) return new NextResponse("Unauthorized", { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    const id = typeof body.id === "string" ? body.id : "";
    const current = id ? await prisma.botModule.findUnique({ where: { id } }) : null;
    if (!current) return NextResponse.json({ error: "Module introuvable" }, { status: 404 });

    const data: Prisma.BotModuleUpdateInput = {};
    if (typeof body.enabled === "boolean") data.enabled = body.enabled;
    if (body.config && typeof body.config === "object") {
      const settings = (Array.isArray(current.settings) ? current.settings : []) as unknown as Setting[];
      const { config, error } = validate(settings, body.config as Record<string, unknown>);
      if (error) return NextResponse.json({ error }, { status: 400 });
      data.config = config as Prisma.InputJsonObject;
    }
    if (Object.keys(data).length === 0) return NextResponse.json({ error: "Rien à modifier" }, { status: 400 });

    const updated = await prisma.botModule.update({ where: { id }, data });
    await prisma.$executeRaw`SELECT pg_notify(${NOTIFY_CHANNEL}, ${id})`;
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT bot modules:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

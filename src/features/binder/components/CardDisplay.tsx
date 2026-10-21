"use client";

import React, { createContext, useContext, useMemo, useRef, useState } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { TradingCard, CardVariantLink, CustomBadge } from "@/types/cards";
import { getPlayerSkinUrl } from "@/lib/skin";

export type RarityKey = "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY" | "MYTHIC";

export const rarityKey = (rarity: string): RarityKey => {
  const r = rarity
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase();
  if (r === "MYTHIC" || r === "MYTHIQUE") return "MYTHIC";
  if (r === "LEGENDARY" || r === "LEGENDAIRE") return "LEGENDARY";
  if (r === "EPIC" || r === "EPIQUE") return "EPIC";
  if (r === "RARE") return "RARE";
  if (r === "UNCOMMON" || r === "PEU COMMUNE") return "UNCOMMON";
  return "COMMON";
};

const RARITY: Record<
  RarityKey,
  { label: string; aura: string; breathe: boolean; box: string; boxText: string; bg: React.CSSProperties }
> = {
  COMMON: {
    label: "Commune",
    aura: "#9ca3af",
    breathe: false,
    box: "bg-gray-500",
    boxText: "text-white",
    bg: { backgroundImage: "linear-gradient(135deg, #6b7280 0%, #374151 40%, #9ca3af 50%, #1f2937 60%, #111827 100%)" },
  },
  UNCOMMON: {
    label: "Peu commune",
    aura: "#22c55e",
    breathe: false,
    box: "bg-green-600",
    boxText: "text-white",
    bg: { backgroundImage: "linear-gradient(135deg, #22c55e 0%, #166534 40%, #86efac 50%, #14532d 60%, #052e16 100%)" },
  },
  RARE: {
    label: "Rare",
    aura: "#3b82f6",
    breathe: false,
    box: "bg-blue-600",
    boxText: "text-white",
    bg: { backgroundImage: "conic-gradient(from 120deg at 50% 50%, #0891b2, #06b6d4, #67e8f9, #0891b2, #164e63, #0891b2)" },
  },
  EPIC: {
    label: "Épique",
    aura: "#a855f7",
    breathe: true,
    box: "bg-purple-600",
    boxText: "text-white",
    bg: { backgroundImage: "linear-gradient(135deg, #a855f7 0%, #6b21a8 40%, #d8b4fe 50%, #581c87 60%, #3b0764 100%)" },
  },
  LEGENDARY: {
    label: "Légendaire",
    aura: "#f59e0b",
    breathe: true,
    box: "bg-yellow-500",
    boxText: "text-white",
    bg: { backgroundImage: "linear-gradient(135deg, #facc15 0%, #a16207 40%, #fef08a 50%, #854d0e 60%, #422006 100%)" },
  },
  MYTHIC: {
    label: "Mythique",
    aura: "#ef4444",
    breathe: true,
    box: "bg-red-600",
    boxText: "text-yellow-300",
    bg: {
      backgroundColor: "#0a0510",
      backgroundImage:
        "radial-gradient(circle at 50% 0%, rgba(139, 92, 246, 0.5) 0%, transparent 50%), radial-gradient(circle at 50% 100%, rgba(88, 28, 135, 0.8) 0%, transparent 60%)",
    },
  },
};

const parseJSON = (v: unknown, fallback: any) => {
  try {
    return typeof v === "string" ? JSON.parse(v) : v || fallback;
  } catch {
    return fallback;
  }
};

export const getRarityBackground = (rarity: string): React.CSSProperties => RARITY[rarityKey(rarity)].bg;

type TiltContextValue = {
  px: MotionValue<number>;
  py: MotionValue<number>;
  hover: MotionValue<number>;
  enabled: boolean;
};

const TiltContext = createContext<TiltContextValue | null>(null);

function ParallaxLayer({
  depth,
  className,
  children,
}: {
  depth: number;
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = useContext(TiltContext);
  const fallback = useMotionValue(0);
  const x = useTransform(ctx?.px ?? fallback, (v) => v * depth);
  const y = useTransform(ctx?.py ?? fallback, (v) => v * depth);
  const transform = useMotionTemplate`translate3d(${x}px, ${y}px, 0)`;

  if (!ctx?.enabled) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} style={{ transform }}>
      {children}
    </motion.div>
  );
}

const SPRING = { stiffness: 260, damping: 28, mass: 0.6 };

export const InteractiveCard = ({
  card,
  children,
  className = "",
  style: surfaceStyle = {},
  disableTilt = false,
}: {
  card: TradingCard & { isEditing?: boolean };
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  disableTilt?: boolean;
}) => {
  const reduce = useReducedMotion();
  const enabled = !disableTilt && !card.isEditing && !reduce;

  const hitRef = useRef<HTMLDivElement>(null);
  const rect = useRef<DOMRect | null>(null);

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const px = useSpring(rawX, SPRING);
  const py = useSpring(rawY, SPRING);
  const hover = useSpring(0, { stiffness: 220, damping: 30 });
  const press = useSpring(0, { stiffness: 400, damping: 30 });

  const rotateX = useTransform(py, (v) => -v * 20);
  const rotateY = useTransform(px, (v) => v * 20);
  const scale = useTransform([hover, press], ([h, p]: number[]) => 1 + 0.04 * h - 0.06 * p);
  const transform = useMotionTemplate`perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`;

  const glareX = useTransform(px, (v) => v * 50);
  const glareY = useTransform(py, (v) => v * 50);
  const glareTransform = useMotionTemplate`translate3d(${glareX}%, ${glareY}%, 0)`;
  const glareOpacity = hover;

  const holoX = useTransform(px, (v) => v * -20);
  const holoY = useTransform(py, (v) => v * -20);
  const holoTransform = useMotionTemplate`translate3d(${holoX}%, ${holoY}%, 0)`;
  const holoOpacity = useTransform(hover, [0, 1], [0.12, 0.4]);

  const onEnter = (e: React.PointerEvent) => {
    if (!enabled || e.pointerType !== "mouse") return;
    rect.current = hitRef.current?.getBoundingClientRect() ?? null;
    hover.set(1);
  };
  const onMove = (e: React.PointerEvent) => {
    const r = rect.current;
    if (!enabled || !r || e.pointerType !== "mouse") return;
    rawX.set((e.clientX - r.left) / r.width - 0.5);
    rawY.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => {
    rect.current = null;
    rawX.set(0);
    rawY.set(0);
    hover.set(0);
    press.set(0);
  };
  const onDown = () => {
    if (enabled) press.set(1);
  };
  const onUp = () => press.set(0);

  const attrs = useMemo(() => parseJSON(card.attributes, {}), [card.attributes]);

  const key = rarityKey(card.rarity);
  const cfg = RARITY[key];
  const auraColor = attrs.cardGlowColor || attrs.mainColor || cfg.aura;
  const hasVideoBg =
    !!card.customBackground && (card.customBackground.includes(".mp4") || card.customBackground.includes(".webm"));

  const background: React.CSSProperties =
    attrs.cardBgColor || attrs.mainColor
      ? { backgroundColor: attrs.cardBgColor || attrs.mainColor, backgroundImage: "none" }
      : !hasVideoBg && card.customBackground
      ? {
          backgroundImage: `url('${card.customBackground}')`,
          backgroundSize: attrs.bgScale ? `${attrs.bgScale}%` : "cover",
          backgroundPosition: `${attrs.bgPosX ?? 50}% ${attrs.bgPosY ?? 50}%`,
        }
      : hasVideoBg
      ? { backgroundColor: "transparent" }
      : cfg.bg;

  return (
    <TiltContext.Provider value={{ px, py, hover, enabled }}>
      <div
        ref={hitRef}
        className={`relative ${className}`}
        onPointerEnter={onEnter}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        onPointerDown={onDown}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <motion.div className="relative h-full w-full" style={{ transform }}>
          <div
            aria-hidden
            className={`card-aura absolute inset-0 rounded-xl ${cfg.breathe ? "card-aura-breathe" : ""}`}
            style={{ ["--aura-color" as string]: auraColor }}
          />

          <div className="absolute inset-0 overflow-hidden rounded-xl border-2" style={{ ...background, ...surfaceStyle }}>
            {hasVideoBg && (
              <div className="absolute inset-0 z-0 overflow-hidden rounded-xl">
                <video
                  src={card.customBackground || undefined}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="pointer-events-none h-full w-full object-cover"
                  style={{
                    objectPosition: `${attrs.bgPosX ?? 50}% ${attrs.bgPosY ?? 50}%`,
                    transform: `scale(${(attrs.bgScale ?? 100) / 100})`,
                    transformOrigin: `${attrs.bgPosX ?? 50}% ${attrs.bgPosY ?? 50}%`,
                  }}
                />
              </div>
            )}

            <div className="relative z-10 h-full w-full">{children}</div>

            {attrs.isHolo && (
              <motion.div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-[60] overflow-hidden rounded-xl mix-blend-color-dodge"
                style={{ opacity: holoOpacity }}
              >
                <motion.div
                  className="absolute -inset-full"
                  style={{
                    transform: holoTransform,
                    backgroundImage:
                      "linear-gradient(115deg, transparent 0%, rgba(255,0,0,0.3) 15%, rgba(255,255,0,0.3) 30%, rgba(0,255,0,0.3) 45%, rgba(0,255,255,0.3) 60%, rgba(0,0,255,0.3) 75%, rgba(255,0,255,0.3) 90%, transparent 100%)",
                  }}
                />
              </motion.div>
            )}

            {enabled && (
              <motion.div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-[65] overflow-hidden rounded-xl mix-blend-overlay"
                style={{ opacity: glareOpacity }}
              >
                <motion.div
                  className="absolute -inset-1/2"
                  style={{
                    transform: glareTransform,
                    backgroundImage:
                      "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.15) 22%, transparent 45%)",
                  }}
                />
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </TiltContext.Provider>
  );
};

const prng = (seed: number) => {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
};

const STARS = Array.from({ length: 24 }, (_, i) => ({
  size: prng(i) * 2 + 1,
  left: prng(i + 100) * 100,
  top: prng(i + 200) * 100,
  duration: 1 + prng(i + 300) * 3,
  delay: prng(i + 400) * 2,
}));

export const CARD_EFFECTS = ["Holo", "Glitch", "Cosmic", "Saison", "Noël", "Halloween", "Pâques", "Saint-Valentin", "Nouvel An"];

// Effets à particules (saisons et fêtes) : couleurs en rotation, forme et lueur de fond.
type Fx = { colors: string[]; radius: string; glow: string; kind?: "bats" | "eggs" | "hearts" | "confetti" | "lights" };
const PARTICLE_FX: Record<string, Fx> = {
  hiver: { colors: ["#e0f2fe"], radius: "9999px", glow: "rgba(186,230,253,0.18)" },
  printemps: { colors: ["#f9a8d4"], radius: "60% 0 60% 0", glow: "rgba(249,168,212,0.14)" },
  ete: { colors: ["#fde047"], radius: "9999px", glow: "rgba(253,224,71,0.18)" },
  automne: { colors: ["#ea580c"], radius: "0 70% 0 70%", glow: "rgba(234,88,12,0.16)" },
  "Noël": { colors: ["#ffffff"], radius: "9999px", glow: "rgba(239,68,68,0.15)", kind: "lights" },
  Halloween: { colors: ["#f97316", "#a855f7", "#111827"], radius: "50% 50% 0 0", glow: "rgba(249,115,22,0.2)", kind: "bats" },
  "Pâques": { colors: ["#fda4af", "#fde68a", "#a7f3d0", "#bae6fd"], radius: "50% 50% 50% 50% / 60% 60% 40% 40%", glow: "rgba(167,243,208,0.15)", kind: "eggs" },
  "Saint-Valentin": { colors: ["#fb7185", "#e11d48", "#fda4af"], radius: "50% 50% 0 50%", glow: "rgba(225,29,72,0.16)", kind: "hearts" },
  "Nouvel An": { colors: ["#facc15", "#e5e7eb", "#f59e0b"], radius: "1px", glow: "rgba(250,204,21,0.16)", kind: "confetti" },
};

/** Dimanche de Pâques (algorithme de Meeus/Jones/Butcher). */
function easter(y: number) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const g = Math.floor((8 * b + 13) / 25), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const n = h + l - 7 * m + 114;
  return new Date(y, Math.floor(n / 31) - 1, (n % 31) + 1);
}

/** « Saison » : la fête en cours si c'en est une, sinon la saison. */
export function seasonFx(now = new Date()): string {
  const m = now.getMonth(), d = now.getDate();
  const day = (y: number, mo: number, dd: number) => new Date(y, mo, dd).getTime();
  const t = day(now.getFullYear(), m, d);
  if (m === 9 && d >= 20 || m === 10 && d <= 2) return "Halloween";
  if (m === 11 && d <= 26) return "Noël";
  if (m === 11 && d >= 27 || m === 0 && d <= 3) return "Nouvel An";
  if (m === 1 && d >= 7 && d <= 14) return "Saint-Valentin";
  if (Math.abs(t - easter(now.getFullYear()).getTime()) <= 7 * 864e5) return "Pâques";
  return m <= 1 || m === 11 ? "hiver" : m <= 4 ? "printemps" : m <= 7 ? "ete" : "automne";
}

const FLAKES = Array.from({ length: 16 }, (_, i) => ({
  size: 5 + prng(i + 500) * 6,
  left: prng(i + 600) * 100,
  duration: 5 + prng(i + 700) * 5,
  delay: -prng(i + 800) * 8,
}));

const PUMPKINS = [
  { left: 6, scale: 1, flip: false },
  { left: 72, scale: 0.72, flip: true },
  { left: 38, scale: 0.5, flip: false },
];

function Pumpkin() {
  return (
    <svg viewBox="0 0 40 34" className="h-full w-full" overflow="visible">
      <path d="M19.4 9c-.2-3.4.7-5.8 2.8-7.2-1.2 2.3-1.3 4.6-.3 6.9z" fill="#3f5e23" />
      <ellipse cx="20" cy="21" rx="14.5" ry="11.5" fill="#9a3412" />
      <ellipse cx="20" cy="21" rx="9.5" ry="11.5" fill="#c2410c" />
      <ellipse cx="20" cy="21" rx="4" ry="11.5" fill="#ea580c" />
      <g fill="#fbbf24">
        <path d="M13 18.5l4.2-2.2.6 4.4z" />
        <path d="M27 18.5l-4.2-2.2-.6 4.4z" />
        <path d="M13.6 24h12.8l-2 3.6-1.8-1.6-1.6 1.9-1.6-1.9-1.8 1.6z" />
      </g>
    </svg>
  );
}

const HEART = "M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z";

// Décors de fête : un SVG plein cadre (viewBox 100x140 = ratio de la carte), derrière le personnage.
const DECOR: Record<string, React.ReactNode> = {
  noel: (
    <>
      <ellipse cx="50" cy="140" rx="70" ry="14" fill="#f8fafc" opacity=".9" />
      {[[14, 112, 1], [86, 116, 0.8]].map(([x, y, k]) => (
        <g key={x} transform={`translate(${x} ${y}) scale(${k})`}>
          <polygon points="0,-34 -13,-14 13,-14" fill="#15803d" />
          <polygon points="0,-24 -17,0 17,0" fill="#166534" />
          <polygon points="0,-10 -21,16 21,16" fill="#14532d" />
          <polygon points="0,-40 2,-35 7,-35 3,-32 5,-27 0,-30 -5,-27 -3,-32 -7,-35 -2,-35" fill="#facc15" />
        </g>
      ))}
      {[[20, 14, "#ef4444"], [50, 20, "#facc15"], [80, 12, "#3b82f6"]].map(([x, h, col]) => (
        <g key={String(x)}>
          <line x1={Number(x)} y1="0" x2={Number(x)} y2={Number(h)} stroke="#fde68a" strokeWidth=".5" />
          <circle cx={Number(x)} cy={Number(h) + 3} r="3.2" fill={String(col)} />
        </g>
      ))}
    </>
  ),
  paques: (
    <>
      <path d="M0 140V122q12-6 25 0t25 0 25 0 25 0V140z" fill="#4ade80" opacity=".85" />
      <path d="M0 140V129q14-5 28 0t28 0 28 0 16 0V140z" fill="#16a34a" opacity=".9" />
      {[[16, 122, "#fda4af"], [44, 126, "#fde68a"], [72, 123, "#bae6fd"], [90, 127, "#a7f3d0"]].map(([x, y, col]) => (
        <g key={String(x)}>
          <ellipse cx={Number(x)} cy={Number(y)} rx="5" ry="6.5" fill={String(col)} />
          <path d={`M${Number(x) - 5} ${Number(y)}h10`} stroke="#fff" strokeWidth="1.2" opacity=".8" />
        </g>
      ))}
      {[[10, 14], [90, 20]].map(([x, y]) => (
        <g key={x} transform={`translate(${x} ${y})`}>
          {[0, 72, 144, 216, 288].map((r) => <ellipse key={r} cx="0" cy="-3.5" rx="2.2" ry="3.4" fill="#f9a8d4" transform={`rotate(${r})`} />)}
          <circle r="2" fill="#fde047" />
        </g>
      ))}
    </>
  ),
  valentin: (
    <>
      {[[8, 12, 5, "#fb7185"], [92, 18, 7, "#e11d48"], [84, 120, 6, "#fda4af"], [14, 124, 8, "#f43f5e"], [50, 6, 3, "#fda4af"]].map(([x, y, k, col]) => (
        <path key={String(x)} d={HEART} fill={String(col)} opacity=".55" transform={`translate(${Number(x) - Number(k) * 1.2} ${Number(y) - Number(k) * 1.2}) scale(${Number(k) / 5})`} />
      ))}
      <path d="M0 9q25 12 50 0t50 0" fill="none" stroke="#fda4af" strokeWidth=".6" />
    </>
  ),
  nouvelan: (
    <>
      {[[12, 118, "#facc15"], [26, 124, "#e5e7eb"], [86, 116, "#f59e0b"]].map(([x, y, col]) => (
        <g key={String(x)}>
          <path d={`M${x} ${Number(y) + 10}q-4 12 2 24`} fill="none" stroke="#e5e7eb" strokeWidth=".4" />
          <ellipse cx={Number(x)} cy={Number(y)} rx="7" ry="9" fill={String(col)} opacity=".85" />
        </g>
      ))}
      <path d="M0 4q10 8 20 2t20 4 20-2 20 4 20-2" fill="none" stroke="#facc15" strokeWidth="1.2" />
      {[[22, 28], [78, 36], [60, 18]].map(([x, y]) => (
        <path key={x} d="M0-4l1.2 2.8L4 0 1.2 1.2 0 4-1.2 1.2-4 0l2.8-1.2z" fill="#fde047" transform={`translate(${x} ${y}) scale(1.4)`} />
      ))}
    </>
  ),
};

function SeasonDecor({ season }: { season: string }) {
  if (DECOR[season]) {
    return (
      <svg aria-hidden viewBox="0 0 100 140" className="pointer-events-none absolute inset-0 z-[5] h-full w-full overflow-hidden rounded-xl">
        {DECOR[season]}
      </svg>
    );
  }
  if (season !== "halloween") return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[5] overflow-hidden rounded-xl">
      <div className="absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-orange-600/35 to-transparent" />
      <svg viewBox="0 0 100 140" className="absolute inset-0 h-full w-full">
        <circle cx="82" cy="20" r="9" fill="#fde68a" opacity=".85" />
        <circle cx="86" cy="17" r="8" fill="#1e1b4b" opacity=".75" />
        <path d="M0 0h26M0 0v26M0 0l22 22M0 0l26 12M0 0l12 26M0 11q6 2 11-3M0 19q9 2 15-5" fill="none" stroke="#e5e7eb" strokeWidth=".5" opacity=".7" />
      </svg>
      {PUMPKINS.map((p) => (
        <div
          key={p.left}
          className="absolute bottom-[3%]"
          style={{
            left: `${p.left}%`,
            width: `${26 * p.scale}cqi`,
            transform: p.flip ? "scaleX(-1)" : undefined,
          }}
        >
          <Pumpkin />
        </div>
      ))}
    </div>
  );
}

const BAT = "M12 8c-1-2-3-3-6-2 1 1 1 3 0 4 2-1 3 0 4 2 .5-1 1-1.5 2-1.5s1.5.5 2 1.5c1-2 2-3 4-2-1-1-1-3 0-4-3-1-5 0-6 2z";

function Glyph({ d, color }: { d: string; color: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" fill={color}>
      <path d={d} />
    </svg>
  );
}

/** Particules propres à chaque fête : mouvement, forme et décor différents. */
function ParticleFx({ fx }: { fx: Fx }) {
  const col = (i: number) => fx.colors[i % fx.colors.length];
  const vars = (f: (typeof FLAKES)[number]) => ({ ["--d" as string]: `${f.duration}s`, ["--delay" as string]: `${f.delay}s` });
  const tint = (dir: string) => `linear-gradient(${dir}, ${fx.glow}, transparent 55%)`;
  const wrap = "pointer-events-none absolute inset-0 z-[90] overflow-hidden rounded-xl";

  if (fx.kind === "hearts") {
    return (
      <div aria-hidden className={wrap} style={{ background: tint("0deg") }}>
        {FLAKES.slice(0, 12).map((f, i) => (
          <div key={i} className="card-fx-rise absolute bottom-0 opacity-80" style={{ width: f.size * 2, height: f.size * 2, left: `${f.left}%`, ...vars(f) }}>
            <Glyph d={HEART} color={col(i)} />
          </div>
        ))}
      </div>
    );
  }
  if (fx.kind === "bats") {
    return (
      <div aria-hidden className={wrap} style={{ background: tint("0deg") }}>
        {FLAKES.slice(0, 5).map((f, i) => (
          <div key={i} className="card-fx-fly absolute" style={{ width: f.size * 3, height: f.size * 3, top: `${8 + f.left * 0.5}%`, ...vars(f) }}>
            <Glyph d={BAT} color="#0f0a1a" />
          </div>
        ))}
        {FLAKES.slice(5, 10).map((f, i) => (
          <div key={i} className="card-fx-rise absolute bottom-0 opacity-60" style={{ width: f.size, height: f.size, left: `${f.left}%`, borderRadius: "9999px", background: col(i), ...vars(f) }} />
        ))}
      </div>
    );
  }
  if (fx.kind === "eggs") {
    return (
      <div aria-hidden className={wrap} style={{ background: tint("0deg") }}>
        {[8, 26, 46, 64, 82].map((left, i) => (
          <div
            key={left}
            className="card-fx-hop absolute bottom-[3%]"
            style={{
              width: 22,
              height: 28,
              left: `${left}%`,
              borderRadius: fx.radius,
              background: `repeating-linear-gradient(0deg, ${col(i)} 0 5px, ${col(i + 1)} 5px 8px)`,
              ["--delay" as string]: `${i * 0.35}s`,
            }}
          />
        ))}
      </div>
    );
  }
  if (fx.kind === "confetti") {
    return (
      <div aria-hidden className={wrap} style={{ background: tint("180deg") }}>
        {FLAKES.map((f, i) => (
          <div key={i} className="card-fx-fall absolute top-0" style={{ width: f.size * 0.8, height: f.size * 1.6, left: `${f.left}%`, background: col(i), borderRadius: fx.radius, ...vars({ ...f, duration: f.duration * 0.6 }) }} />
        ))}
        {STARS.slice(0, 10).map((st, i) => (
          <div key={i} className="card-fx-star absolute rounded-full bg-yellow-200 shadow-[0_0_8px_2px_rgba(250,204,21,0.8)]" style={{ width: st.size + 1, height: st.size + 1, left: `${st.left}%`, top: `${st.top}%`, ["--d" as string]: `${st.duration}s`, ["--delay" as string]: `${st.delay}s` }} />
        ))}
      </div>
    );
  }
  return (
    <div aria-hidden className={wrap} style={{ background: tint("180deg") }}>
      {fx.kind === "lights" && (
        <div className="absolute inset-x-0 top-[1.5%] flex justify-around">
          {["#ef4444", "#facc15", "#22c55e", "#3b82f6", "#ef4444", "#facc15", "#22c55e"].map((c, i) => (
            <span key={i} className="card-fx-star block h-2 w-2 rounded-full" style={{ background: c, boxShadow: `0 0 8px 2px ${c}`, ["--d" as string]: "1.4s", ["--delay" as string]: `${i * 0.2}s` }} />
          ))}
        </div>
      )}
      {FLAKES.map((f, i) => (
        <div key={i} className="card-fx-fall absolute top-0 opacity-80" style={{ width: f.size, height: f.size, left: `${f.left}%`, background: col(i), borderRadius: fx.radius, ...vars(f) }} />
      ))}
    </div>
  );
}

// Le holo n'apparaît que sous le pointeur : les couleurs glissent avec l'inclinaison de la carte.
// Au-delà de 0–100 %, le dégradé se répète et laisse une couture visible sur les bords.
const clamp = (v: number) => Math.min(100, Math.max(0, v));

function HoloFoil() {
  const ctx = useContext(TiltContext);
  const fallback = useMotionValue(0);
  const px = ctx?.px ?? fallback;
  const py = ctx?.py ?? fallback;
  const pos = useMotionTemplate`${useTransform(px, (v) => clamp(50 + v * 140))}% ${useTransform(py, (v) => clamp(50 + v * 140))}%`;
  const band = useMotionTemplate`0 0, ${useTransform(px, (v) => clamp(50 + v * 160))}% 50%`;
  const idle = ctx?.enabled ? 0 : 0.1;
  // Les calques à mix-blend-mode coûtent cher : on ne les monte que sous le pointeur.
  const hoverMv = ctx?.hover ?? fallback;
  const [active, setActive] = useState(!ctx?.enabled);
  useMotionValueEvent(hoverMv, "change", (v) => {
    if (ctx?.enabled) setActive(v > 0.02);
  });
  const foilOpacity = useTransform(ctx?.hover ?? fallback, [0, 1], [idle, 0.5]);
  const stripeOpacity = useTransform(ctx?.hover ?? fallback, [0, 1], [idle, 0.45]);
  if (!active) return null;
  return (
    <>
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[90] rounded-xl mix-blend-color-dodge"
        style={{
          opacity: foilOpacity,
          backgroundSize: "300% 300%",
          backgroundPosition: pos,
          backgroundImage:
            "linear-gradient(125deg, #ff2d95 0%, #ff9a3c 14%, #f6ff5a 28%, #3cffb0 42%, #3cb8ff 56%, #8a5cff 70%, #ff2d95 84%, #ff9a3c 100%)",
        }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[91] rounded-xl mix-blend-soft-light"
        style={{
          opacity: stripeOpacity,
          backgroundSize: "auto, 250% 100%",
          backgroundPosition: band,
          backgroundImage:
            "repeating-linear-gradient(115deg, rgba(255,255,255,0) 0 5px, rgba(255,255,255,0.3) 5px 6px), linear-gradient(105deg, transparent 42%, rgba(255,255,255,0.6) 50%, transparent 58%)",
        }}
      />
    </>
  );
}

// Glitch : l'artwork lui-même se déchire (classe card-fx-gl-art sur le calque perso) ;
// ces bandes ne font qu'inverser / saturer ce qui passe dessous, en rafale.
const GLITCH_BANDS = [
  { top: "14%", h: "7%", f: "invert(1)", d: "0s" },
  { top: "41%", h: "4%", f: "saturate(5) hue-rotate(90deg)", d: "0.06s" },
  { top: "63%", h: "10%", f: "invert(1) hue-rotate(180deg)", d: "0.12s" },
  { top: "84%", h: "3%", f: "contrast(2.4) brightness(1.4)", d: "0.03s" },
];

function GlitchFx() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[90] overflow-hidden rounded-xl">
      {GLITCH_BANDS.map((b) => (
        <div
          key={b.top}
          className="card-fx-gl-band absolute inset-x-0 opacity-0"
          style={{ top: b.top, height: b.h, animationDelay: b.d, backdropFilter: b.f, WebkitBackdropFilter: b.f }}
        />
      ))}
    </div>
  );
}

// Positions en cqw (la carte est un @container) : un champ d'étoiles = un seul élément à box-shadow.
function rng(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
const dot = (x: number, y: number, s: number, c: string) => `${x.toFixed(1)}cqw ${y.toFixed(1)}cqw 0 ${s}cqw ${c}`;

function starField(n: number, seed: number, size: number, rgb: string, alpha: number) {
  const r = rng(seed);
  return Array.from({ length: n }, () => dot(-10 + r() * 120, -10 + r() * 160, size, `rgba(${rgb},${(alpha * (0.5 + r() * 0.5)).toFixed(2)})`)).join(",");
}

// Voie lactée : étoiles resserrées autour d'une diagonale, teinte chaude (seul accent chaud de l'effet).
function milkyWay(n: number, seed: number) {
  const r = rng(seed);
  return Array.from({ length: n }, () => {
    const x = -10 + r() * 120;
    const off = (r() + r() + r() - 1.5) * 16;
    return dot(x, 18 + x * 0.85 + off, 0.12, `rgba(255,238,210,${(0.25 + r() * 0.5).toFixed(2)})`);
  }).join(",");
}

// Galaxie spirale : deux bras logarithmiques d'étoiles, noyau dense chaud, bras froids.
function spiral(n: number, R: number, seed: number) {
  const r = rng(seed);
  const arms = Array.from({ length: n }, (_, i) => {
    const t = Math.pow(r(), 0.75);
    const a = (i % 2) * Math.PI + t * 6.2 + (r() - 0.5) * 0.45;
    const d = t * R + (r() - 0.5) * R * 0.1;
    const warm = t < 0.35;
    return dot(d * Math.cos(a), d * Math.sin(a), warm ? 0.2 : 0.14, warm ? `rgba(255,236,205,${(0.6 + r() * 0.4).toFixed(2)})` : `rgba(175,200,255,${(0.35 + r() * 0.45).toFixed(2)})`);
  });
  const core = Array.from({ length: 16 }, () => dot((r() - 0.5) * R * 0.16, (r() - 0.5) * R * 0.16, 0.3, "rgba(255,245,225,0.95)"));
  return [...arms, ...core].join(",");
}

const COSMIC = {
  far: starField(80, 7, 0.14, "205,220,255", 0.8),
  near: starField(16, 31, 0.32, "235,242,255", 1),
  way: milkyWay(170, 11),
  big: spiral(150, 24, 5),
  small: spiral(70, 11, 17),
};

function CosmicFx() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[90] overflow-hidden rounded-xl">
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 45%, rgba(2,5,18,0.5))" }} />
      <div className="card-fx-far absolute left-0 top-0 size-0" style={{ boxShadow: COSMIC.far }} />
      <div className="card-fx-far absolute left-0 top-0 size-0" style={{ boxShadow: COSMIC.way, ["--d" as string]: "70s" }} />
      <div className="absolute" style={{ left: "74%", top: "20%", transform: "rotate(-24deg) scaleY(0.42)" }}>
        <div className="card-fx-spin size-0" style={{ boxShadow: COSMIC.big, ["--d" as string]: "90s" }} />
      </div>
      <div className="absolute" style={{ left: "16%", top: "78%", transform: "rotate(18deg) scaleY(0.5)" }}>
        <div className="card-fx-spin size-0" style={{ boxShadow: COSMIC.small, ["--d" as string]: "60s" }} />
      </div>
      <div className="card-fx-near absolute left-0 top-0 size-0" style={{ boxShadow: COSMIC.near }} />
      {[
        { top: "9%", d: "8s", delay: "1s" },
        { top: "47%", d: "13s", delay: "6s" },
      ].map((h) => (
        <div key={h.top} className="absolute left-0 w-full" style={{ top: h.top, transform: "rotate(24deg)" }}>
          <div
            className="card-fx-shoot h-[0.5cqw] w-[30cqw] bg-gradient-to-r from-transparent to-white opacity-0"
            style={{ ["--d" as string]: h.d, animationDelay: h.delay, clipPath: "polygon(0 50%, 100% 0, 100% 100%)" }}
          />
        </div>
      ))}
    </div>
  );
}

function SpecialEffect({ effect }: { effect: string | null }) {
  if (effect === "Holo") return <HoloFoil />;
  if (effect === "Glitch") return <GlitchFx />;
  const particles = effect === "Saison" ? PARTICLE_FX[seasonFx()] : effect ? PARTICLE_FX[effect.replace(/ \d{4}$/, "")] : undefined;
  if (particles) return <ParticleFx fx={particles} />;
  if (effect === "Cosmic") return <CosmicFx />;
  return null;
}

export default function CardDisplay({
  card,
  size = "md",
  isEditing = false,
  disableTilt = false,
  specialEffect = null,
  childVariantBadges = [],
  ownedVariantIds = new Set(),
  onUpdateElement,
}: {
  card: TradingCard & { isEditing?: boolean };
  size?: "sm" | "md" | "lg";
  isEditing?: boolean;
  isOwned?: boolean;
  disableTilt?: boolean;
  specialEffect?: string | null;
  childVariantBadges?: string[];
  ownedVariantIds?: Set<string>;
  onUpdateElement?: (type: string, id: string, data: any) => void;
}) {
  const wrapperClass = size === "lg" ? "w-full max-w-80" : size === "md" ? "w-full max-w-[18rem]" : "w-56";
  const eager = isEditing ? "eager" : "lazy";

  const customBadges: CustomBadge[] = useMemo(() => parseJSON(card.customBadges, []), [card.customBadges]);

  const variantLinks = card.motherLinks || [];

  const attrs: any = useMemo(() => parseJSON(card.attributes, {}), [card.attributes]);

  const copyEffect = specialEffect ?? card.specialEffect ?? null;
  const editionBadgePos = attrs.editionBadgePos || { x: 85, y: 73, scale: 100 };

  const charPos = useMemo(() => {
    const p = parseJSON(card.characterPosition, {});
    return { x: Number(p?.x ?? 50), y: Number(p?.y ?? 50), scale: Number(p?.scale ?? 100) };
  }, [card.characterPosition]);

  const handleMouseDown = (e: React.MouseEvent, type: string, id: string = "") => {
    if (!isEditing || !onUpdateElement) return;
    e.stopPropagation();
    e.preventDefault();
    onUpdateElement(type, id, { action: "drag_start", clientX: e.clientX, clientY: e.clientY });
  };

  const handleWheel = (e: React.WheelEvent, type: string, id: string = "") => {
    if (!isEditing || !onUpdateElement) return;
    e.stopPropagation();
    e.preventDefault();
    onUpdateElement(type, id, { action: "wheel", deltaY: e.deltaY });
  };

  const surfaceStyle: React.CSSProperties = {
    ...(attrs.borderColor ? { borderColor: attrs.borderColor } : {}),
    borderWidth: attrs.isFullArt ? "6px" : "2px",
  };

  const factionColor: string = attrs.factionColor || "bg-zinc-900";
  const factionIsCustom = factionColor?.startsWith("#") || factionColor?.startsWith("rgb");

  const rarity = RARITY[rarityKey(card.rarity)];
  const role = card.edition || attrs.role || "SURVIVANT";
  const faction = attrs.faction || "PARANOIA STUDIO";
  const mythic = rarityKey(card.rarity) === "MYTHIC";
  const legendary = rarityKey(card.rarity) === "LEGENDARY";
  const characterDepth = mythic ? 22 : legendary ? 16 : 10;

  const dragCls = isEditing
    ? "pointer-events-auto cursor-grab active:cursor-grabbing"
    : "pointer-events-none";

  return (
    <div className={`relative ${wrapperClass} mx-auto aspect-[2.5/3.5] rounded-xl @container`}>
      <InteractiveCard
        card={{ ...card, isEditing }}
        className="h-full w-full"
        style={surfaceStyle}
        disableTilt={disableTilt}
      >
        {attrs.season && <SeasonDecor season={attrs.season} />}
        <div className={`absolute inset-0 z-10 flex h-full w-full items-end justify-center overflow-hidden rounded-xl ${copyEffect === "Glitch" || attrs.cardEffect === "Glitch" ? "card-fx-gl-art" : ""}`}>
          {!attrs.hideCharacter && (
            <div
              className="pointer-events-none relative flex h-[85%] w-[120%] items-end justify-center"
              style={{
                transform: `translate(${charPos.x - 50}%, ${charPos.y - 50}%) scale(${charPos.scale / 100})`,
                transformOrigin: "50% 100%",
              }}
            >
              {card.layer1Url || card.layer2Url || card.layer3Url ? (
                <>
                  {([[card.layer1Url, 8, ""], [card.layer2Url, 16, "scale-105"], [card.layer3Url, 24, "scale-110"]] as const).map(
                    ([url, depth, zoom]) =>
                      url && (
                        <ParallaxLayer key={depth} depth={depth} className="absolute bottom-0 w-full">
                          <img src={url} alt="" loading="lazy" className={`w-full object-contain ${zoom}`} />
                        </ParallaxLayer>
                      )
                  )}
                  {!card.layer2Url && card.imageUrl && (
                    <ParallaxLayer depth={16} className="absolute bottom-0 w-full">
                      <img src={card.imageUrl} alt="" loading="lazy" className="w-full scale-105 object-contain" />
                    </ParallaxLayer>
                  )}
                </>
              ) : card.imageUrl || card.player?.minecraftName || card.player?.uuid ? (
                (() => {
                  const avatarUrl =
                    card.imageUrl ||
                    getPlayerSkinUrl({ ...card.player, minecraftName: card.player?.minecraftName || card.title });
                  const isVideo = avatarUrl.match(/\.(mp4|webm|mov)$/i);
                  const commonProps = {
                    className: `h-full w-full object-cover object-top drop-shadow-[0_15px_25px_rgba(0,0,0,0.65)] filter drop-shadow-2xl ${dragCls}`,
                    onMouseDown: (e: React.MouseEvent) => handleMouseDown(e, "character"),
                    onWheel: (e: React.WheelEvent) => handleWheel(e, "character"),
                  };
                  return (
                    <ParallaxLayer depth={characterDepth} className="h-full w-full">
                      {isVideo ? (
                        <video src={avatarUrl} autoPlay loop muted playsInline {...commonProps} />
                      ) : (
                        <img
                          src={avatarUrl}
                          alt={card.title || ""}
                          loading={eager}
                          decoding="async"
                          {...commonProps}
                          onError={(e) => {
                            e.currentTarget.src = `https://minotar.net/armor/body/${card.player?.minecraftName || "Steve"}/512.png`;
                          }}
                        />
                      )}
                    </ParallaxLayer>
                  );
                })()
              ) : (
                <div className="mb-10 h-20 w-20 rounded-full border border-white/10 bg-gray-700/50" />
              )}
            </div>
          )}
        </div>

        {!attrs.hideRarityBox && (
          <div
            className={`absolute right-0 top-0 z-30 flex items-center overflow-hidden border-white shadow-lg ${rarity.box}`}
            style={{ borderBottomWidth: "0.4cqi", borderLeftWidth: "0.4cqi", borderBottomLeftRadius: "2cqi" }}
          >
            <span
              className={`${rarity.boxText} px-[2.5cqi] py-[1cqi] font-black uppercase italic leading-none tracking-wider`}
              style={{ fontSize: "4.5cqi" }}
            >
              {rarity.label}
            </span>
          </div>
        )}

        {attrs.editionBadgeUrl && (
          <img
            src={attrs.editionBadgeUrl}
            alt=""
            loading={eager}
            decoding="async"
            className={`absolute z-[70] object-contain drop-shadow-md ${isEditing ? "cursor-grab active:cursor-grabbing" : "pointer-events-none"}`}
            style={{
              left: `${editionBadgePos.x}%`,
              top: `${editionBadgePos.y}%`,
              width: `${editionBadgePos.scale * 0.15}cqi`,
              transform: "translate(-50%, -50%)",
            }}
            onMouseDown={(e) => handleMouseDown(e, "editionBadge")}
            onWheel={(e) => handleWheel(e, "editionBadge")}
            draggable={false}
          />
        )}

        <div className="pointer-events-none absolute left-[2cqi] top-[2cqi] z-[70] flex flex-row items-center gap-[1cqi]">
          {[
            ...(attrs.variantBadgeUrl && !attrs.variantBadgeUrls ? [attrs.variantBadgeUrl] : []),
            ...(attrs.variantBadgeUrls ?? []),
            ...childVariantBadges,
          ].map((url: string, i: number) => (
            <img key={i} src={url} alt="" loading={eager} decoding="async" className="object-contain drop-shadow-md" style={{ width: "15cqi", height: "15cqi" }} draggable={false} />
          ))}
        </div>

        {variantLinks.length > 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-[11cqi] z-40 flex justify-center gap-[1.5cqi] px-[2cqi]">
            {variantLinks.map((link: CardVariantLink) => {
              const owned = ownedVariantIds?.has(link.targetCardId);
              return (
                <div
                  key={link.id}
                  className={`flex h-[8cqi] w-[8cqi] items-center justify-center overflow-hidden rounded-full border bg-black/60 shadow-lg transition-[transform,opacity,filter] duration-200 ease-out ${
                    owned ? "scale-110 border-violet-400 shadow-violet-500/50" : "border-white/30 opacity-40 grayscale"
                  }`}
                >
                  {link.variantProfile?.iconUrl && (
                    <img src={link.variantProfile.iconUrl} loading={eager} decoding="async" className="h-[70%] w-[70%] object-contain" alt="" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 z-30 flex flex-col">
          {!attrs.hideDescription && card.description && (
            <div
              className={`relative w-full border-white/20 bg-black/90 shadow-inner ${attrs.hideNameplate ? "rounded-b-xl" : ""}`}
              style={{ margin: attrs.hideNameplate ? "0" : "0 0 1cqi 0", padding: "2cqi", borderTopWidth: "0.2cqi", borderBottomWidth: "0.2cqi" }}
            >
              <p className="text-center font-medium italic leading-tight text-white/90" style={{ fontSize: "3.2cqi" }}>
                &quot;{card.description}&quot;
              </p>
            </div>
          )}

          {!attrs.hideNameplate && (
            <div
              className={`relative flex w-full flex-col items-center justify-center rounded-b-xl border-white/50 shadow-[0_-5px_15px_rgba(0,0,0,0.5)] ${factionIsCustom ? "" : factionColor}`}
              style={{
                backgroundColor: factionIsCustom ? factionColor : undefined,
                borderTopWidth: "0.6cqi",
                padding: "2cqi 2cqi 1.5cqi 2cqi",
              }}
            >
              {!attrs.hideRole && (
                <div
                  className="absolute rounded-sm bg-white font-black uppercase text-black shadow-md"
                  style={{ top: "-3cqi", right: "2cqi", padding: "0.5cqi 1.5cqi", fontSize: "3cqi" }}
                >
                  {role}
                </div>
              )}
              {!attrs.hideTitle && (
                <h3
                  className="text-center font-black uppercase tracking-widest text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                  style={{ fontSize: "7.5cqi", WebkitTextStroke: "0.1cqi black", lineHeight: 1 }}
                >
                  {card.title}
                </h3>
              )}
              {!attrs.hideBottomText && (
                <div className="mt-[0.5cqi] flex justify-center">
                  <span className="font-bold uppercase tracking-[0.2em] text-white/70" style={{ fontSize: "3cqi" }}>
                    {faction}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {customBadges?.map(
          (badge: CustomBadge, i: number) =>
            badge.url && (
              <img
                key={badge.id || i}
                src={badge.url}
                alt=""
                loading={eager}
                decoding="async"
                className={`absolute z-[60] object-contain drop-shadow-lg ${isEditing ? "cursor-grab active:cursor-grabbing" : "pointer-events-none"}`}
                style={{
                  left: `${badge.x}%`,
                  top: `${badge.y}%`,
                  width: `${badge.size}px`,
                  height: `${badge.size}px`,
                  transform: "translate(-50%, -50%)",
                }}
                onMouseDown={(e) => handleMouseDown(e, "customBadge", badge.id || String(i))}
                onWheel={(e) => handleWheel(e, "customBadge", badge.id || String(i))}
                draggable={false}
              />
            )
        )}

        {isEditing && attrs.showVGuide && (
          <div className="pointer-events-none absolute bottom-0 left-1/2 top-0 z-[100] w-[2px] -translate-x-1/2 bg-[var(--color-accent-purple)]" />
        )}
        {isEditing && attrs.showHGuide && (
          <div className="pointer-events-none absolute left-0 right-0 top-1/2 z-[100] h-[2px] -translate-y-1/2 bg-[var(--color-accent-purple)]" />
        )}

        {attrs.variantSuite && (
          <div className="absolute bottom-4 right-4 z-[80] flex items-center rounded-md border border-white/20 bg-black/70 px-3 py-1 shadow-lg">
            <span className="text-[10px] font-black uppercase tracking-tight text-white">Variantes</span>
          </div>
        )}

        {attrs.frameUrl && (
          <img src={attrs.frameUrl} alt="" loading={eager} decoding="async" className="pointer-events-none absolute inset-0 h-full w-full rounded-xl object-cover" />
        )}

        <SpecialEffect effect={copyEffect} />
        {attrs.cardEffect && attrs.cardEffect !== copyEffect && <SpecialEffect effect={attrs.cardEffect} />}
      </InteractiveCard>
    </div>
  );
}

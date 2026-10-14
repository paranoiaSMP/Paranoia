"use client";

import React, { createContext, useContext, useMemo, useRef } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
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
    <TiltContext.Provider value={{ px, py, enabled }}>
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

export const CARD_EFFECTS = ["Holo", "Glitch", "Cosmic", "Hot", "Cold"];

function SpecialEffect({ effect }: { effect: string | null }) {
  if (effect === "Hot" || effect === "Braises") return <div aria-hidden className="fx-embers" />;
  if (effect === "Cold" || effect === "Givre") return <div aria-hidden className="fx-frost" />;
  if (effect === "Holo") {
    return (
      <>
        <div aria-hidden className="pointer-events-none absolute inset-0 z-[90] overflow-hidden rounded-xl opacity-50 mix-blend-color-dodge">
          <div
            className="card-fx-sheen absolute inset-y-0 -left-1/2 w-[200%]"
            style={{
              backgroundImage:
                "linear-gradient(105deg, transparent 38%, #ff0080 42%, #ff8c00 46%, #40e0d0 50%, #7b68ee 54%, transparent 58%)",
            }}
          />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[91] rounded-xl mix-blend-overlay"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)",
          }}
        />
      </>
    );
  }
  if (effect === "Glitch") {
    return (
      <>
        <div aria-hidden className="card-fx-glitch pointer-events-none absolute inset-0 z-[90] overflow-hidden rounded-xl">
          <div className="card-fx-glitch-r absolute inset-0 bg-red-500/20 mix-blend-screen" />
          <div className="card-fx-glitch-b absolute inset-0 bg-cyan-500/20 mix-blend-screen" />
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-0 z-[91] overflow-hidden rounded-xl mix-blend-overlay">
          <div
            className="card-fx-scan absolute inset-x-0 top-0 h-[200%]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(255,255,255,0.04) 1px, rgba(255,255,255,0.04) 2px)",
            }}
          />
        </div>
      </>
    );
  }
  if (effect === "Cosmic") {
    return (
      <>
        <div
          aria-hidden
          className="card-fx-cosmic pointer-events-none absolute inset-0 z-[90] overflow-hidden rounded-xl mix-blend-screen"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 50%, rgba(138, 43, 226, 0.5), transparent 60%), radial-gradient(circle at 80% 20%, rgba(0, 255, 255, 0.3), transparent 40%)",
          }}
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 z-[91] overflow-hidden rounded-xl mix-blend-color-dodge">
          {STARS.map((s, i) => (
            <div
              key={i}
              className="card-fx-star absolute rounded-full bg-white shadow-[0_0_8px_2px_rgba(255,255,255,0.8)]"
              style={{
                width: s.size,
                height: s.size,
                left: `${s.left}%`,
                top: `${s.top}%`,
                ["--d" as string]: `${s.duration}s`,
                ["--delay" as string]: `${s.delay}s`,
              }}
            />
          ))}
        </div>
      </>
    );
  }
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
  const characterDepth = mythic ? 16 : 10;

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
        <div className="absolute inset-0 z-10 flex h-full w-full items-end justify-center overflow-hidden rounded-xl">
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
                  {([[card.layer1Url, 6, ""], [card.layer2Url, 12, "scale-105"], [card.layer3Url, 20, "scale-110"]] as const).map(
                    ([url, depth, zoom]) =>
                      url && (
                        <ParallaxLayer key={depth} depth={depth} className="absolute bottom-0 w-full">
                          <img src={url} alt="" loading="lazy" className={`w-full object-contain ${zoom}`} />
                        </ParallaxLayer>
                      )
                  )}
                  {!card.layer2Url && card.imageUrl && (
                    <ParallaxLayer depth={12} className="absolute bottom-0 w-full">
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
                    className: `h-full w-full object-cover object-top drop-shadow-2xl ${dragCls}`,
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
        <div aria-hidden className="card-season" />
      </InteractiveCard>
    </div>
  );
}

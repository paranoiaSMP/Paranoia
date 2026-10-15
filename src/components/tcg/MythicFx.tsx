"use client";

import { useLayoutEffect, useState, type CSSProperties, type RefObject } from "react";

// Pseudo-aléatoire déterministe : même rendu à chaque tirage, pas de Math.random dans le rendu.
const r = (i: number, k: number) => ((i * 7919 + k * 104729) % 1000) / 1000;
const EMBERS = Array.from({ length: 30 }, (_, i) => i);

type Props = {
  /** Carte au centre des effets. */
  anchor: RefObject<HTMLElement | null>;
  /** "back" passe derrière la carte (rayons, halo d'attente), "front" par-dessus. */
  layer: "back" | "front";
  /** Carte encore face cachée : seul le halo d'attente pulse. */
  revealed: boolean;
};

export default function MythicFx({ anchor, layer, revealed }: Props) {
  const [c, setC] = useState<{ x: number; y: number } | null>(null);

  // shortcut: centre mesuré une fois au montage (le scroll du dialogue pendant l'effet n'est pas suivi)
  useLayoutEffect(() => {
    const b = anchor.current?.getBoundingClientRect();
    if (b) setC({ x: b.left + b.width / 2, y: b.top + b.height / 2 });
  }, [anchor]);

  if (!c) return null;
  const at: CSSProperties = { left: c.x, top: c.y };
  const base = "pointer-events-none fixed -translate-x-1/2 -translate-y-1/2";

  if (layer === "back") {
    return (
      <div aria-hidden>
        <div
          className={`${base} mythic-tell size-[420px]`}
          style={{ ...at, background: "radial-gradient(closest-side, rgba(239,68,68,0.75), transparent)", zIndex: 0, opacity: revealed ? 0 : undefined }}
        />
        {revealed && (
          <div
            className={`${base} mythic-rays size-[1400px]`}
            style={{
              ...at,
              zIndex: 0,
              background:
                "repeating-conic-gradient(from 0deg, rgba(239,68,68,0.55) 0deg 6deg, transparent 6deg 24deg)",
              maskImage: "radial-gradient(closest-side, black 8%, transparent 70%)",
              WebkitMaskImage: "radial-gradient(closest-side, black 8%, transparent 70%)",
            }}
          />
        )}
      </div>
    );
  }

  if (!revealed) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[210] overflow-hidden">
      <div className="mythic-flash absolute inset-0" style={{ background: "radial-gradient(circle at 50% 50%, #fff 0%, #fecaca 25%, #ef4444 60%, transparent 85%)" }} />
      {[0, 0.14, 0.28].map((d, i) => (
        <div
          key={i}
          className={`${base} mythic-ring size-[300px] rounded-full border-[3px]`}
          style={{ ...at, animationDelay: `${0.38 + d}s`, borderColor: i === 1 ? "#fbbf24" : "#ef4444" }}
        />
      ))}
      {EMBERS.map((i) => (
        <span
          key={i}
          className="mythic-ember absolute size-1.5 rounded-full"
          style={
            {
              left: c.x + (r(i, 1) - 0.5) * 320,
              top: c.y + 60 + r(i, 2) * 120,
              background: i % 3 === 0 ? "#fbbf24" : "#ef4444",
              "--dx": `${(r(i, 3) - 0.5) * 120}px`,
              "--rise": `${240 + r(i, 4) * 220}px`,
              "--dur": `${1.4 + r(i, 5) * 1.2}s`,
              "--d": `${0.45 + r(i, 6) * 0.7}s`,
            } as CSSProperties
          }
        />
      ))}
      <p
        className="mythic-title absolute left-1/2 top-[14%] -translate-x-1/2 whitespace-nowrap text-[clamp(2.25rem,9vw,5.5rem)] font-black tracking-[0.12em] text-transparent"
        style={{ backgroundImage: "linear-gradient(180deg, #fff 0%, #fbbf24 45%, #ef4444 100%)", WebkitBackgroundClip: "text", backgroundClip: "text" }}
      >
        MYTHIQUE
      </p>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { SiteEvent } from "@/lib/events";

const FLAKES = Array.from({ length: 36 }, (_, i) => ({
  left: (i * 37) % 100,
  size: 2 + (i % 4),
  duration: 9 + ((i * 7) % 9),
  delay: -((i * 13) % 17),
  drift: (i % 2 ? 1 : -1) * (10 + (i % 5) * 6),
}));

const BATS = [
  { top: 18, duration: 14, delay: 2, scale: 1, flap: 0.32, bob: 1.9 },
  { top: 32, duration: 19, delay: 9, scale: 0.7, flap: 0.26, bob: 2.3 },
  { top: 12, duration: 23, delay: 15, scale: 0.55, flap: 0.22, bob: 1.6 },
];

const WING = "M27 11C21 4 11 2 1 6c4 2 6 5 6 9 3-2 6-2 8 1 2-3 5-3 7 0 1-2 3-3 5-2Z";

function Bat({ scale }: { scale: number }) {
  return (
    <svg width={72 * scale} height={30 * scale} viewBox="0 0 60 24" overflow="visible" fill="#1f0d05" stroke="var(--color-accent-purple-soft)" strokeOpacity="0.7" strokeWidth="0.8" strokeLinejoin="round">
      <path className="bat-wing" d={WING} />
      <g transform="translate(60 0) scale(-1 1)">
        <path className="bat-wing" d={WING} />
      </g>
      <path d="M26.5 8 27.5 4.5 29 7.5h2l1.5-3 1 3.5c1.5 2 1.5 6 0 8.5-1 2-6 2-7 0-1.5-2.5-1.5-6.5 0-8.5Z" />
      <circle cx="28.6" cy="10" r="0.7" fill="var(--color-accent-purple-soft)" stroke="none" />
      <circle cx="31.4" cy="10" r="0.7" fill="var(--color-accent-purple-soft)" stroke="none" />
    </svg>
  );
}

export default function SeasonalLayer() {
  const pathname = usePathname();
  const [event, setEvent] = useState<SiteEvent>(null);

  useEffect(() => {
    const t = setTimeout(() => setEvent((document.documentElement.dataset.event as SiteEvent) ?? null), 0);
    return () => clearTimeout(t);
  }, []);

  if (!event || pathname.startsWith("/admin") || pathname.startsWith("/bot")) return null;

  if (event === "noel") {
    return (
      <div aria-hidden className="seasonal-layer">
        {FLAKES.map((f, i) => (
          <span
            key={i}
            className="snowflake"
            style={{
              left: `${f.left}%`,
              width: f.size,
              height: f.size,
              animationDuration: `${f.duration}s`,
              animationDelay: `${f.delay}s`,
              ["--drift" as string]: `${f.drift}px`,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div aria-hidden className="seasonal-layer">
      <div className="halloween-fog" />
      {BATS.map((b, i) => (
        <div key={i} className="bat" style={{ top: `${b.top}%`, animationDuration: `${b.duration}s`, animationDelay: `${b.delay}s` }}>
          <div className="bat-bob" style={{ animationDuration: `${b.bob}s`, ["--flap" as string]: `${b.flap}s` }}>
            <Bat scale={b.scale} />
          </div>
        </div>
      ))}
    </div>
  );
}

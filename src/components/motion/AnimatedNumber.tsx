"use client";

import { useEffect, useRef } from "react";
import { animate, useReducedMotion } from "framer-motion";
import { EASE_OUT } from "@/lib/motion";

export default function AnimatedNumber({ value, decimals = 0, suffix = "" }: { value: number; decimals?: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const from = useRef(value);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fmt = (v: number) => `${v.toLocaleString("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
    if (reduce) {
      el.textContent = fmt(value);
      from.current = value;
      return;
    }
    const controls = animate(from.current, value, {
      duration: 0.5,
      ease: EASE_OUT,
      onUpdate: (v) => (el.textContent = fmt(v)),
    });
    from.current = value;
    return () => controls.stop();
  }, [value, decimals, suffix, reduce]);

  return (
    <span ref={ref} className="tabular-nums">
      {`${value.toLocaleString("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`}
    </span>
  );
}

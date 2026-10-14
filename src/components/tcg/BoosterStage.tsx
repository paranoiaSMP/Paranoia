"use client";

import { useRef } from "react";
import Image from "next/image";
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import type { BoosterPackConfig } from "@/config/boosters";
import { SPRING_SOFT, SPRING_UI } from "@/lib/motion";

export default function BoosterStage({ pack }: { pack: BoosterPackConfig }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const rect = useRef<DOMRect | null>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, SPRING_SOFT);
  const sy = useSpring(my, SPRING_SOFT);
  const rotY = useTransform(sx, (v) => v * 24);
  const rotX = useTransform(sy, (v) => -v * 18);
  const transform = useMotionTemplate`perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;

  const onEnter = (e: React.PointerEvent) => {
    if (reduce || e.pointerType !== "mouse") return;
    rect.current = ref.current?.getBoundingClientRect() ?? null;
  };
  const onMove = (e: React.PointerEvent) => {
    const r = rect.current;
    if (!r) return;
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => {
    rect.current = null;
    mx.set(0);
    my.set(0);
  };

  return (
    <div
      ref={ref}
      onPointerEnter={onEnter}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="relative mx-auto aspect-[3/4] w-full max-w-sm md:max-w-md"
    >
      <motion.div className="absolute inset-0" style={reduce ? undefined : { transform }}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={pack.id}
            initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(32px) rotate(4deg) scale(0.95)" }}
            animate={{ opacity: 1, transform: "translateY(0px) rotate(0deg) scale(1)" }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(-24px) rotate(-4deg) scale(0.97)" }}
            transition={reduce ? { duration: 0.2 } : SPRING_UI}
            className="absolute inset-0"
          >
            <Image src={pack.image} alt={`Booster ${pack.name}`} fill sizes="(min-width: 768px) 440px, 90vw" className="object-contain" priority />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 overflow-hidden"
              style={{
                maskImage: `url(${pack.image})`,
                WebkitMaskImage: `url(${pack.image})`,
                maskSize: "contain",
                WebkitMaskSize: "contain",
                maskRepeat: "no-repeat",
                WebkitMaskRepeat: "no-repeat",
                maskPosition: "center",
                WebkitMaskPosition: "center",
              }}
            >
              <div
                className="sheen-once absolute inset-y-0 left-0 w-full mix-blend-overlay"
                style={{ backgroundImage: "linear-gradient(100deg, transparent 30%, rgba(255,255,255,0.85) 50%, transparent 70%)" }}
              />
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

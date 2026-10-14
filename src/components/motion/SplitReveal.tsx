"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { EASE_OUT } from "@/lib/motion";

export default function SplitReveal({
  lines,
  className,
  delay = 0,
  as: Tag = "h1",
}: {
  lines: ReactNode[];
  className?: string;
  delay?: number;
  as?: "h1" | "h2";
}) {
  const reduce = useReducedMotion();
  return (
    <Tag className={className}>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
          <motion.span
            className="block"
            initial={reduce ? { opacity: 0 } : { transform: "translateY(130%)" }}
            animate={reduce ? { opacity: 1 } : { transform: "translateY(0%)" }}
            transition={
              reduce
                ? { duration: 0.2 }
                : { duration: 0.9, ease: EASE_OUT, delay: delay + i * 0.08 }
            }
          >
            {line}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

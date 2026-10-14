"use client";

import { useEffect, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { EASE_OUT } from "@/lib/motion";

let hydrated = false;

export default function Template({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  const animate = hydrated;

  useEffect(() => {
    hydrated = true;
  }, []);

  if (!animate) return <>{children}</>;

  return (
    <>
      <div aria-hidden className="page-sweep" />
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(12px)" }}
        animate={{ opacity: 1, transform: "translateY(0px)", transitionEnd: { transform: "none" } }}
        transition={{ duration: reduce ? 0.15 : 0.3, ease: EASE_OUT }}
      >
        {children}
      </motion.div>
    </>
  );
}

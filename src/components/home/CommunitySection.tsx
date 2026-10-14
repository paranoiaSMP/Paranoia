"use client";

import { useRef } from "react";
import { motion, useMotionTemplate, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useSettings } from "@/components/providers/SettingsProvider";

export default function CommunitySection() {
  const { discordUrl } = useSettings();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const x = useTransform(scrollYProgress, [0, 1], [12, -12]);
  const transform = useMotionTemplate`translateX(${x}%)`;

  return (
    <section ref={ref} className="overflow-hidden bg-[var(--color-accent-purple)] [&_:focus-visible]:outline-white">
      <div className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
        <motion.h2
          style={reduce ? undefined : { transform }}
          className="whitespace-nowrap text-[clamp(3rem,10vw,9rem)] font-extrabold leading-none tracking-[-0.045em] text-white"
        >
          Rejoins le Discord.
        </motion.h2>
        <div className="mt-10 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <p className="max-w-lg text-lg leading-relaxed text-white">
            Concours, événements et nouveautés du studio : tout passe d&apos;abord par le Discord.
          </p>
          <a href={discordUrl} target="_blank" rel="noopener noreferrer" className="btn-solid shrink-0 self-start md:self-auto">
            Rejoindre le Discord
          </a>
        </div>
      </div>
    </section>
  );
}

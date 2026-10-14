"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useSettings } from "@/components/providers/SettingsProvider";
import SplitReveal from "@/components/motion/SplitReveal";
import { EASE_OUT } from "@/lib/motion";
import { introDelay } from "@/lib/intro";

export default function HeroSection() {
  const { discordUrl } = useSettings();
  const reduce = useReducedMotion();
  const delay = introDelay();

  return (
    <section className="relative overflow-hidden border-b border-zinc-900">
      <div className="mx-auto flex min-h-[calc(100svh-4rem)] max-w-7xl flex-col justify-center px-5 py-14 md:px-10">
        <div>
          <SplitReveal
            lines={["Paranoia", <span key="s" className="text-violet-400">Studio.</span>]}
            delay={delay}
            className="text-[clamp(3.5rem,13vw,10rem)] font-extrabold leading-[0.88] tracking-[-0.045em] text-white"
          />
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(16px)" }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            transition={{ duration: reduce ? 0.2 : 0.8, ease: EASE_OUT, delay: reduce ? 0 : delay + 0.35 }}
          >
            <p className="mt-10 max-w-xl text-lg leading-relaxed text-zinc-300">
              La communauté du studio : des cartes à collectionner, un casino en ParaCoins, un launcher Minecraft, et bientôt un serveur. On se retrouve sur Discord.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link href="/cards" className="btn-violet">
                Ouvrir un booster
              </Link>
              <a href={discordUrl} target="_blank" rel="noopener noreferrer" className="btn-line">
                Rejoindre le Discord
              </a>
            </div>
          </motion.div>
        </div>

      </div>
    </section>
  );
}

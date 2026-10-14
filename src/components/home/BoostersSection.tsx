"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { BOOSTER_PACKS, BOOSTER_DROP_RATES } from "@/config/boosters";
import Reveal from "@/components/common/Reveal";

const packs = Object.values(BOOSTER_PACKS);

export default function BoostersSection() {
  const reduce = useReducedMotion();
  return (
    <section className="border-b border-zinc-900 bg-[#0b0b0d]">
      <div className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <Reveal>
            <h2 className="max-w-xl text-4xl font-bold tracking-[-0.03em] text-white md:text-6xl">
              Quatre boosters, quatre niveaux de rareté.
            </h2>
          </Reveal>
          <Link href="/cards" className="btn-line self-start md:self-auto">
            Voir les probabilités
          </Link>
        </div>

        <ul className="mt-14 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-4">
          {packs.map((pack, i) => (
            <li key={pack.id} className={i % 2 === 1 ? "md:mt-16" : ""}>
              <Reveal delay={i * 0.07}>
                <Link href={`/cards?edition=${pack.id}`} className="group block rounded-md">
                  <motion.div
                    className="relative aspect-[3/4] w-full"
                    whileHover={reduce ? undefined : { transform: "translateY(-14px) rotate(-2deg)" }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.45 }}
                  >
                    <Image src={pack.image} alt="" fill sizes="(min-width: 768px) 25vw, 50vw" className="object-contain" />
                  </motion.div>
                  <h3 className="mt-4 text-lg font-semibold text-white">{pack.name}</h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    {pack.cardsPerPack} cartes · {pack.price} PARA · Mythique {BOOSTER_DROP_RATES[pack.id].MYTHIC}%
                  </p>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

"use client";

import { motion, useReducedMotion } from "framer-motion";
import SplitReveal from "@/components/motion/SplitReveal";
import Reveal from "@/components/common/Reveal";
import AnimatedNumber from "@/components/motion/AnimatedNumber";
import { useSettings } from "@/components/providers/SettingsProvider";
import { LAUNCHER } from "@/config/launcher";
import { EASE_OUT } from "@/lib/motion";

const FEATURES = [
  { title: "Connexion Microsoft", text: "Tu te connectes avec ton compte Minecraft officiel, directement dans le launcher." },
  { title: "Mods installés pour toi", text: "Les mods viennent d'une configuration signée. Chaque fichier est vérifié (SHA-256) et un téléchargement coupé reprend où il s'était arrêté." },
  { title: "Java inclus", text: "Java 21 est téléchargé automatiquement. Rien à installer à côté." },
  { title: "Cosmétiques", text: "Capes, ailes, halos et autres cosmétiques, à acheter avec tes ParaCoins." },
  { title: "Mises à jour automatiques", text: "Le launcher et ton instance se mettent à jour seuls au démarrage." },
  { title: "Rust et Tauri", text: "Le cœur du launcher est écrit en Rust, avec Tauri. Ton profil, Java et tes mods restent dans ton dossier utilisateur." },
];

export default function LauncherPage() {
  const reduce = useReducedMotion();
  const { discordUrl } = useSettings();
  const available = LAUNCHER.platforms.filter((p) => p.url);

  return (
    <div className="text-white">
      <section className="border-b border-zinc-900">
        <div className="mx-auto max-w-7xl px-5 pb-16 pt-16 md:px-10 md:pb-24 md:pt-24">
          <p className="text-sm font-medium text-violet-400">Minecraft {LAUNCHER.minecraftVersion}</p>
          <SplitReveal
            lines={["Paranoia", <span key="c" className="text-violet-400">Client.</span>]}
            className="mt-4 text-[clamp(3.5rem,13vw,10rem)] font-extrabold leading-[0.88] tracking-[-0.045em]"
          />
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(16px)" }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            transition={{ duration: reduce ? 0.2 : 0.8, ease: EASE_OUT, delay: reduce ? 0 : 0.35 }}
          >
            <p className="mt-10 max-w-xl text-lg leading-relaxed text-zinc-300">
              Le launcher Minecraft du studio. Il installe le jeu, les mods et tes cosmétiques, puis te lance en jeu. Pensé pour le PvP.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              {available.length > 0 ? (
                available.map((p) => (
                  <a key={p.id} href={p.url!} className="btn-violet">
                    Télécharger pour {p.name}
                  </a>
                ))
              ) : (
                <>
                  <span aria-disabled="true" className="inline-flex min-h-12 cursor-not-allowed items-center justify-center rounded-md bg-zinc-900 px-6 text-sm font-semibold text-zinc-300">
                    Téléchargement bientôt disponible
                  </span>
                  <a href={discordUrl} target="_blank" rel="noopener noreferrer" className="btn-line">
                    Être prévenu sur Discord
                  </a>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="border-b border-zinc-900 bg-[#0b0b0d]">
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
          <Reveal>
            <h2 className="max-w-2xl text-4xl font-bold tracking-[-0.03em] md:text-6xl">Tu l&apos;ouvres, tu joues.</h2>
          </Reveal>
          <ul className="mt-14 grid grid-cols-1 gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <li key={f.title} className="border-t border-zinc-800 pt-6">
                <Reveal delay={(i % 3) * 0.06}>
                  <h3 className="text-xl font-semibold">{f.title}</h3>
                  <p className="mt-3 leading-relaxed text-zinc-300">{f.text}</p>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-b border-zinc-900">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-5 py-20 md:px-10 md:py-28 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <h2 className="text-4xl font-bold tracking-[-0.03em] md:text-5xl">Optimisé sans rien cacher.</h2>
            <p className="mt-6 max-w-md leading-relaxed text-zinc-300">
              La plupart des joueurs font du PvP. Une optimisation qui retire de l&apos;information à l&apos;écran fait perdre le combat qu&apos;elle accélère : celles-là sont refusées. Le reste est mesuré.
            </p>
          </Reveal>
          <Reveal delay={0.08} className="lg:col-span-7">
            <div className="rounded-md border border-zinc-900 bg-[#0b0b0d] p-6 md:p-10">
              <p className="text-sm text-zinc-400">Appels de dessin pour une image complète du HUD</p>
              <div className="mt-6 flex flex-wrap items-end gap-x-6 gap-y-2">
                <span className="text-5xl font-extrabold tabular-nums tracking-[-0.04em] text-zinc-500 line-through decoration-2 md:text-7xl">
                  <AnimatedNumber value={1040} />
                </span>
                <span aria-hidden className="pb-3 text-3xl text-violet-400">→</span>
                <span className="text-6xl font-extrabold tabular-nums tracking-[-0.04em] text-white md:text-8xl">
                  <AnimatedNumber value={218} />
                </span>
              </div>
              <p className="mt-6 text-sm text-zinc-400">Mesuré, avec un rendu vérifié pixel par pixel. Source : dossier d&apos;optimisation du client.</p>
            </div>
          </Reveal>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
          <Reveal>
            <h2 className="text-4xl font-bold tracking-[-0.03em] md:text-5xl">Systèmes</h2>
          </Reveal>
          <ul className="mt-10 divide-y divide-zinc-900 border-y border-zinc-900">
            {LAUNCHER.platforms.map((p) => (
              <li key={p.id} className="flex flex-col gap-2 py-6 sm:flex-row sm:items-center sm:gap-10">
                <span className="w-40 shrink-0 text-2xl font-semibold">{p.name}</span>
                <span className="flex-1 text-zinc-300">
                  {p.format}
                  <span className="mt-1 block font-mono text-xs text-zinc-400">Données : {p.dataDir}</span>
                </span>
                {p.url ? (
                  <a href={p.url} className="btn-violet self-start sm:self-auto">
                    Télécharger
                  </a>
                ) : (
                  <span className="text-sm font-medium text-violet-400">{p.status}</span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-8 max-w-2xl text-sm leading-relaxed text-zinc-400">
            À l&apos;installation sur Windows, SmartScreen peut afficher « éditeur inconnu » : l&apos;installeur n&apos;est pas encore signé. Clique sur « Informations complémentaires » puis « Exécuter quand même ».
          </p>
        </div>
      </section>
    </div>
  );
}

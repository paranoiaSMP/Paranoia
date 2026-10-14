"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "framer-motion";
import DialogueBox from "@/components/common/DialogueBox";
import { useSettings } from "@/components/providers/SettingsProvider";
import { EASE_OUT } from "@/lib/motion";
import { pixel } from "@/lib/fonts/pixel";
import { sfx, isMuted, setMuted, preloadSounds } from "@/lib/chiptune";

const NEED_RETRY = 6;
const NEED_WHY = 7;
const SKIN = "https://vzge.me/full/512/Leoo955.png";

const INTRO = [
  "Tu voulais vraiment aller sur le site ?",
  "Six fois Réessayer. Sept fois Pourquoi.",
  "T'as vraiment rien d'autre à faire ?",
  "Bon. Le site est fermé, et c'est moi qui garde la porte.",
];

const REPLIES: Record<string, string[]> = {
  attack: ["Leoo955 esquive. Évidemment.", "Raté. Il tourne sur Paranoia Client.", "Tu frappes. Il ne bouge pas d'un pixel."],
  act: ["Tu complimentes son skin. Il fait semblant de ne pas être touché.", "Tu lui demandes quand le site rouvre. Il hausse les épaules.", "Tu lui proposes un booster Mythique. Il réfléchit. Non."],
  item: ["Vide. Comme ton inventaire sur le site.", "Toujours rien. Tu fouilles quand même."],
};

const RETRY_MSG = ["Toujours fermé.", "Encore fermé.", "Fermé. Promis.", "Ça ne change pas en cliquant.", "Toujours pas.", "…"];

function Battle({ onLeave }: { onLeave: () => void }) {
  const reduce = useReducedMotion();
  const sprite = useAnimationControls();
  const [ready, setReady] = useState(false);
  const [reply, setReply] = useState<string | null>(null);
  const [count, setCount] = useState<Record<string, number>>({});
  const [spared, setSpared] = useState(false);
  const [mute, setMute] = useState(isMuted);

  const toggleSound = () => {
    setMuted(!mute);
    setMute(!mute);
  };

  const spare = () => {
    sfx.spare();
    setSpared(true);
  };

  const act = (kind: "attack" | "act" | "item") => {
    if (kind === "attack") sfx.hit();
    else sfx.select();
    const n = count[kind] ?? 0;
    setCount((c) => ({ ...c, [kind]: n + 1 }));
    setReply(REPLIES[kind][n % REPLIES[kind].length]);
    if (kind === "attack" && !reduce) {
      sprite.start({
        transform: ["translateX(0px)", "translateX(-14px)", "translateX(10px)", "translateX(-4px)", "translateX(0px)"],
        transition: { duration: 0.35, ease: EASE_OUT },
      });
    }
  };

  const btn =
    "press min-h-12 rounded-md border-2 border-violet-400 px-4 text-sm font-bold uppercase tracking-wide text-violet-300 hover:bg-violet-400 hover:text-black";

  return (
    <div className={`${pixel.className} fixed inset-0 z-[300] flex flex-col items-center justify-center gap-8 overflow-y-auto bg-black px-5 py-10`} role="dialog" aria-modal="true" aria-label="Combat contre Leoo955">
      <button
        type="button"
        onClick={toggleSound}
        aria-pressed={!mute}
        className="absolute right-4 top-4 min-h-11 rounded-md border border-zinc-500 px-3 text-sm text-zinc-300 hover:text-white"
      >
        {mute ? "Son coupé" : "Son activé"}
      </button>
      <motion.div animate={sprite} className="flex flex-col items-center">
        <img src={SKIN} alt="Leoo955, le gardien du site" className={`h-[34svh] w-auto ${reduce ? "" : "boss-float"}`} style={{ imageRendering: "pixelated" }} />
        <div className="mt-4 flex items-center gap-3 text-sm font-bold uppercase tracking-wide text-white">
          Leoo955
          <span className="text-xs text-zinc-400">PV</span>
          <span className="block h-3 w-32 overflow-hidden rounded-sm bg-red-900">
            <span className="block h-full w-full bg-violet-400" />
          </span>
        </div>
      </motion.div>

      {!ready ? (
        <DialogueBox
          lines={INTRO}
          onType={sfx.blip}
          onStep={() => sfx.select()}
          actions={
            <button type="button" onClick={() => { sfx.select(); setReady(true); }} className="btn-violet">
              Combattre
            </button>
          }
        />
      ) : (
        <div className="flex w-full max-w-3xl flex-col gap-6">
          <div className="min-h-32 rounded-md border-2 border-white p-6 md:min-h-40 md:p-8" aria-live="polite">
            <p className="text-2xl leading-snug text-white md:text-3xl">
              <span className="text-violet-400">* </span>
              {spared ? "Leoo955 t'épargne. Reviens quand le site sera ouvert." : reply ?? "Leoo955 te barre la route."}
            </p>
          </div>
          {spared ? (
            <button type="button" onClick={() => { sfx.select(); onLeave(); }} className="btn-violet self-start">
              Retour
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <button type="button" onClick={() => act("attack")} className={btn}>Attaquer</button>
              <button type="button" onClick={() => act("act")} className={btn}>Agir</button>
              <button type="button" onClick={() => act("item")} className={btn}>Objet</button>
              <button type="button" onClick={spare} className={btn}>Épargner</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ClosedPage() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const { discordUrl } = useSettings();
  const [retries, setRetries] = useState(0);
  const [whys, setWhys] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [phase, setPhase] = useState<"idle" | "encounter" | "battle">("idle");

  useEffect(() => {
    const load = () => {
      new Image().src = SKIN;
      preloadSounds();
    };
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(load);
      return () => window.cancelIdleCallback(id);
    }
    const t = setTimeout(load, 500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase !== "idle" || retries < NEED_RETRY || whys < NEED_WHY) return;
    const t = setTimeout(() => setPhase(reduce ? "battle" : "encounter"), 0);
    return () => clearTimeout(t);
  }, [retries, whys, phase, reduce]);

  useEffect(() => {
    if (phase !== "encounter") return;
    sfx.encounter();
    const t = setTimeout(() => setPhase("battle"), 1100);
    return () => clearTimeout(t);
  }, [phase]);

  const retry = async () => {
    setRetries((n) => n + 1);
    setChecking(true);
    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      const { closed } = await res.json();
      if (!closed) {
        router.replace("/");
        return;
      }
      setMsg(RETRY_MSG[Math.min(retries, RETRY_MSG.length - 1)]);
    } catch {
      setMsg("Impossible de vérifier pour l'instant.");
    } finally {
      setChecking(false);
    }
  };

  const leave = () => {
    setPhase("idle");
    setRetries(0);
    setWhys(0);
    setMsg(null);
  };

  return (
    <div className="mx-auto flex min-h-svh max-w-7xl flex-col justify-center px-5 py-16 md:px-10">
      <p className="text-sm font-medium text-violet-400">Paranoia Studio</p>
      <h1 className="mt-4 text-[clamp(3rem,11vw,9rem)] font-extrabold leading-[0.9] tracking-[-0.045em] text-white">
        Désolé,
        <br />
        le site est fermé.
      </h1>
      <p className="mt-8 max-w-lg text-lg text-zinc-300">Il revient bientôt. En attendant, les nouvelles passent sur Discord.</p>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={retry} disabled={checking} className="btn-violet disabled:opacity-60">
          Réessayer
        </button>
        <button type="button" onClick={() => setWhys((n) => n + 1)} aria-expanded={whys > 0} className="btn-line">
          Pourquoi ?
        </button>
        <a href={discordUrl} target="_blank" rel="noopener noreferrer" className="btn-line">
          Discord
        </a>
      </div>

      <div className="mt-6 min-h-12 text-zinc-300" aria-live="polite">
        {msg && <p>{msg}</p>}
        {whys > 0 && <p className="mt-2 text-zinc-400">Le studio fait des travaux. Rien de grave, juste du rangement.</p>}
      </div>

      <button
        type="button"
        onClick={() => signIn("discord")}
        className="mt-16 min-h-11 self-start text-sm text-zinc-400 underline-offset-4 hover:text-white hover:underline"
      >
        Connexion staff
      </button>

      <AnimatePresence>
        {phase === "encounter" && (
          <motion.div
            key="encounter"
            className="fixed inset-0 z-[310] flex items-center justify-center bg-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.05 }}
            aria-hidden
          >
            <span className="encounter-heart text-6xl text-violet-400">♥</span>
          </motion.div>
        )}
      </AnimatePresence>
      {phase === "battle" && <Battle onLeave={leave} />}
    </div>
  );
}

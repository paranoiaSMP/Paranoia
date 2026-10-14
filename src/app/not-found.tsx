"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import DialogueBox from "@/components/common/DialogueBox";
import EnderVoid from "@/components/common/EnderVoid";

const LINES = [
  "Euh.",
  "Cette page n'existe pas.",
  "Ou alors on l'a cassée. Les deux sont possibles.",
  "Bref, t'es au mauvais endroit.",
  "Le plus simple, c'est de repartir de l'accueil.",
];

const WALL = [
  "Ça fait mal à la main.",
  "Toujours un mur.",
  "Ça ne l'a pas réparé.",
  "T'as fini ?",
];

let roll: boolean | null = null;
const subscribe = () => () => {};
const getSnapshot = () => (roll ??= Math.random() < 0.05);
const getServerSnapshot = () => false;

export default function NotFound() {
  const rare = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [hits, setHits] = useState(0);
  const [step, setStep] = useState(0);

  if (rare) return <EnderVoid />;

  return (
    <div className="mx-auto flex min-h-[calc(100svh-4rem)] max-w-7xl flex-col items-center justify-center gap-10 px-5 py-16 md:px-10">
      <p aria-hidden className="text-7xl font-extrabold tracking-[-0.06em] text-white md:text-9xl">
        {step >= 3 || hits > 0 ? "•_•" : "•ᴗ•"}
      </p>

      <DialogueBox
        lines={LINES}
        onStep={setStep}
        actions={
          <>
            <Link href="/" className="btn-violet">
              Retour à l&apos;accueil
            </Link>
            <button type="button" onClick={() => setHits((n) => n + 1)} className="btn-line">
              Frapper le mur
            </button>
            {hits > 0 && (
              <p role="status" className="text-zinc-300 sm:ml-2">
                * {WALL[Math.min(hits - 1, WALL.length - 1)]}
              </p>
            )}
          </>
        }
      />
    </div>
  );
}

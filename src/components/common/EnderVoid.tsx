"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "framer-motion";
import DialogueBox from "@/components/common/DialogueBox";

const LINES = [
  "...",
  "T'as creusé tout droit, hein.",
  "Bedrock percée. Bravo.",
  "Y'a plus rien en dessous. Que du vide.",
  "Tu prends des dégâts, là, d'ailleurs.",
  "Une perle. Vite.",
  "Il te regarde.",
];

const STAY = [
  "Ça tape toujours.",
  "Il s'est rapproché.",
  "Lance la perle.",
];

export default function EnderVoid() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const eyesRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [thrown, setThrown] = useState(false);
  const [stayed, setStayed] = useState(0);
  const hostile = step >= 5;

  useEffect(() => {
    if (reduce) return;
    const onMove = (e: PointerEvent) => {
      const el = eyesRef.current;
      if (!el) return;
      const dx = (e.clientX / window.innerWidth - 0.5) * 28;
      const dy = (e.clientY / window.innerHeight - 0.5) * 18;
      el.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduce]);

  useEffect(() => {
    if (!thrown) return;
    const t = setTimeout(() => router.push("/"), reduce ? 200 : 900);
    return () => clearTimeout(t);
  }, [thrown, router, reduce]);

  return (
    <div
      className={`relative flex min-h-[calc(100svh-4rem)] flex-col items-center justify-center gap-12 overflow-hidden px-5 py-16 transition-opacity duration-700 ${
        thrown ? "opacity-0" : "opacity-100"
      }`}
    >
      <div ref={eyesRef} aria-hidden className="flex gap-8 transition-transform duration-200 ease-out">
        {[0, 1].map((i) => (
          <span
            key={i}
            className={`block bg-violet-400 transition-all duration-500 ${
              hostile ? "h-5 w-12 md:h-6 md:w-16" : "h-2.5 w-8 md:h-3 md:w-10"
            }`}
          />
        ))}
      </div>

      <DialogueBox
        lines={LINES}
        onStep={setStep}
        speed={44}
        actions={
          <>
            <button type="button" onClick={() => setThrown(true)} className="btn-violet">
              Lancer la perle
            </button>
            <button type="button" onClick={() => setStayed((n) => n + 1)} className="btn-line">
              Rester dans le vide
            </button>
            {stayed > 0 && (
              <p role="status" className="text-zinc-300 sm:ml-2">
                * {STAY[Math.min(stayed - 1, STAY.length - 1)]}
              </p>
            )}
          </>
        }
      />
    </div>
  );
}

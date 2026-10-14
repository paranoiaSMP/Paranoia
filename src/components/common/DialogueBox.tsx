"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";

export default function DialogueBox({
  lines,
  onStep,
  actions,
  speed = 38,
  onType,
}: {
  lines: string[];
  onStep?: (index: number) => void;
  actions: ReactNode;
  speed?: number;
  onType?: () => void;
}) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [chars, setChars] = useState(0);

  const text = lines[index];
  const typing = !reduce && chars < text.length;
  const lastLine = index === lines.length - 1;
  const finished = !typing && lastLine;

  useEffect(() => {
    if (reduce || chars >= text.length) return;
    const t = setTimeout(() => {
      if (chars % 2 === 0 && text[chars] !== " ") onType?.();
      setChars((c) => c + 1);
    }, speed);
    return () => clearTimeout(t);
  }, [chars, text, speed, reduce, onType]);

  const advance = useCallback(() => {
    if (typing) {
      setChars(text.length);
    } else if (!lastLine) {
      const next = index + 1;
      setIndex(next);
      setChars(0);
      onStep?.(next);
    }
  }, [typing, text, lastLine, index, onStep]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const el = document.activeElement;
      if (el && (el.tagName === "A" || el.tagName === "BUTTON")) return;
      e.preventDefault();
      advance();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [advance]);

  const shown = reduce ? text : text.slice(0, chars);

  return (
    <div className="w-full max-w-3xl">
      <div
        onClick={advance}
        className="relative min-h-44 cursor-pointer rounded-md border-2 border-white bg-black p-6 md:min-h-52 md:p-10"
      >
        <p className="sr-only" aria-live="polite">
          {text}
        </p>
        <p aria-hidden className="text-2xl font-medium leading-snug tracking-tight text-white md:text-4xl">
          <span className="text-violet-400">* </span>
          {shown}
          {typing && <span className="ml-0.5 inline-block h-[1em] w-[0.5em] translate-y-[0.15em] bg-white" />}
        </p>
        {!typing && !lastLine && (
          <span aria-hidden className="absolute bottom-4 right-6 animate-pulse text-violet-400">
            ▼
          </span>
        )}
      </div>

      <div className="mt-6 flex min-h-12 flex-col gap-3 sm:flex-row sm:items-center">
        {finished ? (
          actions
        ) : (
          <button type="button" onClick={advance} className="btn-line">
            {typing ? "Passer" : "Suivant"}
          </button>
        )}
      </div>
    </div>
  );
}

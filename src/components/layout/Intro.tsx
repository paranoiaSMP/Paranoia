"use client";

import { useEffect, useRef } from "react";

const WORD = "PARANOIA";

export default function Intro() {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (!root.hasAttribute("data-intro")) return;

    const end = () => {
      root.removeAttribute("data-intro");
      root.removeAttribute("data-intro-skip");
      cleanup();
    };
    const skip = () => {
      if (root.hasAttribute("data-intro-skip")) return;
      root.setAttribute("data-intro-skip", "");
      setTimeout(end, 220);
    };
    const onAnimEnd = (e: AnimationEvent) => {
      if (e.animationName === "intro-open-bottom") end();
    };
    const fallback = setTimeout(end, 3000);
    const panel = bottomRef.current;

    panel?.addEventListener("animationend", onAnimEnd);
    window.addEventListener("pointerdown", skip);
    window.addEventListener("keydown", skip);
    window.addEventListener("wheel", skip, { passive: true });
    window.addEventListener("touchmove", skip, { passive: true });

    function cleanup() {
      clearTimeout(fallback);
      panel?.removeEventListener("animationend", onAnimEnd);
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("wheel", skip);
      window.removeEventListener("touchmove", skip);
    }
    return cleanup;
  }, []);

  return (
    <div className="intro" aria-hidden>
      <div className="intro-panel intro-top" />
      <div ref={bottomRef} className="intro-panel intro-bottom" />
      <div className="intro-line" />
      <div className="intro-word-wrap">
        <div className="intro-word">
          {WORD.split("").map((ch, i) => (
            <span key={i} className="intro-letter-mask">
              <span className="intro-letter" style={{ ["--i" as string]: i }}>
                {ch}
              </span>
            </span>
          ))}
        </div>
      </div>
      <p className="intro-sub">Studio</p>
    </div>
  );
}

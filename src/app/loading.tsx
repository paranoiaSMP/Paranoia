"use client";

import { GtaViPoster } from "@/components/ui/gta-vi-poster";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center overflow-hidden bg-black">
      <GtaViPoster 
        duration={2.5}
        showReplay={false}
        background="var(--bg-color)"
      />
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

const W = 1500;
const H = 500; // bandeau 3:1

/** Recadrage de bannière : glisser pour déplacer, curseur pour zoomer. Exporte un WebP 1500×500. */
export default function BannerCrop({ file, onDone, onCancel }: { file: File; onDone: (b: Blob) => void; onCancel: () => void }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 }); // décalage du centre, en pixels du cadre d'export
  const drag = useRef<{ x: number; y: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const i = new Image();
    i.onload = () => setImg(i);
    i.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!img) return null;
  const base = Math.max(W / img.width, H / img.height);
  const s = base * zoom;
  // Garde l'image couvrant tout le cadre.
  const clamp = (p: { x: number; y: number }) => ({
    x: Math.max(-(img.width * s - W) / 2, Math.min((img.width * s - W) / 2, p.x)),
    y: Math.max(-(img.height * s - H) / 2, Math.min((img.height * s - H) / 2, p.y)),
  });
  const p = clamp(pos);
  const ratio = () => W / (box.current?.clientWidth || W);

  const done = () => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    c.getContext("2d")!.drawImage(img, (W - img.width * s) / 2 + p.x, (H - img.height * s) / 2 + p.y, img.width * s, img.height * s);
    c.toBlob((b) => b && onDone(b), "image/webp", 0.9);
  };

  return (
    <div className="mt-3 rounded-lg border border-zinc-700 p-3">
      <div
        ref={box}
        className="relative aspect-[3/1] w-full cursor-grab touch-none overflow-hidden rounded-md bg-black active:cursor-grabbing"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY }; }}
        onPointerUp={() => (drag.current = null)}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const k = ratio();
          const d = { x: (e.clientX - drag.current.x) * k, y: (e.clientY - drag.current.y) * k };
          drag.current = { x: e.clientX, y: e.clientY };
          setPos(clamp({ x: p.x + d.x, y: p.y + d.y }));
        }}
      >
        <img
          src={img.src}
          alt=""
          draggable={false}
          className="pointer-events-none absolute max-w-none select-none"
          style={{ width: `${(img.width * s * 100) / W}%`, left: `${50 + (p.x * 100) / W}%`, top: `${50 + (p.y * 100) / H}%`, transform: "translate(-50%, -50%)" }}
        />
      </div>
      <label className="mt-3 flex items-center gap-3 text-sm text-zinc-300">
        Zoom
        <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(+e.target.value)} className="flex-1" />
      </label>
      <div className="mt-3 flex gap-3">
        <button type="button" onClick={done} className="btn-line">Valider le recadrage</button>
        <button type="button" onClick={onCancel} className="min-h-11 px-3 text-sm text-zinc-400 hover:text-white">Annuler</button>
      </div>
    </div>
  );
}

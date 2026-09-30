"use client";

import React, { useEffect, useRef } from "react";

interface PlayerSkinViewProps {
  uuid?: string | null;
  minecraftName?: string | null;
  customSkinUrl?: string | null;
  size?: number;
  type?: "face" | "bust";
  className?: string;
}

export default function PlayerSkinView({
  uuid,
  minecraftName,
  customSkinUrl,
  size = 48,
  type = "face",
  className = "",
}: PlayerSkinViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!customSkinUrl || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = customSkinUrl;
    img.onload = () => {
      ctx.clearRect(0, 0, size, size);

      if (type === "bust") {

        const headSize = Math.round(size * 0.65);
        const headOffset = Math.round((size - headSize) / 2);

        ctx.drawImage(img, 8, 8, 8, 8, headOffset, 0, headSize, headSize);

        ctx.drawImage(img, 40, 8, 8, 8, headOffset, 0, headSize, headSize);

        const bodyWidth = Math.round(size * 0.85);
        const bodyHeight = size - headSize;
        const bodyX = Math.round((size - bodyWidth) / 2);
        ctx.drawImage(img, 20, 20, 8, 8, bodyX, headSize - 2, bodyWidth, bodyHeight + 2);
      } else {

        ctx.drawImage(img, 8, 8, 8, 8, 0, 0, size, size);

        ctx.drawImage(img, 40, 8, 8, 8, 0, 0, size, size);
      }
    };
  }, [customSkinUrl, size, type]);

  if (customSkinUrl) {
    return (
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className={`inline-block ${className}`}
        style={{
          imageRendering: "pixelated",
          width: size,
          height: size,
        }}
        title={`${minecraftName || "Joueur"} (Skin personnalisé)`}
      />
    );
  }

  const identifier = uuid ? uuid.replace(/-/g, "") : minecraftName || "Steve";
  const defaultUrl = `https://vzge.me/${type}/512/${identifier}.png`;

  return (
    <img
      src={defaultUrl}
      alt={minecraftName || "Player Skin"}
      width={size}
      height={size}
      className={`inline-block object-contain ${className}`}
      loading="lazy"
      onError={(e) => {
        if (minecraftName) {
          e.currentTarget.src = `https://minotar.net/armor/body/${minecraftName}/512.png`;
        }
      }}
    />
  );
}

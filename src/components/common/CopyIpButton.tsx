"use client";

import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import { siteConfig } from "@/config/site";

interface CopyIpButtonProps {
  className?: string;
  variant?: "hero" | "badge" | "compact";
}

export default function CopyIpButton({
  className = "",
  variant = "hero",
}: CopyIpButtonProps) {
  const [copied, setCopied] = useState(false);
  const ip = siteConfig.serverIp;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(ip);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = ip;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (variant === "badge") {
    return (
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? "IP copiée" : "Copier l'IP"}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-zinc-900 border border-zinc-800 hover:border-purple-500/40 text-zinc-300 hover:text-white transition-all cursor-pointer ${className}`.trim()}
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-400">Copié !</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5 text-zinc-400" />
            <span>{ip}</span>
          </>
        )}
      </button>
    );
  }

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? "IP copiée" : "Copier l'IP"}
        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
          copied
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            : "bg-[#111118] border-zinc-800 hover:border-purple-500/50 text-white hover:bg-zinc-900"
        } ${className}`.trim()}
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Copié !</span>
          </>
        ) : (
          <>
            <Copy className="w-4 h-4 text-zinc-400" />
            <span>Copier l'IP</span>
          </>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "IP copiée" : "Copier l'IP du serveur"}
      className={`group flex items-center justify-between gap-3 sm:gap-4 px-4 py-3 rounded-xl bg-[#111118] border-2 border-zinc-800 hover:border-purple-500/60 transition-all shadow-lg cursor-pointer ${className}`.trim()}
    >
      <div className="flex items-center gap-2.5">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="font-mono text-sm sm:text-base font-bold text-white tracking-wide">
          {ip}
        </span>
      </div>

      <div className="flex items-center gap-1.5 pl-3 border-l border-zinc-800 group-hover:border-purple-500/30 transition-colors">
        {copied ? (
          <>
            <Check className="w-4 h-4 text-emerald-400 transition-transform scale-110" />
            <span className="text-xs sm:text-sm font-bold text-emerald-400">Copié !</span>
          </>
        ) : (
          <>
            <Copy className="w-4 h-4 text-zinc-400 group-hover:text-purple-400 transition-colors" />
            <span className="text-xs sm:text-sm font-semibold text-zinc-400 group-hover:text-white transition-colors">
              Copier
            </span>
          </>
        )}
      </div>
    </button>
  );
}

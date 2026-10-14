"use client";

import { useEffect } from "react";

export default function ConsoleEasterEgg() {
  useEffect(() => {
    if (typeof window === "undefined" || (window as any).__PARANOIA_CONSOLE_INIT) return;
    (window as any).__PARANOIA_CONSOLE_INIT = true;

    const banner = `
   ____                                  _       
  |  _ \\  __ _  _ __  __ _  _ __    ___ (_)  __ _ 
  | |_) |/ _\` || '__|/ _\` || '_ \\  / _ \\| | / _\` |
  |  __/| (_| || |  | (_| || | | || (_) | || (_| |
  |_|    \\__,_||_|   \\__,_||_| |_| \\___/ |_| \\__,_|
                                  S T U D I O
`;

    console.log(
      `%c${banner}`,
      "color: #a78bfa; font-weight: 900; font-family: monospace; line-height: 1.2;"
    );

    console.log(
      "%c PARANOIA STUDIO %c v2.0 %c paranoiastudio.fr ",
      "background: #7c3aed; color: #ffffff; font-weight: 800; padding: 4px 8px; border-radius: 4px 0 0 4px; font-family: sans-serif;",
      "background: #18181b; color: #a1a1aa; padding: 4px 8px; font-family: sans-serif;",
      "background: #27272a; color: #e4e4e7; padding: 4px 8px; border-radius: 0 4px 4px 0; font-family: sans-serif;"
    );

    console.log(
      "\n%c✨ Tu aimes inspecter le code ?%c\nNous concevons des expériences Minecraft & web de haut niveau. Si tu es développeur ou créateur, rejoins l'aventure : %chttps://discord.gg/FP8rYZYRe7\n",
      "color: #a78bfa; font-weight: bold; font-size: 13px;",
      "color: #d4d4d8; font-size: 12px;",
      "color: #38bdf8; font-weight: bold; text-decoration: underline; font-size: 12px;"
    );

    console.log(
      "%c⚠️ ATTENTION DE SÉCURITÉ :%c\nNe colle JAMAIS de code inconnu ici. Quiconque te demande d'exécuter un script dans cette console tente de voler ton compte ou tes ParaCoins (Attaque Self-XSS).\n",
      "color: #ef4444; font-weight: 900; font-size: 13px; background: rgba(239, 68, 68, 0.1); padding: 2px 6px; border-radius: 4px;",
      "color: #a1a1aa; font-size: 11px;"
    );
  }, []);

  return null;
}

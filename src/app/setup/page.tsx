"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "framer-motion";
import toast from "react-hot-toast";
import SplitReveal from "@/components/motion/SplitReveal";
import { EASE_OUT } from "@/lib/motion";

const NAME = /^[A-Za-z0-9_]{3,16}$/;

export default function SetupPage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const reduce = useReducedMotion();
  const field = useAnimationControls();

  const [name, setName] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [previewOk, setPreviewOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const valid = NAME.test(name);

  useEffect(() => {
    const t = setTimeout(() => {
      setPreviewOk(false);
      setPreview(valid ? name : null);
    }, 450);
    return () => clearTimeout(t);
  }, [name, valid]);

  const shake = () => {
    if (reduce) return;
    field.start({
      transform: ["translateX(0px)", "translateX(-8px)", "translateX(6px)", "translateX(-3px)", "translateX(0px)"],
      transition: { duration: 0.3, ease: EASE_OUT },
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) {
      setError("Un pseudo Minecraft fait 3 à 16 caractères : lettres, chiffres ou _.");
      shake();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/user/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minecraftName: name }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Erreur, réessaie.");
      const data = await res.json();
      await update();
      toast.success(`Compte lié : ${data.minecraftName}`);
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      shake();
    } finally {
      setBusy(false);
    }
  };

  if (status === "loading") {
    return (
      <div role="status" className="mx-auto max-w-7xl px-5 py-24 md:px-10">
        <div className="h-16 w-2/3 animate-pulse rounded-sm bg-zinc-900" />
        <span className="sr-only">Chargement</span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto flex min-h-[70svh] max-w-7xl flex-col justify-center gap-6 px-5 md:px-10">
        <h1 className="text-5xl font-extrabold tracking-[-0.045em] text-white md:text-7xl">Connecte-toi d&apos;abord.</h1>
        <button type="button" onClick={() => signIn("discord")} className="btn-violet self-start">
          Connexion Discord
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto grid min-h-[calc(100svh-4rem)] max-w-7xl grid-cols-1 items-center gap-12 px-5 py-16 md:px-10 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <p className="text-sm font-medium text-violet-400">Dernière étape</p>
        <SplitReveal
          lines={["Lie ton compte", "Minecraft."]}
          className="mt-4 text-[clamp(3rem,9vw,7rem)] font-extrabold leading-[0.9] tracking-[-0.045em] text-white"
        />
        <p className="mt-8 max-w-lg text-lg leading-relaxed text-zinc-300">
          Ton pseudo sert à afficher ton skin sur tes cartes et ton profil, et à te reconnaître dans les jeux.
        </p>

        <form onSubmit={submit} noValidate className="mt-10 flex max-w-lg flex-col gap-3">
          <label htmlFor="mc" className="text-sm font-medium text-zinc-200">
            Pseudo Minecraft
          </label>
          <motion.div animate={field} className="flex flex-col gap-3 sm:flex-row">
            <input
              id="mc"
              name="minecraftName"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              maxLength={16}
              value={name}
              onChange={(e) => {
                setName(e.target.value.replace(/\s/g, ""));
                setError(null);
              }}
              aria-invalid={!!error}
              aria-describedby="mc-help"
              placeholder="Steve"
              className={`min-h-12 flex-1 rounded-md border bg-black px-4 text-lg font-semibold text-white placeholder:text-zinc-400 focus-visible:border-violet-400 ${
                error ? "border-red-500" : "border-zinc-500"
              }`}
            />
            <button type="submit" disabled={busy || !name} className="btn-violet min-h-12 disabled:opacity-50">
              {busy ? "Vérification…" : "Lier mon compte"}
            </button>
          </motion.div>
          <p id="mc-help" role={error ? "alert" : undefined} className={`min-h-6 text-sm ${error ? "text-red-400" : "text-zinc-400"}`}>
            {error ?? "Le pseudo est vérifié auprès de Mojang."}
          </p>
        </form>

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="mt-6 min-h-11 text-sm text-zinc-400 underline-offset-4 hover:text-white hover:underline"
        >
          Se déconnecter
        </button>
      </div>

      <div className="flex justify-center lg:col-span-5">
        <div className="relative flex aspect-[3/4] w-full max-w-xs items-end justify-center overflow-hidden rounded-xl border border-zinc-800 bg-[#0b0b0d]">
          <AnimatePresence mode="wait">
            {preview ? (
              <motion.div
                key={preview}
                className="absolute inset-0 flex items-end justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <motion.img
                  src={`https://vzge.me/bust/512/${encodeURIComponent(preview)}.png`}
                  alt={`Skin de ${preview}`}
                  className="h-[85%] w-auto object-contain"
                  initial={reduce ? false : { opacity: 0, transform: "translateY(24px) scale(0.96)" }}
                  animate={previewOk ? { opacity: 1, transform: "translateY(0px) scale(1)" } : { opacity: 0 }}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  onLoad={() => setPreviewOk(true)}
                  onError={() => setPreviewOk(false)}
                />
                <p className="absolute left-0 right-0 top-5 text-center text-lg font-bold text-white">{preview}</p>
              </motion.div>
            ) : (
              <motion.p
                key="empty"
                className="absolute inset-0 flex items-center justify-center px-8 text-center text-sm text-zinc-400"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Ton skin s&apos;affichera ici.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

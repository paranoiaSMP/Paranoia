"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Check } from "lucide-react";

export default function SetupPage() {
  const router = useRouter();
  const { update } = useSession();
  const [pseudo, setPseudo] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pseudo.length < 3) {
      setError("Le pseudo doit contenir au moins 3 caractères.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/user/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minecraftName: pseudo }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Erreur lors de l'enregistrement");
      }

      await update({ minecraftName: pseudo });

      window.location.href = "/";
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 animate-slide-up">
      <div className="panel-matte p-8 md:p-12 rounded-2xl w-full max-w-md text-center">
        <div className="w-16 h-16 bg-[var(--color-bg-elevated)] rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="w-8 h-8 text-[var(--color-accent-purple)]" />
        </div>
        <h1 className="text-3xl font-outfit font-black text-white mb-2">Bienvenue</h1>
        <p className="text-[var(--color-text-secondary)] mb-8">
          Avant de continuer, veuillez lier votre pseudo Minecraft à votre compte.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="text-left">
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              Pseudo Minecraft
            </label>
            <input
              type="text"
              required
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              disabled={isLoading}
              className="w-full bg-[var(--color-bg-elevated)] border border-[var(--color-border-color)] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[var(--color-accent-purple)] transition-colors"
              placeholder="Ex: Notch"
            />
          </div>

          {error && <p className="text-red-500 text-sm text-left">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-primary py-3 flex justify-center"
          >
            {isLoading ? "Enregistrement..." : "Confirmer"}
          </button>
        </form>
      </div>
    </div>
  );
}
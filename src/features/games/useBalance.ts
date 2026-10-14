"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRealtime } from "@/lib/realtime/client";
import { useWalletStore } from "@/lib/realtime/wallet-store";

export function useBalance() {
  const { status } = useSession();
  const coins = useWalletStore((s) => s.coins);
  const apply = useWalletStore((s) => s.apply);
  const setCoins = useWalletStore((s) => s.setCoins);
  const [error, setError] = useState(false);

  useRealtime("wallet", apply, status === "authenticated");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/packs");
      if (!res.ok) throw new Error();
      apply(await res.json());
      setError(false);
    } catch {
      setError(true);
    }
  }, [apply]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const t = setTimeout(() => {
      if (!useWalletStore.getState().loaded) refresh();
    }, 1500);
    return () => clearTimeout(t);
  }, [status, refresh]);

  return { coins, set: setCoins, refresh, error, status };
}

export const fmt = (n: number) => n.toLocaleString("fr-FR");

"use client";

import { useCallback, useEffect, useState } from "react";
import { BOOSTER_PACKS, type BoosterPackConfig } from "@/config/boosters";
import type { BoosterStates } from "@/lib/boosters-types";

// Tant que l'état n'est pas chargé (ou si l'appel échoue), seuls les boosters de base sont proposés.
export function useBoosterStates() {
  const [states, setStates] = useState<BoosterStates | null>(null);
  const refresh = useCallback(() => {
    fetch("/api/boosters/state", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setStates(d))
      .catch(() => {});
  }, []);
  useEffect(refresh, [refresh]);
  const packs: BoosterPackConfig[] = Object.values(BOOSTER_PACKS).filter((p) =>
    states ? states[p.id].visible : !p.seasonal
  );
  return { states, packs, refresh };
}

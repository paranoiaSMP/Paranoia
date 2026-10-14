"use client";

import { create } from "zustand";

type WalletState = {
  coins: number | null;
  boxes: Record<string, number>;
  loaded: boolean;
  apply: (s: { paraCoins?: number; boxes?: Record<string, number> }) => void;
  setCoins: (n: number | null) => void;
};

export const useWalletStore = create<WalletState>((set) => ({
  coins: null,
  boxes: {},
  loaded: false,
  apply: (s) =>
    set((prev) => ({
      coins: s.paraCoins ?? prev.coins,
      boxes: s.boxes ?? prev.boxes,
      loaded: true,
    })),
  setCoins: (coins) => set({ coins }),
}));

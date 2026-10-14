"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import toast from "react-hot-toast";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  BOOSTER_DROP_RATES,
  BOOSTER_PACKS,
  CARD_RARITIES,
  type BoosterPackConfig,
  type BoosterPackId,
} from "@/config/boosters";
import { TradingCard } from "@/types/cards";
import { PackOpener, type OpenedCard } from "@/components/tcg/PackOpener";
import BoosterStage from "@/components/tcg/BoosterStage";
import CollectionShowcase from "@/components/tcg/CollectionShowcase";
import SplitReveal from "@/components/motion/SplitReveal";
import AnimatedNumber from "@/components/motion/AnimatedNumber";
import { useRealtime } from "@/lib/realtime/client";
import { useWalletStore } from "@/lib/realtime/wallet-store";
import Reveal from "@/components/common/Reveal";

const PACKS = Object.values(BOOSTER_PACKS);

const RARITY_MAP: Record<string, string> = {
  Commune: "COMMON",
  "Peu Commune": "UNCOMMON",
  Rare: "RARE",
  Épique: "EPIC",
  Légendaire: "LEGENDARY",
  Mythique: "MYTHIC",
};

function rollCards(pack: BoosterPackConfig): TradingCard[] {
  return Array.from({ length: pack.cardsPerPack }, (_, i) => {
    const r = Math.random() * 100;
    let acc = 0;
    let rarity = "COMMON";
    for (const rate of pack.rates) {
      acc += rate.rateNum;
      if (r <= acc) {
        rarity = RARITY_MAP[rate.rarity] ?? "COMMON";
        break;
      }
    }
    const n = Math.floor(Math.random() * 99) + 1;

    return {
      id: `card-${i}-${Date.now()}`,
      title: `Joueur ${n}`,
      player: { id: `sim-${n}`, minecraftName: n % 2 ? "MHF_Steve" : "MHF_Alex" },
      description: "Carte d'exemple tirée par la simulation.",
      imageUrl: null,
      renderedImageUrl: null,
      layer1Url: null,
      layer2Url: null,
      layer3Url: null,
      customBackground: null,
      customBadges: "[]",
      rarity,
      level: "Normal",
      edition: pack.name,
      proba: 0,
      attributes: "{}",
      template: "default",
      isPublished: true,
      isVariant: false,
      specialEffect:
        rarity === "MYTHIC" ? "Cosmic" : rarity === "LEGENDARY" ? "Holo" : rarity === "EPIC" ? "Glitch" : null,
    } as TradingCard;
  });
}

type Inventory = { boxes: Record<string, number>; paraCoins: number };
type Opening = { pack: BoosterPackConfig; simulated: boolean; run: number };

async function openReal(pack: BoosterPackConfig): Promise<OpenedCard[]> {
  const res = await fetch("/api/packs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ boxType: pack.id }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "L'ouverture a échoué.");
  return (data.userCards ?? []).map((uc: { tradingCard: TradingCard; specialEffect: string | null }) => ({
    card: uc.tradingCard,
    effect: uc.specialEffect,
  }));
}

const MAX_RATE = Math.max(...PACKS.flatMap((p) => Object.values(BOOSTER_DROP_RATES[p.id])));

export default function CardsPageRoute() {
  return (
    <Suspense>
      <CardsPage />
    </Suspense>
  );
}

function CardsPage() {
  const reduce = useReducedMotion();
  const params = useSearchParams();
  const fromUrl = params.get("edition");
  const [activeId, setActiveId] = useState<BoosterPackId>(
    fromUrl && fromUrl in BOOSTER_PACKS ? (fromUrl as BoosterPackId) : "standard"
  );
  const [opening, setOpening] = useState<Opening | null>(null);
  const { status } = useSession();
  const coins = useWalletStore((s) => s.coins);
  const boxes = useWalletStore((s) => s.boxes);
  const loaded = useWalletStore((s) => s.loaded);
  const applyWallet = useWalletStore((s) => s.apply);
  const [failed, setFailed] = useState(false);
  const [buying, setBuying] = useState(false);

  const inventory: Inventory | null = loaded && coins !== null ? { boxes, paraCoins: coins } : null;
  const invState: "idle" | "loading" | "error" = inventory ? "idle" : failed ? "error" : "loading";

  const active = BOOSTER_PACKS[activeId];
  const rates = BOOSTER_DROP_RATES[activeId];
  const owned = inventory?.boxes[activeId] ?? 0;

  useRealtime("wallet", applyWallet, status === "authenticated");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/packs");
      if (!res.ok) throw new Error();
      applyWallet(await res.json());
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [applyWallet]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const t = setTimeout(() => {
      if (!useWalletStore.getState().loaded) refresh();
    }, 1500);
    return () => clearTimeout(t);
  }, [status, refresh]);

  const open = (pack: BoosterPackConfig, simulated: boolean) => {
    setOpening((o) => ({ pack, simulated, run: (o?.run ?? 0) + 1 }));
  };

  const close = () => {
    setOpening(null);
  };

  const buy = async () => {
    setBuying(true);
    try {
      const res = await fetch("/api/boosters/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boxType: activeId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Achat impossible.");
      toast.success(`Booster ${active.name} acheté.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Achat impossible.");
    } finally {
      setBuying(false);
    }
  };

  const spring = reduce
    ? { duration: 0.15 }
    : ({ type: "spring", bounce: 0, duration: 0.45 } as const);

  return (
    <div className="min-h-screen bg-black text-white">
      <section className="border-b border-zinc-900">
        <div className="mx-auto max-w-7xl px-5 pb-14 pt-16 md:px-10 md:pb-20 md:pt-24">
          <SplitReveal
            lines={[<>Cartes<span key="d" className="text-violet-400">.</span></>]}
            className="text-[clamp(3.5rem,12vw,9rem)] font-extrabold leading-[0.9] tracking-[-0.045em]"
          />
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-zinc-300">
            Quatre boosters, six raretés. Choisis une édition, regarde les probabilités, puis ouvre-la pour voir ce que ça donne.
          </p>
        </div>
      </section>

      <section className="border-b border-zinc-900 bg-[#0b0b0d]">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-5 py-16 md:grid-cols-12 md:px-10 md:py-24">
          <div className="md:col-span-5">
            <div role="group" aria-label="Édition du booster" className="grid grid-cols-2 gap-2 md:grid-cols-1">
              {PACKS.map((pack, i) => {
                const selected = pack.id === activeId;
                return (
                  <button
                    key={pack.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setActiveId(pack.id)}
                    className="press relative flex min-h-14 items-center justify-between rounded-md px-4 text-left"
                  >
                    {selected && (
                      <motion.span
                        layoutId="pack-active"
                        transition={spring}
                        className="absolute inset-0 rounded-md bg-zinc-900 ring-1 ring-zinc-700"
                      />
                    )}
                    <span className="relative flex items-baseline gap-3">
                      <span className="text-sm text-zinc-400">{String(i + 1).padStart(2, "0")}</span>
                      <span className={`text-xl font-semibold tracking-tight md:text-2xl ${selected ? "text-white" : "text-zinc-400"}`}>
                        {pack.name}
                      </span>
                    </span>
                    <span className={`relative hidden text-sm sm:block ${selected ? "text-violet-400" : "text-zinc-400"}`}>
                      {pack.price} PARA
                    </span>
                  </button>
                );
              })}
            </div>

            <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-zinc-800 pt-6">
              <div>
                <dt className="text-sm text-zinc-400">Cartes</dt>
                <dd className="mt-1 text-2xl font-semibold"><AnimatedNumber value={active.cardsPerPack} /></dd>
              </div>
              <div>
                <dt className="text-sm text-zinc-400">Prix</dt>
                <dd className="mt-1 text-2xl font-semibold"><AnimatedNumber value={active.price} suffix=" PARA" /></dd>
              </div>
              <div>
                <dt className="text-sm text-zinc-400">Mythique</dt>
                <dd className="mt-1 text-2xl font-semibold"><AnimatedNumber value={rates.MYTHIC} decimals={1} suffix=" %" /></dd>
              </div>
            </dl>

            <div className="mt-8">
              {status === "authenticated" ? (
                <>
                  <p className="text-sm text-zinc-300" aria-live="polite">
                    {invState === "loading" && !inventory && "Chargement de ton inventaire…"}
                    {invState === "error" && (
                      <>
                        Impossible de charger ton inventaire.{" "}
                        <button type="button" onClick={refresh} className="min-h-11 text-white underline underline-offset-4">
                          Réessayer
                        </button>
                      </>
                    )}
                    {inventory && (
                      <>
                        Tu as <strong className="text-white">{owned}</strong> booster{owned > 1 ? "s" : ""} {active.name} ·{" "}
                        <span className="tabular-nums">{inventory.paraCoins} PARA</span>
                      </>
                    )}
                  </p>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    {owned > 0 ? (
                      <button type="button" onClick={() => open(active, false)} className="btn-violet">
                        Ouvrir un booster {active.name}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={buy}
                        disabled={buying || !inventory || inventory.paraCoins < active.price}
                        className="btn-violet disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {buying ? "Achat…" : `Acheter pour ${active.price} PARA`}
                      </button>
                    )}
                    {owned > 0 && (
                      <button type="button" onClick={buy} disabled={buying || !inventory || inventory.paraCoins < active.price} className="btn-line disabled:cursor-not-allowed disabled:opacity-50">
                        {buying ? "Achat…" : `En acheter un (${active.price} PARA)`}
                      </button>
                    )}
                    <button type="button" onClick={() => open(active, true)} className="btn-line">
                      Simuler
                    </button>
                  </div>
                  {inventory && owned === 0 && inventory.paraCoins < active.price && (
                    <p className="mt-3 text-sm text-zinc-400">Pas assez de ParaCoins pour ce booster.</p>
                  )}
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button type="button" onClick={() => open(active, true)} className="btn-violet">
                      Simuler une ouverture
                    </button>
                    {status === "unauthenticated" && (
                      <button type="button" onClick={() => signIn("discord")} className="btn-line">
                        Connexion Discord
                      </button>
                    )}
                  </div>
                  <p className="mt-3 text-sm text-zinc-400">
                    La simulation tire des cartes d&apos;exemple. Connecte-toi pour ouvrir tes vrais boosters.
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="relative md:col-span-7">
            <BoosterStage pack={active} />
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-7xl px-5 py-16 md:px-10 md:py-24">
          <Reveal>
            <h2 className="text-4xl font-bold tracking-[-0.03em] md:text-5xl">Probabilités</h2>
          </Reveal>
          <p className="mt-4 max-w-lg text-zinc-300">
            La colonne de l&apos;édition sélectionnée est mise en avant.
          </p>

          <div className="mt-10 overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left">
              <caption className="sr-only">Probabilité de tirage par rareté et par édition</caption>
              <thead>
                <tr className="border-b border-zinc-800 text-sm text-zinc-400">
                  <th scope="col" className="py-4 pr-4 font-medium">Rareté</th>
                  {PACKS.map((p) => (
                    <th
                      key={p.id}
                      scope="col"
                      className={`px-4 py-4 font-medium ${p.id === activeId ? "text-violet-400" : ""}`}
                    >
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {CARD_RARITIES.map((rarity) => (
                  <tr key={rarity.key}>
                    <th scope="row" className="py-4 pr-4 font-semibold text-white">
                      {rarity.label}
                    </th>
                    {PACKS.map((p) => (
                      <td
                        key={p.id}
                        className={`px-4 py-4 tabular-nums ${
                          p.id === activeId ? "bg-zinc-900 font-semibold text-white" : "text-zinc-400"
                        }`}
                      >
                        <span className="flex flex-col gap-2">
                          {BOOSTER_DROP_RATES[p.id][rarity.key]}%
                          <span aria-hidden className="block h-1 w-full overflow-hidden rounded-full bg-zinc-800/60">
                            <span
                              className="block h-full origin-left rounded-full transition-transform duration-500"
                              style={{
                                transform: `scaleX(${BOOSTER_DROP_RATES[p.id][rarity.key] / MAX_RATE})`,
                                transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
                                backgroundColor: p.id === activeId ? "var(--color-accent-purple-soft)" : "#52525b",
                              }}
                            />
                          </span>
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <CollectionShowcase />

      <AnimatePresence>
        {opening && (() => {
          const { pack, simulated, run } = opening;
          const left = simulated ? Infinity : inventory?.boxes[pack.id] ?? 0;
          return (
            <PackOpener
              key={run}
              pack={pack}
              simulated={simulated}
              load={
                simulated
                  ? async () => rollCards(pack).map((card) => ({ card, effect: card.specialEffect ?? null }))
                  : async () => {
                      const result = await openReal(pack);
                      const cur = useWalletStore.getState().boxes;
                      applyWallet({ boxes: { ...cur, [pack.id]: Math.max(0, (cur[pack.id] ?? 1) - 1) } });
                      return result;
                    }
              }
              onClose={close}
              onReplay={left > 0 ? () => open(pack, simulated) : undefined}
              replayLabel={simulated ? "Nouvelle simulation" : `Ouvrir le suivant (${left})`}
            />
          );
        })()}
      </AnimatePresence>
    </div>
  );
}

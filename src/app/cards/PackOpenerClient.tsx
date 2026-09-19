"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import { TradingCard, UserCard } from "@/types/cards";
import BoosterModal from "./components/BoosterModal";
import RevealOverlay from "./components/RevealOverlay";
import CollectionTab from "./components/CollectionTab";
import CatalogueTab from "./components/CatalogueTab";
import CardDetailModal from "./components/CardDetailModal";
import RatesModal from "./components/RatesModal";
import BoosterCarousel from "./components/BoosterCarousel";
import { BOOSTER_PACKS, type BoosterPackId } from "@/config/boosters";

export default function PackOpenerClient({
  initialInventory,
  initialBoxes,
  initialCoins,
  isLoggedIn,
  allCards = [],
  allEditions = [],
}: {
  initialInventory: UserCard[];
  initialBoxes?: { boxType: string; amount: number }[];
  initialCoins: number;
  isLoggedIn: boolean;
  allCards?: TradingCard[];
  allEditions?: Array<{ id: string; name: string; iconUrl?: string | null }>;
  serverPlayers?: string[];
  currentUserMCName?: string;
}) {
  const [inventory, setInventory] = useState<UserCard[]>(initialInventory);
  const [boxes, setBoxes] = useState<{ boxType: string; amount: number }[]>(initialBoxes || []);
  const [coins, setCoins] = useState<number>(initialCoins || 0);
  const [spendingAnimations, setSpendingAnimations] = useState<{ id: number; amount: number }[]>([]);
  const [selectedBoxType, setSelectedBoxType] = useState<string>("standard");
  const [isOpening, setIsOpening] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const [drawnCards, setDrawnCards] = useState<TradingCard[]>([]);
  const [showReveal, setShowReveal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<TradingCard | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<"details" | "variants">("details");
  const [boosterStep, setBoosterStep] = useState<"idle" | "fetching" | "waiting_click" | "charging" | "exploding">("idle");
  const fetchedCardsRef = useRef<TradingCard[]>([]);

  useEffect(() => {
    if (selectedCard || isOpening || showReveal) {
      document.body.style.overflow = "hidden";
      if (selectedCard) setActiveModalTab("details");
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedCard, isOpening, showReveal]);

  const [openingGlow, setOpeningGlow] = useState<string | null>(null);
  const [forceFlipAll, setForceFlipAll] = useState(false);
  const [showRatesModal, setShowRatesModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"opener" | "collection" | "catalogue">("opener");
  const [searchQuery, setSearchQuery] = useState("");
  const [rarityFilter, setRarityFilter] = useState("ALL");
  const [filterEdition, setFilterEdition] = useState("ALL");
  const [filterEffect, setFilterEffect] = useState("ALL");
  const [selectedCatalogueEdition, setSelectedCatalogueEdition] = useState<string>("Toutes");
  const router = useRouter();

  const buyBooster = async (type: string, price: number) => {
    if (!isLoggedIn) {
      toast("Vous devez être connecté.", { icon: "⚠️", position: "top-center" });
      return;
    }
    if (coins < price) {
      toast.error("Fonds insuffisants !", { position: "top-center" });
      return;
    }
    setIsBuying(true);
    try {
      const res = await fetch("/api/boosters/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boxType: type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur d'achat");
      setCoins(data.remainingCoins);
      const animId = Date.now();
      setSpendingAnimations((prev) => [...prev, { id: animId, amount: price }]);
      setTimeout(() => {
        setSpendingAnimations((prev) => prev.filter((a) => a.id !== animId));
      }, 1500);
      setBoxes((prev) => {
        const existing = prev.find((b) => b.boxType === type);
        if (existing) return prev.map((b) => (b.boxType === type ? { ...b, amount: b.amount + 1 } : b));
        return [...prev, { boxType: type, amount: 1 }];
      });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Une erreur est survenue.", { position: "top-center" });
    } finally {
      setIsBuying(false);
    }
  };

  const openPack = async () => {
    if (!isLoggedIn) {
      toast("Vous devez être connecté pour ouvrir des boosters.", { icon: "⚠️", position: "top-center" });
      return;
    }

    const userBox = boxes.find((b) => b.boxType === selectedBoxType);
    if (!userBox || userBox.amount <= 0) {
      toast(`Vous ne possédez aucun Booster ${selectedBoxType}.`, { icon: "⚠️", position: "top-center" });
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });

    setIsOpening(true);
    setDrawnCards([]);
    setShowReveal(false);
    setForceFlipAll(false);
    setOpeningGlow(null);
    setBoosterStep("fetching");

    try {
      const res = await fetch("/api/packs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boxType: selectedBoxType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Une erreur est survenue.");

      setBoxes((prev) =>
        prev.map((b) => (b.boxType === selectedBoxType ? { ...b, amount: b.amount - 1 } : b))
      );

      const cardsWithEffects: TradingCard[] = data.userCards.map((uc: UserCard) => ({
        ...uc.tradingCard,
        specialEffect: uc.specialEffect,
      }));
      fetchedCardsRef.current = cardsWithEffects;

      const hasMythic = cardsWithEffects.some((c: TradingCard) => c.rarity === "MYTHIC");
      const hasLegendary = cardsWithEffects.some((c: TradingCard) => c.rarity === "LEGENDARY");
      const hasEpic = cardsWithEffects.some((c: TradingCard) => c.rarity === "EPIC");
      const hasRare = cardsWithEffects.some((c: TradingCard) => c.rarity === "RARE");
      const hasUncommon = cardsWithEffects.some((c: TradingCard) => c.rarity === "UNCOMMON");

      if (hasMythic) setOpeningGlow("MYTHIC");
      else if (hasLegendary) setOpeningGlow("LEGENDARY");
      else if (hasEpic) setOpeningGlow("EPIC");
      else if (hasRare) setOpeningGlow("RARE");
      else if (hasUncommon) setOpeningGlow("UNCOMMON");
      else setOpeningGlow("COMMON");

      setInventory((prev) => [...data.userCards, ...prev]);
      setBoosterStep("waiting_click");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue.", { position: "top-center" });
      setIsOpening(false);
    }
  };

  const handleBoosterClick = () => {
    if (boosterStep !== "waiting_click") return;
    setBoosterStep("charging");

    setTimeout(() => {
      setBoosterStep("exploding");
    }, 1600);

    setTimeout(() => {
      setDrawnCards(fetchedCardsRef.current);
      setShowReveal(true);
      setIsOpening(false);
      setBoosterStep("idle");
      router.refresh();
    }, 2400);
  };

  const groupedInventory = useMemo(() => {
    const acc: Record<string, { card: TradingCard; count: number; latestObtained: Date; specialEffect?: string | null }> = {};

    inventory.forEach((curr: UserCard) => {
      if (!curr || !curr.tradingCard) return;
      const id = curr.tradingCard.id;
      const effect = curr.specialEffect || "none";
      const key = `${id}-${effect}`;
      if (!acc[key]) {
        acc[key] = {
          card: { ...curr.tradingCard, specialEffect: curr.specialEffect },
          count: 0,
          latestObtained: curr.obtainedAt || new Date(0),
          specialEffect: curr.specialEffect,
        };
      } else {
        acc[key].card = { ...curr.tradingCard, specialEffect: curr.specialEffect };
      }
      acc[key].count += 1;
      if (curr.obtainedAt && new Date(curr.obtainedAt) > new Date(acc[key].latestObtained)) {
        acc[key].latestObtained = curr.obtainedAt;
      }
    });
    return acc;
  }, [inventory]);

  const stackedItems = useMemo(() => {
    return Object.values(groupedInventory)
      .filter((item) => {
        const titleMatch = item.card.title ? item.card.title.toLowerCase().includes(searchQuery.toLowerCase()) : false;
        const playerMatch = item.card.player
          ? item.card.player.minecraftName.toLowerCase().includes(searchQuery.toLowerCase())
          : false;
        const matchesSearch = titleMatch || playerMatch;
        const matchesRarity = rarityFilter === "ALL" || item.card.rarity === rarityFilter;
        const matchesEdition = filterEdition === "ALL" || item.card.edition === filterEdition;
        const matchesEffect =
          filterEffect === "ALL" || item.specialEffect === filterEffect || (filterEffect === "NONE" && !item.specialEffect);
        return matchesSearch && matchesRarity && matchesEdition && matchesEffect;
      })
      .sort((a, b) => new Date(b.latestObtained).getTime() - new Date(a.latestObtained).getTime());
  }, [groupedInventory, searchQuery, rarityFilter, filterEdition, filterEffect]);

  const boxesData = useMemo(() => {
    const data: Record<string, (typeof BOOSTER_PACKS)[BoosterPackId] & { owned: number }> = {} as any;
    for (const [key, pack] of Object.entries(BOOSTER_PACKS)) {
      data[key] = {
        ...pack,
        owned: boxes.find((b) => b.boxType === key)?.amount || 0,
      };
    }
    return data;
  }, [boxes]);

  const activeBox = boxesData[selectedBoxType] || boxesData["standard"];
  const ownedVariantIds = useMemo(
    () => new Set(inventory.map((item) => item.tradingCard.id)),
    [inventory]
  );

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 w-full max-w-4xl mx-auto">
        <div className="flex items-center bg-[#111118]/90 border border-white/10 p-1.5 rounded-full backdrop-blur-2xl shadow-lg">
          <button
            onClick={() => setActiveTab("opener")}
            className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200 cursor-pointer ${
              activeTab === "opener"
                ? "bg-[#7a0aad] text-white shadow-[0_0_15px_rgba(122,10,173,0.5)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Booster
          </button>
          <button
            onClick={() => setActiveTab("collection")}
            className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200 flex items-center gap-2 cursor-pointer ${
              activeTab === "collection"
                ? "bg-[#7a0aad] text-white shadow-[0_0_15px_rgba(122,10,173,0.5)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>Collection</span>
            {inventory.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/15 text-white font-mono font-bold">
                {inventory.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("catalogue")}
            className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200 flex items-center gap-2 cursor-pointer ${
              activeTab === "catalogue"
                ? "bg-[#7a0aad] text-white shadow-[0_0_15px_rgba(122,10,173,0.5)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>Catalogue</span>
            {allCards.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/15 text-white font-mono font-bold">
                {allCards.length}
              </span>
            )}
          </button>
        </div>

        {isLoggedIn && (
          <div className="relative flex items-center gap-3 bg-[#111118]/90 border border-white/10 px-5 py-2 rounded-full backdrop-blur-2xl shadow-[0_0_25px_rgba(122,10,173,0.2)]">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-[#7a0aad] text-white font-black text-sm flex items-center justify-center shadow-inner">
              P
            </div>
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[10px] font-bold text-slate-400 tracking-wider">SOLDE</span>
              <span className="text-base font-extrabold text-white">
                {coins.toLocaleString()}
              </span>
            </div>
            <button
              onClick={() => router.push("/shop")}
              className="ml-2 w-6 h-6 rounded-full bg-purple-600/30 hover:bg-purple-600 border border-purple-500/40 text-purple-200 hover:text-white text-xs font-bold flex items-center justify-center transition-all cursor-pointer"
              title="Recharger"
            >
              +
            </button>

            <AnimatePresence>
              {spendingAnimations.map((anim) => (
                <motion.span
                  key={anim.id}
                  initial={{ opacity: 1, y: 0, scale: 1 }}
                  animate={{ opacity: 0, y: -30, scale: 1.2 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="absolute -top-6 left-1/2 -translate-x-1/2 text-rose-500 font-black text-lg drop-shadow-[0_0_10px_rgba(239,68,68,0.9)] pointer-events-none z-50"
                >
                  -{anim.amount}
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {activeTab === "opener" && (
        <div className="w-full relative flex flex-col items-center">
          {!showReveal && (
            <BoosterCarousel
              selectedBoxType={selectedBoxType}
              setSelectedBoxType={setSelectedBoxType}
              boxesData={boxesData}
              isOpening={isOpening}
              isBuying={isBuying}
              isLoggedIn={isLoggedIn}
              coins={coins}
              onOpenPack={openPack}
              onBuyBooster={buyBooster}
            />
          )}

          <BoosterModal
            isOpening={isOpening}
            boosterStep={boosterStep}
            openingGlow={openingGlow}
            selectedBoxType={selectedBoxType}
            activeBox={activeBox}
            onBoosterClick={handleBoosterClick}
          />

          <RevealOverlay
            showReveal={showReveal}
            drawnCards={drawnCards}
            openingGlow={openingGlow}
            activeBox={activeBox}
            forceFlipAll={forceFlipAll}
            setForceFlipAll={setForceFlipAll}
            selectedBoxType={selectedBoxType}
            allCards={allCards}
            ownedVariantIds={ownedVariantIds}
            boxes={boxes}
            onOpenAnother={() => {
              setShowReveal(false);
              setForceFlipAll(false);
              openPack();
            }}
            onClose={() => {
              setShowReveal(false);
              setForceFlipAll(false);
            }}
          />
        </div>
      )}

      {activeTab === "collection" && (
        <CollectionTab
          inventory={inventory}
          stackedItems={stackedItems}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          rarityFilter={rarityFilter}
          setRarityFilter={setRarityFilter}
          filterEdition={filterEdition}
          setFilterEdition={setFilterEdition}
          filterEffect={filterEffect}
          setFilterEffect={setFilterEffect}
          allCards={allCards}
          ownedVariantIds={ownedVariantIds}
          setSelectedCard={setSelectedCard}
          setActiveTab={setActiveTab}
        />
      )}

      {activeTab === "catalogue" && (
        <CatalogueTab
          allCards={allCards}
          allEditions={allEditions}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          rarityFilter={rarityFilter}
          setRarityFilter={setRarityFilter}
          selectedCatalogueEdition={selectedCatalogueEdition}
          setSelectedCatalogueEdition={setSelectedCatalogueEdition}
          ownedVariantIds={ownedVariantIds}
          setSelectedCard={setSelectedCard}
        />
      )}

      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          allCards={allCards}
          ownedVariantIds={ownedVariantIds}
          onSelectCard={(c) => setSelectedCard(c)}
          activeModalTab={activeModalTab}
          setActiveModalTab={setActiveModalTab}
        />
      )}

      {showRatesModal && (
        <RatesModal
          onClose={() => setShowRatesModal(false)}
          onSelectMythic={() => setSelectedBoxType("mythic")}
        />
      )}
    </div>
  );
}

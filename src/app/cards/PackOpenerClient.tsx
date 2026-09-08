"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Image from "next/image";
import { PackageOpen, Lock, Sparkles, Layers, BookOpen } from "lucide-react";
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

export default function PackOpenerClient({
  initialInventory,
  initialBoxes,
  initialCoins,
  isLoggedIn,
  allCards = [],
  allEditions = [],
}: {
  initialInventory: UserCard[];
  initialBoxes?: any[];
  initialCoins: number;
  isLoggedIn: boolean;
  allCards?: TradingCard[];
  allEditions?: any[];
  serverPlayers?: string[];
  currentUserMCName?: string;
}) {
  const [inventory, setInventory] = useState<UserCard[]>(initialInventory);
  const [boxes, setBoxes] = useState<any[]>(initialBoxes || []);
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
  const fetchedCardsRef = useRef<any[]>([]);

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
    } catch (e: any) {
      toast.error(e.message, { position: "top-center" });
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

      const cardsWithEffects = data.userCards.map((uc: any) => ({
        ...uc.tradingCard,
        specialEffect: uc.specialEffect,
      }));
      fetchedCardsRef.current = cardsWithEffects;

      const hasMythic = cardsWithEffects.some((c: any) => c.rarity === "MYTHIC");
      const hasLegendary = cardsWithEffects.some((c: any) => c.rarity === "LEGENDARY");
      const hasEpic = cardsWithEffects.some((c: any) => c.rarity === "EPIC");
      const hasRare = cardsWithEffects.some((c: any) => c.rarity === "RARE");
      const hasUncommon = cardsWithEffects.some((c: any) => c.rarity === "UNCOMMON");

      if (hasMythic) setOpeningGlow("MYTHIC");
      else if (hasLegendary) setOpeningGlow("LEGENDARY");
      else if (hasEpic) setOpeningGlow("EPIC");
      else if (hasRare) setOpeningGlow("RARE");
      else if (hasUncommon) setOpeningGlow("UNCOMMON");
      else setOpeningGlow("COMMON");

      setInventory((prev) => [...data.userCards, ...prev]);
      setBoosterStep("waiting_click");
    } catch (error: any) {
      toast.error(error.message, { position: "top-center" });
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
    const acc: Record<string, { card: any; count: number; latestObtained: Date; specialEffect?: string | null }> = {};

    inventory.forEach((curr: any) => {
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

  const boxesData: any = {
    standard: {
      name: "Standard",
      image: "/StandardB.png",
      price: 150,
      owned: boxes.find((b) => b.boxType === "standard")?.amount || 0,
      glow: "bg-blue-500",
      text: "text-blue-500 dark:text-blue-400",
      border: "border-blue-500",
      bgGradient: "from-blue-500/15 via-[var(--card-bg)] to-[var(--card-bg)]",
      ringColor: "rgba(59,130,246,0.5)",
      badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      desc: "Le booster de base indispensable. Contient 3 cartes aléatoires avec une chance raisonnable de découvrir des variantes Rares et Épiques.",
      rates: [
        { r: "Commune", p: "40%", c: "text-gray-500 dark:text-gray-400" },
        { r: "Peu Commune", p: "30%", c: "text-green-500 dark:text-green-400" },
        { r: "Rare", p: "20%", c: "text-blue-500 dark:text-blue-400" },
        { r: "Épique", p: "7.8%", c: "text-purple-500 dark:text-purple-400" },
        { r: "Légendaire", p: "2%", c: "text-yellow-500 dark:text-yellow-400" },
        { r: "Mythique", p: "0.2%", c: "text-red-500" },
      ],
    },
    premium: {
      name: "Premium",
      image: "/PreniumB.png",
      price: 250,
      owned: boxes.find((b) => b.boxType === "premium")?.amount || 0,
      glow: "bg-purple-500",
      text: "text-purple-600 dark:text-purple-400",
      border: "border-purple-500",
      bgGradient: "from-purple-500/15 via-[var(--card-bg)] to-[var(--card-bg)]",
      ringColor: "rgba(168,85,247,0.5)",
      badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
      desc: "Un booster optimisé pour les passionnés : taux de drop épiques augmentés et 5% de probabilité d'obtenir une carte Légendaire.",
      rates: [
        { r: "Commune", p: "20%", c: "text-gray-500 dark:text-gray-400" },
        { r: "Peu Commune", p: "25%", c: "text-green-500 dark:text-green-400" },
        { r: "Rare", p: "35%", c: "text-blue-500 dark:text-blue-400" },
        { r: "Épique", p: "14.5%", c: "text-purple-500 dark:text-purple-400" },
        { r: "Légendaire", p: "5%", c: "text-yellow-500 dark:text-yellow-400" },
        { r: "Mythique", p: "0.5%", c: "text-red-500" },
      ],
    },
    legendary: {
      name: "Légendaire",
      image: "/LegendaireB.png",
      price: 400,
      owned: boxes.find((b) => b.boxType === "legendary")?.amount || 0,
      glow: "bg-amber-500",
      text: "text-amber-500 dark:text-amber-400",
      border: "border-amber-500",
      bgGradient: "from-amber-500/15 via-[var(--card-bg)] to-[var(--card-bg)]",
      ringColor: "rgba(245,158,11,0.5)",
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      desc: "Réservé à l'élite : probabilités de rareté maximales avec 10% de chance d'extraction d'une entité Légendaire.",
      rates: [
        { r: "Commune", p: "10%", c: "text-gray-500 dark:text-gray-400" },
        { r: "Peu Commune", p: "15%", c: "text-green-500 dark:text-green-400" },
        { r: "Rare", p: "40%", c: "text-blue-500 dark:text-blue-400" },
        { r: "Épique", p: "23%", c: "text-purple-500 dark:text-purple-400" },
        { r: "Légendaire", p: "10%", c: "text-yellow-500 dark:text-yellow-400" },
        { r: "Mythique", p: "2%", c: "text-red-500" },
      ],
    },
    mythic: {
      name: "Mythique",
      image: "/MythiqueB.png",
      price: 750,
      owned: boxes.find((b) => b.boxType === "mythic")?.amount || 0,
      glow: "bg-red-600",
      text: "text-red-600 dark:text-red-500",
      border: "border-red-500",
      bgGradient: "from-red-500/20 via-[var(--card-bg)] to-[var(--card-bg)]",
      ringColor: "rgba(239,68,68,0.6)",
      badgeColor: "bg-red-500/20 text-red-300 border-red-500/30",
      desc: "Le Graal suprême. Aucune carte commune, peu commune ou rare. Garantit exclusivement des tirages Épiques, Légendaires et Mythiques.",
      rates: [
        { r: "Épique", p: "75%", c: "text-purple-500 dark:text-purple-400" },
        { r: "Légendaire", p: "20%", c: "text-yellow-500 dark:text-yellow-400" },
        { r: "Mythique", p: "5%", c: "text-red-500" },
      ],
    },
  };

  const activeBox = boxesData[selectedBoxType] || boxesData["standard"];
  const ownedVariantIds = useMemo(
    () => new Set(inventory.map((item) => item.tradingCard.id)),
    [inventory]
  );

  return (
    <div className="w-full">
      <div className="flex flex-col items-center text-center mb-8">
        <h1 className="text-3xl md:text-7xl font-outfit font-black tracking-tight mb-4 text-[var(--text-color)]">
          PARANOIA{" "}
          <span className="bg-gradient-to-r from-purple-400 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(179,102,255,0.3)]">
            TCG
          </span>
        </h1>
        <p className="text-[var(--nav-item-color)] font-medium text-base md:text-lg max-w-2xl">
          Collectionne les cartes holographiques des joueurs, ouvre tes boosters et accomplis ta quête pour obtenir les variantes mythiques du serveur !
        </p>
      </div>

      <div className="relative mb-12 flex flex-col lg:flex-row justify-between items-center gap-4 bg-[var(--card-bg)] backdrop-blur-2xl border border-[var(--card-border)] p-3 md:p-4 rounded-3xl shadow-xl w-full">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(168,85,247,0.08)_0%,_transparent_70%)] -z-10 rounded-3xl pointer-events-none" />

        <div className="flex flex-wrap items-center justify-center gap-2 w-full lg:w-auto">
          <button
            onClick={() => setActiveTab("opener")}
            className={`flex items-center gap-1.5 md:gap-2.5 px-3 py-2 md:px-5 md:py-3 font-bold rounded-xl md:rounded-2xl transition-all duration-200 text-xs md:text-base ${
              activeTab === "opener"
                ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.5)] scale-102 font-black"
                : "text-[var(--nav-item-color)] hover:bg-purple-500/10 hover:text-[var(--text-color)] border border-transparent"
            }`}
          >
            <PackageOpen className="w-5 h-5" />
            <span>Ouvrir Boosters</span>
          </button>

          <button
            onClick={() => setActiveTab("collection")}
            className={`flex items-center gap-1.5 md:gap-2.5 px-3 py-2 md:px-5 md:py-3 font-bold rounded-xl md:rounded-2xl transition-all duration-200 text-xs md:text-base ${
              activeTab === "collection"
                ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.5)] scale-102 font-black"
                : "text-[var(--nav-item-color)] hover:bg-purple-500/10 hover:text-[var(--text-color)] border border-transparent"
            }`}
          >
            <Layers className="w-5 h-5" />
            <span>Ma Collection</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-mono font-black ${
                activeTab === "collection"
                  ? "bg-black/30 text-white"
                  : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
              }`}
            >
              {inventory.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("catalogue")}
            className={`flex items-center gap-1.5 md:gap-2.5 px-3 py-2 md:px-5 md:py-3 font-bold rounded-xl md:rounded-2xl transition-all duration-200 text-xs md:text-base ${
              activeTab === "catalogue"
                ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.5)] scale-102 font-black"
                : "text-[var(--nav-item-color)] hover:bg-purple-500/10 hover:text-[var(--text-color)] border border-transparent"
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span>Catalogue</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-mono font-black ${
                activeTab === "catalogue"
                  ? "bg-black/30 text-white"
                  : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
              }`}
            >
              {allCards.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto justify-center lg:justify-end border-t lg:border-t-0 border-[var(--card-border)] pt-3 lg:pt-0">
          {isLoggedIn ? (
            <div className="flex items-center gap-3 bg-[var(--surface-bg)] border border-[var(--card-border)] px-5 py-2.5 rounded-2xl shadow-sm w-full sm:w-auto justify-between sm:justify-start">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center p-1 shrink-0">
                  <img
                    src="/Paracoin.png"
                    alt="PARA Coins"
                    className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]"
                  />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-[10px] text-[var(--nav-item-color)] font-bold uppercase tracking-wider leading-none mb-1">
                    Solde disponible
                  </span>
                  <span className="relative font-outfit font-black text-[var(--text-color)] text-xl leading-none tracking-tight flex items-center">
                    {coins.toLocaleString()}
                    <span className="text-xs text-purple-600 dark:text-purple-400 font-bold ml-1">PARA</span>
                    <AnimatePresence>
                      {spendingAnimations.map((anim) => (
                        <motion.span
                          key={anim.id}
                          initial={{ opacity: 1, y: 0, scale: 1 }}
                          animate={{ opacity: 0, y: -35, scale: 1.2 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 1.2, ease: "easeOut" }}
                          className="absolute -top-6 left-1/2 -translate-x-1/2 text-rose-500 font-black text-lg drop-shadow-[0_0_10px_rgba(239,68,68,0.9)] pointer-events-none z-50"
                        >
                          -{anim.amount}
                        </motion.span>
                      ))}
                    </AnimatePresence>
                  </span>
                </div>
              </div>
              <button
                onClick={() => router.push("/shop")}
                className="px-3.5 py-1.5 rounded-xl bg-purple-600 text-white font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all duration-200 shrink-0 shadow-md"
              >
                + Recharger
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--surface-bg)] border border-[var(--card-border)] text-purple-600 dark:text-purple-400 text-xs font-semibold w-full sm:w-auto justify-center">
              <span>🔒 Connectez-vous avec Discord pour ouvrir des boosters</span>
            </div>
          )}
        </div>
      </div>

      {activeTab === "opener" && (
        <div className="w-full relative flex flex-col items-center">
          {!showReveal && (
            <div className="w-full flex flex-col items-center">
              <div
                className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full max-w-7xl mb-10 px-2 overflow-x-auto snap-x snap-mandatory pt-12 pb-6 -mt-8"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {Object.keys(boxesData).map((key) => {
                  const box = boxesData[key];
                  const isSelected = selectedBoxType === key;
                  return (
                    <div
                      key={key}
                      onClick={() => !isOpening && setSelectedBoxType(key)}
                      className={`group relative flex flex-col items-center justify-between p-5 rounded-3xl cursor-pointer transition-all duration-300 bg-gradient-to-b ${
                        box.bgGradient
                      } border-2 overflow-hidden snap-center shrink-0 w-[80vw] sm:w-auto ${
                        isSelected
                          ? `${box.border} scale-[1.02] sm:scale-105 shadow-2xl z-20`
                          : "border-[var(--card-border)] hover:border-[var(--logo-end)] opacity-90 hover:opacity-100 hover:scale-100 sm:hover:scale-102"
                      }`}
                      style={{
                        boxShadow: isSelected ? `0 0 35px ${box.ringColor}` : undefined,
                      }}
                    >
                      <div
                        className={`absolute -top-12 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full blur-2xl ${box.glow} opacity-20 sm:opacity-30 group-hover:opacity-40 transition-opacity pointer-events-none`}
                      />

                      <div className="w-full flex items-baseline justify-between z-10 mb-2">
                        <span className={`text-lg font-outfit font-black tracking-wide ${box.text}`}>
                          {box.name}
                        </span>
                        <span className="text-xs text-[var(--nav-item-color)] font-medium flex items-center gap-1">
                          {box.owned > 0 ? (
                            `${box.owned} disponible${box.owned > 1 ? "s" : ""}`
                          ) : (
                            <>
                              <img src="/Paracoin.png" alt="PARA" className="w-3.5 h-3.5 object-contain inline-block" />
                              {box.price}
                            </>
                          )}
                        </span>
                      </div>

                      <div className="relative w-40 h-56 flex items-center justify-center my-2 transition-transform duration-500 group-hover:-translate-y-2 z-10 drop-shadow-xl">
                        <Image
                          src={box.image}
                          alt={box.name}
                          width={240}
                          height={360}
                          priority
                          className="w-full h-full object-contain filter hover:brightness-110 transition-all"
                          unoptimized
                        />
                      </div>

                      <div className="w-full mt-4 flex items-center justify-center z-10">
                        <span
                          className={`text-xs uppercase tracking-[0.25em] transition-all duration-300 ${
                            isSelected
                              ? "font-bold text-[var(--text-color)] border-b border-[var(--text-color)] pb-1"
                              : "font-light text-[var(--color-text-muted)] group-hover:text-[var(--text-color)]"
                          }`}
                        >
                          {isSelected ? "✦ Sélectionné" : "Sélectionner"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="relative w-full max-w-5xl bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl p-6 md:p-10 shadow-xl overflow-hidden mb-8">
                <div
                  className={`absolute inset-0 opacity-10 blur-3xl rounded-full pointer-events-none transition-colors duration-1000 ${activeBox.glow}`}
                />

                <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
                  <div className="flex flex-col items-center lg:items-start text-center lg:text-left flex-1">
                    <span className="text-xs uppercase tracking-[0.3em] text-[var(--nav-item-color)] font-light mb-2 block">
                      Spécifications du Booster
                    </span>
                    <h2
                      className={`text-2xl md:text-5xl font-outfit font-black uppercase tracking-tight mb-4 ${activeBox.text}`}
                    >
                      Booster {activeBox.name}
                    </h2>
                    <p className="text-sm md:text-base text-[var(--nav-item-color)] font-normal leading-relaxed mb-6 max-w-md">
                      {activeBox.desc}
                    </p>
                    <div className="mt-2 pt-4 border-t border-[var(--card-border)] w-full flex items-center justify-center lg:justify-start gap-2 text-sm">
                      <span className="text-[var(--nav-item-color)] font-light">En réserve :</span>
                      <span className="font-bold text-[var(--text-color)] tracking-wide">
                        {activeBox.owned > 0
                          ? `${activeBox.owned} exemplaire${activeBox.owned > 1 ? "s" : ""}`
                          : "Aucun exemplaire en inventaire"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col w-full lg:w-96 shrink-0 gap-5">
                    <div className="w-full space-y-4">
                      {!isOpening && activeBox.owned > 0 && (
                        <button
                          onClick={openPack}
                          disabled={isOpening || isBuying}
                          className="group relative w-full overflow-hidden rounded-2xl py-4 px-6 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-700 font-outfit font-bold text-lg text-white disabled:opacity-50 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 shadow-[0_0_25px_rgba(168,85,247,0.4)] hover:shadow-[0_0_40px_rgba(168,85,247,0.7)] flex items-center justify-center gap-3"
                        >
                          <Sparkles className="w-5 h-5 text-purple-200 group-hover:scale-125 transition-transform duration-300" />
                          <span className="tracking-widest uppercase">OUVRIR CE BOOSTER ({activeBox.owned})</span>
                        </button>
                      )}
                      {!isOpening &&
                        (!isLoggedIn ? (
                          <button
                            onClick={() => router.push("/api/auth/signin")}
                            className="w-full py-4 rounded-2xl font-outfit font-bold text-sm text-[var(--text-color)] bg-[var(--surface-bg)] border border-[var(--card-border)] hover:opacity-80 transition-all flex items-center justify-center gap-2.5 tracking-wider uppercase"
                          >
                            <Lock className="w-4 h-4 text-[var(--nav-item-color)]" />
                            <span>SE CONNECTER POUR ACHETER</span>
                          </button>
                        ) : coins < activeBox.price ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push("/shop");
                            }}
                            className="w-full py-4 rounded-2xl font-medium text-xs uppercase tracking-wider text-rose-500 dark:text-rose-300 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 transition-all flex items-center justify-center gap-2"
                          >
                            <Lock className="w-4 h-4 text-rose-500 shrink-0" />
                            <span>
                              Solde Insuffisant ({coins}/{activeBox.price}) —{" "}
                              <strong className="underline underline-offset-4 decoration-rose-500 font-bold">
                                Recharger
                              </strong>
                            </span>
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              buyBooster(selectedBoxType, activeBox.price);
                            }}
                            disabled={isBuying}
                            className="w-full py-4 rounded-2xl font-outfit font-bold text-sm text-[var(--text-color)] bg-[var(--surface-bg)] hover:bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--logo-end)] transition-all flex items-center justify-center gap-3 group tracking-wider shadow-sm"
                          >
                            {isBuying ? (
                              <span className="flex items-center gap-3 text-purple-500 uppercase">
                                <span className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                                TRANSACTION EN COURS...
                              </span>
                            ) : (
                              <>
                                <span className="uppercase tracking-widest text-[var(--nav-item-color)] group-hover:text-[var(--text-color)] transition-colors">
                                  ACHETER •
                                </span>
                                <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-bold text-base">
                                  <img src="/Paracoin.png" alt="PARA" className="w-4 h-4 object-contain" />
                                  {activeBox.price}
                                </span>
                              </>
                            )}
                          </button>
                        ))}
                      {isOpening && (
                        <div className="w-full py-4 text-center text-purple-600 dark:text-purple-400 font-light animate-pulse text-sm tracking-[0.3em] uppercase">
                          Ouverture en cours...
                        </div>
                      )}
                    </div>

                    <div className="w-full flex flex-col bg-[var(--surface-bg)] border border-[var(--card-border)] p-4 rounded-2xl">
                      <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--nav-item-color)] mb-3 text-center">
                        Taux d'obtention par rareté
                      </span>
                      <div className="grid grid-cols-2 gap-2 w-full">
                        {activeBox.rates.map((rate: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex justify-between items-center px-2.5 py-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)]"
                          >
                            <span className={`text-xs font-bold uppercase tracking-wider truncate mr-1 ${rate.c}`}>
                              {rate.r}
                            </span>
                            <span className="text-xs font-mono font-black text-[var(--text-color)]">{rate.p}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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

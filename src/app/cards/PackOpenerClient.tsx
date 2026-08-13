"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Image from "next/image";
import { PackageOpen, Loader2, X, Search, Filter, Sparkles, Layers, Lock, BookOpen, Flame, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import CardDisplay from "@/features/binder/components/CardDisplay";
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';

type Player = { id: string; minecraftName: string };
type TradingCard = { id: string; title: string; rarity: string; level: string; edition: string; description: string | null; player: Player | null; attributes?: string; imageUrl?: string | null; asVariantLinks?: any[]; isVariant?: boolean };
type UserCard = { id: string; obtainedAt: Date; tradingCard: TradingCard; specialEffect?: string | null };

const FlippableCard = ({ card, index, boxType, allCards, ownedVariantIds, forceFlip = false }: { card: TradingCard, index: number, boxType: string, allCards: any[], ownedVariantIds: Set<string>, forceFlip?: boolean }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showWow, setShowWow] = useState(false);

  useEffect(() => {
    if (forceFlip && !isFlipped) {
      const timer = setTimeout(() => {
        setIsFlipped(true);
        if (card.rarity === 'MYTHIC') {
          triggerWow();
        }
      }, index * 200);
      return () => clearTimeout(timer);
    }
  }, [forceFlip, isFlipped, index, card.rarity]);

  const triggerWow = () => {
    setShowWow(true);
    // Lightweight burst (no lagging 60fps loop)
    confetti({
      particleCount: 80, spread: 90, origin: { y: 0.6 }, zIndex: 4000,
      colors: ['#ef4444', '#dc2626', '#b91c1c', '#ffffff']
    });
    setTimeout(() => setShowWow(false), 2800);
  };

  const handleFlip = () => {
    if (isFlipped) return;
    setIsFlipped(true);
    if (card.rarity === 'MYTHIC') {
      triggerWow();
    }
  };

  return (
    <>
      {showWow && (
        <div className="fixed inset-0 z-[3000] flex flex-col items-center justify-center pointer-events-none p-4 text-center">
          <div className="absolute inset-0 animate-flash-fade bg-red-600/30 mix-blend-screen"></div>
          <div className="animate-huge-reveal flex flex-col items-center">
            <h2 className="text-6xl sm:text-7xl md:text-8xl font-outfit font-black uppercase tracking-tight my-2 text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-red-500 to-amber-400 drop-shadow-[0_0_60px_rgba(239,68,68,0.9)]">
              MYTHIQUE
            </h2>
            <p className="text-white text-xl md:text-3xl font-light tracking-[0.2em] uppercase mt-1 drop-shadow-lg">
              {card.player ? card.player.minecraftName : card.title}
            </p>
          </div>
        </div>
      )}
      <div
        className="relative z-10 animate-epic-card-reveal cursor-pointer group shrink-0"
        style={{ animationDelay: `${index * 0.25}s`, animationFillMode: 'both', perspective: '1200px', width: '16rem', height: '22.4rem', minWidth: '16rem' }}
        onClick={handleFlip}
      >
        {/* Only MYTHIC gets a subtle ambient rarity glow */}
        {!isFlipped && card.rarity === 'MYTHIC' && (
          <div className="absolute -inset-2 bg-gradient-to-r from-rose-600/50 via-red-500/50 to-amber-500/50 rounded-3xl blur-lg animate-pulse -z-10 transition-all duration-500"></div>
        )}

        <div className="w-full h-full transition-transform duration-500 group-hover:-translate-y-2">
          <div
            className="w-full h-full relative transition-transform duration-700 ease-out"
            style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(0deg)' : 'rotateY(180deg)' }}
          >
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.5)] rounded-2xl" style={{ backfaceVisibility: 'hidden' }}>
            <CardDisplay card={card} size="md" ownedVariantIds={ownedVariantIds} />
          </div>
          <div
            className="absolute inset-0 w-full h-full rounded-2xl border border-purple-500/40 flex items-center justify-center overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.8)]"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', background: 'radial-gradient(circle at center, #181432 0%, #08060c 100%)' }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(168,85,247,0.25)_0%,_transparent_70%)] pointer-events-none"></div>
            <div className="relative z-10 flex flex-col items-center justify-center pointer-events-none w-full px-6">
              <img src="/Paranoia_logo.png" fetchPriority="high" className="w-4/5 h-auto drop-shadow-[0_0_20px_rgba(168,85,247,0.5)] group-hover:scale-105 transition-transform duration-500" alt="Paranoia Card Back" />
            </div>
            <div className="absolute inset-2 border border-white/5 rounded-xl pointer-events-none"></div>
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-purple-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
          </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default function PackOpenerClient({
  initialInventory,
  initialBoxes,
  initialCoins,
  isLoggedIn,
  allCards = [],
  allEditions = [],
  serverPlayers = [],
  currentUserMCName = ""
}: {
  initialInventory: UserCard[],
  initialBoxes?: any[],
  initialCoins: number,
  isLoggedIn: boolean,
  allCards?: TradingCard[],
  allEditions?: any[],
  serverPlayers?: string[],
  currentUserMCName?: string
}) {
  const [inventory, setInventory] = useState<UserCard[]>(initialInventory);
  const [boxes, setBoxes] = useState<any[]>(initialBoxes || []);
  const [coins, setCoins] = useState<number>(initialCoins || 0);
  const [spendingAnimations, setSpendingAnimations] = useState<{id: number, amount: number}[]>([]);
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
      document.body.style.overflow = 'hidden';
      if (selectedCard) setActiveModalTab("details");
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [selectedCard, isOpening, showReveal]);

  const [openingGlow, setOpeningGlow] = useState<string | null>(null);
  const [forceFlipAll, setForceFlipAll] = useState(false);
  const [showRatesModal, setShowRatesModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"opener" | "collection" | "catalogue">("opener");
  const [searchQuery, setSearchQuery] = useState("");
  const [rarityFilter, setRarityFilter] = useState("ALL");
  const [filterEdition, setFilterEdition] = useState("ALL");
  const [filterEffect, setFilterEffect] = useState("ALL");
  const editionsList = useMemo(() => Array.from(new Set(allCards.map(c => c.edition || 'Standard'))), [allCards]);
  const [selectedCatalogueEdition, setSelectedCatalogueEdition] = useState<string>("Toutes");
  const router = useRouter();

  const buyBooster = async (type: string, price: number) => {
    if (!isLoggedIn) {
      toast("Vous devez être connecté.", { icon: '⚠️', position: 'top-center' });
      return;
    }
    if (coins < price) {
      toast.error("Fonds insuffisants !", { position: 'top-center' });
      return;
    }
    setIsBuying(true);
    try {
      const res = await fetch("/api/boosters/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boxType: type })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur d'achat");
      setCoins(data.remainingCoins);
      const animId = Date.now();
      setSpendingAnimations(prev => [...prev, { id: animId, amount: price }]);
      setTimeout(() => {
        setSpendingAnimations(prev => prev.filter(a => a.id !== animId));
      }, 1500);
      setBoxes(prev => {
        const existing = prev.find(b => b.boxType === type);
        if (existing) return prev.map(b => b.boxType === type ? { ...b, amount: b.amount + 1 } : b);
        return [...prev, { boxType: type, amount: 1 }];
      });
    } catch (e: any) {
      toast.error(e.message, { position: 'top-center' });
    } finally {
      setIsBuying(false);
    }
  };

  const openPack = async () => {
    if (!isLoggedIn) {
      toast("Vous devez être connecté pour ouvrir des boosters.", { icon: '⚠️', position: 'top-center' });
      return;
    }

    const userBox = boxes.find(b => b.boxType === selectedBoxType);
    if (!userBox || userBox.amount <= 0) {
      toast(`Vous ne possédez aucun Booster ${selectedBoxType}.`, { icon: '⚠️', position: 'top-center' });
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });

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
        body: JSON.stringify({ boxType: selectedBoxType })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Une erreur est survenue.");

      setBoxes(prev => prev.map(b => b.boxType === selectedBoxType ? { ...b, amount: b.amount - 1 } : b));

      const cardsWithEffects = data.userCards.map((uc: any) => ({ ...uc.tradingCard, specialEffect: uc.specialEffect }));
      fetchedCardsRef.current = cardsWithEffects;

      // Determine overall rarity glow of the pack (only MYTHIC triggers special glow)
      if (cardsWithEffects.some((c: any) => c.rarity === 'MYTHIC')) {
        setOpeningGlow('MYTHIC');
      } else {
        setOpeningGlow('STANDARD');
      }

      setInventory(prev => [...data.userCards, ...prev]);
      setBoosterStep("waiting_click");

    } catch (error: any) {
      toast.error(error.message, { position: 'top-center' });
      setIsOpening(false);
    }
  };

  const handleBoosterClick = () => {
    if (boosterStep !== "waiting_click") return;
    
    setBoosterStep("charging");
    
    // Phase 1: Cinematic Energy Build-up & Vibration (1.6s)
    setTimeout(() => {
      setBoosterStep("exploding");
    }, 1600);
    
    // Phase 2: Shockwave & Transition into Revelation Chamber (2.4s total)
    setTimeout(() => {
      setDrawnCards(fetchedCardsRef.current);
      setShowReveal(true);
      setIsOpening(false);
      setBoosterStep("idle");
      router.refresh();
    }, 2400);
  };

  const groupedInventory = useMemo(() => {
    const acc: Record<string, { card: any, count: number, latestObtained: Date, specialEffect?: string | null }> = {};

    inventory.forEach((curr: any) => {
      if (!curr || !curr.tradingCard) return;
      const id = curr.tradingCard.id;
      const effect = curr.specialEffect || 'none';
      const key = `${id}-${effect}`;
      if (!acc[key]) {
        acc[key] = {
          card: { ...curr.tradingCard, specialEffect: curr.specialEffect },
          count: 0,
          latestObtained: curr.obtainedAt || new Date(0),
          specialEffect: curr.specialEffect
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
  }, [inventory, allCards]);

  const stackedItems = useMemo(() => {
    return Object.values(groupedInventory)
      .filter(item => {
        const titleMatch = item.card.title ? item.card.title.toLowerCase().includes(searchQuery.toLowerCase()) : false;
        const playerMatch = item.card.player ? item.card.player.minecraftName.toLowerCase().includes(searchQuery.toLowerCase()) : false;
        const matchesSearch = titleMatch || playerMatch;
        const matchesRarity = rarityFilter === "ALL" || item.card.rarity === rarityFilter;
        const matchesEdition = filterEdition === "ALL" || item.card.edition === filterEdition;
        const matchesEffect = filterEffect === "ALL" || item.specialEffect === filterEffect || (filterEffect === "NONE" && !item.specialEffect);
        return matchesSearch && matchesRarity && matchesEdition && matchesEffect;
      })
      .sort((a, b) => new Date(b.latestObtained).getTime() - new Date(a.latestObtained).getTime());
  }, [groupedInventory, searchQuery, rarityFilter, filterEdition, filterEffect]);

  const boxesData: any = {
    standard: {
      name: "Standard",
      image: "/StandardB.png",
      price: 150,
      owned: boxes.find(b => b.boxType === "standard")?.amount || 0,
      glow: "bg-blue-500",
      text: "text-blue-500 dark:text-blue-400",
      border: "border-blue-500",
      bgGradient: "from-blue-500/15 via-[var(--card-bg)] to-[var(--card-bg)]",
      ringColor: "rgba(59,130,246,0.5)",
      badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      desc: "Le booster de base indispensable. Contient 3 cartes aléatoires avec une chance raisonnable de découvrir des variantes Rares et Épiques.",
      rates: [ {r: "Commune", p: "40%", c: "text-gray-500 dark:text-gray-400"}, {r: "Peu Commune", p: "30%", c: "text-green-500 dark:text-green-400"}, {r: "Rare", p: "20%", c: "text-blue-500 dark:text-blue-400"}, {r: "Épique", p: "7.8%", c: "text-purple-500 dark:text-purple-400"}, {r: "Légendaire", p: "2%", c: "text-yellow-500 dark:text-yellow-400"}, {r: "Mythique", p: "0.2%", c: "text-red-500"} ]
    },
    premium: {
      name: "Premium",
      image: "/PreniumB.png",
      price: 250,
      owned: boxes.find(b => b.boxType === "premium")?.amount || 0,
      glow: "bg-purple-500",
      text: "text-purple-600 dark:text-purple-400",
      border: "border-purple-500",
      bgGradient: "from-purple-500/15 via-[var(--card-bg)] to-[var(--card-bg)]",
      ringColor: "rgba(168,85,247,0.5)",
      badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
      desc: "Un booster optimisé pour les passionnés : taux de drop épiques augmentés et 5% de probabilité d'obtenir une carte Légendaire.",
      rates: [ {r: "Commune", p: "20%", c: "text-gray-500 dark:text-gray-400"}, {r: "Peu Commune", p: "25%", c: "text-green-500 dark:text-green-400"}, {r: "Rare", p: "35%", c: "text-blue-500 dark:text-blue-400"}, {r: "Épique", p: "14.5%", c: "text-purple-500 dark:text-purple-400"}, {r: "Légendaire", p: "5%", c: "text-yellow-500 dark:text-yellow-400"}, {r: "Mythique", p: "0.5%", c: "text-red-500"} ]
    },
    legendary: {
      name: "Légendaire",
      image: "/LegendaireB.png",
      price: 400,
      owned: boxes.find(b => b.boxType === "legendary")?.amount || 0,
      glow: "bg-amber-500",
      text: "text-amber-500 dark:text-amber-400",
      border: "border-amber-500",
      bgGradient: "from-amber-500/15 via-[var(--card-bg)] to-[var(--card-bg)]",
      ringColor: "rgba(245,158,11,0.5)",
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      desc: "Réservé à l'élite : probabilités de rareté maximales avec 10% de chance d'extraction d'une entité Légendaire.",
      rates: [ {r: "Commune", p: "10%", c: "text-gray-500 dark:text-gray-400"}, {r: "Peu Commune", p: "15%", c: "text-green-500 dark:text-green-400"}, {r: "Rare", p: "40%", c: "text-blue-500 dark:text-blue-400"}, {r: "Épique", p: "23%", c: "text-purple-500 dark:text-purple-400"}, {r: "Légendaire", p: "10%", c: "text-yellow-500 dark:text-yellow-400"}, {r: "Mythique", p: "2%", c: "text-red-500"} ]
    },
    mythic: {
      name: "Mythique",
      image: "/MythiqueB.png",
      price: 750,
      owned: boxes.find(b => b.boxType === "mythic")?.amount || 0,
      glow: "bg-red-600",
      text: "text-red-600 dark:text-red-500",
      border: "border-red-500",
      bgGradient: "from-red-500/20 via-[var(--card-bg)] to-[var(--card-bg)]",
      ringColor: "rgba(239,68,68,0.6)",
      badgeColor: "bg-red-500/20 text-red-300 border-red-500/30",
      desc: "Le Graal suprême. Aucune carte commune, peu commune ou rare. Garantit exclusivement des tirages Épiques, Légendaires et Mythiques.",
      rates: [ {r: "Épique", p: "75%", c: "text-purple-500 dark:text-purple-400"}, {r: "Légendaire", p: "20%", c: "text-yellow-500 dark:text-yellow-400"}, {r: "Mythique", p: "5%", c: "text-red-500"} ]
    }
  };
  const activeBox = boxesData[selectedBoxType] || boxesData['standard'];
  const ownedVariantIds = useMemo(() => new Set(inventory.map(item => item.tradingCard.id)), [inventory]);

  return (
    <div className="w-full">
      {/* TCG Hero & HUD Section */}
      <div className="flex flex-col items-center text-center mb-8">
        <h1 className="text-3xl md:text-7xl font-outfit font-black tracking-tight mb-4 text-[var(--text-color)]">
          PARANOIA <span className="bg-gradient-to-r from-purple-400 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(179,102,255,0.3)]">TCG</span>
        </h1>
        <p className="text-[var(--nav-item-color)] font-medium text-base md:text-lg max-w-2xl">
          Collectionne les cartes holographiques des joueurs, ouvre tes boosters et accomplis ta quête pour obtenir les variantes mythiques du serveur !
        </p>
      </div>

      {/* Interactive HUD Control Bar */}
      <div className="relative mb-12 flex flex-col lg:flex-row justify-between items-center gap-4 bg-[var(--card-bg)] backdrop-blur-2xl border border-[var(--card-border)] p-3 md:p-4 rounded-3xl shadow-xl w-full">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(168,85,247,0.08)_0%,_transparent_70%)] -z-10 rounded-3xl pointer-events-none" />
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 w-full lg:w-auto">
          <button 
            onClick={() => setActiveTab("opener")} 
            className={`flex items-center gap-1.5 md:gap-2.5 px-3 py-2 md:px-5 md:py-3 font-bold rounded-xl md:rounded-2xl transition-all duration-200 text-xs md:text-base ${
              activeTab === 'opener' 
                ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.5)] scale-102 font-black' 
                : 'text-[var(--nav-item-color)] hover:bg-purple-500/10 hover:text-[var(--text-color)] border border-transparent'
            }`}
          >
            <PackageOpen className="w-5 h-5" />
            <span>Ouvrir Boosters</span>
          </button>
          
          <button 
            onClick={() => setActiveTab("collection")} 
            className={`flex items-center gap-1.5 md:gap-2.5 px-3 py-2 md:px-5 md:py-3 font-bold rounded-xl md:rounded-2xl transition-all duration-200 text-xs md:text-base ${
              activeTab === 'collection' 
                ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.5)] scale-102 font-black' 
                : 'text-[var(--nav-item-color)] hover:bg-purple-500/10 hover:text-[var(--text-color)] border border-transparent'
            }`}
          >
            <Layers className="w-5 h-5" />
            <span>Ma Collection</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-black ${activeTab === 'collection' ? 'bg-black/30 text-white' : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'}`}>
              {inventory.length}
            </span>
          </button>

          <button 
            onClick={() => setActiveTab("catalogue")} 
            className={`flex items-center gap-1.5 md:gap-2.5 px-3 py-2 md:px-5 md:py-3 font-bold rounded-xl md:rounded-2xl transition-all duration-200 text-xs md:text-base ${
              activeTab === 'catalogue' 
                ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.5)] scale-102 font-black' 
                : 'text-[var(--nav-item-color)] hover:bg-purple-500/10 hover:text-[var(--text-color)] border border-transparent'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span>Catalogue</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-black ${activeTab === 'catalogue' ? 'bg-black/30 text-white' : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'}`}>
              {allCards.length}
            </span>
          </button>
        </div>

        {/* User Balance HUD (Right Aligned) */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-center lg:justify-end border-t lg:border-t-0 border-[var(--card-border)] pt-3 lg:pt-0">
          {isLoggedIn ? (
            <div className="flex items-center gap-3 bg-[var(--surface-bg)] border border-[var(--card-border)] px-5 py-2.5 rounded-2xl shadow-sm w-full sm:w-auto justify-between sm:justify-start">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center p-1 shrink-0">
                  <img src="/Paracoin.png" alt="PARA Coins" className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-[10px] text-[var(--nav-item-color)] font-bold uppercase tracking-wider leading-none mb-1">Solde disponible</span>
                  <span className="relative font-outfit font-black text-[var(--text-color)] text-xl leading-none tracking-tight flex items-center">
                    {coins.toLocaleString()}
                    <span className="text-xs text-purple-600 dark:text-purple-400 font-bold ml-1">PARA</span>
                    <AnimatePresence>
                      {spendingAnimations.map(anim => (
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
                onClick={() => router.push('/shop')}
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
              {/* CATEGORY DECK (Version 3: Color-Coded Cards & Isolated Images) */}
              <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full max-w-7xl mb-10 px-2 overflow-x-auto snap-x snap-mandatory pt-12 pb-6 -mt-8" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {Object.keys(boxesData).map((key) => {
                  const box = boxesData[key];
                  const isSelected = selectedBoxType === key;
                  return (
                    <div
                      key={key}
                      onClick={() => !isOpening && setSelectedBoxType(key)}
                      className={`group relative flex flex-col items-center justify-between p-5 rounded-3xl cursor-pointer transition-all duration-300 bg-gradient-to-b ${box.bgGradient} border-2 overflow-hidden snap-center shrink-0 w-[80vw] sm:w-auto ${
                        isSelected 
                          ? `${box.border} scale-[1.02] sm:scale-105 shadow-2xl z-20` 
                          : 'border-[var(--card-border)] hover:border-[var(--logo-end)] opacity-90 hover:opacity-100 hover:scale-100 sm:hover:scale-102'
                      }`}
                      style={{
                        boxShadow: isSelected ? `0 0 35px ${box.ringColor}` : undefined
                      }}
                    >
                      {/* Ambient Glow */}
                      <div className={`absolute -top-12 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full blur-2xl ${box.glow} opacity-20 sm:opacity-30 group-hover:opacity-40 transition-opacity pointer-events-none`} />

                      {/* Header: Name & Stock Typography */}
                      <div className="w-full flex items-baseline justify-between z-10 mb-2">
                        <span className={`text-lg font-outfit font-black tracking-wide ${box.text}`}>
                          {box.name}
                        </span>
                        <span className="text-xs text-[var(--nav-item-color)] font-medium flex items-center gap-1">
                          {box.owned > 0 ? (
                            `${box.owned} disponible${box.owned > 1 ? 's' : ''}`
                          ) : (
                            <>
                              <img src="/Paracoin.png" alt="PARA" className="w-3.5 h-3.5 object-contain inline-block" />
                              {box.price}
                            </>
                          )}
                        </span>
                      </div>

                      {/* Isolated Levitating Booster Image */}
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

                      {/* Footer State indicator (Clean typography, zero pill bubbles) */}
                      <div className="w-full mt-4 flex items-center justify-center z-10">
                        <span className={`text-xs uppercase tracking-[0.25em] transition-all duration-300 ${
                          isSelected 
                            ? 'font-bold text-[var(--text-color)] border-b border-[var(--text-color)] pb-1' 
                            : 'font-light text-[var(--color-text-muted)] group-hover:text-[var(--text-color)]'
                        }`}>
                          {isSelected ? '✦ Sélectionné' : 'Sélectionner'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* COMMAND CONSOLE & LORE DECK (Active Box details and actions) */}
              <div className="relative w-full max-w-5xl bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl p-6 md:p-10 shadow-xl overflow-hidden mb-8">
                <div className={`absolute inset-0 opacity-10 blur-3xl rounded-full pointer-events-none transition-colors duration-1000 ${activeBox.glow}`} />
                
                <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
                  {/* Left Column: Booster Details & Lore */}
                  <div className="flex flex-col items-center lg:items-start text-center lg:text-left flex-1">
                    <span className="text-xs uppercase tracking-[0.3em] text-[var(--nav-item-color)] font-light mb-2 block">Spécifications du Booster</span>
                    <h2 className={`text-2xl md:text-5xl font-outfit font-black uppercase tracking-tight mb-4 ${activeBox.text}`}>
                      Booster {activeBox.name}
                    </h2>
                    <p className="text-sm md:text-base text-[var(--nav-item-color)] font-normal leading-relaxed mb-6 max-w-md">
                      {activeBox.desc}
                    </p>
                    <div className="mt-2 pt-4 border-t border-[var(--card-border)] w-full flex items-center justify-center lg:justify-start gap-2 text-sm">
                      <span className="text-[var(--nav-item-color)] font-light">En réserve :</span>
                      <span className="font-bold text-[var(--text-color)] tracking-wide">
                        {activeBox.owned > 0 ? `${activeBox.owned} exemplaire${activeBox.owned > 1 ? 's' : ''}` : "Aucun exemplaire en inventaire"}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex flex-col w-full lg:w-96 shrink-0 gap-5">
                    {/* Action Bay Buttons */}
                    <div className="w-full space-y-4">
                      {!isOpening && activeBox.owned > 0 && (
                        <button onClick={openPack} disabled={isOpening || isBuying} className="group relative w-full overflow-hidden rounded-2xl py-4 px-6 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-700 font-outfit font-bold text-lg text-white disabled:opacity-50 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 shadow-[0_0_25px_rgba(168,85,247,0.4)] hover:shadow-[0_0_40px_rgba(168,85,247,0.7)] flex items-center justify-center gap-3">
                          <Sparkles className="w-5 h-5 text-purple-200 group-hover:scale-125 transition-transform duration-300" />
                          <span className="tracking-widest uppercase">OUVRIR CE BOOSTER ({activeBox.owned})</span>
                        </button>
                      )}
                      {!isOpening && (
                        !isLoggedIn ? (
                          <button onClick={() => router.push('/api/auth/signin')} className="w-full py-4 rounded-2xl font-outfit font-bold text-sm text-[var(--text-color)] bg-[var(--surface-bg)] border border-[var(--card-border)] hover:opacity-80 transition-all flex items-center justify-center gap-2.5 tracking-wider uppercase">
                            <Lock className="w-4 h-4 text-[var(--nav-item-color)]" />
                            <span>SE CONNECTER POUR ACHETER</span>
                          </button>
                        ) : coins < activeBox.price ? (
                          <button onClick={(e) => { e.stopPropagation(); router.push('/shop'); }} className="w-full py-4 rounded-2xl font-medium text-xs uppercase tracking-wider text-rose-500 dark:text-rose-300 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 transition-all flex items-center justify-center gap-2">
                            <Lock className="w-4 h-4 text-rose-500 shrink-0" />
                            <span>Solde Insuffisant ({coins}/{activeBox.price}) — <strong className="underline underline-offset-4 decoration-rose-500 font-bold">Recharger</strong></span>
                          </button>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); buyBooster(selectedBoxType, activeBox.price); }} disabled={isBuying} className="w-full py-4 rounded-2xl font-outfit font-bold text-sm text-[var(--text-color)] bg-[var(--surface-bg)] hover:bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--logo-end)] transition-all flex items-center justify-center gap-3 group tracking-wider shadow-sm">
                            {isBuying ? (
                              <span className="flex items-center gap-3 text-purple-500 uppercase">
                                <span className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></span>
                                TRANSACTION EN COURS...
                              </span>
                            ) : (
                              <>
                                <span className="uppercase tracking-widest text-[var(--nav-item-color)] group-hover:text-[var(--text-color)] transition-colors">ACHETER •</span>
                                <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-bold text-base">
                                  <img src="/Paracoin.png" alt="PARA" className="w-4 h-4 object-contain" />
                                  {activeBox.price}
                                </span>
                              </>
                            )}
                          </button>
                        )
                      )}
                      {isOpening && (
                        <div className="w-full py-4 text-center text-purple-600 dark:text-purple-400 font-light animate-pulse text-sm tracking-[0.3em] uppercase">
                          Ouverture en cours...
                        </div>
                      )}
                    </div>

                    {/* Probabilities Table */}
                    <div className="w-full flex flex-col bg-[var(--surface-bg)] border border-[var(--card-border)] p-4 rounded-2xl">
                      <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--nav-item-color)] mb-3 text-center">Taux d'obtention par rareté</span>
                      <div className="grid grid-cols-2 gap-2 w-full">
                        {activeBox.rates.map((rate: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center px-2.5 py-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)]">
                            <span className={`text-xs font-bold uppercase tracking-wider truncate mr-1 ${rate.c}`}>{rate.r}</span>
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
          {isOpening && (
            <div className="fixed inset-0 z-[2000] flex items-center justify-center backdrop-blur-3xl bg-[#05050a]/95 overflow-hidden">
              {/* Ambient celestial lighting */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[90vw] rounded-full blur-[180px] transition-all duration-1000 ${
                  boosterStep === "charging" 
                    ? (openingGlow === 'MYTHIC' ? 'bg-red-600/40 scale-125' : openingGlow === 'LEGENDARY' ? 'bg-yellow-500/40 scale-125' : 'bg-purple-600/40 scale-125') 
                    : 'bg-indigo-600/20 scale-100'
                }`} />
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className={`absolute rounded-full transition-colors duration-1000 ${
                    boosterStep === "charging" 
                      ? (openingGlow === 'MYTHIC' ? 'bg-red-400/50' : openingGlow === 'LEGENDARY' ? 'bg-yellow-300/50' : 'bg-white/40') 
                      : 'bg-white/20'
                  }`} style={{
                    width: `${Math.random() * 4 + 1}px`,
                    height: `${Math.random() * 4 + 1}px`,
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
                    animationDelay: `${Math.random() * 3}s`
                  }} />
                ))}
              </div>

              <AnimatePresence>
                {boosterStep !== "idle" && (
                  <motion.div 
                    className="relative flex flex-col items-center justify-center z-10"
                    initial={{ y: -600, opacity: 0, scale: 0.5 }}
                    animate={
                      (boosterStep === "waiting_click" || boosterStep === "fetching")
                      ? { 
                          y: [0, -12, 0], 
                          opacity: 1, 
                          scale: 1,
                          transition: { 
                            y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                            opacity: { duration: 0.6 },
                            scale: { type: "spring", stiffness: 80, damping: 15 }
                          }
                        }
                      : boosterStep === "charging"
                      ? {
                          y: 0, opacity: 1,
                          scale: [1, 0.95, 1.08, 0.95, 1.12, 1.2],
                          rotate: [0, -3, 3, -5, 5, -8, 8, 0],
                          transition: { duration: 1.6, ease: "easeInOut" }
                        }
                      : {
                          scale: [1.2, 4],
                          opacity: [1, 0],
                          transition: { duration: 0.6, ease: "easeOut" }
                        }
                    }
                    exit={{ opacity: 0, scale: 0, transition: { duration: 0.3 } }}
                    onClick={handleBoosterClick}
                    style={{ cursor: boosterStep === "waiting_click" ? "pointer" : "default" }}
                  >
                    {/* Interactive energy vortex behind booster */}
                    <motion.div 
                      className="absolute w-[500px] h-[500px] rounded-full pointer-events-none -z-10"
                      style={{ background: `radial-gradient(circle, ${
                        boosterStep === "charging"
                          ? (openingGlow === 'MYTHIC' ? 'rgba(239,68,68,0.5)' : 'rgba(168,85,247,0.3)')
                          : activeBox.glow.includes('blue') ? 'rgba(59,130,246,0.25)' : activeBox.glow.includes('purple') ? 'rgba(168,85,247,0.25)' : activeBox.glow.includes('yellow') ? 'rgba(250,204,21,0.25)' : 'rgba(239,68,68,0.25)'
                      } 0%, transparent 70%)` }}
                      animate={
                        boosterStep === "charging" 
                        ? { scale: [1, 1.4], opacity: [0.5, 1], transition: { duration: 1.6 } }
                        : { opacity: 0.4 }
                      }
                    />

                    {/* Volumetric beams ONLY for MYTHIC */}
                    {boosterStep === "charging" && openingGlow === 'MYTHIC' && (
                      <>
                        {Array.from({ length: 8 }).map((_, i) => (
                          <motion.div
                            key={`ray-${i}`}
                            className="absolute w-[2px] h-[300px] pointer-events-none -z-10 bg-gradient-to-t from-transparent via-red-500/80 to-transparent"
                            style={{ transformOrigin: "center center" }}
                            initial={{ opacity: 0, scaleY: 0, rotate: i * 45 }}
                            animate={{ opacity: [0, 1, 0.2], scaleY: [0, 1.5, 2], rotate: i * 45 + 30 }}
                            transition={{ duration: 1.6, ease: "easeOut" }}
                          />
                        ))}
                      </>
                    )}

                    {/* The booster pack image */}
                    <div className="relative w-72 h-[430px] md:w-80 md:h-[480px] z-10 drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)] filter transition-transform duration-500 group-hover:scale-105">
                      <Image 
                        src={selectedBoxType === "standard" ? "/StandardB.png" : selectedBoxType === "premium" ? "/PreniumB.png" : selectedBoxType === "legendary" ? "/LegendaireB.png" : "/MythiqueB.png"} 
                        alt="Booster Pack" 
                        priority 
                        fill 
                        className="object-contain" 
                        sizes="320px" 
                        unoptimized 
                      />
                    </div>

                    {/* Refined Typography */}
                    {boosterStep === "fetching" && (
                      <div className="mt-10 text-slate-400 font-light tracking-[0.3em] text-xs sm:text-sm uppercase whitespace-nowrap animate-pulse">
                        Chargement...
                      </div>
                    )}
                    {boosterStep === "waiting_click" && (
                      <div className="mt-10 flex flex-col items-center gap-2 pointer-events-none">
                        <span className="text-white font-light uppercase tracking-[0.3em] text-base sm:text-lg whitespace-nowrap drop-shadow-md animate-pulse">
                          Toucher le booster pour l&apos;ouvrir
                        </span>
                        <span className="text-[11px] uppercase tracking-[0.4em] text-slate-400 font-light">
                          Cliquez pour l&apos;ouvrir
                        </span>
                      </div>
                    )}
                    {boosterStep === "charging" && (
                      <div className={`mt-10 font-bold uppercase tracking-[0.5em] text-xs sm:text-sm whitespace-nowrap animate-pulse ${
                        openingGlow === 'MYTHIC' ? 'text-red-400 drop-shadow-[0_0_20px_rgba(239,68,68,0.9)]' :
                        'text-purple-300 drop-shadow-[0_0_20px_rgba(168,85,247,0.9)]'
                      }`}>
                        Ouverture en cours...
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* White flash shockwave on explosion */}
              {boosterStep === "exploding" && (
                <motion.div
                  className="fixed inset-0 z-[2010] bg-white pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0.9, 0] }}
                  transition={{ duration: 0.8, times: [0, 0.2, 0.5, 1], ease: "easeOut" }}
                />
              )}
            </div>
          )}

          {/* REVELATION CHAMBER (Full-screen high-end temple experience, optimized for ultra-smooth 60fps) */}
          {showReveal && drawnCards.length > 0 && (
            <div className="fixed inset-0 z-[2000] bg-[#06060c]/98 overflow-y-auto custom-scrollbar flex flex-col items-center justify-between p-6 sm:p-10 lg:p-16 animate-in fade-in duration-500">
              {/* Background atmosphere matching best rarity pulled */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[70vw] rounded-full blur-[120px] opacity-30 ${
                  openingGlow === 'MYTHIC' ? 'bg-gradient-to-tr from-rose-700 via-red-600 to-amber-600' : 
                  'bg-gradient-to-tr from-purple-900 via-indigo-900 to-slate-900'
                }`} />
                {openingGlow === 'MYTHIC' && Array.from({ length: 12 }).map((_, i) => (
                  <Sparkles 
                    key={i} 
                    className="absolute animate-particle opacity-40 text-rose-400" 
                    style={{ 
                      '--tx': `${(Math.random() - 0.5) * 1200}px`, 
                      '--ty': `${(Math.random() - 0.5) * 1200}px`, 
                      animationDelay: `${Math.random() * 0.5}s`, 
                      width: `${Math.random() * 20 + 10}px`, 
                      height: `${Math.random() * 20 + 10}px` 
                    } as React.CSSProperties} 
                  />
                ))}
              </div>

              {/* Header Title & Typography */}
              <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mt-4 sm:mt-6">
                <span className="text-xs sm:text-sm font-light uppercase tracking-[0.4em] text-slate-400 mb-2">
                  {activeBox.name} • {drawnCards.length} CARTES RÉVÉLÉES
                </span>
                <h2 className="text-4xl sm:text-6xl font-outfit font-black text-white tracking-tight drop-shadow-md mb-2">
                  VOTRE TIRAGE
                </h2>
                <p className="text-slate-400 text-xs sm:text-sm font-light tracking-[0.15em] mb-6">
                  Cliquez sur chaque carte pour la découvrir, ou révélez tout en une fois.
                </p>

                {/* Tout révéler Button */}
                <button
                  onClick={() => setForceFlipAll(true)}
                  className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white font-normal text-xs sm:text-sm uppercase tracking-[0.25em] rounded-xl border border-white/10 hover:border-white/30 transition-all duration-300 shadow-lg"
                >
                  Tout Révéler
                </button>
              </div>

              {/* Cards Deck Container */}
              <div className="relative z-10 my-10 flex flex-row justify-center items-center gap-6 md:gap-10 px-2 flex-wrap max-w-7xl mx-auto w-full">
                {drawnCards.map((card, i) => (
                  <FlippableCard 
                    key={i} 
                    card={card} 
                    index={i} 
                    boxType={selectedBoxType} 
                    allCards={allCards} 
                    ownedVariantIds={ownedVariantIds}
                    forceFlip={forceFlipAll}
                  />
                ))}
              </div>

              {/* Bottom Navigation */}
              <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mt-6 mb-4 w-full max-w-xl">
                <button 
                  onClick={() => {
                    setShowReveal(false);
                    setForceFlipAll(false);
                    openPack();
                  }} 
                  className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 hover:from-purple-500 hover:via-fuchsia-500 hover:to-indigo-500 text-white font-bold text-sm uppercase tracking-[0.2em] rounded-2xl shadow-[0_0_30px_rgba(168,85,247,0.4)] hover:shadow-[0_0_40px_rgba(168,85,247,0.7)] transition-all transform hover:-translate-y-0.5"
                >
                  Ouvrir un autre booster ({boxes.find(b => b.boxType === selectedBoxType)?.amount || 0})
                </button>
                <button 
                  onClick={() => {
                    setShowReveal(false);
                    setForceFlipAll(false);
                  }} 
                  className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-medium text-sm uppercase tracking-[0.2em] rounded-2xl border border-white/10 hover:border-white/20 transition-all backdrop-blur-md"
                >
                  Terminer & Retour
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "collection" && (
        <div className="animate-fade-in">
          <div className="relative mb-12">
            <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6 flex flex-col lg:flex-row gap-6 items-center justify-between sticky top-4 z-40 shadow-xl">
              <div className="flex flex-col items-center gap-1 w-full lg:w-auto">
                <h2 className="text-3xl font-outfit font-black text-[var(--text-color)] flex items-center gap-3 justify-center"><Layers className="w-8 h-8 text-[var(--logo-end)]" /> Ma Collection</h2>
                <span className="text-[var(--color-text-secondary)] font-medium tracking-wider uppercase text-sm text-center">{inventory.length} cartes possédées</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                <div className="relative w-full sm:w-72 group">
                  <div className="relative flex items-center">
                    <Search className="absolute left-4 w-5 h-5 text-[var(--color-text-muted)] group-focus-within:text-[var(--logo-end)] transition-colors" />
                    <input type="text" placeholder="Rechercher une carte..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-[var(--surface-bg)] border-2 border-[var(--card-border)] rounded-xl text-[var(--text-color)] placeholder-[var(--color-text-muted)] outline-none focus:border-[var(--logo-end)] transition-all" />
                  </div>
                </div>
                <div className="relative w-full sm:w-56 group">
                  <div className="relative flex items-center">
                    <Filter className="absolute left-4 w-5 h-5 text-[var(--color-text-muted)] group-focus-within:text-[var(--logo-end)] transition-colors" />
                    <select value={rarityFilter} onChange={(e) => setRarityFilter(e.target.value)} className="w-full pl-12 pr-10 py-3 bg-[var(--surface-bg)] border-2 border-[var(--card-border)] rounded-xl text-[var(--text-color)] outline-none focus:border-[var(--logo-end)] transition-all appearance-none cursor-pointer">
                      <option value="ALL">Toutes Raretés</option>
                      <option value="COMMON">Commune</option>
                      <option value="UNCOMMON">Peu Commune</option>
                      <option value="RARE">Rare</option>
                      <option value="EPIC">Épique</option>
                      <option value="LEGENDARY">Légendaire</option>
                      <option value="MYTHIC">Mythique</option>
                    </select>
                    <div className="absolute right-4 pointer-events-none text-[var(--color-text-muted)] group-focus-within:text-[var(--logo-end)]">▼</div>
                  </div>
                </div>
                <div className="relative w-full sm:w-56 group">
                  <div className="relative flex items-center">
                    <Layers className="absolute left-4 w-5 h-5 text-[var(--color-text-muted)] group-focus-within:text-[var(--logo-end)] transition-colors" />
                    <select value={filterEdition} onChange={(e) => setFilterEdition(e.target.value)} className="w-full pl-12 pr-10 py-3 bg-[var(--surface-bg)] border-2 border-[var(--card-border)] rounded-xl text-[var(--text-color)] outline-none focus:border-[var(--logo-end)] transition-all appearance-none cursor-pointer">
                      <option value="ALL">Toutes Éditions</option>
                      {Array.from(new Set(allCards.map(c => c.edition))).filter(Boolean).map(ed => <option key={ed} value={ed}>{ed}</option>)}
                    </select>
                    <div className="absolute right-4 pointer-events-none text-[var(--color-text-muted)] group-focus-within:text-[var(--logo-end)]">▼</div>
                  </div>
                </div>
                <div className="relative w-full sm:w-56 group">
                  <div className="relative flex items-center">
                    <Sparkles className="absolute left-4 w-5 h-5 text-[var(--color-text-muted)] group-focus-within:text-[var(--logo-end)] transition-colors" />
                    <select value={filterEffect} onChange={(e) => setFilterEffect(e.target.value)} className="w-full pl-12 pr-10 py-3 bg-[var(--surface-bg)] border-2 border-[var(--card-border)] rounded-xl text-[var(--text-color)] outline-none focus:border-[var(--logo-end)] transition-all appearance-none cursor-pointer">
                      <option value="ALL">Tous Effets</option>
                      <option value="NONE">Sans Effet</option>
                      <option value="Holographique">Holographique</option>
                      <option value="Glitch">Glitch</option>
                      <option value="Paillettes">Paillettes</option>
                      <option value="Doré">Doré</option>
                      <option value="Néon">Néon</option>
                    </select>
                    <div className="absolute right-4 pointer-events-none text-[var(--color-text-muted)] group-focus-within:text-[var(--logo-end)]">▼</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {inventory.length === 0 ? (
            <div className="p-6 bg-[var(--navbar-bg)] rounded-2xl border border-dashed border-[var(--card-border)] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm max-w-4xl mx-auto my-6">
              <div className="flex items-center gap-4 text-center sm:text-left">
                <div className="p-3.5 bg-[var(--color-accent-purple,#9d0df2)]/10 text-purple-400 rounded-xl border border-purple-500/20 flex-shrink-0">
                  <PackageOpen className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-outfit font-bold text-base text-[var(--text-color)]">Inventaire Vide — Aucune carte ouverte pour l'instant</h4>
                  <p className="text-xs text-[var(--nav-item-color)] mt-0.5">Ouvrez des boosters pour commencer votre collection de cartes holographiques !</p>
                </div>
              </div>
              <button onClick={() => setActiveTab("opener")} className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-[var(--logo-end)] text-white hover:opacity-90 transition-all flex items-center gap-2 flex-shrink-0 shadow-md">
                <Sparkles className="w-3.5 h-3.5" /> Ouvrir des Boosters
              </button>
            </div>
          ) : stackedItems.length === 0 ? (
            <div className="text-center py-24 bg-[var(--card-bg)] rounded-2xl border border-dashed border-[var(--color-border-color)] flex flex-col items-center shadow-xl">
              <div className="w-20 h-20 bg-black/10 rounded-full flex items-center justify-center mb-6 border border-[var(--card-border)]"><Layers className="w-10 h-10 text-[var(--color-text-muted)]" /></div>
              <h3 className="text-2xl font-outfit font-black text-[var(--text-color)] mb-2">Aucune carte trouvée</h3>
              <p className="text-[var(--color-text-secondary)] max-w-md mb-8">Aucune carte de votre collection ne correspond à vos filtres actuels.</p>
              <button onClick={() => {setSearchQuery(""); setRarityFilter("ALL");}} className="group relative inline-block">
                <div className="absolute inset-0 rounded-xl translate-y-1.5 translate-x-1.5 transition-all duration-150 bg-black/10 border border-[var(--card-border)]"></div>
                <div className="relative px-6 py-2 rounded-xl font-bold border-2 transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:-translate-x-0.5 group-active:translate-y-1.5 group-active:translate-x-1.5 flex items-center justify-center gap-2 bg-[var(--surface-bg)] border-[var(--card-border)] text-[var(--color-text-muted)] group-hover:text-[var(--logo-end)]">
                  Réinitialiser les filtres
                </div>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-16">
              <div>
                <h3 className="text-3xl font-outfit font-black text-white mb-8 border-b border-white/10 pb-4">Vos Cartes</h3>
                {['MYTHIC', 'LEGENDARY', 'EPIC', 'RARE', 'UNCOMMON', 'COMMON'].map(rarity => {
                  const cardsOfRarity = stackedItems.filter(item => item.card.rarity === rarity && item.count > 0);
                  if (cardsOfRarity.length === 0) return null;
                  return (
                    <div key={rarity} className="mb-16">
                      <div className="flex items-center gap-4 mb-8">
                        <div className={`px-4 py-2 rounded-lg font-black text-sm tracking-widest uppercase border ${rarity === 'MYTHIC' ? 'bg-red-500/10 text-red-500 border-red-500/30' : rarity === 'LEGENDARY' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' : rarity === 'EPIC' ? 'bg-purple-500/10 text-purple-500 border-purple-500/30' : rarity === 'RARE' ? 'bg-blue-500/10 text-blue-500 border-blue-500/30' : rarity === 'UNCOMMON' ? 'bg-green-500/10 text-green-500 border-green-500/30' : 'bg-[var(--card-bg)] text-[var(--color-text-secondary)] border-[var(--card-border)] shadow-[0_4px_10px_rgba(0,0,0,0.5)]'}`}>
                          {rarity === 'MYTHIC' ? 'Mythique' : rarity === 'LEGENDARY' ? 'Légendaire' : rarity === 'EPIC' ? 'Épique' : rarity === 'RARE' ? 'Rare' : rarity === 'UNCOMMON' ? 'Peu Commune' : 'Commune'}
                        </div>
                        <div className="flex-1 h-px bg-gradient-to-r from-[var(--card-border)] to-transparent"></div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 sm:gap-8">
                        {cardsOfRarity.map(item => (
                          <div key={`${item.card.id}-${item.specialEffect || 'none'}`} className="relative group perspective-1000">
                            <div onClick={() => setSelectedCard(item.card)} className="cursor-pointer transition-all duration-500 transform-style-3d group-hover:scale-105 group-hover:-translate-y-4 group-hover:shadow-[0_20px_30px_rgba(0,0,0,0.5)] rounded-xl"><CardDisplay card={item.card} size="md" ownedVariantIds={ownedVariantIds} /></div>
                            {item.count > 1 && <div className="absolute -top-3 -right-3 z-50 bg-red-600 text-white font-black text-sm px-2.5 py-1 rounded-full border-2 border-[#111118] shadow-[0_0_10px_rgba(220,38,38,0.6)] ">x{item.count}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "catalogue" && (
        <div className="animate-fade-in">
          <div className="relative mb-12">
            <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6 flex flex-col lg:flex-row gap-6 items-center justify-between sticky top-4 z-40 shadow-xl">
              <div className="flex flex-col items-center lg:items-start gap-1 w-full lg:w-auto">
                <h2 className="text-3xl font-outfit font-black text-[var(--text-color)] flex items-center gap-3"><BookOpen className="w-8 h-8 text-[var(--logo-end)]" /> Catalogue Complet</h2>
                <span className="text-[var(--color-text-secondary)] font-medium tracking-wider uppercase text-sm lg:ml-11">Découvrez toutes les cartes</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                <div className="relative w-full sm:w-72 group">
                  <div className="relative flex items-center">
                    <Search className="absolute left-4 w-5 h-5 text-[var(--color-text-muted)] group-focus-within:text-[var(--logo-end)] transition-colors" />
                    <input type="text" placeholder="Rechercher une carte..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-[var(--surface-bg)] border-2 border-[var(--card-border)] rounded-xl text-[var(--text-color)] placeholder-[var(--color-text-muted)] outline-none focus:border-[var(--logo-end)] transition-all" />
                  </div>
                </div>
                <div className="relative w-full sm:w-56 group">
                  <div className="relative flex items-center">
                    <Filter className="absolute left-4 w-5 h-5 text-[var(--color-text-muted)] group-focus-within:text-[var(--logo-end)] transition-colors" />
                    <select value={rarityFilter} onChange={(e) => setRarityFilter(e.target.value)} className="w-full pl-12 pr-10 py-3 bg-[var(--surface-bg)] border-2 border-[var(--card-border)] rounded-xl text-[var(--text-color)] outline-none focus:border-[var(--logo-end)] transition-all appearance-none cursor-pointer">
                      <option value="ALL">Toutes Raretés</option>
                      <option value="COMMON">Commune</option>
                      <option value="UNCOMMON">Peu Commune</option>
                      <option value="RARE">Rare</option>
                      <option value="EPIC">Épique</option>
                      <option value="LEGENDARY">Légendaire</option>
                      <option value="MYTHIC">Mythique</option>
                    </select>
                    <div className="absolute right-4 pointer-events-none text-[var(--color-text-muted)] group-focus-within:text-[var(--logo-end)]">▼</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Onglets d'Édition (Bulles scrollables) */}
            <div className="flex overflow-x-auto gap-3 px-6 pb-6 pt-6 snap-x hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
               <style dangerouslySetInnerHTML={{__html: `
                 .hide-scrollbar::-webkit-scrollbar { display: none; }
               `}} />
               <button 
                 onClick={() => setSelectedCatalogueEdition("Toutes")} 
                 className={`snap-start shrink-0 px-6 py-2 rounded-full font-bold transition-all duration-150 border-2 ${selectedCatalogueEdition === "Toutes" ? 'bg-[var(--logo-end)] text-white border-[var(--logo-end)] shadow-lg' : 'bg-[var(--surface-bg)] text-[var(--color-text-muted)] hover:bg-black/10 border-[var(--card-border)]'}`}
               >
                 Toutes les éditions
               </button>
               {editionsList.map(ed => {
                  const isActive = selectedCatalogueEdition === ed;
                  return (
                    <button key={ed} onClick={() => setSelectedCatalogueEdition(ed)} className={`snap-start shrink-0 px-6 py-2 rounded-full font-bold transition-all duration-150 border-2 ${isActive ? 'bg-[var(--logo-end)] text-white border-[var(--logo-end)] shadow-lg' : 'bg-[var(--surface-bg)] text-[var(--color-text-muted)] hover:bg-black/10 border-[var(--card-border)]'}`}>
                      {ed}
                    </button>
                  );
               })}
            </div>
          </div>
          
          {/* Panorama de l'Édition */}
          {(() => {
            const currentEdition = allEditions?.find(e => e.name === selectedCatalogueEdition);
            if (currentEdition?.bannerUrl) {
              return (
                <div className="w-full h-64 md:h-80 rounded-3xl overflow-hidden mb-12 relative group border border-white/10 shadow-2xl">
                  <img src={currentEdition.bannerUrl} alt={currentEdition.name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                  <div className="absolute bottom-8 left-8">
                     <h3 className="text-4xl font-black text-white uppercase tracking-widest drop-shadow-lg">{currentEdition.name}</h3>
                     {currentEdition.description && <p className="text-white/80 mt-2 max-w-2xl text-lg">{currentEdition.description}</p>}
                  </div>
                </div>
              );
            }
            return null;
          })()}

          <div className="flex flex-col gap-16">
            {['MYTHIC', 'LEGENDARY', 'EPIC', 'RARE', 'UNCOMMON', 'COMMON'].map(rarity => {
              const cardsOfRarity = allCards.filter(c => {
                if (c.rarity !== rarity) return false;
                const titleMatch = c.title ? c.title.toLowerCase().includes(searchQuery.toLowerCase()) : false;
                const playerMatch = c.player ? c.player.minecraftName.toLowerCase().includes(searchQuery.toLowerCase()) : false;
                const matchesSearch = titleMatch || playerMatch;
                const matchesRarity = rarityFilter === "ALL" || c.rarity === rarityFilter;
                const matchesEdition = selectedCatalogueEdition === "Toutes" || c.edition === selectedCatalogueEdition;
                return matchesSearch && matchesRarity && matchesEdition;
              });
              if (cardsOfRarity.length === 0) return null;
              const ownedCount = cardsOfRarity.filter(c => ownedVariantIds.has(c.id)).length;
              return (
                <div key={rarity} className="mb-16">
                  <div className="flex items-center gap-4 mb-8">
                    <div className={`px-4 py-2 rounded-lg font-black text-sm tracking-widest uppercase border ${rarity === 'MYTHIC' ? 'bg-red-500/10 text-red-500 border-red-500/30' : rarity === 'LEGENDARY' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' : rarity === 'EPIC' ? 'bg-purple-500/10 text-purple-500 border-purple-500/30' : rarity === 'RARE' ? 'bg-blue-500/10 text-blue-500 border-blue-500/30' : rarity === 'UNCOMMON' ? 'bg-green-500/10 text-green-500 border-green-500/30' : 'bg-[var(--card-bg)] text-[var(--color-text-secondary)] border-[var(--card-border)] shadow-[0_4px_10px_rgba(0,0,0,0.5)]'}`}>
                      {rarity === 'MYTHIC' ? 'Mythique' : rarity === 'LEGENDARY' ? 'Légendaire' : rarity === 'EPIC' ? 'Épique' : rarity === 'RARE' ? 'Rare' : rarity === 'UNCOMMON' ? 'Peu Commune' : 'Commune'}
                    </div>
                    <div className="px-3 py-1.5 rounded-md font-bold text-xs bg-[var(--surface-bg)] border border-[var(--card-border)] text-[var(--color-text-muted)] flex items-center gap-2">
                      <Layers className="w-3 h-3" /> {ownedCount} / {cardsOfRarity.length} possédées
                    </div>
                    <div className="flex-1 h-px bg-gradient-to-r from-[var(--card-border)] to-transparent"></div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 sm:gap-8">
                    {cardsOfRarity.map(card => {
                      const isOwned = ownedVariantIds.has(card.id);
                      return (
                        <div key={card.id} className={`relative group perspective-1000 ${!isOwned ? 'opacity-50 grayscale hover:grayscale-0 transition-all duration-500' : ''}`}>
                          <div onClick={() => isOwned && setSelectedCard(card)} className={`transition-all duration-500 transform-style-3d group-hover:scale-105 group-hover:-translate-y-4 group-hover:shadow-[0_20px_30px_rgba(0,0,0,0.5)] rounded-xl ${isOwned ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                            <CardDisplay card={card as any} size="md" ownedVariantIds={ownedVariantIds} />
                            {!isOwned && <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center "><Lock className="w-10 h-10 text-white/50" /></div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {allCards.length === 0 && (
              <div className="text-center py-24 bg-[var(--card-bg)] rounded-2xl border border-dashed border-[var(--color-border-color)] flex flex-col items-center shadow-xl">
                <div className="w-20 h-20 bg-black/10 rounded-full flex items-center justify-center mb-6 border border-[var(--card-border)]"><BookOpen className="w-10 h-10 text-[var(--color-text-muted)]" /></div>
                <h3 className="text-3xl font-outfit font-black text-[var(--text-color)] mb-3">Catalogue vide</h3>
                <p className="text-[var(--color-text-secondary)] max-w-md text-lg">Aucune carte n'a encore été publiée sur le serveur.</p>
              </div>
            )}
            {allCards.length > 0 && !['MYTHIC', 'LEGENDARY', 'EPIC', 'RARE', 'UNCOMMON', 'COMMON'].some(rarity => {
              return allCards.filter(c => {
                if (c.rarity !== rarity) return false;
                const titleMatch = c.title ? c.title.toLowerCase().includes(searchQuery.toLowerCase()) : false;
                const playerMatch = c.player ? c.player.minecraftName.toLowerCase().includes(searchQuery.toLowerCase()) : false;
                const matchesSearch = titleMatch || playerMatch;
                const matchesRarity = rarityFilter === "ALL" || c.rarity === rarityFilter;
                const matchesEdition = selectedCatalogueEdition === "Toutes" || c.edition === selectedCatalogueEdition;
                return matchesSearch && matchesRarity && matchesEdition;
              }).length > 0;
            }) && (
              <div className="text-center py-24 bg-[var(--card-bg)] rounded-2xl border border-dashed border-[var(--color-border-color)] flex flex-col items-center shadow-xl">
                <div className="w-20 h-20 bg-black/10 rounded-full flex items-center justify-center mb-6 border border-[var(--card-border)]"><Search className="w-10 h-10 text-[var(--color-text-muted)]" /></div>
                <h3 className="text-2xl font-outfit font-black text-[var(--text-color)] mb-2">Aucune carte trouvée</h3>
                <p className="text-[var(--color-text-secondary)] max-w-md mb-8">Aucune carte de ce catalogue ne correspond à vos filtres.</p>
                <button onClick={() => {setSearchQuery(""); setRarityFilter("ALL"); setSelectedCatalogueEdition("Toutes");}} className="group relative inline-block">
                  <div className="absolute inset-0 rounded-xl translate-y-1.5 translate-x-1.5 transition-all duration-150 bg-black/10 border border-[var(--card-border)]"></div>
                  <div className="relative px-6 py-2 rounded-xl font-bold border-2 transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:-translate-x-0.5 group-active:translate-y-1.5 group-active:translate-x-1.5 flex items-center justify-center gap-2 bg-[var(--surface-bg)] border-[var(--card-border)] text-[var(--color-text-muted)] group-hover:text-[var(--logo-end)]">
                    Réinitialiser les filtres
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedCard && (
        <div className="fixed inset-0 z-[2000] bg-black/95 overflow-y-auto custom-scrollbar animate-in fade-in duration-300" onClick={() => setSelectedCard(null)}>
          <div className="min-h-full flex items-center justify-center p-4 sm:p-6">
            <div className="relative w-full max-w-5xl flex flex-col md:flex-row items-center md:items-stretch gap-8 animate-slide-up" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setSelectedCard(null)} className="absolute -top-14 right-0 md:-top-6 md:-right-16 text-white/50 hover:text-white transition-colors z-[110] bg-white/5 hover:bg-purple-500/20 p-3 rounded-full border border-white/10"><X className="w-8 h-8" /></button>
            <div className="flex-shrink-0 w-full max-w-[400px] flex items-center justify-center">
              <div className="animate-float shadow-[0_0_50px_rgba(255,255,255,0.1)] rounded-2xl"><CardDisplay card={selectedCard} size="lg" ownedVariantIds={ownedVariantIds} /></div>
            </div>
            <div className="flex-1 w-full max-h-[80vh] overflow-y-auto custom-scrollbar bg-gradient-to-br from-[#161622] to-[#0a0a0f] border border-[var(--color-border-color)] rounded-3xl p-8 flex flex-col shadow-2xl relative">
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-[radial-gradient(ellipse_at_center,_rgba(168,85,247,0.2)_0%,_transparent_70%)] rounded-full pointer-events-none"></div>
              <h3 className="text-4xl font-outfit font-black text-white mb-4 relative z-10">
                {selectedCard.title}
                {selectedCard.asVariantLinks && selectedCard.asVariantLinks.length > 0 && selectedCard.asVariantLinks[0].variantProfile && (
                  <span className="ml-4 text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-400 opacity-90">({selectedCard.asVariantLinks[0].variantProfile.name})</span>
                )}
              </h3>
              <div className="flex items-center gap-3 mb-8 relative z-10">
                <span className={`px-4 py-1.5 rounded-full text-sm font-bold border uppercase tracking-wider ${selectedCard.rarity === 'COMMON' ? 'bg-gray-500/20 text-gray-300 border-gray-500/50' : selectedCard.rarity === 'UNCOMMON' ? 'bg-green-500/20 text-green-300 border-green-500/50' : selectedCard.rarity === 'RARE' ? 'bg-blue-500/20 text-blue-300 border-blue-500/50' : selectedCard.rarity === 'EPIC' ? 'bg-purple-500/20 text-purple-300 border-purple-500/50' : selectedCard.rarity === 'LEGENDARY' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50' : 'bg-red-500/20 text-red-300 border-red-500/50'}`}>{selectedCard.rarity}</span>
                <span className="px-4 py-1.5 rounded-full text-sm font-bold border bg-indigo-500/10 text-indigo-300 border-indigo-500/30">Niveau {selectedCard.level}</span>
                {(() => {
                  const attrs = typeof selectedCard.attributes === 'string' ? JSON.parse(selectedCard.attributes) : (selectedCard.attributes || {});
                  const variantName = (selectedCard.asVariantLinks && selectedCard.asVariantLinks.length > 0 && selectedCard.asVariantLinks[0].variantProfile) 
                    ? selectedCard.asVariantLinks[0].variantProfile.name 
                    : attrs.variantName;

                  if (selectedCard.isVariant && variantName) {
                    return (
                      <span className="px-4 py-1.5 rounded-full text-sm font-bold border bg-pink-500/10 text-pink-300 border-pink-500/30 bg-gradient-to-r from-pink-500/20 to-purple-500/20 uppercase tracking-wider shadow-[0_0_15px_rgba(236,72,153,0.3)]">
                        Variante {variantName}
                      </span>
                    );
                  }
                  return null;
                })()}
                {!selectedCard.isVariant && selectedCard.edition && selectedCard.edition !== 'STANDARD' && selectedCard.edition !== 'Standard' && (
                  <span className="px-4 py-1.5 rounded-full text-sm font-bold border bg-cyan-500/10 text-cyan-300 border-cyan-500/30 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 uppercase tracking-wider">
                    Édition {selectedCard.edition}
                  </span>
                )}
                {(selectedCard as any).specialEffect && (selectedCard as any).specialEffect !== 'none' && (
                  <span className="px-4 py-1.5 rounded-full text-sm font-bold border bg-amber-500/10 text-amber-300 border-amber-500/30 bg-gradient-to-r from-amber-500/20 to-orange-500/20">
                    ({(selectedCard as any).specialEffect})
                  </span>
                )}

              </div>
              <div className="flex gap-4 mb-6 border-b border-white/10 relative z-10">
                <button onClick={() => setActiveModalTab("details")} className={`px-4 py-2 font-bold transition-colors ${activeModalTab === 'details' ? 'text-white border-b-2 border-purple-500' : 'text-white/40 hover:text-white/60'}`}>Détails</button>
                {(() => {
                  const attrs = typeof selectedCard.attributes === 'string' ? JSON.parse(selectedCard.attributes) : (selectedCard.attributes || {});
                  if (attrs.variantSuite || attrs.parentCardId) return <button onClick={() => setActiveModalTab("variants")} className={`px-4 py-2 font-bold transition-colors flex items-center gap-2 ${activeModalTab === 'variants' ? 'text-white border-b-2 border-purple-500' : 'text-white/40 hover:text-white/60'}`}>Variantes <span className="bg-purple-500 text-[10px] px-1.5 py-0.5 rounded-full text-white">NEW</span></button>;
                  return null;
                })()}
              </div>
              {activeModalTab === "details" ? (
                <>
                  <div className="flex-1 bg-black/40 rounded-2xl p-6 border border-white/5 relative z-10">
                    <h4 className="text-xs font-bold text-[var(--color-text-secondary)] mb-3 uppercase tracking-widest flex items-center gap-2"><Sparkles className="w-3 h-3" /> Description de la Carte</h4>
                    <p className="text-white/90 whitespace-pre-wrap leading-relaxed font-medium text-lg">{selectedCard.description || "Aucune description pour cette carte"}</p>
                  </div>
                  {selectedCard.player && (
                    <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between relative z-10 bg-white/5 rounded-xl p-4">
                      <div className="flex items-center gap-4">
                        <img src={`https://vzge.me/bust/512/${selectedCard.player.minecraftName}.png`} alt="Skin" fetchPriority="high" className="w-12 h-12 object-contain drop-shadow-lg" />
                        <div><span className="text-xs text-[var(--color-text-secondary)] block uppercase tracking-wider font-bold">Joueur Associé</span><span className="text-lg font-black text-white">{selectedCard.player.minecraftName}</span></div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 bg-black/40 rounded-2xl p-6 border border-white/5 relative z-10 overflow-y-auto">
                  <h4 className="text-xs font-bold text-[var(--color-text-secondary)] mb-4 uppercase tracking-widest flex items-center gap-2"><Layers className="w-3 h-3" /> Suite d'Évolution</h4>
                  <div className="flex flex-col gap-6">
                    {(() => {
                      try {
                        const attrs = typeof selectedCard.attributes === 'string' ? JSON.parse(selectedCard.attributes) : (selectedCard.attributes || {});
                        const suiteIds = attrs.variantSuite || [];
                        const parentId = attrs.parentCardId;
                        const relatedCards = allCards.filter(c => suiteIds.includes(c.id) || c.id === parentId || JSON.parse(c.attributes || '{}').parentCardId === selectedCard.id);
                        if (relatedCards.length === 0) return <p className="text-white/50 italic">Aucune autre variante trouvée.</p>;
                        return (
                          <div className="grid grid-cols-1 gap-4">
                            {relatedCards.map(c => (
                              <div key={c.id} onClick={() => setSelectedCard(c)} className="flex items-center gap-4 bg-white/5 hover:bg-white/10 p-3 rounded-xl border border-white/10 cursor-pointer transition-all group">
                                <div className="w-12 h-16 bg-gray-800 rounded-lg overflow-hidden shrink-0"><img src={c.imageUrl || `https://vzge.me/bust/512/${c.player?.minecraftName || c.title}.png`} loading="lazy" decoding="async" className="w-full h-full object-cover" alt="" /></div>
                                <div className="flex-1"><span className="text-sm font-black text-white group-hover:text-purple-400 transition-colors">{c.title}</span><div className="flex items-center gap-2"><span className="text-[10px] text-white/50 uppercase">{c.rarity}</span><span className="text-[10px] text-indigo-400 uppercase font-bold">{c.level}</span></div></div>
                                <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white transition-all" />
                              </div>
                            ))}
                          </div>
                        );
                      } catch (e) { return <p className="text-red-400">Erreur lors du chargement des variantes.</p>; }
                    })()}
                  </div>
                  <div className="mt-8 p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/20"><p className="text-xs text-indigo-200 leading-relaxed">💡 Les variantes représentent l'évolution de vos personnages préférés. Collectionnez la suite complète pour débloquer des succès exclusifs !</p></div>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showRatesModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-8 animate-in fade-in duration-300" onClick={() => setShowRatesModal(false)}>
          <div className="panel-matte p-12 lg:p-16 rounded-3xl overflow-hidden relative shadow-2xl w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/10 via-transparent to-transparent pointer-events-none" />
            <button onClick={() => setShowRatesModal(false)} className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors z-50 bg-white/5 hover:bg-purple-500/20 p-3 rounded-full border border-white/10"><X className="w-6 h-6" /></button>
            <h3 className="text-3xl font-outfit font-black text-white mb-2 relative z-10 flex items-center gap-3"><Search className="w-8 h-8 text-indigo-400" /> Taux d'Obtention (Drop Rates)</h3>
            <p className="text-white/50 mb-10 relative z-10">Consultez vos chances d'obtenir les cartes les plus rares.</p>
            <div className="relative z-10 overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-black/60 uppercase text-white/50 border-b border-white/10">
                  <tr><th className="px-6 py-4 font-bold">Rareté</th><th className="px-6 py-4 font-bold text-blue-400">Standard</th><th className="px-6 py-4 font-bold text-purple-400">Premium</th><th className="px-6 py-4 font-bold text-yellow-400">Légendaire</th><th className="px-6 py-4 font-bold text-red-400">Mythique</th></tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-black/30 font-medium text-white">
                  <tr className="hover:bg-white/5 transition-colors"><td className="px-6 py-4 text-gray-400">Commune</td><td className="px-6 py-4">70%</td><td className="px-6 py-4">45%</td><td className="px-6 py-4">25%</td><td className="px-6 py-4 opacity-30">0%</td></tr>
                  <tr className="hover:bg-white/5 transition-colors"><td className="px-6 py-4 text-blue-400">Rare</td><td className="px-6 py-4">20%</td><td className="px-6 py-4">35%</td><td className="px-6 py-4">40%</td><td className="px-6 py-4 opacity-30">0%</td></tr>
                  <tr className="hover:bg-white/5 transition-colors"><td className="px-6 py-4 text-purple-400">Épique</td><td className="px-6 py-4">8%</td><td className="px-6 py-4">15%</td><td className="px-6 py-4">25%</td><td className="px-6 py-4">75%</td></tr>
                  <tr className="hover:bg-white/5 transition-colors"><td className="px-6 py-4 text-yellow-400 font-bold">Légendaire</td><td className="px-6 py-4">2%</td><td className="px-6 py-4">5%</td><td className="px-6 py-4 text-yellow-400">10%</td><td className="px-6 py-4 text-yellow-400">20%</td></tr>
                  <tr className="hover:bg-white/5 transition-colors bg-red-900/10"><td className="px-6 py-4 text-red-500 font-black">Mythique</td><td className="px-6 py-4 opacity-30">0%</td><td className="px-6 py-4 opacity-30">0%</td><td className="px-6 py-4 opacity-30">0%</td><td className="px-6 py-4 text-red-500 font-black">5%</td></tr>
                </tbody>
              </table>
            </div>
            <div className="mt-8 text-center relative z-10"><button onClick={() => { setShowRatesModal(false); setSelectedBoxType('mythic'); }} className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-[0_0_20px_rgba(147,51,234,0.4)] hover:shadow-[0_0_30px_rgba(147,51,234,0.7)] hover:-translate-y-1">Tenter la Mythique (5% !)</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

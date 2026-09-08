"use client";

import { Layers, Search, Filter, Sparkles, PackageOpen } from "lucide-react";
import CardDisplay from "@/features/binder/components/CardDisplay";
import { TradingCard, UserCard } from "@/types/cards";

interface StackedItem {
  card: TradingCard;
  count: number;
  specialEffect?: string | null;
}

interface CollectionTabProps {
  inventory: UserCard[];
  stackedItems: StackedItem[];
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  rarityFilter: string;
  setRarityFilter: (val: string) => void;
  filterEdition: string;
  setFilterEdition: (val: string) => void;
  filterEffect: string;
  setFilterEffect: (val: string) => void;
  allCards: TradingCard[];
  ownedVariantIds: Set<string>;
  setSelectedCard: (card: TradingCard) => void;
  setActiveTab: (tab: "opener" | "collection" | "catalogue") => void;
}

export default function CollectionTab({
  inventory,
  stackedItems,
  searchQuery,
  setSearchQuery,
  rarityFilter,
  setRarityFilter,
  filterEdition,
  setFilterEdition,
  filterEffect,
  setFilterEffect,
  allCards,
  ownedVariantIds,
  setSelectedCard,
  setActiveTab,
}: CollectionTabProps) {
  const editionOptions = Array.from(new Set(allCards.map((c) => c.edition))).filter(Boolean);

  return (
    <div className="animate-fade-in">
      <div className="relative mb-12">
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6 flex flex-col lg:flex-row gap-6 items-center justify-between sticky top-4 z-40 shadow-xl">
          <div className="flex flex-col items-center gap-1 w-full lg:w-auto">
            <h2 className="text-3xl font-outfit font-black text-[var(--text-color)] flex items-center gap-3 justify-center">
              <Layers className="w-8 h-8 text-[var(--logo-end)]" /> Ma Collection
            </h2>
            <span className="text-[var(--color-text-secondary)] font-medium tracking-wider uppercase text-sm text-center">
              {inventory.length} cartes possédées
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <div className="relative w-full sm:w-72 group">
              <div className="relative flex items-center">
                <Search className="absolute left-4 w-5 h-5 text-[var(--color-text-muted)] group-focus-within:text-[var(--logo-end)] transition-colors" />
                <input
                  type="text"
                  placeholder="Rechercher une carte..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-[var(--surface-bg)] border-2 border-[var(--card-border)] rounded-xl text-[var(--text-color)] placeholder-[var(--color-text-muted)] outline-none focus:border-[var(--logo-end)] transition-all"
                />
              </div>
            </div>
            <div className="relative w-full sm:w-56 group">
              <div className="relative flex items-center">
                <Filter className="absolute left-4 w-5 h-5 text-[var(--color-text-muted)] group-focus-within:text-[var(--logo-end)] transition-colors" />
                <select
                  value={rarityFilter}
                  onChange={(e) => setRarityFilter(e.target.value)}
                  className="w-full pl-12 pr-10 py-3 bg-[var(--surface-bg)] border-2 border-[var(--card-border)] rounded-xl text-[var(--text-color)] outline-none focus:border-[var(--logo-end)] transition-all appearance-none cursor-pointer"
                >
                  <option value="ALL">Toutes Raretés</option>
                  <option value="COMMON">Commune</option>
                  <option value="UNCOMMON">Peu Commune</option>
                  <option value="RARE">Rare</option>
                  <option value="EPIC">Épique</option>
                  <option value="LEGENDARY">Légendaire</option>
                  <option value="MYTHIC">Mythique</option>
                </select>
                <div className="absolute right-4 pointer-events-none text-[var(--color-text-muted)] group-focus-within:text-[var(--logo-end)]">
                  ▼
                </div>
              </div>
            </div>
            <div className="relative w-full sm:w-56 group">
              <div className="relative flex items-center">
                <Layers className="absolute left-4 w-5 h-5 text-[var(--color-text-muted)] group-focus-within:text-[var(--logo-end)] transition-colors" />
                <select
                  value={filterEdition}
                  onChange={(e) => setFilterEdition(e.target.value)}
                  className="w-full pl-12 pr-10 py-3 bg-[var(--surface-bg)] border-2 border-[var(--card-border)] rounded-xl text-[var(--text-color)] outline-none focus:border-[var(--logo-end)] transition-all appearance-none cursor-pointer"
                >
                  <option value="ALL">Toutes Éditions</option>
                  {editionOptions.map((ed) => (
                    <option key={ed} value={ed}>
                      {ed}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 pointer-events-none text-[var(--color-text-muted)] group-focus-within:text-[var(--logo-end)]">
                  ▼
                </div>
              </div>
            </div>
            <div className="relative w-full sm:w-56 group">
              <div className="relative flex items-center">
                <Sparkles className="absolute left-4 w-5 h-5 text-[var(--color-text-muted)] group-focus-within:text-[var(--logo-end)] transition-colors" />
                <select
                  value={filterEffect}
                  onChange={(e) => setFilterEffect(e.target.value)}
                  className="w-full pl-12 pr-10 py-3 bg-[var(--surface-bg)] border-2 border-[var(--card-border)] rounded-xl text-[var(--text-color)] outline-none focus:border-[var(--logo-end)] transition-all appearance-none cursor-pointer"
                >
                  <option value="ALL">Tous Effets</option>
                  <option value="NONE">Sans Effet</option>
                  <option value="Holographique">Holographique</option>
                  <option value="Glitch">Glitch</option>
                  <option value="Paillettes">Paillettes</option>
                  <option value="Doré">Doré</option>
                  <option value="Néon">Néon</option>
                </select>
                <div className="absolute right-4 pointer-events-none text-[var(--color-text-muted)] group-focus-within:text-[var(--logo-end)]">
                  ▼
                </div>
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
              <h4 className="font-outfit font-bold text-base text-[var(--text-color)]">
                Inventaire Vide — Aucune carte ouverte pour l'instant
              </h4>
              <p className="text-xs text-[var(--nav-item-color)] mt-0.5">
                Ouvrez des boosters pour commencer votre collection de cartes holographiques !
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab("opener")}
            className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-[var(--logo-end)] text-white hover:opacity-90 transition-all flex items-center gap-2 flex-shrink-0 shadow-md"
          >
            <Sparkles className="w-3.5 h-3.5" /> Ouvrir des Boosters
          </button>
        </div>
      ) : stackedItems.length === 0 ? (
        <div className="text-center py-24 bg-[var(--card-bg)] rounded-2xl border border-dashed border-[var(--color-border-color)] flex flex-col items-center shadow-xl">
          <div className="w-20 h-20 bg-black/10 rounded-full flex items-center justify-center mb-6 border border-[var(--card-border)]">
            <Layers className="w-10 h-10 text-[var(--color-text-muted)]" />
          </div>
          <h3 className="text-2xl font-outfit font-black text-[var(--text-color)] mb-2">Aucune carte trouvée</h3>
          <p className="text-[var(--color-text-secondary)] max-w-md mb-8">
            Aucune carte de votre collection ne correspond à vos filtres actuels.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setRarityFilter("ALL");
            }}
            className="group relative inline-block"
          >
            <div className="absolute inset-0 rounded-xl translate-y-1.5 translate-x-1.5 transition-all duration-150 bg-black/10 border border-[var(--card-border)]" />
            <div className="relative px-6 py-2 rounded-xl font-bold border-2 transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:-translate-x-0.5 group-active:translate-y-1.5 group-active:translate-x-1.5 flex items-center justify-center gap-2 bg-[var(--surface-bg)] border-[var(--card-border)] text-[var(--color-text-muted)] group-hover:text-[var(--logo-end)]">
              Réinitialiser les filtres
            </div>
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-16">
          <div>
            <h3 className="text-3xl font-outfit font-black text-white mb-8 border-b border-white/10 pb-4">
              Vos Cartes
            </h3>
            {["MYTHIC", "LEGENDARY", "EPIC", "RARE", "UNCOMMON", "COMMON"].map((rarity) => {
              const cardsOfRarity = stackedItems.filter((item) => item.card.rarity === rarity && item.count > 0);
              if (cardsOfRarity.length === 0) return null;
              return (
                <div key={rarity} className="mb-16">
                  <div className="flex items-center gap-4 mb-8">
                    <div
                      className={`px-4 py-2 rounded-lg font-black text-sm tracking-widest uppercase border ${
                        rarity === "MYTHIC"
                          ? "bg-red-500/10 text-red-500 border-red-500/30"
                          : rarity === "LEGENDARY"
                          ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/30"
                          : rarity === "EPIC"
                          ? "bg-purple-500/10 text-purple-500 border-purple-500/30"
                          : rarity === "RARE"
                          ? "bg-blue-500/10 text-blue-500 border-blue-500/30"
                          : rarity === "UNCOMMON"
                          ? "bg-green-500/10 text-green-500 border-green-500/30"
                          : "bg-[var(--card-bg)] text-[var(--color-text-secondary)] border-[var(--card-border)] shadow-[0_4px_10px_rgba(0,0,0,0.5)]"
                      }`}
                    >
                      {rarity === "MYTHIC"
                        ? "Mythique"
                        : rarity === "LEGENDARY"
                        ? "Légendaire"
                        : rarity === "EPIC"
                        ? "Épique"
                        : rarity === "RARE"
                        ? "Rare"
                        : rarity === "UNCOMMON"
                        ? "Peu Commune"
                        : "Commune"}
                    </div>
                    <div className="flex-1 h-px bg-gradient-to-r from-[var(--card-border)] to-transparent" />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 sm:gap-8">
                    {cardsOfRarity.map((item) => (
                      <div
                        key={`${item.card.id}-${item.specialEffect || "none"}`}
                        className="relative group perspective-1000"
                      >
                        <div
                          onClick={() => setSelectedCard(item.card)}
                          className="cursor-pointer transition-all duration-500 transform-style-3d group-hover:scale-105 group-hover:-translate-y-4 group-hover:shadow-[0_20px_30px_rgba(0,0,0,0.5)] rounded-xl"
                        >
                          <CardDisplay card={item.card} size="md" ownedVariantIds={ownedVariantIds} />
                        </div>
                        {item.count > 1 && (
                          <div className="absolute -top-3 -right-3 z-50 bg-red-600 text-white font-black text-sm px-2.5 py-1 rounded-full border-2 border-[#111118] shadow-[0_0_10px_rgba(220,38,38,0.6)]">
                            x{item.count}
                          </div>
                        )}
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
  );
}

"use client";

import { BookOpen, Search, Filter, Layers, Lock } from "lucide-react";
import CardDisplay from "@/features/binder/components/CardDisplay";
import { TradingCard } from "@/types/cards";

interface CatalogueTabProps {
  allCards: TradingCard[];
  allEditions: any[];
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  rarityFilter: string;
  setRarityFilter: (val: string) => void;
  selectedCatalogueEdition: string;
  setSelectedCatalogueEdition: (val: string) => void;
  ownedVariantIds: Set<string>;
  setSelectedCard: (card: TradingCard) => void;
}

export default function CatalogueTab({
  allCards,
  allEditions,
  searchQuery,
  setSearchQuery,
  rarityFilter,
  setRarityFilter,
  selectedCatalogueEdition,
  setSelectedCatalogueEdition,
  ownedVariantIds,
  setSelectedCard,
}: CatalogueTabProps) {
  const editionsList = Array.from(new Set(allCards.map((c) => c.edition))).filter(Boolean);
  const currentEdition = allEditions?.find((e) => e.name === selectedCatalogueEdition);

  return (
    <div className="animate-fade-in">
      <div className="relative mb-12">
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6 flex flex-col lg:flex-row gap-6 items-center justify-between sticky top-4 z-40 shadow-xl">
          <div className="flex flex-col items-center lg:items-start gap-1 w-full lg:w-auto">
            <h2 className="text-3xl font-outfit font-black text-[var(--text-color)] flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-[var(--logo-end)]" /> Catalogue Complet
            </h2>
            <span className="text-[var(--color-text-secondary)] font-medium tracking-wider uppercase text-sm lg:ml-11">
              Découvrez toutes les cartes
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
          </div>
        </div>

        <div
          className="flex overflow-x-auto gap-3 px-6 pb-6 pt-6 snap-x hide-scrollbar"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <style
            dangerouslySetInnerHTML={{
              __html: `
             .hide-scrollbar::-webkit-scrollbar { display: none; }
           `,
            }}
          />
          <button
            onClick={() => setSelectedCatalogueEdition("Toutes")}
            className={`snap-start shrink-0 px-6 py-2 rounded-full font-bold transition-all duration-150 border-2 ${
              selectedCatalogueEdition === "Toutes"
                ? "bg-[var(--logo-end)] text-white border-[var(--logo-end)] shadow-lg"
                : "bg-[var(--surface-bg)] text-[var(--color-text-muted)] hover:bg-black/10 border-[var(--card-border)]"
            }`}
          >
            Toutes les éditions
          </button>
          {editionsList.map((ed) => {
            const isActive = selectedCatalogueEdition === ed;
            return (
              <button
                key={ed}
                onClick={() => setSelectedCatalogueEdition(ed)}
                className={`snap-start shrink-0 px-6 py-2 rounded-full font-bold transition-all duration-150 border-2 ${
                  isActive
                    ? "bg-[var(--logo-end)] text-white border-[var(--logo-end)] shadow-lg"
                    : "bg-[var(--surface-bg)] text-[var(--color-text-muted)] hover:bg-black/10 border-[var(--card-border)]"
                }`}
              >
                {ed}
              </button>
            );
          })}
        </div>
      </div>

      {currentEdition?.bannerUrl && (
        <div className="w-full h-64 md:h-80 rounded-3xl overflow-hidden mb-12 relative group border border-white/10 shadow-2xl">
          <img
            src={currentEdition.bannerUrl}
            alt={currentEdition.name}
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-8 left-8">
            <h3 className="text-4xl font-black text-white uppercase tracking-widest drop-shadow-lg">
              {currentEdition.name}
            </h3>
            {currentEdition.description && (
              <p className="text-white/80 mt-2 max-w-2xl text-lg">{currentEdition.description}</p>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-16">
        {["MYTHIC", "LEGENDARY", "EPIC", "RARE", "UNCOMMON", "COMMON"].map((rarity) => {
          const cardsOfRarity = allCards.filter((c) => {
            if (c.rarity !== rarity) return false;
            const titleMatch = c.title ? c.title.toLowerCase().includes(searchQuery.toLowerCase()) : false;
            const playerMatch = c.player
              ? c.player.minecraftName.toLowerCase().includes(searchQuery.toLowerCase())
              : false;
            const matchesSearch = titleMatch || playerMatch;
            const matchesRarity = rarityFilter === "ALL" || c.rarity === rarityFilter;
            const matchesEdition =
              selectedCatalogueEdition === "Toutes" || c.edition === selectedCatalogueEdition;
            return matchesSearch && matchesRarity && matchesEdition;
          });
          if (cardsOfRarity.length === 0) return null;
          const ownedCount = cardsOfRarity.filter((c) => ownedVariantIds.has(c.id)).length;
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
                <div className="px-3 py-1.5 rounded-md font-bold text-xs bg-[var(--surface-bg)] border border-[var(--card-border)] text-[var(--color-text-muted)] flex items-center gap-2">
                  <Layers className="w-3 h-3" /> {ownedCount} / {cardsOfRarity.length} possédées
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-[var(--card-border)] to-transparent" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 sm:gap-8">
                {cardsOfRarity.map((card) => {
                  const isOwned = ownedVariantIds.has(card.id);
                  return (
                    <div
                      key={card.id}
                      className={`relative group perspective-1000 ${
                        !isOwned ? "opacity-50 grayscale hover:grayscale-0 transition-all duration-500" : ""
                      }`}
                    >
                      <div
                        onClick={() => isOwned && setSelectedCard(card)}
                        className={`transition-all duration-500 transform-style-3d group-hover:scale-105 group-hover:-translate-y-4 group-hover:shadow-[0_20px_30px_rgba(0,0,0,0.5)] rounded-xl ${
                          isOwned ? "cursor-pointer" : "cursor-not-allowed"
                        }`}
                      >
                        <CardDisplay card={card as any} size="md" ownedVariantIds={ownedVariantIds} />
                        {!isOwned && (
                          <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                            <Lock className="w-10 h-10 text-white/50" />
                          </div>
                        )}
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
            <div className="w-20 h-20 bg-black/10 rounded-full flex items-center justify-center mb-6 border border-[var(--card-border)]">
              <BookOpen className="w-10 h-10 text-[var(--color-text-muted)]" />
            </div>
            <h3 className="text-3xl font-outfit font-black text-[var(--text-color)] mb-3">Catalogue vide</h3>
            <p className="text-[var(--color-text-secondary)] max-w-md text-lg">
              Aucune carte n'a encore été publiée sur le serveur.
            </p>
          </div>
        )}
        {allCards.length > 0 &&
          !["MYTHIC", "LEGENDARY", "EPIC", "RARE", "UNCOMMON", "COMMON"].some((rarity) => {
            return (
              allCards.filter((c) => {
                if (c.rarity !== rarity) return false;
                const titleMatch = c.title ? c.title.toLowerCase().includes(searchQuery.toLowerCase()) : false;
                const playerMatch = c.player
                  ? c.player.minecraftName.toLowerCase().includes(searchQuery.toLowerCase())
                  : false;
                const matchesSearch = titleMatch || playerMatch;
                const matchesRarity = rarityFilter === "ALL" || c.rarity === rarityFilter;
                const matchesEdition =
                  selectedCatalogueEdition === "Toutes" || c.edition === selectedCatalogueEdition;
                return matchesSearch && matchesRarity && matchesEdition;
              }).length > 0
            );
          }) && (
            <div className="text-center py-24 bg-[var(--card-bg)] rounded-2xl border border-dashed border-[var(--color-border-color)] flex flex-col items-center shadow-xl">
              <div className="w-20 h-20 bg-black/10 rounded-full flex items-center justify-center mb-6 border border-[var(--card-border)]">
                <Search className="w-10 h-10 text-[var(--color-text-muted)]" />
              </div>
              <h3 className="text-2xl font-outfit font-black text-[var(--text-color)] mb-2">Aucune carte trouvée</h3>
              <p className="text-[var(--color-text-secondary)] max-w-md mb-8">
                Aucune carte de ce catalogue ne correspond à vos filtres.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setRarityFilter("ALL");
                  setSelectedCatalogueEdition("Toutes");
                }}
                className="group relative inline-block"
              >
                <div className="absolute inset-0 rounded-xl translate-y-1.5 translate-x-1.5 transition-all duration-150 bg-black/10 border border-[var(--card-border)]" />
                <div className="relative px-6 py-2 rounded-xl font-bold border-2 transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:-translate-x-0.5 group-active:translate-y-1.5 group-active:translate-x-1.5 flex items-center justify-center gap-2 bg-[var(--surface-bg)] border-[var(--card-border)] text-[var(--color-text-muted)] group-hover:text-[var(--logo-end)]">
                  Réinitialiser les filtres
                </div>
              </button>
            </div>
          )}
      </div>
    </div>
  );
}

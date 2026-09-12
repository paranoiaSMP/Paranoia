"use client";

import { useState } from "react";
import { Search, ImagePlus, Trash2, Camera } from "lucide-react";

interface AdminCardCatalogProps {
  cards: any[];
  onEditCard: (card: any) => void;
  onDeleteCard: (id: string) => void;
  onGenerateMissingCards?: () => void;
  onRegenerateAllCards?: () => void;
  onGenerateSingleCard?: (card: any) => void;
  isGenerating?: boolean;
}

export default function AdminCardCatalog({
  cards,
  onEditCard,
  onDeleteCard,
  onGenerateMissingCards,
  onRegenerateAllCards,
  onGenerateSingleCard,
  isGenerating = false,
}: AdminCardCatalogProps) {
  const [search, setSearch] = useState("");

  const filteredCards = cards.filter((card) =>
    card.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-12">
      <div className="flex flex-wrap gap-6 items-center justify-between">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-[var(--color-text-secondary)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une carte..."
            className="bg-[var(--icon-bg)] border border-[var(--card-border)] rounded-2xl px-6 py-3 text-sm text-[var(--text-color)] outline-none focus:border-purple-500 w-80 shadow-inner"
          />
        </div>
        <div className="flex gap-4">
          <button
            onClick={onGenerateMissingCards}
            disabled={isGenerating}
            className="px-6 py-3 bg-[var(--icon-bg)] hover:bg-[var(--icon-bg)] border border-[var(--card-border)] rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <ImagePlus className="w-4 h-4" /> Générer les manquantes
          </button>
          {onRegenerateAllCards && (
            <button
              onClick={onRegenerateAllCards}
              disabled={isGenerating}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-600/30 disabled:opacity-50"
            >
              <Camera className="w-4 h-4" /> Tout régénérer
            </button>
          )}
          <button className="px-6 py-3 bg-red-500/10 hover:bg-red-500 border border-red-500/20 text-red-500 hover:text-[var(--text-color)] rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2">
            <Trash2 className="w-4 h-4" /> Reset total
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
        {filteredCards.map((card) => (
          <div
            key={card.id}
            className="group bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[2.5rem] p-7 hover:border-purple-500/30 transition-all relative overflow-hidden shadow-2xl hover:-translate-y-2"
          >
            <div className="flex flex-col items-center text-center space-y-5">
              <div className="w-28 aspect-[2.5/3.5] bg-[var(--surface-bg)] rounded-xl border border-[var(--card-border)] flex items-center justify-center overflow-hidden shadow-inner group-hover:scale-105 transition-transform duration-500 relative">
                {card.renderedImageUrl ? (
                  <img src={card.renderedImageUrl} className="w-full h-full object-cover z-10" alt={card.title} />
                ) : (
                  <div className="flex flex-col items-center justify-center p-2">
                    <img src={`https://vzge.me/bust/512/${card.title}.png`} className="w-16 h-16 object-contain z-10" alt="" />
                    <span className="text-[9px] text-amber-400 font-bold uppercase mt-1">Non rendue</span>
                  </div>
                )}
              </div>
              <div>
                <h4 className="text-[var(--text-color)] font-black uppercase tracking-tighter text-xl leading-tight mb-1">
                  {card.title}
                </h4>
                <div className="flex flex-col gap-1 items-center">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">
                      {card.rarity}
                    </span>
                    {card.renderedImageUrl ? (
                      <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        CDN OK
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        À générer
                      </span>
                    )}
                  </div>
                  <span className="text-[8px] font-bold text-gray-600 uppercase tracking-[0.2em]">
                    {card.edition} • {card.level}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-8">
              <button
                onClick={() => onEditCard(card)}
                className="flex-1 py-3 bg-white text-black rounded-xl text-[10px] font-black transition-all hover:bg-purple-500 hover:text-[var(--text-color)] uppercase tracking-widest"
              >
                ÉDITER
              </button>
              {onGenerateSingleCard && (
                <button
                  onClick={() => onGenerateSingleCard(card)}
                  disabled={isGenerating}
                  title="Générer le rendu CDN"
                  className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400 hover:bg-purple-500 hover:text-white transition-all disabled:opacity-50"
                >
                  <Camera className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => onDeleteCard(card.id)}
                className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 hover:bg-red-500 hover:text-[var(--text-color)] transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {filteredCards.length === 0 && (
          <div className="col-span-full py-32 text-center border border-dashed border-[var(--card-border)] rounded-[3rem] bg-white/[0.01]">
            <p className="text-[var(--color-text-secondary)] italic font-bold uppercase tracking-[0.3em] text-xs">
              Le catalogue de cartes est vide
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

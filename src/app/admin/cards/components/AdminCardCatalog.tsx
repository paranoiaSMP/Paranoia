"use client";

import { useState } from "react";
import { Search, ImagePlus, Trash2 } from "lucide-react";

interface AdminCardCatalogProps {
  cards: any[];
  onEditCard: (card: any) => void;
  onDeleteCard: (id: string) => void;
  onGenerateMissingCards?: () => void;
}

export default function AdminCardCatalog({
  cards,
  onEditCard,
  onDeleteCard,
  onGenerateMissingCards,
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
            className="px-6 py-3 bg-[var(--icon-bg)] hover:bg-[var(--icon-bg)] border border-[var(--card-border)] rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer"
          >
            <ImagePlus className="w-4 h-4" /> Générer les manquantes
          </button>
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
              <div className="w-24 h-24 bg-[var(--surface-bg)] rounded-[2rem] border border-[var(--card-border)] flex items-center justify-center overflow-hidden shadow-inner group-hover:scale-110 transition-transform duration-500 relative">
                <img src={`https://vzge.me/bust/512/${card.title}.png`} className="w-20 h-20 object-contain z-10" alt="" />
                <div className="absolute inset-0 bg-gradient-to-t from-purple-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div>
                <h4 className="text-[var(--text-color)] font-black uppercase tracking-tighter text-xl leading-tight mb-1">
                  {card.title}
                </h4>
                <div className="flex flex-col gap-1 items-center">
                  <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">
                    {card.rarity}
                  </span>
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

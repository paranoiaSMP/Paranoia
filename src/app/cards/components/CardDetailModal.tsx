"use client";

import { X, Sparkles, Layers, ChevronRight } from "lucide-react";
import CardDisplay from "@/features/binder/components/CardDisplay";
import { TradingCard } from "@/types/cards";

interface CardDetailModalProps {
  card: TradingCard;
  onClose: () => void;
  allCards: TradingCard[];
  ownedVariantIds: Set<string>;
  onSelectCard: (card: TradingCard) => void;
  activeModalTab: "details" | "variants";
  setActiveModalTab: (tab: "details" | "variants") => void;
}

export default function CardDetailModal({
  card,
  onClose,
  allCards,
  ownedVariantIds,
  onSelectCard,
  activeModalTab,
  setActiveModalTab,
}: CardDetailModalProps) {
  const attrs = typeof card.attributes === "string" ? JSON.parse(card.attributes) : (card.attributes || {});
  const variantName = (card.asVariantLinks && card.asVariantLinks.length > 0 && card.asVariantLinks[0].variantProfile)
    ? card.asVariantLinks[0].variantProfile.name
    : attrs.variantName;

  const hasVariants = attrs.variantSuite || attrs.parentCardId;

  return (
    <div
      className="fixed inset-0 z-[2000] bg-black/95 overflow-y-auto custom-scrollbar animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div className="min-h-full flex items-center justify-center p-4 sm:p-6">
        <div
          className="relative w-full max-w-5xl flex flex-col md:flex-row items-center md:items-stretch gap-8 animate-slide-up"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute -top-14 right-0 md:-top-6 md:-right-16 text-white/50 hover:text-white transition-colors z-[110] bg-white/5 hover:bg-purple-500/20 p-3 rounded-full border border-white/10"
          >
            <X className="w-8 h-8" />
          </button>
          <div className="flex-shrink-0 w-full max-w-[400px] flex items-center justify-center">
            <div className="animate-float shadow-[0_0_50px_rgba(255,255,255,0.1)] rounded-2xl">
              <CardDisplay card={card} size="lg" ownedVariantIds={ownedVariantIds} />
            </div>
          </div>
          <div className="flex-1 w-full max-h-[80vh] overflow-y-auto custom-scrollbar bg-gradient-to-br from-[#161622] to-[#0a0a0f] border border-[var(--color-border-color)] rounded-3xl p-8 flex flex-col shadow-2xl relative">
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-[radial-gradient(ellipse_at_center,_rgba(168,85,247,0.2)_0%,_transparent_70%)] rounded-full pointer-events-none" />
            <h3 className="text-4xl font-outfit font-black text-white mb-4 relative z-10">
              {card.title}
              {card.asVariantLinks && card.asVariantLinks.length > 0 && card.asVariantLinks[0].variantProfile && (
                <span className="ml-4 text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-400 opacity-90">
                  ({card.asVariantLinks[0].variantProfile.name})
                </span>
              )}
            </h3>
            <div className="flex items-center gap-3 mb-8 relative z-10">
              <span
                className={`px-4 py-1.5 rounded-full text-sm font-bold border uppercase tracking-wider ${
                  card.rarity === "COMMON"
                    ? "bg-gray-500/20 text-gray-300 border-gray-500/50"
                    : card.rarity === "UNCOMMON"
                    ? "bg-green-500/20 text-green-300 border-green-500/50"
                    : card.rarity === "RARE"
                    ? "bg-blue-500/20 text-blue-300 border-blue-500/50"
                    : card.rarity === "EPIC"
                    ? "bg-purple-500/20 text-purple-300 border-purple-500/50"
                    : card.rarity === "LEGENDARY"
                    ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/50"
                    : "bg-red-500/20 text-red-300 border-red-500/50"
                }`}
              >
                {card.rarity}
              </span>
              <span className="px-4 py-1.5 rounded-full text-sm font-bold border bg-indigo-500/10 text-indigo-300 border-indigo-500/30">
                Niveau {card.level}
              </span>
              {card.isVariant && variantName && (
                <span className="px-4 py-1.5 rounded-full text-sm font-bold border bg-pink-500/10 text-pink-300 border-pink-500/30 bg-gradient-to-r from-pink-500/20 to-purple-500/20 uppercase tracking-wider shadow-[0_0_15px_rgba(236,72,153,0.3)]">
                  Variante {variantName}
                </span>
              )}
              {!card.isVariant && card.edition && card.edition !== "STANDARD" && card.edition !== "Standard" && (
                <span className="px-4 py-1.5 rounded-full text-sm font-bold border bg-cyan-500/10 text-cyan-300 border-cyan-500/30 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 uppercase tracking-wider">
                  Édition {card.edition}
                </span>
              )}
              {(card as any).specialEffect && (card as any).specialEffect !== "none" && (
                <span className="px-4 py-1.5 rounded-full text-sm font-bold border bg-amber-500/10 text-amber-300 border-amber-500/30 bg-gradient-to-r from-amber-500/20 to-orange-500/20">
                  ({(card as any).specialEffect})
                </span>
              )}
            </div>
            <div className="flex gap-4 mb-6 border-b border-white/10 relative z-10">
              <button
                onClick={() => setActiveModalTab("details")}
                className={`px-4 py-2 font-bold transition-colors ${
                  activeModalTab === "details"
                    ? "text-white border-b-2 border-purple-500"
                    : "text-white/40 hover:text-white/60"
                }`}
              >
                Détails
              </button>
              {hasVariants && (
                <button
                  onClick={() => setActiveModalTab("variants")}
                  className={`px-4 py-2 font-bold transition-colors flex items-center gap-2 ${
                    activeModalTab === "variants"
                      ? "text-white border-b-2 border-purple-500"
                      : "text-white/40 hover:text-white/60"
                  }`}
                >
                  Variantes <span className="bg-purple-500 text-[10px] px-1.5 py-0.5 rounded-full text-white">NEW</span>
                </button>
              )}
            </div>
            {activeModalTab === "details" ? (
              <>
                <div className="flex-1 bg-black/40 rounded-2xl p-6 border border-white/5 relative z-10">
                  <h4 className="text-xs font-bold text-[var(--color-text-secondary)] mb-3 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles className="w-3 h-3" /> Description de la Carte
                  </h4>
                  <p className="text-white/90 whitespace-pre-wrap leading-relaxed font-medium text-lg">
                    {card.description || "Aucune description pour cette carte"}
                  </p>
                </div>
                {card.player && (
                  <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between relative z-10 bg-white/5 rounded-xl p-4">
                    <div className="flex items-center gap-4">
                      <img
                        src={`https://vzge.me/bust/512/${(card.player as any)?.uuid || card.player.minecraftName}.png`}
                        alt="Skin"
                        fetchPriority="high"
                        className="w-12 h-12 object-contain drop-shadow-lg"
                        onError={(e) => {
                          e.currentTarget.src = `https://minotar.net/armor/body/${card.player?.minecraftName || "Steve"}/512.png`;
                        }}
                      />
                      <div>
                        <span className="text-xs text-[var(--color-text-secondary)] block uppercase tracking-wider font-bold">
                          Joueur Associé
                        </span>
                        <span className="text-lg font-black text-white">{card.player.minecraftName}</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 bg-black/40 rounded-2xl p-6 border border-white/5 relative z-10 overflow-y-auto">
                <h4 className="text-xs font-bold text-[var(--color-text-secondary)] mb-4 uppercase tracking-widest flex items-center gap-2">
                  <Layers className="w-3 h-3" /> Suite d'Évolution
                </h4>
                <div className="flex flex-col gap-6">
                  {(() => {
                    try {
                      const suiteIds = attrs.variantSuite || [];
                      const parentId = attrs.parentCardId;
                      const relatedCards = allCards.filter(
                        (c) =>
                          suiteIds.includes(c.id) ||
                          c.id === parentId ||
                          JSON.parse(c.attributes || "{}").parentCardId === card.id
                      );
                      if (relatedCards.length === 0)
                        return <p className="text-white/50 italic">Aucune autre variante trouvée.</p>;
                      return (
                        <div className="grid grid-cols-1 gap-4">
                          {relatedCards.map((c) => (
                            <div
                              key={c.id}
                              onClick={() => onSelectCard(c)}
                              className="flex items-center gap-4 bg-white/5 hover:bg-white/10 p-3 rounded-xl border border-white/10 cursor-pointer transition-all group"
                            >
                              <div className="w-12 h-16 bg-gray-800 rounded-lg overflow-hidden shrink-0">
                                <img
                                  src={
                                    c.imageUrl ||
                                    `https://vzge.me/bust/512/${
                                      (c.player as any)?.uuid || c.player?.minecraftName || c.title
                                    }.png`
                                  }
                                  loading="lazy"
                                  decoding="async"
                                  className="w-full h-full object-cover"
                                  alt=""
                                  onError={(e) => {
                                    e.currentTarget.src = `https://minotar.net/armor/body/${
                                      c.player?.minecraftName || "Steve"
                                    }/512.png`;
                                  }}
                                />
                              </div>
                              <div className="flex-1">
                                <span className="text-sm font-black text-white group-hover:text-purple-400 transition-colors">
                                  {c.title}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-white/50 uppercase">{c.rarity}</span>
                                  <span className="text-[10px] text-indigo-400 uppercase font-bold">{c.level}</span>
                                </div>
                              </div>
                              <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white transition-all" />
                            </div>
                          ))}
                        </div>
                      );
                    } catch (e) {
                      return <p className="text-red-400">Erreur lors du chargement des variantes.</p>;
                    }
                  })()}
                </div>
                <div className="mt-8 p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                  <p className="text-xs text-indigo-200 leading-relaxed">
                    Les variantes représentent l'évolution de vos personnages préférés. Collectionnez la suite complète
                    pour débloquer des succès exclusifs !
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { Loader2, ImagePlus } from "lucide-react";
import CardDisplay from "@/features/binder/components/CardDisplay";

interface AdminCardPreviewProps {
  cardTitle: string;
  players: any[];
  cardPlayerId: string;
  cardRarity: string;
  cardLevel: string;
  cardEdition: string;
  cardDesc: string;
  cardCustomBg: string;
  cardImageUrl: string;
  layer1Url: string;
  layer2Url: string;
  layer3Url: string;
  cardCustomBadges: any[];
  charPosX: number;
  charPosY: number;
  charScale: number | string;
  cardBorderColor: string;
  cardBgColor: string;
  cardGlowColor: string;
  factionColor: string;
  rarityBadgeColor: string;
  cardFrameUrl: string;
  titlePos: any;
  descPos: any;
  rarityBadgePos: any;
  levelTextPos: any;
  levelBadgePos: any;
  editionBadgePos: any;
  variantBadgePos: any;
  levelBadgeUrl: string;
  editionBadgeUrl: string;
  variantBadgeUrl: string;
  parentCardId: string;
  isFullArt: boolean;
  isHolo: boolean;
  hideCharacter: boolean;
  hideRarityBox: boolean;
  hideSideText: boolean;
  hideDescription: boolean;
  hideNameplate: boolean;
  hideRole: boolean;
  hideTitle: boolean;
  hideBottomText: boolean;
  cardEffect: string;
  titleColor: string;
  descColor: string;
  levelColor: string;
  showTitle: boolean;
  showDesc: boolean;
  showRarityBadge: boolean;
  showLevelText: boolean;
  showLevelIcon: boolean;
  onUpdateElement: (type: string, id: string, data: any) => void;
  isCapturing: boolean;
  onCaptureDiscordImage: () => void;
}

export default function AdminCardPreview({
  cardTitle,
  players,
  cardPlayerId,
  cardRarity,
  cardLevel,
  cardEdition,
  cardDesc,
  cardCustomBg,
  cardImageUrl,
  layer1Url,
  layer2Url,
  layer3Url,
  cardCustomBadges,
  charPosX,
  charPosY,
  charScale,
  cardBorderColor,
  cardBgColor,
  cardGlowColor,
  factionColor,
  rarityBadgeColor,
  cardFrameUrl,
  titlePos,
  descPos,
  rarityBadgePos,
  levelTextPos,
  levelBadgePos,
  editionBadgePos,
  variantBadgePos,
  levelBadgeUrl,
  editionBadgeUrl,
  variantBadgeUrl,
  parentCardId,
  isFullArt,
  isHolo,
  hideCharacter,
  hideRarityBox,
  hideSideText,
  hideDescription,
  hideNameplate,
  hideRole,
  hideTitle,
  hideBottomText,
  cardEffect,
  titleColor,
  descColor,
  levelColor,
  showTitle,
  showDesc,
  showRarityBadge,
  showLevelText,
  showLevelIcon,
  onUpdateElement,
  isCapturing,
  onCaptureDiscordImage,
}: AdminCardPreviewProps) {
  const resolvedPlayer = players.find((p) => p.id === cardPlayerId);

  return (
    <div className="lg:col-span-5 xl:col-span-4 sticky top-24">
      <div className="flex flex-col items-center gap-10">
        <div
          id="live-preview-card"
          className="perspective-1000 transform hover:scale-[1.03] transition-all duration-700 drop-shadow-[0_40px_80px_rgba(0,0,0,0.9)]"
        >
          <CardDisplay
            isEditing={true}
            onUpdateElement={onUpdateElement}
            card={{
              id: "preview",
              title: cardTitle || resolvedPlayer?.minecraftName || "Pseudo Joueur",
              rarity: cardRarity,
              level: cardLevel,
              edition: cardEdition,
              description: cardDesc || "Description de la carte...",
              customBackground: cardCustomBg,
              imageUrl: cardImageUrl,
              layer1Url,
              layer2Url,
              layer3Url,
              customBadges: cardCustomBadges,
              characterPosition: { x: charPosX, y: charPosY, scale: charScale },
              attributes: JSON.stringify({
                borderColor: cardBorderColor,
                cardBgColor,
                cardGlowColor,
                factionColor,
                rarityBadgeColor,
                frameUrl: cardFrameUrl,
                titlePos,
                descPos,
                rarityBadgePos,
                levelTextPos,
                levelBadgePos,
                editionBadgePos,
                variantBadgePos,
                levelBadgeUrl,
                editionBadgeUrl,
                variantBadgeUrl,
                parentCardId,
                isFullArt,
                isHolo,
                hideCharacter,
                hideRarityBox,
                hideSideText,
                hideDescription,
                hideNameplate,
                hideRole,
                hideTitle,
                hideBottomText,
                effect: cardEffect,
                titleColor,
                descColor,
                levelColor,
                showTitle,
                showDesc,
                showRarityBadge,
                showLevelText,
                showLevelIcon,
              }),
              player: { minecraftName: resolvedPlayer?.minecraftName || "" },
            }}
            size="lg"
          />
        </div>

        <div className="w-full space-y-6">
          <div className="text-center space-y-4 bg-[var(--card-bg)]/60 border border-[var(--card-border)] p-8 rounded-[2.5rem] backdrop-blur-xl shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-transparent" />
            <p className="text-[10px] font-black text-purple-400 uppercase tracking-[0.4em] mb-2">
              Workspace Interactif
            </p>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed font-medium">
              <span className="text-[var(--text-color)] font-bold">DRAG:</span> Déplacez les textes et images.
              <br />
              <span className="text-[var(--text-color)] font-bold">WHEEL:</span> Redimensionnez les éléments.
            </p>
          </div>

          <button
            onClick={onCaptureDiscordImage}
            disabled={isCapturing}
            className="w-full py-5 bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-600 hover:text-[var(--text-color)] transition-all flex items-center justify-center gap-3 shadow-xl disabled:opacity-50"
          >
            {isCapturing ? <Loader2 className="w-6 h-6 animate-spin" /> : <ImagePlus className="w-6 h-6" />}
            {isCapturing ? "Génération en cours..." : "Figer pour Discord"}
          </button>
        </div>
      </div>
    </div>
  );
}

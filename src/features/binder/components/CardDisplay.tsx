"use client";

import React, { useState, useRef } from "react";
import { Sparkles } from "lucide-react";

export const getRarityGlow = (rarity: string) => {
  const r = rarity.toUpperCase();
  if (r === "MYTHIC" || r === "MYTHIQUE") return "animate-pulse-glow-mythic";
  if (r === "LEGENDARY" || r === "LÉGENDAIRE" || r === "LEGENDAIRE") return "animate-pulse-glow-legendary";
  if (r === "EPIC" || r === "ÉPIQUE" || r === "EPIQUE") return "animate-pulse-glow-epic";
  if (r === "RARE") return "animate-pulse-glow-rare";
  if (r === "UNCOMMON" || r === "PEU COMMUNE") return "animate-pulse-glow-uncommon";
  return "animate-pulse-glow-common";
};

export const getLevelStyle = (level: string): React.CSSProperties => {
  switch(level) {
    case "Iron":
      return { backgroundImage: "linear-gradient(135deg, #6b7280 0%, #374151 40%, #9ca3af 50%, #1f2937 60%, #111827 100%)" };
    case "Gold":
      return { backgroundImage: "linear-gradient(135deg, #facc15 0%, #a16207 40%, #fef08a 50%, #854d0e 60%, #422006 100%)" };
    case "Diamond":
      return { backgroundImage: "conic-gradient(from 120deg at 50% 50%, #0891b2, #06b6d4, #67e8f9, #0891b2, #164e63, #0891b2)" };
    case "Netherite":
      return {
        backgroundColor: "#0a0510",
        backgroundImage: "radial-gradient(circle at 50% 0%, rgba(139, 92, 246, 0.5) 0%, transparent 50%), radial-gradient(circle at 50% 100%, rgba(88, 28, 135, 0.8) 0%, transparent 60%), url('https://www.transparenttextures.com/patterns/dark-matter.png')",
        backgroundBlendMode: "screen, screen, overlay"
      };
    default:
      return { backgroundColor: "var(--color-bg-card)" };
  }
};

export const getRarityBackground = (rarity: string): React.CSSProperties => {
  const r = rarity.toUpperCase();
  if (r === "MYTHIC" || r === "MYTHIQUE") return {
    backgroundColor: "#0a0510",
    backgroundImage: "radial-gradient(circle at 50% 0%, rgba(139, 92, 246, 0.5) 0%, transparent 50%), radial-gradient(circle at 50% 100%, rgba(88, 28, 135, 0.8) 0%, transparent 60%), url('https://www.transparenttextures.com/patterns/dark-matter.png')"
  };
  if (r === "LEGENDARY" || r === "LÉGENDAIRE" || r === "LEGENDAIRE") return { 
    backgroundImage: "linear-gradient(135deg, #facc15 0%, #a16207 40%, #fef08a 50%, #854d0e 60%, #422006 100%)" 
  };
  if (r === "EPIC" || r === "ÉPIQUE" || r === "EPIQUE") return { 
    backgroundImage: "linear-gradient(135deg, #a855f7 0%, #6b21a8 40%, #d8b4fe 50%, #581c87 60%, #3b0764 100%)" 
  };
  if (r === "RARE") return { 
    backgroundImage: "conic-gradient(from 120deg at 50% 50%, #0891b2, #06b6d4, #67e8f9, #0891b2, #164e63, #0891b2)" 
  };
  if (r === "UNCOMMON" || r === "PEU COMMUNE") return { 
    backgroundImage: "linear-gradient(135deg, #22c55e 0%, #166534 40%, #86efac 50%, #14532d 60%, #052e16 100%)" 
  };
  return { 
    backgroundImage: "linear-gradient(135deg, #6b7280 0%, #374151 40%, #9ca3af 50%, #1f2937 60%, #111827 100%)" 
  };
};

export const getLevelBorder = (level: string) => {
  return "";
};

export const getLevelIcon = (level: string) => {
  switch(level) {
    case "Iron": return "/Iron.png"
    case "Netherite": return "/netherite.png";
    case "Diamond": return "/Diamond.png";
    case "Gold": return "/OR.png";
    default: return null;
  }
};

export const getRarityBadge = (rarity: string) => {
  const r = rarity.toUpperCase();
  if (r === "MYTHIC" || r === "MYTHIQUE") return 'bg-red-500/20 text-red-500 border-red-500/50 font-black shadow-[0_0_10px_rgba(239,68,68,0.5)]';
  if (r === "LEGENDARY" || r === "LÉGENDAIRE" || r === "LEGENDAIRE") return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
  if (r === "EPIC" || r === "ÉPIQUE" || r === "EPIQUE") return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
  if (r === "RARE") return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
  if (r === "UNCOMMON" || r === "PEU COMMUNE") return 'bg-green-500/20 text-green-400 border-green-500/50';
  return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
}

export const InteractiveCard = ({ card, children, className = "", style: customStyle = {}, disableTilt = false }: { card: any, children: React.ReactNode, className?: string, style?: React.CSSProperties, disableTilt?: boolean }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disableTilt || card?.isEditing) return;
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -15;
    const rotateY = ((x - centerX) / centerX) * 15;

    setRotation({ x: rotateX, y: rotateY });
    setGlarePosition({ x: (x / rect.width) * 100, y: (y / rect.height) * 100 });
  };

  const handleMouseEnter = () => {
    if (disableTilt) return;
    setIsHovered(true);
  };
  const handleMouseLeave = () => {
    if (disableTilt) return;
    setIsHovered(false);
    setRotation({ x: 0, y: 0 });
  };

  const style: React.CSSProperties = {
    transform: isHovered
      ? `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale3d(1.05, 1.05, 1.05)`
      : "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
    transition: isHovered ? "transform 0.1s ease-out" : "transform 0.5s ease-out",
    transformStyle: "preserve-3d",
  };

  const isRare = ["RARE", "EPIC", "ÉPIQUE", "EPIQUE", "LEGENDARY", "LÉGENDAIRE", "LEGENDAIRE", "MYTHIC", "MYTHIQUE"].includes(card.rarity.toUpperCase());
  const isEpicOrLegendary = ["EPIC", "ÉPIQUE", "EPIQUE", "LEGENDARY", "LÉGENDAIRE", "LEGENDAIRE", "MYTHIC", "MYTHIQUE"].includes(card.rarity.toUpperCase());
  const isLegendary = ["LEGENDARY", "LÉGENDAIRE", "LEGENDAIRE", "MYTHIC", "MYTHIQUE"].includes(card.rarity.toUpperCase());

  const hasVideoBg = card?.customBackground && (card.customBackground.includes('.mp4') || card.customBackground.includes('.webm'));
  const attrs = typeof card?.attributes === 'string' ? JSON.parse(card.attributes) : (card?.attributes || {});

  const combinedStyle = {
    ...style,
    ...customStyle,
    ...((attrs.cardGlowColor || attrs.mainColor) ? { '--custom-glow-color': attrs.cardGlowColor || attrs.mainColor } as React.CSSProperties : {}),
    ...((attrs.cardBgColor || attrs.mainColor)
      ? { backgroundColor: attrs.cardBgColor || attrs.mainColor, backgroundImage: 'none' }
      : (!hasVideoBg && card?.customBackground
          ? {
              backgroundImage: `url('${card.customBackground}')`,
              backgroundSize: attrs.bgScale ? `${attrs.bgScale}%` : 'cover',
              backgroundPosition: `${attrs.bgPosX ?? 50}% ${attrs.bgPosY ?? 50}%`
            }
          : (!hasVideoBg && card ? getRarityBackground(card.rarity) : { backgroundColor: "transparent" })))
  };

  return (
    <div
      ref={cardRef}
      className={`relative rounded-xl cursor-pointer ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={combinedStyle}
    >
      {hasVideoBg && (
        <div className="absolute inset-0 z-0 overflow-hidden rounded-xl">
          <video
            src={card.customBackground}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover pointer-events-none"
            style={{
              objectPosition: `${attrs.bgPosX ?? 50}% ${attrs.bgPosY ?? 50}%`,
              transform: `scale(${(attrs.bgScale ?? 100) / 100})`,
              transformOrigin: `${attrs.bgPosX ?? 50}% ${attrs.bgPosY ?? 50}%`
            }}
          />
        </div>
      )}
      {/* Subtle Texture Overlay */}
      <div className="absolute inset-0 z-0 mix-blend-overlay opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none rounded-xl" />

      <div className="relative z-10 w-full h-full" style={{ transformStyle: "preserve-3d" }}>
        {children}
      </div>
      
      {/* Reactive Holo Layer */}
      {attrs.isHolo && (
        <div
          className="absolute inset-0 pointer-events-none z-[60] rounded-xl overflow-hidden mix-blend-color-dodge transition-opacity duration-300"
          style={{
            opacity: isHovered ? 0.35 : 0.1,
            backgroundImage: `
              linear-gradient(
                115deg, 
                transparent 0%, 
                rgba(255, 0, 0, 0.3) 15%, 
                rgba(255, 255, 0, 0.3) 30%, 
                rgba(0, 255, 0, 0.3) 45%, 
                rgba(0, 255, 255, 0.3) 60%, 
                rgba(0, 0, 255, 0.3) 75%, 
                rgba(255, 0, 255, 0.3) 90%, 
                transparent 100%
              )
            `,
            backgroundSize: '300% 300%',
            backgroundPosition: `${glarePosition.x}% ${glarePosition.y}%`,
            filter: 'brightness(1.1) contrast(1.2)',
            transform: 'translateZ(5px)'
          }}
        />
      )}
        {}
        {isHovered && (
          <div
            className="absolute inset-0 pointer-events-none z-20 mix-blend-overlay rounded-xl overflow-hidden"
            style={{
              background: `radial-gradient(circle at ${glarePosition.x}% ${glarePosition.y}%, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 60%)`
            }}
          />
        )}
        {}
        {isHovered && !card.isEditing && (
          <div
            className="absolute inset-0 pointer-events-none z-20 overflow-hidden rounded-xl mix-blend-overlay"
            style={{
              opacity: 0.6,
              backgroundImage: `radial-gradient(farthest-corner at ${glarePosition.x}% ${glarePosition.y}%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 40%, transparent 100%)`
            }}
          />
        )}
      </div>
    );
  };

export default function CardDisplay({
  card,
  size = "md",
  isEditing = false,
  isOwned = true,
  disableTilt = false,
  specialEffect = null,
  childVariantBadges = [],
  ownedVariantIds = new Set(),
  onUpdateElement
}: {
  card: any,
  size?: "sm" | "md" | "lg",
  isEditing?: boolean,
  isOwned?: boolean,
  disableTilt?: boolean,
  specialEffect?: string | null,
  childVariantBadges?: string[],
  ownedVariantIds?: Set<string>,
  onUpdateElement?: (type: string, id: string, data: any) => void
}) {
  const wrapperClass = size === "lg" ? "w-80" : size === "md" ? "w-full max-w-[18rem]" : "w-56";
  const iconClass = size === "lg"
    ? "absolute -top-8 -left-8 w-28 h-28 drop-shadow-[0_0_20px_rgba(0,0,0,0.6)]"
    : size === "md"
    ? "absolute -top-5 -left-5 w-16 h-16 drop-shadow-[0_0_15px_rgba(0,0,0,0.6)]"
    : "absolute -top-4 -left-4 w-12 h-12 drop-shadow-[0_0_10px_rgba(0,0,0,0.6)]";
  const badgeScale = card.level === 'Netherite' ? 'scale-150 -translate-y-2 -translate-x-2' : 'scale-100';
  const translateZ = size === "lg" ? "30px" : "20px";

  const levelColorClass = card.level === 'Netherite' ? 'text-[#a278b5]' :
                          card.level === 'Diamond' ? 'text-[#2de2e6]' :
                          card.level === 'Gold' ? 'text-[#facc15]' :
                          card.level === 'Iron' ? 'text-gray-300' : 'text-gray-500';

  let customBadges: any[] = [];
  try {
    customBadges = typeof card.customBadges === 'string' ? JSON.parse(card.customBadges) : (card.customBadges || []);
  } catch (e) {
    customBadges = [];
  }

  const variantLinks = card.motherLinks || [];

  let charPos = { x: 50, y: 50, scale: 100 };
  try {
    charPos = typeof card.characterPosition === 'string' ? JSON.parse(card.characterPosition) : (card.characterPosition || charPos);
  } catch (e) {}

  let attrs: any = {};
  try {
    attrs = typeof card.attributes === 'string' ? JSON.parse(card.attributes) : (card.attributes || {});
  } catch (e) {}

  const isPremiumLayout = attrs.isFullArt || ["LEGENDARY", "LÉGENDAIRE", "LEGENDAIRE", "MYTHIC", "MYTHIQUE"].includes(card.rarity.toUpperCase());

  const titlePos = attrs.titlePos || { x: 50, y: 75, scale: 100 };
  const descPos = attrs.descPos || { x: 50, y: 92, scale: 100 };
  const rarityBadgePos = attrs.rarityBadgePos || { x: 15, y: 65, scale: 100 };
  const levelTextPos = attrs.levelTextPos || { x: 50, y: 82, scale: 100 };
  const textPos = attrs.textPos;
  const levelBadgePos = attrs.levelBadgePos || { x: 10, y: 8, scale: 100 };
  const editionBadgePos = attrs.editionBadgePos || { x: 85, y: 73, scale: 100 };
  const variantBadgePos = attrs.variantBadgePos || { x: 15, y: 15, scale: 100 };

  const handleMouseDown = (e: React.MouseEvent, type: string, id: string = "") => {
    if (!isEditing || !onUpdateElement) return;
    e.stopPropagation();
    e.preventDefault();
    onUpdateElement(type, id, { action: "drag_start", clientX: e.clientX, clientY: e.clientY });
  };

  const handleWheel = (e: React.WheelEvent, type: string, id: string = "") => {
    if (!isEditing || !onUpdateElement) return;
    e.stopPropagation();
    e.preventDefault();
    onUpdateElement(type, id, { action: "wheel", deltaY: e.deltaY });
  };

  const combinedStyle = {
    ...((attrs.cardGlowColor || attrs.mainColor) ? { '--custom-glow-color': attrs.cardGlowColor || attrs.mainColor } as React.CSSProperties : {}),
    ...(attrs.borderColor ? { borderColor: attrs.borderColor } : {}),
    borderWidth: attrs.isFullArt ? '6px' : '2px',
  };
  const levelIconUrl = getLevelIcon(card.level);
  let factionColor = 'bg-gray-800';
  if (card.level === 'Diamond') factionColor = 'bg-cyan-600';
  if (card.level === 'Gold') factionColor = 'bg-yellow-600';
  if (card.level === 'Iron') factionColor = 'bg-gray-400';
  if (card.level === 'Netherite') factionColor = 'bg-purple-900';
  if (attrs.factionColor) factionColor = attrs.factionColor;
  let rarityBgColor = 'bg-gray-500';
  let rarityTextColor = 'text-white';
  if (card.rarity === 'MYTHIC') { rarityBgColor = 'bg-red-600'; rarityTextColor = 'text-yellow-300'; }
  if (card.rarity === 'LEGENDARY') { rarityBgColor = 'bg-yellow-500'; rarityTextColor = 'text-white'; }
  if (card.rarity === 'EPIC') { rarityBgColor = 'bg-purple-600'; rarityTextColor = 'text-white'; }
  if (card.rarity === 'RARE') { rarityBgColor = 'bg-blue-600'; rarityTextColor = 'text-white'; }
  if (card.rarity === 'UNCOMMON') { rarityBgColor = 'bg-green-600'; rarityTextColor = 'text-white'; }

  const role = card.edition || attrs.role || 'SURVIVANT';
  const faction = attrs.faction || 'PARANOIA SMP';

  return (
    <div className={`relative ${wrapperClass} aspect-[2.5/3.5] mx-auto rounded-xl ${isEditing ? '' : 'perspective-1000'} @container`}>
      <InteractiveCard
        card={{...card, isEditing}}
        className={`${wrapperClass} aspect-[2.5/3.5] border-2 rounded-xl overflow-hidden ${getLevelBorder(card.level)} ${(attrs.cardGlowColor || attrs.mainColor) ? 'animate-pulse-glow-custom' : getRarityGlow(card.rarity)} relative`}
        style={combinedStyle}
      >
        <div className="absolute inset-0 z-10 w-full h-full flex items-end justify-center overflow-hidden rounded-xl">
          {!attrs.hideCharacter && (
            <div className="w-[120%] h-[85%] relative flex items-end justify-center pointer-events-none" style={{ transformStyle: 'preserve-3d' }}>
              {(card.layer1Url || card.layer2Url || card.layer3Url) ? (
                <>
                  {card.layer1Url && <img src={card.layer1Url} alt="Layer 1" loading="lazy" className="absolute bottom-0 w-full object-contain pointer-events-none" style={{ transform: 'translateZ(20px)' }} />}
                  {card.layer2Url && <img src={card.layer2Url} alt="Layer 2" loading="lazy" className="absolute bottom-0 w-full object-contain pointer-events-none" style={{ transform: 'translateZ(40px) scale(1.05)' }} />}
                  {card.layer3Url && <img src={card.layer3Url} alt="Layer 3" loading="lazy" className="absolute bottom-0 w-full object-contain pointer-events-none" style={{ transform: 'translateZ(70px) scale(1.1)' }} />}
                  {(!card.layer2Url && card.imageUrl) && <img src={card.imageUrl} alt="Fallback" loading="lazy" className="absolute bottom-0 w-full object-contain pointer-events-none" style={{ transform: 'translateZ(40px) scale(1.05)' }} />}
                </>
              ) : (card.imageUrl || card.player?.minecraftName || card.title) ? (
                <img
                  src={card.imageUrl || `https://vzge.me/bust/512/${card.player?.minecraftName || card.title}.png`}
                  alt={card.title}
                  loading={isEditing ? "eager" : "lazy"} decoding="async"
                  className={`w-full h-full object-cover object-top drop-shadow-2xl transition-transform duration-300 ${isEditing ? 'pointer-events-auto cursor-grab active:cursor-grabbing hover:drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]' : 'pointer-events-none'}`}
                  style={{ transform: (card.rarity === 'MYTHIC' || card.rarity === 'MYTHIQUE') ? 'translateZ(40px) scale(1.05)' : 'translateZ(10px)' }}
                  onMouseDown={(e) => handleMouseDown(e, 'character')}
                  onWheel={(e) => handleWheel(e, 'character')}
                  onError={(e) => { e.currentTarget.src = 'https://minotar.net/armor/body/Steve/512.png'; }}
                />
              ) : (
                <div className="w-20 h-20 bg-gray-700/50 rounded-full mb-10 border border-white/10"></div>
              )}
            </div>
          )}
        </div>

        {}
        {!attrs.hideRarityBox && <div
          className={`absolute z-30 flex items-center ${rarityBgColor} border-white shadow-lg overflow-hidden`}
          style={{
            top: '0', right: '0',
            borderBottomWidth: '0.4cqi',
            borderLeftWidth: '0.4cqi',
            borderBottomLeftRadius: '2cqi',
            transform: `translateZ(${translateZ})`
          }}
        >
          <span className={`${rarityTextColor} font-black italic px-[2.5cqi] py-[1cqi] leading-none uppercase tracking-wider`} style={{ fontSize: '4.5cqi' }}>
            {card.rarity}
          </span>
        </div>}

        {}
        {attrs.editionBadgeUrl && (
          <img
            src={attrs.editionBadgeUrl}
            alt="Edition Badge"
            loading={isEditing ? "eager" : "lazy"} decoding="async"
            className={`absolute z-[70] object-contain drop-shadow-md ${isEditing ? 'cursor-grab active:cursor-grabbing hover:drop-shadow-[0_0_10px_white]' : 'pointer-events-none'}`}
            style={{
              left: `${editionBadgePos.x}%`,
              top: `${editionBadgePos.y}%`,
              width: `${editionBadgePos.scale * 0.15}cqi`,
              transform: `translate(-50%, -50%) translateZ(70px)`
            }}
            onMouseDown={(e) => handleMouseDown(e, 'editionBadge')}
            onWheel={(e) => handleWheel(e, 'editionBadge')}
            draggable={false}
          />
        )}

        {}
        <div className="absolute top-[2cqi] left-[2cqi] flex flex-row gap-[1cqi] z-[70] pointer-events-none items-center">
          {attrs.variantBadgeUrl && !attrs.variantBadgeUrls && (
            <img
              src={attrs.variantBadgeUrl}
              alt="Variant Badge"
              loading={isEditing ? "eager" : "lazy"} decoding="async"
              className="object-contain drop-shadow-md"
              style={{ width: '15cqi', height: '15cqi' }}
              draggable={false}
            />
          )}
          {attrs.variantBadgeUrls && attrs.variantBadgeUrls.map((badgeUrl: string, idx: number) => (
            <img
              key={`manual-${idx}`}
              src={badgeUrl}
              alt={`Variant Badge ${idx}`}
              loading={isEditing ? "eager" : "lazy"} decoding="async"
              className="object-contain drop-shadow-md"
              style={{ width: '15cqi', height: '15cqi' }}
              draggable={false}
            />
          ))}
          {childVariantBadges.map((badgeUrl, idx) => (
            <img
              key={`child-${idx}`}
              src={badgeUrl}
              alt={`Child Variant Badge ${idx}`}
              loading={isEditing ? "eager" : "lazy"} decoding="async"
              className="object-contain drop-shadow-md"
              style={{ width: '15cqi', height: '15cqi' }}
              draggable={false}
            />
          ))}
        </div>

        {}
        {variantLinks.length > 0 && (
          <div className="absolute bottom-[11cqi] left-0 right-0 z-40 flex justify-center gap-[1.5cqi] pointer-events-none px-[2cqi]">
            {variantLinks.map((link: any) => {
              const owned = ownedVariantIds?.has(link.targetCardId);
              return (
                <div
                  key={link.id}
                  className={`w-[8cqi] h-[8cqi] rounded-full border border-white/30 bg-black/60 backdrop-blur-md flex items-center justify-center overflow-hidden transition-all shadow-lg ${owned ? 'shadow-indigo-500/50 scale-110 border-indigo-400' : 'grayscale opacity-40'}`}
                  style={{ transform: 'translateZ(45px)' }}
                >
                  <img src={link.variantProfile.iconUrl} loading={isEditing ? "eager" : "lazy"} decoding="async" className="w-[70%] h-[70%] object-contain" alt="" />
                </div>
              );
            })}
          </div>
        )}

        {}
        {}        {}
        <div className="absolute bottom-0 inset-x-0 z-30 flex flex-col" style={{ transform: `translateZ(${parseInt(translateZ) * 1.2}px)` }}>
          {}
          {(!attrs.hideDescription && card.description) && (
            <div className={`w-full bg-black/90 border-white/20 shadow-inner relative ${attrs.hideNameplate ? 'rounded-b-xl' : ''}`} style={{ margin: attrs.hideNameplate ? '0' : '0 0 1cqi 0', padding: '2cqi 2cqi 2cqi 2cqi', borderTopWidth: '0.2cqi', borderBottomWidth: '0.2cqi' }}>
              <p className="text-white/90 font-medium leading-tight text-center italic" style={{ fontSize: '3.2cqi' }}>
                &quot;{card.description}&quot;
              </p>
            </div>
          )}

          {}
          {!attrs.hideNameplate && <div className={`w-full ${factionColor?.startsWith('#') || factionColor?.startsWith('rgb') ? '' : factionColor} border-white/50 relative shadow-[0_-5px_15px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center rounded-b-xl`} style={{ backgroundColor: factionColor?.startsWith('#') || factionColor?.startsWith('rgb') ? factionColor : undefined, borderTopWidth: '0.6cqi', padding: '2cqi 2cqi 1.5cqi 2cqi' }}>
            {}
            {!attrs.hideRole && <div className="absolute bg-white text-black font-black uppercase rounded-sm shadow-md" style={{ top: '-3cqi', right: '2cqi', padding: '0.5cqi 1.5cqi', fontSize: '3cqi' }}>
              {role}
            </div>}
            {!attrs.hideTitle && <h3 className="text-white font-black uppercase tracking-widest text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" style={{ fontSize: '7.5cqi', WebkitTextStroke: '0.1cqi black', lineHeight: 1 }}>
              {card.title}
            </h3>}
            {!attrs.hideBottomText && <div className="flex justify-center mt-[0.5cqi]">
              <span className="text-white/70 font-bold tracking-[0.2em] uppercase" style={{ fontSize: '3cqi' }}>
                {card.level} TIER • {faction}
              </span>
            </div>}
          </div>}
        </div>

        {customBadges && customBadges.map((badge: any, i: number) => badge.url && (
          <img
            key={badge.id || i}
            src={badge.url}
            alt="Badge"
            loading={isEditing ? "eager" : "lazy"} decoding="async"
            className={`absolute z-[60] object-contain drop-shadow-lg ${isEditing ? 'cursor-grab active:cursor-grabbing hover:drop-shadow-[0_0_10px_white]' : 'pointer-events-none'}`}
            style={{
              left: `${badge.x}%`,
              top: `${badge.y}%`,
              width: `${badge.size}px`,
              height: `${badge.size}px`,
              transform: `translate(-50%, -50%) translateZ(60px)`
            }}
            onMouseDown={(e) => handleMouseDown(e, 'customBadge', badge.id || String(i))}
            onWheel={(e) => handleWheel(e, 'customBadge', badge.id || String(i))}
            draggable={false}
          />
        ))}

        {/* Editor Guides */}
        {isEditing && attrs.showVGuide && (
          <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-[var(--color-accent-purple)] shadow-[0_0_8px_var(--color-accent-purple)] z-[100] pointer-events-none" style={{ transform: 'translateX(-50%) translateZ(100px)' }} />
        )}
        {isEditing && attrs.showHGuide && (
          <div className="absolute left-0 right-0 top-1/2 h-[2px] bg-[var(--color-accent-purple)] shadow-[0_0_8px_var(--color-accent-purple)] z-[100] pointer-events-none" style={{ transform: 'translateY(-50%) translateZ(100px)' }} />
        )}

        {/* Variant Suite Icon */}
        {attrs.variantSuite && (
          <div className="absolute bottom-4 right-4 z-[80] flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/20 px-3 py-1 rounded-full shadow-lg group/variant transition-all hover:scale-110" style={{ transform: 'translateZ(90px)' }}>
            <Sparkles className="w-3 h-3 text-indigo-400 animate-pulse" />
            <span className="text-[10px] font-black text-white uppercase tracking-tighter">Variantes</span>
          </div>
        )}

        {/* Card Frame overlay */}
        {attrs.frameUrl && (
          <img src={attrs.frameUrl} alt="Card Frame" loading={isEditing ? "eager" : "lazy"} decoding="async" className="absolute inset-0 w-full h-full object-cover pointer-events-none rounded-xl" style={{ transform: 'translateZ(10px)' }} />
        )}

        {/* Special Effects Overlays */}
        {specialEffect === 'Holo' && (
          <>
            <div className="absolute inset-0 z-[90] pointer-events-none rounded-xl overflow-hidden mix-blend-color-dodge" style={{
              backgroundImage: 'linear-gradient(105deg, transparent 20%, #ff0080 25%, #ff8c00 30%, #40e0d0 35%, #7b68ee 40%, #ff0080 45%, transparent 50%)',
              backgroundSize: '300% 300%',
              animation: 'holo-sweep 3s ease-in-out infinite',
              opacity: 0.5
            }} />
            <div className="absolute inset-0 z-[91] pointer-events-none rounded-xl overflow-hidden mix-blend-overlay" style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
              animation: 'holo-lines 2s linear infinite'
            }} />
          </>
        )}
        {specialEffect === 'Glitch' && (
          <>
            <div className="absolute inset-0 z-[90] pointer-events-none rounded-xl overflow-hidden" style={{ animation: 'glitch-clip 3s steps(1) infinite' }}>
              <div className="absolute inset-0 mix-blend-screen bg-red-500/20" style={{ transform: 'translateX(-3px)', animation: 'glitch-r 0.3s steps(2) infinite' }} />
              <div className="absolute inset-0 mix-blend-screen bg-cyan-500/20" style={{ transform: 'translateX(3px)', animation: 'glitch-b 0.3s steps(2) infinite reverse' }} />
            </div>
            <div className="absolute inset-0 z-[91] pointer-events-none rounded-xl overflow-hidden mix-blend-overlay" style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(255,255,255,0.03) 1px, rgba(255,255,255,0.03) 2px)',
              animation: 'glitch-scan 8s linear infinite'
            }} />
          </>
        )}
        {specialEffect === 'Cosmic' && (
          <>
            <div className="absolute inset-0 z-[90] pointer-events-none rounded-xl overflow-hidden mix-blend-screen opacity-70" style={{
              backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(138, 43, 226, 0.5), transparent 60%), radial-gradient(circle at 80% 20%, rgba(0, 255, 255, 0.3), transparent 40%)',
              animation: 'cosmic-pulse 4s ease-in-out infinite alternate'
            }} />
            <div className="absolute inset-0 z-[91] pointer-events-none rounded-xl mix-blend-color-dodge overflow-hidden">
              {Array.from({ length: 30 }).map((_, i) => {
                const prng = (seed: number) => {
                  const x = Math.sin(seed + 1) * 10000;
                  return x - Math.floor(x);
                };
                return (
                <div key={i} className="absolute rounded-full bg-white shadow-[0_0_8px_2px_rgba(255,255,255,0.8)]" style={{
                  width: `${prng(i) * 2 + 1}px`,
                  height: `${prng(i) * 2 + 1}px`,
                  left: `${prng(i + 100) * 100}%`,
                  top: `${prng(i + 200) * 100}%`,
                  animation: `sparkle ${1 + prng(i + 300) * 3}s ease-in-out infinite`,
                  animationDelay: `${prng(i + 400) * 2}s`
                }} />
              )})}
            </div>
          </>
        )}
      </InteractiveCard>
    </div>
  );
}
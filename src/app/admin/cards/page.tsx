"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Plus, Sparkles, Trash2, ImagePlus, Loader2, Save, X, Copy, 
  ChevronDown, Layers, UploadCloud, Info, Check, Search, Filter,
  Settings2, Palette, Box, UserPlus, Type
} from "lucide-react";
import CardDisplay from "@/features/binder/components/CardDisplay";
import { toBlob } from "html-to-image";
import toast from 'react-hot-toast';
import { cn } from "@/lib/utils";

export default function AdminCardsPage() {
  const defaultProbas: Record<string, number> = {
    COMMON: 45,
    UNCOMMON: 35,
    RARE: 15,
    EPIC: 3,
    LEGENDARY: 1,
    MYTHIC: 0.2
  };

  const [activeTab, setActiveTab] = useState("editor"); // editor | list
  const [cards, setCards] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [editions, setEditions] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  
  // Editor State
  const [creatingCard, setCreatingCard] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [cardPlayerId, setCardPlayerId] = useState("");
  const [cardRarity, setCardRarity] = useState("COMMON");
  const [cardLevel, setCardLevel] = useState("Normal");
  const [cardEdition, setCardEdition] = useState("Standard");
  const [cardProba, setCardProba] = useState<number | string>(45);
  const [isCustomProba, setIsCustomProba] = useState(false);
  const [cardDesc, setCardDesc] = useState("");
  const [cardTitle, setCardTitle] = useState("");
  const [cardCustomBg, setCardCustomBg] = useState("");
  const [cardImageUrl, setCardImageUrl] = useState("");
  const [layer1Url, setLayer1Url] = useState("");
  const [layer2Url, setLayer2Url] = useState("");
  const [layer3Url, setLayer3Url] = useState("");
  const [cardBorderColor, setCardBorderColor] = useState("");
  const [cardBgColor, setCardBgColor] = useState("");
  const [cardGlowColor, setCardGlowColor] = useState("");
  const [factionColor, setFactionColor] = useState("");
  const [rarityBadgeColor, setRarityBadgeColor] = useState("");
  const [isFullArt, setIsFullArt] = useState(false);
  const [isHolo, setIsHolo] = useState(false);
  const [cardEffect, setCardEffect] = useState("");
  const [specialEffect, setSpecialEffect] = useState<string | null>(null);
  const [titleColor, setTitleColor] = useState("");
  const [descColor, setDescColor] = useState("");
  const [levelColor, setLevelColor] = useState("");
  const [showTitle, setShowTitle] = useState(true);
  const [showDesc, setShowDesc] = useState(true);
  const [showRarityBadge, setShowRarityBadge] = useState(true);
  const [showLevelText, setShowLevelText] = useState(true);
  const [showLevelIcon, setShowLevelIcon] = useState(true);
  
  const [hideCharacter, setHideCharacter] = useState(false);
  const [hideRarityBox, setHideRarityBox] = useState(false);
  const [hideSideText, setHideSideText] = useState(false);
  const [hideDescription, setHideDescription] = useState(false);
  const [hideNameplate, setHideNameplate] = useState(false);
  const [hideRole, setHideRole] = useState(false);
  const [hideTitle, setHideTitle] = useState(false);
  const [hideBottomText, setHideBottomText] = useState(false);

  const [cardFrameUrl, setCardFrameUrl] = useState("");
  const [levelBadgeUrl, setLevelBadgeUrl] = useState("");
  const [editionBadgeUrl, setEditionBadgeUrl] = useState("");
  const [variantBadgeUrl, setVariantBadgeUrl] = useState("");
  const [variantName, setVariantName] = useState("");
  const [parentCardId, setParentCardId] = useState("");
  
  const [charPosX, setCharPosX] = useState(50);
  const [charPosY, setCharPosY] = useState(50);
  const [charScale, setCharScale] = useState<number | string>(100);
  const [bgPosX, setBgPosX] = useState(50);
  const [bgPosY, setBgPosY] = useState(50);
  const [bgScale, setBgScale] = useState<number | string>(100);
  
  const [titlePos, setTitlePos] = useState({ x: 50, y: 75, scale: 100 });
  const [descPos, setDescPos] = useState({ x: 50, y: 92, scale: 100 });
  const [rarityBadgePos, setRarityBadgePos] = useState({ x: 15, y: 65, scale: 100 });
  const [levelTextPos, setLevelTextPos] = useState({ x: 50, y: 82, scale: 100 });
  const [levelBadgePos, setLevelBadgePos] = useState({ x: 10, y: 8, scale: 100 });
  const [editionBadgePos, setEditionBadgePos] = useState({ x: 85, y: 73, scale: 100 });
  const [variantBadgePos, setVariantBadgePos] = useState({ x: 15, y: 15, scale: 100 });

  const [isVariant, setIsVariant] = useState(false);
  const [cardCustomBadges, setCardCustomBadges] = useState<any[]>([]);
  
  // Variant Linking State
  const [cardVariantLinks, setCardVariantLinks] = useState<any[]>([]);
  const [selectedVariantProfileId, setSelectedVariantProfileId] = useState("");
  const [selectedTargetCardId, setSelectedTargetCardId] = useState("");
  const [isSavingLink, setIsSavingLink] = useState(false);
  
  const [isCapturing, setIsCapturing] = useState(false);
  const [draggingItem, setDraggingItem] = useState<{type: string, id: string} | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const { url } = await res.json();
      
      switch (uploadTarget) {
        case 'cardImageUrl': setCardImageUrl(url); break;
        case 'layer1Url': setLayer1Url(url); break;
        case 'layer2Url': setLayer2Url(url); break;
        case 'layer3Url': setLayer3Url(url); break;
        case 'cardCustomBg': setCardCustomBg(url); break;
      }
      toast.success("Fichier envoyé avec succès !");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'envoi du fichier");
    } finally {
      setIsUploading(false);
      setUploadTarget(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const triggerUpload = (target: string) => {
    setUploadTarget(target);
    fileInputRef.current?.click();
  };

  const fetchData = async () => {
    try {
      const [resP, resC, resE, resV, resT] = await Promise.all([
        fetch("/api/players"),
        fetch("/api/cards"),
        fetch("/api/editions"),
        fetch("/api/variants"),
        fetch("/api/templates")
      ]);
      if (resP.ok) setPlayers(await resP.json());
      if (resC.ok) setCards(await resC.json());
      if (resE.ok) setEditions(await resE.json());
      if (resV.ok) setVariants(await resV.json());
      if (resT.ok) setTemplates(await resT.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchVariantLinks = async (motherCardId: string) => {
    try {
      const res = await fetch(`/api/admin/cards/variants/links?motherCardId=${motherCardId}`);
      if (res.ok) setCardVariantLinks(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleUpdateElement = (type: string, id: string, data: any) => {
    if (data.action === "drag_start") {
      setDraggingItem({ type, id });
    } else if (data.action === "wheel") {
      const delta = data.deltaY > 0 ? -5 : 5;
      if (type === 'character') setCharScale(prev => Math.max(10, Math.min(300, prev + delta)));
      if (type === 'title') setTitlePos(prev => ({...prev, scale: Math.max(10, Math.min(300, prev.scale + delta))}));
      if (type === 'desc') setDescPos(prev => ({...prev, scale: Math.max(10, Math.min(300, prev.scale + delta))}));
      if (type === 'rarityBadge') setRarityBadgePos(prev => ({...prev, scale: Math.max(10, Math.min(300, prev.scale + delta))}));
      if (type === 'levelText') setLevelTextPos(prev => ({...prev, scale: Math.max(10, Math.min(300, prev.scale + delta))}));
      if (type === 'levelBadge') setLevelBadgePos(prev => ({...prev, scale: Math.max(10, Math.min(300, prev.scale + delta))}));
      if (type === 'editionBadge') setEditionBadgePos(prev => ({...prev, scale: Math.max(10, Math.min(300, prev.scale + delta))}));
      if (type === 'variantBadge') setVariantBadgePos(prev => ({...prev, scale: Math.max(10, Math.min(300, prev.scale + delta))}));
      if (type === 'customBadge') {
         setCardCustomBadges(prev => prev.map((b, i) => String(i) === id || b.id === id ? { ...b, size: Math.max(10, Math.min(200, b.size + delta)) } : b));
      }
    }
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!draggingItem) return;
      const deltaX = (e.movementX / 300) * 100;
      const deltaY = (e.movementY / 420) * 100;

      if (draggingItem.type === 'character') {
         setCharPosX(prev => prev + deltaX);
         setCharPosY(prev => prev + deltaY);
      } else if (draggingItem.type === 'title') {
         setTitlePos(prev => ({ ...prev, x: prev.x + deltaX, y: prev.y + deltaY }));
      } else if (draggingItem.type === 'desc') {
         setDescPos(prev => ({ ...prev, x: prev.x + deltaX, y: prev.y + deltaY }));
      } else if (draggingItem.type === 'rarityBadge') {
         setRarityBadgePos(prev => ({ ...prev, x: prev.x + deltaX, y: prev.y + deltaY }));
      } else if (draggingItem.type === 'levelText') {
         setLevelTextPos(prev => ({ ...prev, x: prev.x + deltaX, y: prev.y + deltaY }));
      } else if (draggingItem.type === 'levelBadge') {
         setLevelBadgePos(prev => ({ ...prev, x: prev.x + deltaX, y: prev.y + deltaY }));
      } else if (draggingItem.type === 'editionBadge') {
         setEditionBadgePos(prev => ({ ...prev, x: prev.x + deltaX, y: prev.y + deltaY }));
      } else if (draggingItem.type === 'variantBadge') {
         setVariantBadgePos(prev => ({ ...prev, x: prev.x + deltaX, y: prev.y + deltaY }));
      } else if (draggingItem.type === 'customBadge') {
         setCardCustomBadges(prev => prev.map((b, i) => 
            String(i) === draggingItem.id || b.id === draggingItem.id 
            ? { ...b, x: b.x + deltaX, y: b.y + deltaY } 
            : b
         ));
      }
    };
    const handleGlobalMouseUp = () => setDraggingItem(null);

    if (draggingItem) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [draggingItem]);

  const startEditCard = (card: any) => {
    setEditingCardId(card.id);
    setIsVariant(card.isVariant || false);
    if (card.id) fetchVariantLinks(card.id);
    setCardPlayerId(card.playerId);
    setCardRarity(card.rarity);
    setCardLevel(card.level);
    const baseProba = defaultProbas[card.rarity] || 100;
    setCardProba(card.proba ?? baseProba);
    setIsCustomProba(card.proba !== undefined && card.proba !== null && card.proba !== baseProba);
    setCardDesc(card.description || "");
    setCardTitle(card.title || "");
    setCardEdition(card.edition || "Standard");
    setCardCustomBg(card.customBackground || "");
    setCardImageUrl(card.imageUrl || "");
    setLayer1Url(card.layer1Url || "");
    setLayer2Url(card.layer2Url || "");
    setLayer3Url(card.layer3Url || "");
    
    try {
      const attrs = typeof card.attributes === 'string' ? JSON.parse(card.attributes) : (card.attributes || {});
      setCardBorderColor(attrs.borderColor || "");
      setBgPosX(attrs.bgPosX ?? 50);
      setBgPosY(attrs.bgPosY ?? 50);
      setBgScale(attrs.bgScale ?? 100);
      setCardBgColor(attrs.cardBgColor || "");
      setCardGlowColor(attrs.cardGlowColor || "");
      setFactionColor(attrs.factionColor || "");
      setRarityBadgeColor(attrs.rarityBadgeColor || "");
      setCardFrameUrl(attrs.frameUrl || "");
      setIsFullArt(attrs.isFullArt || false);
      setIsHolo(attrs.isHolo || false);
      setHideCharacter(attrs.hideCharacter || false);
      setHideRarityBox(attrs.hideRarityBox || false);
      setHideSideText(attrs.hideSideText || false);
      setHideDescription(attrs.hideDescription || false);
      setHideNameplate(attrs.hideNameplate || false);
      setHideRole(attrs.hideRole || false);
      setHideTitle(attrs.hideTitle || false);
      setHideBottomText(attrs.hideBottomText || false);
      setCardEffect(attrs.effect || "");
      setTitleColor(attrs.titleColor || "");
      setDescColor(attrs.descColor || "");
      setLevelColor(attrs.levelColor || "");
      setShowTitle(attrs.showTitle !== false);
      setShowDesc(attrs.showDesc !== false);
      setShowRarityBadge(attrs.showRarityBadge !== false);
      setShowLevelText(attrs.showLevelText !== false);
      setShowLevelIcon(attrs.showLevelIcon !== false);

      setTitlePos(attrs.titlePos || { x: 50, y: 75, scale: 100 });
      setDescPos(attrs.descPos || { x: 50, y: 92, scale: 100 });
      setRarityBadgePos(attrs.rarityBadgePos || { x: 15, y: 65, scale: 100 });
      setLevelTextPos(attrs.levelTextPos || { x: 50, y: 82, scale: 100 });
      setLevelBadgePos(attrs.levelBadgePos || { x: 10, y: 8, scale: 100 });
      setEditionBadgePos(attrs.editionBadgePos || { x: 85, y: 73, scale: 100 });
      setVariantBadgePos(attrs.variantBadgePos || { x: 15, y: 15, scale: 100 });
      setLevelBadgeUrl(attrs.levelBadgeUrl || "");
      setEditionBadgeUrl(attrs.editionBadgeUrl || "");
      setVariantBadgeUrl(attrs.variantBadgeUrl || "");
      setVariantName(attrs.variantName || "");
      setParentCardId(attrs.parentCardId || "");
    } catch (e) { console.error(e); }

    try {
      setCardCustomBadges(typeof card.customBadges === 'string' ? JSON.parse(card.customBadges) : (card.customBadges || []));
    } catch { setCardCustomBadges([]); }
    
    try {
      const pos = typeof card.characterPosition === 'string' ? JSON.parse(card.characterPosition) : card.characterPosition;
      setCharPosX(pos?.x ?? 50);
      setCharPosY(pos?.y ?? 50);
      setCharScale(pos?.scale ?? 100);
    } catch { setCharPosX(50); setCharPosY(50); setCharScale(100); }

    setActiveTab("editor");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingCardId(null);
    setCardPlayerId("");
    setCardTitle("");
    setCardDesc("");
    setCardCustomBg("");
    setCardImageUrl("");
    setLayer1Url("");
    setLayer2Url("");
    setLayer3Url("");
    setCardCustomBadges([]);
    setCardRarity("COMMON");
    setCardLevel("Normal");
    setCardEdition("Standard");
    setCharPosX(50); setCharPosY(50); setCharScale(100);
    setBgPosX(50); setBgPosY(50); setBgScale(100);
    setCardBorderColor(""); setCardBgColor(""); setCardGlowColor(""); setFactionColor(""); setRarityBadgeColor("");
    setTitleColor(""); setDescColor(""); setLevelColor("");
    setCardVariantLinks([]);
  };

  const handleCreateCard = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!cardPlayerId) return toast.error("Sélectionnez un joueur");
    
    setCreatingCard(true);
    try {
      const player = players.find(p => p.id === cardPlayerId);
      const payload = {
        id: editingCardId,
        title: cardTitle || player?.minecraftName,
        playerId: cardPlayerId,
        rarity: cardRarity,
        level: cardLevel,
        edition: cardEdition,
        proba: cardProba,
        description: cardDesc,
        customBackground: cardCustomBg,
        imageUrl: cardImageUrl,
        layer1Url,
        layer2Url,
        layer3Url,
        customBadges: cardCustomBadges,
        characterPosition: { x: charPosX, y: charPosY, scale: charScale },
        isVariant,
        attributes: {
          bgPosX, bgPosY, bgScale,
          borderColor: cardBorderColor, cardBgColor, cardGlowColor, factionColor, rarityBadgeColor,
          frameUrl: cardFrameUrl, titlePos, descPos, rarityBadgePos, levelTextPos,
          levelBadgePos, editionBadgePos, variantBadgePos,
          levelBadgeUrl, editionBadgeUrl, variantBadgeUrl, variantName,
          parentCardId, isFullArt, isHolo,
          hideCharacter, hideRarityBox, hideSideText, hideDescription,
          hideNameplate, hideRole, hideTitle, hideBottomText,
          effect: cardEffect, titleColor, descColor, levelColor,
          showTitle, showDesc, showRarityBadge, showLevelText, showLevelIcon
        }
      };

      const res = await fetch("/api/cards", {
        method: editingCardId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(editingCardId ? "Carte mise à jour !" : "Carte créée !");
        cancelEdit();
        fetchData();
      } else {
        toast.error(await res.text());
      }
    } catch (e) { toast.error("Erreur de sauvegarde"); }
    finally { setCreatingCard(false); }
  };

  const handleAutoGenerateVariant = async () => {
    if (!editingCardId || !selectedVariantProfileId) {
      toast.error("Veuillez sélectionner un type de variante.");
      return;
    }

    const motherCard = cards.find(c => c.id === editingCardId);
    const variantProfile = variants.find(v => v.id === selectedVariantProfileId);
    
    if (!motherCard || !variantProfile) return;
    
    setIsSavingLink(true);
    try {
      let attrs = {};
      try { attrs = typeof motherCard.attributes === 'string' ? JSON.parse(motherCard.attributes) : (motherCard.attributes || {}); } catch(e){}
      
      attrs.parentCardId = editingCardId;
      attrs.variantBadgeUrl = variantProfile.iconUrl;

      const payload = {
        title: motherCard.title,
        playerId: motherCard.playerId,
        rarity: motherCard.rarity,
        level: motherCard.level,
        edition: motherCard.edition,
        proba: motherCard.proba,
        description: motherCard.description,
        customBackground: motherCard.customBackground,
        imageUrl: motherCard.imageUrl,
        customBadges: typeof motherCard.customBadges === 'string' ? JSON.parse(motherCard.customBadges) : (motherCard.customBadges || []),
        characterPosition: typeof motherCard.characterPosition === 'string' ? JSON.parse(motherCard.characterPosition) : (motherCard.characterPosition || {x:50,y:50,scale:100}),
        isVariant: true,
        attributes: attrs
      };

      const res1 = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res1.ok) throw new Error("Erreur lors de la création de la carte variante.");
      const newCard = await res1.json();

      const res2 = await fetch("/api/admin/cards/variants/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          motherCardId: editingCardId,
          variantProfileId: selectedVariantProfileId,
          targetCardId: newCard.id
        })
      });

      if (!res2.ok) throw new Error("Erreur lors de la liaison de la variante.");

      toast.success(`Variante ${variantProfile.name} générée et liée avec succès !`);
      fetchVariantLinks(editingCardId);
      fetchData();
      setSelectedVariantProfileId("");
    } catch (e: any) {
      toast.error(e.message || "Erreur de génération");
    } finally {
      setIsSavingLink(false);
    }
  };

  const handleSaveVariantLink = async () => {
    if (!editingCardId || !selectedVariantProfileId || !selectedTargetCardId) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    setIsSavingLink(true);
    try {
      const res = await fetch("/api/admin/cards/variants/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          motherCardId: editingCardId,
          variantProfileId: selectedVariantProfileId,
          targetCardId: selectedTargetCardId
        })
      });
      if (res.ok) {
        toast.success("Variante liée !");
        fetchVariantLinks(editingCardId);
        setSelectedVariantProfileId("");
        setSelectedTargetCardId("");
      }
    } catch (e) { toast.error("Erreur de liaison"); }
    finally { setIsSavingLink(false); }
  };

  const handleDeleteVariantLink = async (id: string) => {
    if (!window.confirm("Supprimer ce lien ?")) return;
    try {
      const res = await fetch(`/api/admin/cards/variants/links?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Lien supprimé");
        if (editingCardId) fetchVariantLinks(editingCardId);
      }
    } catch (e) { console.error(e); }
  };

  const handleDeleteCard = async (id: string) => {
    if (!window.confirm("Supprimer cette carte ?")) return;
    try {
      const res = await fetch(`/api/cards?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Carte supprimée");
        fetchData();
      }
    } catch (e) { console.error(e); }
  };

  const addCustomBadge = () => {
      setCardCustomBadges([...cardCustomBadges, { 
          id: Math.random().toString(36).substr(2, 9), 
          url: '', 
          x: 50, 
          y: 50, 
          size: 64 
      }]);
  };

  const waitForCaptureReady = async () => {
    toast.info("Préparation de la carte : patience (10s) pour la vidéo/animation...", { id: "capture-wait" });
    await new Promise(resolve => setTimeout(resolve, 10000));
    toast.dismiss("capture-wait");
  };

  const handleCaptureDiscordImage = async () => {
    if (!editingCardId) return;
    setIsCapturing(true);
    try {
      const cardElement = document.getElementById("live-preview-card");
      if (!cardElement) throw new Error("Card element not found");

      await waitForCaptureReady();

      const blob = await toBlob(cardElement, {
        pixelRatio: 2,
        backgroundColor: 'transparent',
        filter: (node) => {
          if (node instanceof HTMLElement && typeof node.className === 'string') {
            return !node.className.includes('transparenttextures');
          }
          return true;
        }
      });
      if (!blob) throw new Error("Could not create image blob");

      const file = new File([blob], `card_${editingCardId}_discord.png`, { type: 'image/png' });
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Upload failed");
      const { url } = await uploadRes.json();

      const updateRes = await fetch('/api/cards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingCardId, renderedImageUrl: url }),
      });

      if (!updateRes.ok) throw new Error("Failed to save image url to card");
      setCards(cards.map(c => c.id === editingCardId ? { ...c, renderedImageUrl: url } : c));
      toast.success("Image Discord générée et sauvegardée avec succès !");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la capture");
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="space-y-10">
      <input
        type="file"
        accept="image/*,video/*"
        ref={fileInputRef}
        onChange={handleUploadFile}
        style={{ position: 'absolute', width: '0', height: '0', opacity: '0' }}
      />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-[var(--card-border)] pb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-500/20 rounded-2xl text-purple-400">
            <Sparkles className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-3xl font-bold font-outfit text-[var(--text-color)] tracking-tight uppercase">Gestion des Cartes</h2>
            <p className="text-[var(--color-text-secondary)]">Créez et éditez les cartes de collection du SMP.</p>
          </div>
        </div>

        <div className="flex bg-[var(--card-bg)]/80 p-1 rounded-2xl border border-[var(--card-border)] backdrop-blur-md self-stretch sm:self-auto">
          <button 
            onClick={() => setActiveTab("editor")}
            className={cn(
                "flex-1 sm:flex-none px-8 py-2.5 rounded-xl font-bold transition-all uppercase tracking-widest text-xs",
                activeTab === "editor" ? "bg-white text-black shadow-lg" : "text-[var(--color-text-secondary)] hover:text-[var(--text-color)]"
            )}
          >
            Éditeur
          </button>
          <button 
            onClick={() => setActiveTab("list")}
            className={cn(
                "flex-1 sm:flex-none px-8 py-2.5 rounded-xl font-bold transition-all uppercase tracking-widest text-xs",
                activeTab === "list" ? "bg-white text-black shadow-lg" : "text-[var(--color-text-secondary)] hover:text-[var(--text-color)]"
            )}
          >
            Catalogue ({cards.length})
          </button>
        </div>
      </div>

      {activeTab === "editor" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Form Side */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-10">
            <form onSubmit={handleCreateCard} className="space-y-10">
                
                {/* 1. Base Configuration */}
                <div className="bg-[var(--card-bg)] p-8 rounded-[2.5rem] border border-[var(--card-border)] space-y-8">
                    <h3 className="text-xl font-black text-[var(--text-color)] uppercase tracking-tighter flex items-center gap-3">
                        <Info className="w-5 h-5 text-purple-400" /> Configuration de base
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest mb-2.5 ml-1">Joueur Propriétaire</label>
                                <select
                                    value={cardPlayerId}
                                    onChange={(e) => setCardPlayerId(e.target.value)}
                                    className="w-full bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-2xl px-5 py-3.5 text-[var(--text-color)] outline-none focus:border-purple-500 transition-all shadow-inner"
                                >
                                    <option value="">Choisir un joueur...</option>
                                    {players.map(p => <option key={p.id} value={p.id}>{p.minecraftName}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest mb-2.5 ml-1">Pseudo affiché (Optionnel)</label>
                                <input type="text" value={cardTitle} onChange={(e) => setCardTitle(e.target.value)} className="w-full bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-2xl px-5 py-3.5 text-[var(--text-color)] outline-none focus:border-purple-500 transition-all shadow-inner" placeholder="Nom sur la carte..." />
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest mb-2.5 ml-1">Rareté</label>
                                    <select value={cardRarity} onChange={(e) => { const val = e.target.value; setCardRarity(val); if (!isCustomProba) setCardProba(defaultProbas[val] || 100); }} className="w-full bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-2xl px-5 py-3.5 text-[var(--text-color)] outline-none">
                                        <option value="COMMON">COMMON</option>
                                        <option value="UNCOMMON">UNCOMMON</option>
                                        <option value="RARE">RARE</option>
                                        <option value="EPIC">EPIC</option>
                                        <option value="LEGENDARY">LEGENDARY</option>
                                        <option value="MYTHIC">MYTHIC</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest mb-2.5 ml-1">Niveau</label>
                                    <select value={cardLevel} onChange={(e) => setCardLevel(e.target.value)} className="w-full bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-2xl px-5 py-3.5 text-[var(--text-color)] outline-none">
                                        <option value="Normal">Normal</option>
                                        <option value="Iron">Iron</option>
                                        <option value="Gold">Gold</option>
                                        <option value="Diamond">Diamond</option>
                                        <option value="Netherite">Netherite</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest mb-2.5 ml-1">Édition de collection</label>
                                    <select value={cardEdition} onChange={(e) => setCardEdition(e.target.value)} className="w-full bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-2xl px-5 py-3.5 text-[var(--text-color)] outline-none">
                                        <option value="Standard">Standard</option>
                                        {editions.map(ed => <option key={ed.id} value={ed.name}>{ed.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-2.5 ml-1">
                                        <label className="block text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest">Probabilité (Poids)</label>
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input 
                                                type="checkbox" 
                                                className="custom-checkbox w-3 h-3" 
                                                checked={isCustomProba} 
                                                onChange={e => {
                                                    const checked = e.target.checked;
                                                    setIsCustomProba(checked);
                                                    if (!checked) setCardProba(defaultProbas[cardRarity] || 100);
                                                }} 
                                            />
                                            <span className="text-[10px] text-[var(--color-text-secondary)] group-hover:text-[var(--text-color)] transition-colors uppercase font-bold">Custom</span>
                                        </label>
                                    </div>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            min="0.001" 
                                            max="100"
                                            step="0.001"
                                            value={cardProba} 
                                            onChange={(e) => setCardProba(e.target.value === '' ? '' : Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))} 
                                            disabled={!isCustomProba}
                                            className="w-full bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-2xl px-5 py-3.5 text-[var(--text-color)] outline-none disabled:opacity-50 transition-all" 
                                            placeholder="100" 
                                        />
                                        <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none text-[var(--color-text-secondary)] text-sm font-bold">
                                            %
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest mb-2.5 ml-1">Description de la carte (Effets, Histoire...)</label>
                            <textarea 
                                value={cardDesc} 
                                onChange={e => setCardDesc(e.target.value)} 
                                className="w-full bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-[1.5rem] px-6 py-4 text-sm text-[var(--text-color)] outline-none focus:border-purple-500 min-h-[120px] resize-none leading-relaxed shadow-inner" 
                                placeholder="Décrivez les pouvoirs ou l'histoire de cette carte..." 
                            />
                        </div>
                    </div>
                </div>

                {/* 1.5. Advanced Layout & Text Options */}
                <div className="bg-[var(--card-bg)] p-8 rounded-[2.5rem] border border-[var(--card-border)] space-y-8">
                    <h3 className="text-xl font-black text-[var(--text-color)] uppercase tracking-tighter flex items-center gap-3">
                        <Settings2 className="w-5 h-5 text-purple-400" /> Options de Layout & Couleurs
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest mb-4">Visibilité des éléments</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input type="checkbox" className="custom-checkbox" checked={hideCharacter} onChange={e => setHideCharacter(e.target.checked)} />
                                    <span className="text-xs text-[var(--color-text-secondary)] group-hover:text-[var(--text-color)] transition-colors">Cacher Buste</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input type="checkbox" className="custom-checkbox" checked={hideRarityBox} onChange={e => setHideRarityBox(e.target.checked)} />
                                    <span className="text-xs text-[var(--color-text-secondary)] group-hover:text-[var(--text-color)] transition-colors">Cacher Boîte Rareté</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input type="checkbox" className="custom-checkbox" checked={hideNameplate} onChange={e => setHideNameplate(e.target.checked)} />
                                    <span className="text-xs text-[var(--color-text-secondary)] group-hover:text-[var(--text-color)] transition-colors">Cacher Bloc Nom</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input type="checkbox" className="custom-checkbox" checked={hideDescription} onChange={e => setHideDescription(e.target.checked)} />
                                    <span className="text-xs text-[var(--color-text-secondary)] group-hover:text-[var(--text-color)] transition-colors">Cacher Description</span>
                                </label>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest mb-4">Coloration personnalisée</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-[var(--color-text-secondary)] mb-1">Couleur du Pseudo</label>
                                    <div className="flex gap-2 items-center">
                                        <input type="color" value={titleColor} onChange={e => setTitleColor(e.target.value)} className="w-8 h-8 rounded bg-transparent cursor-pointer" />
                                        <input type="text" value={titleColor} onChange={e => setTitleColor(e.target.value)} className="flex-1 bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-color)]" placeholder="#FFFFFF" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs text-[var(--color-text-secondary)] mb-1">Couleur Description</label>
                                    <div className="flex gap-2 items-center">
                                        <input type="color" value={descColor} onChange={e => setDescColor(e.target.value)} className="w-8 h-8 rounded bg-transparent cursor-pointer" />
                                        <input type="text" value={descColor} onChange={e => setDescColor(e.target.value)} className="flex-1 bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-color)]" placeholder="#FFFFFF" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs text-[var(--color-text-secondary)] mb-1">Bloc Faction (Fond)</label>
                                    <div className="flex gap-2 items-center">
                                        <input type="color" value={factionColor} onChange={e => setFactionColor(e.target.value)} className="w-8 h-8 rounded bg-transparent cursor-pointer" />
                                        <input type="text" value={factionColor} onChange={e => setFactionColor(e.target.value)} className="flex-1 bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-color)]" placeholder="#111118" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs text-[var(--color-text-secondary)] mb-1">Lueur Globale (Glow)</label>
                                    <div className="flex gap-2 items-center">
                                        <input type="color" value={cardGlowColor} onChange={e => setCardGlowColor(e.target.value)} className="w-8 h-8 rounded bg-transparent cursor-pointer" />
                                        <input type="text" value={cardGlowColor} onChange={e => setCardGlowColor(e.target.value)} className="flex-1 bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-color)]" placeholder="#ff00ff" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Visual Identity & Effects */}
                <div className="bg-[var(--card-bg)] p-8 rounded-[2.5rem] border border-[var(--card-border)] space-y-8">
                    <h3 className="text-xl font-black text-[var(--text-color)] uppercase tracking-tighter flex items-center gap-3">
                        <Palette className="w-5 h-5 text-purple-400" /> Apparence & Effets
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest mb-2.5 ml-1">Avatar du Personnage (PNG/GIF/MP4)</label>
                                <div className="flex gap-2">
                                    <input type="text" value={cardImageUrl} onChange={e => setCardImageUrl(e.target.value)} className="flex-1 bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-2xl px-5 py-3 text-xs text-[var(--text-color)] outline-none" placeholder="Lien direct vers l'image ou la vidéo..." />
                                    <button type="button" onClick={() => triggerUpload('cardImageUrl')} disabled={isUploading} className="p-3 bg-[var(--icon-bg)] border border-[var(--card-border)] rounded-2xl text-[var(--color-text-secondary)] hover:text-[var(--text-color)] transition-colors">
                                        {isUploading && uploadTarget === 'cardImageUrl' ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                            
                            {cardRarity === "MYTHIC" && (
                                <div className="space-y-4 pt-4 border-t border-[var(--card-border)]">
                                    <label className="block text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2.5 ml-1">Calques Mythiques (Optionnel)</label>
                                    <div className="flex gap-2">
                                        <input type="text" value={layer1Url} onChange={e => setLayer1Url(e.target.value)} className="flex-1 bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-2xl px-5 py-3 text-xs text-[var(--text-color)] outline-none" placeholder="Layer 1 (Fond)..." />
                                        <button type="button" onClick={() => triggerUpload('layer1Url')} disabled={isUploading} className="p-3 bg-[var(--icon-bg)] border border-[var(--card-border)] rounded-2xl text-[var(--color-text-secondary)] hover:text-[var(--text-color)] transition-colors">
                                            {isUploading && uploadTarget === 'layer1Url' ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    <div className="flex gap-2">
                                        <input type="text" value={layer2Url} onChange={e => setLayer2Url(e.target.value)} className="flex-1 bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-2xl px-5 py-3 text-xs text-[var(--text-color)] outline-none" placeholder="Layer 2 (Milieu)..." />
                                        <button type="button" onClick={() => triggerUpload('layer2Url')} disabled={isUploading} className="p-3 bg-[var(--icon-bg)] border border-[var(--card-border)] rounded-2xl text-[var(--color-text-secondary)] hover:text-[var(--text-color)] transition-colors">
                                            {isUploading && uploadTarget === 'layer2Url' ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    <div className="flex gap-2">
                                        <input type="text" value={layer3Url} onChange={e => setLayer3Url(e.target.value)} className="flex-1 bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-2xl px-5 py-3 text-xs text-[var(--text-color)] outline-none" placeholder="Layer 3 (Premier plan)..." />
                                        <button type="button" onClick={() => triggerUpload('layer3Url')} disabled={isUploading} className="p-3 bg-[var(--icon-bg)] border border-[var(--card-border)] rounded-2xl text-[var(--color-text-secondary)] hover:text-[var(--text-color)] transition-colors">
                                            {isUploading && uploadTarget === 'layer3Url' ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest mb-2.5 ml-1">Effet Visuel Spécial</label>
                                <select 
                                    value={cardEffect} 
                                    onChange={e => {
                                        setCardEffect(e.target.value);
                                        if (e.target.value === 'holo') setIsHolo(true);
                                    }} 
                                    className="w-full bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-2xl px-5 py-3.5 text-[var(--text-color)] outline-none focus:border-purple-500 transition-all shadow-inner"
                                >
                                    <option value="">Aucun effet</option>
                                    <option value="holo">Prisme Holographique</option>
                                    <option value="shiny">Shiny / Shimmer</option>
                                    <option value="glitch">Digital Glitch</option>
                                    <option value="paillettes">Paillettes / Glitter</option>
                                    <option value="cosmic">Nébuleuse Cosmique</option>
                                    <option value="fire">Aura de Flammes</option>
                                    <option value="stars">Pluie d'Étoiles</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest mb-2.5 ml-1">Arrière-plan (Image/Vidéo)</label>
                                <div className="flex gap-2">
                                    <input type="text" value={cardCustomBg} onChange={e => setCardCustomBg(e.target.value)} className="flex-1 bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-2xl px-5 py-3 text-xs text-[var(--text-color)] outline-none" placeholder="Lien direct..." />
                                    <button type="button" onClick={() => triggerUpload('cardCustomBg')} disabled={isUploading} className="p-3 bg-[var(--icon-bg)] border border-[var(--card-border)] rounded-2xl text-[var(--color-text-secondary)] hover:text-[var(--text-color)] transition-colors">
                                        {isUploading && uploadTarget === 'cardCustomBg' ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-6 pt-2">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input type="checkbox" className="custom-checkbox" checked={isFullArt} onChange={e => setIsFullArt(e.target.checked)} />
                                    <span className="text-xs font-bold text-[var(--color-text-secondary)] group-hover:text-[var(--text-color)] transition-colors uppercase tracking-[0.2em]">Full Art</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input type="checkbox" className="custom-checkbox" checked={isHolo} onChange={e => setIsHolo(e.target.checked)} />
                                    <span className="text-xs font-bold text-[var(--color-text-secondary)] group-hover:text-[var(--text-color)] transition-colors uppercase tracking-[0.2em]">Reflet Brillant(Broke)</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer group border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 rounded-xl">
                                    <input type="checkbox" className="custom-checkbox" checked={isVariant} onChange={e => setIsVariant(e.target.checked)} />
                                    <span className="text-xs font-bold text-purple-400 group-hover:text-purple-300 transition-colors uppercase tracking-[0.2em]">C'est une Variante</span>
                                </label>
                            </div>
                        </div>

                        {/* Variant linking selection if isVariant is true */}
                        {isVariant && (
                            <div className="md:col-span-2 p-6 bg-purple-900/10 border border-purple-500/20 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-4">
                                <h4 className="text-sm font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
                                    <Layers className="w-4 h-4" /> Liaison de la Variante
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest mb-1.5 ml-1">Carte d'origine (Mère)</label>
                                        <select value={parentCardId} onChange={(e) => setParentCardId(e.target.value)} className="w-full bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-xl px-4 py-2.5 text-[var(--text-color)] outline-none focus:border-purple-500">
                                            <option value="">-- Sélectionner la carte mère --</option>
                                            {cards.filter(c => c.id !== editingCardId).map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest mb-1.5 ml-1">Badge de Variante (Profil)</label>
                                        <select 
                                            value={variants.some(v => v.iconUrl === variantBadgeUrl) ? variantBadgeUrl : (variantBadgeUrl ? "custom" : "")} 
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === "custom") {
                                                    if (!variantBadgeUrl) setVariantBadgeUrl("https://");
                                                    setVariantName("");
                                                } else {
                                                    setVariantBadgeUrl(val);
                                                    const selectedVariant = variants.find(v => v.iconUrl === val);
                                                    if (selectedVariant) setVariantName(selectedVariant.name);
                                                }
                                            }} 
                                            className="w-full bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-xl px-4 py-2.5 text-[var(--text-color)] outline-none focus:border-purple-500"
                                        >
                                            <option value="">-- Aucun badge --</option>
                                            {variants.map(v => <option key={v.id} value={v.iconUrl}>{v.name}</option>)}
                                            <option value="custom">URL Personnalisée</option>
                                        </select>
                                        {(!variants.some(v => v.iconUrl === variantBadgeUrl) && variantBadgeUrl !== "" || variants.length === 0) && (
                                            <input type="text" value={variantBadgeUrl} onChange={e => setVariantBadgeUrl(e.target.value)} className="w-full bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-color)] outline-none mt-2" placeholder="URL du badge..." />
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Floating Badges */}
                <div className="bg-[var(--card-bg)] p-8 rounded-[2.5rem] border border-[var(--card-border)] space-y-8">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-black text-[var(--text-color)] uppercase tracking-tighter flex items-center gap-3">
                            <Box className="w-5 h-5 text-purple-400" /> Badges Flottants
                        </h3>
                        <button 
                            type="button" 
                            onClick={addCustomBadge}
                            className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-purple-600/20"
                        >
                            + Ajouter
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {cardCustomBadges.map((badge, idx) => (
                            <div key={badge.id} className="bg-[var(--card-bg)] p-5 rounded-2xl border border-[var(--card-border)] space-y-4 animate-slide-up group">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Badge #{idx + 1}</span>
                                    <button type="button" onClick={() => setCardCustomBadges(cardCustomBadges.filter(b => b.id !== badge.id))} className="text-red-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                                </div>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        placeholder="URL de l'icône..." 
                                        value={badge.url} 
                                        onChange={(e) => {
                                            const newB = [...cardCustomBadges];
                                            newB[idx].url = e.target.value;
                                            setCardCustomBadges(newB);
                                        }}
                                        className="flex-1 bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-xl px-4 py-2 text-[10px] text-[var(--text-color)] outline-none focus:border-purple-500" 
                                    />
                                    <button type="button" className="p-2 bg-[var(--icon-bg)] border border-[var(--card-border)] rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--text-color)]"><UploadCloud className="w-4 h-4" /></button>
                                </div>
                                <p className="text-[9px] text-gray-600 italic leading-none">Ajustez la position et la taille directement sur l'aperçu.</p>
                            </div>
                        ))}
                        {cardCustomBadges.length === 0 && (
                            <div className="col-span-full py-10 text-center border border-dashed border-[var(--card-border)] rounded-3xl">
                                <p className="text-xs text-[var(--color-text-secondary)] font-medium italic">Aucun badge flottant. Utilisez le bouton pour en insérer.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 4. Variant Linking */}
                {editingCardId && (
                    <div className="bg-indigo-950/10 border border-indigo-500/20 p-8 rounded-[2.5rem] space-y-8 animate-in fade-in slide-in-from-bottom-4">
                        <h3 className="text-xl font-black text-[var(--text-color)] uppercase tracking-tighter flex items-center gap-3">
                            <Layers className="w-5 h-5 text-indigo-400" /> Lier des Variantes (Carte Mère)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest mb-2.5 ml-1">Type de Variante</label>
                                <select 
                                    value={selectedVariantProfileId}
                                    onChange={e => setSelectedVariantProfileId(e.target.value)}
                                    className="w-full bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-2xl px-5 py-3.5 text-[var(--text-color)] outline-none focus:border-indigo-500"
                                >
                                    <option value="">-- Type --</option>
                                    {variants.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest mb-2.5 ml-1">Carte Cible</label>
                                <select 
                                    value={selectedTargetCardId}
                                    onChange={e => setSelectedTargetCardId(e.target.value)}
                                    className="w-full bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-2xl px-5 py-3.5 text-[var(--text-color)] outline-none focus:border-indigo-500"
                                >
                                    <option value="">-- Carte --</option>
                                    {cards.filter(c => c.id !== editingCardId).map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col gap-2 justify-end">
                                <button 
                                    type="button" 
                                    onClick={handleSaveVariantLink}
                                    disabled={isSavingLink || !selectedTargetCardId}
                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-[var(--text-color)] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 text-[10px]"
                                >
                                    {isSavingLink ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Lier Existant
                                </button>
                                <button 
                                    type="button" 
                                    onClick={handleAutoGenerateVariant}
                                    disabled={isSavingLink}
                                    className="w-full py-3 bg-fuchsia-600 hover:bg-fuchsia-500 text-[var(--text-color)] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 text-[10px]"
                                >
                                    {isSavingLink ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Auto-Générer
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                            {cardVariantLinks.map(link => (
                                <div key={link.id} className="flex items-center justify-between bg-[var(--surface-bg)] border border-[var(--card-border)] p-4 rounded-2xl group hover:border-indigo-500/30 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-[var(--surface-bg)] rounded-xl flex items-center justify-center border border-[var(--card-border)] p-1.5">
                                            <img src={link.variantProfile.iconUrl} className="w-full h-full object-contain" alt="" />
                                        </div>
                                        <div>
                                            <p className="font-black text-[var(--text-color)] uppercase text-sm">{link.variantProfile.name}</p>
                                            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">➔ {link.targetCard.title}</p>
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => handleDeleteVariantLink(link.id)} className="p-2.5 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            ))}
                            {cardVariantLinks.length === 0 && <p className="text-center py-6 text-xs text-[var(--color-text-secondary)] italic border border-dashed border-[var(--card-border)] rounded-2xl">Aucune variante liée à cette carte mère.</p>}
                        </div>
                    </div>
                )}

                {/* Footer Controls */}
                <div className="md:col-span-2 flex flex-col sm:flex-row gap-6 pt-10 border-t border-[var(--card-border)]">
                    <button type="submit" disabled={creatingCard} className="flex-1 btn-primary py-7 text-2xl flex items-center justify-center gap-4 shadow-[0_30px_80px_rgba(179,102,255,0.3)]">
                        {creatingCard ? <Loader2 className="w-8 h-8 animate-spin" /> : <Check className="w-8 h-8" />}
                        <span className="uppercase tracking-[0.3em] font-black">
                            {editingCardId ? "Mettre à jour" : "Sauvegarder"}
                        </span>
                    </button>
                    {editingCardId && (
                        <button type="button" onClick={cancelEdit} className="px-12 bg-[var(--icon-bg)] border border-[var(--card-border)] text-[var(--color-text-secondary)] font-black uppercase tracking-widest rounded-3xl hover:bg-[var(--icon-bg)] hover:text-[var(--text-color)] transition-all">
                            Annuler
                        </button>
                    )}
                </div>
            </form>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-5 xl:col-span-4 sticky top-24">
            <div className="flex flex-col items-center gap-10">
                <div id="live-preview-card" className="perspective-1000 transform hover:scale-[1.03] transition-all duration-700 drop-shadow-[0_40px_80px_rgba(0,0,0,0.9)]">
                    <CardDisplay
                        isEditing={true}
                        onUpdateElement={handleUpdateElement}
                        card={{
                            id: "preview",
                            title: cardTitle || players.find(p => p.id === cardPlayerId)?.minecraftName || "Pseudo Joueur",
                            rarity: cardRarity, level: cardLevel, edition: cardEdition,
                            description: cardDesc || "Description de la carte...",
                            customBackground: cardCustomBg, imageUrl: cardImageUrl,
                            layer1Url, layer2Url, layer3Url,
                            customBadges: cardCustomBadges,
                            characterPosition: { x: charPosX, y: charPosY, scale: charScale },
                            attributes: JSON.stringify({
                                borderColor: cardBorderColor, cardBgColor, cardGlowColor, factionColor, rarityBadgeColor,
                                frameUrl: cardFrameUrl, titlePos, descPos, rarityBadgePos, levelTextPos,
                                levelBadgePos, editionBadgePos, variantBadgePos,
                                levelBadgeUrl, editionBadgeUrl, variantBadgeUrl,
                                parentCardId, isFullArt, isHolo,
                                hideCharacter, hideRarityBox, hideSideText, hideDescription,
                                hideNameplate, hideRole, hideTitle, hideBottomText,
                                effect: cardEffect, titleColor, descColor, levelColor,
                                showTitle, showDesc, showRarityBadge, showLevelText, showLevelIcon
                            }),
                            player: { minecraftName: players.find(p => p.id === cardPlayerId)?.minecraftName || "" }
                        }}
                        size="lg"
                    />
                </div>
                
                <div className="w-full space-y-6">
                    <div className="text-center space-y-4 bg-[var(--card-bg)]/60 border border-[var(--card-border)] p-8 rounded-[2.5rem] backdrop-blur-xl shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-transparent"></div>
                        <p className="text-[10px] font-black text-purple-400 uppercase tracking-[0.4em] mb-2">Workspace Interactif</p>
                        <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed font-medium">
                            <span className="text-[var(--text-color)] font-bold">DRAG:</span> Déplacez les textes et images.
                            <br/>
                            <span className="text-[var(--text-color)] font-bold">WHEEL:</span> Redimensionnez les éléments.
                        </p>
                    </div>

                    <button 
                        onClick={handleCaptureDiscordImage}
                        disabled={isCapturing}
                        className="w-full py-5 bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-600 hover:text-[var(--text-color)] transition-all flex items-center justify-center gap-3 shadow-xl disabled:opacity-50"
                    >
                        {isCapturing ? <Loader2 className="w-6 h-6 animate-spin" /> : <ImagePlus className="w-6 h-6" />} 
                        {isCapturing ? "Génération en cours..." : "Figer pour Discord"}
                    </button>
                </div>
            </div>
          </div>
        </div>
      ) : (
        /* Catalogue View */
        <div className="space-y-12">
            <div className="flex flex-wrap gap-6 items-center justify-between">
                <div className="flex items-center gap-3">
                    <Search className="w-5 h-5 text-[var(--color-text-secondary)]" />
                    <input type="text" placeholder="Rechercher une carte..." className="bg-[var(--icon-bg)] border border-[var(--card-border)] rounded-2xl px-6 py-3 text-sm text-[var(--text-color)] outline-none focus:border-purple-500 w-80 shadow-inner" />
                </div>
                <div className="flex gap-4">
                    <button className="px-6 py-3 bg-[var(--icon-bg)] hover:bg-[var(--icon-bg)] border border-[var(--card-border)] rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"><ImagePlus className="w-4 h-4" /> Générer les manquantes</button>
                    <button className="px-6 py-3 bg-red-500/10 hover:bg-red-500 border border-red-500/20 text-red-500 hover:text-[var(--text-color)] rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"><Trash2 className="w-4 h-4" /> Reset total</button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                {cards.map(card => (
                    <div key={card.id} className="group bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[2.5rem] p-7 hover:border-purple-500/30 transition-all relative overflow-hidden shadow-2xl hover:-translate-y-2">
                        <div className="flex flex-col items-center text-center space-y-5">
                            <div className="w-24 h-24 bg-[var(--surface-bg)] rounded-[2rem] border border-[var(--card-border)] flex items-center justify-center overflow-hidden shadow-inner group-hover:scale-110 transition-transform duration-500 relative">
                                <img src={`https://vzge.me/bust/512/${card.title}.png`} className="w-20 h-20 object-contain z-10" alt="" />
                                <div className="absolute inset-0 bg-gradient-to-t from-purple-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </div>
                            <div>
                                <h4 className="text-[var(--text-color)] font-black uppercase tracking-tighter text-xl leading-tight mb-1">{card.title}</h4>
                                <div className="flex flex-col gap-1 items-center">
                                    <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">{card.rarity}</span>
                                    <span className="text-[8px] font-bold text-gray-600 uppercase tracking-[0.2em]">{card.edition} • {card.level}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex gap-2 mt-8">
                            <button onClick={() => startEditCard(card)} className="flex-1 py-3 bg-white text-black rounded-xl text-[10px] font-black transition-all hover:bg-purple-500 hover:text-[var(--text-color)] uppercase tracking-widest">ÉDITER</button>
                            <button onClick={() => handleDeleteCard(card.id)} className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 hover:bg-red-500 hover:text-[var(--text-color)] transition-all"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    </div>
                ))}
                {cards.length === 0 && (
                    <div className="col-span-full py-32 text-center border border-dashed border-[var(--card-border)] rounded-[3rem] bg-white/[0.01]">
                        <p className="text-[var(--color-text-secondary)] italic font-bold uppercase tracking-[0.3em] text-xs">Le catalogue de cartes est vide</p>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
}

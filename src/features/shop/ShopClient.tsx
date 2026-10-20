"use client";

import { useId, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import toast from "react-hot-toast";
import confetti from "canvas-confetti";
import {
  Check,
  Crown,
  Search,
  Sparkles,
  Tag,
  Ticket,
  X,
  ExternalLink,
  Shield,
  Zap,
  MessageSquare,
  Flame,
} from "lucide-react";
import type { CosmeticCategory, ShopCosmetic, UserShopProfile } from "./types";

const CATEGORIES: { key: CosmeticCategory; label: string }[] = [
  { key: "all", label: "Tous les cosmétiques" },
  { key: "cape", label: "Capes" },
  { key: "wings", label: "Ailes" },
  { key: "halo", label: "Halos" },
  { key: "hat", label: "Chapeaux" },
  { key: "particle", label: "Particules" },
  { key: "emote", label: "Emotes" },
];

const VIP_PERKS = [
  {
    icon: Crown,
    title: "Rôle VIP Discord & Badge Profil",
    desc: "Un rôle doré distinctif sur notre Discord et un badge VIP sur ton profil web.",
  },
  {
    icon: Sparkles,
    title: "Cape VIP Exclusive Offerte",
    desc: "La cape dorée réservée aux membres VIP, disponible directement dans ton launcher.",
  },
  {
    icon: Zap,
    title: "Multiplicateur ParaCoins x1.5",
    desc: "Gagne 50% de ParaCoins en plus sur tes quêtes quotidiennes et activités en jeu.",
  },
  {
    icon: MessageSquare,
    title: "Salons Privés Discord",
    desc: "Échange directement avec l'équipe du studio et vote sur les futures fonctionnalités.",
  },
  {
    icon: Shield,
    title: "Priorité d'Accès & Support",
    desc: "Place prioritaire lors des pics de connexion et prise en charge rapide de tes tickets.",
  },
  {
    icon: Flame,
    title: "Pseudo Coloré & Chat Mis en Valeur",
    desc: "Une couleur dorée exclusive pour ton pseudo dans le chat Minecraft et le launcher.",
  },
];

export default function ShopClient({
  initialCosmetics,
  user,
}: {
  initialCosmetics: ShopCosmetic[];
  user: UserShopProfile | null;
}) {
  const [cosmetics] = useState<ShopCosmetic[]>(initialCosmetics);
  const [ownedIds, setOwnedIds] = useState<string[]>(user?.ownedItemIds ?? []);
  const [userCoins, setUserCoins] = useState<number>(user?.paraCoins ?? 0);
  const [selectedCategory, setSelectedCategory] = useState<CosmeticCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"price-asc" | "price-desc" | "name">("price-asc");

  const [confirmItem, setConfirmItem] = useState<ShopCosmetic | null>(null);
  const [isBuying, setIsBuying] = useState(false);

  const [isVipModalOpen, setIsVipModalOpen] = useState(false);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [createdTicketId, setCreatedTicketId] = useState<string | null>(null);

  const searchInputId = useId();
  const sortSelectId = useId();

  const filteredCosmetics = useMemo(() => {
    return cosmetics
      .filter((item) => {
        const matchesCategory =
          selectedCategory === "all" ||
          item.category.toLowerCase() === selectedCategory.toLowerCase();
        const matchesSearch =
          searchQuery.trim() === "" ||
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === "price-asc") return a.price - b.price;
        if (sortBy === "price-desc") return b.price - a.price;
        return a.name.localeCompare(b.name);
      });
  }, [cosmetics, selectedCategory, searchQuery, sortBy]);

  const handleBuyCosmetic = async (item: ShopCosmetic) => {
    if (!user) {
      toast.error("Connecte-toi pour acheter un cosmétique.");
      signIn("discord");
      return;
    }
    if (userCoins < item.price) {
      toast.error("Fonds insuffisants en ParaCoins.");
      return;
    }

    setIsBuying(true);
    try {
      const res = await fetch("/api/shop/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.itemId }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Impossible d'effectuer l'achat.");
      }

      setUserCoins(data.remainingCoins);
      setOwnedIds((prev) => [...prev, item.itemId]);
      setConfirmItem(null);

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });

      toast.success(`${item.name} débloqué avec succès !`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsBuying(false);
    }
  };

  const handleCreateVipTicket = async () => {
    if (!user) {
      toast.error("Connecte-toi pour souscrire au grade VIP.");
      signIn("discord");
      return;
    }

    setIsCreatingTicket(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "Achat VIP",
          description: "Demande d'adhésion au grade VIP (4,99 € / mois).",
          details: `Pseudo Minecraft : ${user.minecraftName || "Non renseigné"} | ID Joueur : ${user.id}`,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Erreur lors de l'ouverture du ticket.");
      }

      const ticket = await res.json();
      setCreatedTicketId(ticket.ticketId || ticket.id || "VIP-EN-COURS");
      toast.success("Ticket Discord ouvert ! Notre staff va te répondre.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsCreatingTicket(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24 pt-20">
      <div className="mx-auto max-w-7xl px-5 md:px-10">
        <section className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/60 to-black p-6 md:p-12 mb-12">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-violet-300">
              <Sparkles className="size-3.5" /> Boutique Officielle
            </span>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white md:text-5xl">
              Cosmétiques Launcher & Grade VIP
            </h1>
            <p className="mt-3 text-base text-zinc-300 md:text-lg leading-relaxed">
              Personnalise ton apparence en jeu avec les capes, ailes et halos du Launcher Paranoia, ou rejoins le club VIP pour débloquer des privilèges réservés aux membres premium.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-800/80 pt-6">
            {user ? (
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-3">
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={user.name || "Avatar"}
                      className="size-11 rounded-full border border-white/20 object-cover"
                    />
                  ) : (
                    <div className="size-11 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center font-bold text-zinc-300">
                      {(user.name || "P")[0]}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white">
                        {user.name || user.minecraftName || "Joueur"}
                      </p>
                      <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-bold text-zinc-300 uppercase">
                        {user.role}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      {user.minecraftName ? `Minecraft : ${user.minecraftName}` : "Compte lié"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2">
                  <Image
                    src="/Paracoin.png"
                    alt="ParaCoins"
                    width={22}
                    height={22}
                    className="drop-shadow"
                  />
                  <div>
                    <span className="text-xs text-amber-300/80 uppercase font-medium">Solde</span>
                    <p className="text-sm font-bold text-amber-300 leading-none">
                      {userCoins.toLocaleString("fr-FR")} ParaCoins
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between w-full gap-4">
                <p className="text-sm text-zinc-400">
                  Connecte-toi avec Discord pour utiliser tes ParaCoins et lier tes cosmétiques en jeu.
                </p>
                <button
                  type="button"
                  onClick={() => signIn("discord")}
                  className="btn-violet min-h-11 px-5 text-sm font-medium"
                >
                  Se connecter avec Discord
                </button>
              </div>
            )}

            {user && (
              <Link
                href="/cards"
                className="btn-line min-h-11 px-4 text-xs font-medium text-zinc-300 hover:text-white"
              >
                Gagner des ParaCoins (Boosters TCG)
              </Link>
            )}
          </div>
        </section>

        <section className="relative overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-950/20 via-zinc-950 to-black p-6 md:p-10 mb-16 shadow-[0_0_50px_-15px_rgba(245,158,11,0.15)]">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
                <Crown className="size-3.5" /> Grade Mensuel
              </div>
              <h2 className="mt-3 text-2xl md:text-4xl font-extrabold text-white tracking-tight">
                Rejoins l'élite avec le <span className="text-amber-400">Grade VIP</span>
              </h2>
              <p className="mt-2 text-zinc-300 text-sm md:text-base leading-relaxed">
                Profite d'une expérience rehaussée sur l'ensemble de l'écosystème Paranoia : priorité, cosmétiques uniques et boost de progression.
              </p>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {VIP_PERKS.map((perk, i) => {
                  const Icon = perk.icon;
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-lg border border-white/5 bg-zinc-900/60 p-3"
                    >
                      <div className="rounded-md bg-amber-500/15 p-2 text-amber-400">
                        <Icon className="size-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white">{perk.title}</p>
                        <p className="text-[11px] text-zinc-400 leading-snug mt-0.5">
                          {perk.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col items-center justify-center rounded-xl border border-amber-500/30 bg-zinc-900/80 p-6 lg:min-w-[280px] text-center">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                Abonnement sans engagement
              </span>
              <div className="mt-2 flex items-baseline justify-center gap-1">
                <span className="text-4xl font-extrabold text-white">4,99 €</span>
                <span className="text-sm font-medium text-zinc-400">/ mois</span>
              </div>
              <p className="mt-2 text-xs text-zinc-400">
                Paiement sécurisé et traitement direct par notre équipe via Discord.
              </p>

              <button
                type="button"
                onClick={() => setIsVipModalOpen(true)}
                className="mt-6 w-full min-h-11 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-5 text-sm font-bold text-black transition-all hover:brightness-110 active:scale-[0.98] shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                <Crown className="size-4" />
                Devenir VIP maintenant
              </button>
            </div>
          </div>
        </section>

        <section id="cosmetics" className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                <Tag className="size-6 text-violet-400" /> Cosmétiques du Launcher
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Capes, ailes et accessoires utilisables directement avec le Paranoia Client.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
                <label htmlFor={searchInputId} className="sr-only">Rechercher un cosmétique</label>
                <input
                  id={searchInputId}
                  type="text"
                  placeholder="Rechercher un cosmétique..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="min-h-11 w-full rounded-md border border-zinc-800 bg-zinc-950 pl-9 pr-3 text-sm text-white placeholder:text-zinc-500 focus-visible:border-violet-400 focus-visible:outline-none"
                />
              </div>

              <label htmlFor={sortSelectId} className="sr-only">Trier les cosmétiques</label>
              <select
                id={sortSelectId}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="min-h-11 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-300 focus-visible:border-violet-400 focus-visible:outline-none"
              >
                <option value="price-asc">Prix croissant</option>
                <option value="price-desc">Prix décroissant</option>
                <option value="name">Nom (A - Z)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.key;
              const count =
                cat.key === "all"
                  ? cosmetics.length
                  : cosmetics.filter((c) => c.category.toLowerCase() === cat.key).length;

              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`min-h-11 whitespace-nowrap rounded-md px-4 text-xs font-medium transition-colors flex items-center gap-2 ${
                    active
                      ? "bg-violet-600 text-white font-semibold"
                      : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  }`}
                >
                  {cat.label}
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                      active ? "bg-white/20 text-white" : "bg-black/40 text-zinc-400"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {filteredCosmetics.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-12 text-center">
              <Tag className="mx-auto size-8 text-zinc-500" />
              <p className="mt-3 text-base font-semibold text-white">Aucun cosmétique trouvé</p>
              <p className="mt-1 text-sm text-zinc-400">
                Essaie de modifier tes critères de recherche ou sélectionne une autre catégorie.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("all");
                  setSearchQuery("");
                }}
                className="btn-line min-h-11 mt-4 px-4 text-xs"
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredCosmetics.map((item) => {
                const isOwned = ownedIds.includes(item.itemId);
                const canAfford = userCoins >= item.price;

                return (
                  <div
                    key={item.id}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950 transition-all hover:border-zinc-700 hover:shadow-lg"
                  >
                    <div>
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-900 flex items-center justify-center">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-zinc-600">
                            <Tag className="size-10" />
                            <span className="text-[11px]">Aperçu du modèle</span>
                          </div>
                        )}
                        <span className="absolute top-2.5 right-2.5 rounded-full border border-black/40 bg-black/70 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-semibold uppercase text-zinc-300">
                          {item.category}
                        </span>
                        {isOwned && (
                          <span className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/20 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                            <Check className="size-3" /> Possédé
                          </span>
                        )}
                      </div>

                      <div className="p-4">
                        <h3 className="font-bold text-white text-base group-hover:text-violet-300 transition-colors">
                          {item.name}
                        </h3>
                        <p className="mt-1 text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 pt-0">
                      <div className="flex items-center justify-between border-t border-zinc-900 pt-3 mb-3">
                        <span className="text-xs text-zinc-400 font-medium">Prix</span>
                        <div className="flex items-center gap-1.5">
                          <Image
                            src="/Paracoin.png"
                            alt="Coin"
                            width={16}
                            height={16}
                            className="shrink-0"
                          />
                          <span className="text-sm font-extrabold text-amber-400">
                            {item.price.toLocaleString("fr-FR")}
                          </span>
                        </div>
                      </div>

                      {isOwned ? (
                        <button
                          type="button"
                          disabled
                          className="w-full min-h-11 rounded-md bg-zinc-900 text-xs font-semibold text-zinc-400 border border-zinc-800 cursor-default flex items-center justify-center gap-1.5"
                        >
                          <Check className="size-4 text-emerald-400" /> Disponible dans le Launcher
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmItem(item)}
                          className={`w-full min-h-11 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                            canAfford
                              ? "bg-violet-600 text-white hover:bg-violet-500 active:scale-[0.98]"
                              : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700"
                          }`}
                        >
                          {canAfford ? (
                            <>Acheter ce cosmétique</>
                          ) : (
                            <>Fonds insuffisants ({item.price - userCoins} manquants)</>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {confirmItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setConfirmItem(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              <X className="size-5" />
            </button>

            <h3 className="text-lg font-bold text-white">Confirmer l'achat</h3>
            <p className="mt-1 text-xs text-zinc-400">
              Cet article sera immédiatement associé à ton compte pour le Launcher Paranoia.
            </p>

            <div className="mt-4 flex items-center gap-3.5 rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3.5">
              {confirmItem.imageUrl && (
                <img
                  src={confirmItem.imageUrl}
                  alt={confirmItem.name}
                  className="size-14 rounded-lg object-cover border border-white/10"
                />
              )}
              <div>
                <p className="text-sm font-bold text-white">{confirmItem.name}</p>
                <span className="text-[11px] uppercase tracking-wider text-violet-400 font-semibold">
                  {confirmItem.category}
                </span>
                <p className="text-xs text-zinc-400 line-clamp-1">{confirmItem.description}</p>
              </div>
            </div>

            <div className="mt-5 space-y-2 rounded-xl border border-zinc-900 bg-black/60 p-3.5 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Ton solde actuel</span>
                <span className="font-semibold text-white">{userCoins.toLocaleString("fr-FR")} ParaCoins</span>
              </div>
              <div className="flex justify-between text-amber-400 font-semibold">
                <span>Montant à débiter</span>
                <span>- {confirmItem.price.toLocaleString("fr-FR")} ParaCoins</span>
              </div>
              <div className="border-t border-zinc-800 pt-2 flex justify-between font-bold text-white">
                <span>Solde restant après achat</span>
                <span className={userCoins - confirmItem.price < 0 ? "text-red-400" : "text-emerald-400"}>
                  {(userCoins - confirmItem.price).toLocaleString("fr-FR")} ParaCoins
                </span>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setConfirmItem(null)}
                className="btn-line min-h-11 flex-1 text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isBuying || userCoins < confirmItem.price}
                onClick={() => handleBuyCosmetic(confirmItem)}
                className="btn-violet min-h-11 flex-1 text-xs font-bold disabled:opacity-50"
              >
                {isBuying ? "Paiement en cours..." : "Confirmer l'achat"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isVipModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-amber-500/40 bg-zinc-950 p-6 md:p-8 shadow-2xl">
            <button
              type="button"
              onClick={() => {
                setIsVipModalOpen(false);
                setCreatedTicketId(null);
              }}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-2 text-amber-400">
              <Crown className="size-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Abonnement VIP</span>
            </div>
            <h3 className="mt-2 text-xl font-bold text-white md:text-2xl">
              Souscrire au Grade VIP (4,99 € / mois)
            </h3>

            {createdTicketId ? (
              <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <Ticket className="size-6" />
                </div>
                <p className="mt-3 text-base font-bold text-white">Ticket Discord Ouvert !</p>
                <p className="mt-1 text-xs text-zinc-300 leading-relaxed">
                  Ton ticket d'adhésion VIP a été créé sur notre serveur avec la référence :{" "}
                  <code className="rounded bg-black/60 px-2 py-0.5 font-mono text-emerald-400">
                    #{createdTicketId}
                  </code>
                </p>
                <p className="mt-2 text-xs text-zinc-400">
                  Rends-toi sur le salon Discord créé pour échanger avec le staff et finaliser ton règlement (PayPal ou CB).
                </p>

                <div className="mt-6 flex flex-col gap-2">
                  <a
                    href="https://discord.gg/FP8rYZYRe7"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-violet min-h-11 flex items-center justify-center gap-2 text-xs font-bold"
                  >
                    Accéder à mon ticket sur Discord <ExternalLink className="size-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setIsVipModalOpen(false);
                      setCreatedTicketId(null);
                    }}
                    className="btn-line min-h-11 text-xs"
                  >
                    Fermer cette fenêtre
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="mt-2 text-xs text-zinc-300 leading-relaxed">
                  Pour garantir un paiement sécurisé et configurer ton grade immédiatement, nous ouvrons un salon privé avec notre équipe sur le serveur Discord officiel.
                </p>

                <div className="mt-4 space-y-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Formule</span>
                    <span className="font-semibold text-white">Abonnement Mensuel</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Tarif</span>
                    <span className="font-bold text-amber-400 text-sm">4,99 € / mois</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-zinc-800/80 pt-2">
                    <span className="text-zinc-400">Ton compte lié</span>
                    <span className="font-medium text-white">
                      {user?.name || user?.minecraftName || "Non connecté"}
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsVipModalOpen(false)}
                    className="btn-line min-h-11 flex-1 text-xs font-semibold"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    disabled={isCreatingTicket}
                    onClick={handleCreateVipTicket}
                    className="min-h-11 flex-1 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 text-xs font-bold text-black transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Ticket className="size-4" />
                    {isCreatingTicket ? "Création du salon..." : "Ouvrir mon ticket Discord"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

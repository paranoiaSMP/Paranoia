"use client";

import { isVip } from "@/lib/vip";
import { useEffect, useId, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import toast from "react-hot-toast";
import { Check, Search, X } from "lucide-react";
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
  { title: "Badge VIP sur ton profil", desc: "Visible sur ta page joueur du site." },
  { title: "Rôle VIP sur Discord", desc: "Attribué par le staff à l'activation de ton grade." },
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

  const closeAll = () => {
    setConfirmItem(null);
    setIsVipModalOpen(false);
    setCreatedTicketId(null);
  };

  useEffect(() => {
    if (!confirmItem && !isVipModalOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeAll();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmItem, isVipModalOpen]);

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

  const coin = (size: number) => (
    <Image src="/Paracoin.png" alt="" width={size} height={size} className="shrink-0" />
  );
  const fmt = (n: number) => n.toLocaleString("fr-FR");

  return (
    <div className="min-h-screen bg-black pb-24 pt-24 text-zinc-50">
      <div className="mx-auto max-w-6xl px-5 md:px-10">
        <header className="flex flex-wrap items-end justify-between gap-6 border-b border-zinc-800 pb-8">
          <div className="max-w-xl">
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">Boutique</h1>
            <p className="mt-3 text-zinc-400">
              Capes, ailes et halos pour le launcher Paranoia, payés en ParaCoins. Le grade VIP est en dessous.
            </p>
          </div>

          {user ? (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-zinc-400">{user.name || user.minecraftName || "Joueur"}</p>
                <p className="flex items-center justify-end gap-2 font-mono text-xl font-semibold tabular-nums">
                  {coin(22)}
                  {fmt(userCoins)}
                </p>
              </div>
              <Link href="/cards" className="btn-line min-h-11 px-4 text-sm">
                Gagner des ParaCoins
              </Link>
            </div>
          ) : (
            <button type="button" onClick={() => signIn("discord")} className="btn-violet min-h-11 px-5 text-sm font-medium">
              Se connecter avec Discord
            </button>
          )}
        </header>

        <section id="cosmetics" className="pt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div role="tablist" aria-label="Catégories" className="-mx-1 flex gap-1 overflow-x-auto px-1">
              {CATEGORIES.map((cat) => {
                const active = selectedCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setSelectedCategory(cat.key)}
                    className={`min-h-11 whitespace-nowrap border-b-2 px-3 text-sm transition-colors ${
                      active
                        ? "border-violet-400 text-white"
                        : "border-transparent text-zinc-400 hover:text-white"
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search aria-hidden className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
                <label htmlFor={searchInputId} className="sr-only">Rechercher un cosmétique</label>
                <input
                  id={searchInputId}
                  type="search"
                  placeholder="Rechercher"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="min-h-11 w-44 rounded-md border border-zinc-800 bg-zinc-950 pl-9 pr-3 text-sm placeholder:text-zinc-500 focus-visible:border-violet-400 focus-visible:outline-none"
                />
              </div>
              <label htmlFor={sortSelectId} className="sr-only">Trier</label>
              <select
                id={sortSelectId}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="min-h-11 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-300 focus-visible:border-violet-400 focus-visible:outline-none"
              >
                <option value="price-asc">Prix croissant</option>
                <option value="price-desc">Prix décroissant</option>
                <option value="name">Nom (A-Z)</option>
              </select>
            </div>
          </div>

          {filteredCosmetics.length === 0 ? (
            <div className="mt-8 border border-dashed border-zinc-800 p-12 text-center">
              <p className="font-medium">
                {cosmetics.length === 0 ? "La boutique est vide pour le moment." : "Aucun cosmétique ne correspond."}
              </p>
              {cosmetics.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory("all");
                    setSearchQuery("");
                  }}
                  className="btn-line mt-4 min-h-11 px-4 text-sm"
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          ) : (
            <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
              {filteredCosmetics.map((item) => {
                const isOwned = ownedIds.includes(item.itemId);
                const canAfford = userCoins >= item.price;
                return (
                  <li key={item.id} className="flex flex-col">
                    <div className="aspect-square overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="size-full object-cover" loading="lazy" />
                      ) : (
                        <div className="flex size-full items-center justify-center text-xs text-zinc-600">Pas d'aperçu</div>
                      )}
                    </div>
                    <h3 className="mt-3 font-medium">{item.name}</h3>
                    <p className="mt-0.5 line-clamp-2 text-sm text-zinc-400">{item.description}</p>
                    <div className="mt-auto pt-3">
                      <p className="mb-2 flex items-center gap-1.5 font-mono text-sm tabular-nums">
                        {coin(16)}
                        {fmt(item.price)}
                      </p>
                      {isOwned ? (
                        <p className="flex min-h-11 items-center gap-1.5 text-sm text-zinc-400">
                          <Check aria-hidden className="size-4 text-violet-400" /> Dans ton launcher
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmItem(item)}
                          className={`min-h-11 w-full rounded-md text-sm font-medium transition-colors ${
                            canAfford || !user
                              ? "bg-violet-600 text-white hover:bg-violet-500"
                              : "border border-zinc-800 text-zinc-400 hover:border-zinc-600"
                          }`}
                        >
                          {canAfford || !user ? "Acheter" : `Il manque ${fmt(item.price - userCoins)}`}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section id="vip" className="mt-24 grid gap-10 border-t border-zinc-800 pt-12 lg:grid-cols-[1fr_20rem]">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Grade VIP</h2>
            <p className="mt-2 max-w-lg text-zinc-400">
              Un abonnement mensuel pour le confort et le soutien au serveur. Résiliable à tout moment.
            </p>
            <dl className="mt-6 grid gap-x-8 sm:grid-cols-2">
              {VIP_PERKS.map((perk) => (
                <div key={perk.title} className="border-t border-zinc-800 py-4">
                  <dt className="text-sm font-medium">{perk.title}</dt>
                  <dd className="mt-1 text-sm text-zinc-400">{perk.desc}</dd>
                </div>
              ))}
            </dl>
          </div>

          <aside className="h-fit rounded-lg border border-violet-500/40 bg-zinc-950 p-6">
            <p className="font-mono text-4xl font-semibold tabular-nums">
              4,99 €<span className="text-base font-normal text-zinc-400"> / mois</span>
            </p>
            <p className="mt-3 text-sm text-zinc-400">
              Le paiement se règle avec le staff dans un ticket Discord, par PayPal ou carte.
            </p>
            {isVip(user?.vipUntil) ? (
              <p className="mt-6 text-sm text-violet-300">
                VIP actif jusqu'au {new Date(user!.vipUntil!).toLocaleDateString("fr-FR")}
              </p>
            ) : null}
            <button type="button" onClick={() => setIsVipModalOpen(true)} className="btn-violet mt-4 min-h-12 w-full text-sm font-medium">
              {isVip(user?.vipUntil) ? "Prolonger" : "Devenir VIP"}
            </button>
          </aside>
        </section>
      </div>

      {(confirmItem || isVipModalOpen) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={(e) => e.target === e.currentTarget && closeAll()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="shop-dialog-title"
            className="relative w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-950 p-6"
          >
            <button type="button" onClick={closeAll} aria-label="Fermer" className="absolute right-2 top-2 flex size-11 items-center justify-center text-zinc-400 hover:text-white">
              <X className="size-5" />
            </button>

            {confirmItem ? (
              <>
                <h3 id="shop-dialog-title" className="text-lg font-semibold">Acheter {confirmItem.name} ?</h3>
                <p className="mt-1 text-sm text-zinc-400">L'article est ajouté à ton compte et apparaît dans le launcher.</p>
                <dl className="mt-5 space-y-2 border-y border-zinc-800 py-4 text-sm">
                  <div className="flex justify-between text-zinc-400"><dt>Solde</dt><dd className="font-mono tabular-nums">{fmt(userCoins)}</dd></div>
                  <div className="flex justify-between text-zinc-400"><dt>Prix</dt><dd className="font-mono tabular-nums">- {fmt(confirmItem.price)}</dd></div>
                  <div className="flex justify-between font-medium">
                    <dt>Après achat</dt>
                    <dd className={`font-mono tabular-nums ${userCoins < confirmItem.price ? "text-red-400" : ""}`}>{fmt(userCoins - confirmItem.price)}</dd>
                  </div>
                </dl>
                <div className="mt-5 flex gap-3">
                  <button type="button" onClick={closeAll} className="btn-line min-h-11 flex-1 text-sm">Annuler</button>
                  <button
                    type="button"
                    disabled={isBuying || userCoins < confirmItem.price}
                    onClick={() => handleBuyCosmetic(confirmItem)}
                    className="btn-violet min-h-11 flex-1 text-sm font-medium disabled:opacity-50"
                  >
                    {isBuying ? "Achat en cours" : "Confirmer"}
                  </button>
                </div>
              </>
            ) : createdTicketId ? (
              <>
                <h3 id="shop-dialog-title" className="text-lg font-semibold">Ticket ouvert</h3>
                <p className="mt-2 text-sm text-zinc-400">
                  Référence <code className="font-mono text-zinc-50">#{createdTicketId}</code>. Va sur le salon créé dans le Discord pour régler avec le staff.
                </p>
                <div className="mt-5 flex flex-col gap-2">
                  <a href="https://discord.gg/FP8rYZYRe7" target="_blank" rel="noopener noreferrer" className="btn-violet flex min-h-11 items-center justify-center text-sm font-medium">
                    Ouvrir Discord
                  </a>
                  <button type="button" onClick={closeAll} className="btn-line min-h-11 text-sm">Fermer</button>
                </div>
              </>
            ) : (
              <>
                <h3 id="shop-dialog-title" className="text-lg font-semibold">Grade VIP, 4,99 € / mois</h3>
                <p className="mt-2 text-sm text-zinc-400">
                  On ouvre un salon privé avec le staff sur Discord pour régler et activer ton grade.
                </p>
                <p className="mt-4 border-y border-zinc-800 py-3 text-sm text-zinc-400">
                  Compte lié : <span className="text-zinc-50">{user?.name || user?.minecraftName || "non connecté"}</span>
                </p>
                <div className="mt-5 flex gap-3">
                  <button type="button" onClick={closeAll} className="btn-line min-h-11 flex-1 text-sm">Annuler</button>
                  <button type="button" disabled={isCreatingTicket} onClick={handleCreateVipTicket} className="btn-violet min-h-11 flex-1 text-sm font-medium disabled:opacity-50">
                    {isCreatingTicket ? "Création" : "Ouvrir un ticket"}
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

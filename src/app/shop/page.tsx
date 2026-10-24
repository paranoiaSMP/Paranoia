import { Metadata } from "next";
import Link from "next/link";
import { SHOP_OPEN } from "@/lib/shop";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import ShopClient from "@/features/shop/ShopClient";
import type { ShopCosmetic, UserShopProfile } from "@/features/shop/types";

export const metadata: Metadata = {
  title: "Boutique Officielle | Cosmétiques & Grade VIP | Paranoia Studio",
  description:
    "Découvre les cosmétiques exclusifs pour le Launcher Minecraft Paranoia et souscris au grade VIP pour débloquer des privilèges réservés aux membres premium.",
};

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  if (!SHOP_OPEN) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-5 py-24">
        {/* Une grue monte la devanture : fenêtre, porte, store, puis enseigne. */}
        <svg aria-hidden viewBox="0 0 640 350" className="mb-12 h-auto w-full overflow-visible">
          <line x1="0" y1="330" x2="640" y2="330" className="stroke-zinc-700" strokeWidth="2" />
          <rect x="330" y="190" width="230" height="140" className="fill-zinc-900 stroke-zinc-700" strokeWidth="2" />
          <rect x="322" y="182" width="246" height="8" className="fill-zinc-800 stroke-zinc-700" strokeWidth="2" />
          <g className="stroke-zinc-600" fill="none">
            <path d="M62 38 82 69 62 100 82 131 62 162 82 193 62 224 82 255 62 286 82 317 M82 38 62 69 82 100 62 131 82 162 62 193 82 224 62 255 82 286 62 317" strokeWidth="1.5" />
            <path d="M62 38V330M82 38V330" strokeWidth="2" />
            <path d="M72 38V10M72 10 20 34M72 10 610 34" strokeWidth="1" className="stroke-zinc-700" />
          </g>
          <rect x="20" y="30" width="590" height="8" className="fill-zinc-900 stroke-zinc-600" strokeWidth="2" />
          <rect x="22" y="38" width="30" height="30" className="fill-zinc-800 stroke-zinc-600" strokeWidth="2" />
          <rect x="-8" y="30" width="16" height="8" className="crane-part crane-trolley fill-zinc-500" />
          <rect x="-0.75" y="38" width="1.5" height="290" className="crane-part crane-cable fill-zinc-400" />
          <g className="crane-part crane-hook"><path d="M-5 -8h10v8h-10z" className="fill-zinc-400" /></g>
          <g className="crane-part crane-load-0" opacity="0">
            <path d="M0 0V12" className="stroke-zinc-500" strokeWidth="1.5" /><rect x="-35" y="12" width="70" height="50" className="fill-black stroke-violet-400" strokeWidth="2" /><path d="M0 12v50M-35 37h70" className="stroke-violet-400" strokeWidth="1.5" />
          </g>
          <g className="crane-part crane-load-1" opacity="0">
            <path d="M0 0V12" className="stroke-zinc-500" strokeWidth="1.5" /><rect x="-25" y="12" width="50" height="80" className="fill-zinc-800 stroke-zinc-500" strokeWidth="2" /><circle cx="16" cy="52" r="3" className="fill-violet-400" />
          </g>
          <g className="crane-part crane-load-2" opacity="0">
            <path d="M0 0V12" className="stroke-zinc-500" strokeWidth="1.5" /><rect x="-115" y="12" width="230" height="20" className="fill-violet-600" /><rect x="-92" y="12" width="23" height="20" className="fill-violet-300" /><rect x="-46" y="12" width="23" height="20" className="fill-violet-300" /><rect x="0" y="12" width="23" height="20" className="fill-violet-300" /><rect x="46" y="12" width="23" height="20" className="fill-violet-300" /><rect x="92" y="12" width="23" height="20" className="fill-violet-300" />
          </g>
          <g className="crane-part crane-load-3" opacity="0">
            <path d="M0 0V12" className="stroke-zinc-500" strokeWidth="1.5" /><rect x="-50" y="12" width="100" height="26" className="fill-violet-600 stroke-violet-300" strokeWidth="2" /><text x="0" y="29" textAnchor="middle" className="fill-white" fontSize="12" fontWeight="700">BOUTIQUE</text>
          </g>
        </svg>
        <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">Boutique en construction</h1>
        <p className="mt-4 text-zinc-400">On la reconstruit. Les achats sont désactivés d&apos;ici là.</p>
        <Link href="/" className="btn-line mt-8 inline-flex min-h-11 w-fit items-center px-5 text-sm">Retour à l&apos;accueil</Link>
      </main>
    );
  }
  const session = await getServerSession(authOptions);

  const rawCosmetics = await prisma.launcherShopItem.findMany({
    orderBy: { price: "asc" },
  });

  const cosmetics: ShopCosmetic[] = rawCosmetics.map((item) => ({
    id: item.id,
    itemId: item.itemId,
    name: item.name,
    description: item.description,
    price: item.price,
    currency: item.currency,
    imageUrl: item.imageUrl,
    modelUrl: item.modelUrl,
    category: item.category,
  }));

  let userProfile: UserShopProfile | null = null;

  if (session?.user?.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        image: true,
        role: true,
        paraCoins: true,
        minecraftName: true,
        minecraftUuid: true,
        vipUntil: true,
        cosmetics: {
          select: { itemId: true },
        },
      },
    });

    if (dbUser) {
      userProfile = {
        id: dbUser.id,
        name: dbUser.name,
        image: dbUser.image,
        role: dbUser.role,
        paraCoins: dbUser.paraCoins,
        minecraftName: dbUser.minecraftName,
        minecraftUuid: dbUser.minecraftUuid,
        vipUntil: dbUser.vipUntil?.toISOString() ?? null,
        ownedItemIds: dbUser.cosmetics.map((c) => c.itemId),
      };
    }
  }

  return <ShopClient initialCosmetics={cosmetics} user={userProfile} />;
}
